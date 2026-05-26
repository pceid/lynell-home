import type { Room } from '../../data/rooms'
import type { EdgeLifecycleDevice } from './deviceLifecycle'

export type SensorCapability =
  | 'temperature'
  | 'humidity'
  | 'co2'
  | 'motion'
  | 'lux'
  | 'airQuality'
  | 'doorWindow'
  | 'sound'
  | 'vibration'
  | 'occupancy'

export type SensorAwarenessDevice = EdgeLifecycleDevice & {
  capabilities: SensorCapability[]
  environmentalRole: string
}

export type RoomEnvironmentalProfile = {
  roomKey: string
  roomName: string
  roomLabel: string
  sensorCount: number
  capabilities: SensorCapability[]
  summary: string
  temperatureTone: string
  activityTone: string
  airTone: string
  lightTone: string
}

export type SensorIntelligenceSummary = {
  devices: SensorAwarenessDevice[]
  roomProfiles: RoomEnvironmentalProfile[]
  activeRoomNames: string[]
  staleSensorCount: number
  weakSignalCount: number
  lowBatteryCount: number
  nivaSummary: string
}

const unique = <T,>(items: T[]) => Array.from(new Set(items))

export function getSensorCapabilities(device: EdgeLifecycleDevice): SensorCapability[] {
  const name = device.name.toLowerCase()
  const type = device.type.toLowerCase()

  if (device.category === 'climate') {
    return ['temperature', 'humidity', 'co2']
  }

  if (name.includes('bevegelse') || type.includes('motion')) {
    return ['motion', 'occupancy', 'lux']
  }

  if (name.includes('temperatur') || type.includes('sensor')) {
    return ['temperature', 'humidity']
  }

  if (name.includes('dør') || name.includes('dor') || name.includes('window')) {
    return ['doorWindow', 'occupancy']
  }

  if (device.category === 'sensor') {
    return ['motion', 'occupancy']
  }

  return []
}

export function formatSensorCapability(capability: SensorCapability) {
  const labels: Record<SensorCapability, string> = {
    temperature: 'Temperatur',
    humidity: 'Fukt',
    co2: 'CO2',
    motion: 'Bevegelse',
    lux: 'Lysnivå',
    airQuality: 'Luft',
    doorWindow: 'Dør/vindu',
    sound: 'Lyd',
    vibration: 'Vibrasjon',
    occupancy: 'Tilstedeværelse',
  }

  return labels[capability]
}

function getEnvironmentalRole(capabilities: SensorCapability[]) {
  if (capabilities.includes('motion') || capabilities.includes('occupancy')) {
    return 'Aktivitet og tilstedeværelse'
  }

  if (capabilities.includes('co2') || capabilities.includes('airQuality')) {
    return 'Luft og komfort'
  }

  if (capabilities.includes('temperature') || capabilities.includes('humidity')) {
    return 'Inneklima'
  }

  if (capabilities.includes('lux')) {
    return 'Lysnivå'
  }

  return 'Miljøsignal'
}

function getRoomLightTone(room: Room) {
  const activeZones = room.zones.filter((zone) => zone.lightsOn)

  if (activeZones.length === 0) {
    return 'Lysnivået virker lavt nå.'
  }

  const averageBrightness = Math.round(
    activeZones.reduce((sum, zone) => sum + zone.brightness, 0) / activeZones.length,
  )

  return averageBrightness >= 65 ? 'Rommet er tydelig opplyst.' : 'Rommet har dempet lysnivå.'
}

function getRoomTemperatureTone(room: Room) {
  const delta = room.temperature - room.targetTemperature

  if (Math.abs(delta) <= 0.4) {
    return 'Rommet holder stabil temperatur.'
  }

  return delta > 0 ? 'Rommet virker litt varmt mot settpunktet.' : 'Rommet virker litt kjølig mot settpunktet.'
}

function getRoomActivityTone(room: Room, devices: SensorAwarenessDevice[]) {
  const hasMotionCapability = devices.some((device) =>
    device.capabilities.some((capability) => capability === 'motion' || capability === 'occupancy'),
  )

  if (room.zones.some((zone) => zone.lightsOn)) {
    return hasMotionCapability
      ? 'Det er aktivitetstegn her via lys og sensor-capability.'
      : 'Det er aktivitetstegn her via lys.'
  }

  return hasMotionCapability
    ? 'Rommet har sensor-capability for aktivitet, men ingen live motion ennå.'
    : 'Det er lite aktivitetstegn her akkurat nå.'
}

function getRoomAirTone(devices: SensorAwarenessDevice[]) {
  const hasAirCapability = devices.some((device) =>
    device.capabilities.some((capability) => capability === 'co2' || capability === 'airQuality' || capability === 'humidity'),
  )

  return hasAirCapability
    ? 'Luftkvalitet kan vurderes når live CO2/fukt kommer inn.'
    : 'Jeg har ikke luftsensor-capability for rommet ennå.'
}

export function buildSensorIntelligence(
  devices: EdgeLifecycleDevice[],
  rooms: Room[],
): SensorIntelligenceSummary {
  const sensorDevices = devices
    .map((device) => {
      const capabilities = getSensorCapabilities(device)

      return {
        ...device,
        capabilities,
        environmentalRole: getEnvironmentalRole(capabilities),
      }
    })
    .filter((device) => device.capabilities.length > 0)

  const roomProfiles = rooms.map((room) => {
    const devicesInRoom = sensorDevices.filter((device) => device.roomKey === room.key)
    const capabilities = unique(devicesInRoom.flatMap((device) => device.capabilities))
    const temperatureTone = getRoomTemperatureTone(room)
    const activityTone = getRoomActivityTone(room, devicesInRoom)
    const airTone = getRoomAirTone(devicesInRoom)
    const lightTone = getRoomLightTone(room)

    return {
      roomKey: room.key,
      roomName: room.name,
      roomLabel: devicesInRoom[0]?.roomLabel ?? room.name,
      sensorCount: devicesInRoom.length,
      capabilities,
      temperatureTone,
      activityTone,
      airTone,
      lightTone,
      summary: [temperatureTone, activityTone, capabilities.includes('co2') ? airTone : '', lightTone]
        .filter(Boolean)
        .join(' '),
    }
  })

  const staleSensorCount = sensorDevices.filter((device) => device.status === 'foundation').length
  const weakSignalCount = sensorDevices.filter(
    (device) => typeof device.signal === 'number' && device.signal < 50,
  ).length
  const lowBatteryCount = sensorDevices.filter(
    (device) => typeof device.battery === 'number' && device.battery < 25,
  ).length
  const activeRoomNames = roomProfiles
    .filter((profile) => profile.activityTone.includes('aktivitetstegn'))
    .map((profile) => profile.roomName)
    .slice(0, 3)

  return {
    devices: sensorDevices,
    roomProfiles,
    activeRoomNames,
    staleSensorCount,
    weakSignalCount,
    lowBatteryCount,
    nivaSummary:
      sensorDevices.length === 0
        ? 'Jeg har ikke sensor-capabilities i edge-laget ennå.'
        : `${sensorDevices.length} sensorer er modellert som miljø-inputs. ${staleSensorCount} bruker fortsatt foundation-state.`,
  }
}
