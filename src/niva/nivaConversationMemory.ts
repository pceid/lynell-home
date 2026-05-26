import type { RuntimeConfig } from '../config/systemConfig'
import type { NivaIntent, NivaProposedAction } from './nivaTypes'

export type NivaContextFocus =
  | 'runtime'
  | 'room'
  | 'media'
  | 'comfort'
  | 'system'
  | 'weather'
  | 'assistant'
  | 'calendar'
  | 'unknown'

export type NivaSessionMemory = {
  updatedAt: number | null
  recentIntents: NivaIntent[]
  recentQuestions: string[]
  lastRuntimeSummary: string | null
  lastRoomFocus: string | null
  lastMediaFocus: string | null
  lastSystemFocus: string | null
  lastProposedAction: string | null
  activeContextFocus: NivaContextFocus
  activeView: string
  runtimeMode: RuntimeConfig['systemMode']
}

export type NivaSessionMemoryUpdate = {
  timestamp: number
  userText: string
  intent: NivaIntent
  activeView: string
  runtimeMode: RuntimeConfig['systemMode']
  responseGiven: string
  roomFocus?: string | null
  mediaFocus?: string | null
  systemFocus?: string | null
  proposedAction?: NivaProposedAction
}

export function createInitialNivaSessionMemory(
  activeView: string,
  runtimeMode: RuntimeConfig['systemMode'],
): NivaSessionMemory {
  return {
    updatedAt: null,
    recentIntents: [],
    recentQuestions: [],
    lastRuntimeSummary: null,
    lastRoomFocus: null,
    lastMediaFocus: null,
    lastSystemFocus: null,
    lastProposedAction: null,
    activeContextFocus: 'runtime',
    activeView,
    runtimeMode,
  }
}

export function updateNivaSessionMemory(
  currentMemory: NivaSessionMemory,
  update: NivaSessionMemoryUpdate,
): NivaSessionMemory {
  const activeContextFocus = getNivaContextFocus(update)
  const isRuntimeFocus =
    activeContextFocus === 'runtime' ||
    activeContextFocus === 'system' ||
    activeContextFocus === 'comfort'

  return {
    updatedAt: update.timestamp,
    recentIntents: [update.intent, ...currentMemory.recentIntents].slice(0, 6),
    recentQuestions: [update.userText, ...currentMemory.recentQuestions].slice(0, 5),
    lastRuntimeSummary: isRuntimeFocus ? update.responseGiven : currentMemory.lastRuntimeSummary,
    lastRoomFocus: update.roomFocus ?? currentMemory.lastRoomFocus,
    lastMediaFocus: update.mediaFocus ?? currentMemory.lastMediaFocus,
    lastSystemFocus: update.systemFocus ?? (isRuntimeFocus ? activeContextFocus : currentMemory.lastSystemFocus),
    lastProposedAction: update.proposedAction?.summary ?? currentMemory.lastProposedAction,
    activeContextFocus,
    activeView: update.activeView,
    runtimeMode: update.runtimeMode,
  }
}

export function isNivaContextualFollowUp(text: string) {
  const normalizedText = text.toLowerCase()

  return (
    normalizedText.includes('hva trenger') ||
    normalizedText.includes('trenger oppfølging') ||
    normalizedText.includes('trenger oppfolging') ||
    normalizedText.includes('hva bør jeg følge') ||
    normalizedText.includes('hva bor jeg folge') ||
    normalizedText.includes('hva bør jeg se') ||
    normalizedText.includes('hva bor jeg se') ||
    normalizedText.includes('noe å følge') ||
    normalizedText.includes('noe a folge') ||
    normalizedText.includes('hva med det') ||
    normalizedText.includes('og videre')
  )
}

function getNivaContextFocus(update: NivaSessionMemoryUpdate): NivaContextFocus {
  const normalizedText = update.userText.toLowerCase()

  if (update.roomFocus) {
    return 'room'
  }

  if (update.intent === 'media') {
    return 'media'
  }

  if (update.intent === 'vacuum') {
    return 'assistant'
  }

  if (update.intent === 'weather') {
    return 'weather'
  }

  if (update.intent === 'calendar') {
    return 'calendar'
  }

  if (
    normalizedText.includes('komfort') ||
    normalizedText.includes('inneklima') ||
    normalizedText.includes('varmebehov') ||
    normalizedText.includes('energi')
  ) {
    return 'comfort'
  }

  if (
    normalizedText.includes('huset') ||
    normalizedText.includes('runtime') ||
    normalizedText.includes('status') ||
    normalizedText.includes('oppfølging') ||
    normalizedText.includes('oppfolging')
  ) {
    return 'runtime'
  }

  if (update.intent === 'system') {
    return 'system'
  }

  return 'unknown'
}
