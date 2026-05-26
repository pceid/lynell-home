import type {
  BridgeCastStatus,
  BridgeMqttStatus,
  BridgeVacuumStatus,
  SystemMode,
} from '../../api/homeApi'
import type { MediaLibrarySource, MediaPlayerState } from '../../media/mediaTypes'
import type { IntegrationTruthStatus } from '../truth/integrationTruth'
import {
  createRuntimeDeviceContract,
  type RuntimeConnectionState,
  type RuntimeDeviceContract,
  type RuntimeReadinessState,
} from './integrationRuntimeState'

export type RuntimeContractBuilderInput = {
  systemMode: SystemMode
  runtimeModeLabel: string
  runtimeModeDescription: string
  lastRuntimeSnapshotAt: number | null
  bridgeRuntimeStatus: 'syncing' | 'ready' | 'error'
  bridgeReachable: boolean | null
  bridgeStatusLabel: string
  lastBridgeSyncAt: string | null
  bridgeHealthCheckedAt: string | null
  feedbackStrategyLabel: string
  lightFeedbackStrategy: string
  climateFeedbackStrategy: string
  castDiscoveryTruthStatus: IntegrationTruthStatus
  castPlaybackTruthStatus: IntegrationTruthStatus
  castDiscoveryStatusText: string
  castStatus: BridgeCastStatus | null
  mediaRoute: 'cast' | 'local'
  mediaRouteLabel: string
  mediaRouteReadinessText: string
  mediaLibrarySource: MediaLibrarySource
  runtimeAllowsMock: boolean
  mediaPlayer: MediaPlayerState
  vacuumTruthStatus: IntegrationTruthStatus
  vacuumStatus: BridgeVacuumStatus | null
  mqttTruthStatus: IntegrationTruthStatus
  mqttStatus: BridgeMqttStatus | null
  mqttSummary: string
}

function createRuntimeContractFallback(id: string, name: string, reason: unknown) {
  if (import.meta.env.DEV) {
    console.warn('[Lynell runtime contract fallback]', name, reason)
  }

  return createRuntimeDeviceContract({
    id,
    name,
    domain: 'system',
    provider: 'Lynell',
    connectionState: 'fallback',
    readiness: 'limited',
    capabilities: ['safe-render'],
    derivedState: false,
    diagnostics: ['Runtime contract fallback'],
    lastUpdatedAt: null,
    summary: 'Runtime-status forberedes.',
  })
}

function safeContract(
  id: string,
  name: string,
  builder: () => RuntimeDeviceContract,
): RuntimeDeviceContract {
  try {
    return builder()
  } catch (error) {
    return createRuntimeContractFallback(id, name, error)
  }
}

function formatRuntimeTimestamp(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const date = new Date(value)

  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}

export function getRuntimeModeConnectionState(mode: SystemMode): RuntimeConnectionState {
  if (mode === 'demo' || mode === 'simulate') {
    return 'demo'
  }

  if (mode === 'developer') {
    return 'developer'
  }

  return 'connected'
}

export function getRuntimeModeReadiness(mode: SystemMode): RuntimeReadinessState {
  if (mode === 'developer') {
    return 'diagnostic'
  }

  if (mode === 'demo' || mode === 'simulate') {
    return 'ready'
  }

  return 'live'
}

export function getBridgeRuntimeConnectionState(
  bridgeStatus: 'syncing' | 'ready' | 'error',
  bridgeReachable: boolean | null,
): RuntimeConnectionState {
  if (bridgeReachable === false || bridgeStatus === 'error') {
    return 'offline'
  }

  if (bridgeStatus === 'syncing' || bridgeReachable === null) {
    return 'loading'
  }

  return 'connected'
}

export function getTruthConnectionState(status: IntegrationTruthStatus): RuntimeConnectionState {
  if (status === 'Live' || status === 'Klar for test') {
    return 'connected'
  }

  if (status === 'Klargjort' || status === 'Foundation' || status === 'Mock') {
    return 'foundation'
  }

  if (status === 'Mangler dependency' || status === 'Mangler env') {
    return 'degraded'
  }

  if (status === 'Disabled' || status === 'Ikke koblet') {
    return 'offline'
  }

  return 'foundation'
}

export function getTruthReadinessState(status: IntegrationTruthStatus): RuntimeReadinessState {
  if (status === 'Live') {
    return 'live'
  }

  if (status === 'Klar for test' || status === 'Klargjort') {
    return 'ready'
  }

  if (status === 'Mangler dependency' || status === 'Mangler env') {
    return 'missingConfig'
  }

  if (status === 'Disabled' || status === 'Ikke koblet') {
    return 'disabled'
  }

  return 'limited'
}

export function buildLynellModeContract(input: RuntimeContractBuilderInput) {
  return createRuntimeDeviceContract({
    id: 'lynell-runtime-mode',
    name: input.runtimeModeLabel,
    domain: 'system',
    provider: 'Lynell',
    connectionState: getRuntimeModeConnectionState(input.systemMode),
    readiness: getRuntimeModeReadiness(input.systemMode),
    capabilities: input.systemMode === 'live' ? ['live-priority'] : ['mock-visible', 'diagnostics'],
    derivedState: false,
    diagnostics: [input.runtimeModeDescription],
    lastUpdatedAt: formatRuntimeTimestamp(input.lastRuntimeSnapshotAt),
    summary:
      input.systemMode === 'live'
        ? 'Ekte runtime ligger først, med demo/foundation adskilt.'
        : `${input.runtimeModeLabel} holder test og foundation i et eget miljø.`,
  })
}

export function buildKnxBridgeContract(input: RuntimeContractBuilderInput) {
  return createRuntimeDeviceContract({
    id: 'knx-bridge-runtime',
    name: 'KNX bridge',
    domain: 'knx',
    provider: 'bridgeRuntime',
    connectionState: getBridgeRuntimeConnectionState(
      input.bridgeRuntimeStatus,
      input.bridgeReachable,
    ),
    readiness:
      input.bridgeRuntimeStatus === 'ready'
        ? 'live'
        : input.bridgeReachable === false
          ? 'missingConfig'
          : 'limited',
    capabilities: [
      'lights',
      'climate',
      input.feedbackStrategyLabel !== 'off' ? 'feedback' : 'write-path',
    ],
    derivedState: false,
    diagnostics: [
      input.bridgeStatusLabel,
      input.lightFeedbackStrategy !== 'off' ? `Lys feedback: ${input.lightFeedbackStrategy}` : '',
      input.climateFeedbackStrategy !== 'off'
        ? `Klima feedback: ${input.climateFeedbackStrategy}`
        : '',
    ],
    lastUpdatedAt: input.lastBridgeSyncAt ?? input.bridgeHealthCheckedAt ?? null,
    summary:
      input.bridgeRuntimeStatus === 'ready'
        ? 'KNX er koblet via eksisterende bridge-runtime.'
        : 'KNX-runtime venter på bridge eller ferske signaler.',
  })
}

export function buildCastContract(input: RuntimeContractBuilderInput) {
  return createRuntimeDeviceContract({
    id: 'cast-media-runtime',
    name: 'Cast / Google Home',
    domain: 'cast',
    provider: 'castRuntime',
    connectionState: getTruthConnectionState(input.castPlaybackTruthStatus),
    readiness: getTruthReadinessState(input.castPlaybackTruthStatus),
    capabilities: ['discovery', 'mp3-playback', 'volume'],
    derivedState: false,
    diagnostics: [
      input.castDiscoveryTruthStatus,
      input.castStatus?.playback?.message ?? input.castDiscoveryStatusText,
    ],
    lastUpdatedAt:
      input.castStatus?.playback?.updatedAt ?? input.castStatus?.lastDiscoveryAt ?? null,
    summary:
      input.castPlaybackTruthStatus === 'Live'
        ? 'Cast spiller via valgt live output.'
        : 'Cast er klargjort for discovery og MP3 playback-test.',
  })
}

export function buildMediaOutputContract(input: RuntimeContractBuilderInput) {
  return createRuntimeDeviceContract({
    id: 'media-output-runtime',
    name: 'Media output',
    domain: 'media',
    provider: input.mediaRoute === 'cast' ? 'castRuntime' : 'localRuntime',
    connectionState:
      input.mediaRoute === 'cast'
        ? getTruthConnectionState(input.castPlaybackTruthStatus)
        : input.mediaLibrarySource === 'local'
          ? 'connected'
          : input.runtimeAllowsMock
            ? getRuntimeModeConnectionState(input.systemMode)
            : 'foundation',
    readiness:
      input.mediaRoute === 'cast'
        ? getTruthReadinessState(input.castPlaybackTruthStatus)
        : input.mediaLibrarySource === 'local'
          ? 'live'
          : input.runtimeAllowsMock
            ? 'ready'
            : 'limited',
    capabilities: input.mediaRoute === 'cast' ? ['route-cast', 'volume'] : ['local-audio', 'volume'],
    derivedState: false,
    diagnostics: [input.mediaRouteLabel, input.mediaRouteReadinessText],
    lastUpdatedAt: formatRuntimeTimestamp(input.mediaPlayer?.updatedAt),
    summary:
      input.mediaRoute === 'cast'
        ? 'Media er rutet til valgt Cast output.'
        : 'Media spiller lokalt på denne enheten.',
  })
}

export function buildDreameVacuumContract(input: RuntimeContractBuilderInput) {
  return createRuntimeDeviceContract({
    id: 'dreame-vacuum-runtime',
    name: input.vacuumStatus?.selectedRobot?.name ?? 'Dream D20 Plus',
    domain: 'dreame',
    provider: input.vacuumStatus?.provider ?? 'mock',
    connectionState: getTruthConnectionState(input.vacuumTruthStatus),
    readiness: getTruthReadinessState(input.vacuumTruthStatus),
    capabilities: input.vacuumStatus?.capabilities?.length
      ? input.vacuumStatus.capabilities
      : input.vacuumStatus?.selectedRobot?.capabilities ?? ['status'],
    derivedState: Boolean(input.vacuumStatus?.selectedRobot?.derivedState),
    diagnostics: [
      input.vacuumStatus?.providerLabel ?? input.vacuumTruthStatus,
      input.vacuumStatus?.trust
        ? `Trust: ${input.vacuumStatus.trust.state} · ${input.vacuumStatus.trust.stateConfidence}`
        : '',
      input.vacuumStatus?.selectedRobot?.statusMappingConfidence
        ? `Status mapping: ${input.vacuumStatus.selectedRobot.statusMappingConfidence}`
        : '',
      input.vacuumStatus?.message ?? '',
    ],
    lastUpdatedAt:
      input.vacuumStatus?.selectedRobot?.lastSeenAt ??
      input.vacuumStatus?.selectedRobot?.lastUpdatedAt ??
      input.vacuumStatus?.lastSuccessfulSync ??
      input.vacuumStatus?.lastSyncAt ??
      null,
    summary:
      input.vacuumStatus?.connected && input.vacuumStatus?.trust?.state !== 'stale' && input.vacuumStatus?.trust?.state !== 'offline'
        ? 'Dreame native cloud leverer live status-only runtime.'
        : input.vacuumStatus?.trust?.message ?? 'Robot-runtime er forberedt, men ikke live koblet i denne modusen.',
  })
}

export function buildMqttEdgeContract(input: RuntimeContractBuilderInput) {
  return createRuntimeDeviceContract({
    id: 'mqtt-edge-runtime',
    name: 'MQTT edge',
    domain: 'mqtt',
    provider: 'mqttRuntime',
    connectionState: getTruthConnectionState(input.mqttTruthStatus),
    readiness: getTruthReadinessState(input.mqttTruthStatus),
    capabilities: ['status-endpoint', 'topic-foundation'],
    derivedState: false,
    diagnostics: [input.mqttSummary],
    lastUpdatedAt: input.mqttStatus?.lastMessageAt ?? null,
    summary: input.mqttSummary,
  })
}

export function buildRuntimeDeviceContracts(
  input: RuntimeContractBuilderInput,
): RuntimeDeviceContract[] {
  return [
    safeContract('lynell-runtime-mode', 'Lynell mode', () => buildLynellModeContract(input)),
    safeContract('knx-bridge-runtime', 'KNX bridge', () => buildKnxBridgeContract(input)),
    safeContract('cast-media-runtime', 'Cast / Google Home', () => buildCastContract(input)),
    safeContract('media-output-runtime', 'Media output', () => buildMediaOutputContract(input)),
    safeContract('dreame-vacuum-runtime', 'Dream D20 Plus', () => buildDreameVacuumContract(input)),
    safeContract('mqtt-edge-runtime', 'MQTT edge', () => buildMqttEdgeContract(input)),
  ]
}
