import type { MqttConfig } from '../../config/systemConfig'
import type { IntegrationRuntimeState } from '../runtime/integrationRuntimeState'
import type { ZigbeeDevice } from './zigbeeTypes'

export type Zigbee2MqttRuntimeMode = 'foundation' | 'readyToConnect' | 'partiallyConnected' | 'connected'

export type MqttReadinessConfig = {
  brokerHost: string
  brokerPort: number
  authEnabled: boolean
  tlsPlanned: boolean
  topicRoot: string
  retainedMessages: boolean
  birthLastWill: boolean
  runtimeMode: Zigbee2MqttRuntimeMode
}

export type Zigbee2MqttReadiness = {
  coordinatorName: string
  coordinatorModel: string
  coordinatorPath: string
  coordinatorHealth: 'foundation' | 'ready' | 'missingRuntime'
  runtimeName: 'Zigbee2MQTT'
  runtimeMode: Zigbee2MqttRuntimeMode
  transport: 'MQTT'
  localOnly: boolean
  stateOrigin: string
  mqtt: MqttReadinessConfig
  deviceBridge: {
    topicNamespace: string
    retainedState: string
    devicePayload: string
    commandPayload: string
  }
  pairingReadiness: {
    pairingMode: string
    deviceInterview: string
    roomMapping: string
    capabilityMapping: string
    signalBatteryAwareness: string
    retainedState: string
  }
  ready: string[]
  missing: string[]
  nextSteps: string[]
  nivaSummary: string
}

export function buildZigbee2MqttReadiness(
  mqttConfig: MqttConfig,
  zigbeeDevices: ZigbeeDevice[],
): Zigbee2MqttReadiness {
  const coordinator = zigbeeDevices.find((device) => device.kind === 'coordinator')
  const joinedDevices = zigbeeDevices.filter((device) => device.kind !== 'coordinator')
  const mqttConfigured = mqttConfig.enabled && mqttConfig.brokerHost.trim().length > 0
  const topicRoot = mqttConfig.baseTopic?.trim() || 'lynell'
  const runtimeMode: Zigbee2MqttRuntimeMode = mqttConfigured ? 'readyToConnect' : 'foundation'

  return {
    coordinatorName: coordinator?.name ?? 'SONOFF ZBDongle-E',
    coordinatorModel: coordinator?.model ?? 'EFR32MG21 coordinator',
    coordinatorPath: 'USB path avklares senere',
    coordinatorHealth: mqttConfigured ? 'ready' : 'missingRuntime',
    runtimeName: 'Zigbee2MQTT',
    runtimeMode,
    transport: 'MQTT',
    localOnly: true,
    stateOrigin: 'Foundation / ikke live runtime',
    mqtt: {
      brokerHost: mqttConfigured ? mqttConfig.brokerHost : 'Ikke satt',
      brokerPort: mqttConfig.brokerPort || 1883,
      authEnabled: Boolean(mqttConfig.username || mqttConfig.password),
      tlsPlanned: Boolean(mqttConfig.secure),
      topicRoot,
      retainedMessages: true,
      birthLastWill: true,
      runtimeMode,
    },
    deviceBridge: {
      topicNamespace: `${topicRoot}/zigbee2mqtt`,
      retainedState: 'Retained device state planlegges for siste kjente device-verdi.',
      devicePayload: 'Devices publiserer state via MQTT senere.',
      commandPayload: 'Kommandoer rutes senere via eksplisitt action/write-lag, ikke nå.',
    },
    pairingReadiness: {
      pairingMode: 'Pairing mode senere',
      deviceInterview: 'Device interview senere',
      roomMapping: 'Room assignment bruker SystemConfig-rom',
      capabilityMapping: 'Capability mapping bygger på sensor/device foundation',
      signalBatteryAwareness: 'Signal og batteri vises som awareness, ikke alarm',
      retainedState: 'Retained state brukes senere for siste kjente device-status',
    },
    ready: [
      'SONOFF ZBDongle-E er modellert som coordinator',
      'Zigbee2MQTT er valgt som lokal runtime-retning',
      `${joinedDevices.length} Zigbee-devices ligger som lifecycle foundation`,
      'MQTT er valgt som transportlag for edge-state',
    ],
    missing: [
      'Zigbee2MQTT er ikke installert eller startet',
      'Coordinator path er ikke satt',
      'MQTT broker må valideres',
      'Pairing og device interview er ikke implementert',
    ],
    nextSteps: [
      'Sett broker host, port og eventuell auth',
      'Avklar coordinator USB path',
      'Definer topic namespace for Zigbee2MQTT',
      'Planlegg retained state og birth/last-will',
      'Koble device mapping mot SystemConfig-rom senere',
    ],
    nivaSummary: mqttConfigured
      ? 'Zigbee-retningen er lokal: SONOFF-dongle, Zigbee2MQTT og MQTT broker er klare som teknisk spor, men ingen runtime er startet.'
      : 'Zigbee-retningen er valgt som lokal Zigbee2MQTT over MQTT, men broker og coordinator path må avklares før live runtime.',
  }
}

export function getZigbeeRuntimeState(readiness: Zigbee2MqttReadiness): IntegrationRuntimeState {
  return {
    id: 'zigbee2mqtt-runtime',
    name: 'Zigbee2MQTT',
    category: 'edge',
    origin: 'foundation',
    status: readiness.runtimeMode === 'readyToConnect' ? 'partiallyConnected' : 'foundation',
    owner: 'Foundation',
    confidence: readiness.runtimeMode === 'readyToConnect' ? 'middels' : 'lav',
    fallbackActive: true,
    live: false,
    summary: readiness.nivaSummary,
    stateSourceText: 'Zigbee2MQTT readiness foundation',
    nextStep: readiness.nextSteps[0] ?? 'Klargjør lokal Zigbee-runtime senere.',
  }
}

export function formatZigbeeRuntimeMode(mode: Zigbee2MqttRuntimeMode) {
  if (mode === 'readyToConnect') {
    return 'Klar for teknisk kobling'
  }

  if (mode === 'partiallyConnected') {
    return 'Delvis koblet'
  }

  if (mode === 'connected') {
    return 'Koblet'
  }

  return 'Foundation'
}
