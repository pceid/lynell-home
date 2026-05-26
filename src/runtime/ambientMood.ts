import type { Room } from '../data/rooms'
import type { VacuumDevice } from '../integrations/vacuum/vacuumTypes'
import type { MediaPlayerState, MediaTrack } from '../media/mediaTypes'
import type { NivaWeatherAwareness } from '../niva/nivaTypes'
import type { HousePresence } from '../presence/presenceTypes'
import type { HouseComfortInsight } from './comfortEnergy'
import type { HouseRhythmInsight } from './dailyRhythm'
import type { OccupancyFlowInsight } from './occupancyFlow'

export type AmbientMood =
  | 'calm'
  | 'cozy'
  | 'focused'
  | 'quiet'
  | 'active'
  | 'evening'
  | 'night'
  | 'rainy'
  | 'bright'
  | 'resting'

export type RoomAmbienceInsight = {
  roomKey: string
  roomName: string
  mood: AmbientMood
  label: string
  summary: string
  nivaLine: string
}

export type AmbientMoodInsight = {
  mood: AmbientMood
  label: string
  summary: string
  homeLine: string | null
  nivaSummary: string
  roomAmbiences: RoomAmbienceInsight[]
  mediaLine: string | null
  weatherLine: string | null
  confidenceLine: string | null
}

const moodLabels: Record<AmbientMood, string> = {
  calm: 'Rolig',
  cozy: 'Lun',
  focused: 'Fokusert',
  quiet: 'Stille',
  active: 'Aktiv',
  evening: 'Kveld',
  night: 'Natt',
  rainy: 'Regndempet',
  bright: 'Lyst',
  resting: 'Hviler',
}

function averageBrightness(room: Room) {
  if (room.zones.length === 0) {
    return 0
  }

  return room.zones.reduce((sum, zone) => sum + zone.brightness, 0) / room.zones.length
}

function isBedroomLike(roomName: string) {
  const normalized = roomName.toLowerCase()
  return normalized.includes('soverom') || normalized.includes('sov') || normalized.includes('natt')
}

function isFocusLike(roomName: string) {
  const normalized = roomName.toLowerCase()
  return normalized.includes('hobby') || normalized.includes('kontor') || normalized.includes('arbeid')
}

function getMediaLine(mediaPlayer: MediaPlayerState, currentTrack: MediaTrack | null) {
  if (!mediaPlayer.isPlaying || !currentTrack) {
    return null
  }

  if (currentTrack.mood === 'focus') {
    return 'Media trekker stemningen litt mot fokus.'
  }

  if (currentTrack.mood === 'calm' || currentTrack.mood === 'evening' || currentTrack.mood === 'sleep') {
    return 'Dempet media støtter stemningen.'
  }

  if (currentTrack.mood === 'energetic') {
    return 'Media gir huset litt mer energi.'
  }

  return null
}

function getWeatherLine(weather: NivaWeatherAwareness, hour: number) {
  if (!weather.current) {
    return null
  }

  if (weather.current.rainExpected && (hour >= 17 || hour < 8)) {
    return 'Regnværet ute gjør huset mer dempet.'
  }

  if (weather.current.windSpeed >= 10) {
    return 'Vinden ute gir en litt mer markert ramme rundt huset.'
  }

  if (weather.current.temperature <= 0 && (hour >= 18 || hour < 8)) {
    return 'Det kalde været ute gjør innekomforten mer tydelig.'
  }

  return null
}

function getHouseMood({
  hour,
  globalMode,
  presence,
  occupancy,
  mediaPlayer,
  currentTrack,
  weather,
  averageHouseBrightness,
}: {
  hour: number
  globalMode: string
  presence: HousePresence
  occupancy: OccupancyFlowInsight
  mediaPlayer: MediaPlayerState
  currentTrack: MediaTrack | null
  weather: NivaWeatherAwareness
  averageHouseBrightness: number
}): AmbientMood {
  const mode = globalMode.toLowerCase()

  if (mode.includes('borte')) {
    return 'resting'
  }

  if (hour >= 23 || hour < 6 || presence.state === 'night') {
    return 'night'
  }

  if (weather.current?.rainExpected && (presence.state === 'quietEvening' || occupancy.flowState === 'settling')) {
    return 'rainy'
  }

  if (mediaPlayer.isPlaying && currentTrack?.mood === 'focus') {
    return 'focused'
  }

  if (hour >= 18 && (presence.state === 'cozy' || presence.state === 'evening' || presence.state === 'quietEvening')) {
    return 'cozy'
  }

  if (occupancy.flowState === 'spread' || presence.state === 'active' || presence.state === 'activeAfternoon') {
    return 'active'
  }

  if (averageHouseBrightness >= 55 && hour >= 7 && hour < 18) {
    return 'bright'
  }

  if (hour >= 18) {
    return 'evening'
  }

  if (presence.state === 'darkQuiet' || occupancy.flowState === 'quiet') {
    return 'quiet'
  }

  return 'calm'
}

function getHouseSummary(mood: AmbientMood, occupancy: OccupancyFlowInsight, comfort: HouseComfortInsight) {
  if (mood === 'resting') {
    return 'Huset virker tilbaketrukket og stille.'
  }

  if (mood === 'night') {
    return 'Huset virker stille for natten.'
  }

  if (mood === 'rainy') {
    return 'Stemningen virker dempet av været ute.'
  }

  if (mood === 'cozy') {
    return 'Huset føles lunt akkurat nå.'
  }

  if (mood === 'focused') {
    return 'Stemningen virker fokusert og samlet.'
  }

  if (mood === 'active') {
    return occupancy.primaryZone
      ? `Det virker lyst og aktivt rundt ${occupancy.primaryZone.label}.`
      : 'Huset føles aktivt, men fortsatt kontrollert.'
  }

  if (mood === 'bright') {
    return 'Huset føles lyst og våkent.'
  }

  if (mood === 'evening') {
    return 'Det føles som en stille kveld hjemme.'
  }

  if (mood === 'quiet') {
    return 'Huset virker stille og dempet.'
  }

  if (comfort.state === 'comfortable') {
    return 'Huset virker komfortabelt.'
  }

  return 'Huset virker stabilt akkurat nå.'
}

function getRoomMood({
  room,
  hour,
  activeRoomNames,
  mediaPlayer,
  currentTrack,
}: {
  room: Room
  hour: number
  activeRoomNames: Set<string>
  mediaPlayer: MediaPlayerState
  currentTrack: MediaTrack | null
}): AmbientMood {
  const brightness = averageBrightness(room)
  const hasLights = room.zones.some((zone) => zone.lightsOn)
  const heatActive = typeof room.heatDemand === 'number' && room.heatDemand >= 35
  const active = activeRoomNames.has(room.name) || hasLights || heatActive

  if (!active && (hour >= 23 || hour < 6 || isBedroomLike(room.name))) {
    return 'night'
  }

  if (active && mediaPlayer.isPlaying && currentTrack?.mood === 'focus' && isFocusLike(room.name)) {
    return 'focused'
  }

  if (active && isFocusLike(room.name)) {
    return 'focused'
  }

  if (active && brightness >= 55) {
    return 'active'
  }

  if (active && hour >= 18 && brightness > 0 && brightness < 55) {
    return 'cozy'
  }

  if (active) {
    return 'calm'
  }

  if (brightness >= 55) {
    return 'bright'
  }

  return 'quiet'
}

function getRoomSummary(roomName: string, mood: AmbientMood) {
  if (mood === 'night') {
    return `${roomName} virker mørkt og stille.`
  }

  if (mood === 'focused') {
    return `${roomName} føles fokusert.`
  }

  if (mood === 'active') {
    return `${roomName} er fortsatt aktivt.`
  }

  if (mood === 'cozy') {
    return `${roomName} virker lunt.`
  }

  if (mood === 'bright') {
    return `${roomName} virker lyst.`
  }

  if (mood === 'calm') {
    return `${roomName} virker stille.`
  }

  return `${roomName} virker stille.`
}

export function buildAmbientMoodInsight({
  rooms,
  now,
  weather,
  presence,
  occupancy,
  comfort,
  rhythm,
  mediaPlayer,
  currentTrack,
  globalMode,
  vacuum,
  confidenceLevel,
}: {
  rooms: Room[]
  now: Date
  weather: NivaWeatherAwareness
  presence: HousePresence
  occupancy: OccupancyFlowInsight
  comfort: HouseComfortInsight
  rhythm: HouseRhythmInsight
  mediaPlayer: MediaPlayerState
  currentTrack: MediaTrack | null
  globalMode: string
  vacuum: VacuumDevice | null
  confidenceLevel: 'høy' | 'middels' | 'lav'
}): AmbientMoodInsight {
  const hour = now.getHours()
  const activeRoomNames = new Set([
    ...presence.activeRoomNames,
    ...occupancy.activeZones.flatMap((zone) => zone.activeRoomNames),
    ...rhythm.activeRoomsHour.map((room) => room.roomName),
    ...(vacuum?.cleaning && vacuum.currentRoom ? [vacuum.currentRoom] : []),
  ])
  const roomAmbiences = rooms.map((room): RoomAmbienceInsight => {
    const mood = getRoomMood({
      room,
      hour,
      activeRoomNames,
      mediaPlayer,
      currentTrack,
    })
    const summary = getRoomSummary(room.name, mood)

    return {
      roomKey: room.key,
      roomName: room.name,
      mood,
      label: moodLabels[mood],
      summary,
      nivaLine: summary,
    }
  })
  const averageHouseBrightness =
    rooms.length > 0
      ? rooms.reduce((sum, room) => sum + averageBrightness(room), 0) / rooms.length
      : 0
  const mood = getHouseMood({
    hour,
    globalMode,
    presence,
    occupancy,
    mediaPlayer,
    currentTrack,
    weather,
    averageHouseBrightness,
  })
  const summary = getHouseSummary(mood, occupancy, comfort)
  const mediaLine = getMediaLine(mediaPlayer, currentTrack)
  const weatherLine = getWeatherLine(weather, hour)
  const assistantLine = vacuum?.cleaning
    ? vacuum.currentRoom
      ? `Det er lav aktivitet fra assistenten i ${vacuum.currentRoom}.`
      : 'Det er lav aktivitet fra en assistent akkurat nå.'
    : null
  const confidenceLine =
    confidenceLevel === 'lav'
      ? 'Stemningen bygger på begrensede ferske signaler.'
      : confidenceLevel === 'middels'
        ? 'Noe av stemningsbildet bygger på siste kjente status.'
        : null
  const homeLine = confidenceLevel === 'lav' ? null : summary

  return {
    mood,
    label: moodLabels[mood],
    summary,
    homeLine,
    nivaSummary: [summary, weatherLine, mediaLine, assistantLine, confidenceLine].filter(Boolean).join(' '),
    roomAmbiences,
    mediaLine,
    weatherLine,
    confidenceLine,
  }
}
