import { useRef, useState } from 'react'
import {
  type BookingConfig,
  type BookingResourceConfig,
  type BookingResourceType,
  type BookingStatus,
  type CalendarEventConfig,
  type CameraDeviceConfig,
  type CameraFoundationConfig,
  type CameraRuntimeState,
  type CameraType,
  buildRoomSelectOptions,
  getFloorDefinitions,
  type FloorConfig,
  type HousingConfig,
  type KnxDataType,
  type KnxInterpretationRule,
  type KnxAccessMode,
  type MediaConfig,
  type MediaGroupConfig,
  type MediaGroupSpeakerConfig,
  type MqttConfig,
  type NetworkConfig,
  type RuntimeConfig,
  type SecurityConfig,
  type SceneConfig,
  type SceneClimateTargetConfig,
  type SceneLightingTargetConfig,
  type ShadingType,
  type SystemAudioCategory,
  type SystemAudioConfig,
  type IdleScreenConfig,
  type SystemIntegrationConfig,
  type SystemRoomConfig,
  type SystemSensorConfig,
  type SystemShadingConfig,
  type SystemTechnicalConfig,
  type SystemWeatherStationConfig,
} from '../config/systemConfig'
import {
  formatCameraTrustStatus,
  formatCameraType,
  summarizeCameraFoundation,
} from '../runtime/cameraMediaFoundation'
import type { KnxRoomMapping } from '../knx/knxMapping'
import type { Room } from '../data/rooms'
import type {
  AutoPollQuietSignalsConfig,
  BridgeCastStatus,
  BridgeMqttStatus,
  BridgeVacuumStatus,
} from '../api/homeApi'
import {
  formatEdgeStatusLabel,
  getEdgeFoundationStatus,
  getEdgeHealthSummary,
} from '../integrations/edge/edgeFoundation'
import {
  buildEdgeLifecycleDevices,
  formatDeviceCategory,
  formatLifecycleState,
  getEdgeDeviceHealthSummary,
} from '../integrations/edge/deviceLifecycle'
import {
  buildSensorIntelligence,
  formatSensorCapability,
} from '../integrations/edge/sensorIntelligence'
import {
  formatIntegrationSetupStatus,
  getIntegrationSetupSummary,
  integrationSetupItems,
} from '../integrations/setup/integrationSetup'
import {
  formatHardwareHealth,
  formatHardwareType,
  getHardwareHealthSummary,
  hardwareInventoryItems,
  hardwareTopologyGroups,
} from '../integrations/hardware/hardwareInventory'

function normalizeRuntimeModeLabel(mode: RuntimeConfig['systemMode']) {
  if (mode === 'developer') {
    return 'Developer Mode'
  }

  if (mode === 'demo' || mode === 'simulate') {
    return 'Demo Mode'
  }

  return 'Live Mode'
}

function formatAudioCategoryLabel(category: SystemAudioCategory) {
  const labels: Record<SystemAudioCategory, string> = {
    feedback: 'Feedback',
    information: 'Informasjon',
    alert: 'Varsel',
    critical: 'Kritisk',
    ambient: 'Ambient',
    voice: 'Voice',
    system: 'System',
  }

  return labels[category]
}

function hasManagerConfiguredText(value?: string | null) {
  return String(value ?? '').trim().length > 0
}

function getManagerShadingMappingSummary(item: SystemShadingConfig) {
  const configuredCount = [
    item.up,
    item.down,
    item.stop,
    item.position,
    item.feedbackPosition,
    item.angle,
    item.windAlarm,
    item.sunAuto,
  ].filter(hasManagerConfiguredText).length
  const missingCore: string[] = []

  if (!hasManagerConfiguredText(item.up) && !hasManagerConfiguredText(item.down)) {
    missingCore.push('opp/ned')
  }
  if (!hasManagerConfiguredText(item.stop)) {
    missingCore.push('stopp')
  }
  if (!hasManagerConfiguredText(item.position)) {
    missingCore.push('posisjon')
  }

  return {
    configuredCount,
    missingCore,
    status: !item.active
      ? 'Deaktivert'
      : configuredCount === 0
        ? 'Mangler gruppeadresse'
        : missingCore.length === 0
          ? 'Klar'
          : 'Delvis konfigurert',
  }
}

function listToText(value?: string[]) {
  return (value ?? []).join(', ')
}

function textToList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}
import {
  buildHybridRuntimeStates,
  formatIntegrationRuntimeStatus,
  formatRuntimeOrigin,
  getHybridRuntimeSummary,
} from '../integrations/runtime/integrationRuntimeState'
import { buildHouseSpatialMap } from '../spatial/houseSpatial'
import type { LynellRecommendation } from '../runtime/recommendations'
import { zigbeeDeviceConcepts } from '../integrations/zigbee/zigbeeDevices'
import {
  buildZigbee2MqttReadiness,
  formatZigbeeRuntimeMode,
  getZigbeeRuntimeState,
} from '../integrations/zigbee/zigbee2mqttReadiness'
import {
  buildMqttRuntimeFoundation,
  formatMqttConnectionState,
  formatMqttRuntimeMode,
  getMqttRuntimeIntegrationState,
} from '../integrations/mqtt/mqttRuntimeFoundation'
import {
  getCastDiscoveryTruthStatus,
  getCastPlaybackTruthStatus,
  getMqttTruthStatus,
  getVacuumTruthStatus,
  type IntegrationTruthStatus,
} from '../integrations/truth/integrationTruth'
import { ManagerDiagnosticsSection } from './manager/ManagerDiagnostics'
import { ManagerMediaSection } from './manager/ManagerMediaSection'
import { ManagerTabs } from './manager/ManagerTabs'
import type { ManagerDiagnostics } from './manager/managerTypes'
import {
  roomCapabilityDefinitions,
  type HclFoundationConfig,
  type ResolvedUiCapability,
  type RoomCapabilityId,
  type RoomCapabilitySummary,
  type UiCapabilityConfig,
  type UiCapabilityId,
  type UiCapabilityOverride,
  type UiCapabilitySummary,
} from '../runtime/uiCapabilities'
import {
  getLynellAudioManifestSummary,
  lynellAudioCategories,
  lynellAudioManifest,
} from '../audio/audioManifest'
import type { LynellAudioPlaybackStatus } from '../audio/audioPlayer'
import { appLanguages, type AppLanguage, type LynellTranslations } from '../i18n'

const knxDataTypeOptions: KnxDataType[] = ['1-bit', '1-byte', '2-byte float']
const knxInterpretationRuleOptions: KnxInterpretationRule[] = [
  'standard',
  'boolFromValueAboveZero',
]
const shadingTypeOptions: ShadingType[] = [
  'screen',
  'blind',
  'curtain',
  'awning',
  'persienne',
  'markise',
  'gardin',
]
const cameraTypeOptions: CameraType[] = ['tapoFoundation', 'rtsp', 'onvif', 'genericIpCamera']
const cameraRuntimeStateOptions: CameraRuntimeState[] = ['unknown', 'online', 'stale', 'offline']
const knxAccessModeOptions: KnxAccessMode[] = ['read', 'write', 'readWrite']
const bookingResourceTypeOptions: BookingResourceType[] = [
  'møterom',
  'hjemmekino',
  'hybel',
  'gjesterom',
  'badstue',
  'annet',
]
const bookingStatusOptions: BookingStatus[] = ['draft', 'confirmed', 'sent']

type ManagerPanelProps = {
  isConfigDirty: boolean
  language: AppLanguage
  translations: LynellTranslations
  housingConfig: HousingConfig
  networkConfig: NetworkConfig
  mqttConfig: MqttConfig
  cameraConfig: CameraFoundationConfig
  runtimeConfig: RuntimeConfig
  securityConfig: SecurityConfig
  mediaConfig: MediaConfig
  shadingConfig: SystemShadingConfig[]
  weatherStationConfig: SystemWeatherStationConfig
  technicalConfig: SystemTechnicalConfig
  integrationConfig: SystemIntegrationConfig
  calendarEvents: CalendarEventConfig[]
  bookingResources: BookingResourceConfig[]
  bookings: BookingConfig[]
  bookingConflictIds: string[]
  scenes: SceneConfig[]
  diagnostics: ManagerDiagnostics
  castBridgeStatus: BridgeCastStatus | null
  mqttBridgeStatus: BridgeMqttStatus | null
  vacuumBridgeStatus: BridgeVacuumStatus | null
  systemRecommendations: LynellRecommendation[]
  uiCapabilityConfig: UiCapabilityConfig
  uiCapabilities: ResolvedUiCapability[]
  uiCapabilitySummary: UiCapabilitySummary
  roomCapabilitySummaries: RoomCapabilitySummary[]
  onUiCapabilityChange: (capabilityId: UiCapabilityId, override: UiCapabilityOverride) => void
  onUiCapabilityConfigChange: <K extends keyof UiCapabilityConfig>(
    field: K,
    value: UiCapabilityConfig[K],
  ) => void
  onRoomCapabilityChange: (
    roomKey: string,
    capabilityId: RoomCapabilityId,
    override: UiCapabilityOverride,
  ) => void
  onHclFoundationChange: <K extends keyof HclFoundationConfig>(
    field: K,
    value: HclFoundationConfig[K],
  ) => void
  conversationLoggingEnabled: boolean
  conversationLoggingStatus: string
  autoPollQuietSignalsConfig: AutoPollQuietSignalsConfig
  audioConfig: SystemAudioConfig
  idleScreenConfig: IdleScreenConfig
  audioManifestSummary: ReturnType<typeof getLynellAudioManifestSummary>
  audioLastPlayback: LynellAudioPlaybackStatus | null
  onConversationLoggingChange: (enabled: boolean) => void
  onAutoPollQuietSignalsChange: <K extends keyof AutoPollQuietSignalsConfig>(
    field: K,
    value: AutoPollQuietSignalsConfig[K],
  ) => void
  onAudioConfigChange: <K extends keyof SystemAudioConfig>(
    field: K,
    value: SystemAudioConfig[K],
  ) => void
  onAudioCategoryChange: (category: SystemAudioCategory, enabled: boolean) => void
  onTestAudioSound: (soundId?: string) => void | Promise<void>
  onIdleScreenConfigChange: <K extends keyof IdleScreenConfig>(
    field: K,
    value: IdleScreenConfig[K],
  ) => void
  onIdleCustomImageUpload: (file: File) => void
  onResetIdleCustomImage: () => void
  onPreviewIdleScreen: () => void
  onClearTestLog: () => void
  onRuntimeActionDecision?: (actionId: string, decision: 'approve' | 'deny') => void | Promise<void>
  onManualRuntimeConfigSync?: () => void | Promise<void>
  onSceneSchedulerTest?: (sceneId: string, dryRun: boolean) => void | Promise<void>
  onShadingActionTest?: (
    shadingId: string,
    action: 'moveUp' | 'moveDown' | 'stop' | 'setPosition',
    value?: number,
    dryRun?: boolean,
  ) => void | Promise<void>
  floorConfigs: FloorConfig[]
  lightingConfig: Record<string, KnxRoomMapping>
  systemConfigRooms: SystemRoomConfig[]
  rooms: Room[]
  onHousingChange: <K extends keyof HousingConfig>(field: K, value: HousingConfig[K]) => void
  onLanguageChange: (language: AppLanguage) => void
  onNetworkModeChange: (value: NetworkConfig['connectionMode']) => void
  onNetworkEndpointChange: (
    endpoint: 'localDirect' | 'remoteTunnel',
    field: 'host' | 'port',
    value: string,
  ) => void
  onNetworkConfigChange: <K extends keyof NetworkConfig>(
    field: K,
    value: NetworkConfig[K],
  ) => void
  onMqttConfigChange: <K extends keyof MqttConfig>(field: K, value: MqttConfig[K]) => void
  onCameraProviderEnabledChange: (enabled: boolean) => void
  onCameraRecorderChange: <K extends keyof CameraFoundationConfig['recorder']>(
    field: K,
    value: CameraFoundationConfig['recorder'][K],
  ) => void
  onCameraConfigChange: (
    cameraId: string,
    field: keyof CameraDeviceConfig,
    value: string | boolean | number | null,
  ) => void
  onAddCameraConfig: () => void
  onDeleteCameraConfig: (cameraId: string) => void
  onRuntimeConfigChange: <K extends keyof RuntimeConfig>(
    field: K,
    value: RuntimeConfig[K],
  ) => void
  onSecurityConfigChange: <K extends keyof SecurityConfig>(
    field: K,
    value: SecurityConfig[K],
  ) => void
  onMediaConfigChange: <K extends keyof MediaConfig>(
    field: K,
    value: MediaConfig[K],
  ) => void
  onAddMediaGroupConfig: () => void
  onMediaGroupConfigChange: (
    mediaGroupId: string,
    field: keyof MediaGroupConfig,
    value: string | boolean,
  ) => void
  onAddMediaGroupSpeaker: (mediaGroupId: string) => void
  onMediaGroupSpeakerChange: (
    mediaGroupId: string,
    speakerId: string,
    field: keyof MediaGroupSpeakerConfig,
    value: string | number | null,
  ) => void
  onDeleteMediaGroupSpeaker: (mediaGroupId: string, speakerId: string) => void
  onSensorConfigChange: (
    roomKey: string,
    sensorKey: keyof SystemSensorConfig,
    field: 'address' | 'dataType',
    value: string,
  ) => void
  onShadingConfigChange: (
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
  ) => void
  onAddShadingConfig: () => void
  onWeatherStationChange: (
    field: keyof SystemWeatherStationConfig,
    value: SystemWeatherStationConfig[keyof SystemWeatherStationConfig],
  ) => void
  onTechnicalConfigChange: (
    field: keyof SystemTechnicalConfig,
    pointField: 'address' | 'dataType',
    value: string,
  ) => void
  onIntegrationActiveChange: (active: boolean) => void
  onAddBacnetPoint: () => void
  onBacnetPointChange: (
    pointId: string,
    field: 'name' | 'dataType' | 'access' | 'externalRef',
    value: string,
  ) => void
  onCalendarEventChange: (
    eventId: string,
    field: keyof CalendarEventConfig,
    value: string,
  ) => void
  onAddCalendarEvent: () => void
  onDeleteCalendarEvent: (eventId: string) => void
  onBookingResourceChange: (
    resourceId: string,
    field: keyof BookingResourceConfig,
    value: string | boolean | number,
  ) => void
  onAddBookingResource: () => void
  onDeleteBookingResource: (resourceId: string) => void
  onBookingChange: (
    bookingId: string,
    field: keyof BookingConfig,
    value: string | boolean,
  ) => void
  onAddBooking: () => void
  onDeleteBooking: (bookingId: string) => void
  onSceneChange: (
    sceneId: string,
    field: 'name' | 'enabled' | 'triggerType' | 'triggerNote' | 'triggerTime',
    value: string | boolean,
  ) => void
  onAddScene: () => void
  onDeleteScene: (sceneId: string) => void
  onAddSceneRoom: (sceneId: string) => void
  onSceneRoomChange: (sceneId: string, index: number, roomKey: string) => void
  onRemoveSceneRoom: (sceneId: string, index: number) => void
  onAddSceneLightingTarget: (sceneId: string) => void
  onSceneLightingTargetChange: (
    sceneId: string,
    targetId: string,
    field: keyof SceneLightingTargetConfig,
    value: string,
  ) => void
  onRemoveSceneLightingTarget: (sceneId: string, targetId: string) => void
  onAddSceneClimateTarget: (sceneId: string) => void
  onSceneClimateTargetChange: (
    sceneId: string,
    targetId: string,
    field: keyof SceneClimateTargetConfig,
    value: string,
  ) => void
  onRemoveSceneClimateTarget: (sceneId: string, targetId: string) => void
  onFloorNameChange: (floorId: string, value: string) => void
  onAddFloor: () => void
  onMoveFloor: (floorId: string, direction: 'up' | 'down') => void
  onAddRoom: (floorId: string) => void
  onDeleteRoom: (roomId: number) => void
  onMoveRoom: (roomId: number, direction: 'up' | 'down') => void
  onRoomNameChange: (roomId: number, value: string) => void
  onRoomConfiguredChange: (roomId: number, value: boolean) => void
  onOpenRoomManager?: (roomKey?: string | null) => void
  onAddZone: (roomId: number) => void
  onDeleteZone: (roomId: number, zoneId: string) => void
  onZoneNameChange: (roomId: number, zoneId: string, value: string) => void
  onZoneConfigChange: (
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
  ) => void
  onClimateConfigChange: (
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
  ) => void
  onSaveConfig: () => void
  onDiscardConfig: () => void
  onExportConfig: () => void
  onImportConfig: (file: File) => Promise<void> | void
  importMessage: string
  layoutMode: 'mobile' | 'desktop'
  calendarOnly?: boolean
  onBackToCalendar?: () => void
  onLayoutModeChange: (mode: 'mobile' | 'desktop') => void
}

export function ManagerPanel({
  isConfigDirty,
  language,
  translations: t,
  housingConfig,
  networkConfig,
  mqttConfig,
  cameraConfig,
  runtimeConfig,
  securityConfig,
  mediaConfig,
  shadingConfig,
  weatherStationConfig,
  technicalConfig,
  integrationConfig,
  calendarEvents,
  bookingResources,
  bookings,
  bookingConflictIds,
  scenes,
  diagnostics,
  castBridgeStatus,
  mqttBridgeStatus,
  vacuumBridgeStatus,
  systemRecommendations,
  uiCapabilityConfig,
  uiCapabilities,
  uiCapabilitySummary,
  roomCapabilitySummaries,
  onUiCapabilityChange,
  onUiCapabilityConfigChange,
  onRoomCapabilityChange,
  onHclFoundationChange,
  conversationLoggingEnabled,
  conversationLoggingStatus,
  autoPollQuietSignalsConfig,
  audioConfig,
  idleScreenConfig,
  audioManifestSummary,
  audioLastPlayback,
  onConversationLoggingChange,
  onAutoPollQuietSignalsChange,
  onAudioConfigChange,
  onAudioCategoryChange,
  onTestAudioSound,
  onIdleScreenConfigChange,
  onIdleCustomImageUpload,
  onResetIdleCustomImage,
  onPreviewIdleScreen,
  floorConfigs,
  lightingConfig,
  systemConfigRooms,
  rooms,
  onLanguageChange,
  onHousingChange,
  onNetworkModeChange,
  onNetworkEndpointChange,
  onNetworkConfigChange,
  onMqttConfigChange,
  onCameraProviderEnabledChange,
  onCameraRecorderChange,
  onCameraConfigChange,
  onAddCameraConfig,
  onDeleteCameraConfig,
  onRuntimeConfigChange,
  onSecurityConfigChange,
  onMediaConfigChange,
  onAddMediaGroupConfig,
  onMediaGroupConfigChange,
  onAddMediaGroupSpeaker,
  onMediaGroupSpeakerChange,
  onDeleteMediaGroupSpeaker,
  onSensorConfigChange,
  onShadingConfigChange,
  onAddShadingConfig,
  onWeatherStationChange,
  onTechnicalConfigChange,
  onIntegrationActiveChange,
  onAddBacnetPoint,
  onBacnetPointChange,
  onCalendarEventChange,
  onAddCalendarEvent,
  onDeleteCalendarEvent,
  onBookingResourceChange,
  onAddBookingResource,
  onDeleteBookingResource,
  onBookingChange,
  onAddBooking,
  onDeleteBooking,
  onSceneChange,
  onAddScene,
  onDeleteScene,
  onAddSceneRoom,
  onSceneRoomChange,
  onRemoveSceneRoom,
  onAddSceneLightingTarget,
  onSceneLightingTargetChange,
  onRemoveSceneLightingTarget,
  onAddSceneClimateTarget,
  onSceneClimateTargetChange,
  onRemoveSceneClimateTarget,
  onClearTestLog,
  onRuntimeActionDecision,
  onManualRuntimeConfigSync,
  onSceneSchedulerTest,
  onShadingActionTest,
  onFloorNameChange,
  onAddFloor,
  onMoveFloor,
  onAddRoom,
  onDeleteRoom,
  onMoveRoom,
  onRoomNameChange,
  onRoomConfiguredChange,
  onOpenRoomManager,
  onAddZone,
  onDeleteZone,
  onZoneNameChange,
  onZoneConfigChange,
  onClimateConfigChange,
  onSaveConfig,
  onDiscardConfig,
  onExportConfig,
  onImportConfig,
  importMessage,
  layoutMode,
  calendarOnly = false,
  onBackToCalendar,
  onLayoutModeChange,
}: ManagerPanelProps) {
  const floors = getFloorDefinitions(rooms, floorConfigs)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [activeSection, setActiveSection] = useState<
    | 'housing'
    | 'network'
    | 'structure'
    | 'lighting'
    | 'climate'
    | 'shading'
    | 'sensors'
    | 'weather'
    | 'technical'
    | 'integrations'
    | 'mqtt'
    | 'camera'
    | 'calendar'
    | 'media'
    | 'scenes'
    | 'diagnostics'
    | 'operations'
  >(() => (calendarOnly ? 'calendar' : 'housing'))

  const managerSections = [
    { id: 'housing', label: 'Teknisk system' },
    { id: 'lighting', label: 'Integrasjoner' },
  ] as const
  const technicalSystemSections = [
    { id: 'housing', label: 'Bolig' },
    { id: 'operations', label: 'Drift / Avansert' },
    { id: 'network', label: 'Nettverk' },
    { id: 'structure', label: 'Bygningsstruktur' },
    { id: 'integrations', label: 'Integrasjoner / Edge' },
    { id: 'mqtt', label: 'MQTT' },
    { id: 'camera', label: 'Kamera / NVR' },
    { id: 'diagnostics', label: 'Diagnose' },
    { id: 'technical', label: 'Teknisk tilgang' },
  ] as const
  const integrationSections = [
    { id: 'lighting', label: 'Lys' },
    { id: 'climate', label: 'Klima' },
    { id: 'shading', label: 'Solskjerming' },
    { id: 'sensors', label: 'Sensorer' },
    { id: 'weather', label: 'Værstasjon' },
    { id: 'media', label: 'Media' },
    { id: 'scenes', label: 'Scener / Automatisering' },
  ] as const
  const topLevelSectionMap = {
    housing: 'housing',
    network: 'housing',
    structure: 'housing',
    lighting: 'lighting',
    climate: 'lighting',
    shading: 'lighting',
    sensors: 'lighting',
    weather: 'lighting',
    technical: 'housing',
    integrations: 'housing',
    mqtt: 'housing',
    camera: 'housing',
    calendar: 'calendar',
    media: 'lighting',
    scenes: 'lighting',
    diagnostics: 'housing',
    operations: 'housing',
  } as const
  const activeTopLevelSection = topLevelSectionMap[activeSection]
  const roomOptions = buildRoomSelectOptions(systemConfigRooms, floorConfigs)
  const [edgeRoomAssignments, setEdgeRoomAssignments] = useState<Record<string, string | null>>({})
  const edgeStatuses = getEdgeFoundationStatus(mqttConfig, integrationConfig, zigbeeDeviceConcepts)
  const edgeHealth = getEdgeHealthSummary(edgeStatuses, zigbeeDeviceConcepts)
  const zigbeeCoordinator =
    zigbeeDeviceConcepts.find((device) => device.kind === 'coordinator') ?? null
  const zigbeeJoinedDevices = zigbeeDeviceConcepts.filter((device) => device.kind !== 'coordinator')
  const edgeLifecycleDevices = buildEdgeLifecycleDevices(
    zigbeeDeviceConcepts,
    roomOptions,
    edgeRoomAssignments,
  )
  const edgeDeviceHealth = getEdgeDeviceHealthSummary(edgeLifecycleDevices)
  const sensorIntelligence = buildSensorIntelligence(edgeLifecycleDevices, rooms)
  const spatialMap = buildHouseSpatialMap(systemConfigRooms, floorConfigs)
  const climateRoomOptions = roomOptions.filter((room) => lightingConfig[room.key]?.climateActive)
  const visibleFutureCapabilities = uiCapabilities.filter(
    (capability) => capability.futureOnly && (capability.visible || uiCapabilityConfig.showFutureFeatures),
  )
  const premiumHomeCapabilities = visibleFutureCapabilities.filter(
    (capability) => capability.category === 'premiumHome',
  )
  const microSdCapabilities = visibleFutureCapabilities.filter(
    (capability) => capability.category === 'microSd',
  )
  const energyFutureCapabilities = visibleFutureCapabilities.filter(
    (capability) => capability.category === 'energyFuture',
  )
  const coreVisibilityCapabilities = uiCapabilities.filter(
    (capability) => !capability.futureOnly && !capability.locked,
  )
  const hiddenCardCount = uiCapabilities.filter((capability) => !capability.visible).length
  const enabledRoomCapabilityCount = roomCapabilitySummaries.reduce(
    (sum, room) => sum + room.enabled.length,
    0,
  )
  const integrationSetupSummary = getIntegrationSetupSummary(integrationSetupItems)
  const hardwareHealth = getHardwareHealthSummary(hardwareInventoryItems)
  const zigbee2MqttReadiness = buildZigbee2MqttReadiness(mqttConfig, zigbeeDeviceConcepts)
  const mqttRuntimeFoundation = buildMqttRuntimeFoundation(mqttConfig, mqttBridgeStatus)
  const mqttTruthStatus = getMqttTruthStatus(mqttBridgeStatus)
  const cameraFoundationSummary = summarizeCameraFoundation(cameraConfig)
  const castDiscoveryTruthStatus = getCastDiscoveryTruthStatus(castBridgeStatus)
  const castPlaybackTruthStatus = getCastPlaybackTruthStatus(castBridgeStatus)
  const castOnlineCount =
    castBridgeStatus?.diagnostics?.onlineCount ??
    castBridgeStatus?.devices.filter((device) => (device.state ?? device.status) === 'online' || device.online).length ??
    0
  const castStaleCount =
    castBridgeStatus?.diagnostics?.staleCount ??
    castBridgeStatus?.devices.filter((device) => (device.state ?? device.status) === 'stale').length ??
    0
  const castOfflineCount =
    castBridgeStatus?.diagnostics?.offlineCount ??
    castBridgeStatus?.devices.filter((device) => (device.state ?? device.status) === 'offline').length ??
    0
  const vacuumTruthStatus = getVacuumTruthStatus(vacuumBridgeStatus)
  const vacuumTrust = vacuumBridgeStatus?.trust ?? null
  const vacuumDiagnostics = vacuumBridgeStatus?.diagnostics ?? null
  const vacuumReadinessLabel =
    vacuumBridgeStatus?.readiness?.label ??
    (vacuumBridgeStatus?.connected ? 'Live robotstatus aktiv' : 'Klar for HA-test')
  const vacuumReadinessChecks = vacuumBridgeStatus?.readiness?.checks ?? []
  const vacuumMissingConfig = [
    !vacuumBridgeStatus?.config.homeAssistantBaseUrl ? 'HA URL' : '',
    !vacuumBridgeStatus?.config.homeAssistantTokenConfigured ? 'HA token' : '',
    !vacuumBridgeStatus?.config.homeAssistantVacuumEntityId ? 'entity ID' : '',
  ].filter(Boolean)
  const knxTruthStatus: IntegrationTruthStatus =
    diagnostics.bridgeStatus === 'ready'
      ? 'Live'
      : diagnostics.bridgeReachable === false
        ? 'Ikke koblet'
        : 'Klargjort'
  const weatherTruthStatus: IntegrationTruthStatus = weatherStationConfig.active ? 'Klargjort' : 'Foundation'
  const integrationTruthRuntimeItems = [
    { name: 'KNX bridge', status: knxTruthStatus, detail: diagnostics.bridgeStatusLabel },
    { name: 'Lokal media', status: 'Live' as const, detail: 'HTMLAudioElement og /media/music er ekte lokal runtime.' },
    { name: 'MQTT', status: mqttTruthStatus, detail: mqttRuntimeFoundation.summary },
    {
      name: 'Cast discovery',
      status: castDiscoveryTruthStatus,
      detail:
        castBridgeStatus?.diagnostics?.note ??
        castBridgeStatus?.error ??
        'Krever bonjour-service og env før live discovery-test.',
    },
    { name: 'Cast playback', status: castPlaybackTruthStatus, detail: 'Minimal MP3 playback-test finnes. Ikke multiroom, auth, kø eller full media-system.' },
    { name: 'Dream D20 Plus', status: vacuumTruthStatus, detail: vacuumTrust?.message ?? vacuumBridgeStatus?.message ?? 'Robotstatus er lokal mock/foundation til adapter velges.' },
    { name: 'Weather API', status: weatherTruthStatus, detail: weatherStationConfig.active ? 'Værstasjon er aktiv i config.' : 'Vær-awareness bruker foundation/fallback.' },
  ]
  const integrationTruthPreparedItems = integrationSetupItems.filter((item) =>
    ['google-home-cast', 'sonoff-zbdongle-e', 'mqtt-broker', 'dream-d20-plus', 'sonos-foundation'].includes(item.integrationId),
  )
  const integrationTruthMockItems = [
    'Dream D20 Plus: demo/developer foundation, ikke ekte API',
    'Sonos: foundation, ingen runtime',
    'Zigbee devices: foundation/dev til Zigbee2MQTT kobles',
    'Google Home foundation outputs: ikke ekte playback uten Cast readiness',
  ]
  const hybridRuntimeStates = [
    ...buildHybridRuntimeStates({
      systemMode: runtimeConfig.systemMode,
      bridgeReady: diagnostics.bridgeStatus === 'ready',
      feedbackActive:
        diagnostics.lightFeedbackStrategy !== 'off' || diagnostics.climateFeedbackStrategy !== 'off',
      mediaSource: 'local',
      persistedRestored: false,
      mqttConfigured: mqttConfig.enabled && mqttConfig.brokerHost.trim().length > 0,
    }),
    getMqttRuntimeIntegrationState(mqttRuntimeFoundation),
    getZigbeeRuntimeState(zigbee2MqttReadiness),
  ]
  const hybridRuntimeSummary = getHybridRuntimeSummary(hybridRuntimeStates)

  const getZoneOptionsForRoom = (roomKey: string) =>
    systemConfigRooms.find((room) => room.key === roomKey)?.zones ?? []
  const renderCapabilityCard = (capability: ResolvedUiCapability) => (
    <article
      key={capability.id}
      className={`manager-capability-card manager-capability-card--${capability.maturity} ${
        capability.visible ? 'is-visible' : 'is-hidden'
      }`}
    >
      <div>
        <span>{capability.maturity}</span>
        <strong>{capability.label}</strong>
        <p>{capability.description}</p>
        <small>
          {capability.roomScoped ? 'room scoped · ' : ''}
          {capability.requiresProvider ? `provider ${capability.requiresProvider} · ` : ''}
          {capability.requiresCapability ? `capability ${capability.requiresCapability}` : 'visibility only'}
        </small>
      </div>
      <div className="manager-capability-card__controls">
        <label>
          <input
            type="checkbox"
            checked={capability.visible}
            disabled={capability.locked}
            onChange={(event) =>
              onUiCapabilityChange(capability.id, { visible: event.target.checked })
            }
          />
          <span>Vis</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={capability.enabled}
            disabled={capability.locked}
            onChange={(event) =>
              onUiCapabilityChange(capability.id, { enabled: event.target.checked })
            }
          />
          <span>Aktiv</span>
        </label>
      </div>
    </article>
  )

  return (
    <section className="manager-layout" aria-label="Manager">
      <article className="manager-card manager-card--wide">
        <div className="manager-actions">
          <span className={`manager-save-state ${isConfigDirty ? 'is-dirty' : 'is-saved'}`}>
            {isConfigDirty ? t.common.unsavedChanges : t.common.saved}
          </span>
          <button
            type="button"
            className="manager-action manager-action--primary"
            onClick={onSaveConfig}
            disabled={!isConfigDirty}
          >
            {t.common.saveChanges}
          </button>
          <button
            type="button"
            className="manager-action"
            onClick={onDiscardConfig}
            disabled={!isConfigDirty}
          >
            {t.common.discardChanges}
          </button>
          <button type="button" className="manager-action" onClick={onExportConfig}>
            Eksporter konfigurasjon
          </button>
          <button
            type="button"
            className="manager-action"
            onClick={() => fileInputRef.current?.click()}
          >
            Importer konfigurasjon
          </button>
          {onOpenRoomManager ? (
            <button
              type="button"
              className="manager-action"
              onClick={() => onOpenRoomManager(rooms[0]?.key ?? null)}
            >
              Åpne Room Manager
            </button>
          ) : null}
          {calendarOnly && onBackToCalendar ? (
            <button type="button" className="manager-action" onClick={onBackToCalendar}>
              Til Kalender
            </button>
          ) : null}
          <input
            ref={fileInputRef}
            className="manager-file-input"
            type="file"
            accept="application/json"
            onChange={(event) => {
              const file = event.target.files?.[0]

              if (file) {
                void onImportConfig(file)
              }

              event.target.value = ''
            }}
          />
        </div>
        <div className="manager-language-row" aria-label={t.language.label}>
          <div>
            <span className="room-card__label">{t.language.label}</span>
            <p className="manager-helper">{t.language.helper}</p>
          </div>
          <div className="manager-language-toggle">
            {appLanguages.map((item) => (
              <button
                key={item.value}
                type="button"
                className={language === item.value ? 'is-active' : ''}
                onClick={() => onLanguageChange(item.value)}
                aria-pressed={language === item.value}
              >
                {item.value === 'no' ? t.language.norwegian : t.language.english}
              </button>
            ))}
          </div>
        </div>
        <p className="manager-helper">
          {calendarOnly
            ? 'Kalender Manager er teknisk kalenderflate. Kalenderen som brukerflate ligger i hovedmenyen.'
            : 'Manager er husets sannhet. Per-rom mapping, varmeavgiver og sensorpunkter redigeres videre i Room Manager.'}
        </p>
        {importMessage ? <p className="manager-message">{importMessage}</p> : null}
      </article>

      <article className="manager-card manager-card--wide">
        {calendarOnly ? (
          <div className="manager-section-title">
            <p className="room-card__label">Kalender Manager</p>
            <h2>Teknisk kalenderoppsett</h2>
          </div>
        ) : (
          <ManagerTabs
            items={managerSections}
            activeId={activeSection}
            ariaLabel="Manager-seksjoner"
            onChange={setActiveSection}
            isActive={(sectionId) => activeTopLevelSection === sectionId}
          />
        )}
        {!calendarOnly && activeTopLevelSection === 'housing' ? (
          <ManagerTabs
            items={technicalSystemSections}
            activeId={activeSection}
            ariaLabel="Teknisk system-seksjoner"
            onChange={setActiveSection}
            variant="sub"
          />
        ) : null}
        {!calendarOnly && activeTopLevelSection === 'lighting' ? (
          <ManagerTabs
            items={integrationSections}
            activeId={activeSection}
            ariaLabel="Integrasjons-seksjoner"
            onChange={setActiveSection}
            variant="sub"
          />
        ) : null}
      </article>

      {activeSection === 'housing' ? (
      <article className="manager-card">
        <p className="room-card__label">Bolig</p>
        <div className="manager-list">
          <div className="manager-row">
            <span>Navn</span>
            <input
              className="manager-input"
              type="text"
              value={housingConfig.name}
              onChange={(event) => onHousingChange('name', event.target.value)}
            />
          </div>
          <div className="manager-row">
            <span>Adresse</span>
            <input
              className="manager-input"
              type="text"
              value={housingConfig.address}
              onChange={(event) => onHousingChange('address', event.target.value)}
            />
          </div>
          <div className="manager-row">
            <span>Breddegrad</span>
            <input
              className="manager-input"
              type="number"
              step="0.000001"
              value={housingConfig.latitude}
              onChange={(event) => onHousingChange('latitude', Number(event.target.value))}
            />
          </div>
          <div className="manager-row">
            <span>Lengdegrad</span>
            <input
              className="manager-input"
              type="number"
              step="0.000001"
              value={housingConfig.longitude}
              onChange={(event) => onHousingChange('longitude', Number(event.target.value))}
            />
          </div>
          <div className="manager-block">
            <div className="manager-block__header">
              <strong>Teknisk tilgang</strong>
              <span>Manager / Room Manager</span>
            </div>
            <p className="manager-helper">
              Enkel lokal PIN for tekniske flater. Dette er ikke backend-auth eller brukeradmin.
            </p>
            <div className="manager-list">
              <label className="manager-field manager-field--toggle">
                <span>PIN aktiv</span>
                <input
                  type="checkbox"
                  checked={securityConfig.pinEnabled}
                  onChange={(event) => onSecurityConfigChange('pinEnabled', event.target.checked)}
                />
              </label>
              <label className="manager-field">
                <span>Teknisk PIN/passord</span>
                <input
                  className="manager-input"
                  type="password"
                  inputMode="numeric"
                  value={securityConfig.pinCode}
                  onChange={(event) => onSecurityConfigChange('pinCode', event.target.value)}
                />
              </label>
              <label className="manager-field manager-field--toggle">
                <span>Lock on new session</span>
                <input
                  type="checkbox"
                  checked={securityConfig.lockOnNewSession}
                  onChange={(event) =>
                    onSecurityConfigChange('lockOnNewSession', event.target.checked)
                  }
                />
              </label>
            </div>
          </div>
          <div className="manager-block">
            <div className="manager-block__header">
              <strong>Layout foundation</strong>
              <span>Teknisk forberedelse for senere desktop/wall-panel</span>
            </div>
            <p className="manager-helper">
              Denne innstillingen er foreløpig en foundation og gir bare små shell-forskjeller.
            </p>
            <div className="status-toggle">
              <button
                type="button"
                className={`mode-control__option ${layoutMode === 'mobile' ? 'is-active' : ''}`}
                onClick={() => onLayoutModeChange('mobile')}
              >
                Mobile
              </button>
              <button
                type="button"
                className={`mode-control__option ${layoutMode === 'desktop' ? 'is-active' : ''}`}
                onClick={() => onLayoutModeChange('desktop')}
              >
                Desktop / Landscape
              </button>
            </div>
          </div>
          <div className="manager-block">
            <div className="manager-block__header">
              <strong>Systemlyder</strong>
              <span>Placeholder-lyder · av som standard</span>
            </div>
            <p className="manager-helper">
              Lokal audio foundation for fremtidig touchskjerm. Ingen ambient loop og ingen kritiske
              lyder spilles automatisk.
            </p>
            <div className="manager-list">
              <label className="manager-field manager-field--toggle">
                <span>Systemlyder aktiv</span>
                <input
                  type="checkbox"
                  checked={audioConfig.enabled}
                  onChange={(event) => onAudioConfigChange('enabled', event.target.checked)}
                />
              </label>
              <label className="manager-field">
                <span>Master volume · {Math.round(audioConfig.masterVolume * 100)}%</span>
                <input
                  className="manager-range"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={audioConfig.masterVolume}
                  onChange={(event) =>
                    onAudioConfigChange('masterVolume', Number(event.target.value))
                  }
                />
              </label>
              <div className="manager-category-grid">
                {lynellAudioCategories.map((category) => (
                  <label key={category} className="manager-field manager-field--toggle">
                    <span>{formatAudioCategoryLabel(category)}</span>
                    <input
                      type="checkbox"
                      checked={audioConfig.categories[category]}
                      onChange={(event) => onAudioCategoryChange(category, event.target.checked)}
                    />
                  </label>
                ))}
              </div>
              <div className="manager-row">
                <span>Testlyd</span>
                <strong className="manager-status-signal">
                  <select
                    className="manager-input"
                    value={audioConfig.testSoundId}
                    onChange={(event) => onAudioConfigChange('testSoundId', event.target.value)}
                  >
                    {lynellAudioManifest.map((sound) => (
                      <option key={sound.id} value={sound.id}>
                        {sound.id} · {sound.category}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="manager-action"
                    onClick={() => void onTestAudioSound(audioConfig.testSoundId)}
                  >
                    Test lyd
                  </button>
                </strong>
              </div>
              <div className="manager-row">
                <span>Manifest</span>
                <strong>
                  {audioManifestSummary.count} lyder · {audioManifestSummary.placeholderCount}{' '}
                  placeholders
                </strong>
              </div>
              <div className="manager-row">
                <span>Siste lyd</span>
                <strong className={audioLastPlayback?.ok === false ? 'manager-status-error' : ''}>
                  {audioLastPlayback
                    ? `${audioLastPlayback.soundId} · ${
                        audioLastPlayback.skipped
                          ? audioLastPlayback.reason ?? 'skipped'
                          : 'spilt'
                      }`
                    : '—'}
                </strong>
              </div>
            </div>
          </div>
          <div className="manager-block">
            <div className="manager-block__header">
              <strong>Hvileskjerm</strong>
              <span>IP touch/kiosk foundation</span>
            </div>
            <p className="manager-helper">
              CSS-rendered idle screen med NIVA-core, klokke og rolig runtime-status. Aktivitet på
              skjermen vekker appen igjen.
            </p>
            <div className="manager-list">
              <label className="manager-field manager-field--toggle">
                <span>Hvileskjerm aktiv</span>
                <input
                  type="checkbox"
                  checked={idleScreenConfig.enabled}
                  onChange={(event) =>
                    onIdleScreenConfigChange('enabled', event.target.checked)
                  }
                />
              </label>
              <label className="manager-field">
                <span>Timeout sekunder</span>
                <input
                  className="manager-input"
                  type="number"
                  min="10"
                  step="10"
                  value={idleScreenConfig.idleTimeoutSeconds}
                  onChange={(event) =>
                    onIdleScreenConfigChange('idleTimeoutSeconds', Number(event.target.value))
                  }
                />
              </label>
              <label className="manager-field manager-field--toggle">
                <span>Bruk custom bilde</span>
                <input
                  type="checkbox"
                  checked={idleScreenConfig.useCustomImage}
                  disabled={!idleScreenConfig.customImageDataUrl}
                  onChange={(event) =>
                    onIdleScreenConfigChange('useCustomImage', event.target.checked)
                  }
                />
              </label>
              <div className="manager-row">
                <span>Custom idle image</span>
                <strong className="manager-status-signal">
                  <input
                    className="manager-input"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) {
                        onIdleCustomImageUpload(file)
                      }
                      event.target.value = ''
                    }}
                  />
                  <button
                    type="button"
                    className="manager-action"
                    onClick={onResetIdleCustomImage}
                    disabled={!idleScreenConfig.customImageDataUrl}
                  >
                    Reset
                  </button>
                </strong>
              </div>
              {idleScreenConfig.customImageDataUrl ? (
                <div className="manager-idle-preview">
                  <img src={idleScreenConfig.customImageDataUrl} alt="Idle preview" />
                </div>
              ) : null}
              <div className="manager-row">
                <span>Preview</span>
                <strong>
                  <button
                    type="button"
                    className="manager-action"
                    onClick={onPreviewIdleScreen}
                  >
                    Vis hvileskjerm
                  </button>
                </strong>
              </div>
            </div>
          </div>
        </div>
      </article>
      ) : null}

      {activeSection === 'network' ? (
      <article className="manager-card">
        <p className="room-card__label">Nettverk</p>
        <div className="manager-list">
          <div className="manager-block">
            <div className="manager-zone-header">
              <span>Driftsmodus</span>
              <small>{normalizeRuntimeModeLabel(runtimeConfig.systemMode)}</small>
            </div>
            <div className="status-toggle">
              <button
                type="button"
                className={`mode-control__option ${runtimeConfig.systemMode === 'live' ? 'is-active' : ''}`}
                onClick={() => onRuntimeConfigChange('systemMode', 'live')}
              >
                Live Mode
              </button>
              <button
                type="button"
                className={`mode-control__option ${runtimeConfig.systemMode === 'demo' || runtimeConfig.systemMode === 'simulate' ? 'is-active' : ''}`}
                onClick={() => onRuntimeConfigChange('systemMode', 'demo')}
              >
                Demo Mode
              </button>
              <button
                type="button"
                className={`mode-control__option ${runtimeConfig.systemMode === 'developer' ? 'is-active' : ''}`}
                onClick={() => onRuntimeConfigChange('systemMode', 'developer')}
              >
                Developer Mode
              </button>
            </div>
            <p className="manager-helper">
              Live Mode prioriterer ekte runtime. Demo Mode bruker demo-data for presentasjon. Developer Mode viser foundation, mock og diagnostics.
            </p>
          </div>
          <div className="manager-row">
            <span>Connection mode</span>
            <select
              className="manager-input"
              value={networkConfig.connectionMode}
              onChange={(event) =>
                onNetworkModeChange(event.target.value as NetworkConfig['connectionMode'])
              }
            >
              <option value="localDirect">localDirect</option>
              <option value="remoteTunnel">remoteTunnel</option>
            </select>
          </div>
          <div className="manager-row">
            <span>Local host</span>
            <input
              className="manager-input"
              type="text"
              value={networkConfig.localDirect.host}
              onChange={(event) =>
                onNetworkEndpointChange('localDirect', 'host', event.target.value)
              }
            />
          </div>
          <div className="manager-row">
            <span>Local port</span>
            <input
              className="manager-input"
              type="number"
              value={networkConfig.localDirect.port}
              onChange={(event) =>
                onNetworkEndpointChange('localDirect', 'port', event.target.value)
              }
            />
          </div>
          <div className="manager-row">
            <span>Remote host</span>
            <input
              className="manager-input"
              type="text"
              value={networkConfig.remoteTunnel.host}
              onChange={(event) =>
                onNetworkEndpointChange('remoteTunnel', 'host', event.target.value)
              }
            />
          </div>
          <div className="manager-row">
            <span>Remote port</span>
            <input
              className="manager-input"
              type="number"
              value={networkConfig.remoteTunnel.port}
              onChange={(event) =>
                onNetworkEndpointChange('remoteTunnel', 'port', event.target.value)
              }
            />
          </div>
          <div className="manager-row">
            <span>Lokal app-host</span>
            <input
              className="manager-input"
              type="text"
              value={networkConfig.appLocalHost}
              placeholder="192.168.x.x"
              onChange={(event) => onNetworkConfigChange('appLocalHost', event.target.value)}
            />
          </div>
          <div className="manager-row">
            <span>Lokal app-port</span>
            <input
              className="manager-input"
              type="number"
              value={networkConfig.appLocalPort}
              onChange={(event) => onNetworkConfigChange('appLocalPort', Number(event.target.value))}
            />
          </div>
          <div className="manager-row">
            <span>VPN / Tailscale</span>
            <label className="manager-toggle">
              <input
                type="checkbox"
                checked={networkConfig.vpnEnabled}
                onChange={(event) => onNetworkConfigChange('vpnEnabled', event.target.checked)}
              />
              <span>{networkConfig.vpnEnabled ? 'Klar' : 'Av'}</span>
            </label>
          </div>
          <div className="manager-row">
            <span>VPN host</span>
            <input
              className="manager-input"
              type="text"
              value={networkConfig.vpnHost}
              placeholder="lynell-server eller tailscale-ip"
              onChange={(event) => onNetworkConfigChange('vpnHost', event.target.value)}
            />
          </div>
          <div className="manager-row">
            <span>VPN port</span>
            <input
              className="manager-input"
              type="number"
              value={networkConfig.vpnPort}
              onChange={(event) => onNetworkConfigChange('vpnPort', Number(event.target.value))}
            />
          </div>
          <div className="manager-row">
            <span>Foretrukket tilgang</span>
            <select
              className="manager-input"
              value={networkConfig.preferredConnection}
              onChange={(event) =>
                onNetworkConfigChange(
                  'preferredConnection',
                  event.target.value as NetworkConfig['preferredConnection'],
                )
              }
            >
              <option value="local">Lokal</option>
              <option value="vpn">VPN</option>
            </select>
          </div>
        </div>
      </article>
      ) : null}

      {activeSection === 'scenes' ? (
      <article className="manager-card manager-card--wide">
        <div className="manager-block__header">
          <p className="room-card__label">Scener / Automatisering</p>
          <div className="manager-chip-row">
            <button type="button" className="manager-action" onClick={onAddScene}>
              Legg til scene
            </button>
          </div>
        </div>
        <div className="manager-stack">
          {scenes.length === 0 ? (
            <div className="manager-zone-card manager-zone-card--empty">
              <span>Ingen scener ennå</span>
            </div>
          ) : (
            scenes.map((scene) => (
              <div key={scene.id} className="manager-room-card manager-scene-card">
                <div className="manager-zone-header">
                  <span>{scene.name || 'Scene'}</span>
                  <button
                    type="button"
                    className="manager-action manager-action--danger"
                    onClick={() => onDeleteScene(scene.id)}
                  >
                    Slett
                  </button>
                </div>
                <div className="manager-zone-grid">
                  <label className="manager-field">
                    <span>Scene-navn</span>
                    <input
                      className="manager-input"
                      type="text"
                      value={scene.name}
                      onChange={(event) => onSceneChange(scene.id, 'name', event.target.value)}
                    />
                  </label>
                  <label className="manager-field manager-field--toggle">
                    <span>Aktiv</span>
                    <input
                      type="checkbox"
                      checked={scene.enabled}
                      onChange={(event) => onSceneChange(scene.id, 'enabled', event.target.checked)}
                    />
                  </label>
                </div>

                <div className="manager-scene-section">
                  <div className="manager-zone-header">
                    <span>Rom</span>
                    <button type="button" className="manager-action" onClick={() => onAddSceneRoom(scene.id)}>
                      Legg til rom
                    </button>
                  </div>
                  {scene.roomKeys.length === 0 ? (
                    <div className="manager-zone-card manager-zone-card--empty">
                      <span>Ingen rom valgt</span>
                    </div>
                  ) : (
                    scene.roomKeys.map((roomKey, index) => (
                      <div key={`${scene.id}-room-${index}`} className="manager-zone-grid">
                        <label className="manager-field manager-field--wide">
                          <span>Rom</span>
                          <select
                            className="manager-input"
                            value={roomKey}
                            onChange={(event) => onSceneRoomChange(scene.id, index, event.target.value)}
                          >
                            {roomOptions.map((room) => (
                              <option key={room.key} value={room.key}>
                                {room.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className="manager-action manager-action--inline"
                          onClick={() => onRemoveSceneRoom(scene.id, index)}
                        >
                          Fjern
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="manager-scene-section">
                  <div className="manager-zone-header">
                    <span>Lys</span>
                    <button
                      type="button"
                      className="manager-action"
                      onClick={() => onAddSceneLightingTarget(scene.id)}
                    >
                      Legg til sone
                    </button>
                  </div>
                  {scene.lighting.length === 0 ? (
                    <div className="manager-zone-card manager-zone-card--empty">
                      <span>Ingen lyssoner valgt</span>
                    </div>
                  ) : (
                    scene.lighting.map((target) => {
                      const zoneOptions = getZoneOptionsForRoom(target.roomKey)

                      return (
                        <div key={target.id} className="manager-zone-card">
                          <div className="manager-zone-grid">
                            <label className="manager-field">
                              <span>Rom</span>
                              <select
                                className="manager-input"
                                value={target.roomKey}
                                onChange={(event) =>
                                  onSceneLightingTargetChange(scene.id, target.id, 'roomKey', event.target.value)
                                }
                              >
                                {roomOptions
                                  .filter((room) => getZoneOptionsForRoom(room.key).length > 0)
                                  .map((room) => (
                                    <option key={room.key} value={room.key}>
                                      {room.label}
                                    </option>
                                  ))}
                              </select>
                            </label>
                            <label className="manager-field">
                              <span>Sone</span>
                              <select
                                className="manager-input"
                                value={target.zoneKey}
                                onChange={(event) =>
                                  onSceneLightingTargetChange(scene.id, target.id, 'zoneKey', event.target.value)
                                }
                              >
                                {zoneOptions.map((zone) => (
                                  <option key={zone.key} value={zone.key}>
                                    {zone.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="manager-field">
                              <span>Lysnivå</span>
                              <input
                                className="manager-input"
                                type="text"
                                value={target.brightness}
                                placeholder="70"
                                onChange={(event) =>
                                  onSceneLightingTargetChange(scene.id, target.id, 'brightness', event.target.value)
                                }
                              />
                            </label>
                            <button
                              type="button"
                              className="manager-action manager-action--inline"
                              onClick={() => onRemoveSceneLightingTarget(scene.id, target.id)}
                            >
                              Fjern
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="manager-scene-section">
                  <div className="manager-zone-header">
                    <span>Klima</span>
                    <button
                      type="button"
                      className="manager-action"
                      onClick={() => onAddSceneClimateTarget(scene.id)}
                    >
                      Legg til klimarom
                    </button>
                  </div>
                  {scene.climate.length === 0 ? (
                    <div className="manager-zone-card manager-zone-card--empty">
                      <span>Ingen klimarom valgt</span>
                    </div>
                  ) : (
                    scene.climate.map((target) => (
                      <div key={target.id} className="manager-zone-card">
                        <div className="manager-zone-grid">
                          <label className="manager-field">
                            <span>Rom</span>
                            <select
                              className="manager-input"
                              value={target.roomKey}
                              onChange={(event) =>
                                onSceneClimateTargetChange(scene.id, target.id, 'roomKey', event.target.value)
                              }
                            >
                              {climateRoomOptions.map((room) => (
                                <option key={room.key} value={room.key}>
                                  {room.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="manager-field">
                            <span>Modus</span>
                            <input
                              className="manager-input"
                              type="text"
                              value={target.mode}
                              placeholder="Komfort"
                              onChange={(event) =>
                                onSceneClimateTargetChange(scene.id, target.id, 'mode', event.target.value)
                              }
                            />
                          </label>
                          <label className="manager-field">
                            <span>Temperatur</span>
                            <input
                              className="manager-input"
                              type="text"
                              value={target.temperature}
                              placeholder="22"
                              onChange={(event) =>
                                onSceneClimateTargetChange(scene.id, target.id, 'temperature', event.target.value)
                              }
                            />
                          </label>
                          <button
                            type="button"
                            className="manager-action manager-action--inline"
                            onClick={() => onRemoveSceneClimateTarget(scene.id, target.id)}
                          >
                            Fjern
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="manager-scene-section">
                  <div className="manager-zone-header">
                    <span>Trigger</span>
                  </div>
                  <div className="manager-zone-grid">
                    <label className="manager-field">
                      <span>Type</span>
                      <select
                        className="manager-input"
                        value={scene.triggerType}
                        onChange={(event) => onSceneChange(scene.id, 'triggerType', event.target.value)}
                      >
                        <option value="manual">Manuelt</option>
                        <option value="time">Tid</option>
                        <option value="presence">Tilstedeværelse</option>
                        <option value="other">Annet</option>
                      </select>
                    </label>
                    {scene.triggerType === 'time' ? (
                      <label className="manager-field">
                        <span>Klokkeslett</span>
                        <input
                          className="manager-input"
                          type="time"
                          value={scene.triggerTime}
                          onChange={(event) => onSceneChange(scene.id, 'triggerTime', event.target.value)}
                        />
                      </label>
                    ) : null}
                    <label className="manager-field manager-field--wide">
                      <span>Plassholder</span>
                      <input
                        className="manager-input"
                        type="text"
                        value={scene.triggerNote}
                        placeholder="For eksempel 18:00 eller Når noen kommer hjem"
                        onChange={(event) => onSceneChange(scene.id, 'triggerNote', event.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </article>
      ) : null}

      {activeSection === 'structure' ? (
      <>
      <article className="manager-card manager-card--wide">
        <div className="manager-block__header">
          <p className="room-card__label">Lokasjoner</p>
          <button type="button" className="manager-action" onClick={onAddFloor}>
            Legg til lokasjon
          </button>
        </div>
        <p className="manager-helper">
          Lokasjoner kan være etasje, hybel, garasje, kontor eller anneks. Rekkefølgen brukes i romvisninger og Room Manager.
        </p>
        <div className="manager-stack">
          {floors.map((floor, index) => (
            <div key={floor.id} className="manager-block">
              <div className="manager-block__header">
                <input
                  className="manager-input"
                  type="text"
                  value={floor.label}
                  onChange={(event) => onFloorNameChange(floor.id, event.target.value)}
                />
                <span>
                  {floor.configuredCount}/{floor.roomCount}
                </span>
                <div className="manager-chip-row">
                  <button
                    type="button"
                    className="manager-action manager-action--icon"
                    onClick={() => onMoveFloor(floor.id, 'up')}
                    disabled={index === 0}
                    aria-label={`Flytt ${floor.label} opp`}
                    title="Flytt opp"
                  >
                    <span aria-hidden="true">↑</span>
                  </button>
                  <button
                    type="button"
                    className="manager-action manager-action--icon"
                    onClick={() => onMoveFloor(floor.id, 'down')}
                    disabled={index === floors.length - 1}
                    aria-label={`Flytt ${floor.label} ned`}
                    title="Flytt ned"
                  >
                    <span aria-hidden="true">↓</span>
                  </button>
                </div>
              </div>
              <div className="manager-chip-row">
                {floor.rooms.map((room) => (
                  <span
                    key={room.id}
                    className={`manager-chip ${room.configured ? 'is-active' : ''}`}
                  >
                    {room.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="manager-card manager-card--wide">
        <div className="manager-block__header">
          <div>
            <p className="room-card__label">Spatial foundation</p>
            <h2>Romlig struktur</h2>
          </div>
          <span className="manager-helper">{spatialMap.areas.length} områder</span>
        </div>
        <p className="manager-helper">
          {spatialMap.summary} Foundation for nærhet, overgangssoner, assistentområder og senere cleaning zones.
        </p>
        <div className="spatial-foundation-grid">
          {spatialMap.areas.map((area) => (
            <article key={area.id} className={`spatial-area-card spatial-area-card--${area.role}`}>
              <div className="spatial-area-card__header">
                <div>
                  <span>{area.role === 'transition' ? 'Overgangssone' : area.role === 'separate' ? 'Separat område' : area.role === 'service' ? 'Serviceområde' : 'Hovedområde'}</span>
                  <strong>{area.label}</strong>
                </div>
                <em>{area.roomNames.length} rom</em>
              </div>
              <div className="spatial-room-flow" aria-label={`Romflyt for ${area.label}`}>
                {area.roomNames.map((roomName, index) => (
                  <span key={`${area.id}-${roomName}`}>
                    {index > 0 ? '→ ' : ''}
                    {roomName}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="spatial-relationship-list">
          {spatialMap.relationships.slice(0, 6).map((relationship) => (
            <span key={`${relationship.fromRoomKey}-${relationship.toRoomKey}`}>
              {relationship.label}
            </span>
          ))}
        </div>
      </article>

      <article className="manager-card manager-card--wide">
        <p className="room-card__label">Rom</p>
        <div className="manager-stack">
          {floors.map((floor) => (
            <div key={floor.id} className="manager-block">
              <div className="manager-block__header">
                <strong>{floor.label}</strong>
                <button
                  type="button"
                  className="manager-action"
                  onClick={() => onAddRoom(floor.id)}
                >
                  Legg til rom
                </button>
              </div>
              <div className="manager-list">
                {floor.rooms.map((room, roomIndex) => (
                  <div key={room.id} className="manager-room-card">
                    <div className="manager-row">
                      <input
                        className="manager-input"
                        type="text"
                        value={room.name}
                        onChange={(event) => onRoomNameChange(room.id, event.target.value)}
                      />
                      <label className="manager-toggle">
                        <input
                          type="checkbox"
                          checked={room.configured}
                          onChange={(event) =>
                            onRoomConfiguredChange(room.id, event.target.checked)
                          }
                        />
                        <span>{room.configured ? 'Konfigurert' : 'Tomt'}</span>
                      </label>
                      <button
                        type="button"
                        className="manager-action manager-action--danger"
                        onClick={() => onDeleteRoom(room.id)}
                      >
                        Slett
                      </button>
                      <button
                        type="button"
                        className="manager-action manager-action--icon"
                        onClick={() => onMoveRoom(room.id, 'up')}
                        disabled={roomIndex === 0}
                        aria-label={`Flytt ${room.name} opp`}
                        title="Flytt opp"
                      >
                        <span aria-hidden="true">↑</span>
                      </button>
                      <button
                        type="button"
                        className="manager-action manager-action--icon"
                        onClick={() => onMoveRoom(room.id, 'down')}
                        disabled={roomIndex === floor.rooms.length - 1}
                        aria-label={`Flytt ${room.name} ned`}
                        title="Flytt ned"
                      >
                        <span aria-hidden="true">↓</span>
                      </button>
                    </div>

                    <div className="manager-zone-stack">
                      <div className="manager-zone-header">
                        <span>Lyssoner</span>
                        <button
                          type="button"
                          className="manager-action"
                          onClick={() => onAddZone(room.id)}
                        >
                          Legg til sone
                        </button>
                      </div>
                      {room.zones.length === 0 ? (
                        <div className="manager-zone-card manager-zone-card--empty">
                          <span>Ingen soner ennå</span>
                        </div>
                      ) : (
                        <div className="manager-chip-row">
                          {room.zones.map((zone) => (
                            <span key={zone.id} className="manager-chip is-active">
                              {zone.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="manager-zone-card manager-zone-card--summary">
                      <div className="manager-row">
                        <span>Lys</span>
                        <strong>
                          {room.zones.length > 0
                            ? `${room.zones.length} ${room.zones.length === 1 ? 'sone' : 'soner'}`
                            : 'Ikke satt opp'}
                        </strong>
                      </div>
                      <div className="manager-row">
                        <span>Klima</span>
                        <strong>
                          {lightingConfig[room.key]?.climateActive
                            ? lightingConfig[room.key]?.liveClimateActive
                              ? 'Aktiv · Live'
                              : 'Aktiv'
                            : 'Ikke aktivt'}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </article>
      </>
    ) : null}

      {activeSection === 'lighting' ? (
      <article className="manager-card manager-card--wide">
        <p className="room-card__label">Lys</p>
        <p className="manager-helper">
          {floors.reduce(
            (sum, floor) => sum + floor.rooms.filter((room) => room.zones.length > 0).length,
            0,
          )}{' '}
          rom med lyssoner
        </p>
        <div className="manager-stack">
          {floors.map((floor) => (
            <div key={floor.id} className="manager-block">
              <div className="manager-block__header">
                <strong>{floor.label}</strong>
              </div>
              <div className="manager-list">
                {floor.rooms.map((room) => (
                  <div key={room.id} className="manager-room-card">
                    <div className="manager-row">
                      <strong>{room.name}</strong>
                    </div>

                    <div className="manager-zone-stack">
                      <div className="manager-zone-header">
                        <span>Lyssoner</span>
                        <button
                          type="button"
                          className="manager-action"
                          onClick={() => onAddZone(room.id)}
                        >
                          Legg til sone
                        </button>
                      </div>
                      {room.zones.length === 0 ? (
                        <div className="manager-zone-card manager-zone-card--empty">
                          <span>Ingen soner</span>
                        </div>
                      ) : (
                        room.zones.map((zone) => {
                          const zoneConfig = lightingConfig[room.key]?.zones[zone.key]

                          return (
                            <div key={zone.id} className="manager-zone-card">
                              <div className="manager-zone-header">
                                <span>{zone.name}</span>
                                <button
                                  type="button"
                                  className="manager-action manager-action--danger"
                                  onClick={() => onDeleteZone(room.id, zone.id)}
                                >
                                  Slett
                                </button>
                              </div>
                              <div className="manager-zone-grid">
                                <label className="manager-field">
                                  <span>Sone</span>
                                  <input
                                    className="manager-input"
                                    type="text"
                                    value={zone.name}
                                    onChange={(event) =>
                                      onZoneNameChange(room.id, zone.id, event.target.value)
                                    }
                                  />
                                </label>

                                <label className="manager-field manager-field--toggle">
                                  <span>Dimmbar</span>
                                  <input
                                    type="checkbox"
                                    checked={zoneConfig?.dimmable ?? zone.dimmable}
                                    onChange={(event) =>
                                      onZoneConfigChange(
                                        room.key,
                                        zone.key,
                                        'dimmable',
                                        event.target.checked,
                                      )
                                    }
                                  />
                                </label>

                                <label className="manager-field">
                                  <span>Light</span>
                                  <input
                                    className="manager-input"
                                    type="text"
                                    value={zoneConfig?.light ?? ''}
                                    onChange={(event) =>
                                      onZoneConfigChange(room.key, zone.key, 'light', event.target.value)
                                    }
                                  />
                                </label>

                                <label className="manager-field">
                                  <span>Datatype light</span>
                                  <select
                                    className="manager-input"
                                    value={zoneConfig?.lightDataType ?? '1-bit'}
                                    onChange={(event) =>
                                      onZoneConfigChange(room.key, zone.key, 'lightDataType', event.target.value)
                                    }
                                  >
                                    {knxDataTypeOptions.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label className="manager-field">
                                  <span>Light feedback</span>
                                  <input
                                    className="manager-input"
                                    type="text"
                                    value={zoneConfig?.lightFeedback ?? ''}
                                    onChange={(event) =>
                                      onZoneConfigChange(room.key, zone.key, 'lightFeedback', event.target.value)
                                    }
                                  />
                                </label>

                                <label className="manager-field">
                                  <span>Datatype light feedback</span>
                                  <select
                                    className="manager-input"
                                    value={zoneConfig?.lightFeedbackDataType ?? '1-bit'}
                                    onChange={(event) =>
                                      onZoneConfigChange(
                                        room.key,
                                        zone.key,
                                        'lightFeedbackDataType',
                                        event.target.value,
                                      )
                                    }
                                  >
                                    {knxDataTypeOptions.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label className="manager-field">
                                  <span>Value</span>
                                  <input
                                    className="manager-input"
                                    type="text"
                                    value={zoneConfig?.value ?? ''}
                                    onChange={(event) =>
                                      onZoneConfigChange(room.key, zone.key, 'value', event.target.value)
                                    }
                                  />
                                </label>

                                <label className="manager-field">
                                  <span>Datatype value</span>
                                  <select
                                    className="manager-input"
                                    value={zoneConfig?.valueDataType ?? '1-byte'}
                                    onChange={(event) =>
                                      onZoneConfigChange(room.key, zone.key, 'valueDataType', event.target.value)
                                    }
                                  >
                                    {knxDataTypeOptions.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label className="manager-field">
                                  <span>Value feedback</span>
                                  <input
                                    className="manager-input"
                                    type="text"
                                    value={zoneConfig?.valueFeedback ?? ''}
                                    onChange={(event) =>
                                      onZoneConfigChange(room.key, zone.key, 'valueFeedback', event.target.value)
                                    }
                                  />
                                </label>

                                {(zoneConfig?.valueFeedback ?? '').trim() ? (
                                  <label className="manager-field">
                                    <span>Datatype value feedback</span>
                                    <select
                                      className="manager-input"
                                      value={zoneConfig?.valueFeedbackDataType ?? '1-byte'}
                                      onChange={(event) =>
                                        onZoneConfigChange(
                                          room.key,
                                          zone.key,
                                          'valueFeedbackDataType',
                                          event.target.value,
                                        )
                                      }
                                    >
                                      {knxDataTypeOptions.map((option) => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                ) : null}

                                {(zoneConfig?.valueFeedback ?? '').trim() ? (
                                  <label className="manager-field">
                                    <span>Tolkningsregel</span>
                                    <select
                                      className="manager-input"
                                      value={
                                        zoneConfig?.feedbackInterpretationRule ??
                                        (zoneConfig?.deriveLightStateFromValueFeedback
                                          ? 'boolFromValueAboveZero'
                                          : 'standard')
                                      }
                                      onChange={(event) =>
                                        onZoneConfigChange(
                                          room.key,
                                          zone.key,
                                          'feedbackInterpretationRule',
                                          event.target.value,
                                        )
                                      }
                                    >
                                      {knxInterpretationRuleOptions.map((option) => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                ) : null}
                                {(zoneConfig?.valueFeedback ?? '').trim() ? (
                                  <p className="manager-helper manager-helper--inline">
                                    Bruk denne når nivåfeedback også skal være sannhet for av/på.
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </article>
      ) : null}

      {activeSection === 'climate' ? (
      <article className="manager-card manager-card--wide">
        <p className="room-card__label">Klima</p>
        <p className="manager-helper">
          {
            floors.reduce(
              (sum, floor) =>
                sum +
                floor.rooms.filter((room) => Boolean(lightingConfig[room.key]?.climateActive)).length,
              0,
            )
          }{' '}
          rom med klima aktivt
        </p>
        <div className="manager-list manager-list--compact">
          <div className="manager-row">
            <span>Komfort-settpunkt</span>
            <input
              className="manager-input"
              type="number"
              min="5"
              max="35"
              step="0.5"
              value={runtimeConfig.comfortSetpoint ?? 22}
              onChange={(event) =>
                onRuntimeConfigChange(
                  'comfortSetpoint',
                  Math.round((Number(event.target.value) || 22) * 2) / 2,
                )
              }
            />
          </div>
          <div className="manager-row">
            <span>Natt-settpunkt</span>
            <input
              className="manager-input"
              type="number"
              min="5"
              max="35"
              step="0.5"
              value={runtimeConfig.nightSetpoint ?? 18}
              onChange={(event) =>
                onRuntimeConfigChange(
                  'nightSetpoint',
                  Math.round((Number(event.target.value) || 18) * 2) / 2,
                )
              }
            />
          </div>
          <p className="manager-helper">
            Brukes når rom settes til Komfort eller Natt. Direkte settpunkt fra appen skriver
            fortsatt til rommets setpoint-adresse.
          </p>
        </div>
        <div className="manager-stack">
          {floors.map((floor) => (
            <div key={floor.id} className="manager-block">
              <div className="manager-block__header">
                <strong>{floor.label}</strong>
              </div>
              <div className="manager-list">
                {floor.rooms.map((room) => (
                  <div key={room.id} className="manager-room-card">
                    <div className="manager-row">
                      <strong>{room.name}</strong>
                    </div>

                    <div className="manager-climate">
                      <div className="manager-zone-card">
                        <div className="manager-zone-grid">
                          <label className="manager-field manager-field--toggle">
                            <span>Klima aktiv</span>
                            <input
                              type="checkbox"
                              checked={lightingConfig[room.key]?.climateActive ?? false}
                              onChange={(event) =>
                                onClimateConfigChange(room.key, 'climateActive', event.target.checked)
                              }
                            />
                          </label>

                          <label className="manager-field manager-field--toggle">
                            <span>Live klima aktiv</span>
                            <input
                              type="checkbox"
                              checked={lightingConfig[room.key]?.liveClimateActive ?? false}
                              disabled={!(lightingConfig[room.key]?.climateActive ?? false)}
                              onChange={(event) =>
                                onClimateConfigChange(room.key, 'liveClimateActive', event.target.checked)
                              }
                            />
                          </label>
                        </div>
                        {lightingConfig[room.key]?.climateActive ? (
                          <div className="manager-zone-grid">
                            <label className="manager-field">
                              <span>Temperaturadresse</span>
                              <input
                                className="manager-input"
                                type="text"
                                value={lightingConfig[room.key]?.temperature ?? ''}
                                onChange={(event) =>
                                  onClimateConfigChange(room.key, 'temperature', event.target.value)
                                }
                              />
                            </label>

                            <label className="manager-field">
                              <span>Datatype temperatur</span>
                              <select
                                className="manager-input"
                                value={lightingConfig[room.key]?.temperatureDataType ?? '2-byte float'}
                                onChange={(event) =>
                                  onClimateConfigChange(room.key, 'temperatureDataType', event.target.value)
                                }
                              >
                                {knxDataTypeOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="manager-field">
                              <span>Settpunktadresse</span>
                              <input
                                className="manager-input"
                                type="text"
                                value={lightingConfig[room.key]?.setpoint ?? ''}
                                onChange={(event) =>
                                  onClimateConfigChange(room.key, 'setpoint', event.target.value)
                                }
                              />
                            </label>

                            <label className="manager-field">
                              <span>Datatype settpunkt</span>
                              <select
                                className="manager-input"
                                value={lightingConfig[room.key]?.setpointDataType ?? '2-byte float'}
                                onChange={(event) =>
                                  onClimateConfigChange(room.key, 'setpointDataType', event.target.value)
                                }
                              >
                                {knxDataTypeOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="manager-field">
                              <span>Settpunktstrategi</span>
                              <select
                                className="manager-input"
                                value={lightingConfig[room.key]?.setpointWriteStrategy ?? 'absoluteTemperature'}
                                onChange={(event) =>
                                  onClimateConfigChange(
                                    room.key,
                                    'setpointWriteStrategy',
                                    event.target.value,
                                  )
                                }
                              >
                                <option value="absoluteTemperature">Send absolute temperature</option>
                                <option value="relativeOffset">Send offset (foundation/disabled)</option>
                              </select>
                            </label>

                            <label className="manager-field">
                              <span>Settpunkt feedback</span>
                              <input
                                className="manager-input"
                                type="text"
                                value={lightingConfig[room.key]?.setpointFeedback ?? ''}
                                onChange={(event) =>
                                  onClimateConfigChange(room.key, 'setpointFeedback', event.target.value)
                                }
                              />
                            </label>

                            <label className="manager-field">
                              <span>Datatype settpunkt feedback</span>
                              <select
                                className="manager-input"
                                value={lightingConfig[room.key]?.setpointFeedbackDataType ?? '2-byte float'}
                                onChange={(event) =>
                                  onClimateConfigChange(
                                    room.key,
                                    'setpointFeedbackDataType',
                                    event.target.value,
                                  )
                                }
                              >
                                {knxDataTypeOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="manager-field">
                              <span>Modusadresse</span>
                              <input
                                className="manager-input"
                                type="text"
                                value={lightingConfig[room.key]?.mode ?? ''}
                                onChange={(event) =>
                                  onClimateConfigChange(room.key, 'mode', event.target.value)
                                }
                              />
                            </label>

                            <label className="manager-field">
                              <span>Datatype modus</span>
                              <select
                                className="manager-input"
                                value={lightingConfig[room.key]?.modeDataType ?? '1-byte'}
                                onChange={(event) =>
                                  onClimateConfigChange(room.key, 'modeDataType', event.target.value)
                                }
                              >
                                {knxDataTypeOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="manager-field">
                              <span>Modus feedback</span>
                              <input
                                className="manager-input"
                                type="text"
                                value={lightingConfig[room.key]?.modeFeedback ?? ''}
                                onChange={(event) =>
                                  onClimateConfigChange(room.key, 'modeFeedback', event.target.value)
                                }
                              />
                            </label>

                            <label className="manager-field">
                              <span>Datatype modus feedback</span>
                              <select
                                className="manager-input"
                                value={lightingConfig[room.key]?.modeFeedbackDataType ?? '1-byte'}
                                onChange={(event) =>
                                  onClimateConfigChange(room.key, 'modeFeedbackDataType', event.target.value)
                                }
                              >
                                {knxDataTypeOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="manager-field">
                              <span>Varmepådragsadresse</span>
                              <input
                                className="manager-input"
                                type="text"
                                value={lightingConfig[room.key]?.heatDemand ?? ''}
                                onChange={(event) =>
                                  onClimateConfigChange(room.key, 'heatDemand', event.target.value)
                                }
                              />
                            </label>

                            <label className="manager-field">
                              <span>Datatype varmepådrag</span>
                              <select
                                className="manager-input"
                                value={lightingConfig[room.key]?.heatDemandDataType ?? '1-byte'}
                                onChange={(event) =>
                                  onClimateConfigChange(room.key, 'heatDemandDataType', event.target.value)
                                }
                              >
                                {knxDataTypeOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        ) : (
                          <p className="manager-zone-card--empty">Klima er ikke aktivert for dette rommet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </article>
      ) : null}

      {activeSection === 'shading' ? (
      <article className="manager-card manager-card--wide">
        <div className="manager-block__header">
          <p className="room-card__label">Solskjerming</p>
          <button type="button" className="manager-action" onClick={onAddShadingConfig}>
            Legg til solskjerming
          </button>
        </div>
        <div className="manager-stack">
          {shadingConfig.map((item) => {
            const mappingSummary = getManagerShadingMappingSummary(item)

            return (
            <div key={item.id} className="manager-zone-card">
              <div className="manager-block__header">
                <div>
                  <strong>{item.label || 'Solskjerming'}</strong>
                  <p className="manager-helper">
                    {mappingSummary.status}
                    {mappingSummary.missingCore.length > 0
                      ? ` · mangler ${mappingSummary.missingCore.join(', ')}`
                      : ` · ${mappingSummary.configuredCount} GA`}
                  </p>
                </div>
                <span className="manager-readiness__indicator">
                  {item.active ? 'Synlig foundation' : 'Inaktiv'}
                </span>
              </div>
              <div className="manager-zone-grid">
                <label className="manager-field">
                  <span>Navn</span>
                  <input
                    className="manager-input"
                    type="text"
                    value={item.label}
                    onChange={(event) =>
                      onShadingConfigChange(item.id, 'label', event.target.value)
                    }
                  />
                </label>
                <label className="manager-field">
                  <span>Rom</span>
                  <select
                    className="manager-input"
                    value={item.roomKey}
                    onChange={(event) =>
                      onShadingConfigChange(item.id, 'roomKey', event.target.value)
                    }
                  >
                    {roomOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="manager-field">
                  <span>Type</span>
                  <select
                    className="manager-input"
                    value={item.type}
                    onChange={(event) =>
                      onShadingConfigChange(item.id, 'type', event.target.value)
                    }
                  >
                    {shadingTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="manager-field manager-field--toggle">
                  <span>Aktiv</span>
                  <input
                    type="checkbox"
                    checked={item.active}
                    onChange={(event) =>
                      onShadingConfigChange(item.id, 'active', event.target.checked)
                    }
                  />
                </label>
                <label className="manager-field manager-field--toggle">
                  <span>Synlig når aktiv</span>
                  <input
                    type="checkbox"
                    checked={item.visible ?? true}
                    onChange={(event) =>
                      onShadingConfigChange(item.id, 'visible', event.target.checked)
                    }
                  />
                </label>
                <label className="manager-field">
                  <span>Maturity</span>
                  <select
                    className="manager-input"
                    value={item.maturity ?? 'foundation'}
                    onChange={(event) =>
                      onShadingConfigChange(item.id, 'maturity', event.target.value)
                    }
                  >
                    <option value="foundation">foundation</option>
                    <option value="prepared">prepared</option>
                    <option value="live">live</option>
                    <option value="future">future</option>
                  </select>
                </label>
                <label className="manager-field">
                  <span>Sone-ID</span>
                  <input className="manager-input" type="text" value={item.zoneId ?? ''} onChange={(event) => onShadingConfigChange(item.id, 'zoneId', event.target.value)} />
                </label>
                <label className="manager-field">
                  <span>Sonenavn</span>
                  <input className="manager-input" type="text" value={item.zoneName ?? ''} onChange={(event) => onShadingConfigChange(item.id, 'zoneName', event.target.value)} />
                </label>
                <label className="manager-field">
                  <span>Opp</span>
                  <input className="manager-input" type="text" value={item.up} onChange={(event) => onShadingConfigChange(item.id, 'up', event.target.value)} />
                </label>
                <label className="manager-field">
                  <span>Ned</span>
                  <input className="manager-input" type="text" value={item.down} onChange={(event) => onShadingConfigChange(item.id, 'down', event.target.value)} />
                </label>
                <label className="manager-field">
                  <span>Stopp</span>
                  <input className="manager-input" type="text" value={item.stop} onChange={(event) => onShadingConfigChange(item.id, 'stop', event.target.value)} />
                </label>
                <label className="manager-field">
                  <span>Posisjon</span>
                  <input className="manager-input" type="text" value={item.position} onChange={(event) => onShadingConfigChange(item.id, 'position', event.target.value)} />
                </label>
                <label className="manager-field">
                  <span>Feedback posisjon</span>
                  <input className="manager-input" type="text" value={item.feedbackPosition ?? ''} onChange={(event) => onShadingConfigChange(item.id, 'feedbackPosition', event.target.value)} />
                </label>
                <label className="manager-field">
                  <span>Opp/ned DPT</span>
                  <input className="manager-input" type="text" value={item.upDownDpt ?? '1.008'} onChange={(event) => onShadingConfigChange(item.id, 'upDownDpt', event.target.value)} />
                </label>
                <label className="manager-field">
                  <span>Stopp DPT</span>
                  <input className="manager-input" type="text" value={item.stopDpt ?? '1.007'} onChange={(event) => onShadingConfigChange(item.id, 'stopDpt', event.target.value)} />
                </label>
                <label className="manager-field">
                  <span>Posisjon DPT</span>
                  <input className="manager-input" type="text" value={item.positionDpt ?? '5.001'} onChange={(event) => onShadingConfigChange(item.id, 'positionDpt', event.target.value)} />
                </label>
                <label className="manager-field">
                  <span>Feedback DPT</span>
                  <input className="manager-input" type="text" value={item.feedbackPositionDpt ?? '5.001'} onChange={(event) => onShadingConfigChange(item.id, 'feedbackPositionDpt', event.target.value)} />
                </label>
                <label className="manager-field manager-field--toggle">
                  <span>Invert direction</span>
                  <input
                    type="checkbox"
                    checked={Boolean(item.invertUpDown)}
                    onChange={(event) =>
                      onShadingConfigChange(item.id, 'invertUpDown', event.target.checked)
                    }
                  />
                </label>
                <label className="manager-field manager-field--toggle">
                  <span>Invert position</span>
                  <input
                    type="checkbox"
                    checked={Boolean(item.invertPosition)}
                    onChange={(event) =>
                      onShadingConfigChange(item.id, 'invertPosition', event.target.checked)
                    }
                  />
                </label>
                <label className="manager-field">
                  <span>Datatype posisjon</span>
                  <select className="manager-input" value={item.positionDataType ?? '1-byte'} onChange={(event) => onShadingConfigChange(item.id, 'positionDataType', event.target.value)}>
                    {knxDataTypeOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="manager-field">
                  <span>Vinkel</span>
                  <input className="manager-input" type="text" value={item.angle} onChange={(event) => onShadingConfigChange(item.id, 'angle', event.target.value)} />
                </label>
                <label className="manager-field">
                  <span>Vindalarm</span>
                  <input className="manager-input" type="text" value={item.windAlarm ?? ''} onChange={(event) => onShadingConfigChange(item.id, 'windAlarm', event.target.value)} />
                </label>
                <label className="manager-field">
                  <span>Solauto</span>
                  <input className="manager-input" type="text" value={item.sunAuto ?? ''} onChange={(event) => onShadingConfigChange(item.id, 'sunAuto', event.target.value)} />
                </label>
                <label className="manager-field">
                  <span>Datatype vinkel</span>
                  <select className="manager-input" value={item.angleDataType ?? '1-byte'} onChange={(event) => onShadingConfigChange(item.id, 'angleDataType', event.target.value)}>
                    {knxDataTypeOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="manager-action-row manager-action-row--compact">
                <button
                  type="button"
                  className="manager-action"
                  onClick={() => onShadingActionTest?.(item.id, 'moveUp', undefined, true)}
                >
                  Dry-run opp
                </button>
                <button
                  type="button"
                  className="manager-action"
                  onClick={() => onShadingActionTest?.(item.id, 'moveUp', undefined, false)}
                >
                  Test opp
                </button>
                <button
                  type="button"
                  className="manager-action"
                  onClick={() => onShadingActionTest?.(item.id, 'moveDown', undefined, false)}
                >
                  Test ned
                </button>
                <button
                  type="button"
                  className="manager-action"
                  onClick={() => onShadingActionTest?.(item.id, 'stop', undefined, false)}
                >
                  Test stopp
                </button>
              </div>
              <p className="manager-helper">
                Retning: {item.invertUpDown ? '1 = opp / 0 = ned' : '0 = opp / 1 = ned'} · posisjon {item.invertPosition ? 'inverteres' : '0-100%'}.
              </p>
            </div>
          )})}
        </div>
      </article>
      ) : null}

      {activeSection === 'sensors' ? (
      <article className="manager-card manager-card--wide">
        <p className="room-card__label">Sensorer</p>
        <div className="manager-stack">
          {floors.map((floor) => (
            <div key={floor.id} className="manager-block">
              <div className="manager-block__header">
                <strong>{floor.label}</strong>
              </div>
              <div className="manager-list manager-list--technical">
                {floor.rooms.map((room) => {
                  const sensors = systemConfigRooms.find((item) => item.key === room.key)?.sensors

                  return (
                    <div key={room.id} className="manager-room-card">
                      <div className="manager-row">
                        <strong>{room.name}</strong>
                      </div>
                      <div className="manager-sensor-table" role="table" aria-label={`Sensorer for ${room.name}`}>
                        {([
                          ['presence', 'Tilstedeværelse'],
                          ['motion', 'Bevegelse'],
                          ['co2', 'CO2'],
                          ['humidity', 'Fukt'],
                          ['floorTemperature', 'Gulvtemperatur'],
                          ['lux', 'Lux'],
                        ] as const).map(([sensorKey, label]) => (
                          <div key={sensorKey} className="manager-sensor-row" role="row">
                            <span className="manager-sensor-row__name">{label}</span>
                            <span className="manager-sensor-row__type">{sensorKey}</span>
                            <input
                              className="manager-input"
                              type="text"
                              value={sensors?.[sensorKey].address ?? ''}
                              placeholder="Adresse"
                              aria-label={`${label} adresse`}
                              onChange={(event) =>
                                onSensorConfigChange(room.key, sensorKey, 'address', event.target.value)
                              }
                            />
                            <select
                              className="manager-input"
                              value={sensors?.[sensorKey].dataType ?? '1-bit'}
                              aria-label={`${label} datatype`}
                              onChange={(event) =>
                                onSensorConfigChange(room.key, sensorKey, 'dataType', event.target.value)
                              }
                            >
                              {knxDataTypeOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                            <span className={`manager-sensor-row__status ${sensors?.[sensorKey].address ? 'is-active' : ''}`}>
                              {sensors?.[sensorKey].address ? 'Aktiv' : 'Ikke satt'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </article>
      ) : null}

      {activeSection === 'weather' ? (
      <article className="manager-card manager-card--wide">
        <p className="room-card__label">Værstasjon</p>
        <p className="manager-helper">
          {weatherStationConfig.active ? 'Aktiv og klar for signaler' : 'Inaktiv til den aktiveres'}
        </p>
        <div className="manager-list">
          <label className="manager-field manager-field--toggle">
            <span>Aktiv</span>
            <input
              type="checkbox"
              checked={weatherStationConfig.active}
              onChange={(event) => onWeatherStationChange('active', event.target.checked)}
            />
          </label>
          {weatherStationConfig.active ? (
            ([
              ['outdoorTemperature', 'Temperatur', 'outdoorTemperatureDataType'],
              ['lightEast', 'Lys øst', 'lightEastDataType'],
              ['lightSouth', 'Lys sør', 'lightSouthDataType'],
              ['lightWest', 'Lys vest', 'lightWestDataType'],
              ['lux', 'Lys samlet', 'luxDataType'],
              ['wind', 'Vindhastighet', 'windDataType'],
              ['windAlarm', 'Vindalarm', 'windAlarmDataType'],
              ['rain', 'Regn', 'rainDataType'],
              ['frostAlarm', 'Frostalarm', 'frostAlarmDataType'],
              ['sunElevation', 'Solhøyde', 'sunElevationDataType'],
              ['azimuth', 'Azimuth', 'azimuthDataType'],
            ] as const).map(([field, label, dataTypeField]) => (
              <div key={field} className="manager-point-row">
                <span className="manager-point-row__name">{label}</span>
                <input
                  className="manager-input"
                  type="text"
                  value={weatherStationConfig[field] ?? ''}
                  placeholder="KNX-adresse"
                  aria-label={`${label} adresse`}
                  onChange={(event) => onWeatherStationChange(field, event.target.value)}
                />
                <select
                  className="manager-input"
                  value={weatherStationConfig[dataTypeField] ?? '1-bit'}
                  aria-label={`${label} datatype`}
                  onChange={(event) => onWeatherStationChange(dataTypeField, event.target.value)}
                >
                  {knxDataTypeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            ))
          ) : (
            <p className="manager-zone-card--empty">Værstasjon er ikke aktivert.</p>
          )}
        </div>
      </article>
      ) : null}

      {activeSection === 'technical' ? (
      <article className="manager-card manager-card--wide">
        <p className="room-card__label">Teknisk / Alarmer</p>
        <div className="manager-zone-grid">
          {([
            ['waterAlarm', 'Vannalarm'],
            ['fireSignal', 'Brannsignal'],
            ['fault', 'Feil'],
            ['generalAlarm', 'Generell alarm'],
          ] as const).map(([field, label]) => (
            <div key={field} className="manager-zone-card">
              <div className="manager-zone-grid">
                <label className="manager-field">
                  <span>{label}</span>
                  <input
                    className="manager-input"
                    type="text"
                    value={technicalConfig[field].address}
                    onChange={(event) => onTechnicalConfigChange(field, 'address', event.target.value)}
                  />
                </label>
                <label className="manager-field">
                  <span>Datatype</span>
                  <select
                    className="manager-input"
                    value={technicalConfig[field].dataType ?? '1-bit'}
                    onChange={(event) => onTechnicalConfigChange(field, 'dataType', event.target.value)}
                  >
                    {knxDataTypeOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
      </article>
      ) : null}

      {activeSection === 'integrations' ? (
      <article className="manager-card manager-card--wide">
        <div className="manager-block__header">
          <div>
            <p className="room-card__label">Integrasjoner / Edge</p>
            <h2>Lokalt nervesystem</h2>
          </div>
          <span className={`edge-health edge-health--${edgeHealth.level}`}>{edgeHealth.label}</span>
        </div>
        <p className="manager-helper">{edgeHealth.nivaSummary}</p>

        <div className="manager-block hardware-inventory-section">
          <div className="manager-block__header">
            <div>
              <strong>Fysisk infrastruktur</strong>
              <p className="manager-helper">{hardwareHealth.nivaSummary}</p>
            </div>
            <span className={`edge-health edge-health--${hardwareHealth.offlineImportantCount > 0 ? 'foundation' : 'stable'}`}>
              {hardwareHealth.label}
            </span>
          </div>
          <div className="hardware-topology-list" aria-label="Hardware topology">
            {hardwareTopologyGroups.map((group) => {
              const groupItems = group.itemIds
                .map((itemId) => hardwareInventoryItems.find((item) => item.id === itemId))
                .filter(Boolean)

              return (
                <article key={group.id} className="hardware-topology-card">
                  <div className="hardware-topology-card__header">
                    <div>
                      <span>{group.summary}</span>
                      <strong>{group.title}</strong>
                    </div>
                    <em>{groupItems.length} enheter</em>
                  </div>
                  <div className="hardware-inventory-list">
                    {groupItems.map((item) => item ? (
                      <div key={item.id} className={`hardware-inventory-row hardware-inventory-row--${item.health}`}>
                        <div>
                          <strong>{item.name}</strong>
                          <span>{formatHardwareType(item.type)} · {item.location}</span>
                        </div>
                        <span>{item.role}</span>
                        <span>{formatHardwareHealth(item.health)}</span>
                        <span>{item.criticality === 'critical' ? 'Kritisk' : item.criticality === 'important' ? 'Viktig' : 'Valgfri'}</span>
                      </div>
                    ) : null)}
                  </div>
                </article>
              )
            })}
          </div>
          <details className="hardware-inventory-details">
            <summary>Vis hardware-notater</summary>
            <div className="hardware-note-list">
              {hardwareInventoryItems.map((item) => (
                <article key={item.id}>
                  <span>{formatHardwareType(item.type)} · {item.runtimeRole}</span>
                  <strong>{item.name}</strong>
                  <p>{item.notes}</p>
                </article>
              ))}
            </div>
          </details>
        </div>

        <div className="manager-block integration-truth-section">
          <div className="manager-block__header">
            <div>
              <strong>Integrasjonsklarhet</strong>
              <p className="manager-helper">
                Ekte nå: lokal media og KNX når bridge er klar. Cast, MQTT, Zigbee2MQTT og robot viser tydelig test/foundation-status.
              </p>
            </div>
            <span className="edge-health edge-health--foundation">Truth cleanup</span>
          </div>
          <div className="integration-truth-grid" aria-label="Live og runtime status">
            {integrationTruthRuntimeItems.map((item) => (
              <article key={item.name} className="integration-truth-card">
                <span>{item.status}</span>
                <strong>{item.name}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
          <details className="integration-truth-details">
            <summary>Klargjorte integrasjoner</summary>
            <div className="integration-truth-list">
              {integrationTruthPreparedItems.map((item) => (
                <article key={item.integrationId}>
                  <span>{item.readinessStatus}</span>
                  <strong>{item.name}</strong>
                  <p>{item.nextAction}</p>
                </article>
              ))}
            </div>
          </details>
          <details className="integration-truth-details">
            <summary>Demo / Developer foundation</summary>
            <ul>
              {integrationTruthMockItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
          <details className="integration-truth-details">
            <summary>Neste steg</summary>
            <ul>
              <li>Cast: installer bonjour-service og sett LYNELL_CAST_ENABLED + LYNELL_CAST_DISCOVERY_ENABLED før discovery-test.</li>
              <li>MQTT: installer mqtt, sett broker-env og test /api/mqtt/status før connect.</li>
              <li>Zigbee2MQTT: avklar coordinator path, broker og topic root før pairing.</li>
              <li>Dream D20 Plus: avklar native Dreame adapter først; HA er optional bro, MQTT/lokal runtime er videre native/edge-retning.</li>
            </ul>
          </details>
        </div>

        <div className="manager-block hybrid-runtime-section">
          <div className="manager-block__header">
            <div>
              <strong>Hybrid runtime</strong>
              <p className="manager-helper">{hybridRuntimeSummary.nivaSummary}</p>
            </div>
            <span className="edge-health edge-health--foundation">{hybridRuntimeSummary.label}</span>
          </div>
          <div className="hybrid-runtime-grid" aria-label="Runtime origin">
            {hybridRuntimeStates.map((state) => (
              <article key={state.id} className={`hybrid-runtime-card hybrid-runtime-card--${state.status}`}>
                <div className="hybrid-runtime-card__header">
                  <div>
                    <span>{state.category} · {formatRuntimeOrigin(state.origin)}</span>
                    <strong>{state.name}</strong>
                  </div>
                  <em>{formatIntegrationRuntimeStatus(state.status)}</em>
                </div>
                <p>{state.summary}</p>
                <div className="hybrid-runtime-card__meta">
                  <span>Eier: {state.owner}</span>
                  <span>{state.stateSourceText}</span>
                  <span>Confidence: {state.confidence}</span>
                  <span>{state.fallbackActive ? 'Fallback/foundation aktiv' : 'Live state'}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="manager-block mqtt-runtime-section">
          <div className="manager-block__header">
            <div>
              <strong>{t.mqtt.title}</strong>
              <p className="manager-helper">{mqttRuntimeFoundation.summary}</p>
            </div>
            <span className="edge-health edge-health--foundation">
              {formatMqttConnectionState(mqttRuntimeFoundation.connectionState)}
            </span>
          </div>
          <div className="mqtt-runtime-grid" aria-label="MQTT live runtime foundation">
            <article className="mqtt-runtime-card">
              <span>{t.mqtt.broker}</span>
              <strong>{mqttRuntimeFoundation.brokerHost}:{mqttRuntimeFoundation.brokerPort}</strong>
              <p>{mqttRuntimeFoundation.secure ? 'MQTTS planlagt' : 'MQTT / TCP'} · {mqttRuntimeFoundation.authEnabled ? 'Auth satt' : 'Auth ikke satt'}</p>
            </article>
            <article className="mqtt-runtime-card">
              <span>{t.mqtt.runtimeMode}</span>
              <strong>{formatMqttRuntimeMode(mqttRuntimeFoundation.runtimeMode)}</strong>
              <p>
                Reconnect {mqttRuntimeFoundation.reconnectCount} · subscribe failures{' '}
                {mqttRuntimeFoundation.subscribeFailures} · publish failures {mqttRuntimeFoundation.publishFailures}
              </p>
            </article>
            <article className="mqtt-runtime-card">
              <span>{t.mqtt.topicRoot}</span>
              <strong>{mqttRuntimeFoundation.topicRoot}</strong>
              <p>{mqttRuntimeFoundation.retainedAwareness}</p>
            </article>
            <article className="mqtt-runtime-card">
              <span>{t.mqtt.lastMessage}</span>
              <strong>{mqttRuntimeFoundation.lastMessage?.topic ?? t.mqtt.noMessages}</strong>
              <p>
                {mqttRuntimeFoundation.lastMessage
                  ? `${mqttRuntimeFoundation.lastMessage.retained ? t.mqtt.retainedWarning : 'Live topic'} · ${mqttRuntimeFoundation.lastMessage.payloadPreview}`
                  : 'Live klient er ikke koblet ennå.'}
              </p>
            </article>
            <article className="mqtt-runtime-card mqtt-runtime-card--wide">
              <span>{t.mqtt.topicTrust}</span>
              <strong>
                {mqttRuntimeFoundation.topicTrust.liveTopicCount} {t.mqtt.liveTopics} ·{' '}
                {mqttRuntimeFoundation.topicTrust.retainedOnlyCount} {t.mqtt.retainedOnly} ·{' '}
                {mqttRuntimeFoundation.topicTrust.staleTopicCount} {t.mqtt.staleTopics}
              </strong>
              <p>
                {mqttRuntimeFoundation.topicTrust.staleTopicCount > 0
                  ? t.mqtt.connectedButStale
                  : mqttRuntimeFoundation.topicTrust.topicCount > 0
                    ? 'Topic freshness ser rolig ut.'
                    : t.mqtt.noMessages}
              </p>
            </article>
          </div>
          {mqttRuntimeFoundation.topicTrust.topics.length > 0 ? (
            <details className="manager-advanced-diagnostics">
              <summary>Developer · raw MQTT topics</summary>
              <div className="manager-list">
                {mqttRuntimeFoundation.topicTrust.topics.slice(0, 12).map((topic) => (
                  <div key={topic.topicName} className="manager-row">
                    <span>{topic.retainedOnly ? 'retained-only' : topic.live ? 'live' : topic.stale ? 'stale' : 'topic'}</span>
                    <strong>
                      {topic.topicName} · confidence {topic.confidence} · age {topic.sourceAgeMs ?? '—'} ms ·{' '}
                      {topic.lastPayload || '—'}
                    </strong>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
          <div className="mqtt-topic-list">
            <span>Første topics</span>
            <ul>
              <li>{mqttRuntimeFoundation.topics.bridgeState}</li>
              <li>{mqttRuntimeFoundation.topics.deviceState}</li>
              <li>{mqttRuntimeFoundation.topics.deviceAvailability}</li>
            </ul>
          </div>
        </div>

        <div className="manager-block cast-runtime-section">
          <div className="manager-block__header">
            <div>
              <strong>Cast discovery</strong>
              <p className="manager-helper">
                {castBridgeStatus?.enabled
                  ? castBridgeStatus.discoveryEnabled
                    ? `Discovery-status: ${castDiscoveryTruthStatus}. ${castOnlineCount} online, ${castStaleCount} stale, ${castOfflineCount} offline. Playback: ${castPlaybackTruthStatus}.`
                    : 'Cast er aktivert, men discovery-env mangler.'
                  : 'Cast discovery er disabled-by-default. Installer bonjour-service og sett env før test.'}
              </p>
            </div>
            <span className="edge-health edge-health--foundation">
              {castDiscoveryTruthStatus}
            </span>
          </div>
          <div className="mqtt-runtime-grid" aria-label="Cast discovery foundation">
            <article className="mqtt-runtime-card">
              <span>Status</span>
              <strong>{castDiscoveryTruthStatus}</strong>
              <p>{castBridgeStatus?.diagnostics?.note ?? castBridgeStatus?.error ?? 'Discovery holder enhetsminne med online/stale/offline-status.'}</p>
            </article>
            <article className="mqtt-runtime-card">
              <span>Discovery</span>
              <strong>{castBridgeStatus?.diagnostics?.mdnsActive ? 'mDNS aktiv' : castBridgeStatus?.discoveryEnabled ? 'Manuell discovery' : 'Deaktivert'}</strong>
              <p>
                {castBridgeStatus?.diagnostics?.lastDiscoveryDurationMs
                  ? `${castBridgeStatus.diagnostics.lastDiscoveryDurationMs} ms · ${castBridgeStatus.diagnostics.discoveryFoundCount ?? 0} svar`
                  : 'Aktiveres med LYNELL_CAST_ENABLED=true og LYNELL_CAST_DISCOVERY_ENABLED=true.'}
              </p>
            </article>
            <article className="mqtt-runtime-card">
              <span>Dependency</span>
              <strong>
                {castBridgeStatus?.dependencyReady === true
                  ? 'OK'
                  : castBridgeStatus?.dependencyReady === false
                    ? 'Mangler dependency'
                    : castBridgeStatus?.dependency ?? 'bonjour-service'}
              </strong>
              <p>
                {castBridgeStatus?.dependencyReady === true
                  ? 'bonjour-service er tilgjengelig for discovery.'
                  : 'Installer med npm install bonjour-service før første live discovery-test.'}
              </p>
            </article>
            <article className="mqtt-runtime-card">
              <span>Enheter</span>
              <strong>{castOnlineCount} online · {castStaleCount} stale · {castOfflineCount} offline</strong>
              <p>{castBridgeStatus?.lastDiscoveryAt ? `Sist søkt ${castBridgeStatus.lastDiscoveryAt}` : 'Discovery ikke kjørt.'}</p>
            </article>
            <article className="mqtt-runtime-card">
              <span>Playback</span>
              <strong>{castPlaybackTruthStatus}</strong>
              <p>
                {castBridgeStatus?.playback
                  ? `State ${castBridgeStatus.playback.state} · confidence ${castBridgeStatus.playback.playbackConfidence ?? 'ukjent'} · freshness ${castBridgeStatus.playback.sourceFreshness ?? 'ukjent'}`
                  : 'Cast-enhet må nå Lynell server på LAN-IP, ikke localhost.'}
              </p>
            </article>
          </div>
          {castBridgeStatus?.devices.length ? (
            <div className="mqtt-topic-list">
              <span>Oppdagede enheter</span>
              <ul>
                {castBridgeStatus.devices.map((device) => (
                  <li key={device.id}>
                    {device.name} · {device.state ?? device.status} · {device.ip || device.host || 'LAN'} · {device.model}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <details className="manager-advanced-diagnostics">
            <summary>Advanced Cast diagnostics</summary>
            <div className="manager-list">
              <div className="manager-row">
                <span>Interface</span>
                <strong>{castBridgeStatus?.diagnostics?.discoveryInterfaceUsed ?? castBridgeStatus?.diagnostics?.networkInterfaceUsed ?? '—'}</strong>
              </div>
              <div className="manager-row">
                <span>Reconnect/discovery</span>
                <strong>
                  reconnect {castBridgeStatus?.diagnostics?.reconnectCount ?? 0} · cycles{' '}
                  {castBridgeStatus?.diagnostics?.discoveryCycleCount ?? 0}
                </strong>
              </div>
              <div className="manager-row">
                <span>Playback session</span>
                <strong>
                  age {castBridgeStatus?.diagnostics?.playbackSessionAgeMs ?? '—'} ms · confidence{' '}
                  {castBridgeStatus?.diagnostics?.playbackConfidence ?? '—'}
                </strong>
              </div>
              {(castBridgeStatus?.diagnostics?.discoveryErrors ?? []).slice(0, 3).map((entry) => (
                <div key={`${entry.at}-${entry.message}`} className="manager-row">
                  <span>{entry.at}</span>
                  <strong>{entry.message}</strong>
                </div>
              ))}
            </div>
          </details>
        </div>

        <div className="manager-block vacuum-runtime-section">
          <div className="manager-block__header">
            <div>
              <strong>Robot adapter-strategi</strong>
              <p className="manager-helper">
                {vacuumBridgeStatus?.message ??
                  'Dream D20 Plus ligger som trygg foundation. Native Lynell-runtime er premium-retning; HA er optional bro for live-test.'}
              </p>
            </div>
            <span className="edge-health edge-health--foundation">{vacuumTruthStatus}</span>
          </div>
          <div className="manager-readiness-strip">
            <strong>{vacuumReadinessLabel}</strong>
            <p>
              {vacuumTrust?.state === 'online'
                ? 'Robotstatus er fersk og kan vises som live.'
                : vacuumTrust?.state === 'stale'
                  ? 'Ingen ferske signaler akkurat nå. Lynell viser sist kjente robotstatus med lav tillit.'
                  : vacuumTrust?.state === 'offline'
                    ? 'Roboten er ikke bekreftet online. Sist kjente status bevares, men brukes ikke som trygg live-status.'
                : vacuumMissingConfig.length > 0
                  ? `Mangler ${vacuumMissingConfig.join(', ')} før live test.`
                  : 'Konfig er satt. Kjør status/connect for å teste Home Assistant-kontakt.'}
            </p>
          </div>
          <div className="mqtt-runtime-grid" aria-label="Robot bridge foundation">
            <article className="mqtt-runtime-card">
              <span>Provider</span>
              <strong>{vacuumBridgeStatus?.providerLabel ?? 'Demo/developer foundation'}</strong>
              <p>{vacuumBridgeStatus?.authRequired ? 'Auth kreves senere. Passord eksponeres ikke i API.' : 'Ingen auth brukes i foundation.'}</p>
            </article>
            <article className="mqtt-runtime-card">
              <span>Connection</span>
              <strong>{vacuumTrust?.state ?? vacuumBridgeStatus?.state ?? 'mock'}</strong>
              <p>
                {vacuumTrust
                  ? `Freshness ${vacuumTrust.freshness} · confidence ${vacuumTrust.stateConfidence}.`
                  : vacuumBridgeStatus?.configured ? 'Klar for HA-test.' : 'Mangler env/config før ekte adapter-test.'}
              </p>
            </article>
            <article className="mqtt-runtime-card">
              <span>Home Assistant</span>
              <strong>{vacuumBridgeStatus?.config.homeAssistantVacuumEntityId ?? 'Ingen entity'}</strong>
              <p>
                {vacuumBridgeStatus?.config.homeAssistantBaseUrl ?? 'LYNELL_HA_BASE_URL mangler'} · token{' '}
                {vacuumBridgeStatus?.config.homeAssistantTokenConfigured ? 'satt' : 'mangler'}
              </p>
            </article>
            <article className="mqtt-runtime-card">
              <span>Robot</span>
              <strong>{vacuumBridgeStatus?.selectedRobot?.name ?? 'Dream D20 Plus'}</strong>
              <p>{vacuumTrust?.message ?? (vacuumBridgeStatus?.connected ? 'Live robotstatus aktiv.' : 'Ikke ekte koblet. Demo/developer-handlinger starter ikke fysisk rengjøring.')}</p>
            </article>
            <article className="mqtt-runtime-card">
              <span>Runtime trust</span>
              <strong>
                {vacuumTrust?.runtimeConnected ? 'Runtime connected' : 'Runtime ikke live'} ·{' '}
                {vacuumTrust?.cloudAuthenticated ? 'cloud OK' : 'cloud venter'}
              </strong>
              <p>
                Sist sync {vacuumTrust?.lastSuccessfulSync ?? vacuumBridgeStatus?.lastSuccessfulSync ?? '—'} · reconnect{' '}
                {vacuumTrust?.reconnectCount ?? vacuumDiagnostics?.reconnectCount ?? 0} · login failures{' '}
                {vacuumTrust?.loginFailures ?? vacuumDiagnostics?.loginFailures ?? 0}
              </p>
            </article>
            <article className="mqtt-runtime-card">
              <span>Live-test</span>
              <strong>{vacuumBridgeStatus?.lastSyncAt ? 'Status hentet' : 'Venter på status'}</strong>
              <p>
                {vacuumBridgeStatus?.command
                  ? `Siste kommando: ${vacuumBridgeStatus.command}. ${vacuumBridgeStatus.message}`
                  : vacuumBridgeStatus?.lastSyncAt
                    ? `Siste sync: ${vacuumBridgeStatus.lastSyncAt}`
                    : vacuumBridgeStatus?.error ?? 'Kjør status/connect før fysisk test.'}
              </p>
            </article>
            <article className="mqtt-runtime-card">
              <span>Foretrukket premium-retning</span>
              <strong>Native Lynell runtime</strong>
              <p>Dreame native adapter, lokal runtime og MQTT bridge er langsiktig retning. Home Assistant er bare optional kompatibilitetsbro.</p>
            </article>
            <article className="mqtt-runtime-card">
              <span>Kompatibilitetsbro</span>
              <strong>Home Assistant</strong>
              <p>Kan brukes til trygg live-test nå hvis roboten allerede finnes i HA, uten å gjøre HA til permanent hovedmotor.</p>
            </article>
          </div>
          {vacuumReadinessChecks.length > 0 ? (
            <details className="integration-truth-details">
              <summary>HA teststatus</summary>
              <ul className="manager-compact-list">
                {vacuumReadinessChecks.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ul>
            </details>
          ) : null}
          <details className="integration-truth-details">
            <summary>Provider-modeller</summary>
            <div className="integration-truth-list">
              {(vacuumBridgeStatus?.providers ?? []).map((provider) => (
                <article key={provider.id}>
                  <span>
                    {provider.strategicRole ?? provider.connectionType} · premium {provider.premiumFit ?? 'medium'} · {provider.dependencyLevel ?? provider.connectionType}
                  </span>
                  <strong>{provider.label}</strong>
                  <p>{provider.nextStep}</p>
                </article>
              ))}
            </div>
          </details>
        </div>

        <div className="manager-block zigbee-runtime-section">
          <div className="manager-block__header">
            <div>
              <strong>Zigbee Runtime</strong>
              <p className="manager-helper">{zigbee2MqttReadiness.nivaSummary}</p>
            </div>
            <span className="edge-health edge-health--foundation">
              {formatZigbeeRuntimeMode(zigbee2MqttReadiness.runtimeMode)}
            </span>
          </div>
          <div className="zigbee-runtime-grid" aria-label="Zigbee2MQTT readiness">
            <article className="zigbee-runtime-card">
              <span>Coordinator</span>
              <strong>{zigbee2MqttReadiness.coordinatorName}</strong>
              <p>{zigbee2MqttReadiness.coordinatorModel} · {zigbee2MqttReadiness.coordinatorPath}</p>
            </article>
            <article className="zigbee-runtime-card">
              <span>Zigbee2MQTT</span>
              <strong>Lokal edge-runtime</strong>
              <p>{zigbee2MqttReadiness.localOnly ? 'Lokal og uten cloud-avhengighet.' : 'Ekstern kobling kreves.'}</p>
            </article>
            <article className="zigbee-runtime-card">
              <span>MQTT broker</span>
              <strong>{zigbee2MqttReadiness.mqtt.brokerHost}:{zigbee2MqttReadiness.mqtt.brokerPort}</strong>
              <p>{zigbee2MqttReadiness.mqtt.authEnabled ? 'Auth planlagt' : 'Auth ikke satt'} · {zigbee2MqttReadiness.mqtt.tlsPlanned ? 'TLS senere' : 'TLS ikke aktiv'}</p>
            </article>
            <article className="zigbee-runtime-card">
              <span>Topic namespace</span>
              <strong>{zigbee2MqttReadiness.deviceBridge.topicNamespace}</strong>
              <p>{zigbee2MqttReadiness.deviceBridge.retainedState}</p>
            </article>
          </div>
          <div className="zigbee-runtime-detail-grid">
            <div>
              <span>Readiness</span>
              <ul>
                {zigbee2MqttReadiness.ready.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </div>
            <div>
              <span>Hva mangler</span>
              <ul>
                {zigbee2MqttReadiness.missing.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </div>
            <div>
              <span>Neste steg</span>
              <ol>
                {zigbee2MqttReadiness.nextSteps.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ol>
            </div>
            <div>
              <span>Onboarding senere</span>
              <ul>
                {Object.values(zigbee2MqttReadiness.pairingReadiness).map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="manager-block integration-setup-section">
          <div className="manager-block__header">
            <div>
              <strong>Oppsett</strong>
              <p className="manager-helper">{integrationSetupSummary}</p>
            </div>
            <span className="edge-health edge-health--foundation">Foundation</span>
          </div>
          <div className="integration-setup-grid" aria-label="Integrasjonsoppsett">
            {integrationSetupItems.map((item) => (
              <article
                key={item.integrationId}
                className={`integration-setup-card integration-setup-card--${item.status}`}
              >
                <div className="integration-setup-card__header">
                  <div>
                    <span>{item.category} · {item.provider}</span>
                    <strong>{item.name}</strong>
                  </div>
                  <em>{formatIntegrationSetupStatus(item.status)}</em>
                </div>
                <p>{item.notes}</p>
                <div className="integration-setup-card__meta">
                  <span>{item.readinessStatus}</span>
                  <span>{item.setupStep}</span>
                  <span>{item.connectionType}</span>
                  <span>{item.requiresAuth ? 'Krever API/login senere' : 'Ingen auth i foundation'}</span>
                  <span>{item.requiresLocalNetwork ? 'Krever lokalt nettverk senere' : 'Kan klargjøres uten lokal runtime'}</span>
                </div>
                <details className="integration-setup-details">
                  <summary>Vis konkrete steg</summary>
                  <div className="integration-setup-detail-grid">
                    <div>
                      <span>Hva er klart</span>
                      <ul>
                        {item.ready.map((entry) => (
                          <li key={entry}>{entry}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span>Hva mangler</span>
                      <ul>
                        {item.missing.map((entry) => (
                          <li key={entry}>{entry}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span>Neste tekniske steg</span>
                      <ol>
                        {item.technicalNextActions.map((entry) => (
                          <li key={entry}>{entry}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                  {item.methodOptions?.length ? (
                    <div className="integration-method-list" aria-label={`${item.name} integrasjonsmetoder`}>
                      <span>Mulige metoder</span>
                      {item.methodOptions.map((method) => (
                        <article key={method.methodId} className={method.recommended ? 'is-recommended' : ''}>
                          <div>
                            <strong>{method.label}</strong>
                            <em>{method.recommended ? 'Anbefalt å avklare først' : method.status}</em>
                          </div>
                          <p>{method.uncertainty}</p>
                          <small>
                            {method.connectionType} · {method.authRequired ? 'auth kreves' : 'ingen auth i foundation'} · risiko {method.risk}
                          </small>
                          <small>Neste: {method.nextStep}</small>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </details>
                <ol className="integration-setup-steps" aria-label="Wizard foundation">
                  {item.steps.map((step, index) => (
                    <li key={step} className={index === item.steps.length - 1 ? 'is-future' : ''}>
                      {step}
                    </li>
                  ))}
                </ol>
                <div className="integration-setup-next">
                  <span>Neste steg</span>
                  <strong>{item.nextAction}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="edge-foundation-grid" aria-label="Edge foundation status">
          {edgeStatuses.map((status) => (
            <article key={status.id} className={`edge-status-card edge-status-card--${status.status}`}>
              <div className="edge-status-card__header">
                <div>
                  <span>{status.protocol}</span>
                  <strong>{status.name}</strong>
                </div>
                <em>{formatEdgeStatusLabel(status.status)}</em>
              </div>
              <p>{status.description}</p>
              <div className="edge-status-card__meta">
                <span>{status.transport}</span>
                <span>{status.deviceCount} devices</span>
                <span>{status.lastContact}</span>
                <span>{status.signalQuality !== null ? `${status.signalQuality}% signal` : 'Signal ikke aktiv'}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="manager-stack edge-section">
          <div className="manager-block">
            <div className="manager-block__header">
              <strong>Zigbee foundation</strong>
              <span className="manager-helper">
                {zigbeeJoinedDevices.length} joined devices · {zigbeeCoordinator?.online ? 'gateway online' : 'gateway stille'}
              </span>
            </div>
            <div className="edge-zigbee-summary">
              <div>
                <span>Coordinator</span>
                <strong>{zigbeeCoordinator?.name ?? 'Ikke definert'}</strong>
                <small>
                  {zigbeeCoordinator?.room ?? 'Teknisk'} · {zigbeeCoordinator?.signalStrength ?? 0}% signal
                </small>
              </div>
              <div>
                <span>Status</span>
                <strong>{zigbeeCoordinator?.online ? 'Online' : 'Stille'}</strong>
                <small>Demo/developer foundation, ingen runtime ennå</small>
              </div>
            </div>
            <div className="edge-device-list" aria-label="Zigbee devices">
              {zigbeeJoinedDevices.map((device) => (
                <div key={device.deviceId} className="edge-device-row">
                  <div>
                    <strong>{device.name}</strong>
                    <span>{device.model} · {device.room ?? 'Ikke plassert'}</span>
                  </div>
                  <span>{device.online ? 'Online' : 'Foundation'}</span>
                  <span>{device.signalStrength !== null ? `${device.signalStrength}% signal` : 'Ingen signal'}</span>
                  <span>{device.batteryLevel !== null ? `${device.batteryLevel}% batteri` : 'Fast strøm'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="manager-block">
            <div className="manager-block__header">
              <strong>Devices / lifecycle</strong>
              <span className="manager-helper">{edgeDeviceHealth.label}</span>
            </div>
            <p className="manager-helper">
              Foundation for pairing, godkjenning, romplassering, kategori, rename og firmware-awareness.
            </p>
            <div className="edge-device-health">
              <span>{edgeLifecycleDevices.length} devices</span>
              <span>{edgeDeviceHealth.staleCount} foundation</span>
              <span>{edgeDeviceHealth.weakSignalCount} svakt signal</span>
              <span>{edgeDeviceHealth.lowBatteryCount} lavt batteri</span>
            </div>
            <div className="edge-lifecycle-list" aria-label="Edge device lifecycle">
              {edgeLifecycleDevices.map((device) => (
                <article key={device.id} className={`edge-lifecycle-card edge-lifecycle-card--${device.lifecycleState}`}>
                  <div className="edge-lifecycle-card__header">
                    <div>
                      <span>{formatDeviceCategory(device.category)} · {device.protocol}</span>
                      <strong>{device.name}</strong>
                    </div>
                    <em>{formatLifecycleState(device.lifecycleState)}</em>
                  </div>
                  <div className="edge-lifecycle-card__meta">
                    <span>{device.manufacturer}</span>
                    <span>{device.type}</span>
                    <span>{device.firmwareVersion ?? 'Firmware ukjent'}</span>
                    <span>{device.lastSeen ? `Sist sett: ${device.lastSeen}` : 'Ingen lastSeen'}</span>
                  </div>
                  <div className="edge-lifecycle-card__health">
                    <span>{device.signal !== null ? `${device.signal}% signal` : 'Signal ikke aktiv'}</span>
                    <span>{device.battery !== null ? `${device.battery}% batteri` : 'Fast strøm'}</span>
                    <span>{device.pairedAt ? `Paired ${device.pairedAt}` : 'Ikke paired'}</span>
                  </div>
                  <label className="manager-field edge-lifecycle-card__room">
                    <span>Room assignment</span>
                    <select
                      className="manager-input"
                      value={device.roomKey ?? ''}
                      onChange={(event) =>
                        setEdgeRoomAssignments((currentAssignments) => ({
                          ...currentAssignments,
                          [device.id]: event.target.value || null,
                        }))
                      }
                    >
                      <option value="">Unassigned</option>
                      {roomOptions.map((room) => (
                        <option key={room.key} value={room.key}>
                          {room.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </article>
              ))}
            </div>
          </div>

          <div className="manager-block">
            <div className="manager-block__header">
              <strong>Sensor Intelligence</strong>
              <span className="manager-helper">
                {sensorIntelligence.devices.length} miljø-inputs · {sensorIntelligence.staleSensorCount} foundation
              </span>
            </div>
            <p className="manager-helper">
              Sensorer forstås som miljøsignaler for luft, aktivitet, lysnivå og romfølelse. Ingen automasjoner kjøres her.
            </p>
            <div className="sensor-intelligence-grid">
              {sensorIntelligence.devices.map((device) => (
                <article key={device.id} className="sensor-intelligence-card">
                  <div className="sensor-intelligence-card__header">
                    <div>
                      <span>{device.environmentalRole}</span>
                      <strong>{device.name}</strong>
                    </div>
                    <em>{device.roomLabel}</em>
                  </div>
                  <div className="sensor-capability-list">
                    {device.capabilities.map((capability) => (
                      <span key={capability}>{formatSensorCapability(capability)}</span>
                    ))}
                  </div>
                  <p>
                    {device.status === 'online'
                      ? 'Live/foundation-signal er aktivt.'
                      : 'Capability er klar, men live runtime mangler ennå.'}
                  </p>
                </article>
              ))}
            </div>
            <div className="sensor-room-profile-list">
              {sensorIntelligence.roomProfiles
                .filter((profile) => profile.sensorCount > 0)
                .slice(0, 4)
                .map((profile) => (
                  <article key={profile.roomKey} className="sensor-room-profile">
                    <div>
                      <span>{profile.sensorCount} sensor-inputs</span>
                      <strong>{profile.roomName}</strong>
                    </div>
                    <p>{profile.summary}</p>
                  </article>
                ))}
            </div>
          </div>

          <div className="manager-block">
            <div className="manager-block__header">
              <strong>BACnet foundation</strong>
              <button type="button" className="manager-action" onClick={onAddBacnetPoint}>
                Legg til BACnet-punkt
              </button>
            </div>
            <p className="manager-helper">
              {integrationConfig.bacnet.active
                ? `${integrationConfig.bacnet.points.length} punkt i oppsett`
                : 'Inaktiv til gateway aktiveres'}
            </p>
            <div className="manager-list">
              <label className="manager-field manager-field--toggle">
                <span>BACnet gateway aktiv</span>
                <input
                  type="checkbox"
                  checked={integrationConfig.bacnet.active}
                  onChange={(event) => onIntegrationActiveChange(event.target.checked)}
                />
              </label>
              {!integrationConfig.bacnet.active ? (
                <p className="manager-zone-card--empty">BACnet er ikke aktivert.</p>
              ) : integrationConfig.bacnet.points.length === 0 ? (
                <div className="manager-zone-card manager-zone-card--empty">
                  <span>Ingen BACnet-punkter ennå</span>
                </div>
              ) : (
                integrationConfig.bacnet.points.map((point) => (
                  <div key={point.id} className="manager-zone-card">
                    <div className="manager-zone-grid">
                      <label className="manager-field">
                        <span>Punktnavn</span>
                        <input className="manager-input" type="text" value={point.name} onChange={(event) => onBacnetPointChange(point.id, 'name', event.target.value)} />
                      </label>
                      <label className="manager-field">
                        <span>Datatype</span>
                        <select className="manager-input" value={point.dataType} onChange={(event) => onBacnetPointChange(point.id, 'dataType', event.target.value)}>
                          {knxDataTypeOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                      <label className="manager-field">
                        <span>Les / skriv</span>
                        <select className="manager-input" value={point.access} onChange={(event) => onBacnetPointChange(point.id, 'access', event.target.value)}>
                          {knxAccessModeOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                      <label className="manager-field">
                        <span>Ekstern referanse</span>
                        <input className="manager-input" type="text" value={point.externalRef} onChange={(event) => onBacnetPointChange(point.id, 'externalRef', event.target.value)} />
                      </label>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </article>
      ) : null}

      {activeSection === 'media' ? (
        <ManagerMediaSection
          mediaConfig={mediaConfig}
          onMediaConfigChange={onMediaConfigChange}
          onAddMediaGroupConfig={onAddMediaGroupConfig}
          onMediaGroupConfigChange={onMediaGroupConfigChange}
          onAddMediaGroupSpeaker={onAddMediaGroupSpeaker}
          onMediaGroupSpeakerChange={onMediaGroupSpeakerChange}
          onDeleteMediaGroupSpeaker={onDeleteMediaGroupSpeaker}
        />
      ) : null}

      {activeSection === 'calendar' ? (
      <article className="manager-card manager-card--wide">
        <div className="manager-block__header">
          <p className="room-card__label">Kalender</p>
        </div>
        <p className="manager-helper">
          {calendarEvents.length} aktiviteter · {bookingResources.length} ressurser · {bookings.length}{' '}
          bookinger
        </p>
        <div className="manager-stack">
          <div className="manager-block">
            <div className="manager-block__header">
              <strong>Aktiviteter</strong>
              <button type="button" className="manager-action" onClick={onAddCalendarEvent}>
                Legg til aktivitet
              </button>
            </div>
            {calendarEvents.length === 0 ? (
              <div className="manager-zone-card manager-zone-card--empty">
                <span>Ingen aktiviteter ennå</span>
              </div>
            ) : (
            calendarEvents.map((event) => (
              <div key={event.id} className="manager-zone-card">
                <div className="manager-zone-header">
                  <span>{event.title || 'Aktivitet'}</span>
                  <button
                    type="button"
                    className="manager-action manager-action--danger"
                    onClick={() => onDeleteCalendarEvent(event.id)}
                  >
                    Slett
                  </button>
                </div>
                <div className="manager-zone-grid">
                    <label className="manager-field">
                      <span>Tittel</span>
                      <input
                        className="manager-input"
                        type="text"
                        value={event.title}
                        onChange={(e) => onCalendarEventChange(event.id, 'title', e.target.value)}
                      />
                    </label>
                    <label className="manager-field">
                      <span>Dato</span>
                      <input
                        className="manager-input"
                        type="date"
                        value={event.date}
                        onChange={(e) => onCalendarEventChange(event.id, 'date', e.target.value)}
                      />
                    </label>
                    <label className="manager-field">
                      <span>Start</span>
                      <input
                        className="manager-input"
                        type="time"
                        value={event.startTime}
                        onChange={(e) => onCalendarEventChange(event.id, 'startTime', e.target.value)}
                      />
                    </label>
                    <label className="manager-field">
                      <span>Slutt</span>
                      <input
                        className="manager-input"
                        type="time"
                        value={event.endTime}
                        onChange={(e) => onCalendarEventChange(event.id, 'endTime', e.target.value)}
                      />
                    </label>
                    <label className="manager-field">
                      <span>Hvem</span>
                      <input
                        className="manager-input"
                        type="text"
                        value={event.person}
                        onChange={(e) => onCalendarEventChange(event.id, 'person', e.target.value)}
                      />
                    </label>
                    <label className="manager-field">
                      <span>Sted</span>
                      <input
                        className="manager-input"
                        type="text"
                        value={event.place}
                        onChange={(e) => onCalendarEventChange(event.id, 'place', e.target.value)}
                      />
                    </label>
                    <label className="manager-field manager-field--wide">
                      <span>Notat</span>
                      <input
                        className="manager-input"
                        type="text"
                        value={event.note}
                        onChange={(e) => onCalendarEventChange(event.id, 'note', e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="manager-block">
            <div className="manager-block__header">
              <strong>Bookbare ressurser</strong>
              <button type="button" className="manager-action" onClick={onAddBookingResource}>
                Legg til ressurs
              </button>
            </div>
            {bookingResources.length === 0 ? (
              <div className="manager-zone-card manager-zone-card--empty">
                <span>Ingen ressurser ennå</span>
              </div>
            ) : (
              bookingResources.map((resource) => (
                <div key={resource.id} className="manager-zone-card">
                  <div className="manager-zone-header">
                    <span>{resource.name || 'Ressurs'}</span>
                    <button
                      type="button"
                      className="manager-action manager-action--danger"
                      onClick={() => onDeleteBookingResource(resource.id)}
                    >
                      Slett
                    </button>
                  </div>
                  <div className="manager-zone-grid">
                    <label className="manager-field">
                      <span>Navn</span>
                      <input
                        className="manager-input"
                        type="text"
                        value={resource.name}
                        onChange={(e) =>
                          onBookingResourceChange(resource.id, 'name', e.target.value)
                        }
                      />
                    </label>
                    <label className="manager-field">
                      <span>Type</span>
                      <select
                        className="manager-input"
                        value={resource.type}
                        onChange={(e) =>
                          onBookingResourceChange(resource.id, 'type', e.target.value)
                        }
                      >
                        {bookingResourceTypeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="manager-field manager-field--toggle">
                      <span>Aktiv</span>
                      <input
                        type="checkbox"
                        checked={resource.active}
                        onChange={(e) =>
                          onBookingResourceChange(resource.id, 'active', e.target.checked)
                        }
                      />
                    </label>
                    <label className="manager-field">
                      <span>Koblet rom</span>
                      <select
                        className="manager-input"
                        value={resource.roomKey}
                        onChange={(e) =>
                          onBookingResourceChange(resource.id, 'roomKey', e.target.value)
                        }
                      >
                        <option value="">Ikke koblet</option>
                        {roomOptions.map((room) => (
                          <option key={room.key} value={room.key}>
                            {room.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="manager-field">
                      <span>Koblet scene</span>
                      <select
                        className="manager-input"
                        value={resource.sceneId}
                        onChange={(e) =>
                          onBookingResourceChange(resource.id, 'sceneId', e.target.value)
                        }
                      >
                        <option value="">Ingen scene</option>
                        {scenes.map((scene) => (
                          <option key={scene.id} value={scene.id}>
                            {scene.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="manager-field manager-field--toggle">
                      <span>Klima relevant</span>
                      <input
                        type="checkbox"
                        checked={resource.climateRelevant}
                        onChange={(e) =>
                          onBookingResourceChange(
                            resource.id,
                            'climateRelevant',
                            e.target.checked,
                          )
                        }
                      />
                    </label>
                    <label className="manager-field manager-field--toggle">
                      <span>Tillat overlapp</span>
                      <input
                        type="checkbox"
                        checked={resource.allowOverlap}
                        onChange={(e) =>
                          onBookingResourceChange(
                            resource.id,
                            'allowOverlap',
                            e.target.checked,
                          )
                        }
                      />
                    </label>
                    <label className="manager-field">
                      <span>Buffer før (min)</span>
                      <input
                        className="manager-input"
                        type="number"
                        min="0"
                        value={resource.bufferBeforeMin}
                        onChange={(e) =>
                          onBookingResourceChange(
                            resource.id,
                            'bufferBeforeMin',
                            Number(e.target.value),
                          )
                        }
                      />
                    </label>
                    <label className="manager-field">
                      <span>Buffer etter (min)</span>
                      <input
                        className="manager-input"
                        type="number"
                        min="0"
                        value={resource.bufferAfterMin}
                        onChange={(e) =>
                          onBookingResourceChange(
                            resource.id,
                            'bufferAfterMin',
                            Number(e.target.value),
                          )
                        }
                      />
                    </label>
                    <label className="manager-field manager-field--toggle">
                      <span>Send til kalender som standard</span>
                      <input
                        type="checkbox"
                        checked={resource.sendToCalendarDefault}
                        onChange={(e) =>
                          onBookingResourceChange(
                            resource.id,
                            'sendToCalendarDefault',
                            e.target.checked,
                          )
                        }
                      />
                    </label>
                    <label className="manager-field manager-field--wide">
                      <span>Notat</span>
                      <input
                        className="manager-input"
                        type="text"
                        value={resource.note}
                        onChange={(e) =>
                          onBookingResourceChange(resource.id, 'note', e.target.value)
                        }
                      />
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="manager-block">
            <div className="manager-block__header">
              <strong>Bookinger</strong>
              <button type="button" className="manager-action" onClick={onAddBooking}>
                Legg til booking
              </button>
            </div>
            <p className="manager-helper">
              Appen varsler om overlapp når ressursen ikke tillater samtidige bookinger.
            </p>
            {bookings.length === 0 ? (
              <div className="manager-zone-card manager-zone-card--empty">
                <span>Ingen bookinger ennå</span>
              </div>
            ) : (
              bookings.map((booking) => (
                <div key={booking.id} className="manager-zone-card">
                  <div className="manager-zone-header">
                    <span>{booking.title || 'Booking'}</span>
                    <button
                      type="button"
                      className="manager-action manager-action--danger"
                      onClick={() => onDeleteBooking(booking.id)}
                    >
                      Slett
                    </button>
                  </div>
                  <div className="manager-zone-grid">
                    <label className="manager-field">
                      <span>Ressurs</span>
                      <select
                        className="manager-input"
                        value={booking.resourceId}
                        onChange={(e) => onBookingChange(booking.id, 'resourceId', e.target.value)}
                      >
                        <option value="">Velg ressurs</option>
                        {bookingResources.map((resource) => (
                          <option key={resource.id} value={resource.id}>
                            {resource.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="manager-field">
                      <span>Tittel</span>
                      <input
                        className="manager-input"
                        type="text"
                        value={booking.title}
                        onChange={(e) => onBookingChange(booking.id, 'title', e.target.value)}
                      />
                    </label>
                    <label className="manager-field">
                      <span>Dato</span>
                      <input
                        className="manager-input"
                        type="date"
                        value={booking.date}
                        onChange={(e) => onBookingChange(booking.id, 'date', e.target.value)}
                      />
                    </label>
                    <label className="manager-field">
                      <span>Start</span>
                      <input
                        className="manager-input"
                        type="time"
                        value={booking.startTime}
                        onChange={(e) => onBookingChange(booking.id, 'startTime', e.target.value)}
                      />
                    </label>
                    <label className="manager-field">
                      <span>Slutt</span>
                      <input
                        className="manager-input"
                        type="time"
                        value={booking.endTime}
                        onChange={(e) => onBookingChange(booking.id, 'endTime', e.target.value)}
                      />
                    </label>
                    <label className="manager-field">
                      <span>Opprettet av</span>
                      <input
                        className="manager-input"
                        type="text"
                        value={booking.createdBy}
                        onChange={(e) => onBookingChange(booking.id, 'createdBy', e.target.value)}
                      />
                    </label>
                    <label className="manager-field">
                      <span>Deltakere</span>
                      <input
                        className="manager-input"
                        type="text"
                        value={booking.participants}
                        onChange={(e) => onBookingChange(booking.id, 'participants', e.target.value)}
                      />
                    </label>
                    <label className="manager-field">
                      <span>Status</span>
                      <select
                        className="manager-input"
                        value={booking.status}
                        onChange={(e) => onBookingChange(booking.id, 'status', e.target.value)}
                      >
                        {bookingStatusOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="manager-field manager-field--toggle">
                      <span>Send til kalender</span>
                      <input
                        type="checkbox"
                        checked={booking.sendToCalendar}
                        onChange={(e) =>
                          onBookingChange(booking.id, 'sendToCalendar', e.target.checked)
                        }
                      />
                    </label>
                    <label className="manager-field manager-field--wide">
                      <span>Notat</span>
                      <input
                        className="manager-input"
                        type="text"
                        value={booking.note}
                        onChange={(e) => onBookingChange(booking.id, 'note', e.target.value)}
                      />
                    </label>
                  </div>
                  {bookingConflictIds.includes(booking.id) ? (
                    <p className="manager-warning">
                      Overlapp oppdaget for valgt ressurs med gjeldende buffer.
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </article>
      ) : null}

      {activeSection === 'operations' ? (
      <>
      <article className="manager-card">
        <p className="room-card__label">Drift / Avansert</p>
        <p className="manager-helper">
          Styrer faktisk runtime-strategi for klima. Subscribe er valgt, men polling-fallback brukes til det er implementert.
        </p>
        <div className="manager-list">
          <div className="manager-row">
            <span>Ønsket strategi</span>
            <select
              className="manager-input"
              value={runtimeConfig.climateFeedbackMethod}
              onChange={(event) =>
                onRuntimeConfigChange(
                  'climateFeedbackMethod',
                  event.target.value as RuntimeConfig['climateFeedbackMethod'],
                )
              }
            >
              <option value="polling">Polling</option>
              <option value="subscribe">Subscribe (Eksperimentell)</option>
            </select>
          </div>
          {runtimeConfig.climateFeedbackMethod === 'polling' ? (
            <div className="manager-row">
              <span>Polling-intervall (sek)</span>
              <input
                className="manager-input"
                type="number"
                min="5"
                step="1"
                value={runtimeConfig.climatePollingIntervalSec}
                onChange={(event) =>
                  onRuntimeConfigChange(
                    'climatePollingIntervalSec',
                    Math.max(5, Number(event.target.value) || 20),
                  )
                }
              />
            </div>
          ) : null}
          <div className="manager-row">
            <span>Strategi i bruk nå</span>
            <strong>
              {runtimeConfig.climateFeedbackMethod === 'polling'
                ? `Polling hvert ${runtimeConfig.climatePollingIntervalSec}. sek`
                : 'Polling-fallback (Subscribe for klima kommer senere)'}
            </strong>
          </div>
        </div>
      </article>

      <article className="manager-card manager-card--wide">
        <div className="manager-block__header">
          <div>
            <p className="room-card__label">Adaptive UI capabilities</p>
            <h2>Synlighet uten runtime-endring</h2>
            <p className="manager-helper">
              Styr hvilke kort, domener og future foundations som får være synlige. Dette er bare UI/config gating; ingen KNX, provider eller action-flow endres.
            </p>
          </div>
          <span className="manager-readiness__indicator is-partial">
            {uiCapabilitySummary.visible}/{uiCapabilitySummary.total} synlige
          </span>
        </div>
        <div className="manager-capability-summary" aria-label="Capability visibility summary">
          <span>Enabled {uiCapabilitySummary.enabled}</span>
          <span>Hidden {uiCapabilitySummary.hidden}</span>
          <span>Future {uiCapabilitySummary.future}</span>
          <span>Room scoped {uiCapabilitySummary.roomScoped}</span>
          <span>Hidden cards {hiddenCardCount}</span>
          <span>Room caps {enabledRoomCapabilityCount}</span>
        </div>
        <label className="manager-field manager-field--toggle">
          <span>Vis future features i Manager</span>
          <input
            type="checkbox"
            checked={uiCapabilityConfig.showFutureFeatures}
            onChange={(event) =>
              onUiCapabilityConfigChange('showFutureFeatures', event.target.checked)
            }
          />
        </label>
        <div className="manager-capability-grid" aria-label="Core UI capabilities">
          {coreVisibilityCapabilities.map(renderCapabilityCard)}
        </div>
      </article>

      <article className="manager-card manager-card--wide">
        <div className="manager-block__header">
          <div>
            <p className="room-card__label">Runtime trust config</p>
            <h2>Server-eid konfig og rolig læring</h2>
            <p className="manager-helper">
              Samtaleloggen er lokal til bridge og er av som default. Auto-poll stille signaler er kun en foundation og kjører ikke når den står av.
            </p>
          </div>
          <span className="manager-readiness__indicator">
            {conversationLoggingEnabled ? 'Logg på' : 'Logg av'}
          </span>
        </div>
        <div className="manager-zone-grid">
          <label className="manager-field manager-field--toggle">
            <span>Samtalelogg for forbedring/trening</span>
            <input
              type="checkbox"
              checked={conversationLoggingEnabled}
              onChange={(event) => onConversationLoggingChange(event.target.checked)}
            />
          </label>
          <label className="manager-field manager-field--toggle">
            <span>Auto-poll stille signaler</span>
            <input
              type="checkbox"
              checked={autoPollQuietSignalsConfig.enabled}
              onChange={(event) =>
                onAutoPollQuietSignalsChange('enabled', event.target.checked)
              }
            />
          </label>
          <label className="manager-field">
            <span>Auto-poll modus</span>
            <select
              className="manager-input"
              value={autoPollQuietSignalsConfig.mode ?? 'allEligible'}
              onChange={(event) =>
                onAutoPollQuietSignalsChange(
                  'mode',
                  event.target.value as AutoPollQuietSignalsConfig['mode'],
                )
              }
            >
              <option value="allEligible">Alle eligible</option>
              <option value="selectedSignals">Valgte signaler</option>
              <option value="selectedRooms">Valgte rom</option>
              <option value="selectedGroupAddresses">Valgte GA-er</option>
            </select>
          </label>
          <label className="manager-field">
            <span>Quiet threshold (min)</span>
            <input
              className="manager-input"
              type="number"
              min="5"
              value={autoPollQuietSignalsConfig.quietThresholdMinutes}
              onChange={(event) =>
                onAutoPollQuietSignalsChange('quietThresholdMinutes', Number(event.target.value))
              }
            />
          </label>
          <label className="manager-field">
            <span>Global max polls</span>
            <input
              className="manager-input"
              type="number"
              min="0"
              value={autoPollQuietSignalsConfig.globalMaxPollsPerWindow}
              onChange={(event) =>
                onAutoPollQuietSignalsChange('globalMaxPollsPerWindow', Number(event.target.value))
              }
            />
          </label>
          <label className="manager-field">
            <span>Poll window (min)</span>
            <input
              className="manager-input"
              type="number"
              min="1"
              value={autoPollQuietSignalsConfig.pollWindowMinutes}
              onChange={(event) =>
                onAutoPollQuietSignalsChange('pollWindowMinutes', Number(event.target.value))
              }
            />
          </label>
          <label className="manager-field">
            <span>Per-room cooldown (min)</span>
            <input
              className="manager-input"
              type="number"
              min="5"
              value={autoPollQuietSignalsConfig.perRoomCooldownMinutes}
              onChange={(event) =>
                onAutoPollQuietSignalsChange('perRoomCooldownMinutes', Number(event.target.value))
              }
            />
          </label>
          <label className="manager-field">
            <span>Per-signal cooldown (min)</span>
            <input
              className="manager-input"
              type="number"
              min="5"
              value={autoPollQuietSignalsConfig.perSignalCooldownMinutes ?? 60}
              onChange={(event) =>
                onAutoPollQuietSignalsChange('perSignalCooldownMinutes', Number(event.target.value))
              }
            />
          </label>
          <label className="manager-field manager-field--wide">
            <span>Valgte GA-er</span>
            <textarea
              className="manager-input"
              rows={2}
              value={listToText(autoPollQuietSignalsConfig.selectedGroupAddresses)}
              onChange={(event) =>
                onAutoPollQuietSignalsChange('selectedGroupAddresses', textToList(event.target.value))
              }
              placeholder="1/1/0, 1/1/7"
            />
          </label>
          <label className="manager-field manager-field--wide">
            <span>Valgte rom</span>
            <textarea
              className="manager-input"
              rows={2}
              value={listToText(autoPollQuietSignalsConfig.selectedRooms)}
              onChange={(event) =>
                onAutoPollQuietSignalsChange('selectedRooms', textToList(event.target.value))
              }
              placeholder="basement-entry, plan0-tv"
            />
          </label>
          <label className="manager-field manager-field--wide">
            <span>Ekskluder GA-er</span>
            <textarea
              className="manager-input"
              rows={2}
              value={listToText(autoPollQuietSignalsConfig.excludedGroupAddresses)}
              onChange={(event) =>
                onAutoPollQuietSignalsChange('excludedGroupAddresses', textToList(event.target.value))
              }
              placeholder="0/1/4"
            />
          </label>
        </div>
        <p className="manager-helper">
          {conversationLoggingStatus}. Auto-poll bruker bare stale-relevante/cyclic signaler senere og hopper over onChange-only lysrom.
        </p>
        {diagnostics.autoPollTargetDiagnostics ? (
          <div className="manager-list manager-list--technical auto-poll-preview">
            <div className="manager-block__header">
              <div>
                <strong>Vil polle disse signalene</strong>
                <p className="manager-helper">
                  {diagnostics.autoPollTargetDiagnostics.selectedCount} valgt · {diagnostics.autoPollTargetDiagnostics.eligibleCount} eligible · default OFF
                </p>
              </div>
              <span className="manager-readiness__indicator">
                {diagnostics.autoPollTargetDiagnostics.mode}
              </span>
            </div>
            {diagnostics.autoPollTargetDiagnostics.preview.slice(0, 12).map((target) => (
              <div key={target.signalId} className="manager-row manager-row--stacked">
                <span>
                  {target.roomName} · {target.field} · {target.groupAddress}
                </span>
                <strong className="manager-status-signal">
                  <span>{target.updateMode}</span>
                  <span>{target.staleRelevant ? 'stale relevant' : 'ikke stale relevant'}</span>
                  <span>{target.selected ? 'valgt' : 'ikke valgt'}</span>
                  <span>{target.reason}</span>
                </strong>
              </div>
            ))}
          </div>
        ) : null}
      </article>

      <article className="manager-card manager-card--wide">
        <div className="manager-block__header">
          <div>
            <p className="room-card__label">Future foundations</p>
            <h2>Forberedt, men skjult som default</h2>
            <p className="manager-helper">
              Disse kortene er metadata og visibility-foundation. De ser aldri ut som live runtime før de eksplisitt aktiveres.
            </p>
          </div>
          <span className="manager-readiness__indicator">
            {uiCapabilitySummary.futureVisible} future synlige
          </span>
        </div>
        {premiumHomeCapabilities.length > 0 ? (
          <>
            <p className="manager-eyebrow">Bolig / premium</p>
            <div className="manager-capability-grid">
              {premiumHomeCapabilities.map(renderCapabilityCard)}
            </div>
          </>
        ) : null}
        {microSdCapabilities.length > 0 ? (
          <>
            <p className="manager-eyebrow">Micro-SD / technical</p>
            <div className="manager-capability-grid">
              {microSdCapabilities.map(renderCapabilityCard)}
            </div>
          </>
        ) : null}
        {energyFutureCapabilities.length > 0 ? (
          <>
            <p className="manager-eyebrow">Future energy / resources</p>
            <div className="manager-capability-grid">
              {energyFutureCapabilities.map(renderCapabilityCard)}
            </div>
          </>
        ) : null}
        {visibleFutureCapabilities.length === 0 ? (
          <p className="manager-helper">
            Future foundations er skjult. Slå på “Vis future features” for å se og aktivere dem.
          </p>
        ) : null}
      </article>

      <article className="manager-card manager-card--wide">
        <div className="manager-block__header">
          <div>
            <p className="room-card__label">Room capability visibility</p>
            <h2>Rom viser bare relevante funksjoner</h2>
            <p className="manager-helper">
              Per-rom gating skjuler tomme eller fremtidige flater, for eksempel HCL, spjeld og ventilasjon, uten å endre rommets runtime-config.
            </p>
          </div>
        </div>
        <div className="manager-room-capability-list">
          {roomCapabilitySummaries.map((roomSummary) => (
            <div key={roomSummary.roomKey} className="manager-room-capability">
              <div>
                <strong>{roomSummary.roomName}</strong>
                <span>{roomSummary.visible.length} synlige · {roomSummary.hidden.length} skjult</span>
              </div>
              <div>
                {roomCapabilityDefinitions.map((capability) => {
                  const roomOverride = uiCapabilityConfig.roomOverrides[roomSummary.roomKey]?.[capability.id]
                  const visible = roomOverride?.visible ?? capability.defaultVisible
                  const enabled = roomOverride?.enabled ?? capability.defaultEnabled

                  return (
                    <label key={capability.id}>
                      <input
                        type="checkbox"
                        checked={visible && enabled}
                        onChange={(event) =>
                          onRoomCapabilityChange(roomSummary.roomKey, capability.id, {
                            visible: event.target.checked,
                            enabled: event.target.checked,
                          })
                        }
                      />
                      <span>{capability.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="manager-card manager-card--wide">
        <div className="manager-block__header">
          <div>
            <p className="room-card__label">HCL foundation</p>
            <h2>Timeline-editor uten execution</h2>
            <p className="manager-helper">
              EQ/timeline-style grunnlag for intensity og fargetemperatur. Default er inaktiv dry-run, og ingen telegrammer sendes.
            </p>
          </div>
          <span className="manager-readiness__indicator is-partial">
            {uiCapabilityConfig.hcl.enabled ? 'Enabled foundation' : 'Disabled'}
          </span>
        </div>
        <div className="manager-hcl-timeline" aria-label="HCL timeline foundation">
          {uiCapabilityConfig.hcl.timeline.map((point) => (
            <div key={point.id} className="manager-hcl-point">
              <span>{point.time}</span>
              <div>
                <span style={{ width: `${point.intensity}%` }} />
              </div>
              <strong>{point.intensity}% · {point.colorTemperature}K</strong>
            </div>
          ))}
        </div>
        <div className="manager-zone-grid">
          <label className="manager-field manager-field--toggle">
            <span>HCL editor aktiv i UI</span>
            <input
              type="checkbox"
              checked={uiCapabilityConfig.hcl.enabled}
              onChange={(event) => onHclFoundationChange('enabled', event.target.checked)}
            />
          </label>
          <label className="manager-field manager-field--toggle">
            <span>Dry-run</span>
            <input
              type="checkbox"
              checked={uiCapabilityConfig.hcl.dryRun}
              onChange={(event) => onHclFoundationChange('dryRun', event.target.checked)}
            />
          </label>
          <label className="manager-field">
            <span>Optional intensity GA</span>
            <input
              className="manager-input"
              type="text"
              value={uiCapabilityConfig.hcl.optionalIntensityGa}
              placeholder="Ikke satt"
              onChange={(event) => onHclFoundationChange('optionalIntensityGa', event.target.value)}
            />
          </label>
          <label className="manager-field">
            <span>Optional color temperature GA</span>
            <input
              className="manager-input"
              type="text"
              value={uiCapabilityConfig.hcl.optionalColorTemperatureGa}
              placeholder="Ikke satt"
              onChange={(event) =>
                onHclFoundationChange('optionalColorTemperatureGa', event.target.value)
              }
            />
          </label>
        </div>
      </article>
      </>
      ) : null}

      {activeSection === 'mqtt' ? (
      <article className="manager-card manager-card--wide">
        <p className="room-card__label">MQTT</p>
        <p className="manager-helper">
          Klargjør topic-struktur og broker-oppsett for senere KNX ⇄ MQTT, uten å starte runtime ennå.
        </p>
        <div className="manager-list">
          <label className="manager-field manager-field--toggle">
            <span>MQTT aktiv</span>
            <input
              type="checkbox"
              checked={mqttConfig.enabled}
              onChange={(event) => onMqttConfigChange('enabled', event.target.checked)}
            />
          </label>
          <div className="manager-zone-grid">
            <label className="manager-field">
              <span>Base topic</span>
              <input
                className="manager-input"
                type="text"
                value={mqttConfig.baseTopic}
                placeholder="lynell"
                onChange={(event) => onMqttConfigChange('baseTopic', event.target.value)}
              />
            </label>
            <label className="manager-field">
              <span>Broker host</span>
              <input
                className="manager-input"
                type="text"
                value={mqttConfig.brokerHost}
                placeholder="mqtt.local"
                onChange={(event) => onMqttConfigChange('brokerHost', event.target.value)}
              />
            </label>
            <label className="manager-field">
              <span>Broker port</span>
              <input
                className="manager-input"
                type="number"
                min="1"
                step="1"
                value={mqttConfig.brokerPort}
                onChange={(event) =>
                  onMqttConfigChange('brokerPort', Math.max(1, Number(event.target.value) || 1883))
                }
              />
            </label>
            <label className="manager-field">
              <span>Client ID</span>
              <input
                className="manager-input"
                type="text"
                value={mqttConfig.clientId}
                placeholder="lynell-home"
                onChange={(event) => onMqttConfigChange('clientId', event.target.value)}
              />
            </label>
            <label className="manager-field">
              <span>Brukernavn</span>
              <input
                className="manager-input"
                type="text"
                value={mqttConfig.username}
                onChange={(event) => onMqttConfigChange('username', event.target.value)}
              />
            </label>
            <label className="manager-field">
              <span>Passord</span>
              <input
                className="manager-input"
                type="password"
                value={mqttConfig.password}
                onChange={(event) => onMqttConfigChange('password', event.target.value)}
              />
            </label>
          </div>
          <label className="manager-field manager-field--toggle">
            <span>Sikker tilkobling (TLS)</span>
            <input
              type="checkbox"
              checked={mqttConfig.secure}
              onChange={(event) => onMqttConfigChange('secure', event.target.checked)}
            />
          </label>
          <p className="manager-helper">
            Topics bygges fra bolig, etasje, rom og sone. KNX-adresser brukes ikke som topic-navn.
          </p>
        </div>
      </article>
      ) : null}

      {activeSection === 'camera' ? (
      <article className="manager-card manager-card--wide">
        <div className="manager-block__header">
          <div>
            <p className="room-card__label">Kamera / NVR</p>
            <h2>Camera provider foundation</h2>
            <p className="manager-helper">
              {cameraFoundationSummary.cameraCount} kamera · {cameraFoundationSummary.recordingEnabledCount} recording foundation · {cameraFoundationSummary.recorderTargetLabel}
            </p>
          </div>
          <button type="button" className="manager-action" onClick={onAddCameraConfig}>
            Legg til kamera
          </button>
        </div>
        <div className="manager-list">
          <label className="manager-field manager-field--toggle">
            <span>Camera provider synlig</span>
            <input
              type="checkbox"
              checked={cameraConfig.providerEnabled}
              onChange={(event) => onCameraProviderEnabledChange(event.target.checked)}
            />
          </label>
          <div className="manager-block">
            <div className="manager-block__header">
              <strong>Recorder / NVR foundation</strong>
              <span>Config only · ingen opptakspipeline ennå</span>
            </div>
            <div className="manager-zone-grid">
              <label className="manager-field">
                <span>Lagringsmål</span>
                <select
                  className="manager-input"
                  value={cameraConfig.recorder.target}
                  onChange={(event) => onCameraRecorderChange('target', event.target.value as CameraFoundationConfig['recorder']['target'])}
                >
                  <option value="localDisk">Lokal disk</option>
                  <option value="externalDisk">Ekstern disk</option>
                  <option value="networkPath">Nettverkssti future</option>
                </select>
              </label>
              <label className="manager-field">
                <span>Path / mount</span>
                <input
                  className="manager-input"
                  type="text"
                  value={cameraConfig.recorder.path}
                  placeholder="D:\\Lynell-NVR eller /mnt/nvr"
                  onChange={(event) => onCameraRecorderChange('path', event.target.value)}
                />
              </label>
              <label className="manager-field">
                <span>Retention dager</span>
                <input
                  className="manager-input"
                  type="number"
                  min="1"
                  value={cameraConfig.recorder.retentionDays}
                  onChange={(event) => onCameraRecorderChange('retentionDays', Number(event.target.value))}
                />
              </label>
              <label className="manager-field">
                <span>Max storage GB</span>
                <input
                  className="manager-input"
                  type="number"
                  min="0"
                  value={cameraConfig.recorder.maxStorageGb ?? ''}
                  onChange={(event) => onCameraRecorderChange('maxStorageGb', event.target.value === '' ? null : Number(event.target.value))}
                />
              </label>
              <label className="manager-field">
                <span>Storage health</span>
                <select
                  className="manager-input"
                  value={cameraConfig.recorder.storageHealth}
                  onChange={(event) => onCameraRecorderChange('storageHealth', event.target.value as CameraFoundationConfig['recorder']['storageHealth'])}
                >
                  <option value="unknown">unknown</option>
                  <option value="healthy">healthy</option>
                  <option value="watch">watch</option>
                  <option value="unavailable">unavailable</option>
                </select>
              </label>
              <label className="manager-field manager-field--toggle">
                <span>Overwrite oldest</span>
                <input
                  type="checkbox"
                  checked={cameraConfig.recorder.overwriteOldest}
                  onChange={(event) => onCameraRecorderChange('overwriteOldest', event.target.checked)}
                />
              </label>
            </div>
          </div>
          <div className="manager-stack">
            {cameraConfig.cameras.map((camera) => (
              <div key={camera.cameraId} className="manager-zone-card">
                <div className="manager-block__header">
                  <div>
                    <strong>{camera.displayName || 'Kamera'}</strong>
                    <p className="manager-helper">
                      {formatCameraType(camera.type)} · {formatCameraTrustStatus(camera)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="manager-action manager-action--danger"
                    onClick={() => onDeleteCameraConfig(camera.cameraId)}
                  >
                    Slett
                  </button>
                </div>
                <div className="manager-zone-grid">
                  <label className="manager-field">
                    <span>Navn</span>
                    <input className="manager-input" type="text" value={camera.displayName} onChange={(event) => onCameraConfigChange(camera.cameraId, 'displayName', event.target.value)} />
                  </label>
                  <label className="manager-field">
                    <span>Type</span>
                    <select className="manager-input" value={camera.type} onChange={(event) => onCameraConfigChange(camera.cameraId, 'type', event.target.value)}>
                      {cameraTypeOptions.map((option) => (
                        <option key={option} value={option}>{formatCameraType(option)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="manager-field">
                    <span>Rom</span>
                    <select className="manager-input" value={camera.roomId ?? ''} onChange={(event) => onCameraConfigChange(camera.cameraId, 'roomId', event.target.value)}>
                      <option value="">Ikke plassert</option>
                      {roomOptions.map((option) => (
                        <option key={option.key} value={option.key}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="manager-field">
                    <span>Runtime state</span>
                    <select className="manager-input" value={camera.state} onChange={(event) => onCameraConfigChange(camera.cameraId, 'state', event.target.value)}>
                      {cameraRuntimeStateOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <label className="manager-field manager-field--toggle">
                    <span>Enabled</span>
                    <input type="checkbox" checked={camera.enabled} onChange={(event) => onCameraConfigChange(camera.cameraId, 'enabled', event.target.checked)} />
                  </label>
                  <label className="manager-field manager-field--toggle">
                    <span>Visible</span>
                    <input type="checkbox" checked={camera.visible} onChange={(event) => onCameraConfigChange(camera.cameraId, 'visible', event.target.checked)} />
                  </label>
                  <label className="manager-field">
                    <span>RTSP URL</span>
                    <input className="manager-input" type="text" value={camera.rtspUrl ?? ''} placeholder="rtsp://... (ikke vis secrets i diagnostics)" onChange={(event) => onCameraConfigChange(camera.cameraId, 'rtspUrl', event.target.value)} />
                  </label>
                  <label className="manager-field">
                    <span>ONVIF endpoint</span>
                    <input className="manager-input" type="text" value={camera.onvif ?? ''} placeholder="http://camera/onvif" onChange={(event) => onCameraConfigChange(camera.cameraId, 'onvif', event.target.value)} />
                  </label>
                  <label className="manager-field">
                    <span>Snapshot URL</span>
                    <input className="manager-input" type="text" value={camera.snapshotUrl ?? ''} onChange={(event) => onCameraConfigChange(camera.cameraId, 'snapshotUrl', event.target.value)} />
                  </label>
                  <label className="manager-field manager-field--toggle">
                    <span>Recording enabled</span>
                    <input type="checkbox" checked={camera.recordingEnabled} onChange={(event) => onCameraConfigChange(camera.cameraId, 'recordingEnabled', event.target.checked)} />
                  </label>
                  <label className="manager-field">
                    <span>Retention</span>
                    <input className="manager-input" type="number" min="1" value={camera.retentionDays} onChange={(event) => onCameraConfigChange(camera.cameraId, 'retentionDays', Number(event.target.value))} />
                  </label>
                  <label className="manager-field manager-field--toggle">
                    <span>Motion available</span>
                    <input type="checkbox" checked={camera.motionAvailable} onChange={(event) => onCameraConfigChange(camera.cameraId, 'motionAvailable', event.target.checked)} />
                  </label>
                  <label className="manager-field manager-field--toggle">
                    <span>Audio available</span>
                    <input type="checkbox" checked={camera.audioAvailable} onChange={(event) => onCameraConfigChange(camera.cameraId, 'audioAvailable', event.target.checked)} />
                  </label>
                </div>
                <p className="manager-helper">
                  Secrets vises ikke i diagnostics. Full stream decoding, NVR-opptak og motion-rules er ikke aktivert ennå.
                </p>
              </div>
            ))}
          </div>
        </div>
      </article>
      ) : null}

      {activeSection === 'diagnostics' ? (
        <section className="manager-diagnostics-shell" aria-label="System og developer-diagnose">
          <article className="manager-card manager-card--wide manager-diagnostics-intro">
            <div className="manager-block__header">
              <div>
                <p className="room-card__label">System / Assistenter</p>
                <h2>Rolig status først, rådata når du trenger det</h2>
                <p className="manager-helper">
                  Diagnoseflaten er delt mellom operatørstatus og avanserte verktøy. Developer Mode åpner mer KNX, SSE, audit og storage-detaljer uten at normalstatus drukner.
                </p>
              </div>
              <span className="manager-readiness__indicator is-partial">
                {normalizeRuntimeModeLabel(runtimeConfig.systemMode)}
              </span>
            </div>
            <div className="manager-diagnostics-map" aria-label="Diagnosehierarki">
              <span>Status</span>
              <span>Integrasjoner</span>
              <span>NIVA</span>
              <span>Energi</span>
              <span>Verktøy</span>
              <span>Developer</span>
            </div>
          </article>
          {systemRecommendations.length > 0 ? (
            <article className="manager-card manager-card--recommendations" aria-label="Systemanbefalinger">
              <div className="manager-card__header">
                <div>
                  <p className="manager-eyebrow">Anbefalinger</p>
                  <h2>Systemforslag</h2>
                </div>
              </div>
              <div className="manager-recommendation-list">
                {systemRecommendations.map((recommendation) => (
                  <div key={recommendation.id} className="manager-recommendation">
                    <span>{recommendation.category}</span>
                    <strong>{recommendation.title}</strong>
                    <p>{recommendation.shortText}</p>
                  </div>
                ))}
              </div>
            </article>
          ) : null}
          <ManagerDiagnosticsSection
            diagnostics={diagnostics}
            onClearTestLog={onClearTestLog}
            onRuntimeActionDecision={onRuntimeActionDecision}
            onManualRuntimeConfigSync={onManualRuntimeConfigSync}
            onSceneSchedulerTest={onSceneSchedulerTest}
          />
        </section>
      ) : null}
    </section>
  )
}
