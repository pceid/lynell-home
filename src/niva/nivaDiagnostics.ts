export type NivaDiagnosticInsight = {
  hasIssue: boolean
  key: string
  message: string
  response: string
}

export function getNivaDiagnosticInsight({
  bridgeReachable,
  runtimeConfigReceived,
  bridgeError,
  latestRuntimeError,
  latestClimateError,
  systemMode,
  activeMainView,
  feedbackStrategyLabel,
}: {
  bridgeReachable: boolean | null
  runtimeConfigReceived?: boolean
  bridgeError?: string | null
  latestRuntimeError?: string | null
  latestClimateError?: string | null
  systemMode: 'live' | 'demo' | 'developer' | 'simulate'
  activeMainView: string
  feedbackStrategyLabel: string
}): NivaDiagnosticInsight {
  const latestError = latestRuntimeError ?? latestClimateError ?? bridgeError ?? ''
  const hasKnxUnavailable =
    latestError.toLowerCase().includes('knx') ||
    latestError.toLowerCase().includes('feedback') ||
    latestError.toLowerCase().includes('timeout')

  if (bridgeReachable === false) {
    return {
      key: 'bridge-unreachable',
      hasIssue: true,
      message: 'Oppdaterer tilkobling til Lynell.',
      response:
        'Jeg oppdaterer tilkoblingen til Lynell. Viser sist kjente data imens; sjekk bridge, nettverk og at enheten er på samme LAN hvis dette varer.',
    }
  }

  if (bridgeReachable === true && !runtimeConfigReceived) {
    return {
      key: 'runtime-config-missing',
      hasIssue: true,
      message: 'Systemet er startet, men ikke helt klart.',
      response:
        'Systemet er startet, men ikke helt klart. Åpne appen, vent noen sekunder, og sjekk Diagnose for at runtime-config er mottatt av bridge.',
    }
  }

  if (hasKnxUnavailable) {
    return {
      key: 'knx-unavailable',
      hasIssue: true,
      message: 'Jeg får ikke data fra huset akkurat nå.',
      response:
        'Jeg får ikke data fra huset akkurat nå. Sjekk at KNX-gateway/bridge kjører, og se om siste feil eller timeout gjentar seg i Diagnose.',
    }
  }

  if (
    systemMode === 'live' &&
    (activeMainView === 'lights' || activeMainView === 'climate') &&
    feedbackStrategyLabel === 'off'
  ) {
    return {
      key: 'feedback-off',
      hasIssue: true,
      message: 'Live oppdateringer er ikke aktive i denne visningen.',
      response:
        'Live oppdateringer er ikke aktive akkurat her. Gå til Lys eller Klima på en etasje med aktive rom, eller sjekk at riktig driftsmodus og connection mode er valgt.',
    }
  }

  if (bridgeReachable === null) {
    return {
      key: 'health-pending',
      hasIssue: false,
      message: 'Oppdaterer runtime-status.',
      response: 'Jeg oppdaterer runtime-status. Prøv igjen om noen sekunder hvis verdiene ikke er ferske ennå.',
    }
  }

  return {
    key: 'system-ok',
    hasIssue: false,
    message:
      bridgeReachable === true
        ? 'Systemstatus ser stabil ut fra Diagnose.'
        : 'Jeg har ingen tydelig systemfeil akkurat nå.',
    response:
      bridgeReachable === true
        ? 'Systemet ser stabilt ut. Appen når bridge, og jeg ser ingen aktiv feil i Diagnose akkurat nå.'
        : 'Jeg har ingen tydelig systemfeil akkurat nå.',
  }
}
