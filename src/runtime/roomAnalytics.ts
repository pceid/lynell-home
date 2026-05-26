import type { Room } from '../data/rooms'
import {
  getRuntimeHistoryPoints,
  getRuntimeHistoryTrend,
  type RuntimeHistoryPoint,
} from './runtimeHistory'

export function getRoomTemperatureHistoryInsight({
  history,
  room,
  formatTemperature,
}: {
  history: RuntimeHistoryPoint[]
  room: Room
  formatTemperature: (value: number) => string
}) {
  const points = getRuntimeHistoryPoints(history, room.key, 'temperature').slice(-12)

  if (points.length < 2) {
    return null
  }

  const average = points.reduce((sum, point) => sum + point.value, 0) / points.length
  const trend = getRuntimeHistoryTrend(points)

  return {
    trend,
    text: `${room.name} har vært ${trend ?? 'rolig'} rundt ${formatTemperature(
      Number(average.toFixed(1)),
    )}.`,
    values: points.map((point) => point.value),
    roomName: room.name,
  }
}
