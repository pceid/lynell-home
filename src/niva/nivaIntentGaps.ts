import type { RuntimeConfig } from '../config/systemConfig'
import type { NivaIntent } from './nivaTypes'

export type NivaIntentGapCategory =
  | 'unknown-intent'
  | 'weak-fallback'
  | 'unsafe-action-prep'
  | 'missing-domain'

export type NivaIntentGap = {
  id: string
  timestamp: number
  userText: string
  activeView: string
  runtimeMode: RuntimeConfig['systemMode']
  suggestedCategory: NivaIntentGapCategory
  responseGiven: string
  resolved: false
  note: string
}

export function createNivaIntentGap({
  timestamp,
  userText,
  activeView,
  runtimeMode,
  suggestedCategory,
  responseGiven,
  note,
}: {
  timestamp: number
  userText: string
  activeView: string
  runtimeMode: RuntimeConfig['systemMode']
  suggestedCategory: NivaIntentGapCategory
  responseGiven: string
  note: string
}): NivaIntentGap {
  return {
    id: `niva-gap-${timestamp}-${Math.abs(hashIntentGapText(userText)).toString(36)}`,
    timestamp,
    userText,
    activeView,
    runtimeMode,
    suggestedCategory,
    responseGiven,
    resolved: false,
    note,
  }
}

export function getNivaIntentGapCategory(intent: NivaIntent, isActionRequest: boolean): NivaIntentGapCategory {
  if (isActionRequest) {
    return 'unsafe-action-prep'
  }

  if (intent === 'unknown') {
    return 'unknown-intent'
  }

  return 'weak-fallback'
}

export function getNivaIntentGapNote(category: NivaIntentGapCategory) {
  if (category === 'unsafe-action-prep') {
    return 'NIVA forstod at brukeren ønsket handling, men kunne ikke lage et trygt forslag.'
  }

  if (category === 'unknown-intent') {
    return 'Legg til intent eller kort svar hvis dette er et vanlig spørsmål.'
  }

  if (category === 'missing-domain') {
    return 'Spørsmålet peker mot et domene NIVA ikke dekker godt nok ennå.'
  }

  return 'Fallback-svaret bør erstattes med mer presis NIVA-mikrotekst.'
}

function hashIntentGapText(value: string) {
  return value.split('').reduce((hash, character) => {
    return (hash << 5) - hash + character.charCodeAt(0)
  }, 0)
}
