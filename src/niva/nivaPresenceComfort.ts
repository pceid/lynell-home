import type { HousePresence, HousePresenceState } from '../presence/presenceTypes'
import type { HouseComfortInsight } from '../runtime/comfortEnergy'

export type NivaHomeAtmosphereState =
  | 'quiet'
  | 'calm'
  | 'active'
  | 'focused'
  | 'windingDown'
  | 'mixedComfort'
  | 'needsAttention'

export type NivaHomeAtmosphereTone = 'quiet' | 'calm' | 'active' | 'watch'

export type NivaPresenceComfortSignals = {
  presenceState: HousePresenceState
  comfortState: HouseComfortInsight['state']
  activeRoomCount: number
  lightsOnCount: number
  mediaActive: boolean
  runtimeStable: boolean
  quietMode: boolean
  roomsToWatchCount: number
  highHeatRoomCount: number
}

export type NivaPresenceComfortSummary = {
  state: NivaHomeAtmosphereState
  tone: NivaHomeAtmosphereTone
  label: string
  summary: string
  nivaLine: string
  homeLine: string
  followUpLine: string | null
  heuristics: string[]
  signals: NivaPresenceComfortSignals
}

export type NivaPresenceComfortInput = {
  presence: HousePresence | null | undefined
  comfort: HouseComfortInsight | null | undefined
  mediaPlaying: boolean
  lightsOnCount: number
  runtimeConfidenceLevel: 'høy' | 'middels' | 'lav'
  runtimeReady: boolean
  quietMode: boolean
}

const quietPresenceStates: HousePresenceState[] = [
  'quiet',
  'quietEvening',
  'darkQuiet',
  'rainQuietEvening',
  'night',
  'away',
  'empty',
]

const activePresenceStates: HousePresenceState[] = [
  'active',
  'activeAfternoon',
  'lateActivity',
  'cozy',
]

function isQuietPresence(state: HousePresenceState) {
  return quietPresenceStates.includes(state)
}

function isActivePresence(state: HousePresenceState) {
  return activePresenceStates.includes(state)
}

function getAtmosphereCopy(
  state: NivaHomeAtmosphereState,
  signals: NivaPresenceComfortSignals,
) {
  const hasActiveRooms = signals.activeRoomCount > 0
  const roomText =
    signals.activeRoomCount === 1
      ? 'ett rom'
      : signals.activeRoomCount > 1
        ? 'noen rom'
        : 'rommene'

  if (state === 'needsAttention') {
    return {
      label: 'Needs attention',
      summary: 'Hjemmet er aktivt, men noen signaler trenger oppfølging.',
      nivaLine: 'Hjemmet trenger litt oppmerksomhet akkurat nå.',
      homeLine: 'Noen signaler trenger oppfølging.',
      followUpLine: 'Jeg ville startet med systemstatus og komfortbildet.',
    }
  }

  if (state === 'mixedComfort') {
    return {
      label: 'Mixed comfort',
      summary: 'Hjemmet er stabilt, men komforten er ikke helt jevn i alle rom.',
      nivaLine: 'Hjemmet er stabilt, men noen rom trenger litt oppmerksomhet for jevn komfort.',
      homeLine: 'Komforten er litt ujevn i noen rom.',
      followUpLine: 'Jeg ville fulgt med på rommene som ligger utenfor komfortbildet.',
    }
  }

  if (state === 'active') {
    return {
      label: 'Active',
      summary: `Det er aktivitet i ${roomText}, mens systemene er stabile.`,
      nivaLine: `Det er aktivitet i ${roomText}, men systemene er stabile.`,
      homeLine: hasActiveRooms ? 'Aktiviteten er samlet i huset.' : 'Hjemmet er våkent og aktivt.',
      followUpLine: signals.mediaActive ? 'Media bidrar til at huset føles mer aktivt.' : null,
    }
  }

  if (state === 'focused') {
    return {
      label: 'Focused',
      summary: 'Hjemmet er fokusert og samlet akkurat nå.',
      nivaLine: 'Hjemmet er fokusert og samlet akkurat nå.',
      homeLine: 'Hjemmet er fokusert.',
      followUpLine: signals.mediaActive ? 'Media er en del av den aktive stemningen.' : null,
    }
  }

  if (state === 'windingDown') {
    return {
      label: 'Winding down',
      summary: 'Hjemmet roer seg ned i et lavere tempo.',
      nivaLine: 'Hjemmet roer seg ned i et lavere tempo.',
      homeLine: 'Hjemmet begynner å roe seg.',
      followUpLine: 'Jeg ville bare fulgt med hvis komforten endrer seg.',
    }
  }

  if (state === 'quiet') {
    return {
      label: 'Quiet',
      summary: 'Det er lite aktivitet akkurat nå.',
      nivaLine: 'Hjemmet er stille akkurat nå.',
      homeLine: 'Hjemmet er stille.',
      followUpLine: 'Jeg ser ikke noe tydelig som krever oppfølging.',
    }
  }

  return {
    label: 'Calm',
    summary: 'Hjemmet er stabilt akkurat nå.',
    nivaLine: 'Hjemmet er stabilt akkurat nå.',
    homeLine: 'Hjemmet er stabilt.',
    followUpLine: signals.comfortState === 'comfortable' ? 'Komfortbildet ser jevnt ut.' : null,
  }
}

export function createFallbackNivaPresenceComfortSummary(
  reason = 'missing-runtime-context',
): NivaPresenceComfortSummary {
  return {
    state: 'calm',
    tone: 'calm',
    label: 'Calm',
    summary: 'Hjemmet forbereder status akkurat nå.',
    nivaLine: 'Jeg henter inn husfølelsen på nytt akkurat nå.',
    homeLine: 'Hjemmet forbereder status.',
    followUpLine: 'Jeg ville ventet på neste runtime-oppdatering.',
    heuristics: [`fallback:${reason}`],
    signals: {
      presenceState: 'quiet',
      comfortState: 'missing',
      activeRoomCount: 0,
      lightsOnCount: 0,
      mediaActive: false,
      runtimeStable: false,
      quietMode: false,
      roomsToWatchCount: 0,
      highHeatRoomCount: 0,
    },
  }
}

export function buildNivaPresenceComfortSummary({
  presence,
  comfort,
  mediaPlaying,
  lightsOnCount,
  runtimeConfidenceLevel,
  runtimeReady,
  quietMode,
}: NivaPresenceComfortInput): NivaPresenceComfortSummary {
  if (!presence || !comfort) {
    return createFallbackNivaPresenceComfortSummary('missing-presence-or-comfort')
  }

  const roomsToWatchCount = Array.isArray(comfort.roomsToWatch) ? comfort.roomsToWatch.length : 0
  const highHeatRoomCount = Array.isArray(comfort.highHeatRooms) ? comfort.highHeatRooms.length : 0
  const runtimeStable = runtimeReady && runtimeConfidenceLevel !== 'lav'
  const activeRoomCount = Array.isArray(presence.activeRoomNames) ? presence.activeRoomNames.length : 0
  const presenceState = presence.state ?? 'quiet'
  const comfortState = comfort.state ?? 'missing'
  const signals: NivaPresenceComfortSignals = {
    presenceState,
    comfortState,
    activeRoomCount,
    lightsOnCount: Number.isFinite(lightsOnCount) ? Math.max(0, lightsOnCount) : 0,
    mediaActive: Boolean(mediaPlaying),
    runtimeStable,
    quietMode,
    roomsToWatchCount,
    highHeatRoomCount,
  }
  const heuristics: string[] = []
  let state: NivaHomeAtmosphereState = 'calm'

  if (!runtimeStable || comfortState === 'highLoad') {
    state = 'needsAttention'
    heuristics.push(!runtimeStable ? 'runtime-confidence-watch' : 'comfort-high-load')
  } else if (comfortState === 'watch' || roomsToWatchCount >= 2) {
    state = 'mixedComfort'
    heuristics.push('comfort-watch')
  } else if (presenceState === 'focus') {
    state = 'focused'
    heuristics.push('presence-focus')
  } else if (
    presenceState === 'evening' ||
    presenceState === 'quietEvening' ||
    presenceState === 'rainQuietEvening' ||
    presenceState === 'night'
  ) {
    state = mediaPlaying || activeRoomCount > 0 ? 'windingDown' : 'quiet'
    heuristics.push('evening-quiet-rhythm')
  } else if (mediaPlaying || activeRoomCount >= 2 || isActivePresence(presenceState)) {
    state = 'active'
    heuristics.push(mediaPlaying ? 'media-active' : 'room-activity')
  } else if (quietMode || (isQuietPresence(presenceState) && lightsOnCount <= 1)) {
    state = 'quiet'
    heuristics.push('quiet-mode-or-low-activity')
  } else {
    heuristics.push('stable-default')
  }

  const tone: NivaHomeAtmosphereTone =
    state === 'needsAttention' || state === 'mixedComfort'
      ? 'watch'
      : state === 'active' || state === 'focused'
        ? 'active'
        : state === 'quiet'
          ? 'quiet'
          : 'calm'
  const copy = getAtmosphereCopy(state, signals)

  return {
    state,
    tone,
    ...copy,
    heuristics,
    signals,
  }
}
