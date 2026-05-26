import type { Room } from '../data/rooms'
import type { SensorIntelligenceSummary } from '../integrations/edge/sensorIntelligence'
import type { VacuumDevice } from '../integrations/vacuum/vacuumTypes'
import type { MediaPlayerState } from '../media/mediaTypes'
import type { HousePresence } from '../presence/presenceTypes'
import type { HouseRhythmInsight } from '../runtime/dailyRhythm'
import type { RuntimeHistoryPoint } from '../runtime/runtimeHistory'
import type { SpatialAwareness } from '../spatial/houseSpatial'

export type HouseMemoryRoomSummary = {
  roomKey: string
  roomName: string
  activityScore: number
  lightScore: number
  heatScore: number
  averageTemperature: number | null
  temperatureStable: boolean
  dominantRhythm: string | null
  observation: string | null
}

export type HouseMemoryDailySnapshot = {
  dateKey: string
  createdAt: number
  updatedAt: number
  presenceState: string
  presenceLabel: string
  dominantRhythm: string | null
  activeRoomNames: string[]
  roomSummaries: HouseMemoryRoomSummary[]
  assistantSummary: string | null
  sensorSummary: {
    staleSensorCount: number
    weakSignalCount: number
    lowBatteryCount: number
    environmentalSummary: string | null
  }
  systemSummary: {
    bridgeReady: boolean
    confidenceLabel: string
    runtimePointCount: number
    mediaWasActive: boolean
  }
  spatialSummary: string | null
}

export type HouseMemoryState = {
  version: 1
  updatedAt: number
  dailySnapshots: HouseMemoryDailySnapshot[]
}

export type LoadedHouseMemoryState = HouseMemoryState & {
  restored: boolean
  message: string
}

export type HouseMemoryInsight = {
  summary: string
  weekSummary: string
  rhythmSummary: string
  changeSummary: string
  roomSummary: string
  assistantSummary: string
  deviceSummary: string
  presenceLine: string | null
}

const maxMemoryDays = 21
const maxSerializedMemoryBytes = 360_000
const dayMs = 24 * 60 * 60 * 1000

function getEmptyHouseMemoryState(message = 'Starter med ny house memory'): LoadedHouseMemoryState {
  return {
    version: 1,
    updatedAt: 0,
    dailySnapshots: [],
    restored: false,
    message,
  }
}

function isMemoryRoomSummary(value: unknown): value is HouseMemoryRoomSummary {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<HouseMemoryRoomSummary>
  return (
    typeof candidate.roomKey === 'string' &&
    typeof candidate.roomName === 'string' &&
    typeof candidate.activityScore === 'number' &&
    typeof candidate.lightScore === 'number' &&
    typeof candidate.heatScore === 'number' &&
    (candidate.averageTemperature === null || typeof candidate.averageTemperature === 'number') &&
    typeof candidate.temperatureStable === 'boolean' &&
    (candidate.dominantRhythm === null || typeof candidate.dominantRhythm === 'string') &&
    (candidate.observation === null || typeof candidate.observation === 'string')
  )
}

function isMemoryDailySnapshot(value: unknown): value is HouseMemoryDailySnapshot {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<HouseMemoryDailySnapshot>
  return (
    typeof candidate.dateKey === 'string' &&
    typeof candidate.createdAt === 'number' &&
    typeof candidate.updatedAt === 'number' &&
    typeof candidate.presenceState === 'string' &&
    typeof candidate.presenceLabel === 'string' &&
    Array.isArray(candidate.activeRoomNames) &&
    candidate.activeRoomNames.every((roomName) => typeof roomName === 'string') &&
    Array.isArray(candidate.roomSummaries) &&
    candidate.roomSummaries.every(isMemoryRoomSummary) &&
    candidate.sensorSummary !== undefined &&
    candidate.systemSummary !== undefined
  )
}

function roundScore(value: number) {
  return Math.round(value * 10) / 10
}

function average(values: number[]) {
  if (values.length === 0) {
    return null
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function getHistoryActivityScore(point: RuntimeHistoryPoint) {
  if (point.field === 'brightness') {
    return point.value > 0 ? 1 + Math.min(2, point.value / 50) : 0
  }

  if (point.field === 'heatDemand') {
    return point.value > 0 ? 0.7 + Math.min(2, point.value / 60) : 0
  }

  if (point.field === 'temperature') {
    return 0.1
  }

  return 0.05
}

function getTemperatureStable(points: RuntimeHistoryPoint[], fallbackTemperature: number) {
  const values = points
    .filter((point) => point.field === 'temperature')
    .map((point) => point.value)
    .slice(-24)

  if (values.length < 4) {
    return Number.isFinite(fallbackTemperature)
  }

  return Math.max(...values) - Math.min(...values) <= 1
}

function buildRoomMemoryObservation(room: Room, summary: Omit<HouseMemoryRoomSummary, 'observation'>) {
  if (summary.lightScore >= 7 && summary.dominantRhythm) {
    return `${room.name} har hatt tydelig lysrytme på ${summary.dominantRhythm}.`
  }

  if (summary.heatScore >= 6) {
    return `${room.name} har hatt merkbar varmeaktivitet.`
  }

  if (summary.temperatureStable) {
    return `${room.name} virker stabil over tid.`
  }

  if (summary.activityScore >= 5 && summary.dominantRhythm) {
    return `${room.name} virker mest aktiv på ${summary.dominantRhythm}.`
  }

  return null
}

function getTopRoomName(snapshots: HouseMemoryDailySnapshot[]) {
  const scores = new Map<string, { roomName: string; score: number }>()

  for (const snapshot of snapshots) {
    for (const room of snapshot.roomSummaries) {
      const current = scores.get(room.roomKey) ?? { roomName: room.roomName, score: 0 }
      current.score += room.activityScore
      scores.set(room.roomKey, current)
    }
  }

  return Array.from(scores.values()).sort((a, b) => b.score - a.score)[0] ?? null
}

function getQuietSnapshotCount(snapshots: HouseMemoryDailySnapshot[]) {
  return snapshots.filter((snapshot) => {
    const label = snapshot.presenceLabel.toLowerCase()
    return (
      snapshot.presenceState.includes('quiet') ||
      snapshot.presenceState.includes('night') ||
      snapshot.presenceState.includes('empty') ||
      label.includes('rolig') ||
      label.includes('stille')
    )
  }).length
}

function getMostCommonRhythm(snapshots: HouseMemoryDailySnapshot[]) {
  const rhythms = new Map<string, number>()

  for (const snapshot of snapshots) {
    if (!snapshot.dominantRhythm) {
      continue
    }

    rhythms.set(snapshot.dominantRhythm, (rhythms.get(snapshot.dominantRhythm) ?? 0) + 1)
  }

  return Array.from(rhythms.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

function getTotalActivity(snapshot: HouseMemoryDailySnapshot) {
  return snapshot.roomSummaries.reduce((sum, room) => sum + room.activityScore, 0)
}

export function getHouseMemoryDateKey(timestamp = Date.now()) {
  return new Date(timestamp).toLocaleDateString('sv-SE')
}

export function loadHouseMemoryState(storageKey: string): LoadedHouseMemoryState {
  if (typeof window === 'undefined') {
    return getEmptyHouseMemoryState()
  }

  try {
    const raw = window.localStorage.getItem(storageKey)

    if (!raw) {
      return getEmptyHouseMemoryState()
    }

    const parsed = JSON.parse(raw) as Partial<HouseMemoryState>
    const dailySnapshots = Array.isArray(parsed.dailySnapshots)
      ? parsed.dailySnapshots.filter(isMemoryDailySnapshot).slice(-maxMemoryDays)
      : []

    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
      dailySnapshots,
      restored: dailySnapshots.length > 0,
      message:
        dailySnapshots.length > 0
          ? `House memory restored (${dailySnapshots.length} døgn)`
          : 'Starter med ny house memory',
    }
  } catch (error) {
    console.warn('[Lynell] Kunne ikke lese house memory. Starter ny.', error)
    return getEmptyHouseMemoryState()
  }
}

export function persistHouseMemoryState(state: HouseMemoryState, storageKey: string) {
  if (typeof window === 'undefined') {
    return
  }

  const trimmedState: HouseMemoryState = {
    version: 1,
    updatedAt: state.updatedAt,
    dailySnapshots: state.dailySnapshots.slice(-maxMemoryDays),
  }
  const serialized = JSON.stringify(trimmedState)

  try {
    if (serialized.length <= maxSerializedMemoryBytes) {
      window.localStorage.setItem(storageKey, serialized)
      return
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...trimmedState,
        dailySnapshots: trimmedState.dailySnapshots.slice(-10),
      }),
    )
  } catch (error) {
    console.warn('[Lynell] Kunne ikke lagre house memory.', error)
  }
}

export function buildHouseMemoryDailySnapshot({
  rooms,
  history,
  presence,
  rhythm,
  mediaPlayer,
  vacuum,
  sensorIntelligence,
  spatialAwareness,
  bridgeReady,
  confidenceLabel,
  now = Date.now(),
}: {
  rooms: Room[]
  history: RuntimeHistoryPoint[]
  presence: HousePresence
  rhythm: HouseRhythmInsight
  mediaPlayer: MediaPlayerState
  vacuum: VacuumDevice | null
  sensorIntelligence: SensorIntelligenceSummary
  spatialAwareness: SpatialAwareness
  bridgeReady: boolean
  confidenceLabel: string
  now?: number
}): HouseMemoryDailySnapshot {
  const dayCutoff = now - dayMs
  const dayHistory = history.filter((point) => point.timestamp >= dayCutoff)
  const dateKey = getHouseMemoryDateKey(now)
  const roomSummaries = rooms.map((room) => {
    const roomPoints = dayHistory.filter((point) => point.roomKey === room.key)
    const rhythmRoom = rhythm.rooms.find((candidate) => candidate.roomKey === room.key)
    const lightScore = roundScore(
      roomPoints
        .filter((point) => point.field === 'brightness')
        .reduce((sum, point) => sum + getHistoryActivityScore(point), 0),
    )
    const heatScore = roundScore(
      roomPoints
        .filter((point) => point.field === 'heatDemand')
        .reduce((sum, point) => sum + getHistoryActivityScore(point), 0),
    )
    const averageTemperature = average(
      roomPoints.filter((point) => point.field === 'temperature').map((point) => point.value),
    )
    const summaryWithoutObservation = {
      roomKey: room.key,
      roomName: room.name,
      activityScore: roundScore(
        roomPoints.reduce((sum, point) => sum + getHistoryActivityScore(point), 0) +
          (room.zones.some((zone) => zone.lightsOn) ? 1.5 : 0) +
          (typeof room.heatDemand === 'number' && room.heatDemand > 25 ? 1 : 0),
      ),
      lightScore,
      heatScore,
      averageTemperature:
        averageTemperature === null
          ? Number.isFinite(room.temperature)
            ? room.temperature
            : null
          : Math.round(averageTemperature * 10) / 10,
      temperatureStable: getTemperatureStable(roomPoints, room.temperature),
      dominantRhythm: rhythmRoom?.dominantBucket ?? null,
    }

    return {
      ...summaryWithoutObservation,
      observation: rhythmRoom?.observation ?? buildRoomMemoryObservation(room, summaryWithoutObservation),
    }
  })

  const assistantSummary = spatialAwareness.assistantSummary
    ? spatialAwareness.assistantSummary
    : vacuum?.lastCleanedAt
      ? `${vacuum.model} var sist aktiv ${new Date(vacuum.lastCleanedAt).toLocaleDateString('no-NO')}.`
      : vacuum
        ? `${vacuum.model} er modellert i assistent-laget.`
        : null

  return {
    dateKey,
    createdAt: now,
    updatedAt: now,
    presenceState: presence.state,
    presenceLabel: presence.label,
    dominantRhythm: rhythm.dominantBucket,
    activeRoomNames: Array.from(new Set([...presence.activeRoomNames, ...sensorIntelligence.activeRoomNames])),
    roomSummaries,
    assistantSummary,
    sensorSummary: {
      staleSensorCount: sensorIntelligence.staleSensorCount,
      weakSignalCount: sensorIntelligence.weakSignalCount,
      lowBatteryCount: sensorIntelligence.lowBatteryCount,
      environmentalSummary: sensorIntelligence.nivaSummary,
    },
    systemSummary: {
      bridgeReady,
      confidenceLabel,
      runtimePointCount: history.length,
      mediaWasActive: mediaPlayer.isPlaying,
    },
    spatialSummary: spatialAwareness.presenceSummary ?? spatialAwareness.distributionLabel,
  }
}

export function upsertHouseMemorySnapshot(
  state: HouseMemoryState,
  snapshot: HouseMemoryDailySnapshot,
): HouseMemoryState {
  const existingSnapshot = state.dailySnapshots.find((candidate) => candidate.dateKey === snapshot.dateKey)
  const createdAt = existingSnapshot?.createdAt ?? snapshot.createdAt
  const nextSnapshot = {
    ...snapshot,
    createdAt,
  }
  const dailySnapshots = [
    ...state.dailySnapshots.filter((candidate) => candidate.dateKey !== snapshot.dateKey),
    nextSnapshot,
  ]
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-maxMemoryDays)

  return {
    version: 1,
    updatedAt: snapshot.updatedAt,
    dailySnapshots,
  }
}

export function buildHouseMemoryInsight(state: HouseMemoryState): HouseMemoryInsight {
  const snapshots = state.dailySnapshots.slice(-7)
  const latest = snapshots[snapshots.length - 1] ?? null

  if (!latest) {
    return {
      summary: 'Jeg bygger fortsatt husets hukommelse. Etter noen døgn kan jeg si mer om rytmen.',
      weekSummary: 'Jeg har ikke nok lagret house memory til å si noe om uken ennå.',
      rhythmSummary: 'Rytmen er under oppbygging.',
      changeSummary: 'Jeg har ikke nok sammenligningsgrunnlag ennå.',
      roomSummary: 'Romminnene starter når runtimehistorikken har fått litt tid.',
      assistantSummary: 'Assistentminnet er klart når assistenter har hatt aktivitet.',
      deviceSummary: 'Device- og sensorminne bygges gradvis opp fra edge-laget.',
      presenceLine: null,
    }
  }

  const topRoom = getTopRoomName(snapshots)
  const commonRhythm = getMostCommonRhythm(snapshots)
  const quietCount = getQuietSnapshotCount(snapshots)
  const stableRooms = latest.roomSummaries.filter((room) => room.temperatureStable)
  const bestRoomObservation =
    latest.roomSummaries
      .filter((room) => room.observation)
      .sort((a, b) => b.activityScore - a.activityScore)[0]?.observation ?? null
  const previousSnapshots = snapshots.slice(0, -1)
  const previousAverageActivity =
    previousSnapshots.length > 0
      ? previousSnapshots.reduce((sum, snapshot) => sum + getTotalActivity(snapshot), 0) / previousSnapshots.length
      : null
  const latestActivity = getTotalActivity(latest)
  const activityDelta =
    previousAverageActivity && previousAverageActivity > 0
      ? (latestActivity - previousAverageActivity) / previousAverageActivity
      : 0
  const activityChange =
    previousSnapshots.length < 2
      ? 'Jeg trenger noen flere døgn før jeg vurderer endring over tid.'
      : activityDelta > 0.35
        ? 'Det har vært mer aktivitet enn vanlig i den siste lagrede rytmen.'
        : activityDelta < -0.35
          ? 'Huset har hatt mindre aktivitet enn vanlig i den siste lagrede rytmen.'
          : 'Huset følger omtrent samme rytme som tidligere i uken.'
  const roomSummary =
    bestRoomObservation ??
    (stableRooms.length > 0
      ? `${stableRooms[0].roomName} virker stabil over tid.`
      : 'Romminnet har ikke funnet et tydelig mønster ennå.')
  const weekSummary =
    snapshots.length >= 2 && topRoom
      ? `${topRoom.roomName} har vært mest aktiv i house memory de siste ${snapshots.length} døgnene. ${
          quietCount >= Math.max(2, Math.floor(snapshots.length / 2))
            ? 'Flere perioder har vært stille.'
            : 'Aktiviteten har vært mer spredt.'
        }`
      : topRoom
        ? `${topRoom.roomName} er mest aktiv i dagens memory så langt.`
        : 'Jeg har lite romaktivitet lagret ennå.'
  const rhythmSummary = commonRhythm
    ? `Den lagrede rytmen peker mest mot ${commonRhythm}. ${activityChange}`
    : `Rytmen er fortsatt forsiktig. ${activityChange}`
  const assistantSummary = latest.assistantSummary
    ? latest.assistantSummary
    : 'Jeg har ikke tydelig assistentaktivitet lagret ennå.'
  const deviceHealthIssues =
    latest.sensorSummary.lowBatteryCount +
    latest.sensorSummary.weakSignalCount +
    latest.sensorSummary.staleSensorCount
  const deviceSummary =
    deviceHealthIssues > 0
      ? `Noen sensor- og edge-signaler er fortsatt stille: ${latest.sensorSummary.staleSensorCount} foundation/stille, ${latest.sensorSummary.weakSignalCount} svake signaler.`
      : 'Device- og sensorlaget virker stabilt i den lagrede memoryen.'
  const summary = [
    weekSummary,
    roomSummary,
    latest.spatialSummary && latest.activeRoomNames.length > 0 ? latest.spatialSummary : null,
  ]
    .filter(Boolean)
    .join(' ')
  const presenceLine =
    snapshots.length >= 3
      ? activityDelta > 0.35
        ? 'House memory ser litt mer aktivitet enn vanlig.'
        : activityDelta < -0.35
          ? 'House memory viser en periode med mindre aktivitet.'
          : 'Huset følger omtrent sin vanlige rytme.'
      : null

  return {
    summary,
    weekSummary,
    rhythmSummary,
    changeSummary: activityChange,
    roomSummary,
    assistantSummary,
    deviceSummary,
    presenceLine,
  }
}
