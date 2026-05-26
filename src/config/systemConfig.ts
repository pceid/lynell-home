import type { Room, RoomGroup, RoomMode, ZoneKey } from '../data/rooms'
import type { AppLanguage } from '../i18n'
import type { KnxRoomMapping } from '../knx/knxMapping'

export type KnxDataType = '1-bit' | '1-byte' | '2-byte float'
export type SetpointWriteStrategy = 'absoluteTemperature' | 'relativeOffset'
export type KnxInterpretationRule = 'standard' | 'boolFromValueAboveZero'
export type KnxAccessMode = 'read' | 'write' | 'readWrite'
export type ShadingType =
  | 'persienne'
  | 'screen'
  | 'markise'
  | 'gardin'
  | 'blind'
  | 'curtain'
  | 'awning'

export type HousingConfig = {
  name: string
  address: string
  latitude: number
  longitude: number
}

export type NetworkConfig = {
  connectionMode: 'localDirect' | 'remoteTunnel'
  localDirect: {
    host: string
    port: number
  }
  remoteTunnel: {
    host: string
    port: number
  }
  appLocalHost: string
  appLocalPort: number
  vpnEnabled: boolean
  vpnHost: string
  vpnPort: number
  preferredConnection: 'local' | 'vpn'
}

export type MqttConfig = {
  enabled: boolean
  baseTopic: string
  brokerHost: string
  brokerPort: number
  username: string
  password: string
  clientId: string
  secure: boolean
}

export type FloorConfig = {
  id: string
  label: string
  roomGroup: RoomGroup
}

export type RuntimeConfig = {
  systemMode: 'live' | 'demo' | 'developer' | 'simulate'
  climateFeedbackMethod: 'polling' | 'subscribe'
  climatePollingIntervalSec: number
  comfortSetpoint: number
  nightSetpoint: number
}

export type SecurityConfig = {
  pinEnabled: boolean
  pinCode: string
  lockOnNewSession: boolean
}

export type MediaConfig = {
  active: boolean
  source: 'Spotify' | 'Nettradio' | 'Annen'
  link: string
  area: string
  groups: MediaGroupConfig[]
}

export type MediaGroupState = 'online' | 'stale' | 'offline' | 'unknown'
export type MediaGroupConfidence = 'low' | 'medium' | 'high'
export type SpeakerCalibrationStatus = 'notCalibrated' | 'manual' | 'estimated' | 'verified'

export type MediaGroupSpeakerConfig = {
  id: string
  deviceId: string
  displayName: string
  roomKey: string
  offsetMs: number
  calibrationStatus: SpeakerCalibrationStatus
  lastLatencyEstimateMs?: number | null
}

export type MediaGroupConfig = {
  mediaGroupId: string
  displayName: string
  speakers: MediaGroupSpeakerConfig[]
  castTargets: string[]
  delayOffsetsMs: Record<string, number>
  enabled: boolean
  state: MediaGroupState
  groupConfidence: MediaGroupConfidence
}

export type CameraType = 'rtsp' | 'onvif' | 'tapoFoundation' | 'genericIpCamera'
export type CameraRuntimeState = 'online' | 'stale' | 'offline' | 'unknown'
export type RecorderTarget = 'localDisk' | 'externalDisk' | 'networkPath'
export type StorageHealth = 'healthy' | 'watch' | 'unknown' | 'unavailable'
export type CameraConfidence = 'low' | 'medium' | 'high'

export type CameraDeviceConfig = {
  cameraId: string
  displayName: string
  type: CameraType
  rtspUrl?: string
  onvif?: string
  snapshotUrl?: string
  roomId?: string
  enabled: boolean
  visible: boolean
  state: CameraRuntimeState
  sourceAgeMs?: number | null
  recordingEnabled: boolean
  recorderTarget: RecorderTarget
  retentionDays: number
  overwriteOldest: boolean
  motionAvailable: boolean
  audioAvailable: boolean
  confidence: CameraConfidence
}

export type RecorderStorageConfig = {
  target: RecorderTarget
  path: string
  maxStorageGb: number | null
  retentionDays: number
  overwriteOldest: boolean
  storageHealth: StorageHealth
  freeSpaceEstimateGb: number | null
}

export type CameraFoundationConfig = {
  providerEnabled: boolean
  recorder: RecorderStorageConfig
  cameras: CameraDeviceConfig[]
}

export type SystemAudioCategory =
  | 'feedback'
  | 'information'
  | 'alert'
  | 'critical'
  | 'ambient'
  | 'voice'
  | 'system'

export type SystemAudioConfig = {
  enabled: boolean
  masterVolume: number
  categories: Record<SystemAudioCategory, boolean>
  testSoundId: string
}

export type IdleScreenConfig = {
  enabled: boolean
  idleTimeoutSeconds: number
  useCustomImage: boolean
  customImageDataUrl: string
}

export type CalendarEventConfig = {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  person: string
  place: string
  note: string
}

export type BookingResourceType =
  | 'møterom'
  | 'hjemmekino'
  | 'hybel'
  | 'gjesterom'
  | 'badstue'
  | 'annet'

export type BookingResourceConfig = {
  id: string
  name: string
  type: BookingResourceType
  active: boolean
  roomKey: string
  sceneId: string
  climateRelevant: boolean
  allowOverlap: boolean
  bufferBeforeMin: number
  bufferAfterMin: number
  note: string
  sendToCalendarDefault: boolean
}

export type BookingStatus = 'draft' | 'confirmed' | 'sent'

export type BookingConfig = {
  id: string
  resourceId: string
  title: string
  date: string
  startTime: string
  endTime: string
  createdBy: string
  participants: string
  status: BookingStatus
  note: string
  sendToCalendar: boolean
}

export type CalendarConfig = {
  events: CalendarEventConfig[]
  resources: BookingResourceConfig[]
  bookings: BookingConfig[]
}

export type SceneLightingTargetConfig = {
  id: string
  roomKey: string
  zoneKey: string
  brightness: string
}

export type SceneClimateTargetConfig = {
  id: string
  roomKey: string
  mode: string
  temperature: string
}

export type SceneTriggerType = 'manual' | 'time' | 'presence' | 'other'

export type SceneConfig = {
  id: string
  name: string
  enabled: boolean
  roomKeys: string[]
  lighting: SceneLightingTargetConfig[]
  climate: SceneClimateTargetConfig[]
  triggerType: SceneTriggerType
  triggerNote: string
  triggerTime: string
}

export type HeatEmitterType =
  | ''
  | 'gulvvarme'
  | 'radiator'
  | 'viftekonvektor'
  | 'elektrisk varme'
  | 'annet'

export type FloorHeatingType =
  | ''
  | 'vannbåren'
  | 'elektrisk'
  | 'radiator'
  | 'annet'

export type SystemZoneConfig = {
  id: string
  key: ZoneKey
  name: string
  dimmable: boolean
  light: string
  lightDataType?: KnxDataType
  dim: string
  value: string
  valueDataType?: KnxDataType
  lightFeedback: string
  lightFeedbackDataType?: KnxDataType
  valueFeedback: string
  valueFeedbackDataType?: KnxDataType
  feedbackInterpretationRule?: KnxInterpretationRule
  deriveLightStateFromValueFeedback?: boolean
}

export type SystemClimateConfig = {
  active: boolean
  liveActive: boolean
  temperature: string
  temperatureDataType?: KnxDataType
  setpoint: string
  setpointDataType?: KnxDataType
  setpointWriteStrategy?: SetpointWriteStrategy
  mode: string
  modeDataType?: KnxDataType
  setpointFeedback: string
  setpointFeedbackDataType?: KnxDataType
  modeFeedback: string
  modeFeedbackDataType?: KnxDataType
  heatDemand: string
  heatDemandDataType?: KnxDataType
}

export type SystemSensorPointConfig = {
  address: string
  dataType?: KnxDataType
}

export type SystemSensorConfig = {
  presence: SystemSensorPointConfig
  motion: SystemSensorPointConfig
  co2: SystemSensorPointConfig
  humidity: SystemSensorPointConfig
  floorTemperature: SystemSensorPointConfig
  lux: SystemSensorPointConfig
}

export type SystemShadingConfig = {
  id: string
  roomKey: string
  label: string
  type: ShadingType
  active: boolean
  visible?: boolean
  maturity?: 'foundation' | 'live' | 'prepared' | 'future'
  zoneId?: string
  zoneName?: string
  up: string
  down: string
  stop: string
  position: string
  feedbackPosition?: string
  upDownDpt?: string
  stopDpt?: string
  positionDpt?: string
  feedbackPositionDpt?: string
  invertUpDown?: boolean
  invertPosition?: boolean
  windAlarm?: string
  sunAuto?: string
  positionDataType?: KnxDataType
  angle: string
  angleDataType?: KnxDataType
  source?: string
  confidence?: 'low' | 'medium' | 'high'
}

export type SystemWeatherStationConfig = {
  active: boolean
  wind: string
  windDataType?: KnxDataType
  windAlarm: string
  windAlarmDataType?: KnxDataType
  rain: string
  rainDataType?: KnxDataType
  frostAlarm: string
  frostAlarmDataType?: KnxDataType
  outdoorTemperature: string
  outdoorTemperatureDataType?: KnxDataType
  lux: string
  luxDataType?: KnxDataType
  lightEast: string
  lightEastDataType?: KnxDataType
  lightSouth: string
  lightSouthDataType?: KnxDataType
  lightWest: string
  lightWestDataType?: KnxDataType
  sunElevation: string
  sunElevationDataType?: KnxDataType
  azimuth: string
  azimuthDataType?: KnxDataType
}

export type SystemTechnicalPointConfig = {
  address: string
  dataType?: KnxDataType
}

export type SystemTechnicalConfig = {
  waterAlarm: SystemTechnicalPointConfig
  fireSignal: SystemTechnicalPointConfig
  fault: SystemTechnicalPointConfig
  generalAlarm: SystemTechnicalPointConfig
}

export type BacnetPointConfig = {
  id: string
  name: string
  dataType: KnxDataType
  access: KnxAccessMode
  externalRef: string
}

export type SystemIntegrationConfig = {
  bacnet: {
    active: boolean
    points: BacnetPointConfig[]
  }
}

export type SystemRoomConfig = {
  id: number
  key: string
  group: RoomGroup
  name: string
  configured: boolean
  initialTemperature: number
  initialTargetTemperature: number
  initialMode: RoomMode
  heatEmitterType?: HeatEmitterType
  heatPowerWatts?: number | null
  nominalPowerWatts?: number | null
  floorHeatingType?: FloorHeatingType
  floorAreaM2?: number | null
  ceilingHeightM?: number | null
  roomVolumeM3?: number | null
  manualVolumeM3?: number | null
  note?: string
  climate: SystemClimateConfig
  sensors?: SystemSensorConfig
  zones: SystemZoneConfig[]
}

export type SystemConfig = {
  language: AppLanguage
  housing: HousingConfig
  network: NetworkConfig
  mqtt: MqttConfig
  camera: CameraFoundationConfig
  runtime: RuntimeConfig
  security: SecurityConfig
  media: MediaConfig
  audio: SystemAudioConfig
  idleScreen: IdleScreenConfig
  calendar: CalendarConfig
  scenes: SceneConfig[]
  floors: FloorConfig[]
  rooms: SystemRoomConfig[]
  shading: SystemShadingConfig[]
  weatherStation: SystemWeatherStationConfig
  technical: SystemTechnicalConfig
  integrations: SystemIntegrationConfig
}

export const initialHousingConfig: HousingConfig = {
  name: 'Lynell Home',
  address: 'Lynell',
  latitude: 59.74321533046936,
  longitude: 10.765256540945318,
}

export const initialNetworkConfig: NetworkConfig = {
  connectionMode: 'localDirect',
  localDirect: {
    host: '192.168.86.33',
    port: 3671,
  },
  remoteTunnel: {
    host: '127.0.0.1',
    port: 35000,
  },
  appLocalHost: '192.168.86.50',
  appLocalPort: 3000,
  vpnEnabled: false,
  vpnHost: 'lynell-server',
  vpnPort: 3000,
  preferredConnection: 'local',
}

export const initialMqttConfig: MqttConfig = {
  enabled: false,
  baseTopic: 'lynell',
  brokerHost: '',
  brokerPort: 1883,
  username: '',
  password: '',
  clientId: '',
  secure: false,
}

export const initialFloorConfigs: FloorConfig[] = [
  {
    id: 'plan0',
    label: 'Plan 0',
    roomGroup: 'Kjeller',
  },
  {
    id: 'plan1',
    label: 'Plan 1',
    roomGroup: 'Plan 1',
  },
  {
    id: 'hybel',
    label: 'Hybel',
    roomGroup: 'Hybel',
  },
]

export const initialRuntimeConfig: RuntimeConfig = {
  systemMode: 'live',
  climateFeedbackMethod: 'subscribe',
  climatePollingIntervalSec: 20,
  comfortSetpoint: 22,
  nightSetpoint: 18,
}

export const initialSecurityConfig: SecurityConfig = {
  pinEnabled: true,
  pinCode: '1234',
  lockOnNewSession: true,
}

export const initialMediaConfig: MediaConfig = {
  active: false,
  source: 'Spotify',
  link: '',
  area: 'Stue',
  groups: [],
}

export const initialCameraConfig: CameraFoundationConfig = {
  providerEnabled: false,
  recorder: {
    target: 'localDisk',
    path: '',
    maxStorageGb: null,
    retentionDays: 7,
    overwriteOldest: true,
    storageHealth: 'unknown',
    freeSpaceEstimateGb: null,
  },
  cameras: [
    {
      cameraId: 'camera-tapo-c520ws-foundation',
      displayName: 'Tapo C520WS foundation',
      type: 'tapoFoundation',
      rtspUrl: '',
      onvif: '',
      snapshotUrl: '',
      roomId: '',
      enabled: false,
      visible: true,
      state: 'unknown',
      sourceAgeMs: null,
      recordingEnabled: false,
      recorderTarget: 'localDisk',
      retentionDays: 7,
      overwriteOldest: true,
      motionAvailable: false,
      audioAvailable: true,
      confidence: 'low',
    },
  ],
}

export const initialAudioConfig: SystemAudioConfig = {
  enabled: false,
  masterVolume: 0.35,
  testSoundId: 'feedback.tapSoft',
  categories: {
    feedback: true,
    information: true,
    alert: true,
    critical: false,
    ambient: false,
    voice: false,
    system: true,
  },
}

export const initialIdleScreenConfig: IdleScreenConfig = {
  enabled: false,
  idleTimeoutSeconds: 300,
  useCustomImage: false,
  customImageDataUrl: '',
}

export const initialWeatherStationConfig: SystemWeatherStationConfig = {
  active: false,
  wind: '',
  windDataType: '2-byte float',
  windAlarm: '',
  windAlarmDataType: '1-bit',
  rain: '',
  rainDataType: '1-bit',
  frostAlarm: '',
  frostAlarmDataType: '1-bit',
  outdoorTemperature: '',
  outdoorTemperatureDataType: '2-byte float',
  lux: '',
  luxDataType: '2-byte float',
  lightEast: '',
  lightEastDataType: '2-byte float',
  lightSouth: '',
  lightSouthDataType: '2-byte float',
  lightWest: '',
  lightWestDataType: '2-byte float',
  sunElevation: '',
  sunElevationDataType: '2-byte float',
  azimuth: '',
  azimuthDataType: '2-byte float',
}

export const initialTechnicalConfig: SystemTechnicalConfig = {
  waterAlarm: { address: '', dataType: '1-bit' },
  fireSignal: { address: '', dataType: '1-bit' },
  fault: { address: '', dataType: '1-bit' },
  generalAlarm: { address: '', dataType: '1-bit' },
}

export const initialIntegrationConfig: SystemIntegrationConfig = {
  bacnet: {
    active: false,
    points: [],
  },
}

export const initialCalendarConfig: CalendarConfig = {
  events: [],
  resources: [],
  bookings: [],
}
const defaultSceneTemplates: Array<Pick<SceneConfig, 'id' | 'name' | 'triggerType' | 'triggerNote'>> = [
  { id: 'scene-home', name: 'Hjemme', triggerType: 'manual', triggerNote: '' },
  { id: 'scene-evening', name: 'Kveld', triggerType: 'manual', triggerNote: '' },
  { id: 'scene-night', name: 'Natt', triggerType: 'manual', triggerNote: '' },
  { id: 'scene-away', name: 'Borte', triggerType: 'manual', triggerNote: '' },
  { id: 'scene-morning', name: 'Morgen', triggerType: 'manual', triggerNote: '' },
]

function createDefaultScenes(): SceneConfig[] {
  return defaultSceneTemplates.map((scene) => ({
    ...scene,
    enabled: true,
    roomKeys: [],
    lighting: [],
    climate: [],
    triggerTime: '',
  }))
}

export function ensureDefaultScenes(scenes: SceneConfig[] = []): SceneConfig[] {
  const existingByName = new Set(scenes.map((scene) => scene.name.trim().toLowerCase()))
  const missingDefaults = createDefaultScenes().filter(
    (scene) => !existingByName.has(scene.name.trim().toLowerCase()),
  )

  return [...scenes, ...missingDefaults]
}

export const initialScenesConfig: SceneConfig[] = createDefaultScenes()

export const upcomingFunctions = [
  'Lys og gruppeadresser',
  'Klima og settpunkter',
  'Scener og automatisering',
] as const

function getZoneDataTypeDefaults(zone: SystemZoneConfig) {
  return {
    lightDataType: zone.lightDataType ?? '1-bit',
    lightFeedbackDataType: zone.lightFeedbackDataType ?? '1-bit',
    valueDataType: zone.valueDataType ?? '1-byte',
    valueFeedbackDataType: zone.valueFeedbackDataType ?? '1-byte',
    feedbackInterpretationRule:
      zone.feedbackInterpretationRule ??
      (zone.deriveLightStateFromValueFeedback ? 'boolFromValueAboveZero' : 'standard'),
  } as const
}

function getClimateDataTypeDefaults(climate: SystemClimateConfig) {
  return {
    temperatureDataType: climate.temperatureDataType ?? '2-byte float',
    setpointDataType: climate.setpointDataType ?? '2-byte float',
    setpointWriteStrategy: climate.setpointWriteStrategy ?? 'absoluteTemperature',
    setpointFeedbackDataType: climate.setpointFeedbackDataType ?? '2-byte float',
    modeDataType: climate.modeDataType ?? '1-byte',
    modeFeedbackDataType: climate.modeFeedbackDataType ?? '1-byte',
    heatDemandDataType: climate.heatDemandDataType ?? '1-byte',
  } as const
}

function createEmptySensorPoint(
  dataType: KnxDataType = '1-bit',
): SystemSensorPointConfig {
  return {
    address: '',
    dataType,
  }
}

function createDefaultSensorConfig(): SystemSensorConfig {
  return {
    presence: createEmptySensorPoint('1-bit'),
    motion: createEmptySensorPoint('1-bit'),
    co2: createEmptySensorPoint('2-byte float'),
    humidity: createEmptySensorPoint('2-byte float'),
    floorTemperature: createEmptySensorPoint('2-byte float'),
    lux: createEmptySensorPoint('2-byte float'),
  }
}

function createDefaultShadingConfigs(): SystemShadingConfig[] {
  return [
    {
      id: 'shading-basement-entry',
      roomKey: 'basement-entry',
      label: 'Entré screen',
      type: 'screen',
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
      positionDataType: '1-byte',
      angle: '',
      angleDataType: '1-byte',
      source: 'manager-config',
      confidence: 'low',
    },
  ]
}

const initialSystemRooms: SystemRoomConfig[] = [
  {
    id: 1,
    key: 'hybel-entry',
    group: 'Hybel',
    name: 'Entré',
    configured: true,
    initialTemperature: 21.1,
    initialTargetTemperature: 22,
    initialMode: 'Komfort',
    climate: {
      active: true,
      liveActive: true,
      temperature: '1/0/0',
      setpoint: '1/0/3',
      mode: '1/0/8',
      setpointFeedback: '1/0/2',
      modeFeedback: '1/0/9',
      heatDemand: '',
    },
    zones: [
      { id: 'hybel-entry-zone-1', key: 'zone1', name: 'Sone 1', dimmable: true, light: '0/0/8', lightDataType: '1-bit', dim: '0/0/10', value: '0/0/11', valueDataType: '1-byte', lightFeedback: '0/0/9', lightFeedbackDataType: '1-bit', valueFeedback: '0/0/12', valueFeedbackDataType: '1-byte', feedbackInterpretationRule: 'standard' },
      { id: 'hybel-entry-zone-2', key: 'zone2', name: 'Sone 2', dimmable: true, light: '0/0/13', lightDataType: '1-bit', dim: '0/0/15', value: '0/0/16', valueDataType: '1-byte', lightFeedback: '0/0/14', lightFeedbackDataType: '1-bit', valueFeedback: '0/0/17', valueFeedbackDataType: '1-byte', feedbackInterpretationRule: 'standard' },
      { id: 'hybel-entry-zone-3', key: 'zone3', name: 'Sone 3', dimmable: true, light: '0/0/18', lightDataType: '1-bit', dim: '0/0/20', value: '0/0/21', valueDataType: '1-byte', lightFeedback: '0/0/19', lightFeedbackDataType: '1-bit', valueFeedback: '0/0/22', valueFeedbackDataType: '1-byte', feedbackInterpretationRule: 'standard' },
    ],
  },
  {
    id: 2,
    key: 'hybel-kitchen-living',
    group: 'Hybel',
    name: 'Kjøkken/Stue',
    configured: true,
    initialTemperature: 22.4,
    initialTargetTemperature: 22,
    initialMode: 'Komfort',
    climate: {
      active: true,
      liveActive: true,
      temperature: '1/0/11',
      setpoint: '1/0/14',
      mode: '1/0/19',
      setpointFeedback: '1/0/13',
      modeFeedback: '1/0/20',
      heatDemand: '',
    },
    zones: [
      { id: 'hybel-kitchen-zone', key: 'kitchen', name: 'Kjøkken', dimmable: true, light: '0/0/31', dim: '0/0/33', value: '0/0/34', lightFeedback: '0/0/32', valueFeedback: '0/0/35' },
      { id: 'hybel-living-zone', key: 'living', name: 'Stue', dimmable: true, light: '0/0/36', dim: '0/0/38', value: '0/0/39', lightFeedback: '0/0/37', valueFeedback: '0/0/40' },
    ],
  },
  {
    id: 3,
    key: 'hybel-bathroom',
    group: 'Hybel',
    name: 'Bad',
    configured: true,
    initialTemperature: 23,
    initialTargetTemperature: 22,
    initialMode: 'Komfort',
    climate: {
      active: true,
      liveActive: true,
      temperature: '1/0/23',
      setpoint: '1/0/26',
      mode: '1/0/31',
      setpointFeedback: '1/0/25',
      modeFeedback: '1/0/32',
      heatDemand: '',
    },
    zones: [
      { id: 'hybel-bath-zone-1', key: 'zone1', name: 'Sone 1', dimmable: true, light: '0/0/49', dim: '0/0/51', value: '0/0/52', lightFeedback: '0/0/50', valueFeedback: '0/0/53' },
      { id: 'hybel-bath-zone-2', key: 'zone2', name: 'Sone 2', dimmable: true, light: '0/0/54', dim: '0/0/56', value: '0/0/57', lightFeedback: '0/0/55', valueFeedback: '0/0/58' },
    ],
  },
  {
    id: 4, key: 'hybel-bedroom', group: 'Hybel', name: 'Soverom', configured: true,
    initialTemperature: 18.8, initialTargetTemperature: 18, initialMode: 'Natt',
    climate: { active: false, liveActive: false, temperature: '', setpoint: '', mode: '', setpointFeedback: '', modeFeedback: '', heatDemand: '' },
    zones: [
      { id: 'hybel-bedroom-light', key: 'light', name: 'Lys', dimmable: true, light: '0/0/64', dim: '0/0/66', value: '0/0/67', lightFeedback: '0/0/65', valueFeedback: '0/0/68' },
    ],
  },
  {
    id: 5, key: 'basement-entry', group: 'Kjeller', name: 'Entré', configured: true,
    initialTemperature: 20.3, initialTargetTemperature: 22, initialMode: 'Komfort',
    climate: { active: true, liveActive: true, temperature: '1/1/0', setpoint: '1/1/3', mode: '1/1/8', setpointFeedback: '1/1/2', modeFeedback: '1/1/9', heatDemand: '' },
    zones: [
      { id: 'basement-entry-zone-1', key: 'zone1', name: 'Sone 1', dimmable: true, light: '0/1/3', lightDataType: '1-bit', dim: '0/1/5', value: '0/1/6', valueDataType: '1-byte', lightFeedback: '0/1/4', lightFeedbackDataType: '1-bit', valueFeedback: '0/1/7', valueFeedbackDataType: '1-byte', feedbackInterpretationRule: 'standard' },
      { id: 'basement-entry-zone-2', key: 'zone2', name: 'Sone 2', dimmable: true, light: '0/1/8', lightDataType: '1-bit', dim: '0/1/10', value: '0/1/11', valueDataType: '1-byte', lightFeedback: '', lightFeedbackDataType: '1-bit', valueFeedback: '0/1/9', valueFeedbackDataType: '1-byte', feedbackInterpretationRule: 'boolFromValueAboveZero', deriveLightStateFromValueFeedback: true },
      { id: 'basement-entry-zone-3', key: 'zone3', name: 'Sone 3', dimmable: true, light: '0/1/13', lightDataType: '1-bit', dim: '0/1/15', value: '0/1/16', valueDataType: '1-byte', lightFeedback: '0/1/14', lightFeedbackDataType: '1-bit', valueFeedback: '0/1/17', valueFeedbackDataType: '1-byte', feedbackInterpretationRule: 'standard' },
    ],
  },
  {
    id: 6, key: 'basement-tv-room', group: 'Kjeller', name: 'TV-stue', configured: true,
    initialTemperature: 21.6, initialTargetTemperature: 22, initialMode: 'Komfort',
    climate: { active: true, liveActive: true, temperature: '1/1/11', setpoint: '1/1/14', mode: '1/1/19', setpointFeedback: '1/1/13', modeFeedback: '1/1/20', heatDemand: '' },
    zones: [
      { id: 'basement-tv-zone-1', key: 'zone1', name: 'Sone 1', dimmable: true, light: '0/1/26', dim: '0/1/28', value: '0/1/29', lightFeedback: '0/1/27', valueFeedback: '0/1/30' },
      { id: 'basement-tv-zone-2', key: 'zone2', name: 'Sone 2', dimmable: true, light: '0/1/31', dim: '0/1/33', value: '0/1/34', lightFeedback: '0/1/32', valueFeedback: '0/1/35' },
    ],
  },
  {
    id: 7, key: 'basement-hobby', group: 'Kjeller', name: 'Hobby', configured: true,
    initialTemperature: 19.7, initialTargetTemperature: 22, initialMode: 'Komfort',
    climate: { active: true, liveActive: true, temperature: '1/1/22', setpoint: '1/1/25', mode: '1/1/30', setpointFeedback: '1/1/24', modeFeedback: '1/1/31', heatDemand: '' },
    zones: [
      { id: 'basement-hobby-zone-1', key: 'zone1', name: 'Sone 1', dimmable: true, light: '0/1/44', dim: '0/1/46', value: '0/1/47', lightFeedback: '0/1/45', valueFeedback: '0/1/48' },
      { id: 'basement-hobby-zone-2', key: 'zone2', name: 'Sone 2', dimmable: true, light: '0/1/49', dim: '0/1/51', value: '0/1/52', lightFeedback: '0/1/50', valueFeedback: '0/1/53' },
    ],
  },
  {
    id: 8, key: 'basement-storage', group: 'Kjeller', name: 'Bod', configured: true,
    initialTemperature: 17.9, initialTargetTemperature: 18, initialMode: 'Natt',
    climate: { active: false, liveActive: false, temperature: '', setpoint: '', mode: '', setpointFeedback: '', modeFeedback: '', heatDemand: '' },
    zones: [
      { id: 'basement-storage-light', key: 'light', name: 'Lys', dimmable: false, light: '0/1/59', dim: '0/1/61', value: '0/1/62', lightFeedback: '0/1/60', valueFeedback: '0/1/63' },
    ],
  },
  {
    id: 9, key: 'plan1-bathroom', group: 'Plan 1', name: 'Bad', configured: true,
    initialTemperature: 22.2, initialTargetTemperature: 22, initialMode: 'Komfort',
    climate: { active: true, liveActive: true, temperature: '1/2/0', setpoint: '1/2/3', mode: '1/2/8', setpointFeedback: '1/2/2', modeFeedback: '1/2/9', heatDemand: '' },
    zones: [
      { id: 'plan1-bath-zone-1', key: 'zone1', name: 'Sone 1', dimmable: true, light: '0/2/3', dim: '0/2/5', value: '0/2/6', lightFeedback: '0/2/4', valueFeedback: '0/2/7' },
      { id: 'plan1-bath-zone-2', key: 'zone2', name: 'Sone 2', dimmable: true, light: '0/2/8', dim: '0/2/10', value: '0/2/11', lightFeedback: '0/2/9', valueFeedback: '0/2/12' },
      { id: 'plan1-bath-zone-3', key: 'zone3', name: 'Sone 3', dimmable: true, light: '0/2/13', dim: '0/2/15', value: '0/2/16', lightFeedback: '0/2/14', valueFeedback: '0/2/17' },
    ],
  },
  {
    id: 10, key: 'plan1-kids-bathroom', group: 'Plan 1', name: 'Barnas bad', configured: false,
    initialTemperature: 21.4, initialTargetTemperature: 22, initialMode: 'Komfort',
    climate: { active: false, liveActive: false, temperature: '', setpoint: '', mode: '', setpointFeedback: '', modeFeedback: '', heatDemand: '' },
    zones: [],
  },
  { id: 11, key: 'plan1-master-bedroom', group: 'Plan 1', name: 'Hovedsoverom', configured: false, initialTemperature: 20.4, initialTargetTemperature: 18, initialMode: 'Natt', climate: { active: false, liveActive: false, temperature: '', setpoint: '', mode: '', setpointFeedback: '', modeFeedback: '', heatDemand: '' }, zones: [] },
  { id: 12, key: 'plan1-living-room', group: 'Plan 1', name: 'Stue', configured: false, initialTemperature: 21.9, initialTargetTemperature: 22, initialMode: 'Komfort', climate: { active: false, liveActive: false, temperature: '', setpoint: '', mode: '', setpointFeedback: '', modeFeedback: '', heatDemand: '' }, zones: [] },
  { id: 13, key: 'plan1-kitchen-dining', group: 'Plan 1', name: 'Kjøkken/Spisestue', configured: false, initialTemperature: 21.7, initialTargetTemperature: 22, initialMode: 'Komfort', climate: { active: false, liveActive: false, temperature: '', setpoint: '', mode: '', setpointFeedback: '', modeFeedback: '', heatDemand: '' }, zones: [] },
  { id: 14, key: 'plan1-hallway', group: 'Plan 1', name: 'Gang', configured: false, initialTemperature: 20.8, initialTargetTemperature: 22, initialMode: 'Komfort', climate: { active: false, liveActive: false, temperature: '', setpoint: '', mode: '', setpointFeedback: '', modeFeedback: '', heatDemand: '' }, zones: [] },
  { id: 15, key: 'plan1-bedroom-1', group: 'Plan 1', name: 'Soverom 1', configured: false, initialTemperature: 19.5, initialTargetTemperature: 18, initialMode: 'Natt', climate: { active: false, liveActive: false, temperature: '', setpoint: '', mode: '', setpointFeedback: '', modeFeedback: '', heatDemand: '' }, zones: [] },
  { id: 16, key: 'plan1-bedroom-2', group: 'Plan 1', name: 'Soverom 2', configured: false, initialTemperature: 19.2, initialTargetTemperature: 18, initialMode: 'Natt', climate: { active: false, liveActive: false, temperature: '', setpoint: '', mode: '', setpointFeedback: '', modeFeedback: '', heatDemand: '' }, zones: [] },
  { id: 17, key: 'plan1-bedroom-3', group: 'Plan 1', name: 'Soverom 3', configured: false, initialTemperature: 19.1, initialTargetTemperature: 18, initialMode: 'Natt', climate: { active: false, liveActive: false, temperature: '', setpoint: '', mode: '', setpointFeedback: '', modeFeedback: '', heatDemand: '' }, zones: [] },
]

export function createInitialSystemConfig(): SystemConfig {
  return {
    language: 'no',
    housing: initialHousingConfig,
    network: initialNetworkConfig,
    mqtt: initialMqttConfig,
    camera: initialCameraConfig,
    runtime: initialRuntimeConfig,
    security: initialSecurityConfig,
    media: initialMediaConfig,
    audio: initialAudioConfig,
    idleScreen: initialIdleScreenConfig,
    calendar: initialCalendarConfig,
    scenes: ensureDefaultScenes(initialScenesConfig),
    floors: initialFloorConfigs,
    rooms: initialSystemRooms.map((room) => ({
      ...room,
      heatEmitterType: room.heatEmitterType ?? '',
      heatPowerWatts: room.heatPowerWatts ?? null,
      nominalPowerWatts: room.nominalPowerWatts ?? null,
      floorHeatingType: room.floorHeatingType ?? '',
      floorAreaM2: room.floorAreaM2 ?? null,
      ceilingHeightM: room.ceilingHeightM ?? null,
      roomVolumeM3: room.roomVolumeM3 ?? null,
      manualVolumeM3: room.manualVolumeM3 ?? null,
      note: room.note ?? '',
      climate: { ...room.climate, ...getClimateDataTypeDefaults(room.climate) },
      sensors: room.sensors
        ? {
            ...createDefaultSensorConfig(),
            ...room.sensors,
          }
        : createDefaultSensorConfig(),
      zones: room.zones.map((zone) => ({ ...zone, ...getZoneDataTypeDefaults(zone) })),
    })),
    shading: createDefaultShadingConfigs(),
    weatherStation: initialWeatherStationConfig,
    technical: initialTechnicalConfig,
    integrations: initialIntegrationConfig,
  }
}

export function buildRoomsFromSystemConfig(config: SystemConfig): Room[] {
  return config.rooms.map((room) => ({
    id: room.id,
    key: room.key,
    group: room.group,
    name: room.name,
    configured: room.configured,
    temperature: room.initialTemperature,
    targetTemperature: room.initialTargetTemperature,
    mode: room.initialMode,
    heatDemand: null,
    zones: room.zones.map((zone) => ({
      id: zone.id,
      key: zone.key,
      name: zone.name,
      lightsOn: false,
      brightness: 0,
      dimmable: zone.dimmable,
    })),
  }))
}

export type RoomSelectOption = {
  key: string
  label: string
  locationLabel: string
  roomName: string
}

export function buildRoomSelectOptions(
  rooms: SystemRoomConfig[],
  floors: FloorConfig[],
): RoomSelectOption[] {
  const locationByGroup = new Map(floors.map((floor) => [floor.roomGroup, floor.label]))
  const knownGroups = new Set(floors.map((floor) => floor.roomGroup))
  const orderedGroups = [
    ...floors.map((floor) => floor.roomGroup),
    ...rooms
      .map((room) => room.group)
      .filter((group, index, groups) => !knownGroups.has(group) && groups.indexOf(group) === index),
  ]

  return orderedGroups.flatMap((group) => {
    const locationLabel = locationByGroup.get(group) ?? group

    return rooms
      .filter((room) => room.group === group)
      .map((room) => ({
        key: room.key,
        label: `${locationLabel} / ${room.name}`,
        locationLabel,
        roomName: room.name,
      }))
  })
}

export function buildKnxMappingFromSystemConfig(
  config: SystemConfig,
): Record<string, KnxRoomMapping> {
  return Object.fromEntries(
    config.rooms.map((room) => [
      room.key,
      {
        climateActive: room.climate.active,
        liveClimateActive: room.climate.liveActive,
        temperature: room.climate.temperature,
        temperatureDataType: room.climate.temperatureDataType ?? '2-byte float',
        setpoint: room.climate.setpoint,
        setpointDataType: room.climate.setpointDataType ?? '2-byte float',
        setpointWriteStrategy: room.climate.setpointWriteStrategy ?? 'absoluteTemperature',
        mode: room.climate.mode,
        modeDataType: room.climate.modeDataType ?? '1-byte',
        setpointFeedback: room.climate.setpointFeedback,
        setpointFeedbackDataType: room.climate.setpointFeedbackDataType ?? '2-byte float',
        modeFeedback: room.climate.modeFeedback,
        modeFeedbackDataType: room.climate.modeFeedbackDataType ?? '1-byte',
        heatDemand: room.climate.heatDemand,
        heatDemandDataType: room.climate.heatDemandDataType ?? '1-byte',
        zones: Object.fromEntries(
          room.zones.map((zone) => [
            zone.key,
            {
              light: zone.light,
              lightDataType: zone.lightDataType ?? '1-bit',
              dim: zone.dim,
              value: zone.value,
              valueDataType: zone.valueDataType ?? '1-byte',
              lightFeedback: zone.lightFeedback,
              lightFeedbackDataType: zone.lightFeedbackDataType ?? '1-bit',
              valueFeedback: zone.valueFeedback,
              valueFeedbackDataType: zone.valueFeedbackDataType ?? '1-byte',
              feedbackInterpretationRule:
                zone.feedbackInterpretationRule ??
                (zone.deriveLightStateFromValueFeedback ? 'boolFromValueAboveZero' : 'standard'),
              deriveLightStateFromValueFeedback:
                zone.deriveLightStateFromValueFeedback ?? false,
              dimmable: zone.dimmable,
            },
          ]),
        ),
      } satisfies KnxRoomMapping,
    ]),
  )
}

export function getFloorDefinitions(rooms: Room[], floors: FloorConfig[]) {
  const knownGroups = new Set(floors.map((floor) => floor.roomGroup))
  const dynamicFloors = rooms
    .filter((room) => !knownGroups.has(room.group))
    .map((room) => ({
      id: room.group,
      label: room.group,
      roomGroup: room.group,
    }))
    .filter(
      (floor, index, allFloors) =>
        allFloors.findIndex((candidate) => candidate.roomGroup === floor.roomGroup) === index,
    )

  return [...floors, ...dynamicFloors].map((floor) => {
    const floorRooms = rooms.filter((room) => room.group === floor.roomGroup)

    return {
      id: floor.id,
      label: floor.label,
      group: floor.roomGroup,
      roomCount: floorRooms.length,
      configuredCount: floorRooms.filter((room) => room.configured).length,
      rooms: floorRooms,
    }
  })
}
