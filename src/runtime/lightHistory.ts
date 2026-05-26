import type { LightZone } from '../data/rooms'
import type { RuntimeHistoryPoint } from './runtimeHistory'

export type LightZoneHistorySeries = {
  zoneKey: string
  zoneName: string
  points: RuntimeHistoryPoint[]
  averageValue: number | null
  latestValue: number | null
  pointCount: number
}

function getAverage(points: RuntimeHistoryPoint[]) {
  if (points.length === 0) {
    return null
  }

  return points.reduce((sum, point) => sum + point.value, 0) / points.length
}

export function buildLightZoneHistorySeries({
  roomKey,
  zones,
  history,
}: {
  roomKey: string
  zones: LightZone[]
  history: RuntimeHistoryPoint[]
}): LightZoneHistorySeries[] {
  return zones.map((zone) => {
    const points = history
      .filter(
        (point) =>
          point.roomKey === roomKey &&
          point.field === 'brightness' &&
          (point.zoneKey === zone.key || point.zoneKey === zone.id) &&
          Number.isFinite(point.value),
      )
      .sort((a, b) => a.timestamp - b.timestamp)
    const latestPoint = points[points.length - 1] ?? null

    return {
      zoneKey: zone.key,
      zoneName: zone.name,
      points,
      averageValue: getAverage(points),
      latestValue: latestPoint?.value ?? null,
      pointCount: points.length,
    }
  })
}

export function buildRoomBrightnessAveragePoints(series: LightZoneHistorySeries[]) {
  const timestamps = Array.from(
    new Set(series.flatMap((zoneSeries) => zoneSeries.points.map((point) => point.timestamp))),
  ).sort((a, b) => a - b)
  const latestByZone = new Map<string, number>()
  const pointsByZone = new Map(series.map((zoneSeries) => [zoneSeries.zoneKey, zoneSeries.points]))

  return timestamps.flatMap((timestamp): RuntimeHistoryPoint[] => {
    for (const zoneSeries of series) {
      const points = pointsByZone.get(zoneSeries.zoneKey) ?? []
      const pointAtTimestamp = points.find((point) => point.timestamp === timestamp)

      if (pointAtTimestamp) {
        latestByZone.set(zoneSeries.zoneKey, pointAtTimestamp.value)
      }
    }

    const values = Array.from(latestByZone.values()).filter(Number.isFinite)

    if (values.length === 0) {
      return []
    }

    return [{
      timestamp,
      roomKey: series[0]?.points[0]?.roomKey ?? '',
      field: 'brightness',
      value: values.reduce((sum, value) => sum + value, 0) / values.length,
      source: 'aggregate',
      confidence: 'low',
      responseSource: 'zoneAverage',
    }]
  })
}
