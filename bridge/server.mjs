import { createServer } from 'node:http'
import { createHash, randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { appendFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCastRuntime } from './cast-runtime.mjs'
import { createDreameCloudRuntime } from './dreame-cloud-runtime.mjs'
import { createIntegrationManager } from './integration-manager.mjs'
import { createMqttRuntime } from './mqtt-runtime.mjs'
import { createRuntimeDomainSnapshot } from './runtime-domains.mjs'
import { getCapabilityMatrix, getRuntimeProviderManifests } from './runtime-registry.mjs'
import { buildRuntimeContextGraph } from './runtime-semantics.mjs'
import { createRuntimeStateStore } from './runtime-state-store.mjs'
import { createVacuumRuntime } from './vacuum-runtime.mjs'

const require = createRequire(import.meta.url)
const knx = require('knx')
const Datapoint = require('knx/src/Datapoint')
const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const mediaMusicDirectory = join(projectRoot, 'media', 'music')
const runtimeActionsDirectory = join(__dirname, '.lynell-state', 'runtime-actions')
const runtimeActionsFile = join(runtimeActionsDirectory, 'actions.jsonl')
const runtimeActionsMetadataFile = join(runtimeActionsDirectory, 'metadata.json')
const runtimeAuditDirectory = join(__dirname, '.lynell-state', 'runtime-audit')
const runtimeAuditFile = join(runtimeAuditDirectory, 'audit.jsonl')
const runtimeAuditMetadataFile = join(runtimeAuditDirectory, 'metadata.json')
const runtimeSnapshotsDirectory = join(__dirname, '.lynell-state', 'runtime-snapshots')
const runtimeSnapshotsFile = join(runtimeSnapshotsDirectory, 'snapshots.jsonl')
const runtimeLatestSnapshotFile = join(runtimeSnapshotsDirectory, 'latest.json')
const runtimeSnapshotsMetadataFile = join(runtimeSnapshotsDirectory, 'metadata.json')
const runtimeInsightsDirectory = join(__dirname, '.lynell-state', 'runtime-insights')
const runtimeInsightsFile = join(runtimeInsightsDirectory, 'insights.jsonl')
const runtimeInsightsMetadataFile = join(runtimeInsightsDirectory, 'metadata.json')
const runtimeConfigDirectory = resolve(
  process.env.LYNELL_RUNTIME_CONFIG_STATE_DIR ?? join(__dirname, '.lynell-state', 'runtime-config'),
)
const runtimeConfigFile = join(runtimeConfigDirectory, 'latest-knx-runtime-config.json')
const runtimeSystemConfigDirectory = join(__dirname, '.lynell-state', 'runtime-system-config')
const runtimeSystemConfigFile = join(runtimeSystemConfigDirectory, 'system-config.json')
const runtimeConversationLogDirectory = join(__dirname, '.lynell-state', 'conversation-log')
const runtimeConversationLogFile = join(runtimeConversationLogDirectory, 'conversation.jsonl')
const runtimeSceneSchedulerDirectory = join(__dirname, '.lynell-state', 'scene-scheduler')
const runtimeSceneSchedulerFile = join(runtimeSceneSchedulerDirectory, 'scheduler-state.json')
const customSignalLoggerDirectory = join(__dirname, '.lynell-state', 'signal-loggers')
const customSignalLoggerFile = join(customSignalLoggerDirectory, 'signal-loggers.json')
const etsMonitorFile = join(projectRoot, 'ETS_monitor.xml')

const BRIDGE_HOST = String(process.env.LYNELL_BRIDGE_HOST ?? '0.0.0.0').trim() || '0.0.0.0'
const PORT = Number(process.env.LYNELL_BRIDGE_PORT ?? 8787)
const DEFAULT_CONNECTION_TARGETS = {
  localDirect: {
    host: '192.168.86.33',
    port: 3671,
  },
  remoteTunnel: {
    host: '127.0.0.1',
    port: 35000,
  },
}
const KNX_WRITE_TIMEOUT_MS = 5000
const KNX_READ_TIMEOUT_MS = 5000
const LIGHT_FEEDBACK_DELAY_MS = 1000
const CLIMATE_FLOAT_DPT = '9.001'
const DEFAULT_KNX_CACHE_STALE_MS = 5 * 60 * 1000
const KNX_STALE_POLICIES = {
  temperature: {
    freshMs: 30 * 60 * 1000,
    agingMs: 60 * 60 * 1000,
    staleMs: 120 * 60 * 1000,
  },
  setpointFeedback: {
    freshMs: 6 * 60 * 60 * 1000,
    agingMs: 12 * 60 * 60 * 1000,
    staleMs: 24 * 60 * 60 * 1000,
  },
  heatDemand: {
    freshMs: 15 * 60 * 1000,
    agingMs: 30 * 60 * 1000,
    staleMs: 60 * 60 * 1000,
  },
  lightFeedback: {
    freshMs: 6 * 60 * 60 * 1000,
    agingMs: 12 * 60 * 60 * 1000,
    staleMs: 24 * 60 * 60 * 1000,
  },
  valueFeedback: {
    freshMs: 6 * 60 * 60 * 1000,
    agingMs: 12 * 60 * 60 * 1000,
    staleMs: 24 * 60 * 60 * 1000,
  },
  customSignal: {
    freshMs: 30 * 60 * 1000,
    agingMs: 2 * 60 * 60 * 1000,
    staleMs: 24 * 60 * 60 * 1000,
  },
  default: {
    freshMs: DEFAULT_KNX_CACHE_STALE_MS,
    agingMs: 30 * 60 * 1000,
    staleMs: 60 * 60 * 1000,
  },
}
const KNX_ROOM_POLL_RATE_LIMIT_MS = 15 * 1000
const SUPPORTED_MEDIA_EXTENSIONS = new Set(['.mp3'])
const castRuntime = createCastRuntime()
const dreameCloudRuntime = createDreameCloudRuntime()
const mqttRuntime = createMqttRuntime()
const vacuumRuntime = createVacuumRuntime()
const integrationManager = createIntegrationManager({ castRuntime, mqttRuntime, vacuumRuntime })
const runtimeStateStore = createRuntimeStateStore()
let runtimeConfig = null
const runtimeConfigDiagnostics = {
  runtimeConfigReceived: false,
  runtimeConfigSource: 'not-received',
  lastRuntimeConfigAt: null,
  targetBuildAttempted: false,
  targetBuildCount: 0,
  targetBuildErrors: [],
  whyTargetCountZero: 'noRuntimeConfig',
  latestPayloadSummary: null,
  latestPayloadSizeBytes: null,
  runtimeConfigPostReceivedAt: null,
  runtimeConfigPostPayloadBytes: null,
  runtimeConfigPostParsed: false,
  runtimeConfigPostError: null,
  latestValidConfigAt: null,
  latestValidConfigAgeMs: null,
  persistedConfigPath: runtimeConfigFile,
  persistedConfigRestored: false,
  persistedConfigError: null,
  restoredConfigIntegrity: null,
  missingClimateMappings: false,
  restoredRoomCount: 0,
  restoredClimateWriteCount: 0,
  restoredClimateFeedbackCount: 0,
  restoredLightCount: 0,
  restoredDimCount: 0,
}

const runtimeEventClients = new Set()
const runtimeEventClientMetadata = new Map()
let runtimeEventSequence = 0
let lastInsightEventKey = null
const runtimeEventBuffer = []
const RUNTIME_EVENT_BUFFER_LIMIT = 250
const runtimeEventStats = {
  startedAt: new Date().toISOString(),
  connectedClients: 0,
  reconnectCount: 0,
  resyncRequiredCount: 0,
  replayedEvents: 0,
  totalEvents: 0,
  droppedEvents: 0,
  lastEventAt: null,
  latestEventId: null,
  recentEvents: [],
  recentPollingRequests: [],
  pollingSources: {},
  fallbackRefreshCount: 0,
}
const runtimeSoakMetrics = {
  startedAt: new Date().toISOString(),
  runtimeRestartCount: 0,
  sseReconnectCount: 0,
  providerReconnectCount: 0,
  knxReconnectCount: 0,
  knxDisconnectCount: 0,
  actionExecutionCount: 0,
  lastKnxConnectedAt: null,
  lastKnxDisconnectedAt: null,
  eventThroughputTrend: [],
}
const defaultAutoPollQuietSignalsConfig = {
  enabled: false,
  mode: 'allEligible',
  quietThresholdMinutes: 60,
  globalMaxPollsPerWindow: 4,
  pollWindowMinutes: 5,
  perRoomCooldownMinutes: 60,
  perSignalCooldownMinutes: 60,
  selectedSignals: [],
  selectedRooms: [],
  selectedGroupAddresses: [],
  excludedSignals: [],
  excludedRooms: [],
  excludedGroupAddresses: [],
  sourceWhenEnabled: 'autoPoll',
  staleRelevantOnly: true,
  skipOnChangeOnly: true,
}
const sceneSchedulerIntervalMs = 30_000
const sceneSchedulerMissedGraceMs = 2 * 60 * 1000
const knxMonitorBufferLimit = Math.max(
  1000,
  Math.min(5000, Number(process.env.LYNELL_KNX_MONITOR_BUFFER_LIMIT ?? 2500)),
)
const runtimeSystemConfigState = {
  systemConfig: null,
  uiCapabilityConfig: null,
  configSource: 'none',
  version: 0,
  loadedAt: null,
  lastConfigSaveAt: null,
  lastConfigSaveClient: null,
  lastConfigSaveSession: null,
  configDriftDetected: false,
  lastError: null,
  storagePath: runtimeSystemConfigFile,
  conversationLogging: {
    enabled: false,
    updatedAt: null,
  },
  conversationLog: {
    path: runtimeConversationLogFile,
    savedCount: 0,
    lastSavedAt: null,
    lastIntent: null,
    lastPage: null,
    lastError: null,
  },
  autoPollQuietSignals: { ...defaultAutoPollQuietSignalsConfig },
}
const runtimeSceneSchedulerState = {
  schedulerActive: true,
  schedulerSource: 'server-runtime',
  persisted: true,
  unsafeFrontendScheduler: false,
  intervalMs: sceneSchedulerIntervalMs,
  missedGraceMs: sceneSchedulerMissedGraceMs,
  startedAt: new Date().toISOString(),
  lastCheckAt: null,
  tickCount: 0,
  lastTickAt: null,
  nextTickAt: null,
  lastDueCheck: null,
  dueScenes: [],
  enabledSceneCount: 0,
  scheduledSceneCount: 0,
  scheduledScenes: [],
  nextExecution: null,
  lastExecution: null,
  lastExecutionAttempt: null,
  lastExecutionResult: null,
  lastExecutionError: null,
  lastExecutionKey: null,
  lastDryRun: null,
  lastSkippedReason: null,
  missedExecutionCount: 0,
  lastError: null,
  executionHistory: [],
  lastExecutionKeys: {},
  lastExecutedBySceneDay: {},
  lastMissedBySceneDay: {},
  storagePath: runtimeSceneSchedulerFile,
}
let runtimeSceneSchedulerTimer = null
const runtimeSceneSchedulerInFlight = new Set()
const shadingRuntimeState = {
  commandCount: 0,
  writeFailureCount: 0,
  lastCommand: null,
  lastFeedback: null,
  lastError: null,
  pendingConfirmations: [],
  executionHistory: [],
}
const knxRuntimeMonitor = {
  startedAt: new Date().toISOString(),
  sequence: 0,
  bufferLimit: knxMonitorBufferLimit,
  events: [],
  droppedEvents: 0,
  totalEvents: 0,
  lastEventAt: null,
  sourceCounts: {},
  directionCounts: {},
  signalTypeCounts: {},
}
const runtimeActionHistory = []
const runtimeAuditHistory = []
const runtimeInsightHistory = []
const runtimeInsightByKey = new Map()
const runtimeClients = new Map()
const runtimeSessions = new Map()
let lastRuntimeContinuitySnapshot = null
let runtimeRecoveryDetectedEmitted = false
const runtimeContinuityState = {
  enabled: true,
  storagePath: runtimeSnapshotsDirectory,
  snapshotCount: 0,
  restored: false,
  partialRestore: false,
  restoredAt: null,
  restoredSnapshotId: null,
  restoredSnapshotAgeMs: null,
  lastSnapshotAt: null,
  lastSnapshotId: null,
  lastError: null,
  reconnectContinuity: 'standby',
  retention: {
    maxSnapshots: 500,
    cadenceMs: 60_000,
  },
}
let runtimeRegistrySequence = 0
const runtimeRegistryState = {
  model: 'runtime-registry-foundation',
  owner: 'bridge-runtime',
  version: 'v8.6-registry-foundation',
  pluginSystem: false,
  dynamicCodeLoading: false,
  distributedRuntime: false,
  packageManager: false,
  startedAt: new Date().toISOString(),
  lastUpdatedAt: null,
  updateCount: 0,
}
const runtimeInsightState = {
  model: 'runtime-insight-foundation',
  deterministic: true,
  aiMl: false,
  autonomousExecution: false,
  startedAt: new Date().toISOString(),
  lastGeneratedAt: null,
  lastPersistedAt: null,
  restored: false,
  restoredInsights: 0,
  lastError: null,
  persistence: {
    enabled: true,
    path: runtimeInsightsFile,
    retention: {
      maxInsights: 500,
    },
  },
}
const runtimeBootPhases = [
  'initializing',
  'restoring',
  'registryLoading',
  'providerBoot',
  'runtimeServicesBoot',
  'realtimeStartup',
  'ready',
  'degraded',
  'failed',
]
const runtimeBootState = {
  model: 'runtime-boot-orchestration-foundation',
  orchestrator: 'bridge-runtime-boot',
  distributedRuntime: false,
  processManager: false,
  startedAt: new Date().toISOString(),
  currentPhase: 'initializing',
  ready: false,
  degraded: false,
  failed: false,
  readyAt: null,
  startupLatencyMs: null,
  phaseHistory: [],
  failedBootPhases: [],
  providerReadiness: [],
  degradedProviders: [],
  lastProviderBootAt: null,
  lastHealthCheckAt: null,
  recoveryAware: true,
  startupSequence: [
    'registry',
    'runtime services',
    'snapshots/recovery',
    'providers',
    'event bus',
    'diagnostics',
    'insight engine',
  ],
  bootReport: {
    registryLoaded: false,
    runtimeServicesBooted: false,
    providersBooted: false,
    realtimeStarted: false,
    diagnosticsReady: false,
    insightEngineReady: false,
  },
  soakReadiness: {
    uptimeTracking: true,
    memoryPressureTracking: true,
    reconnectCounters: true,
    sseUptime: true,
    providerInstabilityTracking: true,
  },
}
const defaultRuntimePolicies = [
  {
    policyId: 'policy-room-poll-local',
    category: 'roomPoll',
    actionType: 'roomPoll',
    enabled: true,
    requiresApproval: false,
    autoApproveLocal: true,
    allowRemote: false,
    allowNivaProposal: true,
    allowSchedule: false,
    allowAutomationFuture: false,
    riskLevel: 'low',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    policyId: 'policy-knx-write-local',
    category: 'knxWrite',
    actionType: '*',
    enabled: true,
    requiresApproval: false,
    autoApproveLocal: true,
    allowRemote: false,
    allowNivaProposal: true,
    allowSchedule: false,
    allowAutomationFuture: false,
    riskLevel: 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    policyId: 'policy-runtime-config-local',
    category: 'runtimeRefresh',
    actionType: 'runtimeConfigRefresh',
    enabled: true,
    requiresApproval: false,
    autoApproveLocal: true,
    allowRemote: false,
    allowNivaProposal: false,
    allowSchedule: false,
    allowAutomationFuture: false,
    riskLevel: 'low',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    policyId: 'policy-provider-lifecycle',
    category: 'providerLifecycle',
    actionType: '*',
    enabled: true,
    requiresApproval: true,
    autoApproveLocal: false,
    allowRemote: false,
    allowNivaProposal: false,
    allowSchedule: false,
    allowAutomationFuture: false,
    riskLevel: 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    policyId: 'policy-insight-suggestion',
    category: 'insightSuggestion',
    actionType: '*',
    enabled: true,
    requiresApproval: true,
    autoApproveLocal: false,
    allowRemote: false,
    allowNivaProposal: true,
    allowSchedule: false,
    allowAutomationFuture: false,
    riskLevel: 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    policyId: 'policy-future-automation',
    category: 'automationFuture',
    actionType: '*',
    enabled: false,
    requiresApproval: true,
    autoApproveLocal: false,
    allowRemote: false,
    allowNivaProposal: false,
    allowSchedule: false,
    allowAutomationFuture: false,
    riskLevel: 'high',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]
const runtimeActionStats = {
  startedAt: new Date().toISOString(),
  totalActions: 0,
  completedActions: 0,
  failedActions: 0,
  cancelledActions: 0,
  pendingApprovals: 0,
  approvalRequiredCount: 0,
  actionsLastMinute: 0,
  averageActionLatency: null,
  latestActionAt: null,
  latestActionId: null,
  persistence: {
    enabled: true,
    path: runtimeActionsFile,
    restored: false,
    restoredActions: 0,
    restoredAt: null,
    lastFlushAt: null,
    error: null,
    retention: {
      maxRecentActions: 250,
      compactAt: 500,
    },
  },
  governance: {
    policyCount: defaultRuntimePolicies.length,
    pendingApprovalCount: 0,
    trustedClientCount: 0,
    untrustedClientCount: 0,
    riskyActionAttempts: 0,
    auditEventCount: 0,
    latestAuditAt: null,
  },
}
const lightFeedbackSubscriptions = new Map()
const climateFeedbackSubscriptions = new Map()
const knxGroupValueCache = new Map()
const knxRoomPollState = new Map()
const customSignalLoggers = new Map()
const customSignalLoggerDiagnostics = {
  enabled: true,
  storagePath: customSignalLoggerFile,
  restored: false,
  restoredCount: 0,
  restoredAt: null,
  lastPersistAt: null,
  lastError: null,
}
const knxSingleActionState = {
  history: [],
  lastAction: null,
}
const etsAuditState = {
  latest: null,
  lastError: null,
}
let knxSubscriptionRuntime = {
  active: false,
  connection: null,
  datapoints: [],
  targets: [],
  fingerprint: null,
  pendingRestart: null,
  lastTelegramAt: null,
  startedAt: null,
  stoppedAt: null,
  error: null,
  recentTelegrams: [],
}

function isConfiguredAddress(value) {
  return Boolean(String(value ?? '').trim()) && !String(value ?? '').trim().startsWith('placeholder/')
}

function normalizeLightWritePoint(point) {
  const room = String(point?.room ?? '').trim()
  const zone = String(point?.zone ?? '').trim()
  const lightAddress = String(point?.light ?? point?.lightAddress ?? '').trim()
  const valueAddress = String(point?.value ?? point?.valueAddress ?? '').trim()

  if (!room || !zone || (!isConfiguredAddress(lightAddress) && !isConfiguredAddress(valueAddress))) {
    return null
  }

  return {
    room,
    zone,
    label: String(point?.label ?? `${room} / ${zone}`),
    lightAddress,
    lightDataType: String(point?.lightDataType ?? '1-bit'),
    valueAddress,
    valueDataType: String(point?.valueDataType ?? '1-byte'),
    dimmable: Boolean(point?.dimmable),
  }
}

function normalizeClimateWritePoint(point) {
  const room = String(point?.room ?? '').trim()
  const setpointAddress = String(point?.setpoint ?? point?.setpointAddress ?? '').trim()
  const modeAddress = String(point?.mode ?? point?.modeAddress ?? '').trim()

  if (!room || (!isConfiguredAddress(setpointAddress) && !isConfiguredAddress(modeAddress))) {
    return null
  }

  return {
    room,
    label: String(point?.label ?? room),
    setpointAddress,
    setpointDataType: String(point?.setpointDataType ?? '2-byte float'),
    modeAddress,
    modeDataType: String(point?.modeDataType ?? '1-byte'),
    climateActive: Boolean(point?.climateActive),
    liveClimateActive: Boolean(point?.liveClimateActive),
    setpointWriteStrategy:
      point?.setpointWriteStrategy === 'relativeOffset'
        ? 'relativeOffset'
        : 'absoluteTemperature',
  }
}

function normalizeWriteMapping(payload) {
  const lights = Array.isArray(payload?.writeMapping?.lights)
    ? payload.writeMapping.lights.map(normalizeLightWritePoint).filter(Boolean)
    : []
  const climate = Array.isArray(payload?.writeMapping?.climate)
    ? payload.writeMapping.climate.map(normalizeClimateWritePoint).filter(Boolean)
    : []

  return {
    lights,
    climate,
    lightByRoomAndZone: new Map(lights.map((point) => [`${point.room}:${point.zone}`, point])),
    climateByRoom: new Map(climate.map((point) => [point.room, point])),
  }
}

function normalizeRuntimeConfig(payload) {
  const writeMapping = normalizeWriteMapping(payload)
  const feedbackMapping = normalizeFeedbackMapping(payload)

  return {
    connectionMode:
      payload?.connectionMode === 'localDirect' ? 'localDirect' : 'remoteTunnel',
    localDirect: {
      host: String(
        payload?.localDirect?.host ?? DEFAULT_CONNECTION_TARGETS.localDirect.host,
      ).trim(),
      port: Number(
        payload?.localDirect?.port ?? DEFAULT_CONNECTION_TARGETS.localDirect.port,
      ),
    },
    remoteTunnel: {
      host: String(
        payload?.remoteTunnel?.host ?? DEFAULT_CONNECTION_TARGETS.remoteTunnel.host,
      ).trim(),
      port: Number(
        payload?.remoteTunnel?.port ?? DEFAULT_CONNECTION_TARGETS.remoteTunnel.port,
      ),
    },
    climateFeedbackMethod:
      payload?.climateFeedbackMethod === 'subscribe' ? 'subscribe' : 'polling',
    climatePollingIntervalSec: Number(payload?.climatePollingIntervalSec ?? 20),
    writeMapping,
    feedbackMapping,
  }
}

function createDefaultRuntimeConfigPayload() {
  return {
    connectionMode: 'localDirect',
    localDirect: DEFAULT_CONNECTION_TARGETS.localDirect,
    remoteTunnel: DEFAULT_CONNECTION_TARGETS.remoteTunnel,
    climateFeedbackMethod: 'subscribe',
    climatePollingIntervalSec: 20,
    writeMapping: {
      lights: [],
      climate: [],
    },
    feedbackMapping: {
      lights: [],
      climate: [],
    },
  }
}

function createSerializableRuntimeConfigPayload(config) {
  const activeConfig = config ?? runtimeConfig
  if (!activeConfig) {
    return createDefaultRuntimeConfigPayload()
  }

  return {
    connectionMode: activeConfig.connectionMode,
    localDirect: activeConfig.localDirect,
    remoteTunnel: activeConfig.remoteTunnel,
    climateFeedbackMethod: activeConfig.climateFeedbackMethod,
    climatePollingIntervalSec: activeConfig.climatePollingIntervalSec,
    writeMapping: {
      lights: activeConfig.writeMapping?.lights ?? [],
      climate: activeConfig.writeMapping?.climate ?? [],
    },
    feedbackMapping: {
      lights: activeConfig.feedbackMapping?.lights ?? [],
      climate: activeConfig.feedbackMapping?.climate ?? [],
    },
  }
}

function runtimeConfigHasKnxMappings() {
  const writeCounts = getWriteMappingCounts()
  const feedbackCounts = getFeedbackMappingCounts()
  return (
    Object.values(writeCounts).some((count) => count > 0) ||
    Object.values(feedbackCounts).some((count) => count > 0)
  )
}

function getRuntimeConfigRoomCountFromMappings(writeMapping, feedbackMapping) {
  const rooms = new Set()
  for (const point of writeMapping?.lights ?? []) {
    if (point.room) {
      rooms.add(point.room)
    }
  }
  for (const point of writeMapping?.climate ?? []) {
    if (point.room) {
      rooms.add(point.room)
    }
  }
  for (const point of feedbackMapping?.lights ?? []) {
    if (point.room) {
      rooms.add(point.room)
    }
  }
  for (const point of feedbackMapping?.climate ?? []) {
    if (point.room) {
      rooms.add(point.room)
    }
  }
  return rooms.size
}

function getRuntimeConfigMappingCountsFromPayload(payload) {
  const writeMapping = normalizeWriteMapping(payload)
  const feedbackMapping = normalizeFeedbackMapping(payload)
  const lightWrite = writeMapping.lights.filter((point) =>
    isConfiguredAddress(point.lightAddress),
  ).length
  const dimWrite = writeMapping.lights.filter(
    (point) => point.dimmable && isConfiguredAddress(point.valueAddress),
  ).length
  const climateWrite = writeMapping.climate.filter(
    (point) =>
      point.climateActive &&
      point.liveClimateActive &&
      isConfiguredAddress(point.setpointAddress),
  ).length
  const lightFeedback = feedbackMapping.lights.filter((point) =>
    isConfiguredAddress(point.lightFeedback),
  ).length
  const dimFeedback = feedbackMapping.lights.filter((point) =>
    isConfiguredAddress(point.valueFeedback),
  ).length
  const climateFeedback = feedbackMapping.climate.reduce(
    (count, target) => count + (target.points?.length ?? 0),
    0,
  )

  return {
    roomCount: getRuntimeConfigRoomCountFromMappings(writeMapping, feedbackMapping),
    write: {
      light: lightWrite,
      dim: dimWrite,
      climate: climateWrite,
    },
    feedback: {
      light: lightFeedback,
      dim: dimFeedback,
      climate: climateFeedback,
    },
  }
}

function getCurrentRuntimeConfigMappingCounts() {
  return {
    roomCount: getRuntimeConfigRoomCountFromMappings(
      runtimeConfig?.writeMapping,
      runtimeConfig?.feedbackMapping,
    ),
    write: getWriteMappingCounts(),
    feedback: getFeedbackMappingCounts(),
  }
}

function createRuntimeConfigIntegrity(expected, actual, source = 'runtime-config') {
  const mismatches = []
  for (const section of ['write', 'feedback']) {
    for (const key of ['light', 'dim', 'climate']) {
      const expectedValue = Number(expected?.[section]?.[key] ?? 0)
      const actualValue = Number(actual?.[section]?.[key] ?? 0)
      if (actualValue < expectedValue) {
        mismatches.push({
          section,
          key,
          expected: expectedValue,
          actual: actualValue,
        })
      }
    }
  }

  if (Number(actual?.roomCount ?? 0) < Number(expected?.roomCount ?? 0)) {
    mismatches.push({
      section: 'rooms',
      key: 'roomCount',
      expected: Number(expected?.roomCount ?? 0),
      actual: Number(actual?.roomCount ?? 0),
    })
  }

  const missingClimateMappings = mismatches.some(
    (mismatch) => mismatch.key === 'climate' || mismatch.key === 'roomCount',
  )

  return {
    ok: mismatches.length === 0,
    checkedAt: new Date().toISOString(),
    source,
    expected,
    actual,
    mismatches,
    missingClimateMappings,
  }
}

async function persistRuntimeConfigIfValid(source = 'runtime-config') {
  if (!runtimeConfig || !runtimeConfigHasKnxMappings()) {
    return false
  }

  const now = new Date().toISOString()
  const payload = {
    savedAt: now,
    source,
    version: 'v8.x-stabilization-knx-config',
    runtimeConfig: createSerializableRuntimeConfigPayload(runtimeConfig),
    diagnostics: {
      targetBuildCount: runtimeConfigDiagnostics.targetBuildCount,
      feedbackMappingCounts: getFeedbackMappingCounts(),
      writeMappingCounts: getWriteMappingCounts(),
    },
  }

  try {
    await mkdir(runtimeConfigDirectory, { recursive: true })
    await writeFile(runtimeConfigFile, JSON.stringify(payload, null, 2), 'utf8')
    runtimeConfigDiagnostics.latestValidConfigAt = now
    runtimeConfigDiagnostics.latestValidConfigAgeMs = 0
    runtimeConfigDiagnostics.persistedConfigError = null
    return true
  } catch (error) {
    runtimeConfigDiagnostics.persistedConfigError =
      error instanceof Error ? error.message : 'Could not persist runtime config'
    return false
  }
}

async function restorePersistedRuntimeConfig() {
  try {
    const raw = await readFile(runtimeConfigFile, 'utf8')
    const parsed = JSON.parse(raw)
    const restoredPayload = parsed?.runtimeConfig
    if (!restoredPayload || typeof restoredPayload !== 'object') {
      runtimeConfigDiagnostics.persistedConfigError = 'Persisted runtime config was incomplete'
      return false
    }

    const expectedCounts = getRuntimeConfigMappingCountsFromPayload(restoredPayload)
    runtimeConfig = normalizeRuntimeConfig(restoredPayload)
    const actualCounts = getCurrentRuntimeConfigMappingCounts()
    const integrity = createRuntimeConfigIntegrity(expectedCounts, actualCounts, 'persisted-server-config')
    runtimeConfigDiagnostics.persistedConfigRestored = true
    runtimeConfigDiagnostics.latestValidConfigAt = parsed.savedAt ?? null
    runtimeConfigDiagnostics.latestValidConfigAgeMs = parsed.savedAt
      ? Math.max(0, Date.now() - Date.parse(parsed.savedAt))
      : null
    runtimeConfigDiagnostics.restoredConfigIntegrity = integrity
    runtimeConfigDiagnostics.missingClimateMappings = integrity.missingClimateMappings
    runtimeConfigDiagnostics.restoredRoomCount = actualCounts.roomCount
    runtimeConfigDiagnostics.restoredClimateWriteCount = actualCounts.write.climate
    runtimeConfigDiagnostics.restoredClimateFeedbackCount = actualCounts.feedback.climate
    runtimeConfigDiagnostics.restoredLightCount = actualCounts.write.light + actualCounts.feedback.light
    runtimeConfigDiagnostics.restoredDimCount = actualCounts.write.dim + actualCounts.feedback.dim
    updateRuntimeConfigDiagnostics('persisted-server-config', 'boot-restore-persisted-config', {
      source: parsed.source ?? 'persisted-server-config',
      savedAt: parsed.savedAt ?? null,
      targetBuildCount: parsed.diagnostics?.targetBuildCount ?? null,
      feedbackMappingCounts: parsed.diagnostics?.feedbackMappingCounts ?? null,
      writeMappingCounts: parsed.diagnostics?.writeMappingCounts ?? null,
      restoredConfigIntegrity: integrity,
      payloadSizeBytes: Buffer.byteLength(raw, 'utf8'),
    })
    runtimeConfigDiagnostics.persistedConfigError = integrity.ok
      ? null
      : 'Persisted runtime config restored with mapping mismatches'
    return true
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      runtimeConfigDiagnostics.persistedConfigError =
        error instanceof Error ? error.message : 'Could not restore persisted runtime config'
    }
    return false
  }
}

function normalizeAutoPollQuietSignalsConfig(value = {}) {
  const normalizeList = (list) =>
    Array.isArray(list)
      ? Array.from(
          new Set(
            list
              .map((item) => String(item ?? '').trim())
              .filter(Boolean),
          ),
        )
      : []
  const allowedModes = new Set([
    'allEligible',
    'selectedSignals',
    'selectedRooms',
    'selectedGroupAddresses',
  ])

  return {
    enabled: Boolean(value?.enabled),
    mode: allowedModes.has(value?.mode) ? value.mode : defaultAutoPollQuietSignalsConfig.mode,
    quietThresholdMinutes: Number.isFinite(Number(value?.quietThresholdMinutes))
      ? Math.max(5, Number(value.quietThresholdMinutes))
      : defaultAutoPollQuietSignalsConfig.quietThresholdMinutes,
    globalMaxPollsPerWindow: Number.isFinite(Number(value?.globalMaxPollsPerWindow))
      ? Math.max(1, Number(value.globalMaxPollsPerWindow))
      : defaultAutoPollQuietSignalsConfig.globalMaxPollsPerWindow,
    pollWindowMinutes: Number.isFinite(Number(value?.pollWindowMinutes))
      ? Math.max(1, Number(value.pollWindowMinutes))
      : defaultAutoPollQuietSignalsConfig.pollWindowMinutes,
    perRoomCooldownMinutes: Number.isFinite(Number(value?.perRoomCooldownMinutes))
      ? Math.max(5, Number(value.perRoomCooldownMinutes))
      : defaultAutoPollQuietSignalsConfig.perRoomCooldownMinutes,
    perSignalCooldownMinutes: Number.isFinite(Number(value?.perSignalCooldownMinutes))
      ? Math.max(5, Number(value.perSignalCooldownMinutes))
      : defaultAutoPollQuietSignalsConfig.perSignalCooldownMinutes,
    selectedSignals: normalizeList(value?.selectedSignals),
    selectedRooms: normalizeList(value?.selectedRooms),
    selectedGroupAddresses: normalizeList(value?.selectedGroupAddresses),
    excludedSignals: normalizeList(value?.excludedSignals),
    excludedRooms: normalizeList(value?.excludedRooms),
    excludedGroupAddresses: normalizeList(value?.excludedGroupAddresses),
    sourceWhenEnabled: 'autoPoll',
    staleRelevantOnly: true,
    skipOnChangeOnly: true,
  }
}

function classifyConversationFeedbackIssue(message) {
  const text = String(message ?? '').toLowerCase()
  const issues = new Set()

  if (
    text.includes('light mode') ||
    text.includes('lys tekst') ||
    text.includes('for lys') ||
    text.includes('kontrast') ||
    text.includes('ikke synlig') ||
    text.includes('kan ikke lese') ||
    text.includes('farge')
  ) {
    issues.add('lightModeContrast')
  }

  if (
    text.includes('uleselig') ||
    text.includes('uklar') ||
    text.includes('tekst') ||
    text.includes('detalj') ||
    text.includes('graf') ||
    text.includes('logg')
  ) {
    issues.add('unclearText')
  }

  if (
    text.includes('misforst') ||
    text.includes('misforstå') ||
    text.includes('feil svar') ||
    text.includes('tolker feil')
  ) {
    issues.add('wrongIntent')
  }

  if (
    text.includes('knapp') ||
    text.includes('kan vel') ||
    text.includes('mangler') ||
    text.includes('må kunne') ||
    text.includes('burde') ||
    text.includes('styr')
  ) {
    issues.add('missingAction')
  }

  if (
    text.includes('støy') ||
    text.includes('mas') ||
    text.includes('gjentar') ||
    text.includes('for mye')
  ) {
    issues.add('noisyObservation')
  }

  if (
    text.includes('treghet') ||
    text.includes('tar litt tid') ||
    text.includes('ikke oppdater') ||
    text.includes('forsink') ||
    text.includes('først lenge etterpå') ||
    text.includes('knx umiddelbart') ||
    text.includes('stoler')
  ) {
    issues.add('trustMismatch')
  }

  return Array.from(issues)
}

function getConversationFeedbackReview() {
  const reviewedAt = new Date().toISOString()

  if (!runtimeSystemConfigState.conversationLogging.enabled) {
    return {
      available: false,
      reviewedAt,
      itemCount: 0,
      byPage: {},
      byIssueType: {},
      latestFeedbackItems: [],
      error: 'conversationLoggingDisabled',
    }
  }

  try {
    if (!existsSync(runtimeConversationLogFile)) {
      return {
        available: false,
        reviewedAt,
        itemCount: 0,
        byPage: {},
        byIssueType: {},
        latestFeedbackItems: [],
        error: 'conversationLogMissing',
      }
    }

    const raw = readFileSync(runtimeConversationLogFile, 'utf8')
    const entries = raw
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-160)
      .map((line) => {
        try {
          return JSON.parse(line)
        } catch {
          return null
        }
      })
      .filter((entry) => entry && entry.role === 'user')

    const feedbackItems = entries
      .map((entry) => {
        const message = String(entry.message ?? '').trim()
        const issueTypes = classifyConversationFeedbackIssue(message)

        if (message.length < 8 || issueTypes.length === 0) {
          return null
        }

        return {
          at: entry.timestamp ?? entry.at ?? null,
          page: entry.context?.currentPage ?? entry.currentPage ?? 'unknown',
          issueTypes,
          message: message.length > 180 ? `${message.slice(0, 177)}...` : message,
        }
      })
      .filter(Boolean)

    const byPage = {}
    const byIssueType = {}
    for (const item of feedbackItems) {
      byPage[item.page] = (byPage[item.page] ?? 0) + 1
      for (const issueType of item.issueTypes) {
        byIssueType[issueType] = (byIssueType[issueType] ?? 0) + 1
      }
    }

    return {
      available: feedbackItems.length > 0,
      reviewedAt,
      itemCount: feedbackItems.length,
      byPage,
      byIssueType,
      latestFeedbackItems: feedbackItems.slice(-8).reverse(),
      error: null,
    }
  } catch (error) {
    return {
      available: false,
      reviewedAt,
      itemCount: 0,
      byPage: {},
      byIssueType: {},
      latestFeedbackItems: [],
      error: error instanceof Error ? error.message : 'conversationFeedbackReviewFailed',
    }
  }
}

function getRuntimeSystemConfigDiagnostics() {
  const rooms = Array.isArray(runtimeSystemConfigState.systemConfig?.rooms)
    ? runtimeSystemConfigState.systemConfig.rooms
    : []
  const climateRooms = rooms.filter((room) => Boolean(room?.climate?.active))
  const heatPowerRooms = climateRooms.filter(
    (room) => Number.isFinite(Number(room?.heatPowerWatts)) && Number(room.heatPowerWatts) > 0,
  )
  const nominalPowerRooms = climateRooms.filter(
    (room) => Number.isFinite(Number(room?.nominalPowerWatts)) && Number(room.nominalPowerWatts) > 0,
  )
  const roomsMissingHeatPower = climateRooms
    .filter(
      (room) =>
        !(Number.isFinite(Number(room?.heatPowerWatts)) && Number(room.heatPowerWatts) > 0) &&
        !(Number.isFinite(Number(room?.nominalPowerWatts)) && Number(room.nominalPowerWatts) > 0),
    )
    .map((room) => ({ roomKey: room?.key ?? null, roomName: room?.name ?? null }))
  const cameraConfig = runtimeSystemConfigState.systemConfig?.camera ?? null
  const cameras = Array.isArray(cameraConfig?.cameras) ? cameraConfig.cameras : []
  const mediaGroups = Array.isArray(runtimeSystemConfigState.systemConfig?.media?.groups)
    ? runtimeSystemConfigState.systemConfig.media.groups
    : []
  const mediaGroupSpeakers = mediaGroups.flatMap((group) =>
    Array.isArray(group?.speakers) ? group.speakers : [],
  )

  return {
    configSource: runtimeSystemConfigState.configSource,
    lastConfigSaveAt: runtimeSystemConfigState.lastConfigSaveAt,
    lastConfigSaveClient: runtimeSystemConfigState.lastConfigSaveClient,
    lastConfigSaveSession: runtimeSystemConfigState.lastConfigSaveSession,
    configVersion: runtimeSystemConfigState.version,
    configDriftDetected: runtimeSystemConfigState.configDriftDetected,
    storagePath: runtimeSystemConfigState.storagePath,
    loadedAt: runtimeSystemConfigState.loadedAt,
    lastError: runtimeSystemConfigState.lastError,
    hasServerConfig: Boolean(runtimeSystemConfigState.systemConfig),
    language: runtimeSystemConfigState.systemConfig?.language === 'en' ? 'en' : 'no',
    roomCount: rooms.length,
    heatDemandAddressCount: rooms.filter((room) =>
      isConfiguredAddress(room?.climate?.heatDemand),
    ).length,
    heatPowerCoverage: {
      climateRoomCount: climateRooms.length,
      configuredHeatPowerCount: heatPowerRooms.length,
      nominalPowerCount: nominalPowerRooms.length,
      heatPowerCoveragePercent: climateRooms.length > 0
        ? Math.round(((climateRooms.length - roomsMissingHeatPower.length) / climateRooms.length) * 100)
        : 0,
      roomsMissingHeatPower,
    },
    cameraFoundation: {
      providerEnabled: Boolean(cameraConfig?.providerEnabled),
      cameraCount: cameras.length,
      enabledCount: cameras.filter((camera) => Boolean(camera?.enabled)).length,
      visibleCount: cameras.filter((camera) => camera?.visible !== false).length,
      recordingEnabledCount: cameras.filter((camera) => Boolean(camera?.recordingEnabled)).length,
      missingStreamCount: cameras.filter(
        (camera) =>
          Boolean(camera?.enabled) &&
          !isConfiguredAddress(camera?.rtspUrl) &&
          !isConfiguredAddress(camera?.onvif) &&
          !isConfiguredAddress(camera?.snapshotUrl),
      ).length,
      recorderTarget: cameraConfig?.recorder?.target ?? 'localDisk',
      retentionDays: Number(cameraConfig?.recorder?.retentionDays ?? 0),
      overwriteOldest: Boolean(cameraConfig?.recorder?.overwriteOldest),
      storageHealth: cameraConfig?.recorder?.storageHealth ?? 'unknown',
    },
    mediaGroups: {
      groupCount: mediaGroups.length,
      enabledCount: mediaGroups.filter((group) => Boolean(group?.enabled)).length,
      speakerCount: mediaGroupSpeakers.length,
      castTargetCount: mediaGroups.reduce(
        (sum, group) => sum + (Array.isArray(group?.castTargets) ? group.castTargets.length : 0),
        0,
      ),
      delayOffsetCount: mediaGroupSpeakers.filter((speaker) => Number(speaker?.offsetMs ?? 0) !== 0).length,
    },
    uiCapabilityServerOwned: Boolean(runtimeSystemConfigState.uiCapabilityConfig),
    conversationLoggingEnabled: runtimeSystemConfigState.conversationLogging.enabled,
    conversationLog: runtimeSystemConfigState.conversationLog,
    conversationFeedbackReview: getConversationFeedbackReview(),
    autoPollQuietSignals: runtimeSystemConfigState.autoPollQuietSignals,
  }
}

function createRuntimeSystemConfigPayload() {
  return {
    ok: true,
    source: 'server-runtime-config',
    timestamp: new Date().toISOString(),
    systemConfig: runtimeSystemConfigState.systemConfig,
    uiCapabilityConfig: runtimeSystemConfigState.uiCapabilityConfig,
    conversationLogging: runtimeSystemConfigState.conversationLogging,
    autoPollQuietSignals: runtimeSystemConfigState.autoPollQuietSignals,
    diagnostics: getRuntimeSystemConfigDiagnostics(),
  }
}

async function persistRuntimeSystemConfig() {
  const payload = {
    savedAt: runtimeSystemConfigState.lastConfigSaveAt ?? new Date().toISOString(),
    version: runtimeSystemConfigState.version,
    source: runtimeSystemConfigState.configSource,
    lastConfigSaveClient: runtimeSystemConfigState.lastConfigSaveClient,
    lastConfigSaveSession: runtimeSystemConfigState.lastConfigSaveSession,
    systemConfig: runtimeSystemConfigState.systemConfig,
    uiCapabilityConfig: runtimeSystemConfigState.uiCapabilityConfig,
    conversationLogging: runtimeSystemConfigState.conversationLogging,
    autoPollQuietSignals: runtimeSystemConfigState.autoPollQuietSignals,
  }

  await mkdir(runtimeSystemConfigDirectory, { recursive: true })
  await writeFile(runtimeSystemConfigFile, JSON.stringify(payload, null, 2), 'utf8')
}

async function restoreRuntimeSystemConfig() {
  try {
    const raw = await readFile(runtimeSystemConfigFile, 'utf8')
    const parsed = JSON.parse(raw)
    runtimeSystemConfigState.systemConfig = parsed?.systemConfig ?? null
    runtimeSystemConfigState.uiCapabilityConfig = parsed?.uiCapabilityConfig ?? null
    runtimeSystemConfigState.configSource = runtimeSystemConfigState.systemConfig
      ? 'server'
      : 'none'
    runtimeSystemConfigState.version = Number(parsed?.version ?? 0)
    runtimeSystemConfigState.loadedAt = new Date().toISOString()
    runtimeSystemConfigState.lastConfigSaveAt = parsed?.savedAt ?? null
    runtimeSystemConfigState.lastConfigSaveClient = parsed?.lastConfigSaveClient ?? null
    runtimeSystemConfigState.lastConfigSaveSession = parsed?.lastConfigSaveSession ?? null
    runtimeSystemConfigState.conversationLogging = {
      enabled: Boolean(parsed?.conversationLogging?.enabled),
      updatedAt: parsed?.conversationLogging?.updatedAt ?? parsed?.savedAt ?? null,
    }
    runtimeSystemConfigState.autoPollQuietSignals = normalizeAutoPollQuietSignalsConfig(
      parsed?.autoPollQuietSignals,
    )
    runtimeSystemConfigState.lastError = null
    return true
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      runtimeSystemConfigState.lastError =
        error instanceof Error ? error.message : 'Could not restore server-owned system config'
    }
    return false
  }
}

async function applyRuntimeSystemConfig(payload, request, url) {
  const context = getClientContext(request, 'frontend', payload, url)
  const now = new Date().toISOString()
  const nextSystemConfig = payload?.systemConfig && typeof payload.systemConfig === 'object'
    ? payload.systemConfig
    : runtimeSystemConfigState.systemConfig
  const nextUiCapabilityConfig =
    payload?.uiCapabilityConfig && typeof payload.uiCapabilityConfig === 'object'
      ? payload.uiCapabilityConfig
      : runtimeSystemConfigState.uiCapabilityConfig

  if (!nextSystemConfig) {
    throw new Error('SystemConfig mangler i request')
  }

  runtimeSystemConfigState.systemConfig = nextSystemConfig
  runtimeSystemConfigState.uiCapabilityConfig = nextUiCapabilityConfig
  runtimeSystemConfigState.configSource = 'server'
  runtimeSystemConfigState.version += 1
  runtimeSystemConfigState.lastConfigSaveAt = now
  runtimeSystemConfigState.lastConfigSaveClient = context.clientId
  runtimeSystemConfigState.lastConfigSaveSession = context.sessionId
  runtimeSystemConfigState.configDriftDetected = false
  runtimeSystemConfigState.conversationLogging = {
    enabled: Boolean(payload?.conversationLogging?.enabled),
    updatedAt: payload?.conversationLogging ? now : runtimeSystemConfigState.conversationLogging.updatedAt,
  }
  runtimeSystemConfigState.autoPollQuietSignals = normalizeAutoPollQuietSignalsConfig(
    payload?.autoPollQuietSignals ?? runtimeSystemConfigState.autoPollQuietSignals,
  )

  await persistRuntimeSystemConfig()
  updateSceneSchedulerPlan(new Date())
  const subscriptionRuntime = runtimeConfig
    ? startKnxSubscriptionRuntime('server-owned-system-config')
    : null
  emitRuntimeEvent('runtimeConfigUpdated', {
    category: 'runtimeConfig',
    source: 'server-owned-system-config',
    confidence: 'high',
    configVersion: runtimeSystemConfigState.version,
    clientId: context.clientId,
    sessionId: context.sessionId,
    heatDemandAddressCount: getRuntimeSystemConfigDiagnostics().heatDemandAddressCount,
    shadingFeedbackTargets: getShadingFeedbackTargets().length,
    subscriptionRuntime,
  })

  return createRuntimeSystemConfigPayload()
}

function getLocalDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function parseTriggerTime(value) {
  const match = String(value ?? '').trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) {
    return null
  }

  const hour = Number(match[1])
  const minute = Number(match[2])
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null
  }

  return { hour, minute, minutesOfDay: hour * 60 + minute }
}

function createScheduledAtForDate(triggerTime, date) {
  const parsed = parseTriggerTime(triggerTime)
  if (!parsed) {
    return null
  }

  const scheduledAt = new Date(date)
  scheduledAt.setHours(parsed.hour, parsed.minute, 0, 0)
  return scheduledAt
}

function createSceneExecutionKey(scene, scheduledAt) {
  const date = scheduledAt instanceof Date && Number.isFinite(scheduledAt.getTime())
    ? scheduledAt
    : new Date()
  const triggerTime = String(scene?.triggerTime ?? '').trim() || 'manual'

  return `${scene?.sceneId ?? scene?.id ?? 'scene'}:${getLocalDateKey(date)}:${triggerTime}`
}

function setSceneSchedulerSkipped(reason, detail = null) {
  runtimeSceneSchedulerState.lastSkippedReason = {
    reason,
    detail,
    at: new Date().toISOString(),
  }
}

function getRuntimeScenes() {
  const scenes = runtimeSystemConfigState.systemConfig?.scenes
  return Array.isArray(scenes) ? scenes : []
}

function getScheduledSceneDefinitions() {
  return getRuntimeScenes()
    .filter((scene) => scene?.enabled && scene?.triggerType === 'time' && parseTriggerTime(scene?.triggerTime))
    .map((scene) => ({
      sceneId: String(scene.id),
      sceneName: String(scene.name ?? scene.id),
      triggerTime: String(scene.triggerTime),
      lightingTargetCount: Array.isArray(scene.lighting) ? scene.lighting.length : 0,
      climateTargetCount: Array.isArray(scene.climate) ? scene.climate.length : 0,
      enabled: true,
    }))
}

function getFullScene(sceneId) {
  return getRuntimeScenes().find((candidate) => String(candidate.id) === String(sceneId)) ?? null
}

function getSceneLightingTargetPlan(fullScene, target) {
  const brightness = Math.max(0, Math.min(100, Math.round(Number(target?.brightness))))
  if (!Number.isFinite(brightness)) {
    return {
      ok: false,
      type: 'brightness',
      skippedReason: 'invalidBrightness',
      error: 'Ugyldig lysnivå',
      room: target?.roomKey ?? null,
      zone: target?.zoneKey ?? null,
      brightness: target?.brightness ?? null,
    }
  }

  try {
    const writeMapping = getRuntimeWriteMappingOrThrow('scheduled-scene-dry-run')
    const zone = writeMapping.lightByRoomAndZone.get(`${target?.roomKey}:${target?.zoneKey}`)
    if (!zone) {
      return {
        ok: false,
        type: 'brightness',
        skippedReason: 'missingMapping',
        error: `Mangler runtime-mapping for ${target?.roomKey}:${target?.zoneKey}`,
        room: target?.roomKey ?? null,
        zone: target?.zoneKey ?? null,
        brightness,
      }
    }
    if (!zone.dimmable || !isConfiguredAddress(zone.valueAddress)) {
      return {
        ok: false,
        type: 'brightness',
        skippedReason: 'missingMapping',
        error: `Mangler dim/value-adresse for ${zone.label}`,
        room: zone.room,
        zone: zone.zone,
        label: zone.label,
        brightness,
      }
    }

    return {
      ok: true,
      type: 'brightness',
      sceneId: fullScene.id,
      sceneName: fullScene.name,
      room: zone.room,
      zone: zone.zone,
      label: zone.label,
      brightness,
      groupAddress: zone.valueAddress,
      dpt: '5.001',
      dataType: zone.valueDataType,
      source: 'scheduledScene',
    }
  } catch (error) {
    return {
      ok: false,
      type: 'brightness',
      skippedReason: 'missingMapping',
      error: error instanceof Error ? error.message : 'Kunne ikke lese runtime write-mapping',
      room: target?.roomKey ?? null,
      zone: target?.zoneKey ?? null,
      brightness,
    }
  }
}

function getSceneClimateTargetPlan(fullScene, target) {
  const setpoint = getSceneClimateSetpoint(target)
  if (setpoint === null) {
    return {
      ok: false,
      type: 'setpoint',
      skippedReason: 'missingTargets',
      error: 'Mangler setpunkt/modus for klimarom',
      room: target?.roomKey ?? null,
      setpoint: null,
    }
  }

  try {
    const writeMapping = getRuntimeWriteMappingOrThrow('scheduled-scene-climate-dry-run')
    const climatePoint = writeMapping.climateByRoom.get(String(target?.roomKey ?? '').trim())
    if (!climatePoint || !isConfiguredAddress(climatePoint.setpointAddress)) {
      return {
        ok: false,
        type: 'setpoint',
        skippedReason: 'missingMapping',
        error: `Mangler setpoint-adresse for ${target?.roomKey}`,
        room: target?.roomKey ?? null,
        setpoint,
      }
    }

    return {
      ok: true,
      type: 'setpoint',
      sceneId: fullScene.id,
      sceneName: fullScene.name,
      room: climatePoint.room,
      label: climatePoint.label,
      mode: target?.mode ?? null,
      setpoint,
      groupAddress: climatePoint.setpointAddress,
      dpt: CLIMATE_FLOAT_DPT,
      dataType: climatePoint.setpointDataType,
      source: 'scheduledScene',
    }
  } catch (error) {
    return {
      ok: false,
      type: 'setpoint',
      skippedReason: 'missingMapping',
      error: error instanceof Error ? error.message : 'Kunne ikke lese climate write-mapping',
      room: target?.roomKey ?? null,
      setpoint,
    }
  }
}

function buildScheduledSceneExecutionPlan(fullScene) {
  const lightingTargets = (Array.isArray(fullScene?.lighting) ? fullScene.lighting : []).map((target) =>
    getSceneLightingTargetPlan(fullScene, target),
  )
  const climateTargets = (Array.isArray(fullScene?.climate) ? fullScene.climate : []).map((target) =>
    getSceneClimateTargetPlan(fullScene, target),
  )
  const targets = [...lightingTargets, ...climateTargets]
  const executableTargets = targets.filter((target) => target.ok)
  const skippedTargets = targets.filter((target) => !target.ok)

  return {
    ok: executableTargets.length > 0 && skippedTargets.length === 0,
    sceneId: fullScene?.id ?? null,
    sceneName: fullScene?.name ?? null,
    triggerTime: fullScene?.triggerTime ?? null,
    targetCount: targets.length,
    executableCount: executableTargets.length,
    skippedCount: skippedTargets.length,
    targets,
    executableTargets,
    skippedTargets,
  }
}

function updateSceneSchedulerPlan(now = new Date()) {
  const scheduledScenes = getScheduledSceneDefinitions()
  runtimeSceneSchedulerState.enabledSceneCount = scheduledScenes.length
  const candidates = scheduledScenes
    .map((scene) => {
      const today = createScheduledAtForDate(scene.triggerTime, now)
      if (!today) {
        return null
      }

      const scheduledAt = today.getTime() > now.getTime()
        ? today
        : new Date(today.getTime() + 24 * 60 * 60 * 1000)
      return {
        ...scene,
        nextExecutionAt: scheduledAt.toISOString(),
      }
    })
    .filter(Boolean)
    .sort((a, b) => Date.parse(a.nextExecutionAt) - Date.parse(b.nextExecutionAt))

  runtimeSceneSchedulerState.scheduledScenes = candidates
  runtimeSceneSchedulerState.scheduledSceneCount = candidates.length
  runtimeSceneSchedulerState.nextExecution = candidates[0] ?? null
}

function getSchedulerClientContext() {
  return {
    initiatedBy: 'scene-scheduler',
    initiatedFrom: 'local',
    clientId: 'internal-runtime',
    sessionId: 'scene-scheduler',
    trustedClient: true,
    trustClassification: 'internalRuntime',
  }
}

function getSceneClimateSetpoint(target) {
  const parsedTemperature = Number(String(target?.temperature ?? '').replace(',', '.'))
  if (String(target?.temperature ?? '').trim() !== '' && Number.isFinite(parsedTemperature)) {
    return Number(parsedTemperature.toFixed(1))
  }

  const mode = String(target?.mode ?? '').trim().toLowerCase()
  if (mode === 'natt') {
    return Number(runtimeSystemConfigState.systemConfig?.runtime?.nightSetpoint ?? 18)
  }
  if (mode === 'komfort') {
    return Number(runtimeSystemConfigState.systemConfig?.runtime?.comfortSetpoint ?? 22)
  }

  return null
}

async function persistSceneSchedulerState() {
  try {
    await mkdir(runtimeSceneSchedulerDirectory, { recursive: true })
    await writeFile(
      runtimeSceneSchedulerFile,
      JSON.stringify({
        savedAt: new Date().toISOString(),
        lastExecution: runtimeSceneSchedulerState.lastExecution,
        lastExecutionResult: runtimeSceneSchedulerState.lastExecutionResult,
        lastExecutionError: runtimeSceneSchedulerState.lastExecutionError,
        lastExecutionKey: runtimeSceneSchedulerState.lastExecutionKey,
        lastDryRun: runtimeSceneSchedulerState.lastDryRun,
        lastSkippedReason: runtimeSceneSchedulerState.lastSkippedReason,
        missedExecutionCount: runtimeSceneSchedulerState.missedExecutionCount,
        executionHistory: runtimeSceneSchedulerState.executionHistory.slice(-100),
        lastExecutionKeys: runtimeSceneSchedulerState.lastExecutionKeys,
        lastExecutedBySceneDay: runtimeSceneSchedulerState.lastExecutedBySceneDay,
        lastMissedBySceneDay: runtimeSceneSchedulerState.lastMissedBySceneDay,
      }, null, 2),
      'utf8',
    )
  } catch (error) {
    runtimeSceneSchedulerState.lastError =
      error instanceof Error ? error.message : 'Could not persist scene scheduler state'
  }
}

async function restoreSceneSchedulerState() {
  try {
    const raw = await readFile(runtimeSceneSchedulerFile, 'utf8')
    const parsed = JSON.parse(raw)
    runtimeSceneSchedulerState.lastExecution = parsed?.lastExecution ?? null
    runtimeSceneSchedulerState.lastExecutionResult = parsed?.lastExecutionResult ?? null
    runtimeSceneSchedulerState.lastExecutionError = parsed?.lastExecutionError ?? null
    runtimeSceneSchedulerState.lastExecutionKey = parsed?.lastExecutionKey ?? null
    runtimeSceneSchedulerState.lastDryRun = parsed?.lastDryRun ?? null
    runtimeSceneSchedulerState.lastSkippedReason = parsed?.lastSkippedReason ?? null
    runtimeSceneSchedulerState.missedExecutionCount = Number(parsed?.missedExecutionCount ?? 0)
    runtimeSceneSchedulerState.executionHistory = Array.isArray(parsed?.executionHistory)
      ? parsed.executionHistory.slice(-100)
      : []
    runtimeSceneSchedulerState.lastExecutionKeys =
      parsed?.lastExecutionKeys && typeof parsed.lastExecutionKeys === 'object'
        ? parsed.lastExecutionKeys
        : {}
    if (
      runtimeSceneSchedulerState.lastExecution?.sceneId &&
      runtimeSceneSchedulerState.lastExecution?.triggerTime &&
      runtimeSceneSchedulerState.lastExecution?.executedAt
    ) {
      const restoredExecutionDate = new Date(
        runtimeSceneSchedulerState.lastExecution.scheduledAt ??
        runtimeSceneSchedulerState.lastExecution.executedAt,
      )
      const restoredExecutionKey = createSceneExecutionKey(
        runtimeSceneSchedulerState.lastExecution,
        restoredExecutionDate,
      )
      runtimeSceneSchedulerState.lastExecutionKeys[restoredExecutionKey] =
        runtimeSceneSchedulerState.lastExecutionKeys[restoredExecutionKey] ??
        runtimeSceneSchedulerState.lastExecution.executedAt
    }
    runtimeSceneSchedulerState.lastExecutedBySceneDay =
      parsed?.lastExecutedBySceneDay && typeof parsed.lastExecutedBySceneDay === 'object'
        ? parsed.lastExecutedBySceneDay
        : {}
    runtimeSceneSchedulerState.lastMissedBySceneDay =
      parsed?.lastMissedBySceneDay && typeof parsed.lastMissedBySceneDay === 'object'
        ? parsed.lastMissedBySceneDay
        : {}
    runtimeSceneSchedulerState.lastError = null
    return true
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      runtimeSceneSchedulerState.lastError =
        error instanceof Error ? error.message : 'Could not restore scene scheduler state'
    }
    return false
  }
}

async function executeScheduledScene(scene, reason = 'scheduled', options = {}) {
  if (runtimeSceneSchedulerInFlight.has(scene.sceneId)) {
    setSceneSchedulerSkipped('inFlight', { sceneId: scene.sceneId, reason })
    return null
  }

  runtimeSceneSchedulerInFlight.add(scene.sceneId)
  const startedAt = new Date().toISOString()
  const fullScene = getFullScene(scene.sceneId)
  const actionResults = []
  let failedCount = 0

  try {
    if (!fullScene) {
      throw new Error(`Scene ${scene.sceneName} finnes ikke i server-owned SystemConfig`)
    }

    const scheduledAt =
      options.scheduledAt instanceof Date && Number.isFinite(options.scheduledAt.getTime())
        ? options.scheduledAt
        : createScheduledAtForDate(fullScene.triggerTime, new Date())
    const executionKey = options.manual
      ? `manual:${fullScene.id}:${Date.now()}`
      : createSceneExecutionKey(scene, scheduledAt)
    const plan = buildScheduledSceneExecutionPlan(fullScene)
    const attempt = {
      sceneId: fullScene.id,
      sceneName: fullScene.name,
      triggerTime: fullScene.triggerTime,
      reason,
      startedAt,
      scheduledAt: scheduledAt?.toISOString?.() ?? null,
      executionKey,
      dryRun: Boolean(options.dryRun),
      targetCount: plan.targetCount,
      executableCount: plan.executableCount,
      skippedCount: plan.skippedCount,
      targets: plan.targets,
    }
    runtimeSceneSchedulerState.lastExecutionAttempt = attempt
    runtimeSceneSchedulerState.lastDueCheck = {
      at: startedAt,
      reason,
      sceneId: fullScene.id,
      executionKey,
    }

    if (options.dryRun) {
      runtimeSceneSchedulerState.lastDryRun = {
        ...attempt,
        completedAt: new Date().toISOString(),
      }
      await persistSceneSchedulerState()
      return runtimeSceneSchedulerState.lastDryRun
    }

    if (!options.force && runtimeSceneSchedulerState.lastExecutionKeys[executionKey]) {
      setSceneSchedulerSkipped('duplicateExecutionKey', { executionKey, sceneId: fullScene.id })
      await persistSceneSchedulerState()
      return null
    }

    if (plan.executableCount === 0) {
      setSceneSchedulerSkipped(plan.skippedTargets[0]?.skippedReason ?? 'missingTargets', {
        sceneId: fullScene.id,
        sceneName: fullScene.name,
        targets: plan.skippedTargets,
      })
      throw new Error(
        plan.skippedTargets[0]?.error ?? 'Scene har ingen skrivbare targets i runtime-config',
      )
    }

    const clientContext = getSchedulerClientContext()
    for (const target of plan.targets.filter((candidate) => candidate.type === 'brightness')) {
      if (!target.ok) {
        failedCount += 1
        actionResults.push(target)
        continue
      }
      try {
        const result = await runRuntimeAction(
          {
            type: 'scheduledSceneBrightnessWrite',
            category: 'knxWrite',
            source: 'scene-scheduler',
            roomId: target.room,
            target: { sceneId: fullScene.id, sceneName: fullScene.name, room: target.room, zone: target.zone, groupAddress: target.groupAddress },
            payloadSummary: sanitizeActionPayloadSummary({
              sceneId: fullScene.id,
              sceneName: fullScene.name,
              room: target.room,
              zone: target.zone,
              brightness: target.brightness,
            }),
            requestedBy: 'runtime-scheduler',
            clientContext,
            approvalRequired: false,
            confidence: 'medium',
            runtimeContext: {
              schedulerSource: 'server-runtime',
              explicitSchedule: true,
              triggerTime: fullScene.triggerTime,
              dpt: target.dpt,
              groupAddress: target.groupAddress,
              executionKey,
            },
          },
          () =>
            handleBrightnessCommand({
              room: target.room,
              zone: target.zone,
              brightness: target.brightness,
              monitorSource: 'sceneScheduler',
              sceneId: fullScene.id,
              sceneName: fullScene.name,
              executionKey,
            }),
        )
        if (result?.pendingApproval || result?.ok === false) {
          failedCount += 1
        }
        actionResults.push({
          ok: !result?.pendingApproval && result?.ok !== false,
          type: 'brightness',
          room: target.room,
          zone: target.zone,
          brightness: target.brightness,
          groupAddress: target.groupAddress,
          dpt: target.dpt,
          result,
          skippedReason: result?.pendingApproval ? 'actionDenied' : undefined,
        })
      } catch (error) {
        failedCount += 1
        actionResults.push({
          ok: false,
          type: 'brightness',
          room: target.room,
          zone: target.zone,
          groupAddress: target.groupAddress,
          dpt: target.dpt,
          error: error instanceof Error ? error.message : 'Scene lys-action feilet',
          skippedReason: 'writeFailed',
        })
      }
    }

    for (const target of plan.targets.filter((candidate) => candidate.type === 'setpoint')) {
      if (!target.ok) {
        failedCount += 1
        actionResults.push(target)
        continue
      }

      try {
        const result = await runRuntimeAction(
          {
            type: 'scheduledSceneSetpointWrite',
            category: 'knxWrite',
            source: 'scene-scheduler',
            roomId: target.room,
            target: { sceneId: fullScene.id, sceneName: fullScene.name, room: target.room, mode: target.mode ?? null, groupAddress: target.groupAddress },
            payloadSummary: sanitizeActionPayloadSummary({
              sceneId: fullScene.id,
              sceneName: fullScene.name,
              room: target.room,
              mode: target.mode ?? null,
              setpoint: target.setpoint,
            }),
            requestedBy: 'runtime-scheduler',
            clientContext,
            approvalRequired: false,
            confidence: 'medium',
            runtimeContext: {
              schedulerSource: 'server-runtime',
              explicitSchedule: true,
              triggerTime: fullScene.triggerTime,
              dpt: target.dpt,
              groupAddress: target.groupAddress,
              executionKey,
            },
          },
          () => handleModeCommand({
            room: target.room,
            roomName: target.label ?? target.room,
            mode: target.mode,
            setpoint: target.setpoint,
            liveClimateActive: true,
            monitorSource: 'sceneScheduler',
            sceneId: fullScene.id,
            sceneName: fullScene.name,
            executionKey,
          }),
        )
        if (result?.pendingApproval || result?.ok === false) {
          failedCount += 1
        }
        actionResults.push({
          ok: !result?.pendingApproval && result?.ok !== false,
          type: 'setpoint',
          room: target.room,
          setpoint: target.setpoint,
          groupAddress: target.groupAddress,
          dpt: target.dpt,
          result,
          skippedReason: result?.pendingApproval ? 'actionDenied' : undefined,
        })
      } catch (error) {
        failedCount += 1
        actionResults.push({
          ok: false,
          type: 'setpoint',
          room: target.room,
          groupAddress: target.groupAddress,
          dpt: target.dpt,
          error: error instanceof Error ? error.message : 'Scene klima-action feilet',
          skippedReason: 'writeFailed',
        })
      }
    }

    const execution = {
      sceneId: fullScene.id,
      sceneName: fullScene.name,
      triggerTime: fullScene.triggerTime,
      executedAt: new Date().toISOString(),
      startedAt,
      reason,
      resultCount: actionResults.length,
      failedCount,
      source: 'server-runtime',
      scheduledAt: scheduledAt?.toISOString?.() ?? null,
      executionKey,
      targetResults: actionResults,
    }
    runtimeSceneSchedulerState.lastExecution = execution
    runtimeSceneSchedulerState.lastExecutionResult = {
      ...execution,
      actionResults,
    }
    runtimeSceneSchedulerState.lastExecutionKey = executionKey
    runtimeSceneSchedulerState.lastExecutionKeys[executionKey] = execution.executedAt
    runtimeSceneSchedulerState.executionHistory = [
      ...runtimeSceneSchedulerState.executionHistory,
      execution,
    ].slice(-100)
    runtimeSceneSchedulerState.lastExecutedBySceneDay[fullScene.id] = getLocalDateKey(scheduledAt ?? new Date())
    runtimeSceneSchedulerState.lastError = failedCount > 0 ? `${failedCount} scene actions failed` : null
    runtimeSceneSchedulerState.lastExecutionError = runtimeSceneSchedulerState.lastError
    const firstSkippedAction = actionResults.find((result) => result?.skippedReason)
    if (firstSkippedAction) {
      setSceneSchedulerSkipped(firstSkippedAction.skippedReason, {
        sceneId: fullScene.id,
        sceneName: fullScene.name,
        target: firstSkippedAction,
      })
    }
    emitRuntimeEvent('sceneSchedulerExecutionCompleted', {
      category: 'sceneScheduler',
      source: 'scene-scheduler',
      confidence: failedCount > 0 ? 'medium' : 'high',
      scene: execution,
      actionResults,
    })
    await persistSceneSchedulerState()
    return execution
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scene execution failed'
    runtimeSceneSchedulerState.lastExecutionError = message
    runtimeSceneSchedulerState.lastError = message
    runtimeSceneSchedulerState.lastExecutionResult = {
      ok: false,
      sceneId: scene.sceneId,
      sceneName: scene.sceneName,
      failedAt: new Date().toISOString(),
      error: message,
      actionResults,
    }
    await persistSceneSchedulerState()
    throw error
  } finally {
    runtimeSceneSchedulerInFlight.delete(scene.sceneId)
  }
}

function markSceneMissed(scene, dateKey, executionKey = null) {
  const missedKey = executionKey ?? createSceneExecutionKey(scene, createScheduledAtForDate(scene.triggerTime, new Date()))
  if (runtimeSceneSchedulerState.lastMissedBySceneDay[missedKey] === dateKey) {
    return
  }

  runtimeSceneSchedulerState.lastMissedBySceneDay[missedKey] = dateKey
  runtimeSceneSchedulerState.missedExecutionCount += 1
  runtimeSceneSchedulerState.lastError = `Scene ${scene.sceneName} passerte missed grace window`
  setSceneSchedulerSkipped('missedExecution', {
    sceneId: scene.sceneId,
    sceneName: scene.sceneName,
    triggerTime: scene.triggerTime,
    executionKey: missedKey,
  })
  void persistSceneSchedulerState()
}

async function checkSceneScheduler(reason = 'interval') {
  try {
    const now = new Date()
    runtimeSceneSchedulerState.tickCount += 1
    runtimeSceneSchedulerState.lastTickAt = now.toISOString()
    runtimeSceneSchedulerState.lastCheckAt = now.toISOString()
    runtimeSceneSchedulerState.nextTickAt = new Date(now.getTime() + sceneSchedulerIntervalMs).toISOString()
    updateSceneSchedulerPlan(now)

    if (!runtimeSceneSchedulerState.schedulerActive) {
      runtimeSceneSchedulerState.dueScenes = []
      setSceneSchedulerSkipped('disabled', { reason })
      return
    }

    const scheduledScenes = getScheduledSceneDefinitions()
    runtimeSceneSchedulerState.enabledSceneCount = scheduledScenes.length
    if (scheduledScenes.length === 0) {
      runtimeSceneSchedulerState.dueScenes = []
      runtimeSceneSchedulerState.lastDueCheck = {
        at: now.toISOString(),
        reason,
        scheduledSceneCount: 0,
        dueCount: 0,
        nextExecutionAt: null,
      }
      setSceneSchedulerSkipped('noScenes', { reason })
      return
    }

    const dueScenes = []
    for (const scene of scheduledScenes) {
      const scheduledAt = createScheduledAtForDate(scene.triggerTime, now)
      if (!scheduledAt) {
        setSceneSchedulerSkipped('missingTargets', {
          sceneId: scene.sceneId,
          sceneName: scene.sceneName,
          detail: 'Ugyldig triggerTime',
        })
        continue
      }

      const dateKey = getLocalDateKey(scheduledAt)
      const executionKey = createSceneExecutionKey(scene, scheduledAt)
      if (runtimeSceneSchedulerState.lastExecutionKeys[executionKey]) {
        setSceneSchedulerSkipped('duplicateExecutionKey', {
          sceneId: scene.sceneId,
          sceneName: scene.sceneName,
          triggerTime: scene.triggerTime,
          executionKey,
        })
        continue
      }

      const deltaMs = now.getTime() - scheduledAt.getTime()
      if (deltaMs >= 0 && deltaMs <= sceneSchedulerMissedGraceMs) {
        dueScenes.push({
          ...scene,
          scheduledAt: scheduledAt.toISOString(),
          executionKey,
          deltaMs,
        })
        continue
      }

      if (deltaMs > sceneSchedulerMissedGraceMs) {
        markSceneMissed(scene, dateKey, executionKey)
      }
    }

    runtimeSceneSchedulerState.dueScenes = dueScenes
    runtimeSceneSchedulerState.lastDueCheck = {
      at: now.toISOString(),
      reason,
      scheduledSceneCount: scheduledScenes.length,
      dueCount: dueScenes.length,
      dueScenes,
      nextExecutionAt: runtimeSceneSchedulerState.nextExecution?.nextExecutionAt ?? null,
    }
    if (dueScenes.length === 0) {
      setSceneSchedulerSkipped('notDue', {
        reason,
        scheduledSceneCount: scheduledScenes.length,
        nextExecutionAt: runtimeSceneSchedulerState.nextExecution?.nextExecutionAt ?? null,
      })
    }

    for (const scene of dueScenes) {
      await executeScheduledScene(
        scene,
        scene.deltaMs > sceneSchedulerIntervalMs ? 'missed-catchup' : reason,
        { scheduledAt: new Date(scene.scheduledAt) },
      )
    }

    updateSceneSchedulerPlan(new Date())
  } catch (error) {
    runtimeSceneSchedulerState.lastError =
      error instanceof Error ? error.message : 'Scene scheduler check failed'
    runtimeSceneSchedulerState.lastExecutionError = runtimeSceneSchedulerState.lastError
  }
}

function getSceneSchedulerDiagnostics() {
  updateSceneSchedulerPlan(new Date())
  return {
    schedulerActive: runtimeSceneSchedulerState.schedulerActive,
    schedulerSource: runtimeSceneSchedulerState.schedulerSource,
    persisted: runtimeSceneSchedulerState.persisted,
    unsafeFrontendScheduler: runtimeSceneSchedulerState.unsafeFrontendScheduler,
    intervalMs: runtimeSceneSchedulerState.intervalMs,
    missedGraceMs: runtimeSceneSchedulerState.missedGraceMs,
    startedAt: runtimeSceneSchedulerState.startedAt,
    schedulerStartedAt: runtimeSceneSchedulerState.startedAt,
    tickCount: runtimeSceneSchedulerState.tickCount,
    lastTickAt: runtimeSceneSchedulerState.lastTickAt,
    nextTickAt: runtimeSceneSchedulerState.nextTickAt,
    lastCheckAt: runtimeSceneSchedulerState.lastCheckAt,
    lastDueCheck: runtimeSceneSchedulerState.lastDueCheck,
    dueScenes: runtimeSceneSchedulerState.dueScenes,
    scheduledSceneCount: runtimeSceneSchedulerState.scheduledSceneCount,
    enabledSceneCount: runtimeSceneSchedulerState.enabledSceneCount,
    scheduledScenes: runtimeSceneSchedulerState.scheduledScenes,
    nextExecution: runtimeSceneSchedulerState.nextExecution,
    lastExecution: runtimeSceneSchedulerState.lastExecution,
    lastExecutionAttempt: runtimeSceneSchedulerState.lastExecutionAttempt,
    lastExecutionResult: runtimeSceneSchedulerState.lastExecutionResult,
    lastExecutionError: runtimeSceneSchedulerState.lastExecutionError,
    lastExecutionKey: runtimeSceneSchedulerState.lastExecutionKey,
    lastDryRun: runtimeSceneSchedulerState.lastDryRun,
    lastSkippedReason: runtimeSceneSchedulerState.lastSkippedReason,
    missedExecutionCount: runtimeSceneSchedulerState.missedExecutionCount,
    lastError: runtimeSceneSchedulerState.lastError,
    executionHistory: runtimeSceneSchedulerState.executionHistory.slice(-10),
    storagePath: runtimeSceneSchedulerState.storagePath,
  }
}

function startSceneScheduler() {
  if (runtimeSceneSchedulerTimer) {
    return
  }

  void checkSceneScheduler('startup')
  runtimeSceneSchedulerTimer = setInterval(() => {
    void checkSceneScheduler('scheduled')
  }, sceneSchedulerIntervalMs)

  if (typeof runtimeSceneSchedulerTimer.unref === 'function') {
    runtimeSceneSchedulerTimer.unref()
  }
}

async function appendConversationLogEntry(payload, request, url) {
  if (!runtimeSystemConfigState.conversationLogging.enabled) {
    return {
      ok: true,
      logged: false,
      disabled: true,
      source: 'conversation-logging-disabled',
      diagnostics: getRuntimeSystemConfigDiagnostics(),
    }
  }

  const context = getClientContext(request, 'frontend', payload, url)
  const entry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    clientId: context.clientId,
    sessionId: context.sessionId,
    currentPage: payload?.currentPage ?? null,
    activeView: payload?.activeView ?? null,
    selectedRoom: payload?.selectedRoom ?? null,
    selectedDomain: payload?.selectedDomain ?? null,
    selectedTrend: payload?.selectedTrend ?? null,
    role: payload?.role ?? 'unknown',
    message: String(payload?.message ?? '').slice(0, 4000),
    intent: payload?.intent ?? null,
    category: payload?.category ?? null,
    responseStatus: payload?.responseStatus ?? null,
    actionProposal: payload?.actionProposal ?? null,
    actionResult: payload?.actionResult ?? null,
    source: payload?.source ?? null,
    confidence: payload?.confidence ?? null,
  }

  await mkdir(runtimeConversationLogDirectory, { recursive: true })
  await appendFile(runtimeConversationLogFile, `${JSON.stringify(entry)}\n`, 'utf8')
  runtimeSystemConfigState.conversationLog.savedCount += 1
  runtimeSystemConfigState.conversationLog.lastSavedAt = entry.timestamp
  runtimeSystemConfigState.conversationLog.lastIntent = entry.intent
  runtimeSystemConfigState.conversationLog.lastPage = entry.currentPage ?? entry.activeView
  runtimeSystemConfigState.conversationLog.lastError = null

  return {
    ok: true,
    logged: true,
    entry,
    diagnostics: getRuntimeSystemConfigDiagnostics(),
  }
}

function getRuntimeConfigOrThrow(context) {
  if (!runtimeConfig) {
    runtimeConfig = normalizeRuntimeConfig(createDefaultRuntimeConfigPayload())
    console.log('[Bridge] Runtime using safe default config until app config arrives', {
      context,
      strategy: 'safe-default-runtime-config',
      connectionMode: runtimeConfig.connectionMode,
    })
    updateRuntimeConfigDiagnostics('safe-default', 'default-config')
    runtimeStateStore.recordRuntimeConfig(runtimeConfig, getHealthPayload())
  }

  return runtimeConfig
}

function getCurrentConnectionMode() {
  return getRuntimeConfigOrThrow('connection-mode').connectionMode
}

function getRuntimeWriteMappingOrThrow(context) {
  const activeRuntimeConfig = getRuntimeConfigOrThrow(context)

  if (!activeRuntimeConfig.writeMapping) {
    throw new Error('Bridge mangler write-mapping fra runtime-config')
  }

  return activeRuntimeConfig.writeMapping
}

function getFeedbackMappingCounts() {
  if (!runtimeConfig?.feedbackMapping) {
    return {
      light: 0,
      dim: 0,
      climate: 0,
    }
  }

  const lightFeedback = runtimeConfig.feedbackMapping.lights.filter((point) =>
    isConfiguredAddress(point.lightFeedback),
  ).length
  const dimFeedback = runtimeConfig.feedbackMapping.lights.filter((point) =>
    isConfiguredAddress(point.valueFeedback),
  ).length
  const climateFeedback = runtimeConfig.feedbackMapping.climate.reduce(
    (count, target) => count + (target.points?.length ?? 0),
    0,
  )

  return {
    light: lightFeedback,
    dim: dimFeedback,
    climate: climateFeedback,
  }
}

function determineWhyTargetCountZero(targetCount, error = null) {
  if (error) {
    return 'buildError'
  }

  if (!runtimeConfig) {
    return 'noRuntimeConfig'
  }

  if (targetCount > 0) {
    return null
  }

  const writeCounts = getWriteMappingCounts()
  const feedbackCounts = getFeedbackMappingCounts()
  const hasAnyMapping =
    Object.values(writeCounts).some((count) => count > 0) ||
    Object.values(feedbackCounts).some((count) => count > 0)

  if (!hasAnyMapping) {
    return 'noKnxMappings'
  }

  return 'noFeedbackTargets'
}

function updateRuntimeConfigDiagnostics(source, reason = 'runtime-config', payloadSummary = null) {
  runtimeConfigDiagnostics.runtimeConfigReceived = Boolean(runtimeConfig)
  runtimeConfigDiagnostics.runtimeConfigSource = source
  runtimeConfigDiagnostics.lastRuntimeConfigAt = new Date().toISOString()
  runtimeConfigDiagnostics.latestValidConfigAgeMs = runtimeConfigDiagnostics.latestValidConfigAt
    ? Math.max(0, Date.now() - Date.parse(runtimeConfigDiagnostics.latestValidConfigAt))
    : null
  runtimeConfigDiagnostics.targetBuildAttempted = true
  runtimeConfigDiagnostics.targetBuildErrors = []
  if (payloadSummary) {
    runtimeConfigDiagnostics.latestPayloadSummary = payloadSummary
    runtimeConfigDiagnostics.latestPayloadSizeBytes = payloadSummary.payloadSizeBytes ?? null
  }

  try {
    const targetCount = getKnxSubscriptionTargets().length
    runtimeConfigDiagnostics.targetBuildCount = targetCount
    runtimeConfigDiagnostics.whyTargetCountZero = determineWhyTargetCountZero(targetCount)
  } catch (error) {
    runtimeConfigDiagnostics.targetBuildCount = 0
    runtimeConfigDiagnostics.whyTargetCountZero = determineWhyTargetCountZero(0, error)
    runtimeConfigDiagnostics.targetBuildErrors = [
      {
        at: new Date().toISOString(),
        reason,
        message: error?.message ?? String(error),
      },
    ]
  }
}

function applyRuntimeConfig(payload) {
  runtimeConfig = normalizeRuntimeConfig(payload)
  const activeCounts = getCurrentRuntimeConfigMappingCounts()
  runtimeConfigDiagnostics.restoredConfigIntegrity = createRuntimeConfigIntegrity(
    activeCounts,
    activeCounts,
    'frontend-runtime-config',
  )
  runtimeConfigDiagnostics.missingClimateMappings = false
  runtimeConfigDiagnostics.restoredRoomCount = activeCounts.roomCount
  runtimeConfigDiagnostics.restoredClimateWriteCount = activeCounts.write.climate
  runtimeConfigDiagnostics.restoredClimateFeedbackCount = activeCounts.feedback.climate
  runtimeConfigDiagnostics.restoredLightCount = activeCounts.write.light + activeCounts.feedback.light
  runtimeConfigDiagnostics.restoredDimCount = activeCounts.write.dim + activeCounts.feedback.dim
  updateRuntimeConfigDiagnostics(
    'frontend-runtime-config',
    'apply-runtime-config',
    payload?.runtimeConfigPayloadSummary ?? null,
  )

  for (const subscriptionId of lightFeedbackSubscriptions.keys()) {
    stopLightFeedbackSubscription(subscriptionId)
  }

  for (const subscriptionId of climateFeedbackSubscriptions.keys()) {
    stopClimateFeedbackSubscription(subscriptionId)
  }

  console.log('[Bridge] Applied runtime config from app', {
    connectionMode: runtimeConfig.connectionMode,
    localDirect: runtimeConfig.localDirect,
    remoteTunnel: runtimeConfig.remoteTunnel,
    climateFeedbackMethod: runtimeConfig.climateFeedbackMethod,
    climatePollingIntervalSec: runtimeConfig.climatePollingIntervalSec,
    liveLightWritePoints: runtimeConfig.writeMapping.lights.filter((point) =>
      isConfiguredAddress(point.lightAddress),
    ).length,
    liveDimWritePoints: runtimeConfig.writeMapping.lights.filter(
      (point) => point.dimmable && isConfiguredAddress(point.valueAddress),
    ).length,
    climateWritePoints: runtimeConfig.writeMapping.climate.filter(
      (point) =>
        point.climateActive &&
        point.liveClimateActive &&
        isConfiguredAddress(point.setpointAddress),
    ).length,
    knxSubscriptionTargets: getKnxSubscriptionTargets().length,
  })

    runtimeStateStore.recordRuntimeConfig(runtimeConfig, getHealthPayload())
    emitRuntimeEvent('runtimeSnapshotUpdated', {
      source: 'runtime-config',
      category: 'runtime',
      confidence: 'high',
      runtimeConfigReceived: true,
      connectionMode: runtimeConfig.connectionMode,
    })
    startKnxSubscriptionRuntime()
    void persistRuntimeConfigIfValid('frontend-runtime-config')

  return runtimeConfig
}

function getWriteMappingCounts() {
  if (!runtimeConfig?.writeMapping) {
    return {
      light: 0,
      dim: 0,
      climate: 0,
    }
  }

  return {
    light: runtimeConfig.writeMapping.lights.filter((point) =>
      isConfiguredAddress(point.lightAddress),
    ).length,
    dim: runtimeConfig.writeMapping.lights.filter(
      (point) => point.dimmable && isConfiguredAddress(point.valueAddress),
    ).length,
    climate: runtimeConfig.writeMapping.climate.filter(
      (point) =>
        point.climateActive &&
        point.liveClimateActive &&
        isConfiguredAddress(point.setpointAddress),
    ).length,
  }
}

function getHealthPayload() {
  const payload = {
    ok: true,
    timestamp: new Date().toISOString(),
    bridge: {
      listenHost: BRIDGE_HOST,
      port: PORT,
      localHealthUrl: `http://localhost:${PORT}/api/runtime/health`,
      lanHealthUrlHint: `http://<bridge-lan-ip>:${PORT}/api/runtime/health`,
    },
    runtimeConfigReceived: Boolean(runtimeConfig),
    runtimeConfigDiagnostics: {
      ...runtimeConfigDiagnostics,
      feedbackMappingCounts: getFeedbackMappingCounts(),
    },
    systemConfig: getRuntimeSystemConfigDiagnostics(),
    sceneScheduler: getSceneSchedulerDiagnostics(),
    shading: getShadingDiagnostics(),
    knxMonitor: getKnxMonitorDiagnostics(),
    connectionMode: runtimeConfig?.connectionMode ?? null,
    writeMappingCounts: getWriteMappingCounts(),
    lightSubscribeActive: lightFeedbackSubscriptions.size > 0,
    climateSubscribeActive: climateFeedbackSubscriptions.size > 0,
    knxSubscriptionRuntime: getKnxSubscriptionRuntimeSummary(),
  }

  runtimeStateStore.recordHealth(payload)

  return payload
}

function getActiveConnectionTarget() {
  const activeRuntimeConfig = getRuntimeConfigOrThrow('connection-target')
  return (
    activeRuntimeConfig[activeRuntimeConfig.connectionMode] ??
    activeRuntimeConfig.localDirect
  )
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': [
    'Content-Type',
    'Authorization',
    'X-Lynell-Client-Id',
    'X-Lynell-Session-Id',
    'X-Requested-With',
  ].join(', '),
  'Access-Control-Max-Age': '86400',
}

function getCorsHeaders(extraHeaders = {}) {
  return {
    ...CORS_HEADERS,
    ...extraHeaders,
  }
}

function sendCorsPreflight(response) {
  response.writeHead(204, getCorsHeaders())
  response.end()
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, getCorsHeaders({
    'Content-Type': 'application/json',
  }))

  response.end(JSON.stringify(payload))
}

function sendMediaError(response, statusCode, message) {
  sendJson(response, statusCode, { ok: false, error: message })
}

function getMediaContentType(filename) {
  const extension = extname(filename).toLowerCase()

  if (extension === '.mp3') {
    return 'audio/mpeg'
  }

  return 'application/octet-stream'
}

function formatMediaTitle(filename) {
  return basename(filename, extname(filename))
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

async function getLocalMediaLibrary() {
  let entries = []

  try {
    entries = await readdir(mediaMusicDirectory, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return []
    }

    throw error
  }

  return Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .filter((entry) => SUPPORTED_MEDIA_EXTENSIONS.has(extname(entry.name).toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, 'nb-NO'))
      .map(async (entry) => {
        const filePath = join(mediaMusicDirectory, entry.name)
        const fileStats = await stat(filePath)

        return {
          id: `local-file-${Buffer.from(entry.name).toString('base64url')}`,
          title: formatMediaTitle(entry.name),
          artist: 'Unknown artist',
          album: 'Local library',
          duration: 0,
          filename: entry.name,
          sourceUrl: `/media/music/${encodeURIComponent(entry.name)}`,
          source: 'local',
          sizeBytes: fileStats.size,
        }
      }),
  )
}

async function serveLocalMediaFile(request, response, filename) {
  const decodedFilename = decodeURIComponent(filename)

  if (!decodedFilename || decodedFilename !== basename(decodedFilename)) {
    sendMediaError(response, 400, 'Invalid media filename')
    return
  }

  if (!SUPPORTED_MEDIA_EXTENSIONS.has(extname(decodedFilename).toLowerCase())) {
    sendMediaError(response, 415, 'Unsupported media file')
    return
  }

  const filePath = resolve(mediaMusicDirectory, decodedFilename)
  const mediaRoot = resolve(mediaMusicDirectory)

  if (!filePath.startsWith(`${mediaRoot}\\`) && !filePath.startsWith(`${mediaRoot}/`)) {
    sendMediaError(response, 400, 'Invalid media path')
    return
  }

  let fileStats

  try {
    fileStats = await stat(filePath)
  } catch {
    sendMediaError(response, 404, 'Media file not found')
    return
  }

  if (!fileStats.isFile()) {
    sendMediaError(response, 404, 'Media file not found')
    return
  }

  const contentType = getMediaContentType(decodedFilename)
  const range = request.headers.range

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range)

    if (!match) {
      response.writeHead(416, getCorsHeaders({
        'Content-Range': `bytes */${fileStats.size}`,
      }))
      response.end()
      return
    }

    const start = match[1] ? Number(match[1]) : 0
    const end = match[2] ? Number(match[2]) : fileStats.size - 1

    if (start >= fileStats.size || end >= fileStats.size || start > end) {
      response.writeHead(416, getCorsHeaders({
        'Content-Range': `bytes */${fileStats.size}`,
      }))
      response.end()
      return
    }

    response.writeHead(206, getCorsHeaders({
      'Accept-Ranges': 'bytes',
      'Content-Type': contentType,
      'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${fileStats.size}`,
    }))
    createReadStream(filePath, { start, end }).pipe(response)
    return
  }

  response.writeHead(200, getCorsHeaders({
    'Accept-Ranges': 'bytes',
    'Content-Type': contentType,
    'Content-Length': fileStats.size,
  }))
  createReadStream(filePath).pipe(response)
}

function sendSseEvent(response, eventName, payload) {
  const eventId = payload?.replayable === false ? null : payload?.eventId ?? payload?.id ?? null
  if (eventId) {
    response.write(`id: ${eventId}\n`)
  }
  response.write(`event: ${eventName}\n`)
  response.write(`data: ${JSON.stringify(payload)}\n\n`)
  const metadata = runtimeEventClientMetadata.get(response)
  if (metadata) {
    metadata.sentEvents += 1
    metadata.lastEventId = eventId ?? metadata.lastEventId ?? null
    metadata.lastSentAt = new Date().toISOString()
    runtimeEventClientMetadata.set(response, metadata)
  }
}

function getRuntimeEventStats() {
  const oneMinuteAgo = Date.now() - 60_000
  const eventsLastMinute = runtimeEventStats.recentEvents.filter(
    (event) => event.timestamp >= oneMinuteAgo,
  ).length
  const pollingRequestsPerMinute = runtimeEventStats.recentPollingRequests.filter(
    (entry) => entry.timestamp >= oneMinuteAgo,
  ).length
  const topPollingSources = Object.entries(runtimeEventStats.pollingSources)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return {
    ...runtimeEventStats,
    soakMetrics: getRuntimeSoakMetrics(),
    connectedClients: runtimeEventClients.size,
    eventsLastMinute,
    pollingRequestsPerMinute,
    topPollingSources,
    actionMetrics: getRuntimeActionMetrics(),
    clientIdentity: getRuntimeClientSnapshot(),
    runtimeDomains: getRuntimeDomainSnapshot(),
    runtimeContinuity: getRuntimeContinuityStatus(),
    runtimeRegistry: getRuntimeRegistrySnapshot(),
    runtimeBoot: getRuntimeBootStatus(),
    transport: 'sse',
    endpoint: '/api/runtime/events',
    eventBufferSize: runtimeEventBuffer.length,
    eventBufferLimit: RUNTIME_EVENT_BUFFER_LIMIT,
    latestEventId: runtimeEventStats.latestEventId,
    replaySupport: true,
    clients: Array.from(runtimeEventClientMetadata.values()).map((client) => ({
      clientId: client.clientId,
      sessionId: client.sessionId,
      connectedAt: client.connectedAt,
      lastEventId: client.lastEventId,
      sentEvents: client.sentEvents,
      droppedEvents: client.droppedEvents,
      reconnectCount: client.reconnectCount,
      lastSentAt: client.lastSentAt,
    })),
  }
}

function getDirectorySizeBytes(directory) {
  try {
    const stats = statSync(directory)
    if (!stats.isDirectory()) {
      return stats.size
    }

    return readdirSync(directory).reduce((total, entry) => {
      const path = join(directory, entry)
      const entryStats = statSync(path)
      if (entryStats.isDirectory()) {
        return total + getDirectorySizeBytes(path)
      }
      return total + entryStats.size
    }, 0)
  } catch {
    return 0
  }
}

function getRuntimeStorageGrowthMetrics() {
  const historyStatus = runtimeStateStore.getSummary()?.persistence ?? null
  return {
    runtimeHistory: {
      path: historyStatus?.storagePath ?? join(__dirname, '.lynell-state', 'runtime-history'),
      bytes: getDirectorySizeBytes(historyStatus?.storagePath ?? join(__dirname, '.lynell-state', 'runtime-history')),
      points: runtimeStateStore.getHistory({ limit: 1, range: 'week', category: 'all' }).pointCount,
      events: runtimeStateStore.getHistory({ limit: 1, range: 'week', category: 'all' }).count,
    },
    runtimeActions: {
      path: runtimeActionsDirectory,
      bytes: getDirectorySizeBytes(runtimeActionsDirectory),
      count: runtimeActionHistory.length,
    },
    runtimeAudit: {
      path: runtimeAuditDirectory,
      bytes: getDirectorySizeBytes(runtimeAuditDirectory),
      count: runtimeAuditHistory.length,
    },
    runtimeSnapshots: {
      path: runtimeSnapshotsDirectory,
      bytes: getDirectorySizeBytes(runtimeSnapshotsDirectory),
      count: runtimeContinuityState.snapshotCount,
    },
    runtimeInsights: {
      path: runtimeInsightsDirectory,
      bytes: getDirectorySizeBytes(runtimeInsightsDirectory),
      count: runtimeInsightHistory.length,
    },
  }
}

function getRuntimeSoakMetrics() {
  const eventStats = runtimeEventStats
  const actions = getLatestRuntimeActions()
  runtimeSoakMetrics.sseReconnectCount = eventStats.reconnectCount
  runtimeSoakMetrics.actionExecutionCount = actions.filter((action) =>
    ['completed', 'failed'].includes(action.executionState),
  ).length
  runtimeSoakMetrics.eventThroughputTrend = [
    ...runtimeSoakMetrics.eventThroughputTrend,
    {
      at: new Date().toISOString(),
      eventsLastMinute: eventStats.recentEvents.filter(
        (event) => event.timestamp >= Date.now() - 60_000,
      ).length,
      pollingRequestsPerMinute: eventStats.recentPollingRequests.filter(
        (entry) => entry.timestamp >= Date.now() - 60_000,
      ).length,
    },
  ].slice(-12)

  return {
    ...runtimeSoakMetrics,
    storageGrowth: getRuntimeStorageGrowthMetrics(),
    historyGrowth: {
      sourceDistribution: runtimeStateStore.getHistory({
        limit: 1,
        range: 'week',
        category: 'all',
      }).sourceDistribution,
      categoryCounts: runtimeStateStore.getSummary()?.categoryCounts ?? {},
    },
  }
}

function recordRuntimePollingRequest(pathname, source = 'frontend-poll') {
  const timestamp = Date.now()
  runtimeEventStats.recentPollingRequests.push({
    pathname,
    source,
    timestamp,
    at: new Date(timestamp).toISOString(),
  })
  runtimeEventStats.recentPollingRequests = runtimeEventStats.recentPollingRequests.slice(-300)
  runtimeEventStats.pollingSources[pathname] = (runtimeEventStats.pollingSources[pathname] ?? 0) + 1
}

function getRuntimeUptimeMs() {
  return Math.max(0, Date.now() - Date.parse(runtimeBootState.startedAt))
}

function getRuntimeMemoryPressure() {
  if (typeof process?.memoryUsage !== 'function') {
    return {
      available: false,
      rssMb: null,
      heapUsedMb: null,
      heapTotalMb: null,
      pressure: 'unknown',
    }
  }

  const memory = process.memoryUsage()
  const heapRatio = memory.heapTotal > 0 ? memory.heapUsed / memory.heapTotal : 0
  return {
    available: true,
    rssMb: Math.round(memory.rss / 1024 / 1024),
    heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
    heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
    pressure: heapRatio > 0.85 ? 'high' : heapRatio > 0.65 ? 'medium' : 'low',
  }
}

function recordRuntimeBootPhase(phase, detail = {}) {
  const phaseName = runtimeBootPhases.includes(phase) ? phase : 'failed'
  const at = new Date().toISOString()
  const latencyMs = getRuntimeUptimeMs()
  runtimeBootState.currentPhase = phaseName
  runtimeBootState.lastHealthCheckAt = at
  if (phaseName === 'ready' || phaseName === 'degraded') {
    runtimeBootState.ready = phaseName === 'ready'
    runtimeBootState.degraded = phaseName === 'degraded'
    runtimeBootState.failed = false
    runtimeBootState.readyAt = at
    runtimeBootState.startupLatencyMs = latencyMs
  } else if (phaseName === 'failed') {
    runtimeBootState.ready = false
    runtimeBootState.degraded = false
    runtimeBootState.failed = true
    runtimeBootState.startupLatencyMs = latencyMs
  }

  const entry = {
    phase: phaseName,
    at,
    latencyMs,
    status: detail.status ?? (phaseName === 'failed' ? 'failed' : 'entered'),
    reason: detail.reason ?? null,
    message: detail.message ?? null,
  }
  runtimeBootState.phaseHistory.push(entry)
  runtimeBootState.phaseHistory = runtimeBootState.phaseHistory.slice(-24)
  if (phaseName === 'failed' || detail.status === 'failed') {
    runtimeBootState.failedBootPhases.push(entry)
    runtimeBootState.failedBootPhases = runtimeBootState.failedBootPhases.slice(-10)
  }

  emitRuntimeEvent('runtimeBootPhaseChanged', {
    source: 'runtime-boot',
    category: 'runtime',
    domainId: 'runtime',
    capabilityContext: 'diagnosticsAccess',
    phase: phaseName,
    boot: getRuntimeBootStatus({ lightweight: true }),
    replayable: true,
    persisted: false,
  })
  return entry
}

function getRuntimeProviderBootState(provider) {
  if (provider.foundationOnly) {
    return provider.maturity === 'future' ? 'future' : provider.maturity ?? 'foundation'
  }
  if (!provider.enabled) {
    return 'disabled'
  }
  if (provider.health === 'healthy' || provider.health === 'experimental') {
    return 'ready'
  }
  if (provider.health === 'degraded') {
    return 'degraded'
  }
  if (provider.health === 'offline' || provider.health === 'disabled') {
    return 'degraded'
  }
  return 'ready'
}

function buildRuntimeProviderReadiness() {
  const registry = getRuntimeRegistrySnapshot()
  const generatedAt = new Date().toISOString()
  return registry.providers.map((provider) => {
    const bootState = getRuntimeProviderBootState(provider)
    const dependencyStatus = provider.domains?.length ? 'mapped' : 'missingDomain'
    return {
      providerId: provider.providerId,
      displayName: provider.displayName,
      domainId: provider.domainId,
      domains: provider.domains,
      bootState,
      ready: bootState === 'ready' && !provider.foundationOnly,
      technicallyReady: ['ready', 'foundation', 'prepared', 'future'].includes(bootState),
      degraded: bootState === 'degraded',
      dependencyStatus,
      startupLatency: runtimeBootState.startupLatencyMs ?? getRuntimeUptimeMs(),
      recoveryCapable: Boolean(provider.recoveryAware),
      health: provider.health,
      enabled: provider.enabled,
      experimental: provider.experimental,
      realtime: provider.realtime,
      maturity: provider.maturity,
      runtimeConnected: provider.runtimeConnected,
      controlAvailable: provider.controlAvailable,
      sendsCommands: provider.sendsCommands,
      foundationOnly: provider.foundationOnly,
      checkedAt: generatedAt,
    }
  })
}

function updateRuntimeProviderReadiness(reason = 'boot-check') {
  const previousStates = new Map(
    runtimeBootState.providerReadiness.map((provider) => [provider.providerId, provider.bootState]),
  )
  const providers = buildRuntimeProviderReadiness()
  runtimeBootState.providerReadiness = providers
  runtimeBootState.degradedProviders = providers
    .filter((provider) => provider.degraded)
    .map((provider) => provider.providerId)
  runtimeBootState.lastProviderBootAt = new Date().toISOString()
  runtimeBootState.bootReport.providersBooted = true

  for (const provider of providers) {
    const previous = previousStates.get(provider.providerId)
    if (provider.ready && previous !== 'ready') {
      emitRuntimeEvent('providerBootCompleted', {
        source: 'runtime-boot',
        category: 'integration',
        domainId: provider.domainId,
        capabilityContext: 'readState',
        provider: provider.providerId,
        providerReadiness: provider,
        reason,
        replayable: true,
        persisted: false,
      })
    } else if (provider.degraded && previous !== 'degraded') {
      emitRuntimeEvent('providerBootDegraded', {
        source: 'runtime-boot',
        category: 'integration',
        domainId: provider.domainId,
        capabilityContext: 'diagnosticsAccess',
        provider: provider.providerId,
        providerReadiness: provider,
        reason,
        replayable: true,
        persisted: false,
      })
    }
  }

  return providers
}

function getRuntimeBootStatus({ lightweight = false } = {}) {
  const providerReadiness = runtimeBootState.providerReadiness
  const failedBootPhases = runtimeBootState.failedBootPhases
  const uptimeMs = getRuntimeUptimeMs()
  const boot = {
    model: runtimeBootState.model,
    orchestrator: runtimeBootState.orchestrator,
    distributedRuntime: runtimeBootState.distributedRuntime,
    processManager: runtimeBootState.processManager,
    startedAt: runtimeBootState.startedAt,
    uptimeMs,
    currentPhase: runtimeBootState.currentPhase,
    ready: runtimeBootState.ready,
    degraded: runtimeBootState.degraded,
    failed: runtimeBootState.failed,
    readyAt: runtimeBootState.readyAt,
    startupLatencyMs: runtimeBootState.startupLatencyMs,
    providerReadiness,
    providersReady: providerReadiness.filter((provider) => provider.ready).length,
    providerCount: providerReadiness.length,
    degradedProviders: runtimeBootState.degradedProviders,
    failedBootPhases,
    lastProviderBootAt: runtimeBootState.lastProviderBootAt,
    lastHealthCheckAt: runtimeBootState.lastHealthCheckAt,
    startupSequence: runtimeBootState.startupSequence,
    bootReport: runtimeBootState.bootReport,
    recoveryAware: runtimeBootState.recoveryAware,
    readiness: runtimeBootState.failed
      ? 'failed'
      : runtimeBootState.degraded
        ? 'degraded'
        : runtimeBootState.ready
          ? 'ready'
          : 'booting',
  }

  if (lightweight) {
    return boot
  }

  return {
    ...boot,
    phaseHistory: runtimeBootState.phaseHistory,
    memory: getRuntimeMemoryPressure(),
    soakReadiness: runtimeBootState.soakReadiness,
  }
}

function finalizeRuntimeBoot(reason = 'bridge-start') {
  const providers = updateRuntimeProviderReadiness(reason)
  const degradedProviders = providers.filter((provider) => provider.degraded && provider.enabled)
  const degraded =
    degradedProviders.length > 0 ||
    runtimeContinuityState.partialRestore ||
    Boolean(runtimeContinuityState.lastError) ||
    Boolean(runtimeInsightState.lastError)
  const phase = degraded ? 'degraded' : 'ready'
  recordRuntimeBootPhase(phase, {
    reason,
    status: degraded ? 'degraded' : 'ready',
    message: degraded ? 'Runtime ready with degraded providers or restore warnings' : 'Runtime ready',
  })
  emitRuntimeEvent(degraded ? 'runtimeDegraded' : 'runtimeReady', {
    source: 'runtime-boot',
    category: 'runtime',
    domainId: 'runtime',
    capabilityContext: 'diagnosticsAccess',
    boot: getRuntimeBootStatus({ lightweight: true }),
    replayable: true,
    persisted: false,
  })
}

function getRuntimeHealthPayload() {
  updateRuntimeProviderReadiness('runtime-health')
  const boot = getRuntimeBootStatus()
  const registry = getRuntimeRegistrySnapshot()
  const eventStreamHealth = getEventStreamHealthSummary()
  const snapshotRestore = getRuntimeContinuityStatus()
  const activeInsightCount = Array.from(runtimeInsightByKey.values()).filter((insight) => !insight.resolved).length
  const knxRuntime = getKnxSubscriptionRuntimeSummary()
  const writeMappingCounts = getWriteMappingCounts()
  const knxConnected = Boolean(knxRuntime.active && !knxRuntime.error)
  const bridgeReady = (boot.ready || boot.degraded) && !boot.failed
  const restoredOnlyMode =
    !knxConnected &&
    Boolean(runtimeStateStore.getHistory({ limit: 1, range: 'week', category: 'all' }).pointCount)
  return {
    ok: true,
    source: 'bridge-runtime-health',
    model: 'runtime-boot-orchestration-foundation',
    timestamp: new Date().toISOString(),
    bridge: {
      listenHost: BRIDGE_HOST,
      port: PORT,
      localHealthUrl: `http://localhost:${PORT}/api/runtime/health`,
      lanHealthUrlHint: `http://<bridge-lan-ip>:${PORT}/api/runtime/health`,
    },
    bridgeReady,
    runtimeReady: bridgeReady && knxConnected,
    degraded: boot.degraded || !knxConnected,
    failed: boot.failed,
    boot,
    providers: boot.providerReadiness,
    providersReady: boot.providersReady,
    providerCount: boot.providerCount,
    degradedProviders: boot.degradedProviders,
    eventStreamHealth,
    knx: {
      connected: knxConnected,
      available: knxConnected,
      state: knxConnected ? 'connected' : knxRuntime.error ? 'unavailable' : 'standby',
      active: Boolean(knxRuntime.active),
      targetCount: knxRuntime.targetCount,
      cachedGroupCount: knxRuntime.cachedGroupCount,
      lastTelegramAt: knxRuntime.lastTelegramAt,
      error: knxRuntime.error,
      restoredOnlyMode,
    },
    writePath: {
      status: knxConnected ? 'ready' : 'knxUnavailable',
      mappingCounts: writeMappingCounts,
      actionPipelineBlocking: false,
      localKnxWriteAutoApprove: true,
      note: knxConnected
        ? 'Local user KNX writes execute through existing write path.'
        : 'KNX is not connected; writes should fail visibly instead of pretending to run.',
    },
    runtimeConfigDiagnostics: {
      ...runtimeConfigDiagnostics,
      feedbackMappingCounts: getFeedbackMappingCounts(),
      writeMappingCounts,
    },
    soakMetrics: getRuntimeSoakMetrics(),
    snapshotRestore,
    insightEngine: {
      model: runtimeInsightState.model,
      activeCount: activeInsightCount,
      deterministic: runtimeInsightState.deterministic,
      aiMl: runtimeInsightState.aiMl,
      autonomousExecution: runtimeInsightState.autonomousExecution,
      restored: runtimeInsightState.restored,
      lastGeneratedAt: runtimeInsightState.lastGeneratedAt,
      lastError: runtimeInsightState.lastError,
    },
    registry: {
      registryId: registry.registryId,
      providerCount: registry.providers.length,
      domainCount: registry.domains.length,
      serviceCount: registry.runtimeServices.length,
      healthSummaries: registry.healthSummaries,
    },
    safety: {
      processSpawning: false,
      containerOrchestration: false,
      distributedRuntime: false,
      automations: false,
      aiMl: false,
      runtimeMutation: false,
    },
  }
}

function classifyRuntimeClient({ request = null, clientId = '', clientName = '', deviceType = '', platform = '' }) {
  const forwardedFor = request?.headers?.['x-forwarded-for']
  const remoteAddress = request?.socket?.remoteAddress ?? ''
  const localNetwork =
    remoteAddress.includes('127.0.0.1') ||
    remoteAddress.includes('::1') ||
    remoteAddress.includes('localhost') ||
    remoteAddress.startsWith('::ffff:192.168.') ||
    remoteAddress.startsWith('192.168.')
  const lowerName = `${clientName} ${deviceType} ${platform} ${clientId}`.toLowerCase()

  if (clientId === 'bridge-runtime') {
    return { classification: 'internalRuntime', localNetwork: true, trusted: true }
  }

  if (lowerName.includes('dev') || lowerName.includes('localhost')) {
    return { classification: 'developmentClient', localNetwork, trusted: localNetwork && !forwardedFor }
  }

  if (localNetwork && !forwardedFor) {
    return { classification: clientId ? 'localTrusted' : 'localUntrusted', localNetwork, trusted: Boolean(clientId) }
  }

  return { classification: 'remoteUnknown', localNetwork: false, trusted: false }
}

function registerRuntimeClientSession({
  request = null,
  clientId = 'anonymous-client',
  sessionId = 'sessionless',
  clientName = 'Lynell client',
  deviceType = 'unknown',
  platform = 'unknown',
  runtimeMode = 'unknown',
  runtimeCapabilities = [],
  lastRuntimeVersion = 'unknown',
  eventStreamConnected = false,
  connectionType = 'http',
}) {
  const now = new Date().toISOString()
  const classification = classifyRuntimeClient({ request, clientId, clientName, deviceType, platform })
  const previousClient = runtimeClients.get(clientId)
  const previousSession = runtimeSessions.get(sessionId)
  const client = {
    clientId,
    clientName,
    deviceType,
    platform,
    firstSeen: previousClient?.firstSeen ?? now,
    lastSeen: now,
    trusted: classification.trusted,
    trustClassification: classification.classification,
    localNetwork: classification.localNetwork,
    runtimeCapabilities,
    lastRuntimeVersion,
    activeSessionCount: 0,
  }
  const session = {
    sessionId,
    clientId,
    connectedAt: previousSession?.connectedAt ?? now,
    lastActivity: now,
    connectionType,
    runtimeMode,
    eventStreamConnected,
    trustedSession: classification.trusted,
    localSession: classification.localNetwork,
    staleSession: false,
    reconnectCount: (previousSession?.reconnectCount ?? 0) + (eventStreamConnected && previousSession ? 1 : 0),
  }
  runtimeClients.set(clientId, client)
  runtimeSessions.set(sessionId, session)
  client.activeSessionCount = Array.from(runtimeSessions.values()).filter(
    (entry) => entry.clientId === clientId && !entry.staleSession,
  ).length
  runtimeClients.set(clientId, client)
  return { client, session }
}

function markRuntimeSessionDisconnected(sessionId) {
  const session = runtimeSessions.get(sessionId)
  if (!session) {
    return
  }
  const nextSession = {
    ...session,
    lastActivity: new Date().toISOString(),
    eventStreamConnected: false,
  }
  runtimeSessions.set(sessionId, nextSession)
}

function getRuntimeClientSnapshot() {
  const now = Date.now()
  const sessions = Array.from(runtimeSessions.values()).map((session) => {
    const lastActivityMs = Date.parse(session.lastActivity ?? '')
    const staleSession = !Number.isFinite(lastActivityMs) || now - lastActivityMs > 5 * 60 * 1000
    const nextSession = { ...session, staleSession }
    runtimeSessions.set(session.sessionId, nextSession)
    return nextSession
  })
  const clients = Array.from(runtimeClients.values()).map((client) => ({
    ...client,
    activeSessionCount: sessions.filter((session) => session.clientId === client.clientId && !session.staleSession).length,
  }))
  return {
    ok: true,
    source: 'bridge-runtime-identity',
    model: 'identity-foundation',
    auth: false,
    remoteControl: false,
    counts: {
      clients: clients.length,
      sessions: sessions.length,
      trusted: clients.filter((client) => client.trusted).length,
      untrusted: clients.filter((client) => !client.trusted).length,
      eventStreams: sessions.filter((session) => session.eventStreamConnected).length,
      staleSessions: sessions.filter((session) => session.staleSession).length,
    },
    clients,
    sessions,
  }
}

function getRuntimeDomainHealth(domain) {
  if (!domain.enabled) {
    return 'disabled'
  }

  if (domain.experimental) {
    return 'experimental'
  }

  if (domain.domainId === 'runtime') {
    return runtimeEventClients.size > 0 ? 'healthy' : 'degraded'
  }

  if (domain.domainId === 'climate' || domain.domainId === 'lighting') {
    const runtime = getKnxSubscriptionRuntimeSummary()
    if (runtime?.active) {
      return runtime.error ? 'degraded' : 'healthy'
    }
    return 'offline'
  }

  return 'healthy'
}

function getRuntimeDomainSnapshot() {
  return createRuntimeDomainSnapshot({ healthResolver: getRuntimeDomainHealth })
}

function getRuntimeServiceManifests() {
  const eventStats = getEventStreamHealthSummary()
  const actionMetrics = getRuntimeActionMetrics()
  const continuity = getRuntimeContinuityStatus()
  return [
    {
      serviceId: 'eventBus',
      displayName: 'Runtime Event Bus',
      runtimeOwner: 'bridge-runtime',
      health: eventStats.droppedEvents > 0 ? 'degraded' : 'healthy',
      capabilities: ['realtimeEvents', 'readState'],
      realtime: true,
      persistenceAware: false,
      recoveryAware: true,
      version: 'sse-foundation',
    },
    {
      serviceId: 'actionPipeline',
      displayName: 'Runtime Action Pipeline',
      runtimeOwner: 'bridge-runtime',
      health: actionMetrics.failedActions > 0 ? 'degraded' : 'healthy',
      capabilities: ['executeAction', 'providerLifecycle', 'persistentHistory'],
      realtime: true,
      persistenceAware: Boolean(actionMetrics.persistence?.enabled),
      recoveryAware: true,
      version: 'approval-foundation',
    },
    {
      serviceId: 'snapshotRuntime',
      displayName: 'Runtime Snapshot',
      runtimeOwner: 'bridge-runtime',
      health: continuity.lastError ? 'degraded' : 'healthy',
      capabilities: ['persistentHistory', 'readState'],
      realtime: false,
      persistenceAware: true,
      recoveryAware: true,
      version: 'continuity-foundation',
    },
    {
      serviceId: 'approvalRuntime',
      displayName: 'Approval Runtime',
      runtimeOwner: 'runtime-governance',
      health: 'healthy',
      capabilities: ['proposeAction', 'executeAction', 'persistentHistory'],
      realtime: true,
      persistenceAware: true,
      recoveryAware: true,
      version: 'policy-approval-foundation',
    },
    {
      serviceId: 'diagnosticsRuntime',
      displayName: 'Diagnostics Runtime',
      runtimeOwner: 'manager-diagnostics',
      health: 'healthy',
      capabilities: ['diagnosticsAccess', 'readState', 'signalLogging'],
      realtime: false,
      persistenceAware: false,
      recoveryAware: false,
      version: 'manager-insight-foundation',
    },
    {
      serviceId: 'registryRuntime',
      displayName: 'Runtime Registry',
      runtimeOwner: 'bridge-runtime',
      health: 'healthy',
      capabilities: ['readState', 'diagnosticsAccess'],
      realtime: true,
      persistenceAware: false,
      recoveryAware: true,
      version: runtimeRegistryState.version,
    },
  ]
}

function resolveSemanticContextForEvent(type, payload = {}) {
  const relatedEntityIds = []
  if (payload.roomId ?? payload.roomKey) {
    relatedEntityIds.push(`room:${payload.roomId ?? payload.roomKey}`)
  }
  if (payload.groupAddress) {
    relatedEntityIds.push(`signal:${payload.groupAddress}`)
  }
  if (payload.provider) {
    relatedEntityIds.push(`provider:${payload.provider}`)
  }
  if (payload.action?.domainId) {
    relatedEntityIds.push(`domain:${payload.action.domainId}`)
  }
  const affectedDomains = Array.from(
    new Set([
      payload.domainId,
      payload.action?.domainId,
      resolveRuntimeDomainForEvent(type, payload),
    ].filter(Boolean)),
  )
  return {
    relatedEntityIds: Array.from(new Set(relatedEntityIds)),
    semanticContext: {
      eventType: type,
      role: payload.groupAddress
        ? 'signalUpdate'
        : type.includes('action')
          ? 'actionLifecycle'
          : type.includes('registry')
            ? 'compositionUpdate'
            : 'runtimeObservation',
      nivaReadable: true,
      execution: false,
    },
    affectedDomains,
  }
}

function getRuntimeInsightKey(insight) {
  return [
    insight.category,
    insight.relatedEntities?.join('|') ?? 'none',
    insight.affectedDomains?.join('|') ?? 'runtime',
    insight.source,
  ].join(':')
}

function createRuntimeInsight({
  category,
  severity = 'low',
  confidence = 'medium',
  source = 'runtime-insight-engine',
  relatedEntities = [],
  affectedDomains = [],
  semanticContext = {},
  explanation,
  suggestedAction = null,
  requiresApproval = false,
}) {
  const now = new Date().toISOString()
  const key = getRuntimeInsightKey({ category, relatedEntities, affectedDomains, source })
  const previous = runtimeInsightByKey.get(key)
  return {
    insightId: previous?.insightId ?? `insight-${Date.now()}-${randomUUID().slice(0, 8)}`,
    key,
    category,
    severity,
    confidence,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    source,
    relatedEntities,
    affectedDomains,
    semanticContext,
    explanation,
    suggestedAction,
    requiresApproval: Boolean(requiresApproval),
    acknowledged: Boolean(previous?.acknowledged),
    resolved: false,
    stale: false,
    lifecycleState: previous?.acknowledged ? 'acknowledged' : 'active',
  }
}

function getRuntimeInsightSeverityRank(severity) {
  return { high: 3, medium: 2, low: 1 }[severity] ?? 0
}

function generateRuntimeInsights() {
  const registry = getRuntimeRegistrySnapshot()
  const eventStats = getRuntimeEventStats()
  const actionMetrics = getRuntimeActionMetrics()
  const continuity = getRuntimeContinuityStatus()
  const existingInsightKeys = new Set(runtimeInsightByKey.keys())
  const insights = []

  for (const entity of registry.semanticEntities ?? []) {
    if (!entity.groupAddress || !entity.critical) {
      continue
    }
    const cacheEntry = getCacheEntry(entity.groupAddress)
    const freshness = cacheEntry?.freshness?.state ?? 'unknown'
    if (freshness === 'stale' || freshness === 'unknown') {
      insights.push(createRuntimeInsight({
        category: 'staleSignal',
        severity: freshness === 'stale' ? 'medium' : 'low',
        confidence: cacheEntry ? 'high' : 'medium',
        relatedEntities: [entity.entityId, ...(entity.roomId ? [`room:${entity.roomId}`] : [])],
        affectedDomains: [entity.domainId],
        semanticContext: {
          role: entity.semanticRole,
          entityType: entity.entityType,
          freshness,
          groupAddress: entity.groupAddress,
          dpt: entity.dpt ?? null,
        },
        explanation: `${entity.displayName} har ${freshness === 'stale' ? 'ikke oppdatert seg innen forventet tid' : 'ingen kjent verdi ennå'}.`,
        suggestedAction: entity.roomId ? 'Hent verdi for rommet ved behov.' : null,
        requiresApproval: false,
      }))
    }
  }

  for (const entityId of registry.contextGraph?.orphanedEntities ?? []) {
    const entity = registry.semanticEntities?.find((candidate) => candidate.entityId === entityId)
    insights.push(createRuntimeInsight({
      category: 'orphanedEntity',
      severity: 'low',
      confidence: 'medium',
      relatedEntities: [entityId],
      affectedDomains: entity?.domainId ? [entity.domainId] : ['diagnostics'],
      semanticContext: {
        entityType: entity?.entityType ?? 'unknown',
        role: entity?.semanticRole ?? 'unknown',
      },
      explanation: `${entity?.displayName ?? entityId} mangler tydelige relasjoner i context graph.`,
      requiresApproval: false,
    }))
  }

  const degradedDomains = (registry.domains ?? []).filter((domain) =>
    ['degraded', 'offline'].includes(domain.health),
  )
  for (const domain of degradedDomains) {
    insights.push(createRuntimeInsight({
      category: 'runtimeHealth',
      severity: domain.health === 'offline' ? 'medium' : 'low',
      confidence: 'medium',
      relatedEntities: [`domain:${domain.domainId}`],
      affectedDomains: [domain.domainId],
      semanticContext: {
        domainHealth: domain.health,
        approvalHeavy: Boolean(domain.approvalHeavy),
        realtimeCritical: Boolean(domain.realtimeCritical),
      },
      explanation: `${domain.displayName} kjører med status ${domain.health}.`,
      requiresApproval: false,
    }))
  }

  if ((eventStats.pollingRequestsPerMinute ?? 0) > 20) {
    insights.push(createRuntimeInsight({
      category: 'pollingPressure',
      severity: 'medium',
      confidence: 'high',
      relatedEntities: ['runtimeService:eventBus', 'runtimeService:diagnosticsRuntime'],
      affectedDomains: ['runtime', 'diagnostics'],
      semanticContext: {
        pollingRequestsPerMinute: eventStats.pollingRequestsPerMinute,
        topPollingSources: eventStats.topPollingSources,
      },
      explanation: `Runtime polling er høyere enn ønsket (${eventStats.pollingRequestsPerMinute}/min).`,
      requiresApproval: false,
    }))
  }

  if ((eventStats.reconnectCount ?? 0) > 5 || (eventStats.resyncRequiredCount ?? 0) > 0) {
    insights.push(createRuntimeInsight({
      category: 'realtimeInstability',
      severity: eventStats.resyncRequiredCount > 0 ? 'medium' : 'low',
      confidence: 'medium',
      relatedEntities: ['runtimeService:eventBus'],
      affectedDomains: ['runtime'],
      semanticContext: {
        reconnectCount: eventStats.reconnectCount,
        resyncRequiredCount: eventStats.resyncRequiredCount,
        droppedEvents: eventStats.droppedEvents,
      },
      explanation: 'Runtime event stream har hatt reconnect/resync-aktivitet.',
      requiresApproval: false,
    }))
  }

  if ((actionMetrics.pendingApprovals ?? 0) > 0) {
    insights.push(createRuntimeInsight({
      category: 'approvalAttention',
      severity: 'low',
      confidence: 'high',
      relatedEntities: ['runtimeService:approvalRuntime'],
      affectedDomains: ['security', 'runtime'],
      semanticContext: {
        pendingApprovals: actionMetrics.pendingApprovals,
      },
      explanation: `${actionMetrics.pendingApprovals} runtime action venter på approval.`,
      suggestedAction: 'Se approval queue i Manager Diagnose.',
      requiresApproval: false,
    }))
  }

  if (continuity.restored || continuity.partialRestore) {
    insights.push(createRuntimeInsight({
      category: 'recoveryEvent',
      severity: continuity.partialRestore ? 'medium' : 'low',
      confidence: 'high',
      relatedEntities: ['runtimeService:snapshotRuntime'],
      affectedDomains: ['runtime'],
      semanticContext: {
        restored: continuity.restored,
        partialRestore: continuity.partialRestore,
        restoredSnapshotId: continuity.restoredSnapshotId,
      },
      explanation: continuity.partialRestore
        ? 'Runtime startet med delvis snapshot-restore.'
        : 'Runtime continuity ble gjenopprettet fra siste snapshot.',
      requiresApproval: false,
    }))
  }

  const diagnosticsService = (registry.runtimeServices ?? []).find((service) => service.serviceId === 'diagnosticsRuntime')
  if (diagnosticsService?.health === 'healthy' && insights.length === 0) {
    insights.push(createRuntimeInsight({
      category: 'diagnosticsObservation',
      severity: 'low',
      confidence: 'medium',
      relatedEntities: ['runtimeService:diagnosticsRuntime'],
      affectedDomains: ['diagnostics'],
      semanticContext: {
        observation: 'no-active-runtime-issues',
      },
      explanation: 'Ingen tydelige runtime-avvik er observert akkurat nå.',
      requiresApproval: false,
    }))
  }

  const nextKeys = new Set(insights.map((insight) => insight.key))
  const resolvedInsights = []
  for (const [key, previous] of runtimeInsightByKey.entries()) {
    if (!nextKeys.has(key) && !previous.resolved) {
      const resolved = {
        ...previous,
        updatedAt: new Date().toISOString(),
        resolved: true,
        stale: false,
        lifecycleState: 'resolved',
      }
      runtimeInsightByKey.set(key, resolved)
      resolvedInsights.push(resolved)
    }
  }

  for (const insight of insights) {
    const previous = runtimeInsightByKey.get(insight.key)
    const nextInsight = previous
      ? {
          ...insight,
          insightId: previous.insightId,
          createdAt: previous.createdAt,
          acknowledged: previous.acknowledged,
          lifecycleState: previous.acknowledged ? 'acknowledged' : 'active',
        }
      : insight
    runtimeInsightByKey.set(insight.key, nextInsight)
  }

  const activeInsights = Array.from(runtimeInsightByKey.values())
    .filter((insight) => !insight.resolved)
    .sort((a, b) => getRuntimeInsightSeverityRank(b.severity) - getRuntimeInsightSeverityRank(a.severity))
  const allInsights = Array.from(runtimeInsightByKey.values())
    .sort((a, b) => Date.parse(b.updatedAt ?? b.createdAt) - Date.parse(a.updatedAt ?? a.createdAt))
    .slice(0, runtimeInsightState.persistence.retention.maxInsights)
  runtimeInsightHistory.splice(0, runtimeInsightHistory.length, ...allInsights)
  runtimeInsightState.lastGeneratedAt = new Date().toISOString()
  void persistRuntimeInsights()

  for (const insight of activeInsights) {
    emitRuntimeEvent(existingInsightKeys.has(insight.key) ? 'insightUpdated' : 'insightGenerated', {
      category: 'runtimeInsight',
      source: insight.source,
      domainId: insight.affectedDomains[0] ?? 'runtime',
      capabilityContext: 'diagnosticsAccess',
      confidence: insight.confidence,
      relatedEntityIds: insight.relatedEntities,
      affectedDomains: insight.affectedDomains,
      semanticContext: insight.semanticContext,
      insight,
      replayable: true,
      persisted: true,
    })
  }
  for (const insight of resolvedInsights) {
    emitRuntimeEvent('insightResolved', {
      category: 'runtimeInsight',
      source: insight.source,
      domainId: insight.affectedDomains[0] ?? 'runtime',
      capabilityContext: 'diagnosticsAccess',
      confidence: insight.confidence,
      relatedEntityIds: insight.relatedEntities,
      affectedDomains: insight.affectedDomains,
      semanticContext: insight.semanticContext,
      insight,
      replayable: true,
      persisted: true,
    })
  }

  const severityDistribution = activeInsights.reduce((counts, insight) => {
    counts[insight.severity] = (counts[insight.severity] ?? 0) + 1
    return counts
  }, {})
  const categoryDistribution = activeInsights.reduce((counts, insight) => {
    counts[insight.category] = (counts[insight.category] ?? 0) + 1
    return counts
  }, {})

  return {
    ok: true,
    source: 'bridge-runtime-insight-engine',
    model: runtimeInsightState.model,
    generatedAt: runtimeInsightState.lastGeneratedAt,
    deterministic: true,
    aiMl: false,
    autonomousExecution: false,
    actionExecution: false,
    activeInsights,
    resolvedInsights: allInsights.filter((insight) => insight.resolved).slice(0, 20),
    insightCount: activeInsights.length,
    categories: Object.keys(categoryDistribution),
    severityDistribution,
    categoryDistribution,
    lifecycle: {
      active: activeInsights.filter((insight) => insight.lifecycleState === 'active').length,
      acknowledged: activeInsights.filter((insight) => insight.lifecycleState === 'acknowledged').length,
      resolved: allInsights.filter((insight) => insight.resolved).length,
      stale: activeInsights.filter((insight) => insight.stale).length,
    },
    persistence: {
      ...runtimeInsightState.persistence,
      restored: runtimeInsightState.restored,
      restoredInsights: runtimeInsightState.restoredInsights,
      lastPersistedAt: runtimeInsightState.lastPersistedAt,
      lastError: runtimeInsightState.lastError,
    },
  }
}

async function persistRuntimeInsights() {
  try {
    await mkdir(runtimeInsightsDirectory, { recursive: true })
    const lines = runtimeInsightHistory.map((insight) => JSON.stringify(insight)).join('\n')
    await writeFile(runtimeInsightsFile, lines ? `${lines}\n` : '', 'utf8')
    runtimeInsightState.lastPersistedAt = new Date().toISOString()
    runtimeInsightState.lastError = null
    await writeFile(
      runtimeInsightsMetadataFile,
      JSON.stringify({
        updatedAt: runtimeInsightState.lastPersistedAt,
        insightCount: runtimeInsightHistory.length,
        activeCount: runtimeInsightHistory.filter((insight) => !insight.resolved).length,
        model: runtimeInsightState.model,
        retention: runtimeInsightState.persistence.retention,
      }, null, 2),
      'utf8',
    )
  } catch (error) {
    runtimeInsightState.lastError =
      error instanceof Error ? error.message : 'Runtime insight persistence failed'
  }
}

async function restoreRuntimeInsights() {
  try {
    const raw = await readFile(runtimeInsightsFile, 'utf8')
    const insights = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter((entry) => entry && typeof entry === 'object' && entry.insightId)
      .slice(-runtimeInsightState.persistence.retention.maxInsights)
    runtimeInsightHistory.push(...insights)
    runtimeInsightByKey.clear()
    for (const insight of insights) {
      if (insight.key) {
        runtimeInsightByKey.set(insight.key, insight)
      }
    }
    runtimeInsightState.restored = insights.length > 0
    runtimeInsightState.restoredInsights = insights.length
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      runtimeInsightState.lastError =
        error instanceof Error ? error.message : 'Runtime insight restore failed'
    }
  }
}

async function acknowledgeRuntimeInsight(insightId) {
  const id = String(insightId ?? '').trim()
  const insight = runtimeInsightHistory.find((entry) => entry.insightId === id)
  if (!insight) {
    return { ok: false, error: 'Runtime insight not found' }
  }
  const acknowledged = {
    ...insight,
    acknowledged: true,
    lifecycleState: insight.resolved ? 'resolved' : 'acknowledged',
    updatedAt: new Date().toISOString(),
  }
  const index = runtimeInsightHistory.findIndex((entry) => entry.insightId === id)
  runtimeInsightHistory[index] = acknowledged
  if (acknowledged.key) {
    runtimeInsightByKey.set(acknowledged.key, acknowledged)
  }
  await persistRuntimeInsights()
  emitRuntimeEvent('insightAcknowledged', {
    category: 'runtimeInsight',
    source: acknowledged.source,
    domainId: acknowledged.affectedDomains?.[0] ?? 'runtime',
    capabilityContext: 'diagnosticsAccess',
    confidence: acknowledged.confidence,
    relatedEntityIds: acknowledged.relatedEntities,
    affectedDomains: acknowledged.affectedDomains,
    semanticContext: acknowledged.semanticContext,
    insight: acknowledged,
    replayable: true,
    persisted: true,
  })
  return {
    ok: true,
    insight: acknowledged,
    sendsCommands: false,
    autonomousExecution: false,
  }
}

function getRuntimeRegistrySnapshot({ touch = false } = {}) {
  const domainsSnapshot = getRuntimeDomainSnapshot()
  const providerManifests = getRuntimeProviderManifests(domainsSnapshot)
  const runtimeServices = getRuntimeServiceManifests()
  const generatedAt = new Date().toISOString()
  if (touch) {
    runtimeRegistrySequence += 1
    runtimeRegistryState.lastUpdatedAt = generatedAt
    runtimeRegistryState.updateCount += 1
  }
  const domains = domainsSnapshot.domains.map((domain) => ({
    ...domain,
    providers: providerManifests
      .filter((provider) => provider.domains.includes(domain.domainId))
      .map((provider) => provider.providerId),
    runtimeServices: runtimeServices
      .filter((service) => service.capabilities.some((capability) => domain.capabilities.includes(capability)))
      .map((service) => service.serviceId),
    exposedCapabilities: domain.capabilities,
  }))
  const registryBase = {
    providers: providerManifests,
    domains,
    runtimeServices,
  }
  const contextGraph = buildRuntimeContextGraph(registryBase, { knxTargets: getKnxSubscriptionTargets() })
  return {
    ok: true,
    source: 'bridge-runtime-registry',
    generatedAt,
    registryId: `registry-${runtimeRegistrySequence}`,
    ...runtimeRegistryState,
    lastUpdatedAt: runtimeRegistryState.lastUpdatedAt ?? generatedAt,
    providers: providerManifests,
    domains,
    capabilities: getCapabilityMatrix(providerManifests, domainsSnapshot),
    runtimeServices,
    semanticEntities: contextGraph.entities,
    relationships: contextGraph.relationships,
    contextGraph,
    activeRuntimes: runtimeServices
      .filter((service) => service.health !== 'disabled')
      .map((service) => service.serviceId),
    healthSummaries: {
      providers: {
        total: providerManifests.length,
        healthy: providerManifests.filter((provider) => provider.health === 'healthy').length,
        degraded: providerManifests.filter((provider) => provider.health === 'degraded').length,
        experimental: providerManifests.filter((provider) => provider.experimental).length,
        liveRuntime: providerManifests.filter((provider) => provider.maturity === 'liveRuntime').length,
        statusOnly: providerManifests.filter((provider) => provider.maturity === 'statusOnly').length,
        foundation: providerManifests.filter((provider) => provider.maturity === 'foundation').length,
        future: providerManifests.filter((provider) => provider.maturity === 'future').length,
        commandCapable: providerManifests.filter((provider) => provider.controlAvailable && provider.sendsCommands).length,
      },
      domains: domainsSnapshot.counts,
      services: {
        total: runtimeServices.length,
        healthy: runtimeServices.filter((service) => service.health === 'healthy').length,
        degraded: runtimeServices.filter((service) => service.health === 'degraded').length,
      },
    },
    discovery: {
      capabilityDiscovery: true,
      providerManifests: true,
      dynamicCodeLoading: false,
      pluginSystem: false,
      remotePackages: false,
      nivaFutureHook: 'capability/domain/provider discovery only',
    },
  }
}

function emitRuntimeRegistryEvents(reason = 'registry-refresh') {
  const registry = getRuntimeRegistrySnapshot({ touch: true })
  emitRuntimeEvent('registryUpdated', {
    source: 'runtime-registry',
    category: 'runtime',
    domainId: 'runtime',
    capabilityContext: 'readState',
    registry: {
      registryId: registry.registryId,
      generatedAt: registry.generatedAt,
      providerCount: registry.providers.length,
      domainCount: registry.domains.length,
      serviceCount: registry.runtimeServices.length,
      reason,
    },
    replayable: true,
    persisted: false,
  })
  for (const provider of registry.providers) {
    emitRuntimeEvent('providerRegistered', {
      source: 'runtime-registry',
      category: 'integration',
      domainId: provider.domainId,
      capabilityContext: 'readState',
      provider: provider.providerId,
      manifest: provider,
      replayable: true,
      persisted: false,
    })
  }
  emitRuntimeEvent('runtimeServiceHealthChanged', {
    source: 'runtime-registry',
    category: 'runtime',
    domainId: 'runtime',
    capabilityContext: 'diagnosticsAccess',
    services: registry.runtimeServices.map((service) => ({
      serviceId: service.serviceId,
      health: service.health,
      realtime: service.realtime,
    })),
    replayable: true,
    persisted: false,
  })
  return registry
}

function getRuntimeProviderStateSummary(domainsSnapshot = getRuntimeDomainSnapshot()) {
  const providerMap = new Map()
  for (const domain of domainsSnapshot.domains) {
    for (const provider of domain.providers ?? []) {
      const current = providerMap.get(provider) ?? {
        provider,
        domains: [],
        health: 'unknown',
        enabled: false,
        experimental: false,
        realtimeCapable: false,
      }
      current.domains.push(domain.domainId)
      current.enabled = current.enabled || domain.enabled
      current.experimental = current.experimental || domain.experimental
      current.realtimeCapable = current.realtimeCapable || Boolean(domain.realtimeCritical)
      if (current.health === 'unknown' || domain.health === 'healthy') {
        current.health = domain.health
      } else if (domain.health === 'degraded' && current.health !== 'healthy') {
        current.health = 'degraded'
      } else if (domain.health === 'offline' && current.health === 'unknown') {
        current.health = 'offline'
      }
      providerMap.set(provider, current)
    }
  }
  return Array.from(providerMap.values()).sort((a, b) => a.provider.localeCompare(b.provider))
}

function getRuntimeHealthSummary() {
  const health = getHealthPayload()
  return {
    ok: Boolean(health.ok),
    runtimeConfigReceived: Boolean(health.runtimeConfigReceived),
    connectionMode: health.connectionMode ?? null,
    knxSubscriptionActive: Boolean(health.knxSubscriptionRuntime?.active),
    cachedGroupCount: health.knxSubscriptionRuntime?.cachedGroupCount ?? 0,
    staleGroupCount: health.knxSubscriptionRuntime?.staleGroupCount ?? 0,
    lastTelegramAt: health.knxSubscriptionRuntime?.lastTelegramAt ?? null,
    error: health.knxSubscriptionRuntime?.error ?? null,
  }
}

function getEventStreamHealthSummary() {
  return {
    transport: 'sse',
    connectedClients: runtimeEventClients.size,
    latestEventId: runtimeEventStats.latestEventId,
    lastEventAt: runtimeEventStats.lastEventAt,
    totalEvents: runtimeEventStats.totalEvents,
    reconnectCount: runtimeEventStats.reconnectCount,
    resyncRequiredCount: runtimeEventStats.resyncRequiredCount,
    replayedEvents: runtimeEventStats.replayedEvents,
    droppedEvents: runtimeEventStats.droppedEvents,
    eventBufferSize: runtimeEventBuffer.length,
    eventBufferLimit: RUNTIME_EVENT_BUFFER_LIMIT,
  }
}

function getStaleCountsSummary() {
  const runtime = getKnxSubscriptionRuntimeSummary()
  return {
    groups: runtime.staleGroupCount ?? 0,
    freshness: runtime.freshnessCounts ?? {},
    staleSessions: getRuntimeClientSnapshot().counts.staleSessions,
  }
}

function getRoomTruthSummary() {
  const summary = runtimeStateStore.getSummary()
  return {
    roomCount: summary.roomSummary?.roomCount ?? 0,
    activeLightRooms: summary.roomSummary?.activeLightRooms ?? 0,
    climateRooms: summary.roomSummary?.climateRooms ?? 0,
    roomsWithSignals: summary.roomSummary?.roomsWithSignals?.length ?? 0,
    roomSnapshotCount: summary.roomSnapshotCount ?? 0,
    historyPointCount: summary.historyPointCount ?? 0,
    updatedAt: summary.updatedAt ?? null,
  }
}

function getRuntimeContinuityStatus() {
  return {
    ...runtimeContinuityState,
    lastSnapshot: lastRuntimeContinuitySnapshot
      ? {
          snapshotId: lastRuntimeContinuitySnapshot.snapshotId,
          createdAt: lastRuntimeContinuitySnapshot.createdAt,
          restored: Boolean(lastRuntimeContinuitySnapshot.restored),
          partialRestore: Boolean(lastRuntimeContinuitySnapshot.partialRestore),
          pendingActions: lastRuntimeContinuitySnapshot.pendingActions?.length ?? 0,
        }
      : null,
  }
}

function createRuntimeContinuitySnapshot({ reason = 'scheduled', restored = false, partialRestore = false } = {}) {
  const createdAt = new Date().toISOString()
  const domains = getRuntimeDomainSnapshot()
  const clients = getRuntimeClientSnapshot()
  const actionMetrics = getRuntimeActionMetrics()
  const pendingActions = (actionMetrics.approvalQueue?.pending ?? [])
    .map((action) => ({
      actionId: action.actionId,
      type: action.type,
      category: action.category,
      domainId: action.domainId ?? null,
      capabilityRequired: action.capabilityRequired ?? null,
      source: action.source,
      createdAt: action.createdAt,
      initiatedBy: action.initiatedBy,
      initiatedFrom: action.initiatedFrom,
      trustedClient: action.trustedClient,
      riskLevel: action.policy?.riskLevel ?? null,
      executionState: action.executionState,
    }))

  return {
    snapshotId: `snapshot-${Date.now()}-${randomUUID().slice(0, 8)}`,
    createdAt,
    runtimeVersion: 'v8.5-continuity-foundation',
    reason,
    domains: domains.domains,
    activeClients: clients.clients.filter((client) => client.activeSessionCount > 0),
    activeSessions: clients.sessions.filter((session) => !session.staleSession),
    pendingActions,
    approvalQueue: actionMetrics.approvalQueue,
    runtimeHealth: getRuntimeHealthSummary(),
    eventStreamHealth: getEventStreamHealthSummary(),
    staleCounts: getStaleCountsSummary(),
    providerStates: getRuntimeProviderStateSummary(domains),
    roomTruthSummary: getRoomTruthSummary(),
    restored,
    partialRestore,
    safety: {
      distributedRuntime: false,
      failoverCluster: false,
      cloudSync: false,
      autoExecuteOnRestore: false,
      autonomousExecution: false,
    },
  }
}

async function persistRuntimeContinuitySnapshot(snapshot) {
  try {
    await mkdir(runtimeSnapshotsDirectory, { recursive: true })
    await appendFile(runtimeSnapshotsFile, `${JSON.stringify(snapshot)}\n`, 'utf8')
    await writeFile(runtimeLatestSnapshotFile, JSON.stringify(snapshot, null, 2), 'utf8')
    runtimeContinuityState.snapshotCount += 1
    runtimeContinuityState.lastSnapshotAt = snapshot.createdAt
    runtimeContinuityState.lastSnapshotId = snapshot.snapshotId
    runtimeContinuityState.lastError = null
    await writeFile(
      runtimeSnapshotsMetadataFile,
      JSON.stringify({
        updatedAt: new Date().toISOString(),
        snapshotCount: runtimeContinuityState.snapshotCount,
        lastSnapshotId: runtimeContinuityState.lastSnapshotId,
        lastSnapshotAt: runtimeContinuityState.lastSnapshotAt,
        restored: runtimeContinuityState.restored,
        partialRestore: runtimeContinuityState.partialRestore,
        retention: runtimeContinuityState.retention,
      }, null, 2),
      'utf8',
    )
    lastRuntimeContinuitySnapshot = snapshot
  } catch (error) {
    runtimeContinuityState.lastError =
      error instanceof Error ? error.message : 'Runtime snapshot persistence failed'
  }
}

async function createAndPersistRuntimeContinuitySnapshot(reason = 'scheduled') {
  const snapshot = createRuntimeContinuitySnapshot({ reason })
  await persistRuntimeContinuitySnapshot(snapshot)
  emitRuntimeEvent('runtimeSnapshotCreated', {
    source: 'runtime-continuity',
    category: 'runtime',
    domainId: 'runtime',
    capabilityContext: 'persistentHistory',
    snapshot: {
      snapshotId: snapshot.snapshotId,
      createdAt: snapshot.createdAt,
      reason,
      pendingActions: snapshot.pendingActions.length,
      partialRestore: snapshot.partialRestore,
    },
    persisted: true,
    stats: getRuntimeEventStats(),
  })
  return snapshot
}

async function restoreRuntimeContinuitySnapshot() {
  try {
    const raw = await readFile(runtimeLatestSnapshotFile, 'utf8')
    const snapshot = JSON.parse(raw)
    if (!snapshot?.snapshotId || !snapshot?.createdAt) {
      runtimeContinuityState.partialRestore = true
      runtimeContinuityState.lastError = 'Latest runtime snapshot was incomplete'
      return null
    }

    const createdAtMs = Date.parse(snapshot.createdAt)
    const restoredAt = new Date().toISOString()
    lastRuntimeContinuitySnapshot = {
      ...snapshot,
      restored: true,
      restoredAt,
    }
    runtimeContinuityState.restored = true
    runtimeContinuityState.partialRestore = Boolean(snapshot.partialRestore)
    runtimeContinuityState.restoredAt = restoredAt
    runtimeContinuityState.restoredSnapshotId = snapshot.snapshotId
    runtimeContinuityState.restoredSnapshotAgeMs = Number.isFinite(createdAtMs)
      ? Math.max(0, Date.now() - createdAtMs)
      : null
    runtimeContinuityState.lastSnapshotAt = snapshot.createdAt
    runtimeContinuityState.lastSnapshotId = snapshot.snapshotId
    try {
      const metadata = JSON.parse(await readFile(runtimeSnapshotsMetadataFile, 'utf8'))
      runtimeContinuityState.snapshotCount = Number(metadata?.snapshotCount ?? 1)
    } catch {
      runtimeContinuityState.snapshotCount = 1
    }
    runtimeContinuityState.reconnectContinuity = 'restored'
    runtimeContinuityState.lastError = null
    emitRuntimeEvent(runtimeContinuityState.partialRestore ? 'runtimePartialRestore' : 'runtimeSnapshotRestored', {
      source: 'runtime-continuity',
      category: 'runtime',
      domainId: 'runtime',
      capabilityContext: 'persistentHistory',
      snapshot: {
        snapshotId: snapshot.snapshotId,
        createdAt: snapshot.createdAt,
        restoredAt,
        partialRestore: runtimeContinuityState.partialRestore,
        pendingActions: snapshot.pendingActions?.length ?? 0,
      },
      persisted: true,
      stats: getRuntimeEventStats(),
    })
    return lastRuntimeContinuitySnapshot
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      runtimeContinuityState.partialRestore = true
      runtimeContinuityState.lastError =
        error instanceof Error ? error.message : 'Runtime snapshot restore failed'
      emitRuntimeEvent('runtimePartialRestore', {
        source: 'runtime-continuity',
        category: 'runtime',
        domainId: 'runtime',
        capabilityContext: 'persistentHistory',
        reason: runtimeContinuityState.lastError,
        persisted: false,
        stats: getRuntimeEventStats(),
      })
    }
    return null
  }
}

function resolveRuntimeDomainForAction({ category, type, source, target, payloadSummary }) {
  const sourceText = String(source ?? '').toLowerCase()
  const typeText = String(type ?? '').toLowerCase()
  const provider = String(target?.provider ?? payloadSummary?.provider ?? '').toLowerCase()

  if (category === 'knxWrite') {
    if (
      sourceText.includes('light') ||
      sourceText.includes('brightness') ||
      typeText.includes('light') ||
      typeText.includes('brightness')
    ) {
      return 'lighting'
    }
    return 'climate'
  }

  if (category === 'roomPoll') {
    return 'diagnostics'
  }

  if (category === 'providerLifecycle') {
    if (provider.includes('cast')) {
      return 'media'
    }
    if (provider.includes('deltaco') || provider.includes('dreame') || provider.includes('homeassistant')) {
      return 'utility'
    }
    return 'integration'
  }

  if (category === 'insightSuggestion' || category === 'userIntent') {
    return 'security'
  }

  if (category === 'runtimeRefresh') {
    return 'runtime'
  }

  return 'runtime'
}

function resolveCapabilityForAction({ category, type }) {
  if (category === 'knxWrite') {
    return 'writeState'
  }
  if (category === 'roomPoll' || type === 'roomPoll') {
    return 'polling'
  }
  if (category === 'providerLifecycle') {
    return 'providerLifecycle'
  }
  if (category === 'insightSuggestion' || category === 'userIntent') {
    return 'proposeAction'
  }
  if (category === 'runtimeRefresh') {
    return 'readState'
  }
  return 'executeAction'
}

function resolveRuntimeDomainForEvent(type, payload = {}) {
  const category = String(payload.category ?? '').toLowerCase()
  const source = String(payload.source ?? '').toLowerCase()
  const field = String(payload.field ?? '').toLowerCase()
  const provider = String(payload.provider ?? '').toLowerCase()

  if (type === 'knxValueUpdated' || type === 'roomUpdated' || type === 'historyPointAdded') {
    if (category === 'climate' || field.includes('temperature') || field.includes('setpoint') || field.includes('heat')) {
      return 'climate'
    }
    if (category === 'lighting' || field.includes('light') || field.includes('brightness')) {
      return 'lighting'
    }
  }

  if (category === 'media' || source.includes('cast') || provider.includes('cast')) {
    return 'media'
  }

  if (category === 'vacuum' || category.includes('deltaco') || source.includes('dreame') || provider.includes('dreame') || provider.includes('deltaco')) {
    return 'utility'
  }

  if (type.includes('action') || category === 'runtimeaction') {
    return payload.action?.domainId ?? 'runtime'
  }

  if (category === 'runtimeidentity') {
    return 'security'
  }

  if (category === 'diagnostics' || type === 'signalLoggerPoint') {
    return 'diagnostics'
  }

  if (type === 'providerStateChanged') {
    return 'integration'
  }

  return 'runtime'
}

function resolveCapabilityForEvent(type, payload = {}) {
  if (type === 'knxValueUpdated' || type === 'roomUpdated' || type === 'historyPointAdded') {
    return 'readState'
  }
  if (type === 'signalLoggerPoint') {
    return 'signalLogging'
  }
  if (type === 'providerStateChanged') {
    return 'providerLifecycle'
  }
  if (type.includes('action')) {
    return payload.action?.capabilityRequired ?? 'executeAction'
  }
  return 'realtimeEvents'
}

function emitRuntimeEvent(type, payload = {}) {
  const timestamp = Date.now()
  const eventId = `runtime-${runtimeEventSequence}`
  const domainId = payload.domainId ?? resolveRuntimeDomainForEvent(type, payload)
  const capabilityContext = payload.capabilityContext ?? resolveCapabilityForEvent(type, payload)
  const semantic = resolveSemanticContextForEvent(type, {
    ...payload,
    domainId,
  })
  const event = {
    eventId,
    id: eventId,
    sequence: runtimeEventSequence,
    type,
    timestamp,
    at: new Date(timestamp).toISOString(),
    source: payload.source ?? 'bridge-runtime',
    category: payload.category ?? 'runtime',
    domainId,
    capabilityContext,
    relatedEntityIds: payload.relatedEntityIds ?? semantic.relatedEntityIds,
    semanticContext: payload.semanticContext ?? semantic.semanticContext,
    affectedDomains: payload.affectedDomains ?? semantic.affectedDomains,
    confidence: payload.confidence ?? 'medium',
    persisted: Boolean(payload.persisted),
    replayable: payload.replayable === false ? false : true,
    updateToken: `${type}:${payload.roomId ?? payload.roomKey ?? payload.groupAddress ?? 'runtime'}:${timestamp}:${runtimeEventSequence}`,
    ...payload,
  }
  runtimeEventSequence += 1
  runtimeEventStats.totalEvents += 1
  runtimeEventStats.lastEventAt = event.at
  runtimeEventStats.latestEventId = event.eventId
  runtimeEventStats.recentEvents.push({
    eventId: event.eventId,
    type,
    timestamp,
    at: event.at,
  })
  runtimeEventStats.recentEvents = runtimeEventStats.recentEvents.slice(-120)
  if (event.replayable) {
    runtimeEventBuffer.push(event)
    runtimeEventBuffer.splice(0, Math.max(0, runtimeEventBuffer.length - RUNTIME_EVENT_BUFFER_LIMIT))
  }

  for (const client of runtimeEventClients) {
    try {
      sendSseEvent(client, type, event)
    } catch {
      const metadata = runtimeEventClientMetadata.get(client)
      if (metadata) {
        metadata.droppedEvents += 1
        runtimeEventClientMetadata.set(client, metadata)
      }
      runtimeEventStats.droppedEvents += 1
    }
  }

  return event
}

function recordIntegrationSnapshotAndEmit(kind, payload) {
  runtimeStateStore.recordIntegrationSnapshot(kind, payload)
  emitRuntimeEvent('providerStateChanged', {
    provider: kind,
    category: kind === 'cast' || kind === 'cast-playback' ? 'media' : kind,
    source: kind,
    confidence: payload?.connected || payload?.state === 'playing' ? 'high' : 'medium',
    state: payload?.state ?? payload?.connectionState ?? null,
    connected: Boolean(payload?.connected),
  })
}

function getRuntimeEventsAfter(lastEventId) {
  const id = String(lastEventId ?? '').trim()
  if (!id) {
    return []
  }

  const index = runtimeEventBuffer.findIndex((event) => event.eventId === id || event.id === id)
  if (index === -1) {
    return null
  }

  return runtimeEventBuffer.slice(index + 1)
}

function sanitizeActionPayloadSummary(payload = {}) {
  const summary = {}
  const safeKeys = [
    'room',
    'roomId',
    'roomName',
    'zone',
    'zoneId',
    'mode',
    'value',
    'brightness',
    'setpoint',
    'provider',
    'action',
    'liveClimateActive',
  ]
  for (const key of safeKeys) {
    if (payload[key] !== undefined && payload[key] !== null) {
      summary[key] = payload[key]
    }
  }
  return summary
}

function getRuntimeActionMetrics() {
  const oneMinuteAgo = Date.now() - 60_000
  const latestActions = getLatestRuntimeActions()
  const actionsLastMinute = latestActions.filter((action) => {
    const timestamp = Date.parse(action.createdAt ?? '')
    return Number.isFinite(timestamp) && timestamp >= oneMinuteAgo
  }).length

  runtimeActionStats.actionsLastMinute = actionsLastMinute
  runtimeActionStats.pendingApprovals = latestActions.filter(
    (action) => action.executionState === 'pendingApproval',
  ).length
  runtimeActionStats.governance.pendingApprovalCount = runtimeActionStats.pendingApprovals
  runtimeActionStats.governance.auditEventCount = runtimeAuditHistory.length

  return {
    ...runtimeActionStats,
    policies: defaultRuntimePolicies,
    domains: getRuntimeDomainSnapshot(),
    audit: {
      recentEvents: runtimeAuditHistory.slice(-12).reverse(),
      path: runtimeAuditFile,
    },
    approvalQueue: {
      pending: latestActions
        .filter((action) => action.executionState === 'pendingApproval')
        .sort(sortApprovalActions),
      approved: latestActions.filter((action) => action.approved && action.executionState !== 'pendingApproval').slice(0, 12),
      denied: latestActions.filter((action) => action.executionState === 'denied').slice(0, 12),
      completed: latestActions.filter((action) => action.executionState === 'completed').slice(0, 12),
    },
    recentActions: latestActions.slice(0, 12),
    executionStates: latestActions.reduce((states, action) => {
      states[action.executionState] = (states[action.executionState] ?? 0) + 1
      return states
    }, {}),
  }
}

function getLatestRuntimeActions() {
  const latestById = new Map()
  for (const action of runtimeActionHistory) {
    latestById.set(action.actionId, action)
  }
  return Array.from(latestById.values()).sort((a, b) =>
    Date.parse(b.updatedAt ?? b.createdAt ?? '') - Date.parse(a.updatedAt ?? a.createdAt ?? ''),
  )
}

function sortApprovalActions(a, b) {
  const riskRank = { high: 3, medium: 2, low: 1 }
  const riskDelta = (riskRank[b.policy?.riskLevel] ?? 0) - (riskRank[a.policy?.riskLevel] ?? 0)
  if (riskDelta !== 0) {
    return riskDelta
  }
  return Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? '')
}

function findLatestRuntimeAction(actionId) {
  return getLatestRuntimeActions().find((action) => action.actionId === actionId) ?? null
}

function getClientContext(request = null, requestedBy = 'frontend', payload = null, url = null) {
  const forwardedFor = request?.headers?.['x-forwarded-for']
  const remoteAddress = request?.socket?.remoteAddress ?? ''
  const clientId = String(
    request?.headers?.['x-lynell-client-id'] ??
    payload?.clientId ??
    url?.searchParams?.get('clientId') ??
    'anonymous-client',
  )
  const sessionId = String(
    request?.headers?.['x-lynell-session-id'] ??
    payload?.sessionId ??
    url?.searchParams?.get('sessionId') ??
    'sessionless',
  )
  const localNetwork =
    remoteAddress.includes('127.0.0.1') ||
    remoteAddress.includes('::1') ||
    remoteAddress.includes('localhost') ||
    remoteAddress.startsWith('::ffff:192.168.') ||
    remoteAddress.startsWith('::ffff:10.') ||
    remoteAddress.startsWith('::ffff:172.16.') ||
    remoteAddress.startsWith('192.168.') ||
    remoteAddress.startsWith('10.') ||
    remoteAddress.startsWith('172.16.')
  const initiatedFrom =
    localNetwork
      ? 'local'
      : 'remote'
  const registeredSession = runtimeSessions.get(sessionId)
  const registeredClient = runtimeClients.get(clientId)
  return {
    initiatedBy: requestedBy,
    initiatedFrom: registeredSession?.localSession ? 'local' : initiatedFrom,
    clientId,
    sessionId,
    trustedClient: Boolean(registeredSession?.trustedSession ?? registeredClient?.trusted ?? (localNetwork && !forwardedFor && clientId !== 'anonymous-client')),
    trustClassification: registeredClient?.trustClassification ?? null,
  }
}

function resolveRuntimePolicy({ category, type }) {
  return (
    defaultRuntimePolicies.find(
      (policy) =>
        policy.category === category &&
        (policy.actionType === type || policy.actionType === '*'),
    ) ??
    {
      policyId: 'policy-default-safe',
      category,
      actionType: type,
      enabled: true,
      requiresApproval: true,
      autoApproveLocal: false,
      allowRemote: false,
      allowNivaProposal: false,
      allowSchedule: false,
      allowAutomationFuture: false,
      riskLevel: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  )
}

async function persistRuntimeAuditEvent(event) {
  try {
    await mkdir(runtimeAuditDirectory, { recursive: true })
    await appendFile(runtimeAuditFile, `${JSON.stringify(event)}\n`, 'utf8')
    await writeFile(
      runtimeAuditMetadataFile,
      JSON.stringify({
        updatedAt: new Date().toISOString(),
        auditEventCount: runtimeAuditHistory.length,
        retention: {
          maxRecentEvents: 500,
        },
      }, null, 2),
      'utf8',
    )
  } catch {
    // Audit diagnostics stay best-effort in this foundation.
  }
}

function createRuntimeAuditEvent(action, eventType, detail = {}) {
  const event = {
    auditId: `audit-${Date.now()}-${randomUUID().slice(0, 8)}`,
    actionId: action.actionId,
    eventType,
    category: action.category,
    actionType: action.type,
    domainId: action.domainId ?? null,
    capabilityRequired: action.capabilityRequired ?? null,
    source: action.source,
    initiatedBy: action.initiatedBy,
    initiatedFrom: action.initiatedFrom,
    trustedClient: action.trustedClient,
    trustClassification: action.trustClassification ?? null,
    clientId: action.clientId,
    sessionId: action.sessionId,
    policyId: action.policy?.policyId ?? null,
    riskLevel: action.policy?.riskLevel ?? null,
    timestamp: new Date().toISOString(),
    detail,
  }
  runtimeAuditHistory.push(event)
  runtimeAuditHistory.splice(0, Math.max(0, runtimeAuditHistory.length - 500))
  runtimeActionStats.governance.latestAuditAt = event.timestamp
  runtimeActionStats.governance.auditEventCount = runtimeAuditHistory.length
  void persistRuntimeAuditEvent(event)
  emitRuntimeEvent('auditEventCreated', {
    category: 'runtimeAction',
    source: 'runtime-policy',
    actionId: action.actionId,
    auditEvent: event,
    confidence: 'high',
    persisted: true,
    stats: getRuntimeEventStats(),
  })
  return event
}

function incrementKnxMonitorCount(bucket, key) {
  const safeKey = String(key ?? 'unknown')
  bucket[safeKey] = (bucket[safeKey] ?? 0) + 1
}

function inferKnxMonitorTone(entry) {
  const source = String(entry.source ?? '').toLowerCase()
  const direction = String(entry.direction ?? '').toLowerCase()
  const relationType = String(entry.relation?.type ?? '').toLowerCase()

  if (entry.error) {
    return 'error'
  }
  if (source.includes('autopoll') || source.includes('auto-poll')) {
    return 'autoPoll'
  }
  if (source.includes('scene') || relationType.includes('scene')) {
    return 'scene'
  }
  if (source.includes('optimistic') || relationType.includes('optimistic')) {
    return 'optimistic'
  }
  if (entry.stale) {
    return 'stale'
  }
  if (direction === 'write' || direction === 'out') {
    return 'write'
  }
  if (direction === 'read' || source.includes('poll')) {
    return 'poll'
  }
  return 'feedback'
}

function pushKnxMonitorEvent(entry = {}) {
  const timestamp = Date.now()
  const at = entry.at ?? new Date(timestamp).toISOString()
  const sequence = knxRuntimeMonitor.sequence + 1
  const direction = entry.direction ?? 'feedback'
  const signalType = entry.signalType ?? entry.field ?? entry.kind ?? 'knx'
  const monitorEvent = {
    id: `knx-monitor-${sequence}`,
    sequence,
    timestamp,
    at,
    source: entry.source ?? 'knx-runtime',
    direction,
    groupAddress: entry.groupAddress ?? null,
    dpt: entry.dpt ?? null,
    dataType: entry.dataType ?? null,
    decodedValue: entry.decodedValue ?? entry.value ?? null,
    rawValue: sanitizeRawKnxValue(entry.rawValue),
    confidence: entry.confidence ?? 'medium',
    roomKey: entry.roomKey ?? entry.roomId ?? null,
    roomName: entry.roomName ?? entry.label ?? null,
    zoneKey: entry.zoneKey ?? null,
    zoneName: entry.zoneName ?? null,
    field: entry.field ?? null,
    normalizedField: entry.normalizedField ?? null,
    signalType,
    mappingVariant: entry.mappingVariant ?? null,
    responseSource: entry.responseSource ?? null,
    relation: entry.relation ?? null,
    stale: Boolean(entry.stale),
    error: entry.error ?? null,
  }
  monitorEvent.tone = entry.tone ?? inferKnxMonitorTone(monitorEvent)

  knxRuntimeMonitor.sequence = sequence
  knxRuntimeMonitor.totalEvents += 1
  knxRuntimeMonitor.lastEventAt = at
  incrementKnxMonitorCount(knxRuntimeMonitor.sourceCounts, monitorEvent.source)
  incrementKnxMonitorCount(knxRuntimeMonitor.directionCounts, monitorEvent.direction)
  incrementKnxMonitorCount(knxRuntimeMonitor.signalTypeCounts, monitorEvent.signalType)
  knxRuntimeMonitor.events.push(monitorEvent)
  if (knxRuntimeMonitor.events.length > knxRuntimeMonitor.bufferLimit) {
    const overflow = knxRuntimeMonitor.events.length - knxRuntimeMonitor.bufferLimit
    knxRuntimeMonitor.events.splice(0, overflow)
    knxRuntimeMonitor.droppedEvents += overflow
  }

  emitRuntimeEvent('knxMonitorEvent', {
    category: 'diagnostics',
    source: monitorEvent.source,
    groupAddress: monitorEvent.groupAddress,
    dpt: monitorEvent.dpt,
    dataType: monitorEvent.dataType,
    field: monitorEvent.field,
    confidence: monitorEvent.confidence,
    monitorEvent,
    replayable: true,
  })

  return monitorEvent
}

function getKnxMonitorDiagnostics() {
  const now = Date.now()
  const eventsLastMinute = knxRuntimeMonitor.events.filter(
    (event) => now - event.timestamp <= 60_000,
  ).length
  const latest = knxRuntimeMonitor.events.at(-1) ?? null

  return {
    active: true,
    startedAt: knxRuntimeMonitor.startedAt,
    bufferLimit: knxRuntimeMonitor.bufferLimit,
    bufferSize: knxRuntimeMonitor.events.length,
    droppedEvents: knxRuntimeMonitor.droppedEvents,
    totalEvents: knxRuntimeMonitor.totalEvents,
    lastEventAt: knxRuntimeMonitor.lastEventAt,
    liveTelegramRatePerMinute: eventsLastMinute,
    latestSequence: latest?.sequence ?? null,
    monitorLatencyMs: latest ? Math.max(0, now - latest.timestamp) : null,
    sourceCounts: knxRuntimeMonitor.sourceCounts,
    directionCounts: knxRuntimeMonitor.directionCounts,
    signalTypeCounts: knxRuntimeMonitor.signalTypeCounts,
  }
}

function getKnxMonitorPayload(limit = 300) {
  const safeLimit = Math.max(1, Math.min(knxRuntimeMonitor.bufferLimit, Number(limit) || 300))
  return {
    ok: true,
    source: 'knx-runtime-monitor',
    timestamp: new Date().toISOString(),
    diagnostics: getKnxMonitorDiagnostics(),
    events: knxRuntimeMonitor.events.slice(-safeLimit),
  }
}

async function persistRuntimeAction(action) {
  try {
    await mkdir(runtimeActionsDirectory, { recursive: true })
    await appendFile(runtimeActionsFile, `${JSON.stringify(action)}\n`, 'utf8')
    if (
      runtimeActionStats.totalActions > 0 &&
      runtimeActionStats.totalActions % 100 === 0
    ) {
      await writeFile(
        runtimeActionsFile,
        `${runtimeActionHistory.map((entry) => JSON.stringify(entry)).join('\n')}\n`,
        'utf8',
      )
    }
    await writeFile(
      runtimeActionsMetadataFile,
      JSON.stringify({
        updatedAt: new Date().toISOString(),
        totalActions: runtimeActionStats.totalActions,
        recentActionCount: runtimeActionHistory.length,
        retention: runtimeActionStats.persistence.retention,
      }, null, 2),
      'utf8',
    )
    runtimeActionStats.persistence.lastFlushAt = new Date().toISOString()
    runtimeActionStats.persistence.error = null
  } catch (error) {
    runtimeActionStats.persistence.error =
      error instanceof Error ? error.message : 'Runtime action persistence failed'
  }
}

function pushRuntimeAction(action) {
  runtimeActionHistory.push(action)
  runtimeActionHistory.splice(
    0,
    Math.max(0, runtimeActionHistory.length - runtimeActionStats.persistence.retention.maxRecentActions),
  )
  void persistRuntimeAction(action)
}

function createRuntimeAction({
  type,
  category,
  source,
  roomId = null,
  target = null,
  payloadSummary = {},
  requestedBy = 'frontend',
  clientContext = null,
  approvalRequired = false,
  confidence = null,
  runtimeContext = null,
  domainId = null,
  capabilityRequired = null,
}) {
  const now = new Date().toISOString()
  const policy = resolveRuntimePolicy({ category, type })
  const initiatedBy = clientContext?.initiatedBy ?? requestedBy
  const initiatedFrom = clientContext?.initiatedFrom ?? 'local'
  const trustedClient = Boolean(clientContext?.trustedClient ?? initiatedFrom === 'local')
  const remoteBlocked = initiatedFrom === 'remote' && !policy.allowRemote
  const policyRequiresApproval =
    !policy.enabled ||
    remoteBlocked ||
    policy.requiresApproval ||
    (approvalRequired && !(policy.autoApproveLocal && trustedClient))
  const actionDomainId = domainId ?? resolveRuntimeDomainForAction({
    category,
    type,
    source,
    target,
    payloadSummary,
  })
  const actionCapabilityRequired = capabilityRequired ?? resolveCapabilityForAction({ category, type })
  const action = {
    actionId: `action-${Date.now()}-${randomUUID().slice(0, 8)}`,
    type,
    category,
    domainId: actionDomainId,
    capabilityRequired: actionCapabilityRequired,
    source,
    roomId,
    target,
    payloadSummary,
    createdAt: now,
    requestedBy,
    initiatedBy,
    initiatedFrom,
    clientId: clientContext?.clientId ?? 'anonymous-client',
    sessionId: clientContext?.sessionId ?? 'sessionless',
    trustedClient,
    trustClassification: clientContext?.trustClassification ?? null,
    policy,
    approvalRequired: Boolean(policyRequiresApproval),
    approved: !policyRequiresApproval,
    denied: false,
    executed: false,
    failed: false,
    cancelled: false,
    executionState: policyRequiresApproval ? 'pendingApproval' : 'created',
    resultSummary: null,
    confidence,
    runtimeContext,
    updatedAt: now,
  }

  runtimeActionStats.totalActions += 1
  runtimeActionStats.latestActionAt = now
  runtimeActionStats.latestActionId = action.actionId
  if (action.approvalRequired) {
    runtimeActionStats.approvalRequiredCount += 1
  }
  if (trustedClient) {
    runtimeActionStats.governance.trustedClientCount += 1
  } else {
    runtimeActionStats.governance.untrustedClientCount += 1
  }
  if (policy.riskLevel === 'high' || remoteBlocked || !policy.enabled) {
    runtimeActionStats.governance.riskyActionAttempts += 1
  }
  pushRuntimeAction(action)
  createRuntimeAuditEvent(action, 'actionCreated', {
    executionState: action.executionState,
    policyId: policy.policyId,
    approvalRequired: action.approvalRequired,
  })
  emitRuntimeEvent('actionCreated', {
    category: 'runtimeAction',
    source,
    action,
    actionId: action.actionId,
    roomId,
    confidence: confidence ?? 'medium',
    persisted: true,
    stats: getRuntimeEventStats(),
  })
  if (action.executionState === 'pendingApproval') {
    createRuntimeAuditEvent(action, 'actionPendingApproval', {
      policyId: policy.policyId,
      riskLevel: policy.riskLevel,
    })
    emitRuntimeEvent('actionApprovalRequested', {
      category: 'runtimeAction',
      source,
      action,
      actionId: action.actionId,
      roomId,
      confidence: confidence ?? 'medium',
      persisted: true,
      stats: getRuntimeEventStats(),
    })
    emitRuntimeEvent('actionPendingApproval', {
      category: 'runtimeAction',
      source,
      action,
      actionId: action.actionId,
      roomId,
      confidence: confidence ?? 'medium',
      persisted: true,
      stats: getRuntimeEventStats(),
    })
  }

  return action
}

function summarizeActionResult(result) {
  return {
    ok: Boolean(result?.ok ?? true),
    live: result?.live ?? null,
    message: result?.message ?? null,
    address: result?.address ?? null,
    provider: result?.provider ?? null,
    state: result?.state ?? result?.lifecycleState ?? null,
    sendsCommands: result?.sendsCommands ?? null,
    runtimeMutated: result?.runtimeMutated ?? null,
  }
}

function completeRuntimeAction(action, result, state = 'completed') {
  const now = new Date().toISOString()
  const latencyMs = Math.max(0, Date.parse(now) - Date.parse(action.createdAt))
  const nextAction = {
    ...action,
    executed: state === 'completed',
    failed: state === 'failed',
    cancelled: state === 'cancelled',
    executionState: state,
    resultSummary: summarizeActionResult(result),
    updatedAt: now,
    latencyMs,
  }

  if (state === 'completed') {
    runtimeActionStats.completedActions += 1
    runtimeActionStats.averageActionLatency =
      runtimeActionStats.averageActionLatency === null
        ? latencyMs
        : runtimeActionStats.averageActionLatency * 0.85 + latencyMs * 0.15
  } else if (state === 'failed') {
    runtimeActionStats.failedActions += 1
  } else if (state === 'cancelled') {
    runtimeActionStats.cancelledActions += 1
  }

  pushRuntimeAction(nextAction)
  createRuntimeAuditEvent(nextAction, state === 'failed' ? 'actionFailed' : state === 'cancelled' ? 'actionCancelled' : 'actionExecuted', {
    executionState: state,
    resultSummary: nextAction.resultSummary,
  })
  emitRuntimeEvent(state === 'failed' ? 'actionFailed' : state === 'cancelled' ? 'actionCancelled' : 'actionExecuted', {
    category: 'runtimeAction',
    source: action.source,
    action: nextAction,
    actionId: action.actionId,
    roomId: action.roomId,
    confidence: action.confidence ?? 'medium',
    persisted: true,
    stats: getRuntimeEventStats(),
  })
  if (state === 'completed') {
    emitRuntimeEvent('actionExecutionCompleted', {
      category: 'runtimeAction',
      source: action.source,
      action: nextAction,
      actionId: action.actionId,
      roomId: action.roomId,
      confidence: action.confidence ?? 'medium',
      persisted: true,
      stats: getRuntimeEventStats(),
    })
  }

  return nextAction
}

async function executeApprovedRuntimeAction(action) {
  if (action.category === 'providerLifecycle') {
    const provider = action.target?.provider ?? action.payloadSummary?.provider
    const lifecycleAction = action.target?.action ?? action.payloadSummary?.action ?? action.type
    return integrationManager.updateProviderLifecycle(provider, lifecycleAction)
  }

  return {
    ok: false,
    message: `Approval execution is not implemented for ${action.category}/${action.type}`,
    runtimeMutated: false,
  }
}

async function approveRuntimeAction(actionId, approvalContext) {
  const action = findLatestRuntimeAction(actionId)
  if (!action) {
    return { ok: false, error: 'Runtime action not found' }
  }
  if (action.executionState !== 'pendingApproval') {
    return {
      ok: true,
      idempotent: true,
      action,
      executionState: action.executionState,
      message: 'Action is no longer pending approval',
    }
  }

  const approvedAction = {
    ...action,
    approved: true,
    approvalRequired: false,
    approvedAt: new Date().toISOString(),
    approvedBy: approvalContext.initiatedBy,
    approvedClientId: approvalContext.clientId,
    approvedSessionId: approvalContext.sessionId,
    executionState: 'approved',
    updatedAt: new Date().toISOString(),
  }
  pushRuntimeAction(approvedAction)
  createRuntimeAuditEvent(approvedAction, 'actionApproved', {
    approvedBy: approvalContext.initiatedBy,
    clientId: approvalContext.clientId,
    sessionId: approvalContext.sessionId,
  })
  emitRuntimeEvent('actionApproved', {
    category: 'runtimeAction',
    source: approvedAction.source,
    action: approvedAction,
    actionId,
    roomId: approvedAction.roomId,
    persisted: true,
    stats: getRuntimeEventStats(),
  })

  const queuedAction = {
    ...approvedAction,
    executionState: 'queued',
    updatedAt: new Date().toISOString(),
  }
  pushRuntimeAction(queuedAction)
  createRuntimeAuditEvent(queuedAction, 'actionQueued', { approved: true })
  const executingAction = {
    ...queuedAction,
    executionState: 'executing',
    updatedAt: new Date().toISOString(),
  }
  pushRuntimeAction(executingAction)
  createRuntimeAuditEvent(executingAction, 'actionExecuting', { approved: true })
  emitRuntimeEvent('actionExecutionStarted', {
    category: 'runtimeAction',
    source: executingAction.source,
    action: executingAction,
    actionId,
    roomId: executingAction.roomId,
    persisted: true,
    stats: getRuntimeEventStats(),
  })

  try {
    const result = await executeApprovedRuntimeAction(executingAction)
    completeRuntimeAction(executingAction, result, result?.ok === false ? 'failed' : 'completed')
    return {
      ok: true,
      actionId,
      executionState: result?.ok === false ? 'failed' : 'completed',
      result,
    }
  } catch (error) {
    completeRuntimeAction(
      executingAction,
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Approved runtime action failed',
      },
      'failed',
    )
    throw error
  }
}

function denyRuntimeAction(actionId, denialContext) {
  const action = findLatestRuntimeAction(actionId)
  if (!action) {
    return { ok: false, error: 'Runtime action not found' }
  }
  if (action.executionState !== 'pendingApproval') {
    return {
      ok: true,
      idempotent: true,
      action,
      executionState: action.executionState,
      message: 'Action is no longer pending approval',
    }
  }

  const deniedAction = {
    ...action,
    approved: false,
    denied: true,
    deniedAt: new Date().toISOString(),
    deniedBy: denialContext.initiatedBy,
    deniedClientId: denialContext.clientId,
    deniedSessionId: denialContext.sessionId,
    executionState: 'denied',
    updatedAt: new Date().toISOString(),
  }
  pushRuntimeAction(deniedAction)
  createRuntimeAuditEvent(deniedAction, 'actionDenied', {
    deniedBy: denialContext.initiatedBy,
    clientId: denialContext.clientId,
    sessionId: denialContext.sessionId,
  })
  emitRuntimeEvent('actionDenied', {
    category: 'runtimeAction',
    source: deniedAction.source,
    action: deniedAction,
    actionId,
    roomId: deniedAction.roomId,
    persisted: true,
    stats: getRuntimeEventStats(),
  })
  return {
    ok: true,
    actionId,
    executionState: 'denied',
    action: deniedAction,
    runtimeMutated: false,
  }
}

async function runRuntimeAction(actionOptions, executor) {
  const action = createRuntimeAction(actionOptions)
  if (action.executionState === 'pendingApproval') {
    return {
      ok: true,
      pendingApproval: true,
      action,
      actionId: action.actionId,
      executionState: action.executionState,
      policy: action.policy,
      runtimeMutated: false,
      message: 'Runtime action requires approval before execution',
    }
  }
  const queuedAction = {
    ...action,
    executionState: 'queued',
    approved: true,
    updatedAt: new Date().toISOString(),
  }
  pushRuntimeAction(queuedAction)
  createRuntimeAuditEvent(queuedAction, 'actionQueued', {
    executionState: queuedAction.executionState,
  })

  const executingAction = {
    ...queuedAction,
    executionState: 'executing',
    updatedAt: new Date().toISOString(),
  }
  pushRuntimeAction(executingAction)
  createRuntimeAuditEvent(executingAction, 'actionExecuting', {
    executionState: executingAction.executionState,
  })
  emitRuntimeEvent('actionExecutionStarted', {
    category: 'runtimeAction',
    source: action.source,
    action: executingAction,
    actionId: action.actionId,
    roomId: action.roomId,
    confidence: action.confidence ?? 'medium',
    persisted: true,
    stats: getRuntimeEventStats(),
  })

  try {
    const result = await executor()
    completeRuntimeAction(executingAction, result, 'completed')
    return result
  } catch (error) {
    completeRuntimeAction(
      executingAction,
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Runtime action failed',
      },
      'failed',
    )
    throw error
  }
}

async function restoreRuntimeActionHistory() {
  try {
    const raw = await readFile(runtimeActionsFile, 'utf8')
    const actions = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter((entry) => entry && typeof entry === 'object' && entry.actionId)
      .slice(-runtimeActionStats.persistence.retention.maxRecentActions)
    runtimeActionHistory.push(...actions)
    runtimeActionStats.persistence.restored = actions.length > 0
    runtimeActionStats.persistence.restoredActions = actions.length
    runtimeActionStats.persistence.restoredAt = actions.length > 0 ? new Date().toISOString() : null
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      runtimeActionStats.persistence.error =
        error instanceof Error ? error.message : 'Runtime action restore failed'
    }
  }
}

async function restoreRuntimeAuditHistory() {
  try {
    const raw = await readFile(runtimeAuditFile, 'utf8')
    const events = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter((entry) => entry && typeof entry === 'object' && entry.auditId)
      .slice(-500)
    runtimeAuditHistory.push(...events)
    runtimeActionStats.governance.auditEventCount = events.length
    runtimeActionStats.governance.latestAuditAt = events[events.length - 1]?.timestamp ?? null
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      runtimeActionStats.persistence.error =
        error instanceof Error ? error.message : 'Runtime audit restore failed'
    }
  }
}

function sanitizeCommandPayload(pathname, payload) {
  if (!pathname.startsWith('/api/integrations/')) {
    return payload
  }

  return Object.fromEntries(
    Object.entries(payload ?? {}).map(([key, value]) => {
      const lowerKey = key.toLowerCase()
      const isSecret =
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('api_key')

      return [key, isSecret ? '[redacted-presence-only]' : value]
    }),
  )
}

function logBridgeCommand(pathname, payload) {
  console.log(`[Bridge] ${pathname}`, sanitizeCommandPayload(pathname, payload))
}

function normalizeFeedbackTargets(payload) {
  const requestedTargets = Array.isArray(payload?.targets) ? payload.targets : []

  return requestedTargets
    .map((target) => ({
      room: String(target?.room ?? ''),
      zone: String(target?.zone ?? ''),
      label: String(target?.label ?? `${target?.room ?? 'Rom'} / ${target?.zone ?? 'Sone'}`),
      lightFeedback: target?.lightFeedback ? String(target.lightFeedback) : null,
      valueFeedback: target?.valueFeedback ? String(target.valueFeedback) : null,
    }))
    .filter((target) => target.room && target.zone && (target.lightFeedback || target.valueFeedback))
}

function normalizeClimateFeedbackTargets(payload) {
  const requestedTargets = Array.isArray(payload?.targets) ? payload.targets : []

  return requestedTargets
    .map((target) => {
      const room = String(target?.room ?? '')
      const label = String(target?.label ?? target?.room ?? 'Rom')

      if (Array.isArray(target?.points)) {
        return {
          room,
          label,
          points: target.points
            .map((point) => ({
              field: String(point?.field ?? ''),
              address: point?.address ? String(point.address) : '',
              dataType: String(point?.dataType ?? '1-byte'),
            }))
            .filter((point) => point.field && isConfiguredAddress(point.address)),
        }
      }

      return {
        room,
        label,
        points: [
          {
            field: 'temperature',
            address: target?.temperature ? String(target.temperature) : '',
            dataType: String(target?.temperatureDataType ?? '2-byte float'),
          },
          {
            field: 'setpointFeedback',
            address: target?.setpointFeedback ? String(target.setpointFeedback) : '',
            dataType: String(target?.setpointFeedbackDataType ?? '2-byte float'),
          },
          {
            field: 'heatDemand',
            address: target?.heatDemand ? String(target.heatDemand) : '',
            dataType: String(target?.heatDemandDataType ?? '1-byte'),
          },
          {
            field: 'modeFeedback',
            address: target?.modeFeedback ? String(target.modeFeedback) : '',
            dataType: String(target?.modeFeedbackDataType ?? '1-byte'),
          },
        ].filter((point) => isConfiguredAddress(point.address)),
      }
    })
    .filter((target) => target.room && target.points.length > 0)
}

function normalizeFeedbackMapping(payload) {
  const lights = normalizeFeedbackTargets({
    targets: payload?.feedbackMapping?.lights,
  })
  const climate = normalizeClimateFeedbackTargets({
    targets: payload?.feedbackMapping?.climate,
  })

  return {
    lights,
    climate,
  }
}

function getDptForDataType(dataType) {
  if (dataType === '1-bit') {
    return '1.001'
  }

  if (dataType === '2-byte float') {
    return CLIMATE_FLOAT_DPT
  }

  return '5.001'
}

function normalizeSignalLoggerPayload(payload) {
  const name = String(payload?.name ?? '').trim()
  const groupAddress = String(payload?.groupAddress ?? '').trim()
  const dataType = ['1-bit', '1-byte', '2-byte'].includes(payload?.dataType)
    ? payload.dataType
    : '1-byte'
  const dpt = String(
    payload?.dpt ??
      (dataType === '1-bit' ? '1.001' : dataType === '2-byte' ? CLIMATE_FLOAT_DPT : '5.001'),
  ).trim()
  const roomKey = String(payload?.roomKey ?? payload?.roomId ?? '').trim()
  const category = String(payload?.category ?? 'custom').trim() || 'custom'
  const updateMode = ['cyclic', 'onChange', 'manualPoll', 'unknown'].includes(payload?.updateMode)
    ? payload.updateMode
    : 'unknown'
  const expectedIntervalMs = Number(payload?.expectedIntervalMs)

  if (!name || !isConfiguredAddress(groupAddress)) {
    return null
  }

  const id = String(payload?.id ?? createHash('sha1')
    .update(`${name}:${groupAddress}:${dpt}:${roomKey}:${category}`)
    .digest('hex')
    .slice(0, 12))

  return {
    id,
    name,
    groupAddress,
    dataType,
    dpt,
    category,
    roomKey: roomKey || null,
    enabled: payload?.enabled === false ? false : true,
    updateMode,
    expectedIntervalMs: Number.isFinite(expectedIntervalMs) && expectedIntervalMs > 0
      ? Math.round(expectedIntervalMs)
      : null,
    createdAt: payload?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'custom-signal-logger',
  }
}

async function persistCustomSignalLoggers() {
  try {
    await mkdir(customSignalLoggerDirectory, { recursive: true })
    await writeFile(
      customSignalLoggerFile,
      JSON.stringify({
        updatedAt: new Date().toISOString(),
        loggers: Array.from(customSignalLoggers.values()),
      }, null, 2),
      'utf8',
    )
    customSignalLoggerDiagnostics.lastPersistAt = new Date().toISOString()
    customSignalLoggerDiagnostics.lastError = null
  } catch (error) {
    customSignalLoggerDiagnostics.lastError =
      error instanceof Error ? error.message : 'Could not persist custom signal loggers'
  }
}

async function restoreCustomSignalLoggers() {
  if (!existsSync(customSignalLoggerFile)) {
    return
  }

  try {
    const payload = JSON.parse(await readFile(customSignalLoggerFile, 'utf8'))
    const loggers = Array.isArray(payload?.loggers) ? payload.loggers : []
    customSignalLoggers.clear()
    for (const item of loggers) {
      const logger = normalizeSignalLoggerPayload(item)
      if (logger) {
        customSignalLoggers.set(logger.id, {
          ...logger,
          createdAt: item.createdAt ?? logger.createdAt,
          updatedAt: item.updatedAt ?? logger.updatedAt,
        })
      }
    }
    customSignalLoggerDiagnostics.restored = true
    customSignalLoggerDiagnostics.restoredCount = customSignalLoggers.size
    customSignalLoggerDiagnostics.restoredAt = new Date().toISOString()
    customSignalLoggerDiagnostics.lastError = null
  } catch (error) {
    customSignalLoggerDiagnostics.lastError =
      error instanceof Error ? error.message : 'Could not restore custom signal loggers'
  }
}

function getSignalLoggerTargets() {
  return Array.from(customSignalLoggers.values())
    .filter((logger) => logger.enabled && isConfiguredAddress(logger.groupAddress))
    .map((logger) => ({
      kind: 'customSignal',
      roomKey: logger.roomKey,
      zoneKey: null,
      label: logger.name,
      field: 'customSignal',
      signalLoggerId: logger.id,
      signalName: logger.name,
      signalCategory: logger.category,
      updateMode: logger.updateMode ?? 'unknown',
      expectedIntervalMs: logger.expectedIntervalMs ?? null,
      groupAddress: logger.groupAddress,
      dataType: logger.dataType,
      dpt: logger.dpt,
    }))
}

function mapOneBytePercentValue(rawValue) {
  const numericValue = Number(rawValue)

  if (!Number.isFinite(numericValue)) {
    return {
      value: null,
      mappingVariant: 'invalid',
    }
  }

  if (numericValue <= 100) {
    const percentValue = Math.max(0, Math.min(100, numericValue))
    return {
      value: Number(percentValue.toFixed(1)),
      mappingVariant: 'dpt-5.001-percent',
    }
  }

  if (numericValue <= 255) {
    const percentValue = Math.max(0, Math.min(100, (numericValue / 255) * 100))
    return {
      value: Number(percentValue.toFixed(1)),
      mappingVariant: 'dpt-5.001-raw-0-255',
    }
  }

  return {
    value: 100,
    mappingVariant: '1-byte-clamped-over-255',
  }
}

function mapClimateFeedbackValue(field, rawValue, dataType) {
  if (field === 'temperature' || field === 'setpointFeedback') {
    return {
      value: Number(Number(rawValue).toFixed(1)),
      mappingVariant: dataType === '2-byte float' ? '2-byte-float' : 'numeric',
    }
  }

  if (field === 'heatDemand') {
    if (dataType === '1-bit') {
      return {
        value: null,
        mappingVariant: 'ignored-1-bit-heatDemand',
      }
    }

    return mapOneBytePercentValue(rawValue)
  }

  if (dataType === '1-bit') {
    return {
      value: Boolean(rawValue),
      mappingVariant: '1-bit',
    }
  }

  if (dataType === '2-byte float') {
    return {
      value: Number(Number(rawValue).toFixed(1)),
      mappingVariant: '2-byte-float',
    }
  }

  return {
    value: Math.round(Number(rawValue)),
    mappingVariant: 'numeric',
  }
}

function getCacheEntry(groupAddress) {
  const address = String(groupAddress ?? '').trim()
  if (!address) {
    return null
  }

  const entry = knxGroupValueCache.get(address)
  if (!entry) {
    return null
  }

  const ageMs = Date.now() - entry.timestamp
  const freshness = getKnxFreshness(entry.field, entry.timestamp)
  return {
    ...entry,
    ageMs,
    stale: freshness.state === 'stale',
    freshness,
  }
}

function getKnxStalePolicy(field) {
  return KNX_STALE_POLICIES[field] ?? KNX_STALE_POLICIES.default
}

function getKnxFreshness(field, timestamp) {
  if (!timestamp) {
    return {
      state: 'unknown',
      ageMs: null,
      policy: getKnxStalePolicy(field),
    }
  }

  const policy = getKnxStalePolicy(field)
  const ageMs = Date.now() - timestamp
  const state =
    ageMs <= policy.freshMs
      ? 'fresh'
      : ageMs <= policy.agingMs
        ? 'aging'
        : ageMs <= policy.staleMs
          ? 'aging'
          : 'stale'

  return {
    state,
    ageMs,
    policy,
  }
}

function sanitizeRawKnxValue(value) {
  if (Buffer.isBuffer(value)) {
    return {
      type: 'buffer',
      hex: value.toString('hex'),
    }
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value
  }

  if (value === undefined) {
    return null
  }

  return String(value)
}

function pushRecentKnxTelegram(entry) {
  knxSubscriptionRuntime.recentTelegrams.unshift({
    groupAddress: entry.groupAddress,
    roomKey: entry.roomKey ?? null,
    zoneKey: entry.zoneKey ?? null,
    field: entry.field ?? null,
    dpt: entry.dpt,
    decodedValue: entry.decodedValue,
    mappingVariant: entry.mappingVariant ?? null,
    source: entry.source,
    timestamp: entry.at,
  })

  knxSubscriptionRuntime.recentTelegrams = knxSubscriptionRuntime.recentTelegrams.slice(0, 30)
}

function cacheKnxGroupValue(entry) {
  const timestamp = Date.now()
  const at = new Date(timestamp).toISOString()
  const previousEntry = knxGroupValueCache.get(entry.groupAddress) ?? null
  const previousFreshness = previousEntry ? getKnxFreshness(previousEntry.field, previousEntry.timestamp).state : 'unknown'
  const nextEntry = {
    kind: entry.kind ?? null,
    groupAddress: entry.groupAddress,
    dpt: entry.dpt,
    decodedValue: entry.decodedValue ?? null,
    rawValue: sanitizeRawKnxValue(entry.rawValue),
    roomKey: entry.roomKey ?? null,
    zoneKey: entry.zoneKey ?? null,
    label: entry.label ?? null,
    field: entry.field ?? null,
    dataType: entry.dataType ?? null,
    source: entry.source ?? 'knx-subscription',
    confidence: entry.confidence ?? 'high',
    quality: 'active',
    mappingVariant: entry.mappingVariant ?? null,
    responseSource: entry.responseSource ?? null,
    signalLoggerId: entry.signalLoggerId ?? null,
    signalName: entry.signalName ?? null,
    signalCategory: entry.signalCategory ?? null,
    timestamp,
    at,
  }

  knxGroupValueCache.set(nextEntry.groupAddress, nextEntry)
  knxSubscriptionRuntime.lastTelegramAt = at
  pushRecentKnxTelegram(nextEntry)
  pushKnxMonitorEvent({
    ...nextEntry,
    direction: nextEntry.responseSource === 'groupValueResponse' ? 'read' : 'feedback',
    signalType: nextEntry.field ?? nextEntry.kind ?? 'knx',
    relation: {
      type: nextEntry.responseSource === 'groupValueResponse' ? 'manualPollResponse' : 'roomTruthUpdated',
      label:
        nextEntry.responseSource === 'groupValueResponse'
          ? 'Manual poll response'
          : 'Room truth updated',
    },
  })

  if (nextEntry.field === 'lightFeedback' || nextEntry.field === 'valueFeedback') {
    const zoneKey = String(nextEntry.zoneKey ?? '')
    const existingFeedback = {
      room: nextEntry.roomKey,
      zone: zoneKey,
      label: nextEntry.label,
      lightOn: null,
      brightness: null,
      address: nextEntry.groupAddress,
      dataType: nextEntry.dataType,
      dpt: nextEntry.dpt,
      mappingVariant: nextEntry.mappingVariant,
      responseSource: nextEntry.responseSource,
    }

    if (nextEntry.field === 'lightFeedback') {
      existingFeedback.lightOn = Boolean(nextEntry.decodedValue)
    }

    if (nextEntry.field === 'valueFeedback') {
      existingFeedback.brightness =
        typeof nextEntry.decodedValue === 'number' ? nextEntry.decodedValue : null
    }

    runtimeStateStore.recordLightFeedback(existingFeedback, nextEntry.source)
  }

  if (
    ['temperature', 'setpointFeedback', 'heatDemand', 'modeFeedback'].includes(nextEntry.field)
  ) {
    runtimeStateStore.recordClimateFeedback(
      {
        roomKey: nextEntry.roomKey,
        field: nextEntry.field,
        address: nextEntry.groupAddress,
        rawValue: nextEntry.rawValue,
        mappedValue: nextEntry.decodedValue,
        dpt: nextEntry.dpt,
        dataType: nextEntry.dataType,
        mappingVariant: nextEntry.mappingVariant,
        responseSource: nextEntry.responseSource,
      },
      nextEntry.source,
    )
  }

  if (nextEntry.kind === 'customSignal' || nextEntry.field === 'customSignal') {
    runtimeStateStore.recordCustomSignalFeedback(
      {
        id: nextEntry.signalLoggerId,
        name: nextEntry.signalName ?? nextEntry.label,
        category: nextEntry.signalCategory ?? 'custom',
        roomKey: nextEntry.roomKey,
        groupAddress: nextEntry.groupAddress,
        dpt: nextEntry.dpt,
        dataType: nextEntry.dataType,
        rawValue: nextEntry.rawValue,
        mappedValue: nextEntry.decodedValue,
        mappingVariant: nextEntry.mappingVariant,
      },
      nextEntry.source,
    )

    if (nextEntry.signalCategory === 'shading') {
      const shadingId = String(nextEntry.signalLoggerId ?? '').replace(/^shading:/, '')
      shadingRuntimeState.lastFeedback = {
        shadingId,
        label: nextEntry.signalName ?? nextEntry.label,
        roomKey: nextEntry.roomKey,
        zoneKey: nextEntry.zoneKey,
        groupAddress: nextEntry.groupAddress,
        dpt: nextEntry.dpt,
        value: nextEntry.decodedValue,
        source: nextEntry.source,
        responseSource: nextEntry.responseSource,
        at: nextEntry.at,
        confidence: nextEntry.confidence,
      }
      shadingRuntimeState.pendingConfirmations = shadingRuntimeState.pendingConfirmations.filter(
        (pending) => pending.shadingId !== shadingId,
      )
    }
  }

  const nextFreshness = getKnxFreshness(nextEntry.field, nextEntry.timestamp).state
  const field =
    nextEntry.field === 'setpointFeedback'
      ? 'setpoint'
      : nextEntry.field === 'customSignal'
        ? `customSignal:${nextEntry.signalLoggerId ?? nextEntry.groupAddress}`
      : nextEntry.field === 'lightFeedback' || nextEntry.field === 'valueFeedback'
        ? 'brightness'
        : nextEntry.field
  const point =
    typeof nextEntry.decodedValue === 'number'
      ? {
          timestamp,
          at,
          roomKey: nextEntry.roomKey,
          roomId: nextEntry.roomKey,
          zoneKey: nextEntry.zoneKey,
          field,
          value: nextEntry.decodedValue,
          category: nextEntry.signalCategory === 'shading'
            ? 'shading'
            : nextEntry.field === 'temperature' || nextEntry.field === 'setpointFeedback' || nextEntry.field === 'heatDemand'
              ? 'climate'
              : 'runtime',
          confidence: nextEntry.confidence,
          source: nextEntry.source,
          groupAddress: nextEntry.groupAddress,
          dpt: nextEntry.dpt,
          dataType: nextEntry.dataType,
          mappingVariant: nextEntry.mappingVariant,
          responseSource: nextEntry.responseSource,
          signalName: nextEntry.signalName ?? null,
          signalCategory: nextEntry.signalCategory ?? null,
        }
      : null

  emitRuntimeEvent('knxValueUpdated', {
    roomId: nextEntry.roomKey,
    roomKey: nextEntry.roomKey,
    zoneKey: nextEntry.zoneKey,
    category: point?.category ?? 'runtime',
    source: nextEntry.source,
    groupAddress: nextEntry.groupAddress,
    dpt: nextEntry.dpt,
    dataType: nextEntry.dataType,
    field: nextEntry.field,
    normalizedField: field,
    value: nextEntry.decodedValue,
    confidence: nextEntry.confidence,
    responseSource: nextEntry.responseSource,
    updateToken: `${nextEntry.groupAddress}:${nextEntry.at}:${nextEntry.decodedValue}`,
  })

  if (point) {
    emitRuntimeEvent('historyPointAdded', {
      roomId: nextEntry.roomKey,
      category: point.category,
      source: nextEntry.source,
      groupAddress: nextEntry.groupAddress,
      dpt: nextEntry.dpt,
      dataType: nextEntry.dataType,
      confidence: nextEntry.confidence,
      responseSource: nextEntry.responseSource,
      point,
      updateToken: `${point.field}:${point.roomKey ?? 'house'}:${point.zoneKey ?? 'room'}:${point.timestamp}`,
    })
  }

  if (nextEntry.field === 'customSignal') {
    emitRuntimeEvent('signalLoggerPoint', {
      roomId: nextEntry.roomKey,
      category: nextEntry.signalCategory ?? 'custom',
      source: nextEntry.source,
      groupAddress: nextEntry.groupAddress,
      dpt: nextEntry.dpt,
      dataType: nextEntry.dataType,
      confidence: nextEntry.confidence,
      responseSource: nextEntry.responseSource,
      signalName: nextEntry.signalName ?? nextEntry.label,
      point,
    })
  } else if (nextEntry.roomKey) {
    emitRuntimeEvent('roomUpdated', {
      roomId: nextEntry.roomKey,
      roomKey: nextEntry.roomKey,
      category: point?.category ?? 'runtime',
      source: nextEntry.source,
      groupAddress: nextEntry.groupAddress,
      dpt: nextEntry.dpt,
      dataType: nextEntry.dataType,
      field: nextEntry.field,
      normalizedField: field,
      confidence: nextEntry.confidence,
      responseSource: nextEntry.responseSource,
    })
  }

  if (previousFreshness !== nextFreshness) {
    emitRuntimeEvent('runtimeFreshnessChanged', {
      roomId: nextEntry.roomKey,
      category: point?.category ?? 'runtime',
      source: 'knx-subscription-cache',
      groupAddress: nextEntry.groupAddress,
      dpt: nextEntry.dpt,
      dataType: nextEntry.dataType,
      field: nextEntry.field,
      normalizedField: field,
      previousFreshness,
      freshness: nextFreshness,
    })
  }
}

function getRuntimeShadingEntries() {
  return Array.isArray(runtimeSystemConfigState.systemConfig?.shading)
    ? runtimeSystemConfigState.systemConfig.shading
    : []
}

function getRuntimeRoomLabel(roomKey) {
  const room = Array.isArray(runtimeSystemConfigState.systemConfig?.rooms)
    ? runtimeSystemConfigState.systemConfig.rooms.find((candidate) => candidate.key === roomKey)
    : null

  return room?.name ?? roomKey ?? null
}

function normalizeShadingDpt(value, fallback, allowedDpts) {
  const configured = String(value ?? '').trim()
  if (!configured) {
    return {
      dpt: fallback,
      usedDefault: true,
      unsupportedDpt: null,
    }
  }

  if (allowedDpts.includes(configured)) {
    return {
      dpt: configured,
      usedDefault: false,
      unsupportedDpt: null,
    }
  }

  return {
    dpt: fallback,
    usedDefault: true,
    unsupportedDpt: configured,
  }
}

function createShadingActionAvailability(item) {
  const hasMove = isConfiguredAddress(item?.up) || isConfiguredAddress(item?.down)
  const hasStop = isConfiguredAddress(item?.stop)
  const hasPosition = isConfiguredAddress(item?.position)
  const hasFeedback = isConfiguredAddress(item?.feedbackPosition)
  const missingActions = []

  if (!hasMove) missingActions.push('moveUp/moveDown')
  if (!hasStop) missingActions.push('stop')
  if (!hasPosition) missingActions.push('setPosition')

  const availableActions = {
    moveUp: hasMove,
    moveDown: hasMove,
    stop: hasStop,
    setPosition: hasPosition,
  }
  const availableCount = Object.values(availableActions).filter(Boolean).length

  return {
    availableActions,
    missingActions,
    availableCount,
    hasFeedback,
    status: !item?.active
      ? 'disabled'
      : availableCount === 0
        ? 'missingMapping'
        : availableCount >= 3
          ? 'ready'
          : 'partial',
  }
}

function createShadingDiagnosticsEntry(item) {
  const availability = createShadingActionAvailability(item)
  const roomKey = String(item?.roomKey ?? '').trim()
  const configuredAddresses = [
    ['up', item?.up],
    ['down', item?.down],
    ['stop', item?.stop],
    ['position', item?.position],
    ['feedbackPosition', item?.feedbackPosition],
    ['windAlarm', item?.windAlarm],
    ['sunAuto', item?.sunAuto],
  ]
    .filter(([, groupAddress]) => isConfiguredAddress(groupAddress))
    .map(([field, groupAddress]) => ({ field, groupAddress: String(groupAddress).trim() }))
  const missingFields = []
  if (!availability.availableActions.moveUp) missingFields.push('opp/ned')
  if (!availability.availableActions.stop) missingFields.push('stopp')
  if (!availability.availableActions.setPosition) missingFields.push('posisjon')

  return {
    shadingId: item?.id ?? null,
    roomId: roomKey,
    roomName: getRuntimeRoomLabel(roomKey),
    zoneId: item?.zoneId ?? '',
    zoneName: item?.zoneName ?? item?.label ?? '',
    label: item?.label ?? 'Solskjerming',
    type: item?.type ?? 'screen',
    enabled: Boolean(item?.active),
    visible: Boolean(item?.active && (item?.visible ?? true)),
    maturity: item?.maturity ?? 'foundation',
    status: availability.status,
    statusLabel:
      availability.status === 'ready'
        ? 'Klar'
        : availability.status === 'partial'
          ? 'Delvis konfigurert'
          : availability.status === 'disabled'
            ? 'Deaktivert'
            : 'Mangler mapping',
    missingFields,
    missingMapping: availability.status === 'missingMapping',
    partialMapping: availability.status === 'partial',
    liveReady: availability.status === 'ready',
    configuredAddresses,
    availableActions: availability.availableActions,
    missingActions: availability.missingActions,
    defaultDpts: {
      upDown: item?.upDownDpt || '1.008',
      stop: item?.stopDpt || '1.007',
      position: item?.positionDpt || '5.001',
      feedbackPosition: item?.feedbackPositionDpt || '5.001',
    },
    dptDefaultsUsed: {
      upDown: !String(item?.upDownDpt ?? '').trim(),
      stop: !String(item?.stopDpt ?? '').trim(),
      position: !String(item?.positionDpt ?? '').trim(),
      feedbackPosition: !String(item?.feedbackPositionDpt ?? '').trim(),
    },
    invertUpDown: Boolean(item?.invertUpDown),
    invertPosition: Boolean(item?.invertPosition),
    directionSemantics: Boolean(item?.invertUpDown)
      ? 'Invertert: 1 = opp / 0 = ned'
      : 'Standard: 0 = opp / 1 = ned',
    positionSemantics: Boolean(item?.invertPosition)
      ? 'Invertert posisjon: sendt verdi = 100 - ønsket'
      : 'Standard posisjon: 0-100%',
  }
}

function getShadingDiagnostics() {
  const entries = getRuntimeShadingEntries().map(createShadingDiagnosticsEntry)
  const pendingConfirmations = shadingRuntimeState.pendingConfirmations.filter(
    (entry) => Date.now() - Date.parse(entry.sentAt ?? 0) < 10 * 60 * 1000,
  )
  shadingRuntimeState.pendingConfirmations = pendingConfirmations

  return {
    entryCount: entries.length,
    activeCount: entries.filter((entry) => entry.enabled).length,
    visibleCount: entries.filter((entry) => entry.visible).length,
    liveReadyCount: entries.filter((entry) => entry.liveReady).length,
    partialMappingCount: entries.filter((entry) => entry.partialMapping).length,
    missingMappingCount: entries.filter((entry) => entry.missingMapping).length,
    feedbackTargetCount: entries.filter((entry) =>
      entry.configuredAddresses.some((address) => address.field === 'feedbackPosition'),
    ).length,
    pendingConfirmationCount: pendingConfirmations.length,
    writeFailureCount: shadingRuntimeState.writeFailureCount,
    commandCount: shadingRuntimeState.commandCount,
    lastCommand: shadingRuntimeState.lastCommand,
    lastFeedback: shadingRuntimeState.lastFeedback,
    lastError: shadingRuntimeState.lastError,
    directionSummary: entries.map((entry) => ({
      shadingId: entry.shadingId,
      label: entry.label,
      directionSemantics: entry.directionSemantics,
      positionSemantics: entry.positionSemantics,
    })),
    entries,
  }
}

function getShadingFeedbackTargets() {
  return getRuntimeShadingEntries()
    .filter((item) => item?.active && isConfiguredAddress(item.feedbackPosition))
    .map((item) => {
      const dpt = normalizeShadingDpt(item.feedbackPositionDpt, '5.001', ['5.001'])
      const label = item.label || item.zoneName || 'Solskjerming'

      return {
        kind: 'customSignal',
        roomKey: item.roomKey,
        zoneKey: item.zoneId || item.id,
        label,
        field: 'customSignal',
        groupAddress: item.feedbackPosition,
        dataType: '1-byte',
        dpt: dpt.dpt,
        signalLoggerId: `shading:${item.id}`,
        signalName: `${label} posisjon`,
        signalCategory: 'shading',
        updateMode: 'onChange',
        staleRelevant: false,
      }
    })
}

function getKnxSubscriptionTargets() {
  const lights = runtimeConfig?.feedbackMapping?.lights ?? []
  const climate = runtimeConfig?.feedbackMapping?.climate ?? []
  const lightTargets = lights.flatMap((target) => {
    const targets = []

    if (isConfiguredAddress(target.lightFeedback)) {
      targets.push({
        kind: 'light',
        roomKey: target.room,
        zoneKey: target.zone,
        label: target.label,
        field: 'lightFeedback',
        groupAddress: target.lightFeedback,
        dataType: '1-bit',
        dpt: '1.001',
      })
    }

    if (isConfiguredAddress(target.valueFeedback)) {
      targets.push({
        kind: 'light',
        roomKey: target.room,
        zoneKey: target.zone,
        label: target.label,
        field: 'valueFeedback',
        groupAddress: target.valueFeedback,
        dataType: '1-byte',
        dpt: '5.001',
      })
    }

    return targets
  })
  const climateTargets = climate.flatMap((target) =>
    target.points.map((point) => ({
      kind: 'climate',
      roomKey: target.room,
      label: target.label,
      field: point.field,
      groupAddress: point.address,
      dataType: point.dataType,
      dpt: getDptForDataType(point.dataType),
    })),
  )

  return [...lightTargets, ...climateTargets, ...getSignalLoggerTargets(), ...getShadingFeedbackTargets()]
}

function getKnxRoomPollTargets(roomId) {
  const roomKey = String(roomId ?? '').trim()
  if (!roomKey) {
    return []
  }

  return getKnxSubscriptionTargets().filter((target) => target.roomKey === roomKey)
}

function classifyKnxPollFailure(error) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return 'timeout'
  }

  if (lowerMessage.includes('dpt') || lowerMessage.includes('decode') || lowerMessage.includes('datapoint')) {
    return 'invalidDpt'
  }

  return 'noResponse'
}

function countByClassification(groups) {
  return groups.reduce((counts, group) => {
    const key = group.failureType ?? (group.skipped ? 'skippedEmptyAddress' : 'noResponse')
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})
}

function mapKnxSubscriptionValue(target, rawValue) {
  if (target.kind === 'customSignal') {
    if (target.dataType === '1-bit' || target.dpt?.startsWith('1.')) {
      return {
        value: Boolean(rawValue),
        mappingVariant: 'custom-1-bit',
      }
    }

    if (target.dataType === '2-byte' || target.dpt === CLIMATE_FLOAT_DPT) {
      return {
        value: Number(Number(rawValue).toFixed(1)),
        mappingVariant: 'custom-2-byte-float',
      }
    }

    return {
      value: Number(rawValue),
      mappingVariant: target.dpt === '5.001' ? 'custom-dpt-5.001' : 'custom-numeric',
    }
  }

  if (target.field === 'lightFeedback') {
    return {
      value: Boolean(rawValue),
      mappingVariant: '1-bit',
    }
  }

  if (target.field === 'valueFeedback') {
    return mapOneBytePercentValue(rawValue)
  }

  return mapClimateFeedbackValue(target.field, rawValue, target.dataType)
}

function getRuntimeShadingEntryById(shadingId) {
  const id = String(shadingId ?? '').trim()
  return getRuntimeShadingEntries().find((entry) => entry.id === id) ?? null
}

function createShadingMoveWrite(item, action) {
  const up = String(item?.up ?? '').trim()
  const down = String(item?.down ?? '').trim()
  const invert = Boolean(item?.invertUpDown)
  const dpt = normalizeShadingDpt(item?.upDownDpt, '1.008', ['1.001', '1.007', '1.008'])

  if (!isConfiguredAddress(up) && !isConfiguredAddress(down)) {
    return {
      ok: false,
      skippedReason: 'missingMapping',
      error: 'Opp/ned mangler gruppeadresse',
    }
  }

  if (isConfiguredAddress(up) && isConfiguredAddress(down) && up !== down) {
    const logicalAddress =
      action === 'moveUp'
        ? invert ? down : up
        : invert ? up : down

    return {
      ok: true,
      groupAddress: logicalAddress,
      dpt: dpt.dpt,
      dptDefaultUsed: dpt.usedDefault,
      unsupportedDpt: dpt.unsupportedDpt,
      value: true,
      directionSemantics: invert
        ? 'Separate adresser invertert: Opp bruker ned-GA, ned bruker opp-GA'
        : 'Separate adresser: kommando sender true til valgt GA',
    }
  }

  const groupAddress = up || down
  const logicalDown = action === 'moveDown'
  const value = invert ? !logicalDown : logicalDown

  return {
    ok: true,
    groupAddress,
    dpt: dpt.dpt,
    dptDefaultUsed: dpt.usedDefault,
    unsupportedDpt: dpt.unsupportedDpt,
    value,
    directionSemantics: invert ? 'Invertert shared GA: 1 = opp / 0 = ned' : 'Shared GA: 0 = opp / 1 = ned',
  }
}

function buildShadingActionPlan(payload = {}) {
  const shadingId = String(payload?.shadingId ?? '').trim()
  const action = String(payload?.action ?? '').trim()
  const item = getRuntimeShadingEntryById(shadingId)
  const allowedActions = ['moveUp', 'moveDown', 'stop', 'setPosition']
  const timestamp = new Date().toISOString()

  if (!item) {
    return {
      ok: false,
      timestamp,
      shadingId,
      action,
      skippedReason: 'notFound',
      error: 'Solskjerming finnes ikke i server-owned SystemConfig',
    }
  }

  if (!allowedActions.includes(action)) {
    return {
      ok: false,
      timestamp,
      shadingId,
      action,
      item: createShadingDiagnosticsEntry(item),
      skippedReason: 'invalidAction',
      error: 'Shading action må være moveUp, moveDown, stop eller setPosition',
    }
  }

  const diagnosticsEntry = createShadingDiagnosticsEntry(item)
  if (!item.active) {
    return {
      ok: false,
      timestamp,
      shadingId,
      action,
      item: diagnosticsEntry,
      skippedReason: 'disabled',
      error: 'Solskjerming er deaktivert',
    }
  }

  let write = null
  if (action === 'moveUp' || action === 'moveDown') {
    write = createShadingMoveWrite(item, action)
  } else if (action === 'stop') {
    const dpt = normalizeShadingDpt(item.stopDpt, '1.007', ['1.001', '1.007', '1.008'])
    write = isConfiguredAddress(item.stop)
      ? {
          ok: true,
          groupAddress: String(item.stop).trim(),
          dpt: dpt.dpt,
          dptDefaultUsed: dpt.usedDefault,
          unsupportedDpt: dpt.unsupportedDpt,
          value: true,
          directionSemantics: 'Stop/step: sender true til stopp-GA',
        }
      : {
          ok: false,
          skippedReason: 'missingMapping',
          error: 'Stopp mangler gruppeadresse',
        }
  } else if (action === 'setPosition') {
    const dpt = normalizeShadingDpt(item.positionDpt, '5.001', ['5.001'])
    const requestedValue = Number(payload?.value)
    if (!Number.isFinite(requestedValue)) {
      write = {
        ok: false,
        skippedReason: 'invalidValue',
        error: 'Posisjon krever numerisk verdi 0-100',
      }
    } else {
      const clamped = Math.max(0, Math.min(100, Math.round(requestedValue)))
      const value = item.invertPosition ? 100 - clamped : clamped
      write = isConfiguredAddress(item.position)
        ? {
            ok: true,
            groupAddress: String(item.position).trim(),
            dpt: dpt.dpt,
            dptDefaultUsed: dpt.usedDefault,
            unsupportedDpt: dpt.unsupportedDpt,
            requestedValue: clamped,
            value,
            directionSemantics: item.invertPosition
              ? 'Invertert posisjon: sendt verdi = 100 - ønsket'
              : 'Standard posisjon: 0-100%',
          }
        : {
            ok: false,
            skippedReason: 'missingMapping',
            error: 'Posisjon mangler gruppeadresse',
          }
    }
  }

  if (write?.unsupportedDpt) {
    return {
      ok: false,
      timestamp,
      shadingId,
      action,
      item: diagnosticsEntry,
      skippedReason: 'unsupportedDpt',
      error: `DPT ${write.unsupportedDpt} er ikke støttet for denne solskjermingskommandoen`,
      write,
    }
  }

  return {
    ok: Boolean(write?.ok),
    timestamp,
    shadingId,
    action,
    label: item.label ?? 'Solskjerming',
    roomKey: item.roomKey ?? null,
    roomName: getRuntimeRoomLabel(item.roomKey),
    zoneKey: item.zoneId || item.id,
    zoneName: item.zoneName || item.label,
    type: item.type ?? 'screen',
    item: diagnosticsEntry,
    write,
    sendsCommands: Boolean(write?.ok),
    feedback: isConfiguredAddress(item.feedbackPosition)
      ? {
          groupAddress: String(item.feedbackPosition).trim(),
          dpt: normalizeShadingDpt(item.feedbackPositionDpt, '5.001', ['5.001']).dpt,
          expected: true,
        }
      : {
          groupAddress: null,
          dpt: null,
          expected: false,
        },
    skippedReason: write?.ok ? null : write?.skippedReason ?? 'missingMapping',
    error: write?.ok ? null : write?.error ?? 'Solskjerming mangler skrive-mapping',
  }
}

async function executeShadingActionPlan(plan, context = {}) {
  if (!plan?.ok || !plan.write?.ok) {
    throw new Error(plan?.error ?? 'Solskjerming kan ikke styres uten gyldig mapping')
  }

  const monitorContext = {
    source: context.source ?? 'api/knx/shading',
    field: plan.action === 'setPosition' ? 'shadingPositionWrite' : 'shadingCommandWrite',
    signalType: plan.action === 'setPosition' ? 'shadingPositionWrite' : 'shadingCommandWrite',
    roomKey: plan.roomKey,
    roomName: plan.roomName,
    zoneKey: plan.zoneKey,
    zoneName: plan.zoneName,
    confidence: 'medium',
    relation: {
      type: context.relationType ?? 'manualShadingCommand',
      label: context.relationLabel ?? 'Manual shading command',
      shadingId: plan.shadingId,
      action: plan.action,
    },
  }

  if (plan.action === 'setPosition') {
    await sendKnxShadingPercentWrite(plan.write.groupAddress, plan.write.value, plan.write.dpt, monitorContext)
  } else {
    await sendKnxShadingBitWrite(plan.write.groupAddress, plan.write.value, plan.write.dpt, monitorContext)
  }

  const completedAt = new Date().toISOString()
  const result = {
    ok: true,
    action: plan.action,
    shadingId: plan.shadingId,
    label: plan.label,
    roomKey: plan.roomKey,
    zoneKey: plan.zoneKey,
    groupAddress: plan.write.groupAddress,
    dpt: plan.write.dpt,
    value: plan.write.value,
    requestedValue: plan.write.requestedValue ?? plan.write.value,
    feedbackExpected: Boolean(plan.feedback?.expected),
    feedbackGroupAddress: plan.feedback?.groupAddress ?? null,
    sendsCommands: true,
    source: context.source ?? 'api/knx/shading',
    timestamp: completedAt,
  }

  shadingRuntimeState.commandCount += 1
  shadingRuntimeState.lastCommand = result
  shadingRuntimeState.lastError = null
  shadingRuntimeState.executionHistory.unshift(result)
  shadingRuntimeState.executionHistory = shadingRuntimeState.executionHistory.slice(0, 30)
  if (result.feedbackExpected) {
    shadingRuntimeState.pendingConfirmations.unshift({
      shadingId: plan.shadingId,
      action: plan.action,
      groupAddress: result.groupAddress,
      feedbackGroupAddress: result.feedbackGroupAddress,
      sentAt: completedAt,
      value: result.requestedValue,
    })
    shadingRuntimeState.pendingConfirmations = shadingRuntimeState.pendingConfirmations.slice(0, 30)
  }

  emitRuntimeEvent('shadingCommandSent', {
    category: 'shading',
    source: result.source,
    roomId: plan.roomKey,
    roomKey: plan.roomKey,
    zoneKey: plan.zoneKey,
    groupAddress: result.groupAddress,
    dpt: result.dpt,
    confidence: result.feedbackExpected ? 'medium' : 'low',
    action: result,
    replayable: true,
  })

  return result
}

async function handleShadingAction(payload, context = {}) {
  const plan = buildShadingActionPlan(payload)
  if (payload?.dryRun) {
    return {
      ok: plan.ok,
      dryRun: true,
      sendsCommands: false,
      plan,
      diagnostics: getShadingDiagnostics(),
      error: plan.ok ? null : plan.error,
    }
  }

  if (!plan.ok) {
    shadingRuntimeState.lastError = {
      at: new Date().toISOString(),
      shadingId: plan.shadingId,
      action: plan.action,
      skippedReason: plan.skippedReason,
      error: plan.error,
    }
    return {
      ok: false,
      dryRun: false,
      sendsCommands: false,
      plan,
      diagnostics: getShadingDiagnostics(),
      error: plan.error,
    }
  }

  try {
    const result = await executeShadingActionPlan(plan, context)
    return {
      ok: true,
      dryRun: false,
      sendsCommands: true,
      plan,
      result,
      diagnostics: getShadingDiagnostics(),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Solskjerming write feilet'
    shadingRuntimeState.writeFailureCount += 1
    shadingRuntimeState.lastError = {
      at: new Date().toISOString(),
      shadingId: plan.shadingId,
      action: plan.action,
      error: message,
    }
    throw error
  }
}

function normalizeSingleActionDpt(value) {
  const dpt = String(value ?? '').trim()
  if (['1.001', '5.001', '9.001', '20.102'].includes(dpt)) {
    return dpt
  }
  return null
}

function getDataTypeForDpt(dpt) {
  if (dpt === '1.001') return '1-bit'
  if (dpt === '9.001') return '2-byte'
  return '1-byte'
}

function mapSingleGaValue(dpt, rawValue) {
  if (dpt === '1.001') {
    return { value: Boolean(rawValue), mappingVariant: 'single-ga-1.001' }
  }
  if (dpt === '5.001') {
    const mapped = mapOneBytePercentValue(rawValue)
    return { ...mapped, mappingVariant: `single-ga-${mapped.mappingVariant}` }
  }
  if (dpt === '9.001') {
    return {
      value: Number(Number(rawValue).toFixed(1)),
      mappingVariant: 'single-ga-9.001',
    }
  }
  if (dpt === '20.102') {
    return {
      value: Number(rawValue),
      mappingVariant: 'single-ga-20.102',
    }
  }
  return { value: rawValue, mappingVariant: 'single-ga-raw' }
}

function findSignalLoggerByGroupAddress(groupAddress) {
  const address = String(groupAddress ?? '').trim()
  return Array.from(customSignalLoggers.values()).find(
    (logger) => logger.enabled && logger.groupAddress === address,
  ) ?? null
}

function pushSingleGaActionHistory(entry) {
  knxSingleActionState.lastAction = entry
  knxSingleActionState.history.unshift(entry)
  knxSingleActionState.history = knxSingleActionState.history.slice(0, 30)
}

async function handleSingleGaPoll(payload) {
  const groupAddress = String(payload?.groupAddress ?? '').trim()
  const dpt = normalizeSingleActionDpt(payload?.dpt)
  const startedAt = Date.now()
  const timestamp = new Date(startedAt).toISOString()

  if (!isConfiguredAddress(groupAddress) || !dpt) {
    throw new Error('Single poll krever gyldig gruppeadresse og støttet DPT')
  }

  const logger = findSignalLoggerByGroupAddress(groupAddress)
  const rawValue = await withKnxConnection(
    (connection) => readDatapointValue(connection, groupAddress, dpt),
    { timeoutMs: KNX_READ_TIMEOUT_MS + 1000 },
  )
  const mapped = mapSingleGaValue(dpt, rawValue)

  if (logger) {
    cacheKnxGroupValue({
      kind: 'customSignal',
      field: 'customSignal',
      groupAddress,
      dpt,
      dataType: logger.dataType,
      decodedValue: mapped.value,
      rawValue,
      mappingVariant: mapped.mappingVariant,
      source: 'manualTool',
      responseSource: 'groupValueResponse',
      confidence: 'medium',
      roomKey: logger.roomKey,
      signalLoggerId: logger.id,
      signalName: logger.name,
      signalCategory: logger.category,
      label: logger.name,
    })
  }

  const result = {
    ok: true,
    action: 'poll',
    groupAddress,
    dpt,
    dataType: logger?.dataType ?? getDataTypeForDpt(dpt),
    rawValue: sanitizeRawKnxValue(rawValue),
    decodedValue: mapped.value,
    mappingVariant: mapped.mappingVariant,
    source: 'manualTool',
    responseSource: 'groupValueResponse',
    loggedToHistory: Boolean(logger),
    signalLoggerId: logger?.id ?? null,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
  }
  pushSingleGaActionHistory(result)
  return result
}

async function handleSingleGaWrite(payload) {
  const groupAddress = String(payload?.groupAddress ?? '').trim()
  const dpt = normalizeSingleActionDpt(payload?.dpt)
  const value = payload?.value
  const startedAt = Date.now()

  if (!isConfiguredAddress(groupAddress) || !dpt) {
    throw new Error('Single write krever gyldig gruppeadresse og støttet DPT')
  }
  if (dpt !== '1.001' && !Number.isFinite(Number(value))) {
    throw new Error('Single write krever numerisk verdi for valgt DPT')
  }

  if (dpt === '1.001') {
    await sendKnxBitWrite(groupAddress, Boolean(value === true || value === 'true' || Number(value) > 0), {
      source: 'manualTool',
      field: 'singleGaWrite',
      signalType: 'singleGaWrite',
      relation: { type: 'manualTool', label: 'KNX Single Action write' },
    })
  } else if (dpt === '5.001') {
    await sendKnxBytePercentWrite(groupAddress, Number(value), {
      source: 'manualTool',
      field: 'singleGaWrite',
      signalType: 'singleGaWrite',
      relation: { type: 'manualTool', label: 'KNX Single Action write' },
    })
  } else if (dpt === '9.001') {
    await sendKnxFloatWrite(groupAddress, Number(value), {
      source: 'manualTool',
      field: 'singleGaWrite',
      signalType: 'singleGaWrite',
      relation: { type: 'manualTool', label: 'KNX Single Action write' },
    })
  } else if (dpt === '20.102') {
    throw new Error('Single write for DPT 20.102 er ikke aktivert fordi eksisterende mode-write ikke bruker denne DPT-en ennå')
  }

  const result = {
    ok: true,
    action: 'write',
    groupAddress,
    dpt,
    value,
    source: 'manualTool',
    debugWrite: true,
    sendsCommands: true,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    message: 'Single GA debug write sent',
  }
  pushSingleGaActionHistory(result)
  return result
}

function formatGroupAddressFromInteger(value) {
  return `${(value >> 11) & 0x1f}/${(value >> 8) & 0x07}/${value & 0xff}`
}

function decodeKnxDpt9Float(highByte, lowByte) {
  const raw = ((highByte & 0xff) << 8) | (lowByte & 0xff)
  const exponent = (raw >> 11) & 0x0f
  let mantissa = raw & 0x07ff
  if (mantissa & 0x0400) {
    mantissa -= 0x0800
  }
  return Number((0.01 * mantissa * (2 ** exponent)).toFixed(2))
}

function decodeEtsValue(bytes, dpt) {
  const payload = bytes.slice(11)
  if (dpt === '1.001') {
    return Boolean((bytes[10] ?? 0) & 0x01)
  }
  if (dpt === '5.001') {
    const raw = payload[0] ?? null
    const mapped = raw === null ? { value: null, mappingVariant: 'missing-payload' } : mapOneBytePercentValue(raw)
    return mapped.value
  }
  if (dpt === '9.001') {
    return payload.length >= 2 ? decodeKnxDpt9Float(payload[0], payload[1]) : null
  }
  if (dpt === '20.102') {
    return payload[0] ?? null
  }
  return payload.length === 1 ? payload[0] : payload.map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function decodeEtsRawTelegram(rawData, targetMap) {
  const raw = String(rawData ?? '').trim()
  const bytes = raw.match(/[0-9a-fA-F]{2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? []
  if (bytes.length < 11) {
    return null
  }
  const destination = ((bytes[6] ?? 0) << 8) | (bytes[7] ?? 0)
  const groupAddress = formatGroupAddressFromInteger(destination)
  const target = targetMap.get(groupAddress) ?? null
  const dpt = target?.dpt ?? null
  return {
    groupAddress,
    dpt,
    decodedValue: dpt ? decodeEtsValue(bytes, dpt) : null,
    payloadHex: bytes.slice(11).map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase(),
    rawData: raw,
    target,
  }
}

function collectRuntimeAddressMap() {
  const map = new Map()
  for (const target of getKnxSubscriptionTargets()) {
    if (isConfiguredAddress(target.groupAddress)) {
      map.set(target.groupAddress, {
        kind: target.kind ?? 'subscription',
        field: target.field,
        roomKey: target.roomKey ?? null,
        zoneKey: target.zoneKey ?? null,
        label: target.label ?? null,
        dpt: target.dpt,
        dataType: target.dataType,
        direction: 'read',
      })
    }
  }

  for (const point of runtimeConfig?.writeMapping?.lights ?? []) {
    for (const [field, address, dpt] of [
      ['lightWrite', point.lightAddress, '1.001'],
      ['valueWrite', point.valueAddress, '5.001'],
    ]) {
      if (isConfiguredAddress(address) && !map.has(address)) {
        map.set(address, {
          kind: 'writeMapping',
          field,
          roomKey: point.room,
          zoneKey: point.zone,
          label: point.label,
          dpt,
          dataType: field === 'lightWrite' ? '1-bit' : '1-byte',
          direction: 'write',
        })
      }
    }
  }

  for (const point of runtimeConfig?.writeMapping?.climate ?? []) {
    if (isConfiguredAddress(point.setpointAddress) && !map.has(point.setpointAddress)) {
      map.set(point.setpointAddress, {
        kind: 'writeMapping',
        field: 'setpointWrite',
        roomKey: point.room,
        zoneKey: null,
        label: point.label,
        dpt: CLIMATE_FLOAT_DPT,
        dataType: '2-byte float',
        direction: 'write',
      })
    }
  }
  return map
}

function getAcceptedHistoryFieldsForTarget(target) {
  if (!target?.field) return []
  if (target.field === 'setpointFeedback') return ['setpoint', 'setpointFeedback']
  if (target.field === 'lightFeedback' || target.field === 'valueFeedback') {
    return ['brightness', target.field]
  }
  return [target.field]
}

function runEtsHistoryAudit() {
  const auditedAt = new Date().toISOString()
  const targetMap = collectRuntimeAddressMap()
  const runtimeHistory = runtimeStateStore.getHistory({ limit: 5000, range: 'week', category: 'all' })
  const runtimePoints = Array.isArray(runtimeHistory.points) ? runtimeHistory.points : []
  const runtimeByGa = runtimePoints.reduce((map, point) => {
    if (!point.groupAddress) return map
    const key = String(point.groupAddress)
    map.set(key, [...(map.get(key) ?? []), point])
    return map
  }, new Map())

  let xml = ''
  try {
    xml = readFileSync(etsMonitorFile, 'utf8')
  } catch (error) {
    const result = {
      ok: false,
      auditedAt,
      source: 'ETS_monitor.xml',
      error: error instanceof Error ? error.message : 'ETS_monitor.xml could not be read',
      path: etsMonitorFile,
    }
    etsAuditState.latest = result
    etsAuditState.lastError = result.error
    return result
  }

  const events = []
  const telegramRegex = /<Telegram\b([^>]*)\/>/g
  let match = telegramRegex.exec(xml)
  while (match) {
    const attrs = match[1]
    const timestamp = /Timestamp="([^"]+)"/.exec(attrs)?.[1] ?? null
    const rawData = /RawData="([^"]+)"/.exec(attrs)?.[1] ?? null
    const decoded = decodeEtsRawTelegram(rawData, targetMap)
    if (decoded) {
      events.push({ timestamp, ...decoded })
    }
    match = telegramRegex.exec(xml)
  }

  const etsByGa = events.reduce((map, event) => {
    map.set(event.groupAddress, [...(map.get(event.groupAddress) ?? []), event])
    return map
  }, new Map())
  const targetGaps = Array.from(targetMap.entries()).map(([groupAddress, target]) => {
    const etsEvents = etsByGa.get(groupAddress) ?? []
    const points = runtimeByGa.get(groupAddress) ?? []
    const acceptedFields = getAcceptedHistoryFieldsForTarget(target)
    const fieldMismatchCount = points.filter(
      (point) => acceptedFields.length > 0 && !acceptedFields.includes(point.field),
    ).length
    const dptMismatchCount = points.filter(
      (point) => target.dpt && point.dpt && point.dpt !== target.dpt,
    ).length
    return {
      groupAddress,
      field: target.field,
      roomKey: target.roomKey,
      zoneKey: target.zoneKey,
      label: target.label,
      dpt: target.dpt,
      direction: target.direction,
      etsCount: etsEvents.length,
      runtimeCount: points.length,
      latestEtsAt: etsEvents[etsEvents.length - 1]?.timestamp ?? null,
      latestRuntimeAt: points[points.length - 1]?.at ?? null,
      seenInEtsMissingInRuntime: etsEvents.length > 0 && points.length === 0 && target.direction === 'read',
      suspectedDedupeDrop: etsEvents.length > Math.max(2, points.length * 2) && target.direction === 'read',
      fieldMismatchCount,
      dptMismatchCount,
    }
  })
  const unknownGaEvents = Array.from(etsByGa.entries())
    .filter(([groupAddress]) => !targetMap.has(groupAddress))
    .map(([groupAddress, items]) => ({
      groupAddress,
      count: items.length,
      latestAt: items[items.length - 1]?.timestamp ?? null,
      latestPayloadHex: items[items.length - 1]?.payloadHex ?? null,
    }))
    .sort((a, b) => b.count - a.count)
  const runtimeNotEts = Array.from(runtimeByGa.entries())
    .filter(([groupAddress]) => !etsByGa.has(groupAddress))
    .map(([groupAddress, points]) => ({
      groupAddress,
      count: points.length,
      latestAt: points[points.length - 1]?.at ?? null,
      field: points[points.length - 1]?.field ?? null,
      source: points[points.length - 1]?.source ?? null,
    }))

  const result = {
    ok: true,
    auditedAt,
    source: 'ETS_monitor.xml',
    path: etsMonitorFile,
    etsTelegramCount: events.length,
    runtimePointCount: runtimePoints.length,
    runtimeTargetCount: targetMap.size,
    summary: {
      seenInEtsMissingInRuntime: targetGaps.filter((item) => item.seenInEtsMissingInRuntime).length,
      suspectedDedupeDrops: targetGaps.filter((item) => item.suspectedDedupeDrop).length,
      wrongFieldMappings: targetGaps.filter((item) => item.fieldMismatchCount > 0).length,
      wrongDptMappings: targetGaps.filter((item) => item.dptMismatchCount > 0).length,
      unknownGaEventCount: unknownGaEvents.length,
      runtimeNotInEtsCount: runtimeNotEts.length,
    },
    watchedGroups: ['1/1/2', '1/1/7', '0/1/4', '0/1/7', '0/1/9'].map((groupAddress) => ({
      groupAddress,
      etsCount: etsByGa.get(groupAddress)?.length ?? 0,
      runtimeCount: runtimeByGa.get(groupAddress)?.length ?? 0,
      latestEtsAt: etsByGa.get(groupAddress)?.at(-1)?.timestamp ?? null,
      latestRuntimeAt: runtimeByGa.get(groupAddress)?.at(-1)?.at ?? null,
      latestRuntimeSource: runtimeByGa.get(groupAddress)?.at(-1)?.source ?? null,
    })),
    missingRuntimeDatapoints: targetGaps.filter((item) => item.seenInEtsMissingInRuntime).slice(0, 25),
    suspectedDedupeDrops: targetGaps.filter((item) => item.suspectedDedupeDrop).slice(0, 25),
    wrongFieldMappings: targetGaps.filter((item) => item.fieldMismatchCount > 0).slice(0, 25),
    wrongDptMappings: targetGaps.filter((item) => item.dptMismatchCount > 0).slice(0, 25),
    unknownGaEvents: unknownGaEvents.slice(0, 25),
    runtimeOnlyDatapoints: runtimeNotEts.slice(0, 25),
  }
  etsAuditState.latest = result
  etsAuditState.lastError = null
  return result
}

async function handleKnxRoomPoll(roomId) {
  const roomKey = String(roomId ?? '').trim()
  const startedAt = Date.now()
  const timestamp = new Date(startedAt).toISOString()
  const previousPoll = knxRoomPollState.get(roomKey) ?? null
  const nextAllowedAt = previousPoll?.lastPollAt
    ? Date.parse(previousPoll.lastPollAt) + KNX_ROOM_POLL_RATE_LIMIT_MS
    : 0

  if (!roomKey) {
    return {
      ok: false,
      roomId: roomKey,
      requestedGroups: [],
      updatedGroups: [],
      failedGroups: [],
      timestamp,
      durationMs: 0,
      rateLimit: {
        limited: false,
        windowMs: KNX_ROOM_POLL_RATE_LIMIT_MS,
        nextAllowedAt: null,
      },
      error: 'Mangler roomId',
    }
  }

  if (Date.now() < nextAllowedAt) {
    const retryAfterMs = Math.max(0, nextAllowedAt - Date.now())
    const result = {
      ok: false,
      roomId: roomKey,
      requestedGroups: [],
      updatedGroups: [],
      failedGroups: [],
      timestamp,
      durationMs: Date.now() - startedAt,
      rateLimit: {
        limited: true,
        windowMs: KNX_ROOM_POLL_RATE_LIMIT_MS,
        retryAfterMs,
        nextAllowedAt: new Date(nextAllowedAt).toISOString(),
      },
      error: 'Rommet ble nylig pollet. Vent litt før neste manuelle lesing.',
    }

    knxRoomPollState.set(roomKey, {
      ...previousPoll,
      roomId: roomKey,
      lastAttemptAt: timestamp,
      lastError: result.error,
      rateLimited: true,
    })
    return result
  }

  const targets = getKnxRoomPollTargets(roomKey)
  const skippedGroups = getKnxSubscriptionTargets()
    .filter((target) => target.roomKey === roomKey && !isConfiguredAddress(target.groupAddress))
    .map((target) => ({
      groupAddress: target.groupAddress ?? '',
      field: target.field,
      dpt: target.dpt,
      dataType: target.dataType,
      zoneKey: target.zoneKey ?? null,
      label: target.label ?? null,
      failureType: target.groupAddress ? 'notConfigured' : 'skippedEmptyAddress',
      skipped: true,
      error: target.groupAddress ? 'not configured' : 'empty address',
    }))
  const requestedGroups = targets.map((target) => ({
    groupAddress: target.groupAddress,
    field: target.field,
    dpt: target.dpt,
    dataType: target.dataType,
    zoneKey: target.zoneKey ?? null,
    label: target.label ?? null,
  }))

  if (targets.length === 0) {
    const result = {
      ok: false,
      roomId: roomKey,
      requestedGroups,
      updatedGroups: [],
      failedGroups: [],
      skippedGroups,
      timestamp,
      durationMs: Date.now() - startedAt,
      rateLimit: {
        limited: false,
        windowMs: KNX_ROOM_POLL_RATE_LIMIT_MS,
        nextAllowedAt: null,
      },
      error: 'Ingen KNX feedback-mapping er konfigurert for dette rommet.',
    }

    knxRoomPollState.set(roomKey, {
      roomId: roomKey,
      lastAttemptAt: timestamp,
      lastPollAt: null,
      lastError: result.error,
      rateLimited: false,
      requestedGroups,
      updatedGroups: [],
      failedGroups: [],
      skippedGroups,
      diagnostics: {
        realFailedCount: 0,
        skippedCount: skippedGroups.length,
        failedCount: 0,
        classifications: countByClassification(skippedGroups),
      },
    })
    return result
  }

  const updatedGroups = []
  const failedGroups = []

  await withKnxConnection(async (connection) => {
    for (const target of targets) {
      try {
        console.log('[Bridge] Manual room poll read', {
          roomId: roomKey,
          groupAddress: target.groupAddress,
          field: target.field,
          dpt: target.dpt,
        })

        const rawValue = await readDatapointValue(connection, target.groupAddress, target.dpt)
        const mappedValue = mapKnxSubscriptionValue(target, rawValue)

        cacheKnxGroupValue({
          ...target,
          rawValue,
          decodedValue: mappedValue.value,
          mappingVariant: mappedValue.mappingVariant,
          source: 'manualPoll',
          responseSource: 'groupValueResponse',
          confidence: 'medium',
        })

        updatedGroups.push({
          groupAddress: target.groupAddress,
          field: target.field,
          label: target.label ?? null,
          dpt: target.dpt,
          dataType: target.dataType,
          zoneKey: target.zoneKey ?? null,
          decodedValue: mappedValue.value,
          mappingVariant: mappedValue.mappingVariant,
          source: 'manualPoll',
          responseSource: 'groupValueResponse',
        })
      } catch (error) {
        const failureType = classifyKnxPollFailure(error)
        failedGroups.push({
          groupAddress: target.groupAddress,
          field: target.field,
          label: target.label ?? null,
          dpt: target.dpt,
          dataType: target.dataType,
          zoneKey: target.zoneKey ?? null,
          failureType,
          error: error instanceof Error ? error.message : String(error),
        })
      }

      await sleep(150)
    }
  }, {
    timeoutMs: Math.max(KNX_WRITE_TIMEOUT_MS, targets.length * (KNX_READ_TIMEOUT_MS + 500)),
  })

  const realFailedGroups = failedGroups.filter((group) =>
    ['noResponse', 'timeout', 'invalidDpt'].includes(group.failureType),
  )
  const completedAt = new Date().toISOString()
  const result = {
    ok: realFailedGroups.length === 0,
    roomId: roomKey,
    requestedGroups,
    updatedGroups,
    failedGroups: realFailedGroups,
    skippedGroups,
    timestamp: completedAt,
    durationMs: Date.now() - startedAt,
    rateLimit: {
      limited: false,
      windowMs: KNX_ROOM_POLL_RATE_LIMIT_MS,
      nextAllowedAt: new Date(Date.now() + KNX_ROOM_POLL_RATE_LIMIT_MS).toISOString(),
    },
    source: 'manualPoll',
    busRead: true,
    globalPoll: false,
    diagnostics: {
      realFailedCount: realFailedGroups.length,
      skippedCount: skippedGroups.length,
      failedCount: failedGroups.length,
      classifications: countByClassification([...failedGroups, ...skippedGroups]),
    },
  }

  knxRoomPollState.set(roomKey, {
    roomId: roomKey,
    lastAttemptAt: timestamp,
    lastPollAt: completedAt,
    lastError: realFailedGroups.length > 0 ? `${realFailedGroups.length} grupper feilet` : null,
    rateLimited: false,
    requestedGroups,
    updatedGroups,
    failedGroups: realFailedGroups,
    skippedGroups,
    durationMs: result.durationMs,
    nextAllowedAt: result.rateLimit.nextAllowedAt,
  })

  emitRuntimeEvent('pollCompleted', {
    roomId: roomKey,
    roomKey,
    category: 'runtime',
    source: 'manualPoll',
    confidence: realFailedGroups.length === 0 ? 'high' : 'medium',
    requestedCount: requestedGroups.length,
    updatedCount: updatedGroups.length,
    failedCount: realFailedGroups.length,
    skippedCount: skippedGroups.length,
    durationMs: result.durationMs,
    poll: result,
  })

  return result
}

function stopKnxSubscriptionRuntime(reason = 'runtime-config-change') {
  if (knxSubscriptionRuntime.pendingRestart) {
    clearTimeout(knxSubscriptionRuntime.pendingRestart)
    knxSubscriptionRuntime.pendingRestart = null
  }

  if (!knxSubscriptionRuntime.connection) {
    knxSubscriptionRuntime = {
      ...knxSubscriptionRuntime,
      active: false,
      stoppedAt: new Date().toISOString(),
    }
    runtimeSoakMetrics.runtimeRestartCount += reason.includes('restart') || reason.includes('config')
      ? 1
      : 0
    return
  }

  const connection = knxSubscriptionRuntime.connection
  try {
    connection.Disconnect(() => {
      console.log('[Bridge] Stopped KNX subscription runtime', { reason })
    })
  } catch (error) {
    console.log('[Bridge] KNX subscription runtime disconnect failed', {
      reason,
      error: error?.message ?? String(error),
    })
  }

  knxSubscriptionRuntime = {
    ...knxSubscriptionRuntime,
    active: false,
    connection: null,
    datapoints: [],
    stoppedAt: new Date().toISOString(),
  }
  runtimeSoakMetrics.runtimeRestartCount += reason.includes('restart') || reason.includes('config')
    ? 1
    : 0
}

function getKnxSubscriptionFingerprint(targets, connectionMode) {
  const connectionTarget =
    runtimeConfig?.[runtimeConfig.connectionMode] ?? runtimeConfig?.localDirect ?? {}
  const payload = {
    connectionMode,
    gatewayHost: connectionTarget.host ?? null,
    gatewayPort: connectionTarget.port ?? null,
    targets: targets
      .map((target) => ({
        kind: target.kind,
        roomKey: target.roomKey,
        zoneKey: target.zoneKey ?? null,
        field: target.field,
        groupAddress: target.groupAddress,
        dpt: target.dpt,
        dataType: target.dataType,
      }))
      .sort((a, b) =>
        `${a.groupAddress}:${a.field}:${a.roomKey}:${a.zoneKey ?? ''}`.localeCompare(
          `${b.groupAddress}:${b.field}:${b.roomKey}:${b.zoneKey ?? ''}`,
        ),
      ),
  }

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16)
}

function openKnxSubscriptionRuntime(targets, fingerprint, reason) {
  const connectionMode = runtimeConfig?.connectionMode ?? null

  if (connectionMode !== 'localDirect') {
    knxSubscriptionRuntime = {
      ...knxSubscriptionRuntime,
      active: false,
      targets,
      fingerprint,
      error: null,
      stoppedAt: new Date().toISOString(),
    }
    return
  }

  if (targets.length === 0) {
    knxSubscriptionRuntime = {
      ...knxSubscriptionRuntime,
      active: false,
      targets,
      fingerprint,
      error: null,
      stoppedAt: new Date().toISOString(),
    }
    return
  }

  const connection = createKnxConnection()
  knxSubscriptionRuntime = {
    active: false,
    connection,
    datapoints: [],
    targets,
    fingerprint,
    pendingRestart: null,
    lastTelegramAt: knxSubscriptionRuntime.lastTelegramAt,
    startedAt: new Date().toISOString(),
    stoppedAt: null,
    error: null,
    recentTelegrams: knxSubscriptionRuntime.recentTelegrams ?? [],
  }

  connection.on('connected', () => {
    if (runtimeSoakMetrics.lastKnxConnectedAt || runtimeSoakMetrics.lastKnxDisconnectedAt) {
      runtimeSoakMetrics.knxReconnectCount += 1
    }
    runtimeSoakMetrics.lastKnxConnectedAt = new Date().toISOString()
    knxSubscriptionRuntime.active = true
    knxSubscriptionRuntime.error = null
    console.log('[Bridge] KNX subscription runtime active', {
      targetCount: targets.length,
      connectionMode,
      fingerprint,
      reason,
    })
    updateRuntimeProviderReadiness('knx-subscription-connected')

    for (const target of targets) {
      const datapoint = new Datapoint(
        { ga: target.groupAddress, dpt: target.dpt, autoread: false },
        connection,
      )

      datapoint.on('change', (_oldValue, newValue, ga) => {
        const mappedValue = mapKnxSubscriptionValue(target, newValue)
        cacheKnxGroupValue({
          ...target,
          groupAddress: ga ?? target.groupAddress,
          rawValue: newValue,
          decodedValue: mappedValue.value,
          mappingVariant: mappedValue.mappingVariant,
          source: 'knx-subscription',
          confidence: 'high',
        })
      })

      knxSubscriptionRuntime.datapoints.push(datapoint)
    }
  })

  connection.on('error', (error) => {
    knxSubscriptionRuntime.active = false
    knxSubscriptionRuntime.error = error?.message ?? String(error)
    console.log('[Bridge] KNX subscription runtime error', {
      error: knxSubscriptionRuntime.error,
    })
    updateRuntimeProviderReadiness('knx-subscription-error')
  })

  connection.on('disconnected', () => {
    knxSubscriptionRuntime.active = false
    runtimeSoakMetrics.knxDisconnectCount += 1
    runtimeSoakMetrics.lastKnxDisconnectedAt = new Date().toISOString()
    console.log('[Bridge] KNX subscription runtime disconnected')
    updateRuntimeProviderReadiness('knx-subscription-disconnected')
  })

  console.log('[Bridge] Opening KNX subscription runtime', {
    targetCount: targets.length,
    fingerprint,
    reason,
    gatewayHost: getActiveConnectionTarget().host,
    gatewayPort: getActiveConnectionTarget().port,
  })
  connection.Connect()
}

function startKnxSubscriptionRuntime(reason = 'runtime-config') {
  const targets = getKnxSubscriptionTargets()
  updateRuntimeConfigDiagnostics(runtimeConfigDiagnostics.runtimeConfigSource, `start-knx:${reason}`)
  const connectionMode = runtimeConfig?.connectionMode ?? null
  const nextFingerprint = getKnxSubscriptionFingerprint(targets, connectionMode)
  const previousFingerprint = knxSubscriptionRuntime.fingerprint
  const sameConfig = previousFingerprint === nextFingerprint

  if (sameConfig && knxSubscriptionRuntime.connection) {
    knxSubscriptionRuntime.targets = targets
    console.log('[Bridge] KNX subscription runtime unchanged', {
      fingerprint: nextFingerprint,
      active: knxSubscriptionRuntime.active,
      targetCount: targets.length,
      reason,
    })
    return getKnxSubscriptionRuntimeSummary()
  }

  if (knxSubscriptionRuntime.pendingRestart) {
    clearTimeout(knxSubscriptionRuntime.pendingRestart)
    knxSubscriptionRuntime.pendingRestart = null
  }

  const shouldDebounce =
    Boolean(previousFingerprint) &&
    previousFingerprint !== nextFingerprint &&
    Boolean(knxSubscriptionRuntime.connection)

  if (!shouldDebounce) {
    if (knxSubscriptionRuntime.connection && previousFingerprint !== nextFingerprint) {
      stopKnxSubscriptionRuntime(reason)
    }
    openKnxSubscriptionRuntime(targets, nextFingerprint, reason)
    return getKnxSubscriptionRuntimeSummary()
  }

  console.log('[Bridge] KNX subscription runtime config changed; restart scheduled', {
    previousFingerprint,
    nextFingerprint,
    reason,
  })

  knxSubscriptionRuntime.pendingRestart = setTimeout(() => {
    stopKnxSubscriptionRuntime(reason)
    openKnxSubscriptionRuntime(targets, nextFingerprint, reason)
  }, 750)

  return {
    ...getKnxSubscriptionRuntimeSummary(),
    pendingRestart: true,
    previousFingerprint,
    nextFingerprint,
  }
}

function getKnxSubscriptionRuntimeSummary() {
  const entries = Array.from(knxGroupValueCache.values())
  const staleGroups = entries.filter((entry) => getKnxFreshness(entry.field, entry.timestamp).state === 'stale')
  const freshnessCounts = entries.reduce(
    (counts, entry) => {
      const state = getKnxFreshness(entry.field, entry.timestamp).state
      counts[state] = (counts[state] ?? 0) + 1
      return counts
    },
    { fresh: 0, aging: 0, stale: 0, unknown: 0 },
  )
  const heatDemandEntries = entries.filter((entry) => entry.field === 'heatDemand')

  return {
    active: knxSubscriptionRuntime.active,
    connectionMode: runtimeConfig?.connectionMode ?? null,
    fingerprint: knxSubscriptionRuntime.fingerprint,
    pendingRestart: Boolean(knxSubscriptionRuntime.pendingRestart),
    targetCount: knxSubscriptionRuntime.targets.length,
    cachedGroupCount: entries.length,
    lastTelegramAt: knxSubscriptionRuntime.lastTelegramAt,
    startedAt: knxSubscriptionRuntime.startedAt,
    stoppedAt: knxSubscriptionRuntime.stoppedAt,
    error: knxSubscriptionRuntime.error,
    staleGroupCount: staleGroups.length,
    freshnessCounts,
    stalePolicies: KNX_STALE_POLICIES,
    heatDemandParser: {
      dpt: '5.001',
      status: 'active',
      mapping: 'raw 0-255 or percent-like 0-100 -> 0-100%',
      cachedCount: heatDemandEntries.length,
      latest:
        heatDemandEntries
          .sort((a, b) => b.timestamp - a.timestamp)
          .map((entry) => ({
            roomKey: entry.roomKey,
            groupAddress: entry.groupAddress,
            decodedValue: entry.decodedValue,
            mappingVariant: entry.mappingVariant,
            at: entry.at,
          }))[0] ?? null,
    },
    setpointStrategies: Array.from(
      runtimeConfig?.writeMapping?.climateByRoom?.values?.() ?? [],
    ).map((point) => ({
      roomKey: point.room,
      label: point.label,
      strategy: point.setpointWriteStrategy ?? 'absoluteTemperature',
      setpointAddress: point.setpointAddress,
      setpointDataType: point.setpointDataType ?? '2-byte float',
      offsetEnabled: false,
    })),
  }
}

function getKnxStatePayload() {
  const entries = Array.from(knxGroupValueCache.values()).map((entry) =>
    getCacheEntry(entry.groupAddress),
  )

  return {
    ok: true,
    source: 'knx-subscription-cache',
    timestamp: new Date().toISOString(),
    subscription: getKnxSubscriptionRuntimeSummary(),
    groups: entries,
  }
}

function getKnxSubscriptionsPayload() {
  return {
    ok: true,
    source: 'knx-subscription-runtime',
    timestamp: new Date().toISOString(),
    runtime: getKnxSubscriptionRuntimeSummary(),
    targets: knxSubscriptionRuntime.targets.map((target) => ({
      kind: target.kind,
      roomKey: target.roomKey,
      zoneKey: target.zoneKey ?? null,
      label: target.label,
      field: target.field,
      groupAddress: target.groupAddress,
      dpt: target.dpt,
      dataType: target.dataType,
      cached: Boolean(getCacheEntry(target.groupAddress)),
      stale: getCacheEntry(target.groupAddress)?.stale ?? true,
      freshness: getCacheEntry(target.groupAddress)?.freshness ?? {
        state: 'unknown',
        ageMs: null,
        policy: getKnxStalePolicy(target.field),
      },
    })),
  }
}

function getKnxDiagnosticsPayload() {
  const state = getKnxStatePayload()
  const runtime = state.subscription
  const knxConnected = Boolean(runtime.active && !runtime.error)
  const feedbackMappingCounts = getFeedbackMappingCounts()
  const targetBuildDiagnostics = {
    runtimeConfigReceived: runtimeConfigDiagnostics.runtimeConfigReceived,
    runtimeConfigSource: runtimeConfigDiagnostics.runtimeConfigSource,
    lastRuntimeConfigAt: runtimeConfigDiagnostics.lastRuntimeConfigAt,
    targetBuildAttempted: runtimeConfigDiagnostics.targetBuildAttempted,
    targetBuildCount: runtimeConfigDiagnostics.targetBuildCount,
    targetBuildErrors: runtimeConfigDiagnostics.targetBuildErrors,
    whyTargetCountZero:
      runtime.targetCount > 0 ? null : runtimeConfigDiagnostics.whyTargetCountZero ?? 'unknown',
    feedbackMappingCounts,
    latestPayloadSummary: runtimeConfigDiagnostics.latestPayloadSummary,
    latestPayloadSizeBytes: runtimeConfigDiagnostics.latestPayloadSizeBytes,
    runtimeConfigPostReceivedAt: runtimeConfigDiagnostics.runtimeConfigPostReceivedAt,
    runtimeConfigPostPayloadBytes: runtimeConfigDiagnostics.runtimeConfigPostPayloadBytes,
    runtimeConfigPostParsed: runtimeConfigDiagnostics.runtimeConfigPostParsed,
    runtimeConfigPostError: runtimeConfigDiagnostics.runtimeConfigPostError,
    latestValidConfigAt: runtimeConfigDiagnostics.latestValidConfigAt,
    latestValidConfigAgeMs: runtimeConfigDiagnostics.latestValidConfigAgeMs,
    persistedConfigPath: runtimeConfigDiagnostics.persistedConfigPath,
    persistedConfigRestored: runtimeConfigDiagnostics.persistedConfigRestored,
    persistedConfigError: runtimeConfigDiagnostics.persistedConfigError,
    restoredConfigIntegrity: runtimeConfigDiagnostics.restoredConfigIntegrity,
    missingClimateMappings: runtimeConfigDiagnostics.missingClimateMappings,
    restoredRoomCount: runtimeConfigDiagnostics.restoredRoomCount,
    restoredClimateWriteCount: runtimeConfigDiagnostics.restoredClimateWriteCount,
    restoredClimateFeedbackCount: runtimeConfigDiagnostics.restoredClimateFeedbackCount,
    restoredLightCount: runtimeConfigDiagnostics.restoredLightCount,
    restoredDimCount: runtimeConfigDiagnostics.restoredDimCount,
    soakMetrics: getRuntimeSoakMetrics(),
  }
  return {
    ok: true,
    source: 'knx-subscription-runtime',
    timestamp: new Date().toISOString(),
    ...targetBuildDiagnostics,
    runtime,
    writePath: {
      status: knxConnected ? 'ready' : 'knxUnavailable',
      mappingCounts: getWriteMappingCounts(),
      actionPipelineBlocking: false,
      localKnxWriteAutoApprove: true,
      connectionState: knxConnected ? 'connected' : runtime.error ? 'unavailable' : 'standby',
    },
    runtimeConfig: targetBuildDiagnostics,
    monitor: getKnxMonitorDiagnostics(),
    shading: getShadingDiagnostics(),
    recentTelegrams: knxSubscriptionRuntime.recentTelegrams,
    staleGroups: state.groups
      .filter((entry) => entry?.stale)
      .map((entry) => ({
        groupAddress: entry.groupAddress,
        roomKey: entry.roomKey,
        field: entry.field,
        at: entry.at,
        ageMs: entry.ageMs,
      })),
    roomPolls: Array.from(knxRoomPollState.values()).map((poll) => ({
      roomId: poll.roomId,
      lastAttemptAt: poll.lastAttemptAt ?? null,
      lastPollAt: poll.lastPollAt ?? null,
      lastError: poll.lastError ?? null,
      rateLimited: Boolean(poll.rateLimited),
      nextAllowedAt: poll.nextAllowedAt ?? null,
      durationMs: poll.durationMs ?? null,
      requestedGroups: poll.requestedGroups ?? [],
      updatedGroups: poll.updatedGroups ?? [],
      failedGroups: poll.failedGroups ?? [],
      skippedGroups: poll.skippedGroups ?? [],
      diagnostics: {
        realFailedCount: (poll.failedGroups ?? []).filter((group) =>
          ['noResponse', 'timeout', 'invalidDpt'].includes(group.failureType ?? 'noResponse'),
        ).length,
        skippedCount: (poll.skippedGroups ?? []).length,
      },
    })),
    signalLoggers: {
      count: customSignalLoggers.size,
      activeCount: getSignalLoggerTargets().length,
      persistence: customSignalLoggerDiagnostics,
      loggers: Array.from(customSignalLoggers.values()).map((logger) => ({
        id: logger.id,
        name: logger.name,
        groupAddress: logger.groupAddress,
        dataType: logger.dataType,
        dpt: logger.dpt,
        category: logger.category,
        roomKey: logger.roomKey,
        updateMode: logger.updateMode ?? 'unknown',
        expectedIntervalMs: logger.expectedIntervalMs ?? null,
        enabled: logger.enabled,
        createdAt: logger.createdAt,
        updatedAt: logger.updatedAt ?? null,
        cached: Boolean(getCacheEntry(logger.groupAddress)),
        lastValue: getCacheEntry(logger.groupAddress)?.decodedValue ?? null,
        lastSeenAt: getCacheEntry(logger.groupAddress)?.at ?? null,
      })),
    },
    singleGaActions: {
      lastAction: knxSingleActionState.lastAction,
      history: knxSingleActionState.history.slice(0, 10),
      supportsPoll: true,
      supportsWrite: true,
      supportedDpts: ['1.001', '5.001', '9.001', '20.102'],
      debugOnly: true,
    },
    monitor: getKnxMonitorDiagnostics(),
    etsAudit: etsAuditState.latest ?? {
      ok: null,
      source: 'ETS_monitor.xml',
      path: etsMonitorFile,
      lastError: etsAuditState.lastError,
      message: 'Audit ikke kjørt ennå',
    },
  }
}

function getSignalLoggersPayload() {
  return {
    ok: true,
    source: 'knx-custom-signal-loggers',
    timestamp: new Date().toISOString(),
    sendsCommands: false,
    persistence: customSignalLoggerDiagnostics,
    loggers: Array.from(customSignalLoggers.values()).map((logger) => ({
      ...logger,
      cached: Boolean(getCacheEntry(logger.groupAddress)),
      lastValue: getCacheEntry(logger.groupAddress)?.decodedValue ?? null,
      lastSeenAt: getCacheEntry(logger.groupAddress)?.at ?? null,
    })),
  }
}

function createKnxConnection() {
  const connectionTarget = getActiveConnectionTarget()
  const connectionMode = getCurrentConnectionMode()

  console.log('[Bridge] Preparing KNX connection', {
    connectionMode,
    gatewayHost: connectionTarget.host,
    gatewayPort: connectionTarget.port,
  })

  return new knx.Connection({
    ipAddr: connectionTarget.host,
    ipPort: connectionTarget.port,
    manualConnect: true,
    loglevel: 'error',
  })
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withKnxConnection(runCommand, { timeoutMs = KNX_WRITE_TIMEOUT_MS } = {}) {
  const connectionTarget = getActiveConnectionTarget()
  const connectionMode = getCurrentConnectionMode()
  const connection = createKnxConnection()

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error('KNX connection timeout'))
    }, timeoutMs)

    const cleanup = () => {
      clearTimeout(timeoutId)
      connection.off('connected', handleConnected)
      connection.off('error', handleError)
      connection.off('disconnected', handleDisconnected)
    }

    const finish = (callback) => {
      connection.Disconnect(() => {
        cleanup()
        callback()
      })
    }

    const handleConnected = async () => {
      try {
        const result = await runCommand(connection)
        finish(() => resolve(result))
      } catch (error) {
        finish(() => reject(error))
      }
    }

    const handleError = (error) => {
      finish(() =>
        reject(new Error(`KNX connection error: ${error?.message ?? String(error)}`)),
      )
    }

    const handleDisconnected = () => {
      console.log('[Bridge] KNX connection closed')
    }

    connection.on('connected', handleConnected)
    connection.on('error', handleError)
    connection.on('disconnected', handleDisconnected)

    console.log('[Bridge] Opening KNX/IP tunneling connection', {
      connectionMode,
      gatewayHost: connectionTarget.host,
      gatewayPort: connectionTarget.port,
    })

    connection.Connect()
  })
}

function writeGroupValue(connection, groupAddress, value, dpt) {
  return new Promise((resolve, reject) => {
    try {
      connection.write(groupAddress, value, dpt, () => {
        resolve()
      })
    } catch (error) {
      reject(error)
    }
  })
}

function readDatapointValue(connection, groupAddress, dpt) {
  return new Promise((resolve, reject) => {
    const datapoint = new Datapoint({ ga: groupAddress, dpt }, connection)
    const timeoutId = setTimeout(() => {
      reject(new Error(`KNX feedback timeout for ${groupAddress}`))
    }, KNX_READ_TIMEOUT_MS)

    try {
      datapoint.read((_src, value) => {
        clearTimeout(timeoutId)
        resolve(value)
      })
    } catch (error) {
      clearTimeout(timeoutId)
      reject(error)
    }
  })
}

function stopLightFeedbackSubscription(subscriptionId) {
  const subscription = lightFeedbackSubscriptions.get(subscriptionId)

  if (!subscription) {
    return
  }

  if (subscription.stopTimer) {
    clearTimeout(subscription.stopTimer)
    subscription.stopTimer = null
  }

  for (const client of subscription.clients) {
    try {
      client.end()
    } catch {
      // Ignore client shutdown errors.
    }
  }

  subscription.clients.clear()

  try {
    subscription.connection.Disconnect(() => {
      console.log('[Bridge] Stopped localDirect light subscription', {
        subscriptionId,
        view: subscription.view,
      })
    })
  } catch {
    // Ignore disconnect errors during shutdown.
  }

  lightFeedbackSubscriptions.delete(subscriptionId)
}

function scheduleLightFeedbackSubscriptionStop(subscriptionId) {
  const subscription = lightFeedbackSubscriptions.get(subscriptionId)

  if (!subscription || subscription.clients.size > 0 || subscription.stopTimer) {
    return
  }

  subscription.stopTimer = setTimeout(() => {
    stopLightFeedbackSubscription(subscriptionId)
  }, 2000)
}

function stopClimateFeedbackSubscription(subscriptionId) {
  const subscription = climateFeedbackSubscriptions.get(subscriptionId)

  if (!subscription) {
    return
  }

  if (subscription.stopTimer) {
    clearTimeout(subscription.stopTimer)
    subscription.stopTimer = null
  }

  for (const client of subscription.clients) {
    try {
      client.end()
    } catch {
      // Ignore client shutdown errors.
    }
  }

  subscription.clients.clear()

  try {
    subscription.connection.Disconnect(() => {
      console.log('[Bridge] Stopped localDirect climate subscription', {
        subscriptionId,
        view: subscription.view,
        roomCount: subscription.targets.length,
        pointCount: subscription.targets.reduce(
          (count, target) => count + target.points.length,
          0,
        ),
      })
    })
  } catch {
    // Ignore disconnect errors during shutdown.
  }

  climateFeedbackSubscriptions.delete(subscriptionId)
}

function scheduleClimateFeedbackSubscriptionStop(subscriptionId) {
  const subscription = climateFeedbackSubscriptions.get(subscriptionId)

  if (!subscription || subscription.clients.size > 0 || subscription.stopTimer) {
    return
  }

  subscription.stopTimer = setTimeout(() => {
    stopClimateFeedbackSubscription(subscriptionId)
  }, 2000)
}

function createLightFeedbackSubscription(targets, view) {
  const connectionMode = getCurrentConnectionMode()

  if (connectionMode !== 'localDirect') {
    console.log('[Bridge] Rejecting subscribe feedback strategy for non-localDirect mode', {
      connectionMode,
      strategy: 'off',
      view,
    })
    throw new Error('Subscribe-basert lys-feedback krever localDirect')
  }

  const subscriptionId = randomUUID()
  const connection = createKnxConnection()
  const subscription = {
    id: subscriptionId,
    view,
    targets,
    connection,
    clients: new Set(),
    latestFeedbackByZone: new Map(),
    stopTimer: null,
  }

  lightFeedbackSubscriptions.set(subscriptionId, subscription)

  connection.on('connected', () => {
    console.log('[Bridge] LocalDirect light feedback subscribed', {
      subscriptionId,
      view,
      addressCount: targets.reduce(
        (count, target) => count + (target.lightFeedback ? 1 : 0) + (target.valueFeedback ? 1 : 0),
        0,
      ),
      zoneCount: targets.length,
    })

    for (const target of targets) {
      const zoneKey = `${target.room}:${target.zone}`

      if (target.lightFeedback) {
        console.log('[Bridge] Subscribing to light feedback address', {
          subscriptionId,
          address: target.lightFeedback,
          label: target.label,
        })

        const datapoint = new Datapoint(
          { ga: target.lightFeedback, dpt: '1.001', autoread: false },
          connection,
        )

        datapoint.on('change', (_oldValue, newValue, ga) => {
          const existing = subscription.latestFeedbackByZone.get(zoneKey) ?? {
            room: target.room,
            zone: target.zone,
            label: target.label,
            lightOn: null,
            brightness: null,
          }
          const payload = {
            ...existing,
            lightOn: Boolean(newValue),
          }

          subscription.latestFeedbackByZone.set(zoneKey, payload)
          runtimeStateStore.recordLightFeedback(payload, 'light-subscribe')
          console.log('[Bridge] Light feedback event received', {
            subscriptionId,
            address: ga,
            label: target.label,
            value: payload.lightOn,
          })

          for (const client of subscription.clients) {
            sendSseEvent(client, 'light-feedback', payload)
          }
        })
      }

      if (target.valueFeedback) {
        console.log('[Bridge] Subscribing to brightness feedback address', {
          subscriptionId,
          address: target.valueFeedback,
          label: target.label,
        })

        const datapoint = new Datapoint(
          { ga: target.valueFeedback, dpt: '5.001', autoread: false },
          connection,
        )

        datapoint.on('change', (_oldValue, newValue, ga) => {
          const existing = subscription.latestFeedbackByZone.get(zoneKey) ?? {
            room: target.room,
            zone: target.zone,
            label: target.label,
            lightOn: null,
            brightness: null,
          }
          const rawValue = Number(newValue)
          const payload = {
            ...existing,
            brightness: Math.max(0, Math.min(100, Math.round(rawValue))),
          }

          subscription.latestFeedbackByZone.set(zoneKey, payload)
          runtimeStateStore.recordLightFeedback(payload, 'brightness-subscribe')
          console.log('[Bridge] Brightness feedback event received', {
            subscriptionId,
            address: ga,
            label: target.label,
            rawValue,
            mappedBrightness: payload.brightness,
          })

          for (const client of subscription.clients) {
            sendSseEvent(client, 'light-feedback', payload)
          }
        })
      }
    }
  })

  connection.on('error', (error) => {
    console.log('[Bridge] LocalDirect light subscription error', {
      subscriptionId,
      view,
      error: error?.message ?? String(error),
    })

    for (const client of subscription.clients) {
      sendSseEvent(client, 'stream-error', {
        subscriptionId,
        error: error?.message ?? String(error),
      })
    }
  })

  connection.on('disconnected', () => {
    console.log('[Bridge] LocalDirect light subscription disconnected', {
      subscriptionId,
      view,
    })
  })

  console.log('[Bridge] Opening localDirect light feedback subscription', {
    subscriptionId,
    view,
    connectionMode,
    gatewayHost: getActiveConnectionTarget().host,
    gatewayPort: getActiveConnectionTarget().port,
  })
  connection.Connect()

  return subscriptionId
}

function createClimateFeedbackSubscription(targets, view) {
  const connectionMode = getCurrentConnectionMode()

  if (connectionMode !== 'localDirect') {
    console.log('[Bridge] Rejecting climate subscribe strategy for non-localDirect mode', {
      connectionMode,
      strategy: 'off',
      view,
    })
    throw new Error('Subscribe-basert klima-feedback krever localDirect')
  }

  const subscriptionId = randomUUID()
  const connection = createKnxConnection()
  const subscription = {
    id: subscriptionId,
    view,
    targets,
    connection,
    clients: new Set(),
    latestFeedbackByField: new Map(),
    stopTimer: null,
  }

  climateFeedbackSubscriptions.set(subscriptionId, subscription)

  connection.on('connected', () => {
    const pointCount = targets.reduce((count, target) => count + target.points.length, 0)

    console.log('[Bridge] LocalDirect climate feedback subscribed', {
      subscriptionId,
      view,
      roomCount: targets.length,
      pointCount,
    })

    for (const target of targets) {
      for (const point of target.points) {
        const dpt = getDptForDataType(point.dataType)

        console.log('[Bridge] Subscribing to climate feedback address', {
          subscriptionId,
          room: target.room,
          label: target.label,
          field: point.field,
          address: point.address,
          dataType: point.dataType,
          dpt,
        })

        const datapoint = new Datapoint(
          { ga: point.address, dpt, autoread: false },
          connection,
        )

        datapoint.on('change', (_oldValue, newValue, ga) => {
          const mappedFeedback = mapClimateFeedbackValue(point.field, newValue, point.dataType)
          const mappedValue = mappedFeedback.value
          const payload = {
            roomKey: target.room,
            field: point.field,
            address: ga,
            rawValue: newValue,
            mappedValue,
            dataType: point.dataType,
            mappingVariant: mappedFeedback.mappingVariant,
          }

          subscription.latestFeedbackByField.set(`${target.room}:${point.field}`, payload)
          runtimeStateStore.recordClimateFeedback(payload, 'climate-subscribe')
          if (point.field === 'heatDemand' && point.dataType === '1-bit') {
            console.warn('[Bridge] Ignoring 1-bit heatDemand for level indicator', {
              subscriptionId,
              room: target.room,
              field: point.field,
              address: ga,
              dataType: point.dataType,
              rawValue: newValue,
              mappingVariant: mappedFeedback.mappingVariant,
            })
          }
          console.log('[Bridge] Climate feedback event received', {
            subscriptionId,
            room: target.room,
            field: point.field,
            address: ga,
            dataType: point.dataType,
            rawValue: newValue,
            mappedValue,
            mappingVariant: mappedFeedback.mappingVariant,
          })

          for (const client of subscription.clients) {
            sendSseEvent(client, 'climate-feedback', payload)
          }
        })
      }
    }
  })

  connection.on('error', (error) => {
    console.log('[Bridge] LocalDirect climate subscription error', {
      subscriptionId,
      view,
      error: error?.message ?? String(error),
    })

    for (const client of subscription.clients) {
      sendSseEvent(client, 'stream-error', {
        subscriptionId,
        error: error?.message ?? String(error),
      })
    }
  })

  connection.on('disconnected', () => {
    console.log('[Bridge] LocalDirect climate subscription disconnected', {
      subscriptionId,
      view,
    })
  })

  console.log('[Bridge] Opening localDirect climate feedback subscription', {
    subscriptionId,
    view,
    connectionMode,
    roomCount: targets.length,
    pointCount: targets.reduce((count, target) => count + target.points.length, 0),
    gatewayHost: getActiveConnectionTarget().host,
    gatewayPort: getActiveConnectionTarget().port,
  })
  connection.Connect()

  return subscriptionId
}

async function sendKnxBitWrite(groupAddress, value, monitorContext = {}) {
  const connectionMode = getCurrentConnectionMode()
  console.log(`[Bridge] WRITE light -> ${groupAddress}`, {
    connectionMode,
    value,
    dpt: '1.001',
  })

  await withKnxConnection((connection) =>
    writeGroupValue(connection, groupAddress, Boolean(value), '1.001'),
  )
  pushKnxMonitorEvent({
    ...monitorContext,
    direction: 'write',
    source: monitorContext.source ?? 'knx-write',
    groupAddress,
    dpt: '1.001',
    dataType: monitorContext.dataType ?? '1-bit',
    decodedValue: Boolean(value),
    rawValue: Boolean(value),
    field: monitorContext.field ?? 'lightWrite',
    signalType: monitorContext.signalType ?? 'lightWrite',
    confidence: monitorContext.confidence ?? 'high',
  })
}

async function sendKnxBytePercentWrite(groupAddress, value, monitorContext = {}) {
  const percentage = Math.max(0, Math.min(100, Math.round(Number(value))))
  const connectionMode = getCurrentConnectionMode()

  console.log(`[Bridge] WRITE value -> ${groupAddress}`, {
    connectionMode,
    value: percentage,
    dpt: '5.001',
  })

  await withKnxConnection((connection) =>
    writeGroupValue(connection, groupAddress, percentage, '5.001'),
  )
  pushKnxMonitorEvent({
    ...monitorContext,
    direction: 'write',
    source: monitorContext.source ?? 'knx-write',
    groupAddress,
    dpt: '5.001',
    dataType: monitorContext.dataType ?? '1-byte',
    decodedValue: percentage,
    rawValue: percentage,
    field: monitorContext.field ?? 'brightnessWrite',
    signalType: monitorContext.signalType ?? 'brightnessWrite',
    confidence: monitorContext.confidence ?? 'high',
  })
}

async function sendKnxShadingBitWrite(groupAddress, value, dpt, monitorContext = {}) {
  const connectionMode = getCurrentConnectionMode()
  console.log(`[Bridge] WRITE shading bit -> ${groupAddress}`, {
    connectionMode,
    value: Boolean(value),
    dpt,
    source: monitorContext.source ?? 'api/knx/shading',
  })

  await withKnxConnection((connection) =>
    writeGroupValue(connection, groupAddress, Boolean(value), dpt),
  )
  pushKnxMonitorEvent({
    ...monitorContext,
    direction: 'write',
    source: monitorContext.source ?? 'api/knx/shading',
    groupAddress,
    dpt,
    dataType: '1-bit',
    decodedValue: Boolean(value),
    rawValue: Boolean(value),
    field: monitorContext.field ?? 'shadingWrite',
    signalType: monitorContext.signalType ?? 'shadingWrite',
    confidence: monitorContext.confidence ?? 'high',
  })
}

async function sendKnxShadingPercentWrite(groupAddress, value, dpt, monitorContext = {}) {
  const percentage = Math.max(0, Math.min(100, Math.round(Number(value))))
  const connectionMode = getCurrentConnectionMode()

  console.log(`[Bridge] WRITE shading position -> ${groupAddress}`, {
    connectionMode,
    value: percentage,
    dpt,
    source: monitorContext.source ?? 'api/knx/shading',
  })

  await withKnxConnection((connection) =>
    writeGroupValue(connection, groupAddress, percentage, dpt),
  )
  pushKnxMonitorEvent({
    ...monitorContext,
    direction: 'write',
    source: monitorContext.source ?? 'api/knx/shading',
    groupAddress,
    dpt,
    dataType: '1-byte',
    decodedValue: percentage,
    rawValue: percentage,
    field: monitorContext.field ?? 'shadingPositionWrite',
    signalType: monitorContext.signalType ?? 'shadingPositionWrite',
    confidence: monitorContext.confidence ?? 'high',
  })
}

async function sendKnxFloatWrite(groupAddress, value, monitorContext = {}) {
  const numericValue = Number(Number(value).toFixed(1))
  const connectionMode = getCurrentConnectionMode()

  console.log('[Bridge] KNX climate write', {
    connectionMode,
    type: 'float',
    groupAddress,
    value: numericValue,
    dpt: CLIMATE_FLOAT_DPT,
  })

  await withKnxConnection((connection) =>
    writeGroupValue(connection, groupAddress, numericValue, CLIMATE_FLOAT_DPT),
  )
  pushKnxMonitorEvent({
    ...monitorContext,
    direction: 'write',
    source: monitorContext.source ?? 'knx-write',
    groupAddress,
    dpt: CLIMATE_FLOAT_DPT,
    dataType: monitorContext.dataType ?? '2-byte float',
    decodedValue: numericValue,
    rawValue: numericValue,
    field: monitorContext.field ?? 'setpointWrite',
    signalType: monitorContext.signalType ?? 'setpointWrite',
    confidence: monitorContext.confidence ?? 'high',
  })
}

async function handleLightCommand(payload) {
  const writeMapping = getRuntimeWriteMappingOrThrow('light-write')
  const zone = writeMapping.lightByRoomAndZone.get(`${payload?.room}:${payload?.zone}`)

  if (!zone) {
    throw new Error(`Live light write mangler runtime-mapping for ${payload?.room}:${payload?.zone}`)
  }

  if (!isConfiguredAddress(zone.lightAddress)) {
    throw new Error(`Live light write mangler light-adresse for ${zone.label}`)
  }

  console.log('[Bridge] WRITE (light) resolved from runtime-config', {
    room: zone.room,
    zone: zone.zone,
    address: zone.lightAddress,
    dataType: zone.lightDataType,
    dpt: '1.001',
  })

  await sendKnxBitWrite(zone.lightAddress, payload.value, {
    source: payload?.monitorSource ?? 'api/knx/light',
    roomKey: zone.room,
    zoneKey: zone.zone,
    zoneName: zone.label,
    field: 'lightWrite',
    signalType: 'lightWrite',
    relation: payload?.sceneId
      ? {
          type: 'sceneScheduler',
          sceneId: payload.sceneId,
          sceneName: payload.sceneName ?? null,
          executionKey: payload.executionKey ?? null,
          label: 'Scene triggered write',
        }
      : null,
  })

  return {
    ok: true,
    message: 'KNX light live command sent',
    address: zone.lightAddress,
    zone: zone.label,
    live: true,
  }
}

async function handleBrightnessCommand(payload) {
  const writeMapping = getRuntimeWriteMappingOrThrow('brightness-write')
  const zone = writeMapping.lightByRoomAndZone.get(`${payload?.room}:${payload?.zone}`)

  if (!zone) {
    throw new Error(`Live brightness write mangler runtime-mapping for ${payload?.room}:${payload?.zone}`)
  }

  if (!zone.dimmable || !isConfiguredAddress(zone.valueAddress)) {
    throw new Error(`Live brightness write mangler value-adresse for ${zone.label}`)
  }

  console.log('[Bridge] WRITE (value) resolved from runtime-config', {
    room: zone.room,
    zone: zone.zone,
    address: zone.valueAddress,
    dataType: zone.valueDataType,
    dpt: '5.001',
  })

  await sendKnxBytePercentWrite(zone.valueAddress, payload.brightness, {
    source: payload?.monitorSource ?? 'api/knx/brightness',
    roomKey: zone.room,
    zoneKey: zone.zone,
    zoneName: zone.label,
    field: 'brightnessWrite',
    signalType: 'brightnessWrite',
    relation: payload?.sceneId
      ? {
          type: 'sceneScheduler',
          sceneId: payload.sceneId,
          sceneName: payload.sceneName ?? null,
          executionKey: payload.executionKey ?? null,
          label: 'Scene triggered write',
        }
      : null,
  })

  return {
    ok: true,
    message: 'KNX brightness live command sent',
    address: zone.valueAddress,
    zone: zone.label,
    live: true,
  }
}

async function handleModeCommand(payload) {
  if (!payload?.liveClimateActive) {
    return {
      ok: true,
      message: 'KNX climate command simulated',
      live: false,
    }
  }

  if (getCurrentConnectionMode() !== 'localDirect') {
    throw new Error('Live klima krever localDirect')
  }

  const writeMapping = getRuntimeWriteMappingOrThrow('climate-write')
  const climatePoint = writeMapping.climateByRoom.get(String(payload?.room ?? '').trim())
  const address = climatePoint?.setpointAddress ?? ''
  const setpoint = Number(payload?.setpoint)
  const roomLabel = String(climatePoint?.label ?? payload?.roomName ?? payload?.room ?? 'Ukjent rom')

  if (!address || address.startsWith('placeholder/')) {
    throw new Error(`Klima settpunktadresse mangler for ${roomLabel}`)
  }

  if (Number.isNaN(setpoint)) {
    throw new Error('Ugyldig klima-settpunkt')
  }

  if ((climatePoint?.setpointWriteStrategy ?? 'absoluteTemperature') === 'relativeOffset') {
    throw new Error(
      'Relative offset-strategi er klargjort, men deaktivert til offset-DPT og gruppeadresse er eksplisitt konfigurert',
    )
  }

  console.log('[Bridge] Climate setpoint write', {
    roomKey: String(payload?.room ?? '').trim(),
    room: roomLabel,
    address,
    dataType: climatePoint?.setpointDataType ?? '2-byte float',
    setpointWriteStrategy: climatePoint?.setpointWriteStrategy ?? 'absoluteTemperature',
    source: 'runtime-config',
    setpoint,
    mode: payload?.mode ?? null,
  })

  await sendKnxFloatWrite(address, setpoint, {
    source: payload?.monitorSource ?? 'api/knx/climate/temperature',
    roomKey: String(payload?.room ?? '').trim(),
    roomName: roomLabel,
    field: 'setpointWrite',
    signalType: 'setpointWrite',
    relation: payload?.sceneId
      ? {
          type: 'sceneScheduler',
          sceneId: payload.sceneId,
          sceneName: payload.sceneName ?? null,
          executionKey: payload.executionKey ?? null,
          label: 'Scene triggered write',
        }
      : null,
  })

  return {
    ok: true,
    message: 'KNX climate setpoint sent',
    address,
    room: roomLabel,
    live: true,
  }
}

async function handleFeedbackQuery(payload) {
  const connectionMode = getCurrentConnectionMode()
  const feedbackTargets = normalizeFeedbackTargets(payload)

  console.log('[Bridge] Light feedback strategy', {
    connectionMode,
    strategy: connectionMode === 'remoteTunnel' ? 'polling-fallback' : 'polling-reserve',
  })

  if (feedbackTargets.length === 0) {
    return {
      ok: true,
      feedback: [],
      live: currentModeIsLive(),
    }
  }

  if (!payload?.forceRead) {
    const feedback = feedbackTargets.map((target) => {
      const lightEntry = target.lightFeedback ? getCacheEntry(target.lightFeedback) : null
      const valueEntry = target.valueFeedback ? getCacheEntry(target.valueFeedback) : null

      return {
        room: target.room,
        zone: target.zone,
        label: target.label,
        lightOn:
          typeof lightEntry?.decodedValue === 'boolean'
            ? lightEntry.decodedValue
            : null,
        brightness:
          typeof valueEntry?.decodedValue === 'number'
            ? valueEntry.decodedValue
            : null,
        cache: {
          light: lightEntry
            ? { at: lightEntry.at, stale: lightEntry.stale, source: lightEntry.source }
            : null,
          value: valueEntry
            ? { at: valueEntry.at, stale: valueEntry.stale, source: valueEntry.source }
            : null,
        },
      }
    })

    return {
      ok: true,
      feedback,
      live: currentModeIsLive(),
      source: 'knx-subscription-cache',
      busRead: false,
      note: 'KNX feedback served from server cache. Use forceRead for explicit manual bus read.',
    }
  }

  console.log('[Bridge] Starting light feedback round', {
    connectionMode,
    addressCount: feedbackTargets.reduce(
      (count, target) =>
        count + (target.lightFeedback ? 1 : 0) + (target.valueFeedback ? 1 : 0),
      0,
    ),
    zoneCount: feedbackTargets.length,
  })

  const feedbackMap = new Map()

  await withKnxConnection(async (connection) => {
    for (let index = 0; index < feedbackTargets.length; index += 1) {
      const target = feedbackTargets[index]
      const existing = feedbackMap.get(`${target.room}:${target.zone}`) ?? {
        room: target.room,
        zone: target.zone,
        label: target.label,
        lightOn: null,
        brightness: null,
      }

      if (target.lightFeedback) {
        console.log('[Bridge] Reading light feedback address', {
          address: target.lightFeedback,
          label: target.label,
          dpt: '1.001',
        })

        try {
          const rawValue = await readDatapointValue(connection, target.lightFeedback, '1.001')
          existing.lightOn = Boolean(rawValue)

          console.log('[Bridge] Light feedback success', {
            address: target.lightFeedback,
            label: target.label,
            value: existing.lightOn,
          })
        } catch (error) {
          console.log('[Bridge] Light feedback failed', {
            address: target.lightFeedback,
            label: target.label,
            error: error instanceof Error ? error.message : String(error),
            action: 'preserve-last-known-state',
          })
        }

        await sleep(LIGHT_FEEDBACK_DELAY_MS)
      }

      if (target.valueFeedback) {
        console.log('[Bridge] Reading brightness feedback address', {
          address: target.valueFeedback,
          label: target.label,
          dpt: '5.001',
        })

        try {
          const rawValue = await readDatapointValue(connection, target.valueFeedback, '5.001')
          existing.brightness = Math.max(0, Math.min(100, Math.round(Number(rawValue))))

          console.log('[Bridge] Brightness feedback success', {
            address: target.valueFeedback,
            label: target.label,
            rawValue,
            mappedBrightness: existing.brightness,
          })
        } catch (error) {
          console.log('[Bridge] Brightness feedback failed', {
            address: target.valueFeedback,
            label: target.label,
            error: error instanceof Error ? error.message : String(error),
            action: 'preserve-last-known-state',
          })
        }

        if (index < feedbackTargets.length - 1) {
          await sleep(LIGHT_FEEDBACK_DELAY_MS)
        }
      }

      feedbackMap.set(`${target.room}:${target.zone}`, existing)
    }
  })

  const feedback = Array.from(feedbackMap.values())

  for (const item of feedback) {
    runtimeStateStore.recordLightFeedback(item, 'light-query')
  }

  return {
    ok: true,
    feedback,
      live: currentModeIsLive(),
    }
  }

async function handleClimateTemperatureQuery(payload) {
  if (!payload?.liveClimateActive) {
    return {
      ok: true,
      temperature: null,
      live: false,
    }
  }

  const connectionMode = getCurrentConnectionMode()

  if (connectionMode !== 'localDirect') {
    throw new Error('Live klima krever localDirect')
  }

  const address = String(payload?.address ?? '').trim()
  const setpointFeedbackAddress = String(payload?.setpointFeedbackAddress ?? '').trim()
  const heatDemandAddress = String(payload?.heatDemandAddress ?? '').trim()
  const roomLabel = String(payload?.roomName ?? payload?.room ?? 'Ukjent rom')

  if (!address || address.startsWith('placeholder/')) {
    throw new Error(`Klima temperaturadresse mangler for ${roomLabel}`)
  }

  if (!payload?.forceRead) {
    const temperatureEntry = getCacheEntry(address)
    const setpointEntry = isConfiguredAddress(setpointFeedbackAddress)
      ? getCacheEntry(setpointFeedbackAddress)
      : null
    const heatDemandEntry = isConfiguredAddress(heatDemandAddress)
      ? getCacheEntry(heatDemandAddress)
      : null

    const result = {
      ok: true,
      room: roomLabel,
      temperature:
        typeof temperatureEntry?.decodedValue === 'number'
          ? temperatureEntry.decodedValue
          : null,
      setpoint:
        typeof setpointEntry?.decodedValue === 'number'
          ? setpointEntry.decodedValue
          : null,
      heatDemand:
        typeof heatDemandEntry?.decodedValue === 'number'
          ? heatDemandEntry.decodedValue
          : null,
      live: true,
      source: 'knx-subscription-cache',
      busRead: false,
      cache: {
        temperature: temperatureEntry
          ? { at: temperatureEntry.at, stale: temperatureEntry.stale, source: temperatureEntry.source }
          : null,
        setpoint: setpointEntry
          ? { at: setpointEntry.at, stale: setpointEntry.stale, source: setpointEntry.source }
          : null,
        heatDemand: heatDemandEntry
          ? {
              at: heatDemandEntry.at,
              stale: heatDemandEntry.stale,
              source: heatDemandEntry.source,
              mappingVariant: heatDemandEntry.mappingVariant,
            }
          : null,
      },
    }

    if (
      typeof result.temperature === 'number' ||
      typeof result.setpoint === 'number' ||
      typeof result.heatDemand === 'number'
    ) {
      runtimeStateStore.recordClimateTemperatureQuery(payload, result)
    }

    return result
  }

  console.log('[Bridge] Climate temperature read', {
    room: roomLabel,
    address,
    connectionMode,
  })

  const rawValue = await withKnxConnection((connection) =>
    (async () => {
      const temperatureRaw = await readDatapointValue(connection, address, CLIMATE_FLOAT_DPT)
      let setpoint = null
      let heatDemand = null

      console.log('[Bridge] Climate temperature raw value received', {
        room: roomLabel,
        address,
        rawValue: temperatureRaw,
      })

      if (setpointFeedbackAddress && !setpointFeedbackAddress.startsWith('placeholder/')) {
        console.log('[Bridge] Climate setpoint feedback read', {
          room: roomLabel,
          address: setpointFeedbackAddress,
          connectionMode,
        })

        const setpointRaw = await readDatapointValue(
          connection,
          setpointFeedbackAddress,
          CLIMATE_FLOAT_DPT,
        )

        setpoint = Number(Number(setpointRaw).toFixed(1))
        console.log('[Bridge] Climate setpoint raw value received', {
          room: roomLabel,
          address: setpointFeedbackAddress,
          rawValue: setpointRaw,
          mappedSetpoint: setpoint,
        })
      }

      if (heatDemandAddress && !heatDemandAddress.startsWith('placeholder/')) {
        console.log('[Bridge] Climate heat demand read', {
          room: roomLabel,
          address: heatDemandAddress,
          connectionMode,
          dpt: '5.001',
        })

        const heatDemandRaw = await readDatapointValue(connection, heatDemandAddress, '5.001')
        const mappedHeatDemand = mapOneBytePercentValue(heatDemandRaw)
        heatDemand = mappedHeatDemand.value
        console.log('[Bridge] Climate heat demand raw value received', {
          room: roomLabel,
          address: heatDemandAddress,
          rawValue: heatDemandRaw,
          mappedHeatDemand: heatDemand,
          mappingVariant: mappedHeatDemand.mappingVariant,
        })
      }

      return {
        temperature: Number(Number(temperatureRaw).toFixed(1)),
        setpoint,
        heatDemand,
      }
    })(),
  )
  const temperature = rawValue.temperature

  console.log('[Bridge] Climate temperature success', {
    room: roomLabel,
    address,
    temperature,
    setpoint: rawValue.setpoint,
    heatDemand: rawValue.heatDemand,
  })

  const result = {
    ok: true,
    temperature,
    setpoint: rawValue.setpoint,
    heatDemand: rawValue.heatDemand,
    address,
    room: roomLabel,
    live: true,
  }

  runtimeStateStore.recordClimateTemperatureQuery(payload, result)

  return result
}

function currentModeIsLive() {
  return Boolean(runtimeConfig)
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`)

  if (request.method === 'OPTIONS') {
    sendCorsPreflight(response)
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, getHealthPayload())
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/runtime/state') {
    recordRuntimePollingRequest(url.pathname, 'runtime-state')
    sendJson(response, 200, runtimeStateStore.getState())
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/runtime/history') {
    recordRuntimePollingRequest(url.pathname, 'runtime-history')
    sendJson(response, 200, runtimeStateStore.getHistory({
      limit: url.searchParams.get('limit') ?? undefined,
      range: url.searchParams.get('range') ?? undefined,
      category: url.searchParams.get('category') ?? undefined,
    }))
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/runtime/summary') {
    recordRuntimePollingRequest(url.pathname, 'runtime-summary')
    sendJson(response, 200, runtimeStateStore.getSummary())
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/runtime/health') {
    recordRuntimePollingRequest(url.pathname, 'runtime-health')
    sendJson(response, 200, getRuntimeHealthPayload())
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/runtime/aggregates') {
    recordRuntimePollingRequest(url.pathname, 'runtime-aggregates')
    sendJson(response, 200, runtimeStateStore.getAggregates())
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/runtime/insights') {
    recordRuntimePollingRequest(url.pathname, 'runtime-insights')
    const insightsPayload = runtimeStateStore.getRuntimeInsights({
      limit: url.searchParams.get('limit') ?? undefined,
    })
    const runtimeInsightEngine = generateRuntimeInsights()
    const primaryInsight = insightsPayload.insights?.[0] ?? null
    const insightKey = primaryInsight ? `${primaryInsight.id}:${primaryInsight.at}` : null
    if (primaryInsight && insightKey !== lastInsightEventKey) {
      lastInsightEventKey = insightKey
      emitRuntimeEvent('insightGenerated', {
        category: 'insight',
        source: primaryInsight.source,
        confidence: primaryInsight.confidence,
        roomId: primaryInsight.roomId ?? null,
        insight: primaryInsight,
      })
    }
    sendJson(response, 200, {
      ...insightsPayload,
      runtimeInsightEngine,
      semanticInsights: runtimeInsightEngine.activeInsights,
      explainable: true,
      deterministic: true,
    })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/runtime/clients') {
    recordRuntimePollingRequest(url.pathname, 'runtime-clients')
    sendJson(response, 200, getRuntimeClientSnapshot())
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/runtime/actions') {
    recordRuntimePollingRequest(url.pathname, 'runtime-actions')
    sendJson(response, 200, {
      ok: true,
      source: 'bridge-runtime-actions',
      model: 'approval-foundation',
      autonomous: false,
      actions: runtimeActionHistory.slice(-100).reverse(),
      metrics: getRuntimeActionMetrics(),
    })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/runtime/domains') {
    recordRuntimePollingRequest(url.pathname, 'runtime-domains')
    sendJson(response, 200, {
      ok: true,
      source: 'bridge-runtime-domains',
      ...getRuntimeDomainSnapshot(),
    })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/runtime/snapshots') {
    recordRuntimePollingRequest(url.pathname, 'runtime-snapshots')
    sendJson(response, 200, {
      ok: true,
      source: 'bridge-runtime-continuity',
      model: 'runtime-snapshot-foundation',
      continuity: getRuntimeContinuityStatus(),
      latestSnapshot: lastRuntimeContinuitySnapshot,
    })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/runtime/registry') {
    recordRuntimePollingRequest(url.pathname, 'runtime-registry')
    const registry = emitRuntimeRegistryEvents('api-read')
    sendJson(response, 200, registry)
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/runtime/events') {
    response.writeHead(200, getCorsHeaders({
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
    }))

    const lastEventId =
      request.headers['last-event-id'] ??
      url.searchParams.get('lastEventId') ??
      url.searchParams.get('last-event-id') ??
      null
    const runtimeClient = registerRuntimeClientSession({
      request,
      clientId: url.searchParams.get('clientId') ?? String(request.headers['x-lynell-client-id'] ?? 'anonymous-client'),
      sessionId: url.searchParams.get('sessionId') ?? String(request.headers['x-lynell-session-id'] ?? `sse-${Date.now()}`),
      clientName: url.searchParams.get('clientName') ?? 'Lynell client',
      deviceType: url.searchParams.get('deviceType') ?? 'unknown',
      platform: url.searchParams.get('platform') ?? 'unknown',
      runtimeMode: url.searchParams.get('runtimeMode') ?? 'unknown',
      runtimeCapabilities: String(url.searchParams.get('capabilities') ?? '')
        .split(',')
        .map((capability) => capability.trim())
        .filter(Boolean),
      lastRuntimeVersion: url.searchParams.get('version') ?? 'unknown',
      eventStreamConnected: true,
      connectionType: 'sse',
    })
    runtimeEventClients.add(response)
    runtimeEventClientMetadata.set(response, {
      clientId: runtimeClient.client.clientId,
      sessionId: runtimeClient.session.sessionId,
      connectedAt: new Date().toISOString(),
      lastEventId: null,
      sentEvents: 0,
      droppedEvents: 0,
      reconnectCount: runtimeClient.session.reconnectCount ?? 0,
      lastSentAt: null,
    })
    runtimeEventStats.reconnectCount += 1
    sendSseEvent(response, 'connected', {
      ok: true,
      source: 'bridge-runtime-events',
      transport: 'sse',
      timestamp: new Date().toISOString(),
      client: runtimeClient.client,
      session: runtimeClient.session,
      continuity: getRuntimeContinuityStatus(),
      stats: getRuntimeEventStats(),
    })

    if (runtimeContinuityState.restored && !runtimeRecoveryDetectedEmitted) {
      runtimeRecoveryDetectedEmitted = true
      emitRuntimeEvent('runtimeRecoveryDetected', {
        source: 'runtime-continuity',
        category: 'runtime',
        domainId: 'runtime',
        capabilityContext: 'persistentHistory',
        snapshot: lastRuntimeContinuitySnapshot
          ? {
              snapshotId: lastRuntimeContinuitySnapshot.snapshotId,
              createdAt: lastRuntimeContinuitySnapshot.createdAt,
              restoredAt: runtimeContinuityState.restoredAt,
              partialRestore: runtimeContinuityState.partialRestore,
            }
          : null,
        replayable: false,
        stats: getRuntimeEventStats(),
      })
    }

    if (lastEventId) {
      const replayEvents = getRuntimeEventsAfter(lastEventId)
      if (Array.isArray(replayEvents)) {
        runtimeEventStats.replayedEvents += replayEvents.length
        for (const replayEvent of replayEvents) {
          sendSseEvent(response, replayEvent.type, {
            ...replayEvent,
            replay: true,
          })
        }
      } else {
        runtimeEventStats.resyncRequiredCount += 1
        sendSseEvent(response, 'resyncRequired', {
          eventId: `resync-${Date.now()}`,
          type: 'resyncRequired',
          timestamp: Date.now(),
          at: new Date().toISOString(),
          source: 'bridge-runtime-events',
          category: 'runtime',
          replayable: false,
          lastEventId,
          reason: 'Event is no longer available in runtime buffer.',
          stats: getRuntimeEventStats(),
        })
      }
    }

    const keepAliveTimer = setInterval(() => {
      try {
        sendSseEvent(response, 'runtimeHeartbeat', {
          eventId: `heartbeat-${Date.now()}`,
          type: 'runtimeHeartbeat',
          timestamp: Date.now(),
          at: new Date().toISOString(),
          source: 'bridge-runtime-events',
          category: 'runtime',
          replayable: false,
          clientId: runtimeClient.client.clientId,
          sessionId: runtimeClient.session.sessionId,
          stats: getRuntimeEventStats(),
        })
      } catch {
        const metadata = runtimeEventClientMetadata.get(response)
        if (metadata) {
          metadata.droppedEvents += 1
          runtimeEventClientMetadata.set(response, metadata)
        }
        runtimeEventStats.droppedEvents += 1
      }
    }, 30_000)
    if (typeof keepAliveTimer.unref === 'function') {
      keepAliveTimer.unref()
    }

    request.on('close', () => {
      clearInterval(keepAliveTimer)
      runtimeEventClients.delete(response)
      runtimeEventClientMetadata.delete(response)
      markRuntimeSessionDisconnected(runtimeClient.session.sessionId)
    })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/integrations') {
    sendJson(response, 200, await integrationManager.getProviders())
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/integrations/deltacoTuya/discovery') {
    sendJson(response, 200, await integrationManager.discoverDeltacoTuya({
      deep: url.searchParams.get('deep') === 'true',
    }))
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/integrations/deltacoTuya/identify') {
    sendJson(response, 200, integrationManager.getDeltacoTuyaIdentifySession())
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/integrations/deltacoTuya/mappings') {
    sendJson(response, 200, integrationManager.getDeltacoTuyaMappings())
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/integrations/deltacoTuya/protocol-research') {
    sendJson(response, 200, await integrationManager.getDeltacoTuyaProtocolResearch())
    return
  }

  if (request.method === 'GET' && url.pathname.startsWith('/api/integrations/')) {
    const providerId = decodeURIComponent(url.pathname.slice('/api/integrations/'.length))
    const payload = await integrationManager.getProvider(providerId)
    sendJson(response, payload.ok ? 200 : 404, payload)
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/mqtt/status') {
    const snapshot = mqttRuntime.getStatus()
    recordIntegrationSnapshotAndEmit('mqtt', snapshot)
    sendJson(response, 200, snapshot)
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/cast/status') {
    const snapshot = castRuntime.getStatus()
    recordIntegrationSnapshotAndEmit('cast', snapshot)
    sendJson(response, 200, snapshot)
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/cast/playback') {
    const snapshot = castRuntime.getPlayback()
    recordIntegrationSnapshotAndEmit('cast-playback', snapshot)
    sendJson(response, 200, snapshot)
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/vacuum/status') {
    const snapshot = await vacuumRuntime.getStatus()
    recordIntegrationSnapshotAndEmit('vacuum', snapshot)
    sendJson(response, 200, snapshot)
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/dreame-cloud/status') {
    sendJson(response, 200, dreameCloudRuntime.getStatus())
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/vacuum/dock/readiness') {
    sendJson(response, 200, await vacuumRuntime.dockReadiness({
      debug: url.searchParams.get('debug') === 'true',
    }))
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/media/library') {
    try {
      const tracks = await getLocalMediaLibrary()
      sendJson(response, 200, {
        ok: true,
        source: 'local',
        musicPath: 'media/music',
        tracks,
      })
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : 'Could not scan media library',
      })
    }
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/knx/state') {
    recordRuntimePollingRequest(url.pathname, 'knx-state')
    sendJson(response, 200, getKnxStatePayload())
    return
  }

  if (request.method === 'GET' && url.pathname.startsWith('/api/knx/group/')) {
    const groupAddress = decodeURIComponent(url.pathname.slice('/api/knx/group/'.length))
    const entry = getCacheEntry(groupAddress)
    sendJson(response, entry ? 200 : 404, {
      ok: Boolean(entry),
      source: 'knx-subscription-cache',
      groupAddress,
      value: entry,
      error: entry ? null : 'KNX group is not cached yet',
    })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/knx/subscriptions') {
    sendJson(response, 200, getKnxSubscriptionsPayload())
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/knx/diagnostics') {
    recordRuntimePollingRequest(url.pathname, 'knx-diagnostics')
    sendJson(response, 200, getKnxDiagnosticsPayload())
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/knx/monitor') {
    recordRuntimePollingRequest(url.pathname, 'knx-monitor')
    sendJson(response, 200, getKnxMonitorPayload(url.searchParams.get('limit') ?? 300))
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/knx/ets-audit') {
    sendJson(response, 200, runEtsHistoryAudit())
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/runtime/config/system') {
    sendJson(response, 200, createRuntimeSystemConfigPayload())
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/knx/signal-loggers') {
    sendJson(response, 200, getSignalLoggersPayload())
    return
  }

  if (request.method === 'GET' && url.pathname.startsWith('/media/music/')) {
    await serveLocalMediaFile(
      request,
      response,
      url.pathname.slice('/media/music/'.length),
    )
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/knx/feedback/stream') {
    const subscriptionId = url.searchParams.get('subscriptionId') ?? ''
    const lightSubscription = lightFeedbackSubscriptions.get(subscriptionId)
    const climateSubscription = climateFeedbackSubscriptions.get(subscriptionId)
    const subscription = lightSubscription ?? climateSubscription

    if (!subscription) {
      sendJson(response, 404, { ok: false, error: 'Subscription not found' })
      return
    }

    if (subscription.stopTimer) {
      clearTimeout(subscription.stopTimer)
      subscription.stopTimer = null
    }

    response.writeHead(200, getCorsHeaders({
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
    }))

    subscription.clients.add(response)
    sendSseEvent(response, 'connected', {
      subscriptionId,
      view: subscription.view,
    })

    if (climateSubscription) {
      console.log('[Bridge] Climate feedback stream client connected', {
        subscriptionId,
        view: subscription.view,
        roomCount: subscription.targets.length,
        pointCount: subscription.targets.reduce(
          (count, target) => count + target.points.length,
          0,
        ),
      })
    }

    if (lightSubscription) {
      for (const payload of subscription.latestFeedbackByZone.values()) {
        sendSseEvent(response, 'light-feedback', payload)
      }
    }

    if (climateSubscription) {
      for (const payload of subscription.latestFeedbackByField.values()) {
        sendSseEvent(response, 'climate-feedback', payload)
      }
    }

    request.on('close', () => {
      subscription.clients.delete(response)
      if (climateSubscription) {
        console.log('[Bridge] Climate feedback stream client disconnected', {
          subscriptionId,
          view: subscription.view,
          remainingClients: subscription.clients.size,
        })
      }
      if (lightSubscription) {
        scheduleLightFeedbackSubscriptionStop(subscriptionId)
      }
      if (climateSubscription) {
        scheduleClimateFeedbackSubscriptionStop(subscriptionId)
      }
    })

    return
  }

  if (request.method !== 'POST') {
    sendJson(response, 404, { ok: false, error: 'Not found' })
    return
  }

  if (
    ![
      '/api/runtime/config',
      '/api/runtime/config/system',
      '/api/runtime/conversation-log',
      '/api/runtime/clients/register',
      '/api/knx/light',
      '/api/knx/brightness',
      '/api/knx/mode',
      '/api/knx/feedback/query',
      '/api/knx/feedback/subscribe-light',
      '/api/knx/feedback/unsubscribe-light',
      '/api/knx/feedback/subscribe-climate',
      '/api/knx/feedback/unsubscribe-climate',
      '/api/knx/climate/temperature',
      '/api/knx/single-action',
      '/api/knx/shading',
      '/api/knx/signal-loggers',
      '/api/knx/signal-loggers/update',
      '/api/knx/signal-loggers/delete',
      '/api/mqtt/connect',
      '/api/mqtt/disconnect',
      '/api/cast/discover',
      '/api/cast/pause',
      '/api/cast/play',
      '/api/cast/stop',
      '/api/cast/volume',
      '/api/vacuum/connect',
      '/api/vacuum/command',
      '/api/vacuum/dock',
      '/api/dreame-cloud/connect',
    ].includes(url.pathname) &&
    !/^\/api\/knx\/rooms\/[^/]+\/poll$/.test(url.pathname) &&
    !/^\/api\/runtime\/actions\/[^/]+\/(approve|deny)$/.test(url.pathname) &&
    !/^\/api\/runtime\/insights\/[^/]+\/acknowledge$/.test(url.pathname) &&
    !/^\/api\/runtime\/scenes\/[^/]+\/test$/.test(url.pathname) &&
    !(
      url.pathname.startsWith('/api/integrations/') &&
      (
        url.pathname.endsWith('/config') ||
        url.pathname.endsWith('/enable') ||
        url.pathname.endsWith('/disable') ||
        url.pathname.endsWith('/activate') ||
        url.pathname.endsWith('/deactivate') ||
        url.pathname.endsWith('/identify/start') ||
        url.pathname.endsWith('/identify/observe') ||
        url.pathname.endsWith('/mappings/confirm')
      )
    )
  ) {
    sendJson(response, 404, { ok: false, error: 'Not found' })
    return
  }

  let rawBody = ''

  for await (const chunk of request) {
    rawBody += chunk
  }

  if (url.pathname === '/api/runtime/config') {
    runtimeConfigDiagnostics.runtimeConfigPostReceivedAt = new Date().toISOString()
    runtimeConfigDiagnostics.runtimeConfigPostPayloadBytes = Buffer.byteLength(rawBody, 'utf8')
    runtimeConfigDiagnostics.runtimeConfigPostParsed = false
    runtimeConfigDiagnostics.runtimeConfigPostError = null
  }

  try {
    const payload = rawBody ? JSON.parse(rawBody) : {}
    if (url.pathname === '/api/runtime/config') {
      runtimeConfigDiagnostics.runtimeConfigPostParsed = true
      const roomKeys = new Set()
      for (const point of payload?.writeMapping?.lights ?? []) {
        if (point?.room) roomKeys.add(String(point.room))
      }
      for (const point of payload?.writeMapping?.climate ?? []) {
        if (point?.room) roomKeys.add(String(point.room))
      }
      for (const point of payload?.feedbackMapping?.lights ?? []) {
        if (point?.room) roomKeys.add(String(point.room))
      }
      for (const point of payload?.feedbackMapping?.climate ?? []) {
        if (point?.room) roomKeys.add(String(point.room))
      }
      console.log('[Bridge] runtime-config POST received', {
        payloadBytes: runtimeConfigDiagnostics.runtimeConfigPostPayloadBytes,
        parseStatus: 'parsed',
        roomCount: roomKeys.size,
        writeMappingCounts: {
          light: Array.isArray(payload?.writeMapping?.lights) ? payload.writeMapping.lights.length : 0,
          climate: Array.isArray(payload?.writeMapping?.climate) ? payload.writeMapping.climate.length : 0,
        },
        feedbackMappingCounts: {
          light: Array.isArray(payload?.feedbackMapping?.lights) ? payload.feedbackMapping.lights.length : 0,
          climate: Array.isArray(payload?.feedbackMapping?.climate) ? payload.feedbackMapping.climate.length : 0,
        },
        payloadSummary: payload?.runtimeConfigPayloadSummary ?? null,
      })
    }

    logBridgeCommand(url.pathname, payload)

    if (url.pathname === '/api/runtime/clients/register') {
      const registered = registerRuntimeClientSession({
        request,
        clientId: String(payload?.clientId ?? request.headers['x-lynell-client-id'] ?? 'anonymous-client'),
        sessionId: String(payload?.sessionId ?? request.headers['x-lynell-session-id'] ?? 'sessionless'),
        clientName: String(payload?.clientName ?? 'Lynell client'),
        deviceType: String(payload?.deviceType ?? 'unknown'),
        platform: String(payload?.platform ?? 'unknown'),
        runtimeMode: String(payload?.runtimeMode ?? 'unknown'),
        runtimeCapabilities: Array.isArray(payload?.runtimeCapabilities) ? payload.runtimeCapabilities : [],
        lastRuntimeVersion: String(payload?.lastRuntimeVersion ?? 'unknown'),
        eventStreamConnected: Boolean(payload?.eventStreamConnected),
        connectionType: 'http',
      })
      emitRuntimeEvent('clientSessionUpdated', {
        category: 'runtimeIdentity',
        source: 'runtime-client-register',
        clientId: registered.client.clientId,
        sessionId: registered.session.sessionId,
        client: registered.client,
        session: registered.session,
        confidence: 'medium',
        stats: getRuntimeEventStats(),
      })
      sendJson(response, 200, {
        ok: true,
        source: 'bridge-runtime-identity',
        ...registered,
        snapshot: getRuntimeClientSnapshot(),
      })
      return
    }

    if (url.pathname === '/api/runtime/config/system') {
      const result = await applyRuntimeSystemConfig(payload, request, url)
      sendJson(response, 200, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    if (url.pathname === '/api/runtime/conversation-log') {
      const result = await appendConversationLogEntry(payload, request, url)
      sendJson(response, 200, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    const runtimeSceneTestMatch = /^\/api\/runtime\/scenes\/([^/]+)\/test$/.exec(url.pathname)
    if (runtimeSceneTestMatch) {
      const sceneId = decodeURIComponent(runtimeSceneTestMatch[1])
      const fullScene = getFullScene(sceneId)
      if (!fullScene) {
        sendJson(response, 404, {
          endpoint: url.pathname,
          ok: false,
          error: `Scene ${sceneId} finnes ikke i server-owned SystemConfig`,
          diagnostics: getSceneSchedulerDiagnostics(),
        })
        return
      }

      const dryRun = payload?.dryRun !== false
      const sceneDefinition = {
        sceneId: fullScene.id,
        sceneName: fullScene.name,
        triggerTime: fullScene.triggerTime,
      }
      try {
        const result = await executeScheduledScene(sceneDefinition, dryRun ? 'manual-dry-run' : 'manual-test', {
          dryRun,
          manual: true,
          force: true,
          scheduledAt: new Date(),
        })
        sendJson(response, 200, {
          endpoint: url.pathname,
          ok: true,
          dryRun,
          scene: sceneDefinition,
          result,
          diagnostics: getSceneSchedulerDiagnostics(),
        })
      } catch (error) {
        sendJson(response, 500, {
          endpoint: url.pathname,
          ok: false,
          dryRun,
          scene: sceneDefinition,
          error: error instanceof Error ? error.message : 'Scene test failed',
          diagnostics: getSceneSchedulerDiagnostics(),
        })
      }
      return
    }

    const runtimeActionApprovalMatch = /^\/api\/runtime\/actions\/([^/]+)\/(approve|deny)$/.exec(url.pathname)
    if (runtimeActionApprovalMatch) {
      const actionId = decodeURIComponent(runtimeActionApprovalMatch[1])
      const approvalAction = runtimeActionApprovalMatch[2]
      const context = getClientContext(request, 'user', payload, url)
      const result = approvalAction === 'approve'
        ? await approveRuntimeAction(actionId, context)
        : denyRuntimeAction(actionId, context)
      sendJson(response, result.ok ? 200 : 404, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    const runtimeInsightAcknowledgeMatch = /^\/api\/runtime\/insights\/([^/]+)\/acknowledge$/.exec(url.pathname)
    if (runtimeInsightAcknowledgeMatch) {
      const insightId = decodeURIComponent(runtimeInsightAcknowledgeMatch[1])
      const result = await acknowledgeRuntimeInsight(insightId)
      sendJson(response, result.ok ? 200 : 404, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    const knxRoomPollMatch = /^\/api\/knx\/rooms\/([^/]+)\/poll$/.exec(url.pathname)
    if (knxRoomPollMatch) {
      const roomId = decodeURIComponent(knxRoomPollMatch[1])
      const result = await runRuntimeAction(
        {
          type: 'roomPoll',
          category: 'roomPoll',
          source: 'api/knx/rooms/poll',
          roomId,
          target: { roomId },
          payloadSummary: { roomId },
          requestedBy: 'user',
          clientContext: getClientContext(request, 'user', payload, url),
          approvalRequired: false,
          confidence: 'high',
          runtimeContext: { endpoint: url.pathname, sendsCommands: false },
        },
        () => handleKnxRoomPoll(roomId),
      )
      const requestedGroups = Array.isArray(result.requestedGroups) ? result.requestedGroups : []
      const updatedGroups = Array.isArray(result.updatedGroups) ? result.updatedGroups : []
      const failedGroups = Array.isArray(result.failedGroups) ? result.failedGroups : []
      const skippedGroups = Array.isArray(result.skippedGroups) ? result.skippedGroups : []
      const normalizedResult = {
        requestedGroups,
        updatedGroups,
        failedGroups,
        skippedGroups,
        timestamp: result.timestamp ?? new Date().toISOString(),
        durationMs: result.durationMs ?? 0,
        rateLimit: result.rateLimit ?? {
          limited: false,
          windowMs: KNX_ROOM_POLL_RATE_LIMIT_MS,
          nextAllowedAt: null,
        },
        ...result,
        requestedGroups,
        updatedGroups,
        failedGroups,
        skippedGroups,
      }
      const statusCode = result.rateLimit?.limited
        ? 429
        : requestedGroups.length === 0
          ? 409
          : 200
      sendJson(response, statusCode, {
        endpoint: url.pathname,
        ...normalizedResult,
      })
      return
    }

    if (url.pathname.startsWith('/api/integrations/') && url.pathname.endsWith('/config')) {
      const providerId = decodeURIComponent(
        url.pathname.slice('/api/integrations/'.length, -'/config'.length),
      )
      const result = await integrationManager.updateProviderConfig(providerId, payload)
      sendJson(response, result.ok ? 200 : 404, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    const lifecycleRouteMatch = /^\/api\/integrations\/([^/]+)\/(enable|disable|activate|deactivate)$/.exec(
      url.pathname,
    )

    if (lifecycleRouteMatch) {
      const providerId = decodeURIComponent(lifecycleRouteMatch[1])
      const action = lifecycleRouteMatch[2]
      const result = await runRuntimeAction(
        {
          type: action,
          category: 'providerLifecycle',
          source: 'api/integrations/lifecycle',
          target: { provider: providerId, action },
          payloadSummary: { provider: providerId, action },
          requestedBy: 'user',
          clientContext: getClientContext(request, 'user', payload, url),
          approvalRequired: false,
          confidence: 'medium',
          runtimeContext: { endpoint: url.pathname, runtimeMutated: false },
        },
        () => integrationManager.updateProviderLifecycle(providerId, action),
      )
      sendJson(response, result.ok ? 200 : 409, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    if (url.pathname === '/api/integrations/deltacoTuya/identify/start') {
      const result = await integrationManager.startDeltacoTuyaIdentifySession(payload)
      sendJson(response, 200, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    if (url.pathname === '/api/integrations/deltacoTuya/identify/observe') {
      const result = await integrationManager.observeDeltacoTuyaIdentifySession()
      sendJson(response, result.ok ? 200 : 409, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    if (url.pathname === '/api/integrations/deltacoTuya/mappings/confirm') {
      const result = await integrationManager.confirmDeltacoTuyaMapping(payload)
      sendJson(response, result.ok ? 200 : 409, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    if (url.pathname === '/api/mqtt/connect') {
      const result = await mqttRuntime.connect()
      recordIntegrationSnapshotAndEmit('mqtt', result)
      sendJson(response, 200, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    if (url.pathname === '/api/mqtt/disconnect') {
      const result = await mqttRuntime.disconnect()
      recordIntegrationSnapshotAndEmit('mqtt', result)
      sendJson(response, 200, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    if (url.pathname === '/api/cast/discover') {
      const result = await castRuntime.discover()
      recordIntegrationSnapshotAndEmit('cast', result)
      sendJson(response, 200, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    if (url.pathname === '/api/cast/play') {
      const result = await castRuntime.play(payload)
      recordIntegrationSnapshotAndEmit('cast-playback', result)
      sendJson(response, 200, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    if (url.pathname === '/api/cast/pause') {
      const result = await castRuntime.pause()
      recordIntegrationSnapshotAndEmit('cast-playback', result)
      sendJson(response, 200, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    if (url.pathname === '/api/cast/stop') {
      const result = await castRuntime.stop()
      recordIntegrationSnapshotAndEmit('cast-playback', result)
      sendJson(response, 200, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    if (url.pathname === '/api/cast/volume') {
      const result = await castRuntime.setVolume(payload)
      recordIntegrationSnapshotAndEmit('cast-playback', result)
      sendJson(response, 200, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    if (url.pathname === '/api/vacuum/connect') {
      const result = await vacuumRuntime.connect()
      recordIntegrationSnapshotAndEmit('vacuum', result)
      sendJson(response, 200, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    if (url.pathname === '/api/vacuum/command') {
      const result = await vacuumRuntime.command(payload)
      recordIntegrationSnapshotAndEmit('vacuum', result)
      sendJson(response, 200, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    if (url.pathname === '/api/vacuum/dock') {
      const result = await vacuumRuntime.dock()
      recordIntegrationSnapshotAndEmit('vacuum', result)
      sendJson(response, 200, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    if (url.pathname === '/api/dreame-cloud/connect') {
      const result = await dreameCloudRuntime.connect()
      sendJson(response, 200, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    if (url.pathname === '/api/runtime/config') {
      const nextRuntimeConfig = await runRuntimeAction(
        {
          type: 'runtimeConfigRefresh',
          category: 'runtimeRefresh',
          source: 'api/runtime/config',
          target: { runtime: 'bridge-config' },
          payloadSummary: {
            systemMode: payload?.systemMode ?? payload?.config?.runtime?.systemMode ?? null,
          },
          requestedBy: 'frontend',
          clientContext: getClientContext(request, 'frontend', payload, url),
          approvalRequired: false,
          confidence: 'medium',
          runtimeContext: { endpoint: url.pathname },
        },
        async () => applyRuntimeConfig(payload),
      )
      sendJson(response, 200, {
        endpoint: url.pathname,
        ok: true,
        runtimeConfig: nextRuntimeConfig,
      })
      return
    }

    if (url.pathname === '/api/knx/signal-loggers') {
      const logger = normalizeSignalLoggerPayload(payload)

      if (!logger) {
        sendJson(response, 400, {
          endpoint: url.pathname,
          ok: false,
          error: 'Signal logger krever navn og gyldig gruppeadresse',
        })
        return
      }

      customSignalLoggers.set(logger.id, logger)
      await persistCustomSignalLoggers()
      const runtime = startKnxSubscriptionRuntime('custom-signal-logger')
      sendJson(response, 200, {
        endpoint: url.pathname,
        ok: true,
        logger,
        runtime,
        sendsCommands: false,
      })
      return
    }

    if (url.pathname === '/api/knx/signal-loggers/update') {
      const id = String(payload?.id ?? '').trim()
      const existing = customSignalLoggers.get(id)
      if (!id || !existing) {
        sendJson(response, 404, {
          endpoint: url.pathname,
          ok: false,
          error: 'Signal logger finnes ikke',
        })
        return
      }
      const nextLogger = normalizeSignalLoggerPayload({
        ...existing,
        ...payload,
        id,
        createdAt: existing.createdAt,
      })
      if (!nextLogger) {
        sendJson(response, 400, {
          endpoint: url.pathname,
          ok: false,
          error: 'Signal logger krever navn og gyldig gruppeadresse',
        })
        return
      }
      customSignalLoggers.set(id, nextLogger)
      await persistCustomSignalLoggers()
      const runtime = startKnxSubscriptionRuntime('custom-signal-logger-update')
      sendJson(response, 200, {
        endpoint: url.pathname,
        ok: true,
        logger: nextLogger,
        runtime,
        sendsCommands: false,
      })
      return
    }

    if (url.pathname === '/api/knx/signal-loggers/delete') {
      const id = String(payload?.id ?? '').trim()
      const deleted = customSignalLoggers.delete(id)
      await persistCustomSignalLoggers()
      const runtime = startKnxSubscriptionRuntime('custom-signal-logger-delete')
      sendJson(response, deleted ? 200 : 404, {
        endpoint: url.pathname,
        ok: deleted,
        id,
        runtime,
        sendsCommands: false,
        error: deleted ? null : 'Signal logger finnes ikke',
      })
      return
    }

    if (url.pathname === '/api/knx/shading') {
      const plan = buildShadingActionPlan(payload)
      if (payload?.dryRun) {
        sendJson(response, 200, {
          endpoint: url.pathname,
          ok: plan.ok,
          dryRun: true,
          sendsCommands: false,
          plan,
          diagnostics: getShadingDiagnostics(),
          error: plan.error,
        })
        return
      }

      if (!plan.ok) {
        shadingRuntimeState.lastError = {
          at: new Date().toISOString(),
          shadingId: plan.shadingId,
          action: plan.action,
          skippedReason: plan.skippedReason,
          error: plan.error,
        }
        sendJson(response, 409, {
          endpoint: url.pathname,
          ok: false,
          dryRun: false,
          sendsCommands: false,
          plan,
          diagnostics: getShadingDiagnostics(),
          error: plan.error,
        })
        return
      }

      const result = await runRuntimeAction(
        {
          type: 'shadingControl',
          category: 'knxWrite',
          source: 'api/knx/shading',
          roomId: plan.roomKey,
          target: {
            shadingId: plan.shadingId,
            action: plan.action,
            room: plan.roomKey,
            zone: plan.zoneKey,
            groupAddress: plan.write.groupAddress,
          },
          payloadSummary: sanitizeActionPayloadSummary({
            shadingId: plan.shadingId,
            label: plan.label,
            action: plan.action,
            room: plan.roomKey,
            zone: plan.zoneKey,
            value: plan.write.requestedValue ?? plan.write.value,
          }),
          requestedBy: 'user',
          clientContext: getClientContext(request, 'user', payload, url),
          approvalRequired: false,
          confidence: plan.feedback?.expected ? 'medium' : 'low',
          runtimeContext: {
            endpoint: url.pathname,
            dpt: plan.write.dpt,
            groupAddress: plan.write.groupAddress,
            shadingId: plan.shadingId,
            action: plan.action,
            sendsCommands: true,
          },
        },
        () => handleShadingAction(payload, {
          source: 'api/knx/shading',
          relationType: 'manualShadingCommand',
          relationLabel: 'Manual shading command',
        }),
      )
      sendJson(response, result.ok ? 200 : 409, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    if (url.pathname === '/api/knx/single-action') {
      const action = String(payload?.action ?? '').trim()
      if (action === 'poll') {
        const result = await runRuntimeAction(
          {
            type: 'singleGaPoll',
            category: 'roomPoll',
            source: 'api/knx/single-action',
            target: { groupAddress: payload?.groupAddress ?? null, dpt: payload?.dpt ?? null },
            payloadSummary: sanitizeActionPayloadSummary({
              action,
              groupAddress: payload?.groupAddress ?? null,
              dpt: payload?.dpt ?? null,
            }),
            requestedBy: 'user',
            clientContext: getClientContext(request, 'user', payload, url),
            approvalRequired: false,
            confidence: 'medium',
            runtimeContext: { endpoint: url.pathname, debugTool: true, busRead: true, sendsCommands: false },
          },
          () => handleSingleGaPoll(payload),
        )
        sendJson(response, 200, {
          endpoint: url.pathname,
          ...result,
        })
        return
      }

      if (action === 'write') {
        const result = await runRuntimeAction(
          {
            type: 'singleGaDebugWrite',
            category: 'knxWrite',
            source: 'api/knx/single-action',
            target: { groupAddress: payload?.groupAddress ?? null, dpt: payload?.dpt ?? null },
            payloadSummary: sanitizeActionPayloadSummary({
              action,
              groupAddress: payload?.groupAddress ?? null,
              dpt: payload?.dpt ?? null,
              value: payload?.value ?? null,
            }),
            requestedBy: 'user',
            clientContext: getClientContext(request, 'user', payload, url),
            approvalRequired: false,
            confidence: 'medium',
            runtimeContext: { endpoint: url.pathname, debugTool: true, busWrite: true, sendsCommands: true },
          },
          () => handleSingleGaWrite(payload),
        )
        sendJson(response, 200, {
          endpoint: url.pathname,
          ...result,
        })
        return
      }

      sendJson(response, 400, {
        endpoint: url.pathname,
        ok: false,
        error: 'Single action må være poll eller write',
      })
      return
    }

    if (url.pathname === '/api/knx/feedback/subscribe-light') {
      const targets = normalizeFeedbackTargets(payload)
      const view = String(payload?.view ?? 'unknown')
      const subscriptionId = createLightFeedbackSubscription(targets, view)

      sendJson(response, 200, {
        endpoint: url.pathname,
        ok: true,
        subscriptionId,
        view,
        zoneCount: targets.length,
      })
      return
    }

    if (url.pathname === '/api/knx/feedback/unsubscribe-light') {
      const subscriptionId = String(payload?.subscriptionId ?? '')

      stopLightFeedbackSubscription(subscriptionId)
      sendJson(response, 200, {
        endpoint: url.pathname,
        ok: true,
        subscriptionId,
      })
      return
    }

    if (url.pathname === '/api/knx/feedback/subscribe-climate') {
      const targets = normalizeClimateFeedbackTargets(payload)
      const view = String(payload?.view ?? 'unknown')
      const subscriptionId = createClimateFeedbackSubscription(targets, view)
      const pointCount = targets.reduce((count, target) => count + target.points.length, 0)

      sendJson(response, 200, {
        endpoint: url.pathname,
        ok: true,
        subscriptionId,
        view,
        roomCount: targets.length,
        pointCount,
      })
      return
    }

    if (url.pathname === '/api/knx/feedback/unsubscribe-climate') {
      const subscriptionId = String(payload?.subscriptionId ?? '')

      stopClimateFeedbackSubscription(subscriptionId)
      sendJson(response, 200, {
        endpoint: url.pathname,
        ok: true,
        subscriptionId,
      })
      return
    }

    if (url.pathname === '/api/knx/light') {
      const result = await runRuntimeAction(
        {
          type: 'lightWrite',
          category: 'knxWrite',
          source: 'api/knx/light',
          roomId: payload?.room ?? null,
          target: { room: payload?.room ?? null, zone: payload?.zone ?? null },
          payloadSummary: sanitizeActionPayloadSummary(payload),
          requestedBy: 'user',
          clientContext: getClientContext(request, 'user', payload, url),
          approvalRequired: false,
          confidence: 'high',
          runtimeContext: { endpoint: url.pathname, dpt: '1.001' },
        },
        () => handleLightCommand(payload),
      )
      sendJson(response, 200, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    if (url.pathname === '/api/knx/brightness') {
      const result = await runRuntimeAction(
        {
          type: 'brightnessWrite',
          category: 'knxWrite',
          source: 'api/knx/brightness',
          roomId: payload?.room ?? null,
          target: { room: payload?.room ?? null, zone: payload?.zone ?? null },
          payloadSummary: sanitizeActionPayloadSummary(payload),
          requestedBy: 'user',
          clientContext: getClientContext(request, 'user', payload, url),
          approvalRequired: false,
          confidence: 'high',
          runtimeContext: { endpoint: url.pathname, dpt: '5.001' },
        },
        () => handleBrightnessCommand(payload),
      )
      sendJson(response, 200, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    if (url.pathname === '/api/knx/feedback/query') {
      const result = await handleFeedbackQuery(payload)
      sendJson(response, 200, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    if (url.pathname === '/api/knx/climate/temperature') {
      const result = await handleClimateTemperatureQuery(payload)
      sendJson(response, 200, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    if (url.pathname === '/api/knx/mode') {
      const result = await runRuntimeAction(
        {
          type: 'setpointWrite',
          category: 'knxWrite',
          source: 'api/knx/mode',
          roomId: payload?.room ?? null,
          target: { room: payload?.room ?? null, mode: payload?.mode ?? null },
          payloadSummary: sanitizeActionPayloadSummary(payload),
          requestedBy: 'user',
          clientContext: getClientContext(request, 'user', payload, url),
          approvalRequired: false,
          confidence: 'high',
          runtimeContext: { endpoint: url.pathname, dpt: CLIMATE_FLOAT_DPT },
        },
        () => handleModeCommand(payload),
      )
      sendJson(response, 200, {
        endpoint: url.pathname,
        ...result,
      })
      return
    }

    sendJson(response, 200, {
      ok: true,
      message: 'KNX command simulated',
      endpoint: url.pathname,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid JSON payload'
    if (url.pathname === '/api/runtime/config') {
      runtimeConfigDiagnostics.runtimeConfigPostError = message
      console.log('[Bridge] runtime-config POST received', {
        payloadBytes: runtimeConfigDiagnostics.runtimeConfigPostPayloadBytes,
        parseStatus: 'invalid-json',
        error: message,
      })
      runtimeConfigDiagnostics.targetBuildErrors = [
        {
          at: new Date().toISOString(),
          reason: 'runtime-config-post',
          message,
        },
      ]
    }
    sendJson(response, 400, { ok: false, error: message })
  }
})

recordRuntimeBootPhase('initializing', {
  reason: 'module-ready',
  message: 'Bridge runtime module loaded',
})
recordRuntimeBootPhase('registryLoading', {
  reason: 'boot-registry',
  message: 'Loading runtime registry and semantic composition',
})
emitRuntimeRegistryEvents('boot-registry')
runtimeBootState.bootReport.registryLoaded = true
recordRuntimeBootPhase('runtimeServicesBoot', {
  reason: 'boot-services',
  message: 'Runtime services discovered through registry metadata',
})
runtimeBootState.bootReport.runtimeServicesBooted = getRuntimeServiceManifests().length > 0
runtimeBootState.bootReport.diagnosticsReady = true
recordRuntimeBootPhase('restoring', {
  reason: 'boot-restore',
  message: 'Restoring runtime actions, audit, snapshots and insights',
})
await restoreRuntimeActionHistory()
await restoreRuntimeAuditHistory()
await restoreRuntimeContinuitySnapshot()
await restoreRuntimeInsights()
await restoreCustomSignalLoggers()
await restoreRuntimeSystemConfig()
await restoreSceneSchedulerState()
await restorePersistedRuntimeConfig()
runtimeBootState.bootReport.insightEngineReady = runtimeInsightState.lastError === null
recordRuntimeBootPhase('providerBoot', {
  reason: 'boot-provider-readiness',
  message: 'Provider readiness mapped without hardware mutation',
})
updateRuntimeProviderReadiness('boot-provider-readiness')

server.listen(PORT, BRIDGE_HOST, () => {
  recordRuntimeBootPhase('realtimeStartup', {
    reason: 'server-listen',
    message: 'HTTP/SSE runtime endpoints are listening',
  })
  if (!runtimeConfig) {
    runtimeConfig = normalizeRuntimeConfig(createDefaultRuntimeConfigPayload())
    updateRuntimeConfigDiagnostics('safe-default', 'boot-default')
  }
  runtimeStateStore.recordRuntimeConfig(runtimeConfig, getHealthPayload())
  startKnxSubscriptionRuntime(
    runtimeConfigDiagnostics.runtimeConfigSource === 'persisted-server-config'
      ? 'boot-persisted-server-config'
      : 'boot-default',
  )
  runtimeBootState.bootReport.realtimeStarted = true

  console.log('[Bridge] Live write mapping source', {
    source: 'runtime-config',
    status: 'safe-default-ready',
  })
  console.log('[Bridge] Live climate pilot enabled', {
    mode: 'manager-controlled',
    pollIntervalMs: 20000,
    connectionMode: 'waiting-for-config',
  })
  console.log('[Bridge] Lynell bridge listening', {
    host: BRIDGE_HOST,
    port: PORT,
    local: `http://localhost:${PORT}`,
    localHealth: `http://localhost:${PORT}/api/runtime/health`,
    lanHealth: `http://<bridge-lan-ip>:${PORT}/api/runtime/health`,
  })
  console.log('[Bridge] Runtime has safe default config; app config can refine it', {
    strategy: 'server-owned-default-then-idempotent-app-config',
  })
  console.log('[Bridge] Runtime boot orchestration', {
    phase: runtimeBootState.currentPhase,
    lifecycle: 'foundation',
    health: `http://localhost:${PORT}/api/runtime/health`,
    bindHost: BRIDGE_HOST,
  })
  emitRuntimeRegistryEvents('bridge-start')
  finalizeRuntimeBoot('bridge-start')
  startSceneScheduler()
  void createAndPersistRuntimeContinuitySnapshot('bridge-start')
  const runtimeSnapshotTimer = setInterval(() => {
    void createAndPersistRuntimeContinuitySnapshot('scheduled')
  }, runtimeContinuityState.retention.cadenceMs)
  if (typeof runtimeSnapshotTimer.unref === 'function') {
    runtimeSnapshotTimer.unref()
  }
})
