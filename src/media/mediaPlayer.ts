import type { MediaDevice, MediaPlayerState, MediaTrack } from './mediaTypes'

export function createInitialMediaPlayerState(
  library: MediaTrack[],
  devices: MediaDevice[],
): MediaPlayerState {
  const activeDevice = devices.find((device) => device.active) ?? devices[0]

  return {
    currentTrackId: library[0]?.id ?? null,
    isPlaying: false,
    volume: activeDevice?.volume ?? 42,
    activeDeviceId: activeDevice?.deviceId ?? 'local-speaker',
    queueTrackIds: library.map((track) => track.id),
    elapsed: 0,
    updatedAt: Date.now(),
  }
}

export function playMediaTrack(state: MediaPlayerState, trackId: string): MediaPlayerState {
  return {
    ...state,
    currentTrackId: trackId,
    isPlaying: true,
    elapsed: state.currentTrackId === trackId ? state.elapsed : 0,
    updatedAt: Date.now(),
  }
}

export function toggleMediaPlayback(state: MediaPlayerState): MediaPlayerState {
  return {
    ...state,
    isPlaying: !state.isPlaying,
    updatedAt: Date.now(),
  }
}

export function pauseMediaPlayback(state: MediaPlayerState): MediaPlayerState {
  return {
    ...state,
    isPlaying: false,
    updatedAt: Date.now(),
  }
}

export function playMedia(state: MediaPlayerState): MediaPlayerState {
  return {
    ...state,
    isPlaying: true,
    updatedAt: Date.now(),
  }
}

export function skipMediaTrack(state: MediaPlayerState, direction: 'next' | 'previous') {
  if (state.queueTrackIds.length === 0) {
    return state
  }

  const currentIndex = Math.max(0, state.queueTrackIds.indexOf(state.currentTrackId ?? ''))
  const offset = direction === 'next' ? 1 : -1
  const nextIndex = (currentIndex + offset + state.queueTrackIds.length) % state.queueTrackIds.length

  return {
    ...state,
    currentTrackId: state.queueTrackIds[nextIndex],
    isPlaying: true,
    elapsed: 0,
    updatedAt: Date.now(),
  }
}

export function setMediaVolume(state: MediaPlayerState, volume: number): MediaPlayerState {
  return {
    ...state,
    volume: Math.max(0, Math.min(100, volume)),
    updatedAt: Date.now(),
  }
}

export function setMediaOutputDevice(
  state: MediaPlayerState,
  devices: MediaDevice[],
  deviceId: string,
): MediaPlayerState {
  const device = devices.find((candidate) => candidate.deviceId === deviceId)

  return {
    ...state,
    activeDeviceId: deviceId,
    volume: device?.volume ?? state.volume,
    updatedAt: Date.now(),
  }
}

export function tickMediaProgress(
  state: MediaPlayerState,
  currentTrackDuration: number | null,
  deltaSeconds = 1,
): { state: MediaPlayerState; completed: boolean } {
  if (!state.isPlaying || !currentTrackDuration) {
    return { state, completed: false }
  }

  const nextElapsed = Math.min(currentTrackDuration, state.elapsed + deltaSeconds)

  return {
    state: {
      ...state,
      elapsed: nextElapsed,
      updatedAt: Date.now(),
    },
    completed: nextElapsed >= currentTrackDuration,
  }
}
