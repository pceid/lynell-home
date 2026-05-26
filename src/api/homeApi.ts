import {
  buildRoomsFromSystemConfig,
  createInitialSystemConfig,
  type NetworkConfig,
  type RuntimeConfig,
  type SystemConfig,
} from '../config/systemConfig'
import type { LightZone, Room, RoomMode } from '../data/rooms'
import { knxMapping, type KnxRoomMapping } from '../knx/knxMapping'
import type { MediaTrack } from '../media/mediaTypes'
import type { UiCapabilityConfig } from '../runtime/uiCapabilities'
import {
  isConfiguredAddress,
  summarizeKnxRuntimeMapping,
  type BridgeRuntimeConfigPayloadSummary,
} from '../runtime/runtimeConfigSummary'
export type { BridgeRuntimeConfigPayloadSummary } from '../runtime/runtimeConfigSummary'
export { summarizeKnxRuntimeMapping } from '../runtime/runtimeConfigSummary'

export type SystemMode = 'live' | 'demo' | 'developer' | 'simulate'

let modeSetpoints: Record<RoomMode, number> = {
  Komfort: 22,
  Natt: 18,
}
function getDefaultBridgeBaseUrl() {
  if (typeof window === 'undefined' || !window.location.hostname) {
    return 'http://localhost:8787'
  }

  return `${window.location.protocol}//${window.location.hostname}:8787`
}

function isLoopbackHost(hostname: string) {
  const normalized = hostname.toLowerCase()
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1'
}

function resolveBridgeBaseUrl() {
  const fallback = getDefaultBridgeBaseUrl()
  const configured = import.meta.env.VITE_BRIDGE_BASE_URL?.trim()

  if (!configured) {
    return fallback
  }

  if (typeof window === 'undefined') {
    return configured
  }

  try {
    const configuredUrl = new URL(configured)
    if (typeof window !== 'undefined' && isLoopbackHost(window.location.hostname) && !isLoopbackHost(configuredUrl.hostname)) {
      return fallback
    }
    if (isLoopbackHost(configuredUrl.hostname) && !isLoopbackHost(window.location.hostname)) {
      return fallback
    }
  } catch {
    return fallback
  }

  return configured
}

const configuredBridgeBaseUrl = import.meta.env.VITE_BRIDGE_BASE_URL?.trim()
const BRIDGE_BASE_URL = resolveBridgeBaseUrl().replace(/\/$/, '')
const CLIENT_ID_STORAGE_KEY = 'lynell.runtime.clientId'
const SESSION_ID_STORAGE_KEY = 'lynell.runtime.sessionId'
let cachedRuntimeClientIdentity: RuntimeClientRegistration | null = null
let currentSystemMode: SystemMode = 'live'
let lastBridgeFetchFailure: {
  endpoint: string
  message: string
  at: string
  bridgeBaseUrl: string
} | null = null

function isMockRuntimeMode(mode: SystemMode) {
  return mode === 'demo' || mode === 'developer' || mode === 'simulate'
}

export type BridgeHealthSnapshot = {
  ok: boolean
  timestamp: string
  bridge?: {
    listenHost: string
    port: number
    localHealthUrl: string
    lanHealthUrlHint: string
  }
  runtimeConfigReceived: boolean
  runtimeConfigDiagnostics?: {
    runtimeConfigReceived: boolean
    runtimeConfigSource: string
    lastRuntimeConfigAt: string | null
    targetBuildAttempted: boolean
    targetBuildCount: number
    targetBuildErrors: Array<Record<string, unknown>>
    whyTargetCountZero: string | null
    latestPayloadSummary?: BridgeRuntimeConfigPayloadSummary | null
    latestPayloadSizeBytes?: number | null
    runtimeConfigPostReceivedAt?: string | null
    runtimeConfigPostPayloadBytes?: number | null
    runtimeConfigPostParsed?: boolean
    runtimeConfigPostError?: string | null
    latestValidConfigAt?: string | null
    latestValidConfigAgeMs?: number | null
    persistedConfigPath?: string | null
    persistedConfigRestored?: boolean
    persistedConfigError?: string | null
    restoredConfigIntegrity?: Record<string, unknown> | null
    missingClimateMappings?: boolean
    restoredRoomCount?: number
    restoredClimateWriteCount?: number
    restoredClimateFeedbackCount?: number
    restoredLightCount?: number
    restoredDimCount?: number
    feedbackMappingCounts?: {
      light: number
      dim: number
      climate: number
    }
  }
  systemConfig?: ServerSystemConfigDiagnostics
  sceneScheduler?: SceneSchedulerDiagnostics
  connectionMode: NetworkConfig['connectionMode'] | null
  writeMappingCounts: {
    light: number
    dim: number
    climate: number
  }
  lightSubscribeActive: boolean
  climateSubscribeActive: boolean
  knxSubscriptionRuntime?: KnxSubscriptionRuntimeSummary
}

export type SceneSchedulerDiagnostics = {
  schedulerActive: boolean
  schedulerSource: 'server-runtime' | 'frontend' | 'unknown' | string
  persisted: boolean
  unsafeFrontendScheduler?: boolean
  intervalMs?: number
  missedGraceMs?: number
  startedAt?: string | null
  schedulerStartedAt?: string | null
  tickCount?: number
  lastTickAt?: string | null
  nextTickAt?: string | null
  lastCheckAt: string | null
  lastDueCheck?: Record<string, unknown> | null
  dueScenes?: Array<Record<string, unknown>>
  scheduledSceneCount: number
  enabledSceneCount?: number
  scheduledScenes: Array<{
    sceneId: string
    sceneName: string
    triggerTime: string
    lightingTargetCount?: number
    climateTargetCount?: number
    enabled?: boolean
    nextExecutionAt?: string
  }>
  nextExecution: {
    sceneId: string
    sceneName: string
    triggerTime: string
    nextExecutionAt: string
  } | null
  lastExecution: {
    sceneId: string
    sceneName: string
    triggerTime?: string
    executedAt: string
    reason?: string
    resultCount?: number
    failedCount?: number
    source?: string
  } | null
  lastExecutionAttempt?: Record<string, unknown> | null
  lastExecutionResult?: Record<string, unknown> | null
  lastExecutionError?: string | null
  lastExecutionKey?: string | null
  lastDryRun?: Record<string, unknown> | null
  lastSkippedReason?: {
    reason?: string
    detail?: unknown
    at?: string
  } | null
  missedExecutionCount: number
  lastError: string | null
  executionHistory?: Array<Record<string, unknown>>
  storagePath?: string | null
}

export type AutoPollQuietSignalsConfig = {
  enabled: boolean
  mode?: 'allEligible' | 'selectedSignals' | 'selectedRooms' | 'selectedGroupAddresses'
  quietThresholdMinutes: number
  globalMaxPollsPerWindow: number
  pollWindowMinutes: number
  perRoomCooldownMinutes: number
  perSignalCooldownMinutes?: number
  selectedSignals?: string[]
  selectedRooms?: string[]
  selectedGroupAddresses?: string[]
  excludedSignals?: string[]
  excludedRooms?: string[]
  excludedGroupAddresses?: string[]
  sourceWhenEnabled?: 'autoPoll' | string
  staleRelevantOnly?: boolean
  skipOnChangeOnly?: boolean
}

export type ConversationFeedbackIssueType =
  | 'lightModeContrast'
  | 'unclearText'
  | 'wrongIntent'
  | 'missingAction'
  | 'noisyObservation'
  | 'trustMismatch'

export type ConversationFeedbackReview = {
  available: boolean
  reviewedAt: string
  itemCount: number
  byPage: Record<string, number>
  byIssueType: Record<ConversationFeedbackIssueType | string, number>
  latestFeedbackItems: Array<{
    at: string | null
    page: string
    issueTypes: Array<ConversationFeedbackIssueType | string>
    message: string
  }>
  error?: string | null
}

export type ServerSystemConfigDiagnostics = {
  configSource: 'server' | 'localFallback' | 'none' | string
  lastConfigSaveAt: string | null
  lastConfigSaveClient: string | null
  lastConfigSaveSession?: string | null
  configVersion: number
  configDriftDetected: boolean
  storagePath?: string | null
  loadedAt?: string | null
  lastError?: string | null
  hasServerConfig?: boolean
  language?: 'no' | 'en' | string
  roomCount?: number
  heatDemandAddressCount?: number
  heatPowerCoverage?: {
    climateRoomCount: number
    configuredHeatPowerCount: number
    nominalPowerCount: number
    heatPowerCoveragePercent: number
    roomsMissingHeatPower: Array<{ roomKey: string | null; roomName: string | null }>
  }
  cameraFoundation?: {
    providerEnabled: boolean
    cameraCount: number
    enabledCount: number
    visibleCount: number
    recordingEnabledCount: number
    missingStreamCount: number
    recorderTarget: string
    retentionDays: number
    overwriteOldest: boolean
    storageHealth: string
  }
  mediaGroups?: {
    groupCount: number
    enabledCount: number
    speakerCount: number
    castTargetCount: number
    delayOffsetCount: number
  }
  uiCapabilityServerOwned?: boolean
  conversationLoggingEnabled?: boolean
  conversationLog?: {
    path?: string
    savedCount?: number
    lastSavedAt?: string | null
    lastIntent?: string | null
    lastPage?: string | null
    lastError?: string | null
  }
  conversationFeedbackReview?: ConversationFeedbackReview
  autoPollQuietSignals?: AutoPollQuietSignalsConfig
}

export type ServerSystemConfigSnapshot = {
  ok: boolean
  source: string
  timestamp: string
  systemConfig: SystemConfig | null
  uiCapabilityConfig: UiCapabilityConfig | null
  conversationLogging: {
    enabled: boolean
    updatedAt?: string | null
  }
  autoPollQuietSignals: AutoPollQuietSignalsConfig
  diagnostics: ServerSystemConfigDiagnostics
}

export type KnxSubscriptionRuntimeSummary = {
  active: boolean
  connectionMode: NetworkConfig['connectionMode'] | string | null
  targetCount: number
  cachedGroupCount: number
  lastTelegramAt: string | null
  startedAt: string | null
  stoppedAt: string | null
  error: string | null
  staleGroupCount: number
  freshnessCounts?: Record<'fresh' | 'aging' | 'stale' | 'unknown' | string, number>
  stalePolicies?: Record<
    string,
    {
      freshMs: number
      agingMs: number
      staleMs: number
    }
  >
  heatDemandParser: {
    dpt: string
    status: string
    mapping: string
    cachedCount: number
    latest: {
      roomKey: string | null
      groupAddress: string
      decodedValue: number | string | boolean | null
      mappingVariant: string | null
      at: string
    } | null
  }
  setpointStrategies: Array<{
    roomKey: string
    label: string
    strategy: 'absoluteTemperature' | 'relativeOffset'
    setpointAddress: string
    setpointDataType: string
    offsetEnabled: boolean
  }>
}

export type KnxDiagnosticsSnapshot = {
  ok: boolean
  source: string
  timestamp: string
  runtimeConfigReceived?: boolean
  runtimeConfigSource?: string
  lastRuntimeConfigAt?: string | null
  targetBuildAttempted?: boolean
  targetBuildCount?: number
  targetBuildErrors?: Array<Record<string, unknown>>
  whyTargetCountZero?: string | null
  latestPayloadSummary?: BridgeRuntimeConfigPayloadSummary | null
  latestPayloadSizeBytes?: number | null
  runtimeConfigPostReceivedAt?: string | null
  runtimeConfigPostPayloadBytes?: number | null
  runtimeConfigPostParsed?: boolean
  runtimeConfigPostError?: string | null
  latestValidConfigAt?: string | null
  latestValidConfigAgeMs?: number | null
  persistedConfigPath?: string | null
  persistedConfigRestored?: boolean
  persistedConfigError?: string | null
  restoredConfigIntegrity?: Record<string, unknown> | null
  missingClimateMappings?: boolean
  restoredRoomCount?: number
  restoredClimateWriteCount?: number
  restoredClimateFeedbackCount?: number
  restoredLightCount?: number
  restoredDimCount?: number
  soakMetrics?: Record<string, unknown>
  feedbackMappingCounts?: {
    light: number
    dim: number
    climate: number
  }
  runtimeConfig?: {
    runtimeConfigReceived: boolean
    runtimeConfigSource: string
    lastRuntimeConfigAt: string | null
    targetBuildAttempted: boolean
    targetBuildCount: number
    targetBuildErrors: Array<Record<string, unknown>>
    whyTargetCountZero: string | null
    latestPayloadSummary?: BridgeRuntimeConfigPayloadSummary | null
    latestPayloadSizeBytes?: number | null
    runtimeConfigPostReceivedAt?: string | null
    runtimeConfigPostPayloadBytes?: number | null
    runtimeConfigPostParsed?: boolean
    runtimeConfigPostError?: string | null
    latestValidConfigAt?: string | null
    latestValidConfigAgeMs?: number | null
    persistedConfigPath?: string | null
    persistedConfigRestored?: boolean
    persistedConfigError?: string | null
    restoredConfigIntegrity?: Record<string, unknown> | null
    missingClimateMappings?: boolean
    restoredRoomCount?: number
    restoredClimateWriteCount?: number
    restoredClimateFeedbackCount?: number
    restoredLightCount?: number
    restoredDimCount?: number
    soakMetrics?: Record<string, unknown>
    feedbackMappingCounts: {
      light: number
      dim: number
      climate: number
    }
  }
  runtime: KnxSubscriptionRuntimeSummary
  shading?: Record<string, unknown>
  writePath?: {
    status: string
    mappingCounts: {
      light: number
      dim: number
      climate: number
    }
    actionPipelineBlocking: boolean
    localKnxWriteAutoApprove: boolean
    connectionState: string
  }
  recentTelegrams: Array<{
    groupAddress: string
    roomKey: string | null
    zoneKey: string | null
    field: string | null
    dpt: string
    decodedValue: number | string | boolean | null
    mappingVariant: string | null
    source: string
    timestamp: string
  }>
  staleGroups: Array<{
    groupAddress: string
    roomKey: string | null
    field: string | null
    at: string
    ageMs: number
  }>
  roomPolls?: KnxRoomPollSummary[]
  signalLoggers?: KnxSignalLoggerStatus
  singleGaActions?: KnxSingleGaActionStatus
  monitor?: KnxMonitorDiagnostics
  etsAudit?: KnxEtsAuditResult
}

export type KnxMonitorEvent = {
  id: string
  sequence: number
  timestamp: number
  at: string
  source: string
  direction: 'feedback' | 'read' | 'write' | 'internal' | string
  groupAddress: string | null
  dpt: string | null
  dataType: string | null
  decodedValue: number | string | boolean | null
  rawValue: number | string | boolean | { type: string; hex: string } | null
  confidence: string
  roomKey: string | null
  roomName: string | null
  zoneKey: string | null
  zoneName: string | null
  field: string | null
  normalizedField: string | null
  signalType: string
  mappingVariant: string | null
  responseSource: string | null
  relation: Record<string, unknown> | null
  tone: 'write' | 'feedback' | 'poll' | 'scene' | 'optimistic' | 'stale' | 'autoPoll' | 'error' | string
  stale: boolean
  error: string | null
}

export type KnxMonitorDiagnostics = {
  active: boolean
  startedAt: string
  bufferLimit: number
  bufferSize: number
  droppedEvents: number
  totalEvents: number
  lastEventAt: string | null
  liveTelegramRatePerMinute: number
  latestSequence: number | null
  monitorLatencyMs: number | null
  sourceCounts: Record<string, number>
  directionCounts: Record<string, number>
  signalTypeCounts: Record<string, number>
}

export type KnxMonitorSnapshot = {
  ok: boolean
  source: string
  timestamp: string
  diagnostics: KnxMonitorDiagnostics
  events: KnxMonitorEvent[]
}

export type KnxGroupCacheEntry = {
  groupAddress: string
  dpt: string
  decodedValue: number | string | boolean | null
  rawValue: number | string | boolean | { type: string; hex: string } | null
  roomKey: string | null
  zoneKey: string | null
  label: string | null
  field: string | null
  dataType: string | null
  source: string
  confidence: string
  quality: string
  mappingVariant: string | null
  timestamp: number
  at: string
  ageMs: number
  stale: boolean
  freshness?: {
    state: 'fresh' | 'aging' | 'stale' | 'unknown' | string
    ageMs: number | null
    policy: {
      freshMs: number
      agingMs: number
      staleMs: number
    }
  }
}

export type KnxStateSnapshot = {
  ok: boolean
  source: string
  timestamp: string
  subscription: KnxSubscriptionRuntimeSummary
  groups: KnxGroupCacheEntry[]
}

export type KnxRoomPollGroup = {
  groupAddress: string
  field: string
  dpt: string
  dataType?: string | null
  zoneKey?: string | null
  label?: string | null
  decodedValue?: number | string | boolean | null
  mappingVariant?: string | null
  source?: string | null
  responseSource?: string | null
  failureType?: 'notConfigured' | 'skippedEmptyAddress' | 'noResponse' | 'timeout' | 'invalidDpt' | string
  skipped?: boolean
  error?: string | null
}

export type KnxSignalLogger = {
  id: string
  name: string
  groupAddress: string
  dataType: '1-bit' | '1-byte' | '2-byte'
  dpt: string
  category: string
  roomKey: string | null
  updateMode?: 'cyclic' | 'onChange' | 'manualPoll' | 'unknown'
  expectedIntervalMs?: number | null
  enabled: boolean
  createdAt: string
  updatedAt?: string | null
  cached?: boolean
  lastValue?: number | string | boolean | null
  lastSeenAt?: string | null
}

export type KnxSignalLoggerStatus = {
  count: number
  activeCount: number
  loggers: KnxSignalLogger[]
  persistence?: Record<string, unknown>
}

export type KnxSignalLoggerSnapshot = {
  ok: boolean
  source: string
  timestamp: string
  sendsCommands: boolean
  persistence?: Record<string, unknown>
  loggers: KnxSignalLogger[]
}

export type KnxSingleGaActionResult = {
  ok: boolean
  action: 'poll' | 'write'
  groupAddress: string
  dpt: '1.001' | '5.001' | '9.001' | '20.102' | string
  dataType?: string | null
  rawValue?: number | string | boolean | { type: string; hex: string } | null
  decodedValue?: number | string | boolean | null
  mappingVariant?: string | null
  source?: string
  responseSource?: string | null
  loggedToHistory?: boolean
  signalLoggerId?: string | null
  value?: string | number | boolean | null
  debugWrite?: boolean
  sendsCommands?: boolean
  timestamp?: string
  durationMs?: number
  message?: string
  error?: string
}

export type KnxSingleGaActionStatus = {
  lastAction: KnxSingleGaActionResult | null
  history: KnxSingleGaActionResult[]
  supportsPoll: boolean
  supportsWrite: boolean
  supportedDpts: string[]
  debugOnly: boolean
}

export type KnxEtsAuditResult = {
  ok: boolean | null
  auditedAt?: string
  source?: string
  path?: string
  error?: string
  lastError?: string | null
  message?: string
  etsTelegramCount?: number
  runtimePointCount?: number
  runtimeTargetCount?: number
  summary?: {
    seenInEtsMissingInRuntime: number
    suspectedDedupeDrops: number
    wrongFieldMappings: number
    wrongDptMappings: number
    unknownGaEventCount: number
    runtimeNotInEtsCount: number
  }
  watchedGroups?: Array<{
    groupAddress: string
    etsCount: number
    runtimeCount: number
    latestEtsAt: string | null
    latestRuntimeAt: string | null
    latestRuntimeSource: string | null
  }>
  missingRuntimeDatapoints?: Array<Record<string, unknown>>
  suspectedDedupeDrops?: Array<Record<string, unknown>>
  wrongFieldMappings?: Array<Record<string, unknown>>
  wrongDptMappings?: Array<Record<string, unknown>>
  unknownGaEvents?: Array<Record<string, unknown>>
  runtimeOnlyDatapoints?: Array<Record<string, unknown>>
}

export type KnxRoomPollSummary = {
  roomId: string
  lastAttemptAt?: string | null
  lastPollAt?: string | null
  lastError?: string | null
  rateLimited?: boolean
  nextAllowedAt?: string | null
  durationMs?: number | null
  requestedGroups: KnxRoomPollGroup[]
  updatedGroups: KnxRoomPollGroup[]
  failedGroups: KnxRoomPollGroup[]
  skippedGroups?: KnxRoomPollGroup[]
  diagnostics?: {
    realFailedCount: number
    skippedCount: number
    failedCount: number
    classifications: Record<string, number>
  }
}

export type KnxRoomPollResult = {
  ok: boolean
  endpoint?: string
  roomId: string
  requestedGroups: KnxRoomPollGroup[]
  updatedGroups: KnxRoomPollGroup[]
  failedGroups: KnxRoomPollGroup[]
  skippedGroups?: KnxRoomPollGroup[]
  timestamp: string
  durationMs: number
  source?: string
  busRead?: boolean
  globalPoll?: boolean
  rateLimit: {
    limited: boolean
    windowMs: number
    retryAfterMs?: number
    nextAllowedAt?: string | null
  }
  error?: string
  diagnostics?: {
    realFailedCount: number
    skippedCount: number
    failedCount: number
    classifications: Record<string, number>
  }
}

export type ServerRuntimeSummary = {
  ok: boolean
  sourceOfTruth: string
  startedAt: string
  updatedAt: string
  uptimeMs: number
  runtimeConfigReceived: boolean
  connectionMode: NetworkConfig['connectionMode'] | string | null
  historySampleCount: number
  historyPointCount: number
  snapshotCadenceMs: number
  cadence?: {
    heartbeatMs: number
    categories: Record<string, number>
  }
  categoryCounts?: Record<
    string,
    {
      events: number
      points: number
      oldestAt: string | null
      newestAt: string | null
    }
  >
  ranges?: Record<string, ServerRuntimeRangeMetadata>
  persistence?: ServerRuntimePersistenceStatus
  roomSummary: {
    roomCount: number
    activeLightRooms: number
    climateRooms: number
    roomsWithSignals: Array<{
      roomKey: string
      label: string
      updatedAt: string | null
    }>
  }
  roomSnapshotCount?: number
  connectedIntegrations: string[]
  atmosphere: {
    label: string
    summary: string
    updatedAt: string
  }
  latestHistory: ServerRuntimeHistoryEntry | null
}

export type ServerRuntimePersistenceStatus = {
  enabled: boolean
  restored: boolean
  restoredEvents: number
  restoredPoints: number
  restoredRooms: number
  restoredAt: string | null
  storagePath: string
  lastFlushAt: string | null
  lastCompactAt: string | null
  lastError: string | null
  pendingWrites: number
  files?: Record<string, string>
  retention: {
    maxEvents?: number
    maxPoints?: number
    historyLimit?: number
    pointLimit?: number
    database: boolean
    rotation?: string
  }
}

export type ServerRoomSnapshot = {
  roomKey: string
  roomId: string
  label: string
  currentTemperature: number | null
  targetTemperature: number | null
  heatDemand: number | null
  comfortState: string
  lightState: string
  averageBrightness: number | null
  activityLevel: string
  runtimeConfidence: string
  lastUpdatedAt: string | null
  latestDatapoints: Record<string, unknown>
}

export type ServerRuntimeAggregateStat = {
  avg: number | null
  min: number | null
  max: number | null
  count: number
  confidence: string
}

export type ServerRuntimeAggregates = {
  ok: boolean
  sourceOfTruth: string
  generatedAt: string
  cadence: {
    heartbeatMs: number
    categories: Record<string, number>
  }
  roomSnapshots: ServerRoomSnapshot[]
  aggregates: Record<
    string,
    {
      range: ServerRuntimeRangeMetadata
      sparse: boolean
      categories: Record<
        string,
        ServerRuntimeAggregateStat & {
          sparse: boolean
          fields: Record<string, ServerRuntimeAggregateStat>
          rooms: Record<string, ServerRuntimeAggregateStat>
        }
      >
    }
  >
  sparseHandling: {
    ranges: string[]
    emptyWindowsRemainVisible: boolean
    fakeDatapoints: boolean
  }
  analysisFoundation: Record<string, string>
}

export type ServerRuntimeInsight = {
  id: string
  timestamp: number
  at: string
  type:
    | 'comfortDrift'
    | 'unstableRoom'
    | 'staleRuntime'
    | 'unusualActivity'
    | 'atmosphereShift'
    | 'inactiveRoom'
    | 'highHeatDemand'
    | string
  severity: 'low' | 'medium' | 'high' | string
  confidence: 'low' | 'medium' | 'high' | string
  roomId?: string | null
  roomLabel?: string | null
  title: string
  summary: string
  source: string
  observationWindow: string
  signals: Array<{
    key: string
    value: string | number | boolean | null
  }>
}

export type ServerRuntimeInsights = {
  ok: boolean
  sourceOfTruth: string
  generatedAt: string
  model: {
    kind: string
    aiMl: boolean
    readOnly: boolean
    actions: boolean
    automations: boolean
  }
  sparse: boolean
  insightCount: number
  insightTypes: string[]
  insights: ServerRuntimeInsight[]
  signals: {
    roomSnapshotCount: number
    historyPointCount: number
    historyEventCount: number
    latestHistoryAt: string | null
    ranges: Record<string, ServerRuntimeRangeMetadata>
  }
  futureFoundation: Record<string, string>
  runtimeInsightEngine?: RuntimeInsightEngineSnapshot
  semanticInsights?: RuntimeInsight[]
  explainable?: boolean
  deterministic?: boolean
}

export type RuntimeEventType =
  | 'roomUpdated'
  | 'knxValueUpdated'
  | 'historyPointAdded'
  | 'signalLoggerPoint'
  | 'runtimeFreshnessChanged'
  | 'runtimeSnapshotUpdated'
  | 'pollCompleted'
  | 'insightGenerated'
  | 'insightUpdated'
  | 'insightResolved'
  | 'insightAcknowledged'
  | 'providerStateChanged'
  | 'runtimeHeartbeat'
  | 'resyncRequired'
  | 'actionCreated'
  | 'actionApproved'
  | 'actionExecuted'
  | 'actionFailed'
  | 'actionCancelled'
  | 'actionPendingApproval'
  | 'actionApprovalRequested'
  | 'actionDenied'
  | 'actionExecutionStarted'
  | 'actionExecutionCompleted'
  | 'runtimeSnapshotCreated'
  | 'runtimeSnapshotRestored'
  | 'runtimePartialRestore'
  | 'runtimeRecoveryDetected'
  | 'providerRegistered'
  | 'registryUpdated'
  | 'runtimeServiceHealthChanged'
  | 'runtimeBootPhaseChanged'
  | 'providerBootCompleted'
  | 'providerBootDegraded'
  | 'runtimeReady'
  | 'runtimeDegraded'
  | 'policyUpdated'
  | 'auditEventCreated'
  | string

export type RuntimePolicySummary = {
  policyId: string
  category: string
  actionType: string
  enabled: boolean
  requiresApproval: boolean
  autoApproveLocal: boolean
  allowRemote: boolean
  allowNivaProposal: boolean
  allowSchedule: boolean
  allowAutomationFuture: boolean
  riskLevel: string
  createdAt: string
  updatedAt: string
}

export type RuntimeDomainSummary = {
  domainId: string
  category: string
  displayName: string
  runtimeOwner: string
  capabilities: string[]
  providers: string[]
  trustedActions: string[]
  requiresApprovalActions: string[]
  eventCategories: string[]
  health: 'healthy' | 'degraded' | 'offline' | 'experimental' | 'disabled' | string
  enabled: boolean
  experimental: boolean
  sensitiveCapabilities?: string[]
  approvalHeavy?: boolean
  realtimeCritical?: boolean
}

export type RuntimeDomainSnapshot = {
  model: string
  microservices: boolean
  pluginSystem: boolean
  distributedRuntime: boolean
  domains: RuntimeDomainSummary[]
  counts: {
    domains: number
    enabled: number
    experimental: number
    approvalSensitive: number
    realtimeCapable: number
  }
  sensitiveCapabilities: string[]
}

export type RuntimeContinuitySnapshot = {
  snapshotId: string
  createdAt: string
  runtimeVersion: string
  reason?: string
  domains: RuntimeDomainSummary[]
  activeClients: RuntimeClientSnapshot['clients']
  activeSessions: RuntimeClientSnapshot['sessions']
  pendingActions: RuntimeActionSummary[]
  approvalQueue?: RuntimeActionMetrics['approvalQueue']
  runtimeHealth: Record<string, unknown>
  eventStreamHealth: Record<string, unknown>
  staleCounts: Record<string, unknown>
  providerStates: Array<Record<string, unknown>>
  roomTruthSummary: Record<string, unknown>
  restored: boolean
  partialRestore: boolean
  restoredAt?: string | null
  safety?: Record<string, unknown>
}

export type RuntimeContinuityStatus = {
  enabled: boolean
  storagePath: string
  snapshotCount: number
  restored: boolean
  partialRestore: boolean
  restoredAt: string | null
  restoredSnapshotId: string | null
  restoredSnapshotAgeMs: number | null
  lastSnapshotAt: string | null
  lastSnapshotId: string | null
  lastError: string | null
  reconnectContinuity: string
  retention: {
    maxSnapshots: number
    cadenceMs: number
  }
  lastSnapshot: {
    snapshotId: string
    createdAt: string
    restored: boolean
    partialRestore: boolean
    pendingActions: number
  } | null
}

export type RuntimeProviderManifest = {
  providerId: string
  displayName: string
  domainId: string
  domains: string[]
  category: string
  maturity?: 'liveRuntime' | 'statusOnly' | 'foundation' | 'prepared' | 'mock' | 'future' | string
  capabilities: string[]
  runtimeFeatures: string[]
  health: string
  enabled: boolean
  experimental: boolean
  realtime: boolean
  approvalSensitive: boolean
  persistenceAware: boolean
  recoveryAware: boolean
  supportsRead?: boolean
  supportsWrite?: boolean
  supportsDiscovery?: boolean
  supportsLifecycle?: boolean
  sendsCommands?: boolean
  requiresCredentials?: boolean
  runtimeConnected?: boolean
  foundationOnly?: boolean
  controlAvailable?: boolean
  supportsLivePower?: boolean
  supportsHourlyConsumption?: boolean
  supportsSpotPrice?: boolean | 'foundation'
  providerCandidates?: string[]
  version: string
  runtimeOwner: string
}

export type RuntimeServiceManifest = {
  serviceId: string
  displayName: string
  runtimeOwner: string
  health: string
  capabilities: string[]
  realtime: boolean
  persistenceAware: boolean
  recoveryAware: boolean
  version: string
}

export type RuntimeRegistrySnapshot = {
  ok: boolean
  source: string
  generatedAt: string
  registryId: string
  model: string
  owner: string
  version: string
  pluginSystem: boolean
  dynamicCodeLoading: boolean
  distributedRuntime: boolean
  packageManager: boolean
  startedAt: string
  lastUpdatedAt: string
  updateCount: number
  providers: RuntimeProviderManifest[]
  domains: Array<RuntimeDomainSummary & {
    runtimeServices?: string[]
    exposedCapabilities?: string[]
  }>
  capabilities: Array<{
    capability: string
    sensitive: boolean
    providers: string[]
    domains: string[]
  }>
  runtimeServices: RuntimeServiceManifest[]
  semanticEntities?: RuntimeSemanticEntity[]
  relationships?: RuntimeSemanticRelationship[]
  contextGraph?: RuntimeContextGraph
  activeRuntimes: string[]
  healthSummaries: {
    providers: Record<string, number>
    domains: RuntimeDomainSnapshot['counts']
    services: Record<string, number>
  }
  discovery: Record<string, unknown>
}

export type RuntimeProviderBootReadiness = {
  providerId: string
  displayName: string
  domainId: string
  domains: string[]
  bootState: string
  ready: boolean
  technicallyReady?: boolean
  degraded: boolean
  dependencyStatus: string
  startupLatency: number | null
  recoveryCapable: boolean
  health: string
  enabled: boolean
  experimental: boolean
  realtime: boolean
  maturity?: string
  runtimeConnected?: boolean
  controlAvailable?: boolean
  sendsCommands?: boolean
  foundationOnly?: boolean
  checkedAt: string
}

export type RuntimeBootStatus = {
  model: string
  orchestrator: string
  distributedRuntime: boolean
  processManager: boolean
  startedAt: string
  uptimeMs: number
  currentPhase: string
  ready: boolean
  degraded: boolean
  failed: boolean
  readyAt: string | null
  startupLatencyMs: number | null
  providerReadiness: RuntimeProviderBootReadiness[]
  providersReady: number
  providerCount: number
  degradedProviders: string[]
  failedBootPhases: Array<Record<string, unknown>>
  lastProviderBootAt: string | null
  lastHealthCheckAt: string | null
  startupSequence: string[]
  bootReport: Record<string, boolean>
  recoveryAware: boolean
  readiness: string
  phaseHistory?: Array<Record<string, unknown>>
  memory?: Record<string, unknown>
  soakReadiness?: Record<string, boolean>
}

export type RuntimeHealthSnapshot = {
  ok: boolean
  source: string
  model: string
  timestamp: string
  bridge?: {
    listenHost: string
    port: number
    localHealthUrl: string
    lanHealthUrlHint: string
  }
  bridgeReady?: boolean
  runtimeReady: boolean
  degraded: boolean
  failed: boolean
  boot: RuntimeBootStatus
  providers: RuntimeProviderBootReadiness[]
  providersReady: number
  providerCount: number
  degradedProviders: string[]
  eventStreamHealth: Record<string, unknown>
  knx: Record<string, unknown>
  writePath: Record<string, unknown>
  runtimeConfigDiagnostics?: Record<string, unknown>
  soakMetrics?: Record<string, unknown>
  snapshotRestore: RuntimeContinuityStatus
  insightEngine: Record<string, unknown>
  registry: Record<string, unknown>
  safety: Record<string, unknown>
}

export type RuntimeSemanticRelationship = {
  sourceEntityId?: string
  type: 'belongsTo' | 'controls' | 'monitors' | 'feeds' | 'relatedTo' | 'groupedWith' | 'dependsOn' | string
  targetEntityId: string
  [key: string]: unknown
}

export type RuntimeSemanticEntity = {
  entityId: string
  entityType:
    | 'room'
    | 'climateZone'
    | 'lightZone'
    | 'mediaZone'
    | 'device'
    | 'provider'
    | 'runtimeService'
    | 'signal'
    | 'sensor'
    | 'actuator'
    | 'scene'
    | 'insight'
    | string
  displayName: string
  domainId: string
  roomId?: string | null
  providerId: string
  capabilities: string[]
  relationships: RuntimeSemanticRelationship[]
  tags: string[]
  semanticRole: string
  realtime: boolean
  critical: boolean
  experimental: boolean
  groupAddress?: string
  dpt?: string
}

export type RuntimeContextGraph = {
  model: string
  graphEngine: boolean
  database: boolean
  generatedAt: string
  entities: RuntimeSemanticEntity[]
  relationships: RuntimeSemanticRelationship[]
  summary: {
    entityCount: number
    relationshipCount: number
    realtimeCriticalCount: number
    approvalSensitiveCount: number
    orphanedCount: number
    domains: string[]
    entityTypes: Record<string, number>
    semanticRoles: Record<string, number>
  }
  orphanedEntities: string[]
  nivaFutureHook: Record<string, unknown>
}

export type RuntimeInsight = {
  insightId: string
  key?: string
  category:
    | 'staleSignal'
    | 'runtimeHealth'
    | 'recoveryEvent'
    | 'pollingPressure'
    | 'realtimeInstability'
    | 'approvalAttention'
    | 'orphanedEntity'
    | 'unusualRuntimeBehavior'
    | 'comfortObservation'
    | 'diagnosticsObservation'
    | string
  severity: 'low' | 'medium' | 'high' | string
  confidence: 'low' | 'medium' | 'high' | string
  createdAt: string
  updatedAt: string
  source: string
  relatedEntities: string[]
  affectedDomains: string[]
  semanticContext: Record<string, unknown>
  explanation: string
  suggestedAction?: string | null
  requiresApproval: boolean
  acknowledged: boolean
  resolved: boolean
  stale: boolean
  lifecycleState: 'active' | 'acknowledged' | 'resolved' | 'stale' | string
}

export type RuntimeInsightEngineSnapshot = {
  ok: boolean
  source: string
  model: string
  generatedAt: string
  deterministic: boolean
  aiMl: boolean
  autonomousExecution: boolean
  actionExecution: boolean
  activeInsights: RuntimeInsight[]
  resolvedInsights: RuntimeInsight[]
  insightCount: number
  categories: string[]
  severityDistribution: Record<string, number>
  categoryDistribution: Record<string, number>
  lifecycle: {
    active: number
    acknowledged: number
    resolved: number
    stale: number
  }
  persistence: {
    enabled: boolean
    path: string
    restored: boolean
    restoredInsights: number
    lastPersistedAt: string | null
    lastError: string | null
    retention: {
      maxInsights: number
    }
  }
}

export type RuntimeActionSummary = {
  actionId: string
  type: string
  category: string
  domainId?: string | null
  capabilityRequired?: string | null
  source: string
  roomId?: string | null
  initiatedBy?: string
  initiatedFrom?: string
  trustedClient?: boolean
  policy?: RuntimePolicySummary
  executionState: string
  approvalRequired: boolean
  createdAt: string
  updatedAt?: string
  latencyMs?: number
  resultSummary?: Record<string, unknown> | null
  payloadSummary?: Record<string, unknown> | null
  target?: Record<string, unknown> | null
}

export type RuntimeActionMetrics = {
  totalActions: number
  completedActions: number
  failedActions: number
  cancelledActions: number
  pendingApprovals: number
  approvalRequiredCount: number
  actionsLastMinute: number
  averageActionLatency: number | null
  latestActionAt: string | null
  latestActionId: string | null
  governance?: {
    policyCount: number
    pendingApprovalCount: number
    trustedClientCount: number
    untrustedClientCount: number
    riskyActionAttempts: number
    auditEventCount: number
    latestAuditAt: string | null
  }
  approvalQueue?: {
    pending: RuntimeActionSummary[]
    approved: RuntimeActionSummary[]
    denied: RuntimeActionSummary[]
    completed: RuntimeActionSummary[]
  }
  policies?: RuntimePolicySummary[]
  domains?: RuntimeDomainSnapshot
  audit?: {
    recentEvents: Array<{
      auditId: string
      actionId: string
      eventType: string
      category: string
      actionType: string
      source: string
      initiatedBy?: string
      initiatedFrom?: string
      trustedClient?: boolean
      policyId?: string | null
      riskLevel?: string | null
      timestamp: string
    }>
    path: string
  }
  recentActions?: RuntimeActionSummary[]
  executionStates?: Record<string, number>
  persistence?: {
    enabled: boolean
    path: string
    restored: boolean
    restoredActions: number
    restoredAt: string | null
    lastFlushAt: string | null
    error: string | null
  }
}

export type RuntimeClientRegistration = {
  clientId: string
  sessionId: string
  clientName: string
  deviceType: string
  platform: string
  runtimeMode: string
  runtimeCapabilities: string[]
  lastRuntimeVersion: string
}

export type RuntimeClientSnapshot = {
  ok: boolean
  source: string
  model: string
  auth: boolean
  remoteControl: boolean
  counts: {
    clients: number
    sessions: number
    trusted: number
    untrusted: number
    eventStreams: number
    staleSessions: number
  }
  clients: Array<{
    clientId: string
    clientName: string
    deviceType: string
    platform: string
    firstSeen: string
    lastSeen: string
    trusted: boolean
    trustClassification: string
    localNetwork: boolean
    runtimeCapabilities: string[]
    lastRuntimeVersion: string
    activeSessionCount: number
  }>
  sessions: Array<{
    sessionId: string
    clientId: string
    connectedAt: string
    lastActivity: string
    connectionType: string
    runtimeMode: string
    eventStreamConnected: boolean
    trustedSession: boolean
    localSession: boolean
    staleSession: boolean
    reconnectCount: number
  }>
}

export type RuntimeEventPayload = {
  eventId?: string
  id?: string
  sequence?: number
  type: RuntimeEventType
  timestamp: number
  at: string
  roomId?: string | null
  roomKey?: string | null
  zoneKey?: string | null
  category?: string | null
  domainId?: string | null
  capabilityContext?: string | null
  source?: string | null
  groupAddress?: string | null
  dpt?: string | null
  dataType?: string | null
  field?: string | null
  normalizedField?: string | null
  responseSource?: string | null
  value?: number | string | boolean | null
  previousValue?: number | string | boolean | null
  updateToken?: string | null
  confidence?: string | null
  persisted?: boolean
  replayable?: boolean
  replay?: boolean
  point?: ServerRuntimeHistoryPoint | null
  poll?: KnxRoomPollResult | null
  resyncRequired?: boolean
  actionId?: string
  action?: RuntimeActionSummary
  client?: RuntimeClientSnapshot['clients'][number]
  session?: RuntimeClientSnapshot['sessions'][number]
  auditEvent?: RuntimeActionMetrics['audit'] extends infer Audit
    ? Audit extends { recentEvents: Array<infer Event> }
      ? Event
      : never
    : never
  snapshot?: Partial<RuntimeContinuitySnapshot> | null
  continuity?: RuntimeContinuityStatus
  registry?: Partial<RuntimeRegistrySnapshot> | null
  boot?: Partial<RuntimeBootStatus> | null
  providerReadiness?: RuntimeProviderBootReadiness
  manifest?: RuntimeProviderManifest
  insight?: RuntimeInsight | ServerRuntimeInsight
  monitorEvent?: KnxMonitorEvent
  relatedEntityIds?: string[]
  semanticContext?: Record<string, unknown>
  affectedDomains?: string[]
  stats?: {
    connectedClients: number
    eventsLastMinute: number
    droppedEvents: number
    lastEventAt: string | null
    totalEvents: number
    reconnectCount: number
    replayedEvents?: number
    resyncRequiredCount?: number
    pollingRequestsPerMinute?: number
    fallbackRefreshCount?: number
    eventBufferSize?: number
    eventBufferLimit?: number
    latestEventId?: string | null
    replaySupport?: boolean
    topPollingSources?: Array<{ path: string; count: number }>
    actionMetrics?: RuntimeActionMetrics
    clientIdentity?: RuntimeClientSnapshot
    runtimeDomains?: RuntimeDomainSnapshot
    runtimeContinuity?: RuntimeContinuityStatus
    runtimeRegistry?: RuntimeRegistrySnapshot
    runtimeBoot?: RuntimeBootStatus
    soakMetrics?: Record<string, unknown>
    clients?: Array<{
      clientId: string
      sessionId: string
      connectedAt: string
      lastEventId: string | null
      sentEvents: number
      droppedEvents: number
      reconnectCount: number
      lastSentAt: string | null
    }>
  }
}

export type IntegrationProviderContract = {
  id: string
  provider: string
  category: string
  name: string
  status: string
  readiness: string
  authRequired: boolean
  configured: boolean
  credentials: {
    authRequired: boolean
    configured: boolean
    source: string
    required: string[]
    missing: string[]
    secretsReturned: boolean
    note: string
  }
  capabilities: string[]
  supportedFeatures: string[]
  maturity?: 'liveRuntime' | 'statusOnly' | 'foundation' | 'prepared' | 'mock' | 'future' | string
  capabilityClarity?: {
    maturity: string
    supportsRead: boolean
    supportsWrite: boolean
    supportsDiscovery: boolean
    supportsLifecycle: boolean
    sendsCommands: boolean
    requiresCredentials: boolean
    runtimeConnected: boolean
    controlAvailable: boolean
    foundationOnly: boolean
  }
  supportsRead?: boolean
  supportsWrite?: boolean
  supportsDiscovery?: boolean
  supportsLifecycle?: boolean
  sendsCommands?: boolean
  requiresCredentials?: boolean
  runtimeConnected?: boolean
  controlAvailable?: boolean
  foundationOnly?: boolean
  runtimeHealth: string
  connectionState: string
  lastSyncAt: string | null
  diagnostics: string[]
  safeConfig: Record<string, unknown>
  onboarding?: {
    provider: string
    onboardingStatus: string
    configured: boolean
    validated: boolean
    connected: boolean
    runtimeReady: boolean
    missingRequirements: string[]
    validationErrors: string[]
    capabilities: string[]
    recommendedNextStep: string
    steps: Array<{
      id: string
      label: string
      ok: boolean
      detail: string
    }>
  }
  lifecycle?: {
    lifecycleState:
      | 'disabled'
      | 'ready'
      | 'activating'
      | 'active'
      | 'degraded'
      | 'offline'
      | 'failed'
      | string
    enabled: boolean
    activationAllowed: boolean
    lastLifecycleChangeAt: string | null
    lastHealthCheckAt: string | null
    healthReason: string
    recommendedAction: string
    canActivate: boolean
    canDeactivate: boolean
    requiresConfig: boolean
    requiresValidation: boolean
    runtimeMutated: boolean
    persisted: boolean
    safeMode: string
  }
  orchestration?: {
    runtimeHeartbeatAt: string | null
    lastSuccessfulContactAt: string | null
    stale: boolean
    reconnectRecommended: boolean
    reconnectAttempts: number
    runtimeLatency: number | null
    pollingCadence: number
    degradedReason: string | null
    recoveryState: 'stable' | 'reconnecting' | 'degraded' | 'recovered' | 'stale' | string
    recoveryAttempts?: number
    recoveryBackoffMs?: number | null
    nextRecoveryAttemptAt?: string | null
    recoveryEligible?: boolean
    recoveryBlocked?: boolean
    recoveryReason?: string | null
    recoveryPolicy?: {
      strategy: string
      maxAttempts: number
      baseBackoffMs: number
      maxBackoffMs: number
      cooldownMs: number
      degradedToleranceMs: number
      staleTimeoutMs: number
      hardwareAction: boolean
      runtimeRestart: boolean
      reconnectsHardware: boolean
    }
    recoveryCooldownUntil?: string | null
    recoveredAt?: string | null
    cadenceDriftMs?: number | null
    watchdog?: {
      source: string
      aggressiveReconnect: boolean
      hardwareAction: boolean
      note: string
    }
  }
  persistence?: {
    persisted: boolean
    restored: boolean
    restoredAt: string | null
    storageRoot: string
    encryptedCredentials: boolean
    encryptedFieldCount: number
    secureLocalStorage: boolean
    encryption: {
      enabled: boolean
      algorithm: string
      localOnly: boolean
      source: string
      failClosed: boolean
    }
    diagnostics: {
      bootOk: boolean
      errors: string[]
    }
  }
}

export type IntegrationManagerSnapshot = {
  ok: boolean
  sourceOfTruth: string
  generatedAt: string
  credentialPolicy: {
    owner: string
    frontendReceivesSecrets: boolean
    persistence: string
    secureStorage: boolean
    note: string
  }
  lifecyclePolicy?: {
    owner: string
    persistence: string
    runtimeMutation: boolean
    actions: boolean
    note: string
  }
  persistencePolicy?: {
    owner: string
    persistence: boolean
    encrypted: boolean
    localOnly: boolean
    root: string
    structure: Record<string, string>
    credentialsExposedToFrontend: boolean
    credentialsLogged: boolean
    failClosed: boolean
    boot?: {
      restoredAt: string
      ok: boolean
      errors: string[]
    }
  }
  orchestrationPolicy?: {
    owner: string
    startedAt: string | null
    lastRunAt: string | null
    cadenceMs: number
    pollingCadenceMs: Record<string, number>
    recoveryPolicies?: Record<string, Record<string, string | number | boolean>>
    reconnectEngine: boolean
    runtimeMutation: boolean
    hardwareAction: boolean
    note: string
  }
  counts: {
      providers: number
      connected: number
      liveConnected?: number
      liveRuntime?: number
      statusOnly?: number
      foundation?: number
      prepared?: number
      future?: number
      mock?: number
      commandCapable?: number
      configured: number
      needsAuth: number
    }
  categories: string[]
  providers: IntegrationProviderContract[]
  futureFoundation: Record<string, string>
}

export type DeltacoTuyaDiscoverySnapshot = {
  ok: boolean
  provider: string
  sourceOfTruth: string
  generatedAt: string
  discoveryMode: string
  sendsCommands: boolean
  cloudLogin: boolean
  localKeys: boolean
  candidateCount: number
  reachableCount: number
  missingCount: number
  excludedCandidates?: Array<Record<string, unknown>>
  activeCandidates?: Array<Record<string, unknown>>
  recommendedManualMappings?: Array<Record<string, unknown>>
  needsUserConfirmation?: Array<Record<string, unknown>>
  confidence: string
  notes: string[]
  candidates: Array<{
    id: string
    name: string
    ip: string
    mac: string | null
    vendorHint?: string | null
    hostname?: string | null
    room: string
    type: string
    role: string
    physicalOrder: number | null
    control: string
    reachable: boolean
    arpPresent?: boolean
    openPorts?: number[]
    lastSeenAt: string | null
    latencyMs: number | null
    confidence: string
    classification?: string
    classificationConfidence?: string
    exclusionReason?: string | null
    deviceFamilyHint?: string | null
    evidence?: string[]
    negativeEvidence?: string[]
    likelyTuyaDevice?: boolean | 'unknown'
    recommendedAction?: string | null
    notes: string
    checks: Array<{
      port: number
      reachable: boolean
      latencyMs: number
      error: string | null
    }>
  }>
  providerContract?: IntegrationProviderContract
}

export type DeltacoTuyaManualCandidate = {
  lampName: string
  physicalOrder: number
  candidateIp: string
  candidateMac: string | null
  confidence: string
  score: number
  confirmed: boolean
  status: string
  updatedAt: string
}

export type DeltacoTuyaConfirmedMapping = {
  deviceId: string
  displayName: string
  provider: string
  room: string
  role: string
  physicalOrder: number
  ip: string
  mac: string | null
  confirmed: boolean
  confirmedAt: string | null
  confidence: string
  source: string
  notes: string[]
  lifecycleOwner: string
  orchestrationOwner: string
  evidence?: string[]
  classification?: string | null
  updatedAt?: string
  persisted?: boolean
  restoredAt?: string
}

export type DeltacoTuyaCorrelationCandidate = {
  candidateId: string
  name: string
  ip: string
  mac: string | null
  physicalOrder: number | null
  reachable: boolean
  arpPresent: boolean
  latencyMs: number | null
  latencyDeltaMs: number
  score: number
  confidence: string
  signals: string[]
  suggestedFor: string
  confirmed: boolean
}

export type DeltacoTuyaIdentifySnapshot = {
  ok: boolean
  sourceOfTruth: string
  generatedAt: string
  active?: boolean
  error?: string
  sendsCommands: boolean
  cloudLogin: boolean
  localKeys: boolean
  manualMappings?: DeltacoTuyaManualCandidate[]
  manualCandidate?: DeltacoTuyaManualCandidate | null
  correlations?: DeltacoTuyaCorrelationCandidate[]
  session?: {
    id: string
    provider: string
    startedAt: string
    updatedAt: string
    target: {
      name: string
      physicalOrder: number
      room: string
    }
    instruction: string
    notes: string[]
    confirmed: boolean
    sendsCommands: boolean
    cloudLogin: boolean
    localKeys: boolean
    manualCandidate?: DeltacoTuyaManualCandidate | null
    candidateMappings?: DeltacoTuyaCorrelationCandidate[]
  } | null
}

export type DeltacoTuyaMappingsSnapshot = {
  ok: boolean
  sourceOfTruth: string
  generatedAt: string
  provider: string
  mappings: DeltacoTuyaConfirmedMapping[]
  confirmedDevices: DeltacoTuyaConfirmedMapping[]
  count: number
  confirmedCount: number
  sendsCommands: boolean
  cloudLogin: boolean
  localKeys: boolean
  secretsReturned: boolean
  persistence?: {
    provider: string
    persisted: boolean
    owner: string
    runtimeMutated: boolean
  }
  notes: string[]
}

export type DeltacoTuyaProtocolDeviceObservation = {
  deviceId: string
  displayName: string
  provider: string
  ip: string
  mac: string | null
  room: string
  role: string
  physicalOrder: number
  observedAt: string
  protocolHints: string[]
  communicationProfile: string
  localActivity: string
  cloudDependencyLikelihood: string
  observedPorts: number[]
  observedServices: Array<{
    port: number
    service: string
  }>
  transportHints: string[]
  protocolConfidence: string
  protocolResearchState: string
  latencySamples: number[]
  latencyDriftMs: number | null
  passiveEvidence: string[]
  recommendations: string[]
}

export type DeltacoTuyaProtocolResearchSnapshot = {
  ok: boolean
  sourceOfTruth: string
  generatedAt: string
  provider: string
  researchState: string
  protocolResearchState: string
  observationCadence: string
  sendsCommands: boolean
  cloudLogin: boolean
  localKeys: boolean
  payloadsSent: boolean
  packetCapture: boolean
  secretsReturned: boolean
  deviceCount: number
  devices: DeltacoTuyaProtocolDeviceObservation[]
  summary: {
    protocolHints: string[]
    communicationProfiles: string[]
    cloudDependencyLikelihood: string
    confidence: string
    observedPorts?: number[]
  }
  recommendations: string[]
  providerContract?: IntegrationProviderContract
}

export type ServerRuntimeHistoryEntry = {
  id: string
  timestamp: number
  at: string
  category: string
  confidence: string
  source: string
  summary: string
  snapshot?: Record<string, unknown>
}

export type ServerRuntimeHistoryPoint = {
  timestamp: number
  at?: string
  roomKey: string
  roomId?: string | null
  zoneKey?: string
  field: 'temperature' | 'setpoint' | 'heatDemand' | 'brightness' | string
  value: number
  category: string
  confidence: string
  source: string
  groupAddress?: string | null
  dpt?: string | null
  dataType?: string | null
  mappingVariant?: string | null
  responseSource?: string | null
  signalName?: string | null
  signalCategory?: string | null
  persisted?: boolean
  restored?: boolean
}

export type ServerRuntimeRangeMetadata = {
  key: string
  from: number
  to: number
  fromIso: string
  toIso: string
  durationMs: number
  sparse: boolean
  pointCounts: Record<string, number>
  expectedCadenceMs: Record<string, number>
}

export type ServerRuntimeHistory = {
  ok: boolean
  sourceOfTruth: string
  count: number
  pointCount: number
  category: string
  range: {
    key: string
    from: number
    to: number
    fromIso: string
    toIso: string
    durationMs: number
  }
  sparse: boolean
  history: ServerRuntimeHistoryEntry[]
  points: ServerRuntimeHistoryPoint[]
  collections: Record<
    string,
    {
      events: ServerRuntimeHistoryEntry[]
      points: ServerRuntimeHistoryPoint[]
    }
  >
  categoryCounts: NonNullable<ServerRuntimeSummary['categoryCounts']>
  sourceDistribution?: Record<string, number>
  lineageDiagnostics?: {
    liveMissingGroupAddressCount: number
    derivedQueryPointCount: number
    derivedDominatesLive: boolean
    latestMissingGroupAddressPoints: Array<{
      at: string | null
      roomKey: string | null
      field: string | null
      source: string | null
      responseSource?: string | null
      value: number | string | boolean | null
    }>
  }
  ranges: Record<string, ServerRuntimeRangeMetadata>
  rates: Record<
    string,
    {
      eventsLastHour: number
      pointsLastHour: number
      approximatePointsPerHour: number
      cadenceMs: number
    }
  >
  retention: {
    inMemory: boolean
    persisted?: boolean
    restored?: boolean
    historyLimit: number
    pointLimit: number
    database: boolean
    storagePath?: string
    lastFlushAt?: string | null
    lastError?: string | null
  }
  analysisFoundation?: Record<string, string>
}

export type ServerRuntimeState = {
  ok: boolean
  sequence: number
  server: {
    startedAt: string
    updatedAt: string
    uptimeMs: number
    sourceOfTruth: string
  }
  runtime: {
    configReceived: boolean
    connectionMode: NetworkConfig['connectionMode'] | string | null
    writeMappingCounts: {
      light: number
      dim: number
      climate: number
    }
    lightSubscribeActive: boolean
    climateSubscribeActive: boolean
  }
  rooms: Record<string, unknown>
  media: {
    cast: BridgeCastStatus | null
    playback: BridgeCastPlayback | null
  }
  vacuum: BridgeVacuumStatus | null
  mqtt: BridgeMqttStatus | null
  atmosphere: ServerRuntimeSummary['atmosphere']
  runtimeContracts: unknown[]
  persistence?: ServerRuntimePersistenceStatus
  roomSnapshots?: ServerRoomSnapshot[]
  aggregates?: ServerRuntimeAggregates['aggregates']
  insights?: ServerRuntimeInsight[]
  summary: ServerRuntimeSummary
}

export type BridgeMqttStatus = {
  ok: boolean
  enabled: boolean
  connected: boolean
  state: 'disabled' | 'disconnected' | 'connecting' | 'connected' | 'degraded' | 'fallback' | string
  connectedAt?: string | null
  disconnectedAt?: string | null
  broker: {
    host: string
    port: number
  }
  topicRoot: string
  lastMessageAt: string | null
  lastMessage: {
    topic: string
    retained: boolean
    receivedAt: string
    payloadPreview: string
  } | null
  subscribedTopics: string[]
  subscribed?: boolean
  topicTrust?: {
    staleAfterMs: number
    offlineAfterMs: number
    topicCount: number
    liveTopicCount: number
    retainedOnlyCount: number
    staleTopicCount: number
    offlineTopicCount: number
    topics: Array<{
      topicName: string
      retained: boolean
      retainedOnly: boolean
      live: boolean
      stale: boolean
      offline: boolean
      sourceAgeMs: number | null
      lastPayload: string
      lastUpdate: string | null
      confidence: string
      liveMessageCount: number
      retainedMessageCount: number
    }>
  }
  reconnectCount?: number
  messageCount?: number
  subscribeFailures?: number
  publishFailures?: number
  lastSubscribeAt?: string | null
  error: string | null
  dependency?: string
}

export type BridgeCastDevice = {
  id: string
  name: string
  host: string
  ip: string
  type: 'tv' | 'googleHome' | string
  model: string
  online: boolean
  status: 'online' | 'stale' | 'offline' | 'unknown' | string
  state?: 'online' | 'stale' | 'offline' | 'unknown' | string
  firstSeen?: string
  lastSeen: string
  lastSeenAt?: string | null
  lastDiscoverySeenAt?: string | null
  ageMs?: number | null
  stale?: boolean
  offline?: boolean
  staleAfterMs?: number
  offlineAfterMs?: number
  discoveryMisses?: number
}

export type BridgeCastStatus = {
  ok: boolean
  enabled: boolean
  discoveryEnabled: boolean
  state: 'disabled' | 'idle' | 'discovering' | 'fallback' | string
  devices: BridgeCastDevice[]
  lastDiscoveryAt: string | null
  error: string | null
  dependency?: string
  dependencyReady?: boolean | null
  diagnostics?: {
    discoveryActive: boolean
    mdnsActive?: boolean
    lastDiscoveryAt: string | null
    lastDiscoveryStartedAt?: string | null
    lastDiscoveryCompletedAt?: string | null
    lastDiscoveryDurationMs?: number | null
    discoveryCycleCount?: number
    discoveryFoundCount?: number
    networkInterfaceUsed: string | null
    discoveryInterfaceUsed?: string | null
    deviceCount: number
    onlineCount?: number
    staleCount?: number
    offlineCount?: number
    unknownCount?: number
    staleAfterMs?: number
    offlineAfterMs?: number
    reconnectCount?: number
    discoveryErrors?: Array<{ at: string; message: string }>
    rawDiscoveryLog?: Array<Record<string, unknown>>
    deviceAges?: Array<{
      id: string
      name: string
      state: string
      ageMs: number | null
      lastSeenAt: string | null
    }>
    playbackSessionAgeMs?: number | null
    playbackConfidence?: 'high' | 'medium' | 'low' | string
    note: string | null
  }
  playback?: BridgeCastPlayback
}

export type BridgeCastPlayback = {
  ok: boolean
  enabled: boolean
  dependency?: string
  dependencyReady: boolean | null
  lanReachabilityNote: string
  state:
    | 'idle'
    | 'blocked'
    | 'connecting'
    | 'buffering'
    | 'playing'
    | 'paused'
    | 'stopped'
    | 'error'
    | 'disconnected'
    | 'unavailable'
    | string
  rawState?: string
  selectedDeviceId: string | null
  mediaUrl: string | null
  actualMediaUrl?: string | null
  deviceName?: string | null
  title: string | null
  volume?: number | null
  updatedAt: string | null
  updatedAgeMs?: number | null
  playbackConfidence?: 'high' | 'medium' | 'low' | string
  sourceFreshness?: 'fresh' | 'aging' | 'stale' | 'unknown' | string
  stale?: boolean
  sessionAgeMs?: number | null
  statusAgeMs?: number | null
  sessionStartedAt?: string | null
  lastStatusAt?: string | null
  reconnectCount?: number
  selectedDeviceState?: string | null
  selectedDeviceLastSeenAt?: string | null
  message: string
}

export type BridgeVacuumProvider = {
  id: 'dreameCloud' | 'localRuntime' | 'mqttBridge' | 'homeAssistantBridge' | 'mock' | string
  label: string
  status: 'foundation' | 'research' | string
  authRequired: boolean
  connectionType: 'local' | 'cloud' | 'foundation' | string
  confidence: string
  strategicRole?: 'native' | 'bridge' | 'compatibility' | 'development' | string
  premiumFit?: 'high' | 'medium' | 'low' | string
  dependencyLevel?: 'standalone' | 'externalBridge' | 'cloudDependency' | string
  futurePriority?: number
  knownRisks: string[]
  nextStep: string
  supportedCapabilities: string[]
}

export type BridgeVacuumRobot = {
  id: string
  deviceId: string
  name: string
  manufacturer: string
  model: string
  type: string
  status: string
  rawStatus?: string | null
  statusText?: string | null
  statusCode?: string | null
  localizedStatusText?: string | null
  statusDictionaryLanguage?: string | null
  statusDictionaryPath?: string | null
  statusMappingConfidence?: string | null
  statusMappingNote?: string | null
  statusObservationNote?: string | null
  observedStatusCode?: BridgeDreameObservedStatusCode | null
  haState?: string
  battery: number
  fanSpeed?: string | null
  docked: boolean
  charging: boolean
  derivedState?: boolean
  derivedFromStatusCode?: boolean
  derivedFromCode?: string | null
  cleaning?: boolean
  currentArea: string | null
  cleaningProgress: number
  lastCleanedAt: string | null
  lastUpdatedAt?: string | null
  estimatedFinishAt: string | null
  errorState: string | null
  capabilities: string[]
  integrationStatus: string
  entityId?: string
  firstSeen?: string | null
  lastSeenAt?: string | null
  statusAgeMs?: number | null
  sourceAgeMs?: number | null
  staleAfterMs?: number | null
  offlineAfterMs?: number | null
  trustState?: 'online' | 'stale' | 'offline' | 'unknown' | string
  state?: 'online' | 'stale' | 'offline' | 'unknown' | string
  freshness?: 'fresh' | 'aging' | 'stale' | 'unknown' | string
  stateConfidence?: 'high' | 'medium' | 'low' | string
  runtimeConnected?: boolean
  cloudAuthenticated?: boolean
  deviceReachable?: boolean
  cachedData?: boolean
  estimatedState?: boolean
  trustMessage?: string | null
  statusQuality?: {
    quality: 'high' | 'medium' | 'low' | string
    found: string[]
    missing: string[]
    unknown?: string[]
    derived?: Array<{
      field: string
      value: boolean
      reason: string
      source: string
      code: string
    }>
    sources: Record<string, string | null>
  } | null
}

export type BridgeVacuumStatus = {
  ok: boolean
  enabled: boolean
  provider: 'dreameCloud' | 'localRuntime' | 'mqttBridge' | 'homeAssistantBridge' | 'mock' | string
  providerLabel: string
  connected: boolean
  state: 'disabled' | 'disconnected' | 'connected' | 'fallback' | string
  authRequired: boolean
  configured: boolean
  config: {
    provider: string
    dreameRegion: string | null
    dreameCountry?: string | null
    dreameUsernameConfigured: boolean
    dreamePasswordConfigured: boolean
    dreameCloudClient?: string | null
    dreameDeviceIdConfigured?: boolean
    homeAssistantBaseUrl?: string | null
    homeAssistantTokenConfigured?: boolean
    homeAssistantVacuumEntityId?: string | null
  }
  providers: BridgeVacuumProvider[]
  deviceCount?: number
  onlineCount?: number
  staleCount?: number
  offlineCount?: number
  observedStatusCodes?: BridgeDreameObservedStatusCode[]
  statusObservationNote?: string | null
  robots: BridgeVacuumRobot[]
  selectedRobot: BridgeVacuumRobot | null
  capabilities: string[]
  lastSyncAt: string | null
  lastSuccessfulSync?: string | null
  trust?: {
    state: 'online' | 'stale' | 'offline' | 'unknown' | string
    freshness: 'fresh' | 'aging' | 'stale' | 'unknown' | string
    stateConfidence: 'high' | 'medium' | 'low' | string
    runtimeConnected: boolean
    cloudAuthenticated: boolean
    deviceReachable: boolean
    cachedData: boolean
    estimatedState: boolean
    firstSeen: string | null
    lastSeenAt: string | null
    statusAgeMs: number | null
    sourceAgeMs: number | null
    staleAfterMs: number | null
    offlineAfterMs: number | null
    reconnectCount: number
    loginFailures: number
    lastSuccessfulSync: string | null
    lastRefreshAttemptAt: string | null
    lastRefreshErrorAt: string | null
    message: string
  }
  diagnostics?: {
    runtimeStartedAt?: string | null
    runtimeConnected?: boolean
    cloudAuthenticated?: boolean
    deviceReachable?: boolean
    state?: string
    freshness?: string
    stateConfidence?: string
    firstSeen?: string | null
    lastSeenAt?: string | null
    statusAgeMs?: number | null
    sourceAgeMs?: number | null
    staleAfterMs?: number | null
    offlineAfterMs?: number | null
    reconnectCount?: number
    loginFailures?: number
    lastSuccessfulSync?: string | null
    lastRefreshAttemptAt?: string | null
    lastRefreshErrorAt?: string | null
    onlineCount?: number
    staleCount?: number
    offlineCount?: number
    cachedRobotCount?: number
    providerMaturity?: string
    controlAvailable?: boolean
    commandRuntime?: string
  }
  error: string | null
  readiness?: {
    label: string
    checks: string[]
  } | null
  message: string
  command?: string | null
  commandAccepted?: boolean
  commandSimulated?: boolean
}

export type BridgeDreameObservedStatusCode = {
  code: string
  count: number
  firstSeenAt: string
  lastSeenAt: string
  source: string | null
  label: string
  localizedText?: string | null
  localizedLanguage?: string | null
  localizedPath?: string | null
  normalizedStatus: string | null
  confidence: string
  docked: boolean | null
  charging: boolean | null
  note: string
}

export type BridgeDreameCloudStatus = {
  ok: boolean
  provider: 'dreameCloud'
  enabled: boolean
  connected: boolean
  state: 'disabled' | 'missing-env' | 'foundation' | 'ready-for-status-only-test' | string
  configured: boolean
  missingEnv: string[]
  selectedRegion: string | null
  hasCredentials: boolean
  deviceCount: number
  observedStatusCodes?: BridgeDreameObservedStatusCode[]
  statusObservationNote?: string | null
  config: {
    enabled: boolean
    experimentalLogin?: boolean
    authDebug?: boolean
    deviceListDebug?: boolean
    authProfile?: string
    selectedByVacuumRuntime: boolean
    region: string | null
    country: string | null
    usernameConfigured: boolean
    passwordConfigured: boolean
    hasCredentials: boolean
    accountType: string | null
    targetDeviceIdConfigured: boolean
    selectedClient: string | null
    supportedClients?: string[]
    supportedAuthProfiles?: string[]
  }
  runtime?: Record<string, unknown>
  clientStrategy?: Record<string, unknown> | null
  tokenSession?: {
    received: boolean
    persisted: boolean
    returnedToClient: boolean
    expiresIn?: number | null
  }
  authDiagnostics?: Array<{
    authStage: string
    endpointCategory: string
    responseStatus: number | null
    classification: string
    detail?: string | null
  }>
  deviceListInspection?: {
    inspectedAt: string
    responseType?: string
    topLevelKeyCount?: number
    payloadIsNull?: boolean
    payloadIsEmptyObject?: boolean
    topLevelKeys: string[]
    wrapperPresence?: Array<{
      key: string
      present: boolean
      type: string
      topLevelOnly: boolean
    }>
    nestedWrapperPresence?: Array<{
      path: string
      present: boolean
      type: string
      count: number | null
    }>
    statusCodeMessage?: {
      status?: string | number | boolean | null
      code?: string | number | boolean | null
      msg?: string | number | boolean | null
      success?: string | number | boolean | null
    }
    arrayPaths: Array<{ path: string; count: number }>
    deviceCountCandidates: Array<{ path: string; count: number }>
    selectedDeviceArrayCount: number
    deviceCandidates: Array<{
      index: number
      keys: string[]
      candidateFieldNames?: Record<string, string[]>
      statusQuality?: {
        quality: 'high' | 'medium' | 'low' | string
        found: string[]
        missing: string[]
        unknown?: string[]
        derived?: Array<{
          field: string
          value: boolean
          reason: string
          source: string
          code: string
        }>
        sources: Record<string, string | null>
      }
      normalizedPreview?: {
        name: string
        model: string
        deviceIdMasked: string | null
        online: boolean | null
        battery: number | null
        docked: boolean | null
        charging: boolean | null
        derivedState?: boolean
        derivedFromStatusCode?: boolean
        derivedFromCode?: string | null
        statusText: string | null
        statusCode?: string | null
        localizedStatusText?: string | null
        statusDictionaryLanguage?: string | null
        statusDictionaryPath?: string | null
        normalizedStatus?: string | null
        statusMappingConfidence?: string | null
        statusObservationNote?: string | null
        lastUpdatedAt: string | null
      }
      nameCandidates: string[]
      modelCandidates: string[]
      maskedIds: Array<string | null>
      onlineCandidates: string[]
      statusCandidates: string[]
    }>
  }
  adapterContract: Record<string, unknown>
  researchSources: Array<{
    id: string
    label: string
    role: string
    url: string
    notes: string[]
  }>
  devices: unknown[]
  selectedDevice: unknown | null
  lastSyncAt: string | null
  error: string | null
  message: string
}

export function getBridgeBaseUrl() {
  return BRIDGE_BASE_URL
}

export function getBridgeApiDiagnostics() {
  const configuredBridgeIgnoredReason =
    configuredBridgeBaseUrl && typeof window !== 'undefined'
      ? (() => {
          try {
            const configuredUrl = new URL(configuredBridgeBaseUrl)
            if (isLoopbackHost(window.location.hostname) && !isLoopbackHost(configuredUrl.hostname)) {
              return 'localhost frontend bruker localhost bridge i stedet for hardkodet LAN-IP'
            }
            if (isLoopbackHost(configuredUrl.hostname) && !isLoopbackHost(window.location.hostname)) {
              return 'LAN/mobile frontend bruker samme host som appen i stedet for localhost'
            }
          } catch {
            return 'ugyldig VITE_BRIDGE_BASE_URL'
          }
          return null
        })()
      : null

  return {
    bridgeBaseUrl: BRIDGE_BASE_URL,
    configuredBridgeBaseUrl: configuredBridgeBaseUrl || null,
    defaultBridgeBaseUrl: getDefaultBridgeBaseUrl(),
    configuredBridgeIgnoredReason,
    loopbackOverride:
      Boolean(configuredBridgeBaseUrl) &&
      typeof window !== 'undefined' &&
      (() => {
        try {
          const configuredUrl = new URL(configuredBridgeBaseUrl)
          return isLoopbackHost(configuredUrl.hostname) && !isLoopbackHost(window.location.hostname)
        } catch {
          return false
        }
      })(),
    lastFailedEndpoint: lastBridgeFetchFailure,
  }
}

function describeBridgeFetchError(path: string, error: unknown) {
  const message =
    error instanceof Error && error.message === 'Failed to fetch'
      ? `Oppdaterer tilkobling til bridge på ${BRIDGE_BASE_URL}. Viser sist kjente data hvis de finnes.`
      : error instanceof Error
        ? error.message
        : `Bridge-kall feilet mot ${path}`
  lastBridgeFetchFailure = {
    endpoint: path,
    message,
    at: new Date().toISOString(),
    bridgeBaseUrl: BRIDGE_BASE_URL,
  }
  return new Error(message)
}

async function fetchBridge(path: string, init?: RequestInit) {
  try {
    return await fetch(`${BRIDGE_BASE_URL}${path}`, init)
  } catch (error) {
    throw describeBridgeFetchError(path, error)
  }
}

function normalizeRoomMapping(roomMapping: KnxRoomMapping): KnxRoomMapping {
  return {
    ...roomMapping,
    climateActive: roomMapping.climateActive ?? false,
    liveClimateActive: roomMapping.liveClimateActive ?? false,
    temperature: roomMapping.temperature ?? '',
    temperatureDataType: roomMapping.temperatureDataType ?? '2-byte float',
    mode: roomMapping.mode ?? '',
    modeDataType: roomMapping.modeDataType ?? '1-byte',
    setpoint: roomMapping.setpoint ?? '',
    setpointDataType: roomMapping.setpointDataType ?? '2-byte float',
    setpointFeedback: roomMapping.setpointFeedback ?? '',
    setpointFeedbackDataType: roomMapping.setpointFeedbackDataType ?? '2-byte float',
    modeFeedback: roomMapping.modeFeedback ?? '',
    modeFeedbackDataType: roomMapping.modeFeedbackDataType ?? '1-byte',
    heatDemand: roomMapping.heatDemand ?? '',
    heatDemandDataType: roomMapping.heatDemandDataType ?? '1-byte',
    setpointWriteStrategy: roomMapping.setpointWriteStrategy ?? 'absoluteTemperature',
    zones: Object.fromEntries(
      Object.entries(roomMapping.zones).map(([zoneKey, zoneMapping]) => [
        zoneKey,
        {
          ...zoneMapping,
          lightDataType: zoneMapping.lightDataType ?? '1-bit',
          lightFeedbackDataType: zoneMapping.lightFeedbackDataType ?? '1-bit',
          valueDataType: zoneMapping.valueDataType ?? '1-byte',
          valueFeedbackDataType: zoneMapping.valueFeedbackDataType ?? '1-byte',
          feedbackInterpretationRule:
            zoneMapping.feedbackInterpretationRule ??
            (zoneMapping.deriveLightStateFromValueFeedback
              ? 'boolFromValueAboveZero'
              : 'standard'),
          deriveLightStateFromValueFeedback:
            zoneMapping.deriveLightStateFromValueFeedback ?? false,
        },
      ]),
    ),
  }
}

let currentKnxMapping: Record<string, KnxRoomMapping> = Object.fromEntries(
  Object.entries(knxMapping).map(([roomKey, roomMapping]) => [
    roomKey,
    normalizeRoomMapping(roomMapping),
  ]),
)
const baselineKnxMapping: Record<string, KnxRoomMapping> = Object.fromEntries(
  Object.entries(knxMapping).map(([roomKey, roomMapping]) => [
    roomKey,
    normalizeRoomMapping(roomMapping),
  ]),
)

let roomsStore: Room[] = buildRoomsFromSystemConfig(createInitialSystemConfig())
const failureRate = 0.15
const defaultBrightness = 100

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function getApiDelay() {
  return 300 + Math.floor(Math.random() * 501)
}

function maybeThrowError() {
  if (Math.random() < failureRate) {
    throw new Error(Math.random() < 0.5 ? 'Network error' : 'KNX unavailable')
  }
}

function cloneRooms() {
  return roomsStore.map((room) => ({
    ...room,
    zones: room.zones.map((zone) => ({ ...zone })),
  }))
}

function selectRuntimeConfigMapping(writeMapping: Record<string, KnxRoomMapping>) {
  const requestedSummary = summarizeKnxRuntimeMapping(writeMapping, 'saved-system-config')
  if (requestedSummary.totalWriteMappings > 0 || requestedSummary.totalFeedbackMappings > 0) {
    return { mapping: writeMapping, summary: requestedSummary }
  }

  const currentSummary = summarizeKnxRuntimeMapping(currentKnxMapping, 'current-runtime-cache')
  if (currentSummary.totalWriteMappings > 0 || currentSummary.totalFeedbackMappings > 0) {
    return { mapping: currentKnxMapping, summary: currentSummary }
  }

  return {
    mapping: baselineKnxMapping,
    summary: summarizeKnxRuntimeMapping(baselineKnxMapping, 'baseline-knx-mapping'),
  }
}

export function applyRoomsConfig(nextRooms: Room[]) {
  roomsStore = nextRooms.map((room) => ({
    ...room,
    zones: room.zones.map((zone) => ({ ...zone })),
  }))

  return cloneRooms()
}

function normalizeBrightness(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function getTemperatureStep() {
  return Number((0.1 + Math.random() * 0.2).toFixed(1))
}

function logKnxWrite(address: string, value: boolean | number | string) {
  console.log(`[KNX] Write ${address} <=`, value)
}

function getRoomMapping(room: Room) {
  return currentKnxMapping[room.key]
}

export function setSystemMode(mode: SystemMode) {
  currentSystemMode = mode
}

export function setClimateModeSetpoints(setpoints: Partial<Record<RoomMode, number>>) {
  modeSetpoints = {
    Komfort: Number.isFinite(setpoints.Komfort) ? Number(setpoints.Komfort) : modeSetpoints.Komfort,
    Natt: Number.isFinite(setpoints.Natt) ? Number(setpoints.Natt) : modeSetpoints.Natt,
  }
}

export function getSystemMode() {
  return currentSystemMode
}

function createRuntimeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function getRuntimeClientRegistration(runtimeMode: string = currentSystemMode): RuntimeClientRegistration {
  if (cachedRuntimeClientIdentity) {
    return {
      ...cachedRuntimeClientIdentity,
      runtimeMode,
    }
  }

  const storedClientId = typeof localStorage !== 'undefined'
    ? localStorage.getItem(CLIENT_ID_STORAGE_KEY)
    : null
  const clientId = storedClientId || createRuntimeId('client')
  const sessionId = createRuntimeId('session')
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId)
    localStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId)
  }

  const platform = typeof navigator !== 'undefined' ? navigator.platform || 'web' : 'server'
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : ''
  const deviceType = /iphone|android|mobile/.test(userAgent)
    ? 'mobile'
    : /ipad|tablet/.test(userAgent)
      ? 'tablet'
      : 'desktop'

  cachedRuntimeClientIdentity = {
    clientId,
    sessionId,
    clientName: `Lynell ${deviceType}`,
    deviceType,
    platform,
    runtimeMode,
    runtimeCapabilities: ['sse', 'runtime-events', 'action-governance', 'client-registration'],
    lastRuntimeVersion: 'v8.2-foundation',
  }

  return cachedRuntimeClientIdentity
}

function getRuntimeIdentityHeaders() {
  const identity = getRuntimeClientRegistration()
  return {
    'X-Lynell-Client-Id': identity.clientId,
    'X-Lynell-Session-Id': identity.sessionId,
  }
}

export async function registerRuntimeClient(runtimeMode: string = currentSystemMode): Promise<RuntimeClientSnapshot> {
  const identity = getRuntimeClientRegistration(runtimeMode)
  const response = await fetch(`${BRIDGE_BASE_URL}/api/runtime/clients/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getRuntimeIdentityHeaders(),
    },
    body: JSON.stringify(identity),
  })

  if (!response.ok) {
    throw new Error('Runtime client registration failed')
  }

  const payload = (await response.json()) as { snapshot: RuntimeClientSnapshot }
  return payload.snapshot
}

export async function approveRuntimeAction(actionId: string) {
  const response = await fetch(`${BRIDGE_BASE_URL}/api/runtime/actions/${encodeURIComponent(actionId)}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getRuntimeIdentityHeaders(),
    },
    body: JSON.stringify({ actionId }),
  })

  if (!response.ok) {
    throw new Error('Runtime action approval failed')
  }

  return response.json() as Promise<Record<string, unknown>>
}

export async function denyRuntimeAction(actionId: string) {
  const response = await fetch(`${BRIDGE_BASE_URL}/api/runtime/actions/${encodeURIComponent(actionId)}/deny`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getRuntimeIdentityHeaders(),
    },
    body: JSON.stringify({ actionId }),
  })

  if (!response.ok) {
    throw new Error('Runtime action denial failed')
  }

  return response.json() as Promise<Record<string, unknown>>
}

export async function acknowledgeRuntimeInsight(insightId: string) {
  const response = await fetch(`${BRIDGE_BASE_URL}/api/runtime/insights/${encodeURIComponent(insightId)}/acknowledge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getRuntimeIdentityHeaders(),
    },
    body: JSON.stringify({ insightId, acknowledged: true }),
  })

  if (!response.ok) {
    throw new Error('Runtime insight acknowledgement failed')
  }

  return response.json() as Promise<Record<string, unknown>>
}

export function applyKnxConfig(nextMapping: Record<string, KnxRoomMapping>) {
  currentKnxMapping = Object.fromEntries(
    Object.entries(nextMapping).map(([roomKey, roomMapping]) => [
      roomKey,
      normalizeRoomMapping(roomMapping),
    ]),
  )
}

async function postToBridge(
  path:
    | '/api/runtime/config'
    | '/api/runtime/config/system'
    | '/api/runtime/conversation-log'
    | `/api/runtime/scenes/${string}/test`
    | '/api/knx/light'
    | '/api/knx/brightness'
    | '/api/knx/mode'
    | '/api/knx/feedback/query'
    | '/api/knx/feedback/subscribe-light'
    | '/api/knx/feedback/unsubscribe-light'
    | '/api/knx/feedback/subscribe-climate'
    | '/api/knx/feedback/unsubscribe-climate'
    | '/api/knx/climate/temperature'
    | '/api/knx/shading'
    | '/api/mqtt/connect'
    | '/api/mqtt/disconnect'
    | '/api/cast/discover'
    | '/api/cast/pause'
    | '/api/cast/play'
    | '/api/cast/stop'
    | '/api/cast/volume'
    | '/api/vacuum/connect'
    | '/api/vacuum/command'
    | '/api/dreame-cloud/connect',
  payload: Record<string, unknown>,
) {
  const response = await fetchBridge(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getRuntimeIdentityHeaders(),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    let message = 'Lokal bridge svarte ikke som forventet'

    try {
      const payload = (await response.json()) as { error?: string }
      message = payload.error ?? message
    } catch {
      // Keep default message when body is not valid JSON.
    }

    throw new Error(message)
  }

  return response.json()
}

export async function getBridgeHealth(): Promise<BridgeHealthSnapshot> {
  const response = await fetchBridge('/api/health')

  if (!response.ok) {
    let message = 'Bridge health svarte ikke som forventet'

    try {
      const payload = (await response.json()) as { error?: string }
      message = payload.error ?? message
    } catch {
      // Keep default message when body is not valid JSON.
    }

    throw new Error(message)
  }

  return response.json() as Promise<BridgeHealthSnapshot>
}

export async function getServerSystemConfig(): Promise<ServerSystemConfigSnapshot> {
  const response = await fetchBridge('/api/runtime/config/system')

  if (!response.ok) {
    throw new Error('Server-owned SystemConfig er ikke tilgjengelig fra bridge')
  }

  return response.json() as Promise<ServerSystemConfigSnapshot>
}

export async function saveServerSystemConfig(payload: {
  systemConfig: SystemConfig
  uiCapabilityConfig?: UiCapabilityConfig | null
  conversationLogging?: { enabled: boolean }
  autoPollQuietSignals?: Partial<AutoPollQuietSignalsConfig>
}): Promise<ServerSystemConfigSnapshot> {
  return postToBridge('/api/runtime/config/system', payload as unknown as Record<string, unknown>) as Promise<ServerSystemConfigSnapshot>
}

export async function logNivaConversation(payload: {
  role: 'user' | 'niva'
  message: string
  currentPage: string
  activeView: string
  selectedRoom?: string | null
  selectedDomain?: string | null
  selectedTrend?: string | null
  intent?: string | null
  category?: string | null
  responseStatus?: string | null
  actionProposal?: Record<string, unknown> | null
  actionResult?: Record<string, unknown> | null
  source?: string | null
  confidence?: string | null
}): Promise<Record<string, unknown>> {
  return postToBridge('/api/runtime/conversation-log', payload as Record<string, unknown>) as Promise<Record<string, unknown>>
}

export async function testRuntimeScene(sceneId: string, dryRun = true): Promise<Record<string, unknown>> {
  const safeSceneId = encodeURIComponent(sceneId)
  return postToBridge(`/api/runtime/scenes/${safeSceneId}/test`, { dryRun }) as Promise<Record<string, unknown>>
}

export type KnxShadingAction = 'moveUp' | 'moveDown' | 'stop' | 'setPosition'

export async function runKnxShadingAction(payload: {
  shadingId: string
  action: KnxShadingAction
  value?: number
  dryRun?: boolean
}): Promise<Record<string, unknown>> {
  return postToBridge('/api/knx/shading', payload as unknown as Record<string, unknown>) as Promise<Record<string, unknown>>
}

export async function getKnxDiagnostics(): Promise<KnxDiagnosticsSnapshot> {
  const response = await fetchBridge('/api/knx/diagnostics')

  if (!response.ok) {
    throw new Error('KNX subscription diagnostics er ikke tilgjengelig fra bridge')
  }

  return response.json() as Promise<KnxDiagnosticsSnapshot>
}

export async function getKnxState(): Promise<KnxStateSnapshot> {
  const response = await fetchBridge('/api/knx/state')

  if (!response.ok) {
    throw new Error('KNX state cache er ikke tilgjengelig fra bridge')
  }

  return response.json() as Promise<KnxStateSnapshot>
}

export async function getKnxMonitorSnapshot(limit = 500): Promise<KnxMonitorSnapshot> {
  const safeLimit = Math.max(1, Math.min(5000, Math.round(limit)))
  const response = await fetchBridge(`/api/knx/monitor?limit=${safeLimit}`)

  if (!response.ok) {
    throw new Error('KNX monitor er ikke tilgjengelig fra bridge')
  }

  return response.json() as Promise<KnxMonitorSnapshot>
}

function normalizeKnxRoomPollResult(
  payload: Partial<KnxRoomPollResult>,
  roomId: string,
): KnxRoomPollResult {
  const requestedGroups = Array.isArray(payload.requestedGroups) ? payload.requestedGroups : []
  const updatedGroups = Array.isArray(payload.updatedGroups) ? payload.updatedGroups : []
  const failedGroups = Array.isArray(payload.failedGroups) ? payload.failedGroups : []
  const skippedGroups = Array.isArray(payload.skippedGroups) ? payload.skippedGroups : []
  return {
    ok: Boolean(payload.ok),
    roomId: payload.roomId ?? roomId,
    requestedGroups,
    updatedGroups,
    failedGroups,
    skippedGroups,
    timestamp: payload.timestamp ?? new Date().toISOString(),
    durationMs: payload.durationMs ?? 0,
    rateLimit: payload.rateLimit ?? {
      limited: false,
      windowMs: 0,
      nextAllowedAt: null,
    },
    error: payload.error,
    source: payload.source,
    busRead: payload.busRead,
    globalPoll: payload.globalPoll,
    diagnostics: {
      realFailedCount: payload.diagnostics?.realFailedCount ?? failedGroups.length,
      skippedCount: payload.diagnostics?.skippedCount ?? skippedGroups.length,
      failedCount: payload.diagnostics?.failedCount ?? failedGroups.length,
      classifications: payload.diagnostics?.classifications ?? {},
    },
  }
}

export async function pollKnxRoomValues(roomId: string): Promise<KnxRoomPollResult> {
  const endpoint = `/api/knx/rooms/${encodeURIComponent(roomId)}/poll`
  const response = await fetchBridge(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roomId }),
    },
  )

  const payload = normalizeKnxRoomPollResult(
    (await response.json()) as Partial<KnxRoomPollResult>,
    roomId,
  )

  if (!response.ok) {
    throw new Error(payload.error ?? 'Manuell KNX-rompoll feilet')
  }

  return payload
}

export async function createKnxSignalLogger(payload: {
  name: string
  groupAddress: string
  dataType: '1-bit' | '1-byte' | '2-byte'
  dpt?: string
  category?: string
  roomKey?: string
  updateMode?: 'cyclic' | 'onChange' | 'manualPoll' | 'unknown'
  expectedIntervalMs?: number | null
}): Promise<{ ok: boolean; logger: KnxSignalLogger; sendsCommands: false }> {
  const response = await fetch(`${BRIDGE_BASE_URL}/api/knx/signal-loggers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const result = (await response.json()) as {
    ok: boolean
    logger: KnxSignalLogger
    sendsCommands: false
    error?: string
  }

  if (!response.ok) {
    throw new Error(result.error ?? 'Signal logger kunne ikke opprettes')
  }

  return result
}

export async function updateKnxSignalLogger(payload: {
  id: string
  name?: string
  groupAddress?: string
  dataType?: '1-bit' | '1-byte' | '2-byte'
  dpt?: string
  category?: string
  roomKey?: string | null
  updateMode?: 'cyclic' | 'onChange' | 'manualPoll' | 'unknown'
  expectedIntervalMs?: number | null
  enabled?: boolean
}): Promise<{ ok: boolean; logger: KnxSignalLogger; sendsCommands: false }> {
  const response = await fetchBridge('/api/knx/signal-loggers/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const result = (await response.json()) as {
    ok: boolean
    logger: KnxSignalLogger
    sendsCommands: false
    error?: string
  }

  if (!response.ok) {
    throw new Error(result.error ?? 'Signal logger kunne ikke oppdateres')
  }

  return result
}

export async function deleteKnxSignalLogger(id: string): Promise<{ ok: boolean; id: string; sendsCommands: false }> {
  const response = await fetchBridge('/api/knx/signal-loggers/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id }),
  })

  const result = (await response.json()) as {
    ok: boolean
    id: string
    sendsCommands: false
    error?: string
  }

  if (!response.ok) {
    throw new Error(result.error ?? 'Signal logger kunne ikke slettes')
  }

  return result
}

export async function runKnxSingleGaAction(payload: {
  action: 'poll' | 'write'
  groupAddress: string
  dpt: '1.001' | '5.001' | '9.001' | '20.102'
  value?: string | number | boolean
}): Promise<KnxSingleGaActionResult> {
  const response = await fetchBridge('/api/knx/single-action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const result = (await response.json()) as KnxSingleGaActionResult

  if (!response.ok) {
    throw new Error(result.error ?? 'Single GA action feilet')
  }

  return result
}

export async function runKnxEtsAudit(): Promise<KnxEtsAuditResult> {
  const response = await fetchBridge('/api/knx/ets-audit')
  const result = (await response.json()) as KnxEtsAuditResult

  if (!response.ok) {
    throw new Error(result.error ?? 'ETS audit kunne ikke kjøres')
  }

  return result
}

export async function getServerRuntimeState(): Promise<ServerRuntimeState> {
  const response = await fetchBridge('/api/runtime/state')

  if (!response.ok) {
    throw new Error('Server runtime-state er ikke tilgjengelig fra bridge')
  }

  return response.json() as Promise<ServerRuntimeState>
}

export async function getServerRuntimeHistory(
  limit = 120,
  options: { range?: 'lastHour' | 'day' | 'week'; category?: string } = {},
): Promise<ServerRuntimeHistory> {
  const params = new URLSearchParams({
    limit: String(limit),
    range: options.range ?? 'day',
    category: options.category ?? 'all',
  })
  const response = await fetchBridge(`/api/runtime/history?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Server runtime-history er ikke tilgjengelig fra bridge')
  }

  return response.json() as Promise<ServerRuntimeHistory>
}

export async function getServerRuntimeSummary(): Promise<ServerRuntimeSummary> {
  const response = await fetchBridge('/api/runtime/summary')

  if (!response.ok) {
    throw new Error('Server runtime-summary er ikke tilgjengelig fra bridge')
  }

  return response.json() as Promise<ServerRuntimeSummary>
}

export async function getRuntimeHealth(): Promise<RuntimeHealthSnapshot> {
  const response = await fetchBridge('/api/runtime/health')

  if (!response.ok) {
    throw new Error('Runtime health er ikke tilgjengelig fra bridge')
  }

  return response.json() as Promise<RuntimeHealthSnapshot>
}

export async function getServerRuntimeAggregates(): Promise<ServerRuntimeAggregates> {
  const response = await fetchBridge('/api/runtime/aggregates')

  if (!response.ok) {
    throw new Error('Server runtime-aggregater er ikke tilgjengelig fra bridge')
  }

  return response.json() as Promise<ServerRuntimeAggregates>
}

export async function getServerRuntimeInsights(limit = 12): Promise<ServerRuntimeInsights> {
  const params = new URLSearchParams({
    limit: String(limit),
  })
  const response = await fetchBridge(`/api/runtime/insights?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Server runtime-insights er ikke tilgjengelig fra bridge')
  }

  return response.json() as Promise<ServerRuntimeInsights>
}

export async function getIntegrationProviders(): Promise<IntegrationManagerSnapshot> {
  const response = await fetch(`${BRIDGE_BASE_URL}/api/integrations`)

  if (!response.ok) {
    throw new Error('Integrasjonsstatus er ikke tilgjengelig fra bridge')
  }

  return response.json() as Promise<IntegrationManagerSnapshot>
}

export async function getDeltacoTuyaDiscovery(): Promise<DeltacoTuyaDiscoverySnapshot> {
  const response = await fetch(`${BRIDGE_BASE_URL}/api/integrations/deltacoTuya/discovery`)

  if (!response.ok) {
    throw new Error('Deltaco/Tuya discovery er ikke tilgjengelig fra bridge')
  }

  return response.json() as Promise<DeltacoTuyaDiscoverySnapshot>
}

export async function getDeltacoTuyaIdentifySession(): Promise<DeltacoTuyaIdentifySnapshot> {
  const response = await fetch(`${BRIDGE_BASE_URL}/api/integrations/deltacoTuya/identify`)

  if (!response.ok) {
    throw new Error('Deltaco/Tuya identify-session er ikke tilgjengelig fra bridge')
  }

  return response.json() as Promise<DeltacoTuyaIdentifySnapshot>
}

export async function startDeltacoTuyaIdentifySession(
  physicalOrder = 1,
): Promise<DeltacoTuyaIdentifySnapshot> {
  const response = await fetch(`${BRIDGE_BASE_URL}/api/integrations/deltacoTuya/identify/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ physicalOrder }),
  })

  if (!response.ok) {
    throw new Error('Deltaco/Tuya identify-session kunne ikke startes')
  }

  return response.json() as Promise<DeltacoTuyaIdentifySnapshot>
}

export async function observeDeltacoTuyaIdentifySession(): Promise<DeltacoTuyaIdentifySnapshot> {
  const response = await fetch(`${BRIDGE_BASE_URL}/api/integrations/deltacoTuya/identify/observe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })

  if (!response.ok) {
    throw new Error('Deltaco/Tuya identify-session kunne ikke observeres')
  }

  return response.json() as Promise<DeltacoTuyaIdentifySnapshot>
}

export async function getDeltacoTuyaMappings(): Promise<DeltacoTuyaMappingsSnapshot> {
  const response = await fetch(`${BRIDGE_BASE_URL}/api/integrations/deltacoTuya/mappings`)

  if (!response.ok) {
    throw new Error('Deltaco/Tuya mappings er ikke tilgjengelig fra bridge')
  }

  return response.json() as Promise<DeltacoTuyaMappingsSnapshot>
}

export async function confirmDeltacoTuyaMapping(payload: {
  ip: string
  physicalOrder: number
  displayName?: string
}): Promise<{
  ok: boolean
  provider: string
  mapping?: DeltacoTuyaConfirmedMapping
  mappings?: DeltacoTuyaConfirmedMapping[]
  providerContract?: IntegrationProviderContract
  safety?: {
    sendsCommands: boolean
    cloudLogin: boolean
    localKeys: boolean
    automations: boolean
    runtimeMutated: boolean
    secretsReturned: boolean
  }
  error?: string
}> {
  const response = await fetch(`${BRIDGE_BASE_URL}/api/integrations/deltacoTuya/mappings/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    let message = 'Deltaco/Tuya mapping kunne ikke bekreftes'

    try {
      const body = (await response.json()) as { error?: string }
      message = body.error ?? message
    } catch {
      // Keep default message when body is not valid JSON.
    }

    throw new Error(message)
  }

  return response.json()
}

export async function getDeltacoTuyaProtocolResearch(): Promise<DeltacoTuyaProtocolResearchSnapshot> {
  const response = await fetch(`${BRIDGE_BASE_URL}/api/integrations/deltacoTuya/protocol-research`)

  if (!response.ok) {
    throw new Error('Deltaco/Tuya protocol research er ikke tilgjengelig fra bridge')
  }

  return response.json() as Promise<DeltacoTuyaProtocolResearchSnapshot>
}

export async function updateIntegrationProviderConfig(
  provider: string,
  payload: Record<string, unknown>,
): Promise<{
  ok: boolean
  provider?: IntegrationProviderContract
  update?: {
    acceptedFields: string[]
    secretsAcceptedAsPresenceOnly: string[]
    persisted: boolean
    persistence?: boolean
    encryptedCredentialsUpdated?: string[]
    credentialEncryptionOk?: boolean
    runtimeMutated: boolean
    secretsReturned: boolean
    note: string
  }
  error?: string
}> {
  const response = await fetch(
    `${BRIDGE_BASE_URL}/api/integrations/${encodeURIComponent(provider)}/config`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  )

  if (!response.ok) {
    let message = 'Provider config kunne ikke valideres'

    try {
      const body = (await response.json()) as { error?: string }
      message = body.error ?? message
    } catch {
      // Keep default message when body is not valid JSON.
    }

    throw new Error(message)
  }

  return response.json()
}

export async function updateIntegrationProviderLifecycle(
  provider: string,
  action: 'enable' | 'disable' | 'activate' | 'deactivate',
): Promise<{
  ok: boolean
  provider?: IntegrationProviderContract
  lifecycleAction?: {
    action: string
    accepted: boolean
    reason: string
    persisted: boolean
    runtimeMutated: boolean
    secretsReturned: boolean
    hardwareAction: boolean
    automations: boolean
  }
  error?: string
}> {
  const response = await fetch(
    `${BRIDGE_BASE_URL}/api/integrations/${encodeURIComponent(provider)}/${action}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    },
  )

  if (!response.ok) {
    let message = 'Provider lifecycle kunne ikke oppdateres'

    try {
      const body = (await response.json()) as { error?: string; lifecycleAction?: { reason?: string } }
      message = body.error ?? body.lifecycleAction?.reason ?? message
    } catch {
      // Keep default message when body is not valid JSON.
    }

    throw new Error(message)
  }

  return response.json()
}

export async function getMqttStatus(): Promise<BridgeMqttStatus> {
  const response = await fetch(`${BRIDGE_BASE_URL}/api/mqtt/status`)

  if (!response.ok) {
    throw new Error('MQTT-status er ikke tilgjengelig fra bridge')
  }

  return response.json() as Promise<BridgeMqttStatus>
}

export async function connectMqtt(): Promise<BridgeMqttStatus> {
  return postToBridge('/api/mqtt/connect', {}) as Promise<BridgeMqttStatus>
}

export async function disconnectMqtt(): Promise<BridgeMqttStatus> {
  return postToBridge('/api/mqtt/disconnect', {}) as Promise<BridgeMqttStatus>
}

export async function getCastStatus(): Promise<BridgeCastStatus> {
  const response = await fetch(`${BRIDGE_BASE_URL}/api/cast/status`)

  if (!response.ok) {
    throw new Error('Cast-status er ikke tilgjengelig fra bridge')
  }

  return response.json() as Promise<BridgeCastStatus>
}

export async function discoverCastDevices(): Promise<BridgeCastStatus> {
  return postToBridge('/api/cast/discover', {}) as Promise<BridgeCastStatus>
}

export async function getCastPlayback(): Promise<BridgeCastPlayback> {
  const response = await fetch(`${BRIDGE_BASE_URL}/api/cast/playback`)

  if (!response.ok) {
    throw new Error('Cast playback-status er ikke tilgjengelig fra bridge')
  }

  return response.json() as Promise<BridgeCastPlayback>
}

export async function castPlay(payload: {
  deviceId?: string | null
  mediaUrl?: string | null
  title?: string | null
}): Promise<BridgeCastPlayback> {
  return postToBridge('/api/cast/play', {
    deviceId: payload.deviceId ?? null,
    mediaUrl: payload.mediaUrl ?? null,
    title: payload.title ?? null,
  }) as Promise<BridgeCastPlayback>
}

export async function castPause(): Promise<BridgeCastPlayback> {
  return postToBridge('/api/cast/pause', {}) as Promise<BridgeCastPlayback>
}

export async function castStop(): Promise<BridgeCastPlayback> {
  return postToBridge('/api/cast/stop', {}) as Promise<BridgeCastPlayback>
}

export async function castSetVolume(volume: number): Promise<BridgeCastPlayback> {
  return postToBridge('/api/cast/volume', { volume }) as Promise<BridgeCastPlayback>
}

export async function getVacuumStatus(): Promise<BridgeVacuumStatus> {
  const response = await fetch(`${BRIDGE_BASE_URL}/api/vacuum/status`)

  if (!response.ok) {
    throw new Error('Robotstatus er ikke tilgjengelig fra bridge')
  }

  return response.json() as Promise<BridgeVacuumStatus>
}

export async function connectVacuum(): Promise<BridgeVacuumStatus> {
  return postToBridge('/api/vacuum/connect', {}) as Promise<BridgeVacuumStatus>
}

export async function getDreameCloudStatus(): Promise<BridgeDreameCloudStatus> {
  const response = await fetch(`${BRIDGE_BASE_URL}/api/dreame-cloud/status`)

  if (!response.ok) {
    throw new Error('Dreame cloud status er ikke tilgjengelig fra bridge')
  }

  return response.json() as Promise<BridgeDreameCloudStatus>
}

export async function connectDreameCloud(): Promise<BridgeDreameCloudStatus> {
  return postToBridge('/api/dreame-cloud/connect', {}) as Promise<BridgeDreameCloudStatus>
}

export async function sendVacuumCommand(
  command: 'start' | 'pause' | 'dock' | 'stop' | 'status',
): Promise<BridgeVacuumStatus> {
  return postToBridge('/api/vacuum/command', { command }) as Promise<BridgeVacuumStatus>
}

export type MediaLibraryResponse = {
  ok: boolean
  source: 'local'
  musicPath: string
  tracks: MediaTrack[]
}

export async function getLocalMediaLibrary(): Promise<MediaLibraryResponse> {
  const response = await fetch(`${BRIDGE_BASE_URL}/api/media/library`)

  if (!response.ok) {
    let message = 'Media-biblioteket svarte ikke som forventet'

    try {
      const payload = (await response.json()) as { error?: string }
      message = payload.error ?? message
    } catch {
      // Keep default message when body is not valid JSON.
    }

    throw new Error(message)
  }

  const payload = (await response.json()) as MediaLibraryResponse

  return {
    ...payload,
    tracks: payload.tracks.map((track) => ({
      ...track,
      source: 'local',
      sourceUrl: track.sourceUrl?.startsWith('http')
        ? track.sourceUrl
        : `${BRIDGE_BASE_URL}${track.sourceUrl ?? ''}`,
    })),
  }
}

export async function syncBridgeRuntimeConfig(
  networkConfig: NetworkConfig,
  runtimeConfig: RuntimeConfig,
  writeMapping: Record<string, KnxRoomMapping>,
) {
  const selectedMapping = selectRuntimeConfigMapping(writeMapping)
  const effectiveMapping = selectedMapping.mapping
  const lightWritePoints = Object.entries(effectiveMapping).flatMap(
    ([roomKey, roomMapping]) =>
      Object.entries(roomMapping.zones)
        .map(([zoneKey, zoneMapping]) => ({
          room: roomKey,
          zone: zoneKey,
          label: `${roomKey} / ${zoneKey}`,
          light: zoneMapping.light,
          lightDataType: zoneMapping.lightDataType ?? '1-bit',
          value: zoneMapping.value,
          valueDataType: zoneMapping.valueDataType ?? '1-byte',
          dimmable: zoneMapping.dimmable,
        }))
        .filter((point) => isConfiguredAddress(point.light) || isConfiguredAddress(point.value)),
  )

  const climateWritePoints = Object.entries(effectiveMapping)
    .map(([roomKey, roomMapping]) => ({
      room: roomKey,
      label: roomKey,
      setpoint: roomMapping.setpoint,
      setpointDataType: roomMapping.setpointDataType ?? '2-byte float',
      setpointWriteStrategy: roomMapping.setpointWriteStrategy ?? 'absoluteTemperature',
      mode: roomMapping.mode ?? '',
      modeDataType: roomMapping.modeDataType ?? '1-byte',
      climateActive: roomMapping.climateActive ?? false,
      liveClimateActive: roomMapping.liveClimateActive ?? false,
    }))
    .filter(
      (point) =>
        point.climateActive &&
        point.liveClimateActive &&
        (isConfiguredAddress(point.setpoint) || isConfiguredAddress(point.mode)),
    )

  const lightFeedbackPoints = Object.entries(effectiveMapping).flatMap(
    ([roomKey, roomMapping]) =>
      Object.entries(roomMapping.zones)
        .map(([zoneKey, zoneMapping]) => ({
          room: roomKey,
          zone: zoneKey,
          label: `${roomKey} / ${zoneKey}`,
          lightFeedback: zoneMapping.lightFeedback ?? '',
          valueFeedback: zoneMapping.valueFeedback ?? '',
        }))
        .filter(
          (point) =>
            isConfiguredAddress(point.lightFeedback) ||
            isConfiguredAddress(point.valueFeedback),
        ),
  )

  const climateFeedbackPoints = Object.entries(effectiveMapping)
    .map(([roomKey, roomMapping]) => ({
      room: roomKey,
      label: roomKey,
      temperature: roomMapping.temperature ?? '',
      temperatureDataType: roomMapping.temperatureDataType ?? '2-byte float',
      setpointFeedback: roomMapping.setpointFeedback ?? '',
      setpointFeedbackDataType: roomMapping.setpointFeedbackDataType ?? '2-byte float',
      modeFeedback: roomMapping.modeFeedback ?? '',
      modeFeedbackDataType: roomMapping.modeFeedbackDataType ?? '1-byte',
      heatDemand: roomMapping.heatDemand ?? '',
      heatDemandDataType: roomMapping.heatDemandDataType ?? '1-byte',
      climateActive: roomMapping.climateActive ?? false,
      liveClimateActive: roomMapping.liveClimateActive ?? false,
    }))
    .filter(
      (point) =>
        point.climateActive &&
        point.liveClimateActive &&
        (
          isConfiguredAddress(point.temperature) ||
          isConfiguredAddress(point.setpointFeedback) ||
          isConfiguredAddress(point.modeFeedback) ||
          isConfiguredAddress(point.heatDemand)
        ),
    )

  const runtimeConfigPayloadSummary: BridgeRuntimeConfigPayloadSummary = {
    ...selectedMapping.summary,
    lightWriteCount: lightWritePoints.filter((point) => isConfiguredAddress(point.light)).length,
    dimWriteCount: lightWritePoints.filter((point) => point.dimmable && isConfiguredAddress(point.value)).length,
    climateWriteCount: climateWritePoints.length,
    lightFeedbackCount: lightFeedbackPoints.filter((point) => isConfiguredAddress(point.lightFeedback)).length,
    dimFeedbackCount: lightFeedbackPoints.filter((point) => isConfiguredAddress(point.valueFeedback)).length,
    climateFeedbackCount: climateFeedbackPoints.reduce(
      (count, point) =>
        count +
        [
          point.temperature,
          point.setpointFeedback,
          point.modeFeedback,
          point.heatDemand,
        ].filter((address) => isConfiguredAddress(address)).length,
      0,
    ),
    totalWriteMappings:
      lightWritePoints.filter((point) => isConfiguredAddress(point.light)).length +
      lightWritePoints.filter((point) => point.dimmable && isConfiguredAddress(point.value)).length +
      climateWritePoints.length,
    totalFeedbackMappings:
      lightFeedbackPoints.filter((point) => isConfiguredAddress(point.lightFeedback)).length +
      lightFeedbackPoints.filter((point) => isConfiguredAddress(point.valueFeedback)).length +
      climateFeedbackPoints.reduce(
        (count, point) =>
          count +
          [
            point.temperature,
            point.setpointFeedback,
            point.modeFeedback,
            point.heatDemand,
          ].filter((address) => isConfiguredAddress(address)).length,
        0,
      ),
    totalRuntimeTargets:
      lightFeedbackPoints.filter((point) => isConfiguredAddress(point.lightFeedback)).length +
      lightFeedbackPoints.filter((point) => isConfiguredAddress(point.valueFeedback)).length +
      climateFeedbackPoints.reduce(
        (count, point) =>
          count +
          [
            point.temperature,
            point.setpointFeedback,
            point.modeFeedback,
            point.heatDemand,
          ].filter((address) => isConfiguredAddress(address)).length,
        0,
      ),
  }
  const payload = {
    connectionMode: networkConfig.connectionMode,
    localDirect: {
      host: networkConfig.localDirect.host,
      port: networkConfig.localDirect.port,
    },
    remoteTunnel: {
      host: networkConfig.remoteTunnel.host,
      port: networkConfig.remoteTunnel.port,
    },
    climateFeedbackMethod: runtimeConfig.climateFeedbackMethod,
    climatePollingIntervalSec: runtimeConfig.climatePollingIntervalSec,
    writeMapping: {
      lights: lightWritePoints,
      climate: climateWritePoints,
    },
    feedbackMapping: {
      lights: lightFeedbackPoints,
      climate: climateFeedbackPoints,
    },
    runtimeConfigPayloadSummary,
  }
  const payloadSizeBytes = JSON.stringify(payload).length
  payload.runtimeConfigPayloadSummary = {
    ...runtimeConfigPayloadSummary,
    payloadSizeBytes,
  }
  console.info('[Lynell] Runtime config payload summary', payload.runtimeConfigPayloadSummary)

  const response = await postToBridge('/api/runtime/config', payload)
  return {
    ...(response as Record<string, unknown>),
    payloadSummary: payload.runtimeConfigPayloadSummary,
  }
}

type FeedbackTarget = {
  room: string
  zone: string
  label: string
  lightFeedback: string | null
  valueFeedback: string | null
}

type FeedbackResult = {
  room: string
  zone: string
  label?: string
  lightOn: boolean | null
  brightness: number | null
}

type FeedbackDiagnostic = {
  roomKey: string
  zoneKey: string
  roomLabel: string
  zoneLabel: string
  address: string | null
  dataType: string | null
  interpretationRule: string | null
  rawValue: boolean | number | string | null
  mappedValue: boolean | number | string | null
}

type LightFeedbackMergeResult = {
  rooms: Room[]
  confirmedLightZoneKeys: string[]
  confirmedBrightnessZoneKeys: string[]
  updatedRoomKeys: string[]
  diagnostics: FeedbackDiagnostic[]
}

async function dispatchKnxCommand(
  path: '/api/knx/light' | '/api/knx/brightness' | '/api/knx/mode',
  payload: Record<string, boolean | number | string | null>,
) {
  if (isMockRuntimeMode(currentSystemMode)) {
    return
  }

  try {
    await postToBridge(path, payload)
  } catch (error) {
    console.warn('[Bridge] Live KNX command failed.', error)
    throw error instanceof Error
      ? error
      : new Error('Live-modus krever lokal bridge')
  }
}

async function queryBridgeFeedback(targets: FeedbackTarget[]) {
  const payload = (await postToBridge('/api/knx/feedback/query', {
    targets,
  })) as { feedback?: FeedbackResult[] }

  return payload.feedback ?? []
}

function updateZone(
  room: Room,
  zoneId: string,
  update: (zone: LightZone) => LightZone,
) {
  return {
    ...room,
    zones: room.zones.map((zone) => (zone.id === zoneId ? update(zone) : zone)),
  }
}

function getFeedbackTargets(roomKeys?: string[]) {
  const allowedRoomKeys = roomKeys ? new Set(roomKeys) : null

  return roomsStore.flatMap((room) => {
    if (allowedRoomKeys && !allowedRoomKeys.has(room.key)) {
      return []
    }

    const roomMapping = getRoomMapping(room)

    if (!roomMapping) {
      return []
    }

    return room.zones
      .map((zone) => {
        const zoneMapping = roomMapping.zones[zone.key]

        if (!zoneMapping?.lightFeedback && !zoneMapping?.valueFeedback) {
          return null
        }

        return {
          room: room.key,
          zone: zone.key,
          label: `${room.name} / ${zone.name}`,
          lightFeedback: zoneMapping.lightFeedback ?? null,
          valueFeedback: zoneMapping.valueFeedback ?? null,
        } satisfies FeedbackTarget
      })
      .filter((target): target is FeedbackTarget => target !== null)
  })
}

function mergeLightFeedbackResults(feedback: FeedbackResult[]): LightFeedbackMergeResult {
  const confirmedLightZoneKeys: string[] = []
  const confirmedBrightnessZoneKeys: string[] = []
  const updatedRoomKeys = new Set<string>()
  const diagnostics: FeedbackDiagnostic[] = []

  for (const item of feedback) {
    const room = roomsStore.find((currentRoom) => currentRoom.key === item.room)
    const roomMapping = room ? getRoomMapping(room) : undefined

    if (!room) {
      continue
    }

    const zone = room.zones.find((currentZone) => currentZone.key === item.zone)
    const zoneMapping = roomMapping?.zones[item.zone]

    if (!zone) {
      continue
    }

    const nextBrightness =
      item.brightness !== null ? item.brightness : zone.brightness
    const feedbackInterpretationRule =
      zoneMapping?.feedbackInterpretationRule ??
      (zoneMapping?.deriveLightStateFromValueFeedback
        ? 'boolFromValueAboveZero'
        : 'standard')
    const nextLightsOn =
      item.lightOn !== null
        ? item.lightOn
        : feedbackInterpretationRule === 'boolFromValueAboveZero' && item.brightness !== null
          ? nextBrightness > 0
          : zone.lightsOn

    if (item.lightOn === null && item.brightness === null) {
      console.log('[Bridge] No new light feedback payload, preserving zone state', {
        room: item.room,
        zone: item.zone,
        brightness: zone.brightness,
        lightsOn: zone.lightsOn,
      })
      continue
    }

    console.log('[Bridge] Merging light feedback zone', {
      room: item.room,
      zone: item.zone,
      nextBrightness,
      nextLightsOn,
      feedbackInterpretationRule,
    })

    roomsStore = roomsStore.map((currentRoom) =>
      currentRoom.key !== item.room
        ? currentRoom
        : updateZone(currentRoom, zone.id, (currentZone) => ({
            ...currentZone,
            brightness: nextBrightness,
            lightsOn: nextLightsOn,
          })),
    )

    if (item.lightOn !== null) {
      confirmedLightZoneKeys.push(`${item.room}:${item.zone}`)
      diagnostics.push({
        roomKey: item.room,
        zoneKey: item.zone,
        roomLabel: room.name,
        zoneLabel: zone.name,
        address: zoneMapping?.lightFeedback?.trim() || null,
        dataType: zoneMapping?.lightFeedbackDataType ?? null,
        interpretationRule: 'standard',
        rawValue: item.lightOn,
        mappedValue: nextLightsOn,
      })
    }

    if (item.brightness !== null) {
      confirmedBrightnessZoneKeys.push(`${item.room}:${item.zone}`)
      diagnostics.push({
        roomKey: item.room,
        zoneKey: item.zone,
        roomLabel: room.name,
        zoneLabel: zone.name,
        address: zoneMapping?.valueFeedback?.trim() || null,
        dataType: zoneMapping?.valueFeedbackDataType ?? null,
        interpretationRule: feedbackInterpretationRule,
        rawValue: null,
        mappedValue: nextBrightness,
      })
    }

    updatedRoomKeys.add(item.room)
  }

  return {
    rooms: cloneRooms(),
    confirmedLightZoneKeys,
    confirmedBrightnessZoneKeys,
    updatedRoomKeys: Array.from(updatedRoomKeys),
    diagnostics,
  }
}

function getClimateFeedbackTargets(roomKeys?: string[]) {
  const allowedRoomKeys = roomKeys ? new Set(roomKeys) : null

  return roomsStore
    .map((room) => {
      if (allowedRoomKeys && !allowedRoomKeys.has(room.key)) {
        return null
      }

      const roomMapping = getRoomMapping(room)

      if (!roomMapping?.climateActive || !roomMapping.liveClimateActive) {
        return null
      }

      const target: ClimateFeedbackTarget = {
        room: room.key,
        label: room.name,
        temperature: isConfiguredAddress(roomMapping.temperature)
          ? roomMapping.temperature ?? null
          : null,
        temperatureDataType: roomMapping.temperatureDataType ?? '2-byte float',
        setpointFeedback: isConfiguredAddress(roomMapping.setpointFeedback)
          ? roomMapping.setpointFeedback ?? null
          : null,
        setpointFeedbackDataType: roomMapping.setpointFeedbackDataType ?? '2-byte float',
        heatDemand: isConfiguredAddress(roomMapping.heatDemand)
          ? roomMapping.heatDemand ?? null
          : null,
        heatDemandDataType: roomMapping.heatDemandDataType ?? '1-byte',
        modeFeedback: isConfiguredAddress(roomMapping.modeFeedback)
          ? roomMapping.modeFeedback ?? null
          : null,
        modeFeedbackDataType: roomMapping.modeFeedbackDataType ?? '1-byte',
      }

      return target.temperature ||
        target.setpointFeedback ||
        target.heatDemand ||
        target.modeFeedback
        ? target
        : null
    })
    .filter((target): target is ClimateFeedbackTarget => target !== null)
}

function mergeClimateFeedbackEvents(events: ClimateFeedbackEvent[]): ClimateSyncResult {
  const updatedTemperatureRoomKeys: string[] = []
  const updatedSetpointRoomKeys: string[] = []
  const updatedHeatDemandRoomKeys: string[] = []
  const updatedRoomKeys = new Set<string>()

  for (const event of events) {
    if (typeof event.mappedValue !== 'number' && typeof event.mappedValue !== 'string') {
      if (event.field === 'heatDemand') {
        const roomMapping = currentKnxMapping[event.roomKey]
        console.warn('[Lynell] Ignoring heatDemand feedback without numeric mapped value', {
          roomKey: event.roomKey,
          heatDemandAddress: roomMapping?.heatDemand ?? event.address,
          heatDemandDataType: roomMapping?.heatDemandDataType ?? event.dataType,
          rawValue: event.rawValue,
          mappedHeatDemand: event.mappedValue,
          mappingVariant: event.mappingVariant ?? null,
        })
      }
      continue
    }

    roomsStore = roomsStore.map((room) => {
      if (room.key !== event.roomKey) {
        return room
      }

      updatedRoomKeys.add(event.roomKey)

      if (event.field === 'temperature' && typeof event.mappedValue === 'number') {
        updatedTemperatureRoomKeys.push(event.roomKey)
        return { ...room, temperature: event.mappedValue }
      }

      if (event.field === 'setpointFeedback' && typeof event.mappedValue === 'number') {
        updatedSetpointRoomKeys.push(event.roomKey)
        return { ...room, targetTemperature: event.mappedValue }
      }

      if (event.field === 'heatDemand' && typeof event.mappedValue === 'number') {
        const roomMapping = currentKnxMapping[event.roomKey]
        console.log('[Lynell] Heat demand feedback merge', {
          roomKey: event.roomKey,
          heatDemandAddress: roomMapping?.heatDemand ?? event.address,
          heatDemandDataType: roomMapping?.heatDemandDataType ?? event.dataType,
          rawValue: event.rawValue,
          mappedHeatDemand: event.mappedValue,
          mappingVariant: event.mappingVariant ?? null,
          uiSource: 'knx-heatDemand',
        })
        updatedHeatDemandRoomKeys.push(event.roomKey)
        return { ...room, heatDemand: event.mappedValue }
      }

      if (
        event.field === 'modeFeedback' &&
        (event.mappedValue === 'Komfort' || event.mappedValue === 'Natt')
      ) {
        return { ...room, mode: event.mappedValue }
      }

      return room
    })
  }

  return {
    rooms: cloneRooms(),
    updatedTemperatureRoomKeys,
    updatedSetpointRoomKeys,
    updatedHeatDemandRoomKeys,
    updatedRoomKeys: Array.from(updatedRoomKeys),
  }
}

export async function getRooms() {
  await sleep(getApiDelay())
  maybeThrowError()
  return cloneRooms()
}

export async function setLight(roomId: number, zoneId: string, value: boolean) {
  await sleep(getApiDelay())

  if (isMockRuntimeMode(currentSystemMode)) {
    maybeThrowError()
  }

  const room = roomsStore.find((currentRoom) => currentRoom.id === roomId)
  const zone = room?.zones.find((currentZone) => currentZone.id === zoneId)
  const roomMapping = room ? getRoomMapping(room) : undefined
  const zoneMapping = zone ? roomMapping?.zones[zone.key] : undefined

  if (zoneMapping && room && zone) {
    await dispatchKnxCommand('/api/knx/light', {
      room: room.key,
      zone: zone.key,
      address: zoneMapping.light,
      value,
    })
  }

  roomsStore = roomsStore.map((room) => {
    if (room.id !== roomId) {
      return room
    }

    const zone = room.zones.find((currentZone) => currentZone.id === zoneId)

    if (!zone) {
      return room
    }

    const brightness = value
      ? zone.brightness > 0
        ? zone.brightness
        : defaultBrightness
      : 0

    if (zoneMapping) {
      logKnxWrite(zoneMapping.light, value)
    }

    return updateZone(room, zoneId, (currentZone) => ({
      ...currentZone,
      brightness,
      lightsOn: brightness > 0,
    }))
  })

  return cloneRooms()
}

export async function setBrightness(roomId: number, zoneId: string, value: number) {
  await sleep(getApiDelay())

  if (isMockRuntimeMode(currentSystemMode)) {
    maybeThrowError()
  }

  const room = roomsStore.find((currentRoom) => currentRoom.id === roomId)
  const zone = room?.zones.find((currentZone) => currentZone.id === zoneId)
  const roomMapping = room ? getRoomMapping(room) : undefined
  const zoneMapping = zone ? roomMapping?.zones[zone.key] : undefined
  const brightness = normalizeBrightness(value)

  if (zoneMapping && room && zone) {
    await dispatchKnxCommand('/api/knx/brightness', {
      room: room.key,
      zone: zone.key,
      dimAddress: zoneMapping.dim,
      valueAddress: zoneMapping.value,
      brightness,
    })
  }

  roomsStore = roomsStore.map((room) => {
    if (room.id !== roomId) {
      return room
    }

    const zone = room.zones.find((currentZone) => currentZone.id === zoneId)

    if (!zone) {
      return room
    }

    if (zoneMapping) {
      logKnxWrite(zoneMapping.dim, brightness === 0 ? 0 : 1)
      logKnxWrite(zoneMapping.value, brightness)
    }

    return updateZone(room, zoneId, (currentZone) => ({
      ...currentZone,
      brightness,
      lightsOn: brightness > 0,
    }))
  })

  return cloneRooms()
}

export async function setMode(roomId: number, mode: RoomMode) {
  await sleep(getApiDelay())

  if (isMockRuntimeMode(currentSystemMode)) {
    maybeThrowError()
  }

  const room = roomsStore.find((currentRoom) => currentRoom.id === roomId)
  const roomMapping = room ? getRoomMapping(room) : undefined
  const setpointAddress = roomMapping?.setpoint?.trim()

  if (
    roomMapping?.climateActive &&
    roomMapping.liveClimateActive &&
    room &&
    isConfiguredAddress(setpointAddress)
  ) {
    await dispatchKnxCommand('/api/knx/mode', {
      room: room.key,
      roomName: room.name,
      address: setpointAddress ?? '',
      mode,
      setpoint: modeSetpoints[mode],
      liveClimateActive: true,
    })
  }

  roomsStore = roomsStore.map((room) => {
    if (room.id !== roomId) {
      return room
    }

    if (
      roomMapping?.climateActive &&
      roomMapping.liveClimateActive &&
      isConfiguredAddress(setpointAddress)
    ) {
      logKnxWrite(setpointAddress ?? '', modeSetpoints[mode])
    }

    return { ...room, mode, targetTemperature: modeSetpoints[mode] }
  })

  return cloneRooms()
}

export async function setSetpoint(
  roomId: number,
  setpoint: number,
  mode?: RoomMode,
) {
  await sleep(getApiDelay())

  if (isMockRuntimeMode(currentSystemMode)) {
    maybeThrowError()
  }

  const room = roomsStore.find((currentRoom) => currentRoom.id === roomId)
  const roomMapping = room ? getRoomMapping(room) : undefined
  const setpointAddress = roomMapping?.setpoint?.trim()

  if (
    roomMapping?.climateActive &&
    roomMapping.liveClimateActive &&
    room &&
    isConfiguredAddress(setpointAddress)
  ) {
    await dispatchKnxCommand('/api/knx/mode', {
      room: room.key,
      roomName: room.name,
      address: setpointAddress ?? '',
      mode: mode ?? null,
      setpoint,
      liveClimateActive: true,
    })
  }

  roomsStore = roomsStore.map((currentRoom) => {
    if (currentRoom.id !== roomId) {
      return currentRoom
    }

    if (
      roomMapping?.climateActive &&
      roomMapping.liveClimateActive &&
      isConfiguredAddress(setpointAddress)
    ) {
      logKnxWrite(setpointAddress ?? '', setpoint)
    }

    return {
      ...currentRoom,
      mode: mode ?? currentRoom.mode,
      targetTemperature: Number(setpoint.toFixed(1)),
    }
  })

  return cloneRooms()
}

export function updateTemperatures() {
  roomsStore = roomsStore.map((room) => {
    const difference = room.targetTemperature - room.temperature

    if (Math.abs(difference) <= 0.05) {
      return room
    }

    const step = Math.min(Math.abs(difference), getTemperatureStep())
    const direction = difference > 0 ? 1 : -1
    const nextTemperature = Number((room.temperature + direction * step).toFixed(1))

    return { ...room, temperature: nextTemperature }
  })

  return cloneRooms()
}

type LightFeedbackSyncResult = {
  rooms: Room[]
  confirmedLightZoneKeys: string[]
  confirmedBrightnessZoneKeys: string[]
  updatedRoomKeys: string[]
  diagnostics: FeedbackDiagnostic[]
}

export async function syncLightFeedback(): Promise<LightFeedbackSyncResult> {
  if (currentSystemMode !== 'live') {
    return {
      rooms: cloneRooms(),
      confirmedLightZoneKeys: [],
      confirmedBrightnessZoneKeys: [],
      updatedRoomKeys: [],
      diagnostics: [],
    }
  }

  try {
    const feedbackTargets = getFeedbackTargets()
    const feedback = await queryBridgeFeedback(feedbackTargets)
    return mergeLightFeedbackResults(feedback)
  } catch (error) {
    console.warn('[Bridge] Light feedback sync failed.', error)
    throw new Error('Live feedback fra KNX er utilgjengelig')
  }
}

type ClimateSyncResult = {
  rooms: Room[]
  updatedTemperatureRoomKeys: string[]
  updatedSetpointRoomKeys: string[]
  updatedHeatDemandRoomKeys: string[]
  updatedRoomKeys: string[]
}

type ClimateFeedbackTarget = {
  room: string
  label: string
  temperature: string | null
  temperatureDataType: string
  setpointFeedback: string | null
  setpointFeedbackDataType: string
  heatDemand: string | null
  heatDemandDataType: string
  modeFeedback: string | null
  modeFeedbackDataType: string
}

type ClimateFeedbackEvent = {
  roomKey: string
  field: 'temperature' | 'setpointFeedback' | 'heatDemand' | 'modeFeedback'
  address: string
  rawValue: boolean | number | string | null
  mappedValue: boolean | number | string | null
  dataType: string | null
  mappingVariant?: string | null
}

export async function syncLightFeedbackForRooms(
  roomKeys: string[],
): Promise<LightFeedbackSyncResult> {
  if (currentSystemMode !== 'live') {
    return {
      rooms: cloneRooms(),
      confirmedLightZoneKeys: [],
      confirmedBrightnessZoneKeys: [],
      updatedRoomKeys: [],
      diagnostics: [],
    }
  }

  try {
    const feedbackTargets = getFeedbackTargets(roomKeys)

    if (feedbackTargets.length === 0) {
      return {
        rooms: cloneRooms(),
        confirmedLightZoneKeys: [],
        confirmedBrightnessZoneKeys: [],
        updatedRoomKeys: [],
        diagnostics: [],
      }
    }

    const feedback = await queryBridgeFeedback(feedbackTargets)
    return mergeLightFeedbackResults(feedback)
  } catch (error) {
    console.warn('[Bridge] Light feedback sync failed.', error)
    throw new Error('Live feedback fra KNX er utilgjengelig')
  }
}

export async function subscribeToLightFeedbackStream(
  roomKeys: string[],
  view: string,
  onFeedback: (result: LightFeedbackMergeResult) => void,
  onError: (error: Error) => void,
) {
  const feedbackTargets = getFeedbackTargets(roomKeys)

  if (feedbackTargets.length === 0) {
    return () => {}
  }

  const payload = (await postToBridge('/api/knx/feedback/subscribe-light', {
    view,
    targets: feedbackTargets,
  })) as { subscriptionId?: string }

  const subscriptionId = payload.subscriptionId

  if (!subscriptionId) {
    throw new Error('Live feedback-strøm kunne ikke opprettes')
  }

  const eventSource = new EventSource(
    `${BRIDGE_BASE_URL}/api/knx/feedback/stream?subscriptionId=${encodeURIComponent(subscriptionId)}`,
  )

  const handleLightFeedbackEvent = (event: MessageEvent<string>) => {
    try {
      const nextFeedback = JSON.parse(event.data) as FeedbackResult
      const result = mergeLightFeedbackResults([nextFeedback])
      onFeedback(result)
    } catch (error) {
      onError(
        error instanceof Error
          ? error
          : new Error('Ugyldig live feedback-payload fra bridge'),
      )
    }
  }

  const handleError = () => {
    onError(new Error('Live feedback-strøm fra KNX ble avbrutt'))
  }

  eventSource.addEventListener('light-feedback', handleLightFeedbackEvent as EventListener)
  eventSource.onerror = handleError

  return () => {
    eventSource.close()
    void postToBridge('/api/knx/feedback/unsubscribe-light', {
      subscriptionId,
    }).catch(() => {
      console.warn('[Bridge] Failed to unsubscribe light feedback stream.', {
        subscriptionId,
      })
    })
  }
}

export async function subscribeToClimateFeedbackStream(
  roomKeys: string[],
  view: string,
  onFeedback: (result: ClimateSyncResult, event: ClimateFeedbackEvent) => void,
  onError: (error: Error) => void,
) {
  const targets = getClimateFeedbackTargets(roomKeys)

  if (targets.length === 0) {
    return () => {}
  }

  const payload = (await postToBridge('/api/knx/feedback/subscribe-climate', {
    view,
    targets,
  })) as { subscriptionId?: string }

  const subscriptionId = payload.subscriptionId

  if (!subscriptionId) {
    throw new Error('Live klima-strøm kunne ikke opprettes')
  }

  const eventSource = new EventSource(
    `${BRIDGE_BASE_URL}/api/knx/feedback/stream?subscriptionId=${encodeURIComponent(subscriptionId)}`,
  )

  const handleClimateFeedbackEvent = (event: MessageEvent<string>) => {
    try {
      const nextFeedback = JSON.parse(event.data) as ClimateFeedbackEvent
      const result = mergeClimateFeedbackEvents([nextFeedback])
      onFeedback(result, nextFeedback)
    } catch (error) {
      onError(
        error instanceof Error
          ? error
          : new Error('Ugyldig live klima-payload fra bridge'),
      )
    }
  }

  const handleError = () => {
    onError(new Error('Live klima-strøm fra KNX ble avbrutt'))
  }

  eventSource.addEventListener('climate-feedback', handleClimateFeedbackEvent as EventListener)
  eventSource.onerror = handleError

  return () => {
    eventSource.close()
    void postToBridge('/api/knx/feedback/unsubscribe-climate', {
      subscriptionId,
    }).catch(() => {
      console.warn('[Bridge] Failed to unsubscribe climate feedback stream.', {
        subscriptionId,
      })
    })
  }
}

export function subscribeToRuntimeEventStream(
  onEvent: (event: RuntimeEventPayload) => void,
  onStatus: (status: {
    connected: boolean
    connectionState?: 'connecting' | 'reconnecting' | 'synced' | 'stale' | 'offline'
    reconnectCount?: number
    reconnectAttempt?: number
    reconnectDelayMs?: number
    eventsLastMinute?: number
    droppedEvents?: number
    replayedEvents?: number
    eventBufferSize?: number
    latestEventId?: string | null
    lastAppliedEventId?: string | null
    replaySupported?: boolean
    resyncRequiredCount?: number
    pollingRequestsPerMinute?: number
    fallbackRefreshCount?: number
    topPollingSources?: Array<{ path: string; count: number }>
    actionMetrics?: RuntimeActionMetrics
    clientIdentity?: RuntimeClientSnapshot
    runtimeDomains?: RuntimeDomainSnapshot
    runtimeContinuity?: RuntimeContinuityStatus
    runtimeRegistry?: RuntimeRegistrySnapshot
    runtimeBoot?: RuntimeBootStatus
    soakMetrics?: Record<string, unknown>
    clients?: NonNullable<RuntimeEventPayload['stats']>['clients']
    lastEventAt?: string | null
    lastSuccessfulSyncAt?: string | null
    lastDisconnectedAt?: string | null
    latencyMs?: number | null
    frontendFreshness?: 'fresh' | 'stale' | 'offline'
    lastKnownEventId?: string | null
    error?: string | null
  }) => void,
) {
  const identity = getRuntimeClientRegistration()
  const eventTypes: RuntimeEventType[] = [
    'roomUpdated',
    'knxValueUpdated',
    'knxMonitorEvent',
    'historyPointAdded',
    'signalLoggerPoint',
    'runtimeFreshnessChanged',
    'runtimeSnapshotUpdated',
    'pollCompleted',
    'insightGenerated',
    'insightUpdated',
    'insightResolved',
    'insightAcknowledged',
    'providerStateChanged',
    'runtimeHeartbeat',
    'resyncRequired',
    'actionCreated',
    'actionApproved',
    'actionExecuted',
    'actionFailed',
    'actionCancelled',
    'actionPendingApproval',
    'actionApprovalRequested',
    'actionDenied',
    'actionExecutionStarted',
    'actionExecutionCompleted',
    'runtimeSnapshotCreated',
    'runtimeSnapshotRestored',
    'runtimePartialRestore',
    'runtimeRecoveryDetected',
    'providerRegistered',
    'registryUpdated',
    'runtimeServiceHealthChanged',
    'runtimeBootPhaseChanged',
    'providerBootCompleted',
    'providerBootDegraded',
    'runtimeReady',
    'runtimeDegraded',
    'policyUpdated',
    'auditEventCreated',
  ]
  let eventSource: EventSource | null = null
  let reconnectTimer: number | null = null
  let closed = false
  let reconnectAttempt = 0
  let reconnectCount = 0
  let lastKnownEventId: string | null = null
  let lastSuccessfulSyncAt: string | null = null
  let lastDisconnectedAt: string | null = null

  const getReconnectDelayMs = () => {
    const baseDelay = Math.min(30000, 1000 * 2 ** Math.min(reconnectAttempt, 5))
    const jitter = Math.round(Math.random() * 900)

    return baseDelay + jitter
  }

  const getRuntimeEventUrl = () => {
    const params = new URLSearchParams({
      clientId: identity.clientId,
      sessionId: identity.sessionId,
      clientName: identity.clientName,
      deviceType: identity.deviceType,
      platform: identity.platform,
      runtimeMode: identity.runtimeMode,
      version: identity.lastRuntimeVersion,
      capabilities: identity.runtimeCapabilities.join(','),
    })

    if (lastKnownEventId) {
      params.set('lastEventId', lastKnownEventId)
    }

    return `${BRIDGE_BASE_URL}/api/runtime/events?${params.toString()}`
  }

  const handleRuntimeEvent = (event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data) as RuntimeEventPayload
      const latencyMs = payload.timestamp ? Math.max(0, Date.now() - payload.timestamp) : null
      const payloadEventId = payload.eventId ?? payload.id ?? null
      const canResumeFromEvent =
        Boolean(payloadEventId) && payload.replayable !== false && payload.type !== 'runtimeHeartbeat' && payload.type !== 'resyncRequired'
      if (canResumeFromEvent) {
        lastKnownEventId = payloadEventId
      }
      lastSuccessfulSyncAt = new Date().toISOString()
      reconnectAttempt = 0
      onEvent(payload)
      onStatus({
        connected: true,
        connectionState: 'synced',
        reconnectAttempt,
        reconnectCount,
        lastAppliedEventId: payload.eventId ?? payload.id,
        eventsLastMinute: payload.stats?.eventsLastMinute,
        droppedEvents: payload.stats?.droppedEvents,
        replayedEvents: payload.stats?.replayedEvents,
        eventBufferSize: payload.stats?.eventBufferSize,
        latestEventId: payload.stats?.latestEventId,
        replaySupported: payload.stats?.replaySupport,
        resyncRequiredCount: payload.stats?.resyncRequiredCount,
        pollingRequestsPerMinute: payload.stats?.pollingRequestsPerMinute,
        fallbackRefreshCount: payload.stats?.fallbackRefreshCount,
        topPollingSources: payload.stats?.topPollingSources,
        actionMetrics: payload.stats?.actionMetrics,
        clientIdentity: payload.stats?.clientIdentity,
        runtimeDomains: payload.stats?.runtimeDomains,
        runtimeContinuity: payload.stats?.runtimeContinuity,
        runtimeRegistry: payload.stats?.runtimeRegistry,
        runtimeBoot: payload.stats?.runtimeBoot ?? (payload.boot as RuntimeBootStatus | undefined),
        soakMetrics: payload.stats?.soakMetrics,
        clients: payload.stats?.clients,
        lastEventAt: payload.at ?? payload.stats?.lastEventAt ?? null,
        lastSuccessfulSyncAt,
        latencyMs,
        frontendFreshness: 'fresh',
        lastKnownEventId,
        error: null,
      })
    } catch (error) {
      onStatus({
        connected: false,
        connectionState: 'stale',
        reconnectAttempt,
        reconnectCount,
        lastSuccessfulSyncAt,
        lastDisconnectedAt,
        frontendFreshness: 'stale',
        lastKnownEventId,
        error: error instanceof Error ? error.message : 'Runtime event payload kunne ikke leses',
      })
    }
  }

  const handleConnected = (event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data) as RuntimeEventPayload
      lastSuccessfulSyncAt = new Date().toISOString()
      reconnectAttempt = 0
      onStatus({
        connected: true,
        connectionState: 'synced',
        reconnectCount: payload.stats?.reconnectCount ?? reconnectCount,
        reconnectAttempt,
        eventsLastMinute: payload.stats?.eventsLastMinute,
        droppedEvents: payload.stats?.droppedEvents,
        replayedEvents: payload.stats?.replayedEvents,
        eventBufferSize: payload.stats?.eventBufferSize,
        latestEventId: payload.stats?.latestEventId,
        replaySupported: payload.stats?.replaySupport,
        resyncRequiredCount: payload.stats?.resyncRequiredCount,
        pollingRequestsPerMinute: payload.stats?.pollingRequestsPerMinute,
        fallbackRefreshCount: payload.stats?.fallbackRefreshCount,
        topPollingSources: payload.stats?.topPollingSources,
        actionMetrics: payload.stats?.actionMetrics,
        clientIdentity: payload.stats?.clientIdentity,
        runtimeDomains: payload.stats?.runtimeDomains,
        runtimeContinuity: payload.stats?.runtimeContinuity ?? payload.continuity,
        runtimeRegistry: payload.stats?.runtimeRegistry,
        runtimeBoot: payload.stats?.runtimeBoot ?? (payload.boot as RuntimeBootStatus | undefined),
        soakMetrics: payload.stats?.soakMetrics,
        clients: payload.stats?.clients,
        lastEventAt: payload.stats?.lastEventAt ?? null,
        lastSuccessfulSyncAt,
        latencyMs: null,
        frontendFreshness: 'fresh',
        lastKnownEventId,
        error: null,
      })
    } catch {
      lastSuccessfulSyncAt = new Date().toISOString()
      reconnectAttempt = 0
      onStatus({
        connected: true,
        connectionState: 'synced',
        reconnectCount,
        reconnectAttempt,
        lastSuccessfulSyncAt,
        frontendFreshness: 'fresh',
        lastKnownEventId,
        error: null,
      })
    }
  }

  const detachEventSource = () => {
    if (!eventSource) {
      return
    }

    eventTypes.forEach((eventType) => {
      eventSource?.removeEventListener(eventType, handleRuntimeEvent as EventListener)
    })
    eventSource.removeEventListener('connected', handleConnected as EventListener)
    eventSource.close()
    eventSource = null
  }

  const scheduleReconnect = () => {
    if (closed || reconnectTimer !== null) {
      return
    }

    reconnectAttempt += 1
    reconnectCount += 1
    lastDisconnectedAt = new Date().toISOString()
    const reconnectDelayMs = getReconnectDelayMs()
    onStatus({
      connected: false,
      connectionState: reconnectAttempt > 3 ? 'stale' : 'reconnecting',
      reconnectAttempt,
      reconnectCount,
      reconnectDelayMs,
      lastSuccessfulSyncAt,
      lastDisconnectedAt,
      frontendFreshness: reconnectAttempt > 3 ? 'stale' : 'fresh',
      lastKnownEventId,
      error: 'Oppdaterer tilkobling til Lynell-runtime',
    })

    detachEventSource()
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null
      connect()
    }, reconnectDelayMs)
  }

  const connect = () => {
    if (closed) {
      return
    }

    onStatus({
      connected: false,
      connectionState: reconnectAttempt > 0 ? 'reconnecting' : 'connecting',
      reconnectAttempt,
      reconnectCount,
      lastSuccessfulSyncAt,
      lastDisconnectedAt,
      frontendFreshness: lastSuccessfulSyncAt ? 'fresh' : 'stale',
      lastKnownEventId,
      error: reconnectAttempt > 0 ? 'Oppdaterer tilkobling til Lynell-runtime' : null,
    })
    eventSource = new EventSource(getRuntimeEventUrl())
    eventTypes.forEach((eventType) => {
      eventSource?.addEventListener(eventType, handleRuntimeEvent as EventListener)
    })
    eventSource.addEventListener('connected', handleConnected as EventListener)
    eventSource.onerror = scheduleReconnect
  }

  connect()

  return () => {
    closed = true
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer)
    }
    detachEventSource()
  }
}

export async function syncLiveClimateRooms(
  roomKeys?: string[],
): Promise<ClimateSyncResult> {
  if (currentSystemMode !== 'live') {
    return {
      rooms: cloneRooms(),
      updatedTemperatureRoomKeys: [],
      updatedSetpointRoomKeys: [],
      updatedHeatDemandRoomKeys: [],
      updatedRoomKeys: [],
    }
  }

  const allowedRoomKeys = roomKeys ? new Set(roomKeys) : null
  const climateScopeDiagnostics = roomsStore
    .filter((room) => !allowedRoomKeys || allowedRoomKeys.has(room.key))
    .map((room) => {
      const roomMapping = getRoomMapping(room)
      const temperatureAddress = roomMapping?.temperature?.trim() ?? ''
      const setpointFeedbackAddress = roomMapping?.setpointFeedback?.trim() ?? ''
      const climateActive = Boolean(roomMapping?.climateActive)
      const liveClimateActive = Boolean(roomMapping?.liveClimateActive)
      const eligible =
        climateActive &&
        liveClimateActive &&
        isConfiguredAddress(temperatureAddress)

      return {
        room: room.key,
        roomName: room.name,
        climateActive,
        liveClimateActive,
        temperatureAddress,
        setpointFeedbackAddress,
        eligible,
      }
    })

  console.log('[Lynell] Climate target evaluation', {
    requestedRoomKeys: roomKeys ?? null,
    diagnostics: climateScopeDiagnostics,
    basementEntry:
      climateScopeDiagnostics.find((item) => item.room === 'basement-entry') ?? null,
  })

  const targets = roomsStore
    .map((room) => {
      if (allowedRoomKeys && !allowedRoomKeys.has(room.key)) {
        return null
      }

      const roomMapping = getRoomMapping(room)
      const temperatureAddress = roomMapping?.temperature?.trim()

      if (
        !roomMapping?.climateActive ||
        !roomMapping.liveClimateActive ||
        !isConfiguredAddress(temperatureAddress)
      ) {
        return null
      }

      return {
        roomKey: room.key,
        roomName: room.name,
        temperatureAddress,
        setpointFeedbackAddress: roomMapping.setpointFeedback?.trim() ?? '',
        heatDemandAddress: roomMapping.heatDemand?.trim() ?? '',
        liveClimateActive: true,
      }
    })
    .filter(
      (
        target,
      ): target is {
        roomKey: string
        roomName: string
        temperatureAddress: string
        setpointFeedbackAddress: string
        heatDemandAddress: string
        liveClimateActive: boolean
      } => target !== null,
    )

  if (targets.length === 0) {
    console.log('[Lynell] No live climate targets resolved from current scope', {
      requestedRoomKeys: roomKeys ?? null,
      diagnostics: climateScopeDiagnostics,
    })
    return {
      rooms: cloneRooms(),
      updatedTemperatureRoomKeys: [],
      updatedSetpointRoomKeys: [],
      updatedHeatDemandRoomKeys: [],
      updatedRoomKeys: [],
    }
  }

  console.log('[Lynell] Live climate targets resolved', {
    requestedRoomKeys: roomKeys ?? null,
    selectedRoomKeys: targets.map((target) => target.roomKey),
    basementEntrySelected: targets.some((target) => target.roomKey === 'basement-entry'),
  })

  const updatedTemperatureRoomKeys: string[] = []
  const updatedSetpointRoomKeys: string[] = []
  const updatedHeatDemandRoomKeys: string[] = []
  const updatedRoomKeys = new Set<string>()
  let lastError: Error | null = null

  for (const target of targets) {
    try {
      if (target.roomKey === 'basement-entry') {
        console.log('[Lynell] Sending climate bridge request for basement-entry', {
          room: target.roomKey,
          roomName: target.roomName,
          temperatureAddress: target.temperatureAddress,
          setpointFeedbackAddress: target.setpointFeedbackAddress,
          heatDemandAddress: target.heatDemandAddress,
          liveClimateActive: target.liveClimateActive,
        })
      }

      const payload = (await postToBridge('/api/knx/climate/temperature', {
        room: target.roomKey,
        roomName: target.roomName,
        address: target.temperatureAddress,
        setpointFeedbackAddress: target.setpointFeedbackAddress,
        heatDemandAddress: target.heatDemandAddress,
        liveClimateActive: target.liveClimateActive,
      })) as { temperature?: number; setpoint?: number | null; heatDemand?: number | null }

      if (target.roomKey === 'basement-entry') {
        console.log('[Lynell] Climate bridge response for basement-entry', {
          room: target.roomKey,
          temperature: payload.temperature ?? null,
          setpoint: payload.setpoint ?? null,
          heatDemand: payload.heatDemand ?? null,
        })
      }

      const hasClimatePayload =
        typeof payload.temperature === 'number' ||
        typeof payload.setpoint === 'number' ||
        typeof payload.heatDemand === 'number'

      if (!hasClimatePayload) {
        if (target.roomKey === 'basement-entry') {
          console.log('[Lynell] Climate response missing temperature for basement-entry', {
            room: target.roomKey,
            payload,
          })
        }
        continue
      }

      roomsStore = roomsStore.map((currentRoom) =>
        currentRoom.key === target.roomKey
          ? {
              ...currentRoom,
              temperature:
                typeof payload.temperature === 'number'
                  ? payload.temperature
                  : currentRoom.temperature,
              targetTemperature:
                typeof payload.setpoint === 'number'
                  ? payload.setpoint
                  : currentRoom.targetTemperature,
              heatDemand:
                typeof payload.heatDemand === 'number'
                  ? payload.heatDemand
                  : currentRoom.heatDemand ?? null,
            }
          : currentRoom,
      )

      updatedRoomKeys.add(target.roomKey)

      if (typeof payload.temperature === 'number') {
        updatedTemperatureRoomKeys.push(target.roomKey)
      }

      if (target.roomKey === 'basement-entry') {
        const mergedRoom = roomsStore.find((currentRoom) => currentRoom.key === target.roomKey)
        console.log('[Lynell] Climate runtime merge completed for basement-entry', {
          room: target.roomKey,
          mergedTemperature: mergedRoom?.temperature ?? null,
          mergedSetpoint: mergedRoom?.targetTemperature ?? null,
          mergedHeatDemand: mergedRoom?.heatDemand ?? null,
        })
      }

      if (typeof payload.setpoint === 'number') {
        updatedSetpointRoomKeys.push(target.roomKey)
      }

      if (typeof payload.heatDemand === 'number') {
        updatedHeatDemandRoomKeys.push(target.roomKey)
      }
    } catch (error) {
      const currentRoom = roomsStore.find((room) => room.key === target.roomKey)
      console.warn('[Bridge] Climate room sync failed.', {
        room: target.roomKey,
        preservedTemperature: currentRoom?.temperature,
        preservedSetpoint: currentRoom?.targetTemperature,
        preservedHeatDemand: currentRoom?.heatDemand,
        error,
      })
      lastError =
        error instanceof Error
          ? error
          : new Error('Live klima fra KNX er utilgjengelig')
    }
  }

  if (updatedTemperatureRoomKeys.length === 0 && lastError) {
    throw lastError
  }

  return {
    rooms: cloneRooms(),
    updatedTemperatureRoomKeys,
    updatedSetpointRoomKeys,
    updatedHeatDemandRoomKeys,
    updatedRoomKeys: Array.from(updatedRoomKeys),
  }
}
