import type {
  HouseMemoryDailySnapshot,
  HouseMemoryState,
} from '../memory/houseMemory'
import type { SensorIntelligenceSummary } from '../integrations/edge/sensorIntelligence'
import type { VacuumDevice } from '../integrations/vacuum/vacuumTypes'
import type { SpatialAwareness } from '../spatial/houseSpatial'
import type { HouseRhythmInsight } from './dailyRhythm'
import type { HouseComfortInsight } from './comfortEnergy'

export type AdaptiveAwarenessDriftKind =
  | 'activity'
  | 'comfort'
  | 'rhythm'
  | 'device'
  | 'assistant'
  | 'stable'
  | 'insufficient'

export type AdaptiveAwarenessInsight = {
  kind: AdaptiveAwarenessDriftKind
  summary: string
  nivaSummary: string
  homeLine: string | null
  rhythmLine: string
  comfortLine: string
  deviceLine: string
  assistantLine: string
  confidenceLine: string | null
}

function getSnapshotActivity(snapshot: HouseMemoryDailySnapshot) {
  return snapshot.roomSummaries.reduce((sum, room) => sum + room.activityScore, 0)
}

function getSnapshotHeat(snapshot: HouseMemoryDailySnapshot) {
  return snapshot.roomSummaries.reduce((sum, room) => sum + room.heatScore, 0)
}

function getAverage(values: number[]) {
  if (values.length === 0) {
    return null
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function getTopRoomByDelta({
  current,
  previous,
  field,
}: {
  current: HouseMemoryDailySnapshot
  previous: HouseMemoryDailySnapshot[]
  field: 'activityScore' | 'heatScore'
}) {
  const candidates = current.roomSummaries.map((room) => {
    const previousValues = previous
      .map((snapshot) => snapshot.roomSummaries.find((candidate) => candidate.roomKey === room.roomKey)?.[field])
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    const baseline = getAverage(previousValues)

    return {
      room,
      baseline,
      delta: baseline === null ? 0 : room[field] - baseline,
    }
  })

  return candidates.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0] ?? null
}

function getActivityLine(current: HouseMemoryDailySnapshot, previous: HouseMemoryDailySnapshot[]) {
  if (previous.length < 2) {
    return 'Jeg trenger mer erfaring før jeg vurderer aktivitet mot normalen.'
  }

  const baseline = getAverage(previous.map(getSnapshotActivity)) ?? 0
  const currentActivity = getSnapshotActivity(current)
  const ratio = baseline > 0 ? (currentActivity - baseline) / baseline : 0
  const roomDelta = getTopRoomByDelta({ current, previous, field: 'activityScore' })

  if (ratio > 0.35) {
    return roomDelta && roomDelta.delta > 1
      ? `${roomDelta.room.roomName} virker mer aktiv enn vanlig.`
      : 'Huset virker mer aktivt enn vanlig.'
  }

  if (ratio < -0.35) {
    return roomDelta && roomDelta.delta < -1
      ? `${roomDelta.room.roomName} har mindre aktivitet enn vanlig.`
      : 'Huset har mindre aktivitet enn vanlig.'
  }

  return 'Huset følger omtrent samme aktivitetsrytme som tidligere.'
}

function getComfortLine({
  current,
  previous,
  comfort,
}: {
  current: HouseMemoryDailySnapshot
  previous: HouseMemoryDailySnapshot[]
  comfort: HouseComfortInsight
}) {
  if (previous.length < 2) {
    return comfort.confidenceLine ?? 'Komfortdrift trenger litt mer historikk.'
  }

  const baselineHeat = getAverage(previous.map(getSnapshotHeat)) ?? 0
  const currentHeat = getSnapshotHeat(current)
  const heatRatio = baselineHeat > 0 ? (currentHeat - baselineHeat) / baselineHeat : 0
  const roomDelta = getTopRoomByDelta({ current, previous, field: 'heatScore' })
  const unstableRooms = comfort.rooms.filter((room) => room.state === 'unstable')

  if (heatRatio > 0.35) {
    return roomDelta && roomDelta.delta > 1
      ? `${roomDelta.room.roomName} har hatt høyere varmeaktivitet enn vanlig.`
      : 'Noen rom krever mer varme enn vanlig.'
  }

  if (heatRatio < -0.35) {
    return 'Varmebehovet virker lavere enn tidligere.'
  }

  if (unstableRooms.length > 0) {
    return 'Komforten virker litt mindre stabil i enkelte rom.'
  }

  if (comfort.state === 'comfortable') {
    return 'Komforten virker stabil mot tidligere mønster.'
  }

  return comfort.summary
}

function getRhythmLine({
  current,
  previous,
  rhythm,
  spatialAwareness,
}: {
  current: HouseMemoryDailySnapshot
  previous: HouseMemoryDailySnapshot[]
  rhythm: HouseRhythmInsight
  spatialAwareness: SpatialAwareness
}) {
  if (previous.length < 2) {
    return rhythm.rhythmSummary
  }

  const previousRhythms = previous
    .map((snapshot) => snapshot.dominantRhythm)
    .filter((value): value is string => Boolean(value))
  const currentRhythm = current.dominantRhythm
  const commonRhythm = previousRhythms
    .map((value) => ({
      value,
      count: previousRhythms.filter((candidate) => candidate === value).length,
    }))
    .sort((a, b) => b.count - a.count)[0]?.value

  if (currentRhythm && commonRhythm && currentRhythm !== commonRhythm) {
    return `Rytmen virker litt annerledes nå: mer ${currentRhythm} enn vanlig.`
  }

  if (spatialAwareness.activeAreaLabel && spatialAwareness.activeRoomNames.length >= 2) {
    return `Aktiviteten samler seg rundt ${spatialAwareness.activeAreaLabel}.`
  }

  return 'Huset følger omtrent samme rytme som tidligere.'
}

function getDeviceLine(
  current: HouseMemoryDailySnapshot,
  previous: HouseMemoryDailySnapshot[],
  sensors: SensorIntelligenceSummary,
) {
  if (previous.length < 2) {
    return sensors.staleSensorCount > 0
      ? 'Noen sensorer bruker fortsatt foundation-state, så jeg vurderer drift forsiktig.'
      : 'Sensorlaget trenger litt mer historikk før drift vurderes.'
  }

  const previousWeakAverage =
    getAverage(previous.map((snapshot) => snapshot.sensorSummary.weakSignalCount)) ?? 0
  const previousStaleAverage =
    getAverage(previous.map((snapshot) => snapshot.sensorSummary.staleSensorCount)) ?? 0

  if (current.sensorSummary.weakSignalCount > previousWeakAverage + 1) {
    return 'Zigbee- og sensorsignaler virker litt svakere enn normalt.'
  }

  if (current.sensorSummary.staleSensorCount > previousStaleAverage + 1) {
    return 'Noen sensorer virker mindre stabile enn tidligere.'
  }

  return 'Sensor- og devicebildet virker omtrent som tidligere.'
}

function getAssistantLine(current: HouseMemoryDailySnapshot, previous: HouseMemoryDailySnapshot[], vacuum: VacuumDevice | null) {
  if (!vacuum) {
    return 'Jeg har ikke assistentdrift å sammenligne ennå.'
  }

  const previousAssistantDays = previous.filter((snapshot) => snapshot.assistantSummary).length

  if (vacuum.cleaning && previousAssistantDays === 0) {
    return 'Rengjøringen er aktiv nå, men jeg har lite tidligere assistentmønster å sammenligne med.'
  }

  if (vacuum.cleaning && previousAssistantDays > 0) {
    return 'Rengjøringen virker aktiv innenfor et kjent mønster.'
  }

  if (current.assistantSummary && previousAssistantDays >= 2) {
    return 'Assistentbruken virker omtrent som tidligere.'
  }

  return 'Assistentlaget har lav aktivitet i memory akkurat nå.'
}

function pickPrimaryKind({
  activityLine,
  comfortLine,
  deviceLine,
}: {
  activityLine: string
  comfortLine: string
  deviceLine: string
}): AdaptiveAwarenessDriftKind {
  if (activityLine.includes('mer aktiv') || activityLine.includes('roligere')) {
    return 'activity'
  }

  if (comfortLine.includes('varme') || comfortLine.includes('Komforten virker litt mindre')) {
    return 'comfort'
  }

  if (deviceLine.includes('svakere') || deviceLine.includes('mindre stabile')) {
    return 'device'
  }

  return 'stable'
}

export function buildAdaptiveHomeAwareness({
  memory,
  currentSnapshot,
  rhythm,
  comfort,
  sensorIntelligence,
  vacuum,
  spatialAwareness,
  confidenceLevel,
}: {
  memory: HouseMemoryState
  currentSnapshot: HouseMemoryDailySnapshot
  rhythm: HouseRhythmInsight
  comfort: HouseComfortInsight
  sensorIntelligence: SensorIntelligenceSummary
  vacuum: VacuumDevice | null
  spatialAwareness: SpatialAwareness
  confidenceLevel: 'høy' | 'middels' | 'lav'
}): AdaptiveAwarenessInsight {
  const previousSnapshots = memory.dailySnapshots
    .filter((snapshot) => snapshot.dateKey !== currentSnapshot.dateKey)
    .slice(-6)

  if (previousSnapshots.length < 2) {
    const confidenceLine =
      confidenceLevel === 'lav'
        ? 'Datagrunnlaget er litt stille, så jeg tolker endringer forsiktig.'
        : 'Jeg trenger mer erfaring før jeg vurderer endringer sikkert.'

    return {
      kind: 'insufficient',
      summary: confidenceLine,
      nivaSummary: confidenceLine,
      homeLine: null,
      rhythmLine: rhythm.rhythmSummary,
      comfortLine: comfort.confidenceLine ?? comfort.summary,
      deviceLine: sensorIntelligence.nivaSummary,
      assistantLine: vacuum ? 'Assistentmønster bygges over tid.' : 'Ingen assistentdrift å sammenligne ennå.',
      confidenceLine,
    }
  }

  const activityLine = getActivityLine(currentSnapshot, previousSnapshots)
  const comfortLine = getComfortLine({
    current: currentSnapshot,
    previous: previousSnapshots,
    comfort,
  })
  const rhythmLine = getRhythmLine({
    current: currentSnapshot,
    previous: previousSnapshots,
    rhythm,
    spatialAwareness,
  })
  const deviceLine = getDeviceLine(currentSnapshot, previousSnapshots, sensorIntelligence)
  const assistantLine = getAssistantLine(currentSnapshot, previousSnapshots, vacuum)
  const kind = pickPrimaryKind({ activityLine, comfortLine, deviceLine })
  const confidenceLine =
    confidenceLevel === 'lav'
      ? 'Dette bygger på siste kjente verdier, så jeg holder vurderingen forsiktig.'
      : confidenceLevel === 'middels'
        ? 'Noen signaler bygger på siste kjente state.'
        : null
  const summary = [activityLine, comfortLine, confidenceLine].filter(Boolean).join(' ')
  const homeLine =
    kind === 'activity'
      ? activityLine
      : kind === 'comfort'
        ? comfortLine
        : kind === 'device'
          ? null
          : 'Huset følger omtrent sitt vanlige mønster.'

  return {
    kind,
    summary,
    nivaSummary: [summary, rhythmLine, deviceLine].filter(Boolean).join(' '),
    homeLine,
    rhythmLine,
    comfortLine,
    deviceLine,
    assistantLine,
    confidenceLine,
  }
}
