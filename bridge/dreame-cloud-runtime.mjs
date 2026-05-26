import { createHash } from 'node:crypto'

const DEFAULT_STATE = 'disabled'
const DEFAULT_TIMEOUT_MS = 10000
const DREAME_PASSWORD_SALT = 'RAylYC%fmSKp7%Tq'
const DREAME_APP_AUTHORIZATION = 'Basic ZHJlYW1lX2FwcHYxOkFQXmR2QHpAU1FZVnhOODg='
const DREAME_DEFAULT_RLC = '1a9bb36e6b22617cf465363ba7c232fb131899d593e8d1a1-1'
const DREAME_SELECTED_CLIENT = 'dreameHomeReverseEngineered'
const DEFAULT_AUTH_PROFILE = 'lynell-default'
const TASSHACK_COMPATIBLE_AUTH_PROFILE = 'tasshack-compatible'
const EXPLICIT_FORM_URLENCODED_AUTH_PROFILE = 'explicit-form-urlencoded'
const STATUS_LANGUAGE_PRIORITY = ['en', 'nb']

const DREAME_LATEST_STATUS_CODE_MAP = {
  3: {
    normalizedStatus: 'idle',
    label: 'Standby / idle',
    docked: null,
    charging: null,
    confidence: 'tentative',
    note:
      'latestStatus=3 tolkes foreløpig som idle/standby basert på live Vaskepot-status. Koden bekrefter ikke docked eller charging.',
  },
}

const STATUS_CODE_OBSERVATION_NOTE =
  'Observer status while docked/charging/cleaning manually from Dreame app before promoting unknown codes to confirmed mapping.'
const DREAME_COMMAND_WARNING = 'Experimental reverse-engineered command path'
const observedStatusCodes = new Map()
const dreameConnectInFlightByConfig = new Map()

const REGION_HOSTS = {
  cn: 'cn.iot.dreame.tech',
  eu: 'eu.iot.dreame.tech',
  sg: 'sg.iot.dreame.tech',
  us: 'us.iot.dreame.tech',
}

const EXPERIMENTAL_RUNTIME = {
  experimental: true,
  unstable: true,
  reverseEngineered: true,
  mode: 'status-only',
}

const CLIENT_STRATEGIES = {
  dreameHomeReverseEngineered: {
    id: DREAME_SELECTED_CLIENT,
    label: 'DreameHome reverse-engineered status client',
    experimental: true,
    unstable: true,
    reverseEngineered: true,
    dependency: 'none',
    capabilities: ['login', 'deviceList'],
    forbiddenCapabilities: ['commands', 'maps', 'zones', 'schedules', 'consumables', 'automations'],
    risk:
      'Reverse-engineered DreameHome cloud flow. Endpoints, headers, region behavior and token flow can change without notice.',
  },
}

const RESEARCH_SOURCES = [
  {
    id: 'tasshackDreameVacuum',
    label: 'Tasshack/dreame-vacuum',
    role: 'Home Assistant/protocol reference',
    url: 'https://github.com/Tasshack/dreame-vacuum',
    notes: [
      'Mature Home Assistant integration with cloud/local setup patterns and many normalized vacuum entities.',
      'Useful reference for auth variants, device models, status fields, map/room capabilities, and risk surface.',
    ],
  },
  {
    id: 'iobrokerDreameHome',
    label: 'spayrosam/ioBroker.dreamehome',
    role: 'DreameHome/iobroker adapter reference',
    url: 'https://github.com/spayrosam/ioBroker.dreamehome',
    notes: [
      'Documents Dreame cloud connection, token management, MQTT communication, maps, and component status.',
      'License is restrictive, so use only as behavior/reference input, not copied implementation.',
    ],
  },
  {
    id: 'ta2kIobrokerDreame',
    label: 'TA2k/ioBroker.dreame',
    role: 'Dreame Home device-state reference',
    url: 'https://github.com/TA2k/ioBroker.dreame',
    notes: [
      'Shows practical device state naming and MIoT/custom-command patterns.',
      'Useful for understanding data shape, but Lynell v0 remains status-only.',
    ],
  },
  {
    id: 'dreameMcp',
    label: 'dreame-mcp / robotics-mcp references',
    role: 'D20/D20 Pro style research reference',
    url: 'https://glama.ai/mcp/servers/%40sandraschi/robotics-mcp',
    notes: [
      'Mentions Dreame D20 Pro style setup using python-miio discovery/token flows.',
      'Treat as low-confidence research input until verified against the actual Dream/Dreame D20 Plus unit.',
    ],
  },
]

const ADAPTER_CONTRACT = {
  version: '0.1-foundation',
  provider: 'dreameCloud',
  phase: 'research-and-status-only',
  allowedNow: [
    'read configuration readiness',
    'document credential requirements',
    'prepare device list/status mapping',
    'later status-only login test when dependency and env are explicitly selected',
    'experimental auth/device-list test when LYNELL_DREAME_EXPERIMENTAL_LOGIN=true',
  ],
  explicitlyDisabledNow: [
    'start cleaning',
    'pause cleaning',
    'return to dock',
    'room cleaning',
    'zone cleaning',
    'map operations',
    'schedule operations',
  ],
  env: {
    enabled: 'LYNELL_DREAME_CLOUD_ENABLED',
    region: 'LYNELL_DREAME_REGION',
    username: 'LYNELL_DREAME_USERNAME',
    password: 'LYNELL_DREAME_PASSWORD',
    accountType: 'LYNELL_DREAME_CLOUD_ACCOUNT_TYPE',
    targetDeviceId: 'LYNELL_DREAME_DEVICE_ID',
    selectedClient: 'LYNELL_DREAME_SELECTED_CLIENT',
    experimentalLogin: 'LYNELL_DREAME_EXPERIMENTAL_LOGIN',
    authDebug: 'LYNELL_DREAME_AUTH_DEBUG',
    authProfile: 'LYNELL_DREAME_AUTH_PROFILE',
    deviceListDebug: 'LYNELL_DREAME_DEVICE_LIST_DEBUG',
  },
  auth: {
    required: true,
    expectedFields: ['region', 'username', 'password'],
    optionalFields: ['accountType', 'targetDeviceId', 'selectedClient'],
    secretPolicy: [
      'Never expose password in API payloads.',
      'Never log password or authorization tokens.',
      'Store future refreshed tokens only server-side.',
    ],
    knownRisks: [
      'DreameHome/Mi Home account flows may differ by device generation and region.',
      '2FA/captcha/token refresh can make native login brittle.',
      'Cloud API and MQTT behavior can change without notice.',
      'D20/D20 Plus model identifiers must be verified from an actual device list.',
    ],
  },
  deviceListContract: {
    requiredFields: ['deviceId', 'name', 'model', 'region'],
    optionalFields: ['did', 'mac', 'localIp', 'firmwareVersion', 'roomOrHomeName'],
    targetMatching: [
      'prefer explicit LYNELL_DREAME_CLOUD_DEVICE_ID',
      'otherwise match model/name containing D20 or D20 Plus',
      'do not auto-select a physical robot for commands',
    ],
  },
  statusContract: {
    requiredFields: ['status', 'battery', 'lastUpdatedAt'],
    optionalFields: [
      'docked',
      'charging',
      'cleaning',
      'paused',
      'returning',
      'errorState',
      'fanSpeed',
      'waterLevel',
      'cleanedArea',
      'cleaningTime',
      'mapId',
    ],
  },
  normalizedStatus: {
    status: ['idle', 'cleaning', 'paused', 'returning', 'docked', 'charging', 'error', 'unavailable'],
    battery: '0-100 number when available',
    docked: 'boolean when derivable from status/charging state',
    charging: 'boolean when available',
    integrationStatus: ['foundation', 'readyForStatusTest', 'connected', 'degraded', 'error'],
  },
  nextPhases: [
    'Choose native client direction after dependency/protocol validation.',
    'Status-only login test with complete env and explicit user action.',
    'Device list fetch and Dream D20 Plus identification.',
    'Status/battery/docked normalization.',
    'Only after stable status: first safe command can be dock/return_to_base.',
  ],
}

function readDreameCloudConfig(env = process.env) {
  const enabled = String(env.LYNELL_DREAME_CLOUD_ENABLED ?? 'false').toLowerCase() === 'true'
  const experimentalLogin = String(env.LYNELL_DREAME_EXPERIMENTAL_LOGIN ?? 'false').toLowerCase() === 'true'
  const commandsEnabled = String(env.LYNELL_DREAME_COMMANDS_ENABLED ?? 'false').toLowerCase() === 'true'
  const allowDockCommand = String(env.LYNELL_DREAME_ALLOW_DOCK_COMMAND ?? 'false').toLowerCase() === 'true'
  const authDebug = String(env.LYNELL_DREAME_AUTH_DEBUG ?? 'false').toLowerCase() === 'true'
  const deviceListDebug = String(env.LYNELL_DREAME_DEVICE_LIST_DEBUG ?? 'false').toLowerCase() === 'true'
  const authProfile = String(env.LYNELL_DREAME_AUTH_PROFILE ?? DEFAULT_AUTH_PROFILE).trim()
  const legacyVacuumEnabled = String(env.LYNELL_VACUUM_ENABLED ?? 'false').toLowerCase() === 'true'
  const legacyProvider = String(env.LYNELL_VACUUM_PROVIDER ?? '').trim()
  const password = String(
    env.LYNELL_DREAME_PASSWORD ??
    env.LYNELL_DREAME_CLOUD_PASSWORD ??
    env.LYNELL_VACUUM_DREAME_PASSWORD ??
    '',
  )
  const region = String(
    env.LYNELL_DREAME_REGION ??
    env.LYNELL_DREAME_CLOUD_REGION ??
    env.LYNELL_VACUUM_DREAME_REGION ??
    '',
  ).trim().toLowerCase()
  const country = String(
    env.LYNELL_DREAME_COUNTRY ??
    env.LYNELL_DREAME_CLOUD_COUNTRY ??
    region.toUpperCase() ??
    '',
  ).trim().toUpperCase()
  const targetDeviceId = String(
    env.LYNELL_DREAME_DEVICE_ID ??
    env.LYNELL_DREAME_CLOUD_DEVICE_ID ??
    '',
  ).trim()

  return {
    enabled,
    experimentalLogin,
    commandsEnabled,
    allowDockCommand,
    authDebug,
    deviceListDebug,
    authProfile,
    selectedByVacuumRuntime: legacyVacuumEnabled && legacyProvider === 'dreameCloud',
    region,
    country,
    username: String(
      env.LYNELL_DREAME_USERNAME ??
      env.LYNELL_DREAME_CLOUD_USERNAME ??
      env.LYNELL_VACUUM_DREAME_USERNAME ??
      '',
    ).trim(),
    password,
    passwordConfigured: password.length > 0,
    accountType: String(env.LYNELL_DREAME_CLOUD_ACCOUNT_TYPE ?? 'dreamehome').trim(),
    targetDeviceId,
    targetDeviceIdConfigured: targetDeviceId.length > 0,
    selectedClient: String(
      env.LYNELL_DREAME_SELECTED_CLIENT ??
      env.LYNELL_DREAME_CLOUD_CLIENT ??
      '',
    ).trim(),
    timeoutMs: Number(env.LYNELL_DREAME_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS),
    appAuthorization: String(env.LYNELL_DREAME_APP_AUTHORIZATION ?? DREAME_APP_AUTHORIZATION).trim(),
    rlc: String(env.LYNELL_DREAME_RLC ?? DREAME_DEFAULT_RLC).trim(),
  }
}

function getDreameConnectSingleflightKey(config) {
  return createHash('sha256')
    .update(JSON.stringify({
      region: config.region,
      country: config.country,
      selectedClient: config.selectedClient,
      authProfile: config.authProfile,
      targetDeviceIdConfigured: Boolean(config.targetDeviceId),
      usernameHash: config.username ? createHash('sha256').update(config.username).digest('hex') : null,
      passwordHash: config.password ? createHash('sha256').update(config.password).digest('hex') : null,
    }))
    .digest('hex')
}

function getMissingEnv(config) {
  const missing = []

  if (!config.region) {
    missing.push('LYNELL_DREAME_REGION')
  }

  if (config.region && !REGION_HOSTS[config.region]) {
    missing.push(`unsupported-region:${config.region}`)
  }

  if (!config.username) {
    missing.push('LYNELL_DREAME_USERNAME')
  }

  if (!config.passwordConfigured) {
    missing.push('LYNELL_DREAME_PASSWORD')
  }

  if (config.experimentalLogin && !config.selectedClient) {
    missing.push('LYNELL_DREAME_SELECTED_CLIENT')
  }

  if (config.experimentalLogin && config.selectedClient && !CLIENT_STRATEGIES[config.selectedClient]) {
    missing.push(`unsupported-client:${config.selectedClient}`)
  }

  return missing
}

function getSafeConfig(config) {
  const supportedAuthProfiles = [
    DEFAULT_AUTH_PROFILE,
    TASSHACK_COMPATIBLE_AUTH_PROFILE,
    EXPLICIT_FORM_URLENCODED_AUTH_PROFILE,
  ]

  return {
    enabled: config.enabled,
    experimentalLogin: config.experimentalLogin,
    authDebug: config.authDebug,
    deviceListDebug: config.deviceListDebug,
    authProfile: config.authProfile,
    selectedByVacuumRuntime: config.selectedByVacuumRuntime,
    commandsEnabled: config.commandsEnabled,
    allowDockCommand: config.allowDockCommand,
    region: config.region || null,
    country: config.country || null,
    usernameConfigured: Boolean(config.username),
    passwordConfigured: config.passwordConfigured,
    hasCredentials: Boolean(config.username && config.passwordConfigured),
    accountType: config.accountType || null,
    targetDeviceIdConfigured: config.targetDeviceIdConfigured,
    selectedClient: config.selectedClient || null,
    supportedClients: Object.keys(CLIENT_STRATEGIES),
    supportedAuthProfiles,
    timeoutMs: Number.isFinite(config.timeoutMs) ? config.timeoutMs : DEFAULT_TIMEOUT_MS,
  }
}

function createSafeLogPayload(config, extra = {}) {
  return {
    provider: 'dreameCloud',
    enabled: config.enabled,
    experimentalLogin: config.experimentalLogin,
    authDebug: config.authDebug,
    deviceListDebug: config.deviceListDebug,
    authProfile: config.authProfile,
    selectedRegion: config.region || null,
    hasCredentials: Boolean(config.username && config.passwordConfigured),
    targetDeviceIdConfigured: config.targetDeviceIdConfigured,
    selectedClient: config.selectedClient || null,
    supportedClients: Object.keys(CLIENT_STRATEGIES),
    ...extra,
  }
}

function maskIdentifier(value) {
  const text = String(value ?? '').trim()

  if (!text) {
    return null
  }

  if (text.length <= 6) {
    return `${text.slice(0, 1)}***${text.slice(-1)}`
  }

  return `${text.slice(0, 3)}***${text.slice(-3)}`
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value > 0
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    if (['true', 'online', '1', 'yes', 'connected', 'available', 'charging', 'docked'].includes(normalized)) {
      return true
    }

    if (['false', 'offline', '0', 'no', 'disconnected', 'unavailable', 'unknown'].includes(normalized)) {
      return false
    }
  }

  return null
}

function normalizeNumber(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return null
  }

  return numericValue
}

function normalizeBattery(value) {
  const numericValue = normalizeNumber(value)

  if (numericValue === null) {
    return null
  }

  return Math.max(0, Math.min(100, Math.round(numericValue)))
}

function getFirstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '')
}

function getValueAtPath(value, path) {
  return path.split('.').reduce((currentValue, part) => currentValue?.[part], value)
}

function getPrimitiveValue(value) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value !== 'object') {
    return value
  }

  return getFirstDefined(
    value.value,
    value.val,
    value.level,
    value.percent,
    value.status,
    value.state,
    value.text,
    value.label,
    value.code,
  )
}

function getFirstFieldCandidate(device, fields) {
  for (const field of fields) {
    const value = getPrimitiveValue(getValueAtPath(device, field))

    if (value !== undefined && value !== null && value !== '') {
      return {
        field,
        value,
      }
    }
  }

  return {
    field: null,
    value: null,
  }
}

function normalizeTimestamp(value) {
  const primitiveValue = getPrimitiveValue(value)

  if (primitiveValue === undefined || primitiveValue === null || primitiveValue === '') {
    return null
  }

  const numericValue = Number(primitiveValue)

  if (Number.isFinite(numericValue)) {
    if (numericValue > 1000000000000) {
      return new Date(numericValue).toISOString()
    }

    if (numericValue > 1000000000) {
      return new Date(numericValue * 1000).toISOString()
    }
  }

  return String(primitiveValue)
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getTopLevelKeys(value) {
  if (!isPlainObject(value)) {
    return []
  }

  return Object.keys(value).slice(0, 40)
}

function inspectArrayPaths(value, prefix = '$', depth = 0, paths = []) {
  if (depth > 4 || paths.length >= 24) {
    return paths
  }

  if (Array.isArray(value)) {
    paths.push({
      path: prefix,
      count: value.length,
    })

    if (value.length > 0) {
      inspectArrayPaths(value[0], `${prefix}[0]`, depth + 1, paths)
    }

    return paths
  }

  if (!isPlainObject(value)) {
    return paths
  }

  for (const [key, childValue] of Object.entries(value)) {
    inspectArrayPaths(childValue, `${prefix}.${key}`, depth + 1, paths)
  }

  return paths
}

function getDeviceListFromPayload(payload) {
  const candidates = [
    payload?.data?.page?.records,
    payload?.data?.records,
    payload?.data?.list,
    payload?.data?.devices,
    payload?.data?.items,
    payload?.data,
    payload?.records,
    payload?.list,
    payload?.devices,
    payload?.items,
    payload?.result?.list,
    payload?.result?.records,
    payload?.result?.devices,
    payload?.result?.items,
  ]

  const list = candidates.find(Array.isArray)
  return list ?? []
}

function getDeviceListCandidateCounts(payload) {
  return [
    ['data.records', payload?.data?.records],
    ['data.list', payload?.data?.list],
    ['data.devices', payload?.data?.devices],
    ['data.items', payload?.data?.items],
    ['data.page.records', payload?.data?.page?.records],
    ['data.page.list', payload?.data?.page?.list],
    ['data.page.items', payload?.data?.page?.items],
    ['data', payload?.data],
    ['records', payload?.records],
    ['list', payload?.list],
    ['devices', payload?.devices],
    ['items', payload?.items],
    ['result.list', payload?.result?.list],
    ['result.records', payload?.result?.records],
    ['result.devices', payload?.result?.devices],
    ['result.items', payload?.result?.items],
  ]
    .filter(([, value]) => Array.isArray(value))
    .map(([path, value]) => ({
      path,
      count: value.length,
    }))
}

function getPayloadType(value) {
  if (value === null) {
    return 'null'
  }

  if (Array.isArray(value)) {
    return 'array'
  }

  return typeof value
}

function isEmptyPlainObject(value) {
  return isPlainObject(value) && Object.keys(value).length === 0
}

function hasOwnKey(value, key) {
  return isPlainObject(value) && Object.prototype.hasOwnProperty.call(value, key)
}

function summarizePrimitive(value) {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    return value.slice(0, 120)
  }

  return `[${getPayloadType(value)}]`
}

function getWrapperPresence(payload) {
  const wrappers = ['data', 'result', 'list', 'devices', 'page', 'items']

  return wrappers.map((key) => ({
    key,
    present: hasOwnKey(payload, key),
    type: getPayloadType(payload?.[key]),
    topLevelOnly: true,
  }))
}

function getNestedWrapperPresence(payload) {
  return [
    ['data.list', payload?.data?.list],
    ['data.devices', payload?.data?.devices],
    ['data.page', payload?.data?.page],
    ['data.items', payload?.data?.items],
    ['result.list', payload?.result?.list],
    ['result.devices', payload?.result?.devices],
    ['result.page', payload?.result?.page],
    ['result.items', payload?.result?.items],
  ].map(([path, value]) => ({
    path,
    present: value !== undefined,
    type: getPayloadType(value),
    count: Array.isArray(value) ? value.length : null,
  }))
}

function getStatusCodeMessage(payload) {
  return {
    status: summarizePrimitive(getFirstDefined(payload?.status, payload?.data?.status, payload?.result?.status)),
    code: summarizePrimitive(getFirstDefined(payload?.code, payload?.data?.code, payload?.result?.code)),
    msg: summarizePrimitive(getFirstDefined(
      payload?.msg,
      payload?.message,
      payload?.data?.msg,
      payload?.data?.message,
      payload?.result?.msg,
      payload?.result?.message,
    )),
    success: summarizePrimitive(getFirstDefined(payload?.success, payload?.data?.success, payload?.result?.success)),
  }
}

function getDeviceId(device) {
  return getFirstDefined(
    device?.did,
    device?.deviceId,
    device?.device_id,
    device?.iotId,
    device?.iot_id,
    device?.id,
    device?.uid,
    device?.sn,
    device?.mac,
  )
}

const DEVICE_FIELD_CANDIDATES = {
  name: ['name', 'deviceName', 'nickName', 'customName'],
  model: ['model', 'modelName', 'productModel', 'productName', 'deviceModel'],
  identifiers: ['did', 'deviceId', 'device_id', 'iotId', 'iot_id', 'id', 'uid', 'sn', 'mac'],
  online: [
    'online',
    'onlineStatus',
    'isOnline',
    'online_status',
    'deviceOnline',
    'available',
    'availability',
    'statusText',
    'status',
    'properties.online',
    'properties.isOnline',
  ],
  battery: [
    'battery',
    'batteryLevel',
    'battery_level',
    'batteryInfo',
    'batteryInfo.level',
    'batteryInfo.value',
    'properties.battery',
    'properties.batteryLevel',
    'property.battery',
    'state.battery',
    'status.battery',
  ],
  docked: [
    'docked',
    'isDocked',
    'inDock',
    'in_dock',
    'dockStatus',
    'properties.docked',
    'properties.isDocked',
    'properties.dockStatus',
    'state.docked',
  ],
  charging: [
    'charging',
    'isCharging',
    'chargeStatus',
    'chargingStatus',
    'charge_status',
    'charging_status',
    'properties.charging',
    'properties.isCharging',
    'properties.chargeStatus',
    'state.charging',
  ],
  status: [
    'status',
    'state',
    'statusText',
    'displayStatus',
    'workStatus',
    'workingStatus',
    'deviceStatus',
    'latestStatus',
    'onlineStatus',
    'properties.status',
    'properties.state',
    'properties.workStatus',
    'state.status',
    'state.text',
  ],
  lastUpdatedAt: [
    'updateTime',
    'updatedAt',
    'gmtModified',
    'lastUpdatedAt',
    'lastUpdateTime',
    'last_seen',
    'lastSeen',
    'lastOnlineTime',
    'properties.updateTime',
    'properties.lastSeen',
  ],
}

function normalizeStatusText(device) {
  const status = getFirstFieldCandidate(device, DEVICE_FIELD_CANDIDATES.status).value

  if (status === undefined || status === null) {
    return null
  }

  return String(status)
}

function getLanguagePriority(language) {
  const normalizedLanguage = String(language ?? '').toLowerCase()
  const exactIndex = STATUS_LANGUAGE_PRIORITY.indexOf(normalizedLanguage)

  if (exactIndex >= 0) {
    return exactIndex
  }

  const baseIndex = STATUS_LANGUAGE_PRIORITY.indexOf(normalizedLanguage.split(/[-_]/)[0])
  return baseIndex >= 0 ? baseIndex : STATUS_LANGUAGE_PRIORITY.length + 1
}

function isLikelyLanguageKey(value) {
  return /^[a-z]{2}(?:[-_][a-z]{2})?$/i.test(String(value ?? ''))
}

function isLikelyStatusCodeKey(value) {
  return /^\d+$/.test(String(value ?? '').trim())
}

function normalizeStatusFromLocalizedText(value) {
  const text = String(value ?? '').toLowerCase()

  if (!text) {
    return null
  }

  if (text.includes('return') && (text.includes('charge') || text.includes('base') || text.includes('dock'))) {
    return 'returning'
  }

  if (text.includes('clean') || text.includes('sweep') || text.includes('working')) {
    return 'cleaning'
  }

  if (text.includes('pause')) {
    return 'paused'
  }

  if (text.includes('error') || text.includes('fault')) {
    return 'error'
  }

  if (text.includes('charging')) {
    return 'charging'
  }

  if (text.includes('standby') || text.includes('idle')) {
    return 'idle'
  }

  return null
}

function collectStatusCodeDictionaryEntries(value) {
  const entries = []

  function visit(currentValue, path = '$', depth = 0) {
    if (!isPlainObject(currentValue) || depth > 8 || entries.length >= 300) {
      return
    }

    const languageMaps = Object.entries(currentValue)
      .filter(([language, languageValue]) => isLikelyLanguageKey(language) && isPlainObject(languageValue))
      .map(([language, languageValue], index) => ({
        language,
        languageValue,
        index,
        priority: getLanguagePriority(language),
      }))

    if (languageMaps.length > 0) {
      const codes = new Set()

      for (const { languageValue } of languageMaps) {
        for (const code of Object.keys(languageValue)) {
          if (isLikelyStatusCodeKey(code) && typeof languageValue[code] === 'string') {
            codes.add(String(code))
          }
        }
      }

      const orderedLanguageMaps = languageMaps
        .slice()
        .sort((a, b) => a.priority - b.priority || a.index - b.index)

      for (const code of codes) {
        const selected = orderedLanguageMaps.find(({ languageValue }) => typeof languageValue[code] === 'string')

        if (selected) {
          entries.push({
            code,
            localizedText: selected.languageValue[code].slice(0, 180),
            language: selected.language,
            path: `${path}.${selected.language}.${code}`,
            availableLanguages: languageMaps
              .filter(({ languageValue }) => typeof languageValue[code] === 'string')
              .map(({ language }) => language)
              .slice(0, 12),
          })
        }
      }
    }

    for (const [key, childValue] of Object.entries(currentValue)) {
      visit(childValue, `${path}.${key}`, depth + 1)
    }
  }

  visit(value)
  return entries
}

function buildStatusCodeDictionaryFromKeyDefine(value) {
  const byCode = new Map()

  for (const entry of collectStatusCodeDictionaryEntries(value)) {
    const existing = byCode.get(entry.code)

    if (!existing) {
      byCode.set(entry.code, entry)
      continue
    }

    const existingPriority = getLanguagePriority(existing.language)
    const nextPriority = getLanguagePriority(entry.language)
    const existingLooksPrimary = existing.path.includes('$.keyDefine.2.1.')
    const nextLooksPrimary = entry.path.includes('$.keyDefine.2.1.')

    if (
      (nextLooksPrimary && !existingLooksPrimary) ||
      (nextLooksPrimary === existingLooksPrimary && nextPriority < existingPriority)
    ) {
      byCode.set(entry.code, entry)
    }
  }

  const entries = Array.from(byCode.values()).sort((a, b) => Number(a.code) - Number(b.code))

  return {
    source: 'keyDefine-localization',
    preferredLanguages: STATUS_LANGUAGE_PRIORITY,
    count: entries.length,
    entries,
    byCode,
  }
}

async function getDeviceStatusCodeDictionary(config, device) {
  const keyDefineUrl = getDeviceKeyDefineUrl(device)

  if (!keyDefineUrl) {
    return null
  }

  try {
    const keyDefine = await fetchDeviceKeyDefine(config, keyDefineUrl)
    return buildStatusCodeDictionaryFromKeyDefine(keyDefine)
  } catch {
    return null
  }
}

function getLatestStatusCodeMapping(candidate, statusCodeDictionary = null) {
  if (!candidate.field || !['latestStatus', 'status', 'deviceStatus', 'workStatus', 'workingStatus'].includes(candidate.field)) {
    return null
  }

  const code = String(candidate.value ?? '').trim()

  if (!code) {
    return null
  }

  const dictionaryEntry = statusCodeDictionary?.byCode?.get?.(code)

  if (dictionaryEntry) {
    return {
      code,
      normalizedStatus: normalizeStatusFromLocalizedText(dictionaryEntry.localizedText),
      label: dictionaryEntry.localizedText,
      localizedText: dictionaryEntry.localizedText,
      localizedLanguage: dictionaryEntry.language,
      localizedPath: dictionaryEntry.path,
      availableLanguages: dictionaryEntry.availableLanguages,
      docked: null,
      charging: null,
      confidence: 'confirmed',
      note: `latestStatus=${code} er mappet fra keyDefine (${dictionaryEntry.path}).`,
    }
  }

  const mapping = DREAME_LATEST_STATUS_CODE_MAP[code]

  if (!mapping) {
    return {
      code,
      normalizedStatus: null,
      label: `Statuskode ${code}`,
      localizedText: null,
      localizedLanguage: null,
      localizedPath: null,
      docked: null,
      charging: null,
      confidence: 'unknown',
      note: `latestStatus=${code} er observert, men ikke mappet sikkert ennå.`,
    }
  }

  return {
    code,
    ...mapping,
    localizedText: null,
    localizedLanguage: null,
    localizedPath: null,
  }
}

function recordObservedStatusCode(device, mapping = null, statusCandidate = null) {
  const candidate = statusCandidate ?? getFirstFieldCandidate(device, DEVICE_FIELD_CANDIDATES.status)
  const resolvedMapping = mapping ?? getLatestStatusCodeMapping(candidate)

  if (!resolvedMapping?.code) {
    return null
  }

  const now = new Date().toISOString()
  const existing = observedStatusCodes.get(resolvedMapping.code)

  observedStatusCodes.set(resolvedMapping.code, {
    code: resolvedMapping.code,
    count: (existing?.count ?? 0) + 1,
    firstSeenAt: existing?.firstSeenAt ?? now,
    lastSeenAt: now,
    source: candidate.field,
    label: resolvedMapping.label,
    localizedText: resolvedMapping.localizedText ?? null,
    localizedLanguage: resolvedMapping.localizedLanguage ?? null,
    localizedPath: resolvedMapping.localizedPath ?? null,
    normalizedStatus: resolvedMapping.normalizedStatus,
    confidence: resolvedMapping.confidence,
    docked: resolvedMapping.docked,
    charging: resolvedMapping.charging,
    note: resolvedMapping.note,
  })

  return observedStatusCodes.get(resolvedMapping.code)
}

function getObservedStatusCodes() {
  return Array.from(observedStatusCodes.values()).sort((a, b) => String(a.code).localeCompare(String(b.code)))
}

function inferBooleanFromText(text, positiveTerms, negativeTerms = []) {
  const normalizedText = String(text ?? '').toLowerCase()

  if (!normalizedText) {
    return null
  }

  if (negativeTerms.some((term) => normalizedText.includes(term))) {
    return false
  }

  if (positiveTerms.some((term) => normalizedText.includes(term))) {
    return true
  }

  return null
}

function getStatusFieldQuality(sources, derived = []) {
  const trackedFields = ['online', 'battery', 'docked', 'charging', 'statusText', 'lastUpdatedAt']
  const derivedFields = derived.map((entry) => entry.field).filter(Boolean)
  const found = trackedFields.filter((field) => Boolean(sources[field]) || derivedFields.includes(field))
  const missing = trackedFields.filter((field) => !sources[field])
  const unknown = missing.filter((field) => !derivedFields.includes(field))

  return {
    quality: found.length >= 4 ? 'high' : found.length >= 2 ? 'medium' : 'low',
    found,
    missing,
    unknown,
    derived,
    sources,
  }
}

function getDerivedStateFromStatusMapping(statusCodeMapping) {
  if (
    statusCodeMapping?.normalizedStatus === 'charging' &&
    statusCodeMapping?.confidence === 'confirmed'
  ) {
    return {
      derivedState: true,
      derivedFromStatusCode: true,
      derivedFromCode: statusCodeMapping.code,
      fields: [
        {
          field: 'charging',
          value: true,
          reason: 'confirmed-keyDefine-status',
          source: 'latestStatus',
          code: statusCodeMapping.code,
        },
        {
          field: 'docked',
          value: true,
          reason: 'confirmed-keyDefine-status',
          source: 'latestStatus',
          code: statusCodeMapping.code,
        },
      ],
    }
  }

  return {
    derivedState: false,
    derivedFromStatusCode: false,
    derivedFromCode: null,
    fields: [],
  }
}

function normalizeDeviceSummary(device, options = {}) {
  const rawDeviceId = getDeviceId(device)
  const nameCandidate = getFirstFieldCandidate(device, DEVICE_FIELD_CANDIDATES.name)
  const modelCandidate = getFirstFieldCandidate(device, DEVICE_FIELD_CANDIDATES.model)
  const onlineCandidate = getFirstFieldCandidate(device, DEVICE_FIELD_CANDIDATES.online)
  const batteryCandidate = getFirstFieldCandidate(device, DEVICE_FIELD_CANDIDATES.battery)
  const chargingCandidate = getFirstFieldCandidate(device, DEVICE_FIELD_CANDIDATES.charging)
  const dockedCandidate = getFirstFieldCandidate(device, DEVICE_FIELD_CANDIDATES.docked)
  const statusCandidate = getFirstFieldCandidate(device, DEVICE_FIELD_CANDIDATES.status)
  const lastUpdatedAtCandidate = getFirstFieldCandidate(device, DEVICE_FIELD_CANDIDATES.lastUpdatedAt)
  const statusCodeMapping = getLatestStatusCodeMapping(statusCandidate, options.statusCodeDictionary)
  const observedStatusCode = options.recordObservation === false
    ? null
    : recordObservedStatusCode(device, statusCodeMapping, statusCandidate)
  const rawStatusText = normalizeStatusText(device)
  const statusText = statusCodeMapping?.label ?? rawStatusText
  const online = normalizeBoolean(onlineCandidate.value)
  const battery = normalizeBattery(batteryCandidate.value)
  const derivedState = getDerivedStateFromStatusMapping(statusCodeMapping)
  const derivedCharging = derivedState.fields.find((entry) => entry.field === 'charging')?.value
  const derivedDocked = derivedState.fields.find((entry) => entry.field === 'docked')?.value
  const charging = derivedCharging === true
    ? true
    : normalizeBoolean(chargingCandidate.value) ??
      statusCodeMapping?.charging ??
      (statusCodeMapping ? null : inferBooleanFromText(statusText, ['charging', 'charge', 'lading']))
  const docked = derivedDocked === true
    ? true
    : normalizeBoolean(dockedCandidate.value) ??
      statusCodeMapping?.docked ??
      (statusCodeMapping ? null : inferBooleanFromText(statusText, ['docked', 'dock', 'base', 'station'], ['return']))
  const lastUpdatedAt = normalizeTimestamp(lastUpdatedAtCandidate.value)
  const fieldSources = {
    name: nameCandidate.field,
    model: modelCandidate.field,
    identifier: rawDeviceId ? 'masked' : null,
    online: onlineCandidate.field,
    battery: batteryCandidate.field,
    docked: dockedCandidate.field,
    charging: chargingCandidate.field,
    statusText: statusCandidate.field,
    lastUpdatedAt: lastUpdatedAtCandidate.field,
  }

  return {
    name: String(nameCandidate.value ?? 'Dreame robot'),
    model: String(modelCandidate.value ?? 'unknown'),
    deviceIdMasked: maskIdentifier(rawDeviceId),
    online,
    battery,
    docked,
    charging,
    derivedState: derivedState.derivedState,
    derivedFromStatusCode: derivedState.derivedFromStatusCode,
    derivedFromCode: derivedState.derivedFromCode,
    statusText,
    statusCode: statusCodeMapping?.code ?? null,
    localizedStatusText: statusCodeMapping?.localizedText ?? null,
    statusDictionaryLanguage: statusCodeMapping?.localizedLanguage ?? null,
    statusDictionaryPath: statusCodeMapping?.localizedPath ?? null,
    normalizedStatus: statusCodeMapping?.normalizedStatus ?? null,
    statusMappingConfidence: statusCodeMapping?.confidence ?? null,
    statusMappingNote: statusCodeMapping?.note ?? null,
    statusObservationNote: STATUS_CODE_OBSERVATION_NOTE,
    observedStatusCode,
    lastUpdatedAt,
    statusQuality: getStatusFieldQuality(fieldSources, derivedState.fields),
  }
}

function getCandidateFieldNames(device) {
  return Object.fromEntries(
    Object.entries(DEVICE_FIELD_CANDIDATES).map(([groupName, fields]) => [
      groupName,
      fields.filter((field) => {
        const value = getPrimitiveValue(getValueAtPath(device, field))
        return value !== undefined && value !== null && value !== ''
      }),
    ]),
  )
}

function inspectDeviceCandidate(device, index) {
  const rawDeviceId = getDeviceId(device)
  const normalized = normalizeDeviceSummary(device, { recordObservation: false })

  return {
    index,
    keys: getTopLevelKeys(device),
    candidateFieldNames: getCandidateFieldNames(device),
    statusQuality: normalized.statusQuality,
    normalizedPreview: {
      name: normalized.name,
      model: normalized.model,
      deviceIdMasked: normalized.deviceIdMasked,
      online: normalized.online,
      battery: normalized.battery,
      docked: normalized.docked,
      charging: normalized.charging,
      derivedState: normalized.derivedState,
      derivedFromStatusCode: normalized.derivedFromStatusCode,
      derivedFromCode: normalized.derivedFromCode,
      statusText: normalized.statusText,
      statusCode: normalized.statusCode,
      localizedStatusText: normalized.localizedStatusText,
      statusDictionaryLanguage: normalized.statusDictionaryLanguage,
      statusDictionaryPath: normalized.statusDictionaryPath,
      normalizedStatus: normalized.normalizedStatus,
      statusMappingConfidence: normalized.statusMappingConfidence,
      statusObservationNote: normalized.statusObservationNote,
      lastUpdatedAt: normalized.lastUpdatedAt,
    },
    nameCandidates: [
      device?.name,
      device?.deviceName,
      device?.nickName,
      device?.customName,
    ].filter((value) => value !== undefined && value !== null && value !== '').map(String).slice(0, 4),
    modelCandidates: [
      device?.model,
      device?.modelName,
      device?.productModel,
      device?.productName,
      device?.deviceModel,
    ].filter((value) => value !== undefined && value !== null && value !== '').map(String).slice(0, 5),
    maskedIds: [
      rawDeviceId,
      device?.did,
      device?.deviceId,
      device?.device_id,
      device?.iotId,
      device?.iot_id,
      device?.id,
      device?.uid,
      device?.sn,
      device?.mac,
    ].filter((value, valueIndex, values) => value && values.indexOf(value) === valueIndex).map(maskIdentifier).slice(0, 5),
    onlineCandidates: [
      device?.online,
      device?.onlineStatus,
      device?.isOnline,
      device?.status,
    ].filter((value) => value !== undefined && value !== null && value !== '').map(String).slice(0, 5),
    statusCandidates: [
      device?.status,
      device?.state,
      device?.onlineStatus,
      device?.deviceStatus,
      device?.latestStatus,
      device?.properties?.status,
    ].filter((value) => value !== undefined && value !== null && value !== '').map(String).slice(0, 5),
  }
}

function createDeviceListInspection(payload) {
  const devices = getDeviceListFromPayload(payload)

  return {
    inspectedAt: new Date().toISOString(),
    responseType: getPayloadType(payload),
    topLevelKeyCount: isPlainObject(payload) ? Object.keys(payload).length : 0,
    payloadIsNull: payload === null,
    payloadIsEmptyObject: isEmptyPlainObject(payload),
    topLevelKeys: getTopLevelKeys(payload),
    wrapperPresence: getWrapperPresence(payload),
    nestedWrapperPresence: getNestedWrapperPresence(payload),
    statusCodeMessage: getStatusCodeMessage(payload),
    arrayPaths: inspectArrayPaths(payload),
    deviceCountCandidates: getDeviceListCandidateCounts(payload),
    selectedDeviceArrayCount: devices.length,
    deviceCandidates: devices.slice(0, 8).map(inspectDeviceCandidate),
  }
}

function selectDeviceSummary(devices, targetDeviceId) {
  if (!devices.length) {
    return null
  }

  if (targetDeviceId) {
    const maskedTarget = maskIdentifier(targetDeviceId)
    const explicitMatch = devices.find((device) => device.deviceIdMasked === maskedTarget)

    if (explicitMatch) {
      return explicitMatch
    }
  }

  return devices.find((device) => /d20|dream/i.test(`${device.name} ${device.model}`)) ?? devices[0]
}

function selectRawDevice(devices, targetDeviceId) {
  if (!devices.length) {
    return null
  }

  if (targetDeviceId) {
    const explicitMatch = devices.find((device) => String(getDeviceId(device) ?? '') === targetDeviceId)

    if (explicitMatch) {
      return explicitMatch
    }
  }

  return devices.find((device) => /d20|dream/i.test(
    `${device?.name ?? ''} ${device?.customName ?? ''} ${device?.deviceName ?? ''} ${device?.model ?? ''} ${device?.deviceInfo?.displayName ?? ''}`,
  )) ?? devices[0]
}

function getDeviceKeyDefineUrl(device) {
  const url = getFirstDefined(device?.keyDefine?.url, device?.deviceInfo?.keyDefine?.url)

  if (!url) {
    return null
  }

  const text = String(url)
  return text.startsWith('https://') ? text : null
}

function textMatchesDockAction(value) {
  const text = String(value ?? '').toLowerCase()

  return [
    'dock',
    'charge',
    'charging',
    'base',
    'return',
    'return to',
    'station',
    'lade',
    'aufladen',
    'ladestation',
    'zurück',
  ].some((term) => text.includes(term))
}

function getDockMatchTerms(value) {
  const text = String(value ?? '').toLowerCase()
  const terms = [
    'dock',
    'charge',
    'charging',
    'base',
    'return',
    'return to',
    'station',
    'lade',
    'aufladen',
    'ladestation',
    'zurück',
  ]

  return terms.filter((term) => text.includes(term))
}

function getActionText(action, serviceText) {
  return [
    action?.description,
    action?.name,
    action?.code,
    action?.type,
    serviceText,
  ].filter(Boolean).join(' ')
}

function collectActionCandidatesFromKeyDefine(value, parentService = null, candidates = []) {
  if (!value || typeof value !== 'object') {
    return candidates
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectActionCandidatesFromKeyDefine(item, parentService, candidates)
    }

    return candidates
  }

  const serviceIid = value.iid && (Array.isArray(value.actions) || value.description)
    ? Number(value.iid)
    : parentService?.siid ?? null
  const serviceText = [
    parentService?.description,
    value.description,
    value.name,
    value.code,
    value.type,
  ].filter(Boolean).join(' ')

  if (Array.isArray(value.actions)) {
    const nextParent = {
      siid: serviceIid,
      description: serviceText,
    }

    for (const action of value.actions) {
      const actionText = getActionText(action, serviceText)
      const matchTerms = getDockMatchTerms(actionText)

      if (action.iid && serviceIid) {
        candidates.push({
          siid: Number(serviceIid),
          aiid: Number(action.iid),
          name: action.name ? String(action.name).slice(0, 120) : null,
          code: action.code ? String(action.code).slice(0, 120) : null,
          description: action.description ? String(action.description).slice(0, 160) : null,
          type: action.type ? String(action.type).slice(0, 160) : null,
          serviceDescription: serviceText ? serviceText.slice(0, 160) : null,
          matchesDockIntent: matchTerms.length > 0,
          matchTerms,
          confidence: matchTerms.length > 0 ? 'metadata-match' : 'candidate',
        })
      }

      collectActionCandidatesFromKeyDefine(action, nextParent, candidates)
    }
  }

  for (const child of Object.values(value)) {
    collectActionCandidatesFromKeyDefine(child, parentService, candidates)
  }

  return candidates
}

function inspectKeyDefineArrayPaths(value, prefix = '$', depth = 0, paths = []) {
  if (depth > 5 || paths.length >= 60) {
    return paths
  }

  if (Array.isArray(value)) {
    paths.push({
      path: prefix,
      count: value.length,
    })

    if (value.length > 0) {
      inspectKeyDefineArrayPaths(value[0], `${prefix}[0]`, depth + 1, paths)
    }

    return paths
  }

  if (!isPlainObject(value)) {
    return paths
  }

  for (const [key, childValue] of Object.entries(value)) {
    inspectKeyDefineArrayPaths(childValue, `${prefix}.${key}`, depth + 1, paths)
  }

  return paths
}

function inspectKnownKeyDefineSections(value) {
  const sectionNames = [
    'actions',
    'services',
    'properties',
    'events',
    'siid',
    'aiid',
    'piid',
    'instances',
    'modules',
    'modelInfo',
    'define',
    'specs',
  ]
  const found = Object.fromEntries(sectionNames.map((sectionName) => [sectionName, false]))

  function visit(currentValue, depth = 0) {
    if (!currentValue || depth > 6) {
      return
    }

    if (Array.isArray(currentValue)) {
      for (const item of currentValue.slice(0, 20)) {
        visit(item, depth + 1)
      }

      return
    }

    if (!isPlainObject(currentValue)) {
      return
    }

    for (const key of Object.keys(currentValue)) {
      if (Object.prototype.hasOwnProperty.call(found, key)) {
        found[key] = true
      }
    }

    for (const childValue of Object.values(currentValue)) {
      visit(childValue, depth + 1)
    }
  }

  visit(value)
  return found
}

function inspectCandidateStringFields(value) {
  const matches = []
  const terms = ['dock', 'charge', 'return', 'home', 'base', 'station', 'gocharge', 'charger']

  function visit(currentValue, path = '$', depth = 0) {
    if (depth > 7 || matches.length >= 80) {
      return
    }

    if (typeof currentValue === 'string') {
      const normalized = currentValue.toLowerCase()
      const matchTerms = terms.filter((term) => normalized.includes(term))

      if (matchTerms.length > 0) {
        matches.push({
          path,
          value: currentValue.slice(0, 180),
          matchTerms,
        })
      }

      return
    }

    if (Array.isArray(currentValue)) {
      currentValue.slice(0, 50).forEach((item, index) => visit(item, `${path}[${index}]`, depth + 1))
      return
    }

    if (!isPlainObject(currentValue)) {
      return
    }

    for (const [key, childValue] of Object.entries(currentValue)) {
      visit(childValue, `${path}.${key}`, depth + 1)
    }
  }

  visit(value)
  return matches
}

function createKeyDefineInspection(value) {
  const statusCodeDictionary = buildStatusCodeDictionaryFromKeyDefine(value)

  return {
    responseType: getPayloadType(value),
    topLevelKeys: getTopLevelKeys(value),
    payloadIsEmpty: value === null || value === undefined || isEmptyPlainObject(value),
    knownSectionsPresent: inspectKnownKeyDefineSections(value),
    arrayPaths: inspectKeyDefineArrayPaths(value),
    candidateStringFields: inspectCandidateStringFields(value),
    statusCodeDictionary: {
      source: statusCodeDictionary.source,
      preferredLanguages: statusCodeDictionary.preferredLanguages,
      count: statusCodeDictionary.count,
      entries: statusCodeDictionary.entries.slice(0, 80),
    },
  }
}

function findDockActionInKeyDefine(value, parentService = null) {
  if (!value || typeof value !== 'object') {
    return null
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findDockActionInKeyDefine(item, parentService)

      if (result) {
        return result
      }
    }

    return null
  }

  const serviceIid = value.iid && (Array.isArray(value.actions) || value.description)
    ? Number(value.iid)
    : parentService?.siid ?? null
  const serviceText = [
    parentService?.description,
    value.description,
    value.name,
    value.type,
  ].filter(Boolean).join(' ')

  if (Array.isArray(value.actions)) {
    const nextParent = {
      siid: serviceIid,
      description: serviceText,
    }

    for (const action of value.actions) {
      const actionText = [
        action.description,
        action.name,
        action.type,
        serviceText,
      ].filter(Boolean).join(' ')

      if (action.iid && serviceIid && textMatchesDockAction(actionText)) {
        return {
          siid: Number(serviceIid),
          aiid: Number(action.iid),
          label: String(action.description ?? action.name ?? action.type ?? 'dock action'),
          confidence: 'metadata-match',
        }
      }

      const nestedResult = findDockActionInKeyDefine(action, nextParent)

      if (nestedResult) {
        return nestedResult
      }
    }
  }

  for (const child of Object.values(value)) {
    const result = findDockActionInKeyDefine(child, parentService)

    if (result) {
      return result
    }
  }

  return null
}

function getRegionHost(config) {
  return REGION_HOSTS[config.region] ?? null
}

function getBaseUrl(config) {
  const host = getRegionHost(config)
  return host ? `https://${host}:13267` : null
}

function getRequestHeaders(config, contentType, token = '') {
  const headers = {
    'user-agent': 'Dart/3.2 (dart:io)',
    'dreame-meta': 'cv=i_829',
    'dreame-rlc': config.rlc || DREAME_DEFAULT_RLC,
    'tenant-id': '000000',
    authorization: config.appAuthorization || DREAME_APP_AUTHORIZATION,
    'content-type': contentType,
    'dreame-auth': token ? `bearer ${token}` : 'bearer',
  }

  if (config.authProfile === TASSHACK_COMPATIBLE_AUTH_PROFILE) {
    const host = getRegionHost(config)

    if (host) {
      headers.host = `${host}:13267`
    }
  }

  return headers
}

function createLoginBody(config) {
  const entries = [
    ['grant_type', 'password'],
    ['scope', 'all'],
    ['platform', 'IOS'],
    ['type', 'account'],
    ['username', config.username],
    ['password', hashDreamePassword(config.password)],
    ['country', config.country || config.region.toUpperCase()],
    ['lang', 'en'],
  ]

  if (config.authProfile === EXPLICIT_FORM_URLENCODED_AUTH_PROFILE) {
    return entries
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
  }

  return new URLSearchParams(entries)
}

function hashDreamePassword(password) {
  return createHash('md5')
    .update(`${password}${DREAME_PASSWORD_SALT}`)
    .digest('hex')
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error ?? 'Ukjent feil')
  return message
    .replace(configSecretPattern(), '[redacted]')
    .slice(0, 280)
}

function classifyResponseStatus(status) {
  if (status === null || status === undefined) {
    return 'network'
  }

  if (status === 400) {
    return 'auth-bad-request'
  }

  if (status === 401 || status === 403) {
    return 'auth-rejected'
  }

  if (status === 404) {
    return 'endpoint-not-found'
  }

  if (status === 408 || status === 429) {
    return 'temporary-or-rate-limited'
  }

  if (status >= 500) {
    return 'remote-server-error'
  }

  if (status >= 200 && status < 300) {
    return 'ok'
  }

  return 'unexpected-response'
}

function createAuthDiagnostic(stage, endpointCategory, responseStatus, classification, detail = null) {
  return {
    authStage: stage,
    endpointCategory,
    responseStatus: responseStatus ?? null,
    classification,
    detail,
  }
}

function createAuthStageError(message, diagnostic) {
  const error = new Error(message)
  error.authDiagnostic = diagnostic
  return error
}

function getAuthDiagnostics(error, fallback = []) {
  if (error?.authDiagnostics && Array.isArray(error.authDiagnostics)) {
    return error.authDiagnostics
  }

  if (error?.authDiagnostic) {
    return [error.authDiagnostic]
  }

  return fallback
}

function configSecretPattern() {
  return /([A-Za-z0-9+/=_-]{24,})/g
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs || DEFAULT_TIMEOUT_MS))

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw createAuthStageError('Dreame request timed out', createAuthDiagnostic(
        options?.authStage ?? 'unknown',
        options?.endpointCategory ?? 'unknown',
        null,
        'timeout',
      ))
    }

    throw createAuthStageError('Dreame network request failed', createAuthDiagnostic(
      options?.authStage ?? 'unknown',
      options?.endpointCategory ?? 'unknown',
      null,
      'network',
    ))
  } finally {
    clearTimeout(timeout)
  }
}

async function readJsonResponse(response, label, stage, endpointCategory) {
  const text = await response.text()
  const classification = classifyResponseStatus(response.status)

  if (!response.ok) {
    throw createAuthStageError(`${label} svarte ${response.status}`, createAuthDiagnostic(
      stage,
      endpointCategory,
      response.status,
      classification,
    ))
  }

  try {
    return text ? JSON.parse(text) : {}
  } catch {
    throw createAuthStageError(`${label} svarte med ugyldig JSON`, createAuthDiagnostic(
      stage,
      endpointCategory,
      response.status,
      'invalid-json',
    ))
  }
}

async function dreameLogin(config) {
  const baseUrl = getBaseUrl(config)

  if (!baseUrl) {
    throw new Error(`Unsupported Dreame region: ${config.region || 'missing'}`)
  }

  const body = createLoginBody(config)

  const response = await fetchWithTimeout(`${baseUrl}/dreame-auth/oauth/token`, {
    method: 'POST',
    headers: getRequestHeaders(config, 'application/x-www-form-urlencoded'),
    body,
    authStage: 'login',
    endpointCategory: 'auth-token',
  }, config.timeoutMs)

  const payload = await readJsonResponse(response, 'Dreame auth', 'login', 'auth-token')
  const accessToken = payload?.access_token ?? payload?.data?.access_token

  if (!accessToken) {
    throw createAuthStageError('Dreame auth svarte uten access token', createAuthDiagnostic(
      'login',
      'auth-token',
      200,
      'auth-token-missing',
    ))
  }

  return {
    accessToken: String(accessToken),
    expiresIn: normalizeNumber(payload?.expires_in ?? payload?.data?.expires_in),
  }
}

async function fetchDeviceList(config, accessToken) {
  const baseUrl = getBaseUrl(config)

  if (!baseUrl) {
    throw new Error(`Unsupported Dreame region: ${config.region || 'missing'}`)
  }

  const response = await fetchWithTimeout(`${baseUrl}/dreame-user-iot/iotuserbind/device/listV2`, {
    method: 'POST',
    headers: getRequestHeaders(config, 'application/json', accessToken),
    body: JSON.stringify({
      sharedStatus: 1,
      current: 1,
      size: 100,
    }),
    authStage: 'device-list',
    endpointCategory: 'device-list',
  }, config.timeoutMs)

  const payload = await readJsonResponse(response, 'Dreame device list', 'device-list', 'device-list')
  const inspection = config.deviceListDebug ? createDeviceListInspection(payload) : null
  const rawDevices = getDeviceListFromPayload(payload)
  const devices = []

  for (const rawDevice of rawDevices) {
    const statusCodeDictionary = await getDeviceStatusCodeDictionary(config, rawDevice)
    devices.push(normalizeDeviceSummary(rawDevice, { statusCodeDictionary }))
  }

  return {
    devices,
    rawDevices,
    inspection,
  }
}

async function fetchDeviceKeyDefine(config, url) {
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      'user-agent': 'Dart/3.2 (dart:io)',
    },
    authStage: 'dock-action-metadata',
    endpointCategory: 'key-define',
  }, config.timeoutMs)

  return readJsonResponse(response, 'Dreame keyDefine', 'dock-action-metadata', 'key-define')
}

function createCommandRequestId() {
  return Math.floor(Math.random() * 9000) + 1000
}

async function sendDreameActionCommand(config, accessToken, rawDevice, action) {
  const baseUrl = getBaseUrl(config)

  if (!baseUrl) {
    throw new Error(`Unsupported Dreame region: ${config.region || 'missing'}`)
  }

  const did = String(getDeviceId(rawDevice) ?? '')

  if (!did) {
    throw createAuthStageError('Dreame dock mangler device id', createAuthDiagnostic(
      'dock-command',
      'send-command',
      null,
      'missing-device-id',
    ))
  }

  const requestId = createCommandRequestId()
  const response = await fetchWithTimeout(`${baseUrl}/dreame-iot-com-10000/device/sendCommand`, {
    method: 'POST',
    headers: getRequestHeaders(config, 'application/json', accessToken),
    body: JSON.stringify({
      did,
      id: requestId,
      data: {
        did,
        id: requestId,
        method: 'action',
        params: {
          did,
          siid: action.siid,
          aiid: action.aiid,
        },
      },
    }),
    authStage: 'dock-command',
    endpointCategory: 'send-command',
  }, config.timeoutMs)

  const payload = await readJsonResponse(response, 'Dreame dock command', 'dock-command', 'send-command')
  const resultCode = getFirstDefined(payload?.data?.result?.code, payload?.code)

  return {
    responseStatus: response.status,
    responseCategory: classifyResponseStatus(response.status),
    remoteAccepted: resultCode === 0 || resultCode === '0' || payload?.success === true,
    remoteCode: resultCode === undefined || resultCode === null ? null : String(resultCode),
  }
}

async function runDreameHomeReverseEngineeredStatusClient(config) {
  const diagnostics = []

  try {
    const session = await dreameLogin(config)
    diagnostics.push(createAuthDiagnostic('login', 'auth-token', 200, 'ok'))
    const deviceList = await fetchDeviceList(config, session.accessToken)
    diagnostics.push(createAuthDiagnostic('device-list', 'device-list', 200, 'ok'))

    return {
      devices: deviceList.devices,
      deviceListInspection: deviceList.inspection,
      expiresIn: session.expiresIn,
      authDiagnostics: diagnostics,
    }
  } catch (error) {
    const stageDiagnostics = getAuthDiagnostics(error)
    error.authDiagnostics = diagnostics.concat(stageDiagnostics)
    throw error
  }
}

async function runSelectedClient(config) {
  if (config.selectedClient !== DREAME_SELECTED_CLIENT) {
    throw new Error(`Unsupported Dreame selected client: ${config.selectedClient || 'missing'}`)
  }

  return runDreameHomeReverseEngineeredStatusClient(config)
}

async function runDreameDockCommand(config) {
  if (!config.enabled) {
    return buildDockCommandResponse(config, {
      safeMode: {
        commandsEnabled: config.commandsEnabled,
        allowDockCommand: config.allowDockCommand,
        warning: DREAME_COMMAND_WARNING,
        state: 'disabled',
      },
      message: 'Dreame cloud er disabled. Ingen dock-kommando ble sendt.',
    })
  }

  if (!config.commandsEnabled || !config.allowDockCommand) {
    return buildDockCommandResponse(config, {
      safeMode: {
        commandsEnabled: config.commandsEnabled,
        allowDockCommand: config.allowDockCommand,
        warning: DREAME_COMMAND_WARNING,
        state: 'command-disabled',
      },
      message:
        'Dreame dock-command er deaktivert. Krever LYNELL_DREAME_COMMANDS_ENABLED=true og LYNELL_DREAME_ALLOW_DOCK_COMMAND=true.',
    })
  }

  const missingEnv = getMissingEnv(config)

  if (missingEnv.length > 0) {
    return buildDockCommandResponse(config, {
      safeMode: {
        commandsEnabled: config.commandsEnabled,
        allowDockCommand: config.allowDockCommand,
        warning: DREAME_COMMAND_WARNING,
        state: 'missing-env',
      },
      message: `Dreame dock-command mangler env: ${missingEnv.join(', ')}.`,
    })
  }

  if (!config.experimentalLogin || config.selectedClient !== DREAME_SELECTED_CLIENT) {
    return buildDockCommandResponse(config, {
      safeMode: {
        commandsEnabled: config.commandsEnabled,
        allowDockCommand: config.allowDockCommand,
        warning: DREAME_COMMAND_WARNING,
        state: 'experimental-login-required',
      },
      message:
        'Dreame dock-command krever samme explicit experimental login/client som status-only runtime.',
    })
  }

  try {
    safeCommandLog('dock-start', config, {
      provider: 'dreameCloud',
      command: 'dock',
      accepted: false,
      statusCodeCategory: 'starting',
    })
    const session = await dreameLogin(config)
    const deviceList = await fetchDeviceList(config, session.accessToken)
    const rawDevice = selectRawDevice(deviceList.rawDevices, config.targetDeviceId)

    if (!rawDevice) {
      return buildDockCommandResponse(config, {
        safeMode: {
          commandsEnabled: config.commandsEnabled,
          allowDockCommand: config.allowDockCommand,
          warning: DREAME_COMMAND_WARNING,
          state: 'device-not-found',
        },
        message: 'Dreame dock-command fant ingen valgt robot. Ingen kommando ble sendt.',
      })
    }

    const keyDefineUrl = getDeviceKeyDefineUrl(rawDevice)

    if (!keyDefineUrl) {
      return buildDockCommandResponse(config, {
        safeMode: {
          commandsEnabled: config.commandsEnabled,
          allowDockCommand: config.allowDockCommand,
          warning: DREAME_COMMAND_WARNING,
          state: 'missing-action-metadata',
        },
        message: 'Dreame dock-command mangler keyDefine/action metadata. Ingen kommando ble sendt.',
      })
    }

    const keyDefine = await fetchDeviceKeyDefine(config, keyDefineUrl)
    const dockAction = findDockActionInKeyDefine(keyDefine)

    if (!dockAction) {
      return buildDockCommandResponse(config, {
        safeMode: {
          commandsEnabled: config.commandsEnabled,
          allowDockCommand: config.allowDockCommand,
          warning: DREAME_COMMAND_WARNING,
          state: 'dock-action-not-found',
        },
        message: 'Dreame dock-action ble ikke identifisert sikkert i metadata. Ingen kommando ble sendt.',
      })
    }

    const result = await sendDreameActionCommand(config, session.accessToken, rawDevice, dockAction)
    const accepted = Boolean(result.remoteAccepted)

    safeCommandLog('dock-finished', config, {
      provider: 'dreameCloud',
      command: 'dock',
      accepted,
      rejected: !accepted,
      statusCodeCategory: result.responseCategory,
      remoteCode: result.remoteCode,
    })

    return buildDockCommandResponse(config, {
      ok: accepted,
      accepted,
      rejected: !accepted,
      safeMode: {
        commandsEnabled: config.commandsEnabled,
        allowDockCommand: config.allowDockCommand,
        warning: DREAME_COMMAND_WARNING,
        state: accepted ? 'sent' : 'remote-rejected',
      },
      statusCodeCategory: result.responseCategory,
      remoteCode: result.remoteCode,
      action: {
        siid: dockAction.siid,
        aiid: dockAction.aiid,
        confidence: dockAction.confidence,
      },
      message: accepted
        ? 'Dreame dock-command ble sendt via experimental reverse-engineered command path.'
        : 'Dreame dock-command ble sendt, men remote response bekreftet ikke suksess.',
    })
  } catch (commandError) {
    const error = sanitizeError(commandError)
    const diagnostics = getAuthDiagnostics(commandError)
    const statusCodeCategory = diagnostics.at(-1)?.classification ?? 'command-error'

    safeCommandLog('dock-failed', config, {
      provider: 'dreameCloud',
      command: 'dock',
      accepted: false,
      rejected: true,
      statusCodeCategory,
    })

    return buildDockCommandResponse(config, {
      safeMode: {
        commandsEnabled: config.commandsEnabled,
        allowDockCommand: config.allowDockCommand,
        warning: DREAME_COMMAND_WARNING,
        state: 'failed-closed',
      },
      statusCodeCategory,
      error,
      message: 'Dreame dock-command feilet kontrollert. Ingen retry-loop ble startet.',
    })
  }
}

async function runDreameDockReadiness(config, options = {}) {
  if (!config.enabled) {
    return buildDockReadinessResponse(config, {
      ok: false,
      reason: 'Dreame cloud er disabled.',
      safeMode: {
        commandsEnabled: config.commandsEnabled,
        allowDockCommand: config.allowDockCommand,
        warning: DREAME_COMMAND_WARNING,
        sendsCommand: false,
        state: 'disabled',
      },
    })
  }

  const missingEnv = getMissingEnv(config)

  if (missingEnv.length > 0) {
    return buildDockReadinessResponse(config, {
      ok: false,
      reason: `Mangler env: ${missingEnv.join(', ')}.`,
      safeMode: {
        commandsEnabled: config.commandsEnabled,
        allowDockCommand: config.allowDockCommand,
        warning: DREAME_COMMAND_WARNING,
        sendsCommand: false,
        state: 'missing-env',
      },
    })
  }

  if (!config.experimentalLogin || config.selectedClient !== DREAME_SELECTED_CLIENT) {
    return buildDockReadinessResponse(config, {
      ok: false,
      reason: 'Readiness krever samme explicit experimental login/client som status-only runtime.',
      safeMode: {
        commandsEnabled: config.commandsEnabled,
        allowDockCommand: config.allowDockCommand,
        warning: DREAME_COMMAND_WARNING,
        sendsCommand: false,
        state: 'experimental-login-required',
      },
    })
  }

  try {
    const session = await dreameLogin(config)
    const deviceList = await fetchDeviceList(config, session.accessToken)
    const rawDevice = selectRawDevice(deviceList.rawDevices, config.targetDeviceId)

    if (!rawDevice) {
      return buildDockReadinessResponse(config, {
        ok: false,
        reason: 'Ingen valgt robot funnet.',
        safeMode: {
          commandsEnabled: config.commandsEnabled,
          allowDockCommand: config.allowDockCommand,
          warning: DREAME_COMMAND_WARNING,
          sendsCommand: false,
          state: 'device-not-found',
        },
      })
    }

    const keyDefineUrl = getDeviceKeyDefineUrl(rawDevice)

    if (!keyDefineUrl) {
      return buildDockReadinessResponse(config, {
        ok: false,
        reason: 'Mangler keyDefine/action metadata på valgt robot.',
        safeMode: {
          commandsEnabled: config.commandsEnabled,
          allowDockCommand: config.allowDockCommand,
          warning: DREAME_COMMAND_WARNING,
          sendsCommand: false,
          state: 'missing-action-metadata',
        },
      })
    }

    const keyDefine = await fetchDeviceKeyDefine(config, keyDefineUrl)
    const metadataInspection = options.debug ? createKeyDefineInspection(keyDefine) : undefined
    const candidates = collectActionCandidatesFromKeyDefine(keyDefine)
      .filter((candidate, index, values) =>
        values.findIndex((other) => other.siid === candidate.siid && other.aiid === candidate.aiid) === index,
      )
      .slice(0, 80)
    const matchingCandidates = candidates.filter((candidate) => candidate.matchesDockIntent)
    const selectedCandidate = matchingCandidates.length === 1 ? matchingCandidates[0] : null
    const canAttemptDock = Boolean(
      selectedCandidate &&
        config.commandsEnabled &&
        config.allowDockCommand,
    )

    return buildDockReadinessResponse(config, {
      canAttemptDock,
      reason: selectedCandidate
        ? canAttemptDock
          ? 'Én sikker dock/charge/return-kandidat er funnet og safe env er aktivert.'
          : 'Én sikker dock/charge/return-kandidat er funnet, men command env må være aktivert før forsøk.'
        : matchingCandidates.length > 1
          ? 'Flere mulige dock/charge/return-kandidater funnet. Velg ikke automatisk.'
          : 'Ingen dock/charge/return-kandidat funnet i metadata.',
      candidates,
      selectedCandidate,
      ...(metadataInspection ? { metadataInspection } : {}),
      safeMode: {
        commandsEnabled: config.commandsEnabled,
        allowDockCommand: config.allowDockCommand,
        warning: DREAME_COMMAND_WARNING,
        sendsCommand: false,
        state: canAttemptDock ? 'ready' : 'inspection-only',
      },
    })
  } catch (readinessError) {
    const error = sanitizeError(readinessError)
    const diagnostics = getAuthDiagnostics(readinessError)

    return buildDockReadinessResponse(config, {
      ok: false,
      reason: 'Dock readiness feilet kontrollert.',
      error,
      statusCodeCategory: diagnostics.at(-1)?.classification ?? 'readiness-error',
      safeMode: {
        commandsEnabled: config.commandsEnabled,
        allowDockCommand: config.allowDockCommand,
        warning: DREAME_COMMAND_WARNING,
        sendsCommand: false,
        state: 'failed-closed',
      },
    })
  }
}

function safeLog(event, config, extra = {}) {
  console.info(`[DreameCloud] ${event}`, createSafeLogPayload(config, extra))
}

function safeCommandLog(event, config, extra = {}) {
  safeLog(event, config, {
    commandPath: 'experimental-reverse-engineered',
    ...extra,
  })
}

function buildDockCommandResponse(config, overrides = {}) {
  const timestamp = new Date().toISOString()

  return {
    ok: false,
    provider: 'dreameCloud',
    command: 'dock',
    accepted: false,
    rejected: true,
    safeMode: {
      commandsEnabled: config.commandsEnabled,
      allowDockCommand: config.allowDockCommand,
      warning: DREAME_COMMAND_WARNING,
    },
    timestamp,
    message: 'Dreame dock command er ikke sendt.',
    ...overrides,
  }
}

function buildDockReadinessResponse(config, overrides = {}) {
  return {
    ok: true,
    provider: 'dreameCloud',
    command: 'dock',
    canAttemptDock: false,
    reason: 'Dock readiness er ikke klar.',
    candidates: [],
    selectedCandidate: null,
    safeMode: {
      commandsEnabled: config.commandsEnabled,
      allowDockCommand: config.allowDockCommand,
      warning: DREAME_COMMAND_WARNING,
      sendsCommand: false,
    },
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

function buildStatus(config, overrides = {}) {
  const missingEnv = getMissingEnv(config)
  const configured = missingEnv.length === 0
  const enabled = config.enabled
  let state = DEFAULT_STATE
  let message = 'Dreame cloud adapter er disabled. Ingen cloud-login eller robotkommandoer er aktive.'

  if (enabled && !configured) {
    state = 'missing-env'
    message = `Dreame cloud adapter er aktivert, men mangler ${missingEnv.join(', ')}.`
  }

  if (enabled && configured) {
    state = 'foundation'
    message = 'Dreame cloud adapter har komplett env, men v0 er status-only foundation uten valgt live client.'
  }

  return {
    ok: true,
    provider: 'dreameCloud',
    enabled,
    connected: false,
    state,
    configured,
    missingEnv,
    selectedRegion: config.region || null,
    hasCredentials: Boolean(config.username && config.passwordConfigured),
    deviceCount: 0,
    observedStatusCodes: getObservedStatusCodes(),
    statusObservationNote: STATUS_CODE_OBSERVATION_NOTE,
    runtime: EXPERIMENTAL_RUNTIME,
    authDiagnostics: config.authDebug ? [] : undefined,
    deviceListInspection: undefined,
    clientStrategy: config.selectedClient
      ? CLIENT_STRATEGIES[config.selectedClient] ?? {
        id: config.selectedClient,
        supported: false,
        error: 'Unsupported selected client',
      }
      : null,
    config: getSafeConfig(config),
    adapterContract: ADAPTER_CONTRACT,
    researchSources: RESEARCH_SOURCES,
    devices: [],
    selectedDevice: null,
    lastSyncAt: null,
    error: null,
    message,
    ...overrides,
  }
}

export function createDreameCloudRuntime(options = {}) {
  const config = readDreameCloudConfig(options.env)

  function getStatus() {
    const status = buildStatus(config)
    safeLog('status', config, {
      state: status.state,
      configured: status.configured,
      missingEnv: status.missingEnv,
      deviceCount: status.deviceCount,
    })
    return status
  }

  async function connect() {
    if (!config.enabled) {
      const status = buildStatus(config, {
        message: 'Dreame cloud status-test er ikke aktivert. Sett LYNELL_DREAME_CLOUD_ENABLED=true først.',
      })
      safeLog('connect-skipped-disabled', config, { state: status.state })
      return status
    }

    const missingEnv = getMissingEnv(config)

    if (missingEnv.length > 0) {
      const status = buildStatus(config, {
        error: `Mangler ${missingEnv.join(', ')}.`,
        message: 'Dreame cloud status-test kan ikke starte før env er komplett. Ingen login ble forsøkt.',
      })
      safeLog('connect-skipped-missing-env', config, {
        state: status.state,
        missingEnv,
      })
      return status
    }

    if (!config.experimentalLogin) {
      const status = buildStatus(config, {
        state: 'ready-for-status-only-test',
        message:
          'Dreame cloud env er komplett. Sett LYNELL_DREAME_EXPERIMENTAL_LOGIN=true for å forsøke reverse-engineered status-only login.',
      })
      safeLog('connect-ready-status-only', config, {
        state: status.state,
        deviceCount: status.deviceCount,
      })
      return status
    }

    const singleflightKey = getDreameConnectSingleflightKey(config)
    const existingConnect = dreameConnectInFlightByConfig.get(singleflightKey)
    if (existingConnect) {
      safeLog('experimental-login-join-inflight', config, {
        state: 'connecting',
        selectedClient: config.selectedClient,
      })
      return existingConnect
    }

    const connectPromise = (async () => {
      safeLog('experimental-login-start', config, {
        state: 'connecting',
        runtime: EXPERIMENTAL_RUNTIME,
        selectedClient: config.selectedClient,
      })

      try {
      const result = await runSelectedClient(config)
      const devices = result.devices
      const selectedDevice = selectDeviceSummary(devices, config.targetDeviceId)
      const status = buildStatus(config, {
        connected: true,
        state: 'connected',
        configured: true,
        devices,
        selectedDevice,
        deviceCount: devices.length,
        observedStatusCodes: getObservedStatusCodes(),
        lastSyncAt: new Date().toISOString(),
        tokenSession: {
          received: true,
          persisted: false,
          returnedToClient: false,
          expiresIn: result.expiresIn,
        },
        authDiagnostics: config.authDebug ? result.authDiagnostics : undefined,
        deviceListInspection: config.deviceListDebug ? result.deviceListInspection : undefined,
        message:
          'Dreame experimental status-only client lyktes. Device list er hentet uten at robotkommandoer ble sendt.',
      })
      safeLog('experimental-login-ok', config, {
        state: status.state,
        deviceCount: status.deviceCount,
        tokenReceived: true,
      })
      return status
      } catch (loginError) {
      const error = sanitizeError(loginError)
      const authDiagnostics = getAuthDiagnostics(loginError)
      const status = buildStatus(config, {
        connected: false,
        state: 'disconnected',
        error,
        authDiagnostics: config.authDebug ? authDiagnostics : undefined,
        lastSyncAt: new Date().toISOString(),
        message:
          'Dreame experimental status-only login feilet kontrollert. Ingen retry-loop og ingen robotkommando ble sendt.',
      })
      safeLog('experimental-login-failed', config, {
        state: status.state,
        error,
      })
      return status
      }
    })()

    dreameConnectInFlightByConfig.set(singleflightKey, connectPromise)

    try {
      return await connectPromise
    } finally {
      dreameConnectInFlightByConfig.delete(singleflightKey)
    }
  }

  return {
    getStatus,
    connect,
    dockReadiness: (options) => runDreameDockReadiness(config, options),
    dock: () => runDreameDockCommand(config),
  }
}
