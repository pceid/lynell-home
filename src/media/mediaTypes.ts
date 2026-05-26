export type MediaTrack = {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  filename: string
  mood?: 'calm' | 'focus' | 'morning' | 'evening' | 'energetic' | 'sleep'
  source?: 'local' | 'mock'
  sourceUrl?: string
  sizeBytes?: number
}

export type MediaLibrarySource = 'local' | 'mock' | 'empty'

export type MediaDeviceType =
  | 'localDevice'
  | 'tv'
  | 'googleHome'
  | 'googleHomeGroup'
  | 'sonos'
  | 'bluetoothSpeaker'

export type MediaDeviceAvailability = 'available' | 'foundation' | 'offline' | 'discovered'

export type MediaDeviceCapability =
  | 'localPlayback'
  | 'externalPlayback'
  | 'castFoundation'
  | 'groupPlayback'
  | 'volume'
  | 'roomRouting'

export type MediaDevice = {
  deviceId: string
  name: string
  type: MediaDeviceType
  roomKey?: string
  roomName?: string
  aliases?: string[]
  availability: MediaDeviceAvailability
  online: boolean
  trustState?: 'online' | 'stale' | 'offline' | 'unknown' | string
  lastSeenAt?: string | null
  statusDetail?: string | null
  volume: number
  active: boolean
  capabilities: MediaDeviceCapability[]
}

export type MediaPlayerState = {
  currentTrackId: string | null
  isPlaying: boolean
  volume: number
  activeDeviceId: string
  queueTrackIds: string[]
  elapsed: number
  updatedAt: number
}
