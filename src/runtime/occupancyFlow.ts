import type { Room } from '../data/rooms'
import type { HouseMemoryState } from '../memory/houseMemory'
import type { MediaPlayerState } from '../media/mediaTypes'
import type { HouseSpatialMap, SpatialArea, SpatialAwareness } from '../spatial/houseSpatial'
import type { VacuumDevice } from '../integrations/vacuum/vacuumTypes'
import type { HouseRhythmInsight } from './dailyRhythm'

export type ActivityZoneState = 'active' | 'quiet' | 'transition' | 'separate' | 'service'

export type ActivityZoneInsight = {
  areaId: string
  label: string
  role: SpatialArea['role']
  state: ActivityZoneState
  activeRoomNames: string[]
  quietRoomNames: string[]
  score: number
  summary: string
}

export type OccupancyFlowInsight = {
  zones: ActivityZoneInsight[]
  activeZones: ActivityZoneInsight[]
  quietZones: ActivityZoneInsight[]
  primaryZone: ActivityZoneInsight | null
  flowState: 'waking' | 'settling' | 'gathered' | 'spread' | 'quiet' | 'limited'
  summary: string
  homeLine: string | null
  nivaSummary: string
  assistantLine: string | null
  confidenceLine: string | null
}

const normalize = (value: string) => value.toLowerCase().replace(/é/g, 'e').trim()

function getRoomActivityScore(room: Room) {
  const lightsScore = room.zones.some((zone) => zone.lightsOn)
    ? 1 + Math.min(2, room.zones.reduce((sum, zone) => sum + zone.brightness, 0) / Math.max(1, room.zones.length) / 50)
    : 0
  const heatScore = typeof room.heatDemand === 'number' && room.heatDemand > 25 ? 0.7 : 0

  return lightsScore + heatScore
}

function getAreaPurpose(area: SpatialArea) {
  if (area.role === 'transition') {
    return 'overgangssone'
  }

  if (area.role === 'separate') {
    return 'separat område'
  }

  if (area.role === 'service') {
    return 'servicedel'
  }

  return 'oppholdsdel'
}

function getFlowState({
  activeZones,
  totalZones,
  hour,
  rhythm,
}: {
  activeZones: ActivityZoneInsight[]
  totalZones: number
  hour: number
  rhythm: HouseRhythmInsight
}): OccupancyFlowInsight['flowState'] {
  if (activeZones.length === 0) {
    return hour >= 22 || hour < 6 ? 'settling' : 'quiet'
  }

  if (activeZones.length === 1) {
    return hour < 11 && rhythm.activeRoomsHour.length > 0 ? 'waking' : 'gathered'
  }

  if (activeZones.length >= Math.max(2, totalZones - 1)) {
    return 'spread'
  }

  return hour >= 20 ? 'settling' : 'gathered'
}

function getFlowSummary(state: OccupancyFlowInsight['flowState'], primaryZone: ActivityZoneInsight | null) {
  if (state === 'waking') {
    return primaryZone
      ? `Huset våkner mest rundt ${primaryZone.label}.`
      : 'Huset begynner å våkne.'
  }

  if (state === 'settling') {
    return primaryZone
      ? `Huset roer seg, med litt aktivitet rundt ${primaryZone.label}.`
      : 'Huset begynner å roe seg ned.'
  }

  if (state === 'gathered') {
    return primaryZone
      ? `Aktiviteten virker samlet rundt ${primaryZone.label}.`
      : 'Aktiviteten virker samlet i én del av huset.'
  }

  if (state === 'spread') {
    return 'Aktiviteten er spredt mellom flere deler av huset.'
  }

  if (state === 'limited') {
    return 'Jeg har begrenset aktivitetsgrunnlag akkurat nå.'
  }

  return 'Det virker stille i de fleste områdene.'
}

function getMemoryFlowLine(memory: HouseMemoryState, primaryZone: ActivityZoneInsight | null) {
  const snapshots = memory.dailySnapshots.slice(-4)

  if (snapshots.length < 2 || !primaryZone) {
    return null
  }

  const activeInAreaCount = snapshots.filter((snapshot) =>
    snapshot.activeRoomNames.some((roomName) => primaryZone.activeRoomNames.includes(roomName)),
  ).length

  if (activeInAreaCount >= 2) {
    return `${primaryZone.label} har vært et tydelig aktivitetsområde de siste dagene.`
  }

  return null
}

function getAssistantLine(vacuum: VacuumDevice | null, primaryZone: ActivityZoneInsight | null, spatialMap: HouseSpatialMap) {
  if (!vacuum?.cleaning) {
    return null
  }

  const assistantArea = vacuum.currentRoom
    ? spatialMap.areas.find((area) => area.roomNames.includes(vacuum.currentRoom ?? ''))
    : null

  if (!assistantArea) {
    return 'Rengjøringen pågår uten tydelig romlig område akkurat nå.'
  }

  if (primaryZone && primaryZone.areaId !== assistantArea.id) {
    return 'Rengjøringen foregår utenfor hovedaktiviteten akkurat nå.'
  }

  return `Støvsugeren jobber i ${assistantArea.label}.`
}

export function buildOccupancyFlowInsight({
  rooms,
  spatialMap,
  spatialAwareness,
  rhythm,
  memory,
  mediaPlayer,
  vacuum,
  now = Date.now(),
  confidenceLevel,
}: {
  rooms: Room[]
  spatialMap: HouseSpatialMap
  spatialAwareness: SpatialAwareness
  rhythm: HouseRhythmInsight
  memory: HouseMemoryState
  mediaPlayer: MediaPlayerState
  vacuum: VacuumDevice | null
  now?: number
  confidenceLevel: 'høy' | 'middels' | 'lav'
}): OccupancyFlowInsight {
  const activeRoomNames = new Set([
    ...spatialAwareness.activeRoomNames,
    ...rhythm.activeRoomsHour.map((room) => room.roomName),
    ...(mediaPlayer.isPlaying ? rhythm.activeRoomsDay.slice(0, 1).map((room) => room.roomName) : []),
  ])

  const zones = spatialMap.areas.map((area): ActivityZoneInsight => {
    const areaRooms = rooms.filter((room) => area.roomKeys.includes(room.key))
    const runtimeActiveRoomNames = areaRooms
      .filter((room) => activeRoomNames.has(room.name) || getRoomActivityScore(room) >= 1)
      .map((room) => room.name)
    const activeNames = Array.from(new Set(runtimeActiveRoomNames))
    const quietRoomNames = area.roomNames.filter((roomName) => !activeNames.includes(roomName))
    const roleState: ActivityZoneState =
      activeNames.length > 0
        ? 'active'
        : area.role === 'transition'
          ? 'transition'
          : area.role === 'separate'
            ? 'separate'
            : area.role === 'service'
              ? 'service'
              : 'quiet'
    const score =
      activeNames.length +
      areaRooms.reduce((sum, room) => sum + getRoomActivityScore(room), 0) +
      (mediaPlayer.isPlaying && area.role === 'main' ? 0.4 : 0)

    return {
      areaId: area.id,
      label: area.label,
      role: area.role,
      state: roleState,
      activeRoomNames: activeNames,
      quietRoomNames,
      score,
      summary:
        activeNames.length > 0
          ? `${area.label} virker aktiv med ${activeNames.slice(0, 2).join(' og ')}.`
          : `${area.label} virker stille som ${getAreaPurpose(area)}.`,
    }
  })
  const activeZones = zones.filter((zone) => zone.activeRoomNames.length > 0).sort((a, b) => b.score - a.score)
  const quietZones = zones.filter((zone) => zone.activeRoomNames.length === 0)
  const primaryZone = activeZones[0] ?? null
  const flowState = confidenceLevel === 'lav'
    ? 'limited'
    : getFlowState({
        activeZones,
        totalZones: zones.length,
        hour: new Date(now).getHours(),
        rhythm,
      })
  const flowSummary = getFlowSummary(flowState, primaryZone)
  const memoryLine = getMemoryFlowLine(memory, primaryZone)
  const assistantLine = getAssistantLine(vacuum, primaryZone, spatialMap)
  const connectedRoomLine =
    primaryZone && primaryZone.activeRoomNames.length >= 2
      ? `${primaryZone.activeRoomNames.slice(0, 2).join(' og ')} virker aktive samtidig.`
      : spatialAwareness.activeAreaRoomNames.length >= 2
        ? `${spatialAwareness.activeAreaRoomNames.slice(0, 2).join(' og ')} virker aktive samtidig.`
        : null
  const quietLine =
    quietZones.length > 0 && activeZones.length > 0
      ? `Det virker mindre aktivt i ${quietZones.slice(0, 2).map((zone) => zone.label).join(' og ')}.`
      : null
  const confidenceLine =
    confidenceLevel === 'lav'
      ? 'Vurderingen bygger på begrenset aktivitet akkurat nå.'
      : null
  const summary = [flowSummary, connectedRoomLine, quietLine, memoryLine, assistantLine, confidenceLine]
    .filter(Boolean)
    .join(' ')
  const homeLine =
    confidenceLevel === 'lav'
      ? null
      : flowState === 'quiet'
        ? 'Det virker stille i de fleste områdene.'
        : flowState === 'settling'
          ? 'Huset begynner å roe seg ned.'
          : flowSummary

  return {
    zones,
    activeZones,
    quietZones,
    primaryZone,
    flowState,
    summary,
    homeLine,
    nivaSummary: summary,
    assistantLine,
    confidenceLine,
  }
}

export function roomNameLooksLikeOccupancyQuery(value: string) {
  const normalized = normalize(value)
  return (
    normalized.includes('aktivitet') ||
    normalized.includes('brukes') ||
    normalized.includes('flyt') ||
    normalized.includes('rolig') ||
    normalized.includes('aktive områder') ||
    normalized.includes('aktive omrader')
  )
}
