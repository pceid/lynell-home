import type { MqttConfig, SystemIntegrationConfig } from '../../config/systemConfig'
import type { ZigbeeDevice } from '../zigbee/zigbeeTypes'

export type EdgeIntegrationType = 'zigbee' | 'mqtt' | 'local-adapter' | 'matter' | 'discovery'
export type EdgeHealthLevel = 'online' | 'standby' | 'quiet' | 'offline'

export type EdgeIntegrationStatus = {
  id: string
  name: string
  type: EdgeIntegrationType
  status: EdgeHealthLevel
  online: boolean
  lastContact: string
  signalQuality: number | null
  deviceCount: number
  transport: string
  protocol: string
  description: string
}

export type EdgeHealthSummary = {
  level: 'stable' | 'foundation' | 'attention'
  label: string
  nivaSummary: string
  issues: string[]
}

const getCoordinator = (zigbeeDevices: ZigbeeDevice[]) =>
  zigbeeDevices.find((device) => device.kind === 'coordinator') ?? null

export function getEdgeFoundationStatus(
  mqttConfig: MqttConfig,
  integrationConfig: SystemIntegrationConfig,
  zigbeeDevices: ZigbeeDevice[],
): EdgeIntegrationStatus[] {
  const coordinator = getCoordinator(zigbeeDevices)
  const joinedZigbeeDevices = zigbeeDevices.filter((device) => device.kind !== 'coordinator')
  const mqttConfigured = mqttConfig.enabled && mqttConfig.brokerHost.trim().length > 0

  return [
    {
      id: 'sonoff-zbdongle-e',
      name: coordinator?.name ?? 'SONOFF ZBDongle-E',
      type: 'zigbee',
      status: coordinator?.online ? 'online' : 'quiet',
      online: Boolean(coordinator?.online),
      lastContact: coordinator?.online ? 'Nylig' : 'Ikke rapportert',
      signalQuality: coordinator?.signalStrength ?? null,
      deviceCount: joinedZigbeeDevices.length,
      transport: 'USB / lokal gateway',
      protocol: 'Zigbee',
      description: 'Planlagt lokal Zigbee-koordinator for edge-enheter.',
    },
    {
      id: 'mqtt-broker',
      name: mqttConfigured ? mqttConfig.brokerHost : 'MQTT Broker',
      type: 'mqtt',
      status: mqttConfigured ? 'standby' : 'offline',
      online: false,
      lastContact: mqttConfigured ? 'Konfigurert, ingen runtime' : 'Ikke konfigurert',
      signalQuality: null,
      deviceCount: 0,
      transport: mqttConfig.secure ? 'MQTTS / TCP' : 'MQTT / TCP',
      protocol: 'MQTT',
      description: 'Foundation for lokal broker og fremtidig adaptertrafikk.',
    },
    {
      id: 'local-zigbee-adapter',
      name: 'Local Zigbee Adapter',
      type: 'local-adapter',
      status: 'standby',
      online: false,
      lastContact: 'Foundation',
      signalQuality: null,
      deviceCount: joinedZigbeeDevices.length,
      transport: 'Lokal adapter',
      protocol: 'Zigbee2MQTT-klar struktur',
      description: 'Adaptermodell for fremtidig Zigbee-runtime uten å endre KNX-backbone.',
    },
    {
      id: 'matter-adapter',
      name: 'Future Matter Adapter',
      type: 'matter',
      status: 'standby',
      online: false,
      lastContact: 'Ikke aktiv',
      signalQuality: null,
      deviceCount: 0,
      transport: 'Lokal edge',
      protocol: 'Matter / Thread',
      description: 'Plassholder for senere Matter- og Thread-støtte.',
    },
    {
      id: 'edge-discovery',
      name: 'Edge Discovery',
      type: 'discovery',
      status: integrationConfig.bacnet.active ? 'standby' : 'quiet',
      online: false,
      lastContact: 'Ikke startet',
      signalQuality: null,
      deviceCount: integrationConfig.bacnet.points.length,
      transport: 'Lokal discovery',
      protocol: 'Adapters',
      description: 'Felles struktur for lokale tjenester, gateways og adapters.',
    },
  ]
}

export function getEdgeHealthSummary(
  statuses: EdgeIntegrationStatus[],
  zigbeeDevices: ZigbeeDevice[],
): EdgeHealthSummary {
  const coordinator = getCoordinator(zigbeeDevices)
  const joinedDevices = zigbeeDevices.filter((device) => device.kind !== 'coordinator')
  const offlineDevices = joinedDevices.filter((device) => !device.online)
  const weakSignalDevices = zigbeeDevices.filter(
    (device) => typeof device.signalStrength === 'number' && device.signalStrength < 50,
  )
  const onlineGateways = statuses.filter((status) => status.online)
  const issues = [
    !coordinator?.online ? 'Zigbee gateway rapporterer ikke live ennå.' : '',
    offlineDevices.length > 0 ? `${offlineDevices.length} Zigbee-enheter er ikke online i foundation.` : '',
    weakSignalDevices.length > 0 ? `${weakSignalDevices.length} enheter har svakt signal.` : '',
  ].filter(Boolean)

  if (onlineGateways.length > 0 && issues.length === 0) {
    return {
      level: 'stable',
      label: 'Edge foundation stabil',
      nivaSummary: 'Edge-laget ser stabilt ut. Zigbee gateway er online, og adapterstrukturen er klar.',
      issues,
    }
  }

  if (onlineGateways.length > 0) {
    return {
      level: 'foundation',
      label: 'Edge foundation delvis klar',
      nivaSummary: 'Zigbee gateway er online, men noen edge-enheter er fortsatt bare foundation eller stille.',
      issues,
    }
  }

  return {
    level: 'attention',
    label: 'Edge foundation venter på live runtime',
    nivaSummary: 'Edge-laget er modellert, men bruker foreløpig foundation-data og siste kjente struktur.',
    issues,
  }
}

export function formatEdgeStatusLabel(status: EdgeHealthLevel) {
  if (status === 'online') {
    return 'Online'
  }

  if (status === 'standby') {
    return 'Klar struktur'
  }

  if (status === 'quiet') {
    return 'Stille'
  }

  return 'Ikke aktiv'
}
