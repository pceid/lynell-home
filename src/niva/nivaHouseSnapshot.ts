import type { NetworkConfig } from '../config/systemConfig'
import type { Room } from '../data/rooms'
import type { MediaDevice, MediaPlayerState, MediaTrack } from '../media/mediaTypes'
import type { HousePresence } from '../presence/presenceTypes'
import type { NivaWeatherAwareness } from './nivaTypes'

export type NivaHouseSnapshot = {
  rooms: Room[]
  roomsWithTemperature: Room[]
  roomsWithHeatDemand: Room[]
  activeLightZones: Array<{
    roomName: string
    zoneName: string
    brightness: number
  }>
  system: {
    homeStatus: string
    systemMode: string
    bridgeStatusLabel: string
    bridgeReady: boolean
    connectionMode: NetworkConfig['connectionMode']
  }
  media: {
    player: MediaPlayerState
    currentTrack: MediaTrack | null
    activeDevice: MediaDevice | null
  }
  weather: NivaWeatherAwareness
  calendar: {
    todayCount: number
    nextEventText: string | null
  }
  presence: HousePresence
  diagnostics: {
    roomCount: number
    roomsWithTemperatureCount: number
    roomsWithLightDataCount: number
    roomsWithHeatDemandCount: number
    historyPointCount: number
  }
}

export function buildNivaHouseSnapshot({
  rooms,
  homeStatus,
  systemMode,
  bridgeStatusLabel,
  bridgeReady,
  connectionMode,
  mediaPlayer,
  currentMediaTrack,
  activeMediaDevice,
  weatherAwareness,
  todayCount,
  nextEventText,
  presence,
  historyPointCount,
}: {
  rooms: Room[]
  homeStatus: string
  systemMode: string
  bridgeStatusLabel: string
  bridgeReady: boolean
  connectionMode: NetworkConfig['connectionMode']
  mediaPlayer: MediaPlayerState
  currentMediaTrack: MediaTrack | null
  activeMediaDevice: MediaDevice | null
  weatherAwareness: NivaWeatherAwareness
  todayCount: number
  nextEventText: string | null
  presence: HousePresence
  historyPointCount: number
}): NivaHouseSnapshot {
  const roomsWithTemperature = rooms.filter((room) => Number.isFinite(room.temperature))
  const roomsWithHeatDemand = rooms.filter(
    (room) => typeof room.heatDemand === 'number' && Number.isFinite(room.heatDemand),
  )
  const activeLightZones = rooms.flatMap((room) =>
    room.zones
      .filter((zone) => zone.lightsOn)
      .map((zone) => ({
        roomName: room.name,
        zoneName: zone.name,
        brightness: zone.brightness,
      })),
  )

  return {
    rooms,
    roomsWithTemperature,
    roomsWithHeatDemand,
    activeLightZones,
    system: {
      homeStatus,
      systemMode,
      bridgeStatusLabel,
      bridgeReady,
      connectionMode,
    },
    media: {
      player: mediaPlayer,
      currentTrack: currentMediaTrack,
      activeDevice: activeMediaDevice,
    },
    weather: weatherAwareness,
    calendar: {
      todayCount,
      nextEventText,
    },
    presence,
    diagnostics: {
      roomCount: rooms.length,
      roomsWithTemperatureCount: roomsWithTemperature.length,
      roomsWithLightDataCount: rooms.filter((room) => room.zones.length > 0).length,
      roomsWithHeatDemandCount: roomsWithHeatDemand.length,
      historyPointCount,
    },
  }
}
