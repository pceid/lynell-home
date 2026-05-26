import type { Room } from '../data/rooms'
export type { RuntimeHistorySourceCategory } from './sourceTrust'
export {
  classifyRuntimeHistorySource,
  getRuntimeHistorySourceDistribution,
  isLiveRuntimeHistoryPoint,
  liveRuntimeHistorySourceAllowlist,
} from './sourceTrust'

export type RuntimeHistoryField = 'temperature' | 'setpoint' | 'heatDemand' | 'brightness' | string

export type RuntimeHistoryPoint = {
  timestamp: number
  at?: string
  roomKey: string
  zoneKey?: string
  field: RuntimeHistoryField
  value: number
  source: string
  category?: string
  confidence?: string
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

export type RuntimeHistoryTrend = 'stabil' | 'stigende' | 'fallende'

export const runtimeHistoryRetentionPlan = {
  detailedWindowHours: 24,
  dailyCompression: 'Compress previous day to daily averages at 00:00',
  weeklySource: 'Use compressed daily values for week graphs',
  loggedFields: ['temperature', 'setpoint', 'heatDemand', 'brightness'] satisfies RuntimeHistoryField[],
}

export function appendRuntimeHistoryPoints(
  currentHistory: RuntimeHistoryPoint[],
  points: RuntimeHistoryPoint[],
  maxPointsPerSeries = 100,
) {
  if (points.length === 0) {
    return currentHistory
  }

  const nextHistory = [...currentHistory, ...points]
  const grouped = new Map<string, RuntimeHistoryPoint[]>()

  for (const point of nextHistory) {
    const key = `${point.roomKey}:${point.zoneKey ?? 'room'}:${point.field}`
    grouped.set(key, [...(grouped.get(key) ?? []), point])
  }

  return Array.from(grouped.values())
    .flatMap((items) => items.slice(-maxPointsPerSeries))
    .sort((a, b) => a.timestamp - b.timestamp)
}

export function getRuntimeHistoryPoints(
  history: RuntimeHistoryPoint[],
  roomKey: string,
  field: RuntimeHistoryField,
  zoneKey?: string,
) {
  return history.filter(
    (point) =>
      point.roomKey === roomKey &&
      point.field === field &&
      (zoneKey ? point.zoneKey === zoneKey : !point.zoneKey),
  )
}

export function getRuntimeHistoryTrend(points: RuntimeHistoryPoint[]): RuntimeHistoryTrend | null {
  if (points.length < 2) {
    return null
  }

  const firstValue = points[0].value
  const lastValue = points[points.length - 1].value
  const delta = lastValue - firstValue

  if (Math.abs(delta) < 0.3) {
    return 'stabil'
  }

  return delta > 0 ? 'stigende' : 'fallende'
}

export function getRuntimeHistoryValues(
  history: RuntimeHistoryPoint[],
  roomKey: string,
  field: RuntimeHistoryField,
  limit: number,
  zoneKey?: string,
) {
  return getRuntimeHistoryPoints(history, roomKey, field, zoneKey)
    .slice(-limit)
    .map((point) => point.value)
}

export function createClimateRuntimeHistoryPoints(
  result: {
    rooms: Room[]
    updatedTemperatureRoomKeys: string[]
    updatedSetpointRoomKeys: string[]
    updatedHeatDemandRoomKeys: string[]
  },
  source: RuntimeHistoryPoint['source'] = 'climate-feedback',
  timestamp = Date.now(),
) {
  const points: RuntimeHistoryPoint[] = []

  for (const roomKey of result.updatedTemperatureRoomKeys) {
    const room = result.rooms.find((candidate) => candidate.key === roomKey)

    if (room && Number.isFinite(room.temperature)) {
      points.push({ timestamp, roomKey, field: 'temperature', value: room.temperature, source })
    }
  }

  for (const roomKey of result.updatedSetpointRoomKeys) {
    const room = result.rooms.find((candidate) => candidate.key === roomKey)

    if (room && Number.isFinite(room.targetTemperature)) {
      points.push({
        timestamp,
        roomKey,
        field: 'setpoint',
        value: room.targetTemperature,
        source,
      })
    }
  }

  for (const roomKey of result.updatedHeatDemandRoomKeys) {
    const room = result.rooms.find((candidate) => candidate.key === roomKey)

    if (room && typeof room.heatDemand === 'number' && Number.isFinite(room.heatDemand)) {
      points.push({ timestamp, roomKey, field: 'heatDemand', value: room.heatDemand, source })
    }
  }

  return points
}

export function createLightRuntimeHistoryPoints(
  result: {
    rooms: Room[]
    confirmedLightZoneKeys: string[]
    confirmedBrightnessZoneKeys: string[]
  },
  source: RuntimeHistoryPoint['source'] = 'light-feedback',
  timestamp = Date.now(),
) {
  const zoneKeys = Array.from(
    new Set([...result.confirmedLightZoneKeys, ...result.confirmedBrightnessZoneKeys]),
  )

  return zoneKeys.flatMap((zoneReference): RuntimeHistoryPoint[] => {
    const [roomKey, zoneKey] = zoneReference.split(':')
    const room = result.rooms.find((candidate) => candidate.key === roomKey)
    const zone = room?.zones.find((candidate) => candidate.key === zoneKey)

    if (!room || !zone) {
      return []
    }

    return [
      {
        timestamp,
        roomKey,
        zoneKey,
        field: 'brightness',
        value: zone.lightsOn ? zone.brightness : 0,
        source,
      },
    ]
  })
}

export function createRuntimeSnapshotHistoryPoints(
  rooms: Room[],
  source: RuntimeHistoryPoint['source'] = 'snapshot',
  timestamp = Date.now(),
) {
  return rooms.flatMap((room): RuntimeHistoryPoint[] => {
    const points: RuntimeHistoryPoint[] = []

    if (Number.isFinite(room.temperature)) {
      points.push({ timestamp, roomKey: room.key, field: 'temperature', value: room.temperature, source })
    }

    if (Number.isFinite(room.targetTemperature)) {
      points.push({
        timestamp,
        roomKey: room.key,
        field: 'setpoint',
        value: room.targetTemperature,
        source,
      })
    }

    if (typeof room.heatDemand === 'number' && Number.isFinite(room.heatDemand)) {
      points.push({ timestamp, roomKey: room.key, field: 'heatDemand', value: room.heatDemand, source })
    }

    for (const zone of room.zones) {
      if (Number.isFinite(zone.brightness)) {
        points.push({
          timestamp,
          roomKey: room.key,
          zoneKey: zone.key,
          field: 'brightness',
          value: zone.lightsOn ? zone.brightness : 0,
          source,
        })
      }
    }

    return points
  })
}
