import type { Room } from '../data/rooms'
import type { MediaPlayerState } from '../media/mediaTypes'
import type { HousePresence } from '../presence/presenceTypes'
import type { RuntimeHistoryPoint } from './runtimeHistory'

export type DayRhythmBucket = 'morgen' | 'dag' | 'ettermiddag' | 'kveld' | 'natt'

export type RoomRhythmInsight = {
  roomKey: string
  roomName: string
  dominantBucket: DayRhythmBucket | null
  activityScoreHour: number
  activityScoreDay: number
  lightScoreDay: number
  heatScoreDay: number
  temperatureStable: boolean
  observation: string | null
}

export type HouseRhythmInsight = {
  rooms: RoomRhythmInsight[]
  activeRoomsHour: RoomRhythmInsight[]
  activeRoomsDay: RoomRhythmInsight[]
  dominantBucket: DayRhythmBucket | null
  homeObservation: string | null
  rhythmSummary: string
  eveningSummary: string
  activeTodaySummary: string
}

const hourMs = 60 * 60 * 1000
const dayMs = 24 * hourMs

function getRhythmBucket(timestamp: number): DayRhythmBucket {
  const hour = new Date(timestamp).getHours()

  if (hour < 6) {
    return 'natt'
  }

  if (hour < 11) {
    return 'morgen'
  }

  if (hour < 15) {
    return 'dag'
  }

  if (hour < 18) {
    return 'ettermiddag'
  }

  if (hour < 23) {
    return 'kveld'
  }

  return 'natt'
}

function getPointActivityScore(point: RuntimeHistoryPoint) {
  if (point.field === 'brightness') {
    return point.value > 0 ? 1 + Math.min(2, point.value / 50) : 0
  }

  if (point.field === 'heatDemand') {
    return point.value > 0 ? 0.7 + Math.min(2, point.value / 60) : 0
  }

  if (point.field === 'temperature') {
    return 0.15
  }

  return 0.05
}

function getDominantBucket(points: RuntimeHistoryPoint[]) {
  const scores = new Map<DayRhythmBucket, number>()

  for (const point of points) {
    const bucket = getRhythmBucket(point.timestamp)
    scores.set(bucket, (scores.get(bucket) ?? 0) + getPointActivityScore(point))
  }

  return Array.from(scores.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

function getTemperatureStability(points: RuntimeHistoryPoint[]) {
  const temperaturePoints = points
    .filter((point) => point.field === 'temperature')
    .slice(-24)

  if (temperaturePoints.length < 4) {
    return false
  }

  const values = temperaturePoints.map((point) => point.value)
  return Math.max(...values) - Math.min(...values) <= 1
}

function buildRoomObservation({
  room,
  dominantBucket,
  lightScoreDay,
  heatScoreDay,
  temperatureStable,
}: {
  room: Room
  dominantBucket: DayRhythmBucket | null
  lightScoreDay: number
  heatScoreDay: number
  temperatureStable: boolean
}) {
  if (lightScoreDay >= 7 && dominantBucket) {
    return `${room.name} har mest lysaktivitet på ${dominantBucket}.`
  }

  if (heatScoreDay >= 6) {
    return `${room.name} har hatt tydelig varmeaktivitet i dag.`
  }

  if (temperatureStable) {
    return `${room.name} holder stabil temperatur over tid.`
  }

  if (dominantBucket) {
    return `${room.name} virker mest aktiv på ${dominantBucket}.`
  }

  return null
}

export function buildDailyRhythmInsight({
  rooms,
  history,
  now = Date.now(),
  mediaPlayer,
  presence,
  globalMode,
}: {
  rooms: Room[]
  history: RuntimeHistoryPoint[]
  now?: number
  mediaPlayer: MediaPlayerState
  presence: HousePresence
  globalMode: string
}): HouseRhythmInsight {
  const hourCutoff = now - hourMs
  const dayCutoff = now - dayMs
  const dayHistory = history.filter((point) => point.timestamp >= dayCutoff)
  const roomInsights = rooms.map((room): RoomRhythmInsight => {
    const roomPoints = dayHistory.filter((point) => point.roomKey === room.key)
    const hourPoints = roomPoints.filter((point) => point.timestamp >= hourCutoff)
    const lightScoreDay = roomPoints
      .filter((point) => point.field === 'brightness')
      .reduce((sum, point) => sum + getPointActivityScore(point), 0)
    const heatScoreDay = roomPoints
      .filter((point) => point.field === 'heatDemand')
      .reduce((sum, point) => sum + getPointActivityScore(point), 0)
    const dominantBucket = getDominantBucket(roomPoints)
    const temperatureStable = getTemperatureStability(roomPoints)

    return {
      roomKey: room.key,
      roomName: room.name,
      dominantBucket,
      activityScoreHour: hourPoints.reduce((sum, point) => sum + getPointActivityScore(point), 0),
      activityScoreDay: roomPoints.reduce((sum, point) => sum + getPointActivityScore(point), 0),
      lightScoreDay,
      heatScoreDay,
      temperatureStable,
      observation: buildRoomObservation({
        room,
        dominantBucket,
        lightScoreDay,
        heatScoreDay,
        temperatureStable,
      }),
    }
  })
  const activeRoomsHour = roomInsights
    .filter((room) => room.activityScoreHour >= 1.5)
    .sort((a, b) => b.activityScoreHour - a.activityScoreHour)
  const activeRoomsDay = roomInsights
    .filter((room) => room.activityScoreDay >= 2)
    .sort((a, b) => b.activityScoreDay - a.activityScoreDay)
  const dominantBucket = getDominantBucket(dayHistory)
  const hour = new Date(now).getHours()
  const hasCurrentActivity =
    presence.activeRoomNames.length > 0 || mediaPlayer.isPlaying || activeRoomsHour.length > 0
  const homeObservation = (() => {
    if (globalMode === 'Borte' && !hasCurrentActivity) {
      return 'Huset virker tomt akkurat nå.'
    }

    if (hour >= 21 && activeRoomsDay.length >= 2 && activeRoomsHour.length === 0) {
      return 'Huset begynner å roe seg.'
    }

    if (hour >= 18 && activeRoomsHour.length === 0) {
      return 'Kvelden virker stille.'
    }

    if (activeRoomsDay.length >= 3 && activeRoomsHour.length <= 1) {
      return 'Mye aktivitet tidligere i dag.'
    }

    if (dominantBucket === 'kveld') {
      return 'Huset har mest rytme på kvelden.'
    }

    return null
  })()
  const activeRoomText =
    activeRoomsDay.length > 0
      ? activeRoomsDay
          .slice(0, 3)
          .map((room) => room.roomName)
          .join(', ')
      : ''
  const rhythmSummary =
    activeRoomsDay.length > 0
      ? `Mest aktivitet ligger i ${activeRoomText}. ${
          dominantBucket ? `Rytmen peker mest mot ${dominantBucket}.` : ''
        }`.trim()
      : 'Jeg har lite rytmehistorikk ennå, men følger med når rommene brukes.'
  const eveningRoom = roomInsights.find((room) => room.dominantBucket === 'kveld')
  const eveningSummary = eveningRoom
    ? `${eveningRoom.roomName} ser ut til å være kveldens mest aktive rom.`
    : activeRoomsHour.length > 0
      ? `${activeRoomsHour[0].roomName} er mest aktivt akkurat nå.`
      : 'Kvelden ser stille ut i historikken jeg har nå.'
  const activeTodaySummary =
    activeRoomsDay.length > 0
      ? `Huset har vært mest aktivt i ${activeRoomText}.`
      : 'Jeg ser lite registrert aktivitet i dag.'

  return {
    rooms: roomInsights,
    activeRoomsHour,
    activeRoomsDay,
    dominantBucket,
    homeObservation,
    rhythmSummary,
    eveningSummary,
    activeTodaySummary,
  }
}
