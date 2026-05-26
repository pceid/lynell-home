import type { RoomKey, ZoneKey } from '../data/rooms'

export type KnxZoneMapping = {
  light: string
  lightDataType?: '1-bit' | '1-byte' | '2-byte float'
  dim: string
  value: string
  valueDataType?: '1-bit' | '1-byte' | '2-byte float'
  lightFeedback?: string
  lightFeedbackDataType?: '1-bit' | '1-byte' | '2-byte float'
  valueFeedback?: string
  valueFeedbackDataType?: '1-bit' | '1-byte' | '2-byte float'
  feedbackInterpretationRule?: 'standard' | 'boolFromValueAboveZero'
  deriveLightStateFromValueFeedback?: boolean
  dimmable: boolean
}

export type KnxRoomMapping = {
  climateActive?: boolean
  liveClimateActive?: boolean
  temperature?: string
  temperatureDataType?: '1-bit' | '1-byte' | '2-byte float'
  setpoint: string
  setpointDataType?: '1-bit' | '1-byte' | '2-byte float'
  setpointWriteStrategy?: 'absoluteTemperature' | 'relativeOffset'
  mode?: string
  modeDataType?: '1-bit' | '1-byte' | '2-byte float'
  setpointFeedback?: string
  setpointFeedbackDataType?: '1-bit' | '1-byte' | '2-byte float'
  modeFeedback?: string
  modeFeedbackDataType?: '1-bit' | '1-byte' | '2-byte float'
  heatDemand?: string
  heatDemandDataType?: '1-bit' | '1-byte' | '2-byte float'
  zones: Record<ZoneKey, KnxZoneMapping>
}

function hasConfiguredAddress(value: string | undefined) {
  return Boolean(value?.trim()) && !value?.trim().startsWith('placeholder/')
}

function createRoomMapping(
  roomMapping: Omit<KnxRoomMapping, 'climateActive' | 'liveClimateActive'> & {
    climateActive?: boolean
    liveClimateActive?: boolean
  },
): KnxRoomMapping {
  const climateActive =
    roomMapping.climateActive ??
    (
      hasConfiguredAddress(roomMapping.temperature) ||
      hasConfiguredAddress(roomMapping.setpoint) ||
      hasConfiguredAddress(roomMapping.mode)
    )

  return {
    climateActive,
    liveClimateActive: climateActive ? roomMapping.liveClimateActive ?? false : false,
    temperature: climateActive ? roomMapping.temperature ?? '' : '',
    temperatureDataType: climateActive ? roomMapping.temperatureDataType ?? '2-byte float' : '2-byte float',
    setpoint: climateActive ? roomMapping.setpoint ?? '' : '',
    setpointDataType: climateActive ? roomMapping.setpointDataType ?? '2-byte float' : '2-byte float',
    setpointWriteStrategy: roomMapping.setpointWriteStrategy ?? 'absoluteTemperature',
    mode: climateActive ? roomMapping.mode ?? '' : '',
    modeDataType: climateActive ? roomMapping.modeDataType ?? '1-byte' : '1-byte',
    setpointFeedback: climateActive ? roomMapping.setpointFeedback ?? '' : '',
    setpointFeedbackDataType: climateActive ? roomMapping.setpointFeedbackDataType ?? '2-byte float' : '2-byte float',
    modeFeedback: climateActive ? roomMapping.modeFeedback ?? '' : '',
    modeFeedbackDataType: climateActive ? roomMapping.modeFeedbackDataType ?? '1-byte' : '1-byte',
    heatDemand: climateActive ? roomMapping.heatDemand ?? '' : '',
    heatDemandDataType: climateActive ? roomMapping.heatDemandDataType ?? '1-byte' : '1-byte',
    zones: roomMapping.zones,
  }
}

export const knxMapping: Record<RoomKey, KnxRoomMapping> = {
  'hybel-entry': createRoomMapping({
    climateActive: true,
    liveClimateActive: true,
    temperature: '1/0/0',
    setpoint: '1/0/3',
    setpointFeedback: '1/0/2',
    mode: '1/0/8',
    modeFeedback: '1/0/9',
    zones: {
      all: { light: '0/0/5', dim: '0/0/6', value: '0/0/7', dimmable: true },
      zone1: { light: '0/0/8', lightFeedback: '0/0/9', dim: '0/0/10', value: '0/0/11', valueFeedback: '0/0/12', dimmable: true },
      zone2: { light: '0/0/13', lightFeedback: '0/0/14', dim: '0/0/15', value: '0/0/16', valueFeedback: '0/0/17', dimmable: true },
      zone3: { light: '0/0/18', lightFeedback: '0/0/19', dim: '0/0/20', value: '0/0/21', valueFeedback: '0/0/22', dimmable: true },
    },
  }),
  'hybel-kitchen-living': createRoomMapping({
    climateActive: true,
    liveClimateActive: true,
    temperature: '1/0/11',
    setpoint: '1/0/14',
    setpointFeedback: '1/0/13',
    mode: '1/0/19',
    modeFeedback: '1/0/20',
    zones: {
      all: { light: '0/0/28', dim: '0/0/29', value: '0/0/30', dimmable: true },
      kitchen: { light: '0/0/31', lightFeedback: '0/0/32', dim: '0/0/33', value: '0/0/34', valueFeedback: '0/0/35', dimmable: true },
      living: { light: '0/0/36', lightFeedback: '0/0/37', dim: '0/0/38', value: '0/0/39', valueFeedback: '0/0/40', dimmable: true },
    },
  }),
  'hybel-bathroom': createRoomMapping({
    climateActive: true,
    liveClimateActive: true,
    temperature: '1/0/23',
    setpoint: '1/0/26',
    setpointFeedback: '1/0/25',
    mode: '1/0/31',
    modeFeedback: '1/0/32',
    zones: {
      all: { light: '0/0/46', dim: '0/0/47', value: '0/0/48', dimmable: true },
      zone1: { light: '0/0/49', lightFeedback: '0/0/50', dim: '0/0/51', value: '0/0/52', valueFeedback: '0/0/53', dimmable: true },
      zone2: { light: '0/0/54', lightFeedback: '0/0/55', dim: '0/0/56', value: '0/0/57', valueFeedback: '0/0/58', dimmable: true },
      zone3: { light: 'placeholder/hybel/bath/zone3/light', dim: 'placeholder/hybel/bath/zone3/dim', value: 'placeholder/hybel/bath/zone3/value', dimmable: true },
      ceiling: { light: '0/0/49', lightFeedback: '0/0/50', dim: '0/0/51', value: '0/0/52', valueFeedback: '0/0/53', dimmable: true },
      mirror: { light: '0/0/54', lightFeedback: '0/0/55', dim: '0/0/56', value: '0/0/57', valueFeedback: '0/0/58', dimmable: true },
    },
  }),
  'hybel-bedroom': createRoomMapping({
    climateActive: false,
    setpoint: '',
    zones: {
      light: { light: '0/0/64', lightFeedback: '0/0/65', dim: '0/0/66', value: '0/0/67', valueFeedback: '0/0/68', dimmable: true },
    },
  }),
  'basement-entry': createRoomMapping({
    climateActive: true,
    liveClimateActive: true,
    temperature: '1/1/0',
    setpoint: '1/1/3',
    setpointFeedback: '1/1/2',
    mode: '1/1/8',
    modeFeedback: '1/1/9',
    zones: {
      all: { light: '0/1/0', dim: '0/1/1', value: '0/1/2', dimmable: true },
      zone1: { light: '0/1/3', lightFeedback: '0/1/4', dim: '0/1/5', value: '0/1/6', valueFeedback: '0/1/7', dimmable: true },
      zone2: { light: '0/1/8', lightDataType: '1-bit', lightFeedback: '', lightFeedbackDataType: '1-bit', dim: '0/1/10', value: '0/1/11', valueDataType: '1-byte', valueFeedback: '0/1/9', valueFeedbackDataType: '1-byte', feedbackInterpretationRule: 'boolFromValueAboveZero', dimmable: true },
      zone3: { light: '0/1/13', lightFeedback: '0/1/14', dim: '0/1/15', value: '0/1/16', valueFeedback: '0/1/17', dimmable: true },
    },
  }),
  'basement-tv-room': createRoomMapping({
    climateActive: true,
    liveClimateActive: true,
    temperature: '1/1/11',
    setpoint: '1/1/14',
    setpointFeedback: '1/1/13',
    mode: '1/1/19',
    modeFeedback: '1/1/20',
    zones: {
      all: { light: '0/1/23', dim: '0/1/24', value: '0/1/25', dimmable: true },
      zone1: { light: '0/1/26', lightFeedback: '0/1/27', dim: '0/1/28', value: '0/1/29', valueFeedback: '0/1/30', dimmable: true },
      zone2: { light: '0/1/31', lightFeedback: '0/1/32', dim: '0/1/33', value: '0/1/34', valueFeedback: '0/1/35', dimmable: true },
    },
  }),
  'basement-hobby': createRoomMapping({
    climateActive: true,
    liveClimateActive: true,
    temperature: '1/1/22',
    setpoint: '1/1/25',
    setpointFeedback: '1/1/24',
    mode: '1/1/30',
    modeFeedback: '1/1/31',
    zones: {
      all: { light: '0/1/41', dim: '0/1/42', value: '0/1/43', dimmable: true },
      zone1: { light: '0/1/44', lightFeedback: '0/1/45', dim: '0/1/46', value: '0/1/47', valueFeedback: '0/1/48', dimmable: true },
      zone2: { light: '0/1/49', lightFeedback: '0/1/50', dim: '0/1/51', value: '0/1/52', valueFeedback: '0/1/53', dimmable: true },
    },
  }),
  'basement-storage': createRoomMapping({
    climateActive: false,
    setpoint: '',
    zones: {
      light: { light: '0/1/59', lightFeedback: '0/1/60', dim: '0/1/61', value: '0/1/62', valueFeedback: '0/1/63', dimmable: false },
    },
  }),
  'plan1-bathroom': createRoomMapping({
    climateActive: true,
    liveClimateActive: true,
    temperature: '1/2/0',
    setpoint: '1/2/3',
    setpointFeedback: '1/2/2',
    mode: '1/2/8',
    modeFeedback: '1/2/9',
    zones: {
      all: { light: '0/2/0', dim: '0/2/1', value: '0/2/2', dimmable: true },
      zone1: { light: '0/2/3', lightFeedback: '0/2/4', dim: '0/2/5', value: '0/2/6', valueFeedback: '0/2/7', dimmable: true },
      zone2: { light: '0/2/8', lightFeedback: '0/2/9', dim: '0/2/10', value: '0/2/11', valueFeedback: '0/2/12', dimmable: true },
      zone3: { light: '0/2/13', lightFeedback: '0/2/14', dim: '0/2/15', value: '0/2/16', valueFeedback: '0/2/17', dimmable: true },
    },
  }),
}
