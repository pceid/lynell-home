import type { MediaTrack } from './mediaTypes'

export const localMusicLibraryPath = '/media/music'
export const supportedMusicExtensions = ['.mp3'] as const

export const mockMediaLibrary: MediaTrack[] = [
  {
    id: 'local-calm-house',
    title: 'Rolig hus',
    artist: 'Lynell Local',
    album: 'House Modes',
    duration: 214,
    filename: 'rolig-hus.mp3',
    mood: 'calm',
    source: 'mock',
  },
  {
    id: 'local-morning-light',
    title: 'Morgenlys',
    artist: 'Lynell Local',
    album: 'Daily Flow',
    duration: 188,
    filename: 'morgenlys.mp3',
    mood: 'morning',
    source: 'mock',
  },
  {
    id: 'local-evening-room',
    title: 'Kveld i stuen',
    artist: 'Lynell Local',
    album: 'House Modes',
    duration: 241,
    filename: 'kveld-i-stuen.mp3',
    mood: 'evening',
    source: 'mock',
  },
  {
    id: 'local-focus-line',
    title: 'Stille fokus',
    artist: 'Lynell Local',
    album: 'Quiet Systems',
    duration: 266,
    filename: 'stille-fokus.mp3',
    mood: 'focus',
    source: 'mock',
  },
  {
    id: 'local-energy-kitchen',
    title: 'Kjøkkenpuls',
    artist: 'Lynell Local',
    album: 'Daily Flow',
    duration: 203,
    filename: 'kjokkenpuls.mp3',
    mood: 'energetic',
    source: 'mock',
  },
  {
    id: 'local-sleep-house',
    title: 'Nattlinje',
    artist: 'Lynell Local',
    album: 'Quiet Systems',
    duration: 312,
    filename: 'nattlinje.mp3',
    mood: 'sleep',
    source: 'mock',
  },
]

export function getMockMediaLibrary() {
  return mockMediaLibrary
}

export function getTrackById(library: MediaTrack[], trackId: string | null) {
  return library.find((track) => track.id === trackId) ?? null
}

export function getCalmTrack(library: MediaTrack[]) {
  return library.find((track) => track.mood === 'calm') ?? library[0] ?? null
}

export function getTrackByMood(library: MediaTrack[], mood: NonNullable<MediaTrack['mood']>) {
  return library.find((track) => track.mood === mood) ?? null
}

export function formatTrackDuration(durationSeconds: number) {
  const minutes = Math.floor(durationSeconds / 60)
  const seconds = durationSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
