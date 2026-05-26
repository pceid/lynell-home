import type { MqttConfig } from '../../config/systemConfig'
import type {
  IntegrationRuntimeState,
  IntegrationRuntimeStatus,
  RuntimeStateOrigin,
} from '../runtime/integrationRuntimeState'

export type MqttConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'degraded'
  | 'fallback'

export type MqttReconnectState = 'idle' | 'scheduled' | 'retrying' | 'disabled'

export type MqttRuntimeMode = 'foundation' | 'readyToConnect' | 'live' | 'fallback'

export type MqttRuntimeMessage = {
  topic: string
  receivedAt: number | string
  retained: boolean
  payloadPreview: string
}

export type NormalizedMqttDeviceState = {
  deviceId: string
  topic: string
  online?: boolean
  battery?: number | null
  signal?: number | null
  temperature?: number | null
  occupancy?: boolean | null
  lastSeen?: string | null
  retained: boolean
  updatedAt: number
}

export type MqttRuntimeFoundation = {
  brokerHost: string
  brokerPort: number
  clientId: string
  authEnabled: boolean
  secure: boolean
  topicRoot: string
  connectionState: MqttConnectionState
  reconnectState: MqttReconnectState
  runtimeMode: MqttRuntimeMode
  stateOrigin: RuntimeStateOrigin
  retainedAwareness: string
  lastMessage: MqttRuntimeMessage | null
  topicTrust: {
    topicCount: number
    liveTopicCount: number
    retainedOnlyCount: number
    staleTopicCount: number
    offlineTopicCount: number
    topics: NonNullable<MqttBridgeRuntimeStatus['topicTrust']>['topics']
  }
  reconnectCount: number
  subscribeFailures: number
  publishFailures: number
  topics: {
    bridgeState: string
    deviceState: string
    deviceAvailability: string
  }
  mapping: {
    online: string
    battery: string
    signal: string
    temperature: string
    occupancy: string
    lastSeen: string
  }
  summary: string
  nextStep: string
}

export type MqttBridgeRuntimeStatus = {
  enabled: boolean
  connected: boolean
  state: string
  broker: {
    host: string
    port: number
  }
  topicRoot: string
  lastMessageAt: string | null
  lastMessage: MqttRuntimeMessage | null
  subscribedTopics: string[]
  subscribed?: boolean
  topicTrust?: {
    staleAfterMs: number
    offlineAfterMs: number
    topicCount: number
    liveTopicCount: number
    retainedOnlyCount: number
    staleTopicCount: number
    offlineTopicCount: number
    topics: Array<{
      topicName: string
      retained: boolean
      retainedOnly: boolean
      live: boolean
      stale: boolean
      offline: boolean
      sourceAgeMs: number | null
      lastPayload: string
      lastUpdate: string | null
      confidence: string
      liveMessageCount: number
      retainedMessageCount: number
    }>
  }
  reconnectCount?: number
  subscribeFailures?: number
  publishFailures?: number
  error: string | null
}

const getTopicRoot = (config: MqttConfig) => config.baseTopic.trim() || 'zigbee2mqtt'

export function buildMqttRuntimeFoundation(
  config: MqttConfig,
  bridgeStatus: MqttBridgeRuntimeStatus | null = null,
): MqttRuntimeFoundation {
  const configured = config.enabled && config.brokerHost.trim().length > 0
  const bridgeEnabled = bridgeStatus?.enabled ?? false
  const bridgeConnected = bridgeStatus?.connected ?? false
  const bridgeState = bridgeStatus?.state ?? ''
  const bridgeBrokerHost = bridgeStatus?.broker.host ?? ''
  const bridgeBrokerPort = bridgeStatus?.broker.port ?? 0
  const bridgeError = bridgeStatus?.error ?? null
  const topicRoot = bridgeStatus?.topicRoot || getTopicRoot(config)
  const topicTrust = bridgeStatus?.topicTrust ?? {
    topicCount: 0,
    liveTopicCount: 0,
    retainedOnlyCount: 0,
    staleTopicCount: 0,
    offlineTopicCount: 0,
    topics: [],
  }
  const runtimeMode: MqttRuntimeMode = bridgeConnected
    ? 'live'
    : bridgeEnabled || configured
      ? 'readyToConnect'
      : 'foundation'
  const connectionState: MqttConnectionState = bridgeConnected
    ? 'connected'
    : bridgeEnabled
      ? bridgeState === 'connecting'
        ? 'connecting'
        : bridgeState === 'degraded'
          ? 'degraded'
          : 'disconnected'
      : configured
        ? 'disconnected'
        : 'fallback'
  const lastMessage = bridgeStatus?.lastMessage ?? null

  return {
    brokerHost: bridgeBrokerHost || (configured ? config.brokerHost.trim() : 'Ikke satt'),
    brokerPort: bridgeBrokerPort || config.brokerPort || 1883,
    clientId: config.clientId.trim() || 'lynell-home',
    authEnabled: Boolean(config.username || config.password),
    secure: config.secure,
    topicRoot,
    connectionState,
    reconnectState: 'disabled',
    runtimeMode,
    stateOrigin: bridgeConnected ? 'localRuntime' : configured || bridgeEnabled ? 'foundation' : 'persistedFallback',
    retainedAwareness:
      topicTrust.retainedOnlyCount > 0
        ? `${topicTrust.retainedOnlyCount} topics er retained-only og behandles som siste kjente state.`
        : 'Retained messages skilles fra ferske live topics og brukes som siste kjente edge-state.',
    lastMessage,
    topicTrust,
    reconnectCount: bridgeStatus?.reconnectCount ?? 0,
    subscribeFailures: bridgeStatus?.subscribeFailures ?? 0,
    publishFailures: bridgeStatus?.publishFailures ?? 0,
    topics: {
      bridgeState: `${topicRoot}/bridge/state`,
      deviceState: `${topicRoot}/<device>`,
      deviceAvailability: `${topicRoot}/<device>/availability`,
    },
    mapping: {
      online: 'availability/state -> online/offline',
      battery: 'battery -> Lynell device battery',
      signal: 'linkquality -> Lynell signal quality',
      temperature: 'temperature -> sensor capability',
      occupancy: 'occupancy/contact/motion -> activity input',
      lastSeen: 'last_seen -> runtime freshness',
    },
    summary: bridgeConnected
      ? topicTrust.staleTopicCount > 0
        ? `MQTT er koblet til ${bridgeBrokerHost}:${bridgeBrokerPort}, men ${topicTrust.staleTopicCount} topics er stale.`
        : `MQTT er koblet til ${bridgeBrokerHost}:${bridgeBrokerPort}. ${topicTrust.liveTopicCount} live topics, ${topicTrust.retainedOnlyCount} retained-only.`
      : bridgeEnabled
        ? `MQTT er aktivert i bridge, men ikke koblet. ${bridgeError ?? 'Venter på trygg connect.'}`
        : configured
          ? `MQTT er konfigurert mot ${config.brokerHost.trim()}:${config.brokerPort || 1883}, men bridge MQTT er ikke aktivert.`
          : 'MQTT live runtime er ikke koblet. Lynell bruker foundation og siste kjente edge-state der det finnes.',
    nextStep: bridgeConnected
      ? 'Koble Zigbee2MQTT device mapping kontrollert senere.'
      : bridgeEnabled || configured
        ? 'Bruk bridge connect-endepunkt når broker og dependency er klare.'
        : 'Sett broker host, port og topic root før live MQTT kan kobles senere.',
  }
}

export function getMqttRuntimeIntegrationState(
  runtime: MqttRuntimeFoundation,
): IntegrationRuntimeState {
  const statusByConnection: Record<MqttConnectionState, IntegrationRuntimeStatus> = {
    disconnected: runtime.runtimeMode === 'readyToConnect' ? 'partiallyConnected' : 'offline',
    connecting: 'partiallyConnected',
    connected: 'connected',
    degraded: 'degraded',
    fallback: 'fallback',
  }

  return {
    id: 'mqtt-runtime',
    name: 'MQTT live runtime',
    category: 'mqtt',
    origin: runtime.connectionState === 'connected' ? 'localRuntime' : runtime.stateOrigin,
    status: statusByConnection[runtime.connectionState],
    owner: runtime.connectionState === 'connected' ? 'Lynell' : 'Foundation',
    confidence:
      runtime.connectionState === 'connected'
        ? 'høy'
        : runtime.runtimeMode === 'readyToConnect'
          ? 'middels'
          : 'lav',
    fallbackActive: runtime.connectionState !== 'connected',
    live: runtime.connectionState === 'connected',
    summary: runtime.summary,
    stateSourceText:
      runtime.connectionState === 'connected'
        ? 'Live MQTT client'
        : runtime.runtimeMode === 'readyToConnect'
          ? 'Konfigurert, ikke koblet'
          : 'Foundation/fallback',
    nextStep: runtime.nextStep,
  }
}

export function normalizeMqttDevicePayload(
  topic: string,
  payload: Record<string, unknown>,
  retained = false,
  updatedAt = Date.now(),
): NormalizedMqttDeviceState {
  const parts = topic.split('/').filter(Boolean)
  const deviceId = parts[parts.length - 1] ?? topic
  const availability = payload.availability ?? payload.state

  return {
    deviceId,
    topic,
    online:
      typeof availability === 'string'
        ? ['online', 'on', 'available'].includes(availability.toLowerCase())
        : undefined,
    battery: typeof payload.battery === 'number' ? payload.battery : null,
    signal: typeof payload.linkquality === 'number' ? payload.linkquality : null,
    temperature: typeof payload.temperature === 'number' ? payload.temperature : null,
    occupancy: typeof payload.occupancy === 'boolean' ? payload.occupancy : null,
    lastSeen: typeof payload.last_seen === 'string' ? payload.last_seen : null,
    retained,
    updatedAt,
  }
}

export function formatMqttConnectionState(state: MqttConnectionState) {
  const labels: Record<MqttConnectionState, string> = {
    disconnected: 'Ikke koblet',
    connecting: 'Kobler',
    connected: 'Live',
    degraded: 'Degradert',
    fallback: 'Fallback',
  }

  return labels[state]
}

export function formatMqttRuntimeMode(mode: MqttRuntimeMode) {
  const labels: Record<MqttRuntimeMode, string> = {
    foundation: 'Foundation',
    readyToConnect: 'Klar for teknisk kobling',
    live: 'Live runtime',
    fallback: 'Fallback',
  }

  return labels[mode]
}
