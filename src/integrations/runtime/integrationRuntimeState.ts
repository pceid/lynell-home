import { formatAmbientConnectionState, formatAmbientReadinessState } from '../../niva/ambientLanguage'

export type RuntimeStateOrigin =
  | 'simulated'
  | 'localRuntime'
  | 'bridgeRuntime'
  | 'cloudRuntime'
  | 'persistedFallback'
  | 'foundation'
  | 'mixed'

export type IntegrationRuntimeStatus =
  | 'foundation'
  | 'partiallyConnected'
  | 'connected'
  | 'degraded'
  | 'offline'
  | 'fallback'

export type RuntimeConnectionState =
  | 'connected'
  | 'degraded'
  | 'offline'
  | 'demo'
  | 'developer'
  | 'foundation'
  | 'fallback'
  | 'loading'

export type RuntimeReadinessState =
  | 'live'
  | 'ready'
  | 'limited'
  | 'missingConfig'
  | 'disabled'
  | 'diagnostic'

export type RuntimeDeviceDomain =
  | 'knx'
  | 'dreame'
  | 'cast'
  | 'media'
  | 'mqtt'
  | 'weather'
  | 'assistant'
  | 'system'
  | 'future'

export type RuntimeDeviceContract = {
  id: string
  name: string
  domain: RuntimeDeviceDomain
  provider: string
  connectionState: RuntimeConnectionState
  readiness: RuntimeReadinessState
  capabilities: string[]
  derivedState: boolean
  diagnostics: string[]
  lastUpdatedAt: string | null
  summary: string
}

export type RuntimeOwnership =
  | 'Lynell'
  | 'Bridge'
  | 'External service'
  | 'Device'
  | 'Foundation'
  | 'Mixed'

export type IntegrationRuntimeState = {
  id: string
  name: string
  category: 'knx' | 'media' | 'assistant' | 'weather' | 'edge' | 'mqtt' | 'system'
  origin: RuntimeStateOrigin
  status: IntegrationRuntimeStatus
  owner: RuntimeOwnership
  confidence: 'høy' | 'middels' | 'lav'
  fallbackActive: boolean
  live: boolean
  summary: string
  stateSourceText: string
  nextStep: string
}

export type HybridRuntimeInput = {
  systemMode: 'live' | 'demo' | 'developer' | 'simulate' | string
  bridgeReady: boolean
  feedbackActive: boolean
  mediaSource: 'local' | 'mock' | 'empty' | string
  persistedRestored: boolean
  mqttConfigured: boolean
}

export function formatRuntimeOrigin(origin: RuntimeStateOrigin) {
  const labels: Record<RuntimeStateOrigin, string> = {
    simulated: 'Demo/dev',
    localRuntime: 'Lokal runtime',
    bridgeRuntime: 'Bridge runtime',
    cloudRuntime: 'Cloud runtime',
    persistedFallback: 'Siste kjente state',
    foundation: 'Foundation',
    mixed: 'Hybrid / mixed',
  }

  return labels[origin]
}

export function formatIntegrationRuntimeStatus(status: IntegrationRuntimeStatus) {
  const labels: Record<IntegrationRuntimeStatus, string> = {
    foundation: 'Foundation',
    partiallyConnected: 'Delvis koblet',
    connected: 'Koblet',
    degraded: 'Degradert',
    offline: 'Offline',
    fallback: 'Fallback',
  }

  return labels[status]
}

export function formatRuntimeConnectionState(state: RuntimeConnectionState) {
  return formatAmbientConnectionState(state)
}

export function formatRuntimeReadinessState(readiness: RuntimeReadinessState) {
  return formatAmbientReadinessState(readiness)
}

export function getRuntimeConnectionTone(state: RuntimeConnectionState) {
  if (state === 'connected') {
    return 'connected'
  }

  if (state === 'degraded' || state === 'fallback' || state === 'loading') {
    return 'degraded'
  }

  if (state === 'offline') {
    return 'offline'
  }

  if (state === 'demo' || state === 'developer') {
    return 'demo'
  }

  return 'foundation'
}

export function createRuntimeDeviceContract(contract: RuntimeDeviceContract): RuntimeDeviceContract {
  return {
    ...contract,
    id: contract.id || 'runtime-contract',
    name: contract.name || 'Runtime',
    provider: contract.provider || 'unknown',
    connectionState: contract.connectionState || 'fallback',
    readiness: contract.readiness || 'limited',
    capabilities: Array.from(new Set((contract.capabilities ?? []).filter(Boolean))),
    diagnostics: (contract.diagnostics ?? []).filter(Boolean).slice(0, 4),
    summary: contract.summary || 'Runtime-status forberedes.',
  }
}

export function getRuntimeContractSummary(contracts: RuntimeDeviceContract[]) {
  const safeContracts = Array.isArray(contracts) ? contracts : []
  const connectedCount = safeContracts.filter((contract) => contract.connectionState === 'connected').length
  const degradedCount = safeContracts.filter((contract) =>
    contract.connectionState === 'degraded' || contract.connectionState === 'fallback',
  ).length
  const offlineCount = safeContracts.filter((contract) => contract.connectionState === 'offline').length
  const foundationCount = safeContracts.filter((contract) =>
    contract.connectionState === 'foundation' ||
    contract.connectionState === 'demo' ||
    contract.connectionState === 'developer',
  ).length
  const primaryContracts = safeContracts.filter((contract) =>
    contract.connectionState === 'connected' || contract.connectionState === 'degraded',
  )

  return {
    connectedCount,
    degradedCount,
    offlineCount,
    foundationCount,
    primaryContracts,
    label:
      connectedCount > 0 && degradedCount === 0 && offlineCount === 0
        ? 'Live runtime er stabil'
        : connectedCount > 0
          ? 'Live runtime med oppfølging'
          : foundationCount > 0
            ? 'Runtime er forberedt'
            : 'Runtime venter',
    nivaLine:
      connectedCount > 0
        ? `NIVA følger ${connectedCount} aktive runtime-kilder akkurat nå.`
        : 'NIVA holder demo og forberedt state adskilt fra live runtime.',
  }
}

export function buildHybridRuntimeStates(input: HybridRuntimeInput): IntegrationRuntimeState[] {
  const knxLive = input.systemMode === 'live' && input.bridgeReady
  const knxFeedbackLive = knxLive && input.feedbackActive
  const mockRuntimeMode =
    input.systemMode === 'demo' || input.systemMode === 'developer' || input.systemMode === 'simulate'
  const mockModeLabel = input.systemMode === 'developer' ? 'Developer Mode' : 'Demo Mode'
  const mediaLocal = input.mediaSource === 'local'
  const mediaMock = input.mediaSource === 'mock'

  return [
    {
      id: 'knx-lights',
      name: 'KNX lys',
      category: 'knx',
      origin: knxFeedbackLive ? 'bridgeRuntime' : mockRuntimeMode ? 'simulated' : 'persistedFallback',
      status: knxFeedbackLive ? 'connected' : mockRuntimeMode ? 'foundation' : 'fallback',
      owner: knxFeedbackLive ? 'Bridge' : mockRuntimeMode ? 'Lynell' : 'Mixed',
      confidence: knxFeedbackLive ? 'høy' : mockRuntimeMode ? 'middels' : 'lav',
      fallbackActive: !knxFeedbackLive,
      live: knxFeedbackLive,
      summary: knxFeedbackLive
        ? 'Lysstatus kommer fra bridge/runtime-feedback.'
        : mockRuntimeMode
          ? `Lysstatus bruker ${mockModeLabel.toLowerCase()}-data i Lynell.`
          : 'Lysstatus bruker siste kjente eller fallback-state.',
      stateSourceText: knxFeedbackLive ? 'Bridge runtime' : mockRuntimeMode ? `${mockModeLabel} state` : 'Persisted/siste kjente state',
      nextStep: 'Behold write-path via eksisterende runtime config.',
    },
    {
      id: 'knx-climate',
      name: 'KNX klima',
      category: 'knx',
      origin: knxFeedbackLive ? 'bridgeRuntime' : mockRuntimeMode ? 'simulated' : 'persistedFallback',
      status: knxFeedbackLive ? 'connected' : mockRuntimeMode ? 'foundation' : 'fallback',
      owner: knxFeedbackLive ? 'Bridge' : mockRuntimeMode ? 'Lynell' : 'Mixed',
      confidence: knxFeedbackLive ? 'høy' : mockRuntimeMode ? 'middels' : 'lav',
      fallbackActive: !knxFeedbackLive,
      live: knxFeedbackLive,
      summary: knxFeedbackLive
        ? 'Temperatur og klima bygger på live KNX feedback.'
        : mockRuntimeMode
          ? `Klima bruker ${mockModeLabel.toLowerCase()}-data for test/presentasjon.`
          : 'Klima bruker siste kjente state der live feedback mangler.',
      stateSourceText: knxFeedbackLive ? 'Bridge runtime' : mockRuntimeMode ? `${mockModeLabel} state` : 'Persisted/siste kjente state',
      nextStep: 'Valider feedback i Diagnose før nye integrasjoner kobles på.',
    },
    {
      id: 'media-runtime',
      name: 'Media',
      category: 'media',
      origin: mediaLocal ? 'localRuntime' : mediaMock ? 'mixed' : 'foundation',
      status: mediaLocal ? 'connected' : mediaMock ? 'partiallyConnected' : 'foundation',
      owner: mediaLocal ? 'Lynell' : 'Mixed',
      confidence: mediaLocal ? 'høy' : mediaMock ? 'middels' : 'lav',
      fallbackActive: mediaMock || input.mediaSource === 'empty',
      live: mediaLocal,
      summary: mediaLocal
        ? 'Media spiller fra lokal browser/runtime med bridge-bibliotek.'
        : mediaMock
          ? 'Media bruker lokal runtime med demo/dev-bibliotek.'
          : 'Media er klar, men mangler aktivt bibliotek.',
      stateSourceText: mediaLocal ? 'Lokal runtime' : mediaMock ? 'Lokal runtime + demo/dev library' : 'Foundation',
      nextStep: 'Koble eksterne outputs senere uten å endre lokal player.',
    },
    {
      id: 'weather-runtime',
      name: 'Weather',
      category: 'weather',
      origin: 'foundation',
      status: 'foundation',
      owner: 'External service',
      confidence: 'middels',
      fallbackActive: true,
      live: false,
      summary: 'Vær-awareness finnes, men full værstasjon-runtime er ikke koblet.',
      stateSourceText: 'Foundation/fallback weather awareness',
      nextStep: 'Bekreft datakilde, intervall og last updated når værintegrasjon kobles.',
    },
    {
      id: 'assistant-runtime',
      name: 'Dream D20 Plus',
      category: 'assistant',
      origin: 'simulated',
      status: 'foundation',
      owner: 'Lynell',
      confidence: 'lav',
      fallbackActive: true,
      live: false,
      summary: 'Robotstatus bruker demo/dev foundation-state når ikke live provider er koblet.',
      stateSourceText: 'Demo/dev assistent-runtime',
      nextStep: 'Avklar API/metode før status/start/dock kobles ekte.',
    },
    {
      id: 'zigbee-runtime',
      name: 'Zigbee',
      category: 'edge',
      origin: 'foundation',
      status: 'foundation',
      owner: 'Foundation',
      confidence: 'lav',
      fallbackActive: true,
      live: false,
      summary: 'Zigbee-devices og coordinator er modellert uten runtime.',
      stateSourceText: 'Foundation device lifecycle',
      nextStep: 'Velg Zigbee2MQTT/ZHA-retning og MQTT path senere.',
    },
    {
      id: 'persistence-runtime',
      name: 'Persisted continuity',
      category: 'system',
      origin: input.persistedRestored ? 'persistedFallback' : 'foundation',
      status: input.persistedRestored ? 'fallback' : 'foundation',
      owner: 'Lynell',
      confidence: input.persistedRestored ? 'middels' : 'lav',
      fallbackActive: input.persistedRestored,
      live: false,
      summary: input.persistedRestored
        ? 'Siste kjente runtime er restoret som continuity fallback.'
        : 'Runtime continuity bygger ny state i denne sesjonen.',
      stateSourceText: input.persistedRestored ? 'Persisted fallback' : 'Ny session-state',
      nextStep: 'La live feedback overskrive persisted state når signaler kommer.',
    },
  ]
}

export function getHybridRuntimeSummary(states: IntegrationRuntimeState[]) {
  const liveCount = states.filter((state) => state.live).length
  const simulatedCount = states.filter((state) => state.origin === 'simulated').length
  const fallbackCount = states.filter((state) => state.fallbackActive).length
  const connectedCount = states.filter((state) => state.status === 'connected' || state.status === 'partiallyConnected').length

  return {
    liveCount,
    simulatedCount,
    fallbackCount,
    connectedCount,
    label:
      liveCount > 0 && fallbackCount > 0
        ? 'Hybrid runtime'
        : liveCount > 0
          ? 'Live runtime'
          : 'Foundation runtime',
    nivaSummary:
      liveCount > 0 && fallbackCount > 0
        ? `Lynell kjører hybrid: ${liveCount} live kilder og ${fallbackCount} fallback/foundation-kilder.`
        : liveCount > 0
          ? `Lynell har ${liveCount} live runtime-kilder akkurat nå.`
          : 'Lynell bruker foundation, demo/dev eller siste kjente state for de fleste integrasjoner.',
  }
}

export function findRuntimeState(text: string, states: IntegrationRuntimeState[]) {
  const normalized = text.toLowerCase()

  return states.find((state) => {
    const haystack = `${state.id} ${state.name} ${state.category} ${state.origin} ${state.status}`.toLowerCase()
    return haystack
      .split(/[\s/.-]+/)
      .filter((part) => part.length > 2)
      .some((part) => normalized.includes(part))
  }) ?? null
}
