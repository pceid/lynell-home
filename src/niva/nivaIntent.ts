import type { NivaIntent } from './nivaTypes'

export function getNivaIntent(text: string): NivaIntent {
  const normalizedText = text.toLowerCase()

  if (
    normalizedText.includes('musikk') ||
    normalizedText.includes('media') ||
    normalizedText.includes('spiller nå') ||
    normalizedText.includes('spill ') ||
    normalizedText.includes('pause musikken') ||
    normalizedText.includes('rolig') ||
    normalizedText.includes('kveldsmusikk') ||
    normalizedText.includes('fokusmusikk') ||
    normalizedText.includes('nattmusikk')
  ) {
    return 'media'
  }

  if (
    normalizedText.includes('robot') ||
    normalizedText.includes('støvsug') ||
    normalizedText.includes('stovsug') ||
    normalizedText.includes('dream') ||
    normalizedText.includes('d20')
  ) {
    return 'vacuum'
  }

  if (
    /\bute\b/.test(normalizedText) ||
    normalizedText.includes('vær') ||
    normalizedText.includes('vaer') ||
    normalizedText.includes('vind') ||
    normalizedText.includes('nedbør') ||
    normalizedText.includes('nedbor')
  ) {
    return 'weather'
  }

  if (
    normalizedText.includes('kalender') ||
    normalizedText.includes('aktivitet') ||
    normalizedText.includes('i dag') ||
    normalizedText.includes('i morgen') ||
    normalizedText.includes('legg inn')
  ) {
    return 'calendar'
  }

  if (
    normalizedText.includes('scene') ||
    normalizedText.includes('stemning') ||
    normalizedText.includes('modus')
  ) {
    return 'scene'
  }

  if (
    normalizedText.includes('lys') ||
    normalizedText.includes('lyset') ||
    normalizedText.includes('lampe') ||
    normalizedText.includes('demp') ||
    normalizedText.includes('dim') ||
    normalizedText.includes('skru av') ||
    normalizedText.includes('slå av') ||
    normalizedText.includes('sla av') ||
    /\b\d{1,3}\s*%/.test(normalizedText)
  ) {
    return 'light'
  }

  if (
    normalizedText.includes('varmt') ||
    normalizedText.includes('varmere') ||
    normalizedText.includes('kald') ||
    normalizedText.includes('kaldere') ||
    normalizedText.includes('temperatur') ||
    normalizedText.includes('klima') ||
    normalizedText.includes('varme') ||
    normalizedText.includes('grader') ||
    normalizedText.includes('grad') ||
    normalizedText.includes('senk ') ||
    normalizedText.includes('øk ') ||
    /\btil\s+\d{1,2}(?:[,.]\d)?\b/.test(normalizedText)
  ) {
    return 'climate'
  }

  if (
    normalizedText.includes('bridge') ||
    normalizedText.includes('tilkoblet') ||
    normalizedText.includes('hendelse') ||
    normalizedText.includes('huset') ||
    normalizedText.includes('status') ||
    normalizedText.includes('hva skjer hjemme') ||
    normalizedText.includes('hva skjer i huset') ||
    normalizedText.includes('er noe galt') ||
    normalizedText.includes('hva er galt') ||
    normalizedText.includes('reagerte ikke')
  ) {
    return 'system'
  }

  return 'unknown'
}
