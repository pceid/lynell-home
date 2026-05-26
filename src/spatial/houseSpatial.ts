import type { FloorConfig, SystemRoomConfig } from '../config/systemConfig'
import type { Room } from '../data/rooms'
import type { VacuumDevice } from '../integrations/vacuum/vacuumTypes'

export type SpatialRelationshipKind = 'adjacent' | 'connected' | 'same-location' | 'isolated'

export type SpatialRelationship = {
  fromRoomKey: string
  fromRoomName: string
  toRoomKey: string
  toRoomName: string
  kind: SpatialRelationshipKind
  label: string
}

export type SpatialArea = {
  id: string
  label: string
  roomKeys: string[]
  roomNames: string[]
  role: 'main' | 'transition' | 'separate' | 'service'
}

export type HouseSpatialMap = {
  areas: SpatialArea[]
  relationships: SpatialRelationship[]
  transitionRoomNames: string[]
  isolatedAreaNames: string[]
  summary: string
}

export type SpatialAwareness = {
  activeAreaLabel: string | null
  activeRoomNames: string[]
  activeAreaRoomNames: string[]
  distributionLabel: string
  presenceSummary: string | null
  assistantSummary: string | null
}

const normalize = (value: string) => value.toLowerCase().replace(/é/g, 'e').trim()

const isTransitionRoom = (name: string) => {
  const normalized = normalize(name)
  return normalized.includes('entre') || normalized.includes('gang') || normalized.includes('hall')
}

const isServiceRoom = (name: string) => {
  const normalized = normalize(name)
  return normalized.includes('teknisk') || normalized.includes('bod') || normalized.includes('vask')
}

const isSeparateArea = (label: string, roomNames: string[]) => {
  const normalizedLabel = normalize(label)
  return (
    normalizedLabel.includes('hobby') ||
    normalizedLabel.includes('garasje') ||
    normalizedLabel.includes('hybel') ||
    normalizedLabel.includes('anneks') ||
    roomNames.some((name) => normalize(name).includes('hobby'))
  )
}

const getAreaRole = (label: string, roomNames: string[]): SpatialArea['role'] => {
  if (isSeparateArea(label, roomNames)) {
    return 'separate'
  }

  if (roomNames.every(isServiceRoom)) {
    return 'service'
  }

  if (roomNames.some(isTransitionRoom)) {
    return 'transition'
  }

  return 'main'
}

const getRelationshipLabel = (fromName: string, toName: string, kind: SpatialRelationshipKind) => {
  if (kind === 'connected') {
    return `${fromName} flyter naturlig mot ${toName}.`
  }

  if (kind === 'isolated') {
    return `${fromName} ligger mer separat fra ${toName}.`
  }

  if (kind === 'same-location') {
    return `${fromName} og ${toName} ligger i samme lokasjon.`
  }

  return `${fromName} ligger nær ${toName}.`
}

function getRelationshipKind(
  fromName: string,
  toName: string,
  sameAreaRole: SpatialArea['role'],
): SpatialRelationshipKind {
  const from = normalize(fromName)
  const to = normalize(toName)

  if (
    (from.includes('entre') && to.includes('gang')) ||
    (from.includes('gang') && (to.includes('tv') || to.includes('stue') || to.includes('kjokken'))) ||
    (from.includes('kjokken') && (to.includes('tv') || to.includes('stue'))) ||
    (to.includes('entre') && from.includes('gang')) ||
    (to.includes('gang') && (from.includes('tv') || from.includes('stue') || from.includes('kjokken'))) ||
    (to.includes('kjokken') && (from.includes('tv') || from.includes('stue')))
  ) {
    return 'connected'
  }

  if (sameAreaRole === 'separate') {
    return 'isolated'
  }

  return 'adjacent'
}

export function buildHouseSpatialMap(
  rooms: SystemRoomConfig[],
  floors: FloorConfig[],
): HouseSpatialMap {
  const areas: SpatialArea[] = floors.map((floor) => {
    const areaRooms = rooms.filter((room) => room.group === floor.roomGroup)
    const roomNames = areaRooms.map((room) => room.name)

    return {
      id: floor.id,
      label: floor.label,
      roomKeys: areaRooms.map((room) => room.key),
      roomNames,
      role: getAreaRole(floor.label, roomNames),
    }
  })

  const relationships = areas.flatMap((area) => {
    const areaRooms = rooms.filter((room) => area.roomKeys.includes(room.key))

    return areaRooms.slice(0, -1).map((room, index) => {
      const nextRoom = areaRooms[index + 1]
      const kind = getRelationshipKind(room.name, nextRoom.name, area.role)

      return {
        fromRoomKey: room.key,
        fromRoomName: room.name,
        toRoomKey: nextRoom.key,
        toRoomName: nextRoom.name,
        kind,
        label: getRelationshipLabel(room.name, nextRoom.name, kind),
      }
    })
  })

  const transitionRoomNames = rooms.filter((room) => isTransitionRoom(room.name)).map((room) => room.name)
  const isolatedAreaNames = areas.filter((area) => area.role === 'separate').map((area) => area.label)
  const mainArea = areas.find((area) => area.role === 'main' || area.role === 'transition') ?? areas[0]

  return {
    areas,
    relationships,
    transitionRoomNames,
    isolatedAreaNames,
    summary: mainArea
      ? `${mainArea.label} fungerer som hovedområde med ${mainArea.roomNames.length} rom.`
      : 'Spatial foundation er klar når rom og lokasjoner er definert.',
  }
}

export function buildSpatialAwareness({
  spatialMap,
  rooms,
  sensorActiveRoomNames,
  vacuum,
}: {
  spatialMap: HouseSpatialMap
  rooms: Room[]
  sensorActiveRoomNames: string[]
  vacuum: VacuumDevice | null
}): SpatialAwareness {
  const runtimeActiveRoomNames = rooms
    .filter((room) => room.zones.some((zone) => zone.lightsOn) || (room.heatDemand ?? 0) > 25)
    .map((room) => room.name)
  const activeRoomNames = Array.from(new Set([...runtimeActiveRoomNames, ...sensorActiveRoomNames]))
  const areaScores = spatialMap.areas.map((area) => {
    const activeAreaRoomNames = activeRoomNames.filter((roomName) => area.roomNames.includes(roomName))

    return {
      area,
      activeAreaRoomNames,
      score: activeAreaRoomNames.length,
    }
  })
  const activeArea = areaScores.sort((a, b) => b.score - a.score)[0]
  const activeAreaLabel = activeArea && activeArea.score > 0 ? activeArea.area.label : null
  const activeAreaRoomNames = activeArea?.activeAreaRoomNames ?? []
  const activeAreaCount = areaScores.filter((area) => area.score > 0).length
  const distributionLabel =
    activeRoomNames.length === 0
      ? 'Huset virker romlig stabilt.'
      : activeAreaCount <= 1
        ? `Aktiviteten ligger mest i ${activeAreaLabel}.`
        : 'Aktiviteten er spredt mellom flere deler av huset.'
  const assistantArea = vacuum?.currentRoom
    ? spatialMap.areas.find((area) => area.roomNames.includes(vacuum.currentRoom ?? ''))
    : null

  return {
    activeAreaLabel,
    activeRoomNames,
    activeAreaRoomNames,
    distributionLabel,
    presenceSummary:
      activeRoomNames.length > 0
        ? `${distributionLabel} ${activeAreaRoomNames.length > 1 ? `Rommene ${activeAreaRoomNames.join(' og ')} virker aktive sammen.` : ''}`.trim()
        : null,
    assistantSummary:
      vacuum?.cleaning && assistantArea
        ? `${vacuum.model} jobber i ${assistantArea.label}.`
        : vacuum?.cleaning
          ? `${vacuum.model} jobber i ${vacuum.currentRoom ?? 'huset'}.`
          : null,
  }
}

export function getRoomSpatialContext(roomKey: string, spatialMap: HouseSpatialMap) {
  const area = spatialMap.areas.find((candidate) => candidate.roomKeys.includes(roomKey)) ?? null
  const relationships = spatialMap.relationships.filter(
    (relationship) => relationship.fromRoomKey === roomKey || relationship.toRoomKey === roomKey,
  )
  const nearbyRoomNames = relationships.map((relationship) =>
    relationship.fromRoomKey === roomKey ? relationship.toRoomName : relationship.fromRoomName,
  )

  return {
    area,
    relationships,
    nearbyRoomNames,
    summary: area
      ? `${area.roomNames.find((name) => relationships.some((relationship) => relationship.fromRoomName === name || relationship.toRoomName === name)) ?? 'Rommet'} ligger i ${area.label}${nearbyRoomNames.length > 0 ? `, nær ${nearbyRoomNames.slice(0, 2).join(' og ')}` : ''}.`
      : 'Jeg har ikke spatial context for rommet ennå.',
  }
}
