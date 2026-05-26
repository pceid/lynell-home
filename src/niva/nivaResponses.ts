import type { NivaCoreState } from '../components/NivaCore'
import type { NivaIntent } from './nivaTypes'

type NivaPromptView = 'home' | 'rooms' | 'lights' | 'climate' | 'manager' | string

export function getNivaResponseForIntent(intent: NivaIntent | undefined) {
  if (intent === 'calendar') {
    return 'Jeg kan gjøre dette om til et kalenderforslag når du bekrefter.'
  }

  if (intent === 'scene') {
    return 'Jeg har forberedt et sceneforslag. Jeg utfører ikke noe uten bekreftelse.'
  }

  if (intent === 'climate') {
    return 'Jeg kan hjelpe med klima, men endringer krever bekreftelse først.'
  }

  if (intent === 'light') {
    return 'Jeg kan forberede et lysforslag. Selve utføringen krever bekreftelse.'
  }

  if (intent === 'media') {
    return 'Media er en del av huset nå. Jeg kan styre lokal avspilling i denne første versjonen.'
  }

  if (intent === 'vacuum') {
    return 'Robotstøvsuger er lagt inn som lokal integrasjonsstruktur. Jeg kan gi status og lage et mock-forslag.'
  }

  if (intent === 'weather' || intent === 'system') {
    return 'Jeg følger systemstatus og bruker data Lynell allerede har.'
  }

  return 'Jeg er ikke helt sikker på hva du mener. Si gjerne rommet og hva du vil endre, så lager jeg et trygt forslag.'
}

export function getNivaVisualState({
  hasSuggestion,
  hasAlert,
  isProcessing,
}: {
  hasSuggestion: boolean
  hasAlert: boolean
  isProcessing: boolean
}): NivaCoreState {
  if (isProcessing) {
    return 'thinking'
  }

  if (hasSuggestion || hasAlert) {
    return 'alert'
  }

  return 'idle'
}

export function getNivaQuickPrompts(activeMainView: NivaPromptView) {
  if (activeMainView === 'rooms') {
    return ['Hvordan er det her?', 'Hva bør jeg gjøre?']
  }

  if (activeMainView === 'lights') {
    return ['Er noen lys på?', 'Slå av lys']
  }

  if (activeMainView === 'climate') {
    return ['Hvorfor varmer det?', 'Gjør det litt varmere']
  }

  if (activeMainView === 'media') {
    return ['Hva spiller nå?', 'Spill noe rolig', 'Pause musikken']
  }

  if (activeMainView === 'manager') {
    return ['Fungerer systemet?', 'Hva er galt?']
  }

  return ['Hvordan har huset det?', 'Hva er galt?']
}
