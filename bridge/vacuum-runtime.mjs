import { createDreameCloudRuntime } from './dreame-cloud-runtime.mjs'

const DEFAULT_PROVIDER = 'mock'
const VACUUM_STALE_AFTER_MS = 5 * 60 * 1000
const VACUUM_OFFLINE_AFTER_MS = 30 * 60 * 1000

const PROVIDERS = {
  dreameCloud: {
    id: 'dreameCloud',
    label: 'Dreame native cloud adapter',
    status: 'foundation',
    authRequired: true,
    connectionType: 'cloud',
    confidence: 'middels',
    strategicRole: 'native',
    premiumFit: 'high',
    dependencyLevel: 'cloudDependency',
    futurePriority: 1,
    knownRisks: [
      'Uoffisiell eller skiftende API-tilgang må avklares før implementering.',
      'Region, modell-ID og auth-flyt kan variere.',
      'v0 er status-only foundation og skal ikke sende fysiske robotkommandoer.',
    ],
    nextStep: 'Bruk /api/dreame-cloud/status for adapter-kontrakt; avklar client/API før status-only login-test.',
    supportedCapabilities: ['status', 'battery'],
  },
  localRuntime: {
    id: 'localRuntime',
    label: 'Lynell lokal robot-runtime',
    status: 'research',
    authRequired: false,
    connectionType: 'local',
    confidence: 'lav',
    strategicRole: 'native',
    premiumFit: 'high',
    dependencyLevel: 'standalone',
    futurePriority: 2,
    knownRisks: [
      'Det er ikke bekreftet at Dream D20 Plus støtter stabil lokal kontroll.',
      'Token/protokoll kan være modell- og firmwareavhengig.',
    ],
    nextStep: 'Undersøk lokal protokoll/token og definer Lynell capability mapping før runtime bygges.',
    supportedCapabilities: ['status'],
  },
  mqttBridge: {
    id: 'mqttBridge',
    label: 'Lynell MQTT robot bridge',
    status: 'foundation',
    authRequired: false,
    connectionType: 'local',
    confidence: 'middels',
    strategicRole: 'bridge',
    premiumFit: 'high',
    dependencyLevel: 'externalBridge',
    futurePriority: 3,
    knownRisks: [
      'Krever normalisert topic namespace og stabil ekstern adapter.',
      'Må skille tydelig mellom live state, retained state og fallback.',
    ],
    nextStep: 'Definer MQTT topic/payload-kontrakt for robotstatus og trygge kommandoer etter native mapping.',
    supportedCapabilities: ['status', 'start', 'pause', 'dock', 'battery'],
  },
  homeAssistantBridge: {
    id: 'homeAssistantBridge',
    label: 'Home Assistant kompatibilitetsbro',
    status: 'foundation',
    authRequired: true,
    connectionType: 'local',
    confidence: 'høyere',
    strategicRole: 'compatibility',
    premiumFit: 'medium',
    dependencyLevel: 'externalBridge',
    futurePriority: 4,
    knownRisks: [
      'Krever egen Home Assistant-instans og stabil Dreame-integrasjon der.',
      'Rom/soner må mappes fra HA til Lynell senere.',
    ],
    nextStep: 'Bruk som optional kompatibilitetsbro for rask ekte test; native Lynell-runtime er langsiktig retning.',
    supportedCapabilities: ['status', 'start', 'pause', 'dock', 'battery'],
  },
  mock: {
    id: 'mock',
    label: 'Mock / foundation',
    status: 'foundation',
    authRequired: false,
    connectionType: 'foundation',
    confidence: 'lav',
    strategicRole: 'development',
    premiumFit: 'low',
    dependencyLevel: 'standalone',
    futurePriority: 9,
    knownRisks: [
      'Dette er ikke ekte robotstatus.',
      'Kommandoer simuleres bare i Lynell og starter ikke fysisk rengjøring.',
    ],
    nextStep: 'Bruk kun for utvikling/testing. Velg HA som bro for live-test eller native adapter når den bygges.',
    supportedCapabilities: ['status', 'start', 'pause', 'dock'],
  },
}

function toIsoTimestamp(value = Date.now()) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function parseTimestampMs(value) {
  if (!value || typeof value !== 'string') {
    return null
  }

  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getAgeMs(value, nowMs = Date.now()) {
  const timestampMs = parseTimestampMs(value)
  return timestampMs === null ? null : Math.max(0, nowMs - timestampMs)
}

function getVacuumTrustMessage(state, providerLabel, error) {
  if (state === 'online') {
    return `${providerLabel} har fersk robotstatus.`
  }

  if (state === 'stale') {
    return 'Ingen ferske signaler fra roboten akkurat nå. Viser sist kjente status.'
  }

  if (state === 'offline') {
    return 'Roboten er ikke bekreftet online. Viser sist kjente status hvis den finnes.'
  }

  return error ?? 'Robotstatus er ikke bekreftet ennå.'
}

function normalizeVacuumConfidence(robot, state) {
  if (state === 'offline' || state === 'unknown') {
    return 'low'
  }

  if (state === 'stale') {
    return 'low'
  }

  const quality = robot?.statusQuality?.quality ?? robot?.statusMappingConfidence ?? null
  if (quality === 'low' || quality === 'tentative') {
    return 'low'
  }

  if (quality === 'medium' || quality === 'middels') {
    return 'medium'
  }

  return 'high'
}

function decorateVacuumRobotTrust(robot, context = {}) {
  if (!robot) {
    return null
  }

  const nowMs = context.nowMs ?? Date.now()
  const providerLabel = context.providerLabel ?? 'Robot runtime'
  const staleAfterMs = context.staleAfterMs ?? VACUUM_STALE_AFTER_MS
  const offlineAfterMs = context.offlineAfterMs ?? VACUUM_OFFLINE_AFTER_MS
  const lastSeenAt =
    robot.lastSeenAt ??
    robot.lastUpdatedAt ??
    context.lastSuccessfulSync ??
    context.lastSyncAt ??
    null
  const firstSeen = robot.firstSeen ?? lastSeenAt ?? toIsoTimestamp(nowMs)
  const sourceAgeMs = getAgeMs(lastSeenAt, nowMs)
  const runtimeConnected = Boolean(context.runtimeConnected)
  const cloudAuthenticated = Boolean(context.cloudAuthenticated)
  const providerIsFoundation = context.providerId === 'mock' || robot.integrationStatus === 'foundation'
  const deviceReachable = Boolean(
    context.deviceReachable ??
      (runtimeConnected && robot.integrationStatus !== 'degraded' && robot.integrationStatus !== 'foundation'),
  )

  let state = 'unknown'
  if (providerIsFoundation) {
    state = 'unknown'
  } else if (sourceAgeMs !== null && sourceAgeMs >= offlineAfterMs) {
    state = 'offline'
  } else if (!runtimeConnected && sourceAgeMs !== null) {
    state = sourceAgeMs >= staleAfterMs ? 'stale' : 'stale'
  } else if (runtimeConnected && deviceReachable && (sourceAgeMs === null || sourceAgeMs < staleAfterMs)) {
    state = 'online'
  } else if (sourceAgeMs !== null) {
    state = sourceAgeMs >= staleAfterMs ? 'stale' : 'online'
  }

  const stateConfidence = normalizeVacuumConfidence(robot, state)
  const safeActiveState = state === 'online' && stateConfidence !== 'low'
  const rawStatus = robot.status
  const status = safeActiveState ? robot.status : robot.status === 'cleaning' ? 'idle' : robot.status
  const cleaning = safeActiveState && Boolean(robot.cleaning)
  const freshness =
    state === 'online'
      ? sourceAgeMs !== null && sourceAgeMs > staleAfterMs * 0.6
        ? 'aging'
        : 'fresh'
      : state === 'stale' || state === 'offline'
        ? 'stale'
        : 'unknown'

  return {
    ...robot,
    rawStatus,
    status,
    cleaning,
    currentArea: safeActiveState ? robot.currentArea ?? null : null,
    cleaningProgress: safeActiveState ? robot.cleaningProgress ?? 0 : 0,
    firstSeen,
    lastSeenAt,
    statusAgeMs: sourceAgeMs,
    sourceAgeMs,
    staleAfterMs,
    offlineAfterMs,
    trustState: state,
    state,
    freshness,
    stateConfidence,
    runtimeConnected,
    cloudAuthenticated,
    deviceReachable: state === 'online' && deviceReachable,
    cachedData: state === 'stale' || state === 'offline',
    estimatedState: !safeActiveState,
    trustMessage: getVacuumTrustMessage(state, providerLabel, context.error),
    integrationStatus:
      state === 'online'
        ? robot.integrationStatus === 'degraded'
          ? 'degraded'
          : 'connected'
        : state,
  }
}

function readVacuumConfigFromEnv(env = process.env) {
  const enabled = String(env.LYNELL_VACUUM_ENABLED ?? 'false').toLowerCase() === 'true'
  const requestedProvider = String(env.LYNELL_VACUUM_PROVIDER ?? DEFAULT_PROVIDER).trim()
  const provider = PROVIDERS[requestedProvider] ? requestedProvider : DEFAULT_PROVIDER
  const region = String(
    env.LYNELL_DREAME_REGION ??
    env.LYNELL_DREAME_CLOUD_REGION ??
    env.LYNELL_VACUUM_DREAME_REGION ??
    '',
  ).trim().toLowerCase()
  const country = String(
    env.LYNELL_DREAME_COUNTRY ??
    env.LYNELL_DREAME_CLOUD_COUNTRY ??
    (region ? region.toUpperCase() : '') ??
    '',
  ).trim().toUpperCase()
  const username = String(
    env.LYNELL_DREAME_USERNAME ??
    env.LYNELL_DREAME_CLOUD_USERNAME ??
    env.LYNELL_VACUUM_DREAME_USERNAME ??
    '',
  ).trim()
  const password = String(
    env.LYNELL_DREAME_PASSWORD ??
    env.LYNELL_DREAME_CLOUD_PASSWORD ??
    env.LYNELL_VACUUM_DREAME_PASSWORD ??
    '',
  )
  const cloudClient = String(env.LYNELL_DREAME_SELECTED_CLIENT ?? env.LYNELL_DREAME_CLOUD_CLIENT ?? '').trim()
  const cloudDeviceId = String(env.LYNELL_DREAME_DEVICE_ID ?? env.LYNELL_DREAME_CLOUD_DEVICE_ID ?? '').trim()
  const haBaseUrl = String(env.LYNELL_HA_BASE_URL ?? '').trim().replace(/\/$/, '')
  const haToken = String(env.LYNELL_HA_TOKEN ?? '')
  const haVacuumEntityId = String(env.LYNELL_HA_VACUUM_ENTITY_ID ?? '').trim()

  return {
    enabled,
    provider,
    dreame: {
      region,
      country,
      username,
      passwordConfigured: password.length > 0,
      cloudClient,
      deviceIdConfigured: cloudDeviceId.length > 0,
    },
    homeAssistant: {
      baseUrl: haBaseUrl,
      token: haToken,
      tokenConfigured: haToken.length > 0,
      vacuumEntityId: haVacuumEntityId,
    },
  }
}

function isProviderConfigured(config, provider) {
  if (provider.id === 'mock') {
    return true
  }

  if (provider.id === 'dreameCloud') {
    return Boolean(
      config.dreame.region &&
      config.dreame.country &&
      config.dreame.username &&
      config.dreame.passwordConfigured,
    )
  }

  if (provider.id === 'homeAssistantBridge') {
    return Boolean(
      config.homeAssistant.baseUrl &&
      config.homeAssistant.tokenConfigured &&
      config.homeAssistant.vacuumEntityId,
    )
  }

  return false
}

function getHomeAssistantMissingConfig(config) {
  const missing = []

  if (!config.homeAssistant.baseUrl) {
    missing.push('HA URL')
  }

  if (!config.homeAssistant.tokenConfigured) {
    missing.push('HA token')
  }

  if (!config.homeAssistant.vacuumEntityId) {
    missing.push('entity ID')
  }

  return missing
}

function getHomeAssistantReadiness(config, state, connected, error) {
  if (!config.enabled) {
    return {
      label: 'Disabled',
      checks: [
        'Vacuum runtime er ikke aktivert.',
        'Sett LYNELL_VACUUM_ENABLED=true for Home Assistant-test.',
      ],
    }
  }

  const missing = getHomeAssistantMissingConfig(config)

  if (missing.length > 0) {
    return {
      label: missing.length === 1 ? `Mangler ${missing[0]}` : `Mangler ${missing.join(', ')}`,
      checks: [
        'Home Assistant bridge er valgt.',
        ...missing.map((item) => `Mangler ${item}.`),
        'Ingen token vises eller sendes til frontend.',
      ],
    }
  }

  if (connected && state === 'connected') {
    return {
      label: 'Live robotstatus aktiv',
      checks: [
        'Kontakt med Home Assistant OK.',
        'Robot entity funnet.',
        'Live robotstatus aktiv.',
      ],
    }
  }

  if (connected && state === 'degraded') {
    return {
      label: 'Kontakt med Home Assistant OK',
      checks: [
        'Home Assistant svarte.',
        'Robot entity funnet, men rapporterer utilgjengelig eller degradert status.',
        error ?? 'Sjekk robotstatus i Home Assistant.',
      ].filter(Boolean),
    }
  }

  if (error?.toLowerCase().includes('entity')) {
    return {
      label: 'Robot entity ikke funnet',
      checks: [
        'Home Assistant svarte, men robot entity ble ikke funnet.',
        'Kontroller LYNELL_HA_VACUUM_ENTITY_ID.',
      ],
    }
  }

  if (error?.toLowerCase().includes('token') || error?.includes('401') || error?.includes('403')) {
    return {
      label: 'Mangler gyldig HA token',
      checks: [
        'HA URL og entity ID er satt.',
        'Home Assistant avviste token eller tilgang.',
        'Lag eller lim inn et Long-Lived Access Token på nytt.',
      ],
    }
  }

  if (error) {
    return {
      label: 'Home Assistant svarer ikke stabilt',
      checks: [
        'Konfig er komplett.',
        error,
        'Sjekk at Home Assistant er tilgjengelig fra Lynell-serveren.',
      ],
    }
  }

  return {
    label: 'Klar for HA-test',
    checks: [
      'HA URL er satt.',
      'HA token er satt, men skjules.',
      'Vacuum entity ID er satt.',
      'Kjør status eller connect for å teste live kontakt.',
    ],
  }
}

function mapHomeAssistantVacuumState(state) {
  if (state === 'cleaning') {
    return 'cleaning'
  }

  if (state === 'docked') {
    return 'docked'
  }

  if (state === 'paused') {
    return 'paused'
  }

  if (state === 'returning') {
    return 'returning'
  }

  if (state === 'idle') {
    return 'idle'
  }

  if (state === 'error' || state === 'unavailable') {
    return 'error'
  }

  return 'idle'
}

function normalizeBattery(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return null
  }

  return Math.max(0, Math.min(100, Math.round(numericValue)))
}

function createRobotFromHomeAssistantState(payload, provider) {
  const attributes = payload?.attributes ?? {}
  const haState = String(payload?.state ?? 'unavailable')
  const mappedStatus = mapHomeAssistantVacuumState(haState)
  const battery = normalizeBattery(attributes.battery_level)
  const friendlyName = String(attributes.friendly_name ?? 'Dream D20 Plus')
  const errorState =
    haState === 'unavailable'
      ? 'Home Assistant entity er utilgjengelig'
      : attributes.error
        ? String(attributes.error)
        : null

  return {
    id: String(payload?.entity_id ?? 'dream-d20-plus'),
    deviceId: String(payload?.entity_id ?? 'dream-d20-plus'),
    entityId: String(payload?.entity_id ?? ''),
    name: friendlyName,
    manufacturer: 'Dreame',
    model: friendlyName,
    type: 'robotVacuum',
    status: mappedStatus,
    haState,
    battery: battery ?? 0,
    fanSpeed: attributes.fan_speed ? String(attributes.fan_speed) : null,
    docked: haState === 'docked',
    charging: haState === 'docked',
    cleaning: haState === 'cleaning',
    currentArea: attributes.status ? String(attributes.status) : null,
    cleaningProgress: haState === 'cleaning' ? 1 : 0,
    lastCleanedAt: payload?.last_changed ? String(payload.last_changed) : null,
    lastUpdatedAt: payload?.last_updated ? String(payload.last_updated) : null,
    estimatedFinishAt: null,
    errorState,
    capabilities: provider.supportedCapabilities,
    integrationStatus: haState === 'unavailable' ? 'degraded' : 'connected',
  }
}

function mapDreameCloudStatus(device) {
  if (device?.normalizedStatus) {
    return String(device.normalizedStatus)
  }

  if (device?.statusCode) {
    return 'unknown'
  }

  const statusText = String(device?.statusText ?? '').toLowerCase()

  if (device?.online === false) {
    return 'error'
  }

  if (device?.charging) {
    return 'charging'
  }

  if (device?.docked) {
    return 'docked'
  }

  if (statusText.includes('clean') || statusText.includes('sweep') || statusText.includes('working')) {
    return 'cleaning'
  }

  if (statusText.includes('pause')) {
    return 'paused'
  }

  if (statusText.includes('return') || statusText.includes('dock')) {
    return 'returning'
  }

  if (statusText.includes('error') || statusText.includes('fault')) {
    return 'error'
  }

  return 'idle'
}

function getDreameStatusReadiness(config, state, connected, error, selectedRobot, dreameStatus) {
  if (!config.enabled) {
    return {
      label: 'Disabled',
      checks: [
        'Vacuum runtime er ikke aktivert.',
        'Sett LYNELL_VACUUM_ENABLED=true og LYNELL_VACUUM_PROVIDER=dreameCloud for native status-test.',
      ],
    }
  }

  if (!connected) {
    return {
      label: state === 'fallback' ? 'Venter på Dreame status' : 'Dreame status ikke live',
      checks: [
        error ?? dreameStatus?.message ?? 'Dreame cloud status-only er ikke bekreftet live ennå.',
        'Ingen robotkommandoer er aktivert.',
      ],
    }
  }

  const quality = selectedRobot?.statusQuality
  const missingFields = quality?.missing ?? []

  return {
    label: missingFields.length > 0 ? 'Live status med delvis feltmapping' : 'Live statusfelt mappet',
    checks: [
      'Dreame cloud auth og device-list er live.',
      `Statuskvalitet: ${quality?.quality ?? 'unknown'}.`,
      missingFields.length > 0
        ? `Mangler/ukjent: ${missingFields.join(', ')}.`
        : 'Battery, online, docked/charging, status og timestamp er mappet der feltene finnes.',
      dreameStatus?.statusObservationNote,
      'Status-only: ingen robotkommandoer sendes.',
    ].filter(Boolean),
  }
}

function createRobotFromDreameCloudDevice(device, provider) {
  const mappedStatus = mapDreameCloudStatus(device)
  const battery = normalizeBattery(device?.battery)
  const statusText = device?.statusText ? String(device.statusText) : null
  const statusCode = device?.statusCode ? String(device.statusCode) : null
  const deviceName = device?.name ? String(device.name) : 'Dream D20 Plus'
  const model = device?.model ? String(device.model) : 'Dream/Dreame robot'
  const currentArea = statusCode && statusText ? null : statusText
  const finalDerivedCharging =
    device?.derivedState === true &&
    device?.derivedFromStatusCode === true &&
    device?.normalizedStatus === 'charging' &&
    device?.statusMappingConfidence === 'confirmed'
  const finalCharging = finalDerivedCharging ? true : device?.charging === true
  const finalDocked = finalDerivedCharging ? true : device?.docked === true
  const finalStatusQuality = finalDerivedCharging && device?.statusQuality
    ? {
      ...device.statusQuality,
      found: Array.from(new Set([...(device.statusQuality.found ?? []), 'charging', 'docked'])),
      unknown: (device.statusQuality.unknown ?? []).filter((field) => !['charging', 'docked'].includes(field)),
      derived: device.statusQuality.derived ?? [
        {
          field: 'charging',
          value: true,
          reason: 'confirmed-keyDefine-status',
          source: 'latestStatus',
          code: String(device?.derivedFromCode ?? statusCode ?? ''),
        },
        {
          field: 'docked',
          value: true,
          reason: 'confirmed-keyDefine-status',
          source: 'latestStatus',
          code: String(device?.derivedFromCode ?? statusCode ?? ''),
        },
      ],
    }
    : device?.statusQuality ?? null

  return {
    id: String(device?.deviceIdMasked ?? 'dreame-cloud-device'),
    deviceId: String(device?.deviceIdMasked ?? 'dreame-cloud-device'),
    name: deviceName,
    manufacturer: 'Dreame',
    model,
    type: 'robotVacuum',
    status: mappedStatus,
    statusText,
    statusCode,
    localizedStatusText: device?.localizedStatusText ?? null,
    statusDictionaryLanguage: device?.statusDictionaryLanguage ?? null,
    statusDictionaryPath: device?.statusDictionaryPath ?? null,
    statusMappingConfidence: device?.statusMappingConfidence ?? null,
    statusMappingNote: device?.statusMappingNote ?? null,
    statusObservationNote: device?.statusObservationNote ?? null,
    observedStatusCode: device?.observedStatusCode ?? null,
    online: device?.online ?? null,
    battery: battery ?? 0,
    docked: finalDocked,
    charging: finalCharging,
    derivedState: finalDerivedCharging || device?.derivedState === true,
    derivedFromStatusCode: finalDerivedCharging || device?.derivedFromStatusCode === true,
    derivedFromCode: device?.derivedFromCode ?? (finalDerivedCharging ? statusCode : null),
    cleaning: mappedStatus === 'cleaning',
    currentArea,
    cleaningProgress: mappedStatus === 'cleaning' ? 1 : 0,
    lastCleanedAt: null,
    lastUpdatedAt: device?.lastUpdatedAt ? String(device.lastUpdatedAt) : null,
    estimatedFinishAt: null,
    errorState: mappedStatus === 'error'
      ? statusText ?? 'Dreame cloud status indikerer feil eller utilgjengelig robot'
      : null,
    capabilities: provider.supportedCapabilities,
    integrationStatus: device?.online === false ? 'degraded' : 'connected',
    provider: 'dreameCloud',
    stateOrigin: 'cloud runtime',
    statusQuality: finalStatusQuality,
  }
}

function getHomeAssistantHeaders(config) {
  return {
    Authorization: `Bearer ${config.homeAssistant.token}`,
    'Content-Type': 'application/json',
  }
}

async function fetchHomeAssistantVacuumState(config) {
  const entityId = encodeURIComponent(config.homeAssistant.vacuumEntityId)
  const response = await fetch(`${config.homeAssistant.baseUrl}/api/states/${entityId}`, {
    headers: getHomeAssistantHeaders(config),
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Home Assistant avviste token eller tilgang')
    }

    if (response.status === 404) {
      throw new Error(`Robot entity ikke funnet (${config.homeAssistant.vacuumEntityId})`)
    }

    throw new Error(`Home Assistant status svarte ${response.status}`)
  }

  return response.json()
}

async function callHomeAssistantVacuumService(config, service) {
  const response = await fetch(`${config.homeAssistant.baseUrl}/api/services/vacuum/${service}`, {
    method: 'POST',
    headers: getHomeAssistantHeaders(config),
    body: JSON.stringify({
      entity_id: config.homeAssistant.vacuumEntityId,
    }),
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Home Assistant avviste token eller service-tilgang')
    }

    if (response.status === 404) {
      throw new Error(`Home Assistant service eller entity finnes ikke (${service})`)
    }

    throw new Error(`Home Assistant service ${service} svarte ${response.status}`)
  }

  return response.json().catch(() => null)
}

function createFoundationRobot(provider) {
  return {
    id: 'dream-d20-plus',
    deviceId: 'dream-d20-plus',
    name: 'Dream D20 Plus',
    manufacturer: 'Dreame',
    model: 'Dream D20 Plus',
    type: 'robotVacuum',
    status: 'docked',
    battery: 86,
    docked: true,
    charging: true,
    currentArea: 'Ladestasjon',
    cleaningProgress: 0,
    lastCleanedAt: 'Simulert status',
    estimatedFinishAt: null,
    errorState: null,
    capabilities: provider.supportedCapabilities,
    integrationStatus: 'foundation',
  }
}

export function createVacuumRuntime(options = {}) {
  const config = readVacuumConfigFromEnv(options.env)
  const dreameCloudRuntime = createDreameCloudRuntime(options)
  const runtimeStartedAt = new Date().toISOString()
  const robotMemory = new Map()
  let connectionState = config.enabled ? 'disconnected' : 'disabled'
  let connected = false
  let lastSyncAt = null
  let lastSuccessfulSync = null
  let lastRefreshAttemptAt = null
  let lastRefreshErrorAt = null
  let reconnectCount = 0
  let loginFailures = 0
  let previousRuntimeConnected = false
  let error = null
  const selectedProvider = PROVIDERS[config.provider] ?? PROVIDERS.mock
  let selectedRobot = createFoundationRobot(selectedProvider)
  let dreameCloudLastStatus = null

  function updateReconnectCounter(nextConnected) {
    if (nextConnected && !previousRuntimeConnected) {
      reconnectCount += 1
    }

    previousRuntimeConnected = Boolean(nextConnected)
  }

  function rememberRobot(robot, seenAt = new Date().toISOString()) {
    if (!robot) {
      return null
    }

    const robotKey = String(robot.deviceId ?? robot.id ?? 'dream-d20-plus')
    const previous = robotMemory.get(robotKey) ?? null
    const firstSeen = previous?.firstSeen ?? robot.firstSeen ?? seenAt
    const merged = {
      ...previous,
      ...robot,
      firstSeen,
      lastSeenAt: seenAt,
      lastUpdatedAt: robot.lastUpdatedAt ?? seenAt,
    }
    robotMemory.set(robotKey, merged)
    return merged
  }

  function getRememberedRobot() {
    if (robotMemory.size > 0) {
      return Array.from(robotMemory.values())[0]
    }

    return selectedRobot
  }

  function buildTrustContext() {
    const cloudAuthenticated =
      selectedProvider.id === 'dreameCloud'
        ? Boolean(dreameCloudLastStatus?.connected)
        : selectedProvider.id === 'homeAssistantBridge'
          ? Boolean(connected && !error)
          : false
    const runtimeConnected = Boolean(connected && connectionState === 'connected')

    return {
      providerId: selectedProvider.id,
      providerLabel: selectedProvider.label,
      runtimeConnected,
      cloudAuthenticated,
      deviceReachable: runtimeConnected,
      lastSyncAt,
      lastSuccessfulSync,
      error,
    }
  }

  async function refreshHomeAssistantStatus() {
    if (selectedProvider.id !== 'homeAssistantBridge') {
      return
    }

    lastRefreshAttemptAt = new Date().toISOString()

    if (!isProviderConfigured(config, selectedProvider)) {
      connectionState = config.enabled ? 'fallback' : 'disabled'
      connected = false
      updateReconnectCounter(false)
      error = `Home Assistant config mangler ${getHomeAssistantMissingConfig(config).join(', ')}.`
      return
    }

    try {
      const payload = await fetchHomeAssistantVacuumState(config)
      const syncAt = new Date().toISOString()
      selectedRobot = rememberRobot(createRobotFromHomeAssistantState(payload, selectedProvider), syncAt)
      lastSyncAt = new Date().toISOString()
      lastSuccessfulSync = lastSyncAt
      connected = true
      updateReconnectCounter(true)
      connectionState = selectedRobot.haState === 'unavailable' ? 'degraded' : 'connected'
      error = selectedRobot.errorState
    } catch (statusError) {
      connected = false
      updateReconnectCounter(false)
      connectionState = 'degraded'
      error = statusError instanceof Error
        ? statusError.message
        : 'Kunne ikke hente robotstatus fra Home Assistant'
      lastRefreshErrorAt = new Date().toISOString()
    }
  }

  async function refreshDreameCloudStatus() {
    if (selectedProvider.id !== 'dreameCloud') {
      return
    }

    lastRefreshAttemptAt = new Date().toISOString()

    try {
      const status = await dreameCloudRuntime.connect()
      dreameCloudLastStatus = status
      const selectedDevice = status.selectedDevice ?? status.devices?.[0] ?? null

      if (status.connected && selectedDevice) {
        const syncAt = status.lastSyncAt ?? new Date().toISOString()
        selectedRobot = rememberRobot(createRobotFromDreameCloudDevice(selectedDevice, selectedProvider), syncAt)
        lastSyncAt = syncAt
        lastSuccessfulSync = syncAt
        connected = true
        updateReconnectCounter(true)
        connectionState = selectedRobot.integrationStatus === 'degraded' ? 'degraded' : 'connected'
        error = selectedRobot.errorState
        return
      }

      connected = false
      updateReconnectCounter(false)
      connectionState = status.state === 'disabled' ? 'disabled' : 'fallback'
      lastRefreshErrorAt = new Date().toISOString()
      if (status.state !== 'disabled') {
        loginFailures += 1
      }
      error = status.error ?? status.message ?? 'Dreame cloud status er ikke live ennå.'
    } catch (statusError) {
      connected = false
      updateReconnectCounter(false)
      connectionState = 'degraded'
      loginFailures += 1
      error = statusError instanceof Error
        ? statusError.message
        : 'Kunne ikke hente status fra Dreame cloud adapter'
      lastRefreshErrorAt = new Date().toISOString()
    }
  }

  async function getStatus() {
    if (config.enabled && selectedProvider.id === 'homeAssistantBridge') {
      await refreshHomeAssistantStatus()
    }

    if (config.enabled && selectedProvider.id === 'dreameCloud') {
      await refreshDreameCloudStatus()
    }

    const configured = isProviderConfigured(config, selectedProvider)
    const authRequired = selectedProvider.authRequired
    const trustedRobot = config.enabled
      ? decorateVacuumRobotTrust(getRememberedRobot(), buildTrustContext())
      : null
    const effectiveConnected = Boolean(
      trustedRobot?.trustState === 'online' &&
        trustedRobot?.stateConfidence !== 'low' &&
        connected &&
        connectionState === 'connected',
    )
    const effectiveState =
      !config.enabled
        ? 'disabled'
        : effectiveConnected
          ? connectionState
          : trustedRobot?.trustState === 'stale'
            ? 'stale'
            : trustedRobot?.trustState === 'offline'
              ? 'offline'
              : connectionState
    const readiness =
      selectedProvider.id === 'homeAssistantBridge'
        ? getHomeAssistantReadiness(config, effectiveState, effectiveConnected, error)
        : selectedProvider.id === 'dreameCloud'
          ? getDreameStatusReadiness(config, effectiveState, effectiveConnected, error, trustedRobot, dreameCloudLastStatus)
          : null
    const deviceCount =
      selectedProvider.id === 'dreameCloud'
        ? Math.max(
            dreameCloudLastStatus?.deviceCount ?? 0,
            robotMemory.size,
            trustedRobot ? 1 : 0,
          )
        : config.enabled && trustedRobot ? 1 : 0
    const staleCount = trustedRobot?.trustState === 'stale' ? 1 : 0
    const offlineCount = trustedRobot?.trustState === 'offline' ? 1 : 0
    const onlineCount = trustedRobot?.trustState === 'online' ? 1 : 0
    const trust = {
      state: trustedRobot?.trustState ?? 'unknown',
      freshness: trustedRobot?.freshness ?? 'unknown',
      stateConfidence: trustedRobot?.stateConfidence ?? 'low',
      runtimeConnected: Boolean(connected && connectionState === 'connected'),
      cloudAuthenticated: Boolean(trustedRobot?.cloudAuthenticated),
      deviceReachable: Boolean(trustedRobot?.deviceReachable),
      cachedData: Boolean(trustedRobot?.cachedData),
      estimatedState: Boolean(trustedRobot?.estimatedState),
      firstSeen: trustedRobot?.firstSeen ?? null,
      lastSeenAt: trustedRobot?.lastSeenAt ?? null,
      statusAgeMs: trustedRobot?.statusAgeMs ?? null,
      sourceAgeMs: trustedRobot?.sourceAgeMs ?? null,
      staleAfterMs: VACUUM_STALE_AFTER_MS,
      offlineAfterMs: VACUUM_OFFLINE_AFTER_MS,
      reconnectCount,
      loginFailures,
      lastSuccessfulSync,
      lastRefreshAttemptAt,
      lastRefreshErrorAt,
      message: trustedRobot?.trustMessage ?? getVacuumTrustMessage('unknown', selectedProvider.label, error),
    }

    return {
      ok: true,
      enabled: config.enabled,
      provider: selectedProvider.id,
      providerLabel: selectedProvider.label,
      connected: effectiveConnected,
      state: effectiveState,
      authRequired,
      configured,
      config: {
        provider: selectedProvider.id,
        dreameRegion: config.dreame.region || null,
        dreameCountry: config.dreame.country || null,
        dreameUsernameConfigured: Boolean(config.dreame.username),
        dreamePasswordConfigured: config.dreame.passwordConfigured,
        dreameCloudClient: config.dreame.cloudClient || null,
        dreameDeviceIdConfigured: config.dreame.deviceIdConfigured,
        homeAssistantBaseUrl: config.homeAssistant.baseUrl || null,
        homeAssistantTokenConfigured: config.homeAssistant.tokenConfigured,
        homeAssistantVacuumEntityId: config.homeAssistant.vacuumEntityId || null,
      },
      providers: Object.values(PROVIDERS).map((provider) => ({
        id: provider.id,
        label: provider.label,
        status: provider.status,
        authRequired: provider.authRequired,
        connectionType: provider.connectionType,
        confidence: provider.confidence,
        strategicRole: provider.strategicRole,
        premiumFit: provider.premiumFit,
        dependencyLevel: provider.dependencyLevel,
        futurePriority: provider.futurePriority,
        knownRisks: provider.knownRisks,
        nextStep: provider.nextStep,
        supportedCapabilities: provider.supportedCapabilities,
      })),
      deviceCount,
      onlineCount,
      staleCount,
      offlineCount,
      observedStatusCodes: selectedProvider.id === 'dreameCloud'
        ? dreameCloudLastStatus?.observedStatusCodes ?? []
        : undefined,
      statusObservationNote: selectedProvider.id === 'dreameCloud'
        ? dreameCloudLastStatus?.statusObservationNote ?? null
        : undefined,
      robots: config.enabled && trustedRobot ? [trustedRobot] : [],
      selectedRobot: config.enabled ? trustedRobot : null,
      capabilities: selectedProvider.supportedCapabilities,
      lastSyncAt,
      lastSuccessfulSync,
      trust,
      diagnostics: {
        runtimeStartedAt,
        runtimeConnected: trust.runtimeConnected,
        cloudAuthenticated: trust.cloudAuthenticated,
        deviceReachable: trust.deviceReachable,
        state: trust.state,
        freshness: trust.freshness,
        stateConfidence: trust.stateConfidence,
        firstSeen: trust.firstSeen,
        lastSeenAt: trust.lastSeenAt,
        statusAgeMs: trust.statusAgeMs,
        sourceAgeMs: trust.sourceAgeMs,
        staleAfterMs: VACUUM_STALE_AFTER_MS,
        offlineAfterMs: VACUUM_OFFLINE_AFTER_MS,
        reconnectCount,
        loginFailures,
        lastSuccessfulSync,
        lastRefreshAttemptAt,
        lastRefreshErrorAt,
        onlineCount,
        staleCount,
        offlineCount,
        cachedRobotCount: robotMemory.size,
        providerMaturity: selectedProvider.id === 'dreameCloud' ? 'statusOnly' : selectedProvider.status,
        controlAvailable: selectedProvider.id === 'homeAssistantBridge' && effectiveConnected,
        commandRuntime: selectedProvider.id === 'dreameCloud' ? 'status-only' : selectedProvider.id,
      },
      error,
      readiness,
      message: config.enabled
        ? effectiveConnected
          ? selectedProvider.id === 'homeAssistantBridge'
            ? `${selectedProvider.label} er koblet via Home Assistant. ${readiness?.label ?? 'Live robotstatus aktiv'}.`
            : `${selectedProvider.label} er koblet status-only. Ingen robotkommandoer er aktivert.`
          : trustedRobot?.trustState === 'stale'
            ? 'Ingen ferske signaler fra roboten akkurat nå. Viser sist kjente status.'
            : trustedRobot?.trustState === 'offline'
              ? 'Roboten er ikke bekreftet online. Viser sist kjente status.'
          : selectedProvider.id === 'homeAssistantBridge'
            ? `${selectedProvider.label}: ${readiness?.label ?? 'Klar for HA-test'}.`
            : selectedProvider.id === 'dreameCloud'
              ? `${selectedProvider.label}: ${error ?? 'status-only foundation er ikke live ennå.'}`
              : `${selectedProvider.label} er valgt, men robotadapteren er foundation og ikke ekte koblet.`
        : 'Vacuum runtime er disabled. Sett LYNELL_VACUUM_ENABLED=true for senere adapter-test.',
    }
  }

  async function connect() {
    if (!config.enabled) {
      connectionState = 'disabled'
      connected = false
      error = 'Vacuum disabled'
      return getStatus()
    }

    if (selectedProvider.id === 'homeAssistantBridge') {
      await refreshHomeAssistantStatus()
      return getStatus()
    }

    if (selectedProvider.id === 'dreameCloud') {
      return getStatus()
    }

    if (selectedProvider.id !== 'mock') {
      connectionState = 'fallback'
      connected = false
      error = selectedProvider.id === 'dreameCloud'
        ? `${selectedProvider.label} er status-only foundation. Se /api/dreame-cloud/status for adapter-kontrakt.`
        : `${selectedProvider.label} er foundation only. Ekte provider-adapter er ikke implementert ennå.`
      lastSyncAt = new Date().toISOString()
      return getStatus()
    }

    connectionState = 'fallback'
    connected = false
    error = 'Mock provider aktiv. Ingen fysisk robot er koblet.'
    lastSyncAt = new Date().toISOString()
    return getStatus()
  }

  async function command(payload = {}) {
    const commandName = String(payload.command ?? '').trim()

    if (!['start', 'pause', 'dock', 'stop', 'status'].includes(commandName)) {
      return {
        ...(await getStatus()),
        command: commandName || null,
        commandAccepted: false,
        commandSimulated: false,
        message: 'Ukjent robotkommando. Støttet: start, pause, dock, stop, status.',
      }
    }

    if (selectedProvider.id === 'homeAssistantBridge' && config.enabled) {
      if (!isProviderConfigured(config, selectedProvider)) {
        return {
          ...(await getStatus()),
          command: commandName,
          commandAccepted: false,
          commandSimulated: false,
          message: `Home Assistant robotkommando mangler ${getHomeAssistantMissingConfig(config).join(', ')}.`,
        }
      }

      if (commandName === 'status') {
        return {
          ...(await getStatus()),
          command: commandName,
          commandAccepted: true,
          commandSimulated: false,
          message: 'Robotstatus er hentet fra Home Assistant.',
        }
      }

      const serviceByCommand = {
        start: 'start',
        pause: 'pause',
        dock: 'return_to_base',
        stop: 'stop',
      }

      try {
        await callHomeAssistantVacuumService(config, serviceByCommand[commandName])
        await refreshHomeAssistantStatus()

        return {
          ...(await getStatus()),
          command: commandName,
          commandAccepted: true,
          commandSimulated: false,
          message: `Sendte ${commandName} til ${config.homeAssistant.vacuumEntityId} via Home Assistant.`,
        }
      } catch (commandError) {
        connected = false
        connectionState = 'degraded'
        const commandErrorMessage = commandError instanceof Error
          ? commandError.message
          : 'Home Assistant robotkommando feilet'
        error = commandErrorMessage

        return {
          ...(await getStatus()),
          command: commandName,
          commandAccepted: false,
          commandSimulated: false,
          message: `Home Assistant robotkommando feilet: ${commandErrorMessage}`,
        }
      }
    }

    if (selectedProvider.id === 'dreameCloud') {
      if (commandName === 'status') {
        return {
          ...(await getStatus()),
          command: commandName,
          commandAccepted: true,
          commandSimulated: false,
          message: 'Dreame cloud v0 er status-only foundation. Ingen fysisk robotkommando ble sendt.',
        }
      }

      return {
        ...(await getStatus()),
        command: commandName,
        commandAccepted: false,
        commandSimulated: false,
        message:
          'Dreame cloud v0 sender ikke fysiske kommandoer. Første trygge kommando vurderes senere etter stabil status-test.',
      }
    }

    if (!config.enabled || !connected) {
      if (commandName === 'status') {
        return {
          ...(await getStatus()),
          command: commandName,
          commandAccepted: true,
          commandSimulated: true,
          message: 'Robotstatus er foundation/mock. Ingen ekte robot-API er koblet ennå.',
        }
      }

      return {
        ...(await getStatus()),
        command: commandName,
        commandAccepted: true,
        commandSimulated: true,
        message: `${commandName} er bare foundation/mock nå. Roboten starter ikke fysisk før en ekte adapter er koblet.`,
      }
    }

    return {
      ...(await getStatus()),
      command: commandName,
      commandAccepted: false,
      commandSimulated: false,
      message: 'Ekte robotkommandoer er ikke implementert i denne foundation-runden.',
    }
  }

  async function dock() {
    if (!config.enabled) {
      return {
        ok: false,
        provider: selectedProvider.id,
        command: 'dock',
        accepted: false,
        rejected: true,
        safeMode: {
          warning: 'Experimental reverse-engineered command path',
          state: 'vacuum-disabled',
        },
        timestamp: new Date().toISOString(),
        message: 'Vacuum runtime er disabled. Ingen dock-kommando ble sendt.',
      }
    }

    if (selectedProvider.id !== 'dreameCloud') {
      return {
        ok: false,
        provider: selectedProvider.id,
        command: 'dock',
        accepted: false,
        rejected: true,
        safeMode: {
          warning: 'Experimental reverse-engineered command path',
          state: 'provider-not-dreame-cloud',
        },
        timestamp: new Date().toISOString(),
        message: 'Native Dreame dock er kun tilgjengelig når LYNELL_VACUUM_PROVIDER=dreameCloud.',
      }
    }

    return dreameCloudRuntime.dock()
  }

  async function dockReadiness(options = {}) {
    if (!config.enabled) {
      return {
        ok: false,
        provider: selectedProvider.id,
        command: 'dock',
        canAttemptDock: false,
        reason: 'Vacuum runtime er disabled.',
        candidates: [],
        selectedCandidate: null,
        safeMode: {
          warning: 'Experimental reverse-engineered command path',
          sendsCommand: false,
          state: 'vacuum-disabled',
        },
        timestamp: new Date().toISOString(),
      }
    }

    if (selectedProvider.id !== 'dreameCloud') {
      return {
        ok: false,
        provider: selectedProvider.id,
        command: 'dock',
        canAttemptDock: false,
        reason: 'Dock readiness er kun tilgjengelig når LYNELL_VACUUM_PROVIDER=dreameCloud.',
        candidates: [],
        selectedCandidate: null,
        safeMode: {
          warning: 'Experimental reverse-engineered command path',
          sendsCommand: false,
          state: 'provider-not-dreame-cloud',
        },
        timestamp: new Date().toISOString(),
      }
    }

    return dreameCloudRuntime.dockReadiness(options)
  }

  return {
    getStatus,
    connect,
    command,
    dock,
    dockReadiness,
  }
}
