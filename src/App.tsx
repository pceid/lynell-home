import { lazy, Suspense, type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  applyKnxConfig,
  applyRoomsConfig,
  castPause,
  castPlay,
  getBridgeApiDiagnostics,
  castSetVolume,
  castStop,
  getBridgeBaseUrl,
  getBridgeHealth,
  getServerSystemConfig,
  getCastPlayback,
  getCastStatus,
  getIntegrationProviders,
  getKnxDiagnostics,
  getKnxMonitorSnapshot,
  getKnxState,
  pollKnxRoomValues,
  getMqttStatus,
  getServerRuntimeAggregates,
  getServerRuntimeHistory,
  getServerRuntimeInsights,
  getServerRuntimeState,
  getVacuumStatus,
  getRooms,
  confirmDeltacoTuyaMapping,
  getDeltacoTuyaProtocolResearch,
  sendVacuumCommand,
  setSystemMode,
  setBrightness,
  setClimateModeSetpoints,
  setLight,
  setMode,
  setSetpoint,
  saveServerSystemConfig,
  logNivaConversation,
  runKnxShadingAction,
  testRuntimeScene,
  summarizeKnxRuntimeMapping,
  syncBridgeRuntimeConfig,
  subscribeToRuntimeEventStream,
  registerRuntimeClient,
  subscribeToClimateFeedbackStream,
  subscribeToLightFeedbackStream,
  syncLiveClimateRooms,
  syncLightFeedbackForRooms,
  type BridgeHealthSnapshot,
  type BridgeCastStatus,
  type BridgeCastPlayback,
  type BridgeCastDevice,
  type IntegrationManagerSnapshot,
  type BridgeMqttStatus,
  type ServerRuntimeHistory,
  type ServerRuntimeAggregates,
  type ServerRuntimeInsight,
  type ServerRuntimeInsights,
  type ServerRuntimeState,
  type BridgeVacuumStatus,
  type BridgeRuntimeConfigPayloadSummary,
  type AutoPollQuietSignalsConfig,
  type ServerSystemConfigDiagnostics,
  type KnxDiagnosticsSnapshot,
  type KnxMonitorDiagnostics,
  type KnxMonitorEvent,
  type KnxShadingAction,
  type KnxRoomPollResult,
  type RuntimeEventPayload,
  type RuntimeActionMetrics,
  type RuntimeClientSnapshot,
  type RuntimeDomainSnapshot,
  type RuntimeContinuityStatus,
  type RuntimeRegistrySnapshot,
  type RuntimeBootStatus,
  type KnxStateSnapshot,
  discoverCastDevices,
  observeDeltacoTuyaIdentifySession,
  startDeltacoTuyaIdentifySession,
  type DeltacoTuyaConfirmedMapping,
  type DeltacoTuyaProtocolResearchSnapshot,
  type DeltacoTuyaIdentifySnapshot,
  type SystemMode,
  getLocalMediaLibrary as fetchLocalMediaLibrary,
  updateIntegrationProviderLifecycle,
  approveRuntimeAction,
  denyRuntimeAction,
  updateTemperatures,
} from './api/homeApi'
import lynellLogo from './assets/lynell-st.png'
import { getWeather, type WeatherSnapshot } from './api/weatherApi'
import { NivaCore } from './components/NivaCore'
import { getNivaIntent } from './niva/nivaIntent'
import {
  getNivaQuickPrompts,
  getNivaResponseForIntent,
  getNivaVisualState,
} from './niva/nivaResponses'
import { getNivaDiagnosticInsight } from './niva/nivaDiagnostics'
import {
  ambientRuntimeCopy,
  formatAmbientDeviceState,
  formatAmbientMediaState,
  getAmbientRuntimeModeDescription,
} from './niva/ambientLanguage'
import { buildNivaHouseSnapshot, type NivaHouseSnapshot } from './niva/nivaHouseSnapshot'
import { getNivaWeatherAwareness } from './niva/nivaWeather'
import {
  findMediaDeviceForText,
  getMediaDeviceAvailabilityLabel,
  getMediaDeviceLocationLabel,
  getMediaDeviceTypeLabel,
  initialMediaDevices,
  mergeDiscoveredCastDevices,
  setActiveMediaDevice,
  setMediaDeviceVolume,
} from './media/mediaDevices'
import {
  formatTrackDuration,
  getCalmTrack,
  getMockMediaLibrary,
  getTrackById,
  getTrackByMood,
} from './media/mediaLibrary'
import {
  createInitialMediaPlayerState,
  pauseMediaPlayback,
  playMedia,
  playMediaTrack,
  setMediaOutputDevice,
  setMediaVolume,
  skipMediaTrack,
  tickMediaProgress,
  toggleMediaPlayback,
} from './media/mediaPlayer'
import type { MediaDevice, MediaLibrarySource, MediaPlayerState, MediaTrack } from './media/mediaTypes'
import {
  dockMockVacuum,
  mockVacuumDevices,
  pauseMockVacuumCleaning,
  startMockVacuumCleaning,
  tickMockVacuum,
} from './integrations/vacuum/vacuumMock'
import type { VacuumDevice } from './integrations/vacuum/vacuumTypes'
import {
  getEdgeFoundationStatus,
  getEdgeHealthSummary,
} from './integrations/edge/edgeFoundation'
import {
  buildEdgeLifecycleDevices,
  formatDeviceCategory,
  getEdgeDeviceHealthSummary,
} from './integrations/edge/deviceLifecycle'
import {
  buildSensorIntelligence,
} from './integrations/edge/sensorIntelligence'
import {
  buildHouseSpatialMap,
  buildSpatialAwareness,
  getRoomSpatialContext,
} from './spatial/houseSpatial'
import {
  buildHouseMemoryDailySnapshot,
  buildHouseMemoryInsight,
  loadHouseMemoryState,
  persistHouseMemoryState,
  upsertHouseMemorySnapshot,
  type HouseMemoryState,
} from './memory/houseMemory'
import { zigbeeDeviceConcepts } from './integrations/zigbee/zigbeeDevices'
import {
  buildZigbee2MqttReadiness,
  getZigbeeRuntimeState,
} from './integrations/zigbee/zigbee2mqttReadiness'
import {
  buildMqttRuntimeFoundation,
  formatMqttConnectionState,
  getMqttRuntimeIntegrationState,
} from './integrations/mqtt/mqttRuntimeFoundation'
import {
  getCastDiscoveryTruthStatus,
  getCastPlaybackTruthStatus,
  getMediaDeviceTruthStatus,
  getMqttTruthStatus,
  getVacuumTruthStatus,
} from './integrations/truth/integrationTruth'
import {
  findIntegrationSetupItem,
  getIntegrationReadinessRank,
  getIntegrationSetupSummary,
  integrationSetupItems,
} from './integrations/setup/integrationSetup'
import {
  findHardwareItem,
  formatHardwareHealth,
  formatHardwareType,
  getHardwareHealthSummary,
  hardwareInventoryItems,
} from './integrations/hardware/hardwareInventory'
import {
  buildHybridRuntimeStates,
  findRuntimeState,
  formatIntegrationRuntimeStatus,
  formatRuntimeConnectionState,
  formatRuntimeOrigin,
  getHybridRuntimeSummary,
  getRuntimeContractSummary,
} from './integrations/runtime/integrationRuntimeState'
import { buildRuntimeDeviceContracts } from './integrations/runtime/runtimeContractBuilders'
import {
  buildNivaRoomReport,
  type RoomReport,
} from './niva/nivaRoomReport'
import {
  createInitialNivaSessionMemory,
  isNivaContextualFollowUp,
  updateNivaSessionMemory,
  type NivaSessionMemory,
} from './niva/nivaConversationMemory'
import { buildNivaPresenceComfortSummary } from './niva/nivaPresenceComfort'
import {
  createNivaIntentGap,
  getNivaIntentGapCategory,
  getNivaIntentGapNote,
  type NivaIntentGap,
  type NivaIntentGapCategory,
} from './niva/nivaIntentGaps'
import type {
  NivaInsight,
  NivaMessage,
  NivaProposedAction,
  NivaWeatherAwareness,
} from './niva/nivaTypes'
import {
  getHeatDemandBars,
  getHeatDemandText,
  getRoomConfiguredVolume,
  getRoomHeatNeedAnalysis,
} from './runtime/heatDemandAnalysis'
import {
  appendRuntimeHistoryPoints,
  createRuntimeSnapshotHistoryPoints,
  classifyRuntimeHistorySource,
  getRuntimeHistorySourceDistribution,
  getRuntimeHistoryPoints,
  getRuntimeHistoryValues,
  isLiveRuntimeHistoryPoint,
  RuntimeHistoryField,
  RuntimeHistoryPoint,
} from './runtime/runtimeHistory'
import { applyRuntimeEvent } from './runtime/runtimeEventReducer'
import {
  buildLightZoneHistorySeries,
  buildRoomBrightnessAveragePoints,
} from './runtime/lightHistory'
import { getSignalUpdatePolicy } from './runtime/signalUpdatePolicy'
import { getRoomTemperatureHistoryInsight as getRoomTemperatureHistoryInsightFromHistory } from './runtime/roomAnalytics'
import { buildDailyRhythmInsight } from './runtime/dailyRhythm'
import { buildComfortEnergyInsight } from './runtime/comfortEnergy'
import {
  buildEnergyIntelligence,
  getNivaEnergyExplanation,
  type EnergyIntelligence,
  type EnergyObservation,
} from './runtime/energyIntelligence'
import {
  getLynellAudioManifestSummary,
  lynellAudioManifestById,
} from './audio/audioManifest'
import {
  createLynellAudioPlayer,
  type LynellAudioPlaybackStatus,
  type LynellAudioSettings,
} from './audio/audioPlayer'
import {
  buildNivaObservationalIntelligence,
  type NivaObservation,
} from './runtime/nivaObservationalIntelligence'
import { buildAdaptiveHomeAwareness } from './runtime/adaptiveAwareness'
import { buildOccupancyFlowInsight } from './runtime/occupancyFlow'
import { buildAmbientMoodInsight } from './runtime/ambientMood'
import { buildPrioritizedAwarenessSummary } from './runtime/awarenessPriority'
import {
  buildLynellRecommendations,
  type LynellRecommendation,
} from './runtime/recommendations'
import {
  buildRoomCapabilitySummaries,
  buildUiCapabilitySummary,
  createInitialUiCapabilityConfig,
  getUiCapabilityById,
  isRoomCapabilityVisible,
  isUiCapabilityVisible,
  normalizeUiCapabilityConfig,
  resolveUiCapabilities,
  type HclFoundationConfig,
  type RoomCapabilityId,
  type UiCapabilityConfig,
  type UiCapabilityId,
  type UiCapabilityOverride,
} from './runtime/uiCapabilities'
import { buildHousePresenceState } from './presence/presenceEngine'
import type { HousePresence, HousePresenceState } from './presence/presenceTypes'
import {
  buildKnxMappingFromSystemConfig,
  buildRoomSelectOptions,
  buildRoomsFromSystemConfig,
  type BookingConfig,
  type BookingResourceConfig,
  type BookingStatus,
  type CalendarConfig,
  type CalendarEventConfig,
  type BacnetPointConfig,
  type CameraDeviceConfig,
  type CameraFoundationConfig,
  type CameraRuntimeState,
  type CameraType,
  createInitialSystemConfig,
  ensureDefaultScenes,
  type FloorConfig,
  type HousingConfig,
  type KnxDataType,
  type KnxAccessMode,
  type FloorHeatingType,
  type HeatEmitterType,
  type MediaConfig,
  type MediaGroupConfidence,
  type MediaGroupConfig,
  type MediaGroupSpeakerConfig,
  type MediaGroupState,
  type SystemAudioConfig,
  type SystemAudioCategory,
  type IdleScreenConfig,
  type MqttConfig,
  type NetworkConfig,
  type RuntimeConfig,
  type SecurityConfig,
  type SceneConfig,
  type SceneLightingTargetConfig,
  type SceneClimateTargetConfig,
  type ShadingType,
  type SystemConfig,
  type SystemRoomConfig,
  type SystemSensorConfig,
  type SystemShadingConfig,
  type SystemTechnicalConfig,
  type SystemWeatherStationConfig,
  type SystemIntegrationConfig,
} from './config/systemConfig'
import {
  formatCameraTrustStatus,
  formatCameraType,
  formatRecorderTarget,
  getCameraConfiguredInputs,
  getCameraTrustStatus,
  getMediaGroupStatus,
  summarizeCameraFoundation,
  summarizeMediaGroups,
} from './runtime/cameraMediaFoundation'
import { getTranslations, normalizeAppLanguage, type AppLanguage } from './i18n'
import type { KnxRoomMapping } from './knx/knxMapping'
import { findMqttTopicsForKnxAddress, getMqttBaseTopic } from './mqtt/mqttMapping'
import { RoomCard } from './components/RoomCard'
import { Sparkline } from './components/Sparkline'
import type { TrendHistoryRange } from './components/trend/TrendHistoryView'
import type { Room, RoomMode } from './data/rooms'

const ManagerPanel = lazy(() =>
  import('./components/ManagerPanel').then((module) => ({ default: module.ManagerPanel })),
)
const RoomManagerPanel = lazy(() =>
  import('./components/RoomManagerPanel').then((module) => ({ default: module.RoomManagerPanel })),
)
const TrendHistoryView = lazy(() =>
  import('./components/trend/TrendHistoryView').then((module) => ({
    default: module.TrendHistoryView,
  })),
)

const simulationIntervalMs = 2500
const feedbackStartupDelayMs = 8000
const climateStartupDelayMs = 12000
const baseLightFeedbackIntervalMs = 45000
const minimumClimateFeedbackIntervalMs = 20000
const lightFeedbackRoomsPerRound = 1
const climateRoomsPerRound = 1
const targetTolerance = 0.5
const defaultComfortSetpoint = 22
const defaultNightSetpoint = 18
const nivaWindSpeedAlertThresholdMs = 10
const nivaRainAlertThresholdMm = 0.1
const nivaFrostAlertThresholdC = 0

type MainView =
  | 'home'
  | 'rooms'
  | 'trend-history'
  | 'lights'
  | 'climate'
  | 'camera'
  | 'shading'
  | 'media'
  | 'assistants'
  | 'calendar'
  | 'calendar-manager'
  | 'manager'
  | 'room-manager'
type ScopedView = string

function parseTemperatureValue(value: number | string) {
  if (typeof value === 'number') {
    return value
  }

  return Number(value.replace(',', '.'))
}

function roundToHalf(value: number) {
  return Math.round(value * 2) / 2
}

function hasConfiguredWriteAddress(value: string | undefined) {
  const trimmedValue = value?.trim()

  return Boolean(trimmedValue) && !trimmedValue?.startsWith('placeholder/')
}

type DiagnosticPulse = {
  label: string
  detail: string
  at: string
  address?: string | null
  dataType?: string | null
  interpretationRule?: string | null
  mappingVariant?: string | null
  rawValue?: string | number | boolean | null
  mappedValue?: string | number | boolean | null
}

type BridgeHealthState = {
  reachable: boolean | null
  checkedAt: string | null
  error: string | null
  snapshot: BridgeHealthSnapshot | null
}

type BridgeMqttState = {
  checkedAt: string | null
  error: string | null
  snapshot: BridgeMqttStatus | null
}

type BridgeCastState = {
  checkedAt: string | null
  error: string | null
  snapshot: BridgeCastStatus | null
  playback: BridgeCastPlayback | null
}

type BridgeVacuumState = {
  checkedAt: string | null
  error: string | null
  snapshot: BridgeVacuumStatus | null
}

type KnxDiagnosticsBridgeState = {
  checkedAt: string | null
  error: string | null
  snapshot: KnxDiagnosticsSnapshot | null
}

type KnxStateBridgeState = {
  checkedAt: string | null
  error: string | null
  snapshot: KnxStateSnapshot | null
}

type KnxMonitorWindowMode = 'closed' | 'open' | 'minimized' | 'fullscreen'

type KnxMonitorFilters = {
  search: string
  roomKey: string
  direction: string
  source: string
  signalType: string
  onlyWrites: boolean
  onlyFeedback: boolean
  onlyStale: boolean
}

type RoomPollUiState = {
  loading: boolean
  lastPollAt: string | null
  error: string | null
  result: KnxRoomPollResult | null
}

type ServerRuntimeBridgeState = {
  checkedAt: string | null
  error: string | null
  snapshot: ServerRuntimeState | null
  history: ServerRuntimeHistory | null
  aggregates: ServerRuntimeAggregates | null
  insights: ServerRuntimeInsights | null
}

type RuntimeEventStreamUiState = {
  connected: boolean
  connectionState: 'connecting' | 'reconnecting' | 'synced' | 'stale' | 'offline'
  reconnectAttempt: number
  reconnectDelayMs: number | null
  reconnectCount: number
  eventsLastMinute: number
  pollingRequestsPerMinute: number
  fallbackRefreshCount: number
  reducerApplyCount: number
  replayedEvents: number
  droppedEvents: number
  staleTransitions: number
  eventBufferSize: number
  latestEventId: string | null
  lastAppliedEventId: string | null
  replaySupported: boolean
  resyncRequiredCount: number
  reducerStatus: 'applied' | 'ignored' | 'resyncRequired' | 'standby'
  fallbackPollingStatus: string
  runtimeEventHealthy: boolean
  degradedEventStream: boolean
  pollingFallbackMode: 'steady' | 'relaxed' | 'elevated'
  averageEventLatency: number | null
  maxEventLatency: number | null
  averageReducerTime: number | null
  averageRuntimeRefreshTime: number | null
  topPollingSources: Array<{ path: string; count: number }>
  actionMetrics: RuntimeActionMetrics | null
  clientIdentity: RuntimeClientSnapshot | null
  runtimeDomains: RuntimeDomainSnapshot | null
  runtimeContinuity: RuntimeContinuityStatus | null
  runtimeRegistry: RuntimeRegistrySnapshot | null
  runtimeBoot: RuntimeBootStatus | null
  soakMetrics: Record<string, unknown> | null
  clients: Array<{
    clientId: string
    sessionId: string
    connectedAt: string
    lastEventId: string | null
    sentEvents: number
    droppedEvents: number
    reconnectCount: number
    lastSentAt: string | null
  }>
  lastEventChain: string[]
  lastEventAt: string | null
  lastSuccessfulSyncAt: string | null
  lastDisconnectedAt: string | null
  frontendFreshness: 'fresh' | 'stale' | 'offline'
  staleAfterMs: number
  offlineAfterMs: number
  frontendStateAgeMs: number | null
  runtimeDriftSuspected: boolean
  staleStateCount: number
  offlineStateCount: number
  reconnectHistory: Array<{
    at: string
    state: 'connecting' | 'reconnecting' | 'synced' | 'stale' | 'offline'
    attempt: number
    delayMs: number | null
    lastEventId: string | null
  }>
  latencyMs: number | null
  error: string | null
}

type IntegrationManagerBridgeState = {
  checkedAt: string | null
  error: string | null
  snapshot: IntegrationManagerSnapshot | null
}

type DeltacoIdentifyBridgeState = {
  checkedAt: string | null
  error: string | null
  snapshot: DeltacoTuyaIdentifySnapshot | null
}

type DeltacoProtocolResearchBridgeState = {
  checkedAt: string | null
  error: string | null
  snapshot: DeltacoTuyaProtocolResearchSnapshot | null
}

type TestLogEntry = {
  id: string
  at: string
  category: string
  text: string
}

type CalendarListItem = {
  id: string
  type: 'event' | 'booking'
  date: string
  startTime: string
  endTime: string
  title: string
  person: string
  place: string
  note: string
  resourceName?: string
  resourceContext?: string
  bookingStatus?: BookingStatus
}

type CalendarActionLifecycleState =
  | 'draft'
  | 'pendingConfirmation'
  | 'queued'
  | 'creating'
  | 'created'
  | 'failed'
  | 'cancelled'
  | 'stale'

type CalendarActionTrustRecord = {
  actionId: string
  fingerprint: string
  summary: string
  state: CalendarActionLifecycleState
  confidence: 'high' | 'medium' | 'low'
  events: CalendarEventConfig[]
  proposedAt: string
  confirmedAt: string | null
  completedAt: string | null
  failedAt: string | null
  cancelledAt: string | null
  staleAt: string | null
  error: string | null
  duplicatePrevented: boolean
  duplicateOf: string | null
  source: 'niva'
}

const calendarPendingTimeoutMs = 15 * 60 * 1000
const calendarDuplicateWindowMs = 30 * 60 * 1000

function getCalendarActionEvents(action: NivaProposedAction) {
  return action.kind === 'calendar' && action.events?.length ? action.events : action.kind === 'calendar' ? [action.event] : []
}

function createCalendarActionFingerprint(events: CalendarEventConfig[]) {
  return events
    .map((event) =>
      [
        event.title,
        event.date,
        event.startTime,
        event.endTime,
        event.place,
        event.person,
      ]
        .map((value) => normalizeNivaDisplayText(String(value ?? '')))
        .join('|'),
    )
    .sort()
    .join('::')
}

function summarizeCalendarEvents(events: CalendarEventConfig[]) {
  if (events.length === 0) {
    return 'Ingen kalenderaktivitet'
  }

  if (events.length === 1) {
    const event = events[0]
    return `${event.title} · ${event.date} kl. ${event.startTime}`
  }

  return `${events.length} kalenderaktiviteter: ${events
    .map((event) => `${event.title} ${event.date}`)
    .join(' · ')}`
}

function getCalendarActionStateLabel(state: CalendarActionLifecycleState) {
  switch (state) {
    case 'pendingConfirmation':
      return 'Venter på bekreftelse'
    case 'queued':
      return 'I kø'
    case 'creating':
      return 'Oppretter'
    case 'created':
      return 'Opprettet'
    case 'failed':
      return 'Feilet'
    case 'cancelled':
      return 'Avbrutt'
    case 'stale':
      return 'Utløpt'
    case 'draft':
    default:
      return 'Forslag'
  }
}

function getWeatherLabel(condition: string) {
  const normalized = condition.toLowerCase()

  if (normalized.includes('clear')) {
    return { label: 'Klart', symbol: '☀' }
  }

  if (normalized.includes('partly')) {
    return { label: 'Delvis skyet', symbol: '☁' }
  }

  if (normalized.includes('cloud')) {
    return { label: 'Skyet', symbol: '☁' }
  }

  if (normalized.includes('rain')) {
    return { label: 'Regn', symbol: '☂' }
  }

  if (normalized.includes('snow')) {
    return { label: 'Snø', symbol: '❄' }
  }

  if (normalized.includes('fog')) {
    return { label: 'Tåke', symbol: '〰' }
  }

  return { label: condition, symbol: '○' }
}

function mergeRoomPresentation(nextRooms: Room[], currentRooms: Room[]) {
  const mergedRooms = nextRooms.map((nextRoom) => {
    const currentRoom = currentRooms.find((room) => room.id === nextRoom.id)

    if (!currentRoom) {
      return nextRoom
    }

    const mergedZones = nextRoom.zones.map((nextZone) => {
      const currentZone = currentRoom.zones.find((zone) => zone.id === nextZone.id)

      if (!currentZone) {
        return nextZone
      }

      return {
        ...nextZone,
        name: currentZone.name,
        dimmable: currentZone.dimmable,
      }
    })
    const extraZones = currentRoom.zones.filter(
      (zone) => !nextRoom.zones.some((nextZone) => nextZone.id === zone.id),
    )

    return {
      ...nextRoom,
      name: currentRoom.name,
      configured: currentRoom.configured,
      group: currentRoom.group,
      zones: [...mergedZones, ...extraZones],
    }
  })

  const extraRooms = currentRooms.filter(
    (room) => !nextRooms.some((nextRoom) => nextRoom.id === room.id),
  )

  return [...mergedRooms, ...extraRooms]
}

type ExportedManagerConfig = {
  version: 2
  system: SystemConfig
}

const systemConfigStorageKey = 'lynell.systemConfig.v1'
const systemConfigSavedAtStorageKey = 'lynell.systemConfig.v1.savedAt'
const pinSessionStorageKey = 'lynell.pinUnlocked.session'
const pinPersistentStorageKey = 'lynell.pinUnlocked.local'
const layoutModeStorageKey = 'lynell.layoutMode.v1'
const themeModeStorageKey = 'lynell.themeMode'
const uiCapabilityStorageKey = 'lynell.uiCapabilities.v1'
const runtimePersistenceStorageKey = 'lynell.runtimePersistence.v1'
const houseMemoryStorageKey = 'lynell.houseMemory.v1'
const recommendationDismissStorageKey = 'lynell.recommendations.dismissed.v1'
const runtimeHistoryMaxPointsPerSeries = 160
const runtimeHistoryMaxTotalPoints = 2200
const runtimeHistoryMaxAgeMs = 7 * 24 * 60 * 60 * 1000
const runtimePersistenceMaxBytes = 1_500_000
const autoThemeFallbackLightStartHour = 7
const autoThemeFallbackLightEndHour = 19
const defaultAutoPollQuietSignalsConfig: AutoPollQuietSignalsConfig = {
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

function normalizeAutoPollQuietSignalsClientConfig(
  value?: Partial<AutoPollQuietSignalsConfig> | null,
): AutoPollQuietSignalsConfig {
  const normalizeList = (list: unknown) =>
    Array.isArray(list)
      ? Array.from(new Set(list.map((item) => String(item ?? '').trim()).filter(Boolean)))
      : []
  const allowedModes: Array<NonNullable<AutoPollQuietSignalsConfig['mode']>> = [
    'allEligible',
    'selectedSignals',
    'selectedRooms',
    'selectedGroupAddresses',
  ]
  const mode = allowedModes.includes(value?.mode ?? 'allEligible')
    ? value?.mode ?? 'allEligible'
    : 'allEligible'

  return {
    ...defaultAutoPollQuietSignalsConfig,
    ...(value ?? {}),
    enabled: Boolean(value?.enabled ?? defaultAutoPollQuietSignalsConfig.enabled),
    mode,
    quietThresholdMinutes: Number(value?.quietThresholdMinutes ?? 60),
    globalMaxPollsPerWindow: Number(value?.globalMaxPollsPerWindow ?? 4),
    pollWindowMinutes: Number(value?.pollWindowMinutes ?? 5),
    perRoomCooldownMinutes: Number(value?.perRoomCooldownMinutes ?? 60),
    perSignalCooldownMinutes: Number(value?.perSignalCooldownMinutes ?? 60),
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

type ShadingMappingStatus = 'ready' | 'partial' | 'missingMapping' | 'disabled'

function hasConfiguredText(value?: string | null) {
  return String(value ?? '').trim().length > 0
}

function getShadingMissingFields(item: SystemShadingConfig) {
  const missing: string[] = []

  if (!hasConfiguredText(item.up) && !hasConfiguredText(item.down)) {
    missing.push('opp/ned')
  }
  if (!hasConfiguredText(item.stop)) {
    missing.push('stopp')
  }
  if (!hasConfiguredText(item.position)) {
    missing.push('posisjon')
  }

  return missing
}

function getShadingActionAvailability(item: SystemShadingConfig) {
  const hasMove = hasConfiguredText(item.up) || hasConfiguredText(item.down)
  const hasStop = hasConfiguredText(item.stop)
  const hasPosition = hasConfiguredText(item.position)
  const hasFeedback = hasConfiguredText(item.feedbackPosition)

  return {
    moveUp: hasMove,
    moveDown: hasMove,
    stop: hasStop,
    setPosition: hasPosition,
    feedbackPosition: hasFeedback,
    availableCount: [hasMove, hasStop, hasPosition].filter(Boolean).length,
    expectedDpts: {
      upDown: item.upDownDpt || '1.008',
      stop: item.stopDpt || '1.007',
      position: item.positionDpt || '5.001',
      feedbackPosition: item.feedbackPositionDpt || '5.001',
    },
  }
}

function getShadingConfiguredAddresses(item: SystemShadingConfig) {
  const addresses: Array<[string, string | undefined]> = [
    ['upDown', item.up || item.down],
    ['up', item.up],
    ['down', item.down],
    ['stop', item.stop],
    ['position', item.position],
    ['feedbackPosition', item.feedbackPosition],
    ['slatAngle', item.angle],
    ['windAlarm', item.windAlarm],
    ['sunAuto', item.sunAuto],
  ]

  return addresses
    .filter(([, value]) => hasConfiguredText(value))
    .map(([field, groupAddress]) => ({ field, groupAddress: String(groupAddress).trim() }))
}

function getShadingMappingStatus(item: SystemShadingConfig): ShadingMappingStatus {
  if (!item.active) {
    return 'disabled'
  }

  const availability = getShadingActionAvailability(item)

  if (availability.availableCount === 0) {
    return 'missingMapping'
  }

  return availability.availableCount >= 3 ? 'ready' : 'partial'
}

function formatShadingStatusLabel(status: ShadingMappingStatus) {
  if (status === 'ready') {
    return 'Klar'
  }
  if (status === 'missingMapping') {
    return 'Mangler mapping'
  }
  if (status === 'partial') {
    return 'Delvis konfigurert'
  }
  if (status === 'disabled') {
    return 'Deaktivert'
  }

  return 'Klar'
}

type AutoPollTargetPreview = {
  signalId: string
  roomKey: string
  roomName: string
  field: string
  groupAddress: string
  updateMode: 'cyclic' | 'onChange' | 'manualPoll' | 'unknown'
  staleRelevant: boolean
  eligible: boolean
  selected: boolean
  reason: string
}

type ShadingCommandUiStatus = 'idle' | 'pending' | 'sentUnconfirmed' | 'confirmed' | 'failed'

type ShadingCommandUiEntry = {
  shadingId: string
  action: KnxShadingAction
  value: number | null
  status: ShadingCommandUiStatus
  startedAt: number
  timeoutAt: number
  lastMessage: string
  groupAddress: string | null
  feedbackGroupAddress: string | null
  confirmedAt: string | null
  feedbackValue: number | null
}

type OptimisticLightingStatus = 'pendingFeedback' | 'delayedFeedback'
type OptimisticLightingSource = 'manualLight' | 'manualBrightness' | 'scene'

type OptimisticLightingEntry = {
  key: string
  roomId: number
  roomKey: string
  roomName: string
  zoneId: string
  zoneKey: string
  zoneName: string
  expectedLightsOn: boolean
  expectedBrightness: number
  previousLightsOn: boolean
  previousBrightness: number
  source: OptimisticLightingSource
  startedAt: number
  timeoutAt: number
  status: OptimisticLightingStatus
  writeGroupAddress: string | null
  feedbackGroupAddress: string | null
  lastMessage: string
}

type OptimisticLightingMetrics = {
  createdCount: number
  confirmedCount: number
  rollbackCount: number
  failedWriteCount: number
  delayedFeedbackCount: number
  totalFeedbackLatencyMs: number
  feedbackLatencySamples: number
  latestDelayedSignals: Array<{
    key: string
    roomName: string
    zoneName: string
    expectedBrightness: number
    ageMs: number
    at: string
  }>
  latestRollbackSignals: Array<{
    key: string
    roomName: string
    zoneName: string
    reason: string
    at: string
  }>
}

const optimisticLightingTimeoutMs = 2500

function getOptimisticLightingKey(roomKey: string, zoneKey: string) {
  return `${roomKey}:${zoneKey}`
}

function createInitialOptimisticLightingMetrics(): OptimisticLightingMetrics {
  return {
    createdCount: 0,
    confirmedCount: 0,
    rollbackCount: 0,
    failedWriteCount: 0,
    delayedFeedbackCount: 0,
    totalFeedbackLatencyMs: 0,
    feedbackLatencySamples: 0,
    latestDelayedSignals: [],
    latestRollbackSignals: [],
  }
}

function splitConfigList(value?: string[] | null) {
  return new Set((value ?? []).map((item) => item.trim()).filter(Boolean))
}

function buildAutoPollTargetDiagnostics(
  rooms: SystemRoomConfig[],
  config: AutoPollQuietSignalsConfig,
) {
  const mode = config.mode ?? 'allEligible'
  const selectedSignals = splitConfigList(config.selectedSignals)
  const selectedRooms = splitConfigList(config.selectedRooms)
  const selectedGroupAddresses = splitConfigList(config.selectedGroupAddresses)
  const excludedSignals = splitConfigList(config.excludedSignals)
  const excludedRooms = splitConfigList(config.excludedRooms)
  const excludedGroupAddresses = splitConfigList(config.excludedGroupAddresses)
  const candidates: AutoPollTargetPreview[] = []

  for (const room of rooms) {
    const roomName = room.name || room.key
    const climate = room.climate

    if (climate?.active) {
      const climateSignals: Array<{
        field: string
        groupAddress: string
        updateMode: AutoPollTargetPreview['updateMode']
        staleRelevant: boolean
      }> = [
        {
          field: 'temperature',
          groupAddress: climate.temperature,
          updateMode: 'cyclic',
          staleRelevant: true,
        },
        {
          field: 'setpointFeedback',
          groupAddress: climate.setpointFeedback || climate.setpoint,
          updateMode: 'onChange',
          staleRelevant: false,
        },
        {
          field: 'heatDemand',
          groupAddress: climate.heatDemand,
          updateMode: 'cyclic',
          staleRelevant: true,
        },
      ]

      for (const signal of climateSignals) {
        if (!hasConfiguredText(signal.groupAddress)) {
          continue
        }

        const signalId = `${room.key}:${signal.field}:${signal.groupAddress}`
        const explicitlySelected =
          selectedSignals.has(signalId) || selectedGroupAddresses.has(signal.groupAddress)
        const staleEligible = signal.staleRelevant || !config.staleRelevantOnly
        const onChangeSuppressed =
          signal.updateMode === 'onChange' && config.skipOnChangeOnly && !explicitlySelected
        const eligible = staleEligible && !onChangeSuppressed
        let selected =
          mode === 'allEligible'
            ? eligible
            : mode === 'selectedRooms'
              ? selectedRooms.has(room.key) && (eligible || explicitlySelected)
              : mode === 'selectedGroupAddresses'
                ? selectedGroupAddresses.has(signal.groupAddress)
                : selectedSignals.has(signalId)

        if (
          excludedSignals.has(signalId) ||
          excludedRooms.has(room.key) ||
          excludedGroupAddresses.has(signal.groupAddress)
        ) {
          selected = false
        }

        candidates.push({
          signalId,
          roomKey: room.key,
          roomName,
          field: signal.field,
          groupAddress: signal.groupAddress,
          updateMode: signal.updateMode,
          staleRelevant: signal.staleRelevant,
          eligible,
          selected,
          reason: eligible
            ? 'cyclic/stale-relevant'
            : onChangeSuppressed
              ? 'onChange signal · polles kun hvis eksplisitt valgt'
              : 'ikke stale-relevant',
        })
      }
    }
  }

  return {
    enabled: config.enabled,
    mode,
    eligibleCount: candidates.filter((target) => target.eligible).length,
    selectedCount: candidates.filter((target) => target.selected).length,
    ineligibleCount: candidates.filter((target) => !target.eligible).length,
    preview: candidates,
    nextAllowedPoll: null,
    lastAutoPoll: null,
    skippedReason: config.enabled ? null : 'disabled',
  }
}

type ThemeMode = 'dark' | 'light' | 'auto'
type ResolvedTheme = 'dark' | 'light'

function normalizeThemeMode(value: string | null): ThemeMode {
  return value === 'dark' || value === 'light' || value === 'auto' ? value : 'auto'
}

function getInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'auto'
  }

  return normalizeThemeMode(window.localStorage.getItem(themeModeStorageKey))
}

function resolveAutoTheme(now = new Date()): ResolvedTheme {
  const hour = now.getHours()

  return hour >= autoThemeFallbackLightStartHour && hour < autoThemeFallbackLightEndHour
    ? 'light'
    : 'dark'
}

function resolveThemeMode(mode: ThemeMode, now = new Date()): ResolvedTheme {
  return mode === 'auto' ? resolveAutoTheme(now) : mode
}

function formatThemeModeStatus(mode: ThemeMode, resolvedTheme: ResolvedTheme) {
  if (mode === 'auto') {
    return `Auto · ${resolvedTheme === 'light' ? 'Light nå' : 'Dark nå'}`
  }

  return mode === 'light' ? 'Light mode' : 'Dark mode'
}

function buildLynellAudioSettings(config: SystemAudioConfig): LynellAudioSettings {
  return {
    enabled: config.enabled,
    masterVolume: Math.max(0, Math.min(1, config.masterVolume)),
    categories: {
      feedback: config.categories.feedback,
      information: config.categories.information,
      alert: config.categories.alert,
      critical: config.categories.critical,
      ambient: config.categories.ambient,
      voice: config.categories.voice,
      system: config.categories.system,
    },
  }
}

function loadUiCapabilityConfig(): UiCapabilityConfig {
  if (typeof window === 'undefined') {
    return createInitialUiCapabilityConfig()
  }

  try {
    const raw = window.localStorage.getItem(uiCapabilityStorageKey)

    return normalizeUiCapabilityConfig(raw ? JSON.parse(raw) : null)
  } catch (error) {
    console.warn('[Lynell] Kunne ikke lese UI capability config. Bruker default.', error)

    return createInitialUiCapabilityConfig()
  }
}

function persistUiCapabilityConfig(config: UiCapabilityConfig) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(uiCapabilityStorageKey, JSON.stringify(config))
}

function normalizeSystemConfig(system: Partial<SystemConfig>): SystemConfig {
  const baseConfig = createInitialSystemConfig()

  return {
    ...baseConfig,
    ...system,
    language: normalizeAppLanguage(system.language ?? baseConfig.language),
    housing: {
      ...baseConfig.housing,
      ...system.housing,
    },
    network: {
      ...baseConfig.network,
      ...system.network,
      localDirect: {
        ...baseConfig.network.localDirect,
        ...system.network?.localDirect,
      },
      remoteTunnel: {
        ...baseConfig.network.remoteTunnel,
        ...system.network?.remoteTunnel,
      },
    },
    mqtt: {
      ...baseConfig.mqtt,
      ...system.mqtt,
    },
    camera: {
      ...baseConfig.camera,
      ...system.camera,
      recorder: {
        ...baseConfig.camera.recorder,
        ...system.camera?.recorder,
      },
      cameras: (system.camera?.cameras ?? baseConfig.camera.cameras).map((camera) => ({
        ...baseConfig.camera.cameras[0],
        ...camera,
        rtspUrl: camera.rtspUrl ?? '',
        onvif: camera.onvif ?? '',
        snapshotUrl: camera.snapshotUrl ?? '',
        roomId: camera.roomId ?? '',
        sourceAgeMs: camera.sourceAgeMs ?? null,
        retentionDays: Number(camera.retentionDays ?? system.camera?.recorder?.retentionDays ?? baseConfig.camera.recorder.retentionDays),
      })),
    },
    runtime: {
      ...baseConfig.runtime,
      ...system.runtime,
    },
    security: {
      ...baseConfig.security,
      ...system.security,
    },
    media: {
      ...baseConfig.media,
      ...system.media,
      groups: (system.media?.groups ?? baseConfig.media.groups).map((group) => ({
        ...group,
        speakers: (group.speakers ?? []).map((speaker) => ({
          ...speaker,
          offsetMs: Number(speaker.offsetMs ?? 0),
          lastLatencyEstimateMs: speaker.lastLatencyEstimateMs ?? null,
        })),
        castTargets: group.castTargets ?? [],
        delayOffsetsMs: group.delayOffsetsMs ?? {},
        state: group.state ?? 'unknown',
        groupConfidence: group.groupConfidence ?? 'low',
      })),
    },
    audio: {
      ...baseConfig.audio,
      ...system.audio,
      categories: {
        ...baseConfig.audio.categories,
        ...system.audio?.categories,
      },
    },
    idleScreen: {
      ...baseConfig.idleScreen,
      ...system.idleScreen,
    },
    calendar: {
      ...baseConfig.calendar,
      ...system.calendar,
      events: system.calendar?.events ?? [],
      resources: system.calendar?.resources ?? [],
      bookings: system.calendar?.bookings ?? [],
    },
    scenes: ensureDefaultScenes(system.scenes ?? []),
    floors: system.floors ?? baseConfig.floors,
    rooms: (system.rooms ?? baseConfig.rooms).map((room) => {
      const baseRoom = baseConfig.rooms.find((candidate) => candidate.key === room.key)

      return {
        ...(baseRoom ?? {}),
        ...room,
        heatEmitterType: room.heatEmitterType ?? baseRoom?.heatEmitterType ?? '',
        heatPowerWatts: room.heatPowerWatts ?? baseRoom?.heatPowerWatts ?? null,
        nominalPowerWatts: room.nominalPowerWatts ?? baseRoom?.nominalPowerWatts ?? null,
        floorHeatingType: room.floorHeatingType ?? baseRoom?.floorHeatingType ?? '',
        floorAreaM2: room.floorAreaM2 ?? baseRoom?.floorAreaM2 ?? null,
        ceilingHeightM: room.ceilingHeightM ?? baseRoom?.ceilingHeightM ?? null,
        roomVolumeM3: room.roomVolumeM3 ?? baseRoom?.roomVolumeM3 ?? null,
        manualVolumeM3: room.manualVolumeM3 ?? baseRoom?.manualVolumeM3 ?? null,
        note: room.note ?? baseRoom?.note ?? '',
      }
    }),
    shading: system.shading ?? baseConfig.shading,
    weatherStation: {
      ...baseConfig.weatherStation,
      ...system.weatherStation,
    },
    technical: {
      ...baseConfig.technical,
      ...system.technical,
    },
    integrations: {
      ...baseConfig.integrations,
      ...system.integrations,
      bacnet: {
        ...baseConfig.integrations.bacnet,
        ...system.integrations?.bacnet,
        points: system.integrations?.bacnet?.points ?? [],
      },
    },
  }
}

function textToList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function isStoredSystemConfig(value: unknown): value is Partial<SystemConfig> {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'housing' in value &&
      'network' in value &&
      'runtime' in value &&
      'rooms' in value,
  )
}

function getFormattedStorageTime(value: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function loadStoredSystemConfig() {
  const defaultConfig = createInitialSystemConfig()

  if (typeof window === 'undefined') {
    return {
      config: defaultConfig,
      loaded: false,
      savedAt: null,
    }
  }

  try {
    const raw = window.localStorage.getItem(systemConfigStorageKey)

    if (!raw) {
      return {
        config: defaultConfig,
        loaded: false,
        savedAt: null,
      }
    }

    const parsed = JSON.parse(raw) as unknown
    const candidate =
      parsed && typeof parsed === 'object' && 'system' in parsed
        ? (parsed as Partial<ExportedManagerConfig>).system
        : parsed

    if (!isStoredSystemConfig(candidate)) {
      throw new Error('Lagret SystemConfig har ugyldig struktur')
    }

    return {
      config: normalizeSystemConfig(candidate),
      loaded: true,
      savedAt: window.localStorage.getItem(systemConfigSavedAtStorageKey),
    }
  } catch (error) {
    console.warn('[Lynell] Kunne ikke lese lagret SystemConfig. Bruker default.', error)
    return {
      config: defaultConfig,
      loaded: false,
      savedAt: null,
    }
  }
}

function persistSystemConfig(config: SystemConfig) {
  const savedAt = new Date().toISOString()
  window.localStorage.setItem(systemConfigStorageKey, JSON.stringify(config))
  window.localStorage.setItem(systemConfigSavedAtStorageKey, savedAt)
  return savedAt
}

type PersistedTrendHistoryState = {
  selectedRoomKey: string | null
  range: TrendHistoryRange
}

type PersistedRuntimeState = {
  version: 1
  savedAt: number
  runtimeHistory: RuntimeHistoryPoint[]
  houseSnapshot: NivaHouseSnapshot | null
  presence: HousePresence | null
  mediaPlayer: MediaPlayerState | null
  trendState: PersistedTrendHistoryState | null
}

type LoadedPersistedRuntimeState = PersistedRuntimeState & {
  restored: boolean
  message: string
}

function isRuntimeHistoryField(value: unknown): value is RuntimeHistoryField {
  return (
    value === 'temperature' ||
    value === 'setpoint' ||
    value === 'heatDemand' ||
    value === 'brightness'
  )
}

function isRuntimeHistorySource(value: unknown): value is RuntimeHistoryPoint['source'] {
  return (
    value === 'light-feedback' ||
    value === 'climate-feedback' ||
    value === 'simulate' ||
    value === 'write' ||
    value === 'snapshot'
  )
}

function normalizeSystemMode(value: unknown): Exclude<SystemMode, 'simulate'> {
  if (value === 'demo' || value === 'developer' || value === 'live') {
    return value
  }

  if (value === 'simulate') {
    return 'demo'
  }

  return 'live'
}

function isMockRuntimeMode(mode: SystemMode) {
  return mode === 'demo' || mode === 'developer' || mode === 'simulate'
}

function getRuntimeModeLabel(mode: SystemMode) {
  const normalizedMode = normalizeSystemMode(mode)

  if (normalizedMode === 'demo') {
    return 'Demo Mode'
  }

  if (normalizedMode === 'developer') {
    return 'Developer Mode'
  }

  return 'Live Mode'
}

function getRuntimeModeDescription(mode: SystemMode) {
  const normalizedMode = normalizeSystemMode(mode)
  return getAmbientRuntimeModeDescription(normalizedMode)
}

function formatServerInsightReason(insight: ServerRuntimeInsight) {
  const confidence =
    insight.confidence === 'high'
      ? 'høy trygghet'
      : insight.confidence === 'medium'
        ? 'middels trygghet'
        : 'lav trygghet'

  return `${insight.observationWindow} · ${confidence}`
}

function mapServerInsightToNivaInsight(insight: ServerRuntimeInsight): NivaInsight {
  return {
    id: `server-${insight.id}`,
    title: insight.title,
    detail:
      insight.confidence === 'low'
        ? `${insight.summary} Dette er en forsiktig observasjon fordi datagrunnlaget er tynt.`
        : insight.summary,
    reason: formatServerInsightReason(insight),
    dismissLabel: 'Skjul',
    contextKey: `${insight.id}:${insight.timestamp}:${insight.confidence}`,
    dismissUntilMs: 2 * 60 * 60 * 1000,
  }
}

function mapNivaObservationToInsight(observation: NivaObservation): NivaInsight {
  const severityLabel =
    observation.severity === 'warning'
      ? 'warning'
      : observation.severity === 'notice'
        ? 'notice'
        : 'info'
  const categoryLabel: Record<NivaObservation['category'], string> = {
    temperatureDrop: 'Temperaturfall',
    unmetSetpoint: 'Setpunkt oppnås ikke',
    heatWhileCooling: 'Varme mens rommet kjøles',
    overheat: 'Varme over settpunkt',
    staleSignal: 'Stale signal',
    highHeatDemand: 'Høyt varmebehov',
    lowHeatWhileCold: 'Lavt varmebehov under settpunkt',
    pollTimeout: 'Poll-timeout',
    restoredOnly: 'Restored data',
    staleDomain: 'Stale domain',
    runtimeInstability: 'Runtime ustabilitet',
    sourceTrust: 'Source trust',
    providerFoundation: 'Foundation provider',
  }
  const titlePrefix = observation.relatedRoomName ? `${observation.relatedRoomName}: ` : ''
  const snoozeMs =
    observation.severity === 'warning'
      ? 15 * 60 * 1000
      : observation.severity === 'notice'
        ? 30 * 60 * 1000
        : 60 * 60 * 1000
  const snoozeLabel =
    observation.severity === 'warning'
      ? 'Skjul i 15 min'
      : observation.severity === 'notice'
        ? 'Skjul i 30 min'
        : 'Skjul i 1 time'
  const fingerprint = [
    observation.observationId,
    observation.severity,
    observation.confidence,
    observation.relatedRoomKey ?? 'runtime',
    observation.evidence.join('|'),
  ].join('::')

  return {
    id: `niva-observation-${observation.observationId}`,
    title: `${titlePrefix}${categoryLabel[observation.category]}`,
    detail: `${observation.explanation} ${observation.suggestedManualCheck}`,
    reason: `${severityLabel} · ${observation.confidence} · ${observation.sourceBasis}`,
    dismissLabel: snoozeLabel,
    contextKey: fingerprint,
    dismissUntilMs: snoozeMs,
  }
}

function mapEnergyObservationToNivaInsight(observation: EnergyObservation): NivaInsight {
  const snoozeMs =
    observation.severity === 'warning'
      ? 15 * 60 * 1000
      : observation.severity === 'notice'
        ? 30 * 60 * 1000
        : 60 * 60 * 1000
  const categoryLabel: Record<EnergyObservation['category'], string> = {
    highHeatDemand: 'Energi: høyt varmebehov',
    nightFloorHeating: 'Energi: nattvarme',
    heatWithoutTemperatureRise: 'Energi: varme uten tydelig temperaturstigning',
    energyThiefCandidate: 'Energi: mulig energityv',
    vacationPatternCandidate: 'Energi: borte-/feriemodusmønster',
    energyProviderFoundation: 'Energi foundation',
  }
  const titlePrefix = observation.relatedRoomName ? `${observation.relatedRoomName}: ` : ''

  return {
    id: `energy-observation-${observation.observationId}`,
    title: `${titlePrefix}${categoryLabel[observation.category]}`,
    detail: `${observation.explanation} ${observation.suggestedManualCheck}`,
    reason: `${observation.severity} · ${observation.confidence} · ${observation.sourceBasis}`,
    dismissLabel:
      observation.severity === 'warning'
        ? 'Skjul i 15 min'
        : observation.severity === 'notice'
          ? 'Skjul i 30 min'
          : 'Skjul i 1 time',
    contextKey: [
      observation.observationId,
      observation.severity,
      observation.confidence,
      observation.relatedRoomKey ?? 'energy',
      observation.evidence.join('|'),
    ].join('::'),
    dismissUntilMs: snoozeMs,
  }
}

function isRuntimeHistoryPoint(value: unknown): value is RuntimeHistoryPoint {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<RuntimeHistoryPoint>

  return (
    typeof candidate.timestamp === 'number' &&
    Number.isFinite(candidate.timestamp) &&
    typeof candidate.roomKey === 'string' &&
    candidate.roomKey.length > 0 &&
    (candidate.zoneKey === undefined || typeof candidate.zoneKey === 'string') &&
    isRuntimeHistoryField(candidate.field) &&
    typeof candidate.value === 'number' &&
    Number.isFinite(candidate.value) &&
    isRuntimeHistorySource(candidate.source)
  )
}

function trimRuntimeHistoryPoints(
  history: RuntimeHistoryPoint[],
  maxPointsPerSeries = runtimeHistoryMaxPointsPerSeries,
  maxTotalPoints = runtimeHistoryMaxTotalPoints,
) {
  const cutoff = Date.now() - runtimeHistoryMaxAgeMs
  const grouped = new Map<string, RuntimeHistoryPoint[]>()

  for (const point of history) {
    if (!isRuntimeHistoryPoint(point) || point.timestamp < cutoff) {
      continue
    }

    const key = `${point.roomKey}:${point.zoneKey ?? 'room'}:${point.field}`
    grouped.set(key, [...(grouped.get(key) ?? []), point])
  }

  return Array.from(grouped.values())
    .flatMap((items) => items.sort((a, b) => a.timestamp - b.timestamp).slice(-maxPointsPerSeries))
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-maxTotalPoints)
}

function isMediaPlayerState(value: unknown): value is MediaPlayerState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<MediaPlayerState>

  return (
    (candidate.currentTrackId === null || typeof candidate.currentTrackId === 'string') &&
    typeof candidate.volume === 'number' &&
    Number.isFinite(candidate.volume) &&
    typeof candidate.activeDeviceId === 'string' &&
    Array.isArray(candidate.queueTrackIds) &&
    candidate.queueTrackIds.every((trackId) => typeof trackId === 'string') &&
    typeof candidate.elapsed === 'number' &&
    Number.isFinite(candidate.elapsed) &&
    typeof candidate.updatedAt === 'number' &&
    Number.isFinite(candidate.updatedAt)
  )
}

function sanitizeMediaPlayerState(player: MediaPlayerState): MediaPlayerState {
  return {
    ...player,
    isPlaying: false,
    volume: Math.max(0, Math.min(100, Math.round(player.volume))),
    elapsed: Math.max(0, player.elapsed),
    updatedAt: Date.now(),
  }
}

function restoreMediaPlayerState(
  basePlayer: MediaPlayerState,
  persistedPlayer: MediaPlayerState | null,
  availableTrackIds: string[],
  devices: MediaDevice[],
) {
  if (!persistedPlayer) {
    return basePlayer
  }

  const currentTrackId =
    persistedPlayer.currentTrackId && availableTrackIds.includes(persistedPlayer.currentTrackId)
      ? persistedPlayer.currentTrackId
      : basePlayer.currentTrackId
  const activeDeviceId = devices.some((device) => device.deviceId === persistedPlayer.activeDeviceId)
    ? persistedPlayer.activeDeviceId
    : basePlayer.activeDeviceId

  return sanitizeMediaPlayerState({
    ...basePlayer,
    currentTrackId,
    volume: persistedPlayer.volume,
    activeDeviceId,
    elapsed: persistedPlayer.elapsed,
  })
}

function restoreMediaDevicesFromPlayer(devices: MediaDevice[], player: MediaPlayerState | null) {
  if (!player) {
    return devices
  }

  return devices.map((device) => ({
    ...device,
    active: device.deviceId === player.activeDeviceId,
    volume: device.deviceId === player.activeDeviceId ? player.volume : device.volume,
  }))
}

function isPersistedTrendHistoryState(value: unknown): value is PersistedTrendHistoryState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PersistedTrendHistoryState>
  return (
    (candidate.selectedRoomKey === null || typeof candidate.selectedRoomKey === 'string') &&
    (candidate.range === 'hour' || candidate.range === 'day' || candidate.range === 'week')
  )
}

function getFallbackPersistedRuntimeState(message: string): LoadedPersistedRuntimeState {
  return {
    version: 1,
    savedAt: 0,
    runtimeHistory: [],
    houseSnapshot: null,
    presence: null,
    mediaPlayer: null,
    trendState: null,
    restored: false,
    message,
  }
}

function loadPersistedRuntimeState(): LoadedPersistedRuntimeState {
  if (typeof window === 'undefined') {
    return getFallbackPersistedRuntimeState('Starter med ny runtimehistorikk')
  }

  try {
    const raw = window.localStorage.getItem(runtimePersistenceStorageKey)

    if (!raw) {
      return getFallbackPersistedRuntimeState('Starter med ny runtimehistorikk')
    }

    const parsed = JSON.parse(raw) as Partial<PersistedRuntimeState>
    const runtimeHistory = Array.isArray(parsed.runtimeHistory)
      ? trimRuntimeHistoryPoints(parsed.runtimeHistory.filter(isRuntimeHistoryPoint))
      : []
    const houseSnapshot =
      parsed.houseSnapshot && typeof parsed.houseSnapshot === 'object'
        ? (parsed.houseSnapshot as NivaHouseSnapshot)
        : null
    const presence =
      parsed.presence && typeof parsed.presence === 'object'
        ? (parsed.presence as HousePresence)
        : null
    const mediaPlayer = isMediaPlayerState(parsed.mediaPlayer)
      ? sanitizeMediaPlayerState(parsed.mediaPlayer)
      : null
    const trendState = isPersistedTrendHistoryState(parsed.trendState)
      ? parsed.trendState
      : null

    return {
      version: 1,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
      runtimeHistory,
      houseSnapshot,
      presence,
      mediaPlayer,
      trendState,
      restored: runtimeHistory.length > 0 || Boolean(houseSnapshot || presence || mediaPlayer),
      message:
        runtimeHistory.length > 0 || houseSnapshot || presence || mediaPlayer
          ? 'Persisted runtime restored'
          : 'Starter med ny runtimehistorikk',
    }
  } catch (error) {
    console.warn('[Lynell] Kunne ikke lese persisted runtime. Starter nytt.', error)
    return getFallbackPersistedRuntimeState('Starter med ny runtimehistorikk')
  }
}

function persistRuntimeState(state: PersistedRuntimeState) {
  if (typeof window === 'undefined') {
    return
  }

  const trimmedState: PersistedRuntimeState = {
    ...state,
    runtimeHistory: trimRuntimeHistoryPoints(state.runtimeHistory),
    mediaPlayer: state.mediaPlayer ? sanitizeMediaPlayerState(state.mediaPlayer) : null,
  }
  const serialized = JSON.stringify(trimmedState)

  try {
    if (serialized.length <= runtimePersistenceMaxBytes) {
      window.localStorage.setItem(runtimePersistenceStorageKey, serialized)
      return
    }

    window.localStorage.setItem(
      runtimePersistenceStorageKey,
      JSON.stringify({
        ...trimmedState,
        runtimeHistory: trimRuntimeHistoryPoints(
          trimmedState.runtimeHistory,
          Math.max(60, Math.floor(runtimeHistoryMaxPointsPerSeries / 2)),
          Math.max(700, Math.floor(runtimeHistoryMaxTotalPoints / 2)),
        ),
      }),
    )
  } catch (error) {
    console.warn('[Lynell] Kunne ikke lagre persisted runtime.', error)
  }
}

function buildFrontendUrl(host: string, port: number) {
  const cleanHost = host.trim()

  if (!cleanHost) {
    return '—'
  }

  return `http://${cleanHost}:${port}`
}

function getFrontendAccessDiagnostics(networkConfig: NetworkConfig) {
  if (typeof window === 'undefined') {
    return {
      frontendHost: '—',
      frontendAccessMode: 'unknown' as const,
    }
  }

  const frontendHost = window.location.hostname || 'localhost'
  const configuredVpnHost = networkConfig.vpnHost.trim().toLowerCase()
  const isVpnHost =
    networkConfig.vpnEnabled &&
    configuredVpnHost.length > 0 &&
    frontendHost.toLowerCase() === configuredVpnHost

  return {
    frontendHost,
    frontendAccessMode: isVpnHost ? ('vpn' as const) : ('local' as const),
  }
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function hasConfiguredAddress(value: string | undefined) {
  return Boolean(value?.trim()) && !value?.trim().startsWith('placeholder/')
}

function syncRuntimeRoomsFromConfig(configRooms: Room[], currentRooms: Room[]) {
  return configRooms.map((configRoom) => {
    const currentRoom = currentRooms.find((room) => room.key === configRoom.key)

    if (!currentRoom) {
      return configRoom
    }

    return {
      ...configRoom,
      temperature: currentRoom.temperature,
      targetTemperature: currentRoom.targetTemperature,
      mode: currentRoom.mode,
      heatDemand: currentRoom.heatDemand,
      zones: configRoom.zones.map((configZone) => {
        const currentZone = currentRoom.zones.find((zone) => zone.key === configZone.key)

        if (!currentZone) {
          return configZone
        }

        return {
          ...configZone,
          lightsOn: currentZone.lightsOn,
          brightness: currentZone.brightness,
        }
      }),
    }
  })
}

function chunkItems<T>(items: T[], chunkSize: number) {
  if (items.length === 0) {
    return []
  }

  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }

  return chunks
}

function formatMainViewLabel(view: MainView) {
  switch (view) {
    case 'home':
      return 'Home'
    case 'rooms':
      return 'Rom'
    case 'trend-history':
      return 'Trendhistorikk'
    case 'lights':
      return 'Lys'
    case 'climate':
      return 'Klima'
    case 'camera':
      return 'Kamera'
    case 'shading':
      return 'Solskjerming'
    case 'calendar':
      return 'Kalender'
    case 'calendar-manager':
      return 'Kalender Manager'
    case 'media':
      return 'Media'
    case 'assistants':
      return 'Assistenter'
    case 'manager':
      return 'Manager'
    case 'room-manager':
      return 'Room Manager'
  }
}

function getMainViewIcon(view: MainView) {
  switch (view) {
    case 'home':
      return '⌂'
    case 'rooms':
      return '▣'
    case 'trend-history':
      return '⌁'
    case 'lights':
      return '◐'
    case 'climate':
      return '℃'
    case 'camera':
      return '◉'
    case 'shading':
      return '▤'
    case 'calendar':
      return '□'
    case 'calendar-manager':
      return '□'
    case 'media':
      return '♪'
    case 'assistants':
      return '✦'
    case 'manager':
      return '⚙'
    case 'room-manager':
      return '⌘'
  }
}

function getMainViewCapabilityId(view: MainView): UiCapabilityId | null {
  switch (view) {
    case 'home':
      return 'home'
    case 'rooms':
      return 'rooms'
    case 'trend-history':
      return 'trendHistory'
    case 'lights':
      return 'lighting'
    case 'climate':
      return 'climate'
    case 'camera':
      return 'camera'
    case 'shading':
      return 'shading'
    case 'calendar':
    case 'calendar-manager':
      return 'calendar'
    case 'media':
      return 'media'
    case 'assistants':
      return 'assistants'
    case 'manager':
    case 'room-manager':
      return 'manager'
  }
}

function getLightFeedbackStrategy(
  systemMode: SystemMode,
  connectionMode: 'localDirect' | 'remoteTunnel',
  activeView: ScopedView,
): 'subscribe' | 'polling-fallback' | 'off' {
  if (systemMode !== 'live') {
    return 'off'
  }

  if (connectionMode === 'localDirect') {
    return activeView.startsWith('floor:') ? 'polling-fallback' : 'off'
  }

  return 'off'
}

function getClimateFeedbackRuntimeStrategy(
  systemMode: SystemMode,
  connectionMode: 'localDirect' | 'remoteTunnel',
  requestedMethod: RuntimeConfig['climateFeedbackMethod'],
  activeView: ScopedView,
): {
  requestedMethod: RuntimeConfig['climateFeedbackMethod']
  strategy: 'subscribe' | 'polling-fallback' | 'off'
  reason: string
} {
  if (systemMode !== 'live') {
    return {
      requestedMethod,
      strategy: 'off' as const,
      reason: 'system-mode-not-live',
    }
  }

  if (!activeView.startsWith('floor:')) {
    return {
      requestedMethod,
      strategy: 'off' as const,
      reason: 'view-has-no-climate-runtime',
    }
  }

  if (connectionMode !== 'localDirect') {
    return {
      requestedMethod,
      strategy: 'off' as const,
      reason: 'remoteTunnel-does-not-run-live-climate-feedback',
    }
  }

  return {
    requestedMethod,
    strategy: 'polling-fallback' as const,
    reason: 'server-subscription-cache',
  }
}

function formatCalendarDateLabel(value: string) {
  if (!value) {
    return ''
  }

  const date = new Date(`${value}T00:00:00`)

  return new Intl.DateTimeFormat('nb-NO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date)
}

function createDiagnosticPulse(
  label: string,
  detail: string,
  extras: Omit<DiagnosticPulse, 'label' | 'detail' | 'at'> = {},
): DiagnosticPulse {
  return {
    label,
    detail,
    at: new Intl.DateTimeFormat('nb-NO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date()),
    ...extras,
  }
}

function formatCalendarEventLine(event: CalendarListItem) {
  const detail = [event.person, event.resourceName ?? event.place].filter(Boolean).join(' · ')
  return `${event.startTime} ${event.title}${detail ? ` – ${detail}` : ''}`
}

function getBookingResourceContextLabel(
  resource: BookingResourceConfig | undefined,
  scenes: SceneConfig[],
  rooms: Room[],
) {
  if (!resource) {
    return ''
  }

  const linkedRoom = resource.roomKey
    ? rooms.find((room) => room.key === resource.roomKey)
    : null
  const linkedScene = resource.sceneId
    ? scenes.find((scene) => scene.id === resource.sceneId)
    : null

  const details = [
    linkedRoom ? `Rom: ${linkedRoom.name}` : '',
    linkedScene ? `Scene: ${linkedScene.name}` : '',
    resource.climateRelevant ? 'Klima relevant' : '',
  ].filter(Boolean)

  return details.join(' · ')
}

function parseTimeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null
  }

  return hours * 60 + minutes
}

function getBookingConflictIds(
  bookings: BookingConfig[],
  resources: BookingResourceConfig[],
) {
  const conflictIds = new Set<string>()

  bookings.forEach((booking, bookingIndex) => {
    const resource = resources.find((candidate) => candidate.id === booking.resourceId)

    if (!resource || resource.allowOverlap) {
      return
    }

    const bookingStart = parseTimeToMinutes(booking.startTime)
    const bookingEnd = parseTimeToMinutes(booking.endTime)

    if (bookingStart === null || bookingEnd === null) {
      return
    }

    const bookingWindowStart = bookingStart - resource.bufferBeforeMin
    const bookingWindowEnd = bookingEnd + resource.bufferAfterMin

    bookings.slice(bookingIndex + 1).forEach((otherBooking) => {
      if (otherBooking.resourceId !== booking.resourceId || otherBooking.date !== booking.date) {
        return
      }

      const otherStart = parseTimeToMinutes(otherBooking.startTime)
      const otherEnd = parseTimeToMinutes(otherBooking.endTime)

      if (otherStart === null || otherEnd === null) {
        return
      }

      const otherWindowStart = otherStart - resource.bufferBeforeMin
      const otherWindowEnd = otherEnd + resource.bufferAfterMin
      const overlaps =
        bookingWindowStart < otherWindowEnd && bookingWindowEnd > otherWindowStart

      if (overlaps) {
        conflictIds.add(booking.id)
        conflictIds.add(otherBooking.id)
      }
    })
  })

  return Array.from(conflictIds)
}

function formatHomeClock(date: Date) {
  return new Intl.DateTimeFormat('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function isRoomMode(value: string): value is RoomMode {
  return value === 'Komfort' || value === 'Natt'
}

function getRelativeDateKey(offsetDays: number) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offsetDays)

  return date.toISOString().slice(0, 10)
}

type LightFeedbackViewScope = {
  strategy: 'subscribe' | 'polling-fallback' | 'off'
  roomKeys: string[]
  zoneLabels: string[]
}

type FeedbackStatusSnapshot = {
  label: string
  reason: string
}

type SceneActivationStatus = {
  sceneId: string
  sceneName: string
  activatedAt: number
}

type SceneUsageEntry = {
  sceneId: string
  sceneName: string
  triggeredAt: number
  source: 'manual' | 'time'
}

type DismissedNivaInsight = {
  until: number
  contextKey: string
  acknowledgedAt?: number
  snoozedUntil?: number
  dismissCount?: number
  observationFingerprint?: string
}

type DismissedRecommendation = {
  until: number
}

function loadDismissedRecommendations(): Record<string, DismissedRecommendation> {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(recommendationDismissStorageKey)

    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as Record<string, DismissedRecommendation>
    const now = Date.now()

    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => typeof value?.until === 'number' && value.until > now),
    )
  } catch (error) {
    console.warn('[Lynell] Kunne ikke lese skjulte anbefalinger.', error)
    return {}
  }
}

function persistDismissedRecommendations(dismissed: Record<string, DismissedRecommendation>) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(recommendationDismissStorageKey, JSON.stringify(dismissed))
  } catch (error) {
    console.warn('[Lynell] Kunne ikke lagre skjulte anbefalinger.', error)
  }
}

function formatRelativeSceneStatus(timestamp: number) {
  const elapsedSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000))

  if (elapsedSeconds < 15) {
    return 'Aktivert nå'
  }

  if (elapsedSeconds < 60) {
    return 'Kjørt nylig'
  }

  const elapsedMinutes = Math.round(elapsedSeconds / 60)

  if (elapsedMinutes < 60) {
    return `Kjørt for ${elapsedMinutes} min siden`
  }

  return 'Kjørt tidligere'
}

function formatShortRelativeTime(timestamp: string | number) {
  const value = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime()

  if (!Number.isFinite(value)) {
    return 'ukjent'
  }

  const elapsedSeconds = Math.max(0, Math.round((Date.now() - value) / 1000))

  if (elapsedSeconds < 20) {
    return 'nå nettopp'
  }

  if (elapsedSeconds < 60) {
    return `for ${elapsedSeconds} sek siden`
  }

  const elapsedMinutes = Math.round(elapsedSeconds / 60)

  if (elapsedMinutes < 60) {
    return `for ${elapsedMinutes} min siden`
  }

  return new Date(value).toLocaleString('no-NO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getCastDeviceStateLabel(device: BridgeCastDevice | null | undefined) {
  const state = device?.state ?? device?.status ?? (device?.online ? 'online' : 'unknown')

  if (state === 'online') {
    return 'Online'
  }

  if (state === 'stale') {
    return 'Ikke sett nylig'
  }

  if (state === 'offline') {
    return 'Offline'
  }

  return 'Ukjent'
}

function getCastDeviceLastSeenLabel(device: BridgeCastDevice | null | undefined) {
  const lastSeen = device?.lastSeenAt ?? device?.lastSeen

  return lastSeen ? formatShortRelativeTime(lastSeen) : 'ikke sett'
}

function formatTimeOfDayBucket(hour: number) {
  if (hour < 11) {
    return 'morgen'
  }

  if (hour < 17) {
    return 'dag'
  }

  if (hour < 22) {
    return 'kveld'
  }

  return 'natt'
}

function formatSuggestedTime(totalMinutes: number) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const minutes = String(Math.round(totalMinutes % 60)).padStart(2, '0')
  return `${hours}:${minutes}`
}

function formatRuntimeFreshness(timestamp: number | null, now = Date.now()) {
  if (!timestamp) {
    return ambientRuntimeCopy.preparing
  }

  const elapsedSeconds = Math.max(0, Math.round((now - timestamp) / 1000))

  if (elapsedSeconds < 5) {
    return 'Oppdatert nå'
  }

  if (elapsedSeconds < 60) {
    return `Sist oppdatert for ${elapsedSeconds} sek siden`
  }

  const elapsedMinutes = Math.round(elapsedSeconds / 60)

  if (elapsedMinutes < 60) {
    return `Sist oppdatert for ${elapsedMinutes} min siden`
  }

  return ambientRuntimeCopy.lastKnown
}

type RuntimeConfidenceLevel = 'høy' | 'middels' | 'lav'

type RuntimeConfidence = {
  level: RuntimeConfidenceLevel
  label: string
  tone: 'live' | 'fallback' | 'stale'
  summary: string
  readiness: string
  nivaLine: string
}

function getConfidenceLabel(level: RuntimeConfidenceLevel) {
  return level === 'høy' ? 'Høy tillit' : level === 'middels' ? 'Middels tillit' : 'Lav tillit'
}

function getConfidenceLevel({
  hasLiveFeedback,
  hasPollingFallback,
  restored,
  hasHistory,
  staleRuntime,
  missingSignals,
}: {
  hasLiveFeedback: boolean
  hasPollingFallback: boolean
  restored: boolean
  hasHistory: boolean
  staleRuntime: boolean
  missingSignals: boolean
}): RuntimeConfidenceLevel {
  if (staleRuntime || missingSignals) {
    return 'lav'
  }

  if (hasLiveFeedback) {
    return 'høy'
  }

  if (hasPollingFallback || restored || hasHistory) {
    return 'middels'
  }

  return 'lav'
}

function buildRuntimeConfidence({
  level,
  hasPollingFallback,
  restored,
  staleRuntime,
  missingSignals,
  fallbackText,
}: {
  level: RuntimeConfidenceLevel
  hasPollingFallback: boolean
  restored: boolean
  staleRuntime: boolean
  missingSignals: boolean
  fallbackText: string
}): RuntimeConfidence {
  if (level === 'høy') {
    return {
      level,
      label: getConfidenceLabel(level),
      tone: 'live',
      summary: 'Live nå',
      readiness: ambientRuntimeCopy.systemsAvailable,
      nivaLine: 'Jeg får stabile live-signaler fra huset nå.',
    }
  }

  if (level === 'middels') {
    const nivaLine = hasPollingFallback
      ? 'Jeg følger huset via polling nå, så statusen er oppdatert, men litt mindre direkte enn live.'
      : restored
        ? 'Noen verdier bygger fortsatt på siste kjente tilstand.'
        : fallbackText

    return {
      level,
      label: getConfidenceLabel(level),
      tone: 'fallback',
      summary: hasPollingFallback ? 'Jevnlig oppdatert' : ambientRuntimeCopy.lastKnown,
      readiness: hasPollingFallback ? 'Huset følges jevnlig' : 'Rytmen er bevart',
      nivaLine,
    }
  }

  return {
    level,
    label: getConfidenceLabel(level),
    tone: 'stale',
    summary: staleRuntime || missingSignals ? ambientRuntimeCopy.gentleWatch : 'Lite grunnlag',
    readiness: staleRuntime ? 'Huset har vært stille en stund' : 'Noen signaler er stille',
    nivaLine: 'Jeg mangler ferske signaler fra enkelte deler av huset akkurat nå.',
  }
}

function getPresenceSummaryForConfidence(presence: HousePresence, confidence: RuntimeConfidence) {
  if (confidence.level !== 'lav') {
    return presence.nivaSummary
  }

  return presence.activeRoomNames.length > 0
    ? `Jeg ser noe aktivitet i ${presence.activeRoomNames.slice(0, 2).join(' og ')}, men datagrunnlaget er litt stille akkurat nå.`
    : 'Det er lite aktivitet, men jeg venter på ferskere signaler før jeg tolker for mye.'
}

function normalizeNivaDisplayText(value: string) {
  return value
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/[.,:;!?]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

type NivaWordingMode = 'live' | 'restored' | 'sparse'

type NivaLanguagePolishResult = {
  text: string
  dedupeCount: number
  mode: NivaWordingMode
  sourceSummary: string
  staleBasedWording: boolean
}

type NivaLanguageDiagnostics = {
  sourceSummary: string
  liveWordingCount: number
  restoredWordingCount: number
  sparseWordingCount: number
  dedupeCount: number
  staleBasedWordingCount: number
  lastPolishedAt: string | null
}

const initialNivaLanguageDiagnostics: NivaLanguageDiagnostics = {
  sourceSummary: 'venter på runtime-kilde',
  liveWordingCount: 0,
  restoredWordingCount: 0,
  sparseWordingCount: 0,
  dedupeCount: 0,
  staleBasedWordingCount: 0,
  lastPolishedAt: null,
}

type NivaIntentConfidence = 'understood' | 'partial' | 'uncertain'

type NivaPendingClarification = {
  id: string
  kind: 'roomLightZone'
  roomId: number
  roomKey: string
  roomName: string
  createdAt: number
  expiresAt: number
  originalText: string
}

type NivaInteractionDiagnostics = {
  confidenceDistribution: Record<NivaIntentConfidence, number>
  clarificationCount: number
  misunderstoodIntentCount: number
  successfulConversationalActions: number
  roomAliasMatches: number
  fallbackUsageCount: number
  latestParse: {
    at: string
    text: string
    intent: NivaMessage['intent']
    confidence: NivaIntentConfidence
    roomName: string | null
    proposedAction: string | null
    clarification: string | null
  } | null
  rawParses: Array<{
    at: string
    text: string
    intent: NivaMessage['intent']
    confidence: NivaIntentConfidence
    roomName: string | null
    proposedAction: string | null
    clarification: string | null
  }>
}

const initialNivaInteractionDiagnostics: NivaInteractionDiagnostics = {
  confidenceDistribution: {
    understood: 0,
    partial: 0,
    uncertain: 0,
  },
  clarificationCount: 0,
  misunderstoodIntentCount: 0,
  successfulConversationalActions: 0,
  roomAliasMatches: 0,
  fallbackUsageCount: 0,
  latestParse: null,
  rawParses: [],
}

type CanonicalTruthFreshness = 'fresh' | 'aging' | 'stale' | 'offline' | 'pending'
type CanonicalTruthConfidence = 'high' | 'medium' | 'low'

type CanonicalTruthField = {
  valueLabel: string
  source: string
  groupAddress: string | null
  freshness: CanonicalTruthFreshness
  confidence: CanonicalTruthConfidence
  timestamp: string | null
}

type CanonicalRoomTruthSummary = {
  roomKey: string
  roomName: string
  fields: {
    temperature: CanonicalTruthField
    setpoint: CanonicalTruthField
    heatDemand: CanonicalTruthField
    light: CanonicalTruthField
    brightness: CanonicalTruthField
  }
  optimisticPending: boolean
  staleCount: number
}

function getNivaSentenceSignature(value: string) {
  const normalized = normalizeNivaDisplayText(value)

  if (
    (normalized.includes('noen rom trenger') || normalized.includes('noen signaler trenger')) &&
    (normalized.includes('oppfolging') || normalized.includes('oppmerksomhet'))
  ) {
    return 'follow-up-needed'
  }

  if (
    normalized.includes('huset er stabilt') ||
    normalized.includes('huset virker stabilt') ||
    normalized.includes('komforten er stabil') ||
    normalized.includes('komforten virker stabil')
  ) {
    return 'home-stable'
  }

  if (normalized.includes('forelopig') && normalized.includes('vurdering')) {
    return 'preliminary-assessment'
  }

  if (normalized.includes('siste kjente') || normalized.includes('tidligere data')) {
    return `restored:${normalized.split(' ').slice(0, 6).join(' ')}`
  }

  return normalized.split(' ').slice(0, 12).join(' ')
}

function polishNivaSentence(sentence: string, mode: NivaWordingMode) {
  let next = sentence.trim()

  next = next
    .replace(/\bForeløpig vurdering\b/g, mode === 'live' ? 'Tynt datagrunnlag' : 'Foreløpig observasjon')
    .replace(/\bforeløpig vurdering\b/g, mode === 'live' ? 'tynt datagrunnlag' : 'foreløpig observasjon')
    .replace(/Huset virker stabilt akkurat nå/g, 'Huset er stabilt akkurat nå')
    .replace(/Huset virker stabilt/g, 'Huset er stabilt')
    .replace(/Huset virker komfortabelt/g, 'Komforten er jevn')
    .replace(/Huset virker fokusert/g, 'Hjemmet er fokusert')
    .replace(/Huset virker stille/g, 'Hjemmet er stille')
    .replace(/Huset virker tomt/g, 'Hjemmet er tomt')
    .replace(/Komforten virker stabil/g, 'Komforten er stabil')
    .replace(/Sensorlaget virker stabilt/g, 'Sensorlaget er stabilt')
    .replace(/ virker aktivt nå/g, ' er aktivt nå')
    .replace(/ virker aktive samtidig/g, ' er aktive samtidig')
    .replace(/systemene virker stabile/g, 'systemene er stabile')
    .replace(/virker ikke spesielt tungt å varme opp/g, mode === 'live' ? 'har lav varmebelastning' : 'hadde lav varmebelastning sist jeg så data')
    .replace(/ser ut til å ha normalt varmebehov akkurat nå/g, mode === 'live' ? 'har normalt varmebehov akkurat nå' : 'hadde normalt varmebehov sist jeg så data')

  if (mode !== 'live') {
    next = next
      .replace(/\bviser\b/g, 'hadde sist')
      .replace(/\bhar ([0-9]+(?:[,.][0-9]+)?%? varmebehov)\b/g, 'hadde sist $1')
  }

  return next
}

function shouldAddSourceCaveat(text: string, mode: NivaWordingMode) {
  if (mode === 'live') {
    return false
  }

  const normalized = normalizeNivaDisplayText(text)
  const hasRuntimeClaim =
    normalized.includes('temperatur') ||
    normalized.includes('komfort') ||
    normalized.includes('varme') ||
    normalized.includes('lys') ||
    normalized.includes('rom')
  const alreadyHasCaveat =
    normalized.includes('siste kjente') ||
    normalized.includes('tidligere data') ||
    normalized.includes('historikk') ||
    normalized.includes('venter på') ||
    normalized.includes('venter pa') ||
    normalized.includes('forelopig') ||
    normalized.includes('datagrunnlag')

  return hasRuntimeClaim && !alreadyHasCaveat
}

function polishNivaText(
  text: string,
  context: { mode: NivaWordingMode; sourceSummary: string },
): NivaLanguagePolishResult {
  const sourceSentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
  const seen = new Set<string>()
  const polishedSentences: string[] = []
  let dedupeCount = 0

  for (const sentence of sourceSentences.length > 0 ? sourceSentences : [text]) {
    const polished = polishNivaSentence(sentence, context.mode)
    const signature = getNivaSentenceSignature(polished)

    if (seen.has(signature)) {
      dedupeCount += 1
      continue
    }

    seen.add(signature)
    polishedSentences.push(polished)
  }

  let polishedText = polishedSentences.join(' ').replace(/\s+/g, ' ').trim()
  const staleBasedWording = shouldAddSourceCaveat(polishedText, context.mode)

  if (staleBasedWording) {
    polishedText = `${polishedText} ${
      context.mode === 'restored'
        ? 'Basert på sist kjente historikk.'
        : 'Dette er en foreløpig observasjon mens jeg venter på ferskere signaler.'
    }`
  }

  return {
    text: polishedText,
    dedupeCount,
    mode: context.mode,
    sourceSummary: context.sourceSummary,
    staleBasedWording,
  }
}

function dedupeNivaDisplayLines(lines: Array<string | null | undefined>) {
  const seen = new Set<string>()

  return lines
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line))
    .filter((line) => {
      const signature = normalizeNivaDisplayText(line)

      if (seen.has(signature)) {
        return false
      }

      seen.add(signature)
      return true
    })
}

type PresenceCandidate = {
  presence: HousePresence
  since: number
}

const quietPresenceStates: HousePresenceState[] = [
  'quiet',
  'quietEvening',
  'darkQuiet',
  'rainQuietEvening',
  'night',
  'empty',
]

const calmHousePhrases = [
  'Det er lite aktivitet hjemme nå.',
  'Alt er stabilt akkurat nå.',
  'Det er stille inne nå.',
  'Huset har vært stille en stund.',
]

function getQuietHousePhrase(seed: number) {
  return calmHousePhrases[Math.abs(seed) % calmHousePhrases.length]
}

function isLowNoisePresence(state: HousePresenceState) {
  return quietPresenceStates.includes(state)
}

function formatAssistantStatus(device: VacuumDevice) {
  if (device.trustState === 'offline') {
    return 'Offline'
  }

  if (device.trustState === 'stale') {
    return 'Venter på signal'
  }

  if (device.stateConfidence === 'low' || device.estimatedState) {
    return 'Uklart'
  }

  if (device.cleaning) {
    return 'Rengjør'
  }

  if (device.status === 'paused') {
    return 'Pauset'
  }

  if (device.docked) {
    return device.charging ? 'Lader' : 'Dokket'
  }

  if (device.status === 'returning') {
    return 'På vei hjem'
  }

  if (device.status === 'error') {
    return 'Trenger sjekk'
  }

  return 'Klar'
}

function formatAssistantActivity(device: VacuumDevice) {
  if (device.trustState === 'offline') {
    return 'Ingen ferske signaler fra roboten'
  }

  if (device.trustState === 'stale') {
    return 'Viser sist kjente status'
  }

  if (device.stateConfidence === 'low' || device.estimatedState) {
    return 'Status er usikker'
  }

  if (device.cleaning) {
    return `${device.cleaningProgress}% ferdig${device.currentArea ? ` i ${device.currentArea}` : ''}`
  }

  if (device.status === 'paused') {
    return `Pauset${device.currentArea ? ` i ${device.currentArea}` : ''}`
  }

  if (device.status === 'returning') {
    return 'På vei til ladestasjon'
  }

  if (device.docked) {
    return 'Venter på ladestasjon'
  }

  return 'Ingen aktiv jobb'
}

function formatAssistantLastActivity(device: VacuumDevice) {
  if (device.lastSeenAt) {
    return `Sist sett ${formatShortRelativeTime(device.lastSeenAt)}`
  }

  if (device.estimatedFinishAt) {
    return `Ferdig ca. ${device.estimatedFinishAt}`
  }

  return device.lastCleanedAt ? `Sist aktiv ${device.lastCleanedAt}` : 'Ingen historikk ennå'
}

function getSceneByName(scenes: SceneConfig[], name: string) {
  return scenes.find((scene) => scene.name.trim().toLowerCase() === name.trim().toLowerCase())
}

function LazyViewFallback({ label }: { label: string }) {
  return (
    <section className="room-section lazy-view-fallback" aria-label={`${label} laster`}>
      <div className="room-section__header">
        <p className="eyebrow">Lynell</p>
        <h2>{label}</h2>
        <span>Laster inn...</span>
      </div>
    </section>
  )
}

function getAssistantProviderMaturityLabel(maturity?: string | null) {
  if (maturity === 'liveRuntime') return 'Live'
  if (maturity === 'statusOnly') return 'Status only'
  if (maturity === 'future') return 'Prepared / future'
  if (maturity === 'mock') return 'Mock/demo'
  if (maturity === 'prepared') return 'Prepared'
  return 'Foundation only'
}

function getAssistantProviderGroupId(provider: {
  maturity?: string | null
  runtimeConnected?: boolean
  foundationOnly?: boolean
}) {
  if (provider.maturity === 'liveRuntime') return 'live'
  if (provider.maturity === 'statusOnly') return 'status'
  if (provider.maturity === 'mock') return 'mock'
  if (provider.maturity === 'future' || provider.maturity === 'prepared') return 'future'
  return 'foundation'
}

function App() {
  const [initialStorageState] = useState(() => loadStoredSystemConfig())
  const [initialRuntimeState] = useState(() => loadPersistedRuntimeState())
  const [initialHouseMemoryState] = useState(() => loadHouseMemoryState(houseMemoryStorageKey))
  const [activeMainView, setActiveMainView] = useState<MainView>('home')
  const [activeFloorId, setActiveFloorId] = useState('')
  const [homeStatus, setHomeStatus] = useState<'Hjemme' | 'Borte'>(() =>
    initialRuntimeState.houseSnapshot?.system.homeStatus === 'Borte' ? 'Borte' : 'Hjemme',
  )
  const [savedSystemConfigData, setSavedSystemConfigData] = useState<SystemConfig>(() =>
    initialStorageState.config,
  )
  const savedSystemConfigDataRef = useRef<SystemConfig>(initialStorageState.config)
  const [systemConfigData, setSystemConfigData] = useState<SystemConfig>(() =>
    initialStorageState.config,
  )
  const activeLanguage = normalizeAppLanguage(systemConfigData.language)
  const t = useMemo(() => getTranslations(activeLanguage), [activeLanguage])
  const [lastLocalConfigSaveAt, setLastLocalConfigSaveAt] = useState<string | null>(
    () => initialStorageState.savedAt,
  )
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [isPinUnlocked, setIsPinUnlocked] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return (
      window.sessionStorage.getItem(pinSessionStorageKey) === 'true' ||
      window.localStorage.getItem(pinPersistentStorageKey) === 'true'
    )
  })
  const [layoutMode, setLayoutMode] = useState<'mobile' | 'desktop'>(() => {
    if (typeof window === 'undefined') {
      return 'mobile'
    }

    return window.localStorage.getItem(layoutModeStorageKey) === 'desktop' ? 'desktop' : 'mobile'
  })
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getInitialThemeMode())
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveThemeMode(getInitialThemeMode()),
  )
  const [uiCapabilityConfig, setUiCapabilityConfig] = useState<UiCapabilityConfig>(() =>
    loadUiCapabilityConfig(),
  )
  const [serverConfigDiagnostics, setServerConfigDiagnostics] =
    useState<ServerSystemConfigDiagnostics | null>(null)
  const [serverConfigHydrated, setServerConfigHydrated] = useState(false)
  const [systemConfigSource, setSystemConfigSource] = useState<'server' | 'localFallback'>(
    'localFallback',
  )
  const [conversationLoggingEnabled, setConversationLoggingEnabled] = useState(false)
  const [conversationLoggingStatus, setConversationLoggingStatus] = useState(
    'Conversation logging disabled',
  )
  const [autoPollQuietSignalsConfig, setAutoPollQuietSignalsConfig] =
    useState<AutoPollQuietSignalsConfig>(defaultAutoPollQuietSignalsConfig)
  const [rooms, setRooms] = useState<Room[]>(() =>
    Array.isArray(initialRuntimeState.houseSnapshot?.rooms)
      ? initialRuntimeState.houseSnapshot.rooms
      : [],
  )
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)
  const [isWeatherLoading, setIsWeatherLoading] = useState(true)
  const [weatherError, setWeatherError] = useState('')
  const [weatherUpdatedAt, setWeatherUpdatedAt] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [managerMessage, setManagerMessage] = useState(() => {
    const savedAt = getFormattedStorageTime(initialStorageState.savedAt)
    return initialStorageState.loaded && savedAt ? `Lagret lokalt ${savedAt}` : ''
  })
  const [bridgeRuntimeStatus, setBridgeRuntimeStatus] = useState<'syncing' | 'ready' | 'error'>(
    'syncing',
  )
  const [frontendLoadedAt] = useState(() => createDiagnosticPulse('Frontend', 'App lastet').at)
  const [bridgeHealth, setBridgeHealth] = useState<BridgeHealthState>({
    reachable: null,
    checkedAt: null,
    error: null,
    snapshot: null,
  })
  const [bridgeMqttState, setBridgeMqttState] = useState<BridgeMqttState>({
    checkedAt: null,
    error: null,
    snapshot: null,
  })
  const [bridgeCastState, setBridgeCastState] = useState<BridgeCastState>({
    checkedAt: null,
    error: null,
    snapshot: null,
    playback: null,
  })
  const [bridgeVacuumState, setBridgeVacuumState] = useState<BridgeVacuumState>({
    checkedAt: null,
    error: null,
    snapshot: null,
  })
  const [knxDiagnosticsState, setKnxDiagnosticsState] = useState<KnxDiagnosticsBridgeState>({
    checkedAt: null,
    error: null,
    snapshot: null,
  })
  const [knxState, setKnxState] = useState<KnxStateBridgeState>({
    checkedAt: null,
    error: null,
    snapshot: null,
  })
  const [knxMonitorWindowMode, setKnxMonitorWindowMode] = useState<KnxMonitorWindowMode>('closed')
  const [knxMonitorPaused, setKnxMonitorPaused] = useState(false)
  const [knxMonitorEvents, setKnxMonitorEvents] = useState<KnxMonitorEvent[]>([])
  const [knxMonitorDiagnostics, setKnxMonitorDiagnostics] = useState<KnxMonitorDiagnostics | null>(null)
  const [knxMonitorError, setKnxMonitorError] = useState<string | null>(null)
  const [knxMonitorFilters, setKnxMonitorFilters] = useState<KnxMonitorFilters>({
    search: '',
    roomKey: 'all',
    direction: 'all',
    source: 'all',
    signalType: 'all',
    onlyWrites: false,
    onlyFeedback: false,
    onlyStale: false,
  })
  const knxMonitorPausedRef = useRef(false)
  const [shadingCommandStateById, setShadingCommandStateById] = useState<Record<string, ShadingCommandUiEntry>>({})
  const [shadingPositionDraftById, setShadingPositionDraftById] = useState<Record<string, number>>({})
  const shadingConfigRef = useRef<SystemShadingConfig[]>(savedSystemConfigData.shading ?? [])
  const [roomPollStateByKey, setRoomPollStateByKey] = useState<Record<string, RoomPollUiState>>({})
  const [serverRuntimeState, setServerRuntimeState] = useState<ServerRuntimeBridgeState>({
    checkedAt: null,
    error: null,
    snapshot: null,
    history: null,
    aggregates: null,
    insights: null,
  })
  const [runtimeEventStreamState, setRuntimeEventStreamState] = useState<RuntimeEventStreamUiState>({
    connected: false,
    connectionState: 'connecting',
    reconnectAttempt: 0,
    reconnectDelayMs: null,
    reconnectCount: 0,
    eventsLastMinute: 0,
    pollingRequestsPerMinute: 0,
    fallbackRefreshCount: 0,
    reducerApplyCount: 0,
    replayedEvents: 0,
    droppedEvents: 0,
    staleTransitions: 0,
    eventBufferSize: 0,
    latestEventId: null,
    lastAppliedEventId: null,
    replaySupported: false,
    resyncRequiredCount: 0,
    reducerStatus: 'standby',
    fallbackPollingStatus: 'runtime fallback polling 120s',
    runtimeEventHealthy: false,
    degradedEventStream: false,
    pollingFallbackMode: 'steady',
    averageEventLatency: null,
    maxEventLatency: null,
    averageReducerTime: null,
    averageRuntimeRefreshTime: null,
    topPollingSources: [],
    actionMetrics: null,
    clientIdentity: null,
    runtimeDomains: null,
    runtimeContinuity: null,
    runtimeRegistry: null,
    runtimeBoot: null,
    soakMetrics: null,
    clients: [],
    lastEventChain: [],
    lastEventAt: null,
    lastSuccessfulSyncAt: null,
    lastDisconnectedAt: null,
    frontendFreshness: 'stale',
    staleAfterMs: 90000,
      offlineAfterMs: 300000,
      frontendStateAgeMs: null,
      runtimeDriftSuspected: false,
      staleStateCount: 0,
      offlineStateCount: 0,
      reconnectHistory: [],
      latencyMs: null,
      error: null,
    })
  const [runtimeEventUpdateTokens, setRuntimeEventUpdateTokens] = useState<Record<string, string>>({})
  const serverRuntimeHistoryRef = useRef<ServerRuntimeHistory | null>(null)
  const runtimeEventUpdateTokensRef = useRef<Record<string, string>>({})
  const roomPollStateByKeyRef = useRef<Record<string, RoomPollUiState>>({})
  const runtimePollingIntervalMsRef = useRef(120000)
  useEffect(() => {
    savedSystemConfigDataRef.current = savedSystemConfigData
  }, [savedSystemConfigData])

  useEffect(() => {
    shadingConfigRef.current = systemConfigData.shading ?? []
  }, [systemConfigData.shading])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      const now = Date.now()
      setShadingCommandStateById((current) => {
        let changed = false
        const nextEntries = Object.entries(current).map(([key, entry]) => {
          if (entry.status !== 'pending' || now <= entry.timeoutAt) {
            return [key, entry] as const
          }

          changed = true
          return [
            key,
            {
              ...entry,
              status: 'sentUnconfirmed' as const,
              lastMessage: entry.feedbackGroupAddress
                ? 'Sendt, men ikke bekreftet av feedbackPosition ennå'
                : 'Sendt uten feedbackPosition konfigurert',
            },
          ] as const
        })

        return changed ? Object.fromEntries(nextEntries) : current
      })
    }, 800)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    const updateResolvedTheme = () => {
      setResolvedTheme(resolveThemeMode(themeMode))
    }

    updateResolvedTheme()

    if (themeMode !== 'auto' || typeof window === 'undefined') {
      return undefined
    }

    const intervalId = window.setInterval(updateResolvedTheme, 5 * 60 * 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [themeMode])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    document.body.classList.toggle('theme-dark', resolvedTheme === 'dark')
    document.body.classList.toggle('theme-light', resolvedTheme === 'light')
    document.body.dataset.themeMode = themeMode
    document.documentElement.style.colorScheme = resolvedTheme
  }, [resolvedTheme, themeMode])

  useEffect(() => {
    persistUiCapabilityConfig(uiCapabilityConfig)
    if (!serverConfigHydrated) {
      return
    }

    const saveId = window.setTimeout(() => {
      void saveServerSystemConfig({
        systemConfig: savedSystemConfigDataRef.current,
        uiCapabilityConfig,
        conversationLogging: { enabled: conversationLoggingEnabled },
        autoPollQuietSignals: autoPollQuietSignalsConfig,
      })
        .then((snapshot) => {
          setServerConfigDiagnostics(snapshot.diagnostics)
          setSystemConfigSource(snapshot.systemConfig ? 'server' : 'localFallback')
          setConversationLoggingStatus(
            snapshot.conversationLogging.enabled
              ? 'Conversation logging enabled'
              : 'Conversation logging disabled',
          )
        })
        .catch((error) => {
          const message =
            error instanceof Error ? error.message : 'Kunne ikke lagre server-owned config'
          setConversationLoggingStatus(message)
          setServerConfigDiagnostics((current) =>
            current
              ? {
                  ...current,
                  lastError: message,
                  configDriftDetected: true,
                }
              : current,
          )
        })
    }, 800)

    return () => {
      window.clearTimeout(saveId)
    }
  }, [
    autoPollQuietSignalsConfig,
    conversationLoggingEnabled,
    serverConfigHydrated,
    uiCapabilityConfig,
  ])

  const [integrationManagerState, setIntegrationManagerState] = useState<IntegrationManagerBridgeState>({
    checkedAt: null,
    error: null,
    snapshot: null,
  })
  const [deltacoIdentifyState, setDeltacoIdentifyState] = useState<DeltacoIdentifyBridgeState>({
    checkedAt: null,
    error: null,
    snapshot: null,
  })
  const [deltacoProtocolResearchState, setDeltacoProtocolResearchState] =
    useState<DeltacoProtocolResearchBridgeState>({
      checkedAt: null,
      error: null,
      snapshot: null,
    })
  const [vacuumPhysicalCommandAcknowledged, setVacuumPhysicalCommandAcknowledged] = useState(false)
  const [testLog, setTestLog] = useState<TestLogEntry[]>(() => [
    {
      id: 'app-started',
      at: createDiagnosticPulse('App', 'Startet').at,
      category: 'App',
      text: 'App startet',
    },
    {
      id: 'runtime-persistence-startup',
      at: createDiagnosticPulse('Persistence', initialRuntimeState.message).at,
      category: 'Persistence',
      text: initialRuntimeState.message,
    },
    {
      id: 'house-memory-startup',
      at: createDiagnosticPulse('Memory', initialHouseMemoryState.message).at,
      category: 'Memory',
      text: initialHouseMemoryState.message,
    },
  ])
  const [lastBridgeSyncAt, setLastBridgeSyncAt] = useState<string | null>(null)
  const [runtimeConfigPushState, setRuntimeConfigPushState] = useState<{
    runtimeConfigSyncAttempted: boolean
    runtimeConfigSyncSkippedReason: string | null
    runtimeConfigSyncPosted: boolean
    runtimeConfigSyncPostFailed: boolean
    lastManualRuntimeConfigTriggerAt: string | null
    lastRuntimeConfigPostUrl: string | null
    lastRuntimeConfigPayloadPreview: string | null
    lastRuntimeConfigPostStatus: string | null
    lastRuntimeConfigPostError: string | null
    lastRuntimeConfigPushAttemptAt: string | null
    lastRuntimeConfigPushAt: string | null
    lastRuntimeConfigPushOk: boolean | null
    lastRuntimeConfigPushError: string | null
    latestRuntimeConfigPayloadSummary: BridgeRuntimeConfigPayloadSummary | null
  }>({
    runtimeConfigSyncAttempted: false,
    runtimeConfigSyncSkippedReason: 'venter på app boot',
    runtimeConfigSyncPosted: false,
    runtimeConfigSyncPostFailed: false,
    lastManualRuntimeConfigTriggerAt: null,
    lastRuntimeConfigPostUrl: null,
    lastRuntimeConfigPayloadPreview: null,
    lastRuntimeConfigPostStatus: null,
    lastRuntimeConfigPostError: null,
    lastRuntimeConfigPushAttemptAt: null,
    lastRuntimeConfigPushAt: null,
    lastRuntimeConfigPushOk: null,
    lastRuntimeConfigPushError: null,
    latestRuntimeConfigPayloadSummary: null,
  })
  const [lastKnxIn, setLastKnxIn] = useState<DiagnosticPulse | null>(null)
  const [lastKnxOut, setLastKnxOut] = useState<DiagnosticPulse | null>(null)
  const [lastRuntimeError, setLastRuntimeError] = useState<DiagnosticPulse | null>(null)
  const [lastRuntimeTimeout, setLastRuntimeTimeout] = useState<DiagnosticPulse | null>(null)
  const [lastClimateEvent, setLastClimateEvent] = useState<DiagnosticPulse | null>(null)
  const [lastClimateError, setLastClimateError] = useState<DiagnosticPulse | null>(null)
  const [activatingSceneId, setActivatingSceneId] = useState<string | null>(null)
  const [lastSceneActivation, setLastSceneActivation] = useState<SceneActivationStatus | null>(null)
  const [sceneUsageHistory, setSceneUsageHistory] = useState<SceneUsageEntry[]>([])
  const [optimisticLightingByKey, setOptimisticLightingByKey] = useState<Record<string, OptimisticLightingEntry>>({})
  const [optimisticLightingMetrics, setOptimisticLightingMetrics] = useState<OptimisticLightingMetrics>(
    () => createInitialOptimisticLightingMetrics(),
  )
  const [mediaLibrary, setMediaLibrary] = useState(() =>
    isMockRuntimeMode(normalizeSystemMode(initialStorageState.config.runtime.systemMode))
      ? getMockMediaLibrary()
      : [],
  )
  const [mediaLibrarySource, setMediaLibrarySource] = useState<MediaLibrarySource>(() =>
    isMockRuntimeMode(normalizeSystemMode(initialStorageState.config.runtime.systemMode)) ? 'mock' : 'empty',
  )
  const [mediaLibraryMessage, setMediaLibraryMessage] = useState(() =>
    isMockRuntimeMode(normalizeSystemMode(initialStorageState.config.runtime.systemMode))
      ? 'Demo/dev bibliotek'
      : 'Live Mode: venter på lokalt bibliotek',
  )
  const [mediaDevices, setMediaDevices] = useState<MediaDevice[]>(() =>
    restoreMediaDevicesFromPlayer(initialMediaDevices, initialRuntimeState.mediaPlayer),
  )
  const [mediaPlayer, setMediaPlayer] = useState<MediaPlayerState>(() => {
    const initialMode = normalizeSystemMode(initialStorageState.config.runtime.systemMode)
    const initialLibrary = isMockRuntimeMode(initialMode) ? getMockMediaLibrary() : []
    const initialDevices = restoreMediaDevicesFromPlayer(
      initialMediaDevices,
      initialRuntimeState.mediaPlayer,
    )

    return restoreMediaPlayerState(
      createInitialMediaPlayerState(initialLibrary, initialDevices),
      initialRuntimeState.mediaPlayer,
      initialLibrary.map((track) => track.id),
      initialDevices,
    )
  })
  const [vacuumDevices, setVacuumDevices] = useState<VacuumDevice[]>(() => mockVacuumDevices)
  const [dismissedNivaInsights, setDismissedNivaInsights] = useState<
    Record<string, DismissedNivaInsight>
  >({})
  const [dismissedRecommendations, setDismissedRecommendations] = useState<
    Record<string, DismissedRecommendation>
  >(() => loadDismissedRecommendations())
  const [isNivaPanelOpen, setIsNivaPanelOpen] = useState(false)
  const [isMainNavOpen, setIsMainNavOpen] = useState(false)
  const [isHomeStatusOpen, setIsHomeStatusOpen] = useState(false)
  const [isHomeScenesOpen, setIsHomeScenesOpen] = useState(false)
  const [isHomeCalendarOpen, setIsHomeCalendarOpen] = useState(false)
  const [selectedRoomKey, setSelectedRoomKey] = useState<string | null>(
    () => initialRuntimeState.trendState?.selectedRoomKey ?? null,
  )
  const [trendHistoryRange, setTrendHistoryRange] = useState<TrendHistoryRange>(
    () => initialRuntimeState.trendState?.range ?? 'hour',
  )
  const [nivaInput, setNivaInput] = useState('')
  const [isNivaProcessing, setIsNivaProcessing] = useState(false)
  const [nivaMessages, setNivaMessages] = useState<NivaMessage[]>([
    {
      id: 'niva-welcome',
      timestamp: Date.now(),
      role: 'niva',
      text: getTranslations(initialStorageState.config.language).niva.welcome,
      type: 'response',
      status: 'acknowledged',
      intent: 'unknown',
    },
  ])
  const [nivaIntentGaps, setNivaIntentGaps] = useState<NivaIntentGap[]>([])
  const [nivaLanguageDiagnostics, setNivaLanguageDiagnostics] = useState<NivaLanguageDiagnostics>(
    initialNivaLanguageDiagnostics,
  )
  const [nivaExplanationIntentCount, setNivaExplanationIntentCount] = useState(0)
  const [lastNivaObservationAction, setLastNivaObservationAction] = useState<{
    label: string
    roomKey?: string | null
    invokedAt: string
  } | null>(null)
  const [nivaFollowThroughDiagnostics, setNivaFollowThroughDiagnostics] = useState({
    hits: 0,
    misses: 0,
    lastHitAt: null as string | null,
    lastMissAt: null as string | null,
    lastActionSummary: null as string | null,
  })
  const [nivaPendingClarification, setNivaPendingClarification] =
    useState<NivaPendingClarification | null>(null)
  const [nivaInteractionDiagnostics, setNivaInteractionDiagnostics] =
    useState<NivaInteractionDiagnostics>(initialNivaInteractionDiagnostics)
  const [calendarActionTrustRecords, setCalendarActionTrustRecords] = useState<CalendarActionTrustRecord[]>([])
  const [calendarDuplicatePreventedCount, setCalendarDuplicatePreventedCount] = useState(0)
  useEffect(() => {
    setNivaMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === 'niva-welcome'
          ? {
              ...message,
              text: t.niva.welcome,
            }
          : message,
      ),
    )
  }, [t.niva.welcome])
  const initialNivaRuntimeMode = normalizeSystemMode(
    initialStorageState.config.runtime.systemMode,
  ) as SystemMode
  const [nivaSessionMemory, setNivaSessionMemory] = useState<NivaSessionMemory>(() =>
    createInitialNivaSessionMemory('home', initialNivaRuntimeMode),
  )
  const [currentClock, setCurrentClock] = useState(() => new Date())
  const roomsRef = useRef<Room[]>([])
  const feedbackIntervalRef = useRef<number | null>(null)
  const feedbackInFlightRef = useRef(false)
  const lightFeedbackUnsubscribeRef = useRef<(() => void) | null>(null)
  const climateIntervalRef = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lynellAudioPlayerRef = useRef<ReturnType<typeof createLynellAudioPlayer> | null>(null)
  if (!lynellAudioPlayerRef.current) {
    lynellAudioPlayerRef.current = createLynellAudioPlayer()
  }
  const [audioLastPlayback, setAudioLastPlayback] =
    useState<LynellAudioPlaybackStatus | null>(null)
  const [idleScreenVisible, setIdleScreenVisible] = useState(false)
  const [lastIdleActivityAt, setLastIdleActivityAt] = useState(() => Date.now())
  const lastIdleActivityAtRef = useRef(lastIdleActivityAt)
  const climateInFlightRef = useRef(false)
  const bridgeHealthLogStateRef = useRef<string | null>(null)
  const nivaDiagnosticMessageKeyRef = useRef<string | null>(null)
  const nivaProactiveCooldownRef = useRef<Record<string, number>>({})
  const nivaQuietModeRef = useRef(false)
  const nivaBridgeReachableRef = useRef<boolean | null>(null)
  const nivaFirstHouseDataSeenRef = useRef(false)
  const nivaSubscribeActiveRef = useRef<boolean | null>(null)
  const nivaHeatDemandRoomRef = useRef<string | null>(null)
  const nivaAmbientObservationKeyRef = useRef<string | null>(null)
  const nivaWindBucketRef = useRef<number | null>(null)
  const nivaProcessingTimeoutRef = useRef<number | null>(null)
  const nivaMessagesRef = useRef<HTMLDivElement | null>(null)
  const nivaShouldAutoScrollRef = useRef(true)
  const presenceCandidateRef = useRef<PresenceCandidate | null>(null)
  const lightFeedbackFailureCountRef = useRef(0)
  const climateFeedbackFailureCountRef = useRef(0)
  const lightFeedbackBatchIndexRef = useRef(0)
  const climateBatchIndexRef = useRef(0)
  const sceneTriggerHistoryRef = useRef<Record<string, string>>({})
  const lastSchedulerOptimisticExecutionRef = useRef<string | null>(null)
  const [liveClimateTemperatureRoomKeys, setLiveClimateTemperatureRoomKeys] = useState<string[]>([])
  const [liveClimateSetpointRoomKeys, setLiveClimateSetpointRoomKeys] = useState<string[]>([])
  const [liveClimateHeatDemandRoomKeys, setLiveClimateHeatDemandRoomKeys] = useState<string[]>([])
  const [confirmedLightFeedbackZoneKeys, setConfirmedLightFeedbackZoneKeys] = useState<string[]>([])
  const [confirmedBrightnessFeedbackZoneKeys, setConfirmedBrightnessFeedbackZoneKeys] = useState<
    string[]
  >([])
  const [runtimeHistory, setRuntimeHistory] = useState<RuntimeHistoryPoint[]>(
    () => initialRuntimeState.runtimeHistory,
  )
  const [lastRuntimeSnapshotAt, setLastRuntimeSnapshotAt] = useState<number | null>(() =>
    initialRuntimeState.savedAt ||
    initialRuntimeState.runtimeHistory[initialRuntimeState.runtimeHistory.length - 1]?.timestamp ||
    null,
  )
  const [lastLiveSignalAt, setLastLiveSignalAt] = useState<number | null>(null)
  const [stableHousePresence, setStableHousePresence] = useState<HousePresence | null>(
    () => initialRuntimeState.presence,
  )
  const [houseMemoryState, setHouseMemoryState] = useState<HouseMemoryState>(() => ({
    version: initialHouseMemoryState.version,
    updatedAt: initialHouseMemoryState.updatedAt,
    dailySnapshots: initialHouseMemoryState.dailySnapshots,
  }))
  const [lastMeaningfulChangeAt, setLastMeaningfulChangeAt] = useState(() => Date.now())
  // TODO Trendhistorikk: egen Rom-knapp og view for 24t detaljert historikk,
  // nattlig døgnkomprimering, ukesgraf og samlet klima-/lyslogg.
  const housingConfig: HousingConfig = savedSystemConfigData.housing
  const networkConfig: NetworkConfig = savedSystemConfigData.network
  const runtimeConfig: RuntimeConfig = savedSystemConfigData.runtime
  const systemMode = normalizeSystemMode(runtimeConfig.systemMode) as SystemMode
  const runtimeAllowsMock = isMockRuntimeMode(systemMode)
  const runtimeModeLabel = getRuntimeModeLabel(systemMode)
  const runtimeModeDescription = getRuntimeModeDescription(systemMode)
  const comfortSetpoint = runtimeConfig.comfortSetpoint ?? defaultComfortSetpoint
  const nightSetpoint = runtimeConfig.nightSetpoint ?? defaultNightSetpoint
  const currentMediaTrack = getTrackById(mediaLibrary, mediaPlayer.currentTrackId)
  const currentMediaDuration = currentMediaTrack?.duration && currentMediaTrack.duration > 0
    ? currentMediaTrack.duration
    : mediaPlayer.elapsed
  const mediaProgressPercent = currentMediaTrack && currentMediaDuration > 0
    ? Math.min(100, Math.round((mediaPlayer.elapsed / currentMediaDuration) * 100))
    : 0
  const castDevices = bridgeCastState.snapshot?.devices ?? []
  const castOnlineDeviceCount =
    bridgeCastState.snapshot?.diagnostics?.onlineCount ??
    castDevices.filter((device) => (device.state ?? device.status) === 'online' || device.online).length
  const castStaleDeviceCount =
    bridgeCastState.snapshot?.diagnostics?.staleCount ??
    castDevices.filter((device) => (device.state ?? device.status) === 'stale').length
  const castOfflineDeviceCount =
    bridgeCastState.snapshot?.diagnostics?.offlineCount ??
    castDevices.filter((device) => (device.state ?? device.status) === 'offline').length
  const castDiscoveryStatusText = bridgeCastState.snapshot
    ? bridgeCastState.snapshot.enabled
      ? bridgeCastState.snapshot.discoveryEnabled
        ? castDevices.length > 0
          ? castOnlineDeviceCount > 0
            ? `${castOnlineDeviceCount} Cast-enheter online${castStaleDeviceCount > 0 ? ` · ${castStaleDeviceCount} stale` : ''}`
            : `${castDevices.length} Cast-enheter husket, ingen ferskt online`
        : bridgeCastState.snapshot.state === 'discovering'
            ? 'Forbereder Cast'
            : bridgeCastState.snapshot.error
              ? bridgeCastState.snapshot.error
              : 'Cast er forberedt når dependency og miljø er satt'
        : 'Cast discovery trenger miljøvalg'
      : 'Cast er ikke aktivert'
    : bridgeCastState.error
      ? 'Cast er ikke tilgjengelig'
      : ambientRuntimeCopy.preparing
  const castTruthSnapshot = bridgeCastState.snapshot
    ? {
        ...bridgeCastState.snapshot,
        playback: bridgeCastState.playback ?? bridgeCastState.snapshot.playback,
      }
    : null
  const castDiscoveryTruthStatus = getCastDiscoveryTruthStatus(castTruthSnapshot)
  const castPlaybackTruthStatus = getCastPlaybackTruthStatus(castTruthSnapshot)
  const mqttTruthStatus = getMqttTruthStatus(bridgeMqttState.snapshot)
  const vacuumTruthStatus = getVacuumTruthStatus(bridgeVacuumState.snapshot)
  const vacuumBridgeMessage =
    bridgeVacuumState.snapshot?.message ??
    bridgeVacuumState.error ??
    'Robotstatus forberedes. Live provider vises når den er tilgjengelig.'
  const vacuumSnapshot = bridgeVacuumState.snapshot
  const vacuumTrust = vacuumSnapshot?.trust ?? null
  const isVacuumHomeAssistant = vacuumSnapshot?.provider === 'homeAssistantBridge'
  const vacuumLiveStatusConfirmed = Boolean(
    vacuumSnapshot?.connected &&
      vacuumSnapshot.selectedRobot &&
      vacuumTrust?.state !== 'stale' &&
      vacuumTrust?.state !== 'offline' &&
      vacuumTrust?.stateConfidence !== 'low',
  )
  const vacuumHaTestMode = Boolean(isVacuumHomeAssistant && !vacuumLiveStatusConfirmed)
  const vacuumHaStatusChecks = [
    {
      label: 'HA URL konfigurert',
      ok: Boolean(vacuumSnapshot?.config.homeAssistantBaseUrl),
    },
    {
      label: 'Token satt',
      ok: Boolean(vacuumSnapshot?.config.homeAssistantTokenConfigured),
    },
    {
      label: 'Entity ID satt',
      ok: Boolean(vacuumSnapshot?.config.homeAssistantVacuumEntityId),
    },
    {
      label: 'Entity funnet',
      ok: Boolean(vacuumLiveStatusConfirmed || vacuumSnapshot?.selectedRobot?.entityId),
    },
    {
      label: 'Siste status hentet',
      ok: Boolean(vacuumSnapshot?.lastSyncAt),
      value: vacuumSnapshot?.lastSyncAt ? formatShortRelativeTime(vacuumSnapshot.lastSyncAt) : null,
    },
  ]
  const vacuumLastResponse =
    vacuumSnapshot?.command
      ? vacuumSnapshot.message
      : bridgeVacuumState.error ?? vacuumSnapshot?.error ?? vacuumSnapshot?.message ?? ambientRuntimeCopy.preparing
  const activeMediaDeviceCandidate =
    mediaDevices.find((device) => device.deviceId === mediaPlayer.activeDeviceId) ??
    mediaDevices.find((device) => device.active) ??
    mediaDevices[0] ??
    null
  const activeMediaDevice =
    !runtimeAllowsMock && activeMediaDeviceCandidate?.availability === 'foundation'
      ? mediaDevices.find((device) => device.deviceId === 'local-speaker') ?? activeMediaDeviceCandidate
      : activeMediaDeviceCandidate
  const selectedMediaRoute = activeMediaDevice?.availability === 'discovered' ? 'cast' : 'local'
  const activeMediaDeviceTruthStatus = getMediaDeviceTruthStatus(activeMediaDevice)
  const castPlaybackState = bridgeCastState.playback?.state ?? 'idle'
  const castPlaybackConfidence = bridgeCastState.playback?.playbackConfidence ?? 'medium'
  const castPlaybackFreshness = bridgeCastState.playback?.sourceFreshness ?? 'unknown'
  const castSelectedDeviceIsFresh = activeMediaDevice?.availability === 'discovered'
    ? activeMediaDevice.online !== false && activeMediaDevice.trustState !== 'stale'
    : true
  const castPlaybackSupportedNow =
    selectedMediaRoute === 'cast' &&
    Boolean(bridgeCastState.snapshot?.enabled) &&
    Boolean(bridgeCastState.snapshot?.discoveryEnabled) &&
    Boolean(bridgeCastState.playback?.dependencyReady) &&
    castSelectedDeviceIsFresh &&
    castPlaybackConfidence !== 'low' &&
    !['disconnected', 'unavailable'].includes(castPlaybackState)
  const mediaRouteLabel =
    selectedMediaRoute === 'cast'
      ? activeMediaDevice?.name
        ? `Cast device · ${activeMediaDevice.name}`
        : 'Cast device'
      : 'Denne enheten'
  const mediaRoutePlaybackLabel =
    selectedMediaRoute === 'cast'
      ? castPlaybackState === 'playing' && castPlaybackSupportedNow
        ? 'Spiller'
        : castPlaybackState === 'paused' && castPlaybackSupportedNow
          ? 'Pauset'
          : castPlaybackState === 'connecting' || castPlaybackState === 'buffering'
            ? ambientRuntimeCopy.preparing
            : castPlaybackState === 'disconnected'
              ? 'Frakoblet'
              : castPlaybackState === 'unavailable'
                ? 'Utilgjengelig'
                : castPlaybackTruthStatus
      : mediaPlayer.isPlaying
        ? 'Spiller'
        : ambientRuntimeCopy.quiet
  const mediaRouteReadinessText =
    selectedMediaRoute === 'cast'
      ? castPlaybackSupportedNow
        ? bridgeCastState.playback?.message ?? 'Cast er klar på valgt output.'
        : bridgeCastState.playback?.message ??
          'Cast er forberedt. Trykk play når valgt enhet er tilgjengelig.'
      : mediaPlayer.isPlaying
        ? 'Musikk spiller lokalt på denne enheten.'
        : 'Stille på denne enheten.'
  const mediaPlaybackBadge =
    selectedMediaRoute === 'cast'
      ? castPlaybackState === 'playing' && castPlaybackSupportedNow
        ? 'Caster'
        : castPlaybackState === 'connecting'
          ? ambientRuntimeCopy.preparing
          : castPlaybackState === 'disconnected' || !castSelectedDeviceIsFresh
            ? 'Cast venter'
            : 'Cast klar'
      : formatAmbientMediaState(mediaPlayer.isPlaying, 'local')
  const mediaIsPlayingOnSelectedRoute =
    selectedMediaRoute === 'cast'
      ? castPlaybackState === 'playing' && castPlaybackSupportedNow
      : mediaPlayer.isPlaying
  const activeMediaRouteLine = activeMediaDevice
    ? `${getMediaDeviceTypeLabel(activeMediaDevice.type)} · ${getMediaDeviceLocationLabel(activeMediaDevice)} · ${getMediaDeviceAvailabilityLabel(activeMediaDevice.availability)}`
    : formatAmbientDeviceState('quiet')
  const cameraPageConfig = savedSystemConfigData.camera
  const cameraPageSummary = summarizeCameraFoundation(cameraPageConfig)
  const visibleCameraCards = (cameraPageConfig.cameras ?? []).filter((camera) => camera.visible !== false)
  const mediaGroupPageSummary = summarizeMediaGroups(savedSystemConfigData.media)
  const configuredMediaGroups = savedSystemConfigData.media.groups ?? []
  const liveMediaDevices = mediaDevices.filter(
    (device) => device.availability === 'available' || device.availability === 'discovered',
  )
  const foundationMediaDevices = mediaDevices.filter((device) => device.availability === 'foundation')
  const selectableMediaDevices = runtimeAllowsMock
    ? mediaDevices
    : liveMediaDevices
  const mediaOutputSelectValue = selectableMediaDevices.some(
    (device) => device.deviceId === mediaPlayer.activeDeviceId,
  )
    ? mediaPlayer.activeDeviceId
    : 'local-speaker'
  const visibleVacuumDevices = runtimeAllowsMock
    ? vacuumDevices
    : vacuumDevices.filter(
        (device) =>
          device.integrationStatus.connected ||
          device.trustState === 'stale' ||
          device.trustState === 'offline' ||
          Boolean(device.lastSeenAt),
      )
  const primaryVacuumDevice = visibleVacuumDevices[0] ?? null
  const assistantManagerProviders = (integrationManagerState.snapshot?.providers ?? []).filter(
    (provider) => provider.category === 'assistant' || provider.provider === 'deltacoTuya',
  )
  const assistantManagerLiveCount = assistantManagerProviders.filter(
    (provider) => provider.maturity === 'liveRuntime' && provider.runtimeConnected,
  ).length
  const assistantManagerStatusOnlyCount = assistantManagerProviders.filter(
    (provider) => provider.maturity === 'statusOnly',
  ).length
  const assistantProviderSections = [
    {
      id: 'live',
      title: 'Live systems',
      detail: 'Koblet runtime med ekte status og kontroller der capability tillater det.',
      providers: assistantManagerProviders.filter((provider) => getAssistantProviderGroupId(provider) === 'live'),
    },
    {
      id: 'status',
      title: 'Status-only systems',
      detail: 'Kan lese eller vise state, men styring er ikke tilgjengelig.',
      providers: assistantManagerProviders.filter((provider) => getAssistantProviderGroupId(provider) === 'status'),
    },
    {
      id: 'foundation',
      title: 'Foundation / prepared systems',
      detail: 'Kjent i runtime, men ikke full live control. Trygt merket som foundation.',
      providers: assistantManagerProviders.filter((provider) => getAssistantProviderGroupId(provider) === 'foundation'),
    },
    {
      id: 'future',
      title: 'Prepared / future',
      detail: 'Planlagt eller forberedt integrasjon uten aktiv runtime.',
      providers: assistantManagerProviders.filter((provider) => getAssistantProviderGroupId(provider) === 'future'),
    },
    {
      id: 'mock',
      title: 'Mock/demo',
      detail: 'Demo eller utviklingsflate. Teller ikke som ekte live provider.',
      providers: assistantManagerProviders.filter((provider) => getAssistantProviderGroupId(provider) === 'mock'),
    },
  ].filter((section) => section.providers.length > 0)
  const assistantManagerFoundationCount = assistantManagerProviders.filter(
    (provider) => getAssistantProviderGroupId(provider) === 'foundation',
  ).length
  const assistantManagerControlCount = assistantManagerProviders.filter(
    (provider) => provider.controlAvailable && provider.supportsWrite,
  ).length
  const calendarConfig: CalendarConfig = savedSystemConfigData.calendar
  const calendarEvents: CalendarEventConfig[] = calendarConfig.events
  const bookingResources: BookingResourceConfig[] = calendarConfig.resources
  const bookings: BookingConfig[] = calendarConfig.bookings
  const scenesConfig: SceneConfig[] = savedSystemConfigData.scenes
  const audioManifestSummary = useMemo(() => getLynellAudioManifestSummary(), [])
  const lynellAudioSettings = useMemo(
    () => buildLynellAudioSettings(systemConfigData.audio),
    [systemConfigData.audio],
  )
  const lynellAudioDiagnostics = useMemo(
    () => lynellAudioPlayerRef.current?.getDiagnostics(lynellAudioSettings) ?? null,
    [audioLastPlayback, lynellAudioSettings],
  )
  const floorConfigs: FloorConfig[] = savedSystemConfigData.floors
  const savedLightingConfig: Record<string, KnxRoomMapping> = useMemo(
    () => buildKnxMappingFromSystemConfig(savedSystemConfigData),
    [savedSystemConfigData],
  )
  const savedLightingConfigSummary = useMemo(
    () => summarizeKnxRuntimeMapping(savedLightingConfig, 'saved-system-config'),
    [savedLightingConfig],
  )
  const bootstrapLightingConfig: Record<string, KnxRoomMapping> = useMemo(
    () => buildKnxMappingFromSystemConfig(createInitialSystemConfig()),
    [],
  )
  const lightingConfigUsesBootstrap =
    savedLightingConfigSummary.totalWriteMappings === 0 &&
    savedLightingConfigSummary.totalFeedbackMappings === 0
  const lightingConfig: Record<string, KnxRoomMapping> = lightingConfigUsesBootstrap
    ? bootstrapLightingConfig
    : savedLightingConfig
  const runtimeConfigPayloadSummary = useMemo(
    () =>
      summarizeKnxRuntimeMapping(
        lightingConfig,
        lightingConfigUsesBootstrap ? 'baseline-knx-mapping' : 'saved-system-config',
      ),
    [lightingConfig, lightingConfigUsesBootstrap],
  )
  const runtimeConfigBootstrapInputsRef = useRef({
    networkConfig,
    runtimeConfig,
    lightingConfig,
    runtimeConfigPayloadSummary,
    systemMode,
  })
  const runtimeConfigBootstrapSucceededRef = useRef(false)
  const runtimeConfigBootstrapInFlightRef = useRef(false)

  useEffect(() => {
    let isMounted = true

    const hydrateServerOwnedConfig = async () => {
      try {
        const snapshot = await getServerSystemConfig()

        if (!isMounted) {
          return
        }

        setServerConfigDiagnostics(snapshot.diagnostics)
        setConversationLoggingEnabled(Boolean(snapshot.conversationLogging?.enabled))
        setConversationLoggingStatus(
          snapshot.conversationLogging?.enabled
            ? 'Conversation logging enabled'
            : 'Conversation logging disabled',
        )
        setAutoPollQuietSignalsConfig(
          normalizeAutoPollQuietSignalsClientConfig(snapshot.autoPollQuietSignals),
        )

        if (snapshot.uiCapabilityConfig) {
          setUiCapabilityConfig(normalizeUiCapabilityConfig(snapshot.uiCapabilityConfig))
        }

        if (snapshot.systemConfig) {
          const nextConfig = normalizeSystemConfig(snapshot.systemConfig)
          const savedAt = persistSystemConfig(nextConfig)
          savedSystemConfigDataRef.current = nextConfig
          setSavedSystemConfigData(nextConfig)
          setSystemConfigData(nextConfig)
          setLastLocalConfigSaveAt(snapshot.diagnostics.lastConfigSaveAt ?? savedAt)
          setSystemConfigSource('server')
          setManagerMessage(
            `Server-config lastet ${getFormattedStorageTime(snapshot.diagnostics.lastConfigSaveAt ?? savedAt) ?? ''}`.trim(),
          )
          runtimeConfigBootstrapSucceededRef.current = false
          return
        }

        const bootstrapSnapshot = await saveServerSystemConfig({
          systemConfig: initialStorageState.config,
          uiCapabilityConfig,
          conversationLogging: { enabled: false },
          autoPollQuietSignals: defaultAutoPollQuietSignalsConfig,
        })

        if (!isMounted) {
          return
        }

        setServerConfigDiagnostics(bootstrapSnapshot.diagnostics)
        setSystemConfigSource('server')
        setConversationLoggingEnabled(false)
        setConversationLoggingStatus('Conversation logging disabled')
        runtimeConfigBootstrapSucceededRef.current = false
      } catch (error) {
        if (!isMounted) {
          return
        }

        const message =
          error instanceof Error ? error.message : 'Server-owned config er ikke tilgjengelig'
        setSystemConfigSource('localFallback')
        setServerConfigDiagnostics((current) =>
          current
            ? {
                ...current,
                configSource: 'localFallback',
                configDriftDetected: true,
                lastError: message,
              }
            : {
                configSource: 'localFallback',
                lastConfigSaveAt: null,
                lastConfigSaveClient: null,
                configVersion: 0,
                configDriftDetected: true,
                lastError: message,
              },
        )
        setManagerMessage(
          initialStorageState.loaded
            ? 'Server-config utilgjengelig. Viser lokal fallback.'
            : 'Server-config utilgjengelig.',
        )
      } finally {
        if (isMounted) {
          setServerConfigHydrated(true)
        }
      }
    }

    void hydrateServerOwnedConfig()

    return () => {
      isMounted = false
    }
  }, [])

  const managerHousingConfig: HousingConfig = systemConfigData.housing
  const managerNetworkConfig: NetworkConfig = systemConfigData.network
  const managerMqttConfig: MqttConfig = systemConfigData.mqtt
  const managerCameraConfig: CameraFoundationConfig = systemConfigData.camera
  const managerRuntimeConfig: RuntimeConfig = systemConfigData.runtime
  const managerSecurityConfig: SecurityConfig = systemConfigData.security
  const managerMediaConfig: MediaConfig = systemConfigData.media
  const managerCalendarConfig: CalendarConfig = systemConfigData.calendar
  const managerScenesConfig: SceneConfig[] = systemConfigData.scenes
  const managerFloorConfigs: FloorConfig[] = systemConfigData.floors
  const managerShadingConfig: SystemShadingConfig[] = systemConfigData.shading
  const managerWeatherStationConfig: SystemWeatherStationConfig = systemConfigData.weatherStation
  const managerTechnicalConfig: SystemTechnicalConfig = systemConfigData.technical
  const managerIntegrationConfig: SystemIntegrationConfig = systemConfigData.integrations
  const edgeFoundationStatuses = getEdgeFoundationStatus(
    managerMqttConfig,
    managerIntegrationConfig,
    zigbeeDeviceConcepts,
  )
  const edgeHealthSummary = getEdgeHealthSummary(edgeFoundationStatuses, zigbeeDeviceConcepts)
  const edgeLifecycleDevices = buildEdgeLifecycleDevices(
    zigbeeDeviceConcepts,
    buildRoomSelectOptions(systemConfigData.rooms, managerFloorConfigs),
  )
  const edgeDeviceHealthSummary = getEdgeDeviceHealthSummary(edgeLifecycleDevices)
  const managerLightingConfig: Record<string, KnxRoomMapping> =
    buildKnxMappingFromSystemConfig(systemConfigData)
  const managerRooms = buildRoomsFromSystemConfig(systemConfigData)
  const sensorIntelligence = buildSensorIntelligence(edgeLifecycleDevices, managerRooms)
  const spatialMap = buildHouseSpatialMap(systemConfigData.rooms, managerFloorConfigs)
  const spatialAwareness = buildSpatialAwareness({
    spatialMap,
    rooms,
    sensorActiveRoomNames: sensorIntelligence.activeRoomNames,
    vacuum: primaryVacuumDevice,
  })
  const assistantCleaningAreas = Array.from(
    new Set([
      ...(primaryVacuumDevice?.availableAreas ?? []),
      ...spatialMap.areas.map((area) => area.label),
      'Entré',
    ]),
  )
    .filter(Boolean)
    .slice(0, 6)
  const isConfigDirty =
    JSON.stringify(systemConfigData) !== JSON.stringify(savedSystemConfigData)

  const resolvedUiCapabilities = useMemo(
    () => resolveUiCapabilities(uiCapabilityConfig),
    [uiCapabilityConfig],
  )
  const uiCapabilitySummary = useMemo(
    () => buildUiCapabilitySummary(resolvedUiCapabilities),
    [resolvedUiCapabilities],
  )
  const roomCapabilitySummaries = useMemo(
    () => buildRoomCapabilitySummaries(uiCapabilityConfig, managerRooms),
    [managerRooms, uiCapabilityConfig],
  )
  const updateUiCapabilityOverride = (
    capabilityId: UiCapabilityId,
    override: UiCapabilityOverride,
  ) => {
    setUiCapabilityConfig((currentConfig) => ({
      ...currentConfig,
      updatedAt: new Date().toISOString(),
      overrides: {
        ...currentConfig.overrides,
        [capabilityId]: {
          ...(currentConfig.overrides[capabilityId] ?? {}),
          ...override,
        },
      },
    }))
  }
  const handleUiCapabilityConfigChange = <K extends keyof UiCapabilityConfig>(
    field: K,
    value: UiCapabilityConfig[K],
  ) => {
    setUiCapabilityConfig((currentConfig) => ({
      ...currentConfig,
      [field]: value,
      updatedAt: new Date().toISOString(),
    }))
  }
  const handleRoomCapabilityChange = (
    roomKey: string,
    capabilityId: RoomCapabilityId,
    override: UiCapabilityOverride,
  ) => {
    setUiCapabilityConfig((currentConfig) => ({
      ...currentConfig,
      updatedAt: new Date().toISOString(),
      roomOverrides: {
        ...currentConfig.roomOverrides,
        [roomKey]: {
          ...(currentConfig.roomOverrides[roomKey] ?? {}),
          [capabilityId]: {
            ...(currentConfig.roomOverrides[roomKey]?.[capabilityId] ?? {}),
            ...override,
          },
        },
      },
    }))
  }
  const handleHclFoundationChange = <K extends keyof HclFoundationConfig>(
    field: K,
    value: HclFoundationConfig[K],
  ) => {
    setUiCapabilityConfig((currentConfig) => ({
      ...currentConfig,
      updatedAt: new Date().toISOString(),
      hcl: {
        ...currentConfig.hcl,
        [field]: value,
      },
    }))
  }
  const handleConversationLoggingChange = (enabled: boolean) => {
    setConversationLoggingEnabled(enabled)
    setConversationLoggingStatus(
      enabled
        ? 'Conversation logging enabled · local server only'
        : 'Conversation logging disabled',
    )
  }
  const handleAutoPollQuietSignalsChange = <K extends keyof AutoPollQuietSignalsConfig>(
    field: K,
    value: AutoPollQuietSignalsConfig[K],
  ) => {
    setAutoPollQuietSignalsConfig((currentConfig) =>
      normalizeAutoPollQuietSignalsClientConfig({
        ...currentConfig,
        [field]: value,
      }),
    )
  }
  const allMainViews: Array<{ id: MainView; label: string }> = [
    { id: 'home', label: t.nav.home },
    { id: 'rooms', label: t.nav.rooms },
    { id: 'lights', label: t.nav.lights },
    { id: 'climate', label: t.nav.climate },
    { id: 'shading', label: t.nav.shading },
    { id: 'camera', label: t.nav.camera },
    { id: 'media', label: t.nav.media },
    { id: 'assistants', label: t.nav.assistants },
    { id: 'calendar', label: t.nav.calendar },
    { id: 'manager', label: t.nav.manager },
  ]
  const getLocalizedMainViewLabel = (view: MainView) => {
    const item = allMainViews.find((candidate) => candidate.id === view)

    if (item) {
      return item.label
    }

    if (view === 'trend-history') {
      return activeLanguage === 'en' ? 'Trend history' : 'Trendhistorikk'
    }

    if (view === 'calendar-manager') {
      return activeLanguage === 'en' ? 'Calendar Manager' : 'Kalender Manager'
    }

    if (view === 'room-manager') {
      return activeLanguage === 'en' ? 'Room Manager' : 'Room Manager'
    }

    return formatMainViewLabel(view)
  }
  const mainViews = allMainViews.filter((view) => {
    const capabilityId = getMainViewCapabilityId(view.id)

    return capabilityId ? isUiCapabilityVisible(resolvedUiCapabilities, capabilityId) : true
  })
  const visibleMainViewIds = mainViews.map((view) => view.id).join('|')
  const activeFloor = floorConfigs.find((floor) => floor.id === activeFloorId) ?? floorConfigs[0]
  const activeGroup = activeFloor?.roomGroup
  const lightingUiEnabled = isUiCapabilityVisible(resolvedUiCapabilities, 'lighting')
  const climateUiEnabled = isUiCapabilityVisible(resolvedUiCapabilities, 'climate')
  const shadingUiEnabled = isUiCapabilityVisible(resolvedUiCapabilities, 'shading')
  const shadingDiagnostics = useMemo(() => {
    const roomByKey = new Map(systemConfigData.rooms.map((room) => [room.key, room]))
    const entries = (systemConfigData.shading ?? []).map((item) => {
      const status = getShadingMappingStatus(item)
      const configuredAddresses = getShadingConfiguredAddresses(item)
      const missingFields = getShadingMissingFields(item)
      const actionAvailability = getShadingActionAvailability(item)
      const room = roomByKey.get(item.roomKey)

      return {
        shadingId: item.id,
        roomId: item.roomKey,
        roomName: room?.name ?? item.roomKey,
        zoneId: item.zoneId ?? '',
        zoneName: item.zoneName ?? item.label,
        label: item.label,
        type: item.type,
        enabled: item.active,
        visible: shadingUiEnabled && item.active && (item.visible ?? true),
        maturity: item.maturity ?? 'foundation',
        status,
        statusLabel: formatShadingStatusLabel(status),
        missingFields,
        missingMapping: status === 'missingMapping',
        partialMapping: status === 'partial',
        liveReady: status === 'ready',
        actionAvailability,
        defaultDpts: actionAvailability.expectedDpts,
        invertUpDown: Boolean(item.invertUpDown),
        invertPosition: Boolean(item.invertPosition),
        configuredAddresses,
        hiddenReason: !shadingUiEnabled
          ? 'capabilityDisabled'
          : !item.active
            ? 'disabled'
            : item.visible === false
              ? 'entryHidden'
              : null,
      }
    })

    return {
      entryCount: entries.length,
      activeCount: entries.filter((entry) => entry.enabled).length,
      visibleCount: entries.filter((entry) => entry.visible).length,
      missingMappingCount: entries.filter((entry) => entry.missingMapping).length,
      partialMappingCount: entries.filter((entry) => entry.partialMapping).length,
      liveReadyCount: entries.filter((entry) => entry.liveReady).length,
      hiddenReason: shadingUiEnabled ? null : 'capabilityDisabled',
      entries,
    }
  }, [shadingUiEnabled, systemConfigData.rooms, systemConfigData.shading])
  const cameraFoundationDiagnostics = useMemo(() => {
    const summary = summarizeCameraFoundation(systemConfigData.camera)
    const roomByKey = new Map(systemConfigData.rooms.map((room) => [room.key, room.name]))
    const entries = (systemConfigData.camera.cameras ?? []).map((camera) => {
      const inputs = getCameraConfiguredInputs(camera)

      return {
        cameraId: camera.cameraId,
        displayName: camera.displayName,
        type: camera.type,
        typeLabel: formatCameraType(camera.type),
        roomId: camera.roomId ?? '',
        roomName: camera.roomId ? roomByKey.get(camera.roomId) ?? camera.roomId : 'Ikke plassert',
        enabled: camera.enabled,
        visible: camera.visible,
        state: camera.state,
        trustStatus: getCameraTrustStatus(camera),
        statusLabel: formatCameraTrustStatus(camera),
        recordingEnabled: camera.recordingEnabled,
        recorderTarget: camera.recorderTarget,
        retentionDays: camera.retentionDays,
        overwriteOldest: camera.overwriteOldest,
        motionAvailable: camera.motionAvailable,
        audioAvailable: camera.audioAvailable,
        confidence: camera.confidence,
        hasRtsp: inputs.rtsp,
        hasOnvif: inputs.onvif,
        hasSnapshot: inputs.snapshot,
        missingStream: !inputs.rtsp && !inputs.onvif && !inputs.snapshot,
      }
    })

    return {
      ...summary,
      entries,
    }
  }, [systemConfigData.camera, systemConfigData.rooms])
  const mediaGroupDiagnostics = useMemo(() => {
    const summary = summarizeMediaGroups(systemConfigData.media)

    return {
      ...summary,
      groups: (systemConfigData.media.groups ?? []).map((group) => ({
        mediaGroupId: group.mediaGroupId,
        displayName: group.displayName,
        enabled: group.enabled,
        state: group.state,
        groupConfidence: group.groupConfidence,
        speakerCount: group.speakers.length,
        castTargetCount: group.castTargets.length,
        delayOffsetCount: group.speakers.filter((speaker) => Number(speaker.offsetMs) !== 0).length,
        status: getMediaGroupStatus(group),
      })),
    }
  }, [systemConfigData.media])
  const autoPollTargetDiagnostics = useMemo(
    () => buildAutoPollTargetDiagnostics(systemConfigData.rooms, autoPollQuietSignalsConfig),
    [autoPollQuietSignalsConfig, systemConfigData.rooms],
  )
  const hclUiCapability = getUiCapabilityById(resolvedUiCapabilities, 'hcl')
  const hclUiFoundationActive = Boolean(hclUiCapability?.visible && hclUiCapability.enabled)
  const serverRoomSnapshots =
    serverRuntimeState.aggregates?.roomSnapshots ??
    serverRuntimeState.snapshot?.roomSnapshots ??
    []
  const serverHistoryPoints = serverRuntimeState.history?.points ?? []
  const getLatestServerHistoryPoint = (
    roomKey: string,
    field: string,
    zoneKey?: string,
    alternateZoneKey?: string,
  ) =>
    serverHistoryPoints
      .filter(
        (point) => {
          const pointField = point.field ?? ''
          const fieldMatches =
            pointField === field ||
            (field === 'setpoint' && pointField === 'setpointFeedback') ||
            (field === 'setpointFeedback' && pointField === 'setpoint') ||
            (field === 'brightness' && pointField === 'valueFeedback') ||
            (field === 'valueFeedback' && pointField === 'brightness')

          return (
            point.roomKey === roomKey &&
            fieldMatches &&
            (zoneKey
              ? point.zoneKey === zoneKey || (alternateZoneKey ? point.zoneKey === alternateZoneKey : false)
              : !point.zoneKey)
          )
        },
      )
      .sort((a, b) => b.timestamp - a.timestamp)[0] ?? null
  const getLatestKnxCacheEntry = (
    roomKey: string,
    field: string,
    zoneKey?: string,
    alternateZoneKey?: string,
  ) =>
    (knxState.snapshot?.groups ?? [])
      .filter(
        (entry) => {
          const entryField = entry.field ?? ''
          const fieldMatches =
            entryField === field ||
            (field === 'setpointFeedback' && entryField === 'setpoint') ||
            (field === 'setpoint' && entryField === 'setpointFeedback') ||
            (field === 'valueFeedback' && entryField === 'brightness') ||
            (field === 'brightness' && entryField === 'valueFeedback')

          return (
            entry.roomKey === roomKey &&
            fieldMatches &&
            (zoneKey
              ? entry.zoneKey === zoneKey || (alternateZoneKey ? entry.zoneKey === alternateZoneKey : false)
              : true)
          )
        },
      )
      .sort((a, b) => b.timestamp - a.timestamp)[0] ?? null
  const getSnapshotDatapoints = (snapshot: (typeof serverRoomSnapshots)[number] | undefined) => {
    const datapoints = snapshot?.latestDatapoints
    return datapoints && typeof datapoints === 'object'
      ? datapoints as {
          climate?: Record<
            string,
            {
              value?: number | string | boolean | null
              source?: string | null
              groupAddress?: string | null
              dpt?: string | null
              dataType?: string | null
              updatedAt?: string | null
              responseSource?: string | null
            }
          >
          zones?: Array<{
            zoneKey?: string | null
            lightOn?: boolean | null
            brightness?: number | null
            source?: string | null
            lightSource?: string | null
            brightnessSource?: string | null
            lightGroupAddress?: string | null
            brightnessGroupAddress?: string | null
            dpt?: string | null
            dataType?: string | null
            updatedAt?: string | null
            responseSource?: string | null
          }>
        }
      : {}
  }
  const getSnapshotZoneEntry = (
    snapshot: (typeof serverRoomSnapshots)[number] | undefined,
    zoneKey: string,
    zoneId?: string,
  ) => {
    const zones = getSnapshotDatapoints(snapshot).zones ?? []
    return zones.find((zone) => zone.zoneKey === zoneKey || (zoneId ? zone.zoneKey === zoneId : false)) ?? null
  }
  const getLineageSource = (
    entry: { source?: string | null; responseSource?: string | null } | null | undefined,
    fallback: string,
  ) => entry?.responseSource ?? entry?.source ?? fallback
  const getLineageTimestamp = (
    entry: { at?: string | null; updatedAt?: string | null; timestamp?: number | string | null } | null | undefined,
  ) => {
    if (!entry) {
      return null
    }

    if (entry.at) {
      return entry.at
    }

    if (entry.updatedAt) {
      return entry.updatedAt
    }

    if (typeof entry.timestamp === 'number') {
      return new Date(entry.timestamp).toISOString()
    }

    return entry.timestamp ?? null
  }
  const getLineageGroupAddress = (
    entry:
      | { groupAddress?: string | null; lightGroupAddress?: string | null; brightnessGroupAddress?: string | null }
      | null
      | undefined,
    kind?: 'light' | 'brightness',
  ) =>
    kind === 'light'
      ? entry?.lightGroupAddress ?? entry?.groupAddress ?? null
      : kind === 'brightness'
        ? entry?.brightnessGroupAddress ?? entry?.groupAddress ?? null
        : entry?.groupAddress ?? null
  const canonicalTruthNow = Date.now()
  const getCanonicalTruthFreshness = (
    source: string,
    timestamp: string | null,
  ): CanonicalTruthFreshness => {
    const normalizedSource = source.toLowerCase()

    if (normalizedSource.includes('optimistic') || normalizedSource.includes('pending')) {
      return 'pending'
    }

    if (normalizedSource.includes('fallback') || normalizedSource.includes('unknown')) {
      return 'offline'
    }

    const parsedTimestamp = timestamp ? Date.parse(timestamp) : NaN
    const ageMs = Number.isFinite(parsedTimestamp) ? canonicalTruthNow - parsedTimestamp : null

    if (normalizedSource.includes('live') || normalizedSource.includes('manual') || normalizedSource.includes('groupvalue')) {
      if (ageMs === null) {
        return 'fresh'
      }
      if (ageMs <= 2 * 60 * 1000) {
        return 'fresh'
      }
      if (ageMs <= 20 * 60 * 1000) {
        return 'aging'
      }
      return 'stale'
    }

    if (normalizedSource.includes('snapshot') || normalizedSource.includes('restored') || normalizedSource.includes('reference')) {
      if (ageMs !== null && ageMs <= 30 * 60 * 1000) {
        return 'aging'
      }
      return 'stale'
    }

    return ageMs !== null && ageMs <= 10 * 60 * 1000 ? 'aging' : 'stale'
  }
  const getCanonicalTruthConfidence = (
    source: string,
    freshness: CanonicalTruthFreshness,
  ): CanonicalTruthConfidence => {
    const normalizedSource = source.toLowerCase()

    if (freshness === 'fresh' && (normalizedSource.includes('live') || normalizedSource.includes('groupvalue'))) {
      return 'high'
    }

    if (freshness === 'pending' || freshness === 'aging') {
      return 'medium'
    }

    return 'low'
  }
  const formatCanonicalNumber = (value: number | null | undefined, unit: '°C' | '%' | '') =>
    typeof value === 'number' && Number.isFinite(value)
      ? `${Number(value.toFixed(unit === '%' && value > 0 && value < 10 ? 1 : 1)).toLocaleString('nb-NO')}${unit}`
      : '—'
  const buildCanonicalTruthField = (
    valueLabel: string,
    source: string,
    groupAddress: string | null,
    timestamp: string | null,
  ): CanonicalTruthField => {
    const freshness = getCanonicalTruthFreshness(source, timestamp)

    return {
      valueLabel,
      source,
      groupAddress,
      freshness,
      confidence: getCanonicalTruthConfidence(source, freshness),
      timestamp,
    }
  }
  const buildAggregateCanonicalTruthField = (
    valueLabel: string,
    fields: CanonicalTruthField[],
  ): CanonicalTruthField => {
    const rankedFreshness: CanonicalTruthFreshness[] = ['pending', 'fresh', 'aging', 'stale', 'offline']
    const freshness =
      rankedFreshness.find((candidate) => fields.some((field) => field.freshness === candidate)) ?? 'offline'
    const primaryField =
      fields.find((field) => field.freshness === freshness) ??
      fields[0] ??
      buildCanonicalTruthField(valueLabel, 'frontendFallback', null, null)

    return {
      valueLabel,
      source: primaryField.source,
      groupAddress: primaryField.groupAddress,
      freshness,
      confidence: getCanonicalTruthConfidence(primaryField.source, freshness),
      timestamp: primaryField.timestamp,
    }
  }
  const resolvedRoomTruthConflicts: string[] = []
  const resolvedRoomTruthSources: Array<{
    roomKey: string
    roomName: string
    temperatureSource: string
    temperatureGroupAddress: string | null
    setpointSource: string
    setpointGroupAddress: string | null
    setpointTimestamp: string | null
    heatDemandSource: string
    heatDemandGroupAddress: string | null
    lightSource: string
    lightGroupAddress: string | null
    brightnessSource: string
    brightnessGroupAddress: string | null
  }> = []
  const canonicalRoomTruthByKey: Record<string, CanonicalRoomTruthSummary> = {}
  const resolvedRooms: Room[] = rooms.map((room) => {
    const serverSnapshot = serverRoomSnapshots.find(
      (snapshot) => snapshot.roomKey === room.key || snapshot.roomId === room.key,
    )
    const snapshotDatapoints = getSnapshotDatapoints(serverSnapshot)
    const snapshotClimate = snapshotDatapoints.climate ?? {}
    const temperatureCache = getLatestKnxCacheEntry(room.key, 'temperature')
    const setpointCache = getLatestKnxCacheEntry(room.key, 'setpointFeedback')
    const heatDemandCache = getLatestKnxCacheEntry(room.key, 'heatDemand')
    const temperatureHistory = getLatestServerHistoryPoint(room.key, 'temperature')
    const setpointHistory = getLatestServerHistoryPoint(room.key, 'setpoint')
    const heatDemandHistory = getLatestServerHistoryPoint(room.key, 'heatDemand')
    const snapshotSetpointTimestamp = snapshotClimate.setpoint?.updatedAt
      ? new Date(snapshotClimate.setpoint.updatedAt).getTime()
      : null
    const setpointHistoryIsNewerThanSnapshot =
      typeof setpointHistory?.value === 'number' &&
      (!snapshotSetpointTimestamp ||
        !Number.isFinite(snapshotSetpointTimestamp) ||
        setpointHistory.timestamp >= snapshotSetpointTimestamp)

    const resolvedTemperature =
      typeof temperatureCache?.decodedValue === 'number'
        ? temperatureCache.decodedValue
        : typeof serverSnapshot?.currentTemperature === 'number'
          ? serverSnapshot.currentTemperature
          : typeof temperatureHistory?.value === 'number'
            ? temperatureHistory.value
            : room.temperature
    const resolvedSetpoint =
      typeof setpointCache?.decodedValue === 'number'
        ? setpointCache.decodedValue
        : setpointHistoryIsNewerThanSnapshot
          ? setpointHistory.value
          : typeof serverSnapshot?.targetTemperature === 'number'
            ? serverSnapshot.targetTemperature
            : typeof setpointHistory?.value === 'number'
              ? setpointHistory.value
            : room.targetTemperature
    const resolvedHeatDemand =
      typeof heatDemandCache?.decodedValue === 'number'
        ? heatDemandCache.decodedValue
        : typeof serverSnapshot?.heatDemand === 'number'
          ? serverSnapshot.heatDemand
          : typeof heatDemandHistory?.value === 'number'
            ? heatDemandHistory.value
            : room.heatDemand ?? null
    const temperatureLineage =
      typeof temperatureCache?.decodedValue === 'number'
        ? {
            source: getLineageSource(temperatureCache, 'liveKnx'),
            groupAddress: temperatureCache.groupAddress ?? null,
            timestamp: getLineageTimestamp(temperatureCache),
          }
        : typeof serverSnapshot?.currentTemperature === 'number'
          ? {
              source: getLineageSource(snapshotClimate.temperature, 'roomSnapshotReference'),
              groupAddress: getLineageGroupAddress(snapshotClimate.temperature),
              timestamp: getLineageTimestamp(snapshotClimate.temperature),
            }
          : typeof temperatureHistory?.value === 'number'
            ? {
                source: getLineageSource(temperatureHistory, 'restoredHistory'),
                groupAddress: temperatureHistory.groupAddress ?? null,
                timestamp: getLineageTimestamp(temperatureHistory),
              }
            : {
                source: 'frontendFallback',
                groupAddress: null,
                timestamp: null,
              }
    const heatDemandLineage =
      typeof heatDemandCache?.decodedValue === 'number'
        ? {
            source: getLineageSource(heatDemandCache, 'liveKnx'),
            groupAddress: heatDemandCache.groupAddress ?? null,
            timestamp: getLineageTimestamp(heatDemandCache),
          }
        : typeof serverSnapshot?.heatDemand === 'number'
          ? {
              source: getLineageSource(snapshotClimate.heatDemand, 'roomSnapshotReference'),
              groupAddress: getLineageGroupAddress(snapshotClimate.heatDemand),
              timestamp: getLineageTimestamp(snapshotClimate.heatDemand),
            }
          : typeof heatDemandHistory?.value === 'number'
            ? {
                source: getLineageSource(heatDemandHistory, 'restoredHistory'),
                groupAddress: heatDemandHistory.groupAddress ?? null,
                timestamp: getLineageTimestamp(heatDemandHistory),
              }
            : {
                source: 'frontendFallback',
                groupAddress: null,
                timestamp: null,
              }
    const setpointLineage =
      typeof setpointCache?.decodedValue === 'number'
        ? {
            source: getLineageSource(setpointCache, 'liveKnx'),
            groupAddress: setpointCache.groupAddress ?? null,
            timestamp: setpointCache.at ?? null,
          }
        : setpointHistoryIsNewerThanSnapshot
          ? {
              source: getLineageSource(setpointHistory, 'restoredHistory'),
              groupAddress: setpointHistory.groupAddress ?? null,
              timestamp: setpointHistory.at ?? null,
            }
        : typeof serverSnapshot?.targetTemperature === 'number'
          ? {
              source: getLineageSource(snapshotClimate.setpoint, 'roomSnapshotReference'),
              groupAddress: getLineageGroupAddress(snapshotClimate.setpoint),
              timestamp: snapshotClimate.setpoint?.updatedAt ?? null,
            }
          : typeof setpointHistory?.value === 'number'
            ? {
                source: getLineageSource(setpointHistory, 'restoredHistory'),
                groupAddress: setpointHistory.groupAddress ?? null,
                timestamp: setpointHistory.at ?? null,
              }
            : {
                source: 'frontendFallback',
                groupAddress: null,
                timestamp: null,
              }

    if (
      typeof temperatureHistory?.value === 'number' &&
      Number.isFinite(room.temperature) &&
      Math.abs(temperatureHistory.value - room.temperature) >= 0.3
    ) {
      resolvedRoomTruthConflicts.push(
        `${room.name}: frontend ${room.temperature}°C vs history ${temperatureHistory.value}°C`,
      )
    }

    const zoneCanonicalFields: Array<{
      light: CanonicalTruthField
      brightness: CanonicalTruthField
    }> = []
    const zones = room.zones.map((zone) => {
      const lightCache = getLatestKnxCacheEntry(room.key, 'lightFeedback', zone.key, zone.id)
      const brightnessCache = getLatestKnxCacheEntry(room.key, 'valueFeedback', zone.key, zone.id)
      const snapshotZone = getSnapshotZoneEntry(serverSnapshot, zone.key, zone.id)
      const brightnessHistory = getLatestServerHistoryPoint(room.key, 'brightness', zone.key, zone.id)
      const resolvedBrightness =
        typeof brightnessCache?.decodedValue === 'number'
          ? brightnessCache.decodedValue
          : typeof snapshotZone?.brightness === 'number'
            ? snapshotZone.brightness
          : typeof brightnessHistory?.value === 'number'
            ? brightnessHistory.value
            : zone.brightness
      const resolvedLightsOn =
        typeof lightCache?.decodedValue === 'boolean'
          ? lightCache.decodedValue
          : typeof snapshotZone?.lightOn === 'boolean'
            ? snapshotZone.lightOn
          : typeof brightnessCache?.decodedValue === 'number'
            ? brightnessCache.decodedValue > 0
            : typeof snapshotZone?.brightness === 'number'
              ? snapshotZone.brightness > 0
            : typeof brightnessHistory?.value === 'number'
              ? brightnessHistory.value > 0
              : zone.lightsOn
      const lightLineage =
        typeof lightCache?.decodedValue === 'boolean'
          ? {
              source: getLineageSource(lightCache, 'liveKnx'),
              groupAddress: lightCache.groupAddress ?? null,
              timestamp: getLineageTimestamp(lightCache),
            }
          : typeof snapshotZone?.lightOn === 'boolean'
            ? {
                source: getLineageSource({ source: snapshotZone.lightSource ?? snapshotZone.source, responseSource: snapshotZone.responseSource }, 'roomSnapshotReference'),
                groupAddress: getLineageGroupAddress(snapshotZone, 'light'),
                timestamp: getLineageTimestamp(snapshotZone),
              }
            : typeof brightnessCache?.decodedValue === 'number'
              ? {
                  source: getLineageSource(brightnessCache, 'liveKnx'),
                  groupAddress: brightnessCache.groupAddress ?? null,
                  timestamp: getLineageTimestamp(brightnessCache),
                }
              : typeof brightnessHistory?.value === 'number'
                ? {
                    source: getLineageSource(brightnessHistory, 'restoredHistory'),
                    groupAddress: brightnessHistory.groupAddress ?? null,
                    timestamp: getLineageTimestamp(brightnessHistory),
                  }
                : { source: 'frontendFallback', groupAddress: null, timestamp: null }
      const brightnessLineage =
        typeof brightnessCache?.decodedValue === 'number'
          ? {
              source: getLineageSource(brightnessCache, 'liveKnx'),
              groupAddress: brightnessCache.groupAddress ?? null,
              timestamp: getLineageTimestamp(brightnessCache),
            }
          : typeof snapshotZone?.brightness === 'number'
            ? {
                source: getLineageSource({ source: snapshotZone.brightnessSource ?? snapshotZone.source, responseSource: snapshotZone.responseSource }, 'roomSnapshotReference'),
                groupAddress: getLineageGroupAddress(snapshotZone, 'brightness'),
                timestamp: getLineageTimestamp(snapshotZone),
              }
            : typeof brightnessHistory?.value === 'number'
              ? {
                  source: getLineageSource(brightnessHistory, 'restoredHistory'),
                  groupAddress: brightnessHistory.groupAddress ?? null,
                  timestamp: getLineageTimestamp(brightnessHistory),
                }
              : { source: 'frontendFallback', groupAddress: null, timestamp: null }
      const optimisticLighting =
        optimisticLightingByKey[getOptimisticLightingKey(room.key, zone.key)] ??
        optimisticLightingByKey[getOptimisticLightingKey(room.key, zone.id)]
      const effectiveLightsOn = optimisticLighting?.expectedLightsOn ?? resolvedLightsOn
      const effectiveBrightness =
        optimisticLighting?.expectedBrightness ?? resolvedBrightness
      const effectiveLightLineage = optimisticLighting
        ? {
            source:
              optimisticLighting.status === 'delayedFeedback'
                ? 'optimisticWriteDelayed'
                : 'optimisticWritePending',
            groupAddress: optimisticLighting.feedbackGroupAddress ?? optimisticLighting.writeGroupAddress,
            timestamp: new Date(optimisticLighting.startedAt).toISOString(),
          }
        : lightLineage
      const effectiveBrightnessLineage = optimisticLighting
        ? {
            source:
              optimisticLighting.status === 'delayedFeedback'
                ? 'optimisticWriteDelayed'
                : 'optimisticWritePending',
            groupAddress: optimisticLighting.feedbackGroupAddress ?? optimisticLighting.writeGroupAddress,
            timestamp: new Date(optimisticLighting.startedAt).toISOString(),
          }
        : brightnessLineage

      if (
        typeof brightnessHistory?.value === 'number' &&
        Math.abs(brightnessHistory.value - zone.brightness) >= 1
      ) {
        resolvedRoomTruthConflicts.push(
          `${room.name}/${zone.name}: frontend ${zone.brightness}% vs history ${brightnessHistory.value}%`,
        )
      }

      if (
        effectiveLightLineage.source !== 'frontendFallback' ||
        effectiveBrightnessLineage.source !== 'frontendFallback'
      ) {
        resolvedRoomTruthSources.push({
          roomKey: room.key,
          roomName: `${room.name}/${zone.name}`,
          temperatureSource: temperatureLineage.source,
          temperatureGroupAddress: temperatureLineage.groupAddress,
          setpointSource: setpointLineage.source,
          setpointGroupAddress: setpointLineage.groupAddress,
          setpointTimestamp: setpointLineage.timestamp,
          heatDemandSource: heatDemandLineage.source,
          heatDemandGroupAddress: heatDemandLineage.groupAddress,
          lightSource: effectiveLightLineage.source,
          lightGroupAddress: effectiveLightLineage.groupAddress,
          brightnessSource: effectiveBrightnessLineage.source,
          brightnessGroupAddress: effectiveBrightnessLineage.groupAddress,
        })
      }

      zoneCanonicalFields.push({
        light: buildCanonicalTruthField(
          effectiveLightsOn ? 'På' : 'Av',
          effectiveLightLineage.source,
          effectiveLightLineage.groupAddress,
          effectiveLightLineage.timestamp,
        ),
        brightness: buildCanonicalTruthField(
          formatCanonicalNumber(effectiveBrightness, '%'),
          effectiveBrightnessLineage.source,
          effectiveBrightnessLineage.groupAddress,
          effectiveBrightnessLineage.timestamp,
        ),
      })

      return {
        ...zone,
        lightsOn: effectiveLightsOn,
        brightness: Math.max(0, Math.min(100, Number(effectiveBrightness.toFixed(1)))),
      }
    })

    resolvedRoomTruthSources.push({
      roomKey: room.key,
      roomName: room.name,
      temperatureSource: temperatureLineage.source,
      temperatureGroupAddress: temperatureLineage.groupAddress,
      setpointSource: setpointLineage.source,
      setpointGroupAddress: setpointLineage.groupAddress,
      setpointTimestamp: setpointLineage.timestamp,
      heatDemandSource: heatDemandLineage.source,
      heatDemandGroupAddress: heatDemandLineage.groupAddress,
      lightSource:
        zones.find((zone) => zone.lightsOn)?.key
          ? 'zoneResolved'
          : serverSnapshot?.lightState === 'off'
            ? 'roomSnapshotReference'
            : 'frontendFallback',
      lightGroupAddress: null,
      brightnessSource:
        zones.some((zone) => Number.isFinite(zone.brightness))
          ? 'zoneResolved'
          : serverSnapshot?.averageBrightness !== null && serverSnapshot?.averageBrightness !== undefined
            ? 'roomSnapshotReference'
            : 'frontendFallback',
      brightnessGroupAddress: null,
    })

    const roomTruthFields = {
      temperature: buildCanonicalTruthField(
        formatCanonicalNumber(resolvedTemperature, '°C'),
        temperatureLineage.source,
        temperatureLineage.groupAddress,
        temperatureLineage.timestamp,
      ),
      setpoint: buildCanonicalTruthField(
        formatCanonicalNumber(resolvedSetpoint, '°C'),
        setpointLineage.source,
        setpointLineage.groupAddress,
        setpointLineage.timestamp,
      ),
      heatDemand: buildCanonicalTruthField(
        typeof resolvedHeatDemand === 'number' ? formatCanonicalNumber(resolvedHeatDemand, '%') : '—',
        heatDemandLineage.source,
        heatDemandLineage.groupAddress,
        heatDemandLineage.timestamp,
      ),
      light: buildAggregateCanonicalTruthField(
        `${zones.filter((zone) => zone.lightsOn).length} på`,
        zoneCanonicalFields.map((field) => field.light),
      ),
      brightness: buildAggregateCanonicalTruthField(
        zones.length > 0
          ? formatCanonicalNumber(
              zones.reduce((sum, zone) => sum + zone.brightness, 0) / zones.length,
              '%',
            )
          : '—',
        zoneCanonicalFields.map((field) => field.brightness),
      ),
    }
    const truthFieldValues = Object.values(roomTruthFields)

    canonicalRoomTruthByKey[room.key] = {
      roomKey: room.key,
      roomName: room.name,
      fields: roomTruthFields,
      optimisticPending: truthFieldValues.some((field) => field.freshness === 'pending'),
      staleCount: truthFieldValues.filter((field) => field.freshness === 'stale' || field.freshness === 'offline').length,
    }

    return {
      ...room,
      temperature: Number(Number(resolvedTemperature).toFixed(1)),
      targetTemperature: Number(Number(resolvedSetpoint).toFixed(1)),
      heatDemand:
        typeof resolvedHeatDemand === 'number'
          ? Number(Number(resolvedHeatDemand).toFixed(1))
          : null,
      zones,
    }
  })
  const canonicalRoomTruthSummaries = Object.values(canonicalRoomTruthByKey)
  const canonicalRoomTruthSourceDistribution = canonicalRoomTruthSummaries.reduce<Record<string, number>>(
    (distribution, summary) => {
      for (const field of Object.values(summary.fields)) {
        distribution[field.source] = (distribution[field.source] ?? 0) + 1
      }
      return distribution
    },
    {},
  )
  const canonicalRoomTruthFreshnessDistribution = canonicalRoomTruthSummaries.reduce<
    Record<CanonicalTruthFreshness, number>
  >(
    (distribution, summary) => {
      for (const field of Object.values(summary.fields)) {
        distribution[field.freshness] += 1
      }
      return distribution
    },
    {
      fresh: 0,
      aging: 0,
      stale: 0,
      offline: 0,
      pending: 0,
    },
  )
  const canonicalRoomTruthDiagnostics = {
    resolver: 'frontend-canonical-resolvedRooms',
    priorityModel: [
      'live KNX feedback',
      'fresh provider/runtime feedback',
      'optimistic pending',
      'recent server snapshot',
      'retained/reference/history',
      'fallback/default',
    ],
    roomCount: canonicalRoomTruthSummaries.length,
    truthDivergenceCount: resolvedRoomTruthConflicts.length,
    crossViewMismatchCount: resolvedRoomTruthConflicts.length,
    optimisticConsistency:
      canonicalRoomTruthFreshnessDistribution.pending === Object.values(optimisticLightingByKey).length
        ? 'aligned'
        : 'watch',
    staleConsistency: canonicalRoomTruthFreshnessDistribution,
    sourceDistribution: canonicalRoomTruthSourceDistribution,
    pendingCount: canonicalRoomTruthFreshnessDistribution.pending,
    staleOrOfflineCount:
      canonicalRoomTruthFreshnessDistribution.stale + canonicalRoomTruthFreshnessDistribution.offline,
    lastReconciliationCorrection: optimisticLightingMetrics.latestRollbackSignals[0] ?? null,
    clientDriftSuspected: runtimeEventStreamState.runtimeDriftSuspected,
    rooms: canonicalRoomTruthSummaries,
  }
  const visibleRooms = activeGroup
    ? resolvedRooms.filter((room) => {
        if (room.group !== activeGroup) {
          return false
        }

        if (activeMainView === 'lights') {
          return lightingUiEnabled && isRoomCapabilityVisible(uiCapabilityConfig, room.key, 'lighting') && room.zones.length > 0
        }

        if (activeMainView === 'climate') {
          return (
            climateUiEnabled &&
            isRoomCapabilityVisible(uiCapabilityConfig, room.key, 'climate') &&
            Boolean(lightingConfig[room.key]?.climateActive)
          )
        }

        if (activeMainView === 'rooms') {
          return true
        }

        return true
      })
    : []
  const visibleRoomKeysSignature = visibleRooms.map((room) => room.key).join('|')
  const activeScopedView: ScopedView =
    activeMainView === 'rooms' || activeMainView === 'lights' || activeMainView === 'climate'
      ? `floor:${activeFloor?.id ?? ''}`
      : activeMainView
  const roomStructureSignature = managerRooms
    .map((room) => `${room.key}:${room.group}:${room.zones.map((zone) => zone.key).join(',')}`)
    .join('|')
  const managerRoomKeysSignature = managerRooms.map((room) => room.key).join('|')
  const climateConfigSignature = systemConfigData.rooms
    .map(
      (room) =>
        `${room.key}:${room.group}:${room.climate.active}:${room.climate.liveActive}:${room.climate.temperature}:${room.climate.setpointFeedback}:${room.climate.heatDemand}`,
    )
    .join('|')

  useEffect(() => {
    const capabilityId = getMainViewCapabilityId(activeMainView)
    if (!capabilityId || isUiCapabilityVisible(resolvedUiCapabilities, capabilityId)) {
      return
    }

    setActiveMainView('home')
  }, [activeMainView, resolvedUiCapabilities, visibleMainViewIds])

  useEffect(() => {
    if (activeMainView !== 'rooms') {
      return
    }

    if (visibleRooms.length === 0) {
      if (selectedRoomKey !== null) {
        setSelectedRoomKey(null)
      }

      return
    }

    if (!selectedRoomKey || !visibleRooms.some((room) => room.key === selectedRoomKey)) {
      setSelectedRoomKey(visibleRooms[0].key)
    }
  }, [activeMainView, activeFloorId, selectedRoomKey, visibleRoomKeysSignature])

  useEffect(() => {
    if (activeMainView !== 'trend-history') {
      return
    }

    if (rooms.length === 0) {
      if (selectedRoomKey !== null) {
        setSelectedRoomKey(null)
      }

      return
    }

    if (!selectedRoomKey || !rooms.some((room) => room.key === selectedRoomKey)) {
      setSelectedRoomKey(rooms[0].key)
    }
  }, [activeMainView, rooms, selectedRoomKey])

  useEffect(() => {
    if (activeMainView !== 'room-manager') {
      return
    }

    if (managerRooms.length === 0) {
      if (selectedRoomKey !== null) {
        setSelectedRoomKey(null)
      }

      return
    }

    if (!selectedRoomKey || !managerRooms.some((room) => room.key === selectedRoomKey)) {
      setSelectedRoomKey(managerRooms[0].key)
    }
  }, [activeMainView, managerRoomKeysSignature, selectedRoomKey])

  const getScopedRoomKeysForView = (view: ScopedView) => {
    if (!view.startsWith('floor:')) {
      return []
    }

    const floorId = view.replace('floor:', '')
    const matchingFloor = floorConfigs.find((floor) => floor.id === floorId)

    if (!matchingFloor) {
      return []
    }

    return rooms
      .filter((room) => room.group === matchingFloor.roomGroup)
      .map((room) => room.key)
  }

  const getScopedManagerRoomKeysForView = (view: ScopedView) => {
    if (!view.startsWith('floor:')) {
      return []
    }

    const floorId = view.replace('floor:', '')
    const matchingFloor = floorConfigs.find((floor) => floor.id === floorId)

    if (!matchingFloor) {
      return []
    }

    return managerRooms
      .filter((room) => room.group === matchingFloor.roomGroup)
      .map((room) => room.key)
  }

  const getLightFeedbackRoomKeysForView = (view: ScopedView) =>
    getScopedManagerRoomKeysForView(view).filter((roomKey) => {
      const roomMapping = lightingConfig[roomKey]

      return Object.values(roomMapping?.zones ?? {}).some(
        (zone) => Boolean(zone.lightFeedback) || Boolean(zone.valueFeedback),
      )
    })

  const getLightFeedbackScopeForView = (view: ScopedView): LightFeedbackViewScope => {
    const strategy = getLightFeedbackStrategy(
      systemMode,
      networkConfig.connectionMode,
      view,
    )

    if (strategy === 'off') {
      return {
        strategy,
        roomKeys: [],
        zoneLabels: [],
      }
    }

    const roomKeys = getLightFeedbackRoomKeysForView(view)
    const zoneLabels = roomKeys.flatMap((roomKey) => {
      const room = managerRooms.find((candidate) => candidate.key === roomKey)
      const roomMapping = lightingConfig[roomKey]

      if (!room || !roomMapping) {
        return []
      }

      return room.zones
        .filter((zone) => {
          const zoneMapping = roomMapping.zones[zone.key]
          return Boolean(zoneMapping?.lightFeedback || zoneMapping?.valueFeedback)
        })
        .map((zone) => `${room.name} / ${zone.name}`)
    })

    return {
      strategy,
      roomKeys,
      zoneLabels,
    }
  }

  const activeLightFeedbackScope =
    activeMainView === 'lights'
      ? getLightFeedbackScopeForView(activeScopedView)
      : { strategy: 'off' as const, roomKeys: [], zoneLabels: [] }
  const activeClimateFeedbackStrategy = getClimateFeedbackRuntimeStrategy(
    systemMode,
    networkConfig.connectionMode,
    runtimeConfig.climateFeedbackMethod,
    activeScopedView,
  )
  const activeLightFeedbackScopeSignature = [
    activeScopedView,
    activeLightFeedbackScope.strategy,
    activeLightFeedbackScope.roomKeys.join(','),
    roomStructureSignature,
  ].join('|')
  const feedbackStrategyLabel =
    systemMode !== 'live'
      ? 'off'
      : activeMainView === 'lights'
        ? activeLightFeedbackScope.strategy === 'polling-fallback'
          ? 'polling'
          : activeLightFeedbackScope.strategy
        : activeMainView === 'climate'
          ? activeClimateFeedbackStrategy.strategy
          : 'off'
  const bridgeStatusLabel =
    bridgeRuntimeStatus === 'ready'
      ? 'Bridge synket'
      : bridgeRuntimeStatus === 'error'
        ? 'Bridge utilgjengelig'
        : 'Bridge oppdateres'
  const zigbee2MqttReadiness = buildZigbee2MqttReadiness(managerMqttConfig, zigbeeDeviceConcepts)
  const mqttRuntimeFoundation = buildMqttRuntimeFoundation(managerMqttConfig, bridgeMqttState.snapshot)
  const hybridRuntimeStates = [
    ...buildHybridRuntimeStates({
      systemMode,
      bridgeReady: bridgeRuntimeStatus === 'ready',
      feedbackActive: feedbackStrategyLabel !== 'off',
      mediaSource: mediaLibrarySource,
      persistedRestored: initialRuntimeState.restored,
      mqttConfigured: managerMqttConfig.enabled && managerMqttConfig.brokerHost.trim().length > 0,
    }),
    getMqttRuntimeIntegrationState(mqttRuntimeFoundation),
    getZigbeeRuntimeState(zigbee2MqttReadiness),
  ]
  const hybridRuntimeSummary = getHybridRuntimeSummary(hybridRuntimeStates)
  const runtimeDeviceContracts = buildRuntimeDeviceContracts({
    systemMode,
    runtimeModeLabel,
    runtimeModeDescription,
    lastRuntimeSnapshotAt,
    bridgeRuntimeStatus,
    bridgeReachable: bridgeHealth.reachable,
    bridgeStatusLabel,
    lastBridgeSyncAt,
    bridgeHealthCheckedAt: bridgeHealth.checkedAt,
    feedbackStrategyLabel,
    lightFeedbackStrategy: activeLightFeedbackScope.strategy,
    climateFeedbackStrategy: activeClimateFeedbackStrategy.strategy,
    castDiscoveryTruthStatus,
    castPlaybackTruthStatus,
    castDiscoveryStatusText,
    castStatus: castTruthSnapshot,
    mediaRoute: selectedMediaRoute,
    mediaRouteLabel,
    mediaRouteReadinessText,
    mediaLibrarySource,
    runtimeAllowsMock,
    mediaPlayer,
    vacuumTruthStatus,
    vacuumStatus: vacuumSnapshot,
    mqttTruthStatus,
    mqttStatus: bridgeMqttState.snapshot,
    mqttSummary: mqttRuntimeFoundation.summary,
  })
  const runtimeContractSummary = getRuntimeContractSummary(runtimeDeviceContracts)
  const appendTestLog = (category: string, text: string) => {
    const at = createDiagnosticPulse(category, text).at
    setTestLog((currentLog) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          at,
          category,
          text,
        },
        ...currentLog,
      ].slice(0, 20),
    )
  }
  const clearTestLog = () => {
    setTestLog([])
  }
  const nivaText = (norwegian: string, english: string) =>
    activeLanguage === 'en' ? english : norwegian
  const getNivaRuntimeLanguageContext = () => {
    const serverSourceDistribution = serverRuntimeState.history?.sourceDistribution ?? {}
    const localSourceDistribution = getRuntimeHistorySourceDistribution(runtimeHistory)
    const getCount = (key: string) => {
      const serverCount = Number(serverSourceDistribution[key] ?? 0)

      return serverCount > 0
        ? serverCount
        : Number(localSourceDistribution[key as keyof typeof localSourceDistribution] ?? 0)
    }
    const liveCount =
      getCount('liveKnx') +
      getCount('manualPoll') +
      getCount('groupValueResponse')
    const restoredCount =
      getCount('restoredHistory') +
      getCount('roomSnapshotReference') +
      (initialRuntimeState.restored ? 1 : 0)
    const sparseCount =
      getCount('derivedQuery') +
      getCount('aggregate') +
      getCount('frontendFallback') +
      getCount('demo') +
      getCount('simulate') +
      getCount('unknown')

    if (liveCount > 0) {
      return {
        mode: 'live' as const,
        sourceSummary:
          activeLanguage === 'en'
            ? `based on live KNX data (${liveCount} live signals)`
            : `basert på live KNX-data (${liveCount} live signaler)`,
      }
    }

    if (restoredCount > 0) {
      return {
        mode: 'restored' as const,
        sourceSummary:
          activeLanguage === 'en'
            ? `based on last-known history (${restoredCount} references)`
            : `basert på sist kjente historikk (${restoredCount} referanser)`,
      }
    }

    return {
      mode: 'sparse' as const,
      sourceSummary:
        sparseCount > 0
          ? activeLanguage === 'en'
            ? `preliminary observation (${sparseCount} sparse/derived signals)`
            : `foreløpig observasjon (${sparseCount} sparsomme/derived signaler)`
          : activeLanguage === 'en'
            ? 'waiting for runtime signals'
            : 'venter på runtime-signaler',
    }
  }
  const recordNivaLanguagePolish = (result: NivaLanguagePolishResult) => {
    setNivaLanguageDiagnostics((current) => ({
      sourceSummary: result.sourceSummary,
      liveWordingCount: current.liveWordingCount + (result.mode === 'live' ? 1 : 0),
      restoredWordingCount: current.restoredWordingCount + (result.mode === 'restored' ? 1 : 0),
      sparseWordingCount: current.sparseWordingCount + (result.mode === 'sparse' ? 1 : 0),
      dedupeCount: current.dedupeCount + result.dedupeCount,
      staleBasedWordingCount: current.staleBasedWordingCount + (result.staleBasedWording ? 1 : 0),
      lastPolishedAt: new Date().toISOString(),
    }))
  }
  const prepareNivaRuntimeText = (text: string) => {
    const result = polishNivaText(text, getNivaRuntimeLanguageContext())
    recordNivaLanguagePolish(result)

    return result.text
  }
  const pushNivaProactiveMessage = (
    key: string,
    text: string,
    cooldownMs = 3 * 60 * 1000,
  ) => {
    const now = Date.now()
    const blockedUntil = nivaProactiveCooldownRef.current[key] ?? 0
    const isQuietMode = nivaQuietModeRef.current
    const isImportantMessage =
      key.startsWith('diagnostic:') ||
      key.startsWith('weather:') ||
      key === 'bridge-back-online' ||
      key === 'first-house-data' ||
      key === 'subscribe-stopped'

    if (blockedUntil > now) {
      return
    }

    if (isQuietMode && !isImportantMessage) {
      nivaProactiveCooldownRef.current[key] = now + cooldownMs * 2
      return
    }

    const effectiveCooldownMs = isQuietMode ? cooldownMs * 2 : cooldownMs
    const polishedText = prepareNivaRuntimeText(text)
    nivaProactiveCooldownRef.current[key] = now + effectiveCooldownMs
    setNivaMessages((currentMessages) => {
      const latestMessage = currentMessages[currentMessages.length - 1]

      if (latestMessage?.role === 'niva' && latestMessage.text === polishedText) {
        return currentMessages
      }

      return [
        ...currentMessages,
        {
          id: `niva-proactive-${key}-${now}`,
          timestamp: now,
          role: 'niva',
          text: polishedText,
          type: 'insight',
          status: 'acknowledged',
          intent: 'system',
        },
      ]
    })
    appendTestLog('NIVA', polishedText)
  }
  const setRuntimeIssue = (message: string) => {
    const pulse = createDiagnosticPulse('Runtime', message)
    setLastRuntimeError(pulse)
    appendTestLog('Feil', message)

    if (message.toLowerCase().includes('timeout')) {
      setLastRuntimeTimeout(pulse)
    }
  }
  const recordKnxOut = (label: string, detail: string) => {
    setLastKnxOut(createDiagnosticPulse(label, detail))
    appendTestLog(label, detail)
  }
  const recordKnxIn = (label: string, detail: string) => {
    setLastKnxIn(createDiagnosticPulse(label, detail))
    appendTestLog(label, detail)
  }
  const recordKnxOutWithMetadata = (
    label: string,
    detail: string,
    extras: Omit<DiagnosticPulse, 'label' | 'detail' | 'at'> = {},
  ) => {
    setLastKnxOut(createDiagnosticPulse(label, detail, extras))
    appendTestLog(label, detail)
  }
  const recordKnxInWithMetadata = (
    label: string,
    detail: string,
    extras: Omit<DiagnosticPulse, 'label' | 'detail' | 'at'> = {},
  ) => {
    setLastKnxIn(createDiagnosticPulse(label, detail, extras))
    appendTestLog(label, detail)
  }
  const appendRuntimeHistory = (points: RuntimeHistoryPoint[]) => {
    if (points.length === 0) {
      return
    }

    setRuntimeHistory((currentHistory) => appendRuntimeHistoryPoints(currentHistory, points))
    setLastRuntimeSnapshotAt(Math.max(...points.map((point) => point.timestamp)))
  }
  const appendClimateHistoryFromEvent = (event: {
    roomKey: string
    field: string
    mappedValue?: string | number | boolean | null
    address?: string | null
    dataType?: string | null
    mappingVariant?: string | null
  }) => {
    const numericValue =
      typeof event.mappedValue === 'number' && Number.isFinite(event.mappedValue)
        ? event.mappedValue
        : null
    if (numericValue === null) {
      return
    }

    const normalizedField =
      event.field === 'setpointFeedback'
        ? 'setpoint'
        : event.field === 'heatDemand'
          ? 'heatDemand'
          : event.field === 'temperature'
            ? 'temperature'
            : null
    if (!normalizedField) {
      return
    }

    appendRuntimeHistory([
      {
        timestamp: Date.now(),
        roomKey: event.roomKey,
        field: normalizedField,
        value: numericValue,
        source: 'knx-subscription',
        category: 'climate',
        confidence: 'high',
        groupAddress: event.address ?? null,
        dpt: event.dataType ?? null,
        dataType: event.dataType ?? null,
        mappingVariant: event.mappingVariant ?? null,
      },
    ])
  }
  const appendLightHistoryFromResult = (
    result: {
      rooms: Room[]
      confirmedLightZoneKeys: string[]
      confirmedBrightnessZoneKeys: string[]
      diagnostics?: Array<{
        roomKey: string
        zoneKey: string
        address: string | null
        dataType: string | null
        interpretationRule: string | null
        mappedValue: boolean | number | string | null
      }>
    },
    source: RuntimeHistoryPoint['source'] = 'light-feedback',
  ) => {
    const timestamp = Date.now()
    const points = (result.diagnostics ?? []).flatMap((diagnostic): RuntimeHistoryPoint[] => {
      const value =
        typeof diagnostic.mappedValue === 'number'
          ? diagnostic.mappedValue
          : typeof diagnostic.mappedValue === 'boolean'
            ? diagnostic.mappedValue
              ? 100
              : 0
            : null
      if (value === null || !Number.isFinite(value)) {
        return []
      }

      return [{
        timestamp,
        roomKey: diagnostic.roomKey,
        zoneKey: diagnostic.zoneKey,
        field: 'brightness',
        value,
        source,
        category: 'runtime',
        confidence: source.includes('subscription') ? 'high' : source.includes('query') ? 'low' : 'medium',
        groupAddress: diagnostic.address ?? null,
        dpt: diagnostic.dataType ?? null,
        dataType: diagnostic.dataType ?? null,
        mappingVariant: diagnostic.interpretationRule ?? null,
      }]
    })
    appendRuntimeHistory(points)
  }
  const todayKey = getRelativeDateKey(0)
  const tomorrowKey = getRelativeDateKey(1)
  const calendarItems: CalendarListItem[] = [
    ...calendarEvents.map((event) => ({
      ...event,
      type: 'event' as const,
    })),
    ...bookings.map((booking) => {
      const resource = bookingResources.find((candidate) => candidate.id === booking.resourceId)

      return {
        id: booking.id,
        type: 'booking' as const,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        title: booking.title,
        person: booking.createdBy,
        place: '',
        note: booking.note,
        resourceName: resource?.name ?? '',
        resourceContext: getBookingResourceContextLabel(resource, scenesConfig, managerRooms),
        bookingStatus: booking.status,
      }
    }),
  ]
  const sortedCalendarEvents = [...calendarItems].sort((a, b) =>
    `${a.date}${a.startTime}${a.title}`.localeCompare(`${b.date}${b.startTime}${b.title}`),
  )
  const todayActivities = sortedCalendarEvents.filter((event) => event.date === todayKey)
  const tomorrowActivities = sortedCalendarEvents.filter((event) => event.date === tomorrowKey)
  const allActivities = sortedCalendarEvents
  const groupedCalendarDays = allActivities.reduce<Array<{ date: string; label: string; events: CalendarListItem[] }>>(
    (groups, event) => {
      const existingGroup = groups.find((group) => group.date === event.date)

      if (existingGroup) {
        existingGroup.events.push(event)
        return groups
      }

      return [
        ...groups,
        {
          date: event.date,
          label:
            event.date === todayKey
              ? 'I dag'
              : event.date === tomorrowKey
                ? 'I morgen'
                : formatCalendarDateLabel(event.date),
          events: [event],
        },
      ]
    },
    [],
  )
  const showFloorNavigation =
    activeMainView === 'rooms' || activeMainView === 'lights' || activeMainView === 'climate'
  const basementEntryVisibleRoom =
    activeMainView === 'climate'
      ? visibleRooms.find((room) => room.key === 'basement-entry') ?? null
      : null
  const activeViewLabel =
    activeMainView === 'rooms' || activeMainView === 'lights' || activeMainView === 'climate'
      ? `${getLocalizedMainViewLabel(activeMainView)} -> ${activeFloor?.label ?? 'Etasje'}`
      : getLocalizedMainViewLabel(activeMainView)
  const activeTargetsLabel =
    activeMainView === 'lights'
      ? activeLightFeedbackScope.strategy === 'off'
        ? 'Ingen soner i bruk nå'
        : `${activeLightFeedbackScope.zoneLabels.length} soner i bruk nå`
      : activeMainView === 'climate'
        ? activeClimateFeedbackStrategy.strategy === 'off'
          ? 'Ingen rom i bruk nå'
          : `${visibleRooms.length} rom i bruk nå`
        : 'Ingen aktive runtime-targets'
  const activeTargetsCount =
    activeMainView === 'lights'
      ? activeLightFeedbackScope.zoneLabels.length
      : activeMainView === 'climate'
        ? visibleRooms.length
        : 0
  const activeClimateSubscribeRoomKeys =
    activeClimateFeedbackStrategy.strategy === 'subscribe'
      ? visibleRooms
          .map((room) => room.key)
          .filter((roomKey) => {
            const roomMapping = lightingConfig[roomKey]

            return (
              Boolean(roomMapping?.climateActive) &&
              Boolean(roomMapping?.liveClimateActive) &&
              hasConfiguredAddress(roomMapping?.temperature)
            )
          })
      : []
  const activeClimateSubscribeRooms = activeClimateSubscribeRoomKeys.map((roomKey) => {
    const room = rooms.find((candidate) => candidate.key === roomKey)
    return room?.name ?? roomKey
  })
  const activeClimateSubscribePointCount = activeClimateSubscribeRoomKeys.reduce(
    (count, roomKey) => {
      const roomMapping = lightingConfig[roomKey]

      if (!roomMapping) {
        return count
      }

      return (
        count +
        (hasConfiguredAddress(roomMapping.temperature) ? 1 : 0) +
        (hasConfiguredAddress(roomMapping.setpointFeedback) ? 1 : 0) +
        (hasConfiguredAddress(roomMapping.heatDemand) ? 1 : 0) +
        (hasConfiguredAddress(roomMapping.modeFeedback) ? 1 : 0)
      )
    },
    0,
  )
  const configuredHeatDemandRoomKeys = rooms
    .map((room) => room.key)
    .filter((roomKey) => hasConfiguredAddress(lightingConfig[roomKey]?.heatDemand))
  const activeHeatDemandSubscribeRoomKeys = activeClimateSubscribeRoomKeys.filter((roomKey) =>
    hasConfiguredAddress(lightingConfig[roomKey]?.heatDemand),
  )
  const heatDemandHistoryPointCount = runtimeHistory.filter((point) => point.field === 'heatDemand').length
  const heatDemandRuntimeStatus = (() => {
    if (configuredHeatDemandRoomKeys.length === 0) {
      return {
        label: 'Ikke konfigurert',
        detail: 'Ingen heatDemand feedback-adresser er konfigurert i SystemConfig.',
      }
    }

    if (liveClimateHeatDemandRoomKeys.length > 0) {
      return {
        label: 'Feedback mottatt',
        detail: `HeatDemand feedback mottatt fra ${liveClimateHeatDemandRoomKeys.length} rom.`,
      }
    }

    if (heatDemandHistoryPointCount > 0) {
      return {
        label: 'Siste kjente verdi',
        detail: 'HeatDemand bygger på historikk/siste kjente verdi, men ingen fersk feedback er mottatt.',
      }
    }

    if (activeClimateFeedbackStrategy.strategy === 'subscribe' && activeHeatDemandSubscribeRoomKeys.length > 0) {
      return {
        label: 'Venter på feedback',
        detail: 'Subscribe-scope inkluderer heatDemand, men ingen varmefeedback er mottatt ennå.',
      }
    }

    if (activeClimateFeedbackStrategy.strategy !== 'off' && activeHeatDemandSubscribeRoomKeys.length === 0) {
      return {
        label: 'Ikke i aktiv scope',
        detail: 'HeatDemand er konfigurert, men aktiv visning har ingen heatDemand-punkter i scope.',
      }
    }

    return {
      label: 'Ingen KNX feedback',
      detail: 'Ingen KNX heatDemand feedback er registrert i denne app-sessionen.',
    }
  })()
  const lightFeedbackStatus: FeedbackStatusSnapshot = (() => {
    if (systemMode !== 'live') {
      return {
        label: 'Deaktivert',
        reason: `${runtimeModeLabel} er valgt`,
      }
    }

    if (activeMainView === 'manager') {
      return {
        label: 'Deaktivert',
        reason: 'Manager kjører ikke live feedback',
      }
    }

    if (activeMainView !== 'lights') {
      return {
        label: 'Deaktivert',
        reason: 'Lys-feedback er bare aktiv i Lys-visningen',
      }
    }

    if (activeLightFeedbackScope.strategy === 'off') {
      return {
        label: 'Deaktivert',
        reason: 'Valgt visning har ingen aktiv lys-feedback-strategi',
      }
    }

    if (activeLightFeedbackScope.zoneLabels.length === 0) {
      return {
        label: 'Ingen aktive targets',
        reason: 'Ingen lyssoner med feedback i aktiv visning',
      }
    }

    if (lastRuntimeError?.detail.includes('Live feedback fra KNX er utilgjengelig') && !lastKnxIn) {
      return {
        label: 'Utilgjengelig',
        reason: 'Bridge/API-feil ved lys-feedback',
      }
    }

    if (lastKnxIn) {
      return {
        label: 'Aktiv',
        reason: 'Bridge har mottatt KNX-feedback',
      }
    }

    return {
      label: 'Venter',
      reason:
        activeLightFeedbackScope.strategy === 'subscribe'
          ? 'Subscribe er startet, venter på KNX-event'
          : 'Polling-fallback er klar, venter på første svar',
    }
  })()
  const climateFeedbackStatus: FeedbackStatusSnapshot = (() => {
    if (systemMode !== 'live') {
      return {
        label: 'Deaktivert',
        reason: `${runtimeModeLabel} er valgt`,
      }
    }

    if (activeMainView === 'manager') {
      return {
        label: 'Deaktivert',
        reason: 'Manager kjører ikke live klima-feedback',
      }
    }

    if (activeMainView !== 'climate') {
      return {
        label: 'Deaktivert',
        reason: 'Klima-feedback er bare aktiv i Klima-visningen',
      }
    }

    if (activeClimateFeedbackStrategy.strategy === 'off') {
      return {
        label: 'Deaktivert',
        reason: activeClimateFeedbackStrategy.reason,
      }
    }

    if (activeClimateFeedbackStrategy.strategy === 'subscribe' && activeClimateSubscribePointCount === 0) {
      return {
        label: 'Ingen aktive targets',
        reason: 'Ingen klima-punkter med live feedback i aktiv visning',
      }
    }

    if (lastClimateError && !lastClimateEvent) {
      return {
        label: 'Utilgjengelig',
        reason: lastClimateError.detail,
      }
    }

    if (lastClimateEvent) {
      return {
        label: 'Aktiv',
        reason: 'Bridge har mottatt klima-feedback',
      }
    }

    return {
      label: 'Venter',
      reason:
        activeClimateFeedbackStrategy.strategy === 'subscribe'
          ? 'Subscribe er startet, venter på klima-event'
          : 'Polling-fallback er klar, venter på første svar',
    }
  })()
  const isFeedbackUnavailableMessage = errorMessage.includes('Live feedback fra KNX er utilgjengelig')
  const hasActiveFeedbackUnavailableStatus =
    lightFeedbackStatus.label === 'Utilgjengelig' || climateFeedbackStatus.label === 'Utilgjengelig'
  const visibleRuntimeError =
    lastRuntimeError?.detail.includes('Live feedback fra KNX er utilgjengelig') &&
    !hasActiveFeedbackUnavailableStatus
      ? null
      : lastRuntimeError
  const diagnosticsUpdatedAt =
    lastClimateEvent?.at ??
    lastClimateError?.at ??
    lastKnxIn?.at ??
    lastKnxOut?.at ??
    lastRuntimeError?.at ??
    lastRuntimeTimeout?.at ??
    bridgeHealth.checkedAt ??
    lastBridgeSyncAt ??
    runtimeConfigPushState.lastRuntimeConfigPushAttemptAt ??
    runtimeConfigPushState.lastRuntimeConfigPushAt ??
    null
  const mqttBaseTopic = getMqttBaseTopic(savedSystemConfigData)
  const lastKnxInMqttMatch =
    lastKnxIn?.address ? findMqttTopicsForKnxAddress(savedSystemConfigData, lastKnxIn.address)[0] ?? null : null
  const lastKnxOutMqttMatch =
    lastKnxOut?.address ? findMqttTopicsForKnxAddress(savedSystemConfigData, lastKnxOut.address)[0] ?? null : null
  const frontendAccessDiagnostics = getFrontendAccessDiagnostics(networkConfig)
  const bridgeApiDiagnostics = getBridgeApiDiagnostics()
  const learningSuggestionCandidates = useMemo(() => {
    const buckets = new Map<
      string,
      { roomKey: string; roomName: string; zoneKey: string | null; hour: number; brightness: number; count: number }
    >()

    for (const point of runtimeHistory) {
      if (point.field !== 'brightness' || !Number.isFinite(point.value)) {
        continue
      }

      const sourceCategory = classifyRuntimeHistorySource(point)
      if (!['liveKnx', 'manualPoll', 'groupValueResponse'].includes(sourceCategory)) {
        continue
      }

      const brightness = Math.round(point.value / 5) * 5
      if (brightness <= 0 || brightness >= 100) {
        continue
      }

      const hour = new Date(point.timestamp).getHours()
      const roomName =
        resolvedRooms.find((room) => room.key === point.roomKey)?.name ?? point.roomKey
      const zoneKey = point.zoneKey ?? null
      const key = `${point.roomKey}:${zoneKey ?? 'room'}:${hour}:${brightness}`
      const current = buckets.get(key)

      buckets.set(key, {
        roomKey: point.roomKey,
        roomName,
        zoneKey,
        hour,
        brightness,
        count: (current?.count ?? 0) + 1,
      })
    }

    return Array.from(buckets.values())
      .filter((candidate) => candidate.count >= 3)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [resolvedRooms, runtimeHistory])
  const heatPowerDiagnostics = useMemo(() => {
    const climateRooms = systemConfigData.rooms.filter((room) => room.climate.active)
    const roomsWithConfiguredHeatPower = climateRooms.filter(
      (room) => typeof room.heatPowerWatts === 'number' && Number.isFinite(room.heatPowerWatts),
    )
    const roomsWithNominalHeatPower = climateRooms.filter(
      (room) => typeof room.nominalPowerWatts === 'number' && Number.isFinite(room.nominalPowerWatts),
    )
    const roomsMissingHeatPower = climateRooms
      .filter(
        (room) =>
          !(typeof room.heatPowerWatts === 'number' && Number.isFinite(room.heatPowerWatts)) &&
          !(typeof room.nominalPowerWatts === 'number' && Number.isFinite(room.nominalPowerWatts)),
      )
      .map((room) => ({ roomKey: room.key, roomName: room.name }))

    return {
      roomCount: systemConfigData.rooms.length,
      climateRoomCount: climateRooms.length,
      configuredHeatPowerCount: roomsWithConfiguredHeatPower.length,
      nominalPowerCount: roomsWithNominalHeatPower.length,
      heatPowerCoveragePercent:
        climateRooms.length > 0
          ? Math.round(((climateRooms.length - roomsMissingHeatPower.length) / climateRooms.length) * 100)
          : 0,
      roomsMissingHeatPower,
    }
  }, [systemConfigData.rooms])
  const optimisticLightingDiagnostics = useMemo(() => {
    const entries = Object.values(optimisticLightingByKey)
    const averageFeedbackLatencyMs =
      optimisticLightingMetrics.feedbackLatencySamples > 0
        ? Math.round(
            optimisticLightingMetrics.totalFeedbackLatencyMs /
              optimisticLightingMetrics.feedbackLatencySamples,
          )
        : null

    return {
      optimisticStateCount: entries.length,
      pendingFeedbackCount: entries.filter((entry) => entry.status === 'pendingFeedback').length,
      delayedFeedbackCount: entries.filter((entry) => entry.status === 'delayedFeedback').length,
      averageFeedbackLatencyMs,
      rollbackCount: optimisticLightingMetrics.rollbackCount,
      failedWriteCount: optimisticLightingMetrics.failedWriteCount,
      createdCount: optimisticLightingMetrics.createdCount,
      confirmedCount: optimisticLightingMetrics.confirmedCount,
      timeoutMs: optimisticLightingTimeoutMs,
      calmIndicatorsActive: true,
      tooltipSystemActive: true,
      activeEntries: entries.map((entry) => ({
        key: entry.key,
        roomName: entry.roomName,
        zoneName: entry.zoneName,
        expectedLightsOn: entry.expectedLightsOn,
        expectedBrightness: entry.expectedBrightness,
        source: entry.source,
        status: entry.status,
        ageMs: Math.max(0, Date.now() - entry.startedAt),
        startedAt: new Date(entry.startedAt).toISOString(),
        timeoutAt: new Date(entry.timeoutAt).toISOString(),
        writeGroupAddress: entry.writeGroupAddress,
        feedbackGroupAddress: entry.feedbackGroupAddress,
        message: entry.lastMessage,
      })),
      latestDelayedSignals: optimisticLightingMetrics.latestDelayedSignals,
      latestRollbackSignals: optimisticLightingMetrics.latestRollbackSignals,
    }
  }, [optimisticLightingByKey, optimisticLightingMetrics])
  const knxMonitorRoomOptions = useMemo(
    () =>
      rooms
        .map((room) => ({ key: room.key, label: room.name }))
        .sort((first, second) => first.label.localeCompare(second.label)),
    [rooms],
  )
  const knxMonitorSourceOptions = useMemo(
    () =>
      Array.from(new Set(knxMonitorEvents.map((event) => event.source).filter(Boolean))).sort(),
    [knxMonitorEvents],
  )
  const knxMonitorSignalTypeOptions = useMemo(
    () =>
      Array.from(new Set(knxMonitorEvents.map((event) => event.signalType).filter(Boolean))).sort(),
    [knxMonitorEvents],
  )
  const filteredKnxMonitorEvents = useMemo(() => {
    const search = knxMonitorFilters.search.trim().toLowerCase()
    return knxMonitorEvents
      .filter((event) => {
        if (knxMonitorFilters.roomKey !== 'all' && event.roomKey !== knxMonitorFilters.roomKey) {
          return false
        }
        if (knxMonitorFilters.direction !== 'all' && event.direction !== knxMonitorFilters.direction) {
          return false
        }
        if (knxMonitorFilters.source !== 'all' && event.source !== knxMonitorFilters.source) {
          return false
        }
        if (knxMonitorFilters.signalType !== 'all' && event.signalType !== knxMonitorFilters.signalType) {
          return false
        }
        if (knxMonitorFilters.onlyWrites && event.direction !== 'write') {
          return false
        }
        if (knxMonitorFilters.onlyFeedback && !['feedback', 'read'].includes(event.direction)) {
          return false
        }
        if (knxMonitorFilters.onlyStale && !event.stale && event.tone !== 'stale' && !event.error) {
          return false
        }
        if (!search) {
          return true
        }
        const haystack = [
          event.groupAddress,
          event.dpt,
          event.dataType,
          event.source,
          event.signalType,
          event.field,
          event.normalizedField,
          event.roomName,
          event.roomKey,
          event.zoneName,
          event.zoneKey,
          String(event.decodedValue ?? ''),
          String(event.rawValue ?? ''),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(search)
      })
      .slice()
      .reverse()
  }, [knxMonitorEvents, knxMonitorFilters])
  const latestKnxMonitorEvent = knxMonitorEvents[knxMonitorEvents.length - 1] ?? null
  const knxMonitorUiDiagnostics = {
    ...(knxDiagnosticsState.snapshot?.monitor ?? knxMonitorDiagnostics ?? {}),
    active: knxDiagnosticsState.snapshot?.monitor?.active ?? knxMonitorDiagnostics?.active ?? false,
    localEventCount: knxMonitorEvents.length,
    filteredEventCount: filteredKnxMonitorEvents.length,
    paused: knxMonitorPaused,
    windowMode: knxMonitorWindowMode,
    error: knxMonitorError,
  }
  const describeKnxMonitorEvent = (event: KnxMonitorEvent) =>
    [
      event.at,
      event.direction,
      event.groupAddress ?? 'GA —',
      event.dpt ?? 'DPT —',
      event.signalType,
      String(event.decodedValue ?? '—'),
      event.source,
      event.roomName ?? event.roomKey ?? 'ukjent rom',
      event.zoneName ?? event.zoneKey ?? '',
    ]
      .filter(Boolean)
      .join(' · ')
  const handleCopyKnxMonitorEvent = (event: KnxMonitorEvent) => {
    const text = describeKnxMonitorEvent(event)
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text)
    }
  }
  const handleExportKnxMonitorEvents = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      filters: knxMonitorFilters,
      diagnostics: knxMonitorUiDiagnostics,
      events: filteredKnxMonitorEvents,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `lynell-knx-monitor-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    link.click()
    URL.revokeObjectURL(url)
  }
  const diagnosticsSnapshot = {
    frontendLoadedAt,
    bridgeBaseUrl: getBridgeBaseUrl(),
    bridgeApiDiagnostics,
    systemConfigTrust: serverConfigDiagnostics ?? bridgeHealth.snapshot?.systemConfig ?? null,
    systemConfigSource,
    sceneScheduler: bridgeHealth.snapshot?.sceneScheduler ?? null,
    heatPowerDiagnostics,
    optimisticLightingDiagnostics,
    audioDiagnostics: {
      enabled: systemConfigData.audio.enabled,
      manifestCount: audioManifestSummary.count,
      placeholderCount: audioManifestSummary.placeholderCount,
      missingFiles: lynellAudioDiagnostics?.missingFiles ?? [],
      lastSoundPlayed: audioLastPlayback ?? lynellAudioDiagnostics?.lastSoundPlayed ?? null,
      categoriesEnabled: systemConfigData.audio.categories,
    },
    idleScreenDiagnostics: {
      enabled: systemConfigData.idleScreen.enabled,
      idleTimeoutSeconds: systemConfigData.idleScreen.idleTimeoutSeconds,
      customImageConfigured: Boolean(systemConfigData.idleScreen.customImageDataUrl),
      usingCustomImage:
        systemConfigData.idleScreen.useCustomImage &&
        Boolean(systemConfigData.idleScreen.customImageDataUrl),
      currentlyVisible: idleScreenVisible,
      lastActivityAt: new Date(lastIdleActivityAt).toISOString(),
    },
    knxMonitor: knxMonitorUiDiagnostics,
    conversationLoggingEnabled,
    conversationLoggingStatus,
    autoPollQuietSignals: autoPollQuietSignalsConfig,
    autoPollTargetDiagnostics,
    shadingDiagnostics: {
      ...shadingDiagnostics,
      ...((knxDiagnosticsState.snapshot?.shading as Record<string, unknown> | undefined) ?? {}),
      entries: shadingDiagnostics.entries,
    },
    cameraFoundationDiagnostics,
    mediaGroupDiagnostics,
    conversationFeedbackReview: serverConfigDiagnostics?.conversationFeedbackReview ?? null,
    learningSuggestionFoundation: {
      enabled: false,
      proposalOnly: true,
      actionExecution: false,
      approvalRequiredFuture: true,
      candidateCount: learningSuggestionCandidates.length,
      candidates: learningSuggestionCandidates,
    },
    frontendHost: frontendAccessDiagnostics.frontendHost,
    frontendAccessMode: frontendAccessDiagnostics.frontendAccessMode,
    localFrontendUrl: buildFrontendUrl(networkConfig.appLocalHost, networkConfig.appLocalPort),
    vpnFrontendUrl: buildFrontendUrl(networkConfig.vpnHost, networkConfig.vpnPort),
    vpnEnabled: networkConfig.vpnEnabled,
    vpnReady: networkConfig.vpnEnabled && networkConfig.vpnHost.trim().length > 0,
    preferredConnection: networkConfig.preferredConnection,
    bridgeReachable: bridgeHealth.reachable,
    bridgeHealthCheckedAt: bridgeHealth.checkedAt,
    bridgeHealthError: bridgeHealth.error,
    bridgeRuntimeConfigReceived: bridgeHealth.snapshot?.runtimeConfigReceived ?? false,
    bridgeHealthConnectionMode: bridgeHealth.snapshot?.connectionMode ?? null,
    bridgeHealthWriteMappingCounts: bridgeHealth.snapshot?.writeMappingCounts ?? null,
    bridgeLightSubscribeActive: bridgeHealth.snapshot?.lightSubscribeActive ?? false,
    bridgeClimateSubscribeActive: bridgeHealth.snapshot?.climateSubscribeActive ?? false,
    bridgeStatus: bridgeRuntimeStatus,
    bridgeStatusLabel,
    bridgeSyncedAt: lastBridgeSyncAt,
    runtimeConfigSyncAttempted: runtimeConfigPushState.runtimeConfigSyncAttempted,
    runtimeConfigSyncSkippedReason: runtimeConfigPushState.runtimeConfigSyncSkippedReason,
    runtimeConfigSyncPosted: runtimeConfigPushState.runtimeConfigSyncPosted,
    runtimeConfigSyncPostFailed: runtimeConfigPushState.runtimeConfigSyncPostFailed,
    lastManualRuntimeConfigTriggerAt: runtimeConfigPushState.lastManualRuntimeConfigTriggerAt,
    lastRuntimeConfigPostUrl: runtimeConfigPushState.lastRuntimeConfigPostUrl,
    lastRuntimeConfigPayloadPreview: runtimeConfigPushState.lastRuntimeConfigPayloadPreview,
    lastRuntimeConfigPostStatus: runtimeConfigPushState.lastRuntimeConfigPostStatus,
    lastRuntimeConfigPostError: runtimeConfigPushState.lastRuntimeConfigPostError,
    runtimeConfigBuilderReady: runtimeConfigPayloadSummary.totalRuntimeTargets > 0,
    runtimeConfigBuilderRoomCount: runtimeConfigPayloadSummary.roomCount,
    runtimeConfigBuilderMappingCounts: {
      write: runtimeConfigPayloadSummary.totalWriteMappings,
      feedback: runtimeConfigPayloadSummary.totalFeedbackMappings,
      targets: runtimeConfigPayloadSummary.totalRuntimeTargets,
    },
    lastRuntimeConfigPushAttemptAt: runtimeConfigPushState.lastRuntimeConfigPushAttemptAt,
    lastRuntimeConfigPushAt: runtimeConfigPushState.lastRuntimeConfigPushAt,
    lastRuntimeConfigPushOk: runtimeConfigPushState.lastRuntimeConfigPushOk,
    lastRuntimeConfigPushError: runtimeConfigPushState.lastRuntimeConfigPushError,
    latestRuntimeConfigPayloadSummary:
      runtimeConfigPushState.latestRuntimeConfigPayloadSummary ?? runtimeConfigPayloadSummary,
    lastUpdatedAt: diagnosticsUpdatedAt,
    systemMode,
    connectionMode: networkConfig.connectionMode,
    lightFeedbackStrategy: activeLightFeedbackScope.strategy,
    lightFeedbackStatus: lightFeedbackStatus.label,
    lightFeedbackReason: lightFeedbackStatus.reason,
    climateFeedbackStrategy: activeClimateFeedbackStrategy.strategy,
    climateFeedbackRequestedMethod: activeClimateFeedbackStrategy.requestedMethod,
    climateFeedbackReason: activeClimateFeedbackStrategy.reason,
    climateFeedbackStatus: climateFeedbackStatus.label,
    climateFeedbackStatusReason: climateFeedbackStatus.reason,
    climateSubscribePointCount: activeClimateSubscribePointCount,
    climateSubscribeRooms: activeClimateSubscribeRooms,
    heatDemandStatus: heatDemandRuntimeStatus.label,
    heatDemandStatusDetail: heatDemandRuntimeStatus.detail,
    heatDemandConfiguredRoomCount: configuredHeatDemandRoomKeys.length,
    heatDemandLiveRoomCount: liveClimateHeatDemandRoomKeys.length,
    heatDemandHistoryPointCount,
    lastClimateEvent,
    lastClimateError,
    activeViewLabel,
    activeTargetsLabel,
    activeTargetsCount,
    mqttEnabled: savedSystemConfigData.mqtt.enabled,
    mqttBaseTopic,
    mqttStatus: bridgeMqttState.snapshot,
    lastKnxInMqttTopic: lastKnxInMqttMatch?.topic ?? null,
    lastKnxOutMqttTopic: lastKnxOutMqttMatch?.topic ?? null,
    lastKnxIn,
    lastKnxOut,
    lastRuntimeError: visibleRuntimeError,
    lastRuntimeTimeout,
    testLog,
    runtimeContracts: runtimeDeviceContracts,
    serverRuntimeState: serverRuntimeState.snapshot,
    serverRuntimeHistory: serverRuntimeState.history,
    serverRuntimeAggregates: serverRuntimeState.aggregates,
    serverRuntimeInsights: serverRuntimeState.insights,
    serverRuntimeCheckedAt: serverRuntimeState.checkedAt,
    serverRuntimeError: serverRuntimeState.error,
    nivaLanguageDiagnostics,
    runtimeEventStream: runtimeEventStreamState,
    integrationManager: integrationManagerState.snapshot,
    integrationManagerCheckedAt: integrationManagerState.checkedAt,
    integrationManagerError: integrationManagerState.error,
    castRuntime: castTruthSnapshot,
    vacuumRuntime: bridgeVacuumState.snapshot,
    knxDiagnostics: knxDiagnosticsState.snapshot,
    knxDiagnosticsCheckedAt: knxDiagnosticsState.checkedAt,
    knxDiagnosticsError: knxDiagnosticsState.error,
    resolvedRoomTruthConflicts,
    resolvedRoomTruthSources,
    canonicalRoomTruthDiagnostics,
    nivaIntentGaps,
    nivaSessionMemory,
  }
  const nivaDiagnosticInsight = getNivaDiagnosticInsight({
    bridgeReachable: bridgeHealth.reachable,
    runtimeConfigReceived: bridgeHealth.snapshot?.runtimeConfigReceived,
    bridgeError: bridgeHealth.error,
    latestRuntimeError: visibleRuntimeError?.detail,
    latestClimateError: lastClimateError?.detail,
    systemMode,
    activeMainView,
    feedbackStrategyLabel,
  })

  useEffect(() => {
    const now = Date.now()
    const confirmations: Array<{ entry: OptimisticLightingEntry; latencyMs: number }> = []
    const rollbacks: Array<{ entry: OptimisticLightingEntry; reason: string }> = []
    const delayed: OptimisticLightingEntry[] = []

    setOptimisticLightingByKey((current) => {
      let changed = false
      const next = { ...current }

      for (const [key, entry] of Object.entries(current)) {
        const lightCache = getLatestKnxCacheEntry(entry.roomKey, 'lightFeedback', entry.zoneKey, entry.zoneId)
        const brightnessCache = getLatestKnxCacheEntry(entry.roomKey, 'valueFeedback', entry.zoneKey, entry.zoneId)
        const lightIsFresh =
          typeof lightCache?.decodedValue === 'boolean' &&
          typeof lightCache.timestamp === 'number' &&
          lightCache.timestamp >= entry.startedAt - 300
        const brightnessIsFresh =
          typeof brightnessCache?.decodedValue === 'number' &&
          typeof brightnessCache.timestamp === 'number' &&
          brightnessCache.timestamp >= entry.startedAt - 300

        if (brightnessIsFresh) {
          const actualBrightness = Math.max(0, Math.min(100, Math.round(Number(brightnessCache?.decodedValue))))
          if (Math.abs(actualBrightness - entry.expectedBrightness) <= 1) {
            confirmations.push({ entry, latencyMs: Math.max(0, (brightnessCache?.timestamp ?? now) - entry.startedAt) })
          } else {
            rollbacks.push({
              entry,
              reason: `feedback ${actualBrightness}% avvek fra sendt ${entry.expectedBrightness}%`,
            })
          }
          delete next[key]
          changed = true
          continue
        }

        if (lightIsFresh) {
          const actualLightsOn = Boolean(lightCache?.decodedValue)
          if (actualLightsOn === entry.expectedLightsOn) {
            confirmations.push({ entry, latencyMs: Math.max(0, (lightCache?.timestamp ?? now) - entry.startedAt) })
          } else {
            rollbacks.push({
              entry,
              reason: `feedback ${actualLightsOn ? 'på' : 'av'} avvek fra sendt ${entry.expectedLightsOn ? 'på' : 'av'}`,
            })
          }
          delete next[key]
          changed = true
          continue
        }

        if (now >= entry.timeoutAt && entry.status === 'pendingFeedback') {
          next[key] = {
            ...entry,
            status: 'delayedFeedback',
            lastMessage: 'Sist sendte verdi vises midlertidig. KNX-feedback er forsinket.',
          }
          delayed.push(next[key])
          changed = true
        }
      }

      return changed ? next : current
    })

    if (confirmations.length === 0 && rollbacks.length === 0 && delayed.length === 0) {
      return
    }

    setOptimisticLightingMetrics((current) => ({
      ...current,
      confirmedCount: current.confirmedCount + confirmations.length,
      rollbackCount: current.rollbackCount + rollbacks.length,
      delayedFeedbackCount: current.delayedFeedbackCount + delayed.length,
      totalFeedbackLatencyMs:
        current.totalFeedbackLatencyMs +
        confirmations.reduce((sum, item) => sum + item.latencyMs, 0),
      feedbackLatencySamples: current.feedbackLatencySamples + confirmations.length,
      latestDelayedSignals: [
        ...delayed.map((entry) => ({
          key: entry.key,
          roomName: entry.roomName,
          zoneName: entry.zoneName,
          expectedBrightness: entry.expectedBrightness,
          ageMs: Math.max(0, now - entry.startedAt),
          at: new Date(now).toISOString(),
        })),
        ...current.latestDelayedSignals,
      ].slice(0, 8),
      latestRollbackSignals: [
        ...rollbacks.map(({ entry, reason }) => ({
          key: entry.key,
          roomName: entry.roomName,
          zoneName: entry.zoneName,
          reason,
          at: new Date(now).toISOString(),
        })),
        ...current.latestRollbackSignals,
      ].slice(0, 8),
    }))
  }, [knxState.snapshot?.timestamp, optimisticLightingByKey])

  useEffect(() => {
    const pendingEntries = Object.values(optimisticLightingByKey).filter(
      (entry) => entry.status === 'pendingFeedback',
    )

    if (pendingEntries.length === 0) {
      return undefined
    }

    const nextTimeoutAt = Math.min(...pendingEntries.map((entry) => entry.timeoutAt))
    const timeoutId = window.setTimeout(() => {
      const now = Date.now()
      const delayed: OptimisticLightingEntry[] = []

      setOptimisticLightingByKey((current) => {
        let changed = false
        const next = { ...current }

        for (const [key, entry] of Object.entries(current)) {
          if (entry.status !== 'pendingFeedback' || now < entry.timeoutAt) {
            continue
          }

          next[key] = {
            ...entry,
            status: 'delayedFeedback',
            lastMessage: 'Sist sendte verdi vises midlertidig. KNX-feedback er forsinket.',
          }
          delayed.push(next[key])
          changed = true
        }

        return changed ? next : current
      })

      if (delayed.length > 0) {
        setOptimisticLightingMetrics((current) => ({
          ...current,
          delayedFeedbackCount: current.delayedFeedbackCount + delayed.length,
          latestDelayedSignals: [
            ...delayed.map((entry) => ({
              key: entry.key,
              roomName: entry.roomName,
              zoneName: entry.zoneName,
              expectedBrightness: entry.expectedBrightness,
              ageMs: Math.max(0, now - entry.startedAt),
              at: new Date(now).toISOString(),
            })),
            ...current.latestDelayedSignals,
          ].slice(0, 8),
        }))
      }
    }, Math.max(80, nextTimeoutAt - Date.now()))

    return () => window.clearTimeout(timeoutId)
  }, [optimisticLightingByKey])

  useEffect(() => {
    const result = bridgeHealth.snapshot?.sceneScheduler?.lastExecutionResult as
      | {
          sceneId?: string
          sceneName?: string
          executedAt?: string
          targetResults?: Array<Record<string, unknown>>
        }
      | null
      | undefined

    if (!result || !Array.isArray(result.targetResults)) {
      return
    }

    const executionAt =
      result.executedAt ??
      bridgeHealth.snapshot?.sceneScheduler?.lastExecution?.executedAt ??
      null
    const executionKey = `${result.sceneId ?? 'scene'}:${executionAt ?? 'unknown'}`

    if (lastSchedulerOptimisticExecutionRef.current === executionKey) {
      return
    }

    lastSchedulerOptimisticExecutionRef.current = executionKey
    const startedAt = executionAt ? Date.parse(executionAt) : Date.now()

    for (const target of result.targetResults) {
      if (target.type !== 'brightness' || target.ok === false) {
        continue
      }

      const roomKey = typeof target.room === 'string' ? target.room : null
      const zoneKey = typeof target.zone === 'string' ? target.zone : null
      const brightness = Number(target.brightness)

      if (!roomKey || !zoneKey || !Number.isFinite(brightness)) {
        continue
      }

      const currentRoom = roomsRef.current.find((room) => room.key === roomKey)
      const currentZone = currentRoom?.zones.find((zone) => zone.key === zoneKey || zone.id === zoneKey)

      if (!currentRoom || !currentZone) {
        continue
      }

      const feedback = getLatestKnxCacheEntry(currentRoom.key, 'valueFeedback', currentZone.key, currentZone.id)
      if (
        typeof feedback?.timestamp === 'number' &&
        Number.isFinite(startedAt) &&
        feedback.timestamp >= startedAt - 300
      ) {
        continue
      }

      registerOptimisticLighting({
        room: currentRoom,
        zone: currentZone,
        brightness,
        source: 'scene',
      })
      setRooms((currentRooms) =>
        currentRooms.map((room) =>
          room.id === currentRoom.id
            ? {
                ...room,
                zones: room.zones.map((zone) =>
                  zone.id === currentZone.id
                    ? {
                        ...zone,
                        lightsOn: brightness > 0,
                        brightness: Math.max(0, Math.min(100, Math.round(brightness))),
                      }
                    : zone,
                ),
              }
            : room,
        ),
      )
    }
  }, [bridgeHealth.snapshot?.sceneScheduler?.lastExecutionResult])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentClock(new Date())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    knxMonitorPausedRef.current = knxMonitorPaused
  }, [knxMonitorPaused])

  useEffect(() => {
    let cancelled = false

    getKnxMonitorSnapshot(500)
      .then((snapshot) => {
        if (cancelled) {
          return
        }
        setKnxMonitorEvents(snapshot.events ?? [])
        setKnxMonitorDiagnostics(snapshot.diagnostics ?? null)
        setKnxMonitorError(null)
      })
      .catch((error) => {
        if (cancelled) {
          return
        }
        setKnxMonitorError(error instanceof Error ? error.message : 'KNX monitor kunne ikke lastes')
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    lastIdleActivityAtRef.current = lastIdleActivityAt
  }, [lastIdleActivityAt])

  useEffect(() => {
    if (!systemConfigData.idleScreen.enabled) {
      setIdleScreenVisible(false)
      return undefined
    }

    const timeoutMs = Math.max(10, systemConfigData.idleScreen.idleTimeoutSeconds) * 1000
    const markActivity = () => {
      const now = Date.now()
      lastIdleActivityAtRef.current = now
      setLastIdleActivityAt(now)
      setIdleScreenVisible(false)
    }
    const activityEvents = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true })
    })

    const intervalId = window.setInterval(() => {
      if (Date.now() - lastIdleActivityAtRef.current >= timeoutMs) {
        setIdleScreenVisible(true)
      }
    }, 1000)

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity)
      })
      window.clearInterval(intervalId)
    }
  }, [systemConfigData.idleScreen.enabled, systemConfigData.idleScreen.idleTimeoutSeconds])

  useEffect(() => {
    roomsRef.current = rooms
  }, [rooms])

  useEffect(() => {
    let cancelled = false

    async function loadMediaLibrary() {
      try {
        const response = await fetchLocalMediaLibrary()

        if (cancelled) {
          return
        }

        if (response.tracks.length === 0) {
          setMediaLibrary([])
          setMediaLibrarySource('empty')
          setMediaLibraryMessage('Ingen lokale MP3-filer funnet')
          setMediaPlayer((currentPlayer) => ({
            ...currentPlayer,
            currentTrackId: null,
            queueTrackIds: [],
            isPlaying: false,
            elapsed: 0,
            updatedAt: Date.now(),
          }))
          return
        }

        setMediaLibrary(response.tracks)
        setMediaLibrarySource('local')
        setMediaLibraryMessage('Lokalt bibliotek aktivt')
        setMediaPlayer((currentPlayer) => ({
          ...currentPlayer,
          currentTrackId: response.tracks.some((track) => track.id === currentPlayer.currentTrackId)
            ? currentPlayer.currentTrackId
            : response.tracks[0]?.id ?? null,
          queueTrackIds: response.tracks.map((track) => track.id),
          elapsed: 0,
          updatedAt: Date.now(),
        }))
      } catch {
        if (cancelled) {
          return
        }

        if (!runtimeAllowsMock) {
          setMediaLibrary([])
          setMediaLibrarySource('empty')
          setMediaLibraryMessage('Live Mode: lokalt bibliotek er ikke tilgjengelig, og demo-bibliotek er skjult.')
          setMediaPlayer((currentPlayer) => ({
            ...currentPlayer,
            currentTrackId: null,
            queueTrackIds: [],
            isPlaying: false,
            elapsed: 0,
            updatedAt: Date.now(),
          }))
          return
        }

        const fallbackLibrary = getMockMediaLibrary()
        setMediaLibrary(fallbackLibrary)
        setMediaLibrarySource('mock')
        setMediaLibraryMessage(`${runtimeModeLabel}: demo-bibliotek`)
        setMediaPlayer((currentPlayer) => ({
          ...currentPlayer,
          currentTrackId: fallbackLibrary.some((track) => track.id === currentPlayer.currentTrackId)
            ? currentPlayer.currentTrackId
            : fallbackLibrary[0]?.id ?? null,
          queueTrackIds: fallbackLibrary.map((track) => track.id),
          elapsed: 0,
          updatedAt: Date.now(),
        }))
      }
    }

    void loadMediaLibrary()

    return () => {
      cancelled = true
    }
  }, [runtimeAllowsMock, runtimeModeLabel])

  useEffect(
    () => () => {
      if (nivaProcessingTimeoutRef.current !== null) {
        window.clearTimeout(nivaProcessingTimeoutRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    if (!mediaPlayer.isPlaying || !currentMediaTrack || currentMediaTrack.sourceUrl) {
      return
    }

    const intervalId = window.setInterval(() => {
      setMediaPlayer((currentPlayer) => {
        const activeTrack = getTrackById(mediaLibrary, currentPlayer.currentTrackId)
        const result = tickMediaProgress(currentPlayer, activeTrack?.duration ?? null)

        return result.completed ? skipMediaTrack(result.state, 'next') : result.state
      })
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [currentMediaTrack, mediaLibrary, mediaPlayer.isPlaying])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    if (selectedMediaRoute === 'cast') {
      audio.pause()
      return
    }

    audio.volume = mediaPlayer.volume / 100
  }, [mediaPlayer.volume, selectedMediaRoute])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio || !currentMediaTrack?.sourceUrl) {
      return
    }

    if (selectedMediaRoute === 'cast') {
      audio.pause()
      return
    }

    if (audio.src !== currentMediaTrack.sourceUrl) {
      audio.src = currentMediaTrack.sourceUrl
      audio.load()
    }

    if (mediaPlayer.isPlaying) {
      void audio.play().catch(() => {
        setMediaPlayer((currentPlayer) => ({ ...currentPlayer, isPlaying: false, updatedAt: Date.now() }))
      })
    } else {
      audio.pause()
    }
  }, [currentMediaTrack?.id, currentMediaTrack?.sourceUrl, mediaPlayer.isPlaying, selectedMediaRoute])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    const handleLoadedMetadata = () => {
      if (!currentMediaTrack || !Number.isFinite(audio.duration)) {
        return
      }

      setMediaLibrary((currentLibrary) =>
        currentLibrary.map((track) =>
          track.id === currentMediaTrack.id
            ? { ...track, duration: Math.round(audio.duration) }
            : track,
        ),
      )
    }
    const handleTimeUpdate = () => {
      setMediaPlayer((currentPlayer) => ({
        ...currentPlayer,
        elapsed: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
        updatedAt: Date.now(),
      }))
    }
    const handleEnded = () => {
      setMediaPlayer((currentPlayer) => skipMediaTrack(currentPlayer, 'next'))
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [currentMediaTrack])

  useEffect(() => {
    if (!vacuumDevices.some((device) => device.cleaning || device.status === 'returning')) {
      return
    }

    const intervalId = window.setInterval(() => {
      setVacuumDevices((currentDevices) => currentDevices.map(tickMockVacuum))
    }, 4000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [vacuumDevices])

  useEffect(() => {
    if (!nivaDiagnosticInsight.hasIssue) {
      nivaDiagnosticMessageKeyRef.current = null
      return
    }

    if (nivaDiagnosticMessageKeyRef.current === nivaDiagnosticInsight.key) {
      return
    }

    nivaDiagnosticMessageKeyRef.current = nivaDiagnosticInsight.key
    pushNivaProactiveMessage(
      `diagnostic:${nivaDiagnosticInsight.key}`,
      nivaDiagnosticInsight.response,
      5 * 60 * 1000,
    )
  }, [nivaDiagnosticInsight.hasIssue, nivaDiagnosticInsight.key, nivaDiagnosticInsight.response])

  useEffect(() => {
    const previousReachable = nivaBridgeReachableRef.current
    nivaBridgeReachableRef.current = bridgeHealth.reachable

    if (previousReachable === false && bridgeHealth.reachable === true) {
      pushNivaProactiveMessage('bridge-back-online', 'Lynell er tilbake online.', 60 * 1000)
    }
  }, [bridgeHealth.reachable])

  useEffect(() => {
    if (nivaFirstHouseDataSeenRef.current || (!lastKnxIn && !lastClimateEvent)) {
      return
    }

    nivaFirstHouseDataSeenRef.current = true
    pushNivaProactiveMessage('first-house-data', 'Jeg får nå data fra huset.', 5 * 60 * 1000)
  }, [lastKnxIn, lastClimateEvent])

  useEffect(() => {
    if (!lastKnxIn && !lastClimateEvent) {
      return
    }

    setLastLiveSignalAt(Date.now())
  }, [lastKnxIn, lastClimateEvent])

  useEffect(() => {
    const subscribeActive = Boolean(
      bridgeHealth.snapshot?.lightSubscribeActive ||
        bridgeHealth.snapshot?.climateSubscribeActive,
    )
    const previousSubscribeActive = nivaSubscribeActiveRef.current
    nivaSubscribeActiveRef.current = subscribeActive

    if (
      previousSubscribeActive === true &&
      !subscribeActive &&
      systemMode === 'live' &&
      networkConfig.connectionMode === 'localDirect'
    ) {
      pushNivaProactiveMessage(
        'subscribe-stopped',
        'Live oppdateringer ser ut til å være stoppet nå.',
        5 * 60 * 1000,
      )
    }
  }, [
    bridgeHealth.snapshot?.climateSubscribeActive,
    bridgeHealth.snapshot?.lightSubscribeActive,
    networkConfig.connectionMode,
    systemMode,
  ])

  useEffect(() => {
    let isMounted = true

    const checkBridgeHealth = async () => {
      const checkedAt = createDiagnosticPulse('Bridge health', 'Sjekket').at

      try {
        const snapshot = await getBridgeHealth()

        if (!isMounted) {
          return
        }

        setBridgeHealth({
          reachable: true,
          checkedAt,
          error: null,
          snapshot,
        })

        if (bridgeHealthLogStateRef.current !== 'ok') {
          appendTestLog('Bridge', 'health OK')
          bridgeHealthLogStateRef.current = 'ok'
        }
      } catch (error) {
        if (!isMounted) {
          return
        }

        const message =
          error instanceof Error
            ? error.message
            : 'Bridge health kunne ikke leses'

        setBridgeHealth({
          reachable: false,
          checkedAt,
          error: message,
          snapshot: null,
        })

        if (bridgeHealthLogStateRef.current !== message) {
          appendTestLog('Bridge', `health feil: ${message}`)
          bridgeHealthLogStateRef.current = message
        }
      }
    }

    void checkBridgeHealth()
    const intervalId = window.setInterval(checkBridgeHealth, 15000)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  const refreshKnxRuntimeSnapshots = async (isCurrent: () => boolean = () => true) => {
    const checkedAt = createDiagnosticPulse('KNX subscription', 'Sjekket').at

    try {
      const [snapshot, stateSnapshot] = await Promise.all([
        getKnxDiagnostics(),
        getKnxState(),
      ])

      if (!isCurrent()) {
        return
      }

      setKnxDiagnosticsState({
        checkedAt,
        error: null,
        snapshot,
      })
      setKnxState({
        checkedAt,
        error: null,
        snapshot: stateSnapshot,
      })
    } catch (error) {
      if (!isCurrent()) {
        return
      }

      setKnxDiagnosticsState((current) => ({
        ...current,
        checkedAt,
        error:
          error instanceof Error
            ? error.message
            : 'KNX subscription diagnostics kunne ikke leses',
      }))
      setKnxState((current) => ({
        ...current,
        checkedAt,
        error:
          error instanceof Error
            ? error.message
            : 'KNX state cache kunne ikke leses',
      }))
    }
  }

  useEffect(() => {
    let isMounted = true

    void refreshKnxRuntimeSnapshots(() => isMounted)
    const intervalId = window.setInterval(() => {
      void refreshKnxRuntimeSnapshots(() => isMounted)
    }, 15000)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  const handleIntegrationLifecycleAction = async (
    provider: string,
    action: 'enable' | 'disable' | 'activate' | 'deactivate',
  ) => {
    const checkedAt = createDiagnosticPulse('Integration lifecycle', action).at

    try {
      await updateIntegrationProviderLifecycle(provider, action)
      const snapshot = await getIntegrationProviders()

      setIntegrationManagerState({
        checkedAt,
        error: null,
        snapshot,
      })
      appendTestLog('Integration lifecycle', `${provider}: ${action}`)
    } catch (error) {
      setIntegrationManagerState((current) => ({
        ...current,
        checkedAt,
        error: error instanceof Error ? error.message : 'Lifecycle kunne ikke oppdateres',
      }))
    }
  }

  const handleRuntimeActionApproval = async (actionId: string, decision: 'approve' | 'deny') => {
    const checkedAt = createDiagnosticPulse('Runtime approval', decision).at

    try {
      if (decision === 'approve') {
        await approveRuntimeAction(actionId)
      } else {
        await denyRuntimeAction(actionId)
      }

      const snapshot = await getIntegrationProviders()
      setIntegrationManagerState({
        checkedAt,
        error: null,
        snapshot,
      })
      appendTestLog('Runtime approval', `${decision}: ${actionId}`)
    } catch (error) {
      setIntegrationManagerState((current) => ({
        ...current,
        checkedAt,
        error: error instanceof Error ? error.message : 'Approval kunne ikke oppdateres',
      }))
    }
  }

  const refreshIntegrationManagerSnapshot = async (checkedAt: string) => {
    const snapshot = await getIntegrationProviders()

    setIntegrationManagerState({
      checkedAt,
      error: null,
      snapshot,
    })
  }

  const handleStartDeltacoIdentify = async (physicalOrder = 1) => {
    const checkedAt = createDiagnosticPulse('Deltaco identify', 'Startet').at

    try {
      const snapshot = await startDeltacoTuyaIdentifySession(physicalOrder)

      setDeltacoIdentifyState({
        checkedAt,
        error: null,
        snapshot,
      })
      await refreshIntegrationManagerSnapshot(checkedAt)
      appendTestLog('Deltaco identify', `Startet for Lampe ${physicalOrder}`)
    } catch (error) {
      setDeltacoIdentifyState((current) => ({
        ...current,
        checkedAt,
        error: error instanceof Error ? error.message : 'Identify-session kunne ikke startes',
      }))
    }
  }

  const handleObserveDeltacoIdentify = async () => {
    const checkedAt = createDiagnosticPulse('Deltaco identify', 'Observert').at

    try {
      const snapshot = await observeDeltacoTuyaIdentifySession()

      setDeltacoIdentifyState({
        checkedAt,
        error: null,
        snapshot,
      })
      await refreshIntegrationManagerSnapshot(checkedAt)
      appendTestLog('Deltaco identify', snapshot.manualCandidate
        ? `${snapshot.manualCandidate.lampName}: ${snapshot.manualCandidate.candidateIp} (${snapshot.manualCandidate.confidence})`
        : 'Ingen tydelig kandidat ennå')
    } catch (error) {
      setDeltacoIdentifyState((current) => ({
        ...current,
        checkedAt,
        error: error instanceof Error ? error.message : 'Identify-session kunne ikke observeres',
      }))
    }
  }

  const handleConfirmDeltacoMapping = async (
    ip: string,
    physicalOrder: number,
    displayName?: string,
  ) => {
    const checkedAt = createDiagnosticPulse('Deltaco mapping', 'Bekreftet').at

    try {
      const result = await confirmDeltacoTuyaMapping({ ip, physicalOrder, displayName })
      const snapshot = await getIntegrationProviders()

      setIntegrationManagerState({
        checkedAt,
        error: null,
        snapshot,
      })
      appendTestLog(
        'Deltaco mapping',
        result.mapping
          ? `${result.mapping.displayName}: ${result.mapping.ip} bekreftet`
          : `${displayName ?? `Lampe ${physicalOrder}`}: ${ip} bekreftet`,
      )
    } catch (error) {
      setIntegrationManagerState((current) => ({
        ...current,
        checkedAt,
        error: error instanceof Error ? error.message : 'Mapping kunne ikke bekreftes',
      }))
    }
  }

  const handleRunDeltacoProtocolResearch = async () => {
    const checkedAt = createDiagnosticPulse('Deltaco protocol', 'Observert').at

    try {
      const snapshot = await getDeltacoTuyaProtocolResearch()
      const providers = await getIntegrationProviders()

      setDeltacoProtocolResearchState({
        checkedAt,
        error: null,
        snapshot,
      })
      setIntegrationManagerState({
        checkedAt,
        error: null,
        snapshot: providers,
      })
      appendTestLog(
        'Deltaco protocol',
        `${snapshot.deviceCount} enheter observert · ${snapshot.summary.protocolHints.join(', ') || 'ingen hints'}`,
      )
    } catch (error) {
      setDeltacoProtocolResearchState((current) => ({
        ...current,
        checkedAt,
        error: error instanceof Error ? error.message : 'Protocol research kunne ikke kjøres',
      }))
    }
  }

  useEffect(() => {
    let isMounted = true

    const checkMqttStatus = async () => {
      const checkedAt = createDiagnosticPulse('MQTT status', 'Sjekket').at

      try {
        const snapshot = await getMqttStatus()

        if (!isMounted) {
          return
        }

        setBridgeMqttState({
          checkedAt,
          error: null,
          snapshot,
        })
      } catch (error) {
        if (!isMounted) {
          return
        }

        setBridgeMqttState({
          checkedAt,
          error: error instanceof Error ? error.message : 'MQTT-status er ikke tilgjengelig',
          snapshot: null,
        })
      }
    }

    void checkMqttStatus()
    const intervalId = window.setInterval(checkMqttStatus, 15000)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    serverRuntimeHistoryRef.current = serverRuntimeState.history
  }, [serverRuntimeState.history])

  useEffect(() => {
    runtimeEventUpdateTokensRef.current = runtimeEventUpdateTokens
  }, [runtimeEventUpdateTokens])

  useEffect(() => {
    roomPollStateByKeyRef.current = roomPollStateByKey
  }, [roomPollStateByKey])

  useEffect(() => {
    let isMounted = true

    const registerClient = async () => {
      try {
        const snapshot = await registerRuntimeClient(systemMode)
        if (!isMounted) {
          return
        }
        setRuntimeEventStreamState((current) => ({
          ...current,
          clientIdentity: snapshot,
        }))
      } catch (error) {
        if (!isMounted) {
          return
        }
        setRuntimeEventStreamState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : 'Runtime client registration failed',
        }))
      }
    }

    void registerClient()

    return () => {
      isMounted = false
    }
  }, [systemMode])

  useEffect(() => {
    let isMounted = true
    let timeoutId: number | null = null

    const checkServerRuntimeState = async () => {
      const checkedAt = createDiagnosticPulse('Server runtime', 'Sjekket').at
      const refreshStartedAt = performance.now()

      try {
        const [snapshot, history, aggregates, insights] = await Promise.all([
          getServerRuntimeState(),
          getServerRuntimeHistory(600, { range: 'week', category: 'all' }),
          getServerRuntimeAggregates(),
          getServerRuntimeInsights(12),
        ])

        if (!isMounted) {
          return
        }

        setServerRuntimeState({
          checkedAt,
          error: null,
          snapshot,
          history,
          aggregates,
          insights,
        })
        setRuntimeEventStreamState((current) => {
          const refreshMs = performance.now() - refreshStartedAt
          const nextAverage = current.averageRuntimeRefreshTime === null
            ? refreshMs
            : current.averageRuntimeRefreshTime * 0.85 + refreshMs * 0.15

          return {
            ...current,
            averageRuntimeRefreshTime: nextAverage,
          }
        })
      } catch (error) {
        if (!isMounted) {
          return
        }

        setServerRuntimeState({
          checkedAt,
          error: error instanceof Error ? error.message : 'Server runtime-state er ikke tilgjengelig',
          snapshot: null,
          history: null,
          aggregates: null,
          insights: null,
        })
      }
    }

    const scheduleNext = () => {
      timeoutId = window.setTimeout(async () => {
        await checkServerRuntimeState()
        if (isMounted) {
          scheduleNext()
        }
      }, runtimePollingIntervalMsRef.current)
    }

    void checkServerRuntimeState()
    scheduleNext()

    return () => {
      isMounted = false
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [])

  useEffect(() => {
    let refreshTimer: number | null = null

    const scheduleRuntimeRefresh = () => {
      if (refreshTimer !== null) {
        return
      }

      refreshTimer = window.setTimeout(async () => {
        refreshTimer = null
        const checkedAt = createDiagnosticPulse('Runtime stream', 'Oppdatert').at
        const refreshStartedAt = performance.now()
        try {
          const [snapshot, history, aggregates, insights] = await Promise.all([
            getServerRuntimeState(),
            getServerRuntimeHistory(600, { range: 'week', category: 'all' }),
            getServerRuntimeAggregates(),
            getServerRuntimeInsights(12),
          ])
          setServerRuntimeState({
            checkedAt,
            error: null,
            snapshot,
            history,
            aggregates,
            insights,
          })
          setRuntimeEventStreamState((current) => {
            const refreshMs = performance.now() - refreshStartedAt
            const nextAverage = current.averageRuntimeRefreshTime === null
              ? refreshMs
              : current.averageRuntimeRefreshTime * 0.85 + refreshMs * 0.15

            return {
              ...current,
              fallbackRefreshCount: current.fallbackRefreshCount + 1,
              averageRuntimeRefreshTime: nextAverage,
            }
          })
        } catch (error) {
          setServerRuntimeState((current) => ({
            ...current,
            checkedAt,
            error: error instanceof Error ? error.message : 'Runtime stream refresh feilet',
          }))
        }
      }, 700)
    }

    const mergeRuntimeEvent = (event: RuntimeEventPayload) => {
      if (event.type === 'knxMonitorEvent' && event.monitorEvent) {
        const monitorEvent = event.monitorEvent
        const feedbackMatch = shadingConfigRef.current.find(
          (item) =>
            item.feedbackPosition &&
            item.feedbackPosition.trim() === String(monitorEvent.groupAddress ?? '').trim(),
        )
        if (feedbackMatch && typeof monitorEvent.decodedValue === 'number') {
          const feedbackValue = monitorEvent.decodedValue
          setShadingCommandStateById((current) => {
            const existing = current[feedbackMatch.id]
            return {
              ...current,
              [feedbackMatch.id]: {
                shadingId: feedbackMatch.id,
                action: existing?.action ?? 'setPosition',
                value: existing?.value ?? feedbackValue,
                status: 'confirmed',
                startedAt: existing?.startedAt ?? monitorEvent.timestamp,
                timeoutAt: existing?.timeoutAt ?? Date.now(),
                lastMessage: 'Bekreftet av feedbackPosition',
                groupAddress: existing?.groupAddress ?? null,
                feedbackGroupAddress: monitorEvent.groupAddress ?? feedbackMatch.feedbackPosition ?? null,
                confirmedAt: monitorEvent.at,
                feedbackValue,
              },
            }
          })
        }

        if (!knxMonitorPausedRef.current) {
          setKnxMonitorEvents((current) => {
            if (current.some((candidate) => candidate.id === monitorEvent.id)) {
              return current
            }
            return [...current, monitorEvent].slice(-1200)
          })
        }
      }

      const reduced = applyRuntimeEvent(
        {
          history: serverRuntimeHistoryRef.current,
          updateTokens: runtimeEventUpdateTokensRef.current,
          roomPollStateByKey: roomPollStateByKeyRef.current,
        },
        event,
      )

      serverRuntimeHistoryRef.current = reduced.history
      runtimeEventUpdateTokensRef.current = reduced.updateTokens
      roomPollStateByKeyRef.current = reduced.roomPollStateByKey

      setRuntimeEventUpdateTokens(reduced.updateTokens)
      setRoomPollStateByKey(reduced.roomPollStateByKey)
      setServerRuntimeState((currentRuntime) => ({
        ...currentRuntime,
        checkedAt: event.at,
        history: reduced.history,
      }))
      setRuntimeEventStreamState((current) => ({
        ...current,
        lastAppliedEventId: reduced.lastAppliedEventId,
        reducerStatus: reduced.reducerStatus,
        reducerApplyCount: reduced.reducerStatus === 'applied'
          ? current.reducerApplyCount + 1
          : current.reducerApplyCount,
        staleTransitions: event.type === 'runtimeFreshnessChanged'
          ? current.staleTransitions + 1
          : current.staleTransitions,
        averageReducerTime: current.averageReducerTime === null
          ? reduced.reducerDurationMs
          : current.averageReducerTime * 0.85 + reduced.reducerDurationMs * 0.15,
        lastEventChain: reduced.eventLineage,
        resyncRequiredCount: reduced.resyncRequired
          ? current.resyncRequiredCount + 1
          : current.resyncRequiredCount,
      }))

      if (reduced.shouldRefreshRuntime || reduced.resyncRequired) {
        scheduleRuntimeRefresh()
      }
    }

    const unsubscribe = subscribeToRuntimeEventStream(
      mergeRuntimeEvent,
      (status) => {
        setRuntimeEventStreamState((current) => {
          const latencyMs = status.latencyMs ?? current.latencyMs
          const nextAverageLatency =
            typeof status.latencyMs === 'number'
              ? current.averageEventLatency === null
                ? status.latencyMs
                : current.averageEventLatency * 0.85 + status.latencyMs * 0.15
              : current.averageEventLatency
          const maxEventLatency =
            typeof status.latencyMs === 'number'
              ? Math.max(current.maxEventLatency ?? 0, status.latencyMs)
              : current.maxEventLatency
          const nextEventsPerMinute = status.eventsLastMinute ?? current.eventsLastMinute
          const nextConnectionState = status.connectionState ?? (status.connected ? 'synced' : current.connectionState)
          const lastSuccessfulSyncAt = status.lastSuccessfulSyncAt ?? current.lastSuccessfulSyncAt
          const nextLastEventAt = status.lastEventAt ?? current.lastEventAt
          const freshnessAnchor = nextLastEventAt ?? lastSuccessfulSyncAt
          const frontendStateAgeMs = freshnessAnchor ? Math.max(0, Date.now() - Date.parse(freshnessAnchor)) : null
          const frontendFreshness =
            status.frontendFreshness ??
            (frontendStateAgeMs === null
              ? 'stale'
              : frontendStateAgeMs > current.offlineAfterMs
                ? 'offline'
                : frontendStateAgeMs > current.staleAfterMs
                  ? 'stale'
                  : 'fresh')
          const runtimeEventHealthy =
            status.connected &&
            nextConnectionState === 'synced' &&
            frontendFreshness === 'fresh' &&
            nextEventsPerMinute >= 0 &&
            !status.error
          const degradedEventStream =
            !status.connected ||
            Boolean(status.error) ||
            nextConnectionState === 'stale' ||
            nextConnectionState === 'offline' ||
            frontendFreshness !== 'fresh'
          const pollingFallbackMode = degradedEventStream ? 'elevated' : nextEventsPerMinute > 0 ? 'relaxed' : 'steady'
          runtimePollingIntervalMsRef.current =
            pollingFallbackMode === 'elevated' ? 45000 : pollingFallbackMode === 'relaxed' ? 180000 : 120000
          const shouldRecordReconnectState =
            nextConnectionState !== current.connectionState ||
            (status.reconnectAttempt ?? current.reconnectAttempt) !== current.reconnectAttempt ||
            status.connected !== current.connected
          const reconnectHistory = shouldRecordReconnectState
            ? [
                {
                  at: new Date().toISOString(),
                  state: nextConnectionState,
                  attempt: status.reconnectAttempt ?? current.reconnectAttempt,
                  delayMs: status.reconnectDelayMs ?? null,
                  lastEventId: status.lastKnownEventId ?? status.lastAppliedEventId ?? current.lastAppliedEventId,
                },
                ...current.reconnectHistory,
              ].slice(0, 12)
            : current.reconnectHistory
          const staleStateCount =
            current.staleStateCount + (frontendFreshness === 'stale' && current.frontendFreshness !== 'stale' ? 1 : 0)
          const offlineStateCount =
            current.offlineStateCount +
            (frontendFreshness === 'offline' && current.frontendFreshness !== 'offline' ? 1 : 0)

          return {
            ...current,
            connected: status.connected,
            connectionState: nextConnectionState,
            reconnectAttempt: status.reconnectAttempt ?? current.reconnectAttempt,
            reconnectDelayMs: status.reconnectDelayMs ?? (status.connected ? null : current.reconnectDelayMs),
            reconnectCount: status.reconnectCount ?? current.reconnectCount + (status.connected ? 0 : 1),
            eventsLastMinute: nextEventsPerMinute,
            pollingRequestsPerMinute: status.pollingRequestsPerMinute ?? current.pollingRequestsPerMinute,
            fallbackRefreshCount: status.fallbackRefreshCount ?? current.fallbackRefreshCount,
            replayedEvents: status.replayedEvents ?? current.replayedEvents,
            droppedEvents: status.droppedEvents ?? current.droppedEvents,
            eventBufferSize: status.eventBufferSize ?? current.eventBufferSize,
            latestEventId: status.latestEventId ?? current.latestEventId,
            lastAppliedEventId: status.lastAppliedEventId ?? current.lastAppliedEventId,
            replaySupported: status.replaySupported ?? current.replaySupported,
            resyncRequiredCount: status.resyncRequiredCount ?? current.resyncRequiredCount,
            runtimeEventHealthy,
            degradedEventStream,
            pollingFallbackMode,
            fallbackPollingStatus:
              pollingFallbackMode === 'elevated'
                ? 'event stream degraded · fallback polling 45s'
                : pollingFallbackMode === 'relaxed'
                  ? 'event stream healthy · fallback polling 180s'
                  : 'runtime fallback polling 120s',
            averageEventLatency: nextAverageLatency,
            maxEventLatency,
            topPollingSources: status.topPollingSources ?? current.topPollingSources,
            actionMetrics: status.actionMetrics ?? current.actionMetrics,
            clientIdentity: status.clientIdentity ?? current.clientIdentity,
            runtimeDomains: status.runtimeDomains ?? current.runtimeDomains,
            runtimeContinuity: status.runtimeContinuity ?? current.runtimeContinuity,
            runtimeRegistry: status.runtimeRegistry ?? current.runtimeRegistry,
            runtimeBoot: status.runtimeBoot ?? current.runtimeBoot,
            soakMetrics: status.soakMetrics ?? current.soakMetrics,
            clients: status.clients ?? current.clients,
            lastEventAt: nextLastEventAt,
            lastSuccessfulSyncAt,
            lastDisconnectedAt: status.lastDisconnectedAt ?? current.lastDisconnectedAt,
            frontendFreshness,
            frontendStateAgeMs,
            runtimeDriftSuspected:
              frontendFreshness !== 'fresh' &&
              Boolean(current.lastAppliedEventId || lastSuccessfulSyncAt),
            staleStateCount,
            offlineStateCount,
            reconnectHistory,
            latencyMs,
            error: status.error ?? null,
          }
        })
      },
    )

    return () => {
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer)
      }
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRuntimeEventStreamState((current) => {
        const freshnessAnchor = current.lastEventAt ?? current.lastSuccessfulSyncAt
        const frontendStateAgeMs = freshnessAnchor ? Math.max(0, Date.now() - Date.parse(freshnessAnchor)) : null
        const frontendFreshness =
          frontendStateAgeMs === null
            ? current.frontendFreshness
            : frontendStateAgeMs > current.offlineAfterMs
              ? 'offline'
              : frontendStateAgeMs > current.staleAfterMs
                ? 'stale'
                : 'fresh'
        const connectionState =
          current.connected && frontendFreshness === 'fresh'
            ? 'synced'
            : frontendFreshness === 'offline'
              ? 'offline'
              : frontendFreshness === 'stale' && current.connectionState === 'synced'
                ? 'stale'
                : current.connectionState

        if (
          frontendStateAgeMs === current.frontendStateAgeMs &&
          frontendFreshness === current.frontendFreshness &&
          connectionState === current.connectionState
        ) {
          return current
        }

        if (!current.connected || connectionState !== 'synced' || frontendFreshness !== 'fresh') {
          runtimePollingIntervalMsRef.current = 45000
        }
        const staleStateCount =
          current.staleStateCount + (frontendFreshness === 'stale' && current.frontendFreshness !== 'stale' ? 1 : 0)
        const offlineStateCount =
          current.offlineStateCount +
          (frontendFreshness === 'offline' && current.frontendFreshness !== 'offline' ? 1 : 0)

        return {
          ...current,
          connectionState,
          frontendFreshness,
          frontendStateAgeMs,
          runtimeEventHealthy: current.connected && connectionState === 'synced' && frontendFreshness === 'fresh',
          degradedEventStream: !current.connected || connectionState !== 'synced' || frontendFreshness !== 'fresh',
          pollingFallbackMode:
            !current.connected || connectionState !== 'synced' || frontendFreshness !== 'fresh'
              ? 'elevated'
              : current.pollingFallbackMode,
          fallbackPollingStatus:
            !current.connected || connectionState !== 'synced' || frontendFreshness !== 'fresh'
              ? 'event stream continuity watch · fallback polling 45s'
              : current.fallbackPollingStatus,
          runtimeDriftSuspected:
            frontendFreshness !== 'fresh' && Boolean(current.lastAppliedEventId || current.lastSuccessfulSyncAt),
          staleStateCount,
          offlineStateCount,
        }
      })
    }, 30000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const checkIntegrationManager = async () => {
      const checkedAt = createDiagnosticPulse('Integrations', 'Sjekket').at

      try {
        const snapshot = await getIntegrationProviders()

        if (!isMounted) {
          return
        }

        setIntegrationManagerState({
          checkedAt,
          error: null,
          snapshot,
        })
      } catch (error) {
        if (!isMounted) {
          return
        }

        setIntegrationManagerState({
          checkedAt,
          error: error instanceof Error ? error.message : 'Integrasjonsstatus er ikke tilgjengelig',
          snapshot: null,
        })
      }
    }

    void checkIntegrationManager()
    const intervalId = window.setInterval(checkIntegrationManager, 30000)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const checkCastStatus = async () => {
      const checkedAt = createDiagnosticPulse('Cast status', 'Sjekket').at

      try {
        const snapshot = await getCastStatus()

        if (!isMounted) {
          return
        }

        setBridgeCastState({
          checkedAt,
          error: null,
          playback: snapshot.playback ?? null,
          snapshot,
        })
      } catch (error) {
        if (!isMounted) {
          return
        }

        setBridgeCastState({
          checkedAt,
          error: error instanceof Error ? error.message : 'Cast-status er ikke tilgjengelig',
          playback: null,
          snapshot: null,
        })
      }
    }

    void checkCastStatus()
    const intervalId = window.setInterval(checkCastStatus, 30000)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const checkVacuumStatus = async () => {
      const checkedAt = createDiagnosticPulse('Robot status', 'Sjekket').at

      try {
        const snapshot = await getVacuumStatus()

        if (!isMounted) {
          return
        }

        setBridgeVacuumState({
          checkedAt,
          error: null,
          snapshot,
        })
      } catch (error) {
        if (!isMounted) {
          return
        }

        setBridgeVacuumState({
          checkedAt,
          error: error instanceof Error ? error.message : 'Robotstatus er ikke tilgjengelig',
          snapshot: null,
        })
      }
    }

    void checkVacuumStatus()
    const intervalId = window.setInterval(checkVacuumStatus, 30000)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    const snapshot = bridgeVacuumState.snapshot
    const robot = snapshot?.selectedRobot

    if (!robot || !snapshot) {
      return
    }

    const trustedRobotState =
      snapshot.connected &&
      robot.trustState !== 'stale' &&
      robot.trustState !== 'offline' &&
      robot.stateConfidence !== 'low'
    const runtimeStatus = ['idle', 'cleaning', 'paused', 'returning', 'docked', 'charging', 'error']
      .includes(robot.status)
      ? (robot.status as VacuumDevice['status'])
      : 'idle'
    const safeRuntimeStatus = trustedRobotState ? runtimeStatus : runtimeStatus === 'cleaning' ? 'idle' : runtimeStatus
    const trustState = robot.trustState ?? snapshot.trust?.state ?? (snapshot.connected ? 'online' : 'unknown')
    const confidence = robot.stateConfidence ?? snapshot.trust?.stateConfidence ?? 'low'
    const apiStatus =
      trustState === 'online' && confidence !== 'low'
        ? robot.integrationStatus === 'degraded'
          ? 'error'
          : 'connected'
        : trustState === 'offline'
          ? 'offline'
          : trustState === 'stale'
            ? 'offline'
            : 'foundation'

    setVacuumDevices((currentDevices) =>
      currentDevices.map((device, index) =>
        index === 0 || device.deviceId === robot.deviceId || device.id === robot.id
          ? {
              ...device,
              id: robot.id || device.id,
              name: robot.name || device.name,
              model: robot.model || device.model,
              battery: typeof robot.battery === 'number' ? robot.battery : device.battery,
              status: safeRuntimeStatus,
              rawStatus: robot.rawStatus ?? robot.status ?? device.rawStatus,
              currentArea: trustedRobotState ? robot.currentArea ?? device.currentArea : null,
              currentRoom: trustedRobotState ? robot.currentArea ?? device.currentRoom : null,
              cleaning: Boolean(trustedRobotState && (robot.cleaning ?? runtimeStatus === 'cleaning')),
              docked: Boolean(robot.docked),
              charging: Boolean(robot.charging),
              cleaningProgress:
                trustedRobotState && typeof robot.cleaningProgress === 'number'
                  ? robot.cleaningProgress
                  : 0,
              progress:
                trustedRobotState && typeof robot.cleaningProgress === 'number'
                  ? robot.cleaningProgress
                  : 0,
              lastCleanedAt: robot.lastUpdatedAt ?? robot.lastCleanedAt ?? device.lastCleanedAt,
              estimatedFinishAt: robot.estimatedFinishAt ?? null,
              errorState: robot.errorState ?? null,
              firstSeen: robot.firstSeen ?? device.firstSeen,
              lastSeenAt: robot.lastSeenAt ?? robot.lastUpdatedAt ?? snapshot.lastSuccessfulSync ?? device.lastSeenAt,
              statusAgeMs: robot.statusAgeMs ?? snapshot.trust?.statusAgeMs ?? null,
              sourceAgeMs: robot.sourceAgeMs ?? snapshot.trust?.sourceAgeMs ?? null,
              trustState,
              freshness: robot.freshness ?? snapshot.trust?.freshness ?? 'unknown',
              stateConfidence: confidence,
              cachedData: Boolean(robot.cachedData ?? snapshot.trust?.cachedData),
              estimatedState: Boolean(robot.estimatedState ?? snapshot.trust?.estimatedState),
              trustMessage: robot.trustMessage ?? snapshot.trust?.message ?? null,
              runtimeConnected: Boolean(robot.runtimeConnected ?? snapshot.trust?.runtimeConnected),
              cloudAuthenticated: Boolean(robot.cloudAuthenticated ?? snapshot.trust?.cloudAuthenticated),
              deviceReachable: Boolean(robot.deviceReachable ?? snapshot.trust?.deviceReachable),
              capabilities: device.capabilities.filter((capability) =>
                robot.capabilities.includes(capability),
              ).length > 0
                ? device.capabilities.filter((capability) => robot.capabilities.includes(capability))
                : device.capabilities,
              integrationStatus: {
                ...device.integrationStatus,
                provider: snapshot.providerLabel,
                mode: 'local',
                connected: trustedRobotState,
                lastSyncAt: snapshot.lastSuccessfulSync ?? snapshot.lastSyncAt ?? robot.lastUpdatedAt ?? null,
                apiStatus,
                label:
                  trustState === 'online'
                    ? `${snapshot.providerLabel} / live`
                    : trustState === 'stale'
                      ? `${snapshot.providerLabel} / stale`
                      : trustState === 'offline'
                        ? `${snapshot.providerLabel} / offline`
                        : `${snapshot.providerLabel} / foundation`,
                nextStep:
                  robot.trustMessage ??
                  snapshot.trust?.message ??
                  robot.errorState ??
                  'Robotstatus venter på fersk runtime-kontakt.',
                trustState,
                freshness: robot.freshness ?? snapshot.trust?.freshness ?? 'unknown',
                stateConfidence: confidence,
                sourceAgeMs: robot.sourceAgeMs ?? snapshot.trust?.sourceAgeMs ?? null,
                runtimeConnected: Boolean(robot.runtimeConnected ?? snapshot.trust?.runtimeConnected),
                cloudAuthenticated: Boolean(robot.cloudAuthenticated ?? snapshot.trust?.cloudAuthenticated),
                deviceReachable: Boolean(robot.deviceReachable ?? snapshot.trust?.deviceReachable),
              },
            }
          : device,
      ),
    )
  }, [bridgeVacuumState.snapshot])

  useEffect(() => {
    const discoveredDevices = bridgeCastState.snapshot?.devices ?? []

    if (discoveredDevices.length === 0) {
      return
    }

    setMediaDevices((currentDevices) => mergeDiscoveredCastDevices(currentDevices, discoveredDevices))
  }, [bridgeCastState.snapshot?.devices])

  useEffect(() => {
    let isMounted = true

    const checkCastPlayback = async () => {
      try {
        const playback = await getCastPlayback()

        if (!isMounted) {
          return
        }

        setBridgeCastState((currentState) => ({
          ...currentState,
          playback,
        }))
      } catch {
        // Cast playback endpoint is optional foundation; keep UI quiet when absent.
      }
    }

    void checkCastPlayback()
    const intervalId = window.setInterval(checkCastPlayback, 30000)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (!activeFloor && floorConfigs[0]) {
      setActiveFloorId(floorConfigs[0].id)
    }
  }, [activeFloor, floorConfigs])

  const handleSaveConfigChanges = async () => {
    try {
      const savedAt = persistSystemConfig(systemConfigData)
      savedSystemConfigDataRef.current = systemConfigData
      setSavedSystemConfigData(systemConfigData)
      setLastLocalConfigSaveAt(savedAt)
      const snapshot = await saveServerSystemConfig({
        systemConfig: systemConfigData,
        uiCapabilityConfig,
        conversationLogging: { enabled: conversationLoggingEnabled },
        autoPollQuietSignals: autoPollQuietSignalsConfig,
      })
      const nextMapping = buildKnxMappingFromSystemConfig(systemConfigData)
      const nextSummary = summarizeKnxRuntimeMapping(nextMapping, 'saved-system-config')

      setServerConfigDiagnostics(snapshot.diagnostics)
      setSystemConfigSource('server')
      runtimeConfigBootstrapSucceededRef.current = false

      try {
        const syncResult = await syncBridgeRuntimeConfig(
          systemConfigData.network,
          systemConfigData.runtime,
          nextMapping,
        )
        const syncedAt = new Date().toISOString()
        const payloadSummary =
          (syncResult.payloadSummary as BridgeRuntimeConfigPayloadSummary | undefined) ?? nextSummary

        runtimeConfigBootstrapSucceededRef.current = true
        setBridgeRuntimeStatus('ready')
        setLastBridgeSyncAt(createDiagnosticPulse('Bridge', 'Server-config runtime rebuild').at)
        setRuntimeConfigPushState((current) => ({
          ...current,
          runtimeConfigSyncAttempted: true,
          runtimeConfigSyncSkippedReason: null,
          runtimeConfigSyncPosted: true,
          runtimeConfigSyncPostFailed: false,
          lastRuntimeConfigPostUrl: `${getBridgeBaseUrl()}/api/runtime/config`,
          lastRuntimeConfigPayloadPreview: JSON.stringify(payloadSummary).slice(0, 500),
          lastRuntimeConfigPostStatus: 'server-config-save-ok',
          lastRuntimeConfigPostError: null,
          lastRuntimeConfigPushAttemptAt: syncedAt,
          lastRuntimeConfigPushAt: syncedAt,
          lastRuntimeConfigPushOk: true,
          lastRuntimeConfigPushError: null,
          latestRuntimeConfigPayloadSummary: payloadSummary,
        }))
        void refreshKnxRuntimeSnapshots()
      } catch (syncError) {
        const message =
          syncError instanceof Error ? syncError.message : 'Runtime-config rebuild feilet'
        runtimeConfigBootstrapSucceededRef.current = false
        setBridgeRuntimeStatus('error')
        setRuntimeConfigPushState((current) => ({
          ...current,
          runtimeConfigSyncAttempted: true,
          runtimeConfigSyncSkippedReason: null,
          runtimeConfigSyncPosted: false,
          runtimeConfigSyncPostFailed: true,
          lastRuntimeConfigPostUrl: `${getBridgeBaseUrl()}/api/runtime/config`,
          lastRuntimeConfigPayloadPreview: JSON.stringify(nextSummary).slice(0, 500),
          lastRuntimeConfigPostStatus: 'server-config-save-sync-failed',
          lastRuntimeConfigPostError: message,
          lastRuntimeConfigPushAttemptAt: new Date().toISOString(),
          lastRuntimeConfigPushOk: false,
          lastRuntimeConfigPushError: message,
          latestRuntimeConfigPayloadSummary: nextSummary,
        }))
      }

      setManagerMessage(
        `Endringer lagret på server ${getFormattedStorageTime(snapshot.diagnostics.lastConfigSaveAt ?? savedAt) ?? ''}`.trim(),
      )
    } catch (error) {
      console.warn('[Lynell] Kunne ikke lagre SystemConfig på server.', error)
      setSystemConfigSource('localFallback')
      setServerConfigDiagnostics((current) =>
        current
          ? {
              ...current,
              configDriftDetected: true,
              lastError:
                error instanceof Error ? error.message : 'Kunne ikke lagre server-owned config',
            }
          : current,
      )
      setManagerMessage('Kunne ikke lagre på server. Lokal cache er oppdatert.')
    }
  }

  const handleDiscardConfigChanges = async () => {
    try {
      const snapshot = await getServerSystemConfig()
      const configToRestore = snapshot.systemConfig
        ? normalizeSystemConfig(snapshot.systemConfig)
        : savedSystemConfigData

      savedSystemConfigDataRef.current = configToRestore
      setSavedSystemConfigData(configToRestore)
      setSystemConfigData(configToRestore)
      setLastLocalConfigSaveAt(snapshot.diagnostics.lastConfigSaveAt ?? lastLocalConfigSaveAt)
      setServerConfigDiagnostics(snapshot.diagnostics)
      setSystemConfigSource(snapshot.systemConfig ? 'server' : 'localFallback')
      setManagerMessage('Endringer forkastet. Server-config lastet på nytt.')
      runtimeConfigBootstrapSucceededRef.current = false
    } catch {
      const storedConfig = loadStoredSystemConfig()
      const configToRestore = storedConfig.loaded ? storedConfig.config : savedSystemConfigData

      savedSystemConfigDataRef.current = configToRestore
      setSavedSystemConfigData(configToRestore)
      setSystemConfigData(configToRestore)
      setLastLocalConfigSaveAt(storedConfig.loaded ? storedConfig.savedAt : lastLocalConfigSaveAt)
      setSystemConfigSource('localFallback')
      setManagerMessage('Endringer forkastet. Lokal fallback brukt.')
    }
  }

  useEffect(() => {
    if (activeMainView !== 'climate' || !basementEntryVisibleRoom) {
      return
    }

    console.log('[Lynell] Climate UI binding for basement-entry', {
      view: activeScopedView,
      mainView: activeMainView,
      room: basementEntryVisibleRoom.key,
      temperature: basementEntryVisibleRoom.temperature,
      targetTemperature: basementEntryVisibleRoom.targetTemperature,
      heatDemand: basementEntryVisibleRoom.heatDemand ?? null,
      hasLiveTemperatureData: liveClimateTemperatureRoomKeys.includes('basement-entry'),
      hasLiveSetpointData: liveClimateSetpointRoomKeys.includes('basement-entry'),
      hasLiveHeatDemandData: liveClimateHeatDemandRoomKeys.includes('basement-entry'),
      hasClimateConfig: Boolean(lightingConfig['basement-entry']?.climateActive),
      liveClimateActive: Boolean(lightingConfig['basement-entry']?.liveClimateActive),
    })
  }, [
    activeMainView,
    activeScopedView,
    basementEntryVisibleRoom,
    lightingConfig,
    liveClimateHeatDemandRoomKeys,
    liveClimateSetpointRoomKeys,
    liveClimateTemperatureRoomKeys,
  ])

  useEffect(() => {
    if (activeMainView !== 'climate') {
      return
    }

    for (const room of visibleRooms) {
      const roomMapping = lightingConfig[room.key]

      if (!roomMapping?.climateActive) {
        continue
      }

      const hasLiveHeatDemandData = liveClimateHeatDemandRoomKeys.includes(room.key)
      const hasHeatDemandConfig = hasConfiguredAddress(roomMapping.heatDemand)
      const canEstimateHeatDemand =
        !hasHeatDemandConfig &&
        liveClimateTemperatureRoomKeys.includes(room.key) &&
        liveClimateSetpointRoomKeys.includes(room.key)
      const uiSource = hasLiveHeatDemandData
        ? 'knx-heatDemand'
        : canEstimateHeatDemand
          ? 'fallback-temperature-vs-setpoint'
          : hasHeatDemandConfig
            ? 'waiting-for-knx-heatDemand'
          : 'none'

      console.log('[Lynell] Heat demand UI evaluation', {
        roomKey: room.key,
        roomName: room.name,
        heatDemandAddress: roomMapping.heatDemand || '',
        heatDemandDataType: roomMapping.heatDemandDataType || '',
        currentHeatDemand: room.heatDemand ?? null,
        hasHeatDemandConfig,
        hasLiveHeatDemandData,
        hasLiveTemperatureData: liveClimateTemperatureRoomKeys.includes(room.key),
        hasLiveSetpointData: liveClimateSetpointRoomKeys.includes(room.key),
        uiSource,
      })
    }
  }, [
    activeMainView,
    lightingConfig,
    liveClimateHeatDemandRoomKeys,
    liveClimateSetpointRoomKeys,
    liveClimateTemperatureRoomKeys,
    visibleRooms,
  ])

  const getClimateRoomKeysForView = (view: ScopedView) =>
    getScopedRoomKeysForView(view).filter((roomKey) => {
      const roomMapping = lightingConfig[roomKey]

      return (
        Boolean(roomMapping?.climateActive) &&
        Boolean(roomMapping?.liveClimateActive) &&
        hasConfiguredAddress(roomMapping?.temperature)
      )
    })

  const getClimateScopeDiagnosticsForView = (view: ScopedView) =>
    getScopedRoomKeysForView(view).map((roomKey) => {
      const roomMapping = lightingConfig[roomKey]
      const room = managerRooms.find((candidate) => candidate.key === roomKey)
      const temperatureAddress = roomMapping?.temperature?.trim() ?? ''
      const setpointFeedbackAddress = roomMapping?.setpointFeedback?.trim() ?? ''
      const climateActive = Boolean(roomMapping?.climateActive)
      const liveClimateActive = Boolean(roomMapping?.liveClimateActive)
      const eligible =
        climateActive &&
        liveClimateActive &&
        hasConfiguredAddress(temperatureAddress)

      return {
        roomKey,
        roomName: room?.name ?? roomKey,
        climateActive,
        liveClimateActive,
        temperatureAddress,
        setpointFeedbackAddress,
        eligible,
      }
    })

  const getNextRoomBatch = (
    roomKeys: string[],
    chunkSize: number,
    batchIndexRef: { current: number },
  ) => {
    const roomChunks = chunkItems(roomKeys, chunkSize)

    if (roomChunks.length === 0) {
      return []
    }

    const nextIndex = batchIndexRef.current % roomChunks.length
    batchIndexRef.current = (nextIndex + 1) % roomChunks.length

    return roomChunks[nextIndex]
  }

  useEffect(() => {
    setSystemMode(systemMode)
  }, [systemMode])

  useEffect(() => {
    setClimateModeSetpoints({
      Komfort: comfortSetpoint,
      Natt: nightSetpoint,
    })
  }, [comfortSetpoint, nightSetpoint])

  useEffect(() => {
    applyKnxConfig(lightingConfig)
  }, [lightingConfig])

  useEffect(() => {
    runtimeConfigBootstrapInputsRef.current = {
      networkConfig,
      runtimeConfig,
      lightingConfig,
      runtimeConfigPayloadSummary,
      systemMode,
    }
  }, [lightingConfig, networkConfig, runtimeConfig, runtimeConfigPayloadSummary, systemMode])

  useEffect(() => {
    runtimeConfigBootstrapSucceededRef.current = false
  }, [savedSystemConfigData])

  useEffect(() => {
    const configRooms = buildRoomsFromSystemConfig(savedSystemConfigData)
    setRooms((currentRooms) => syncRuntimeRoomsFromConfig(configRooms, currentRooms))
  }, [savedSystemConfigData])

  useEffect(() => {
    let isMounted = true

    const pushRuntimeConfig = async () => {
      if (runtimeConfigBootstrapSucceededRef.current) {
        const reason = 'already-successful'
        console.info('[Lynell] Runtime config sync skipped', { reason })
        setRuntimeConfigPushState((current) => ({
          ...current,
          runtimeConfigSyncSkippedReason: reason,
        }))
        return
      }

      if (runtimeConfigBootstrapInFlightRef.current) {
        const reason = 'push-in-flight'
        console.info('[Lynell] Runtime config sync skipped', { reason })
        setRuntimeConfigPushState((current) => ({
          ...current,
          runtimeConfigSyncSkippedReason: reason,
        }))
        return
      }

      const {
        networkConfig: activeNetworkConfig,
        runtimeConfig: activeRuntimeConfig,
        lightingConfig: activeLightingConfig,
        runtimeConfigPayloadSummary: activePayloadSummary,
        systemMode: activeSystemMode,
      } = runtimeConfigBootstrapInputsRef.current
      const attemptedAt = new Date().toISOString()
      runtimeConfigBootstrapInFlightRef.current = true
      console.info('[Lynell] Runtime config sync attempt', {
        attemptedAt,
        bridgeBaseUrl: getBridgeBaseUrl(),
        payloadSummary: activePayloadSummary,
      })
      try {
        if (isMounted) {
          setBridgeRuntimeStatus('syncing')
          setRuntimeConfigPushState((current) => ({
            ...current,
            runtimeConfigSyncAttempted: true,
            runtimeConfigSyncSkippedReason: null,
            runtimeConfigSyncPosted: false,
            runtimeConfigSyncPostFailed: false,
            lastRuntimeConfigPostUrl: `${getBridgeBaseUrl()}/api/runtime/config`,
            lastRuntimeConfigPayloadPreview: JSON.stringify(activePayloadSummary).slice(0, 500),
            lastRuntimeConfigPostStatus: 'attempting',
            lastRuntimeConfigPostError: null,
            lastRuntimeConfigPushAttemptAt: attemptedAt,
            lastRuntimeConfigPushOk: null,
            lastRuntimeConfigPushError: null,
            latestRuntimeConfigPayloadSummary: activePayloadSummary,
          }))
        }
        const healthSnapshot = await getBridgeHealth()
        if (isMounted) {
          setBridgeHealth({
            reachable: true,
            checkedAt: createDiagnosticPulse('Bridge health', 'Config push').at,
            error: null,
            snapshot: healthSnapshot,
          })
        }
        if (!isMounted) {
          return
        }
        console.info('[Lynell] Runtime config sync POST starting', {
          attemptedAt,
          payloadSummary: activePayloadSummary,
        })
        const syncResult = await syncBridgeRuntimeConfig(activeNetworkConfig, activeRuntimeConfig, activeLightingConfig)
        runtimeConfigBootstrapSucceededRef.current = true
        console.log('[Lynell] Synced runtime config to bridge', {
          connectionMode: activeNetworkConfig.connectionMode,
          localDirect: activeNetworkConfig.localDirect,
          remoteTunnel: activeNetworkConfig.remoteTunnel,
          climateFeedbackMethod: activeRuntimeConfig.climateFeedbackMethod,
          climatePollingIntervalSec: activeRuntimeConfig.climatePollingIntervalSec,
          payloadSummary: syncResult.payloadSummary ?? activePayloadSummary,
        })
        if (isMounted) {
          setBridgeRuntimeStatus('ready')
          setLastBridgeSyncAt(createDiagnosticPulse('Bridge', 'Runtime synket').at)
          setRuntimeConfigPushState({
            runtimeConfigSyncAttempted: true,
            runtimeConfigSyncSkippedReason: null,
            runtimeConfigSyncPosted: true,
            runtimeConfigSyncPostFailed: false,
            lastManualRuntimeConfigTriggerAt: runtimeConfigPushState.lastManualRuntimeConfigTriggerAt,
            lastRuntimeConfigPostUrl: `${getBridgeBaseUrl()}/api/runtime/config`,
            lastRuntimeConfigPayloadPreview: JSON.stringify(
              (syncResult.payloadSummary as BridgeRuntimeConfigPayloadSummary | undefined) ?? activePayloadSummary,
            ).slice(0, 500),
            lastRuntimeConfigPostStatus: 'ok',
            lastRuntimeConfigPostError: null,
            lastRuntimeConfigPushAttemptAt: attemptedAt,
            lastRuntimeConfigPushAt: attemptedAt,
            lastRuntimeConfigPushOk: true,
            lastRuntimeConfigPushError: null,
            latestRuntimeConfigPayloadSummary:
              (syncResult.payloadSummary as BridgeRuntimeConfigPayloadSummary | undefined) ??
              activePayloadSummary,
          })
          appendTestLog('Bridge', 'runtime config sendt')
        }
      } catch (error) {
        console.error('[Lynell] Runtime config sync POST failed', error)

        if (isMounted) {
          setBridgeRuntimeStatus('error')
          setRuntimeConfigPushState({
            runtimeConfigSyncAttempted: true,
            runtimeConfigSyncSkippedReason: null,
            runtimeConfigSyncPosted: false,
            runtimeConfigSyncPostFailed: true,
            lastManualRuntimeConfigTriggerAt: runtimeConfigPushState.lastManualRuntimeConfigTriggerAt,
            lastRuntimeConfigPostUrl: `${getBridgeBaseUrl()}/api/runtime/config`,
            lastRuntimeConfigPayloadPreview: JSON.stringify(activePayloadSummary).slice(0, 500),
            lastRuntimeConfigPostStatus: 'failed',
            lastRuntimeConfigPostError:
              error instanceof Error
                ? error.message
                : 'Kunne ikke synkronisere runtime-config til bridge',
            lastRuntimeConfigPushAttemptAt: attemptedAt,
            lastRuntimeConfigPushAt: attemptedAt,
            lastRuntimeConfigPushOk: false,
            lastRuntimeConfigPushError:
              error instanceof Error
                ? error.message
                : 'Kunne ikke synkronisere runtime-config til bridge',
            latestRuntimeConfigPayloadSummary: activePayloadSummary,
          })
          if (activeSystemMode === 'live') {
            const nextMessage =
              error instanceof Error
                ? error.message
                : 'Kunne ikke synkronisere runtime-config til bridge'
            setErrorMessage(nextMessage)
            setRuntimeIssue(nextMessage)
          }
        }
      } finally {
        runtimeConfigBootstrapInFlightRef.current = false
      }
    }

    void pushRuntimeConfig()
    const retryId = window.setInterval(() => {
      void pushRuntimeConfig()
    }, 5000)

    return () => {
      isMounted = false
      window.clearInterval(retryId)
    }
  }, [
  ])

  const handleManualRuntimeConfigSync = async () => {
    const attemptedAt = new Date().toISOString()
    const {
      networkConfig: activeNetworkConfig,
      runtimeConfig: activeRuntimeConfig,
      lightingConfig: activeLightingConfig,
      runtimeConfigPayloadSummary: activePayloadSummary,
    } = runtimeConfigBootstrapInputsRef.current

    console.info('[Lynell] Manual runtime config sync trigger', {
      attemptedAt,
      postUrl: `${getBridgeBaseUrl()}/api/runtime/config`,
      payloadSummary: activePayloadSummary,
    })

    setRuntimeConfigPushState((current) => ({
      ...current,
      runtimeConfigSyncAttempted: true,
      runtimeConfigSyncSkippedReason: null,
      runtimeConfigSyncPosted: false,
      runtimeConfigSyncPostFailed: false,
      lastManualRuntimeConfigTriggerAt: attemptedAt,
      lastRuntimeConfigPushAttemptAt: attemptedAt,
      lastRuntimeConfigPushOk: null,
      lastRuntimeConfigPushError: null,
      lastRuntimeConfigPostUrl: `${getBridgeBaseUrl()}/api/runtime/config`,
      lastRuntimeConfigPayloadPreview: JSON.stringify(activePayloadSummary).slice(0, 500),
      lastRuntimeConfigPostStatus: 'manual-attempting',
      lastRuntimeConfigPostError: null,
      latestRuntimeConfigPayloadSummary: activePayloadSummary,
    }))

    try {
      const syncResult = await syncBridgeRuntimeConfig(activeNetworkConfig, activeRuntimeConfig, activeLightingConfig)
      runtimeConfigBootstrapSucceededRef.current = true
      const payloadSummary =
        (syncResult.payloadSummary as BridgeRuntimeConfigPayloadSummary | undefined) ??
        activePayloadSummary

      setBridgeRuntimeStatus('ready')
      setLastBridgeSyncAt(createDiagnosticPulse('Bridge', 'Manual runtime-config').at)
      setRuntimeConfigPushState((current) => ({
        ...current,
        runtimeConfigSyncAttempted: true,
        runtimeConfigSyncSkippedReason: null,
        runtimeConfigSyncPosted: true,
        runtimeConfigSyncPostFailed: false,
        lastManualRuntimeConfigTriggerAt: attemptedAt,
        lastRuntimeConfigPushAttemptAt: attemptedAt,
        lastRuntimeConfigPushAt: attemptedAt,
        lastRuntimeConfigPushOk: true,
        lastRuntimeConfigPushError: null,
        lastRuntimeConfigPostUrl: `${getBridgeBaseUrl()}/api/runtime/config`,
        lastRuntimeConfigPayloadPreview: JSON.stringify(payloadSummary).slice(0, 500),
        lastRuntimeConfigPostStatus: 'manual-ok',
        lastRuntimeConfigPostError: null,
        latestRuntimeConfigPayloadSummary: payloadSummary,
      }))
      appendTestLog('Bridge', 'manual runtime config sendt')
      void refreshKnxRuntimeSnapshots()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Manual runtime-config sync feilet'
      console.error('[Lynell] Manual runtime config sync failed', error)
      setBridgeRuntimeStatus('error')
      setRuntimeConfigPushState((current) => ({
        ...current,
        runtimeConfigSyncAttempted: true,
        runtimeConfigSyncSkippedReason: null,
        runtimeConfigSyncPosted: false,
        runtimeConfigSyncPostFailed: true,
        lastManualRuntimeConfigTriggerAt: attemptedAt,
        lastRuntimeConfigPushAttemptAt: attemptedAt,
        lastRuntimeConfigPushAt: attemptedAt,
        lastRuntimeConfigPushOk: false,
        lastRuntimeConfigPushError: message,
        lastRuntimeConfigPostUrl: `${getBridgeBaseUrl()}/api/runtime/config`,
        lastRuntimeConfigPayloadPreview: JSON.stringify(activePayloadSummary).slice(0, 500),
        lastRuntimeConfigPostStatus: 'manual-failed',
        lastRuntimeConfigPostError: message,
        latestRuntimeConfigPayloadSummary: activePayloadSummary,
      }))
    }
  }

  const handleSceneSchedulerTest = async (sceneId: string, dryRun: boolean) => {
    const label = dryRun ? 'dry-run' : 'test execute'
    try {
      const result = await testRuntimeScene(sceneId, dryRun)
      appendTestLog('Scene scheduler', `${label} OK · ${sceneId}`)
      console.info('[Lynell] Scene scheduler test result', {
        sceneId,
        dryRun,
        result,
      })
      try {
        const snapshot = await getBridgeHealth()
        setBridgeHealth({
          reachable: true,
          checkedAt: createDiagnosticPulse('Bridge health', 'Scene scheduler').at,
          error: null,
          snapshot,
        })
      } catch (healthError) {
        console.warn('[Lynell] Scene scheduler test succeeded, but health refresh failed.', healthError)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Scene scheduler test feilet'
      appendTestLog('Scene scheduler', `${label} feilet · ${message}`)
      setRuntimeIssue(message)
      console.error('[Lynell] Scene scheduler test failed', {
        sceneId,
        dryRun,
        error,
      })
    }
  }

  const handleShadingAction = async (
    shadingId: string,
    action: KnxShadingAction,
    value?: number,
    dryRun = false,
  ) => {
    const item = systemConfigData.shading.find((candidate) => candidate.id === shadingId)
    const now = Date.now()
    if (!item) {
      appendTestLog('Solskjerming', `Fant ikke shading ${shadingId}`)
      return
    }

    if (!dryRun) {
      setShadingCommandStateById((current) => ({
        ...current,
        [shadingId]: {
          shadingId,
          action,
          value: value ?? null,
          status: 'pending',
          startedAt: now,
          timeoutAt: now + 3500,
          lastMessage: item.feedbackPosition
            ? 'Sendt, venter på feedbackPosition'
            : 'Sendt uten feedbackPosition konfigurert',
          groupAddress: null,
          feedbackGroupAddress: item.feedbackPosition || null,
          confirmedAt: null,
          feedbackValue: null,
        },
      }))
    }

    try {
      const result = await runKnxShadingAction({ shadingId, action, value, dryRun })
      const plan = result.plan as
        | {
            ok?: boolean
            write?: { groupAddress?: string | null; dpt?: string | null; value?: unknown }
            feedback?: { groupAddress?: string | null; expected?: boolean }
            error?: string | null
          }
        | undefined
      const groupAddress = plan?.write?.groupAddress ?? null
      const feedbackGroupAddress = plan?.feedback?.groupAddress ?? item.feedbackPosition ?? null

      if (dryRun) {
        appendTestLog(
          'Solskjerming dry-run',
          plan?.ok
            ? `${item.label}: ${action} → ${groupAddress ?? 'ingen GA'}`
            : `${item.label}: ${plan?.error ?? 'mangler mapping'}`,
        )
        return
      }

      setShadingCommandStateById((current) => ({
        ...current,
        [shadingId]: {
          shadingId,
          action,
          value: value ?? null,
          status: feedbackGroupAddress ? 'pending' : 'sentUnconfirmed',
          startedAt: now,
          timeoutAt: now + 3500,
          lastMessage: feedbackGroupAddress
            ? 'Sendt, venter på feedbackPosition'
            : 'Sendt uten feedbackPosition konfigurert',
          groupAddress,
          feedbackGroupAddress,
          confirmedAt: null,
          feedbackValue: null,
        },
      }))
      appendTestLog('Solskjerming', `${item.label}: ${action} sendt ${groupAddress ?? ''}`)
      void refreshKnxRuntimeSnapshots()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Solskjerming write feilet'
      setShadingCommandStateById((current) => ({
        ...current,
        [shadingId]: {
          shadingId,
          action,
          value: value ?? null,
          status: 'failed',
          startedAt: now,
          timeoutAt: now,
          lastMessage: message,
          groupAddress: null,
          feedbackGroupAddress: item.feedbackPosition || null,
          confirmedAt: null,
          feedbackValue: null,
        },
      }))
      appendTestLog('Solskjerming', `${item.label}: ${message}`)
      setRuntimeIssue(message)
    }
  }

  useEffect(() => {
    let isMounted = true

    const loadRooms = async () => {
      try {
        setIsLoading(true)
        setErrorMessage('')
        const nextRooms = await getRooms()
        const configRooms = buildRoomsFromSystemConfig(savedSystemConfigData)

        if (isMounted) {
          setRooms(syncRuntimeRoomsFromConfig(configRooms, nextRooms))
        }
      } catch (error) {
        if (isMounted) {
          const nextMessage =
            error instanceof Error ? error.message : 'Unknown system error'
          setErrorMessage(nextMessage)
          setRuntimeIssue(nextMessage)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    const loadWeather = async () => {
      try {
        setIsWeatherLoading(true)
        setWeatherError('')
        const nextWeather = await getWeather()

        if (isMounted) {
          setWeather(nextWeather)
          setWeatherUpdatedAt(Date.now())
        }
      } catch (error) {
        if (isMounted) {
          setWeatherError(
            error instanceof Error ? error.message : 'Kunne ikke hente værdata',
          )
        }
      } finally {
        if (isMounted) {
          setIsWeatherLoading(false)
        }
      }
    }

    void loadRooms()
    void loadWeather()

    return () => {
      isMounted = false
    }
  }, [savedSystemConfigData])

  useEffect(() => {
    if (!runtimeAllowsMock) {
      return
    }

    const intervalId = window.setInterval(() => {
      setRooms((currentRooms) => {
        const mergedRooms = mergeRoomPresentation(updateTemperatures(), currentRooms)
        return mergedRooms
      })
    }, simulationIntervalMs)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [runtimeAllowsMock])

  useEffect(() => {
    if (rooms.length === 0 || !runtimeAllowsMock) {
      return
    }

    appendRuntimeHistory(createRuntimeSnapshotHistoryPoints(rooms, 'simulate'))
  }, [rooms, runtimeAllowsMock])

  useEffect(() => {
    if (rooms.length === 0 || !runtimeAllowsMock) {
      return
    }

    const intervalId = window.setInterval(() => {
      const currentRooms = roomsRef.current

      if (currentRooms.length === 0) {
        return
      }

      appendRuntimeHistory(
        createRuntimeSnapshotHistoryPoints(
          currentRooms,
          'simulate',
          Date.now(),
        ),
      )
    }, 60 * 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [rooms.length, runtimeAllowsMock])

  useEffect(() => {
    if (rooms.length === 0) {
      return
    }

    applyRoomsConfig(rooms)
  }, [rooms])

  useEffect(() => {
    if (lightFeedbackUnsubscribeRef.current) {
      console.log('[Lynell] Stopping localDirect light subscription', {
        view: activeScopedView,
        mainView: activeMainView,
        preserveCache: true,
        reason: 'subscription-scope-changed',
      })
      lightFeedbackUnsubscribeRef.current()
      lightFeedbackUnsubscribeRef.current = null
    }

    console.log('[Lynell] Light feedback strategy', {
      connectionMode: networkConfig.connectionMode,
      strategy: activeLightFeedbackScope.strategy,
      view: activeScopedView,
      mainView: activeMainView,
      rooms: activeLightFeedbackScope.roomKeys,
      zones: activeLightFeedbackScope.zoneLabels,
    })

    if (activeLightFeedbackScope.strategy !== 'subscribe') {
      console.log('[Lynell] Preserving last known light feedback cache for inactive subscribe scope', {
        view: activeScopedView,
        mainView: activeMainView,
        strategy: activeLightFeedbackScope.strategy,
      })
      return
    }

    const scopedRoomKeys = activeLightFeedbackScope.roomKeys

    if (scopedRoomKeys.length === 0) {
      console.log('[Lynell] Skipping localDirect light subscription', {
        reason: 'No feedback-configured rooms for active view',
        view: activeScopedView,
        mainView: activeMainView,
      })
      return
    }

    let isMounted = true

    const connect = async () => {
      try {
        console.log('[Lynell] Starting localDirect light subscription', {
          view: activeScopedView,
          mainView: activeMainView,
          roomCount: scopedRoomKeys.length,
          rooms: scopedRoomKeys,
          zones: activeLightFeedbackScope.zoneLabels,
        })

        const unsubscribe = await subscribeToLightFeedbackStream(
          scopedRoomKeys,
          activeScopedView,
          (result) => {
            if (!isMounted) {
              return
            }

            console.log('[Lynell] Applying streamed light feedback rooms', {
              view: activeScopedView,
              mainView: activeMainView,
              mergedRooms: result.updatedRoomKeys,
            })
            if (
              result.updatedRoomKeys.length > 0 ||
              result.confirmedLightZoneKeys.length > 0 ||
              result.confirmedBrightnessZoneKeys.length > 0
            ) {
              const latestDiagnostic = result.diagnostics[result.diagnostics.length - 1]
              if (latestDiagnostic) {
                recordKnxInWithMetadata(
                  'Lys feedback',
                  `${latestDiagnostic.roomLabel} / ${latestDiagnostic.zoneLabel}`,
                  {
                    address: latestDiagnostic.address,
                    dataType: latestDiagnostic.dataType,
                    interpretationRule: latestDiagnostic.interpretationRule,
                    rawValue: latestDiagnostic.rawValue,
                    mappedValue: latestDiagnostic.mappedValue,
                  },
                )
              } else {
                recordKnxIn(
                  'Lys feedback',
                  result.updatedRoomKeys.length > 0
                    ? result.updatedRoomKeys.join(', ')
                    : result.confirmedBrightnessZoneKeys[0] ?? result.confirmedLightZoneKeys[0],
                )
              }
            }
            setRooms((currentRooms) => mergeRoomPresentation(result.rooms, currentRooms))
            appendLightHistoryFromResult(result, 'knx-subscription')
            setConfirmedLightFeedbackZoneKeys((currentKeys) =>
              Array.from(new Set([...currentKeys, ...result.confirmedLightZoneKeys])),
            )
            setConfirmedBrightnessFeedbackZoneKeys((currentKeys) =>
              Array.from(new Set([...currentKeys, ...result.confirmedBrightnessZoneKeys])),
            )
          },
          (error) => {
            if (!isMounted) {
              return
            }

            console.log('[Lynell] localDirect light subscription failed, preserving state', {
              view: activeScopedView,
              mainView: activeMainView,
              error: error.message,
            })
            setErrorMessage(error.message)
            setRuntimeIssue(error.message)
          },
        )

        if (!isMounted) {
          unsubscribe()
          return
        }

        lightFeedbackUnsubscribeRef.current = unsubscribe
      } catch (error) {
        if (!isMounted) {
          return
        }

        const nextMessage =
          error instanceof Error
            ? error.message
            : 'Live feedback-strøm fra KNX kunne ikke startes'
        setErrorMessage(nextMessage)
        setRuntimeIssue(nextMessage)
      }
    }

    void connect()

    return () => {
      isMounted = false

      if (lightFeedbackUnsubscribeRef.current) {
        console.log('[Lynell] Cleaning up localDirect light subscription', {
          view: activeScopedView,
          mainView: activeMainView,
          preserveCache: true,
          reason: 'effect-cleanup',
        })
        lightFeedbackUnsubscribeRef.current()
        lightFeedbackUnsubscribeRef.current = null
      }
    }
  }, [
    activeLightFeedbackScopeSignature,
  ])

  useEffect(() => {
    if (feedbackIntervalRef.current !== null) {
      window.clearTimeout(feedbackIntervalRef.current)
      feedbackIntervalRef.current = null
    }

    feedbackInFlightRef.current = false
    lightFeedbackBatchIndexRef.current = 0

    if (systemMode !== 'live') {
      console.log('[Lynell] Clearing confirmed light feedback cache because live mode is off', {
        view: activeScopedView,
        mainView: activeMainView,
      })
      setConfirmedLightFeedbackZoneKeys([])
      setConfirmedBrightnessFeedbackZoneKeys([])
      lightFeedbackFailureCountRef.current = 0
      return
    }

    if (activeLightFeedbackScope.strategy === 'subscribe') {
      console.log('[Lynell] Skipping light polling because localDirect subscribe is primary', {
        view: activeScopedView,
        mainView: activeMainView,
        connectionMode: networkConfig.connectionMode,
        strategy: 'subscribe',
        rooms: activeLightFeedbackScope.roomKeys,
        zones: activeLightFeedbackScope.zoneLabels,
      })
      lightFeedbackFailureCountRef.current = 0
      return
    }

    console.log('[Lynell] Using conservative light feedback fallback', {
      view: activeScopedView,
      mainView: activeMainView,
      connectionMode: networkConfig.connectionMode,
      strategy: 'polling-fallback',
      rooms: activeLightFeedbackScope.roomKeys,
      zones: activeLightFeedbackScope.zoneLabels,
    })

    let isMounted = true
    const scopedRoomKeys = activeLightFeedbackScope.roomKeys

    if (scopedRoomKeys.length === 0) {
      console.log('[Lynell] Skipping light feedback to protect system', {
        reason: 'No relevant rooms for active view',
        view: activeScopedView,
        mainView: activeMainView,
        preserveCache: true,
      })
      lightFeedbackFailureCountRef.current = 0
      return
    }

    const scheduleNextRound = (delayMs: number) => {
      if (!isMounted) {
        return
      }

      if (feedbackIntervalRef.current !== null) {
        window.clearTimeout(feedbackIntervalRef.current)
      }

      feedbackIntervalRef.current = window.setTimeout(() => {
        void runFeedbackRound()
      }, delayMs)
    }

    const runFeedbackRound = async () => {
      if (feedbackInFlightRef.current) {
        console.log('[Lynell] Skipping light feedback to protect system', {
          reason: 'Previous light feedback round still running',
          view: activeScopedView,
          mainView: activeMainView,
        })
        return
      }

      if (climateInFlightRef.current) {
        console.log('[Lynell] Skipping light feedback to protect system', {
          reason: 'Climate feedback round is active',
          view: activeScopedView,
          mainView: activeMainView,
        })
        scheduleNextRound(baseLightFeedbackIntervalMs)
        return
      }

      const roomBatch = getNextRoomBatch(
        scopedRoomKeys,
        lightFeedbackRoomsPerRound,
        lightFeedbackBatchIndexRef,
      )

      if (roomBatch.length === 0) {
        console.log('[Lynell] Skipping light feedback to protect system', {
          reason: 'No light feedback targets in current scope',
          view: activeScopedView,
          mainView: activeMainView,
        })
        scheduleNextRound(baseLightFeedbackIntervalMs)
        return
      }

      feedbackInFlightRef.current = true

      console.log('[Lynell] Starting light feedback round', {
        view: activeScopedView,
        mainView: activeMainView,
        roomCount: roomBatch.length,
        rooms: roomBatch,
      })

      try {
        const result = await syncLightFeedbackForRooms(roomBatch)

        if (isMounted) {
          console.log('[Lynell] Merging light feedback rooms', {
            view: activeScopedView,
            mainView: activeMainView,
            mergedRooms: result.updatedRoomKeys,
          })
          if (
            result.updatedRoomKeys.length > 0 ||
            result.confirmedLightZoneKeys.length > 0 ||
            result.confirmedBrightnessZoneKeys.length > 0
          ) {
            const latestDiagnostic = result.diagnostics[result.diagnostics.length - 1]
            if (latestDiagnostic) {
              recordKnxInWithMetadata(
                'Lys polling',
                `${latestDiagnostic.roomLabel} / ${latestDiagnostic.zoneLabel}`,
                {
                  address: latestDiagnostic.address,
                  dataType: latestDiagnostic.dataType,
                  interpretationRule: latestDiagnostic.interpretationRule,
                  rawValue: latestDiagnostic.rawValue,
                  mappedValue: latestDiagnostic.mappedValue,
                },
              )
            } else {
              recordKnxIn(
                'Lys polling',
                result.updatedRoomKeys.length > 0
                  ? result.updatedRoomKeys.join(', ')
                  : result.confirmedBrightnessZoneKeys[0] ?? result.confirmedLightZoneKeys[0],
              )
            }
          }
          setRooms((currentRooms) => mergeRoomPresentation(result.rooms, currentRooms))
          appendLightHistoryFromResult(result, 'light-query')
          setConfirmedLightFeedbackZoneKeys((currentKeys) =>
            Array.from(new Set([...currentKeys, ...result.confirmedLightZoneKeys])),
          )
          setConfirmedBrightnessFeedbackZoneKeys((currentKeys) =>
            Array.from(new Set([...currentKeys, ...result.confirmedBrightnessZoneKeys])),
          )
        }
        lightFeedbackFailureCountRef.current = 0
      } catch (error) {
        lightFeedbackFailureCountRef.current += 1

        if (isMounted) {
          console.log('[Lynell] Preserving existing light feedback state after failure', {
            view: activeScopedView,
            mainView: activeMainView,
            roomBatch,
          })
          const nextMessage =
            error instanceof Error
              ? error.message
              : 'Live feedback fra KNX er utilgjengelig'
          setErrorMessage(nextMessage)
          setRuntimeIssue(nextMessage)
        }
      } finally {
        feedbackInFlightRef.current = false

        const failureCount = lightFeedbackFailureCountRef.current
        const nextDelay =
          failureCount >= 2
            ? baseLightFeedbackIntervalMs * Math.min(failureCount, 4)
            : baseLightFeedbackIntervalMs

        if (failureCount >= 2) {
          console.log('[Lynell] Slowing light feedback to protect system', {
            view: activeScopedView,
            mainView: activeMainView,
            failureCount,
            nextDelayMs: nextDelay,
          })
        }

        scheduleNextRound(nextDelay)
      }
    }

    console.log('[Lynell] Delaying first light feedback round after startup', {
      view: activeScopedView,
      mainView: activeMainView,
      delayMs: feedbackStartupDelayMs,
      roomCount: scopedRoomKeys.length,
    })
    scheduleNextRound(feedbackStartupDelayMs)

    return () => {
      isMounted = false
      feedbackInFlightRef.current = false

      if (feedbackIntervalRef.current !== null) {
        window.clearTimeout(feedbackIntervalRef.current)
        feedbackIntervalRef.current = null
      }
    }
  }, [
    activeMainView,
    activeScopedView,
    activeLightFeedbackScopeSignature,
    networkConfig.connectionMode,
    systemMode,
  ])

  useEffect(() => {
    if (activeClimateFeedbackStrategy.strategy !== 'subscribe') {
      return
    }

    const scopedRoomKeys = getClimateRoomKeysForView(activeScopedView)

    if (scopedRoomKeys.length === 0) {
      console.log('[Lynell] Skipping climate subscribe', {
        reason: 'No relevant climate rooms for active view',
        view: activeScopedView,
        mainView: activeMainView,
      })
      return
    }

    let isMounted = true
    let unsubscribe: (() => void) | null = null

    console.log('[Lynell] Starting climate subscribe scope', {
      view: activeScopedView,
      mainView: activeMainView,
      roomCount: scopedRoomKeys.length,
      rooms: scopedRoomKeys,
      targets: scopedRoomKeys.flatMap((roomKey) => {
        const roomMapping = lightingConfig[roomKey]
        const room = rooms.find((candidate) => candidate.key === roomKey)

        if (!roomMapping) {
          return []
        }

        return [
          ['temperature', roomMapping.temperature, roomMapping.temperatureDataType],
          ['setpointFeedback', roomMapping.setpointFeedback, roomMapping.setpointFeedbackDataType],
          ['heatDemand', roomMapping.heatDemand, roomMapping.heatDemandDataType],
          ['modeFeedback', roomMapping.modeFeedback, roomMapping.modeFeedbackDataType],
        ]
          .filter(([, address]) => hasConfiguredAddress(String(address ?? '')))
          .map(([field, address, dataType]) => ({
            roomKey,
            roomName: room?.name ?? roomKey,
            field,
            address,
            dataType,
          }))
      }),
      strategy: activeClimateFeedbackStrategy.strategy,
      connectionMode: networkConfig.connectionMode,
    })

    void subscribeToClimateFeedbackStream(
      scopedRoomKeys,
      activeScopedView,
      (result, event) => {
        if (!isMounted) {
          return
        }

        console.log('[Lynell] Merging climate subscribe event', {
          view: activeScopedView,
          room: event.roomKey,
          field: event.field,
          address: event.address,
          dataType: event.dataType,
          rawValue: event.rawValue,
          mappedValue: event.mappedValue,
          mappingVariant: event.mappingVariant ?? null,
        })

        if (event.field === 'heatDemand') {
          const roomMapping = lightingConfig[event.roomKey]
          console.log('[Lynell] Heat demand subscribe event received', {
            roomKey: event.roomKey,
            heatDemandAddress: roomMapping?.heatDemand ?? event.address,
            heatDemandDataType: roomMapping?.heatDemandDataType ?? event.dataType,
            rawValue: event.rawValue,
            mappedHeatDemand: event.mappedValue,
            mappingVariant: event.mappingVariant ?? null,
            uiSource: typeof event.mappedValue === 'number' ? 'knx-heatDemand' : 'ignored',
          })
        }

        const climateEventPulse = createDiagnosticPulse(
          'Klima subscribe',
          `${event.roomKey} / ${event.field}`,
          {
            address: event.address,
            dataType: event.dataType,
            rawValue: event.rawValue,
            mappedValue: event.mappedValue,
            mappingVariant: event.mappingVariant ?? null,
          },
        )

        setRooms((currentRooms) => mergeRoomPresentation(result.rooms, currentRooms))
        appendClimateHistoryFromEvent(event)
        setLiveClimateTemperatureRoomKeys((currentKeys) =>
          Array.from(new Set([...currentKeys, ...result.updatedTemperatureRoomKeys])),
        )
        setLiveClimateSetpointRoomKeys((currentKeys) =>
          Array.from(new Set([...currentKeys, ...result.updatedSetpointRoomKeys])),
        )
        setLiveClimateHeatDemandRoomKeys((currentKeys) =>
          Array.from(new Set([...currentKeys, ...result.updatedHeatDemandRoomKeys])),
        )
        setLastClimateEvent(climateEventPulse)
        setLastKnxIn(climateEventPulse)
        appendTestLog('Klima event', `${event.roomKey} / ${event.field}`)
      },
      (error) => {
        if (!isMounted) {
          return
        }

        const message =
          error instanceof Error ? error.message : 'Live klima-strøm fra KNX ble avbrutt'
        console.warn('[Lynell] Climate subscribe failed', {
          view: activeScopedView,
          mainView: activeMainView,
          message,
        })
        setLastClimateError(createDiagnosticPulse('Klima subscribe feil', message))
        appendTestLog('Klima feil', message)
        setRuntimeIssue(message)
      },
    )
      .then((nextUnsubscribe) => {
        if (!isMounted) {
          nextUnsubscribe()
          return
        }

        unsubscribe = nextUnsubscribe
      })
      .catch((error) => {
        if (!isMounted) {
          return
        }

        const message =
          error instanceof Error ? error.message : 'Live klima-strøm kunne ikke opprettes'
        console.warn('[Lynell] Climate subscribe setup failed', {
          view: activeScopedView,
          mainView: activeMainView,
          message,
        })
        setLastClimateError(createDiagnosticPulse('Klima subscribe feil', message))
        setRuntimeIssue(message)
      })

    return () => {
      isMounted = false
      console.log('[Lynell] Stopping climate subscribe scope and preserving cache', {
        view: activeScopedView,
        mainView: activeMainView,
        rooms: scopedRoomKeys,
      })
      unsubscribe?.()
    }
  }, [
    activeClimateFeedbackStrategy.strategy,
    activeMainView,
    activeScopedView,
    networkConfig.connectionMode,
    savedSystemConfigData,
    systemMode,
  ])

  useEffect(() => {
    if (climateIntervalRef.current !== null) {
      window.clearTimeout(climateIntervalRef.current)
      climateIntervalRef.current = null
    }

    climateInFlightRef.current = false
    climateBatchIndexRef.current = 0
    const climateScopeDiagnostics = getClimateScopeDiagnosticsForView(activeScopedView)
    const basementEntryClimateDiagnostic =
      climateScopeDiagnostics.find((item) => item.roomKey === 'basement-entry') ?? null

    if (activeMainView === 'climate') {
      console.log('[Lynell] Climate scope diagnostics', {
        view: activeScopedView,
        mainView: activeMainView,
        scopeDiagnostics: climateScopeDiagnostics,
        basementEntry: basementEntryClimateDiagnostic
          ? {
              inScope: basementEntryClimateDiagnostic.eligible,
              climateActive: basementEntryClimateDiagnostic.climateActive,
              liveClimateActive: basementEntryClimateDiagnostic.liveClimateActive,
              temperature: basementEntryClimateDiagnostic.temperatureAddress,
              setpointFeedback: basementEntryClimateDiagnostic.setpointFeedbackAddress,
            }
          : {
              inScope: false,
              reason: 'basement-entry-not-in-current-view-scope',
            },
      })
    }

    if (activeClimateFeedbackStrategy.strategy !== 'polling-fallback') {
      console.log('[Lynell] Climate feedback strategy', {
        connectionMode: networkConfig.connectionMode,
        requestedMethod: activeClimateFeedbackStrategy.requestedMethod,
        strategy: activeClimateFeedbackStrategy.strategy,
        reason: activeClimateFeedbackStrategy.reason,
        view: activeScopedView,
        mainView: activeMainView,
        scopeDiagnostics:
          activeMainView === 'climate' ? climateScopeDiagnostics : [],
      })

      if (systemMode !== 'live') {
        console.log('[Lynell] Clearing climate cache because live mode is off', {
          view: activeScopedView,
          mainView: activeMainView,
        })
        setLiveClimateTemperatureRoomKeys([])
        setLiveClimateSetpointRoomKeys([])
        setLiveClimateHeatDemandRoomKeys([])
      } else {
        console.log('[Lynell] Preserving climate cache outside active localDirect polling scope', {
          view: activeScopedView,
          mainView: activeMainView,
          connectionMode: networkConfig.connectionMode,
          requestedMethod: activeClimateFeedbackStrategy.requestedMethod,
          actualStrategy: activeClimateFeedbackStrategy.strategy,
          reason: activeClimateFeedbackStrategy.reason,
        })
      }

      climateFeedbackFailureCountRef.current = 0
      return
    }

    console.log('[Lynell] Climate feedback strategy', {
      connectionMode: networkConfig.connectionMode,
      requestedMethod: activeClimateFeedbackStrategy.requestedMethod,
      strategy: activeClimateFeedbackStrategy.strategy,
      reason: activeClimateFeedbackStrategy.reason,
      view: activeScopedView,
      mainView: activeMainView,
      preserveCache: true,
      scopeDiagnostics: climateScopeDiagnostics,
    })

    let isMounted = true
    const scopedRoomKeys = getClimateRoomKeysForView(activeScopedView)

    if (scopedRoomKeys.length === 0) {
      console.log('[Lynell] Skipping climate feedback to protect system', {
        reason: 'No relevant climate rooms for active view',
        view: activeScopedView,
        mainView: activeMainView,
        preserveCache: true,
        scopeDiagnostics: climateScopeDiagnostics,
      })
      climateFeedbackFailureCountRef.current = 0
      return
    }

    const scheduleNextRound = (delayMs: number) => {
      if (!isMounted) {
        return
      }

      if (climateIntervalRef.current !== null) {
        window.clearTimeout(climateIntervalRef.current)
      }

      climateIntervalRef.current = window.setTimeout(() => {
        void runClimatePilotRound()
      }, delayMs)
    }

    const runClimatePilotRound = async () => {
      if (climateInFlightRef.current) {
        console.log('[Lynell] Skipping climate feedback to protect system', {
          reason: 'Previous climate feedback round still running',
          view: activeScopedView,
          mainView: activeMainView,
        })
        return
      }

      if (feedbackInFlightRef.current) {
        console.log('[Lynell] Skipping climate feedback to protect system', {
          reason: 'Light feedback round is active',
          view: activeScopedView,
          mainView: activeMainView,
        })
        scheduleNextRound(
          Math.max(runtimeConfig.climatePollingIntervalSec * 1000, minimumClimateFeedbackIntervalMs),
        )
        return
      }

      const roomBatch = getNextRoomBatch(
        scopedRoomKeys,
        climateRoomsPerRound,
        climateBatchIndexRef,
      )

      if (roomBatch.length === 0) {
        console.log('[Lynell] Skipping climate feedback to protect system', {
          reason: 'No climate targets in current scope',
          view: activeScopedView,
          mainView: activeMainView,
        })
        scheduleNextRound(
          Math.max(runtimeConfig.climatePollingIntervalSec * 1000, minimumClimateFeedbackIntervalMs),
        )
        return
      }

      climateInFlightRef.current = true

      console.log('[Lynell] Starting climate feedback round', {
        view: activeScopedView,
        mainView: activeMainView,
        roomCount: roomBatch.length,
        rooms: roomBatch,
      })

      try {
        const result = await syncLiveClimateRooms(roomBatch)

        if (isMounted) {
          console.log('[Lynell] Merging climate feedback rooms', {
            view: activeScopedView,
            mainView: activeMainView,
            mergedRooms: result.updatedRoomKeys,
            updatedTemperatureRoomKeys: result.updatedTemperatureRoomKeys,
            updatedSetpointRoomKeys: result.updatedSetpointRoomKeys,
            updatedHeatDemandRoomKeys: result.updatedHeatDemandRoomKeys,
          })
          if (result.updatedRoomKeys.length > 0) {
            const latestRoomKey = result.updatedRoomKeys[result.updatedRoomKeys.length - 1]
            const latestRoom = result.rooms.find((room) => room.key === latestRoomKey)
            const latestRoomMapping = latestRoomKey ? lightingConfig[latestRoomKey] : undefined

            recordKnxInWithMetadata(
              'Klima feedback',
              latestRoom?.name ?? result.updatedRoomKeys.join(', '),
              {
                address:
                  (latestRoomKey && result.updatedTemperatureRoomKeys.includes(latestRoomKey)
                    ? latestRoomMapping?.temperature
                    : latestRoomKey && result.updatedSetpointRoomKeys.includes(latestRoomKey)
                      ? latestRoomMapping?.setpointFeedback
                      : latestRoomKey && result.updatedHeatDemandRoomKeys.includes(latestRoomKey)
                        ? latestRoomMapping?.heatDemand
                        : '') || null,
                dataType:
                  latestRoomKey && result.updatedTemperatureRoomKeys.includes(latestRoomKey)
                    ? latestRoomMapping?.temperatureDataType ?? null
                    : latestRoomKey && result.updatedSetpointRoomKeys.includes(latestRoomKey)
                      ? latestRoomMapping?.setpointFeedbackDataType ?? null
                      : latestRoomKey && result.updatedHeatDemandRoomKeys.includes(latestRoomKey)
                        ? latestRoomMapping?.heatDemandDataType ?? null
                        : null,
                mappedValue:
                  latestRoomKey && result.updatedTemperatureRoomKeys.includes(latestRoomKey)
                    ? latestRoom?.temperature ?? null
                    : latestRoomKey && result.updatedSetpointRoomKeys.includes(latestRoomKey)
                      ? latestRoom?.targetTemperature ?? null
                      : latestRoomKey && result.updatedHeatDemandRoomKeys.includes(latestRoomKey)
                        ? latestRoom?.heatDemand ?? null
                        : null,
              },
            )
          }
          setRooms((currentRooms) => mergeRoomPresentation(result.rooms, currentRooms))
          setLiveClimateTemperatureRoomKeys((currentKeys) =>
            Array.from(new Set([...currentKeys, ...result.updatedTemperatureRoomKeys])),
          )
          setLiveClimateSetpointRoomKeys((currentKeys) =>
            Array.from(new Set([...currentKeys, ...result.updatedSetpointRoomKeys])),
          )
          setLiveClimateHeatDemandRoomKeys((currentKeys) =>
            Array.from(new Set([...currentKeys, ...result.updatedHeatDemandRoomKeys])),
          )
          if (result.updatedRoomKeys.includes('basement-entry')) {
            const basementEntryRoom = result.rooms.find((room) => room.key === 'basement-entry')
            console.log('[Lynell] Climate runtime state merged for basement-entry', {
              view: activeScopedView,
              mainView: activeMainView,
              room: basementEntryRoom?.key ?? 'basement-entry',
              temperature: basementEntryRoom?.temperature ?? null,
              targetTemperature: basementEntryRoom?.targetTemperature ?? null,
              heatDemand: basementEntryRoom?.heatDemand ?? null,
              hasLiveTemperatureData: result.updatedTemperatureRoomKeys.includes('basement-entry'),
              hasLiveSetpointData: result.updatedSetpointRoomKeys.includes('basement-entry'),
              hasLiveHeatDemandData: result.updatedHeatDemandRoomKeys.includes('basement-entry'),
            })
          }
        }
        climateFeedbackFailureCountRef.current = 0
      } catch (error) {
        climateFeedbackFailureCountRef.current += 1

        if (isMounted) {
          console.log('[Lynell] Preserving existing climate feedback state after failure', {
            view: activeScopedView,
            mainView: activeMainView,
            roomBatch,
          })
          const nextMessage =
            error instanceof Error
              ? error.message
              : 'Live klima fra KNX er utilgjengelig'
          setErrorMessage(nextMessage)
          setRuntimeIssue(nextMessage)
        }
      } finally {
        climateInFlightRef.current = false

        const baseDelay = Math.max(
          runtimeConfig.climatePollingIntervalSec * 1000,
          minimumClimateFeedbackIntervalMs,
        )
        const failureCount = climateFeedbackFailureCountRef.current
        const nextDelay =
          failureCount >= 2 ? baseDelay * Math.min(failureCount, 4) : baseDelay

        if (failureCount >= 2) {
          console.log('[Lynell] Slowing climate feedback to protect system', {
            view: activeScopedView,
            mainView: activeMainView,
            failureCount,
            nextDelayMs: nextDelay,
          })
        }

        scheduleNextRound(nextDelay)
      }
    }

    console.log('[Lynell] Delaying first climate feedback round after startup', {
      view: activeScopedView,
      mainView: activeMainView,
      delayMs: climateStartupDelayMs,
      roomCount: scopedRoomKeys.length,
      pollingIntervalSec: runtimeConfig.climatePollingIntervalSec,
    })
    scheduleNextRound(climateStartupDelayMs)

    return () => {
      isMounted = false
      climateInFlightRef.current = false

      console.log('[Lynell] Stopping climate polling scope and preserving cache', {
        view: activeScopedView,
        mainView: activeMainView,
      })

      if (climateIntervalRef.current !== null) {
        window.clearTimeout(climateIntervalRef.current)
        climateIntervalRef.current = null
      }
    }
  }, [
    activeMainView,
    activeClimateFeedbackStrategy.reason,
    activeClimateFeedbackStrategy.requestedMethod,
    activeClimateFeedbackStrategy.strategy,
    activeScopedView,
    climateConfigSignature,
    networkConfig.connectionMode,
    roomStructureSignature,
    runtimeConfig.climateFeedbackMethod,
    runtimeConfig.climatePollingIntervalSec,
    systemMode,
  ])

  const runOptimisticRoomUpdate = async (
    roomId: number,
    getOptimisticRoom: (room: Room) => Room,
    runRequest: () => Promise<Room[]>,
    getRollbackRoom: (room: Room) => Room,
    onFailure?: (error: unknown) => void,
  ) => {
    const room = rooms.find((currentRoom) => currentRoom.id === roomId)

    if (!room) {
      return
    }

    setRooms((currentRooms) =>
      currentRooms.map((currentRoom) =>
        currentRoom.id === roomId ? getOptimisticRoom(currentRoom) : currentRoom,
      ),
    )

    try {
      setIsLoading(true)
      setErrorMessage('')
      const nextRooms = await runRequest()
      setRooms((currentRooms) => mergeRoomPresentation(nextRooms, currentRooms))
    } catch (error) {
      onFailure?.(error)
      setRooms((currentRooms) =>
        currentRooms.map((currentRoom) =>
          currentRoom.id === roomId ? getRollbackRoom(room) : currentRoom,
        ),
      )
      const nextMessage = error instanceof Error ? error.message : 'Unknown system error'
      setErrorMessage(nextMessage)
      setRuntimeIssue(nextMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const registerOptimisticLighting = ({
    room,
    zone,
    brightness,
    source,
  }: {
    room: Room
    zone: Room['zones'][number]
    brightness: number
    source: OptimisticLightingSource
  }) => {
    const zoneConfig = lightingConfig[room.key]?.zones[zone.key]
    const normalizedBrightness = Math.max(0, Math.min(100, Math.round(brightness)))
    const now = Date.now()
    const entry: OptimisticLightingEntry = {
      key: getOptimisticLightingKey(room.key, zone.key),
      roomId: room.id,
      roomKey: room.key,
      roomName: room.name,
      zoneId: zone.id,
      zoneKey: zone.key,
      zoneName: zone.name,
      expectedLightsOn: normalizedBrightness > 0,
      expectedBrightness: normalizedBrightness,
      previousLightsOn: zone.lightsOn,
      previousBrightness: zone.brightness,
      source,
      startedAt: now,
      timeoutAt: now + optimisticLightingTimeoutMs,
      status: 'pendingFeedback',
      writeGroupAddress: zoneConfig?.value || zoneConfig?.light || null,
      feedbackGroupAddress: zoneConfig?.valueFeedback || zoneConfig?.lightFeedback || null,
      lastMessage: 'Sist sendte lysverdi vises midlertidig.',
    }

    setOptimisticLightingByKey((current) => ({
      ...current,
      [entry.key]: entry,
    }))
    setOptimisticLightingMetrics((current) => ({
      ...current,
      createdCount: current.createdCount + 1,
    }))

    return entry
  }

  const markOptimisticLightingWriteFailed = (entry: OptimisticLightingEntry, reason: string) => {
    setOptimisticLightingByKey((current) => {
      const next = { ...current }
      delete next[entry.key]
      return next
    })
    setOptimisticLightingMetrics((current) => ({
      ...current,
      failedWriteCount: current.failedWriteCount + 1,
      rollbackCount: current.rollbackCount + 1,
      latestRollbackSignals: [
        {
          key: entry.key,
          roomName: entry.roomName,
          zoneName: entry.zoneName,
          reason,
          at: new Date().toISOString(),
        },
        ...current.latestRollbackSignals,
      ].slice(0, 8),
    }))
  }

  const handleToggleLight = async (roomId: number, zoneId: string) => {
    const room = rooms.find((currentRoom) => currentRoom.id === roomId)

    if (!room) {
      return
    }

    const zone = room.zones.find((currentZone) => currentZone.id === zoneId)

    if (!zone) {
      return
    }

    const nextBrightness = zone.lightsOn
      ? 0
      : zone.brightness > 0
        ? zone.brightness
        : 100
    const optimisticEntry = registerOptimisticLighting({
      room,
      zone,
      brightness: nextBrightness,
      source: 'manualLight',
    })

    await runOptimisticRoomUpdate(
      roomId,
      (currentRoom) => ({
        ...currentRoom,
        zones: currentRoom.zones.map((currentZone) =>
          currentZone.id === zoneId
            ? {
                ...currentZone,
                lightsOn: nextBrightness > 0,
                brightness: nextBrightness,
              }
            : currentZone,
        ),
      }),
      () => {
        const zoneConfig = lightingConfig[room.key]?.zones[zone.key]
        recordKnxOutWithMetadata(
          'Lys write',
          `${room.name} / ${zone.name} -> ${!zone.lightsOn ? 'På' : 'Av'}`,
          {
            address: zoneConfig?.light ?? null,
            dataType: zoneConfig?.lightDataType ?? null,
            mappedValue: !zone.lightsOn,
          },
        )
        return setLight(roomId, zoneId, !zone.lightsOn)
      },
      (previousRoom) => ({
        ...previousRoom,
        zones: previousRoom.zones.map((currentZone) => ({ ...currentZone })),
      }),
      (error) =>
        markOptimisticLightingWriteFailed(
          optimisticEntry,
          error instanceof Error ? error.message : 'writeFailed',
        ),
    )
  }

  const handleModeChange = async (roomId: number, mode: RoomMode) => {
    const targetTemperature = mode === 'Komfort' ? comfortSetpoint : nightSetpoint

    await runOptimisticRoomUpdate(
      roomId,
      (currentRoom) => ({
        ...currentRoom,
        mode,
        targetTemperature,
      }),
      () => {
        const roomName = rooms.find((currentRoom) => currentRoom.id === roomId)?.name ?? `${roomId}`
        const roomConfig = rooms.find((currentRoom) => currentRoom.id === roomId)
        const roomMapping = roomConfig ? lightingConfig[roomConfig.key] : undefined
        recordKnxOutWithMetadata('Klima write', `${roomName} -> ${mode}`, {
          address: roomMapping?.setpoint ?? null,
          dataType: roomMapping?.setpointDataType ?? null,
          mappedValue: targetTemperature,
        })
        return setMode(roomId, mode)
      },
      (previousRoom) => ({
        ...previousRoom,
        mode: previousRoom.mode,
        targetTemperature: previousRoom.targetTemperature,
      }),
    )
  }

  const handleSetpointChange = async (roomId: number, nextSetpoint: number) => {
    const parsedSetpoint = parseTemperatureValue(nextSetpoint)

    if (!Number.isFinite(parsedSetpoint)) {
      return
    }

    const normalizedSetpoint = roundToHalf(parsedSetpoint)

    await runOptimisticRoomUpdate(
      roomId,
      (currentRoom) => ({
        ...currentRoom,
        targetTemperature: normalizedSetpoint,
      }),
      () => {
        const room = rooms.find((currentRoom) => currentRoom.id === roomId)
        const roomMapping = room ? lightingConfig[room.key] : undefined

        console.log('[Lynell] Climate setpoint write requested', {
          roomKey: room?.key ?? roomId,
          roomName: room?.name ?? `${roomId}`,
          address: roomMapping?.setpoint ?? null,
          setpoint: normalizedSetpoint,
          dataType: roomMapping?.setpointDataType ?? null,
          writeTarget: 'setpoint',
        })
        recordKnxOutWithMetadata(
          'Klima write',
          `${room?.name ?? roomId} -> ${normalizedSetpoint.toFixed(1)}°`,
          {
            address: roomMapping?.setpoint ?? null,
            dataType: roomMapping?.setpointDataType ?? null,
            mappedValue: normalizedSetpoint,
          },
        )
        return setSetpoint(roomId, normalizedSetpoint)
      },
      (previousRoom) => ({
        ...previousRoom,
        targetTemperature: previousRoom.targetTemperature,
      }),
    )
  }

  const handleSetpointStep = async (roomId: number, delta: number) => {
    const latestRoom = roomsRef.current.find((currentRoom) => currentRoom.id === roomId)

    if (!latestRoom) {
      return
    }

    const currentSetpoint = roundToHalf(parseTemperatureValue(latestRoom.targetTemperature))
    const step = parseTemperatureValue(delta)

    if (!Number.isFinite(currentSetpoint) || !Number.isFinite(step)) {
      return
    }

    const newSetpoint = roundToHalf(currentSetpoint + step)
    const roomMapping = lightingConfig[latestRoom.key]

    console.log('[Lynell] Climate setpoint step requested', {
      roomKey: latestRoom.key,
      roomName: latestRoom.name,
      currentSetpoint,
      newSetpoint,
      address: roomMapping?.setpoint ?? null,
      dataType: roomMapping?.setpointDataType ?? null,
      writeTarget: 'setpoint',
    })

    const previousSetpoint = latestRoom.targetTemperature
    const optimisticRooms = roomsRef.current.map((currentRoom) =>
      currentRoom.id === roomId
        ? {
            ...currentRoom,
            targetTemperature: newSetpoint,
          }
        : currentRoom,
    )
    roomsRef.current = optimisticRooms
    setRooms(optimisticRooms)

    try {
      setIsLoading(true)
      setErrorMessage('')
      recordKnxOutWithMetadata(
        'Klima write',
        `${latestRoom.name} ${currentSetpoint.toFixed(1)}° -> ${newSetpoint.toFixed(1)}°`,
        {
          address: roomMapping?.setpoint ?? null,
          dataType: roomMapping?.setpointDataType ?? null,
          rawValue: currentSetpoint,
          mappedValue: newSetpoint,
        },
      )
      const nextRooms = await setSetpoint(roomId, newSetpoint)
      setRooms((currentRooms) => {
        const mergedRooms = mergeRoomPresentation(nextRooms, currentRooms)
        roomsRef.current = mergedRooms
        return mergedRooms
      })
    } catch (error) {
      const rolledBackRooms = roomsRef.current.map((currentRoom) =>
        currentRoom.id === roomId
          ? {
              ...currentRoom,
              targetTemperature: previousSetpoint,
            }
          : currentRoom,
      )
      roomsRef.current = rolledBackRooms
      setRooms(rolledBackRooms)
      const nextMessage = error instanceof Error ? error.message : 'Unknown system error'
      setErrorMessage(nextMessage)
      setRuntimeIssue(nextMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBrightnessChange = async (
    roomId: number,
    zoneId: string,
    value: number,
  ) => {
    const brightness = Math.max(0, Math.min(100, Math.round(value)))
    const room = rooms.find((currentRoom) => currentRoom.id === roomId)
    const zone = room?.zones.find((currentZone) => currentZone.id === zoneId)
    const optimisticEntry =
      room && zone
        ? registerOptimisticLighting({
            room,
            zone,
            brightness,
            source: 'manualBrightness',
          })
        : null

    await runOptimisticRoomUpdate(
      roomId,
      (currentRoom) => ({
        ...currentRoom,
        zones: currentRoom.zones.map((currentZone) =>
          currentZone.id === zoneId
            ? {
                ...currentZone,
                brightness,
                lightsOn: brightness > 0,
              }
            : currentZone,
        ),
      }),
      () => {
        const room = rooms.find((currentRoom) => currentRoom.id === roomId)
        const zone = room?.zones.find((currentZone) => currentZone.id === zoneId)
        const zoneConfig = room && zone ? lightingConfig[room.key]?.zones[zone.key] : undefined
        recordKnxOutWithMetadata(
          'Dim write',
          `${room?.name ?? roomId} / ${zone?.name ?? zoneId} -> ${brightness}%`,
          {
            address: zoneConfig?.value ?? null,
            dataType: zoneConfig?.valueDataType ?? null,
            mappedValue: brightness,
          },
        )
        return setBrightness(roomId, zoneId, brightness)
      },
      (previousRoom) => ({
        ...previousRoom,
        zones: previousRoom.zones.map((currentZone) => ({ ...currentZone })),
      }),
      (error) => {
        if (optimisticEntry) {
          markOptimisticLightingWriteFailed(
            optimisticEntry,
            error instanceof Error ? error.message : 'writeFailed',
          )
        }
      },
    )
  }

  const handlePollRoomValues = async (roomKey: string) => {
    const room = roomsRef.current.find((candidate) => candidate.key === roomKey)
    const startedAt = createDiagnosticPulse('KNX poll', room?.name ?? roomKey).at

    setRoomPollStateByKey((current) => ({
      ...current,
      [roomKey]: {
        loading: true,
        lastPollAt: current[roomKey]?.lastPollAt ?? null,
        error: null,
        result: current[roomKey]?.result ?? null,
      },
    }))

    try {
      const result = await pollKnxRoomValues(roomKey)
      const requestedGroups = Array.isArray(result.requestedGroups) ? result.requestedGroups : []
      const updatedGroups = Array.isArray(result.updatedGroups) ? result.updatedGroups : []
      const failedGroups = Array.isArray(result.failedGroups) ? result.failedGroups : []
      const skippedGroups = Array.isArray(result.skippedGroups) ? result.skippedGroups : []
      const normalizedResult: KnxRoomPollResult = {
        ...result,
        requestedGroups,
        updatedGroups,
        failedGroups,
        skippedGroups,
        diagnostics: {
          realFailedCount: result.diagnostics?.realFailedCount ?? failedGroups.length,
          skippedCount: result.diagnostics?.skippedCount ?? skippedGroups.length,
          failedCount: result.diagnostics?.failedCount ?? failedGroups.length,
          classifications: result.diagnostics?.classifications ?? {},
        },
      }
      const [diagnostics, stateSnapshot, runtimeSnapshot, history, aggregates, insights] =
        await Promise.all([
          getKnxDiagnostics(),
          getKnxState(),
          getServerRuntimeState(),
          getServerRuntimeHistory(600, { range: 'week', category: 'all' }),
          getServerRuntimeAggregates(),
          getServerRuntimeInsights(12),
        ])
      const checkedAt = createDiagnosticPulse('KNX poll', 'Oppdatert').at

      setKnxDiagnosticsState({
        checkedAt,
        error: null,
        snapshot: diagnostics,
      })
      setKnxState({
        checkedAt,
        error: null,
        snapshot: stateSnapshot,
      })
      setServerRuntimeState({
        checkedAt,
        error: null,
        snapshot: runtimeSnapshot,
        history,
        aggregates,
        insights,
      })
      setRoomPollStateByKey((current) => ({
        ...current,
        [roomKey]: {
          loading: false,
          lastPollAt: normalizedResult.timestamp,
          error:
            normalizedResult.diagnostics?.realFailedCount && normalizedResult.diagnostics.realFailedCount > 0
              ? `${normalizedResult.diagnostics.realFailedCount} grupper svarte ikke`
              : null,
          result: normalizedResult,
        },
      }))
      recordKnxInWithMetadata(
        'KNX poll',
        `${room?.name ?? roomKey}: ${updatedGroups.length}/${requestedGroups.length} grupper svarte`,
        {
          address: updatedGroups[0]?.groupAddress ?? null,
          dataType: updatedGroups[0]?.dpt ?? null,
          mappingVariant: updatedGroups[0]?.mappingVariant ?? null,
          mappedValue: updatedGroups[0]?.decodedValue ?? null,
        },
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Manuell KNX-rompoll feilet'
      setRoomPollStateByKey((current) => ({
        ...current,
        [roomKey]: {
          loading: false,
          lastPollAt: current[roomKey]?.lastPollAt ?? null,
          error: message,
          result: current[roomKey]?.result ?? null,
        },
      }))
      recordKnxIn('KNX poll', `${room?.name ?? roomKey}: ${message}`)
      setRuntimeIssue(message)
    } finally {
      appendTestLog('KNX poll', `${room?.name ?? roomKey} startet ${startedAt}`)
    }
  }

  const handleHousingChange = <K extends keyof HousingConfig>(
    field: K,
    value: HousingConfig[K],
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      housing: {
        ...currentConfig.housing,
        [field]: value,
      },
    }))
  }

  const handleNetworkModeChange = (value: NetworkConfig['connectionMode']) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      network: {
        ...currentConfig.network,
        connectionMode: value,
      },
    }))
  }

  const handleNetworkEndpointChange = (
    endpoint: 'localDirect' | 'remoteTunnel',
    field: 'host' | 'port',
    value: string,
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      network: {
        ...currentConfig.network,
        [endpoint]: {
          ...currentConfig.network[endpoint],
          [field]: field === 'port' ? Number(value) : value,
        },
      },
    }))
  }

  const handleNetworkConfigChange = <K extends keyof NetworkConfig>(
    field: K,
    value: NetworkConfig[K],
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      network: {
        ...currentConfig.network,
        [field]: value,
      },
    }))
  }

  const handleLanguageChange = (language: AppLanguage) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      language,
    }))
  }

  const handleMqttConfigChange = <K extends keyof MqttConfig>(
    field: K,
    value: MqttConfig[K],
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      mqtt: {
        ...currentConfig.mqtt,
        [field]: value,
      },
    }))
  }

  const handleRoomNameChange = (roomId: number, value: string) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      rooms: currentConfig.rooms.map((room) =>
        room.id === roomId ? { ...room, name: value } : room,
      ),
    }))
  }

  const handleRoomConfiguredChange = (roomId: number, value: boolean) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      rooms: currentConfig.rooms.map((room) =>
        room.id === roomId ? { ...room, configured: value } : room,
      ),
    }))
  }

  const handleRoomAdvancedChange = (
    roomId: number,
    field:
      | 'heatEmitterType'
      | 'heatPowerWatts'
      | 'nominalPowerWatts'
      | 'floorHeatingType'
      | 'floorAreaM2'
      | 'ceilingHeightM'
      | 'manualVolumeM3'
      | 'note',
    value: string,
  ) => {
    const numericFields = new Set(['heatPowerWatts', 'nominalPowerWatts', 'floorAreaM2', 'ceilingHeightM', 'manualVolumeM3'])
    const nextValue =
      field === 'heatEmitterType'
        ? (value as HeatEmitterType)
        : field === 'floorHeatingType'
          ? (value as FloorHeatingType)
        : numericFields.has(field)
          ? value.trim() === ''
            ? null
            : Number(value.replace(',', '.'))
          : value

    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      rooms: currentConfig.rooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              [field]: typeof nextValue === 'number' && Number.isNaN(nextValue) ? null : nextValue,
            }
          : room,
      ),
    }))
  }

  const handleZoneNameChange = (roomId: number, zoneId: string, value: string) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      rooms: currentConfig.rooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              zones: room.zones.map((zone) =>
                zone.id === zoneId ? { ...zone, name: value } : zone,
              ),
            }
          : room,
      ),
    }))
  }

  const handleZoneConfigChange = (
    roomKey: string,
    zoneKey: string,
    field:
      | 'dimmable'
      | 'light'
      | 'lightDataType'
      | 'lightFeedback'
      | 'lightFeedbackDataType'
      | 'value'
      | 'valueDataType'
      | 'valueFeedback'
      | 'valueFeedbackDataType'
      | 'feedbackInterpretationRule'
      | 'deriveLightStateFromValueFeedback',
    value: string | boolean,
  ) => {
    setSystemConfigData((currentConfig) => {
      const roomConfig = currentConfig.rooms.find((room) => room.key === roomKey)
      const zoneConfig = roomConfig?.zones.find((zone) => zone.key === zoneKey)

      if (!roomConfig || !zoneConfig) {
        return currentConfig
      }

      return {
        ...currentConfig,
        rooms: currentConfig.rooms.map((room) =>
          room.key !== roomKey
            ? room
            : {
                ...room,
                zones: room.zones.map((zone) =>
                  zone.key !== zoneKey
                    ? zone
                    : {
                        ...zone,
                        [field]: value,
                      },
                ),
              },
        ),
      }
    })
  }

  const handleClimateConfigChange = (
    roomKey: string,
    field:
      | 'climateActive'
      | 'liveClimateActive'
      | 'temperature'
      | 'temperatureDataType'
      | 'setpoint'
      | 'setpointDataType'
      | 'setpointWriteStrategy'
      | 'mode'
      | 'modeDataType'
      | 'setpointFeedback'
      | 'setpointFeedbackDataType'
      | 'modeFeedback'
      | 'modeFeedbackDataType'
      | 'heatDemand'
      | 'heatDemandDataType',
    value: string | boolean,
  ) => {
    setSystemConfigData((currentConfig) => {
      const roomConfig = currentConfig.rooms.find((room) => room.key === roomKey)

      if (!roomConfig) {
        return currentConfig
      }

      return {
        ...currentConfig,
        rooms: currentConfig.rooms.map((room) =>
          room.key !== roomKey
            ? room
            : {
                ...room,
                climate: {
                  ...room.climate,
                  ...(field === 'climateActive' && !Boolean(value)
                    ? { liveActive: false }
                    : {}),
                  [field === 'climateActive'
                    ? 'active'
                    : field === 'liveClimateActive'
                      ? 'liveActive'
                      : field]:
                    field === 'climateActive' || field === 'liveClimateActive'
                      ? Boolean(value)
                      : String(value),
                },
              },
        ),
      }
    })
  }

  const handleFloorNameChange = (floorId: string, value: string) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      floors: currentConfig.floors.map((floor) =>
        floor.id === floorId ? { ...floor, label: value } : floor,
      ),
    }))
  }

  const handleMoveFloor = (floorId: string, direction: 'up' | 'down') => {
    setSystemConfigData((currentConfig) => {
      const currentIndex = currentConfig.floors.findIndex((floor) => floor.id === floorId)
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

      if (
        currentIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= currentConfig.floors.length
      ) {
        return currentConfig
      }

      const nextFloors = [...currentConfig.floors]
      const [movedFloor] = nextFloors.splice(currentIndex, 1)
      nextFloors.splice(targetIndex, 0, movedFloor)

      return {
        ...currentConfig,
        floors: nextFloors,
      }
    })
  }

  const handleMoveRoom = (roomId: number, direction: 'up' | 'down') => {
    setSystemConfigData((currentConfig) => {
      const currentIndex = currentConfig.rooms.findIndex((room) => room.id === roomId)
      const room = currentConfig.rooms[currentIndex]

      if (!room) {
        return currentConfig
      }

      const targetIndex =
        direction === 'up'
          ? [...currentConfig.rooms]
              .slice(0, currentIndex)
              .map((candidate, index) => ({ candidate, index }))
              .reverse()
              .find(({ candidate }) => candidate.group === room.group)?.index ?? -1
          : currentConfig.rooms
              .map((candidate, index) => ({ candidate, index }))
              .slice(currentIndex + 1)
              .find(({ candidate }) => candidate.group === room.group)?.index ?? -1

      if (targetIndex < 0) {
        return currentConfig
      }

      const nextRooms = [...currentConfig.rooms]
      const [movedRoom] = nextRooms.splice(currentIndex, 1)
      nextRooms.splice(targetIndex, 0, movedRoom)

      return {
        ...currentConfig,
        rooms: nextRooms,
      }
    })
  }

  const handleRuntimeConfigChange = <K extends keyof RuntimeConfig>(
    field: K,
    value: RuntimeConfig[K],
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      runtime: {
        ...currentConfig.runtime,
        [field]: value,
      },
    }))
  }

  const handleSecurityConfigChange = <K extends keyof SecurityConfig>(
    field: K,
    value: SecurityConfig[K],
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      security: {
        ...currentConfig.security,
        [field]: value,
      },
    }))
  }

  const handleMediaConfigChange = <K extends keyof MediaConfig>(
    field: K,
    value: MediaConfig[K],
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      media: {
        ...currentConfig.media,
        [field]: value,
      },
    }))
  }

  const handleCameraProviderEnabledChange = (enabled: boolean) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      camera: {
        ...currentConfig.camera,
        providerEnabled: enabled,
      },
    }))
  }

  const handleCameraRecorderChange = <K extends keyof CameraFoundationConfig['recorder']>(
    field: K,
    value: CameraFoundationConfig['recorder'][K],
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      camera: {
        ...currentConfig.camera,
        recorder: {
          ...currentConfig.camera.recorder,
          [field]:
            field === 'retentionDays'
              ? Math.max(1, Number(value))
              : field === 'maxStorageGb' || field === 'freeSpaceEstimateGb'
                ? String(value ?? '').trim() === ''
                  ? null
                  : Number(value)
                : value,
        },
      },
    }))
  }

  const handleCameraConfigChange = (
    cameraId: string,
    field: keyof CameraDeviceConfig,
    value: string | boolean | number | null,
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      camera: {
        ...currentConfig.camera,
        cameras: currentConfig.camera.cameras.map((camera) =>
          camera.cameraId === cameraId
            ? {
                ...camera,
                [field]:
                  field === 'retentionDays'
                    ? Math.max(1, Number(value))
                    : field === 'sourceAgeMs'
                      ? value === null || String(value).trim() === ''
                        ? null
                        : Number(value)
                      : value,
              }
            : camera,
        ),
      },
    }))
  }

  const handleAddCameraConfig = () => {
    const nextId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `camera-${Date.now()}`

    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      camera: {
        ...currentConfig.camera,
        cameras: [
          ...currentConfig.camera.cameras,
          {
            cameraId: nextId,
            displayName: 'Nytt IP-kamera',
            type: 'genericIpCamera' as CameraType,
            rtspUrl: '',
            onvif: '',
            snapshotUrl: '',
            roomId: '',
            enabled: false,
            visible: true,
            state: 'unknown' as CameraRuntimeState,
            sourceAgeMs: null,
            recordingEnabled: false,
            recorderTarget: currentConfig.camera.recorder.target,
            retentionDays: currentConfig.camera.recorder.retentionDays,
            overwriteOldest: currentConfig.camera.recorder.overwriteOldest,
            motionAvailable: false,
            audioAvailable: false,
            confidence: 'low',
          },
        ],
      },
    }))
  }

  const handleDeleteCameraConfig = (cameraId: string) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      camera: {
        ...currentConfig.camera,
        cameras: currentConfig.camera.cameras.filter((camera) => camera.cameraId !== cameraId),
      },
    }))
  }

  const handleAddMediaGroupConfig = () => {
    const nextId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `media-group-${Date.now()}`

    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      media: {
        ...currentConfig.media,
        groups: [
          ...currentConfig.media.groups,
          {
            mediaGroupId: nextId,
            displayName: 'Ny media-gruppe',
            speakers: [],
            castTargets: [],
            delayOffsetsMs: {},
            enabled: false,
            state: 'unknown' as MediaGroupState,
            groupConfidence: 'low' as MediaGroupConfidence,
          },
        ],
      },
    }))
  }

  const handleMediaGroupConfigChange = (
    mediaGroupId: string,
    field: keyof MediaGroupConfig,
    value: string | boolean,
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      media: {
        ...currentConfig.media,
        groups: currentConfig.media.groups.map((group) =>
          group.mediaGroupId === mediaGroupId
            ? {
                ...group,
                [field]: field === 'castTargets' ? textToList(String(value)) : value,
              }
            : group,
        ),
      },
    }))
  }

  const handleAddMediaGroupSpeaker = (mediaGroupId: string) => {
    const nextId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `speaker-${Date.now()}`

    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      media: {
        ...currentConfig.media,
        groups: currentConfig.media.groups.map((group) =>
          group.mediaGroupId === mediaGroupId
            ? {
                ...group,
                speakers: [
                  ...group.speakers,
                  {
                    id: nextId,
                    deviceId: '',
                    displayName: 'Ny høyttaler',
                    roomKey: '',
                    offsetMs: 0,
                    calibrationStatus: 'notCalibrated',
                    lastLatencyEstimateMs: null,
                  },
                ],
              }
            : group,
        ),
      },
    }))
  }

  const handleMediaGroupSpeakerChange = (
    mediaGroupId: string,
    speakerId: string,
    field: keyof MediaGroupSpeakerConfig,
    value: string | number | null,
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      media: {
        ...currentConfig.media,
        groups: currentConfig.media.groups.map((group) =>
          group.mediaGroupId === mediaGroupId
            ? {
                ...group,
                speakers: group.speakers.map((speaker) =>
                  speaker.id === speakerId
                    ? {
                        ...speaker,
                        [field]:
                          field === 'offsetMs' || field === 'lastLatencyEstimateMs'
                            ? value === null || String(value).trim() === ''
                              ? field === 'lastLatencyEstimateMs'
                                ? null
                                : 0
                              : Number(value)
                            : value,
                      }
                    : speaker,
                ),
              }
            : group,
        ),
      },
    }))
  }

  const handleDeleteMediaGroupSpeaker = (mediaGroupId: string, speakerId: string) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      media: {
        ...currentConfig.media,
        groups: currentConfig.media.groups.map((group) =>
          group.mediaGroupId === mediaGroupId
            ? {
                ...group,
                speakers: group.speakers.filter((speaker) => speaker.id !== speakerId),
              }
            : group,
        ),
      },
    }))
  }

  const handleMediaTrackSelect = (trackId: string) => {
    const nextTrack = getTrackById(mediaLibrary, trackId)

    if (selectedMediaRoute === 'cast') {
      setMediaPlayer((currentPlayer) => ({
        ...playMediaTrack(currentPlayer, trackId),
        isPlaying: false,
      }))

      if (nextTrack) {
        void handleCastPlayFoundation(nextTrack)
      }
      return
    }

    setMediaPlayer((currentPlayer) => playMediaTrack(currentPlayer, trackId))
  }

  const handleToggleMediaPlayback = async () => {
    if (selectedMediaRoute === 'cast') {
      setMediaPlayer((currentPlayer) => ({ ...currentPlayer, isPlaying: false }))

      if (!currentMediaTrack) {
        return
      }

      if (castPlaybackState === 'playing') {
        await handleCastPauseFoundation()
      } else {
        await handleCastPlayFoundation()
      }
      return
    }

    setMediaPlayer((currentPlayer) =>
      currentPlayer.currentTrackId ? toggleMediaPlayback(currentPlayer) : currentPlayer,
    )
  }

  const handleSkipMediaTrack = (direction: 'next' | 'previous') => {
    if (selectedMediaRoute === 'cast') {
      const nextPlayer = skipMediaTrack(mediaPlayer, direction)
      const nextTrack = getTrackById(mediaLibrary, nextPlayer.currentTrackId)

      setMediaPlayer({ ...nextPlayer, isPlaying: false })

      if (nextTrack) {
        void handleCastPlayFoundation(nextTrack)
      }
      return
    }

    setMediaPlayer((currentPlayer) => skipMediaTrack(currentPlayer, direction))
  }

  const handleMediaVolumeChange = (volume: number) => {
    setMediaPlayer((currentPlayer) => {
      setMediaDevices((currentDevices) =>
        setMediaDeviceVolume(currentDevices, activeMediaDevice?.deviceId ?? currentPlayer.activeDeviceId, volume),
      )
      return setMediaVolume(currentPlayer, volume)
    })

    if (selectedMediaRoute === 'cast') {
      const checkedAt = createDiagnosticPulse('Cast playback', 'Volume').at

      void castSetVolume(volume)
        .then((playback) => {
          setBridgeCastState((currentState) => ({ ...currentState, checkedAt, error: null, playback }))
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : 'Cast volum feilet'
          setBridgeCastState((currentState) => ({ ...currentState, checkedAt, error: message }))
          appendTestLog('Media', `Cast volum feilet: ${message}`)
        })
    }
  }

  const handleDiscoverCastDevices = async () => {
    const checkedAt = createDiagnosticPulse('Cast discovery', 'Manuelt søk').at

    try {
      const snapshot = await discoverCastDevices()
        setBridgeCastState({
          checkedAt,
          error: null,
          playback: snapshot.playback ?? bridgeCastState.playback,
          snapshot,
        })

      if (snapshot.devices.length > 0) {
        appendTestLog('Media', `Cast discovery fant ${snapshot.devices.length} enheter`)
      } else {
        appendTestLog('Media', snapshot.error ? `Cast discovery: ${snapshot.error}` : 'Cast discovery fant ingen enheter')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cast discovery feilet'
      setBridgeCastState({
        checkedAt,
        error: message,
        playback: null,
        snapshot: null,
      })
      appendTestLog('Media', `Cast discovery feilet: ${message}`)
    }
  }

  const handleCastPlayFoundation = async (trackOverride?: MediaTrack | null) => {
    const checkedAt = createDiagnosticPulse('Cast playback', 'Play foundation').at
    const track = trackOverride ?? currentMediaTrack

    try {
      const playback = await castPlay({
        deviceId: activeMediaDevice?.deviceId ?? null,
        mediaUrl: track?.sourceUrl ?? null,
        title: track?.title ?? null,
      })
      setBridgeCastState((currentState) => ({
        ...currentState,
        checkedAt,
        error: null,
        playback,
      }))
      appendTestLog('Media', playback.message)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cast play foundation feilet'
      setBridgeCastState((currentState) => ({
        ...currentState,
        checkedAt,
        error: message,
      }))
      appendTestLog('Media', `Cast play feilet: ${message}`)
    }
  }

  const handleCastPauseFoundation = async () => {
    const checkedAt = createDiagnosticPulse('Cast playback', 'Pause foundation').at

    try {
      const playback = await castPause()
      setBridgeCastState((currentState) => ({ ...currentState, checkedAt, error: null, playback }))
      appendTestLog('Media', playback.message)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cast pause foundation feilet'
      setBridgeCastState((currentState) => ({ ...currentState, checkedAt, error: message }))
      appendTestLog('Media', `Cast pause feilet: ${message}`)
    }
  }

  const handleCastStopFoundation = async () => {
    const checkedAt = createDiagnosticPulse('Cast playback', 'Stop foundation').at

    try {
      const playback = await castStop()
      setBridgeCastState((currentState) => ({ ...currentState, checkedAt, error: null, playback }))
      appendTestLog('Media', playback.message)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cast stop foundation feilet'
      setBridgeCastState((currentState) => ({ ...currentState, checkedAt, error: message }))
      appendTestLog('Media', `Cast stop feilet: ${message}`)
    }
  }

  const handleMainViewChange = (view: MainView) => {
    setActiveMainView(view)
    setIsMainNavOpen(false)
  }

  const handleLayoutModeChange = (mode: 'mobile' | 'desktop') => {
    setLayoutMode(mode)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(layoutModeStorageKey, mode)
    }
  }

  const handleThemeModeChange = (mode: ThemeMode) => {
    setThemeMode(mode)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(themeModeStorageKey, mode)
    }
  }

  const playLynellSound = async (soundId: string, options: { force?: boolean } = {}) => {
    const status = await lynellAudioPlayerRef.current?.playSound(
      soundId,
      lynellAudioSettings,
      options,
    )

    if (status) {
      setAudioLastPlayback(status)
    }

    return status ?? null
  }

  const handleAudioConfigChange = <K extends keyof SystemAudioConfig>(
    field: K,
    value: SystemAudioConfig[K],
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      audio: {
        ...currentConfig.audio,
        [field]: field === 'masterVolume' ? Number(value) : value,
      },
    }))
  }

  const handleAudioCategoryChange = (category: SystemAudioCategory, enabled: boolean) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      audio: {
        ...currentConfig.audio,
        categories: {
          ...currentConfig.audio.categories,
          [category]: enabled,
        },
      },
    }))
  }

  const handleTestAudioSound = async (soundId = systemConfigData.audio.testSoundId) => {
    const status = await playLynellSound(soundId, { force: true })
    const sound = lynellAudioManifestById.get(soundId)

    appendTestLog(
      'Systemlyd',
      status?.ok && !status.skipped
        ? `Testet ${sound?.purpose ?? soundId}`
        : `Test feilet/ble blokkert: ${status?.reason ?? 'ukjent status'}`,
    )
  }

  const handleIdleScreenConfigChange = <K extends keyof IdleScreenConfig>(
    field: K,
    value: IdleScreenConfig[K],
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      idleScreen: {
        ...currentConfig.idleScreen,
        [field]:
          field === 'idleTimeoutSeconds'
            ? Math.max(10, Number(value))
            : value,
      },
    }))
  }

  const handleIdleCustomImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      appendTestLog('Hvileskjerm', 'Avviste fil som ikke er bilde')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      setSystemConfigData((currentConfig) => ({
        ...currentConfig,
        idleScreen: {
          ...currentConfig.idleScreen,
          useCustomImage: Boolean(dataUrl),
          customImageDataUrl: dataUrl,
        },
      }))
      appendTestLog('Hvileskjerm', 'Custom idle-bilde lastet i config')
    }
    reader.onerror = () => {
      appendTestLog('Hvileskjerm', 'Kunne ikke lese custom idle-bilde')
    }
    reader.readAsDataURL(file)
  }

  const handleResetIdleCustomImage = () => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      idleScreen: {
        ...currentConfig.idleScreen,
        useCustomImage: false,
        customImageDataUrl: '',
      },
    }))
  }

  const handlePreviewIdleScreen = () => {
    setIdleScreenVisible(true)
  }

  const handleIdleWake = () => {
    const now = Date.now()
    lastIdleActivityAtRef.current = now
    setLastIdleActivityAt(now)
    setIdleScreenVisible(false)
  }

  const handleOpenRoomManager = (roomKey?: string | null) => {
    const nextRoomKey =
      roomKey && managerRooms.some((room) => room.key === roomKey)
        ? roomKey
        : selectedRoomKey && managerRooms.some((room) => room.key === selectedRoomKey)
          ? selectedRoomKey
          : managerRooms[0]?.key ?? null

    setSelectedRoomKey(nextRoomKey)
    setActiveMainView('room-manager')
    setIsMainNavOpen(false)
  }

  const handleOpenTrendHistory = (roomKey?: string | null) => {
    const nextRoomKey =
      roomKey && rooms.some((room) => room.key === roomKey)
        ? roomKey
        : selectedRoomKey && rooms.some((room) => room.key === selectedRoomKey)
          ? selectedRoomKey
          : rooms[0]?.key ?? null

    setSelectedRoomKey(nextRoomKey)
    setActiveMainView('trend-history')
    setIsMainNavOpen(false)
  }

  const handleMediaDeviceChange = (deviceId: string) => {
    setMediaDevices((currentDevices) => {
      const nextDevices = setActiveMediaDevice(currentDevices, deviceId)
      const selectedDevice = nextDevices.find((device) => device.deviceId === deviceId)
      setMediaPlayer((currentPlayer) => {
        const routedPlayer = setMediaOutputDevice(currentPlayer, nextDevices, deviceId)
        return selectedDevice?.availability === 'discovered'
          ? { ...routedPlayer, isPlaying: false }
          : routedPlayer
      })
      return nextDevices
    })
  }

  const handleSensorConfigChange = (
    roomKey: string,
    sensorKey: keyof SystemSensorConfig,
    field: 'address' | 'dataType',
    value: string,
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      rooms: currentConfig.rooms.map((room) =>
        room.key !== roomKey
          ? room
          : {
              ...room,
              sensors: {
                ...(room.sensors ?? {
                  presence: { address: '', dataType: '1-bit' as KnxDataType },
                  motion: { address: '', dataType: '1-bit' as KnxDataType },
                  co2: { address: '', dataType: '2-byte float' as KnxDataType },
                  humidity: { address: '', dataType: '2-byte float' as KnxDataType },
                  floorTemperature: { address: '', dataType: '2-byte float' as KnxDataType },
                  lux: { address: '', dataType: '2-byte float' as KnxDataType },
                }),
                [sensorKey]: {
                  ...(room.sensors?.[sensorKey] ?? { address: '', dataType: '1-bit' as KnxDataType }),
                  [field]: value,
                },
              },
            },
      ),
    }))
  }

  const handleShadingConfigChange = (
    shadingId: string,
    field:
      | 'label'
      | 'roomKey'
      | 'type'
      | 'active'
      | 'visible'
      | 'maturity'
      | 'zoneId'
      | 'zoneName'
      | 'up'
      | 'down'
      | 'stop'
      | 'position'
      | 'feedbackPosition'
      | 'upDownDpt'
      | 'stopDpt'
      | 'positionDpt'
      | 'feedbackPositionDpt'
      | 'invertUpDown'
      | 'invertPosition'
      | 'windAlarm'
      | 'sunAuto'
      | 'positionDataType'
      | 'angle'
      | 'angleDataType',
    value: string | boolean,
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      shading: currentConfig.shading.map((item) =>
        item.id === shadingId ? { ...item, [field]: value } : item,
      ),
    }))
  }

  const handleAddShadingConfig = () => {
    const nextId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `shading-${Date.now()}`
    const defaultRoomKey = managerRooms[0]?.key ?? ''

    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      shading: [
        ...currentConfig.shading,
        {
          id: nextId,
          roomKey: defaultRoomKey,
          label: 'Ny solskjerming',
          type: 'screen' as ShadingType,
          active: false,
          visible: true,
          maturity: 'foundation',
          zoneId: '',
          zoneName: '',
          up: '',
          down: '',
          stop: '',
          position: '',
          feedbackPosition: '',
          upDownDpt: '1.008',
          stopDpt: '1.007',
          positionDpt: '5.001',
          feedbackPositionDpt: '5.001',
          invertUpDown: false,
          invertPosition: false,
          windAlarm: '',
          sunAuto: '',
          positionDataType: '1-byte' as KnxDataType,
          angle: '',
          angleDataType: '1-byte' as KnxDataType,
          source: 'manager-config',
          confidence: 'low',
        },
      ],
    }))
  }

  const handleWeatherStationChange = (
    field: keyof SystemWeatherStationConfig,
    value: SystemWeatherStationConfig[keyof SystemWeatherStationConfig],
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      weatherStation: {
        ...currentConfig.weatherStation,
        [field]: value,
      },
    }))
  }

  const handleTechnicalConfigChange = (
    field: keyof SystemTechnicalConfig,
    pointField: 'address' | 'dataType',
    value: string,
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      technical: {
        ...currentConfig.technical,
        [field]: {
          ...currentConfig.technical[field],
          [pointField]: value,
        },
      },
    }))
  }

  const handleIntegrationActiveChange = (active: boolean) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      integrations: {
        ...currentConfig.integrations,
        bacnet: {
          ...currentConfig.integrations.bacnet,
          active,
        },
      },
    }))
  }

  const handleAddBacnetPoint = () => {
    const nextId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `bacnet-${Date.now()}`

    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      integrations: {
        ...currentConfig.integrations,
        bacnet: {
          ...currentConfig.integrations.bacnet,
          points: [
            ...currentConfig.integrations.bacnet.points,
            {
              id: nextId,
              name: 'Nytt BACnet-punkt',
              dataType: '1-byte' as KnxDataType,
              access: 'read' as KnxAccessMode,
              externalRef: '',
            },
          ],
        },
      },
    }))
  }

  const handleBacnetPointChange = (
    pointId: string,
    field: keyof BacnetPointConfig,
    value: string,
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      integrations: {
        ...currentConfig.integrations,
        bacnet: {
          ...currentConfig.integrations.bacnet,
          points: currentConfig.integrations.bacnet.points.map((point) =>
            point.id === pointId ? { ...point, [field]: value } : point,
          ),
        },
      },
    }))
  }

  const handleCalendarEventChange = (
    eventId: string,
    field: keyof CalendarEventConfig,
    value: string,
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      calendar: {
        ...currentConfig.calendar,
        events: currentConfig.calendar.events.map((event) =>
          event.id === eventId ? { ...event, [field]: value } : event,
        ),
      },
    }))
  }

  const handleAddCalendarEvent = () => {
    const nextId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `calendar-${Date.now()}`

    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      calendar: {
        ...currentConfig.calendar,
        events: [
          ...currentConfig.calendar.events,
          {
            id: nextId,
            title: 'Ny aktivitet',
            date: todayKey,
            startTime: '17:00',
            endTime: '18:00',
            person: '',
            place: '',
            note: '',
          },
        ],
      },
    }))
  }

  const handleBookingResourceChange = (
    resourceId: string,
    field: keyof BookingResourceConfig,
    value: string | boolean | number,
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      calendar: {
        ...currentConfig.calendar,
        resources: currentConfig.calendar.resources.map((resource) =>
          resource.id === resourceId ? { ...resource, [field]: value } : resource,
        ),
      },
    }))
  }

  const focusRoomForBooking = (roomKey: string) => {
    const room = rooms.find((candidate) => candidate.key === roomKey)
    const floor = floorConfigs.find((candidate) => candidate.roomGroup === room?.group)

    if (!room || !floor) {
      return
    }

    setActiveFloorId(floor.id)
    setActiveMainView('climate')
  }

  const handleAddBookingResource = () => {
    const nextId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `resource-${Date.now()}`

    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      calendar: {
        ...currentConfig.calendar,
        resources: [
          ...currentConfig.calendar.resources,
          {
            id: nextId,
            name: 'Ny ressurs',
            type: 'annet',
            active: true,
            roomKey: '',
            sceneId: '',
            climateRelevant: false,
            allowOverlap: false,
            bufferBeforeMin: 0,
            bufferAfterMin: 0,
            note: '',
            sendToCalendarDefault: false,
          },
        ],
      },
    }))
  }

  const handleBookingChange = (
    bookingId: string,
    field: keyof BookingConfig,
    value: string | boolean,
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      calendar: {
        ...currentConfig.calendar,
        bookings: currentConfig.calendar.bookings.map((booking) =>
          booking.id === bookingId ? { ...booking, [field]: value } : booking,
        ),
      },
    }))
  }

  const handleAddBooking = () => {
    const nextId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `booking-${Date.now()}`

    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      calendar: {
        ...currentConfig.calendar,
        bookings: [
          ...currentConfig.calendar.bookings,
          {
            id: nextId,
            resourceId: currentConfig.calendar.resources[0]?.id ?? '',
            title: 'Ny booking',
            date: todayKey,
            startTime: '18:00',
            endTime: '19:00',
            createdBy: '',
            participants: '',
            status: 'draft',
            note: '',
            sendToCalendar: false,
          },
        ],
      },
    }))
  }

  const handleApplySceneTriggerTime = (sceneId: string, triggerTime: string) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      scenes: currentConfig.scenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              enabled: true,
              triggerType: 'time',
              triggerTime,
            }
          : scene,
      ),
    }))
  }

  const getNextDateKeyForNivaWeekday = (weekdayIndex: number) => {
    const date = new Date(currentClock)
    const currentWeekday = date.getDay()
    const daysAhead = (weekdayIndex - currentWeekday + 7) % 7 || 7
    date.setDate(date.getDate() + daysAhead)

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-')
  }

  const getNivaCalendarDateFromText = (normalizedText: string) => {
    const monthMap: Record<string, number> = {
      januar: 0,
      februar: 1,
      mars: 2,
      april: 3,
      mai: 4,
      juni: 5,
      juli: 6,
      august: 7,
      september: 8,
      oktober: 9,
      november: 10,
      desember: 11,
    }
    const explicitDateMatch = normalizedText.match(
      /\b(\d{1,2})\s*(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)\b/,
    )

    if (explicitDateMatch) {
      const day = Number(explicitDateMatch[1])
      const month = monthMap[explicitDateMatch[2]]
      const candidate = new Date(currentClock)
      candidate.setFullYear(currentClock.getFullYear(), month, day)
      candidate.setHours(0, 0, 0, 0)
      const today = new Date(currentClock)
      today.setHours(0, 0, 0, 0)

      if (candidate.getTime() < today.getTime()) {
        candidate.setFullYear(candidate.getFullYear() + 1)
      }

      return [
        candidate.getFullYear(),
        String(candidate.getMonth() + 1).padStart(2, '0'),
        String(candidate.getDate()).padStart(2, '0'),
      ].join('-')
    }

    const weekdayMap: Record<string, number> = {
      søndag: 0,
      sondag: 0,
      mandag: 1,
      tirsdag: 2,
      onsdag: 3,
      torsdag: 4,
      fredag: 5,
      lørdag: 6,
      lordag: 6,
    }
    const weekdayMatch = Object.keys(weekdayMap).find((weekday) =>
      normalizedText.includes(weekday),
    )

    return normalizedText.includes('i dag')
      ? todayKey
      : normalizedText.includes('i morgen')
        ? tomorrowKey
        : weekdayMatch
          ? getNextDateKeyForNivaWeekday(weekdayMap[weekdayMatch])
          : todayKey
  }

  const getNivaCalendarTimeFromText = (normalizedText: string) => {
    const timeMatch =
      normalizedText.match(/kl\.?\s*(\d{1,2})(?::?(\d{2}))?/) ??
      normalizedText.match(/\b(\d{1,2})[:.](\d{2})\b/)
    const parsedHour = timeMatch ? Number(timeMatch[1]) : 12
    const parsedMinute = timeMatch?.[2] ? Number(timeMatch[2]) : 0
    const hour = Number.isFinite(parsedHour) ? Math.max(0, Math.min(23, parsedHour)) : 12
    const minute = Number.isFinite(parsedMinute) ? Math.max(0, Math.min(59, parsedMinute)) : 0

    return {
      startTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      explicit: Boolean(timeMatch),
    }
  }

  const cleanNivaCalendarTitle = (value: string) =>
    value
      .replace(/legg inn|opprett|i kalenderen?|kalender/gi, '')
      .replace(/kl\.?\s*\d{1,2}([:.]\d{2})?/gi, '')
      .replace(/\b(i dag|i morgen|søndag|sondag|mandag|tirsdag|onsdag|torsdag|fredag|lørdag|lordag)\b/gi, '')
      .replace(/\b\d{1,2}\s*(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)\b/gi, '')
      .replace(/^\s*(og|samt|,|;)\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim()

  const createNivaCalendarEvent = (
    title: string,
    date: string,
    startTime: string,
    timestamp: number,
    index = 0,
    note = 'Opprettet via NIVA',
  ): CalendarEventConfig => {
    const endDate = new Date(`${date}T${startTime}:00`)
    endDate.setMinutes(endDate.getMinutes() + 60)
    const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(
      endDate.getMinutes(),
    ).padStart(2, '0')}`

    return {
      id: `niva-calendar-${timestamp}-${index}`,
      title,
      date,
      startTime,
      endTime,
      person: '',
      place: '',
      note,
    }
  }

  const getNivaCalendarEventsFromText = (
    text: string,
    normalizedText: string,
    timestamp: number,
  ): {
    events: CalendarEventConfig[]
    confidence: 'high' | 'medium' | 'low'
    missingFields: string[]
    clarification: string | null
  } | undefined => {
    const { startTime, explicit: hasExplicitTime } = getNivaCalendarTimeFromText(normalizedText)
    const dateMatches = Array.from(
      normalizedText.matchAll(
        /\b(\d{1,2})\s*(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)\b/g,
      ),
    )

    if (dateMatches.length > 1) {
      const events = dateMatches
        .map((match, index) => {
          const startIndex = index === 0 ? 0 : (dateMatches[index - 1].index ?? 0) + dateMatches[index - 1][0].length
          const endIndex = match.index ?? normalizedText.length
          const rawTitle = cleanNivaCalendarTitle(text.slice(startIndex, endIndex))
          const title = rawTitle ? rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1) : ''
          const date = getNivaCalendarDateFromText(match[0])

          return title ? createNivaCalendarEvent(title, date, startTime, timestamp, index) : null
        })
        .filter((event): event is CalendarEventConfig => Boolean(event))

      if (events.length === 0) {
        return undefined
      }

      return {
        events,
        confidence: hasExplicitTime ? 'high' : 'medium',
        missingFields: hasExplicitTime ? [] : ['time'],
        clarification: hasExplicitTime
          ? null
          : 'Jeg fant datoene, men ikke klokkeslett. Jeg foreslår kl. 12:00 hvis du bekrefter.',
      }
    }

    const title = cleanNivaCalendarTitle(text)

    if (!title) {
      return undefined
    }

    return {
      events: [
        createNivaCalendarEvent(
          title,
          getNivaCalendarDateFromText(normalizedText),
          startTime,
          timestamp,
        ),
      ],
      confidence: hasExplicitTime ? 'high' : 'medium',
      missingFields: hasExplicitTime ? [] : ['time'],
      clarification: hasExplicitTime
        ? null
        : 'Jeg fant ikke klokkeslett. Jeg foreslår kl. 12:00 hvis du bekrefter.',
    }
  }

  const normalizeNivaRoomText = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ø/g, 'o')
      .replace(/æ/g, 'ae')
      .replace(/å/g, 'a')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()

  const formatNivaSetpoint = (value: number) =>
    value.toLocaleString('nb-NO', {
      minimumFractionDigits: value % 1 === 0 ? 0 : 1,
      maximumFractionDigits: 1,
    })

  const hasSelectedRoomReference = (value: string) => {
    const normalizedValue = normalizeNivaRoomText(value)

    return (
      normalizedValue.includes(' her') ||
      normalizedValue === 'her' ||
      normalizedValue.includes(' dette') ||
      normalizedValue === 'dette' ||
      normalizedValue.includes('dette rommet') ||
      normalizedValue.includes('rommet her') ||
      normalizedValue.includes('dette rom')
    )
  }

  const getNivaRoomMatch = (normalizedText: string) => {
    const commandText = normalizeNivaRoomText(normalizedText)
    const roomCandidates = rooms.map((room) => {
      const config = savedSystemConfigData.rooms.find((configRoom) => configRoom.key === room.key)
      const name = room.name.trim()
      const keyParts = room.key.split('-')

      return {
        room,
        config,
        aliases: [
          name,
          `${name}et`,
          room.key,
          room.key.replace(/-/g, ' '),
          keyParts[keyParts.length - 1] ?? '',
          name.replace(/rom$/i, ''),
          name === 'Hobby' ? 'hobbyrom' : '',
          name === 'Entré' ? 'gangen' : '',
          name === 'Entré' ? 'entre' : '',
          name === 'Entré' ? 'endre' : '',
          name === 'Entré' ? 'endré' : '',
          room.key === 'basement-entry' ? 'basement entry' : '',
          room.key === 'basement-entry' ? 'entry' : '',
          room.key === 'basement-entry' ? 'inngang' : '',
          name === 'TV-stue' ? 'tv stue' : '',
        ]
          .filter(Boolean)
          .map(normalizeNivaRoomText),
      }
    })
    const selectedRoomCandidate =
      selectedFocusRoom && hasSelectedRoomReference(normalizedText)
        ? roomCandidates.find((candidate) => candidate.room.key === selectedFocusRoom.key)
        : undefined

    if (selectedRoomCandidate) {
      return selectedRoomCandidate
    }

    return roomCandidates
      .filter(({ aliases }) => aliases.some((alias) => alias && commandText.includes(alias)))
      .sort((a, b) => Math.max(...b.aliases.map((alias) => alias.length)) - Math.max(...a.aliases.map((alias) => alias.length)))[0]
  }

  const getSelectedNivaRoomCandidate = () => {
    const room =
      selectedFocusRoom ??
      selectedTrendRoom ??
      (selectedRoomManagerConfig
        ? rooms.find((candidate) => candidate.key === selectedRoomManagerConfig.key) ?? null
        : null)
    const config = room
      ? savedSystemConfigData.rooms.find((candidate) => candidate.key === room.key)
      : selectedRoomManagerConfig ?? undefined

    if (!room) {
      return undefined
    }

    return { room, config, aliases: [] }
  }

  const getContextualNivaRoomMatch = (normalizedText: string) =>
    getNivaRoomMatch(normalizedText) ?? getSelectedNivaRoomCandidate()

  const getNivaBrightnessPercent = (normalizedText: string) => {
    const percentMatch = normalizedText.match(/(\d{1,3})\s*%/)

    if (!percentMatch) {
      return null
    }

    const value = Number(percentMatch[1])

    if (!Number.isFinite(value)) {
      return null
    }

    return Math.max(0, Math.min(100, Math.round(value)))
  }

  const getNivaZoneMatch = (room: Room, normalizedText: string) => {
    const commandText = normalizeNivaRoomText(normalizedText)

    return room.zones.find((zone, index) => {
      const aliases = [
        zone.name,
        zone.key,
        zone.id,
        `sone ${index + 1}`,
        `zone ${index + 1}`,
        zone.name.toLowerCase().includes('sofa') ? 'sofa' : '',
      ]
        .filter(Boolean)
        .map(normalizeNivaRoomText)

      return aliases.some((alias) => alias && commandText.includes(alias))
    })
  }

  const getNivaDimmableZones = (room: Room) =>
    room.zones.filter((zone) => {
      const zoneConfig = lightingConfig[room.key]?.zones[zone.key]
      return Boolean(zoneConfig?.value?.trim())
    })

  const getNivaLightActionResult = (
    normalizedText: string,
  ): { proposedAction?: NivaProposedAction; issue?: string; pendingClarification?: NivaPendingClarification } | undefined => {
    const activeClarification =
      nivaPendingClarification && Date.now() < nivaPendingClarification.expiresAt
        ? nivaPendingClarification
        : null
    const pendingRoom = activeClarification
      ? rooms.find((room) => room.key === activeClarification.roomKey)
      : null
    const pendingConfig = pendingRoom
      ? savedSystemConfigData.rooms.find((room) => room.key === pendingRoom.key)
      : undefined
    const resolvesPendingLight =
      Boolean(activeClarification) &&
      (normalizedText.includes('bare') ||
        normalizedText.includes('kun') ||
        normalizedText.includes('alle') ||
        Boolean(pendingRoom && getNivaZoneMatch(pendingRoom, normalizedText)))
    const wantsOff =
      normalizedText.includes('slå av') ||
      normalizedText.includes('sla av') ||
      normalizedText.includes('skru av') ||
      normalizedText.includes('slukk') ||
      resolvesPendingLight
    const wantsDim =
      normalizedText.includes('demp') ||
      normalizedText.includes('dim') ||
      /\b\d{1,3}\s*%/.test(normalizedText)

    if (!wantsOff && !wantsDim) {
      return undefined
    }

    const matchedRoom =
      pendingRoom && activeClarification
        ? { room: pendingRoom, config: pendingConfig, aliases: [] }
        : getContextualNivaRoomMatch(normalizedText)

    if (!matchedRoom) {
      return {
        issue: wantsDim
          ? 'Hvilket rom ønsker du å dempe?'
          : 'Hvilket rom gjelder lyset?',
      }
    }

    const zoneMatch = getNivaZoneMatch(matchedRoom.room, normalizedText)

    if (wantsDim) {
      const brightness = getNivaBrightnessPercent(normalizedText)

      if (brightness === null) {
        return {
          issue: `Hvilket lysnivå ønsker du i ${matchedRoom.room.name}?`,
        }
      }

      const dimmableZones = zoneMatch
        ? getNivaDimmableZones(matchedRoom.room).filter((zone) => zone.id === zoneMatch.id)
        : getNivaDimmableZones(matchedRoom.room)

      if (dimmableZones.length === 0) {
        return {
          issue: `${matchedRoom.room.name} har ingen dimmeadresse klar i Lynell ennå.`,
        }
      }

      return {
        proposedAction: {
          kind: 'roomBrightness',
          label: 'Lys',
          summary:
            dimmableZones.length === 1
              ? `Demp ${matchedRoom.room.name} / ${dimmableZones[0].name} til ${brightness}%`
              : `Demp ${matchedRoom.room.name} til ${brightness}%`,
          roomId: matchedRoom.room.id,
          roomKey: matchedRoom.room.key,
          roomName: matchedRoom.room.name,
          brightness,
          zoneIds: dimmableZones.map((zone) => zone.id),
          zoneKeys: dimmableZones.map((zone) => zone.key),
          zoneNames: dimmableZones.map((zone) => zone.name),
        },
      }
    }

    if (wantsOff) {
      if (zoneMatch) {
        return {
          proposedAction: {
            kind: 'zoneLightsOff',
            label: 'Lys',
            summary: `Slå av ${matchedRoom.room.name} / ${zoneMatch.name}`,
            roomId: matchedRoom.room.id,
            roomKey: matchedRoom.room.key,
            roomName: matchedRoom.room.name,
            zoneId: zoneMatch.id,
            zoneKey: zoneMatch.key,
            zoneName: zoneMatch.name,
          },
        }
      }

      const activeZones = matchedRoom.room.zones.filter((zone) => zone.lightsOn)

      if (activeZones.length > 1 && !normalizedText.includes('alle')) {
        const now = Date.now()

        return {
          issue: `Jeg fant ${activeZones.length} aktive lyssoner i ${matchedRoom.room.name}. Vil du slå av alle, eller bare én sone?`,
          pendingClarification: {
            id: `niva-clarify-light-${now}`,
            kind: 'roomLightZone',
            roomId: matchedRoom.room.id,
            roomKey: matchedRoom.room.key,
            roomName: matchedRoom.room.name,
            createdAt: now,
            expiresAt: now + 2 * 60 * 1000,
            originalText: normalizedText,
          },
        }
      }

      return {
        proposedAction: {
          kind: 'roomLightsOff',
          label: 'Lys',
          summary: `Slå av lys i ${matchedRoom.room.name}`,
          roomId: matchedRoom.room.id,
          roomKey: matchedRoom.room.key,
          roomName: matchedRoom.room.name,
        },
      }
    }

    return undefined
  }

  const getNivaClimateSetpointAction = (
    normalizedText: string,
  ): { proposedAction?: NivaProposedAction; issue?: string } | undefined => {
    const matchedRoom = getContextualNivaRoomMatch(normalizedText)
    const usesSelectedContext = hasSelectedRoomReference(normalizedText)
    const relativeDirection = normalizedText.includes('varmere')
      ? 0.5
      : normalizedText.includes('kaldere') || normalizedText.includes('kaldt')
        ? -0.5
        : 0
    const temperatureMatch = normalizedText.match(/(\d{1,2}(?:[,.]\d)?)\s*(?:grader|grad|°|c)?/)

    if (!temperatureMatch && relativeDirection === 0) {
      return {
        issue:
          'Jeg trenger rom og ønsket temperatur. For eksempel: “sett Entré til 21,5 grader”.',
      }
    }

    if (!matchedRoom) {
      return {
        issue: usesSelectedContext
          ? 'Velg et rom først, så kan jeg lage et trygt temperaturforslag.'
          : 'Hvilket rom ønsker du å endre?',
      }
    }

    const parsedSetpoint = temperatureMatch
      ? Number(temperatureMatch[1].replace(',', '.'))
      : matchedRoom.room.targetTemperature + relativeDirection
    const setpoint = Math.round(parsedSetpoint * 2) / 2

    if (!Number.isFinite(setpoint) || setpoint < 5 || setpoint > 35) {
      return {
        issue: 'Jeg fant en temperatur, men den ser ikke trygg ut å bruke som settpunkt.',
      }
    }

    if (!matchedRoom.config?.climate.setpoint.trim()) {
      return {
        issue: `${matchedRoom.room.name} er funnet, men temperaturstyring er ikke klar i Lynell ennå.`,
      }
    }

    return {
      proposedAction: {
        kind: 'climateSetpoint',
        label: 'Klima',
        summary: `Sett ${matchedRoom.room.name} til ${formatNivaSetpoint(setpoint)} °C`,
        roomId: matchedRoom.room.id,
        roomKey: matchedRoom.room.key,
        roomName: matchedRoom.room.name,
        setpoint,
      },
    }
  }

  const getNivaProposedAction = (
    text: string,
    normalizedText: string,
    intent: NivaMessage['intent'],
    timestamp: number,
  ): NivaProposedAction | undefined => {
    if (intent === 'calendar' && (normalizedText.includes('legg inn') || normalizedText.includes('opprett'))) {
      const calendarDraft = getNivaCalendarEventsFromText(text, normalizedText, timestamp)

      if (!calendarDraft?.events.length) {
        return undefined
      }
      const fingerprint = createCalendarActionFingerprint(calendarDraft.events)

      return {
        kind: 'calendar',
        label: 'Kalender',
        summary: summarizeCalendarEvents(calendarDraft.events),
        event: calendarDraft.events[0],
        events: calendarDraft.events,
        actionId: `niva-calendar-action-${timestamp}`,
        fingerprint,
        confidence: calendarDraft.confidence,
        missingFields: calendarDraft.missingFields,
        clarification: calendarDraft.clarification,
      }
    }

    if (intent === 'scene') {
      const sceneKeyword = ['natt', 'borte', 'kveld', 'morgen', 'hjemme'].find((keyword) =>
        normalizedText.includes(keyword),
      )
      const scene = scenesConfig.find(
        (currentScene) =>
          currentScene.enabled &&
          sceneKeyword &&
          currentScene.name.toLowerCase().includes(sceneKeyword),
      )

      if (scene) {
        return {
          kind: 'scene',
          label: 'Scene',
          summary: `Aktiver ${scene.name}`,
          sceneId: scene.id,
          sceneName: scene.name,
        }
      }
    }

    if (
      intent === 'media' ||
      normalizedText.includes('flytt musikken') ||
      normalizedText.includes('flytte musikken') ||
      normalizedText.includes('høyttaler') ||
      normalizedText.includes('hoyttaler') ||
      normalizedText.includes('output')
    ) {
      if (normalizedText.includes('pause')) {
        return {
          kind: 'mediaControl',
          label: 'Media',
          summary: 'Pause lokal avspilling',
          action: 'pause',
        }
      }

      const requestedDevice = findMediaDeviceForText(mediaDevices, normalizedText)
      const wantsDeviceRouting =
        normalizedText.includes('spill') ||
        normalizedText.includes('flytt') ||
        normalizedText.includes('flytte') ||
        normalizedText.includes('rute') ||
        normalizedText.includes('send')

      if (requestedDevice && wantsDeviceRouting) {
        return {
          kind: 'mediaControl',
          label: 'Media',
          summary: `Rute media til ${requestedDevice.name}`,
          action: 'device',
          deviceId: requestedDevice.deviceId,
          deviceName: requestedDevice.name,
        }
      }

      if (normalizedText.includes('rolig')) {
        const calmTrack = getCalmTrack(mediaLibrary)

        return {
          kind: 'mediaControl',
          label: 'Media',
          summary: calmTrack ? `Spill ${calmTrack.title}` : 'Spill rolig lokal musikk',
          action: 'playCalm',
          trackId: calmTrack?.id,
        }
      }

      if (normalizedText.includes('kveld')) {
        const eveningTrack = getTrackByMood(mediaLibrary, 'evening') ?? mediaLibrary[0] ?? null

        return {
          kind: 'mediaControl',
          label: 'Media',
          summary: eveningTrack ? `Spill ${eveningTrack.title}` : 'Spill kveldsmusikk',
          action: 'playMood',
          trackId: eveningTrack?.id,
          mood: 'evening',
        }
      }

      if (normalizedText.includes('fokus')) {
        const focusTrack = getTrackByMood(mediaLibrary, 'focus') ?? mediaLibrary[0] ?? null

        return {
          kind: 'mediaControl',
          label: 'Media',
          summary: focusTrack ? `Spill ${focusTrack.title}` : 'Spill fokusmusikk',
          action: 'playMood',
          trackId: focusTrack?.id,
          mood: 'focus',
        }
      }

      if (normalizedText.includes('sove') || normalizedText.includes('nattmusikk')) {
        const sleepTrack = getTrackByMood(mediaLibrary, 'sleep') ?? mediaLibrary[0] ?? null

        return {
          kind: 'mediaControl',
          label: 'Media',
          summary: sleepTrack ? `Spill ${sleepTrack.title}` : 'Spill sovemusikk',
          action: 'playMood',
          trackId: sleepTrack?.id,
          mood: 'sleep',
        }
      }

      if (normalizedText.includes('spill') && mediaLibrary.length > 0) {
        return {
          kind: 'mediaControl',
          label: 'Media',
          summary: 'Start lokal avspilling',
          action: 'play',
        }
      }
    }

    if (intent === 'vacuum') {
      const vacuum = vacuumDevices[0]

      if (vacuum) {
        const wantsPause =
          normalizedText.includes('pause') ||
          normalizedText.includes('paus')
        const wantsDock =
          normalizedText.includes('lad') ||
          normalizedText.includes('dock') ||
          normalizedText.includes('base') ||
          normalizedText.includes('hjem')
        const wantsStop =
          normalizedText.includes('stopp') ||
          normalizedText.includes('stop')
        const wantsStart =
          normalizedText.includes('start') ||
          normalizedText.includes('støvsug') ||
          normalizedText.includes('stovsug') ||
          normalizedText.includes('rengjør') ||
          normalizedText.includes('rengjor')
        const action = wantsPause
          ? 'pause'
          : wantsDock
            ? 'dock'
            : wantsStop
              ? 'stop'
              : wantsStart
                ? 'start'
                : null

        if (!action) {
          return undefined
        }

        const actionLabel =
          action === 'pause'
            ? 'pause'
            : action === 'dock'
              ? 'send til lading'
              : action === 'stop'
                ? 'stopp'
                : 'start'

        return {
          kind: 'vacuumControl',
          label: 'Robot',
          summary: `Forbered ${actionLabel} av ${vacuum.model}`,
          action,
          deviceId: vacuum.deviceId,
        }
      }
    }

    if (
      intent === 'light' &&
      normalizedText.includes('lys') &&
      (normalizedText.includes('slå av') || normalizedText.includes('skru av'))
    ) {
      return {
        kind: 'lightsOff',
        label: 'Lys',
        summary: 'Slå av alle lyssoner som er registrert på',
      }
    }

    return undefined
  }

  const markStaleCalendarActions = (now = Date.now()) => {
    setCalendarActionTrustRecords((currentRecords) =>
      currentRecords.map((record) =>
        record.state === 'pendingConfirmation' &&
        now - Date.parse(record.proposedAt) > calendarPendingTimeoutMs
          ? {
              ...record,
              state: 'stale',
              staleAt: new Date(now).toISOString(),
              error: 'Forslaget ble ikke bekreftet i tide.',
            }
          : record,
      ),
    )
  }

  const upsertCalendarActionRecord = (nextRecord: CalendarActionTrustRecord) => {
    setCalendarActionTrustRecords((currentRecords) => {
      const existingIndex = currentRecords.findIndex((record) => record.actionId === nextRecord.actionId)
      const nextRecords =
        existingIndex >= 0
          ? currentRecords.map((record, index) =>
              index === existingIndex
                ? {
                    ...record,
                    ...nextRecord,
                  }
                : record,
            )
          : [nextRecord, ...currentRecords]

      return nextRecords.slice(0, 20)
    })
  }

  const updateCalendarActionRecord = (
    action: NivaProposedAction,
    state: CalendarActionLifecycleState,
    update: Partial<CalendarActionTrustRecord> = {},
  ) => {
    if (action.kind !== 'calendar') {
      return
    }

    const events = getCalendarActionEvents(action)
    const fingerprint = action.fingerprint ?? createCalendarActionFingerprint(events)
    const nowIso = new Date().toISOString()
    const existingRecord = calendarActionTrustRecords.find(
      (record) => record.actionId === (action.actionId ?? fingerprint),
    )
    upsertCalendarActionRecord({
      actionId: action.actionId ?? fingerprint,
      fingerprint,
      summary: action.summary,
      state,
      confidence: action.confidence ?? 'medium',
      events,
      proposedAt: update.proposedAt ?? existingRecord?.proposedAt ?? nowIso,
      confirmedAt: update.confirmedAt ?? existingRecord?.confirmedAt ?? null,
      completedAt: update.completedAt ?? existingRecord?.completedAt ?? null,
      failedAt: update.failedAt ?? existingRecord?.failedAt ?? null,
      cancelledAt: update.cancelledAt ?? existingRecord?.cancelledAt ?? null,
      staleAt: update.staleAt ?? existingRecord?.staleAt ?? null,
      error: update.error ?? existingRecord?.error ?? null,
      duplicatePrevented: update.duplicatePrevented ?? existingRecord?.duplicatePrevented ?? false,
      duplicateOf: update.duplicateOf ?? existingRecord?.duplicateOf ?? null,
      source: 'niva',
      ...update,
    })
  }

  const findRecentCalendarDuplicate = (
    fingerprint: string,
    now = Date.now(),
    records = calendarActionTrustRecords,
  ) =>
    records.find(
      (record) =>
        record.fingerprint === fingerprint &&
        (record.state === 'created' || record.state === 'creating' || record.state === 'queued') &&
        now - Date.parse(record.completedAt ?? record.confirmedAt ?? record.proposedAt) <= calendarDuplicateWindowMs,
    )

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      markStaleCalendarActions()
    }, 60 * 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const formatNivaTemperature = (value: number) => `${formatNivaSetpoint(value)} °C`

  const getNivaRoomStatusAnswer = (matchedRoom: ReturnType<typeof getNivaRoomMatch>) => {
    if (!matchedRoom) {
      return 'Jeg fant ikke rommet.'
    }

    const { room, config } = matchedRoom
    const parts: string[] = []

    if (config?.climate.active) {
      parts.push(`${room.name} holder ${formatNivaTemperature(room.temperature)}`)
      parts.push(`settpunktet er ${formatNivaTemperature(room.targetTemperature)}`)

      if (typeof room.heatDemand === 'number') {
        parts.push(getHeatDemandText(room.heatDemand))
      }
    } else {
      parts.push(`${room.name} har ikke aktiv klima i Lynell ennå`)
    }

    const activeZones = room.zones.filter((zone) => zone.lightsOn)

    if (room.zones.length > 0) {
      parts.push(
        activeZones.length === 0
          ? 'ingen lys er registrert på'
          : `${activeZones.length} lyssoner er på`,
      )
    }

    return `${parts.join(', ')}.`
  }

  const getNivaRoomTemperatureAnswer = (matchedRoom: ReturnType<typeof getNivaRoomMatch>) => {
    if (!matchedRoom) {
      return 'Jeg fant ikke rommet.'
    }

    if (!matchedRoom.config?.climate.active) {
      return `${matchedRoom.room.name} har ikke aktiv klima i Lynell ennå.`
    }

    return `${matchedRoom.room.name} viser ${formatNivaTemperature(matchedRoom.room.temperature)}. Settpunktet er ${formatNivaTemperature(matchedRoom.room.targetTemperature)}.`
  }

  const getNivaRoomWarmthAnswer = (matchedRoom: ReturnType<typeof getNivaRoomMatch>) => {
    if (!matchedRoom) {
      return 'Jeg fant ikke rommet.'
    }

    if (!matchedRoom.config?.climate.active) {
      return `${matchedRoom.room.name} har ikke aktiv klima i Lynell ennå.`
    }

    const delta = matchedRoom.room.temperature - matchedRoom.room.targetTemperature

    if (delta > targetTolerance) {
      return `${matchedRoom.room.name} er litt over settpunktet: ${formatNivaTemperature(matchedRoom.room.temperature)} mot ${formatNivaTemperature(matchedRoom.room.targetTemperature)}.`
    }

    if (delta < -targetTolerance) {
      return `${matchedRoom.room.name} er under settpunktet: ${formatNivaTemperature(matchedRoom.room.temperature)} mot ${formatNivaTemperature(matchedRoom.room.targetTemperature)}.`
    }

    return `${matchedRoom.room.name} ligger nær settpunktet på ${formatNivaTemperature(matchedRoom.room.targetTemperature)}.`
  }

  const getNivaRoomHeatingExplanation = (matchedRoom: ReturnType<typeof getNivaRoomMatch>) => {
    if (!matchedRoom) {
      return 'Jeg fant ikke rommet.'
    }

    if (!matchedRoom.config?.climate.active) {
      return `${matchedRoom.room.name} har ikke aktiv klima i Lynell ennå.`
    }

    const delta = matchedRoom.room.temperature - matchedRoom.room.targetTemperature

    if (typeof matchedRoom.room.heatDemand === 'number' && matchedRoom.room.heatDemand > 0) {
      return `${matchedRoom.room.name} varmer fordi rommet ber om varme nå. Temperaturen er ${formatNivaTemperature(matchedRoom.room.temperature)}, settpunktet er ${formatNivaTemperature(matchedRoom.room.targetTemperature)}, og varmebehovet er ${getHeatDemandText(matchedRoom.room.heatDemand)}.`
    }

    if (delta < -targetTolerance) {
      return `${matchedRoom.room.name} ligger under settpunktet, så det er naturlig at rommet ber om varme.`
    }

    if (Math.abs(delta) <= targetTolerance) {
      return `${matchedRoom.room.name} er nær settpunktet, så varmebehovet bør være lavt eller stabilt.`
    }

    return `${matchedRoom.room.name} ligger over settpunktet, så jeg forventer ikke aktivt varmebehov akkurat nå.`
  }

  const getNivaRoomLightAnswer = (matchedRoom: ReturnType<typeof getNivaRoomMatch>) => {
    if (!matchedRoom) {
      return 'Jeg fant ikke rommet.'
    }

    if (matchedRoom.room.zones.length === 0) {
      return `${matchedRoom.room.name} har ingen lyssoner konfigurert ennå.`
    }

    const activeZones = matchedRoom.room.zones.filter((zone) => zone.lightsOn)
    const latestLightPoint = getNivaLatestRoomTruthPoint(matchedRoom.room.key, 'brightness', true)
    const lightPolicy = getSignalUpdatePolicy('brightness', latestLightPoint?.source)
    const onChangeText =
      lightPolicy.updateMode === 'onChange'
        ? ' Lysstatus oppdateres normalt ved endring, så sist kjente status kan være riktig selv om timestampen er gammel.'
        : ''

    if (activeZones.length === 0) {
      return `Sist kjente lysstatus i ${matchedRoom.room.name}: ingen lys er registrert på.${onChangeText}`
    }

    return `Sist kjente lysstatus i ${matchedRoom.room.name}: ${activeZones.length} lyssoner på: ${activeZones
      .map((zone) => `${zone.name}${zone.brightness > 0 ? ` ${zone.brightness}%` : ''}`)
      .join(', ')}.${onChangeText}`
  }

  const getNivaRoomHistoryAnswer = (
    matchedRoom: ReturnType<typeof getNivaRoomMatch>,
    field: 'temperature' | 'heatDemand' | 'brightness',
  ) => {
    if (!matchedRoom) {
      return 'Jeg fant ikke rommet.'
    }

    if (field === 'brightness') {
      const points = runtimeHistory.filter(
        (point) => point.roomKey === matchedRoom.room.key && point.field === 'brightness',
      )

      if (points.length < 2) {
        return `Jeg har ikke nok lyshistorikk for ${matchedRoom.room.name} ennå.`
      }

      const wasOn = points.some((point) => point.value > 0)
      return wasOn
        ? `${matchedRoom.room.name} har hatt lysaktivitet i siste periode.`
        : `${matchedRoom.room.name} har ikke vært registrert med lys på i historikken jeg har nå.`
    }

    const points = runtimeHistory
      .filter((point) => point.roomKey === matchedRoom.room.key && point.field === field)
      .slice(-12)

    if (points.length < 2) {
      return `Jeg har ikke nok historikk for ${matchedRoom.room.name} ennå.`
    }

    const average = points.reduce((sum, point) => sum + point.value, 0) / points.length
    const delta = points[points.length - 1].value - points[0].value
    const trend = Math.abs(delta) < 0.3 ? 'stabilt' : delta > 0 ? 'stigende' : 'fallende'

    if (field === 'heatDemand') {
      if (average >= 60) {
        return `Varmen i ${matchedRoom.room.name} har jobbet tydelig siste periode.`
      }

      if (average >= 25) {
        return `Varmen i ${matchedRoom.room.name} har vært moderat aktiv siste periode.`
      }

      return `Varmen i ${matchedRoom.room.name} har vært lav siste periode.`
    }

    return `${matchedRoom.room.name} har vært ${trend} rundt ${formatNivaTemperature(
      Number(average.toFixed(1)),
    )} i historikken jeg har nå.`
  }

  const getNivaRoomHeatNeedAnswer = (matchedRoom: ReturnType<typeof getNivaRoomMatch>) => {
    if (!matchedRoom) {
      return 'Jeg fant ikke rommet.'
    }

    if (!matchedRoom.config?.climate.active) {
      return `${matchedRoom.room.name} har ikke aktiv klima i Lynell ennå.`
    }

    const analysis = getRoomHeatNeedAnalysis(
      matchedRoom.config,
      getHistoryPoints(matchedRoom.room.key, 'heatDemand'),
      matchedRoom.room.temperature,
      matchedRoom.room.targetTemperature,
    )

    if (analysis.status === 'missing') {
      return `Jeg trenger mer romdata og heatDemand-historikk før jeg vurderer varmebehovet i ${matchedRoom.room.name}.`
    }

    if (analysis.status === 'over') {
      return `${matchedRoom.room.name} har hatt høyere varmebehov enn forventet for romvolumet.`
    }

    if (analysis.status === 'under') {
      return `${matchedRoom.room.name} ligger under normalt varmebehov i siste periode.`
    }

    return `${matchedRoom.room.name} ser ut til å ha normalt varmebehov akkurat nå.`
  }

  const getNivaComfortAnswer = (
    normalizedText: string,
    matchedRoom?: ReturnType<typeof getNivaRoomMatch>,
  ) => {
    if (matchedRoom) {
      const roomComfort = comfortEnergyInsight.rooms.find(
        (room) => room.roomKey === matchedRoom.room.key,
      )

      if (!roomComfort) {
        return `${matchedRoom.room.name} trenger mer klima- og historikkdata før jeg vurderer komforten.`
      }

      return [roomComfort.nivaSummary, roomComfort.confidenceLine].filter(Boolean).join(' ')
    }

    if (
      normalizedText.includes('tungt å varme') ||
      normalizedText.includes('tungt a varme') ||
      normalizedText.includes('varme opp') ||
      normalizedText.includes('energibruk') ||
      normalizedText.includes('energi')
    ) {
      if (comfortEnergyInsight.highHeatRooms.length === 0) {
        return [
          'Huset virker ikke spesielt tungt å varme opp akkurat nå.',
          comfortEnergyInsight.spatialSummary,
          comfortEnergyInsight.weatherSummary,
          comfortEnergyInsight.confidenceLine,
        ]
          .filter(Boolean)
          .join(' ')
      }

      return [
        `Mest varmeaktivitet ligger i ${comfortEnergyInsight.highHeatRooms
          .slice(0, 3)
          .map((room) => room.roomName)
          .join(', ')}.`,
        comfortEnergyInsight.spatialSummary,
        comfortEnergyInsight.weatherSummary,
        comfortEnergyInsight.confidenceLine,
      ]
        .filter(Boolean)
        .join(' ')
    }

    if (normalizedText.includes('kalde') || normalizedText.includes('kaldt') || normalizedText.includes('kjølig') || normalizedText.includes('kjolig')) {
      const coolRooms = comfortEnergyInsight.rooms.filter((room) => room.state === 'cool')

      if (coolRooms.length === 0) {
        return 'Jeg ser ingen rom som tydelig ligger kjølig akkurat nå.'
      }

      return `Litt kjølige rom: ${coolRooms.slice(0, 3).map((room) => room.roomName).join(', ')}.`
    }

    if (normalizedText.includes('hobby')) {
      const hobbyRooms = comfortEnergyInsight.rooms.filter((room) =>
        `${room.roomName} ${room.areaLabel ?? ''}`.toLowerCase().includes('hobby'),
      )

      if (hobbyRooms.length === 0) {
        return 'Jeg finner ikke en tydelig hobbydel i komfortbildet ennå.'
      }

      return `${hobbyRooms.map((room) => room.nivaSummary).slice(0, 2).join(' ')}`
    }

    return comfortEnergyInsight.nivaSummary
  }

  const getNivaAdaptiveAwarenessAnswer = (normalizedText: string) => {
    if (
      normalizedText.includes('varmebehov') ||
      normalizedText.includes('varmen') ||
      normalizedText.includes('komfort')
    ) {
      return adaptiveHomeAwareness.comfortLine
    }

    if (
      normalizedText.includes('rytme') ||
      normalizedText.includes('tidligere') ||
      normalizedText.includes('sammenlignet')
    ) {
      return adaptiveHomeAwareness.rhythmLine
    }

    if (
      normalizedText.includes('sensor') ||
      normalizedText.includes('device') ||
      normalizedText.includes('signal') ||
      normalizedText.includes('stabil')
    ) {
      return adaptiveHomeAwareness.deviceLine
    }

    if (
      normalizedText.includes('assistent') ||
      normalizedText.includes('støvsuger') ||
      normalizedText.includes('stovsuger') ||
      normalizedText.includes('rengjøring') ||
      normalizedText.includes('rengjoring')
    ) {
      return adaptiveHomeAwareness.assistantLine
    }

    return adaptiveHomeAwareness.nivaSummary
  }

  const getNivaRecommendationAnswer = () => {
    const recommendation = visibleRecommendations[0]

    if (!recommendation) {
      return houseConfidence.level === 'lav'
        ? 'Jeg ville ventet på litt ferskere signaler før jeg anbefaler tiltak.'
        : 'Jeg ser ingen tydelige anbefalinger akkurat nå. Huset virker stabilt.'
    }

    const roomText = recommendation.relatedRoomKey
      ? rooms.find((room) => room.key === recommendation.relatedRoomKey)?.name
      : null

    return [
      `Jeg ville ${recommendation.title.toLowerCase()}.`,
      recommendation.shortText,
      roomText ? `Dette gjelder ${roomText}.` : '',
      recommendation.priority === 'high' ? 'Det er verdt å følge med på.' : '',
    ]
      .filter(Boolean)
      .join(' ')
  }

  const getNivaServerInsightAnswer = () => {
    const insight = serverRuntimeState.insights?.insights[0]

    if (!insight) {
      return serverRuntimeState.insights?.sparse
        ? 'Jeg bygger fortsatt opp server-historikken. Foreløpig er datagrunnlaget for mønstre tynt.'
        : 'Jeg ser ingen tydelige server-observasjoner akkurat nå.'
    }

    const confidenceText =
      insight.confidence === 'high'
        ? 'Dette har godt signalgrunnlag.'
        : insight.confidence === 'medium'
          ? 'Dette har middels signalgrunnlag.'
          : 'Dette er en forsiktig observasjon med tynt datagrunnlag.'

    return `${insight.summary} ${confidenceText}`
  }

  const getNivaRoomReportAnswer = (matchedRoom: ReturnType<typeof getNivaRoomMatch>) => {
    if (!matchedRoom) {
      return 'Jeg fant ikke rommet.'
    }

    return getRoomReport(matchedRoom.room, matchedRoom.config).text
  }

  const getRoomReportProposedAction = (
    room: Room,
    config: SystemRoomConfig | undefined,
    report: RoomReport,
  ): NivaProposedAction | undefined => {
    if (report.status === 'normal') {
      return undefined
    }

    if (config?.climate.active && config.climate.setpoint.trim()) {
      const nextSetpoint = roundToHalf(room.targetTemperature - 0.5)

      return {
        kind: 'climateSetpoint',
        label: 'Klima',
        summary: `Senk ${room.name} til ${formatNivaSetpoint(nextSetpoint)} °C`,
        roomId: room.id,
        roomKey: room.key,
        roomName: room.name,
        setpoint: nextSetpoint,
      }
    }

    const activeZones = room.zones.filter((zone) => zone.lightsOn)

    if (activeZones.length > 0) {
      return {
        kind: 'roomLightsOff',
        label: 'Lys',
        summary: `Slå av lys i ${room.name}`,
        roomId: room.id,
        roomKey: room.key,
        roomName: room.name,
      }
    }

    if (config?.climate.active && config.climate.mode.trim()) {
      return {
        kind: 'roomMode',
        label: 'Klima',
        summary: `Sett ${room.name} til nattmodus`,
        roomId: room.id,
        roomKey: room.key,
        roomName: room.name,
        mode: 'Natt',
      }
    }

    return undefined
  }

  const getNivaRoomRecommendationAnswer = (matchedRoom: ReturnType<typeof getNivaRoomMatch>) => {
    if (!matchedRoom) {
      return 'Jeg fant ikke rommet.'
    }

    const report = getRoomReport(matchedRoom.room, matchedRoom.config)

    if (report.recommendations.length === 0) {
      return `${matchedRoom.room.name} ser stabilt ut akkurat nå. Jeg ville bare fulgt med videre.`
    }

    return `${matchedRoom.room.name}: ${report.recommendations.join(' ')}`
  }

  const getNivaRoomActionProposal = (normalizedText: string) => {
    const matchedRoom = getNivaRoomMatch(normalizedText)

    if (!matchedRoom) {
      return undefined
    }

    const report = getRoomReport(matchedRoom.room, matchedRoom.config)
    const activeZones = matchedRoom.room.zones.filter((zone) => zone.lightsOn)

    if (
      normalizedText.includes('lys') &&
      (normalizedText.includes('slå av') || normalizedText.includes('skru av')) &&
      activeZones.length > 0
    ) {
      return {
        kind: 'roomLightsOff',
        label: 'Lys',
        summary: `Slå av lys i ${matchedRoom.room.name}`,
        roomId: matchedRoom.room.id,
        roomKey: matchedRoom.room.key,
        roomName: matchedRoom.room.name,
      } satisfies NivaProposedAction
    }

    if (
      (normalizedText.includes('natt') || normalizedText.includes('nattmodus')) &&
      matchedRoom.config?.climate.active &&
      matchedRoom.config.climate.mode.trim()
    ) {
      return {
        kind: 'roomMode',
        label: 'Klima',
        summary: `Sett ${matchedRoom.room.name} til nattmodus`,
        roomId: matchedRoom.room.id,
        roomKey: matchedRoom.room.key,
        roomName: matchedRoom.room.name,
        mode: 'Natt',
      } satisfies NivaProposedAction
    }

    return getRoomReportProposedAction(matchedRoom.room, matchedRoom.config, report)
  }

  const getNivaRoomsToWatchAnswer = () => {
    const reports = rooms
      .map((room) => {
        const config = savedSystemConfigData.rooms.find((candidate) => candidate.key === room.key)

        return {
          room,
          report: getRoomReport(room, config),
        }
      })
      .filter(({ report }) => report.status !== 'normal')

    if (reports.length === 0) {
      return 'Jeg ser ingen rom som tydelig trenger oppfølging akkurat nå.'
    }

    return `Jeg ville fulgt med på ${reports
      .slice(0, 3)
      .map(({ room, report }) => `${room.name} (${report.statusLabel.toLowerCase()})`)
      .join(', ')}.`
  }

  const getNivaHighHeatNeedAnswer = () => {
    const analysedRooms = climateRooms
      .map((room) => {
        const config = savedSystemConfigData.rooms.find((candidate) => candidate.key === room.key)

        return {
          room,
          analysis: getRoomHeatNeedAnalysis(
            config,
            getHistoryPoints(room.key, 'heatDemand'),
            room.temperature,
            room.targetTemperature,
          ),
        }
      })
      .filter(({ analysis }) => analysis.status === 'over')

    if (analysedRooms.length === 0) {
      const hasAnyAnalysis = climateRooms.some((room) => {
        const config = savedSystemConfigData.rooms.find((candidate) => candidate.key === room.key)
        return (
          getRoomHeatNeedAnalysis(
            config,
            getHistoryPoints(room.key, 'heatDemand'),
            room.temperature,
            room.targetTemperature,
          ).status !== 'missing'
        )
      })

      return hasAnyAnalysis
        ? [comfortEnergyInsight.summary, comfortEnergyInsight.spatialSummary].filter(Boolean).join(' ')
        : 'Jeg har foreløpig lite heatDemand-historikk, men jeg bruker siste-kjente temperaturer når de finnes.'
    }

    return `Rom med høyest varmebehov nå: ${analysedRooms
      .slice(0, 3)
      .map(({ room }) => room.name)
      .join(', ')}. ${comfortEnergyInsight.spatialSummary ?? ''}`.trim()
  }

  const getNivaWeatherAnswer = (normalizedText: string) => {
    if (!weatherAwareness.current) {
      return weatherError
        ? 'Jeg har ikke en stabil værkilde koblet til akkurat nå. Lynell er klargjort for værprovider senere, men jeg kan ikke gi live varsel ennå.'
        : 'Jeg har ikke værkilde koblet til ennå. Dette kan legges inn som weather provider senere.'
    }

    const { current } = weatherAwareness
    const updatedText = weatherAwareness.updatedAt
      ? new Intl.DateTimeFormat('nb-NO', {
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(weatherAwareness.updatedAt))
      : null

    if (normalizedText.includes('sist oppdatert') || normalizedText.includes('oppdatert')) {
      return updatedText
        ? `Været ble sist oppdatert kl. ${updatedText}.`
        : 'Jeg har ikke tidspunkt for siste væroppdatering ennå.'
    }

    if (normalizedText.includes('i morgen') || normalizedText.includes('imorgen')) {
      return weatherAwareness.forecastTomorrow?.weatherText
        ? `I morgen: ${weatherAwareness.forecastTomorrow.weatherText}. Akkurat nå er det ${current.temperature}°C og ${current.weatherText.toLowerCase()}.`
        : 'Jeg har ikke detaljert værvarsel for i morgen ennå. Værprovider er foundation, så jeg bør ikke late som jeg har mer presise data.'
    }

    if (normalizedText.includes('regn') || normalizedText.includes('nedbør')) {
      if (normalizedText.includes('i natt')) {
        return current.rainExpected
          ? 'Jeg ser regn i nærmeste varsel, men har ikke eget nattvarsel ennå.'
          : 'Jeg ser ikke regn i nærmeste varsel. Eget nattvarsel er ikke hentet ennå.'
      }

      return current.rainExpected
        ? `Det er meldt ${current.rainAmount?.toFixed(1) ?? 'litt'} mm nedbør i nærmeste varsel.`
        : 'Jeg ser ikke nedbør i nærmeste varsel akkurat nå.'
    }

    if (normalizedText.includes('blåse') || normalizedText.includes('vind') || normalizedText.includes('vindkast')) {
      const windTone =
        current.windSpeed >= nivaWindSpeedAlertThresholdMs ? 'Det kan blåse en del.' : 'Vinden ser lav ut.'
      return `${windTone} Vind er ${current.windSpeed} m/s nå.`
    }

    return `Nå er det ${current.temperature}°C ute og ${current.weatherText.toLowerCase()}. Vind er ${current.windSpeed} m/s${
      current.rainAmount !== null ? `, nedbør ${current.rainAmount.toFixed(1)} mm` : ''
    }.`
  }

  const getNivaHouseStatusAnswer = () => {
    const temperatureRooms = nivaHouseSnapshot.roomsWithTemperature.filter((room) =>
      Number.isFinite(room.temperature),
    )
    const averageTemperature =
      temperatureRooms.length > 0
        ? temperatureRooms.reduce((sum, room) => sum + room.temperature, 0) / temperatureRooms.length
        : null
    const temperatureText =
      averageTemperature !== null
        ? `Temperaturen ligger rundt ${averageTemperature.toLocaleString('nb-NO', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })} °C i rommene jeg har signal fra.`
        : null
    const mediaText =
      nivaHouseSnapshot.media.player.isPlaying && nivaHouseSnapshot.media.currentTrack
        ? `Media gjør hjemmet litt mer aktivt: ${nivaHouseSnapshot.media.currentTrack.title} spiller på ${
            nivaHouseSnapshot.media.activeDevice?.name ?? 'Local Speaker'
          }.`
        : null
    const warnings = [
      nivaDiagnosticInsight.hasIssue ? nivaDiagnosticInsight.message : '',
      !nivaHouseSnapshot.system.bridgeReady ? nivaHouseSnapshot.system.bridgeStatusLabel : '',
      liveErrorMessage,
      weatherAwareness.alert?.message ?? '',
    ].filter(Boolean)
    const priorityLine = warnings[0] ?? homeAwarenessSummary.mainLine
    const confidenceText = houseConfidence.level !== 'høy' ? houseConfidence.nivaLine : ''

    return [
      `Huset er i ${nivaHouseSnapshot.system.homeStatus}-modus. ${nivaPresenceComfort.nivaLine}`,
      comfortEnergyInsight.homeLine ?? temperatureText,
      mediaText,
      priorityLine,
      confidenceText,
    ]
      .filter(Boolean)
      .slice(0, 4)
      .join(' ')
  }

  const getNivaConfidenceAnswer = () => {
    const parts = [
      houseConfidence.nivaLine,
      `Husstatus: ${houseConfidence.label.toLowerCase()}.`,
      `Klima: ${getConfidenceLabel(climateConfidenceLevel).toLowerCase()}.`,
      `Lys: ${getConfidenceLabel(lightConfidenceLevel).toLowerCase()}.`,
      `Media: ${mediaConfidence.label.toLowerCase()}.`,
      `Presence: ${presenceConfidence.label.toLowerCase()}.`,
      hybridRuntimeSummary.nivaSummary,
    ]

    return parts.join(' ')
  }

  const getNivaMediaOutputsAnswer = () => {
    const availableDevices = mediaDevices.filter((device) => device.online || device.availability === 'available')
    const foundationDevices = mediaDevices.filter((device) => device.availability === 'foundation')
    const discoveredDevices = mediaDevices.filter((device) => device.availability === 'discovered')
    const availableText =
      availableDevices.length > 0
        ? availableDevices
            .slice(0, 4)
            .map((device) => `${device.name}${device.roomName ? ` i ${device.roomName}` : ''}`)
            .join(', ')
        : 'denne enheten'
    const foundationText =
      foundationDevices.length > 0
        ? ` ${foundationDevices.length} outputs ligger som foundation for senere ekte routing.`
        : ''
    const discoveredText =
      discoveredDevices.length > 0
        ? ` Jeg har også oppdaget ${discoveredDevices.map((device) => device.name).join(', ')} på LAN.`
        : ''

    return `Lokal musikkavspilling på denne enheten fungerer ekte. Jeg kjenner også ${availableText}.${foundationText}${discoveredText}`
  }

  const getNivaCastDiscoveryAnswer = () => {
    const discoveredDevices = bridgeCastState.snapshot?.devices ?? []
    const onlineDevices = discoveredDevices.filter((device) => (device.state ?? device.status) === 'online' || device.online)
    const staleDevices = discoveredDevices.filter((device) => (device.state ?? device.status) === 'stale')
    const offlineDevices = discoveredDevices.filter((device) => (device.state ?? device.status) === 'offline')

    if (bridgeCastState.playback?.state && bridgeCastState.playback.state !== 'idle') {
      return `${bridgeCastState.playback.message} Status: ${castPlaybackTruthStatus.toLowerCase()}, confidence ${
        bridgeCastState.playback.playbackConfidence ?? 'ukjent'
      }. ${bridgeCastState.playback.lanReachabilityNote}`
    }

    if (onlineDevices.length > 0) {
      const stateNote =
        staleDevices.length > 0 || offlineDevices.length > 0
          ? ` ${staleDevices.length + offlineDevices.length} tidligere enheter ligger som stale/offline til ny discovery bekrefter dem.`
          : ''

      return `Jeg finner ${onlineDevices.map((device) => device.name).join(', ')} på nettverket. Discovery er ${castDiscoveryTruthStatus.toLowerCase()}, og playback-status vises bare som trygg når sessionen er fersk.${stateNote}`
    }

    if (discoveredDevices.length > 0) {
      return `Jeg husker ${discoveredDevices.length} Cast-enheter, men ingen er ferskt online nå. Stale betyr at enheten var sett tidligere, men venter på ny discovery. Offline betyr at den ikke har vært sett på en stund.`
    }

    if (bridgeCastState.snapshot?.enabled && bridgeCastState.snapshot.discoveryEnabled) {
      return bridgeCastState.snapshot.lastDiscoveryAt
        ? 'Cast discovery er aktivert, men jeg fant ingen enheter akkurat nå. Sjekk at mobilen/PC-en, bridge og Cast-enheten er på samme nettverk, og at mDNS ikke blokkeres.'
        : 'Cast discovery er aktivert, men jeg har ikke kjørt et søk ennå.'
    }

    if (bridgeCastState.snapshot?.enabled === false) {
      return 'Cast er disabled. Discovery er klargjort i bridge, men dependency/env må aktiveres før jeg kan finne enheter.'
    }

    if (bridgeCastState.snapshot?.error) {
      return `Cast discovery er ${castDiscoveryTruthStatus.toLowerCase()}: ${bridgeCastState.snapshot.error}`
    }

    return `Cast discovery er ${castDiscoveryTruthStatus.toLowerCase()}. Playback er ${castPlaybackTruthStatus.toLowerCase()}. Lokal musikk fungerer ekte på denne enheten.`
  }

  const getNivaMediaOutputStatusAnswer = () => {
    if (selectedMediaRoute === 'cast') {
      const deviceName = activeMediaDevice?.name ?? 'valgt Cast-device'

      if (!currentMediaTrack) {
        return `Cast-output er valgt: ${deviceName}. Velg et spor først.`
      }

      if (castPlaybackState === 'connecting') {
        return `Jeg sender musikken til ${deviceName} i Cast testmodus.`
      }

      if (castPlaybackState === 'playing' && castPlaybackSupportedNow) {
        return `Musikken spiller på ${deviceName} i Cast testmodus.`
      }

      if (castPlaybackState === 'paused') {
        return `Cast playback er pauset på ${deviceName}.`
      }

      if (castPlaybackState === 'stopped') {
        return `Cast playback er stoppet på ${deviceName}.`
      }

      if (castPlaybackState === 'error') {
        return bridgeCastState.playback?.message
          ? `${bridgeCastState.playback.message}`
          : 'Cast playback feilet. Sjekk at enheten når mediafilen via LAN-IP.'
      }

      if (!castPlaybackSupportedNow) {
        return bridgeCastState.playback?.message ??
          'Cast playback er i testmodus, men er ikke bekreftet aktiv ennå.'
      }

      return `Cast er klar for ${deviceName}, men musikken spiller ikke der akkurat nå.`
    }

    if (!currentMediaTrack) {
      return 'Media står klar på denne enheten.'
    }

    if (mediaPlayer.isPlaying) {
      return `Musikken spiller på denne enheten: ${currentMediaTrack.title}.`
    }

    return `${currentMediaTrack.title} er valgt på denne enheten, men står på pause.`
  }

  const getNivaHouseFeelingAnswer = (matchedRoom?: ReturnType<typeof getNivaRoomMatch>) => {
    if (matchedRoom) {
      const roomAmbience = ambientMoodInsight.roomAmbiences.find(
        (candidate) => candidate.roomKey === matchedRoom.room.key,
      )

      if (roomAmbience) {
        return [
          roomAmbience.nivaLine,
          comfortEnergyInsight.rooms.find((room) => room.roomKey === matchedRoom.room.key)?.comfortLine,
          houseConfidence.level === 'lav' ? houseConfidence.nivaLine : '',
        ]
          .filter(Boolean)
          .join(' ')
      }
    }

    const mediaText =
      nivaHouseSnapshot.media.player.isPlaying && nivaHouseSnapshot.media.currentTrack
        ? `${nivaHouseSnapshot.media.currentTrack.title} bidrar til en mer aktiv stemning.`
        : ''
    const weatherText = weatherAwareness.current?.rainExpected
        ? 'Ute ligger det regn i bildet.'
      : weatherAwareness.current && weatherAwareness.current.windSpeed >= nivaWindSpeedAlertThresholdMs
        ? 'Vinden merkes ute.'
        : ''

    return [
      nivaPresenceComfort.summary,
      comfortEnergyInsight.homeLine,
      mediaText,
      homeAwarenessSummary.selectedLayers.includes('weather') ? '' : weatherText,
      homeAwarenessSummary.selectedLayers.includes('system') ? '' : houseConfidence.level === 'lav' ? houseConfidence.nivaLine : '',
    ]
      .filter(Boolean)
      .join(' ')
  }

  const getNivaHomeActivityAnswer = () => {
    const activeRoomText =
      nivaHouseSnapshot.presence.activeRoomNames.length > 0
        ? `Aktivitet: ${nivaHouseSnapshot.presence.activeRoomNames.slice(0, 3).join(', ')}.`
        : 'Jeg ser ingen tydelig romaktivitet akkurat nå.'
    const lightText =
      nivaHouseSnapshot.activeLightZones.length === 0
        ? 'Ingen lys er på.'
        : `${nivaHouseSnapshot.activeLightZones.length} lyssoner er på.`
    const heatText =
      nivaHouseSnapshot.roomsWithHeatDemand.length > 0
        ? `Varmeaktivitet i ${nivaHouseSnapshot.roomsWithHeatDemand
            .slice(0, 2)
            .map((room) => room.name)
            .join(' og ')}.`
        : ''
    const mediaText =
      nivaHouseSnapshot.media.player.isPlaying && nivaHouseSnapshot.media.currentTrack
        ? `Media spiller ${nivaHouseSnapshot.media.currentTrack.title}.`
        : 'Media er stille.'

    return [
      homeAwarenessSummary.nivaText,
      homeAwarenessSummary.selectedLayers.includes('occupancy') ? '' : activeRoomText,
      lightText,
      heatText,
      mediaText,
      homeAwarenessSummary.selectedLayers.includes('system') ? '' : houseConfidence.level === 'lav' ? houseConfidence.nivaLine : '',
    ]
      .filter(Boolean)
      .join(' ')
  }

  const getNivaEnvironmentalAnswer = (matchedRoom: ReturnType<typeof getNivaRoomMatch> | undefined) => {
    if (matchedRoom) {
      const profile = sensorIntelligence.roomProfiles.find(
        (candidate) => candidate.roomKey === matchedRoom.room.key,
      )

      if (!profile) {
        return `${matchedRoom.room.name} har ikke miljøprofil ennå.`
      }

      return `${matchedRoom.room.name}: ${profile.summary}`
    }

    const activeText =
      sensorIntelligence.activeRoomNames.length > 0
        ? `Jeg ser aktivitetstegn i ${sensorIntelligence.activeRoomNames.slice(0, 2).join(' og ')}.`
        : 'Det har vært lite tydelig aktivitet i huset akkurat nå.'
    const airRooms = sensorIntelligence.roomProfiles.filter((profile) =>
      profile.capabilities.some((capability) => capability === 'co2' || capability === 'humidity' || capability === 'airQuality'),
    )
    const airText =
      airRooms.length > 0
        ? `Luft-awareness er klar i ${airRooms.slice(0, 2).map((room) => room.roomName).join(' og ')}, men live CO2/fukt kommer senere.`
        : 'Jeg har ikke live luftsensorer i foundation ennå.'

    return [sensorIntelligence.nivaSummary, activeText, airText].join(' ')
  }

  const getNivaSpatialAnswer = (
    normalizedText: string,
    matchedRoom: ReturnType<typeof getNivaRoomMatch> | undefined,
  ) => {
    if (normalizedText.includes('støvsuger') || normalizedText.includes('stovsuger') || normalizedText.includes('rengjøring') || normalizedText.includes('rengjoring')) {
      return occupancyFlowInsight.assistantLine ?? spatialAwareness.assistantSummary ?? 'Støvsugeren er ikke aktiv i et bestemt område akkurat nå.'
    }

    if (
      normalizedText.includes('flyt') ||
      normalizedText.includes('brukes huset') ||
      normalizedText.includes('områder virker aktive') ||
      normalizedText.includes('omrader virker aktive') ||
      normalizedText.includes('aktive områder') ||
      normalizedText.includes('aktive omrader')
    ) {
      return occupancyFlowInsight.nivaSummary
    }

    if (matchedRoom) {
      const context = getRoomSpatialContext(matchedRoom.room.key, spatialMap)
      const relationText =
        context.nearbyRoomNames.length > 0
          ? `${matchedRoom.room.name} henger sammen med ${context.nearbyRoomNames.slice(0, 3).join(', ')}.`
          : `${matchedRoom.room.name} har ingen tydelige naborelasjoner i foundation ennå.`
      const areaText = context.area ? `Rommet ligger i ${context.area.label}.` : ''
      const activityText = spatialAwareness.activeRoomNames.includes(matchedRoom.room.name)
        ? `${matchedRoom.room.name} virker aktivt nå.`
        : spatialAwareness.activeAreaLabel === context.area?.label
          ? `${context.area.label} har aktivitet, men ikke tydelig bare i ${matchedRoom.room.name}.`
          : `${matchedRoom.room.name} har mindre aktivitet enn de aktive områdene akkurat nå.`

      return [areaText, relationText, activityText].filter(Boolean).join(' ')
    }

    if (
      normalizedText.includes('henger sammen') ||
      normalizedText.includes('nær') ||
      normalizedText.includes('naer') ||
      normalizedText.includes('koblet')
    ) {
      const relationshipText = spatialMap.relationships
        .filter((relationship) => relationship.kind === 'connected' || relationship.kind === 'adjacent')
        .slice(0, 4)
        .map((relationship) => `${relationship.fromRoomName}–${relationship.toRoomName}`)
        .join(', ')

      return relationshipText
        ? `Romlig foundation ser disse naturlige koblingene: ${relationshipText}.`
        : spatialMap.summary
    }

    return [
      occupancyFlowInsight.summary,
      spatialAwareness.distributionLabel,
      spatialAwareness.activeAreaRoomNames.length > 1
        ? `${spatialAwareness.activeAreaRoomNames.join(' og ')} virker aktive samtidig.`
        : '',
      spatialMap.isolatedAreaNames.length > 0 ? `${spatialMap.isolatedAreaNames.join(', ')} ligger mer separat.` : '',
    ]
      .filter(Boolean)
      .join(' ')
  }

  const getNivaSensorHealthAnswer = () => {
    const quietSensors = sensorIntelligence.devices.filter((device) => device.status === 'foundation')
    const weakSensors = sensorIntelligence.devices.filter(
      (device) => typeof device.signal === 'number' && device.signal < 50,
    )
    const lowBatterySensors = sensorIntelligence.devices.filter(
      (device) => typeof device.battery === 'number' && device.battery < 25,
    )

    if (quietSensors.length === 0 && weakSensors.length === 0 && lowBatterySensors.length === 0) {
      return 'Sensorlaget virker stabilt. Jeg ser ingen sensorer med svakt signal eller lavt batteri i foundation akkurat nå.'
    }

    return [
      quietSensors.length > 0 ? `${quietSensors.length} sensorer bruker fortsatt foundation-state.` : '',
      weakSensors.length > 0
        ? `${weakSensors.length} sensor har svakt signal: ${weakSensors.slice(0, 2).map((device) => device.name).join(', ')}.`
        : '',
      lowBatterySensors.length > 0 ? `${lowBatterySensors.length} sensor har lavt batteri.` : '',
    ]
      .filter(Boolean)
      .join(' ')
  }

  const getNivaAssistantStatusAnswer = (normalizedText = '') => {
    if (vacuumDevices.length === 0) {
      return 'Jeg ser ingen fysiske assistenter i Lynell ennå.'
    }

    const activeAssistant = vacuumDevices.find((device) => device.cleaning)
    const device = activeAssistant ?? vacuumDevices[0]
    const selectedMethod = device.integrationStatus.options.find(
      (option) => option.methodId === device.integrationStatus.selectedMethodId,
    )
    const recommendedMethod =
      device.integrationStatus.options.find((option) => option.recommended) ?? selectedMethod
    const providerText = bridgeVacuumState.snapshot
      ? `${bridgeVacuumState.snapshot.providerLabel} (${vacuumTruthStatus.toLowerCase()})`
      : `${device.integrationStatus.provider} (demo/developer foundation)`
    const integrationNote = device.integrationStatus.connected
      ? ''
      : ' Robotintegrasjonen er foundation og ikke koblet til ekte API ennå.'
    const asksToStart =
      normalizedText.includes('start') ||
      normalizedText.includes('kan du') ||
      normalizedText.includes('sett i gang')
    const asksWhere =
      normalizedText.includes('hvor') ||
      normalizedText.includes('område') ||
      normalizedText.includes('omrade')
    const asksFinished =
      normalizedText.includes('ferdig') ||
      normalizedText.includes('klar') ||
      normalizedText.includes('fullført') ||
      normalizedText.includes('fullfort')
    const asksLastCleaned =
      normalizedText.includes('sist') ||
      normalizedText.includes('når rengjorde') ||
      normalizedText.includes('nar rengjorde')
    const asksIntegrationMethod =
      normalizedText.includes('metode') ||
      normalizedText.includes('koble') ||
      normalizedText.includes('koblet ekte') ||
      normalizedText.includes('ekte koblet') ||
      normalizedText.includes('anbefal')
    const asksTest =
      normalizedText.includes('test') ||
      normalizedText.includes('teste') ||
      normalizedText.includes('tester')
    const asksHomeAssistant =
      normalizedText.includes('home assistant') ||
      normalizedText.includes('ha ') ||
      normalizedText.includes('ha-') ||
      normalizedText.includes('ha bridge')
    const asksEntity =
      normalizedText.includes('entity') ||
      normalizedText.includes('entity id') ||
      normalizedText.includes('entity_id')
    const asksMissing =
      normalizedText.includes('mangler') ||
      normalizedText.includes('hva må til') ||
      normalizedText.includes('hva ma til')
    const asksFreshness =
      normalizedText.includes('stale') ||
      normalizedText.includes('offline') ||
      normalizedText.includes('fersk') ||
      normalizedText.includes('forsinket') ||
      normalizedText.includes('hvorfor virker robot') ||
      normalizedText.includes('hvorfor er robot')
    const asksDockTest =
      asksTest &&
      (normalizedText.includes('dock') ||
        normalizedText.includes('lading') ||
        normalizedText.includes('ladestasjon'))
    const asksCanDock =
      normalizedText.includes('sende roboten til lading') ||
      normalizedText.includes('send roboten til lading') ||
      normalizedText.includes('kan jeg sende') ||
      normalizedText.includes('kan vi teste dock')
    const asksStartSafety =
      normalizedText.includes('trygt') &&
      (normalizedText.includes('start') || normalizedText.includes('støvsug') || normalizedText.includes('stovsug'))
    const asksHaDependency =
      normalizedText.includes('home assistant nødvendig') ||
      normalizedText.includes('trenger lynell home assistant') ||
      normalizedText.includes('bruker lynell home assistant') ||
      normalizedText.includes('må lynell bruke home assistant') ||
      normalizedText.includes('ma lynell bruke home assistant')
    const asksPremiumDirection =
      normalizedText.includes('premium-retning') ||
      normalizedText.includes('premium retning') ||
      normalizedText.includes('native runtime') ||
      normalizedText.includes('native integrasjon') ||
      normalizedText.includes('egen integrasjon') ||
      normalizedText.includes('langsiktig')
    const bridgeReadinessLabel = bridgeVacuumState.snapshot?.readiness?.label
    const bridgeReadinessChecks = bridgeVacuumState.snapshot?.readiness?.checks ?? []
    const bridgeReadinessText =
      bridgeReadinessChecks.length > 0
        ? bridgeReadinessChecks.slice(0, 3).join(' ')
        : bridgeVacuumState.snapshot?.message ?? 'Robotbroen er ikke aktivert ennå.'
    const vacuumTrustState = device.trustState ?? bridgeVacuumState.snapshot?.trust?.state ?? 'unknown'
    const vacuumTrustMessage =
      device.trustMessage ??
      bridgeVacuumState.snapshot?.trust?.message ??
      bridgeVacuumState.snapshot?.message ??
      'Robotstatus er ikke bekreftet ennå.'
    const vacuumSourceAgeText =
      typeof device.sourceAgeMs === 'number'
        ? `Siste robotstatus er ${Math.round(device.sourceAgeMs / 1000)} sekunder gammel.`
        : bridgeVacuumState.snapshot?.trust?.lastSeenAt
          ? `Sist sett ${formatShortRelativeTime(bridgeVacuumState.snapshot.trust.lastSeenAt)}.`
          : 'Jeg mangler tidspunkt for siste sikre robotstatus.'

    if (asksFreshness) {
      if (vacuumTrustState === 'online') {
        return `${device.model} har fersk robotstatus via ${bridgeVacuumState.snapshot?.providerLabel ?? device.integrationStatus.provider}. ${vacuumSourceAgeText}`
      }

      if (vacuumTrustState === 'stale') {
        return `${device.model} har sist kjente status, men ingen ferske signaler akkurat nå. Det betyr at jeg ikke bruker gammel status som sikker rengjøringsstatus. ${vacuumSourceAgeText}`
      }

      if (vacuumTrustState === 'offline') {
        return `${device.model} er ikke bekreftet online akkurat nå. ${vacuumTrustMessage} Sjekk at roboten/cloud-tilkoblingen er tilgjengelig før styring.`
      }

      return `${vacuumTrustMessage} Cloud/runtime-tilkobling, robotens nåbarhet og alder på siste status vises separat i Diagnose.`
    }

    if (asksTest) {
      if (asksDockTest) {
        return vacuumLiveStatusConfirmed
          ? 'Ja. Tryggeste fysiske test er dock først. Jeg ber om bekreftelse før jeg sender dock via Home Assistant.'
          : `Dock-test er ikke klar ennå: ${bridgeReadinessLabel ?? vacuumTruthStatus}. ${bridgeReadinessText}`
      }

      return vacuumLiveStatusConfirmed
        ? 'Robotintegrasjonen er live via Home Assistant. Test status først, og bruk dock som trygg første kommando før start.'
        : `Robotintegrasjonen kan testes når HA URL, token og entity ID er satt. Nå: ${bridgeReadinessLabel ?? vacuumTruthStatus}. ${bridgeReadinessText}`
    }

    if (asksHaDependency) {
      return 'Home Assistant er ikke nødvendig som langsiktig motor. Lynell bruker HA foreløpig som optional kompatibilitetsbro for rask ekte robot-test, mens native Lynell-runtime er premium-retningen.'
    }

    if (asksPremiumDirection) {
      return 'Premium-retningen er native Lynell-runtime: Dreame adapter først, lokal runtime hvis modellen støtter det, og MQTT bridge som edge-spor. HA kan fortsatt brukes som optional bro uten å låse UI eller NIVA.'
    }

    if (asksHomeAssistant || asksEntity || asksMissing) {
      return vacuumLiveStatusConfirmed
        ? `${device.model} er koblet via Home Assistant. Robot entity er funnet, og live robotstatus er aktiv.`
        : `${bridgeReadinessLabel ?? 'Home Assistant bridge er ikke klar ennå'}. ${bridgeReadinessText}`
    }

    if (asksCanDock) {
      return vacuumLiveStatusConfirmed
        ? 'Ja. Send til lading er tryggeste første fysiske test. Jeg ber om bekreftelse før jeg sender kommandoen via Home Assistant.'
        : `Ikke ennå. Dock-test krever live HA-status først. Nå: ${bridgeReadinessLabel ?? vacuumTruthStatus}.`
    }

    if (asksStartSafety) {
      return vacuumLiveStatusConfirmed
        ? 'Start kan testes, men jeg ville tatt status og dock først. Start sender roboten i fysisk rengjøring via Home Assistant.'
        : 'Start er ikke klar som ekte test før Home Assistant-status er live. Test status først, og bruk dock som første fysiske kommando.'
    }

    if (asksIntegrationMethod && recommendedMethod) {
      const bridgeNextStep = bridgeVacuumState.snapshot?.providers.find(
        (provider) => provider.id === bridgeVacuumState.snapshot?.provider,
      )?.nextStep
      return `${device.model} er ikke ekte koblet ennå. Valgt strategi er ${providerText}. Neste steg: ${bridgeNextStep ?? recommendedMethod.nextStep}`
    }

    if (asksToStart) {
      return vacuumLiveStatusConfirmed
        ? `Ja, roboten er koblet via ${bridgeVacuumState.snapshot?.providerLabel ?? device.integrationStatus.provider}. Jeg ber om bekreftelse før jeg sender startkommando.`
        : `Jeg kan bare forberede en demo/developer-handling for ${device.model}. ${bridgeVacuumState.snapshot?.message ?? 'Roboten er ikke ekte koblet, så dette starter ikke fysisk rengjøring.'}`
    }

    if (asksLastCleaned) {
      return `${device.model} rengjorde sist ${device.lastCleanedAt ?? 'ukjent tidspunkt'}.${integrationNote}`
    }

    if (asksWhere) {
      if (device.cleaning) {
        return vacuumLiveStatusConfirmed
          ? `${device.model} rapporterer aktivitet via Home Assistant: ${device.currentArea ?? device.currentRoom ?? 'ukjent område'}.`
          : `${device.model} viser demo/developer-aktivitet i ${device.currentArea ?? device.currentRoom ?? 'huset'}. Den er ikke bekreftet via ekte robot-API.`
      }

      return `${device.model} er ikke ute i et område akkurat nå. Den står ${device.docked ? 'på ladestasjonen' : formatAssistantStatus(device).toLowerCase()}.`
    }

    if (asksFinished) {
      if (device.cleaning) {
        return vacuumLiveStatusConfirmed
          ? `${device.model} er fortsatt aktiv ifølge Home Assistant. Status: ${formatAssistantStatus(device).toLowerCase()}.`
          : `I demo/developer foundation er ${device.model} ${device.cleaningProgress}% ferdig. Ekte robotstatus er ikke koblet.`
      }

      return `${device.model} er ferdig og står ${device.docked ? 'på ladestasjonen' : 'i beredskap'}.`
    }

    if (device.cleaning) {
      return `${device.model} viser demo/developer-rengjøring i ${device.currentArea ?? device.currentRoom ?? 'huset'}: ${device.cleaningProgress}% ferdig, batteri ${device.battery}%.${integrationNote}`
    }

    if (device.cleaningProgress >= 100 || device.lastCleanedAt === 'Nettopp') {
      return `${device.model} er ferdig og står på ladestasjonen. Batteriet er ${device.battery}%.${integrationNote}`
    }

    if (device.docked) {
      return `${device.model} står på ladestasjonen med ${device.battery}% batteri. Sist aktiv ${device.lastCleanedAt ?? 'ukjent'}.${integrationNote}`
    }

    return `${device.model} er ${formatAssistantStatus(device).toLowerCase()}. Batteriet er ${device.battery}%.${integrationNote}`
  }

  const getNivaEdgeStatusAnswer = (normalizedText: string) => {
    const coordinator = zigbeeDeviceConcepts.find((device) => device.kind === 'coordinator')
    const joinedDevices = zigbeeDeviceConcepts.filter((device) => device.kind !== 'coordinator')
    const offlineDevices = joinedDevices.filter((device) => !device.online)
    const weakSignalDevices = zigbeeDeviceConcepts.filter(
      (device) => typeof device.signalStrength === 'number' && device.signalStrength < 50,
    )
    const mqttStatus = edgeFoundationStatuses.find((status) => status.type === 'mqtt')
    const asksZigbee =
      normalizedText.includes('zigbee') ||
      normalizedText.includes('gateway') ||
      normalizedText.includes('dongle') ||
      normalizedText.includes('koordinator')
    const asksDevices =
      normalizedText.includes('device') ||
      normalizedText.includes('devices') ||
      normalizedText.includes('enhet') ||
      normalizedText.includes('enheter') ||
      normalizedText.includes('koblet til')
    const asksOffline =
      normalizedText.includes('offline') ||
      normalizedText.includes('ikke nåbar') ||
      normalizedText.includes('ikke nabar') ||
      normalizedText.includes('sensorer offline')
    const asksSignal =
      normalizedText.includes('dårlig signal') ||
      normalizedText.includes('darlig signal') ||
      normalizedText.includes('svakt signal') ||
      normalizedText.includes('signal')

    if (asksOffline) {
      const unreachableDevices = edgeLifecycleDevices.filter(
        (device) => device.lifecycleState === 'unreachable' || device.status === 'offline',
      )

      if (unreachableDevices.length === 0) {
        return 'Jeg ser ingen edge-devices som er markert som ikke nåbare akkurat nå.'
      }

      return `Jeg ser ${unreachableDevices.length} device som ikke er nåbar: ${unreachableDevices
        .slice(0, 3)
        .map((device) => device.name)
        .join(', ')}.`
    }

    if (asksSignal) {
      const weakDevices = edgeLifecycleDevices.filter(
        (device) => typeof device.signal === 'number' && device.signal < 50,
      )

      if (weakDevices.length === 0) {
        return 'Jeg ser ingen edge-devices med svakt signal i foundation akkurat nå.'
      }

      return `${weakDevices.length} device har svakt signal: ${weakDevices
        .slice(0, 3)
        .map((device) => `${device.name} (${device.signal}%)`)
        .join(', ')}.`
    }

    if (asksDevices) {
      const deviceSummary = edgeLifecycleDevices
        .slice(0, 4)
        .map((device) => `${device.name} i ${device.roomLabel} (${formatDeviceCategory(device.category).toLowerCase()})`)
        .join(', ')

      return `${edgeLifecycleDevices.length} edge-devices er modellert: ${deviceSummary}. ${edgeDeviceHealthSummary.nivaSummary}`
    }

    if (asksZigbee) {
      const gatewayText = coordinator?.online
        ? `${coordinator.name} er online med ${coordinator.signalStrength ?? 0}% signal`
        : 'Zigbee gateway er definert, men rapporterer ikke live ennå'
      const deviceText =
        joinedDevices.length > 0
          ? `${joinedDevices.length} Zigbee-enheter ligger i foundation`
          : 'ingen joined devices er lagt inn ennå'
      const quietText =
        offlineDevices.length > 0
          ? `${offlineDevices.length} av dem er markert som foundation/stille`
          : 'ingen stille enheter er registrert'

      return `${gatewayText}. ${deviceText}, og ${quietText}.`
    }

    const mqttText = mqttStatus?.status === 'standby'
      ? `MQTT er konfigurert mot ${mqttStatus.name}, men ingen broker-runtime kjører i Lynell ennå.`
      : 'MQTT er ikke aktivert ennå.'
    const signalText =
      weakSignalDevices.length > 0
        ? `Jeg ser ${weakSignalDevices.length} edge-enheter med svakt signal.`
        : 'Jeg ser ingen svake edge-signaler i foundation akkurat nå.'

    return `${edgeHealthSummary.nivaSummary} ${mqttText} ${signalText}`
  }

  const getNivaZigbee2MqttAnswer = (normalizedText: string) => {
    const asksWhy =
      normalizedText.includes('hvorfor') ||
      normalizedText.includes('hva brukes') ||
      normalizedText.includes('hva er mqtt') ||
      normalizedText.includes('hva er zigbee2mqtt')
    const asksMissing =
      normalizedText.includes('mangler') ||
      normalizedText.includes('neste steg') ||
      normalizedText.includes('klart') ||
      normalizedText.includes('klar')
    const asksLocal =
      normalizedText.includes('lokal') ||
      normalizedText.includes('cloud') ||
      normalizedText.includes('edge')
    const asksDongle =
      normalizedText.includes('sonoff') ||
      normalizedText.includes('dongle') ||
      normalizedText.includes('koordinator') ||
      normalizedText.includes('coordinator')

    if (asksDongle) {
      return `${zigbee2MqttReadiness.coordinatorName} brukes som Zigbee coordinator. Den skal senere kobles til Zigbee2MQTT lokalt, med MQTT som transportlag.`
    }

    if (asksWhy) {
      return 'Zigbee2MQTT gir Lynell en lokal edge-retning: Zigbee-enheter kan publisere state via MQTT uten cloud-avhengighet. KNX forblir backbone.'
    }

    if (asksMissing) {
      return `For Zigbee mangler dette først: ${zigbee2MqttReadiness.missing.slice(0, 3).join(', ')}. Neste steg er ${zigbee2MqttReadiness.nextSteps.slice(0, 2).join(' og ')}.`
    }

    if (asksLocal) {
      return 'Ja. Retningen er lokal Zigbee-runtime: SONOFF ZBDongle-E, Zigbee2MQTT og MQTT broker på LAN. Ingen cloud er nødvendig i denne modellen.'
    }

    return zigbee2MqttReadiness.nivaSummary
  }

  const getNivaMqttRuntimeAnswer = (normalizedText: string) => {
    const asksLiveData =
      normalizedText.includes('ekte data') ||
      normalizedText.includes('live data') ||
      normalizedText.includes('kommer det') ||
      normalizedText.includes('har zigbee live runtime')
    const asksStatus =
      normalizedText.includes('er mqtt koblet') ||
      normalizedText.includes('mqtt koblet') ||
      normalizedText.includes('status på edge-runtime') ||
      normalizedText.includes('status pa edge-runtime') ||
      normalizedText.includes('edge-runtime')

    if (asksLiveData) {
      return mqttRuntimeFoundation.connectionState === 'connected'
        ? nivaText(
            `Ja, MQTT leverer live edge-state nå. Siste melding kom ${bridgeMqttState.snapshot?.lastMessageAt ?? 'nylig'}. ${mqttRuntimeFoundation.retainedAwareness}`,
            `Yes. MQTT is delivering live edge state now. The latest message arrived ${bridgeMqttState.snapshot?.lastMessageAt ?? 'recently'}. ${mqttRuntimeFoundation.retainedAwareness}`,
          )
        : nivaText(
            'Ikke ennå. MQTT har topic- og mapping-foundation, men ingen live klient eller Zigbee subscriptions kjører i Lynell.',
            'Not yet. MQTT has topic and mapping foundation, but no live client or Zigbee subscriptions are running in Lynell.',
          )
    }

    if (asksStatus) {
      if (bridgeMqttState.snapshot?.enabled === false) {
        return nivaText(
          'MQTT er ikke aktivert i bridge ennå. Lynell viser derfor foundation/fallback for edge-runtime.',
          'MQTT is not enabled in the bridge yet. Lynell is therefore showing foundation/fallback for edge runtime.',
        )
      }

      return nivaText(
        `MQTT står som ${formatMqttConnectionState(mqttRuntimeFoundation.connectionState).toLowerCase()}. ${mqttRuntimeFoundation.summary}`,
        `MQTT is ${formatMqttConnectionState(mqttRuntimeFoundation.connectionState).toLowerCase()}. ${mqttRuntimeFoundation.summary}`,
      )
    }

    return nivaText(
      `${mqttRuntimeFoundation.summary} Første live topic blir ${mqttRuntimeFoundation.topics.bridgeState}.`,
      `${mqttRuntimeFoundation.summary} The first live topic will be ${mqttRuntimeFoundation.topics.bridgeState}.`,
    )
  }

  const getNivaIntegrationSetupAnswer = (normalizedText: string) => {
    if (
      normalizedText.includes('nærmest klare') ||
      normalizedText.includes('nermest klare') ||
      normalizedText.includes('mest klar') ||
      normalizedText.includes('klare for kobling')
    ) {
      const closestItems = [...integrationSetupItems]
        .filter((item) => item.readinessStatus !== 'Ikke startet')
        .sort((a, b) => getIntegrationReadinessRank(b.readinessStatus) - getIntegrationReadinessRank(a.readinessStatus))
        .slice(0, 3)
        .map((item) => `${item.name}: ${item.readinessStatus.toLowerCase()}`)
        .join(', ')

      return `Nærmest teknisk kobling er ${closestItems}. Ingen av dem har ekte runtime/discovery aktivert ennå.`
    }

    const matchedSetup =
      normalizedText.includes('robot') ||
      normalizedText.includes('støvsuger') ||
      normalizedText.includes('stovsuger')
        ? integrationSetupItems.find((item) => item.integrationId === 'dream-d20-plus') ?? null
        : findIntegrationSetupItem(normalizedText, integrationSetupItems)

    if (matchedSetup) {
      const recommendedMethod = matchedSetup.methodOptions?.find((method) => method.recommended)

      if (recommendedMethod && (normalizedText.includes('metode') || normalizedText.includes('anbefal'))) {
        return `${matchedSetup.name} er ikke direkte koblet ennå. Premium-retningen er ${recommendedMethod.label}. Home Assistant kan brukes som optional bro for rask test, men native Lynell-runtime er langsiktig retning.`
      }

      if (matchedSetup.integrationId === 'dream-d20-plus' && normalizedText.includes('ekte')) {
        return `${bridgeVacuumState.snapshot?.message ?? 'Dream D20 Plus er ikke direkte native-koblet ennå.'} Status er ${vacuumTruthStatus.toLowerCase()}. HA er optional bro; native Lynell-runtime er premium-retningen.`
      }

      const authText = matchedSetup.requiresAuth ? ' Den krever API/login senere.' : ''
      const networkText = matchedSetup.requiresLocalNetwork ? ' Den trenger lokal nettverksruntime senere.' : ''
      const missingText = matchedSetup.missing.slice(0, 2).join(' og ')
      const nextText = matchedSetup.technicalNextActions.slice(0, 3).join(', ')
      const methodText = recommendedMethod
        ? ` Anbefalt research-spor først: ${recommendedMethod.label}.`
        : ''

      return `${matchedSetup.name}: ${matchedSetup.readinessStatus}. Mangler: ${missingText}. Neste steg: ${nextText}.${authText}${networkText}${methodText}`
    }

    const readyItems = integrationSetupItems
      .filter((item) => item.status === 'foundation' || item.status === 'readyToConnect')
      .slice(0, 4)
      .map((item) => item.name)
      .join(', ')

    return `${getIntegrationSetupSummary(integrationSetupItems)} Klare foundation-spor: ${readyItems}. Ingen ekte API- eller discovery-kobling er aktiv ennå.`
  }

  const getNivaHardwareAnswer = (normalizedText: string) => {
    const hardwareHealth = getHardwareHealthSummary(hardwareInventoryItems)
    const matchedHardware = findHardwareItem(normalizedText, hardwareInventoryItems)
    const asksCritical =
      normalizedText.includes('kritisk') ||
      normalizedText.includes('viktig') ||
      normalizedText.includes('må fungere') ||
      normalizedText.includes('ma fungere')
    const asksMissing =
      normalizedText.includes('mangler') ||
      normalizedText.includes('ikke koblet') ||
      normalizedText.includes('offline')
    const asksRunsOn =
      normalizedText.includes('kjører') ||
      normalizedText.includes('kjorer') ||
      normalizedText.includes('kjører lynell') ||
      normalizedText.includes('hva kjører lynell på') ||
      normalizedText.includes('hva kjorer lynell pa')

    if (matchedHardware) {
      return `${matchedHardware.name}: ${formatHardwareHealth(matchedHardware.health)}. Rollen er ${matchedHardware.role.toLowerCase()}, plassert ved ${matchedHardware.location}. ${matchedHardware.notes}`
    }

    if (asksRunsOn) {
      return 'Lynell kjører som lokal app med Lynell Core og KNX Bridge/server som kritiske roller. Selve host-monitoringen er ikke koblet ennå.'
    }

    if (asksCritical) {
      const criticalItems = hardwareInventoryItems
        .filter((item) => item.criticality === 'critical')
        .map((item) => item.name)
        .join(', ')

      return `Kritisk foundation er ${criticalItems}. KNX Bridge/server og KNX IP Interface er viktigst for fysisk styring.`
    }

    if (asksMissing) {
      const missingItems = hardwareInventoryItems
        .filter((item) => !item.online && item.criticality !== 'optional')
        .slice(0, 3)
        .map((item) => `${item.name} (${formatHardwareHealth(item.health).toLowerCase()})`)
        .join(', ')

      return `Det som fortsatt ikke er live-overvåket er særlig ${missingItems}. Dette er foundation, ikke et alarmnivå.`
    }

    const hardwareTypes = hardwareInventoryItems
      .slice(0, 5)
      .map((item) => formatHardwareType(item.type))
      .join(', ')

    return `${hardwareHealth.label}. Jeg har modellert fysisk hardware som ${hardwareTypes}. Ekte discovery og polling er ikke bygget ennå.`
  }

  const getNivaRuntimeOriginAnswer = (normalizedText: string) => {
    const matchedState = findRuntimeState(normalizedText, hybridRuntimeStates)
    const asksReal =
      normalizedText.includes('ekte') ||
      normalizedText.includes('live runtime') ||
      normalizedText.includes('live-system') ||
      normalizedText.includes('live system')
    const asksSimulated =
      normalizedText.includes('simulert') ||
      normalizedText.includes('mock') ||
      normalizedText.includes('foundation')
    const asksFallback =
      normalizedText.includes('fallback') ||
      normalizedText.includes('siste kjente') ||
      normalizedText.includes('persisted')
    const asksHybrid =
      normalizedText.includes('hybrid') ||
      normalizedText.includes('mixed') ||
      normalizedText.includes('blandet')

    if (matchedState) {
      return `${matchedState.name}: ${formatIntegrationRuntimeStatus(matchedState.status).toLowerCase()}, ${formatRuntimeOrigin(matchedState.origin).toLowerCase()}. ${matchedState.summary}`
    }

    if (asksReal) {
      const liveStates = hybridRuntimeStates.filter((state) => state.live)
      const liveText =
        liveStates.length > 0
          ? `Live runtime nå: ${liveStates.map((state) => state.name).join(', ')}.`
          : 'Ingen eksterne integrasjoner er markert som full live runtime akkurat nå.'
      return `${liveText} Lokal musikkavspilling fungerer ekte i nettleseren. Cast discovery er ${castDiscoveryTruthStatus.toLowerCase()}, Cast playback er ${castPlaybackTruthStatus.toLowerCase()}, MQTT er ${mqttTruthStatus.toLowerCase()}, og Dream D20 Plus er ${vacuumTruthStatus.toLowerCase()}.`
    }

    if (asksSimulated) {
      const simulatedStates = hybridRuntimeStates.filter(
        (state) => state.origin === 'simulated' || state.status === 'foundation',
      )

      return `Demo/developer foundation nå: ${simulatedStates.slice(0, 5).map((state) => state.name).join(', ')}. Jeg bruker forsiktig språk for disse.`
    }

    if (asksFallback) {
      const fallbackStates = hybridRuntimeStates.filter((state) => state.fallbackActive)

      return `Fallback eller siste-kjente state brukes for ${fallbackStates.slice(0, 5).map((state) => state.name).join(', ')}. Live signaler skal overstyre dette når de kommer.`
    }

    if (asksHybrid) {
      return `${hybridRuntimeSummary.nivaSummary} Det betyr at ekte, lokal, demo/dev og fallback-state kan leve side om side uten at Lynell later som alt er live.`
    }

    return `${hybridRuntimeSummary.nivaSummary} KNX kan være bridge-runtime, media kan være lokal runtime, mens robot og Zigbee fortsatt kan være developer foundation.`
  }

  const getNivaHouseRhythmAnswer = () => {
    const roomObservation = dailyRhythmInsight.activeRoomsDay
      .slice(0, 2)
      .map((room) => room.observation)
      .filter(Boolean)
      .join(' ')

    return [dailyRhythmInsight.rhythmSummary, spatialAwareness.presenceSummary, roomObservation, dailyRhythmInsight.homeObservation]
      .filter(Boolean)
      .join(' ')
  }

  const getNivaHouseMemoryAnswer = (normalizedText: string, roomKey?: string) => {
    const memorySnapshots = houseMemoryStateWithCurrentSnapshot.dailySnapshots
    const latestMemorySnapshot = memorySnapshots[memorySnapshots.length - 1] ?? null
    const roomMemory = roomKey && latestMemorySnapshot
      ? latestMemorySnapshot.roomSummaries.find((room) => room.roomKey === roomKey)
      : null

    if (roomMemory) {
      return roomMemory.observation
        ? `${roomMemory.observation} ${houseMemoryInsight.changeSummary}`
        : `${roomMemory.roomName} har foreløpig et begrenset memory-grunnlag. ${houseMemoryInsight.changeSummary}`
    }

    if (normalizedText.includes('endret') || normalizedText.includes('endra')) {
      return houseMemoryInsight.changeSummary
    }

    if (
      normalizedText.includes('denne uken') ||
      normalizedText.includes('uka') ||
      normalizedText.includes('uken') ||
      normalizedText.includes('siste dager') ||
      normalizedText.includes('siste dagene')
    ) {
      return [houseMemoryInsight.weekSummary, houseMemoryInsight.roomSummary].filter(Boolean).join(' ')
    }

    if (normalizedText.includes('rytme') || normalizedText.includes('rytmen')) {
      return houseMemoryInsight.rhythmSummary
    }

    if (normalizedText.includes('aktivitet') || normalizedText.includes('aktivt')) {
      return [houseMemoryInsight.weekSummary, houseMemoryInsight.changeSummary].filter(Boolean).join(' ')
    }

    if (
      normalizedText.includes('sensor') ||
      normalizedText.includes('device') ||
      normalizedText.includes('enhet')
    ) {
      return houseMemoryInsight.deviceSummary
    }

    if (
      normalizedText.includes('assistent') ||
      normalizedText.includes('støvsuger') ||
      normalizedText.includes('stovsuger') ||
      normalizedText.includes('robot')
    ) {
      return houseMemoryInsight.assistantSummary
    }

    return houseMemoryInsight.summary
  }

  const getNivaMostActiveRoomsAnswer = () => {
    const activeRooms =
      dailyRhythmInsight.activeRoomsHour.length > 0
        ? dailyRhythmInsight.activeRoomsHour
        : dailyRhythmInsight.activeRoomsDay

    if (activeRooms.length === 0) {
      return 'Jeg ser lite romaktivitet i historikken ennå.'
    }

    return `Mest aktivitet ligger i ${activeRooms
      .slice(0, 3)
      .map((room) => room.roomName)
      .join(', ')}. ${activeRooms[0].observation ?? ''}`.trim()
  }

  const getNivaEveningRhythmAnswer = () => dailyRhythmInsight.eveningSummary

  const getNivaActiveTodayAnswer = () => {
    const mediaText =
      mediaPlayer.isPlaying && currentMediaTrack
        ? `Media spiller ${currentMediaTrack.title} nå.`
        : ''

    return [dailyRhythmInsight.activeTodaySummary, dailyRhythmInsight.homeObservation, mediaText]
      .filter(Boolean)
      .join(' ')
  }

  const getNivaAmbientObservation = () => {
    const activeRoomCount = nivaHouseSnapshot.presence.activeRoomNames.length
    const stableRoom = nivaHouseSnapshot.roomsWithTemperature.find(
      (room) => Math.abs(room.temperature - room.targetTemperature) <= targetTolerance,
    )
    const heatDemandRoom = nivaHouseSnapshot.roomsWithHeatDemand.find(
      (room) => typeof room.heatDemand === 'number' && room.heatDemand >= 30,
    )

    if (adaptiveQuietMode && !heatDemandRoom && !weatherAwareness.alert) {
      return null
    }

    if (homeStatus === 'Borte' && lightsOnCount === 0 && !mediaPlayer.isPlaying) {
      return {
        key: `empty:${homeStatus}`,
        text: 'Huset virker tomt akkurat nå.',
      }
    }

    if (displayedHousePresence.state === 'darkQuiet') {
      return {
        key: 'dark-quiet',
        text: 'Huset virker stille og mørkt.',
      }
    }

    if (dailyRhythmInsight.homeObservation) {
      return {
        key: `rhythm:${dailyRhythmInsight.homeObservation}`,
        text: dailyRhythmInsight.homeObservation,
      }
    }

    if (activeRoomCount >= 2) {
      return {
        key: `active-rooms:${activeRoomCount}`,
        text: 'Det er aktivitet i flere rom akkurat nå.',
      }
    }

    if (heatDemandRoom) {
      return {
        key: `heat:${heatDemandRoom.key}:${Math.floor((heatDemandRoom.heatDemand ?? 0) / 20)}`,
        text: `Det er fortsatt varmeaktivitet i ${heatDemandRoom.name}.`,
      }
    }

    if (stableRoom) {
      return {
        key: `stable:${stableRoom.key}`,
        text: `${stableRoom.name} holder stabil temperatur.`,
      }
    }

    if (
      displayedHousePresence.state === 'quietEvening' ||
      displayedHousePresence.state === 'rainQuietEvening'
    ) {
      return {
        key: `presence:${displayedHousePresence.state}`,
        text: displayedHousePresence.label,
      }
    }

    if (bridgeRuntimeStatus === 'ready' && lightsOnCount === 0 && !mediaPlayer.isPlaying) {
      return {
        key: 'quiet-home',
        text: getQuietHousePhrase(currentClock.getHours() + currentClock.getDate()),
      }
    }

    return null
  }

  const getNivaLatestEventAnswer = () => {
    const latestNivaAction = [...nivaMessages]
      .reverse()
      .find((message) => message.role === 'niva' && message.status === 'completed')
    const latestEvent = lastKnxIn ?? lastKnxOut ?? lastClimateEvent ?? lastRuntimeError

    if (latestNivaAction) {
      return `Sist utførte NIVA: ${latestNivaAction.text}`
    }

    if (latestEvent) {
      return `Siste systemhendelse er ${latestEvent.label}: ${latestEvent.detail} (${latestEvent.at}).`
    }

    return 'Jeg har ingen registrert siste hendelse ennå.'
  }

  const getNivaSourceTypeLabel = (point: RuntimeHistoryPoint | null) => {
    if (!point) {
      return 'ukjent kilde'
    }

    const category = classifyRuntimeHistorySource(point)

    if (category === 'liveKnx') {
      return 'live KNX'
    }

    if (category === 'manualPoll') {
      return 'manuell Hent verdier'
    }

    if (category === 'groupValueResponse') {
      return 'KNX response etter poll'
    }

    if (category === 'restoredHistory') {
      return 'sist kjente historikk'
    }

    if (category === 'roomSnapshotReference') {
      return 'romsnapshot/reference'
    }

    if (category === 'derivedQuery' || category === 'aggregate') {
      return 'derived/query'
    }

    if (category === 'frontendFallback') {
      return 'frontend fallback'
    }

    return point.source || 'ukjent kilde'
  }

  const getNivaLatestRoomTruthPoint = (
    roomKey: string,
    field: RuntimeHistoryField,
    includeZoneValues = false,
  ) =>
    roomTruthHistory
      .filter(
        (point) =>
          point.roomKey === roomKey &&
          point.field === field &&
          (includeZoneValues || !point.zoneKey) &&
          Number.isFinite(point.value),
      )
      .sort((a, b) => b.timestamp - a.timestamp)[0] ?? null

  const formatNivaPointValue = (point: RuntimeHistoryPoint, label: string) => {
    if (point.field === 'temperature' || point.field === 'setpoint') {
      return `${label} ${formatNivaTemperature(point.value)}`
    }

    if (point.field === 'heatDemand' || point.field === 'brightness') {
      return `${label} ${Number(point.value.toFixed(point.value % 1 === 0 ? 0 : 1)).toLocaleString('nb-NO')}%`
    }

    return `${label} ${point.value.toLocaleString('nb-NO')}`
  }

  const getNivaTruthSourceAnswer = (
    normalizedText: string,
    matchedRoom: ReturnType<typeof getNivaRoomMatch> | undefined,
  ) => {
    const targetRoom = matchedRoom ?? getSelectedNivaRoomCandidate()

    if (!targetRoom) {
      return 'Velg eller nevn et rom først, så kan jeg forklare hvor verdien kommer fra.'
    }

    const asksHeatDemand =
      normalizedText.includes('heatdemand') ||
      normalizedText.includes('varmebehov') ||
      normalizedText.includes('varmepådrag') ||
      normalizedText.includes('varmepadrag')
    const asksSetpoint = normalizedText.includes('setpunkt') || normalizedText.includes('settpunkt')
    const asksLight = normalizedText.includes('lys') || normalizedText.includes('dimming')
    const field: RuntimeHistoryField = asksHeatDemand
      ? 'heatDemand'
      : asksSetpoint
        ? 'setpoint'
        : asksLight
          ? 'brightness'
          : 'temperature'
    const label = asksHeatDemand
      ? 'varmebehovet'
      : asksSetpoint
        ? 'settpunktet'
        : asksLight
          ? 'lysverdien'
          : 'temperaturen'
    const point = getNivaLatestRoomTruthPoint(targetRoom.room.key, field, asksLight)

    if (!point) {
      const fallbackSource = resolvedRoomTruthSources.find((source) => source.roomKey === targetRoom.room.key)
      const fallbackAddress =
        field === 'heatDemand'
          ? fallbackSource?.heatDemandGroupAddress
          : field === 'brightness'
            ? fallbackSource?.brightnessGroupAddress ?? fallbackSource?.lightGroupAddress
            : fallbackSource?.temperatureGroupAddress

      return fallbackAddress
        ? `Jeg har ikke et ferskt trendpunkt for ${label} i ${targetRoom.room.name}, men mappingen peker mot gruppeadresse ${fallbackAddress}.`
        : `Jeg finner ikke nok lineage for ${label} i ${targetRoom.room.name} ennå. Prøv Hent verdier for rommet.`
    }

    const sourceLabel = getNivaSourceTypeLabel(point)
    const groupText = point.groupAddress ? ` på gruppeadresse ${point.groupAddress}` : ''
    const dptText = point.dpt ? `, ${point.dpt}` : ''
    const zoneText = point.zoneKey ? ` for sone ${point.zoneKey}` : ''
    const confidenceText = point.confidence ? ` Confidence er ${point.confidence}.` : ''
    const caution =
      ['restoredHistory', 'roomSnapshotReference', 'derivedQuery', 'aggregate', 'frontendFallback'].includes(
        classifyRuntimeHistorySource(point),
      )
        ? ' Jeg behandler den som sist kjent eller avledet, ikke som live måling.'
        : ''

    return `${formatNivaPointValue(point, `Denne ${label}`)} kommer fra ${sourceLabel}${groupText}${dptText}${zoneText}. Sist oppdatert ${formatShortRelativeTime(point.timestamp)}.${confidenceText}${caution}`
  }

  const getNivaHeatDemandExplanationAnswer = (
    matchedRoom: ReturnType<typeof getNivaRoomMatch> | undefined,
  ) => {
    const roomText =
      matchedRoom && typeof matchedRoom.room.heatDemand === 'number'
        ? ` ${matchedRoom.room.name} viser nå ${Number(matchedRoom.room.heatDemand.toFixed(1)).toLocaleString('nb-NO')}%.`
        : ''

    return `HeatDemand er varmebehovet regulatoren melder, normalt som KNX DPT 5.001 fra 0 til 100%. 0% betyr at rommet ikke ber om varme akkurat da, høyere prosent betyr mer varmebehov. Det er feedback, ikke en kommando.${roomText}`
  }

  const getNivaPollTimeoutExplanationAnswer = (
    normalizedText: string,
    matchedRoom: ReturnType<typeof getNivaRoomMatch> | undefined,
  ) => {
    const targetRoom = matchedRoom ?? getSelectedNivaRoomCandidate()

    if (!targetRoom) {
      return 'Timeout betyr at Lynell ba om en feedback-verdi, men ikke fikk svar innen poll-vinduet. Velg et rom, så kan jeg vise hvilke adresser det gjelder.'
    }

    const pollResult = roomPollStateByKey[targetRoom.room.key]?.result
    const failedGroups = (pollResult?.failedGroups ?? []).filter((group) => {
      const failureType = String(group.failureType ?? '').toLowerCase()
      const matchesZone = normalizedText.includes('zone3') || normalizedText.includes('sone 3')
        ? String(group.zoneKey ?? '').toLowerCase().includes('zone3') ||
          String(group.label ?? '').toLowerCase().includes('zone3') ||
          String(group.label ?? '').toLowerCase().includes('sone 3')
        : true
      return matchesZone && (failureType === '' || failureType === 'timeout' || failureType === 'noresponse')
    })

    if (failedGroups.length === 0) {
      return `${targetRoom.room.name} har ingen reelle timeout-feil i siste poll-resultat. Tomme eller ikke-konfigurerte adresser skal vises som skipped/notConfigured, ikke som feil.`
    }

    const groupText = failedGroups
      .slice(0, 4)
      .map((group) =>
        [
          group.groupAddress,
          group.label ?? group.field,
          group.dpt,
          group.failureType ?? 'timeout',
        ]
          .filter(Boolean)
          .join(' · '),
      )
      .join('; ')

    return `Timeout i ${targetRoom.room.name} betyr at disse feedback-adressene ikke svarte på Hent verdier: ${groupText}. Det kan være en tom/forberedt sone, feil GA, eller at enheten ikke svarer på GroupValueRead.`
  }

  const getNivaLiveRestoredExplanationAnswer = (
    normalizedText: string,
    matchedRoom: ReturnType<typeof getNivaRoomMatch> | undefined,
  ) => {
    const targetRoom = matchedRoom ?? getSelectedNivaRoomCandidate()
    const sourceDistribution = getRuntimeHistorySourceDistribution(roomTruthHistory)
    const liveCount =
      sourceDistribution.liveKnx + sourceDistribution.manualPoll + sourceDistribution.groupValueResponse
    const restoredCount =
      sourceDistribution.restoredHistory +
      sourceDistribution.roomSnapshotReference +
      sourceDistribution.frontendFallback +
      sourceDistribution.derivedQuery +
      sourceDistribution.aggregate

    if (normalizedText.includes('restored') || normalizedText.includes('sist kjente')) {
      return `Restored data er sist kjente historikk Lynell lastet etter restart. Det er nyttig som referanse, men jeg skal ikke beskrive det som live. Akkurat nå ser jeg ${liveCount} live/poll-punkter og ${restoredCount} restored/reference-punkter i romgrunnlaget.`
    }

    if (targetRoom) {
      const point =
        getNivaLatestRoomTruthPoint(targetRoom.room.key, 'temperature') ??
        getNivaLatestRoomTruthPoint(targetRoom.room.key, 'heatDemand') ??
        getNivaLatestRoomTruthPoint(targetRoom.room.key, 'brightness', true)

      if (point) {
        return `${targetRoom.room.name} bruker nå ${getNivaSourceTypeLabel(point)} som siste relevante kilde. ${point.groupAddress ? `GA er ${point.groupAddress}. ` : ''}Sist oppdatert ${formatShortRelativeTime(point.timestamp)}.`
      }
    }

    return `Live data betyr KNX subscription eller manuell poll-response. Restored/reference betyr sist kjente eller avledet grunnlag. Akkurat nå ser jeg ${liveCount} live/poll-punkter og ${restoredCount} restored/reference-punkter.`
  }

  const getNivaKnxSubscriptionExplanationAnswer = () =>
    'KNX subscription betyr at bridge lytter kontinuerlig på bus-telegrammer og cacher siste verdi server-side. Frontend skal lese server truth, ikke trigge globale bus-lesinger ved sidebytte.'

  const getNivaManualPollExplanationAnswer = () =>
    'Hent verdier er en manuell feilsøkingslesing for ett rom. Lynell spør bare rommets feedback-adresser og legger svarene inn i samme cache/trendgrunnlag som live KNX.'

  const getNivaFoundationExplanationAnswer = (normalizedText: string) => {
    if (normalizedText.includes('cast')) {
      return `${getNivaCastDiscoveryAnswer()} Foundation betyr her at discovery/status kan finnes, men full playback-routing ikke er en ferdig liveRuntime ennå.`
    }

    return 'Foundation only betyr at Lynell kjenner provider, capability eller device-modell, men ikke skal late som full styring er klar. Den kan ofte vise status eller diagnostics, men controlAvailable er false til trygg runtime finnes.'
  }

  const getNivaSceneSchedulerAnswer = () => {
    const scheduler = bridgeHealth.snapshot?.sceneScheduler

    if (!scheduler) {
      return 'Jeg venter på scene scheduler-status fra bridge. Til den er synlig i diagnostics bør tidsstyrte scener behandles som usikre.'
    }

    const owner =
      scheduler.schedulerSource === 'server-runtime'
        ? 'server/runtime'
        : scheduler.schedulerSource === 'frontend'
          ? 'frontend'
          : scheduler.schedulerSource
    const activeText = scheduler.schedulerActive ? 'aktiv' : 'ikke aktiv'
    const nextText = scheduler.nextExecution?.nextExecutionAt
      ? ` Neste planlagte scene er ${scheduler.nextExecution.sceneName} ${formatShortRelativeTime(Date.parse(scheduler.nextExecution.nextExecutionAt))}.`
      : ' Ingen neste kjøring er planlagt akkurat nå.'
    const lastText = scheduler.lastExecution?.executedAt
      ? ` Sist kjørte scene var ${scheduler.lastExecution.sceneName} ${formatShortRelativeTime(Date.parse(scheduler.lastExecution.executedAt))}.`
      : ' Jeg ser ingen nylig kjørte scener ennå.'
    const targetResults = Array.isArray(scheduler.lastExecutionResult?.targetResults)
      ? scheduler.lastExecutionResult.targetResults
      : []
    const dryRunTargets = Array.isArray(scheduler.lastDryRun?.targets)
      ? scheduler.lastDryRun.targets
      : []
    const targetSource = targetResults.length > 0 ? targetResults : dryRunTargets
    const targetText = targetSource.length > 0
      ? ` Siste kjente scene-plan brukte ${targetSource
          .slice(0, 4)
          .map((target) => {
            const entry = target as Record<string, unknown>
            const groupAddress = typeof entry.groupAddress === 'string' ? entry.groupAddress : 'ukjent GA'
            const value =
              typeof entry.brightness === 'number'
                ? `${entry.brightness}%`
                : typeof entry.setpoint === 'number'
                  ? `${entry.setpoint}°`
                  : 'verdi'
            return `${groupAddress} ${value}`
          })
          .join(', ')}.`
      : ''
    const issueText = scheduler.lastExecutionError
      ? ` Siste scheduler-feil: ${scheduler.lastExecutionError}.`
      : scheduler.lastSkippedReason?.reason
        ? ` Siste skip-årsak: ${scheduler.lastSkippedReason.reason}.`
        : ''
    const safetyText =
      scheduler.schedulerSource === 'server-runtime'
        ? 'Den er persisted og skal overleve frontend-refresh.'
        : 'Den er ikke family-ready fordi nettleser-refresh eller sleep kan stoppe den.'

    return `Scene scheduler er ${activeText} og eies av ${owner}. ${safetyText}${nextText}${lastText}${targetText}${issueText}`
  }

  const getNivaKnxMonitorAnswer = (normalizedText: string) => {
    const latest = latestKnxMonitorEvent
    const sceneWrites = knxMonitorEvents.filter(
      (event) => event.tone === 'scene' || String(event.source).toLowerCase().includes('scene'),
    )
    const optimisticRelated = knxMonitorEvents.filter(
      (event) =>
        event.tone === 'optimistic' ||
        String(event.relation?.type ?? '').toLowerCase().includes('optimistic'),
    )

    if (normalizedText.includes('scene') && sceneWrites.length > 0) {
      const writes = sceneWrites
        .slice(-5)
        .reverse()
        .map((event) => `${event.groupAddress ?? 'ukjent GA'} → ${String(event.decodedValue ?? '—')}`)
        .join(', ')
      return `Siste scene-relaterte KNX writes i monitoren er: ${writes}. De vises med scene/source slik at du kan sammenligne med ETS.`
    }

    if (normalizedText.includes('optimistic') || normalizedText.includes('bekreft')) {
      if (optimisticRelated.length > 0) {
        const event = optimisticRelated[optimisticRelated.length - 1]
        return `Siste optimistic-relaterte KNX-hendelse er ${event?.groupAddress ?? 'ukjent GA'} fra ${event?.source ?? 'ukjent kilde'}. Monitoren viser om feedback kom etter sendt verdi.`
      }
      return 'Jeg ser ingen aktive optimistic-relaterte monitorhendelser akkurat nå. Hvis feedback mangler, vil RoomCard og Manager vise avventende/korrigert status.'
    }

    if (!latest) {
      return 'KNX monitoren har ikke mottatt telegrammer i denne frontend-sesjonen ennå. Den fylles fra serverens runtime-buffer når bridge ser KNX cache/write-hendelser.'
    }

    return `Siste KNX telegram i Lynell-monitoren er ${latest.groupAddress ?? 'ukjent GA'} (${latest.dpt ?? 'ukjent DPT'}) med verdi ${String(latest.decodedValue ?? '—')}. Kilde er ${latest.source}, retning ${latest.direction}, og rom er ${latest.roomName ?? latest.roomKey ?? 'ikke mappet'}.`
  }

  const getNivaSystemExplanationAnswer = (normalizedText: string) => {
    if (
      normalizedText.includes('knx monitor') ||
      normalizedText.includes('monitorvindu') ||
      normalizedText.includes('siste telegram') ||
      normalizedText.includes('telegramflyt') ||
      normalizedText.includes('hvilke ga')
    ) {
      return getNivaKnxMonitorAnswer(normalizedText)
    }

    if (normalizedText.includes('live knx')) {
      return 'Live KNX betyr at verdien kommer fra KNX subscription eller en fersk KNX response, med gruppeadresse og DPT når mappingen finnes.'
    }

    if (normalizedText.includes('hent verdier') || normalizedText.includes('poll')) {
      return getNivaManualPollExplanationAnswer()
    }

    if (normalizedText.includes('rom') && normalizedText.includes('sone')) {
      return 'Et rom er helheten Lynell viser. En sone er en del av rommet, for eksempel en lyssone. En provider er runtime-kilden, som KNX, Cast eller Deltaco/Tuya foundation.'
    }

    if (normalizedText.includes('trygt') || normalizedText.includes('styre')) {
      return 'Trygt å styre betyr lokal brukerhandling, kjent capability og riktig write-path. Foundation providers, restored data og ukjent trust skal ikke gi styring uten tydelig godkjenning.'
    }

    if (
      normalizedText.includes('nettleser') ||
      normalizedText.includes('pwa') ||
      normalizedText.includes('desktop app') ||
      normalizedText.includes('mobilapp') ||
      normalizedText.includes('egen app')
    ) {
      return 'Lynell kjører foreløpig i nettleseren mot lokal bridge. Senere kan samme flate pakkes som PWA, desktop eller app, men akkurat nå er nettleseren den tryggeste runtime-flaten.'
    }

    if (
      normalizedText.includes('læring') ||
      normalizedText.includes('laering') ||
      normalizedText.includes('mønster') ||
      normalizedText.includes('monster') ||
      normalizedText.includes('forslag')
    ) {
      return 'Lynell kan foreløpig bare se etter enkle, lokale mønsterkandidater, som samme dimmenivå rundt samme tidspunkt. Det blir kun forslag, ingen automatikk eller planlagt styring.'
    }

    if (
      (normalizedText.includes('lys') || normalizedText.includes('dimming') || normalizedText.includes('dim')) &&
      (normalizedText.includes('feedback') ||
        normalizedText.includes('bekreft') ||
        normalizedText.includes('venter') ||
        normalizedText.includes('treg') ||
        normalizedText.includes('status') ||
        normalizedText.includes('reagerte ikke'))
    ) {
      const active = optimisticLightingDiagnostics.activeEntries[0]

      if (active) {
        return `Lynell viser sist sendte lysverdi med en liten amber-indikator til KNX-feedback bekrefter. ${active.roomName}/${active.zoneName} står foreløpig som ${active.expectedBrightness}%. Hvis feedback avviker, korrigerer UI seg tilbake til faktisk KNX-truth.`
      }

      return 'Når du styrer lys, viser Lynell sist sendte verdi umiddelbart og markerer den diskret til KNX-feedback bekrefter. Hvis feedback uteblir eller avviker, korrigeres UI rolig mot faktisk truth.'
    }

    if (
      normalizedText.includes('scene scheduler') ||
      normalizedText.includes('tidsstyr') ||
      normalizedText.includes('planlagt scene') ||
      (normalizedText.includes('scene') && (normalizedText.includes('kjøre') || normalizedText.includes('kjørte') || normalizedText.includes('kjorte') || normalizedText.includes('kl.')))
    ) {
      return getNivaSceneSchedulerAnswer()
    }

    if (
      normalizedText.includes('solskjerming') ||
      normalizedText.includes('screen') ||
      normalizedText.includes('persienne') ||
      normalizedText.includes('markise') ||
      normalizedText.includes('gardin')
    ) {
      const visibleEntries = shadingDiagnostics.entries.filter((entry) => entry.visible)
      const missingEntries = shadingDiagnostics.entries.filter((entry) => entry.enabled && entry.missingMapping)

      if (!shadingUiEnabled) {
        return 'Solskjerming er skjult fordi UI-capability for solskjerming er deaktivert i Manager. Aktiver den der først, så kan foundation-soner vises.'
      }

      if (visibleEntries.length === 0) {
        return 'Jeg finner ingen aktive solskjermingssoner å vise ennå. En sone kan likevel lagres i Manager og vises som foundation når den aktiveres.'
      }

      if (missingEntries.length > 0) {
        const examples = missingEntries
          .slice(0, 3)
          .map((entry) => `${entry.label}: ${entry.missingFields.join(', ') || 'gruppeadresse'}`)
          .join('; ')
        return `Solskjerming er synlig, men ${missingEntries.length} sone(r) mangler mapping. ${examples}. Tomme gruppeadresser sender ingen KNX-write.`
      }

      const liveReady = visibleEntries.filter((entry) => entry.liveReady).length
      const partial = visibleEntries.filter((entry) => entry.partialMapping).length
      const lastCommand = Object.values(shadingCommandStateById)
        .sort((a, b) => b.startedAt - a.startedAt)[0]
      const commandText = lastCommand
        ? ` Siste kommando er ${lastCommand.action} for ${lastCommand.shadingId}, status ${lastCommand.status}.`
        : ''

      return `Solskjerming har ${visibleEntries.length} synlige sone(r): ${liveReady} klar og ${partial} delvis konfigurert. Lynell sender bare KNX-write når riktig GA finnes. Posisjon er bekreftet først når feedbackPosition svarer; uten feedback vises sist sendt kommando med lavere tillit.${commandText}`
    }

    if (
      normalizedText.includes('auto-poll') ||
      normalizedText.includes('autopoll') ||
      normalizedText.includes('stille signal') ||
      normalizedText.includes('quiet signal')
    ) {
      const modeLabel = autoPollTargetDiagnostics.mode
      const selected = autoPollTargetDiagnostics.preview
        .filter((target) => target.selected)
        .slice(0, 5)
        .map((target) => `${target.roomName} ${target.field} ${target.groupAddress}`)
        .join(', ')

      return `Auto-poll stille signaler er ${autoPollTargetDiagnostics.enabled ? 'på' : 'av'} og står i modus ${modeLabel}. Preview viser ${autoPollTargetDiagnostics.selectedCount} valgte av ${autoPollTargetDiagnostics.eligibleCount} eligible signaler. ${selected ? `Valgte signaler: ${selected}.` : 'Ingen signaler er valgt akkurat nå.'}`
    }

    if (
      normalizedText.includes('kamera') ||
      normalizedText.includes('camera') ||
      normalizedText.includes('nvr') ||
      normalizedText.includes('rtsp') ||
      normalizedText.includes('onvif') ||
      normalizedText.includes('tapo')
    ) {
      const summary = cameraFoundationDiagnostics
      const missing = summary.entries.filter((entry) => entry.missingStream).slice(0, 3)
      const missingText = missing.length
        ? ` Mangler stream/snapshot: ${missing.map((entry) => entry.displayName).join(', ')}.`
        : ''

      return nivaText(
        `Kamera/NVR er foundation nå: ${summary.visibleCount} synlige kamera, ${summary.recordingEnabledCount} med recording foundation og lagring mot ${summary.recorderTargetLabel}. RTSP betyr lokal stream-URL, ONVIF betyr standardisert kameraoppdagelse/styringsmetadata. Ingen opptakspipeline eller videoanalyse kjører ennå.${missingText}`,
        `Camera/NVR is foundation right now: ${summary.visibleCount} visible cameras, ${summary.recordingEnabledCount} with recording foundation and storage set to ${summary.recorderTargetLabel}. RTSP means a local stream URL; ONVIF means standardized camera discovery/control metadata. No recording pipeline or video analysis is running yet.${missingText}`,
      )
    }

    if (
      normalizedText.includes('media group') ||
      normalizedText.includes('mediagruppe') ||
      normalizedText.includes('høyttalergruppe') ||
      normalizedText.includes('speaker group') ||
      normalizedText.includes('delay offset') ||
      normalizedText.includes('forsinkelse')
    ) {
      const summary = mediaGroupDiagnostics

      return nivaText(
        `Media groups er foundation: ${summary.groupCount} grupper, ${summary.speakerCount} høyttalere og ${summary.delayOffsetCount} ms-offsets er konfigurert. Offset brukes foreløpig bare som calibration/config-grunnlag; Lynell kjører ikke full audio sync-engine ennå.`,
        `Media groups are foundation: ${summary.groupCount} groups, ${summary.speakerCount} speakers and ${summary.delayOffsetCount} ms offsets are configured. Offsets are currently calibration/config only; Lynell is not running a full audio sync engine yet.`,
      )
    }

    return 'Lynell følger rom, lys, klima og integrasjoner i sanntid. KNX er den lokale ryggraden for romstyring. Jeg kan forklare hva som skjer, vise hvor data kommer fra og foreslå manuelle sjekkpunkter. Jeg utfører ikke automatiske handlinger uten godkjenning.'
  }

  const pulseNivaProcessing = (durationMs = 900) => {
    setIsNivaProcessing(true)

    if (nivaProcessingTimeoutRef.current !== null) {
      window.clearTimeout(nivaProcessingTimeoutRef.current)
    }

    nivaProcessingTimeoutRef.current = window.setTimeout(() => {
      setIsNivaProcessing(false)
      nivaProcessingTimeoutRef.current = null
    }, durationMs)
  }

  const getNivaConversationPageContext = () => {
    const room =
      selectedFocusRoom ??
      selectedTrendRoom ??
      (selectedRoomManagerConfig
        ? rooms.find((candidate) => candidate.key === selectedRoomManagerConfig.key) ?? null
        : null)

    return {
      currentPage: activeMainView,
      activeView: activeScopedView,
      selectedRoom: room?.key ?? selectedRoomManagerConfig?.key ?? null,
      selectedDomain:
        activeMainView === 'climate'
          ? 'climate'
          : activeMainView === 'lights'
            ? 'lighting'
            : activeMainView === 'media'
              ? 'media'
              : activeMainView === 'manager'
                ? 'runtime'
                : null,
      selectedTrend:
        activeMainView === 'trend-history'
          ? `${selectedTrendRoom?.key ?? 'none'}:${trendHistoryRange}`
          : null,
    }
  }

  const recordNivaConversation = (payload: {
    role: 'user' | 'niva'
    message: string
    intent?: string | null
    category?: string | null
    responseStatus?: string | null
    actionProposal?: NivaProposedAction | null
    actionResult?: Record<string, unknown> | null
    source?: string | null
    confidence?: string | null
  }) => {
    if (!conversationLoggingEnabled) {
      return
    }

    void logNivaConversation({
      ...getNivaConversationPageContext(),
      role: payload.role,
      message: payload.message,
      intent: payload.intent ?? null,
      category: payload.category ?? null,
      responseStatus: payload.responseStatus ?? null,
      actionProposal: payload.actionProposal
        ? (payload.actionProposal as unknown as Record<string, unknown>)
        : null,
      actionResult: payload.actionResult ?? null,
      source: payload.source ?? null,
      confidence: payload.confidence ?? null,
    })
      .then((result) => {
        setConversationLoggingStatus(
          result?.logged === false ? 'Conversation logging disabled' : 'Conversation logged',
        )
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : 'Conversation logging failed'
        setConversationLoggingStatus(message)
      })
  }

  const softenNivaFamilyText = (value: string) =>
    value
      .replace(/\bruntime-config\b/gi, 'systemoppsett')
      .replace(/\bruntime-state\b/gi, 'sist kjente status')
      .replace(/\bruntime\b/gi, 'systemet')
      .replace(/\bpayload\b/gi, 'detaljer')
      .replace(/\baction pipeline\b/gi, 'trygg bekreftelse')
      .replace(/\bsource confidence\b/gi, 'datagrunnlag')
      .replace(/\bconfidence\b/gi, 'tillit')
      .replace(/\bstale signal(?:er)?\b/gi, 'signaler som venter på oppdatering')
      .replace(/\bstale\b/gi, 'venter på oppdatering')
      .replace(/\bprovider unavailable\b/gi, 'integrasjonen er ikke tilgjengelig akkurat nå')
      .replace(/\bprovider\b/gi, 'integrasjon')
      .replace(/\bfeedback\b/gi, 'tilbakemelding')
      .replace(/\btruth\b/gi, 'status')
      .replace(/\bDPT\b/g, 'signaltype')

  const recordNivaInteractionParse = (entry: {
    text: string
    intent: NivaMessage['intent']
    confidence: NivaIntentConfidence
    roomName?: string | null
    proposedAction?: NivaProposedAction | null
    clarification?: string | null
    fallbackUsed?: boolean
    roomAliasMatched?: boolean
  }) => {
    const parseEntry = {
      at: new Date().toISOString(),
      text: entry.text,
      intent: entry.intent,
      confidence: entry.confidence,
      roomName: entry.roomName ?? null,
      proposedAction: entry.proposedAction?.kind ?? null,
      clarification: entry.clarification ?? null,
    }

    setNivaInteractionDiagnostics((current) => ({
      confidenceDistribution: {
        ...current.confidenceDistribution,
        [entry.confidence]: current.confidenceDistribution[entry.confidence] + 1,
      },
      clarificationCount: current.clarificationCount + (entry.clarification ? 1 : 0),
      misunderstoodIntentCount:
        current.misunderstoodIntentCount + (entry.confidence === 'uncertain' ? 1 : 0),
      successfulConversationalActions: current.successfulConversationalActions,
      roomAliasMatches: current.roomAliasMatches + (entry.roomAliasMatched ? 1 : 0),
      fallbackUsageCount: current.fallbackUsageCount + (entry.fallbackUsed ? 1 : 0),
      latestParse: parseEntry,
      rawParses: [parseEntry, ...current.rawParses].slice(0, 12),
    }))
  }

  const getNivaPageContextAnswer = (normalizedText: string) => {
    if (normalizedText.includes('hva ser jeg på denne siden') || normalizedText.includes('hva ser jeg pa denne siden')) {
      if (activeMainView === 'trend-history') {
        return `Du ser trendhistorikk for ${selectedTrendRoom?.name ?? 'valgt rom'}. Grafene skiller live KNX/manual poll fra reference og sist kjente historikk, slik at gamle punkter ikke fremstår som live.`
      }

      if (activeMainView === 'rooms') {
        return `Du ser romoversikten for ${selectedFocusRoom?.name ?? activeFloor?.label ?? 'valgt etasje'}. Romkortene viser sist resolved room truth med kilde og freshness bak kulissene.`
      }

      if (activeMainView === 'climate') {
        return 'Du ser klimavisningen. Temperatur, settpunkt og heatDemand kommer fra server-eid romconfig og live KNX/manual poll når signalene finnes.'
      }

      if (activeMainView === 'manager') {
        return 'Du ser Manager. Normal status ligger først, mens developer-verktøy og rå diagnostics ligger samlet lenger ned.'
      }

      return 'Du ser Lynell sin hovedflate. Den viser siste kjente runtime-truth, NIVA-observasjoner og om bridge/runtime er fersk eller venter på ny kontakt.'
    }

    if (normalizedText.includes('hva betyr denne grafen')) {
      return `Grafen viser ${selectedTrendRoom?.name ?? 'valgt rom'} i valgt tidsvindu. Live KNX og manuelle poll-svar regnes som høyere tillit; reference/restored data vises som historikkgrunnlag.`
    }

    if (normalizedText.includes('hvorfor vises denne verdien')) {
      return getNivaTruthSourceAnswer(normalizedText, getSelectedNivaRoomCandidate())
    }

    return null
  }

  const handleSendNivaText = (textValue: string) => {
    const text = textValue.trim()

    if (!text) {
      return
    }

    pulseNivaProcessing()

    const now = Date.now()
    const normalizedText = text.toLowerCase()
    const pendingClarificationActive =
      nivaPendingClarification && now < nivaPendingClarification.expiresAt
        ? nivaPendingClarification
        : null
    const intent: NivaMessage['intent'] = pendingClarificationActive ? 'light' : getNivaIntent(text)
    markStaleCalendarActions(now)
    const isConfirmationReply =
      ['ja', 'ja takk', 'ok', 'okay', 'bekreft', 'bekrefter', 'gjør det', 'gjor det', 'kjør', 'kjor'].includes(
        normalizeNivaDisplayText(normalizedText),
      )
    const getPendingActionTimeoutMs = (message: NivaMessage) =>
      message.proposedAction?.kind === 'calendar' ? calendarPendingTimeoutMs : 5 * 60 * 1000
    const latestPendingNivaAction = [...nivaMessages]
      .reverse()
      .find(
        (message) =>
          message.role === 'niva' &&
          message.status === 'pending' &&
          Boolean(message.proposedAction) &&
          now - message.timestamp <= getPendingActionTimeoutMs(message),
      )
    const latestStalePendingCalendarAction = [...nivaMessages]
      .reverse()
      .find(
        (message) =>
          message.role === 'niva' &&
          message.status === 'pending' &&
          message.proposedAction?.kind === 'calendar' &&
          now - message.timestamp > calendarPendingTimeoutMs,
      )

    if (isConfirmationReply) {
      const userMessage: NivaMessage = {
        id: `niva-user-${now}`,
        timestamp: now,
        role: 'user',
        text,
        type: 'command',
        status: 'completed',
        intent,
      }

      setNivaMessages((currentMessages) => [...currentMessages, userMessage])
      setNivaInput('')
      recordNivaConversation({
        role: 'user',
        message: text,
        intent,
        category: 'confirmation',
        responseStatus: 'received',
      })

      if (latestPendingNivaAction?.proposedAction) {
        setNivaFollowThroughDiagnostics((current) => ({
          ...current,
          hits: current.hits + 1,
          lastHitAt: new Date(now).toISOString(),
          lastActionSummary: latestPendingNivaAction.proposedAction?.summary ?? null,
        }))
        recordNivaConversation({
          role: 'niva',
          message: `Bekreftelse mottatt for ${latestPendingNivaAction.proposedAction.summary}.`,
          intent: latestPendingNivaAction.intent,
          category: 'confirmation-follow-through',
          responseStatus: 'queued',
          actionProposal: latestPendingNivaAction.proposedAction,
        })
        void handleResolveNivaProposal(latestPendingNivaAction.id, 'completed')
        return
      }

      if (latestStalePendingCalendarAction?.proposedAction?.kind === 'calendar') {
        const staleResponseText =
          'Kalenderforslaget er blitt gammelt. Be meg lage det på nytt, så unngår vi feil dato eller dobbeltføring.'
        updateCalendarActionRecord(latestStalePendingCalendarAction.proposedAction, 'stale', {
          staleAt: new Date(now).toISOString(),
          error: 'Brukeren bekreftet etter at kalenderforslaget var utløpt.',
        })
        setNivaMessages((currentMessages) => [
          ...currentMessages,
          {
            id: `niva-response-${now}`,
            timestamp: now + 1,
            role: 'niva',
            text: staleResponseText,
            type: 'response',
            status: 'acknowledged',
            intent: 'calendar',
          },
        ])
        recordNivaConversation({
          role: 'niva',
          message: staleResponseText,
          intent: 'calendar',
          category: 'confirmation-follow-through',
          responseStatus: 'stale',
          actionProposal: latestStalePendingCalendarAction.proposedAction,
        })
        return
      }

      setNivaFollowThroughDiagnostics((current) => ({
        ...current,
        misses: current.misses + 1,
        lastMissAt: new Date(now).toISOString(),
      }))
      setNivaMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `niva-response-${now}`,
          timestamp: now + 1,
          role: 'niva',
          text: 'Jeg finner ikke et ferskt forslag å bekrefte. Be meg lage forslaget på nytt, så holder jeg konteksten klar en liten stund.',
          type: 'response',
          status: 'acknowledged',
          intent: 'system',
        },
      ])
      recordNivaConversation({
        role: 'niva',
        message:
          'Jeg finner ikke et ferskt forslag å bekrefte. Be meg lage forslaget på nytt, så holder jeg konteksten klar en liten stund.',
        intent: 'system',
        category: 'confirmation-follow-through',
        responseStatus: 'missing-context',
      })
      return
    }
    const intentGapDrafts: {
      suggestedCategory: NivaIntentGapCategory
      responseGiven: string
      note: string
    }[] = []
    const markNivaIntentGap = (
      suggestedCategory: NivaIntentGapCategory,
      responseGiven: string,
      note = getNivaIntentGapNote(suggestedCategory),
    ) => {
      if (intentGapDrafts.length > 0) {
        return
      }

      intentGapDrafts.push({
        suggestedCategory,
        responseGiven,
        note,
      })
    }
    const returnNivaExplanation = (answer: string) => {
      setNivaExplanationIntentCount((current) => current + 1)
      return answer
    }
    const wantsRoomManager =
      normalizedText.includes('rom-manager') ||
      normalizedText.includes('room manager') ||
      normalizedText.includes('avanserte rominnstillinger') ||
      normalizedText.includes('avanserte innstillinger')
    const wantsTrendHistory =
      normalizedText.includes('trendhistorikk') ||
      normalizedText.includes('trend') ||
      normalizedText.includes('historikk')
    const roomManagerMatch = wantsRoomManager
      ? getNivaRoomMatch(normalizedText) ??
        (selectedRoomManagerConfig
          ? {
              room: rooms.find((room) => room.key === selectedRoomManagerConfig.key),
              config: selectedRoomManagerConfig,
            }
          : undefined)
      : undefined
    const roomManagerTargetKey =
      roomManagerMatch?.room?.key ??
      roomManagerMatch?.config?.key ??
      selectedRoomManagerConfig?.key ??
      selectedFocusRoom?.key ??
      managerRooms[0]?.key
    const isActionRequest =
      ([
          'sett ',
          'slå ',
          'sla ',
          'skru ',
          'aktiver',
          'kjør ',
          'kjor ',
          'legg inn',
          'opprett',
          'endre',
          'gjør ',
          'gjor ',
          'fiks',
          'senk ',
          'øk ',
          'ok ',
          'demp',
          'dim',
          'spill ',
          'pause',
          'start',
        ].some((phrase) => normalizedText.includes(phrase)) ||
        Boolean(pendingClarificationActive)) &&
      !normalizedText.includes('hva') &&
      !normalizedText.includes('hvordan') &&
      !normalizedText.includes('hvilke') &&
      !normalizedText.includes('er ')
    const climateActionResult =
      isActionRequest && intent === 'climate'
        ? getNivaClimateSetpointAction(normalizedText)
        : undefined
    const lightActionResult =
      isActionRequest && intent === 'light'
        ? getNivaLightActionResult(normalizedText)
        : undefined
    const roomActionProposal =
      isActionRequest && !lightActionResult?.issue && !climateActionResult?.issue
        ? getNivaRoomActionProposal(normalizedText)
        : undefined
    const proposedAction = isActionRequest
      ? lightActionResult?.proposedAction ??
        climateActionResult?.proposedAction ??
        roomActionProposal ??
        getNivaProposedAction(text, normalizedText, intent, now)
      : undefined
    const answerQuestion = () => {
      const asksForNivaIdentity =
        normalizedText.includes('presenter deg selv') ||
        normalizedText.includes('hvem er du') ||
        normalizedText.includes('hva er niva') ||
        normalizedText.includes('hva gjør niva') ||
        normalizedText.includes('hva gjor niva')

      if (asksForNivaIdentity) {
        return t.niva.identity
      }

      const asksForSystemExplanation =
        normalizedText.includes('hva er lynell') ||
        normalizedText.includes('hva kan du hjelpe med') ||
        normalizedText.includes('hvordan fungerer systemet') ||
        normalizedText.includes('hva betyr live knx') ||
        normalizedText.includes('hva betyr hent verdier') ||
        normalizedText.includes('hva betyr rom') ||
        normalizedText.includes('hva betyr sone') ||
        normalizedText.includes('hva betyr provider') ||
        normalizedText.includes('hva er trygt å styre') ||
        normalizedText.includes('hva er trygt a styre') ||
        normalizedText.includes('hva betyr læring') ||
        normalizedText.includes('hva betyr laering') ||
        normalizedText.includes('hva er læring') ||
        normalizedText.includes('hva er laering') ||
        normalizedText.includes('scene scheduler') ||
        normalizedText.includes('tidsstyr') ||
        normalizedText.includes('planlagt scene')

      if (asksForSystemExplanation) {
        return returnNivaExplanation(getNivaSystemExplanationAnswer(normalizedText))
      }

      const pageContextAnswer = getNivaPageContextAnswer(normalizedText)

      if (pageContextAnswer) {
        return returnNivaExplanation(pageContextAnswer)
      }

      const asksForHeatDemandMeaning =
        normalizedText.includes('hva betyr heatdemand') ||
        normalizedText.includes('hva er heatdemand') ||
        normalizedText.includes('hva betyr varmebehov') ||
        normalizedText.includes('hva er varmebehov') ||
        normalizedText.includes('hva betyr varmepådrag') ||
        normalizedText.includes('hva betyr varmepadrag')

      if (asksForHeatDemandMeaning) {
        return returnNivaExplanation(getNivaHeatDemandExplanationAnswer(getNivaRoomMatch(normalizedText)))
      }

      const asksForKnxSubscription =
        normalizedText.includes('hva er knx subscription') ||
        normalizedText.includes('hva betyr knx subscription') ||
        normalizedText.includes('knx subscription')

      if (asksForKnxSubscription) {
        return returnNivaExplanation(getNivaKnxSubscriptionExplanationAnswer())
      }

      const asksForManualPollExplanation =
        normalizedText.includes('forskjell på live knx og manual poll') ||
        normalizedText.includes('forskjell pa live knx og manual poll') ||
        normalizedText.includes('forskjell på live knx og hent verdier') ||
        normalizedText.includes('forskjell pa live knx og hent verdier') ||
        normalizedText.includes('hva betyr manual poll')

      if (asksForManualPollExplanation) {
        return returnNivaExplanation(getNivaManualPollExplanationAnswer())
      }

      const energyExplanation = getNivaEnergyExplanation(normalizedText, energyIntelligence)

      if (energyExplanation) {
        return returnNivaExplanation(energyExplanation)
      }

      const asksForPollTimeoutExplanation =
        normalizedText.includes('hvorfor får jeg timeout') ||
        normalizedText.includes('hvorfor far jeg timeout') ||
        normalizedText.includes('hva betyr timeout') ||
        normalizedText.includes('timeout på zone') ||
        normalizedText.includes('timeout pa zone') ||
        normalizedText.includes('timeout på sone') ||
        normalizedText.includes('timeout pa sone')

      if (asksForPollTimeoutExplanation) {
        return returnNivaExplanation(
          getNivaPollTimeoutExplanationAnswer(normalizedText, getNivaRoomMatch(normalizedText)),
        )
      }

      const asksForLiveOrRestored =
        normalizedText.includes('er dette live data') ||
        normalizedText.includes('er dette live') ||
        normalizedText.includes('hva betyr restored') ||
        normalizedText.includes('hva er restored') ||
        normalizedText.includes('hva betyr restored data') ||
        normalizedText.includes('hva betyr sist kjente')

      if (asksForLiveOrRestored) {
        return returnNivaExplanation(
          getNivaLiveRestoredExplanationAnswer(normalizedText, getNivaRoomMatch(normalizedText)),
        )
      }

      const asksForValueSource =
        normalizedText.includes('hvorfor viser rommet') ||
        normalizedText.includes('hvor kommer denne verdien fra') ||
        normalizedText.includes('hvor kommer verdien fra') ||
        normalizedText.includes('hvor kommer temperaturen fra') ||
        normalizedText.includes('hvor kommer heatdemand fra') ||
        normalizedText.includes('hvor kommer varmebehov') ||
        normalizedText.includes('hvor kommer lysverdien fra')

      if (asksForValueSource) {
        return returnNivaExplanation(
          getNivaTruthSourceAnswer(normalizedText, getNivaRoomMatch(normalizedText)),
        )
      }

      const asksForFoundationMeaning =
        normalizedText.includes('hva betyr foundation only') ||
        normalizedText.includes('hva betyr foundation') ||
        normalizedText.includes('hvorfor kan ikke cast spille') ||
        normalizedText.includes('hvorfor kan ikke cast') ||
        normalizedText.includes('hvorfor spiller ikke cast')

      if (asksForFoundationMeaning) {
        return returnNivaExplanation(getNivaFoundationExplanationAnswer(normalizedText))
      }

      const asksToPollRoom =
        normalizedText.includes('poll verdier') ||
        normalizedText.includes('pool verdier') ||
        normalizedText.includes('hent verdi') ||
        normalizedText.includes('hent verdier') ||
        normalizedText.includes('les verdier') ||
        normalizedText.includes('poll rom')

      if (asksToPollRoom) {
        const pollRoomMatch = getNivaRoomMatch(normalizedText) ?? getSelectedNivaRoomCandidate()

        if (!pollRoomMatch) {
          return 'Velg eller nevn et rom først, så kan jeg hente KNX-verdiene for akkurat det rommet.'
        }

        void handlePollRoomValues(pollRoomMatch.room.key)
        return `Jeg henter verdier for ${pollRoomMatch.room.name}. Dette er en manuell KNX-lesing kun for rommets feedback-adresser.`
      }

      const asksAverageHouseTemperature =
        (normalizedText.includes('snitt') || normalizedText.includes('gjennomsnitt')) &&
        normalizedText.includes('temperatur')

      if (asksAverageHouseTemperature) {
        const climateRoomsWithTemperature = resolvedRooms.filter((room) => {
          const config = systemConfigData.rooms.find((candidate) => candidate.key === room.key)
          return config?.climate.active && Number.isFinite(room.temperature)
        })

        if (climateRoomsWithTemperature.length === 0) {
          return 'Jeg har ikke nok temperaturdata til å beregne snittet i huset ennå.'
        }

        const averageTemperature =
          climateRoomsWithTemperature.reduce((sum, room) => sum + room.temperature, 0) /
          climateRoomsWithTemperature.length

        return `Snittemperaturen i huset er ${formatNivaTemperature(Number(averageTemperature.toFixed(1)))} basert på ${climateRoomsWithTemperature.length} rom med klima-runtime.`
      }

      const asksRuntimeRoomStatus =
        normalizedText.includes('romstatus') ||
        normalizedText.includes('status for rom') ||
        normalizedText.includes('rommet status') ||
        normalizedText.includes('hvordan er rommet')

      if (asksRuntimeRoomStatus) {
        const statusRoomMatch = getNivaRoomMatch(normalizedText) ?? getSelectedNivaRoomCandidate()
        if (!statusRoomMatch) {
          return 'Velg eller nevn et rom, så kan jeg lese romstatus fra runtime-state.'
        }

        const activeZones = statusRoomMatch.room.zones.filter((zone) => zone.lightsOn)
        const heatDemandText =
          typeof statusRoomMatch.room.heatDemand === 'number'
            ? `Varmebehovet er ${Number(statusRoomMatch.room.heatDemand.toFixed(statusRoomMatch.room.heatDemand > 0 && statusRoomMatch.room.heatDemand < 10 ? 1 : 0)).toLocaleString('nb-NO')}%.`
            : 'Jeg har ikke heatDemand for rommet ennå.'

        return `${statusRoomMatch.room.name}: ${formatNivaTemperature(statusRoomMatch.room.temperature)} nå, settpunkt ${formatNivaTemperature(statusRoomMatch.room.targetTemperature)}. ${heatDemandText} ${activeZones.length > 0 ? `${activeZones.length} lyssoner er på.` : 'Ingen lys er registrert på.'}`
      }

      const asksRoomHeatDemand =
        normalizedText.includes('heatdemand') ||
        normalizedText.includes('varmebehov') ||
        normalizedText.includes('varmepådrag') ||
        normalizedText.includes('varmepadrag')

      if (asksRoomHeatDemand) {
        const heatRoomMatch = getNivaRoomMatch(normalizedText) ?? getSelectedNivaRoomCandidate()
        if (!heatRoomMatch) {
          return 'Velg eller nevn et rom, så kan jeg lese varmebehovet fra runtime-state.'
        }

        if (typeof heatRoomMatch.room.heatDemand !== 'number') {
          return `${heatRoomMatch.room.name} har ikke heatDemand-verdi i runtime-state ennå.`
        }

        return `${heatRoomMatch.room.name} viser ${Number(heatRoomMatch.room.heatDemand.toFixed(heatRoomMatch.room.heatDemand > 0 && heatRoomMatch.room.heatDemand < 10 ? 1 : 0)).toLocaleString('nb-NO')}% varmebehov.`
      }

      if (wantsRoomManager) {
        if (roomManagerTargetKey) {
          handleOpenRoomManager(roomManagerTargetKey)
          return `Jeg åpner Room Manager for ${
            systemConfigData.rooms.find((room) => room.key === roomManagerTargetKey)?.name ?? 'valgt rom'
          }.`
        }

        return 'Jeg finner ingen rom å åpne Room Manager for ennå.'
      }

      if (
        wantsTrendHistory &&
        (normalizedText.includes('vis') ||
          normalizedText.includes('åpne') ||
          normalizedText.includes('apne') ||
          normalizedText.includes('gå til') ||
          normalizedText.includes('ga til'))
      ) {
        const trendRoomMatch = getNivaRoomMatch(normalizedText) ?? getSelectedNivaRoomCandidate()
        const trendRoomKey = trendRoomMatch?.room.key

        if (trendRoomKey) {
          handleOpenTrendHistory(trendRoomKey)
          return `Jeg åpner trendhistorikk for ${trendRoomMatch.room.name}.`
        }

        return 'Velg et rom først, så kan jeg åpne trendhistorikken.'
      }

      if (proposedAction) {
        if (proposedAction.kind === 'climateSetpoint') {
          return `Jeg setter ${proposedAction.roomName} til ${formatNivaSetpoint(proposedAction.setpoint)} °C når du bekrefter.`
        }

        if (proposedAction.kind === 'roomLightsOff') {
          return `Jeg slår av lyset i ${proposedAction.roomName} når du bekrefter.`
        }

        if (proposedAction.kind === 'zoneLightsOff') {
          return `Jeg slår av ${proposedAction.zoneName} i ${proposedAction.roomName} når du bekrefter.`
        }

        if (proposedAction.kind === 'roomBrightness') {
          const zoneText =
            proposedAction.zoneNames.length === 1
              ? ` (${proposedAction.zoneNames[0]})`
              : proposedAction.zoneNames.length > 1
                ? ` (${proposedAction.zoneNames.length} soner)`
                : ''

          return `Jeg setter lyset i ${proposedAction.roomName}${zoneText} til ${proposedAction.brightness}% når du bekrefter.`
        }

        if (proposedAction.kind === 'mediaControl') {
          return `NIVA foreslår: ${proposedAction.summary}.`
        }

        if (proposedAction.kind === 'vacuumControl') {
          return vacuumLiveStatusConfirmed
            ? `NIVA foreslår: ${proposedAction.summary}. Dette sender en ekte kommando via Home Assistant hvis du bekrefter. Dock er tryggeste første test.`
            : `NIVA foreslår: ${proposedAction.summary}. Jeg kan forberede dette, men robotstatus er ikke fersk nok for trygg fysisk kommando akkurat nå.`
        }

        if (proposedAction.kind === 'calendar') {
          const events = getCalendarActionEvents(proposedAction)
          const eventSummary = events
            .map((event) => `${event.title} ${formatCalendarDateLabel(event.date)} kl. ${event.startTime}`)
            .join(' · ')
          const clarification = proposedAction.clarification ? ` ${proposedAction.clarification}` : ''

          return `Jeg kan opprette ${events.length === 1 ? 'denne aktiviteten' : `${events.length} aktiviteter`}: ${eventSummary}.${clarification} Svar “bekrefter” for å opprette.`
        }

        return 'Jeg har forberedt et forslag. Jeg utfører ingenting før du bekrefter.'
      }

      if (lightActionResult?.issue) {
        if (lightActionResult.pendingClarification) {
          setNivaPendingClarification(lightActionResult.pendingClarification)
        }

        return lightActionResult.issue
      }

      if (climateActionResult?.issue) {
        return climateActionResult.issue
      }

      if (isActionRequest && intent === 'scene' && normalizedText.includes('natt')) {
        return 'Jeg finner ingen aktiv Natt-scene ennå. Lag eller aktiver en natt-scene i Manager først, så kan jeg foreslå den trygt.'
      }

      if (intent === 'media' && mediaLibrary.length === 0) {
        return 'Jeg finner ingen lokale sanger ennå. Legg .mp3-filer i media/music for lokal avspilling.'
      }

      if (isActionRequest) {
        const responseGiven = t.niva.saferActionInfo
        markNivaIntentGap('unsafe-action-prep', responseGiven)
        return responseGiven
      }

      const asksForHouseStatus =
        normalizedText.includes('hvordan har huset') ||
        normalizedText.includes('huset det')
      const matchedRoom = asksForHouseStatus ? undefined : getNivaRoomMatch(normalizedText)
      const usesSelectedContext = hasSelectedRoomReference(normalizedText)
      const asksTemperatureTrendToday =
        (normalizedText.includes('temperaturen') || normalizedText.includes('temperatur')) &&
        (normalizedText.includes('vært') ||
          normalizedText.includes('vert') ||
          normalizedText.includes('i dag') ||
          normalizedText.includes('idag'))
      const asksForSystemTrouble =
        normalizedText.includes('er noe galt') ||
        normalizedText.includes('hva er galt') ||
        normalizedText.includes('fungerer systemet') ||
        normalizedText.includes('virker systemet') ||
        normalizedText.includes('hvorfor virker ikke') ||
        normalizedText.includes('hvorfor fungerer ikke') ||
        normalizedText.includes('ikke virker') ||
        normalizedText.includes('ikke fungerer')
      const asksForConfidence =
        normalizedText.includes('hvor sikker') ||
        normalizedText.includes('er du sikker') ||
        normalizedText.includes('kan jeg stole') ||
        normalizedText.includes('tillit') ||
        normalizedText.includes('confidence') ||
        normalizedText.includes('datakvalitet') ||
        normalizedText.includes('ferske signal') ||
        normalizedText.includes('live-signaler') ||
        normalizedText.includes('live signal')
      const asksForAssistants =
        normalizedText.includes('assistent') ||
        normalizedText.includes('roboten') ||
        normalizedText.includes('robot') ||
        normalizedText.includes('støvsuger') ||
        normalizedText.includes('stovsuger') ||
        normalizedText.includes('rengjøring') ||
        normalizedText.includes('rengjoring')
      const asksForEdge =
        normalizedText.includes('zigbee') ||
        normalizedText.includes('gateway') ||
        normalizedText.includes('edge') ||
        normalizedText.includes('integrasjon') ||
        normalizedText.includes('integrasjoner') ||
        normalizedText.includes('mqtt') ||
        normalizedText.includes('adapter')
      const asksForIntegrationSetup =
        normalizedText.includes('koble') ||
        normalizedText.includes('koblet') ||
        normalizedText.includes('mangler') ||
        normalizedText.includes('klar') ||
        normalizedText.includes('klare') ||
        normalizedText.includes('metode') ||
        normalizedText.includes('anbefal') ||
        normalizedText.includes('oppsett') ||
        normalizedText.includes('setup') ||
        normalizedText.includes('google home') ||
        normalizedText.includes('cast') ||
        normalizedText.includes('sonos') ||
        normalizedText.includes('weather api') ||
        normalizedText.includes('vær api') ||
        normalizedText.includes('vaer api')
      const asksForIntegrationSetupSubject =
        asksForEdge ||
        asksForAssistants ||
        normalizedText.includes('metode') ||
        normalizedText.includes('anbefal') ||
        normalizedText.includes('google home') ||
        normalizedText.includes('cast') ||
        normalizedText.includes('sonos') ||
        normalizedText.includes('weather api') ||
        normalizedText.includes('vær api') ||
        normalizedText.includes('vaer api')
      const asksForHardware =
        normalizedText.includes('maskinvare') ||
        normalizedText.includes('hardware') ||
        normalizedText.includes('infrastruktur') ||
        normalizedText.includes('topologi') ||
        normalizedText.includes('hva kjører lynell på') ||
        normalizedText.includes('hva kjorer lynell pa') ||
        normalizedText.includes('hvilken maskinvare') ||
        normalizedText.includes('hva mangler i infrastrukturen') ||
        normalizedText.includes('kritisk for systemet') ||
        normalizedText.includes('lynell core') ||
        normalizedText.includes('knx interface') ||
        normalizedText.includes('knx ip') ||
        normalizedText.includes('bridge server') ||
        normalizedText.includes('access point') ||
        normalizedText.includes('nas')
      const asksForRuntimeOrigin =
        normalizedText.includes('hva er ekte koblet') ||
        normalizedText.includes('hva er ekte') ||
        normalizedText.includes('hva fungerer nå') ||
        normalizedText.includes('hva fungerer na') ||
        normalizedText.includes('hva fungerer') ||
        normalizedText.includes('ekte koblet') ||
        normalizedText.includes('hva er simulert') ||
        normalizedText.includes('simulert') ||
        normalizedText.includes('mock') ||
        normalizedText.includes('live runtime') ||
        normalizedText.includes('bruker live runtime') ||
        normalizedText.includes('hva bruker live') ||
        normalizedText.includes('state kommer fra') ||
        normalizedText.includes('state origin') ||
        normalizedText.includes('hvor kommer state') ||
        normalizedText.includes('siste kjente state') ||
        normalizedText.includes('fallback') ||
        normalizedText.includes('hybrid') ||
        normalizedText.includes('mixed runtime') ||
        normalizedText.includes('blandet runtime')
      const asksForMqttRuntime =
        normalizedText.includes('er mqtt koblet') ||
        normalizedText.includes('mqtt koblet') ||
        normalizedText.includes('mqtt runtime') ||
        normalizedText.includes('live mqtt') ||
        normalizedText.includes('edge-runtime') ||
        normalizedText.includes('status på edge-runtime') ||
        normalizedText.includes('status pa edge-runtime') ||
        normalizedText.includes('kommer det ekte data') ||
        normalizedText.includes('kommer det live data') ||
        normalizedText.includes('har zigbee live runtime')
      const asksForZigbeeRuntime =
        normalizedText.includes('zigbee2mqtt') ||
        normalizedText.includes('zigbee runtime') ||
        normalizedText.includes('zigbee-runtime') ||
        normalizedText.includes('hvordan blir zigbee') ||
        normalizedText.includes('hva mangler for zigbee') ||
        normalizedText.includes('sonoff') ||
        normalizedText.includes('dongle') ||
        normalizedText.includes('koordinator') ||
        normalizedText.includes('coordinator') ||
        normalizedText.includes('hva brukes sonoff') ||
        normalizedText.includes('bruker lynell lokal zigbee') ||
        normalizedText.includes('lokal zigbee-runtime') ||
        normalizedText.includes('hva er mqtt i lynell') ||
        (normalizedText.includes('zigbee') && normalizedText.includes('mqtt'))
      const asksForSensorHealth =
        normalizedText.includes('sensorer stille') ||
        normalizedText.includes('sensor stille') ||
        normalizedText.includes('sensorer offline') ||
        normalizedText.includes('sensor offline') ||
        normalizedText.includes('sensorer utilgjengelig') ||
        normalizedText.includes('manglende rapportering')
      const asksForEnvironment =
        normalizedText.includes('luftkvalitet') ||
        normalizedText.includes('lufta') ||
        normalizedText.includes('luften') ||
        normalizedText.includes('miljø') ||
        normalizedText.includes('miljo') ||
        normalizedText.includes('romfølelse') ||
        normalizedText.includes('romfolelse') ||
        normalizedText.includes('aktivitet hjemme') ||
        normalizedText.includes('aktivitet i huset') ||
        normalizedText.includes('hvordan virker huset') ||
        (normalizedText.includes('hvordan er') && normalizedText.includes('miljø'))
      const asksForComfort =
        normalizedText.includes('komfort') ||
        normalizedText.includes('inneklima') ||
        normalizedText.includes('varme opp') ||
        normalizedText.includes('tungt å varme') ||
        normalizedText.includes('tungt a varme') ||
        normalizedText.includes('energibruk') ||
        normalizedText.includes('energi') ||
        normalizedText.includes('hvilke rom bruker mest varme') ||
        normalizedText.includes('mest varme') ||
        normalizedText.includes('rom kalde') ||
        normalizedText.includes('noen rom kalde') ||
        normalizedText.includes('hobbydelen an') ||
        normalizedText.includes('hobbydel')
      const asksForAdaptiveAwareness =
        normalizedText.includes('annerledes') ||
        normalizedText.includes('endret seg') ||
        normalizedText.includes('endra seg') ||
        normalizedText.includes('mindre stabil') ||
        normalizedText.includes('mindre stabile') ||
        normalizedText.includes('sammenlignet med tidligere') ||
        normalizedText.includes('sammenliknet med tidligere') ||
        normalizedText.includes('mot normalen') ||
        normalizedText.includes('enn normalt') ||
        normalizedText.includes('enn vanlig') ||
        normalizedText.includes('varmebehovet annerledes') ||
        normalizedText.includes('rytmen sammenlignet') ||
        normalizedText.includes('rytmen sammenliknet') ||
        normalizedText.includes('virker huset annerledes')
      const asksForMood =
        normalizedText.includes('føles huset') ||
        normalizedText.includes('foles huset') ||
        normalizedText.includes('stemning') ||
        normalizedText.includes('atmosfære') ||
        normalizedText.includes('atmosfare') ||
        normalizedText.includes('ambience') ||
        normalizedText.includes('atmosfæren') ||
        normalizedText.includes('atmosfaren') ||
        normalizedText.includes('er huset rolig') ||
        normalizedText.includes('huset rolig') ||
        normalizedText.includes('hvordan virker kvelden') ||
        normalizedText.includes('kvelden hjemme')
      const asksForRecommendations =
        normalizedText.includes('anbefaling') ||
        normalizedText.includes('anbefalinger') ||
        normalizedText.includes('hva bør jeg følge') ||
        normalizedText.includes('hva bor jeg folge') ||
        normalizedText.includes('følge med på') ||
        normalizedText.includes('folge med pa') ||
        normalizedText.includes('hva foreslår') ||
        normalizedText.includes('hva foreslar') ||
        normalizedText.includes('noe jeg bør gjøre') ||
        normalizedText.includes('noe jeg bor gjore')
      const asksForServerInsights =
        normalizedText.includes('innsikt') ||
        normalizedText.includes('innsikter') ||
        normalizedText.includes('observasjon') ||
        normalizedText.includes('observasjoner') ||
        normalizedText.includes('mønster') ||
        normalizedText.includes('monster') ||
        normalizedText.includes('hva ser du') ||
        normalizedText.includes('noe du ser') ||
        normalizedText.includes('server-history')
      const asksForSpatial =
        normalizedText.includes('hvor er det mest aktivitet') ||
        normalizedText.includes('hvordan brukes huset nå') ||
        normalizedText.includes('hvordan brukes huset na') ||
        normalizedText.includes('hvordan brukes huset') ||
        normalizedText.includes('hvordan er flyten') ||
        normalizedText.includes('flyten hjemme') ||
        normalizedText.includes('hvilke områder virker aktive') ||
        normalizedText.includes('hvilke omrader virker aktive') ||
        normalizedText.includes('aktive områder') ||
        normalizedText.includes('aktive omrader') ||
        normalizedText.includes('hvilke deler') ||
        normalizedText.includes('fordeler aktiviteten') ||
        normalizedText.includes('aktiviteten seg') ||
        normalizedText.includes('henger sammen') ||
        normalizedText.includes('nærliggende') ||
        normalizedText.includes('naerliggende') ||
        normalizedText.includes('nær ') ||
        normalizedText.includes('naer ') ||
        normalizedText.includes('hvor jobber støvsugeren') ||
        normalizedText.includes('hvor jobber stovsugeren') ||
        normalizedText.includes('hvor jobber roboten') ||
        normalizedText.includes('hvilke rom henger')
      const asksForMemory =
        normalizedText.includes('house memory') ||
        normalizedText.includes('hukommelse') ||
        normalizedText.includes('husker') ||
        normalizedText.includes('denne uken') ||
        normalizedText.includes('siste dager') ||
        normalizedText.includes('siste dagene') ||
        normalizedText.includes('over tid') ||
        normalizedText.includes('langsiktig') ||
        normalizedText.includes('hvordan har huset vært') ||
        normalizedText.includes('hvordan har huset vert') ||
        normalizedText.includes('har noe endret') ||
        normalizedText.includes('har noe endra') ||
        normalizedText.includes('huset vært mye aktiv') ||
        normalizedText.includes('huset vert mye aktiv') ||
        normalizedText.includes('hvordan virker huset over tid') ||
        normalizedText.includes('hvordan har rytmen vært') ||
        normalizedText.includes('hvordan har rytmen vert')
      const asksContextualFollowUp = isNivaContextualFollowUp(normalizedText)

      if (asksContextualFollowUp && !isActionRequest) {
        if (nivaSessionMemory.activeContextFocus === 'room' && nivaSessionMemory.lastRoomFocus) {
          return `${nivaSessionMemory.lastRoomFocus} er fortsatt konteksten. Jeg ville fulgt med på komfort, lys og ferske signaler der først.`
        }

        if (nivaSessionMemory.activeContextFocus === 'media') {
          return getNivaMediaOutputStatusAnswer()
        }

        if (nivaSessionMemory.lastProposedAction) {
          return `Det tydeligste nå er forslaget som ligger klart: ${nivaSessionMemory.lastProposedAction}. Jeg gjør ingenting uten bekreftelse.`
        }

        if (nivaSessionMemory.lastRuntimeSummary) {
          return [
            nivaPresenceComfort.followUpLine ?? nivaPresenceComfort.homeLine,
            getNivaRecommendationAnswer(),
          ]
            .filter(Boolean)
            .join(' ')
        }

        return getNivaRecommendationAnswer()
      }

      if (asksForSystemTrouble) {
        return nivaDiagnosticInsight.response
      }

      if (asksForConfidence) {
        return getNivaConfidenceAnswer()
      }

      if (asksForRecommendations && !isActionRequest) {
        return getNivaRecommendationAnswer()
      }

      if (asksForServerInsights && !isActionRequest) {
        return getNivaServerInsightAnswer()
      }

      if (asksForHardware && !isActionRequest) {
        return getNivaHardwareAnswer(normalizedText)
      }

      if (asksForRuntimeOrigin && !isActionRequest) {
        return getNivaRuntimeOriginAnswer(normalizedText)
      }

      if (asksForMqttRuntime && !isActionRequest) {
        return getNivaMqttRuntimeAnswer(normalizedText)
      }

      if (asksForZigbeeRuntime && !isActionRequest) {
        return getNivaZigbee2MqttAnswer(normalizedText)
      }

      if (asksForAdaptiveAwareness && !isActionRequest) {
        return getNivaAdaptiveAwarenessAnswer(normalizedText)
      }

      if (asksForMood && !isActionRequest) {
        return getNivaHouseFeelingAnswer(matchedRoom ?? (usesSelectedContext ? getSelectedNivaRoomCandidate() : undefined))
      }

      if (asksForMemory && !isActionRequest) {
        return getNivaHouseMemoryAnswer(normalizedText, matchedRoom?.room.key)
      }

      if (asksForSpatial && !isActionRequest) {
        return getNivaSpatialAnswer(normalizedText, matchedRoom)
      }

      if (asksForIntegrationSetup && asksForIntegrationSetupSubject && !isActionRequest) {
        return getNivaIntegrationSetupAnswer(normalizedText)
      }

      if (asksForAssistants && !isActionRequest) {
        return getNivaAssistantStatusAnswer()
      }

      if (asksForSensorHealth && !isActionRequest) {
        return getNivaSensorHealthAnswer()
      }

      if (asksForComfort && !isActionRequest) {
        return getNivaComfortAnswer(normalizedText, matchedRoom ?? (usesSelectedContext ? getSelectedNivaRoomCandidate() : undefined))
      }

      if (asksForEnvironment && !isActionRequest) {
        return getNivaEnvironmentalAnswer(matchedRoom ?? (usesSelectedContext ? getSelectedNivaRoomCandidate() : undefined))
      }

      if (asksForEdge && !isActionRequest) {
        return getNivaEdgeStatusAnswer(normalizedText)
      }

      if (
        normalizedText.includes('hvordan brukes huset') ||
        normalizedText.includes('rytmen hjemme') ||
        normalizedText.includes('husets rytme') ||
        normalizedText.includes('hvordan er rytmen')
      ) {
        return getNivaHouseRhythmAnswer()
      }

      if (
        normalizedText.includes('hvilke rom er mest aktive') ||
        normalizedText.includes('mest aktive rom') ||
        normalizedText.includes('rom er aktive')
      ) {
        return getNivaMostActiveRoomsAnswer()
      }

      if (
        normalizedText.includes('vanligvis på kvelden') ||
        normalizedText.includes('vanligvis pa kvelden') ||
        normalizedText.includes('skjer på kvelden') ||
        normalizedText.includes('skjer pa kvelden')
      ) {
        return getNivaEveningRhythmAnswer()
      }

      if (
        normalizedText.includes('aktivt i dag') ||
        normalizedText.includes('aktiv i dag') ||
        normalizedText.includes('vært aktivt') ||
        normalizedText.includes('vert aktivt')
      ) {
        return getNivaActiveTodayAnswer()
      }

      if (asksForHouseStatus) {
        return getNivaHouseStatusAnswer()
      }

      if (usesSelectedContext && !matchedRoom) {
        return 'Velg et rom først, så kan jeg vurdere det.'
      }

      if (normalizedText.includes('hva skjedde sist') || normalizedText.includes('siste hendelse')) {
        return getNivaLatestEventAnswer()
      }

      if (asksTemperatureTrendToday) {
        const trendRoomMatch = matchedRoom ?? getSelectedNivaRoomCandidate()

        if (!trendRoomMatch) {
          return 'Velg et rom først, så kan jeg se på temperaturhistorikken.'
        }

        return getNivaRoomHistoryAnswer(trendRoomMatch, 'temperature')
      }

      if (
        intent === 'media' ||
        normalizedText.includes('spiller nå') ||
        normalizedText.includes('høyttaler') ||
        normalizedText.includes('hoyttaler') ||
        normalizedText.includes('høyttalere') ||
        normalizedText.includes('hoyttalere') ||
        normalizedText.includes('output') ||
        normalizedText.includes('flytt musikken') ||
        normalizedText.includes('flytte musikken') ||
        normalizedText.includes('google home') ||
        normalizedText.includes('cast') ||
        normalizedText.includes('caste') ||
        normalizedText.includes('chromecast') ||
        normalizedText.includes('tv-en') ||
        normalizedText.includes('tv en')
      ) {
        if (
          normalizedText.includes('finner du google home') ||
          normalizedText.includes('google home') ||
          normalizedText.includes('cast') ||
          normalizedText.includes('caste') ||
          normalizedText.includes('chromecast') ||
          normalizedText.includes('tv-en') ||
          normalizedText.includes('tv en')
        ) {
          return getNivaCastDiscoveryAnswer()
        }

        if (
          normalizedText.includes('hvilke høyttalere') ||
          normalizedText.includes('hvilke hoyttalere') ||
          normalizedText.includes('hvilke outputs') ||
          normalizedText.includes('hvilke enheter') ||
          normalizedText.includes('høyttalere finnes') ||
          normalizedText.includes('hoyttalere finnes')
        ) {
          return getNivaMediaOutputsAnswer()
        }

        if (
          normalizedText.includes('hva spiller') ||
          normalizedText.includes('spiller nå') ||
          normalizedText.includes('hvor spiller') ||
          normalizedText.includes('hvilken output')
        ) {
          return getNivaMediaOutputStatusAnswer()
        }

        if (normalizedText.includes('stille') || normalizedText.includes('aktivt')) {
          if (mediaPlayer.isPlaying && currentMediaTrack) {
            return `${currentMediaTrack.title} spiller på ${activeMediaDevice?.name ?? 'valgt output'}. Huset føles aktivt, men balansert.`
          }

          return 'Media er stille akkurat nå. Ingen musikk spiller.'
        }

        return currentMediaTrack
          ? `Lynell Media har ${currentMediaTrack.title} klar på ${activeMediaDevice?.name ?? 'valgt output'}.`
          : 'Lynell Media er klar, men biblioteket har ingen valgt sang ennå.'
      }

      if (intent === 'vacuum') {
        return primaryVacuumDevice
          ? getNivaAssistantStatusAnswer(normalizedText)
          : 'Jeg finner ingen robotstøvsuger i Lynell ennå.'
      }

      if (
        normalizedText.includes('hvilke rom') &&
        (normalizedText.includes('følge med') ||
          normalizedText.includes('folge med') ||
          normalizedText.includes('sjekk'))
      ) {
        return getNivaRoomsToWatchAnswer()
      }

      if (
        normalizedText.includes('høyt varmebehov') ||
        normalizedText.includes('hoyt varmebehov') ||
        normalizedText.includes('over normalt behov')
      ) {
        return getNivaHighHeatNeedAnswer()
      }

      if (matchedRoom && normalizedText.includes('varmebehov')) {
        return getNivaRoomHeatNeedAnswer(matchedRoom)
      }

      if (
        matchedRoom &&
        (normalizedText.includes('hva bør') ||
          normalizedText.includes('hva bor') ||
          normalizedText.includes('hva kan jeg gjøre') ||
          normalizedText.includes('hva kan jeg gjore') ||
          normalizedText.includes('forbedre') ||
          normalizedText.includes('redusere varmebehov'))
      ) {
        return getNivaRoomRecommendationAnswer(matchedRoom)
      }

      if (
        matchedRoom &&
        (normalizedText.includes('rapport') ||
          normalizedText.includes('ligger') ||
          normalizedText.includes('ligg') ||
          normalizedText.includes('oppsummer'))
      ) {
        return getNivaRoomReportAnswer(matchedRoom)
      }

      if (
        matchedRoom &&
        (normalizedText.includes('hvorfor') && normalizedText.includes('varm') ||
          usesSelectedContext && normalizedText.includes('varmer'))
      ) {
        const heatNeedAnalysis = getRoomHeatNeedAnalysis(
          matchedRoom.config,
          getHistoryPoints(matchedRoom.room.key, 'heatDemand'),
          matchedRoom.room.temperature,
          matchedRoom.room.targetTemperature,
        )

        if (heatNeedAnalysis.status === 'over') {
          return `${getNivaRoomHeatingExplanation(matchedRoom)} ${heatNeedAnalysis.detail}`
        }

        return getNivaRoomHeatingExplanation(matchedRoom)
      }

      if (
        matchedRoom &&
        (normalizedText.includes('vært') ||
          normalizedText.includes('historikk') ||
          normalizedText.includes('utviklet'))
      ) {
        if (normalizedText.includes('lys')) {
          return getNivaRoomHistoryAnswer(matchedRoom, 'brightness')
        }

        if (normalizedText.includes('varme')) {
          return getNivaRoomHistoryAnswer(matchedRoom, 'heatDemand')
        }

        return getNivaRoomHistoryAnswer(matchedRoom, 'temperature')
      }

      if (matchedRoom && (normalizedText.includes('lys') || usesSelectedContext && normalizedText.includes('lyset'))) {
        return getNivaRoomLightAnswer(matchedRoom)
      }

      if (
        matchedRoom &&
        (normalizedText.includes('temperatur') ||
          normalizedText.includes('varmt') ||
          normalizedText.includes('kaldt') ||
          normalizedText.includes('varm') ||
          normalizedText.includes('kald'))
      ) {
        if (normalizedText.includes('varmt') || normalizedText.includes('kaldt')) {
          return getNivaRoomWarmthAnswer(matchedRoom)
        }

        return getNivaRoomTemperatureAnswer(matchedRoom)
      }

      if (
        matchedRoom &&
        (normalizedText.includes('hvordan') || usesSelectedContext && normalizedText.includes('her'))
      ) {
        return getNivaRoomStatusAnswer(matchedRoom)
      }

      if (
        normalizedText.includes('temperaturen ute') ||
        normalizedText.includes('temp ute') ||
        normalizedText.includes('været') ||
        normalizedText.includes('vær') ||
        normalizedText.includes('ute') ||
        normalizedText.includes('regn') ||
        normalizedText.includes('nedbør') ||
        normalizedText.includes('blåse') ||
        normalizedText.includes('vind')
      ) {
        return getNivaWeatherAnswer(normalizedText)
      }

      if (normalizedText.includes('temperaturen inne') || normalizedText.includes('inne')) {
        if (nivaHouseSnapshot.roomsWithTemperature.length === 0) {
          return 'Jeg har ikke siste-kjente temperatur fra rommene ennå.'
        }

        const roomText = nivaHouseSnapshot.roomsWithTemperature
          .slice(0, 3)
          .map((room) => `${room.name} viser ${room.temperature}°C`)
          .join(', ')
        const missingText =
          nivaHouseSnapshot.roomsWithTemperature.length < climateRooms.length
            ? ' Jeg mangler fortsatt temperatur fra noen rom.'
            : ''
        return `${roomText}.${missingText}`
      }

      if (
        normalizedText.includes('føles huset') ||
        normalizedText.includes('foles huset') ||
        normalizedText.includes('stemning') ||
        normalizedText.includes('atmosfære') ||
        normalizedText.includes('atmosfare') ||
        normalizedText.includes('er huset rolig') ||
        normalizedText.includes('huset rolig') ||
        normalizedText.includes('hvordan virker kvelden') ||
        normalizedText.includes('kvelden hjemme')
      ) {
        return getNivaHouseFeelingAnswer(matchedRoom ?? (usesSelectedContext ? getSelectedNivaRoomCandidate() : undefined))
      }

      if (
        normalizedText.includes('hva skjer hjemme') ||
        normalizedText.includes('hva skjer i huset')
      ) {
        return getNivaHomeActivityAnswer()
      }

      if (normalizedText.includes('lys')) {
        if (nivaHouseSnapshot.activeLightZones.length === 0) {
          return 'Ingen lys er registrert på akkurat nå.'
        }

        const activeZones = nivaHouseSnapshot.activeLightZones
          .map((zone) => `${zone.roomName} / ${zone.zoneName}`)
          .slice(0, 4)
        return `${nivaHouseSnapshot.activeLightZones.length} lyssoner er registrert på${
          activeZones.length > 0 ? `: ${activeZones.join(', ')}.` : '.'
        }`
      }

      if (normalizedText.includes('i dag') || normalizedText.includes('hva skjer')) {
        if (todayActivities.length === 0) {
          return 'Det er ingen aktiviteter i kalenderen i dag.'
        }

        return `Neste aktivitet i dag er ${formatCalendarEventLine(todayActivities[0])}.`
      }

      if (normalizedText.includes('i morgen')) {
        if (tomorrowActivities.length === 0) {
          return 'Det er ingen aktiviteter i kalenderen i morgen.'
        }

        return `Første aktivitet i morgen er ${formatCalendarEventLine(tomorrowActivities[0])}.`
      }

      if (normalizedText.includes('modus')) {
        return `Huset er i ${homeStatus}-modus. Systemet kjører ${runtimeModeLabel}.`
      }

      if (normalizedText.includes('bridge') || normalizedText.includes('tilkoblet')) {
        return nivaDiagnosticInsight.response
      }

      if (
        normalizedText.includes('scene') &&
        (normalizedText.includes('kjøre') ||
          normalizedText.includes('kjørte') ||
          normalizedText.includes('kjorte') ||
          normalizedText.includes('planlagt') ||
          normalizedText.includes('scheduler') ||
          normalizedText.includes('kl.'))
      ) {
        return returnNivaExplanation(getNivaSceneSchedulerAnswer())
      }

      if (normalizedText.includes('scener') || normalizedText.includes('stemninger')) {
        if (
          normalizedText.includes('kjøre') ||
          normalizedText.includes('kjørte') ||
          normalizedText.includes('kjorte') ||
          normalizedText.includes('kl.') ||
          normalizedText.includes('planlagt') ||
          normalizedText.includes('scheduler')
        ) {
          return returnNivaExplanation(getNivaSceneSchedulerAnswer())
        }

        if (homeModeScenes.length === 0) {
          return 'Jeg finner ingen aktive stemningsscener ennå.'
        }

        return `Tilgjengelige stemninger er ${homeModeScenes.map((scene) => scene.name).join(', ')}.`
      }

      if (intent === 'calendar' && homeCalendarPrimaryEvent) {
        return `Neste aktivitet er ${formatCalendarEventLine(homeCalendarPrimaryEvent)}.`
      }

      const fallbackResponse =
        intent === 'unknown'
          ? t.niva.unknown
          : getNivaResponseForIntent(intent)
      markNivaIntentGap(
        getNivaIntentGapCategory(intent, isActionRequest),
        fallbackResponse,
        intent === 'unknown'
          ? getNivaIntentGapNote('unknown-intent')
          : getNivaIntentGapNote('weak-fallback'),
      )
      return fallbackResponse
    }
    const responseText = softenNivaFamilyText(prepareNivaRuntimeText(answerQuestion()))
    const userMessage: NivaMessage = {
      id: `niva-user-${now}`,
      timestamp: now,
      role: 'user',
      text,
      type: intent === 'unknown' ? 'command' : 'command',
      status: 'pending',
      intent,
    }
    const nivaResponse: NivaMessage = {
      id: `niva-response-${now}`,
      timestamp: now + 1,
      role: 'niva',
      text: responseText,
      type: 'response',
      status: proposedAction ? 'pending' : 'acknowledged',
      intent,
      proposedAction,
    }

    const latestIntentGapDraft = intentGapDrafts[0]

    if (proposedAction?.kind === 'calendar') {
      updateCalendarActionRecord(proposedAction, 'pendingConfirmation', {
        proposedAt: new Date(now).toISOString(),
      })
    }

    if (latestIntentGapDraft) {
      const intentGap = createNivaIntentGap({
        timestamp: now,
        userText: text,
        activeView: activeMainView,
        runtimeMode: systemMode,
        suggestedCategory: latestIntentGapDraft.suggestedCategory,
        responseGiven: latestIntentGapDraft.responseGiven,
        note: latestIntentGapDraft.note,
      })

      setNivaIntentGaps((currentGaps) => [intentGap, ...currentGaps].slice(0, 25))
    }

    const memoryRoomMatch = getContextualNivaRoomMatch(normalizedText)
    const clarificationText =
      !proposedAction && (lightActionResult?.issue ?? climateActionResult?.issue)
        ? lightActionResult?.issue ?? climateActionResult?.issue ?? null
        : null
    const intentConfidence: NivaIntentConfidence = proposedAction
      ? 'understood'
      : clarificationText
        ? 'partial'
        : latestIntentGapDraft || intent === 'unknown'
          ? 'uncertain'
          : 'understood'

    recordNivaInteractionParse({
      text,
      intent,
      confidence: intentConfidence,
      roomName: memoryRoomMatch?.room.name ?? null,
      proposedAction,
      clarification: clarificationText,
      fallbackUsed: Boolean(latestIntentGapDraft),
      roomAliasMatched: Boolean(memoryRoomMatch),
    })

    if (proposedAction) {
      setNivaPendingClarification(null)
    }

    const memoryRoomFocus =
      memoryRoomMatch?.room.name ??
      (activeMainView === 'rooms' ? selectedFocusRoom?.name ?? null : null)
    const memoryMediaFocus =
      intent === 'media' ? activeMediaDevice?.name ?? currentMediaTrack?.title ?? 'Media' : null
    const memorySystemFocus =
      normalizedText.includes('komfort') || normalizedText.includes('inneklima')
        ? `comfort: ${nivaPresenceComfort.label}`
        : intent === 'system' || normalizedText.includes('huset') || normalizedText.includes('runtime')
          ? `home atmosphere: ${nivaPresenceComfort.label}`
        : null

    setNivaSessionMemory((currentMemory) =>
      updateNivaSessionMemory(currentMemory, {
        timestamp: now,
        userText: text,
        intent,
        activeView: activeMainView,
        runtimeMode: systemMode,
        responseGiven: responseText,
        roomFocus: memoryRoomFocus,
        mediaFocus: memoryMediaFocus,
        systemFocus: memorySystemFocus,
        proposedAction,
      }),
    )

    recordNivaConversation({
      role: 'user',
      message: text,
      intent,
      category: isActionRequest ? 'action-request' : 'question',
      responseStatus: 'received',
      actionProposal: proposedAction,
    })
    recordNivaConversation({
      role: 'niva',
      message: responseText,
      intent,
      category: proposedAction ? 'proposal' : 'response',
      responseStatus: proposedAction ? 'pendingConfirmation' : 'acknowledged',
      actionProposal: proposedAction,
      confidence: proposedAction && 'confidence' in proposedAction ? proposedAction.confidence ?? null : null,
    })

    setNivaMessages((currentMessages) => [...currentMessages, userMessage, nivaResponse])
    setNivaInput('')
  }

  const handleSendNivaMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    handleSendNivaText(nivaInput)
  }

  const addNivaCalendarEvent = (event: CalendarEventConfig) => {
    const applyEvent = (currentConfig: SystemConfig): SystemConfig => ({
      ...currentConfig,
      calendar: {
        ...currentConfig.calendar,
        events: currentConfig.calendar.events.some((currentEvent) => currentEvent.id === event.id)
          ? currentConfig.calendar.events
          : [...currentConfig.calendar.events, event],
      },
    })

    setSavedSystemConfigData((currentConfig) => {
      const nextConfig = applyEvent(currentConfig)

      try {
        const savedAt = persistSystemConfig(nextConfig)
        setLastLocalConfigSaveAt(savedAt)
        setManagerMessage(`Kalender oppdatert lokalt ${getFormattedStorageTime(savedAt) ?? ''}`.trim())
        void saveServerSystemConfig({
          systemConfig: nextConfig,
          uiCapabilityConfig,
          conversationLogging: { enabled: conversationLoggingEnabled },
          autoPollQuietSignals: autoPollQuietSignalsConfig,
        })
          .then((snapshot) => {
            setServerConfigDiagnostics(snapshot.diagnostics)
            setSystemConfigSource('server')
            setManagerMessage(
              `Kalender oppdatert på server ${getFormattedStorageTime(snapshot.diagnostics.lastConfigSaveAt ?? savedAt) ?? ''}`.trim(),
            )
          })
          .catch((error) => {
            console.warn('[Lynell] Kunne ikke lagre NIVA-kalenderhendelse på server.', error)
            setSystemConfigSource('localFallback')
          })
      } catch (error) {
        console.warn('[Lynell] Kunne ikke lagre NIVA-kalenderhendelse lokalt.', error)
      }

      savedSystemConfigDataRef.current = nextConfig
      return nextConfig
    })
    setSystemConfigData((currentConfig) => applyEvent(currentConfig))
  }

  const waitForNivaActionObservation = async (
    action: NivaProposedAction,
    timeoutMs = 4000,
  ) => {
    const startedAt = Date.now()
    const isObserved = () => {
      if (action.kind === 'climateSetpoint') {
        const room = roomsRef.current.find((currentRoom) => currentRoom.key === action.roomKey)
        return room ? Math.abs(room.targetTemperature - action.setpoint) < 0.05 : false
      }

      if (action.kind === 'roomMode') {
        const room = roomsRef.current.find((currentRoom) => currentRoom.key === action.roomKey)
        return room?.mode === action.mode
      }

      if (action.kind === 'roomLightsOff') {
        const room = roomsRef.current.find((currentRoom) => currentRoom.key === action.roomKey)
        return room ? room.zones.every((zone) => !zone.lightsOn) : false
      }

      if (action.kind === 'zoneLightsOff') {
        const room = roomsRef.current.find((currentRoom) => currentRoom.key === action.roomKey)
        const zone = room?.zones.find((currentZone) => currentZone.key === action.zoneKey)
        return zone ? !zone.lightsOn : false
      }

      if (action.kind === 'roomBrightness') {
        const room = roomsRef.current.find((currentRoom) => currentRoom.key === action.roomKey)
        return room
          ? action.zoneKeys.every((zoneKey) => {
              const zone = room.zones.find((currentZone) => currentZone.key === zoneKey)
              return zone ? Math.abs(zone.brightness - action.brightness) <= 1 : false
            })
          : false
      }

      if (action.kind === 'lightsOff') {
        return roomsRef.current.every((room) => room.zones.every((zone) => !zone.lightsOn))
      }

      if (action.kind === 'scene') {
        return lastSceneActivation?.sceneId === action.sceneId
      }

      if (action.kind === 'calendar') {
        const events = getCalendarActionEvents(action)

        return events.every((expectedEvent) =>
          savedSystemConfigDataRef.current.calendar.events.some((event) => event.id === expectedEvent.id),
        )
      }

      if (action.kind === 'mediaControl') {
        return true
      }

      if (action.kind === 'vacuumControl') {
        return true
      }

      return false
    }

    while (Date.now() - startedAt < timeoutMs) {
      if (isObserved()) {
        return true
      }

      await new Promise((resolve) => window.setTimeout(resolve, 250))
    }

    return isObserved()
  }

  const getNivaObservedConfirmationText = (action: NivaProposedAction) => {
    if (action.kind === 'climateSetpoint') {
      return `${action.roomName} er nå satt til ${formatNivaSetpoint(action.setpoint)} °C.`
    }

    if (action.kind === 'roomLightsOff') {
      return `Lyset i ${action.roomName} er slått av.`
    }

    if (action.kind === 'zoneLightsOff') {
      return `${action.zoneName} i ${action.roomName} er slått av.`
    }

    if (action.kind === 'roomBrightness') {
      return `Lyset i ${action.roomName} er satt til ${action.brightness}%.`
    }

    if (action.kind === 'roomMode') {
      return `${action.roomName} er nå i ${action.mode.toLowerCase()}modus.`
    }

    if (action.kind === 'lightsOff') {
      return 'Lyssonene som var på er nå slått av.'
    }

    if (action.kind === 'scene') {
      return `${action.sceneName} er aktivert.`
    }

    if (action.kind === 'mediaControl') {
      if (action.action === 'pause') {
        return 'Musikken er satt på pause.'
      }

      if (action.action === 'device') {
        const device = mediaDevices.find((candidate) => candidate.deviceId === action.deviceId)
        const locationText = device?.roomName ? ` i ${device.roomName}` : ''
        const foundationText = device?.availability === 'foundation'
          ? ' Routing er satt i foundation; ekte ekstern casting kommer senere.'
          : ''

        return `Media er rutet til ${action.deviceName ?? 'valgt output'}${locationText}.${foundationText}`
      }

      const actionTrack = getTrackById(mediaLibrary, action.trackId ?? mediaPlayer.currentTrackId)

      return actionTrack
        ? `${actionTrack.title} spiller i Lynell Media.`
        : 'Lynell Media er startet.'
    }

    if (action.kind === 'vacuumControl') {
      const device = vacuumDevices.find((candidate) => candidate.deviceId === action.deviceId)
      if (vacuumLiveStatusConfirmed) {
        const actionText =
          action.action === 'dock'
            ? 'sendt til lading'
            : action.action === 'pause'
              ? 'pauset'
              : action.action === 'stop'
                ? 'stoppet'
                : 'startet'
        return `${device?.model ?? 'Robotstøvsugeren'} er ${actionText} via Home Assistant.`
      }

      return `${device?.model ?? 'Robotstøvsugeren'} er oppdatert i foundation-runtime. Robotintegrasjonen er fortsatt ikke koblet til ekte API.`
    }

    if (action.kind === 'calendar') {
      const events = getCalendarActionEvents(action)

      if (events.length === 1) {
        const event = events[0]

        return `Opprettet: ${event.title} ${formatCalendarDateLabel(event.date)} kl. ${event.startTime}.`
      }

      return `Opprettet ${events.length} kalenderaktiviteter: ${events
        .map((event) => `${event.title} ${formatCalendarDateLabel(event.date)} kl. ${event.startTime}`)
        .join(' · ')}.`
    }

    return 'Handlingen er fullført.'
  }

  const getNivaWaitingForConfirmationText = (action: NivaProposedAction) => {
    if (action.kind === 'calendar') {
      return 'Jeg forsøkte å opprette kalenderaktiviteten, men kalenderlisten bekreftet den ikke ennå. Konteksten er beholdt; du kan prøve igjen.'
    }

    if (action.kind === 'mediaControl') {
      return mediaLibrarySource === 'local'
        ? 'Jeg startet lokal avspilling i nettleseren.'
        : 'Jeg oppdaterte lokal media-runtime.'
    }

    if (action.kind === 'vacuumControl') {
      return 'Jeg oppdaterte lokal foundation-runtime.'
    }

    return 'Endringen er sendt. Jeg viser sist kjente status til systemet bekrefter.'
  }

  const executeNivaProposedAction = async (message: NivaMessage) => {
    const action = message.proposedAction

    if (!action) {
      return 'Forslaget mangler handling.'
    }

    console.log('[Lynell] NIVA confirmed action', {
      intent: message.intent,
      actionType: action.kind,
      summary: action.summary,
    })
    appendTestLog('NIVA handling', `Starter: ${action.summary}`)

    if (action.kind === 'scene') {
      await handleActivateScene(action.sceneId)
      console.log('[Lynell] Scene kjørt via NIVA', {
        sceneId: action.sceneId,
        sceneName: action.sceneName,
      })
      const confirmed = await waitForNivaActionObservation(action)
      appendTestLog(
        'NIVA handling',
        confirmed ? `Bekreftet: ${action.summary}` : `Venter på bekreftelse: ${action.summary}`,
      )
      return confirmed
        ? getNivaObservedConfirmationText(action)
        : getNivaWaitingForConfirmationText(action)
    }

    if (action.kind === 'lightsOff') {
      const activeZones = rooms.flatMap((room) =>
        room.zones
          .filter((zone) => zone.lightsOn)
          .map((zone) => ({
            room,
            zone,
          })),
      )

      if (activeZones.length === 0) {
        return 'Utført. Ingen lys var registrert på.'
      }

      try {
        setIsLoading(true)
        setErrorMessage('')

        for (const { room, zone } of activeZones) {
          const zoneConfig = lightingConfig[room.key]?.zones[zone.key]

          recordKnxOutWithMetadata('NIVA lys', `${room.name} / ${zone.name} -> Av`, {
            address: zoneConfig?.light ?? null,
            dataType: zoneConfig?.lightDataType ?? null,
            mappedValue: false,
          })
          const nextRooms = await setLight(room.id, zone.id, false)
          setRooms((currentRooms) => mergeRoomPresentation(nextRooms, currentRooms))
        }

        console.log('[Lynell] Lys slått av via NIVA', {
          zones: activeZones.map(({ room, zone }) => `${room.key}/${zone.key}`),
        })
        const confirmed = await waitForNivaActionObservation(action)
        appendTestLog(
          'NIVA handling',
          confirmed ? `Bekreftet: ${action.summary}` : `Venter på bekreftelse: ${action.summary}`,
        )
        return confirmed
          ? getNivaObservedConfirmationText(action)
          : getNivaWaitingForConfirmationText(action)
      } finally {
        setIsLoading(false)
      }
    }

    if (action.kind === 'roomLightsOff') {
      const room = rooms.find((currentRoom) => currentRoom.key === action.roomKey)

      if (!room) {
        return 'Jeg fant ikke rommet.'
      }

      const activeZones = room.zones.filter((zone) => zone.lightsOn)

      if (activeZones.length === 0) {
        return `Utført. Ingen lys var registrert på i ${room.name}.`
      }

      try {
        setIsLoading(true)
        setErrorMessage('')

        for (const zone of activeZones) {
          const zoneConfig = lightingConfig[room.key]?.zones[zone.key]

          recordKnxOutWithMetadata('NIVA romlys', `${room.name} / ${zone.name} -> Av`, {
            address: zoneConfig?.light ?? null,
            dataType: zoneConfig?.lightDataType ?? null,
            mappedValue: false,
          })
          const nextRooms = await setLight(room.id, zone.id, false)
          setRooms((currentRooms) => mergeRoomPresentation(nextRooms, currentRooms))
        }

        const confirmed = await waitForNivaActionObservation(action)
        appendTestLog(
          'NIVA handling',
          confirmed ? `Bekreftet: ${action.summary}` : `Venter på bekreftelse: ${action.summary}`,
        )
        return confirmed
          ? getNivaObservedConfirmationText(action)
          : getNivaWaitingForConfirmationText(action)
      } finally {
        setIsLoading(false)
      }
    }

    if (action.kind === 'zoneLightsOff') {
      const room = rooms.find((currentRoom) => currentRoom.key === action.roomKey)
      const zone = room?.zones.find((currentZone) => currentZone.key === action.zoneKey)

      if (!room || !zone) {
        return 'Jeg fant ikke riktig lyssone.'
      }

      if (!zone.lightsOn) {
        return `${zone.name} i ${room.name} var allerede av.`
      }

      try {
        setIsLoading(true)
        setErrorMessage('')
        const zoneConfig = lightingConfig[room.key]?.zones[zone.key]

        recordKnxOutWithMetadata('NIVA sone-lys', `${room.name} / ${zone.name} -> Av`, {
          address: zoneConfig?.light ?? null,
          dataType: zoneConfig?.lightDataType ?? null,
          mappedValue: false,
        })
        const nextRooms = await setLight(room.id, zone.id, false)
        setRooms((currentRooms) => mergeRoomPresentation(nextRooms, currentRooms))
        const confirmed = await waitForNivaActionObservation(action)
        appendTestLog(
          'NIVA handling',
          confirmed ? `Bekreftet: ${action.summary}` : `Avventer bekreftelse: ${action.summary}`,
        )
        return confirmed
          ? getNivaObservedConfirmationText(action)
          : getNivaWaitingForConfirmationText(action)
      } finally {
        setIsLoading(false)
      }
    }

    if (action.kind === 'roomBrightness') {
      const room = rooms.find((currentRoom) => currentRoom.key === action.roomKey)

      if (!room) {
        return 'Jeg fant ikke rommet.'
      }

      try {
        setIsLoading(true)
        setErrorMessage('')

        for (const zoneId of action.zoneIds) {
          await handleBrightnessChange(room.id, zoneId, action.brightness)
        }

        const confirmed = await waitForNivaActionObservation(action)
        appendTestLog(
          'NIVA handling',
          confirmed ? `Bekreftet: ${action.summary}` : `Avventer bekreftelse: ${action.summary}`,
        )
        return confirmed
          ? getNivaObservedConfirmationText(action)
          : getNivaWaitingForConfirmationText(action)
      } finally {
        setIsLoading(false)
      }
    }

    if (action.kind === 'roomMode') {
      await handleModeChange(action.roomId, action.mode)
      const confirmed = await waitForNivaActionObservation(action)
      appendTestLog(
        'NIVA handling',
        confirmed ? `Bekreftet: ${action.summary}` : `Venter på bekreftelse: ${action.summary}`,
      )
      return confirmed
        ? getNivaObservedConfirmationText(action)
        : getNivaWaitingForConfirmationText(action)
    }

    if (action.kind === 'climateSetpoint') {
      const roomConfig = savedSystemConfigData.rooms.find((room) => room.key === action.roomKey)
      const setpointAddress = roomConfig?.climate.setpoint.trim() ?? ''

      if (!setpointAddress) {
        return 'Dette rommet har ikke temperaturstyring fra appen ennå.'
      }

      console.log('[Lynell] NIVA climate setpoint write', {
        roomKey: action.roomKey,
        roomName: action.roomName,
        setpoint: action.setpoint,
        address: setpointAddress,
        dataType: roomConfig?.climate.setpointDataType ?? null,
        writeTarget: 'setpoint',
      })
      recordKnxOutWithMetadata(
        'NIVA klima',
        `${action.roomName} -> ${formatNivaSetpoint(action.setpoint)}°`,
        {
          address: setpointAddress,
          dataType: roomConfig?.climate.setpointDataType ?? null,
          mappedValue: action.setpoint,
        },
      )
      await handleSetpointChange(action.roomId, action.setpoint)
      const confirmed = await waitForNivaActionObservation(action)
      appendTestLog(
        'NIVA handling',
        confirmed ? `Bekreftet: ${action.summary}` : `Venter på bekreftelse: ${action.summary}`,
      )
      return confirmed
        ? getNivaObservedConfirmationText(action)
        : getNivaWaitingForConfirmationText(action)
    }

    if (action.kind === 'mediaControl') {
      if (action.action === 'pause') {
        if (selectedMediaRoute === 'cast') {
          await handleCastPauseFoundation()
        } else {
          setMediaPlayer((currentPlayer) => pauseMediaPlayback(currentPlayer))
        }
      } else if ((action.action === 'playCalm' || action.action === 'playMood') && action.trackId) {
        const targetTrack = getTrackById(mediaLibrary, action.trackId)

        if (selectedMediaRoute === 'cast' && targetTrack) {
          setMediaPlayer((currentPlayer) => ({
            ...playMediaTrack(currentPlayer, action.trackId ?? ''),
            isPlaying: false,
          }))
          await handleCastPlayFoundation(targetTrack)
        } else {
          setMediaPlayer((currentPlayer) => playMediaTrack(currentPlayer, action.trackId ?? ''))
        }
      } else if (action.action === 'device' && action.deviceId) {
        const targetDevice = mediaDevices.find((device) => device.deviceId === action.deviceId)
        handleMediaDeviceChange(action.deviceId)

        if (targetDevice?.availability === 'discovered') {
          const targetTrack = currentMediaTrack ?? mediaLibrary[0] ?? null
          if (targetTrack) {
            setMediaPlayer((currentPlayer) => ({
              ...playMediaTrack(currentPlayer, targetTrack.id),
              isPlaying: false,
            }))

            try {
              const playback = await castPlay({
                deviceId: action.deviceId,
                mediaUrl: targetTrack.sourceUrl,
                title: targetTrack.title,
              })
              setBridgeCastState((currentState) => ({
                ...currentState,
                checkedAt: new Date().toISOString(),
                error: null,
                playback,
              }))
              appendTestLog('NIVA media', playback.message)
              if (!playback.dependencyReady || playback.state === 'blocked') {
                return `Cast er funnet, men playback er ikke koblet/støttet ennå. ${playback.message}`
              }
              if (playback.state === 'playing') {
                return `Jeg sender musikken til ${targetDevice.name}. Playback er i testmodus.`
              }
              if (playback.state === 'error') {
                return `Cast playback feilet. ${playback.message}`
              }
              return `Jeg forsøker å sende musikken til ${targetDevice.name}. ${playback.message}`
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Cast playback er ikke klar ennå'
              setBridgeCastState((currentState) => ({
                ...currentState,
                checkedAt: new Date().toISOString(),
                error: message,
              }))
              return `Cast er funnet, men playback er ikke koblet/støttet ennå. ${message}`
            }
          }

          return `Cast-output er valgt: ${targetDevice.name}. Velg et spor først.`
        }

        setMediaPlayer((currentPlayer) =>
          currentPlayer.currentTrackId
            ? playMedia(currentPlayer)
            : mediaLibrary[0]
              ? playMediaTrack(currentPlayer, mediaLibrary[0].id)
              : currentPlayer,
        )
      } else {
        if (selectedMediaRoute === 'cast') {
          const targetTrack = currentMediaTrack ?? mediaLibrary[0] ?? null
          if (targetTrack) {
            setMediaPlayer((currentPlayer) => ({
              ...(currentPlayer.currentTrackId ? currentPlayer : playMediaTrack(currentPlayer, targetTrack.id)),
              isPlaying: false,
              currentTrackId: targetTrack.id,
            }))
            await handleCastPlayFoundation(targetTrack)
          }
        } else {
          setMediaPlayer((currentPlayer) =>
            currentPlayer.currentTrackId
              ? playMedia(currentPlayer)
              : mediaLibrary[0]
                ? playMediaTrack(currentPlayer, mediaLibrary[0].id)
                : currentPlayer,
          )
        }
      }

      appendTestLog('NIVA media', action.summary)
      return getNivaObservedConfirmationText(action)
    }

    if (action.kind === 'vacuumControl') {
      let bridgeMessage = 'Robot bridge er ikke tilgjengelig; dette blir bare lokal demo/developer foundation.'
      let shouldSimulate = true

      try {
        const snapshot = await sendVacuumCommand(action.action)
        shouldSimulate = !snapshot.connected || Boolean(snapshot.commandSimulated)
        bridgeMessage = snapshot.message
        setBridgeVacuumState({
          checkedAt: createDiagnosticPulse('Robot kommando', `NIVA ${action.action}`).at,
          error: null,
          snapshot,
        })
      } catch (error) {
        bridgeMessage = error instanceof Error ? error.message : bridgeMessage
        setBridgeVacuumState((currentState) => ({
          ...currentState,
          checkedAt: createDiagnosticPulse('Robot kommando', `NIVA ${action.action} feilet`).at,
          error: bridgeMessage,
        }))
      }

      if (shouldSimulate && runtimeAllowsMock) {
        setVacuumDevices((currentDevices) =>
          currentDevices.map((device) =>
            device.deviceId === action.deviceId
              ? action.action === 'pause'
                ? pauseMockVacuumCleaning(device)
                : action.action === 'dock'
                  ? dockMockVacuum(device)
                  : action.action === 'stop'
                    ? pauseMockVacuumCleaning(device)
                    : startMockVacuumCleaning(device, 'Oppholdsrom')
              : device,
          ),
        )
      } else if (shouldSimulate) {
        return `Live Mode er aktiv. Jeg kjører ikke demo/developer-handling på roboten uten live provider. ${bridgeMessage}`
      }
      appendTestLog('NIVA robot', action.summary)
      return shouldSimulate
        ? `Jeg har bare oppdatert demo/developer foundation for roboten. ${bridgeMessage}`
        : bridgeMessage
    }

    if (action.kind === 'calendar') {
      const events = getCalendarActionEvents(action)
      const fingerprint = action.fingerprint ?? createCalendarActionFingerprint(events)
      const confirmedAt = new Date().toISOString()
      const duplicate = findRecentCalendarDuplicate(fingerprint)

      if (duplicate) {
        setCalendarDuplicatePreventedCount((current) => current + 1)
        updateCalendarActionRecord(action, 'created', {
          confirmedAt,
          completedAt: duplicate.completedAt ?? confirmedAt,
          duplicatePrevented: true,
          duplicateOf: duplicate.actionId,
          error: 'Duplicate prevented',
        })
        appendTestLog('NIVA kalender', `Duplicate stoppet: ${action.summary}`)

        return `Dette ligger allerede i kalenderen: ${summarizeCalendarEvents(duplicate.events)}. Jeg opprettet ikke en kopi.`
      }

      updateCalendarActionRecord(action, 'queued', {
        confirmedAt,
        error: null,
      })
      updateCalendarActionRecord(action, 'creating', {
        confirmedAt,
        error: null,
      })

      try {
        for (const event of events) {
          addNivaCalendarEvent(event)
        }

        console.log('[Lynell] Kalenderaktivitet opprettet via NIVA', {
          events,
        })
        appendTestLog('NIVA kalender', summarizeCalendarEvents(events))
        const confirmed = await waitForNivaActionObservation(action)
        const completedAt = new Date().toISOString()
        appendTestLog(
          'NIVA handling',
          confirmed ? `Bekreftet: ${action.summary}` : `Venter på bekreftelse: ${action.summary}`,
        )

        if (confirmed) {
          updateCalendarActionRecord(action, 'created', {
            confirmedAt,
            completedAt,
            error: null,
          })

          return getNivaObservedConfirmationText(action)
        }

        updateCalendarActionRecord(action, 'failed', {
          confirmedAt,
          failedAt: completedAt,
          error: 'Kalendervisningen bekreftet ikke opprettelsen.',
        })

        return getNivaWaitingForConfirmationText(action)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Kalender kunne ikke opprettes.'
        updateCalendarActionRecord(action, 'failed', {
          confirmedAt,
          failedAt: new Date().toISOString(),
          error: message,
        })
        throw new Error(message)
      }
    }

    return 'Forslaget mangler støttet handling.'
  }

  const handleResolveNivaProposal = async (
    messageId: string,
    status: 'acknowledged' | 'completed',
  ) => {
    const message = nivaMessages.find((currentMessage) => currentMessage.id === messageId)

    if (!message) {
      return
    }

    if (status === 'completed' && message.status === 'completed') {
      if (message.proposedAction?.kind === 'calendar') {
        setCalendarDuplicatePreventedCount((current) => current + 1)
        appendTestLog('NIVA kalender', `Duplicate bekreftelse ignorert: ${message.proposedAction.summary}`)
      }
      return
    }

    if (status === 'acknowledged') {
      console.log('[Lynell] NIVA action cancelled', {
        intent: message.intent,
        actionType: message.proposedAction?.kind ?? null,
      })
      appendTestLog('NIVA handling', 'Forslag avbrutt')
      if (message.proposedAction?.kind === 'calendar') {
        updateCalendarActionRecord(message.proposedAction, 'cancelled', {
          cancelledAt: new Date().toISOString(),
          error: null,
        })
      }
      setNivaMessages((currentMessages) =>
        currentMessages.map((currentMessage) =>
          currentMessage.id === messageId
            ? {
                ...currentMessage,
                status,
                text: 'Forslaget er lagt bort.',
              }
            : currentMessage,
        ),
      )
      return
    }

    try {
      pulseNivaProcessing(1400)
      const actionLabel = message.proposedAction?.kind === 'calendar' ? 'Oppretter kalenderaktivitet...' : 'Utfører...'
      appendTestLog('NIVA handling', actionLabel)
      setNivaMessages((currentMessages) =>
        currentMessages.map((currentMessage) =>
          currentMessage.id === messageId
            ? {
                ...currentMessage,
                status: 'completed',
                text: actionLabel,
              }
            : currentMessage,
        ),
      )
      const resultText = await executeNivaProposedAction(message)
      setNivaInteractionDiagnostics((current) => ({
        ...current,
        successfulConversationalActions: current.successfulConversationalActions + 1,
      }))

      setNivaMessages((currentMessages) =>
        currentMessages.map((currentMessage) =>
          currentMessage.id === messageId
            ? {
                ...currentMessage,
                status,
                text: resultText,
              }
            : currentMessage,
        ),
      )
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : 'Kunne ikke utføre NIVA-forslag'
      console.warn('[Lynell] NIVA action failed', {
        intent: message.intent,
        actionType: message.proposedAction?.kind ?? null,
        error,
      })
      setErrorMessage(nextMessage)
      setRuntimeIssue(nextMessage)
      if (message.proposedAction?.kind === 'calendar') {
        updateCalendarActionRecord(message.proposedAction, 'failed', {
          failedAt: new Date().toISOString(),
          error: nextMessage,
        })
      }
      setNivaMessages((currentMessages) =>
        currentMessages.map((currentMessage) =>
          currentMessage.id === messageId
            ? {
                ...currentMessage,
                status: 'acknowledged',
                text:
                  message.proposedAction?.kind === 'calendar'
                    ? `Kalenderhandlingen feilet: ${nextMessage}. Konteksten er beholdt; prøv igjen når informasjonen er tydelig.`
                    : `Jeg kunne ikke utføre forslaget: ${nextMessage}`,
              }
            : currentMessage,
        ),
      )
    }
  }

  const handleDismissNivaInsight = (insight: NivaInsight) => {
    if (!insight.contextKey) {
      return
    }

    const now = Date.now()
    const snoozedUntil = now + (insight.dismissUntilMs ?? 4 * 60 * 60 * 1000)

    setDismissedNivaInsights((currentInsights) => {
      const currentInsight = currentInsights[insight.id]

      return {
        ...currentInsights,
        [insight.id]: {
          contextKey: insight.contextKey ?? insight.id,
          until: snoozedUntil,
          acknowledgedAt: now,
          snoozedUntil,
          dismissCount: (currentInsight?.dismissCount ?? 0) + 1,
          observationFingerprint: insight.contextKey ?? insight.id,
        },
      }
    })
  }

  const handleDismissRecommendation = (recommendation: LynellRecommendation) => {
    if (!recommendation.dismissible) {
      return
    }

    setDismissedRecommendations((currentDismissed) => {
      const nextDismissed = {
        ...currentDismissed,
        [recommendation.id]: {
          until: Date.now() + 12 * 60 * 60 * 1000,
        },
      }

      persistDismissedRecommendations(nextDismissed)
      return nextDismissed
    })
  }

  const confirmVacuumPhysicalCommand = (command: 'start' | 'pause' | 'dock' | 'stop') => {
    const couldReachPhysicalRobot = Boolean(
      vacuumLiveStatusConfirmed ||
        (bridgeVacuumState.snapshot?.provider === 'homeAssistantBridge' &&
          bridgeVacuumState.snapshot?.trust?.state !== 'stale' &&
          bridgeVacuumState.snapshot?.trust?.state !== 'offline' &&
          bridgeVacuumState.snapshot?.configured),
    )

    if (!couldReachPhysicalRobot || vacuumPhysicalCommandAcknowledged) {
      return true
    }

    const commandText =
      command === 'dock'
        ? 'send til lading'
        : command === 'pause'
          ? 'pause'
          : command === 'stop'
            ? 'stopp'
            : 'start'
    const saferText =
      command === 'dock'
        ? 'Dock er anbefalt som første fysiske test.'
        : 'Start bare når du faktisk vil sende roboten i fysisk aktivitet.'

    const confirmed = window.confirm(
      `Dette sender en ekte kommando til roboten via Home Assistant: ${commandText}. ${saferText}`,
    )

    if (confirmed) {
      setVacuumPhysicalCommandAcknowledged(true)
    }

    return confirmed
  }

  const handleAssistantStatusTest = async () => {
    try {
      const snapshot = await sendVacuumCommand('status')
      setBridgeVacuumState({
        checkedAt: createDiagnosticPulse('Robot status', 'HA status-test').at,
        error: null,
        snapshot,
      })
      appendTestLog('Assistent bridge', snapshot.message)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kunne ikke hente robotstatus'
      setBridgeVacuumState((currentState) => ({
        ...currentState,
        checkedAt: createDiagnosticPulse('Robot status', 'HA status-test feilet').at,
        error: message,
      }))
      appendTestLog('Assistent bridge', message)
    }
  }

  const handleAssistantStart = async (deviceId: string, area = 'Oppholdsrom') => {
    if (!confirmVacuumPhysicalCommand('start')) {
      return
    }

    let shouldSimulate = true

    try {
      const snapshot = await sendVacuumCommand('start')
      shouldSimulate = !snapshot.connected || Boolean(snapshot.commandSimulated)
      setBridgeVacuumState({
        checkedAt: createDiagnosticPulse('Robot kommando', 'Start').at,
        error: null,
        snapshot,
      })
      appendTestLog('Assistent bridge', snapshot.message)
    } catch (error) {
      setBridgeVacuumState((currentState) => ({
        ...currentState,
        checkedAt: createDiagnosticPulse('Robot kommando', 'Start feilet').at,
        error: error instanceof Error ? error.message : 'Robotkommando feilet',
      }))
    }

    if (shouldSimulate && runtimeAllowsMock) {
      setVacuumDevices((currentDevices) =>
        currentDevices.map((device) =>
          device.deviceId === deviceId ? startMockVacuumCleaning(device, area) : device,
        ),
      )
      appendTestLog('Assistent foundation', `Demo/developer rengjøring i ${area}`)
    } else if (shouldSimulate) {
      appendTestLog('Assistent', 'Live Mode: demo-handling er skjult')
    }
  }

  const handleAssistantPause = async (deviceId: string) => {
    if (!confirmVacuumPhysicalCommand('pause')) {
      return
    }

    let shouldSimulate = true

    try {
      const snapshot = await sendVacuumCommand('pause')
      shouldSimulate = !snapshot.connected || Boolean(snapshot.commandSimulated)
      setBridgeVacuumState({
        checkedAt: createDiagnosticPulse('Robot kommando', 'Pause').at,
        error: null,
        snapshot,
      })
      appendTestLog('Assistent bridge', snapshot.message)
    } catch (error) {
      setBridgeVacuumState((currentState) => ({
        ...currentState,
        checkedAt: createDiagnosticPulse('Robot kommando', 'Pause feilet').at,
        error: error instanceof Error ? error.message : 'Robotkommando feilet',
      }))
    }

    if (shouldSimulate && runtimeAllowsMock) {
      setVacuumDevices((currentDevices) =>
        currentDevices.map((device) =>
          device.deviceId === deviceId ? pauseMockVacuumCleaning(device) : device,
        ),
      )
      appendTestLog('Assistent foundation', 'Pauset foundation-rengjøring')
    } else if (shouldSimulate) {
      appendTestLog('Assistent', 'Live Mode: demo-handling er skjult')
    }
  }

  const handleAssistantDock = async (deviceId: string) => {
    if (!confirmVacuumPhysicalCommand('dock')) {
      return
    }

    let shouldSimulate = true

    try {
      const snapshot = await sendVacuumCommand('dock')
      shouldSimulate = !snapshot.connected || Boolean(snapshot.commandSimulated)
      setBridgeVacuumState({
        checkedAt: createDiagnosticPulse('Robot kommando', 'Dock').at,
        error: null,
        snapshot,
      })
      appendTestLog('Assistent bridge', snapshot.message)
    } catch (error) {
      setBridgeVacuumState((currentState) => ({
        ...currentState,
        checkedAt: createDiagnosticPulse('Robot kommando', 'Dock feilet').at,
        error: error instanceof Error ? error.message : 'Robotkommando feilet',
      }))
    }

    if (shouldSimulate && runtimeAllowsMock) {
      setVacuumDevices((currentDevices) =>
        currentDevices.map((device) =>
          device.deviceId === deviceId ? dockMockVacuum(device) : device,
        ),
      )
      appendTestLog('Assistent foundation', 'Sendt foundation-retur til ladestasjon')
    } else if (shouldSimulate) {
      appendTestLog('Assistent', 'Live Mode: demo-handling er skjult')
    }
  }

  const handleSceneChange = (
    sceneId: string,
    field: 'name' | 'enabled' | 'triggerType' | 'triggerNote' | 'triggerTime',
    value: string | boolean,
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      scenes: currentConfig.scenes.map((scene) =>
        scene.id === sceneId ? { ...scene, [field]: value } : scene,
      ),
    }))
  }

  const handleAddScene = () => {
    const nextId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `scene-${Date.now()}`

    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      scenes: [
        ...currentConfig.scenes,
        {
          id: nextId,
          name: 'Ny scene',
          enabled: true,
          roomKeys: [],
          lighting: [],
          climate: [],
          triggerType: 'manual',
          triggerNote: '',
          triggerTime: '',
        },
      ],
    }))
  }

  const handleAddSceneRoom = (sceneId: string) => {
    const defaultRoomKey = managerRooms[0]?.key ?? ''

    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      scenes: currentConfig.scenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              roomKeys:
                defaultRoomKey && !scene.roomKeys.includes(defaultRoomKey)
                  ? [...scene.roomKeys, defaultRoomKey]
                  : scene.roomKeys,
            }
          : scene,
      ),
    }))
  }

  const handleSceneRoomChange = (sceneId: string, index: number, roomKey: string) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      scenes: currentConfig.scenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              roomKeys: scene.roomKeys.map((currentRoomKey, currentIndex) =>
                currentIndex === index ? roomKey : currentRoomKey,
              ),
            }
          : scene,
      ),
    }))
  }

  const handleRemoveSceneRoom = (sceneId: string, index: number) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      scenes: currentConfig.scenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              roomKeys: scene.roomKeys.filter((_, currentIndex) => currentIndex !== index),
            }
          : scene,
      ),
    }))
  }

  const handleAddSceneLightingTarget = (sceneId: string) => {
    const defaultRoom = managerRooms.find((room) => room.zones.length > 0)
    const defaultZone = defaultRoom?.zones[0]
    const nextId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `scene-light-${Date.now()}`

    if (!defaultRoom || !defaultZone) {
      return
    }

    const nextTarget: SceneLightingTargetConfig = {
      id: nextId,
      roomKey: defaultRoom.key,
      zoneKey: defaultZone.key,
      brightness: '100',
    }

    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      scenes: currentConfig.scenes.map((scene) =>
        scene.id === sceneId
          ? { ...scene, lighting: [...scene.lighting, nextTarget] }
          : scene,
      ),
    }))
  }

  const handleSceneLightingTargetChange = (
    sceneId: string,
    targetId: string,
    field: keyof SceneLightingTargetConfig,
    value: string,
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      scenes: currentConfig.scenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              lighting: scene.lighting.map((target) =>
                target.id !== targetId
                  ? target
                  : {
                      ...target,
                      [field]: value,
                      ...(field === 'roomKey'
                        ? {
                            zoneKey:
                              managerRooms.find((room) => room.key === value)?.zones[0]?.key ?? '',
                          }
                        : {}),
                    },
              ),
            }
          : scene,
      ),
    }))
  }

  const handleRemoveSceneLightingTarget = (sceneId: string, targetId: string) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      scenes: currentConfig.scenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              lighting: scene.lighting.filter((target) => target.id !== targetId),
            }
          : scene,
      ),
    }))
  }

  const handleAddSceneClimateTarget = (sceneId: string) => {
    const defaultRoom = managerRooms.find((room) => Boolean(lightingConfig[room.key]?.climateActive))
    const nextId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `scene-climate-${Date.now()}`

    if (!defaultRoom) {
      return
    }

    const nextTarget: SceneClimateTargetConfig = {
      id: nextId,
      roomKey: defaultRoom.key,
      mode: 'Komfort',
      temperature: '22',
    }

    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      scenes: currentConfig.scenes.map((scene) =>
        scene.id === sceneId
          ? { ...scene, climate: [...scene.climate, nextTarget] }
          : scene,
      ),
    }))
  }

  const handleSceneClimateTargetChange = (
    sceneId: string,
    targetId: string,
    field: keyof SceneClimateTargetConfig,
    value: string,
  ) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      scenes: currentConfig.scenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              climate: scene.climate.map((target) =>
                target.id === targetId ? { ...target, [field]: value } : target,
              ),
            }
          : scene,
      ),
    }))
  }

  const handleRemoveSceneClimateTarget = (sceneId: string, targetId: string) => {
    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      scenes: currentConfig.scenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              climate: scene.climate.filter((target) => target.id !== targetId),
            }
          : scene,
      ),
    }))
  }

  const handleAddFloor = () => {
    setSystemConfigData((currentConfig) => {
      const nextIndex = currentConfig.floors.length + 1
      const roomGroup = `floor-${nextIndex}`

      return {
        ...currentConfig,
        floors: [
          ...currentConfig.floors,
          {
            id: roomGroup,
            label: `Ny etasje ${nextIndex}`,
            roomGroup,
          },
        ],
      }
    })
  }

  const handleAddRoom = (floorId: string) => {
    const floor = systemConfigData.floors.find((item) => item.id === floorId)

    if (!floor) {
      return
    }

    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      rooms: (() => {
        const nextRoomId =
          currentConfig.rooms.reduce((maxId, room) => Math.max(maxId, room.id), 0) + 1
        const defaultName = `Nytt rom ${nextRoomId}`
        const roomKey = `${slugify(floor.label) || floor.id}-${slugify(defaultName) || nextRoomId}`

        return [
          ...currentConfig.rooms,
          {
            id: nextRoomId,
            key: roomKey,
            group: floor.roomGroup,
            name: defaultName,
            configured: false,
            initialTemperature: 20,
            initialTargetTemperature: 22,
            initialMode: 'Komfort',
            heatEmitterType: '',
            heatPowerWatts: null,
            nominalPowerWatts: null,
            floorHeatingType: '',
            floorAreaM2: null,
            ceilingHeightM: null,
            roomVolumeM3: null,
            manualVolumeM3: null,
            note: '',
            climate: {
              active: false,
              liveActive: false,
              temperature: '',
              setpoint: '',
              setpointWriteStrategy: 'absoluteTemperature',
              mode: '',
              setpointFeedback: '',
              modeFeedback: '',
              heatDemand: '',
            },
            zones: [],
          },
        ]
      })(),
    }))
  }

  const handleAddZone = (roomId: number) => {
    const room = systemConfigData.rooms.find((item) => item.id === roomId)

    if (!room) {
      return
    }

    const nextZoneIndex = room.zones.length + 1
    const zoneKey = `zone-${nextZoneIndex}`
    const zoneId = `${room.key}-${zoneKey}`
    const zoneName = `Ny sone ${nextZoneIndex}`

    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      rooms: currentConfig.rooms.map((currentRoom) =>
        currentRoom.id !== roomId
          ? currentRoom
          : {
              ...currentRoom,
              zones: [
                ...currentRoom.zones,
                {
                  id: zoneId,
                  key: zoneKey,
                  name: zoneName,
                  dimmable: true,
                  light: '',
                  dim: '',
                  value: '',
                  lightFeedback: '',
                  valueFeedback: '',
                },
              ],
            },
      ),
    }))
  }

  const handleDeleteRoom = (roomId: number) => {
    if (!window.confirm('Er du sikker på at du vil slette dette?')) {
      return
    }

    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      rooms: currentConfig.rooms.filter((room) => room.id !== roomId),
    }))
  }

  const handleDeleteZone = (roomId: number, zoneId: string) => {
    if (!window.confirm('Er du sikker på at du vil slette dette?')) {
      return
    }

    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      rooms: currentConfig.rooms.map((room) =>
        room.id !== roomId
          ? room
          : {
              ...room,
              zones: room.zones.filter((zone) => zone.id !== zoneId),
            },
      ),
    }))
  }

  const handleDeleteCalendarEvent = (eventId: string) => {
    if (!window.confirm('Er du sikker på at du vil slette dette?')) {
      return
    }

    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      calendar: {
        ...currentConfig.calendar,
        events: currentConfig.calendar.events.filter((event) => event.id !== eventId),
      },
    }))
  }

  const handleDeleteBookingResource = (resourceId: string) => {
    if (!window.confirm('Er du sikker på at du vil slette dette?')) {
      return
    }

    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      calendar: {
        ...currentConfig.calendar,
        resources: currentConfig.calendar.resources.filter((resource) => resource.id !== resourceId),
        bookings: currentConfig.calendar.bookings.map((booking) =>
          booking.resourceId === resourceId ? { ...booking, resourceId: '' } : booking,
        ),
      },
    }))
  }

  const handleDeleteBooking = (bookingId: string) => {
    if (!window.confirm('Er du sikker på at du vil slette dette?')) {
      return
    }

    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      calendar: {
        ...currentConfig.calendar,
        bookings: currentConfig.calendar.bookings.filter((booking) => booking.id !== bookingId),
      },
    }))
  }

  const handleDeleteScene = (sceneId: string) => {
    if (!window.confirm('Er du sikker på at du vil slette dette?')) {
      return
    }

    setSystemConfigData((currentConfig) => ({
      ...currentConfig,
      scenes: currentConfig.scenes.filter((scene) => scene.id !== sceneId),
    }))
  }

  const handleExportConfig = () => {
    const payload: ExportedManagerConfig = {
      version: 2,
      system: systemConfigData,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'lynell-manager-config.json'
    link.click()
    URL.revokeObjectURL(url)
    setManagerMessage('Konfigurasjon eksportert')
  }

  const handleImportConfig = async (file: File) => {
    try {
      const raw = await file.text()
      const parsed = JSON.parse(raw) as Partial<ExportedManagerConfig>

      if (!parsed.system) {
        throw new Error('Ugyldig konfigurasjonsfil')
      }

      setSystemConfigData(normalizeSystemConfig(parsed.system))
      setManagerMessage(`Konfigurasjon importert som utkast fra ${file.name}`)
    } catch (error) {
      setManagerMessage(
        error instanceof Error ? error.message : 'Kunne ikke importere konfigurasjon',
      )
    }
  }

  const lightsOnCount = resolvedRooms.reduce(
    (count, room) =>
      count + room.zones.filter((zone) => zone.lightsOn).length,
    0,
  )
  const roomsUnderSetpointCount = resolvedRooms.filter(
    (room) => room.temperature < room.targetTemperature - targetTolerance,
  ).length
  const summaryLightsValue = String(lightsOnCount)
  const summaryClimateValue = String(roomsUnderSetpointCount)
  const weatherDisplay = weather ? getWeatherLabel(weather.condition) : null
  const weatherAwareness: NivaWeatherAwareness = getNivaWeatherAwareness({
    weather,
    weatherDisplay,
    weatherUpdatedAt,
    rainAlertThresholdMm: nivaRainAlertThresholdMm,
    windSpeedAlertThresholdMs: nivaWindSpeedAlertThresholdMs,
    frostAlertThresholdC: nivaFrostAlertThresholdC,
  })
  const housePresence = buildHousePresenceState({
    now: currentClock,
    globalMode: homeStatus,
    rooms: resolvedRooms.map((room) => {
      const activeZones = room.zones.filter((zone) => zone.lightsOn)
      const averageBrightness =
        activeZones.length > 0
          ? Math.round(
              activeZones.reduce((sum, zone) => sum + zone.brightness, 0) / activeZones.length,
            )
          : 0

      return {
        key: room.key,
        name: room.name,
        lightsOn: activeZones.length,
        averageBrightness,
        heatDemand: typeof room.heatDemand === 'number' ? room.heatDemand : null,
      }
    }),
    weather: weatherAwareness.current
      ? {
          rainExpected: weatherAwareness.current.rainExpected,
          windSpeed: weatherAwareness.current.windSpeed,
          alert: Boolean(weatherAwareness.alert),
          weatherText: weatherAwareness.current.weatherText,
        }
      : null,
    media: {
      isPlaying: mediaPlayer.isPlaying,
      mood: currentMediaTrack?.mood,
      trackTitle: currentMediaTrack?.title,
      deviceName: activeMediaDevice?.name,
    },
    sensors: {
      activeRoomNames: sensorIntelligence.activeRoomNames,
      staleSensorCount: sensorIntelligence.staleSensorCount,
      weakSignalCount: sensorIntelligence.weakSignalCount,
      lowBatteryCount: sensorIntelligence.lowBatteryCount,
      environmentalSummary:
        sensorIntelligence.activeRoomNames.length > 0
          ? spatialAwareness.presenceSummary ??
            `Sensorlaget ser aktivitet i ${sensorIntelligence.activeRoomNames.slice(0, 2).join(' og ')}.`
          : undefined,
    },
    calendarActivityCount: todayActivities.length,
    robot: {
      isCleaning: Boolean(primaryVacuumDevice?.cleaning),
      currentRoom: primaryVacuumDevice?.currentRoom,
    },
  })
  const climateRooms = resolvedRooms.filter((room) => Boolean(lightingConfig[room.key]?.climateActive))
  const heatDemandRooms = climateRooms.filter(
    (room) => typeof room.heatDemand === 'number' && Number.isFinite(room.heatDemand) && room.heatDemand > 0,
  )
  const primaryHeatDemandRoom = heatDemandRooms[0] ?? null
  const dailyRhythmInsight = buildDailyRhythmInsight({
    rooms: resolvedRooms,
    history: runtimeHistory,
    now: currentClock.getTime(),
    mediaPlayer,
    presence: housePresence,
    globalMode: homeStatus,
  })
  const liveSignalElapsedMs = lastLiveSignalAt ? currentClock.getTime() - lastLiveSignalAt : null
  const runtimeElapsedMs = lastRuntimeSnapshotAt ? currentClock.getTime() - lastRuntimeSnapshotAt : null
  const globalLiveFeedbackActive = Boolean(
    bridgeHealth.snapshot?.lightSubscribeActive ||
      bridgeHealth.snapshot?.climateSubscribeActive ||
      (liveSignalElapsedMs !== null && liveSignalElapsedMs < 3 * 60 * 1000),
  )
  const hasPollingFallbackActive = feedbackStrategyLabel === 'polling'
  const runtimeIsStale =
    systemMode === 'live' &&
    ((runtimeElapsedMs !== null && runtimeElapsedMs > 15 * 60 * 1000) ||
      (liveSignalElapsedMs !== null && liveSignalElapsedMs > 12 * 60 * 1000))
  const missingRuntimeSignals =
    systemMode === 'live' &&
    !globalLiveFeedbackActive &&
    !hasPollingFallbackActive &&
    runtimeHistory.length === 0 &&
    !initialRuntimeState.restored
  const houseConfidenceLevel = getConfidenceLevel({
    hasLiveFeedback: globalLiveFeedbackActive,
    hasPollingFallback: hasPollingFallbackActive,
    restored: initialRuntimeState.restored,
    hasHistory: runtimeHistory.length > 0,
    staleRuntime: runtimeIsStale,
    missingSignals: missingRuntimeSignals,
  })
  const houseConfidence = buildRuntimeConfidence({
    level: houseConfidenceLevel,
    hasPollingFallback: hasPollingFallbackActive,
    restored: initialRuntimeState.restored,
    staleRuntime: runtimeIsStale,
    missingSignals: missingRuntimeSignals,
    fallbackText: runtimeHistory.length > 0
      ? 'Jeg bruker siste kjente runtime og historikk mens nye signaler kommer inn.'
      : 'Jeg har begrenset runtime-grunnlag akkurat nå.',
  })
  const adjustedHousePresence: HousePresence = {
    ...housePresence,
    nivaSummary: getPresenceSummaryForConfidence(housePresence, houseConfidence),
  }
  const displayedHousePresence = stableHousePresence ?? adjustedHousePresence
  const quietWindow = currentClock.getHours() >= 22 || currentClock.getHours() < 6
  const quietSinceLastChange = currentClock.getTime() - lastMeaningfulChangeAt > 12 * 60 * 1000
  const adaptiveQuietMode =
    houseConfidence.level === 'lav' ||
    (isLowNoisePresence(displayedHousePresence.state) &&
      !mediaPlayer.isPlaying &&
      lightsOnCount <= 1 &&
      (quietWindow || quietSinceLastChange))
  const houseMemorySnapshot = buildHouseMemoryDailySnapshot({
    rooms: resolvedRooms,
    history: runtimeHistory,
    presence: displayedHousePresence,
    rhythm: dailyRhythmInsight,
    mediaPlayer,
    vacuum: primaryVacuumDevice,
    sensorIntelligence,
    spatialAwareness,
    bridgeReady: bridgeRuntimeStatus === 'ready',
    confidenceLabel: houseConfidence.label,
    now: currentClock.getTime(),
  })
  const houseMemoryStateWithCurrentSnapshot = upsertHouseMemorySnapshot(
    houseMemoryState,
    houseMemorySnapshot,
  )
  const houseMemoryInsight = buildHouseMemoryInsight(houseMemoryStateWithCurrentSnapshot)
  const comfortEnergyInsight = buildComfortEnergyInsight({
    rooms: resolvedRooms,
    roomConfigs: savedSystemConfigData.rooms,
    floors: floorConfigs,
    history: runtimeHistory,
    weather,
    spatialMap,
    memory: houseMemoryStateWithCurrentSnapshot,
    confidenceLevel: houseConfidence.level,
  })
  const nivaPresenceComfort = buildNivaPresenceComfortSummary({
    presence: displayedHousePresence,
    comfort: comfortEnergyInsight,
    mediaPlaying: mediaPlayer.isPlaying,
    lightsOnCount,
    runtimeConfidenceLevel: houseConfidence.level,
    runtimeReady: bridgeRuntimeStatus === 'ready',
    quietMode: adaptiveQuietMode,
  })
  const adaptiveHomeAwareness = buildAdaptiveHomeAwareness({
    memory: houseMemoryState,
    currentSnapshot: houseMemorySnapshot,
    rhythm: dailyRhythmInsight,
    comfort: comfortEnergyInsight,
    sensorIntelligence,
    vacuum: primaryVacuumDevice,
    spatialAwareness,
    confidenceLevel: houseConfidence.level,
  })
  const occupancyFlowInsight = buildOccupancyFlowInsight({
    rooms: resolvedRooms,
    spatialMap,
    spatialAwareness,
    rhythm: dailyRhythmInsight,
    memory: houseMemoryStateWithCurrentSnapshot,
    mediaPlayer,
    vacuum: primaryVacuumDevice,
    now: currentClock.getTime(),
    confidenceLevel: houseConfidence.level,
  })
  const ambientMoodInsight = buildAmbientMoodInsight({
    rooms: resolvedRooms,
    now: currentClock,
    weather: weatherAwareness,
    presence: displayedHousePresence,
    occupancy: occupancyFlowInsight,
    comfort: comfortEnergyInsight,
    rhythm: dailyRhythmInsight,
    mediaPlayer,
    currentTrack: currentMediaTrack,
    globalMode: homeStatus,
    vacuum: primaryVacuumDevice,
    confidenceLevel: houseConfidence.level,
  })
  const lynellRecommendations = buildLynellRecommendations({
    comfort: comfortEnergyInsight,
    adaptive: adaptiveHomeAwareness,
    memory: houseMemoryInsight,
    sensorIntelligence,
    edgeDevices: edgeLifecycleDevices,
    edgeHealth: edgeDeviceHealthSummary,
    mediaPlayer,
    vacuum: primaryVacuumDevice,
    weather: {
      alertMessage: weatherAwareness.alert?.message ?? null,
      windSpeed: weatherAwareness.current?.windSpeed ?? null,
      rainExpected: Boolean(weatherAwareness.current?.rainExpected),
    },
    confidenceLevel: houseConfidence.level,
    createdAt: currentClock.getTime(),
  })
  const visibleRecommendations = lynellRecommendations.filter((recommendation) => {
    const dismissed = dismissedRecommendations[recommendation.id]
    return !dismissed || dismissed.until <= currentClock.getTime()
  })
  const homeRecommendations = adaptiveQuietMode ? [] : visibleRecommendations.slice(0, 1)
  const homeAwarenessSummary = buildPrioritizedAwarenessSummary({
    quietMode: adaptiveQuietMode,
    fallback: adaptiveQuietMode
      ? getQuietHousePhrase(currentClock.getHours() + currentClock.getDate())
      : displayedHousePresence.nivaSummary,
    items: [
      {
        id: 'system-confidence',
        layer: 'system',
        text: houseConfidence.level !== 'høy' ? houseConfidence.nivaLine : null,
        priority: houseConfidence.level === 'lav' ? 100 : 88,
        quietVisible: true,
      },
      {
        id: 'weather-alert',
        layer: 'weather',
        text: weatherAwareness.alert?.message,
        priority: 98,
        quietVisible: true,
      },
      {
        id: 'recommendation-primary',
        layer: 'recommendation',
        text:
          visibleRecommendations[0] && visibleRecommendations[0].priority !== 'low'
            ? `${visibleRecommendations[0].title}. ${visibleRecommendations[0].shortText}`
            : null,
        priority: visibleRecommendations[0]?.priority === 'high' ? 86 : 72,
      },
      {
        id: 'comfort',
        layer: 'comfort',
        text: comfortEnergyInsight.homeLine,
        priority: comfortEnergyInsight.state === 'highLoad' ? 84 : comfortEnergyInsight.state === 'watch' ? 78 : 64,
        quietVisible: comfortEnergyInsight.state === 'highLoad' || comfortEnergyInsight.state === 'watch',
      },
      {
        id: 'occupancy-flow',
        layer: 'occupancy',
        text: occupancyFlowInsight.homeLine,
        priority: occupancyFlowInsight.flowState === 'spread' ? 66 : 60,
      },
      {
        id: 'ambience',
        layer: 'ambience',
        text: ambientMoodInsight.homeLine,
        priority: 56,
      },
      {
        id: 'adaptive',
        layer: 'adaptive',
        text: adaptiveHomeAwareness.homeLine,
        priority: adaptiveHomeAwareness.kind === 'stable' ? 48 : 58,
      },
      {
        id: 'memory',
        layer: 'memory',
        text: houseMemoryInsight.presenceLine,
        priority: 42,
      },
    ],
  })
  const homePresenceRhythmLines = dedupeNivaDisplayLines([
    homeAwarenessSummary.mainLine,
    ...homeAwarenessSummary.secondaryLines,
  ]).filter(
    (line) => normalizeNivaDisplayText(line) !== normalizeNivaDisplayText(nivaPresenceComfort.homeLine),
  )
  const roomRecommendations = selectedRoomKey
    ? visibleRecommendations.filter((recommendation) => recommendation.relatedRoomKey === selectedRoomKey).slice(0, 2)
    : []
  const managerRecommendations = visibleRecommendations
    .filter((recommendation) =>
      ['sensor', 'device', 'system', 'weather'].includes(recommendation.category),
    )
    .slice(0, 3)
  const houseMemorySignature = [
    houseMemorySnapshot.dateKey,
    houseMemorySnapshot.presenceState,
    houseMemorySnapshot.activeRoomNames.join('|'),
    houseMemorySnapshot.roomSummaries
      .map((room) =>
        [
          room.roomKey,
          Math.round(room.activityScore),
          Math.round(room.lightScore),
          Math.round(room.heatScore),
          room.temperatureStable ? 'stable' : 'moving',
          room.dominantRhythm ?? 'none',
        ].join(':'),
      )
      .join('|'),
    houseMemorySnapshot.assistantSummary ?? 'no-assistant',
    houseMemorySnapshot.sensorSummary.staleSensorCount,
    houseMemorySnapshot.sensorSummary.weakSignalCount,
    houseMemorySnapshot.sensorSummary.lowBatteryCount,
    houseMemorySnapshot.systemSummary.bridgeReady ? 'bridge-ready' : 'bridge-wait',
    houseMemorySnapshot.systemSummary.confidenceLabel,
    houseMemorySnapshot.systemSummary.mediaWasActive ? 'media-active' : 'media-idle',
    houseMemorySnapshot.spatialSummary ?? 'no-spatial',
  ].join('::')
  useEffect(() => {
    if (!stableHousePresence) {
      setStableHousePresence(adjustedHousePresence)
      presenceCandidateRef.current = null
      return
    }

    if (stableHousePresence.state === adjustedHousePresence.state) {
      presenceCandidateRef.current = null
      if (stableHousePresence.nivaSummary !== adjustedHousePresence.nivaSummary) {
        setStableHousePresence(adjustedHousePresence)
      }
      return
    }

    const now = currentClock.getTime()
    const candidate = presenceCandidateRef.current

    if (!candidate || candidate.presence.state !== adjustedHousePresence.state) {
      presenceCandidateRef.current = {
        presence: adjustedHousePresence,
        since: now,
      }
      return
    }

    const stabilizationMs =
      adjustedHousePresence.state === 'storm'
        ? 60 * 1000
        : isLowNoisePresence(adjustedHousePresence.state)
          ? 4 * 60 * 1000
          : 2 * 60 * 1000

    if (now - candidate.since >= stabilizationMs) {
      setStableHousePresence(adjustedHousePresence)
      presenceCandidateRef.current = null
    }
  }, [
    adjustedHousePresence.activeRoomNames.join('|'),
    adjustedHousePresence.label,
    adjustedHousePresence.nivaSummary,
    adjustedHousePresence.state,
    currentClock,
    stableHousePresence,
  ])
  useEffect(() => {
    setHouseMemoryState((currentState) => {
      const nextState = upsertHouseMemorySnapshot(currentState, houseMemorySnapshot)
      persistHouseMemoryState(nextState, houseMemoryStorageKey)
      return nextState
    })
  }, [houseMemorySignature])
  useEffect(() => {
    nivaQuietModeRef.current = adaptiveQuietMode
  }, [adaptiveQuietMode])
  const climateConfidenceLevel = getConfidenceLevel({
    hasLiveFeedback: globalLiveFeedbackActive && liveClimateTemperatureRoomKeys.length > 0,
    hasPollingFallback: hasPollingFallbackActive,
    restored: initialRuntimeState.restored,
    hasHistory: runtimeHistory.some((point) => point.field === 'temperature' || point.field === 'heatDemand'),
    staleRuntime: runtimeIsStale,
    missingSignals: climateRooms.length > 0 && liveClimateTemperatureRoomKeys.length === 0 && systemMode === 'live',
  })
  const lightConfidenceLevel = getConfidenceLevel({
    hasLiveFeedback: globalLiveFeedbackActive && confirmedLightFeedbackZoneKeys.length > 0,
    hasPollingFallback: hasPollingFallbackActive,
    restored: initialRuntimeState.restored,
    hasHistory: runtimeHistory.some((point) => point.field === 'brightness'),
    staleRuntime: runtimeIsStale,
    missingSignals: rooms.some((room) => room.zones.length > 0) && confirmedLightFeedbackZoneKeys.length === 0 && systemMode === 'live',
  })
  const mediaConfidence = buildRuntimeConfidence({
    level: mediaPlayer.updatedAt > 0 ? 'høy' : initialRuntimeState.mediaPlayer ? 'middels' : 'lav',
    hasPollingFallback: false,
    restored: Boolean(initialRuntimeState.mediaPlayer),
    staleRuntime: false,
    missingSignals: false,
    fallbackText: 'Media bygger på siste kjente lokale spillerstatus.',
  })
  const presenceConfidence = buildRuntimeConfidence({
    level: houseConfidence.level === 'høy' && runtimeHistory.length > 0 ? 'høy' : houseConfidence.level,
    hasPollingFallback: hasPollingFallbackActive,
    restored: initialRuntimeState.restored,
    staleRuntime: runtimeIsStale,
    missingSignals: missingRuntimeSignals,
    fallbackText: 'Presence bygger på siste kjente aktivitet i huset.',
  })
  const getRoomConfidenceText = (room: Room) => {
    const hasRoomHistory = runtimeHistory.some((point) => point.roomKey === room.key)
    const hasLiveClimate = liveClimateTemperatureRoomKeys.includes(room.key) || liveClimateHeatDemandRoomKeys.includes(room.key)
    const hasLiveLight = room.zones.some((zone) => confirmedLightFeedbackZoneKeys.includes(zone.key))

    if (runtimeIsStale) {
      return 'Jeg bruker siste kjente state for rommet.'
    }

    if (hasLiveClimate || hasLiveLight) {
      return 'Rommet har stabile signaler akkurat nå.'
    }

    if (hasRoomHistory || initialRuntimeState.restored) {
      return 'Vurderingen bygger på siste kjente romhistorikk.'
    }

    return 'Jeg mangler fortsatt nok historikk for sikker vurdering.'
  }
  const getRoomRhythmInsight = (roomKey: string) =>
    dailyRhythmInsight.rooms.find((room) => room.roomKey === roomKey) ??
    dailyRhythmInsight.activeRoomsDay.find((room) => room.roomKey === roomKey) ??
    dailyRhythmInsight.activeRoomsHour.find((room) => room.roomKey === roomKey) ??
    null
  const serverRuntimeHistoryPointsForRooms = (serverRuntimeState.history?.points ?? [])
    .map((point): RuntimeHistoryPoint | null => {
      if (
        point.field !== 'temperature' &&
        point.field !== 'setpoint' &&
        point.field !== 'heatDemand' &&
        point.field !== 'brightness' &&
        !String(point.field).startsWith('customSignal:')
      ) {
        return null
      }

      if (!Number.isFinite(point.value)) {
        return null
      }

      return {
        timestamp: point.timestamp,
        at: point.at,
        roomKey: point.roomKey,
        zoneKey: point.zoneKey,
        field: point.field,
        value: point.value,
        source: point.source ?? 'server-history',
        category: point.category,
        confidence:
          point.restored ||
          ['derivedQuery', 'aggregate', 'roomSnapshotReference', 'frontendFallback', 'unknown'].includes(
            classifyRuntimeHistorySource(point),
          )
            ? 'low'
            : point.confidence,
        groupAddress: point.groupAddress ?? null,
        dpt: point.dpt ?? null,
        dataType: point.dataType ?? null,
        mappingVariant: point.mappingVariant ?? null,
        responseSource: point.responseSource ?? null,
        signalName: point.signalName ?? null,
        signalCategory: point.signalCategory ?? null,
        persisted: point.persisted,
        restored: point.restored,
      }
    })
    .filter((point): point is RuntimeHistoryPoint => Boolean(point))
  const liveServerRuntimeHistoryPointsForRooms = serverRuntimeHistoryPointsForRooms.filter(isLiveRuntimeHistoryPoint)
  const nonDerivedServerRuntimeHistoryPointsForRooms = serverRuntimeHistoryPointsForRooms.filter(
    (point) => !['derivedQuery', 'aggregate', 'frontendFallback', 'unknown'].includes(classifyRuntimeHistorySource(point)),
  )
  const liveLocalRuntimeHistory = runtimeAllowsMock
    ? runtimeHistory
    : runtimeHistory.filter(isLiveRuntimeHistoryPoint)
  const roomTruthHistory =
    liveServerRuntimeHistoryPointsForRooms.length > 0
      ? liveServerRuntimeHistoryPointsForRooms
      : nonDerivedServerRuntimeHistoryPointsForRooms.length > 0
        ? nonDerivedServerRuntimeHistoryPointsForRooms
        : liveLocalRuntimeHistory
  const getHistoryPoints = (
    roomKey: string,
    field: RuntimeHistoryField,
    zoneKey?: string,
  ) => getRuntimeHistoryPoints(roomTruthHistory, roomKey, field, zoneKey)
  const energyIntelligence: EnergyIntelligence = buildEnergyIntelligence({
    rooms: resolvedRooms,
    roomConfigs: savedSystemConfigData.rooms,
    history: roomTruthHistory,
    now: currentClock.getTime(),
  })
  const nivaProviderMaturitySummaries = (integrationManagerState.snapshot?.providers ?? []).map(
    (provider) => {
      const providerRecord = provider as Record<string, unknown>
      return {
        providerId: String(providerRecord.providerId ?? providerRecord.provider ?? providerRecord.id ?? ''),
        displayName: String(providerRecord.displayName ?? providerRecord.name ?? providerRecord.id ?? 'Provider'),
        maturity:
          typeof providerRecord.maturity === 'string'
            ? providerRecord.maturity
            : typeof providerRecord.status === 'string'
              ? providerRecord.status
              : null,
        foundationOnly: Boolean(providerRecord.foundationOnly),
        controlAvailable: Boolean(providerRecord.controlAvailable),
        runtimeConnected: Boolean(providerRecord.runtimeConnected),
      }
    },
  )
  const nivaObservationalIntelligence = buildNivaObservationalIntelligence({
    rooms: resolvedRooms,
    history: roomTruthHistory,
    now: currentClock.getTime(),
    explanationIntentCount: nivaExplanationIntentCount,
    roomPollStates: roomPollStateByKey,
    sourceDistribution: serverRuntimeState.history?.sourceDistribution,
    runtime: {
      knxLive: Boolean(
        bridgeHealth.snapshot?.lightSubscribeActive ||
          bridgeHealth.snapshot?.climateSubscribeActive ||
          lastLiveSignalAt,
      ),
      restoredOnly: Boolean(initialRuntimeState.restored && !lastLiveSignalAt),
      eventStreamReconnects: runtimeEventStreamState.reconnectCount,
      degradedEventStream: runtimeEventStreamState.degradedEventStream,
    },
    providers: nivaProviderMaturitySummaries,
    climateActiveRoomKeys: savedSystemConfigData.rooms
      .filter((room) => room.climate.active)
      .map((room) => room.key),
  })
  const pendingConversationalAction = [...nivaMessages]
    .reverse()
    .find(
      (message) =>
        message.role === 'niva' &&
        message.status === 'pending' &&
        Boolean(message.proposedAction) &&
        currentClock.getTime() - message.timestamp <=
          (message.proposedAction?.kind === 'calendar' ? calendarPendingTimeoutMs : 5 * 60 * 1000),
    )
  const calendarActionDiagnosticsRecords = calendarActionTrustRecords.map((record) => ({
    actionId: record.actionId,
    state: record.state,
    summary: record.summary,
    confidence: record.confidence,
    proposedAt: record.proposedAt,
    confirmedAt: record.confirmedAt,
    completedAt: record.completedAt,
    failedAt: record.failedAt,
    cancelledAt: record.cancelledAt,
    staleAt: record.staleAt,
    error: record.error,
    duplicatePrevented: record.duplicatePrevented,
    duplicateOf: record.duplicateOf,
    eventCount: record.events.length,
    events: record.events.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
    })),
  }))
  const snoozedNivaObservationCount = Object.values(dismissedNivaInsights).filter(
    (insight) => (insight.snoozedUntil ?? insight.until) > Date.now(),
  ).length
  const diagnosticsSnapshotWithNivaPresence = {
    ...diagnosticsSnapshot,
    nivaPresenceComfort,
    nivaObservationDiagnostics: {
      ...nivaObservationalIntelligence.diagnostics,
      actionButtonsEnabled: true,
      lastActionInvoked: lastNivaObservationAction,
      activeObservationCount: Math.max(
        0,
        nivaObservationalIntelligence.observations.length - snoozedNivaObservationCount,
      ),
      snoozedObservationCount: snoozedNivaObservationCount,
      conversationalFollowThrough: {
        pendingActionSummary: pendingConversationalAction?.proposedAction?.summary ?? null,
        pendingActionExpiresAt: pendingConversationalAction
          ? new Date(
              pendingConversationalAction.timestamp +
                (pendingConversationalAction.proposedAction?.kind === 'calendar'
                  ? calendarPendingTimeoutMs
                  : 5 * 60 * 1000),
            ).toISOString()
          : null,
        hits: nivaFollowThroughDiagnostics.hits,
        misses: nivaFollowThroughDiagnostics.misses,
        lastHitAt: nivaFollowThroughDiagnostics.lastHitAt,
        lastMissAt: nivaFollowThroughDiagnostics.lastMissAt,
      },
    },
    nivaInteractionDiagnostics,
    uiCapabilities: {
      summary: uiCapabilitySummary,
      capabilities: resolvedUiCapabilities,
      roomSummaries: roomCapabilitySummaries,
      showFutureFeatures: uiCapabilityConfig.showFutureFeatures,
      hclFoundationActive: hclUiFoundationActive,
      hclDryRun: uiCapabilityConfig.hcl.dryRun,
      shadingVisible: shadingUiEnabled,
    },
    calendarActionTrust: {
      pending: calendarActionTrustRecords.filter((record) => record.state === 'pendingConfirmation').length,
      queued: calendarActionTrustRecords.filter((record) => record.state === 'queued').length,
      creating: calendarActionTrustRecords.filter((record) => record.state === 'creating').length,
      created: calendarActionTrustRecords.filter((record) => record.state === 'created').length,
      failed: calendarActionTrustRecords.filter((record) => record.state === 'failed').length,
      cancelled: calendarActionTrustRecords.filter((record) => record.state === 'cancelled').length,
      stale: calendarActionTrustRecords.filter((record) => record.state === 'stale').length,
      duplicatePreventedCount:
        calendarDuplicatePreventedCount +
        calendarActionTrustRecords.filter((record) => record.duplicatePrevented).length,
      latestAction: calendarActionDiagnosticsRecords[0] ?? null,
      recentActions: calendarActionDiagnosticsRecords.slice(0, 6),
    },
    energyIntelligence,
  }
  const getRoomTemperatureHistoryInsight = (room: Room) =>
    getRoomTemperatureHistoryInsightFromHistory({
      history: roomTruthHistory,
      room,
      formatTemperature: formatNivaTemperature,
    })
  const getRoomTemperatureHistoryValues = (roomKey: string) =>
    getRuntimeHistoryValues(roomTruthHistory, roomKey, 'temperature', 16)
  const selectedTrendRoom =
    resolvedRooms.find((room) => room.key === selectedRoomKey) ?? resolvedRooms[0] ?? null
  const selectedTrendRoomTruthSummary = selectedTrendRoom
    ? canonicalRoomTruthByKey[selectedTrendRoom.key] ?? null
    : null
  const serverTrendRangeKey =
    trendHistoryRange === 'hour' ? 'lastHour' : trendHistoryRange === 'day' ? 'day' : 'week'
  const serverTrendRange = serverRuntimeState.history?.ranges?.[serverTrendRangeKey] ?? null
  const trendHistoryCutoff =
    serverTrendRange?.from ??
    (trendHistoryRange === 'hour'
      ? Date.now() - 60 * 60 * 1000
      : trendHistoryRange === 'day'
        ? Date.now() - 24 * 60 * 60 * 1000
        : Date.now() - 7 * 24 * 60 * 60 * 1000)
  const trendHistoryRangeEnd = serverTrendRange?.to ?? Date.now()
  const serverTrendPoints = (serverRuntimeState.history?.points ?? [])
    .filter((point) => point.timestamp >= trendHistoryCutoff && point.timestamp <= trendHistoryRangeEnd)
    .map((point): RuntimeHistoryPoint | null => {
      if (
        point.field !== 'temperature' &&
        point.field !== 'setpoint' &&
        point.field !== 'heatDemand' &&
        point.field !== 'brightness' &&
        !String(point.field).startsWith('customSignal:')
      ) {
        return null
      }

      if (!Number.isFinite(point.value)) {
        return null
      }

      return {
        timestamp: point.timestamp,
        at: point.at,
        roomKey: point.roomKey,
        zoneKey: point.zoneKey,
        field: point.field,
        value: point.value,
        source: point.source ?? 'server-history',
        category: point.category,
        confidence:
          point.restored ||
          ['derivedQuery', 'aggregate', 'roomSnapshotReference', 'frontendFallback', 'unknown'].includes(
            classifyRuntimeHistorySource(point),
          )
            ? 'low'
            : point.confidence,
        groupAddress: point.groupAddress ?? null,
        dpt: point.dpt ?? null,
        dataType: point.dataType ?? null,
        mappingVariant: point.mappingVariant ?? null,
        responseSource: point.responseSource ?? null,
        signalName: point.signalName ?? null,
        signalCategory: point.signalCategory ?? null,
        persisted: point.persisted,
        restored: point.restored,
      }
    })
    .filter((point): point is RuntimeHistoryPoint => Boolean(point))
  const trustedServerTrendPoints = serverTrendPoints.filter(
    (point) =>
      ![
        'derivedQuery',
        'aggregate',
        'frontendFallback',
        'roomSnapshotReference',
        'demo',
        'simulate',
        'unknown',
      ].includes(classifyRuntimeHistorySource(point)),
  )
  const serverTrendHasPoints = trustedServerTrendPoints.length > 0
  const trendHistorySource = serverTrendHasPoints ? trustedServerTrendPoints : liveLocalRuntimeHistory
  const trendHistorySourceDistribution = getRuntimeHistorySourceDistribution(trendHistorySource)
  const trendHistoryHasRestoredPoints = serverTrendPoints.some((point) => point.restored)
  const trendHistoryLiveSourceCount =
    trendHistorySourceDistribution.liveKnx +
    trendHistorySourceDistribution.manualPoll +
    trendHistorySourceDistribution.groupValueResponse
  const trendHistorySourceLabel = serverTrendHasPoints
    ? trendHistoryHasRestoredPoints || trendHistorySourceDistribution.restoredHistory > 0
      ? 'Server-history · restored'
      : trendHistoryLiveSourceCount > 0
        ? 'Server-history · live'
        : 'Server-history · restored'
    : 'Lokal fallback'
  const trendHistoryDensityCount = selectedTrendRoom
    ? trendHistorySource.filter(
        (point) =>
          point.roomKey === selectedTrendRoom.key &&
          point.timestamp >= trendHistoryCutoff &&
          point.timestamp <= trendHistoryRangeEnd,
      ).length
    : 0
  const trendHistoryDensityLabel =
    trendHistoryDensityCount === 0
      ? 'Sparse: ingen punkter'
      : trendHistoryDensityCount === 1
        ? 'Sparse: 1 punkt'
        : `${trendHistoryDensityCount} punkter`
  const getTrendHistoryPoints = (
    roomKey: string,
    field: RuntimeHistoryField,
    zoneKey?: string,
  ) =>
    trendHistorySource.filter(
      (point) =>
        point.roomKey === roomKey &&
        point.field === field &&
        (zoneKey ? point.zoneKey === zoneKey : true) &&
        point.timestamp >= trendHistoryCutoff &&
        point.timestamp <= trendHistoryRangeEnd,
    )
  const selectedTrendTemperaturePoints = selectedTrendRoom
    ? getTrendHistoryPoints(selectedTrendRoom.key, 'temperature')
    : []
  const selectedTrendSetpointPoints = selectedTrendRoom
    ? getTrendHistoryPoints(selectedTrendRoom.key, 'setpoint')
    : []
  const selectedTrendHeatDemandPoints = selectedTrendRoom
    ? getTrendHistoryPoints(selectedTrendRoom.key, 'heatDemand')
    : []
  const selectedTrendLightZoneSeries = selectedTrendRoom
    ? buildLightZoneHistorySeries({
        roomKey: selectedTrendRoom.key,
        zones: selectedTrendRoom.zones,
        history: getTrendHistoryPoints(selectedTrendRoom.key, 'brightness'),
      })
    : []
  const selectedTrendBrightnessPoints = buildRoomBrightnessAveragePoints(selectedTrendLightZoneSeries)
  const selectedTrendCustomSignalPoints = selectedTrendRoom
    ? trendHistorySource.filter(
        (point) =>
          point.roomKey === selectedTrendRoom.key &&
          String(point.field).startsWith('customSignal:') &&
          point.timestamp >= trendHistoryCutoff &&
          point.timestamp <= trendHistoryRangeEnd,
      )
    : []
  const getRoomReport = (room: Room, config: SystemRoomConfig | undefined): RoomReport =>
    buildNivaRoomReport({
      room,
      config,
      heatDemandPoints: getHistoryPoints(room.key, 'heatDemand'),
      temperatureTrend: getRoomTemperatureHistoryInsight(room)?.trend,
      intelligenceText: getRoomRhythmInsight(room.key)?.observation,
      comfortText: comfortEnergyInsight.rooms.find((comfortRoom) => comfortRoom.roomKey === room.key)?.comfortLine,
      confidenceText: getRoomConfidenceText(room),
      formatTemperature: formatNivaTemperature,
    })
  const selectedFocusRoom =
    activeMainView === 'rooms'
      ? visibleRooms.find((room) => room.key === selectedRoomKey) ?? visibleRooms[0] ?? null
      : null
  const selectedRoomManagerConfig =
    activeMainView === 'room-manager'
      ? systemConfigData.rooms.find((room) => room.key === selectedRoomKey) ??
        systemConfigData.rooms[0] ??
        null
      : null
  const selectedFocusRoomConfig: SystemRoomConfig | undefined = selectedFocusRoom
    ? systemConfigData.rooms.find((room) => room.key === selectedFocusRoom.key)
    : undefined
  const selectedFocusRoomMapping = selectedFocusRoom ? lightingConfig[selectedFocusRoom.key] : undefined
  const selectedFocusRoomHasClimate = Boolean(selectedFocusRoomMapping?.climateActive)
  const selectedFocusRoomHasLiveTemperature =
    runtimeAllowsMock ||
    (selectedFocusRoom ? liveClimateTemperatureRoomKeys.includes(selectedFocusRoom.key) : false)
  const selectedFocusRoomHasLiveSetpoint =
    runtimeAllowsMock ||
    (selectedFocusRoom ? liveClimateSetpointRoomKeys.includes(selectedFocusRoom.key) : false)
  const selectedFocusRoomHasLiveHeatDemand =
    runtimeAllowsMock ||
    (selectedFocusRoom ? liveClimateHeatDemandRoomKeys.includes(selectedFocusRoom.key) : false)
  const selectedFocusRoomTemperature =
    selectedFocusRoom && selectedFocusRoomHasClimate && selectedFocusRoomHasLiveTemperature
      ? `${selectedFocusRoom.temperature}°C`
      : '—'
  const selectedFocusRoomSetpoint =
    selectedFocusRoom && selectedFocusRoomHasClimate && selectedFocusRoomHasLiveSetpoint
      ? `${roundToHalf(selectedFocusRoom.targetTemperature).toString().replace('.', ',')}°C`
      : '—'
  const selectedFocusRoomHeatDemand =
    selectedFocusRoom && selectedFocusRoomHasClimate && selectedFocusRoomHasLiveHeatDemand
      ? getHeatDemandBars(selectedFocusRoom.heatDemand)
      : '—'
  const selectedFocusRoomActiveZones =
    selectedFocusRoom?.zones.filter((zone) => zone.lightsOn) ?? []
  const selectedFocusRoomLightStatus = selectedFocusRoom
    ? selectedFocusRoom.zones.length === 0
      ? 'Ingen soner'
      : selectedFocusRoomActiveZones.length === 0
        ? 'Av'
        : `${selectedFocusRoomActiveZones.length} på`
    : '—'
  const selectedFocusRoomBrightnessStatus =
    selectedFocusRoomActiveZones.length > 0
      ? selectedFocusRoomActiveZones
          .slice(0, 3)
          .map((zone) => `${zone.name} ${zone.brightness}%`)
          .join(' · ')
      : selectedFocusRoom?.zones.length
        ? '0%'
        : '—'
  const selectedFocusRoomHistoryInsight = selectedFocusRoom
    ? getRoomTemperatureHistoryInsight(selectedFocusRoom)
    : null
  const selectedFocusRoomRhythmInsight = selectedFocusRoom
    ? getRoomRhythmInsight(selectedFocusRoom.key)
    : null
  const selectedFocusRoomHistoryValues = selectedFocusRoom
    ? getRoomTemperatureHistoryValues(selectedFocusRoom.key)
    : []
  const selectedFocusRoomVolume = getRoomConfiguredVolume(selectedFocusRoomConfig)
  const selectedFocusRoomHeatNeedAnalysis =
    selectedFocusRoom && selectedFocusRoomHasClimate
      ? getRoomHeatNeedAnalysis(
          selectedFocusRoomConfig,
          getHistoryPoints(selectedFocusRoom.key, 'heatDemand'),
          selectedFocusRoomHasLiveTemperature ? selectedFocusRoom.temperature : undefined,
          selectedFocusRoomHasLiveSetpoint ? selectedFocusRoom.targetTemperature : undefined,
        )
      : null
  const selectedFocusRoomReport = selectedFocusRoom
    ? getRoomReport(selectedFocusRoom, selectedFocusRoomConfig)
    : null
  const selectedFocusRoomReportAction =
    selectedFocusRoom && selectedFocusRoomReport
      ? getRoomReportProposedAction(
          selectedFocusRoom,
          selectedFocusRoomConfig,
          selectedFocusRoomReport,
        )
      : undefined
  const selectedFocusRoomHasPendingNivaAction = selectedFocusRoomReportAction
    ? nivaMessages.some(
        (message) =>
          message.status === 'pending' &&
          message.proposedAction?.summary === selectedFocusRoomReportAction.summary,
      )
    : false
  const selectedFocusRoomVolumeLabel =
    typeof selectedFocusRoomVolume === 'number'
      ? `${Number(selectedFocusRoomVolume.toFixed(1)).toString().replace('.', ',')} m³`
      : 'Venter på data'
  const selectedFocusRoomAnalysisBasisLabel =
    typeof selectedFocusRoomVolume === 'number'
      ? `Romvolum: ${selectedFocusRoomVolumeLabel}`
      : 'Venter på romdata for varmebehovsanalyse'
  const selectedFocusRoomNivaLine = (() => {
    if (!selectedFocusRoom) {
      return ''
    }

    if (
      selectedFocusRoomHasClimate &&
      selectedFocusRoomHasLiveHeatDemand &&
      typeof selectedFocusRoom.heatDemand === 'number' &&
      selectedFocusRoom.heatDemand >= 40
    ) {
      return `NIVA: ${selectedFocusRoom.name} ${getHeatDemandText(selectedFocusRoom.heatDemand)} nå.`
    }

    if (selectedFocusRoomHasClimate && selectedFocusRoomHasLiveTemperature) {
      const status =
        selectedFocusRoomHasLiveSetpoint &&
        Math.abs(selectedFocusRoom.temperature - selectedFocusRoom.targetTemperature) <= targetTolerance
          ? 'stabil'
          : selectedFocusRoom.temperature < selectedFocusRoom.targetTemperature
            ? 'under settpunkt'
            : 'stabil'

      return `NIVA: ${selectedFocusRoom.name} er ${status} på ${selectedFocusRoom.temperature}°C.`
    }

    if (selectedFocusRoomRhythmInsight?.observation) {
      return `NIVA: ${selectedFocusRoomRhythmInsight.observation}`
    }

    if (selectedFocusRoomActiveZones.length > 0) {
      return `NIVA: ${selectedFocusRoom.name} har ${selectedFocusRoomActiveZones.length} lyssoner på.`
    }

    return `NIVA: ${selectedFocusRoom.name} ser stabilt ut akkurat nå.`
  })()
  const handleCreateSelectedRoomNivaProposal = () => {
    if (!selectedFocusRoom || !selectedFocusRoomReportAction || selectedFocusRoomHasPendingNivaAction) {
      return
    }

    pulseNivaProcessing()

    const now = Date.now()
    const text =
      selectedFocusRoomReportAction.kind === 'climateSetpoint'
        ? `Jeg kan justere temperaturen litt i ${selectedFocusRoom.name} hvis du vil.`
        : selectedFocusRoomReportAction.kind === 'roomLightsOff'
          ? `Jeg kan slå av lys i ${selectedFocusRoom.name} hvis du vil.`
          : `Jeg kan sette ${selectedFocusRoom.name} i nattmodus hvis du vil.`

    setNivaMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `niva-room-proposal-${selectedFocusRoom.key}-${now}`,
        timestamp: now,
        role: 'niva',
        text,
        type: 'response',
        status: 'pending',
        intent: selectedFocusRoomReportAction.kind === 'roomLightsOff' ? 'light' : 'climate',
        proposedAction: selectedFocusRoomReportAction,
      },
    ])
    appendTestLog('NIVA forslag', selectedFocusRoomReportAction.summary)
    setIsNivaPanelOpen(true)
  }
  const liveErrorMessage =
    systemMode === 'live' && (!isFeedbackUnavailableMessage || hasActiveFeedbackUnavailableStatus)
      ? errorMessage
      : ''
  const runtimeContinuityLabel =
    runtimeEventStreamState.connectionState === 'synced' && runtimeEventStreamState.frontendFreshness === 'fresh'
      ? 'Synket nå'
      : runtimeEventStreamState.connectionState === 'connecting'
        ? 'Kobler til runtime'
        : runtimeEventStreamState.connectionState === 'reconnecting'
          ? 'Oppdaterer tilkobling'
          : runtimeEventStreamState.connectionState === 'offline'
            ? 'Viser sist kjente data'
            : 'Venter på ferske signaler'
  const runtimeContinuityNotice =
    runtimeEventStreamState.connectionState === 'reconnecting'
      ? 'Oppdaterer tilkobling rolig. Viser sist kjente data imens.'
      : runtimeEventStreamState.connectionState === 'stale'
        ? `Venter på ny runtime-hendelse. Sist synket ${
            runtimeEventStreamState.lastSuccessfulSyncAt
              ? formatShortRelativeTime(runtimeEventStreamState.lastSuccessfulSyncAt)
              : 'ukjent'
          }.`
        : runtimeEventStreamState.connectionState === 'offline'
          ? 'Viser sist kjente data. Noen sanntidssignaler er forsinket til tilkoblingen er tilbake.'
          : ''
  const enabledScenes = scenesConfig.filter((scene) => scene.enabled)
  const homeModeScenes = enabledScenes.filter((scene) => {
    const normalizedName = scene.name.trim().toLowerCase()
    return normalizedName !== 'hjemme' && normalizedName !== 'borte'
  })
  const homeClockLabel = formatHomeClock(currentClock)
  const customerSystemLabel =
    bridgeRuntimeStatus === 'ready'
      ? ambientRuntimeCopy.homeActive
      : bridgeRuntimeStatus === 'syncing'
        ? ambientRuntimeCopy.preparing
        : ambientRuntimeCopy.gentleWatch
  const customerConnectionLabel =
    networkConfig.connectionMode === 'localDirect' ? 'Kjører lokalt' : 'Fjerntilgang'
  const runtimeFreshnessLabel = formatRuntimeFreshness(lastRuntimeSnapshotAt, currentClock.getTime())
  const runtimeFeedbackLabel =
    feedbackStrategyLabel === 'off'
      ? runtimeHistory.length > 0
        ? ambientRuntimeCopy.lastKnown
        : ambientRuntimeCopy.preparing
      : feedbackStrategyLabel === 'subscribe'
        ? ambientRuntimeCopy.systemsAvailable
        : 'Jevnlig oppdatert'
  const customerFeedbackLabel =
    feedbackStrategyLabel === 'subscribe' || feedbackStrategyLabel === 'polling'
      ? runtimeFeedbackLabel
      : houseConfidence.summary
  const readinessStatusLabel =
    bridgeRuntimeStatus === 'ready' && houseConfidence.level === 'høy'
      ? 'Stabilt'
      : bridgeRuntimeStatus === 'ready' && houseConfidence.level === 'middels'
        ? ambientRuntimeCopy.gentleWatch
        : ambientRuntimeCopy.preparing
  const readinessLines = [
    bridgeRuntimeStatus === 'ready'
      ? houseConfidence.level === 'høy'
        ? 'Huset svarer med ferske signaler'
        : 'Huset holder siste kjente rytme'
      : 'Systemet forbereder signalene',
    bridgeHealth.reachable === false
      ? 'Bridge er ikke tilgjengelig akkurat nå'
      : bridgeRuntimeStatus === 'ready'
        ? 'Bridge er tilgjengelig'
        : 'Bridge avklares',
    `Tillit: ${houseConfidence.label.toLowerCase()}`,
    `${runtimeFreshnessLabel}`,
    liveClimateTemperatureRoomKeys.length > 0
      ? 'Temperatur-feedback aktiv'
      : runtimeAllowsMock
        ? `${runtimeModeLabel}: temperatur kan bruke demo/dev-state`
        : 'Temperatur holder siste kjente verdi',
    heatDemandRuntimeStatus.detail,
    feedbackStrategyLabel === 'off'
      ? 'Enkelte signaler bruker siste kjente state'
      : `${runtimeFeedbackLabel}`,
    runtimeHistory.length > 0 ? 'Historikken følger huset' : 'Historikken begynner å bygges',
    initialRuntimeState.restored ? 'Siste runtime er hentet tilbake' : 'Runtime starter friskt',
    initialHouseMemoryState.restored ? 'Husets rytme er hentet tilbake' : 'Huset bygger erfaring',
    houseConfidence.readiness,
  ]
  const nextTodayPreviewEvent =
    todayActivities.find((event) => {
      const [hours, minutes] = event.startTime.split(':').map(Number)

      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return false
      }

      const eventDate = new Date(currentClock)
      eventDate.setHours(hours, minutes, 0, 0)
      return eventDate >= currentClock
    }) ?? todayActivities[0] ?? null
  const tomorrowPreviewEvent = tomorrowActivities[0] ?? null
  const homeCalendarPrimaryEvent = nextTodayPreviewEvent ?? tomorrowPreviewEvent
  const nivaHouseSnapshot = buildNivaHouseSnapshot({
    rooms: resolvedRooms,
    homeStatus,
    systemMode,
    bridgeStatusLabel,
    bridgeReady: bridgeRuntimeStatus === 'ready',
    connectionMode: networkConfig.connectionMode,
    mediaPlayer,
    currentMediaTrack,
    activeMediaDevice,
    weatherAwareness,
    todayCount: todayActivities.length,
    nextEventText: homeCalendarPrimaryEvent ? formatCalendarEventLine(homeCalendarPrimaryEvent) : null,
    presence: displayedHousePresence,
    historyPointCount: runtimeHistory.length,
  })
  useEffect(() => {
    console.debug('[NIVA] Global house snapshot', nivaHouseSnapshot.diagnostics)
  }, [
    nivaHouseSnapshot.diagnostics.roomCount,
    nivaHouseSnapshot.diagnostics.roomsWithTemperatureCount,
    nivaHouseSnapshot.diagnostics.roomsWithLightDataCount,
    nivaHouseSnapshot.diagnostics.roomsWithHeatDemandCount,
    nivaHouseSnapshot.diagnostics.historyPointCount,
  ])
  useEffect(() => {
    setLastRuntimeSnapshotAt(Date.now())
  }, [
    homeStatus,
    bridgeRuntimeStatus,
    mediaPlayer.currentTrackId,
    mediaPlayer.isPlaying,
    mediaPlayer.volume,
    mediaPlayer.activeDeviceId,
    weatherUpdatedAt,
  ])
  const runtimePersistenceRoomSignature = rooms
    .map((room) => {
      const zoneSignature = room.zones
        .map((zone) => `${zone.key}:${zone.lightsOn ? 1 : 0}:${zone.brightness}`)
        .join(',')

      return [
        room.key,
        room.temperature,
        room.targetTemperature,
        room.heatDemand ?? 'none',
        room.mode,
        zoneSignature,
      ].join(':')
    })
    .join('|')
  const mediaPersistenceElapsedBucket = Math.floor(mediaPlayer.elapsed / 10)

  useEffect(() => {
    setLastMeaningfulChangeAt(Date.now())
  }, [
    homeStatus,
    mediaPlayer.currentTrackId,
    mediaPlayer.isPlaying,
    runtimePersistenceRoomSignature,
  ])

  useEffect(() => {
    persistRuntimeState({
      version: 1,
      savedAt: Date.now(),
      runtimeHistory,
      houseSnapshot: nivaHouseSnapshot,
      presence: displayedHousePresence,
      mediaPlayer,
      trendState: {
        selectedRoomKey,
        range: trendHistoryRange,
      },
    })
  }, [
    runtimeHistory,
    runtimePersistenceRoomSignature,
    displayedHousePresence.state,
    displayedHousePresence.label,
    displayedHousePresence.nivaSummary,
    houseConfidence.level,
    adaptiveQuietMode,
    homeStatus,
    bridgeRuntimeStatus,
    mediaPlayer.currentTrackId,
    mediaPlayer.volume,
    mediaPlayer.activeDeviceId,
    mediaPersistenceElapsedBucket,
    lastRuntimeSnapshotAt,
    lastLiveSignalAt,
    selectedRoomKey,
    trendHistoryRange,
    weatherUpdatedAt,
  ])
  const showSceneModule = homeModeScenes.length > 0
  const lastMoodSceneActivation =
    lastSceneActivation && homeModeScenes.some((scene) => scene.id === lastSceneActivation.sceneId)
      ? lastSceneActivation
      : null
  const serverNivaInsights = (serverRuntimeState.insights?.insights ?? [])
    .filter((insight) => insight.confidence !== 'low' || insight.severity !== 'low')
    .slice(0, 3)
    .map(mapServerInsightToNivaInsight)
  const observationalNivaInsights = nivaObservationalIntelligence.observations
    .filter((observation) => observation.category !== 'providerFoundation')
    .slice(0, 3)
    .map((observation): NivaInsight => {
      const insight = mapNivaObservationToInsight(observation)

      if (
        observation.relatedRoomKey &&
        ['staleSignal', 'pollTimeout', 'temperatureDrop', 'unmetSetpoint', 'heatWhileCooling'].includes(
          observation.category,
        )
      ) {
        const roomKey = observation.relatedRoomKey
        return {
          ...insight,
          actionLabel: 'Hent verdier',
          onAction: () => {
            setLastNivaObservationAction({
              label: 'Hent verdier',
              roomKey,
              invokedAt: new Date().toISOString(),
            })
            void handlePollRoomValues(roomKey)
          },
        }
      }

      if (observation.relatedRoomKey) {
        const roomKey = observation.relatedRoomKey
        return {
          ...insight,
          actionLabel: 'Åpne trend',
          onAction: () => {
            setLastNivaObservationAction({
              label: 'Åpne trend',
              roomKey,
              invokedAt: new Date().toISOString(),
            })
            handleOpenTrendHistory(roomKey)
          },
        }
      }

      return {
        ...insight,
        actionLabel: 'Vis diagnose',
        onAction: () => {
          setLastNivaObservationAction({
            label: 'Vis diagnose',
            roomKey: null,
            invokedAt: new Date().toISOString(),
          })
          setActiveMainView('manager')
        },
      }
    })
  const energyNivaInsights = energyIntelligence.observations
    .filter((observation) => observation.category !== 'vacationPatternCandidate' || observation.confidence !== 'none')
    .slice(0, 2)
    .map((observation): NivaInsight => {
      const insight = mapEnergyObservationToNivaInsight(observation)

      if (observation.relatedRoomKey) {
        const roomKey = observation.relatedRoomKey
        return {
          ...insight,
          actionLabel: 'Åpne trend',
          onAction: () => {
            setLastNivaObservationAction({
              label: 'Åpne trend',
              roomKey,
              invokedAt: new Date().toISOString(),
            })
            handleOpenTrendHistory(roomKey)
          },
        }
      }

      return {
        ...insight,
        actionLabel: 'Vis diagnose',
        onAction: () => {
          setLastNivaObservationAction({
            label: 'Vis energidiagnose',
            roomKey: null,
            invokedAt: new Date().toISOString(),
          })
          setActiveMainView('manager')
        },
      }
    })
  const nivaInsights: NivaInsight[] = (() => {
    const insights: NivaInsight[] = [...observationalNivaInsights, ...energyNivaInsights, ...serverNivaInsights]
    const usageByScene = sceneUsageHistory.reduce<Record<string, SceneUsageEntry[]>>((acc, entry) => {
      acc[entry.sceneId] = [...(acc[entry.sceneId] ?? []), entry]
      return acc
    }, {})
    const morningScene = getSceneByName(enabledScenes, 'Morgen')
    const eveningScene = getSceneByName(enabledScenes, 'Kveld')
    const nightScene = getSceneByName(enabledScenes, 'Natt')
    const awayScene = getSceneByName(enabledScenes, 'Borte')
    const currentHour = currentClock.getHours()
    const dayBucket = formatTimeOfDayBucket(currentHour)

    const nextTodayEvent =
      todayActivities.find((event) => {
        const [hours, minutes] = event.startTime.split(':').map(Number)

        if (Number.isNaN(hours) || Number.isNaN(minutes)) {
          return false
        }

        const eventDate = new Date(currentClock)
        eventDate.setHours(hours, minutes, 0, 0)
        return eventDate >= currentClock
      }) ?? todayActivities[0] ?? null

    for (const scene of enabledScenes) {
      const usage = usageByScene[scene.id] ?? []

      if (usage.length >= 3 && !scene.triggerTime) {
        const averageMinutes =
          usage.reduce((sum, entry) => {
            const date = new Date(entry.triggeredAt)
            return sum + date.getHours() * 60 + date.getMinutes()
          }, 0) / usage.length
        const suggestedTime = formatSuggestedTime(averageMinutes)

        insights.push({
          id: `scene-time-${scene.id}`,
          title: `${scene.name} kommer ofte tilbake`,
          detail: `Jeg ser et mønster rundt ${suggestedTime}. Vil du gjøre det automatisk?`,
          reason: 'Basert på bruksmønster',
          actionLabel: 'Aktiver automatisk',
          onAction: () => handleApplySceneTriggerTime(scene.id, suggestedTime),
          dismissLabel: 'Ikke nå',
          contextKey: `${scene.id}:${usage.length}:${suggestedTime}`,
          dismissUntilMs: 8 * 60 * 60 * 1000,
        })
      }
    }

    if (dayBucket === 'morgen' && morningScene && !morningScene.triggerTime) {
      insights.push({
        id: 'morning-scene',
        title: 'Morgen kan gå av seg selv',
        detail: 'Sett et fast tidspunkt, så er hjemmet klart før dagen starter.',
        reason: 'Basert på tid på døgnet',
        actionLabel: 'Sett 06:45',
        onAction: () => handleApplySceneTriggerTime(morningScene.id, '06:45'),
        dismissLabel: 'Ikke nå',
        contextKey: `morning:${dayBucket}:${morningScene.id}`,
        dismissUntilMs: 4 * 60 * 60 * 1000,
      })
    }

    if (dayBucket === 'kveld' && eveningScene && !eveningScene.triggerTime) {
      insights.push({
        id: 'evening-scene',
        title: 'Kvelden har lav aktivitet',
        detail: 'Et fast tidspunkt kan gjøre overgangen til kveld enda enklere.',
        reason: 'Basert på tid på døgnet',
        actionLabel: 'Sett 21:00',
        onAction: () => handleApplySceneTriggerTime(eveningScene.id, '21:00'),
        dismissLabel: 'Ikke nå',
        contextKey: `evening:${dayBucket}:${eveningScene.id}`,
        dismissUntilMs: 4 * 60 * 60 * 1000,
      })
    }

    if (
      nextTodayEvent &&
      awayScene &&
      !awayScene.triggerTime &&
      nextTodayEvent.place.trim() !== ''
    ) {
      const [hours, minutes] = nextTodayEvent.startTime.split(':').map(Number)

      if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
        const suggestedMinutes = Math.max(0, hours * 60 + minutes - 30)
        const suggestedTime = formatSuggestedTime(suggestedMinutes)

        insights.push({
          id: 'calendar-away-today',
          title: 'Du skal snart videre i dag',
          detail: `${nextTodayEvent.title}${nextTodayEvent.person ? ` for ${nextTodayEvent.person}` : ''} kan få en enklere start med Borte før dere drar.`,
          reason: 'Basert på kalender i dag',
          actionLabel: 'Bruk denne scenen',
          onAction: () => handleApplySceneTriggerTime(awayScene.id, suggestedTime),
          dismissLabel: 'Ikke nå',
          contextKey: `${nextTodayEvent.id}:${awayScene.id}:${suggestedTime}`,
          dismissUntilMs: 3 * 60 * 60 * 1000,
        })
      }
    }

    if (tomorrowPreviewEvent && morningScene && !morningScene.triggerTime) {
      const [hours, minutes] = tomorrowPreviewEvent.startTime.split(':').map(Number)

      if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
        const suggestedMinutes = Math.max(0, hours * 60 + minutes - 45)
        const suggestedTime = formatSuggestedTime(suggestedMinutes)

        insights.push({
          id: 'calendar-morning',
          title: 'I morgen begynner tidlig',
          detail: `${tomorrowPreviewEvent.title}${tomorrowPreviewEvent.person ? ` for ${tomorrowPreviewEvent.person}` : ''} starter ${tomorrowPreviewEvent.startTime}. Morgen kan gjøre hjemmet klart litt før.`,
          reason: 'Basert på kalender i morgen',
          actionLabel: 'Aktiver automatisk',
          onAction: () => handleApplySceneTriggerTime(morningScene.id, suggestedTime),
          dismissLabel: 'Ikke nå',
          contextKey: `${tomorrowPreviewEvent.id}:${morningScene.id}:${suggestedTime}`,
          dismissUntilMs: 12 * 60 * 60 * 1000,
        })
      }
    }

    if (tomorrowPreviewEvent && nightScene && !nightScene.triggerTime) {
      const [hours] = tomorrowPreviewEvent.startTime.split(':').map(Number)

      if (!Number.isNaN(hours) && hours <= 7) {
        insights.push({
          id: 'calendar-night',
          title: 'I morgen starter tidlig',
          detail: 'En Natt-scene kan hjelpe huset over i kveld litt tidligere.',
          reason: 'Basert på kalender i morgen',
          actionLabel: 'Sett 22:00',
          onAction: () => handleApplySceneTriggerTime(nightScene.id, '22:00'),
          dismissLabel: 'Ikke nå',
          contextKey: `${tomorrowPreviewEvent.id}:${nightScene.id}:22:00`,
          dismissUntilMs: 12 * 60 * 60 * 1000,
        })
      }
    }

    if (tomorrowPreviewEvent && !morningScene && !nightScene) {
      insights.push({
        id: 'calendar-tomorrow',
        title: 'I morgen er allerede i gang',
        detail: `Det skjer noe kl. ${tomorrowPreviewEvent.startTime}. Kanskje hjemmet bør være klart litt før.`,
        reason: 'Basert på kalender i morgen',
        dismissLabel: 'Skjul',
        contextKey: `${tomorrowPreviewEvent.id}:calendar-tomorrow`,
        dismissUntilMs: 12 * 60 * 60 * 1000,
      })
    }

    const upcomingBookingWithScene =
      bookings
        .filter((booking) => {
          const resource = bookingResources.find((item) => item.id === booking.resourceId)
          return Boolean(resource?.sceneId)
        })
        .sort((a, b) =>
          `${a.date}${a.startTime}${a.title}`.localeCompare(`${b.date}${b.startTime}${b.title}`),
        )[0] ?? null

    if (upcomingBookingWithScene) {
      const resource = bookingResources.find((item) => item.id === upcomingBookingWithScene.resourceId)
      const linkedScene = resource?.sceneId
        ? scenesConfig.find((scene) => scene.id === resource.sceneId)
        : null

      if (resource && linkedScene) {
        insights.push({
          id: `booking-scene-${upcomingBookingWithScene.id}`,
          title: `${resource?.name ?? 'Bookingen'} kan få en enklere start`,
          detail: `${upcomingBookingWithScene.title} er koblet til ${linkedScene.name}. Du kan bruke scenen når det passer.`,
          reason: 'Basert på booking og ressurskobling',
          actionLabel: 'Bruk denne scenen',
          onAction: () => void handleActivateScene(linkedScene.id),
          dismissLabel: 'Ikke nå',
          contextKey: `${upcomingBookingWithScene.id}:${linkedScene.id}:${upcomingBookingWithScene.date}:${upcomingBookingWithScene.startTime}`,
          dismissUntilMs: 6 * 60 * 60 * 1000,
        })
      }
    }

    const upcomingBookingWithRoom =
      bookings
        .filter((booking) => {
          const resource = bookingResources.find((item) => item.id === booking.resourceId)
          return Boolean(resource?.roomKey) && Boolean(resource?.climateRelevant)
        })
        .sort((a, b) =>
          `${a.date}${a.startTime}${a.title}`.localeCompare(`${b.date}${b.startTime}${b.title}`),
        )[0] ?? null

    if (upcomingBookingWithRoom) {
      const resource = bookingResources.find((item) => item.id === upcomingBookingWithRoom.resourceId)

      if (resource?.roomKey) {
        const room = rooms.find((item) => item.key === resource.roomKey)

        insights.push({
          id: `booking-room-${upcomingBookingWithRoom.id}`,
          title: `${resource.name} kan forberedes i god tid`,
          detail: `${upcomingBookingWithRoom.title}${room ? ` bruker ${room.name}` : ''}. Du kan åpne rommet og gjøre det klart før start.`,
          reason: 'Basert på booking og romkobling',
          actionLabel: 'Forbered rommet',
          onAction: () => focusRoomForBooking(resource.roomKey),
          dismissLabel: 'Ikke nå',
          contextKey: `${upcomingBookingWithRoom.id}:${resource.roomKey}:${upcomingBookingWithRoom.date}:${upcomingBookingWithRoom.startTime}`,
          dismissUntilMs: 6 * 60 * 60 * 1000,
        })
      }
    }

    if (runtimeAllowsMock && roomsUnderSetpointCount >= 2) {
      insights.push({
        id: 'climate-under-target',
        title: 'Huset bruker litt tid på å ta igjen varmen',
        detail: `${roomsUnderSetpointCount} rom ligger fortsatt under settpunkt.`,
        reason: 'Basert på klima akkurat nå',
        dismissLabel: 'Skjul',
        contextKey: `climate:${roomsUnderSetpointCount}`,
        dismissUntilMs: 6 * 60 * 60 * 1000,
      })
    }

    if (lightsOnCount >= 4 && currentHour >= 22) {
      insights.push({
        id: 'late-lights',
        title: 'Det er fortsatt mye lys på sent',
        detail: 'Natt eller Borte kan samle det siste lyset i én overgang.',
        reason: 'Basert på lys akkurat nå',
        dismissLabel: 'Skjul',
        contextKey: `lights:${lightsOnCount}:${currentHour}`,
        dismissUntilMs: 4 * 60 * 60 * 1000,
      })
    }

    return insights
      .filter((insight) => {
        const dismissedInsight = dismissedNivaInsights[insight.id]

        if (!dismissedInsight || !insight.contextKey) {
          return true
        }

        const stillDismissed =
          dismissedInsight.contextKey === insight.contextKey &&
          dismissedInsight.until > Date.now()

        return !stillDismissed
      })
      .slice(0, 3)
  })()
  const homeNivaInsights = adaptiveQuietMode ? [] : nivaInsights.slice(0, 2)
  const nivaMainState = (() => {
    if (nivaDiagnosticInsight.hasIssue) {
      return {
        message: nivaDiagnosticInsight.message,
        tone: 'warning' as const,
      }
    }

    if (bridgeRuntimeStatus === 'error' || liveErrorMessage) {
      return {
        message: liveErrorMessage
          ? `Jeg ser noe som bør sjekkes: ${liveErrorMessage}`
          : 'Jeg ser noe som bør sjekkes i tilkoblingen.',
        tone: 'warning' as const,
      }
    }

    if (weatherAwareness.alert) {
      return {
        message: weatherAwareness.alert.message,
        tone: weatherAwareness.alert.tone,
      }
    }

    if (primaryHeatDemandRoom && typeof primaryHeatDemandRoom.heatDemand === 'number') {
      return {
        message: `${primaryHeatDemandRoom.name} holder ${primaryHeatDemandRoom.temperature}°C og ${getHeatDemandText(primaryHeatDemandRoom.heatDemand)} nå.`,
        tone: 'active' as const,
      }
    }

    if (
      displayedHousePresence.state !== 'quiet' ||
      displayedHousePresence.activeRoomNames.length > 0 ||
      mediaPlayer.isPlaying
    ) {
      return {
        message: adaptiveQuietMode
          ? getQuietHousePhrase(currentClock.getHours() + currentClock.getDate())
          : homeAwarenessSummary.mainLine,
        tone:
          displayedHousePresence.state === 'storm' || displayedHousePresence.state === 'lateActivity'
            ? ('warning' as const)
            : displayedHousePresence.state === 'active' || displayedHousePresence.state === 'activeAfternoon'
              ? ('active' as const)
              : ('calm' as const),
      }
    }

    if (homeCalendarPrimaryEvent) {
      return {
        message: `Neste aktivitet er ${formatCalendarEventLine(homeCalendarPrimaryEvent)}.`,
        tone: 'active' as const,
      }
    }

    return {
      message:
        bridgeRuntimeStatus === 'ready'
          ? getQuietHousePhrase(currentClock.getHours() + currentClock.getDate())
          : 'Jeg følger med mens systemet oppdateres.',
      tone: bridgeRuntimeStatus === 'ready' ? ('calm' as const) : ('active' as const),
    }
  })()
  const nivaSystemMessage = nivaMainState.message
  const hasPendingNivaSuggestion = nivaMessages.some(
    (message) => message.status === 'pending' && Boolean(message.proposedAction),
  )
  const hasNivaSuggestion = hasPendingNivaSuggestion || (!adaptiveQuietMode && homeNivaInsights.length > 0)
  const hasNivaAlert =
    nivaDiagnosticInsight.hasIssue ||
    bridgeRuntimeStatus === 'error' ||
    Boolean(liveErrorMessage) ||
    Boolean(weatherAwareness.alert) ||
    (!adaptiveQuietMode && nivaInsights.length > 0)
  const nivaCoreState = getNivaVisualState({
    hasSuggestion: hasNivaSuggestion,
    hasAlert: hasNivaAlert,
    isProcessing: isNivaProcessing,
  })
  const nivaQuickPrompts = getNivaQuickPrompts(activeMainView)

  useEffect(() => {
    if (!weatherAwareness.alert) {
      return
    }

    pushNivaProactiveMessage(
      `weather:${weatherAwareness.alert.key}`,
      weatherAwareness.alert.message,
      4 * 60 * 60 * 1000,
    )
  }, [weatherAwareness.alert?.key, weatherAwareness.alert?.message])

  useEffect(() => {
    if (
      !primaryHeatDemandRoom ||
      typeof primaryHeatDemandRoom.heatDemand !== 'number' ||
      primaryHeatDemandRoom.heatDemand < 50
    ) {
      return
    }

    const heatDemandKey = `${primaryHeatDemandRoom.key}:${Math.floor(primaryHeatDemandRoom.heatDemand / 20)}`

    if (nivaHeatDemandRoomRef.current === heatDemandKey) {
      return
    }

    nivaHeatDemandRoomRef.current = heatDemandKey
    pushNivaProactiveMessage(
      `heat-demand:${primaryHeatDemandRoom.key}`,
      `${primaryHeatDemandRoom.name} jobber for å nå ønsket temperatur.`,
      5 * 60 * 1000,
    )
  }, [primaryHeatDemandRoom])

  useEffect(() => {
    const observation = getNivaAmbientObservation()

    if (!observation || nivaAmbientObservationKeyRef.current === observation.key) {
      return
    }

    nivaAmbientObservationKeyRef.current = observation.key
    pushNivaProactiveMessage(
      `ambient:${observation.key}`,
      observation.text,
      12 * 60 * 1000,
    )
  }, [
    bridgeRuntimeStatus,
    homeStatus,
    adaptiveQuietMode,
    displayedHousePresence.state,
    lightsOnCount,
    mediaPlayer.isPlaying,
    nivaHouseSnapshot.presence.activeRoomNames.join('|'),
    nivaHouseSnapshot.roomsWithHeatDemand.map((room) => `${room.key}:${room.heatDemand}`).join('|'),
    nivaHouseSnapshot.roomsWithTemperature.map((room) => `${room.key}:${room.temperature}`).join('|'),
  ])

  useEffect(() => {
    const windSpeed = weatherAwareness.current?.windSpeed

    if (typeof windSpeed !== 'number') {
      return
    }

    const windBucket = Math.floor(windSpeed / 3)
    const previousWindBucket = nivaWindBucketRef.current
    nivaWindBucketRef.current = windBucket

    if (previousWindBucket !== null && windBucket >= previousWindBucket + 2 && windSpeed >= 6) {
      pushNivaProactiveMessage(
        `wind-up:${windBucket}`,
        'Vinden har økt ute.',
        45 * 60 * 1000,
      )
    }
  }, [weatherAwareness.current?.windSpeed])

  useEffect(() => {
    const messagesElement = nivaMessagesRef.current

    if (!messagesElement || !isNivaPanelOpen || !nivaShouldAutoScrollRef.current) {
      return
    }

    messagesElement.scrollTo({
      top: messagesElement.scrollHeight,
      behavior: 'smooth',
    })
  }, [nivaMessages.length, isNivaPanelOpen])

  useEffect(() => {
    if (!isNivaPanelOpen) {
      return
    }

    nivaShouldAutoScrollRef.current = true
    window.requestAnimationFrame(() => {
      const messagesElement = nivaMessagesRef.current

      if (messagesElement) {
        messagesElement.scrollTop = messagesElement.scrollHeight
      }
    })
  }, [isNivaPanelOpen])

  const handleActivateScene = async (
    sceneId: string,
    source: 'manual' | 'time' = 'manual',
  ) => {
    const scene = scenesConfig.find((currentScene) => currentScene.id === sceneId)

    if (!scene || activatingSceneId) {
      return
    }

    console.log('[Lynell] Activating scene', {
      id: scene.id,
      name: scene.name,
      source,
      triggerType: scene.triggerType,
      triggerTime: scene.triggerTime,
      lighting: scene.lighting.map((target) => ({
        roomKey: target.roomKey,
        zoneKey: target.zoneKey,
        brightness: target.brightness,
      })),
      climate: scene.climate.map((target) => ({
        roomKey: target.roomKey,
        mode: target.mode,
        temperature: target.temperature,
      })),
    })
    appendTestLog('Scene', `${scene.name} aktivert${source === 'time' ? ' automatisk' : ''}`)
    void playLynellSound('information.sceneStarted')

    try {
      setActivatingSceneId(scene.id)
      setIsLoading(true)
      setErrorMessage('')

      for (const target of scene.lighting) {
        const room = rooms.find((currentRoom) => currentRoom.key === target.roomKey)
        const zone = room?.zones.find((currentZone) => currentZone.key === target.zoneKey)
        const brightness = Math.max(0, Math.min(100, Math.round(Number(target.brightness))))

        if (!room || !zone || Number.isNaN(brightness)) {
          console.log('[Lynell] Skipping invalid scene lighting target', {
            scene: scene.name,
            roomKey: target.roomKey,
            zoneKey: target.zoneKey,
            brightness: target.brightness,
          })
          continue
        }

        console.log('[Lynell] Scene lighting target', {
          scene: scene.name,
          room: room.name,
          zone: zone.name,
          brightness,
        })

        recordKnxOut('Scene lys', `${scene.name}: ${room.name} / ${zone.name} -> ${brightness}%`)
        const optimisticEntry = registerOptimisticLighting({
          room,
          zone,
          brightness,
          source: 'scene',
        })
        setRooms((currentRooms) =>
          currentRooms.map((currentRoom) =>
            currentRoom.id === room.id
              ? {
                  ...currentRoom,
                  zones: currentRoom.zones.map((currentZone) =>
                    currentZone.id === zone.id
                      ? {
                          ...currentZone,
                          lightsOn: brightness > 0,
                          brightness,
                        }
                      : currentZone,
                  ),
                }
              : currentRoom,
          ),
        )
        try {
          const nextRooms = await setBrightness(room.id, zone.id, brightness)
          setRooms((currentRooms) => mergeRoomPresentation(nextRooms, currentRooms))
        } catch (error) {
          markOptimisticLightingWriteFailed(
            optimisticEntry,
            error instanceof Error ? error.message : 'sceneLightingWriteFailed',
          )
          throw error
        }
      }

      for (const target of scene.climate) {
        const room = rooms.find((currentRoom) => currentRoom.key === target.roomKey)

        if (!room) {
          console.log('[Lynell] Skipping invalid scene climate target', {
            scene: scene.name,
            roomKey: target.roomKey,
          })
          continue
        }

        const parsedTemperature = Number(target.temperature)
        const hasTemperature = target.temperature.trim() !== '' && !Number.isNaN(parsedTemperature)
        const nextMode = isRoomMode(target.mode) ? target.mode : undefined

        console.log('[Lynell] Scene climate target', {
          scene: scene.name,
          room: room.name,
          mode: nextMode ?? null,
          temperature: hasTemperature ? parsedTemperature : null,
        })

        let nextRooms: Room[] | null = null

        if (hasTemperature) {
          recordKnxOut(
            'Scene klima',
            `${scene.name}: ${room.name} -> ${Number(parsedTemperature.toFixed(1))}°`,
          )
          nextRooms = await setSetpoint(
            room.id,
            Number(parsedTemperature.toFixed(1)),
            nextMode,
          )
        } else if (nextMode) {
          recordKnxOut('Scene klima', `${scene.name}: ${room.name} -> ${nextMode}`)
          nextRooms = await setMode(room.id, nextMode)
        }

        if (nextRooms) {
          setRooms((currentRooms) => mergeRoomPresentation(nextRooms, currentRooms))
        }
      }

      setLastSceneActivation({
        sceneId: scene.id,
        sceneName: scene.name,
        activatedAt: Date.now(),
      })
      setSceneUsageHistory((currentHistory) => [
        ...currentHistory.slice(-24),
        {
          sceneId: scene.id,
          sceneName: scene.name,
          triggeredAt: Date.now(),
          source,
        },
      ])

      if (source === 'time') {
        sceneTriggerHistoryRef.current[scene.id] = getRelativeDateKey(0)
      }
      void playLynellSound('information.sceneCompleted')
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : 'Kunne ikke aktivere scene'
      setErrorMessage(nextMessage)
      setRuntimeIssue(nextMessage)
    } finally {
      setActivatingSceneId(null)
      setIsLoading(false)
    }
  }

  const pushNivaModeConfirmation = (text: string) => {
    const now = Date.now()

    setNivaMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `niva-global-mode-${now}`,
        timestamp: now,
        role: 'niva',
        text,
        type: 'response',
        status: 'acknowledged',
        intent: 'system',
      },
    ])
  }

  const handleGlobalModeChange = async (nextMode: 'Hjemme' | 'Borte') => {
    setHomeStatus(nextMode)
    appendTestLog('Global modus', `${nextMode} aktivert`)

    try {
      setIsLoading(true)
      setErrorMessage('')

      if (nextMode === 'Borte') {
        const writableLightZones = rooms.flatMap((room) =>
          room.zones
            .filter((zone) => hasConfiguredWriteAddress(lightingConfig[room.key]?.zones[zone.key]?.light))
            .map((zone) => ({ room, zone })),
        )
        const climateTargets = rooms.filter((room) => Boolean(lightingConfig[room.key]?.climateActive))

        for (const { room, zone } of writableLightZones) {
          const zoneConfig = lightingConfig[room.key]?.zones[zone.key]

          recordKnxOutWithMetadata('Global modus', `${room.name} / ${zone.name} -> Av`, {
            address: zoneConfig?.light ?? null,
            dataType: zoneConfig?.lightDataType ?? null,
            mappedValue: false,
          })
          const nextRooms = await setLight(room.id, zone.id, false)
          setRooms((currentRooms) => mergeRoomPresentation(nextRooms, currentRooms))
        }

        for (const room of climateTargets) {
          recordKnxOut('Global modus', `${room.name} -> Natt`)
          const nextRooms = await setMode(room.id, 'Natt')
          setRooms((currentRooms) => mergeRoomPresentation(nextRooms, currentRooms))
        }

        appendTestLog(
          'Global modus',
          `Borte: ${writableLightZones.length} lyssoner av, ${climateTargets.length} klimasoner natt`,
        )
        pushNivaModeConfirmation(
          'Borte-modus er aktivert. Lys er slått av og klima er satt til natt der det er konfigurert.',
        )
        return
      }

      const climateTargets = rooms.filter((room) => Boolean(lightingConfig[room.key]?.climateActive))

      for (const room of climateTargets) {
        recordKnxOut('Global modus', `${room.name} -> Komfort`)
        const nextRooms = await setMode(room.id, 'Komfort')
        setRooms((currentRooms) => mergeRoomPresentation(nextRooms, currentRooms))
      }

      appendTestLog('Global modus', `Hjemme: ${climateTargets.length} klimasoner komfort`)
      pushNivaModeConfirmation(
        'Hjemme-modus er aktivert. Klima er satt til komfort der det er konfigurert.',
      )
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : `Kunne ikke aktivere ${nextMode}-modus`
      setErrorMessage(nextMessage)
      setRuntimeIssue(nextMessage)
      pushNivaModeConfirmation(`Jeg kunne ikke fullføre ${nextMode}-modus: ${nextMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timedScenes = scenesConfig.filter((scene) => scene.enabled && scene.triggerType === 'time' && scene.triggerTime)

    if (timedScenes.length > 0) {
      console.log('[Lynell] Timed scene execution is server-owned', {
        schedulerSource: bridgeHealth.snapshot?.sceneScheduler?.schedulerSource ?? 'waiting-for-bridge-health',
        schedulerActive: bridgeHealth.snapshot?.sceneScheduler?.schedulerActive ?? null,
        scenes: timedScenes.map((scene) => `${scene.name} @ ${scene.triggerTime}`),
      })
    }

    return undefined
  }, [bridgeHealth.snapshot?.sceneScheduler?.schedulerActive, bridgeHealth.snapshot?.sceneScheduler?.schedulerSource, scenesConfig])

  const isPinLockActive = systemConfigData.security.pinEnabled
  const isTechnicalSurface =
    activeMainView === 'manager' ||
    activeMainView === 'room-manager' ||
    activeMainView === 'calendar-manager'
  const isTechnicalSurfaceLocked = isPinLockActive && isTechnicalSurface && !isPinUnlocked
  const handleUnlockSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (pinInput === savedSystemConfigData.security.pinCode) {
      const storageKey = savedSystemConfigData.security.lockOnNewSession
        ? pinSessionStorageKey
        : pinPersistentStorageKey
      const storage = savedSystemConfigData.security.lockOnNewSession
        ? window.sessionStorage
        : window.localStorage

      storage.setItem(storageKey, 'true')
      setIsPinUnlocked(true)
      setPinError('')
      setPinInput('')
      return
    }

    setPinError('Feil PIN-kode')
  }
  const idleScreenDateLabel = currentClock.toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const idleScreenTimeLabel = currentClock.toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const idleScreenStatusLabel =
    bridgeRuntimeStatus === 'ready'
      ? `${homeStatus} · Runtime rolig`
      : bridgeRuntimeStatus === 'syncing'
        ? `${homeStatus} · Oppdaterer tilkobling`
        : `${homeStatus} · Viser sist kjente data`
  const idleScreenCustomImage =
    systemConfigData.idleScreen.useCustomImage && systemConfigData.idleScreen.customImageDataUrl
      ? systemConfigData.idleScreen.customImageDataUrl
      : ''

  if (isTechnicalSurfaceLocked) {
    return (
      <main className="pin-lock-shell">
        <section className="pin-lock-card" aria-label="Lås opp Lynell">
          <img className="pin-lock-card__logo" src={lynellLogo} alt="" aria-hidden="true" />
          <p className="eyebrow">Lynell</p>
          <h1>Lås opp teknisk tilgang</h1>
          <p>
            Manager og Room Manager er tekniske flater. Lokal PIN gir tilgang i denne
            sesjonen.
          </p>
          <form className="pin-lock-card__form" onSubmit={handleUnlockSubmit}>
            <input
              autoFocus
              inputMode="numeric"
              type="password"
              value={pinInput}
              onChange={(event) => {
                setPinInput(event.target.value)
                setPinError('')
              }}
              placeholder="PIN-kode"
              aria-label="PIN-kode"
            />
            <button type="submit">Lås opp</button>
          </form>
          {pinError ? <p className="pin-lock-card__error">{pinError}</p> : null}
        </section>
      </main>
    )
  }

  return (
    <main className={`app-shell app-shell--${layoutMode}`}>
      <audio ref={audioRef} preload="metadata" />
      <button
        type="button"
        className="app-menu-button"
        onClick={() => setIsMainNavOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isMainNavOpen}
        aria-label="Åpne hovedmeny"
      >
        <span aria-hidden="true">☰</span>
        <strong>{getLocalizedMainViewLabel(activeMainView)}</strong>
      </button>
      <nav className="app-nav-rail" aria-label="Hovednavigasjon">
        {mainViews.map((view) => (
          <button
            key={view.id}
            type="button"
            className={`app-nav-rail__button ${activeMainView === view.id ? 'is-active' : ''}`}
            onClick={() => handleMainViewChange(view.id)}
            aria-label={view.label}
            title={view.label}
          >
            <span className="app-nav-rail__icon" aria-hidden="true">
              {getMainViewIcon(view.id)}
            </span>
            <span className="app-nav-rail__label">{view.label}</span>
          </button>
        ))}
      </nav>
      {isMainNavOpen ? (
        <div className="app-nav-drawer-shell" role="presentation">
          <button
            type="button"
            className="app-nav-drawer__overlay"
            onClick={() => setIsMainNavOpen(false)}
            aria-label="Lukk hovedmeny"
          />
          <aside className="app-nav-drawer" role="dialog" aria-modal="true" aria-label="Hovedmeny">
            <div className="app-nav-drawer__header">
              <span>Lynell</span>
              <button type="button" onClick={() => setIsMainNavOpen(false)} aria-label="Lukk">
                ×
              </button>
            </div>
            <div className="app-nav-drawer__list">
              {mainViews.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  className={`app-nav-drawer__button ${activeMainView === view.id ? 'is-active' : ''}`}
                  onClick={() => handleMainViewChange(view.id)}
                >
                  <span className="app-nav-drawer__icon" aria-hidden="true">
                    {getMainViewIcon(view.id)}
                  </span>
                  <span>{view.label}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
      {!isNivaPanelOpen && activeMainView !== 'home' ? (
        <button
          type="button"
          className="niva-global-presence"
          onClick={() => setIsNivaPanelOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isNivaPanelOpen}
          aria-label="Åpne NIVA"
        >
          <NivaCore state={nivaCoreState} size={56} />
          <span>NIVA</span>
        </button>
      ) : null}
      <section className="theme-mode-control" aria-label="Tema">
        <div className="theme-mode-control__buttons" role="group" aria-label="Velg tema">
          {(['dark', 'light', 'auto'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={themeMode === mode ? 'is-active' : ''}
              onClick={() => handleThemeModeChange(mode)}
              aria-pressed={themeMode === mode}
            >
              {mode === 'dark' ? 'Dark' : mode === 'light' ? 'Light' : 'Auto'}
            </button>
          ))}
        </div>
        <span>{formatThemeModeStatus(themeMode, resolvedTheme)}</span>
      </section>

      {activeMainView === 'home' ? (
        <section className="hero hero--wireframe">
          <div className="hero__left">
            <div className="hero__brand">
              <img className="hero__logo" src={lynellLogo} alt="" aria-hidden="true" />
              <div className="hero__brand-copy">
                <h1>{housingConfig.name}</h1>
                <p className="hero__meta">{customerSystemLabel}</p>
              </div>
            </div>
            <details
              className={`home-status-collapse home-status-collapse--${houseConfidence.tone}`}
              open={isHomeStatusOpen}
              onToggle={(event) => setIsHomeStatusOpen(event.currentTarget.open)}
            >
              <summary className="home-status-collapse__summary">
                <span>
                  <span>Boligstatus</span>
                  <strong>{homeStatus}</strong>
                </span>
                <span>{isHomeStatusOpen ? 'Skjul' : 'Vis'}</span>
              </summary>
              <div className="home-status-grid" aria-label="Hurtigstatus">
                <div className="home-status-grid__item home-status-grid__item--priority">
                  <span>Boligstatus</span>
                  <strong>{homeStatus}</strong>
                </div>
                <div className="home-status-grid__item home-status-grid__item--quiet">
                  <span>Runtime mode</span>
                  <strong>{runtimeModeLabel}</strong>
                </div>
                <div className="home-status-grid__item home-status-grid__item--quiet">
                  <span>Connection</span>
                  <strong>{customerConnectionLabel}</strong>
                </div>
                <div className="home-status-grid__item home-status-grid__item--priority">
                  <span>Last update</span>
                  <strong>{customerFeedbackLabel}</strong>
                </div>
                <div className="home-status-grid__item home-status-grid__item--priority">
                  <span>Confidence</span>
                  <strong>{houseConfidence.label}</strong>
                </div>
                <div className="home-status-grid__item home-status-grid__item--quiet">
                  <span>Freshness</span>
                  <strong>{runtimeFreshnessLabel}</strong>
                </div>
                <div className="home-status-grid__item home-status-grid__item--quiet">
                  <span>Lys på</span>
                  <strong>{summaryLightsValue}</strong>
                </div>
                <div className="home-status-grid__item home-status-grid__item--quiet">
                  <span>Varmebehov</span>
                  <strong>{summaryClimateValue}</strong>
                </div>
              </div>
              <details className="home-readiness-info">
                <summary>
                  <span>Test-readiness: {readinessStatusLabel}</span>
                  <strong>Info</strong>
                </summary>
                <ul>
                  <li>{runtimeModeDescription}</li>
                  {readinessLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </details>
              <div className="home-runtime-contracts" aria-label="Runtime contract status">
                <div>
                  <span>NIVA runtime</span>
                  <strong>{runtimeContractSummary.label}</strong>
                  <small>{runtimeContractSummary.nivaLine}</small>
                </div>
                {runtimeDeviceContracts
                  .filter((contract) => contract.connectionState === 'connected' || contract.connectionState === 'degraded')
                  .slice(0, 3)
                  .map((contract) => (
                  <span
                    key={contract.id}
                    className={`runtime-state-chip runtime-state-chip--${contract.connectionState}`}
                  >
                    {contract.name}: {formatRuntimeConnectionState(contract.connectionState)}
                  </span>
                ))}
              </div>
            </details>
          </div>
          <article className="home-system-panel" aria-label="NIVA og vær">
            <div className="home-system-panel__header">
              <div>
                <p className="room-card__label">NIVA Presence</p>
                <h2>{nivaSystemMessage}</h2>
              </div>
              <div className="home-system-panel__niva-presence">
                <NivaCore state={nivaCoreState} size={104} onClick={() => setIsNivaPanelOpen(true)} />
              </div>
            </div>
            <div className="home-system-panel__clock">
              <strong>
                {new Intl.DateTimeFormat('nb-NO', {
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(currentClock)}
              </strong>
              <span>{homeClockLabel.replace(/^.*?,\s*/u, '')}</span>
            </div>
            <div className="home-system-panel__weather" title={!weather && weatherError ? weatherError : undefined}>
              <span className="weather-card__symbol" aria-hidden="true">
                {weatherDisplay?.symbol ?? '○'}
              </span>
              <div>
                <strong>{isWeatherLoading ? '--' : weather ? `${weather.temperature}°C` : '--'}</strong>
                <span>{weather ? weatherDisplay?.label : isWeatherLoading ? 'Henter vær' : 'Ikke live'}</span>
              </div>
              {weather ? (
                <>
                  <div>
                    <span>Vind</span>
                    <strong>{`${weather.windSpeed} m/s`}</strong>
                  </div>
                  <div>
                    <span>Nedbør</span>
                    <strong>
                      {weather.precipitation !== null && weather.precipitation !== undefined
                        ? `${weather.precipitation.toFixed(1)} mm`
                        : '—'}
                    </strong>
                  </div>
                </>
              ) : null}
            </div>
            {homeCalendarPrimaryEvent ? (
              <p className="home-system-panel__note">{formatCalendarEventLine(homeCalendarPrimaryEvent)}</p>
            ) : null}
          </article>
          <div className="system-status-bar system-status-bar--quiet" aria-label="Systemstatus">
            <span className="system-status-pill">
              {runtimeModeLabel}
            </span>
            <span className="system-status-pill system-status-pill--quiet">{bridgeStatusLabel}</span>
            <span className={`system-status-pill system-status-pill--${runtimeEventStreamState.frontendFreshness}`}>
              {runtimeContinuityLabel}
            </span>
            <button
              type="button"
              className="niva-entry"
              onClick={() => setIsNivaPanelOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={isNivaPanelOpen}
            >
              <span>NIVA</span>
              <strong>{homeNivaInsights.length > 0 ? `${homeNivaInsights.length} signal` : 'Klar'}</strong>
            </button>
          </div>
          {runtimeContinuityNotice ? <p className="hero__notice">{runtimeContinuityNotice}</p> : null}
          {liveErrorMessage ? <p className="hero__notice">Status: {liveErrorMessage}</p> : null}
        </section>
      ) : null}

      {activeMainView === 'home' ? (
        <>
          <section className="home-global-mode" aria-label="Global modus">
            <div>
              <p className="room-card__label">Global modus</p>
              <h2>{homeStatus}</h2>
            </div>
            <div className="mode-control mode-control--wide" aria-label="Global modus">
              <button
                type="button"
                className={`mode-control__option ${homeStatus === 'Hjemme' ? 'is-active' : ''}`}
                onClick={() => void handleGlobalModeChange('Hjemme')}
                disabled={isLoading}
              >
                <span className="mode-control__icon" aria-hidden="true">⌂●</span>
                <span>Hjemme</span>
                <span className={`status-line ${homeStatus === 'Hjemme' ? 'status-line--active' : 'status-line--idle'}`} />
              </button>
              <button
                type="button"
                className={`mode-control__option ${homeStatus === 'Borte' ? 'is-active' : ''}`}
                onClick={() => void handleGlobalModeChange('Borte')}
                disabled={isLoading}
              >
                <span className="mode-control__icon" aria-hidden="true">●⌂</span>
                <span>Borte</span>
                <span className={`status-line ${homeStatus === 'Borte' ? 'status-line--active' : 'status-line--idle'}`} />
              </button>
            </div>
          </section>
          <section
            className={`home-presence-line home-presence-line--${displayedHousePresence.state} ${adaptiveQuietMode ? 'home-presence-line--quiet-mode' : ''}`}
            aria-label="Atmosfære"
          >
            <span className="home-presence-line__glow" aria-hidden="true" />
            <div>
              <p>Atmosfære</p>
              <strong>{displayedHousePresence.label}</strong>
              <span>{nivaPresenceComfort.homeLine}</span>
              {homePresenceRhythmLines.map((line) => (
                <span key={`secondary-${line}`} className="home-presence-line__rhythm">{line}</span>
              ))}
            </div>
          </section>
          {homeRecommendations.length > 0 ? (
            <section className="recommendation-strip" aria-label="Anbefalinger">
              {homeRecommendations.map((recommendation) => (
                <article key={recommendation.id} className={`recommendation-card recommendation-card--${recommendation.priority}`}>
                  <div>
                    <span>{recommendation.category}</span>
                    <strong>{recommendation.title}</strong>
                    <p>{recommendation.shortText}</p>
                  </div>
                  {recommendation.dismissible ? (
                    <button type="button" onClick={() => handleDismissRecommendation(recommendation)}>
                      Skjul
                    </button>
                  ) : null}
                </article>
              ))}
            </section>
          ) : null}
          {mediaPlayer.isPlaying && currentMediaTrack ? (
            <section className="home-now-playing" aria-label="Nå spiller">
              <span className="home-now-playing__icon" aria-hidden="true">♪</span>
              <div>
                <p>Nå spiller</p>
                <strong>{currentMediaTrack.title}</strong>
                <span>{currentMediaTrack.artist} · {activeMediaDevice?.name ?? 'valgt output'}{activeMediaDevice?.roomName ? ` · ${activeMediaDevice.roomName}` : ''}</span>
              </div>
              <button type="button" onClick={handleToggleMediaPlayback}>
                Pause
              </button>
            </section>
          ) : null}
        </>
      ) : null}

      {showFloorNavigation ? (
        <section className="subview-switch" aria-label="Etasjer">
          {floorConfigs.map((floor) => (
            <button
              key={floor.id}
              type="button"
              className={`subview-switch__button ${activeFloor?.id === floor.id ? 'is-active' : ''}`}
              onClick={() => setActiveFloorId(floor.id)}
            >
              <span>{floor.label}</span>
              <span
                className={`status-line ${
                  activeFloor?.id === floor.id ? 'status-line--active' : 'status-line--idle'
                }`}
                aria-hidden="true"
              />
            </button>
          ))}
        </section>
      ) : null}

      {isNivaPanelOpen ? (
        <section className="niva-panel" role="dialog" aria-label="NIVA-assistent">
          <div className="niva-panel__backdrop" onClick={() => setIsNivaPanelOpen(false)} />
          <article className="niva-panel__surface">
            <div className="niva-panel__header">
              <div>
                <p className="room-card__label">NIVA</p>
                <h2>Jeg følger med på huset</h2>
                <p>{nivaSystemMessage}</p>
                <div className="niva-runtime-identity">
                  <span>{runtimeModeLabel}</span>
                  <strong>{runtimeContractSummary.label}</strong>
                </div>
              </div>
              <button type="button" className="niva-panel__close" onClick={() => setIsNivaPanelOpen(false)}>
                Lukk
              </button>
            </div>

            <div className="niva-panel__quick-prompts" aria-label="NIVA hurtigspørsmål">
              {nivaQuickPrompts.map((prompt) => (
                <button key={prompt} type="button" onClick={() => handleSendNivaText(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>

            {nivaInsights.length > 0 ? (
              <div className="niva-panel__insights" aria-label="NIVA innsikter">
                {nivaInsights.slice(0, 1).map((insight) => (
                  <article key={insight.id} className="niva-panel__insight">
                    {insight.reason ? <span>{insight.reason}</span> : null}
                    <strong>{insight.title}</strong>
                    <p>{insight.detail}</p>
                    {insight.actionLabel || insight.dismissLabel ? (
                      <div className="niva-panel__insight-actions">
                        {insight.actionLabel && insight.onAction ? (
                          <button type="button" onClick={insight.onAction}>
                            {insight.actionLabel}
                          </button>
                        ) : null}
                        {insight.dismissLabel ? (
                          <button type="button" onClick={() => handleDismissNivaInsight(insight)}>
                            {insight.dismissLabel}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                ))}
                {nivaInsights.length > 1 ? (
                  <details className="niva-panel__insight-group">
                    <summary>+ {nivaInsights.length - 1} flere observasjoner</summary>
                    {nivaInsights.slice(1, 4).map((insight) => (
                      <article key={insight.id} className="niva-panel__insight niva-panel__insight--secondary">
                        {insight.reason ? <span>{insight.reason}</span> : null}
                        <strong>{insight.title}</strong>
                        <p>{insight.detail}</p>
                        {insight.actionLabel || insight.dismissLabel ? (
                          <div className="niva-panel__insight-actions">
                            {insight.actionLabel && insight.onAction ? (
                              <button type="button" onClick={insight.onAction}>
                                {insight.actionLabel}
                              </button>
                            ) : null}
                            {insight.dismissLabel ? (
                              <button type="button" onClick={() => handleDismissNivaInsight(insight)}>
                                {insight.dismissLabel}
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </details>
                ) : null}
              </div>
            ) : null}

            <div
              ref={nivaMessagesRef}
              className="niva-panel__messages"
              aria-label="NIVA meldingshistorikk"
              onScroll={(event) => {
                const element = event.currentTarget
                const distanceFromBottom =
                  element.scrollHeight - element.scrollTop - element.clientHeight

                nivaShouldAutoScrollRef.current = distanceFromBottom < 120
              }}
            >
              {nivaMessages.slice(-5).map((message) => (
                <article
                  key={message.id}
                  className={`niva-message niva-message--${message.role} niva-message--${message.status}`}
                >
                  <span>
                    {message.role === 'user' ? 'Du' : 'NIVA'} ·{' '}
                    {new Intl.DateTimeFormat('nb-NO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(message.timestamp))}
                    {message.intent && message.intent !== 'unknown' ? ` · ${message.intent}` : ''}
                  </span>
                  <p>{message.text}</p>
                  {message.proposedAction && message.status === 'pending' ? (
                    <div className="niva-message__proposal">
                      <strong>{message.proposedAction.label}</strong>
                      <small>{message.proposedAction.summary}</small>
                      <div>
                        <button
                          type="button"
                          onClick={() => void handleResolveNivaProposal(message.id, 'completed')}
                        >
                          Bekreft
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleResolveNivaProposal(message.id, 'acknowledged')}
                        >
                          Avbryt
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
              {nivaMessages.length === 0 ? (
                <article className="niva-message">
                  <span>NIVA</span>
                  <p>Jeg følger med og sier fra når noe er verdt å se på.</p>
                </article>
              ) : null}
            </div>

            <form className="niva-panel__composer" onSubmit={handleSendNivaMessage}>
              <input
                type="text"
                value={nivaInput}
                onChange={(event) => setNivaInput(event.target.value)}
                placeholder="Skriv til NIVA..."
                aria-label="Skriv til NIVA"
              />
              <button type="submit">Send</button>
            </form>
          </article>
        </section>
      ) : null}

      {activeMainView === 'home' ? (
        <>
          <section className="home-layout" aria-label="Hjem">
            {showSceneModule ? (
              <details
                className="home-collapse"
                open={isHomeScenesOpen}
                onToggle={(event) => setIsHomeScenesOpen(event.currentTarget.open)}
              >
                <summary className="home-collapse__summary">
                  <span>
                    <span className="room-card__label">Scener</span>
                    <strong>Stemninger</strong>
                  </span>
                  <span>{isHomeScenesOpen ? 'Skjul' : 'Vis'}</span>
                </summary>
                <article className="dashboard-card scene-card home-scene-card">
                  <div className="scene-card__header">
                    <div>
                      <p className="room-card__label">Scener</p>
                      <h2>Stemninger</h2>
                      <p className="scene-card__summary">Scener for kveld, natt og morgen.</p>
                    </div>
                    {lastMoodSceneActivation ? (
                      <span className="scene-card__status">
                        {lastMoodSceneActivation.sceneName} ·{' '}
                        {formatRelativeSceneStatus(lastMoodSceneActivation.activatedAt)}
                      </span>
                    ) : null}
                  </div>
                  <div className="scene-card__grid">
                    {homeModeScenes.map((scene, index) => (
                      <button
                        key={scene.id}
                        type="button"
                        className={`scene-card__item scene-card__item--tone-${index % 4} ${activatingSceneId === scene.id || lastMoodSceneActivation?.sceneId === scene.id ? 'is-active' : ''}`}
                        onClick={() => void handleActivateScene(scene.id)}
                        disabled={isLoading || activatingSceneId !== null}
                      >
                        <span
                          className={`status-line ${
                            activatingSceneId === scene.id || lastMoodSceneActivation?.sceneId === scene.id
                              ? 'status-line--active'
                              : scene.triggerTime
                                ? 'status-line--scheduled'
                                : 'status-line--idle'
                          }`}
                          aria-hidden="true"
                        />
                        <strong>{scene.name}</strong>
                        {scene.triggerTime ? <span>{scene.triggerTime}</span> : null}
                        {activatingSceneId === scene.id ? (
                          <span
                            className="calm-status-indicator calm-status-indicator--scene"
                            title="Scene kjører. Venter på tilbakemelding."
                            aria-label="Scene kjører. Venter på tilbakemelding."
                            data-status-detail="Scene kjører. Venter på tilbakemelding."
                          >
                            <span aria-hidden="true" />
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </article>
              </details>
            ) : null}

            <details
              className="home-collapse"
              open={isHomeCalendarOpen}
              onToggle={(event) => setIsHomeCalendarOpen(event.currentTarget.open)}
            >
              <summary className="home-collapse__summary">
                <span>
                  <span className="room-card__label">Kalender</span>
                  <strong>I dag og i morgen</strong>
                </span>
                <span>{isHomeCalendarOpen ? 'Skjul' : 'Vis'}</span>
              </summary>
              <article className="dashboard-card calendar-card home-calendar-card">
                <div className="scene-card__header">
                  <div>
                    <p className="room-card__label">Kalender</p>
                  </div>
                </div>
                <div className="home-calendar-card__content home-calendar-card__content--wide">
                  <div className="calendar-card__section">
                    <div className="calendar-card__header">
                      <h3>I dag</h3>
                      <span>{formatCalendarDateLabel(todayKey)}</span>
                    </div>
                    {todayActivities.length > 0 ? (
                      <div className="calendar-card__list">
                        {todayActivities.slice(0, 2).map((event) => (
                          <div key={event.id} className="calendar-card__item calendar-card__item--compact">
                            <strong>{formatCalendarEventLine(event)}</strong>
                            {event.type === 'booking' ? (
                              <span>
                                {event.resourceName || 'Booking'}
                                {event.bookingStatus ? ` · ${event.bookingStatus}` : ''}
                              </span>
                            ) : null}
                            {event.resourceContext ? <span>{event.resourceContext}</span> : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="calendar-card__empty">
                        <strong>Ingen avtaler</strong>
                        <span>Ingen aktiviteter planlagt</span>
                      </p>
                    )}
                  </div>
                  <div className="calendar-card__section">
                    <div className="calendar-card__header">
                      <h3>I morgen</h3>
                      <span>{formatCalendarDateLabel(tomorrowKey)}</span>
                    </div>
                    {tomorrowActivities.length > 0 ? (
                      <div className="calendar-card__list">
                        {tomorrowActivities.slice(0, 2).map((event) => (
                          <div key={event.id} className="calendar-card__item calendar-card__item--compact">
                            <strong>{formatCalendarEventLine(event)}</strong>
                            {event.type === 'booking' ? (
                              <span>
                                {event.resourceName || 'Booking'}
                                {event.bookingStatus ? ` · ${event.bookingStatus}` : ''}
                              </span>
                            ) : null}
                            {event.resourceContext ? <span>{event.resourceContext}</span> : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="calendar-card__empty">
                        <strong>Ingen avtaler</strong>
                        <span>Ingen aktiviteter planlagt</span>
                      </p>
                    )}
                  </div>
                </div>
              </article>
            </details>
          </section>
        </>
      ) : activeMainView === 'calendar' ? (
        <section className="room-section" aria-label="Kalender">
          <div className="room-section__header">
            <div>
              <p className="eyebrow">Kalender</p>
              <h2>Familieoversikt</h2>
            </div>
            <button
              type="button"
              className="manager-action"
              onClick={() => setActiveMainView('calendar-manager')}
            >
              Åpne Kalender Manager
            </button>
          </div>

          {calendarActionTrustRecords.length > 0 ? (
            <article className="manager-card calendar-overview__card">
              <div className="calendar-card__header">
                <div>
                  <p className="room-card__label">NIVA kalender</p>
                  <h3>{getCalendarActionStateLabel(calendarActionTrustRecords[0].state)}</h3>
                </div>
                <span>{calendarActionTrustRecords[0].confidence}</span>
              </div>
              <div className="calendar-card__list">
                <div className="calendar-card__item calendar-card__item--compact">
                  <strong>{calendarActionTrustRecords[0].summary}</strong>
                  <span>
                    {calendarActionTrustRecords[0].completedAt
                      ? `Opprettet ${calendarActionTrustRecords[0].completedAt}`
                      : calendarActionTrustRecords[0].confirmedAt
                        ? `Bekreftet ${calendarActionTrustRecords[0].confirmedAt}`
                        : `Foreslått ${calendarActionTrustRecords[0].proposedAt}`}
                  </span>
                  {calendarActionTrustRecords[0].error ? <span>{calendarActionTrustRecords[0].error}</span> : null}
                </div>
              </div>
            </article>
          ) : null}

          {calendarItems.length > 0 ? (
            <div className="calendar-overview">
              <article className="manager-card calendar-overview__card">
                <div className="calendar-card__header">
                  <h3>I dag</h3>
                  <span>{formatCalendarDateLabel(todayKey)}</span>
                </div>
                {todayActivities.length > 0 ? (
                  <div className="calendar-card__list">
                    {todayActivities.map((event) => (
                      <div key={event.id} className="calendar-card__item calendar-card__item--compact">
                        <strong>{formatCalendarEventLine(event)}</strong>
                        {event.type === 'booking' ? (
                          <span>
                            {event.resourceName || 'Booking'}
                            {event.bookingStatus ? ` · ${event.bookingStatus}` : ''}
                          </span>
                        ) : null}
                        {event.resourceContext ? <span>{event.resourceContext}</span> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="calendar-card__empty">Ingen avtaler</p>
                )}
              </article>

              <article className="manager-card calendar-overview__card">
                <div className="calendar-card__header">
                  <h3>I morgen</h3>
                  <span>{formatCalendarDateLabel(tomorrowKey)}</span>
                </div>
                {tomorrowActivities.length > 0 ? (
                  <div className="calendar-card__list">
                    {tomorrowActivities.map((event) => (
                      <div key={event.id} className="calendar-card__item calendar-card__item--compact">
                        <strong>{formatCalendarEventLine(event)}</strong>
                        {event.type === 'booking' ? (
                          <span>
                            {event.resourceName || 'Booking'}
                            {event.bookingStatus ? ` · ${event.bookingStatus}` : ''}
                          </span>
                        ) : null}
                        {event.resourceContext ? <span>{event.resourceContext}</span> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="calendar-card__empty">Ingen avtaler</p>
                )}
              </article>
            </div>
          ) : null}

          <div className="calendar-card__sections calendar-page">
            {groupedCalendarDays.length === 0 ? (
              <div className="calendar-card__section manager-card">
                <div className="calendar-card__header">
                  <h3>Kalender</h3>
                </div>
                <p className="calendar-card__empty">Ingen avtaler</p>
              </div>
            ) : (
              groupedCalendarDays.map((group) => (
                <div key={group.date} className="calendar-card__section manager-card">
                  <div className="calendar-card__header">
                    <h3>{group.label}</h3>
                    <span>{formatCalendarDateLabel(group.date)}</span>
                  </div>
                  <div className="calendar-card__list">
                    {group.events.map((event) => (
                      <div key={event.id} className="calendar-card__item calendar-card__item--compact">
                        <strong>{formatCalendarEventLine(event)}</strong>
                        {event.type === 'booking' ? (
                          <span>
                            {event.resourceName || 'Booking'}
                            {event.bookingStatus ? ` · ${event.bookingStatus}` : ''}
                          </span>
                        ) : null}
                        {event.resourceContext ? <span>{event.resourceContext}</span> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      ) : activeMainView === 'rooms' ? (
        <section
          key={`${activeMainView}:${activeFloor?.id ?? 'none'}`}
          className="room-section"
          aria-label="Rom"
        >
          <div className="room-section__header">
            <p className="eyebrow">Rom</p>
            <h2>{activeFloor?.label ?? 'Etasje'}</h2>
          </div>

          {visibleRooms.length > 0 ? (
            <section className="room-focus-panel" aria-label="Romvisning">
              <label className="room-focus-panel__selector">
                <span>Velg rom</span>
                <select
                  value={selectedFocusRoom?.key ?? ''}
                  onChange={(event) => setSelectedRoomKey(event.target.value || null)}
                >
                  {visibleRooms.map((room) => (
                    <option key={room.key} value={room.key}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </label>

              {selectedFocusRoom ? (
                <article className="room-focus-card">
                  <div className="room-focus-card__hero">
                    <div className="room-focus-card__identity">
                      <p className="room-card__label">Rom</p>
                      <h3>{selectedFocusRoom.name}</h3>
                      <span>{selectedFocusRoomHasClimate ? selectedFocusRoom.mode : 'Lys'}</span>
                    </div>
                    <div className="room-focus-card__temperature">
                      <strong>{selectedFocusRoomTemperature}</strong>
                      <span>Settpunkt {selectedFocusRoomSetpoint}</span>
                    </div>
                  </div>

                  {selectedFocusRoomNivaLine ? (
                    <p className="room-focus-card__niva">{selectedFocusRoomNivaLine}</p>
                  ) : null}

                  {selectedFocusRoomReport ? (
                    <section
                      className={`room-focus-card__report room-focus-card__report--${selectedFocusRoomReport.status}`}
                      aria-label={`NIVA romrapport for ${selectedFocusRoom.name}`}
                    >
                      <div>
                        <span>NIVA-romrapport</span>
                        <strong>{selectedFocusRoomReport.statusLabel}</strong>
                      </div>
                      <p>{selectedFocusRoomReport.text}</p>
                      {selectedFocusRoomReport.recommendations.length > 0 ? (
                        <ul>
                          {selectedFocusRoomReport.recommendations.map((recommendation) => (
                            <li key={recommendation}>{recommendation}</li>
                          ))}
                        </ul>
                      ) : null}
                      {selectedFocusRoomReportAction && !selectedFocusRoomHasPendingNivaAction ? (
                        <button
                          type="button"
                          className="room-focus-card__report-action"
                          onClick={handleCreateSelectedRoomNivaProposal}
                        >
                          {selectedFocusRoomReportAction.summary}
                        </button>
                      ) : null}
                    </section>
                  ) : null}

                  {roomRecommendations.length > 0 ? (
                    <div className="room-recommendations" aria-label="Rommets anbefalinger">
                      {roomRecommendations.map((recommendation) => (
                        <article key={recommendation.id} className="recommendation-card recommendation-card--room">
                          <div>
                            <span>{recommendation.category}</span>
                            <strong>{recommendation.title}</strong>
                            <p>{recommendation.shortText}</p>
                          </div>
                          {recommendation.dismissible ? (
                            <button type="button" onClick={() => handleDismissRecommendation(recommendation)}>
                              Skjul
                            </button>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  ) : null}

                  {selectedFocusRoomHeatNeedAnalysis ? (
                    <p
                      className={`room-focus-card__analysis room-focus-card__analysis--${selectedFocusRoomHeatNeedAnalysis.status}`}
                    >
                      Varmebehov: {selectedFocusRoomHeatNeedAnalysis.label}
                    </p>
                  ) : null}

                  <div className="room-focus-card__metrics">
                    <div>
                      <span>Varme</span>
                      <strong>{selectedFocusRoomHeatDemand}</strong>
                    </div>
                    <div>
                      <span>Lys</span>
                      <strong>{selectedFocusRoomLightStatus}</strong>
                    </div>
                    <div>
                      <span>Volum</span>
                      <strong>{selectedFocusRoomVolumeLabel}</strong>
                    </div>
                  </div>

                  <div className="room-focus-card__light">
                    <span>Lysnivå</span>
                    <strong>{selectedFocusRoomBrightnessStatus}</strong>
                  </div>

                  <div className="room-focus-card__history">
                    <div>
                      <span>Mini-graf</span>
                      <strong>{selectedFocusRoomHistoryInsight?.trend ?? 'Ikke nok historikk'}</strong>
                    </div>
                    {selectedFocusRoomHistoryValues.length >= 2 ? (
                      <Sparkline
                        values={selectedFocusRoomHistoryValues}
                        label={`Temperaturhistorikk for ${selectedFocusRoom.name}`}
                        className="room-focus-card__sparkline"
                      />
                    ) : null}
                  </div>

                  <div className="room-focus-card__footer">
                    <span>{selectedFocusRoomAnalysisBasisLabel}</span>
                    <div className="room-focus-card__footer-actions">
                      <button
                        type="button"
                        className="room-focus-card__advanced"
                        onClick={() => handleOpenRoomManager(selectedFocusRoom.key)}
                      >
                        Room Manager
                      </button>
                      <button
                        type="button"
                        className="room-focus-card__advanced"
                        onClick={() => handleOpenTrendHistory(selectedFocusRoom.key)}
                      >
                        Trendhistorikk
                      </button>
                    </div>
                  </div>

                </article>
              ) : null}
            </section>
          ) : (
            <article className="dashboard-card dashboard-card--compact">
              <p className="dashboard-card__meta">Ingen rom på denne etasjen.</p>
            </article>
          )}
        </section>
      ) : activeMainView === 'trend-history' ? (
        <Suspense fallback={<LazyViewFallback label="Trendhistorikk" />}>
          <TrendHistoryView
            rooms={resolvedRooms}
            selectedRoom={selectedTrendRoom}
            range={trendHistoryRange}
            temperaturePoints={selectedTrendTemperaturePoints}
            setpointPoints={selectedTrendSetpointPoints}
            heatDemandPoints={selectedTrendHeatDemandPoints}
            brightnessPoints={selectedTrendBrightnessPoints}
            customSignalPoints={selectedTrendCustomSignalPoints}
            lightZoneSeries={selectedTrendLightZoneSeries}
            sourceLabel={trendHistorySourceLabel}
            sparse={trendHistoryDensityCount < 2}
            rangeStart={trendHistoryCutoff}
            rangeEnd={trendHistoryRangeEnd}
            densityLabel={trendHistoryDensityLabel}
            roomTruthSummary={selectedTrendRoomTruthSummary}
            pollState={selectedTrendRoom ? roomPollStateByKey[selectedTrendRoom.key] ?? null : null}
            onRoomChange={setSelectedRoomKey}
            onRangeChange={setTrendHistoryRange}
            onPollValues={handlePollRoomValues}
            onBackToRooms={() => {
              setActiveMainView('rooms')
              setIsMainNavOpen(false)
            }}
          />
        </Suspense>
      ) : activeMainView === 'shading' ? (
        <section className="room-section" aria-label="Solskjerming">
          <div className="room-section__header">
            <p className="eyebrow">Solskjerming</p>
            <h2>Solskjerming</h2>
            <span>
              {shadingDiagnostics.visibleCount} synlige · {shadingDiagnostics.missingMappingCount} mangler mapping
            </span>
          </div>

          {shadingDiagnostics.entries.filter((entry) => entry.visible).length > 0 ? (
            <div className="shading-grid">
              {shadingDiagnostics.entries
                .filter((entry) => entry.visible)
                .map((entry) => {
                  const commandState = shadingCommandStateById[entry.shadingId]
                  const positionValue =
                    shadingPositionDraftById[entry.shadingId] ??
                    commandState?.feedbackValue ??
                    (typeof commandState?.value === 'number' ? commandState.value : 50)
                  const pendingState =
                    commandState?.status === 'pending' || commandState?.status === 'sentUnconfirmed'

                  return (
                    <article key={entry.shadingId} className="dashboard-card shading-card">
                      <div className="shading-card__header">
                        <div>
                          <p className="room-card__label">{entry.roomName}</p>
                          <h2>{entry.label}</h2>
                          <p className="dashboard-card__meta">
                            {entry.type} · {entry.maturity}
                          </p>
                        </div>
                        <span
                          className={`manager-readiness__indicator ${
                            entry.missingMapping ? 'manager-readiness__indicator--warning' : ''
                          }`}
                        >
                          {entry.statusLabel}
                        </span>
                      </div>

                      {entry.missingMapping ? (
                        <p className="shading-card__notice">
                          Denne sonen er aktivert, men mangler gruppeadresser før den kan styres.
                        </p>
                      ) : (
                        <div className="shading-card__address-list">
                          {entry.configuredAddresses.slice(0, 6).map((address) => (
                            <span key={`${entry.shadingId}-${address.field}`}>
                              {address.field}: {address.groupAddress}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="shading-card__trust">
                        <span
                          className={`calm-status-indicator ${
                            pendingState ? 'calm-status-indicator--pending' : ''
                          }`}
                          data-status-detail={
                            commandState?.status === 'confirmed'
                              ? `Bekreftet av feedbackPosition${commandState.feedbackValue !== null ? `: ${commandState.feedbackValue}%` : ''}`
                              : commandState?.status === 'failed'
                                ? commandState.lastMessage
                                : commandState?.status === 'sentUnconfirmed'
                                  ? 'Kommando sendt, men feedback mangler eller er ikke konfigurert'
                                  : pendingState
                                    ? 'Kommando sendt. Venter på feedbackPosition.'
                                    : 'Ingen aktiv kommando'
                          }
                          title={
                            commandState?.status === 'confirmed'
                              ? `Bekreftet av feedbackPosition${commandState.feedbackValue !== null ? `: ${commandState.feedbackValue}%` : ''}`
                              : commandState?.status === 'failed'
                                ? commandState.lastMessage
                                : commandState?.status === 'sentUnconfirmed'
                                  ? 'Kommando sendt, men feedback mangler eller er ikke konfigurert'
                                  : pendingState
                                    ? 'Kommando sendt. Venter på feedbackPosition.'
                                    : 'Ingen aktiv kommando'
                          }
                          aria-label={commandState?.lastMessage ?? 'Solskjerming status'}
                        />
                        <div>
                          <strong>
                            {commandState?.status === 'confirmed'
                              ? 'Bekreftet posisjon'
                              : commandState?.status === 'failed'
                                ? 'Kunne ikke styre'
                                : pendingState
                                  ? 'Kommando sendt'
                                  : entry.actionAvailability.feedbackPosition
                                    ? 'Feedback klar'
                                    : 'Uten feedback'}
                          </strong>
                          <span>
                            {commandState?.status === 'confirmed' && commandState.feedbackValue !== null
                              ? `${commandState.feedbackValue}%`
                              : commandState?.lastMessage ??
                                (entry.actionAvailability.feedbackPosition
                                  ? 'Posisjon bekreftes når feedback kommer.'
                                  : 'Sist sendt kommando vises med lavere tillit.')}
                          </span>
                        </div>
                      </div>

                      <div className="shading-card__actions" aria-label="Solskjerming handlinger">
                        <button
                          type="button"
                          className="manager-action"
                          disabled={!entry.actionAvailability.moveUp}
                          title={entry.actionAvailability.moveUp ? entry.defaultDpts.upDown : 'Mangler opp/ned-GA'}
                          onClick={() => handleShadingAction(entry.shadingId, 'moveUp')}
                        >
                          Opp
                        </button>
                        <button
                          type="button"
                          className="manager-action"
                          disabled={!entry.actionAvailability.stop}
                          title={entry.actionAvailability.stop ? entry.defaultDpts.stop : 'Mangler stopp-GA'}
                          onClick={() => handleShadingAction(entry.shadingId, 'stop')}
                        >
                          Stopp
                        </button>
                        <button
                          type="button"
                          className="manager-action"
                          disabled={!entry.actionAvailability.moveDown}
                          title={entry.actionAvailability.moveDown ? entry.defaultDpts.upDown : 'Mangler opp/ned-GA'}
                          onClick={() => handleShadingAction(entry.shadingId, 'moveDown')}
                        >
                          Ned
                        </button>
                        <button
                          type="button"
                          className="manager-action manager-action--secondary"
                          onClick={() => handleShadingAction(entry.shadingId, 'moveUp', undefined, true)}
                        >
                          Dry-run
                        </button>
                      </div>

                      {entry.actionAvailability.setPosition ? (
                        <div className="shading-card__position">
                          <label>
                            <span>Posisjon</span>
                            <strong>{positionValue}%</strong>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={positionValue}
                              onChange={(event) =>
                                setShadingPositionDraftById((current) => ({
                                  ...current,
                                  [entry.shadingId]: Number(event.target.value),
                                }))
                              }
                            />
                          </label>
                          <button
                            type="button"
                            className="manager-action"
                            onClick={() => handleShadingAction(entry.shadingId, 'setPosition', positionValue)}
                          >
                            Send posisjon
                          </button>
                        </div>
                      ) : (
                        <p className="shading-card__notice">Posisjon mangler GA og er derfor ikke styrbar ennå.</p>
                      )}
                    </article>
                  )
                })}
            </div>
          ) : (
            <article className="dashboard-card placeholder-card">
              <span className="view-switch__icon" aria-hidden="true">
                {getMainViewIcon('shading')}
              </span>
              <div>
                <h2>Ingen synlig solskjerming</h2>
                <p className="dashboard-card__meta">
                  Aktiver solskjerming i Manager for å vise foundation-kort her. Tomme gruppeadresser vises som manglende mapping.
                </p>
              </div>
              <span className="status-line status-line--idle" aria-hidden="true" />
            </article>
          )}
        </section>
      ) : activeMainView === 'camera' ? (
        <section className="room-section" aria-label="Kamera">
          <div className="room-section__header">
            <p className="eyebrow">Kamera</p>
            <h2>Kamera / NVR</h2>
            <span>
              {cameraPageSummary.visibleCount} kamera · {cameraPageSummary.recordingEnabledCount} recording · {cameraPageSummary.recorderTargetLabel}
            </span>
          </div>
          <article className="dashboard-card camera-summary-card">
            <div className="media-card__header">
              <div>
                <p className="room-card__label">Recorder foundation</p>
                <h2>{formatRecorderTarget(cameraPageConfig.recorder.target)}</h2>
                <p className="dashboard-card__meta">
                  Retention {cameraPageConfig.recorder.retentionDays} dager · overwrite {cameraPageConfig.recorder.overwriteOldest ? 'på' : 'av'} · recording pipeline ikke aktiv ennå.
                </p>
              </div>
              <span className="media-card__badge">{cameraPageConfig.providerEnabled ? 'Foundation aktiv' : 'Foundation av'}</span>
            </div>
            <div className="media-route-status">
              <div>
                <span>Lagring</span>
                <strong>{cameraPageConfig.recorder.path || 'Ikke valgt'}</strong>
              </div>
              <div>
                <span>Storage health</span>
                <strong>{cameraPageConfig.recorder.storageHealth}</strong>
              </div>
              <div>
                <span>Free estimate</span>
                <strong>{cameraPageConfig.recorder.freeSpaceEstimateGb ?? '—'} GB</strong>
              </div>
              <p>
                Dette er NVR/config foundation. Lynell dekoder ikke stream og tar ikke opp video automatisk ennå.
              </p>
            </div>
          </article>
          {visibleCameraCards.length > 0 ? (
            <div className="camera-card-grid">
              {visibleCameraCards.map((camera) => {
                const inputs = getCameraConfiguredInputs(camera)
                const status = formatCameraTrustStatus(camera)

                return (
                  <article key={camera.cameraId} className="dashboard-card camera-device-card">
                    <div className="media-card__header">
                      <div>
                        <p className="room-card__label">{formatCameraType(camera.type)}</p>
                        <h2>{camera.displayName}</h2>
                        <p className="dashboard-card__meta">
                          {camera.roomId
                            ? systemConfigData.rooms.find((room) => room.key === camera.roomId)?.name ?? camera.roomId
                            : 'Ikke plassert i rom'}
                        </p>
                      </div>
                      <span className="media-card__badge">{status}</span>
                    </div>
                    <div className="camera-snapshot-placeholder" aria-label="Camera snapshot placeholder">
                      <span>{inputs.snapshot ? 'Snapshot URL konfigurert' : 'Ingen live stream tilgjengelig ennå'}</span>
                    </div>
                    <div className="media-route-status">
                      <div>
                        <span>RTSP</span>
                        <strong>{inputs.rtsp ? 'Konfigurert' : 'Mangler'}</strong>
                      </div>
                      <div>
                        <span>ONVIF</span>
                        <strong>{inputs.onvif ? 'Konfigurert' : 'Foundation'}</strong>
                      </div>
                      <div>
                        <span>Recording</span>
                        <strong>{camera.recordingEnabled ? 'Forberedt' : 'Av'}</strong>
                      </div>
                      <p>
                        {camera.type === 'tapoFoundation'
                          ? 'Tapo C520WS er forberedt som lokal RTSP/ONVIF-kandidat. Credentials og stream-avspilling er ikke koblet her.'
                          : 'Kameraet er foundation/config til stream, snapshot og recorder runtime finnes.'}
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <article className="dashboard-card placeholder-card">
              <span className="view-switch__icon" aria-hidden="true">
                {getMainViewIcon(activeMainView)}
              </span>
              <div>
                <h2>Ingen kamera konfigurert</h2>
                <p className="dashboard-card__meta">
                  Legg inn kamera i Manager. Kamera kan vises som foundation selv uten aktiv stream.
                </p>
              </div>
              <span className="status-line status-line--idle" aria-hidden="true" />
            </article>
          )}
        </section>
      ) : activeMainView === 'media' ? (
        <section className="room-section" aria-label="Media">
          <div className="room-section__header">
            <p className="eyebrow">Media</p>
            <h2>Lynell Media</h2>
            <span>
              {mediaLibrarySource === 'local'
                ? 'Lokalt bibliotek aktivt'
                : mediaLibrarySource === 'empty'
                  ? 'Ingen sanger funnet'
                  : `${runtimeModeLabel} bibliotek`} · {mediaLibrary.length} spor · {selectableMediaDevices.length} live outputs
            </span>
          </div>

          <article className="dashboard-card media-card media-card--page">
            <div className="media-card__header">
              <div>
                <p className="room-card__label">Nå spiller</p>
                <h2>{currentMediaTrack?.title ?? 'Ingen valgt sang'}</h2>
                <p className="dashboard-card__meta">
                  {currentMediaTrack
                    ? `${currentMediaTrack.artist} · ${currentMediaTrack.album}`
                    : 'Velg en sang fra det lokale biblioteket'}
                </p>
              </div>
              <span className="media-card__badge">{mediaPlaybackBadge}</span>
            </div>

            <div className="media-player">
              <div className="media-player__cover" aria-hidden="true">
                <span>♪</span>
              </div>
              <div className="media-player__body">
                <div className="media-card__controls" aria-label="Media-kontroller">
                  <button
                    type="button"
                    className="media-card__button"
                    onClick={() => handleSkipMediaTrack('previous')}
                    disabled={mediaLibrary.length === 0}
                    aria-label="Forrige"
                  >
                    ‹‹
                  </button>
                  <button
                    type="button"
                    className="media-card__button media-card__button--primary"
                    onClick={handleToggleMediaPlayback}
                    disabled={!currentMediaTrack}
                    aria-label={mediaIsPlayingOnSelectedRoute ? 'Pause' : 'Spill'}
                  >
                    {mediaIsPlayingOnSelectedRoute ? 'Ⅱ' : '▷'}
                  </button>
                  <button
                    type="button"
                    className="media-card__button"
                    onClick={() => handleSkipMediaTrack('next')}
                    disabled={mediaLibrary.length === 0}
                    aria-label="Neste"
                  >
                    ››
                  </button>
                </div>
                <div className="media-card__volume">
                  <span>Volum · {mediaPlayer.volume}%</span>
                  <input
                    className="brightness-control__slider"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={mediaPlayer.volume}
                    onChange={(event) => handleMediaVolumeChange(Number(event.target.value))}
                    aria-label="Volum"
                  />
                </div>
                {currentMediaTrack ? (
                  <div className="media-progress" aria-label="Playback progress">
                    <div>
                      <span>{formatTrackDuration(Math.floor(mediaPlayer.elapsed))}</span>
                      <span>{currentMediaDuration > 0 ? formatTrackDuration(Math.floor(currentMediaDuration)) : '--:--'}</span>
                    </div>
                    <progress value={mediaProgressPercent} max="100" />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="media-output">
              <label className="media-output__field">
                <span>Aktiv output</span>
                <select
                  className="manager-input"
                  value={mediaOutputSelectValue}
                  onChange={(event) => handleMediaDeviceChange(event.target.value)}
                >
                  {selectableMediaDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="media-output__status">
                <span>{activeMediaRouteLine}</span>
                <strong>{activeMediaDeviceTruthStatus}</strong>
              </div>
            </div>
            <div className="media-route-status" aria-label="Media routing status">
              <div>
                <span>Avspilling</span>
                <strong>{mediaRouteLabel}</strong>
              </div>
              <div>
                <span>Aktiv output</span>
                <strong>{activeMediaDevice?.name ?? 'Ingen output'}</strong>
              </div>
              <div>
                <span>Playback nå</span>
                <strong>{mediaRoutePlaybackLabel}</strong>
              </div>
              <p>
                {mediaRouteReadinessText}
                {selectedMediaRoute === 'cast'
                  ? ` Statusgrunnlag: ${castPlaybackFreshness}, confidence ${castPlaybackConfidence}.`
                  : ''}
              </p>
            </div>
            <div className="media-output-grid" aria-label="Tilgjengelige media outputs">
              {selectableMediaDevices.map((device) => (
                <button
                  key={device.deviceId}
                  type="button"
                  className={`media-output-card ${device.deviceId === mediaPlayer.activeDeviceId ? 'is-active' : ''}`}
                  onClick={() => handleMediaDeviceChange(device.deviceId)}
                >
                  <span>{getMediaDeviceTypeLabel(device.type)}</span>
                  <strong>{device.name}</strong>
                  <small>{getMediaDeviceLocationLabel(device)} · {getMediaDeviceAvailabilityLabel(device.availability)}</small>
                  <small>
                    Status: {getMediaDeviceTruthStatus(device)}
                    {device.statusDetail ? ` · ${device.statusDetail}` : ''}
                  </small>
                </button>
              ))}
            </div>
            {runtimeAllowsMock && foundationMediaDevices.length ? (
              <div className="media-output-grid" aria-label="Foundation media outputs">
                {foundationMediaDevices.map((device) => (
                  <article key={device.deviceId} className="media-output-card media-output-card--foundation">
                    <span>{getMediaDeviceTypeLabel(device.type)}</span>
                    <strong>{device.name}</strong>
                    <small>{getMediaDeviceLocationLabel(device)} · Foundation/dev</small>
                    <small>Ikke live-valg når ekte Cast-enheter finnes.</small>
                  </article>
                ))}
              </div>
            ) : null}
          </article>

          <article className="dashboard-card media-cast-card">
            <div className="media-card__header">
              <div>
                <p className="room-card__label">Media groups foundation</p>
                <h2>Grupperte høyttalere</h2>
                <p className="dashboard-card__meta">
                  {mediaGroupPageSummary.groupCount} grupper · {mediaGroupPageSummary.speakerCount} medlemmer · {mediaGroupPageSummary.delayOffsetCount} delay offsets.
                </p>
              </div>
              <span className="media-card__badge">Foundation</span>
            </div>
            {configuredMediaGroups.length > 0 ? (
              <div className="media-output-grid" aria-label="Media groups">
                {configuredMediaGroups.map((group) => (
                  <article key={group.mediaGroupId} className="media-output-card media-output-card--foundation">
                    <span>{getMediaGroupStatus(group)}</span>
                    <strong>{group.displayName}</strong>
                    <small>{group.speakers.length} høyttalere · {group.castTargets.length} cast targets</small>
                    <small>
                      Confidence {group.groupConfidence} · offsets {group.speakers.filter((speaker) => speaker.offsetMs !== 0).length}
                    </small>
                  </article>
                ))}
              </div>
            ) : (
              <p className="dashboard-card__meta">
                Ingen media groups konfigurert ennå. Opprett grupper i Manager for speaker grouping og ms-delay foundation.
              </p>
            )}
            <p className="dashboard-card__meta">
              Dette er arkitektur/config foundation. Lynell kjører ikke full audio sync-engine eller multiroom orchestration ennå.
            </p>
          </article>

          <article className="dashboard-card media-cast-card">
            <div className="media-card__header">
              <div>
                <p className="room-card__label">Cast discovery</p>
                <h2>Google Home / Chromecast</h2>
                <p className="dashboard-card__meta">
                  {castDiscoveryStatusText}. Enheter beholdes som stale/offline før de fjernes fra tilliten.
                </p>
              </div>
              <span className="media-card__badge">
                {castDiscoveryTruthStatus}
              </span>
            </div>
            <div className="media-cast-card__body">
              <div>
                <span>Discovery</span>
                <strong>{castDiscoveryTruthStatus}</strong>
              </div>
              <div>
                <span>Sist søkt</span>
                <strong>{bridgeCastState.snapshot?.lastDiscoveryAt ?? 'Ikke kjørt'}</strong>
              </div>
              <div>
                <span>Dependency</span>
                <strong>
                  {bridgeCastState.snapshot?.dependencyReady === true
                    ? 'OK'
                    : bridgeCastState.snapshot?.dependencyReady === false
                      ? 'Mangler dependency'
                      : bridgeCastState.snapshot?.dependency ?? 'bonjour-service'}
                </strong>
              </div>
              <div>
                <span>Enheter</span>
                <strong>
                  {castOnlineDeviceCount} online · {castStaleDeviceCount} stale · {castOfflineDeviceCount} offline
                </strong>
              </div>
              <div>
                <span>Playback</span>
                <strong>{castPlaybackTruthStatus}</strong>
              </div>
            </div>
            <p className="dashboard-card__meta">
              {bridgeCastState.playback?.message ??
                'Cast playback er klar for kontrollert MP3-test. Cast-enhet må nå Lynell server på LAN-IP, ikke localhost.'}
            </p>
            {!bridgeCastState.snapshot?.enabled || !bridgeCastState.snapshot.discoveryEnabled ? (
              <p className="dashboard-card__meta">
                Installer bonjour-service og sett LYNELL_CAST_ENABLED=true og LYNELL_CAST_DISCOVERY_ENABLED=true for live discovery-test.
              </p>
            ) : null}
            {bridgeCastState.snapshot?.devices.length ? (
              <div className="media-cast-device-list" aria-label="Oppdagede Cast-enheter">
                {bridgeCastState.snapshot.devices.map((device) => (
                  <span key={device.id}>
                    {device.name} · {getCastDeviceStateLabel(device)} · sist sett {getCastDeviceLastSeenLabel(device)} ·{' '}
                    {device.ip || device.host || 'LAN'} · {device.model}
                  </span>
                ))}
              </div>
            ) : bridgeCastState.snapshot?.error || bridgeCastState.error ? (
              <p className="dashboard-card__meta">{bridgeCastState.snapshot?.error ?? bridgeCastState.error}</p>
            ) : bridgeCastState.snapshot?.enabled && bridgeCastState.snapshot.discoveryEnabled && bridgeCastState.snapshot.lastDiscoveryAt ? (
              <p className="dashboard-card__meta">
                Ingen Cast-enheter funnet akkurat nå. Discovery er aktiv; sjekk at enheten er på samme nettverk.
              </p>
            ) : null}
            <button
              type="button"
              className="media-cast-card__action"
              onClick={handleDiscoverCastDevices}
            >
              Søk etter Cast-enheter
            </button>
            <div className="media-cast-card__actions" aria-label="Cast playback testmodus">
              <button
                type="button"
                className="media-cast-card__action"
                onClick={() => handleCastPlayFoundation()}
              >
                Test Cast playback
              </button>
              <button
                type="button"
                className="media-cast-card__action"
                onClick={handleCastPauseFoundation}
              >
                Pause Cast
              </button>
              <button
                type="button"
                className="media-cast-card__action"
                onClick={handleCastStopFoundation}
              >
                Stopp Cast
              </button>
            </div>
          </article>

          <article className="dashboard-card media-library-card">
            <div className="media-card__header">
              <div>
                <p className="room-card__label">Lokalt bibliotek</p>
                <h2>/media/music</h2>
                <p className="dashboard-card__meta">{mediaLibraryMessage}</p>
              </div>
              <span className="media-card__badge">
                {mediaLibrarySource === 'local' ? 'Aktiv' : mediaLibrarySource === 'empty' ? 'Tomt' : runtimeModeLabel}
              </span>
            </div>
            <div className="media-library-list">
              {mediaLibrary.length > 0 ? mediaLibrary.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  className={`media-library-item ${
                    track.id === mediaPlayer.currentTrackId ? 'is-active' : ''
                  }`}
                  onClick={() => handleMediaTrackSelect(track.id)}
                >
                  <span>
                    <strong>{track.title}</strong>
                    <small>{track.artist} · {track.album}</small>
                  </span>
                  <em>{track.duration > 0 ? formatTrackDuration(track.duration) : '--:--'}</em>
                </button>
              )) : (
                <p className="dashboard-card__meta">
                  Legg .mp3-filer i media/music for lokal avspilling.
                </p>
              )}
            </div>
          </article>

        </section>
      ) : activeMainView === 'assistants' ? (
        <section className="room-section" aria-label="Assistenter">
          <div className="room-section__header">
            <p className="eyebrow">Assistenter</p>
            <h2>Fysiske assistenter</h2>
            <span>
              {vacuumTruthStatus}: {bridgeVacuumState.snapshot?.providerLabel ?? (runtimeAllowsMock ? 'Demo/developer foundation' : 'Live Mode')}
            </span>
          </div>

          <article className="dashboard-card assistant-manager-card">
            <div className="assistant-card__header">
              <div>
                <p className="room-card__label">Assistant Manager</p>
                <h2>Integrasjoner og providers</h2>
                <p className="dashboard-card__meta">
                  Serveren eier integrasjonsstatus. Frontend viser kun safe auth-status, readiness og capability mapping.
                </p>
              </div>
              <span className="assistant-card__status">
                {integrationManagerState.snapshot
                  ? `${assistantManagerLiveCount} live · ${assistantManagerStatusOnlyCount} status · ${assistantManagerFoundationCount} foundation`
                  : 'Venter'}
              </span>
            </div>
            <div className="assistant-runtime-overview" aria-label="Runtime summary">
              <div>
                <span>KNX</span>
                <strong>
                  {diagnosticsSnapshotWithNivaPresence.knxDiagnostics?.runtime?.active
                    ? 'Connected'
                    : diagnosticsSnapshotWithNivaPresence.knxDiagnostics?.runtimeConfigSource?.includes('persisted')
                      ? 'Restored'
                      : 'Standby'}
                </strong>
                <small>
                  {diagnosticsSnapshotWithNivaPresence.knxDiagnostics?.runtime?.targetCount ?? 0} targets ·{' '}
                  {diagnosticsSnapshotWithNivaPresence.knxDiagnostics?.writePath?.connectionState ?? 'unknown'}
                </small>
              </div>
              <div>
                <span>Runtime</span>
                <strong>
                  {diagnosticsSnapshotWithNivaPresence.runtimeEventStream?.runtimeBoot?.ready
                    ? 'Healthy'
                    : diagnosticsSnapshotWithNivaPresence.runtimeEventStream?.runtimeBoot?.degraded
                      ? 'Degraded'
                      : diagnosticsSnapshotWithNivaPresence.bridgeStatusLabel}
                </strong>
                <small>
                  {diagnosticsSnapshotWithNivaPresence.runtimeEventStream?.fallbackPollingStatus ?? 'event stream + fallback'}
                </small>
              </div>
              <div>
                <span>Providers</span>
                <strong>{assistantManagerLiveCount} live</strong>
                <small>{assistantManagerControlCount} control · {assistantManagerStatusOnlyCount} status-only</small>
              </div>
              <div>
                <span>Signals</span>
                <strong>{diagnosticsSnapshotWithNivaPresence.knxDiagnostics?.runtime?.staleGroupCount ?? 0} stale</strong>
                <small>{diagnosticsSnapshotWithNivaPresence.knxDiagnostics?.runtime?.cachedGroupCount ?? 0} cached groups</small>
              </div>
              <div>
                <span>Approvals</span>
                <strong>
                  {diagnosticsSnapshotWithNivaPresence.runtimeEventStream?.actionMetrics?.pendingApprovals ?? 0}
                </strong>
                <small>venter på godkjenning</small>
              </div>
              <div>
                <span>NIVA</span>
                <strong>
                  {nivaObservationalIntelligence.observations[0]?.severity ?? 'quiet'}
                </strong>
                <small>{nivaObservationalIntelligence.observations[0]?.explanation ?? 'Ingen aktiv hovedobservasjon'}</small>
              </div>
            </div>
            <div className="assistant-provider-sections" aria-label="Provider groups">
              {assistantProviderSections.map((section) => (
                <section key={section.id} className={`assistant-provider-section assistant-provider-section--${section.id}`}>
                  <div className="assistant-provider-section__header">
                    <div>
                      <p className="room-card__label">{section.title}</p>
                      <p className="dashboard-card__meta">{section.detail}</p>
                    </div>
                    <span>{section.providers.length}</span>
                  </div>
                  <div className="assistant-provider-compact-grid">
                    {section.providers.map((provider) => (
                      <article key={`compact-${provider.id}`} className="assistant-provider-compact-card">
                        <div className="assistant-provider-compact-card__top">
                          <div>
                            <span>{provider.provider}</span>
                            <strong>{provider.name}</strong>
                          </div>
                          <em>{getAssistantProviderMaturityLabel(provider.maturity)}</em>
                        </div>
                        <p>{provider.readiness}</p>
                        <div className="assistant-provider-compact-card__facts">
                          <span>{provider.runtimeConnected ? 'connected' : 'not connected'}</span>
                          <span>{provider.controlAvailable ? 'control available' : 'read/status only'}</span>
                          <span>{provider.runtimeHealth}</span>
                          <span>{provider.sendsCommands ? 'commands' : 'no commands'}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <details className="assistant-advanced-provider-details">
              <summary>Advanced provider details</summary>
              <p className="dashboard-card__meta">
                Lifecycle, discovery, recovery og raw diagnostics ligger her for Developer Mode og feilsøking.
              </p>
            <div className="assistant-manager-grid" aria-label="Assistant provider status">
              {assistantManagerProviders.length > 0 ? assistantManagerProviders.map((provider) => (
                <article key={provider.id} className="assistant-provider-card">
                  <div>
                    <span>{provider.provider}</span>
                    <strong>{provider.name}</strong>
                  </div>
                  <p>{provider.readiness}</p>
                  <div>
                    <span>
                      {provider.maturity === 'liveRuntime'
                        ? 'Live'
                        : provider.maturity === 'statusOnly'
                          ? 'Status only'
                          : provider.maturity === 'future'
                            ? 'Prepared / future'
                            : provider.maturity === 'mock'
                              ? 'Mock/demo'
                              : 'Foundation only'}
                    </span>
                    <span>{provider.lifecycle?.lifecycleState ?? provider.connectionState}</span>
                    <span>{provider.runtimeHealth}</span>
                    <span>{provider.credentials.configured ? 'auth klar' : provider.authRequired ? 'auth mangler' : 'uten auth'}</span>
                  </div>
                  <div>
                    <span>{provider.supportsRead ? 'read' : 'no read'}</span>
                    <span>{provider.supportsWrite ? 'write-capable' : 'no write'}</span>
                    <span>{provider.sendsCommands ? 'commands' : 'no commands'}</span>
                    <span>{provider.controlAvailable ? 'control available' : 'control unavailable'}</span>
                  </div>
                  {provider.orchestration ? (
                    <div className="assistant-provider-orchestration">
                      <span>{provider.orchestration.recoveryState}</span>
                      <strong>
                        {provider.orchestration.recoveryBlocked
                          ? 'Recovery paused'
                          : provider.orchestration.recoveryEligible
                            ? 'Recovery window ready'
                            : provider.orchestration.recoveredAt
                              ? 'Recovered recently'
                              : provider.orchestration.stale
                                ? 'Runtime stale'
                                : provider.orchestration.reconnectRecommended
                                  ? 'Recovery readiness'
                                  : 'Runtime fresh'}
                      </strong>
                      <small>
                        {provider.orchestration.recoveryReason ??
                          provider.orchestration.degradedReason ??
                          `Heartbeat ${provider.orchestration.runtimeHeartbeatAt ?? 'venter'} · cadence ${Math.round(provider.orchestration.pollingCadence / 1000)}s`}
                      </small>
                      {provider.orchestration.nextRecoveryAttemptAt || provider.orchestration.recoveryCooldownUntil ? (
                        <small>
                          {provider.orchestration.recoveryCooldownUntil
                            ? `Cooldown til ${provider.orchestration.recoveryCooldownUntil}`
                            : `Neste recovery-vindu ${provider.orchestration.nextRecoveryAttemptAt}`}
                        </small>
                      ) : null}
                    </div>
                  ) : null}
                  {provider.persistence ? (
                    <div className="assistant-provider-persistence">
                      <span>{provider.persistence.persisted ? 'Persisted' : 'Session'}</span>
                      <strong>
                        {provider.persistence.encryptedCredentials
                          ? 'Encrypted credentials'
                          : provider.persistence.secureLocalStorage
                            ? 'Secure local foundation'
                            : 'No local vault'}
                      </strong>
                      <small>
                        {provider.persistence.restored
                          ? `Restored ${provider.persistence.restoredAt ?? 'ved boot'}`
                          : 'Ikke lagret ennå'}
                      </small>
                    </div>
                  ) : null}
                  {provider.lifecycle ? (
                    <div className="assistant-provider-lifecycle">
                      <span>{provider.lifecycle.enabled ? 'Enabled' : 'Disabled'}</span>
                      <strong>{provider.lifecycle.healthReason}</strong>
                      <small>{provider.lifecycle.recommendedAction}</small>
                      <div className="assistant-provider-lifecycle__actions">
                        <button
                          type="button"
                          onClick={() => void handleIntegrationLifecycleAction(
                            provider.provider,
                            provider.lifecycle?.enabled ? 'disable' : 'enable',
                          )}
                        >
                          {provider.lifecycle.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          disabled={!provider.lifecycle.canActivate}
                          onClick={() => void handleIntegrationLifecycleAction(provider.provider, 'activate')}
                        >
                          Activate
                        </button>
                        <button
                          type="button"
                          disabled={!provider.lifecycle.canDeactivate}
                          onClick={() => void handleIntegrationLifecycleAction(provider.provider, 'deactivate')}
                        >
                          Deactivate
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {provider.onboarding ? (
                    <div className="assistant-provider-onboarding">
                      <span>{provider.onboarding.onboardingStatus}</span>
                      <strong>
                        {provider.onboarding.runtimeReady
                          ? 'Runtime klar'
                          : provider.onboarding.validated
                            ? 'Validert'
                            : `${provider.onboarding.missingRequirements.length} mangler`}
                      </strong>
                      <small>{provider.onboarding.recommendedNextStep}</small>
                    </div>
                  ) : null}
                  {provider.provider === 'deltacoTuya' ? (() => {
                    const candidates = Array.isArray(provider.safeConfig.candidates)
                      ? provider.safeConfig.candidates as Array<Record<string, unknown>>
                      : []
                    const identifySession = deltacoIdentifyState.snapshot?.session
                    const manualCandidate = deltacoIdentifyState.snapshot?.manualCandidate ?? identifySession?.manualCandidate ?? null
                    const correlations = deltacoIdentifyState.snapshot?.correlations ?? identifySession?.candidateMappings ?? []
                    const excludedCount = Array.isArray(provider.safeConfig.excludedCandidates)
                      ? provider.safeConfig.excludedCandidates.length
                      : 0
                    const activeCount = Array.isArray(provider.safeConfig.activeCandidates)
                      ? provider.safeConfig.activeCandidates.length
                      : candidates.length
                    const confirmedMappings = Array.isArray(provider.safeConfig.confirmedMappings)
                      ? provider.safeConfig.confirmedMappings as DeltacoTuyaConfirmedMapping[]
                      : []
                    const protocolResearch = (
                      deltacoProtocolResearchState.snapshot ??
                      provider.safeConfig.protocolResearch ??
                      null
                    ) as DeltacoTuyaProtocolResearchSnapshot | null
                    const confirmedIps = new Set(confirmedMappings.map((mapping) => mapping.ip))
                    const confirmedOrders = new Set(confirmedMappings.map((mapping) => mapping.physicalOrder))
                    const unconfirmedCandidates = candidates.filter((candidate) =>
                      candidate.classification !== 'excludedKnownDevice' &&
                      !confirmedIps.has(String(candidate.ip ?? '')) &&
                      !confirmedOrders.has(Number(candidate.physicalOrder ?? 0)),
                    )

                    return (
                      <div className="assistant-provider-discovery">
                        <span>Discovery</span>
                        <strong>
                          {activeCount} aktive · {excludedCount} ekskludert · {confirmedMappings.length} bekreftet
                        </strong>
                        <small>
                          Lampe 1-5 ligger som manuelle kandidater i Stue. Ingen av/på-kommandoer er aktive.
                        </small>
                        <div className="assistant-provider-discovery__actions">
                          <button
                            type="button"
                            onClick={() => void handleStartDeltacoIdentify(1)}
                          >
                            Start identify session
                          </button>
                          <button
                            type="button"
                            disabled={!identifySession}
                            onClick={() => void handleObserveDeltacoIdentify()}
                          >
                            Observer etter toggle
                          </button>
                          <button
                            type="button"
                            disabled={confirmedMappings.length === 0}
                            onClick={() => void handleRunDeltacoProtocolResearch()}
                          >
                            Protocol research
                          </button>
                        </div>
                        {identifySession ? (
                          <small>
                            {identifySession.instruction}
                          </small>
                        ) : (
                          <small>
                            Start økten, slå Lampe 1 av/på i Deltaco-appen, og observer signalendringen.
                          </small>
                        )}
                        {manualCandidate ? (
                          <small>
                            Foreløpig kandidat: Lampe {manualCandidate.physicalOrder} → {manualCandidate.candidateIp}
                            {' '}
                            ({manualCandidate.confidence}, ikke bekreftet)
                          </small>
                        ) : correlations.length > 0 ? (
                          <small>
                            Ingen tydelig mapping ennå. Beste signal: {correlations[0]?.ip ?? 'ukjent'}
                            {' '}
                            ({correlations[0]?.confidence ?? 'none'})
                          </small>
                        ) : null}
                        {confirmedMappings.length > 0 ? (
                          <div className="assistant-provider-discovery__list">
                            {confirmedMappings.map((mapping) => (
                              <span key={mapping.deviceId}>
                                {mapping.displayName} · {mapping.ip} · bekreftet
                                {runtimeAllowsMock && mapping.confirmedAt ? ` · ${mapping.confirmedAt}` : ''}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <small>
                            Ingen Lampe-mapping er bekreftet ennå. Bekreft bare IP-er du har validert fysisk.
                          </small>
                        )}
                        <div className="assistant-provider-discovery__actions">
                          {unconfirmedCandidates
                            .filter((candidate) => Number(candidate.physicalOrder ?? 0) >= 1)
                            .slice(0, 5)
                            .map((candidate) => (
                              <button
                                key={`confirm-${String(candidate.ip)}`}
                                type="button"
                                onClick={() => void handleConfirmDeltacoMapping(
                                  String(candidate.ip),
                                  Number(candidate.physicalOrder),
                                  String(candidate.name ?? `Lampe ${String(candidate.physicalOrder)}`),
                                )}
                              >
                                Bekreft {String(candidate.name ?? `Lampe ${String(candidate.physicalOrder)}`)}
                              </button>
                            ))}
                        </div>
                        {protocolResearch ? (
                          <small>
                            Protocol research: {protocolResearch.summary.protocolHints.join(', ') || protocolResearch.protocolResearchState}
                            {' '}
                            · cloud {protocolResearch.summary.cloudDependencyLikelihood}
                            {' '}
                            · confidence {protocolResearch.summary.confidence}
                            {runtimeAllowsMock && protocolResearch.summary.observedPorts?.length
                              ? ` · ports ${protocolResearch.summary.observedPorts.join('/')}`
                              : ''}
                          </small>
                        ) : (
                          <small>
                            Protocol research er klar når minst én mapping er bekreftet. Den sender ingen payloads eller kommandoer.
                          </small>
                        )}
                        {runtimeAllowsMock && protocolResearch?.devices?.length ? (
                          <div className="assistant-provider-discovery__list">
                            {protocolResearch.devices.map((device) => (
                              <span key={`protocol-${device.deviceId}`}>
                                {device.displayName} · {device.communicationProfile}
                                {device.observedPorts.length ? ` · ports ${device.observedPorts.join('/')}` : ' · no ports'}
                                {` · ${device.protocolConfidence}`}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="assistant-provider-discovery__list">
                          {candidates.slice(0, runtimeAllowsMock ? 6 : 5).map((candidate) => (
                            <span key={String(candidate.id ?? candidate.ip)}>
                              {candidate.physicalOrder ? `${candidate.physicalOrder}. ` : ''}
                              {String(candidate.name ?? 'Kandidat')}
                              {' '}
                              {String(candidate.classification ?? (candidate.reachable ? 'reachable' : 'ukjent'))}
                              {runtimeAllowsMock && candidate.ip ? ` · ${String(candidate.ip)}` : ''}
                              {runtimeAllowsMock && candidate.hostname ? ` · ${String(candidate.hostname)}` : ''}
                              {runtimeAllowsMock && candidate.exclusionReason ? ` · ${String(candidate.exclusionReason)}` : ''}
                              {runtimeAllowsMock && Array.isArray(candidate.openPorts) && candidate.openPorts.length > 0
                                ? ` · ports ${candidate.openPorts.join('/')}`
                                : ''}
                              {runtimeAllowsMock && candidate.vendorHint ? ` · ${String(candidate.vendorHint)}` : ''}
                              {runtimeAllowsMock && candidate.likelyTuyaDevice
                                ? ` · Tuya ${String(candidate.likelyTuyaDevice)}`
                                : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })() : null}
                  {runtimeAllowsMock ? (
                    <small>{provider.diagnostics.slice(0, 2).join(' · ') || 'Ingen diagnose ennå'}</small>
                  ) : null}
                </article>
              )) : (
                <p className="dashboard-card__meta">
                  Integrasjonskatalogen er ikke lest ennå. Bridge-status vises når /api/integrations svarer.
                </p>
              )}
            </div>
            </details>
            <p className="dashboard-card__meta">
              {integrationManagerState.snapshot?.credentialPolicy.note ??
                integrationManagerState.error ??
                'Credential foundation er server-owned og returnerer aldri hemmeligheter til UI.'}
            </p>
          </article>

          <div className="assistant-grid">
            {visibleVacuumDevices.length > 0 ? visibleVacuumDevices.map((device) => (
              <article key={device.deviceId} className="dashboard-card assistant-card">
                <div className="assistant-card__header">
                  <div>
                    <p className="room-card__label">{device.manufacturer} · {device.type === 'robotVacuum' ? 'Robotstøvsuger' : 'Assistent'}</p>
                    <h2>{device.model}</h2>
                    <p className="dashboard-card__meta">
                      {vacuumBridgeMessage}
                    </p>
                  </div>
                  <span className={`assistant-card__status ${device.cleaning ? 'is-active' : ''}`}>
                    {formatAssistantStatus(device)}
                  </span>
                </div>

                <div className="assistant-card__body">
                  <div>
                    <span>Batteri</span>
                    <strong>{device.battery}%{device.charging ? ' · lader' : ''}</strong>
                  </div>
                  <div>
                    <span>Aktivitet</span>
                    <strong>{formatAssistantActivity(device)}</strong>
                  </div>
                  <div>
                    <span>Område</span>
                    <strong>{device.currentArea ?? device.currentRoom ?? 'Huset'}</strong>
                  </div>
                  <div>
                    <span>Siste aktivitet</span>
                    <strong>{formatAssistantLastActivity(device)}</strong>
                  </div>
                  <div>
                    <span>Docking</span>
                    <strong>{device.docked ? 'På ladestasjon' : device.status === 'returning' ? 'Returnerer' : 'Ute'}</strong>
                  </div>
                  <div>
                    <span>Integrasjon</span>
                    <strong>{vacuumTruthStatus}</strong>
                  </div>
                  <div>
                    <span>Tillit</span>
                    <strong>
                      {device.trustState === 'online'
                        ? `Fersk · ${device.stateConfidence ?? 'medium'}`
                        : device.trustState === 'stale'
                          ? 'Stale · lav'
                          : device.trustState === 'offline'
                            ? 'Offline · lav'
                            : device.stateConfidence ?? 'Ukjent'}
                    </strong>
                  </div>
                  <div>
                    <span>Provider</span>
                    <strong>{bridgeVacuumState.snapshot?.providerLabel ?? device.integrationStatus.provider}</strong>
                  </div>
                </div>

                {device.cleaning || device.cleaningProgress > 0 ? (
                  <div className="assistant-progress" aria-label="Rengjøringsfremdrift">
                    <div>
                      <span>Rengjøring</span>
                      <span>{device.cleaningProgress}%</span>
                    </div>
                    <progress value={device.cleaningProgress} max="100" />
                  </div>
                ) : null}

                <div className="assistant-foundation-note">
                  <span>Readiness</span>
                  <strong>
                    {bridgeVacuumState.snapshot?.readiness?.label ??
                      `${vacuumTruthStatus} · ${bridgeVacuumState.snapshot?.state ?? 'mock'}`}
                  </strong>
                  <p>
                    {device.trustMessage ??
                      (bridgeVacuumState.snapshot?.readiness?.checks.slice(0, 2).join(' ') ||
                      bridgeVacuumState.snapshot?.error) ??
                      bridgeVacuumState.snapshot?.providers.find(
                        (provider) => provider.id === bridgeVacuumState.snapshot?.provider,
                      )?.nextStep ??
                      device.integrationStatus.nextStep}
                  </p>
                </div>

                <div className="assistant-foundation-note">
                  <span>Strategi</span>
                  <strong>Native Lynell-runtime er premium-retning</strong>
                  <p>
                    Home Assistant er optional kompatibilitetsbro for live-test. Providerlaget gjør at Dream D20 Plus senere kan flyttes til native Dreame, lokal runtime eller MQTT bridge uten å bygge om NIVA/UI.
                  </p>
                </div>

                {isVacuumHomeAssistant ? (
                  <div className="assistant-live-test-panel" aria-label="Home Assistant live-test">
                    <div className="assistant-live-test-panel__header">
                      <span>HA live-test</span>
                      <strong>{vacuumLiveStatusConfirmed ? 'Live bekreftet' : 'Klar for HA-test'}</strong>
                    </div>
                    <div className="assistant-live-test-checks">
                      {vacuumHaStatusChecks.map((check) => (
                        <div key={check.label} className={check.ok ? 'is-ok' : 'is-missing'}>
                          <span>{check.label}</span>
                          <strong>{check.value ?? (check.ok ? 'OK' : 'Mangler')}</strong>
                        </div>
                      ))}
                    </div>
                    <p>{vacuumLastResponse}</p>
                  </div>
                ) : null}

                <div className="assistant-integration-methods" aria-label={`${device.model} integrasjonsmetoder`}>
                  <div className="assistant-integration-methods__header">
                    <span>Integrasjon / metode</span>
                    <strong>
                      {device.integrationStatus.options.find(
                        (option) => option.methodId === device.integrationStatus.selectedMethodId,
                      )?.label ?? device.integrationStatus.provider}
                    </strong>
                  </div>
                  <div>
                    {device.integrationStatus.options.map((option) => (
                      <article key={option.methodId} className={option.recommended ? 'is-recommended' : ''}>
                        <div>
                          <strong>{option.label}</strong>
                          <em>{option.recommended ? 'Avklar først' : option.status}</em>
                        </div>
                        <p>{option.uncertainty}</p>
                        <small>
                          {option.strategicRole} · premium {option.premiumFit} · {option.dependencyLevel} · risiko {option.risk}
                        </small>
                      </article>
                    ))}
                  </div>
                </div>

                {vacuumHaTestMode ? (
                  <div className="assistant-control-row assistant-control-row--test" aria-label={`${device.model} HA testkontroller`}>
                    <button type="button" className="is-primary" onClick={handleAssistantStatusTest}>
                      Test status
                    </button>
                    <button type="button" className="is-safe" onClick={() => handleAssistantDock(device.deviceId)}>
                      Test dock
                    </button>
                    <button type="button" className="is-secondary" onClick={() => handleAssistantStart(device.deviceId, device.currentArea ?? 'Oppholdsrom')}>
                      Test start
                    </button>
                  </div>
                ) : (
                  <div className="assistant-control-row" aria-label={`${device.model} kontroller`}>
                    <button type="button" onClick={() => handleAssistantStart(device.deviceId, device.currentArea ?? 'Oppholdsrom')}>
                      {vacuumLiveStatusConfirmed ? 'Start via HA' : 'Demo start'}
                    </button>
                    <button type="button" onClick={() => handleAssistantPause(device.deviceId)} disabled={!device.cleaning}>
                      {vacuumLiveStatusConfirmed ? 'Pause via HA' : 'Pause'}
                    </button>
                    <button type="button" onClick={() => handleAssistantDock(device.deviceId)} disabled={vacuumLiveStatusConfirmed ? false : device.docked}>
                      {vacuumLiveStatusConfirmed ? 'Send til lading via HA' : 'Demo dock'}
                    </button>
                  </div>
                )}

                {!isVacuumHomeAssistant ? (
                  <div className="assistant-area-list" aria-label="Rengjøringsområder">
                    <span>Demoområde</span>
                    <div>
                      {assistantCleaningAreas.map((area) => (
                        <button
                          key={area}
                          type="button"
                          className={device.currentArea === area ? 'is-active' : ''}
                          onClick={() => handleAssistantStart(device.deviceId, area)}
                        >
                          {area}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            )) : (
              <article className="dashboard-card assistant-card">
                <div>
                  <p className="room-card__label">Live Mode</p>
                  <h2>Ingen live assistent-runtime ennå</h2>
                  <p className="dashboard-card__meta">
                    Demo/developer-assistenter er skjult i Live Mode. Bytt til Demo Mode eller Developer Mode for offline visning.
                  </p>
                </div>
              </article>
            )}

            <article className="dashboard-card assistant-card assistant-card--future">
              <div className="assistant-card__header">
                <div>
                  <p className="room-card__label">Foundation</p>
                  <h2>Flere fysiske assistenter</h2>
                  <p className="dashboard-card__meta">
                    Vindusvasker, robotgressklipper og service-enheter kan få samme modell senere.
                  </p>
                </div>
                <span className="assistant-card__status">Kommer</span>
              </div>
            </article>
          </div>
        </section>
      ) : activeMainView === 'calendar-manager' ? (
        <Suspense fallback={<LazyViewFallback label="Kalender Manager" />}>
          <ManagerPanel
            isConfigDirty={isConfigDirty}
            language={activeLanguage}
            translations={t}
            housingConfig={managerHousingConfig}
            networkConfig={managerNetworkConfig}
            mqttConfig={managerMqttConfig}
            cameraConfig={managerCameraConfig}
            runtimeConfig={managerRuntimeConfig}
            securityConfig={managerSecurityConfig}
            floorConfigs={managerFloorConfigs}
            lightingConfig={managerLightingConfig}
            mediaConfig={managerMediaConfig}
            calendarEvents={managerCalendarConfig.events}
            bookingResources={managerCalendarConfig.resources}
            bookings={managerCalendarConfig.bookings}
            bookingConflictIds={getBookingConflictIds(
              managerCalendarConfig.bookings,
              managerCalendarConfig.resources,
            )}
            scenes={managerScenesConfig}
            diagnostics={diagnosticsSnapshotWithNivaPresence}
            castBridgeStatus={bridgeCastState.snapshot}
            mqttBridgeStatus={bridgeMqttState.snapshot}
            vacuumBridgeStatus={bridgeVacuumState.snapshot}
            systemRecommendations={managerRecommendations}
            uiCapabilityConfig={uiCapabilityConfig}
            uiCapabilities={resolvedUiCapabilities}
            uiCapabilitySummary={uiCapabilitySummary}
            roomCapabilitySummaries={roomCapabilitySummaries}
            onUiCapabilityChange={updateUiCapabilityOverride}
            onUiCapabilityConfigChange={handleUiCapabilityConfigChange}
            onRoomCapabilityChange={handleRoomCapabilityChange}
            onHclFoundationChange={handleHclFoundationChange}
            conversationLoggingEnabled={conversationLoggingEnabled}
            conversationLoggingStatus={conversationLoggingStatus}
            autoPollQuietSignalsConfig={autoPollQuietSignalsConfig}
            audioConfig={systemConfigData.audio}
            idleScreenConfig={systemConfigData.idleScreen}
            audioManifestSummary={audioManifestSummary}
            audioLastPlayback={audioLastPlayback}
            onConversationLoggingChange={handleConversationLoggingChange}
            onAutoPollQuietSignalsChange={handleAutoPollQuietSignalsChange}
            onAudioConfigChange={handleAudioConfigChange}
            onAudioCategoryChange={handleAudioCategoryChange}
            onTestAudioSound={handleTestAudioSound}
            onIdleScreenConfigChange={handleIdleScreenConfigChange}
            onIdleCustomImageUpload={handleIdleCustomImageUpload}
            onResetIdleCustomImage={handleResetIdleCustomImage}
            onPreviewIdleScreen={handlePreviewIdleScreen}
            onClearTestLog={clearTestLog}
            onRuntimeActionDecision={handleRuntimeActionApproval}
            onManualRuntimeConfigSync={handleManualRuntimeConfigSync}
            onSceneSchedulerTest={handleSceneSchedulerTest}
            onShadingActionTest={handleShadingAction}
            shadingConfig={managerShadingConfig}
            weatherStationConfig={managerWeatherStationConfig}
            technicalConfig={managerTechnicalConfig}
            integrationConfig={managerIntegrationConfig}
            rooms={managerRooms}
            systemConfigRooms={systemConfigData.rooms}
            onLanguageChange={handleLanguageChange}
            onHousingChange={handleHousingChange}
            onNetworkModeChange={handleNetworkModeChange}
            onNetworkEndpointChange={handleNetworkEndpointChange}
            onNetworkConfigChange={handleNetworkConfigChange}
            onMqttConfigChange={handleMqttConfigChange}
            onCameraProviderEnabledChange={handleCameraProviderEnabledChange}
            onCameraRecorderChange={handleCameraRecorderChange}
            onCameraConfigChange={handleCameraConfigChange}
            onAddCameraConfig={handleAddCameraConfig}
            onDeleteCameraConfig={handleDeleteCameraConfig}
            onRuntimeConfigChange={handleRuntimeConfigChange}
            onSecurityConfigChange={handleSecurityConfigChange}
            onMediaConfigChange={handleMediaConfigChange}
            onAddMediaGroupConfig={handleAddMediaGroupConfig}
            onMediaGroupConfigChange={handleMediaGroupConfigChange}
            onAddMediaGroupSpeaker={handleAddMediaGroupSpeaker}
            onMediaGroupSpeakerChange={handleMediaGroupSpeakerChange}
            onDeleteMediaGroupSpeaker={handleDeleteMediaGroupSpeaker}
            onSensorConfigChange={handleSensorConfigChange}
            onShadingConfigChange={handleShadingConfigChange}
            onAddShadingConfig={handleAddShadingConfig}
            onWeatherStationChange={handleWeatherStationChange}
            onTechnicalConfigChange={handleTechnicalConfigChange}
            onIntegrationActiveChange={handleIntegrationActiveChange}
            onAddBacnetPoint={handleAddBacnetPoint}
            onBacnetPointChange={handleBacnetPointChange}
            onCalendarEventChange={handleCalendarEventChange}
            onAddCalendarEvent={handleAddCalendarEvent}
            onDeleteCalendarEvent={handleDeleteCalendarEvent}
            onBookingResourceChange={handleBookingResourceChange}
            onAddBookingResource={handleAddBookingResource}
            onDeleteBookingResource={handleDeleteBookingResource}
            onBookingChange={handleBookingChange}
            onAddBooking={handleAddBooking}
            onDeleteBooking={handleDeleteBooking}
            onSceneChange={handleSceneChange}
            onAddScene={handleAddScene}
            onDeleteScene={handleDeleteScene}
            onAddSceneRoom={handleAddSceneRoom}
            onSceneRoomChange={handleSceneRoomChange}
            onRemoveSceneRoom={handleRemoveSceneRoom}
            onAddSceneLightingTarget={handleAddSceneLightingTarget}
            onSceneLightingTargetChange={handleSceneLightingTargetChange}
            onRemoveSceneLightingTarget={handleRemoveSceneLightingTarget}
            onAddSceneClimateTarget={handleAddSceneClimateTarget}
            onSceneClimateTargetChange={handleSceneClimateTargetChange}
            onRemoveSceneClimateTarget={handleRemoveSceneClimateTarget}
            onFloorNameChange={handleFloorNameChange}
            onAddFloor={handleAddFloor}
            onMoveFloor={handleMoveFloor}
            onAddRoom={handleAddRoom}
            onDeleteRoom={handleDeleteRoom}
            onMoveRoom={handleMoveRoom}
            onRoomNameChange={handleRoomNameChange}
            onRoomConfiguredChange={handleRoomConfiguredChange}
            onOpenRoomManager={handleOpenRoomManager}
            onAddZone={handleAddZone}
            onDeleteZone={handleDeleteZone}
            onZoneNameChange={handleZoneNameChange}
            onZoneConfigChange={handleZoneConfigChange}
            onClimateConfigChange={handleClimateConfigChange}
            onSaveConfig={handleSaveConfigChanges}
            onDiscardConfig={handleDiscardConfigChanges}
            onExportConfig={handleExportConfig}
            onImportConfig={handleImportConfig}
            importMessage={managerMessage}
            layoutMode={layoutMode}
            calendarOnly
            onBackToCalendar={() => setActiveMainView('calendar')}
            onLayoutModeChange={handleLayoutModeChange}
          />
        </Suspense>
      ) : activeMainView === 'room-manager' ? (
        <Suspense fallback={<LazyViewFallback label="Room Manager" />}>
          <RoomManagerPanel
            isConfigDirty={isConfigDirty}
            rooms={managerRooms}
            systemConfigRooms={systemConfigData.rooms}
            floorConfigs={managerFloorConfigs}
            selectedRoomKey={selectedRoomKey}
            shadingConfig={managerShadingConfig}
            uiCapabilityConfig={uiCapabilityConfig}
            onSelectedRoomChange={(roomKey) => setSelectedRoomKey(roomKey)}
            onBackToRooms={() => setActiveMainView('rooms')}
            onRoomNameChange={handleRoomNameChange}
            onRoomConfiguredChange={handleRoomConfiguredChange}
            onRoomAdvancedChange={handleRoomAdvancedChange}
            onAddZone={handleAddZone}
            onDeleteZone={handleDeleteZone}
            onZoneNameChange={handleZoneNameChange}
            onZoneConfigChange={handleZoneConfigChange}
            onClimateConfigChange={handleClimateConfigChange}
            onSensorConfigChange={handleSensorConfigChange}
            onShadingConfigChange={handleShadingConfigChange}
            onSaveConfig={handleSaveConfigChanges}
            onDiscardConfig={handleDiscardConfigChanges}
          />
        </Suspense>
      ) : activeMainView === 'manager' ? (
        <Suspense fallback={<LazyViewFallback label="Manager" />}>
          <ManagerPanel
            isConfigDirty={isConfigDirty}
            language={activeLanguage}
            translations={t}
            housingConfig={managerHousingConfig}
            networkConfig={managerNetworkConfig}
            mqttConfig={managerMqttConfig}
            cameraConfig={managerCameraConfig}
            runtimeConfig={managerRuntimeConfig}
            securityConfig={managerSecurityConfig}
            floorConfigs={managerFloorConfigs}
            lightingConfig={managerLightingConfig}
            mediaConfig={managerMediaConfig}
            calendarEvents={managerCalendarConfig.events}
            bookingResources={managerCalendarConfig.resources}
            bookings={managerCalendarConfig.bookings}
            bookingConflictIds={getBookingConflictIds(
              managerCalendarConfig.bookings,
              managerCalendarConfig.resources,
            )}
            scenes={managerScenesConfig}
            diagnostics={diagnosticsSnapshotWithNivaPresence}
            castBridgeStatus={bridgeCastState.snapshot}
            mqttBridgeStatus={bridgeMqttState.snapshot}
            vacuumBridgeStatus={bridgeVacuumState.snapshot}
            systemRecommendations={managerRecommendations}
            uiCapabilityConfig={uiCapabilityConfig}
            uiCapabilities={resolvedUiCapabilities}
            uiCapabilitySummary={uiCapabilitySummary}
            roomCapabilitySummaries={roomCapabilitySummaries}
            onUiCapabilityChange={updateUiCapabilityOverride}
            onUiCapabilityConfigChange={handleUiCapabilityConfigChange}
            onRoomCapabilityChange={handleRoomCapabilityChange}
            onHclFoundationChange={handleHclFoundationChange}
            conversationLoggingEnabled={conversationLoggingEnabled}
            conversationLoggingStatus={conversationLoggingStatus}
            autoPollQuietSignalsConfig={autoPollQuietSignalsConfig}
            audioConfig={systemConfigData.audio}
            idleScreenConfig={systemConfigData.idleScreen}
            audioManifestSummary={audioManifestSummary}
            audioLastPlayback={audioLastPlayback}
            onConversationLoggingChange={handleConversationLoggingChange}
            onAutoPollQuietSignalsChange={handleAutoPollQuietSignalsChange}
            onAudioConfigChange={handleAudioConfigChange}
            onAudioCategoryChange={handleAudioCategoryChange}
            onTestAudioSound={handleTestAudioSound}
            onIdleScreenConfigChange={handleIdleScreenConfigChange}
            onIdleCustomImageUpload={handleIdleCustomImageUpload}
            onResetIdleCustomImage={handleResetIdleCustomImage}
            onPreviewIdleScreen={handlePreviewIdleScreen}
            onClearTestLog={clearTestLog}
            onRuntimeActionDecision={handleRuntimeActionApproval}
            onManualRuntimeConfigSync={handleManualRuntimeConfigSync}
            onSceneSchedulerTest={handleSceneSchedulerTest}
            onShadingActionTest={handleShadingAction}
            shadingConfig={managerShadingConfig}
            weatherStationConfig={managerWeatherStationConfig}
            technicalConfig={managerTechnicalConfig}
            integrationConfig={managerIntegrationConfig}
            rooms={managerRooms}
            systemConfigRooms={systemConfigData.rooms}
            onLanguageChange={handleLanguageChange}
            onHousingChange={handleHousingChange}
            onNetworkModeChange={handleNetworkModeChange}
            onNetworkEndpointChange={handleNetworkEndpointChange}
            onNetworkConfigChange={handleNetworkConfigChange}
            onMqttConfigChange={handleMqttConfigChange}
            onCameraProviderEnabledChange={handleCameraProviderEnabledChange}
            onCameraRecorderChange={handleCameraRecorderChange}
            onCameraConfigChange={handleCameraConfigChange}
            onAddCameraConfig={handleAddCameraConfig}
            onDeleteCameraConfig={handleDeleteCameraConfig}
            onRuntimeConfigChange={handleRuntimeConfigChange}
            onSecurityConfigChange={handleSecurityConfigChange}
            onMediaConfigChange={handleMediaConfigChange}
            onAddMediaGroupConfig={handleAddMediaGroupConfig}
            onMediaGroupConfigChange={handleMediaGroupConfigChange}
            onAddMediaGroupSpeaker={handleAddMediaGroupSpeaker}
            onMediaGroupSpeakerChange={handleMediaGroupSpeakerChange}
            onDeleteMediaGroupSpeaker={handleDeleteMediaGroupSpeaker}
            onSensorConfigChange={handleSensorConfigChange}
            onShadingConfigChange={handleShadingConfigChange}
            onAddShadingConfig={handleAddShadingConfig}
            onWeatherStationChange={handleWeatherStationChange}
            onTechnicalConfigChange={handleTechnicalConfigChange}
            onIntegrationActiveChange={handleIntegrationActiveChange}
            onAddBacnetPoint={handleAddBacnetPoint}
            onBacnetPointChange={handleBacnetPointChange}
            onCalendarEventChange={handleCalendarEventChange}
            onAddCalendarEvent={handleAddCalendarEvent}
            onDeleteCalendarEvent={handleDeleteCalendarEvent}
            onBookingResourceChange={handleBookingResourceChange}
            onAddBookingResource={handleAddBookingResource}
            onDeleteBookingResource={handleDeleteBookingResource}
            onBookingChange={handleBookingChange}
            onAddBooking={handleAddBooking}
            onDeleteBooking={handleDeleteBooking}
            onSceneChange={handleSceneChange}
            onAddScene={handleAddScene}
            onDeleteScene={handleDeleteScene}
            onAddSceneRoom={handleAddSceneRoom}
            onSceneRoomChange={handleSceneRoomChange}
            onRemoveSceneRoom={handleRemoveSceneRoom}
            onAddSceneLightingTarget={handleAddSceneLightingTarget}
            onSceneLightingTargetChange={handleSceneLightingTargetChange}
            onRemoveSceneLightingTarget={handleRemoveSceneLightingTarget}
            onAddSceneClimateTarget={handleAddSceneClimateTarget}
            onSceneClimateTargetChange={handleSceneClimateTargetChange}
            onRemoveSceneClimateTarget={handleRemoveSceneClimateTarget}
            onFloorNameChange={handleFloorNameChange}
            onAddFloor={handleAddFloor}
            onMoveFloor={handleMoveFloor}
            onAddRoom={handleAddRoom}
            onDeleteRoom={handleDeleteRoom}
            onMoveRoom={handleMoveRoom}
            onRoomNameChange={handleRoomNameChange}
            onRoomConfiguredChange={handleRoomConfiguredChange}
            onOpenRoomManager={handleOpenRoomManager}
            onAddZone={handleAddZone}
            onDeleteZone={handleDeleteZone}
            onZoneNameChange={handleZoneNameChange}
            onZoneConfigChange={handleZoneConfigChange}
            onClimateConfigChange={handleClimateConfigChange}
            onSaveConfig={handleSaveConfigChanges}
            onDiscardConfig={handleDiscardConfigChanges}
            onExportConfig={handleExportConfig}
            onImportConfig={handleImportConfig}
            importMessage={managerMessage}
            layoutMode={layoutMode}
            onLayoutModeChange={handleLayoutModeChange}
          />
        </Suspense>
      ) : (
        <section
          key={`${activeMainView}:${activeFloor?.id ?? 'none'}`}
          className="room-section"
          aria-label={activeMainView === 'lights' ? 'Lys' : 'Klima'}
        >
          <div className="room-section__header">
            <p className="eyebrow">{activeMainView === 'lights' ? 'Lys' : 'Klima'}</p>
            <h2>{activeFloor?.label ?? 'Etasje'}</h2>
          </div>

          {visibleRooms.length === 0 ? (
            <article className="dashboard-card dashboard-card--compact">
              <p className="dashboard-card__meta">
                {activeMainView === 'lights'
                  ? 'Ingen aktive lysrom på denne etasjen.'
                  : 'Ingen aktive klimarom på denne etasjen.'}
              </p>
            </article>
          ) : (
            <div className="room-grid">
              {visibleRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={{
                    ...room,
                    heatDemand:
                      runtimeAllowsMock
                        ? room.heatDemand ?? null
                        : liveClimateHeatDemandRoomKeys.includes(room.key)
                          ? room.heatDemand ?? null
                          : room.heatDemand ?? null,
                  }}
                  disabled={isLoading}
                  systemMode={systemMode}
                  hasClimateConfig={Boolean(lightingConfig[room.key]?.climateActive)}
                  hasModeConfig={
                    Boolean(lightingConfig[room.key]?.climateActive) &&
                    hasConfiguredAddress(lightingConfig[room.key]?.mode)
                  }
                  hasHeatDemandConfig={hasConfiguredAddress(lightingConfig[room.key]?.heatDemand)}
                  hasSetpointWriteConfig={hasConfiguredAddress(lightingConfig[room.key]?.setpoint)}
                  hasLiveTemperatureData={
                    liveClimateTemperatureRoomKeys.includes(room.key) ||
                    typeof getLatestKnxCacheEntry(room.key, 'temperature')?.decodedValue === 'number' ||
                    typeof serverRoomSnapshots.find((snapshot) => snapshot.roomKey === room.key)?.currentTemperature === 'number' ||
                    typeof getLatestServerHistoryPoint(room.key, 'temperature')?.value === 'number'
                  }
                  hasLiveSetpointData={
                    liveClimateSetpointRoomKeys.includes(room.key) ||
                    typeof getLatestKnxCacheEntry(room.key, 'setpointFeedback')?.decodedValue === 'number' ||
                    typeof serverRoomSnapshots.find((snapshot) => snapshot.roomKey === room.key)?.targetTemperature === 'number' ||
                    typeof getLatestServerHistoryPoint(room.key, 'setpoint')?.value === 'number'
                  }
                  hasLiveHeatDemandData={
                    liveClimateHeatDemandRoomKeys.includes(room.key) ||
                    typeof getLatestKnxCacheEntry(room.key, 'heatDemand')?.decodedValue === 'number' ||
                    typeof serverRoomSnapshots.find((snapshot) => snapshot.roomKey === room.key)?.heatDemand === 'number' ||
                    typeof getLatestServerHistoryPoint(room.key, 'heatDemand')?.value === 'number'
                  }
                  historyTrend={getRoomTemperatureHistoryInsight(room)?.trend ?? null}
                  temperatureHistory={getRoomTemperatureHistoryValues(room.key)}
                  comfortSetpoint={comfortSetpoint}
                  nightSetpoint={nightSetpoint}
                  feedbackConfiguredZoneIds={room.zones
                    .filter((zone) => {
                      const zoneConfig = lightingConfig[room.key]?.zones[zone.key]

                      return Boolean(zoneConfig?.lightFeedback || zoneConfig?.valueFeedback)
                    })
                    .map((zone) => zone.id)}
                  lightFeedbackConfiguredZoneIds={room.zones
                    .filter((zone) => {
                      const zoneConfig = lightingConfig[room.key]?.zones[zone.key]

                      return hasConfiguredAddress(zoneConfig?.lightFeedback)
                    })
                    .map((zone) => zone.id)}
                  valueFeedbackConfiguredZoneIds={room.zones
                    .filter((zone) => {
                      const zoneConfig = lightingConfig[room.key]?.zones[zone.key]

                      return hasConfiguredAddress(zoneConfig?.valueFeedback)
                    })
                    .map((zone) => zone.id)}
                  derivedLightStateZoneIds={room.zones
                    .filter((zone) => {
                      const zoneConfig = lightingConfig[room.key]?.zones[zone.key]

                      return (
                        zoneConfig?.feedbackInterpretationRule === 'boolFromValueAboveZero' ||
                        Boolean(zoneConfig?.deriveLightStateFromValueFeedback)
                      )
                    })
                    .map((zone) => zone.id)}
                  confirmedLightFeedbackZoneIds={room.zones
                    .filter((zone) =>
                      confirmedLightFeedbackZoneKeys.includes(`${room.key}:${zone.key}`) ||
                      typeof getLatestKnxCacheEntry(room.key, 'lightFeedback', zone.key, zone.id)?.decodedValue === 'boolean' ||
                      typeof getLatestKnxCacheEntry(room.key, 'valueFeedback', zone.key, zone.id)?.decodedValue === 'number' ||
                      typeof getLatestServerHistoryPoint(room.key, 'brightness', zone.key, zone.id)?.value === 'number',
                    )
                    .map((zone) => zone.id)}
                  confirmedBrightnessFeedbackZoneIds={room.zones
                    .filter((zone) =>
                      confirmedBrightnessFeedbackZoneKeys.includes(`${room.key}:${zone.key}`) ||
                      typeof getLatestKnxCacheEntry(room.key, 'valueFeedback', zone.key, zone.id)?.decodedValue === 'number' ||
                      typeof getLatestServerHistoryPoint(room.key, 'brightness', zone.key, zone.id)?.value === 'number',
                    )
                    .map((zone) => zone.id)}
                  optimisticLightingByZoneId={Object.fromEntries(
                    room.zones
                      .map((zone) => {
                        const entry =
                          optimisticLightingByKey[getOptimisticLightingKey(room.key, zone.key)] ??
                          optimisticLightingByKey[getOptimisticLightingKey(room.key, zone.id)]

                        return entry
                          ? [
                              zone.id,
                              {
                                status: entry.status,
                                message: entry.lastMessage,
                                expectedBrightness: entry.expectedBrightness,
                                expectedLightsOn: entry.expectedLightsOn,
                                startedAt: entry.startedAt,
                              },
                            ] as const
                          : null
                      })
                      .filter((entry): entry is readonly [
                        string,
                        {
                          status: OptimisticLightingStatus
                          message: string
                          expectedBrightness: number
                          expectedLightsOn: boolean
                          startedAt: number
                        },
                      ] => Boolean(entry)),
                  )}
                  valueUpdateTokens={{
                    temperature:
                      runtimeEventUpdateTokens[`${room.key}:temperature`] ??
                      getLatestKnxCacheEntry(room.key, 'temperature')?.at ??
                      getLatestServerHistoryPoint(room.key, 'temperature')?.at ??
                      null,
                    setpoint:
                      runtimeEventUpdateTokens[`${room.key}:setpoint`] ??
                      getLatestKnxCacheEntry(room.key, 'setpointFeedback')?.at ??
                      getLatestServerHistoryPoint(room.key, 'setpoint')?.at ??
                      null,
                    heatDemand:
                      runtimeEventUpdateTokens[`${room.key}:heatDemand`] ??
                      getLatestKnxCacheEntry(room.key, 'heatDemand')?.at ??
                      getLatestServerHistoryPoint(room.key, 'heatDemand')?.at ??
                      null,
                    ...Object.fromEntries(
                      room.zones.flatMap((zone) => [
                        [
                          `light:${zone.key}`,
                          optimisticLightingByKey[getOptimisticLightingKey(room.key, zone.key)]?.startedAt ??
                          runtimeEventUpdateTokens[`${room.key}:light:${zone.key}`] ??
                          getLatestKnxCacheEntry(room.key, 'lightFeedback', zone.key, zone.id)?.at ??
                            getLatestServerHistoryPoint(room.key, 'brightness', zone.key, zone.id)?.at ??
                            null,
                        ],
                        [
                          `brightness:${zone.key}`,
                          optimisticLightingByKey[getOptimisticLightingKey(room.key, zone.key)]?.startedAt ??
                          runtimeEventUpdateTokens[`${room.key}:brightness:${zone.key}`] ??
                          getLatestKnxCacheEntry(room.key, 'valueFeedback', zone.key, zone.id)?.at ??
                            getLatestServerHistoryPoint(room.key, 'brightness', zone.key, zone.id)?.at ??
                            null,
                        ],
                      ]),
                    ),
                  }}
                  showLighting={
                    activeMainView === 'lights' &&
                    lightingUiEnabled &&
                    isRoomCapabilityVisible(uiCapabilityConfig, room.key, 'lighting')
                  }
                  showClimate={
                    activeMainView === 'climate' &&
                    climateUiEnabled &&
                    isRoomCapabilityVisible(uiCapabilityConfig, room.key, 'climate')
                  }
                  onToggleLight={handleToggleLight}
                  onBrightnessChange={handleBrightnessChange}
                  onModeChange={handleModeChange}
                  onSetpointStep={handleSetpointStep}
                  onOpenTrendHistory={handleOpenTrendHistory}
                />
              ))}
            </div>
          )}
        </section>
      )}
      <button
        type="button"
        className={`knx-monitor-launcher ${knxMonitorWindowMode !== 'closed' ? 'is-active' : ''}`}
        onClick={() =>
          setKnxMonitorWindowMode((current) =>
            current === 'closed' ? 'open' : current === 'minimized' ? 'open' : 'closed',
          )
        }
        aria-pressed={knxMonitorWindowMode !== 'closed'}
      >
        <span>KNX</span>
        <strong>Monitor</strong>
        <small>{knxMonitorUiDiagnostics.liveTelegramRatePerMinute ?? 0}/min</small>
      </button>

      {knxMonitorWindowMode !== 'closed' ? (
        <aside
          className={`knx-monitor-window knx-monitor-window--${knxMonitorWindowMode}`}
          aria-label="KNX runtime monitor"
        >
          <header className="knx-monitor-window__header">
            <div>
              <p className="room-card__label">Runtime observability</p>
              <h2>KNX monitor</h2>
              <span>
                {knxMonitorPaused ? 'Pauset lokalt' : 'Live stream'} · buffer{' '}
                {knxMonitorUiDiagnostics.bufferSize ?? knxMonitorEvents.length}/
                {knxMonitorUiDiagnostics.bufferLimit ?? 0} · dropped{' '}
                {knxMonitorUiDiagnostics.droppedEvents ?? 0}
              </span>
            </div>
            <div className="knx-monitor-window__actions">
              <button type="button" onClick={() => setKnxMonitorPaused((current) => !current)}>
                {knxMonitorPaused ? 'Resume' : 'Pause'}
              </button>
              <button type="button" onClick={handleExportKnxMonitorEvents} disabled={filteredKnxMonitorEvents.length === 0}>
                Export
              </button>
              <button type="button" onClick={() => setKnxMonitorEvents([])}>
                Clear
              </button>
              <button
                type="button"
                onClick={() =>
                  setKnxMonitorWindowMode((current) => (current === 'fullscreen' ? 'open' : 'fullscreen'))
                }
              >
                {knxMonitorWindowMode === 'fullscreen' ? 'Float' : 'Full'}
              </button>
              <button
                type="button"
                onClick={() =>
                  setKnxMonitorWindowMode((current) => (current === 'minimized' ? 'open' : 'minimized'))
                }
              >
                {knxMonitorWindowMode === 'minimized' ? 'Open' : 'Min'}
              </button>
              <button type="button" onClick={() => setKnxMonitorWindowMode('closed')}>
                Lukk
              </button>
            </div>
          </header>

          {knxMonitorWindowMode !== 'minimized' ? (
            <>
              <div className="knx-monitor-filters">
                <input
                  value={knxMonitorFilters.search}
                  onChange={(event) =>
                    setKnxMonitorFilters((current) => ({ ...current, search: event.target.value }))
                  }
                  placeholder="Søk GA, rom, DPT, verdi ..."
                />
                <select
                  value={knxMonitorFilters.roomKey}
                  onChange={(event) =>
                    setKnxMonitorFilters((current) => ({ ...current, roomKey: event.target.value }))
                  }
                >
                  <option value="all">Alle rom</option>
                  {knxMonitorRoomOptions.map((room) => (
                    <option key={room.key} value={room.key}>
                      {room.label}
                    </option>
                  ))}
                </select>
                <select
                  value={knxMonitorFilters.direction}
                  onChange={(event) =>
                    setKnxMonitorFilters((current) => ({ ...current, direction: event.target.value }))
                  }
                >
                  <option value="all">Alle retninger</option>
                  <option value="write">Writes</option>
                  <option value="feedback">Feedback</option>
                  <option value="read">Poll/read</option>
                  <option value="internal">Internal</option>
                </select>
                <select
                  value={knxMonitorFilters.source}
                  onChange={(event) =>
                    setKnxMonitorFilters((current) => ({ ...current, source: event.target.value }))
                  }
                >
                  <option value="all">Alle kilder</option>
                  {knxMonitorSourceOptions.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
                <select
                  value={knxMonitorFilters.signalType}
                  onChange={(event) =>
                    setKnxMonitorFilters((current) => ({ ...current, signalType: event.target.value }))
                  }
                >
                  <option value="all">Alle signaler</option>
                  {knxMonitorSignalTypeOptions.map((signalType) => (
                    <option key={signalType} value={signalType}>
                      {signalType}
                    </option>
                  ))}
                </select>
                <label>
                  <input
                    type="checkbox"
                    checked={knxMonitorFilters.onlyWrites}
                    onChange={(event) =>
                      setKnxMonitorFilters((current) => ({ ...current, onlyWrites: event.target.checked }))
                    }
                  />
                  Kun writes
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={knxMonitorFilters.onlyFeedback}
                    onChange={(event) =>
                      setKnxMonitorFilters((current) => ({ ...current, onlyFeedback: event.target.checked }))
                    }
                  />
                  Feedback
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={knxMonitorFilters.onlyStale}
                    onChange={(event) =>
                      setKnxMonitorFilters((current) => ({ ...current, onlyStale: event.target.checked }))
                    }
                  />
                  Stale/feil
                </label>
              </div>

              <div className="knx-monitor-layout">
                <div className="knx-monitor-stream" role="log" aria-live="polite">
                  <div className="knx-monitor-row knx-monitor-row--head" aria-hidden="true">
                    <span>Tid</span>
                    <span>Type</span>
                    <span>GA / DPT</span>
                    <span>Verdi</span>
                    <span>Rom/sone</span>
                    <span>Relasjon</span>
                    <span></span>
                  </div>
                  {filteredKnxMonitorEvents.slice(0, 500).map((event) => {
                    const relationLabel =
                      typeof event.relation?.label === 'string'
                        ? event.relation.label
                        : typeof event.relation?.type === 'string'
                          ? event.relation.type
                          : event.tone
                    const rawLabel =
                      event.rawValue && typeof event.rawValue === 'object'
                        ? JSON.stringify(event.rawValue)
                        : String(event.rawValue ?? '—')
                    return (
                      <article
                        key={event.id}
                        className={`knx-monitor-row knx-monitor-row--${event.tone}`}
                        title={describeKnxMonitorEvent(event)}
                      >
                        <span>
                          <time dateTime={event.at}>{formatShortRelativeTime(event.at)}</time>
                          <small>{new Date(event.at).toLocaleTimeString('nb-NO')}</small>
                        </span>
                        <span>
                          <strong>{event.direction}</strong>
                          <small>{event.source}</small>
                        </span>
                        <span>
                          <strong>{event.groupAddress ?? '—'}</strong>
                          <small>{event.dpt ?? event.dataType ?? '—'}</small>
                        </span>
                        <span>
                          <strong>{String(event.decodedValue ?? '—')}</strong>
                          <small>raw {rawLabel}</small>
                        </span>
                        <span>
                          <strong>{event.roomName ?? event.roomKey ?? '—'}</strong>
                          <small>{event.zoneName ?? event.zoneKey ?? event.field ?? event.signalType}</small>
                        </span>
                        <span>
                          <strong>{relationLabel}</strong>
                          <small>{event.confidence} confidence</small>
                        </span>
                        <button type="button" onClick={() => handleCopyKnxMonitorEvent(event)}>
                          Copy
                        </button>
                      </article>
                    )
                  })}
                  {filteredKnxMonitorEvents.length === 0 ? (
                    <div className="knx-monitor-empty">
                      {knxMonitorError ?? 'Venter på KNX-telegrammer i runtime-monitoren.'}
                    </div>
                  ) : null}
                </div>

                <aside className="knx-monitor-niva">
                  <p className="room-card__label">NIVA workbench</p>
                  <h3>Siste telegram</h3>
                  <p>
                    {latestKnxMonitorEvent
                      ? describeKnxMonitorEvent(latestKnxMonitorEvent)
                      : 'Ingen telegrammer i monitor-bufferen ennå.'}
                  </p>
                  <div className="knx-monitor-niva__chips">
                    <span>Rate {knxMonitorUiDiagnostics.liveTelegramRatePerMinute ?? 0}/min</span>
                    <span>Latency {knxMonitorUiDiagnostics.monitorLatencyMs ?? '—'} ms</span>
                    <span>Filtered {filteredKnxMonitorEvents.length}</span>
                  </div>
                  <p className="manager-helper">
                    Spør NIVA om «siste telegram», «hvilke GA-er sendte scenen» eller «hvorfor ble ikke optimistic state bekreftet».
                  </p>
                </aside>
              </div>
            </>
          ) : null}
        </aside>
      ) : null}

      {idleScreenVisible ? (
        <section
          className="idle-screen"
          role="button"
          tabIndex={0}
          aria-label="Lynell hvileskjerm. Trykk for å vekke."
          onClick={handleIdleWake}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              handleIdleWake()
            }
          }}
        >
          <div className="idle-screen__panel">
            {idleScreenCustomImage ? (
              <img
                className="idle-screen__image"
                src={idleScreenCustomImage}
                alt="Egendefinert hvileskjerm"
              />
            ) : (
              <div className="idle-screen__core" aria-hidden="true">
                <NivaCore state={nivaCoreState} />
              </div>
            )}
            <p className="room-card__label">Lynell idle</p>
            <time className="idle-screen__time" dateTime={currentClock.toISOString()}>
              {idleScreenTimeLabel}
            </time>
            <p className="idle-screen__date">{idleScreenDateLabel}</p>
            <p className="idle-screen__status">{idleScreenStatusLabel}</p>
          </div>
        </section>
      ) : null}
    </main>
  )
}

export default App
