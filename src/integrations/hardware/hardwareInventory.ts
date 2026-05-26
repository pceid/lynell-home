export type HardwareType =
  | 'knx-ip-interface'
  | 'knx-ip-router'
  | 'raspberry-pi'
  | 'mini-pc'
  | 'sonoff-zbdongle-e'
  | 'mqtt-broker'
  | 'google-home'
  | 'sonos'
  | 'access-point'
  | 'nas'
  | 'weather-station'
  | 'bridge-server'
  | 'assistant'

export type HardwareFoundationStatus = 'foundation' | 'planned' | 'configured' | 'optional'
export type HardwareHealthState = 'online' | 'offline' | 'standby' | 'unknown'
export type HardwareCriticality = 'critical' | 'important' | 'optional'

export type HardwareInventoryItem = {
  id: string
  name: string
  type: HardwareType
  location: string
  role: string
  online: boolean
  health: HardwareHealthState
  lastContact: string
  integrationLinks: string[]
  runtimeRole: string
  criticality: HardwareCriticality
  foundationStatus: HardwareFoundationStatus
  notes: string
}

export type HardwareTopologyGroup = {
  id: string
  title: string
  summary: string
  itemIds: string[]
}

export const hardwareInventoryItems: HardwareInventoryItem[] = [
  {
    id: 'lynell-core',
    name: 'Lynell Core',
    type: 'mini-pc',
    location: 'Teknisk',
    role: 'Frontend og lokal systemflate',
    online: true,
    health: 'standby',
    lastContact: 'Denne app-sesjonen',
    integrationLinks: ['bridge-server', 'mqtt-broker', 'google-home-cast', 'dream-d20-plus'],
    runtimeRole: 'Core UI / awareness',
    criticality: 'critical',
    foundationStatus: 'foundation',
    notes: 'Representerer Lynell-applikasjonen. Ekte host-monitoring er ikke koblet ennå.',
  },
  {
    id: 'knx-bridge-server',
    name: 'KNX Bridge / server',
    type: 'bridge-server',
    location: 'Teknisk',
    role: 'Lokal bro mellom Lynell og KNX/media',
    online: true,
    health: 'standby',
    lastContact: 'Siste kjente bridge health',
    integrationLinks: ['knx-ip-interface'],
    runtimeRole: 'KNX config, feedback og lokal media-servering',
    criticality: 'critical',
    foundationStatus: 'configured',
    notes: 'Bridge-awareness bygger på eksisterende diagnose. Ingen ny monitoring er lagt til.',
  },
  {
    id: 'knx-ip-interface',
    name: 'KNX IP Interface',
    type: 'knx-ip-interface',
    location: 'Teknisk skap',
    role: 'KNX backbone mot fysisk installasjon',
    online: false,
    health: 'unknown',
    lastContact: 'Avledes av bridge senere',
    integrationLinks: ['knx-bridge-server'],
    runtimeRole: 'KNX transport',
    criticality: 'critical',
    foundationStatus: 'foundation',
    notes: 'Fysisk KNX-interface er modellert, men ikke separat overvåket.',
  },
  {
    id: 'mqtt-broker',
    name: 'MQTT Broker',
    type: 'mqtt-broker',
    location: 'Teknisk / LAN',
    role: 'Meldingsbuss for fremtidige edge-adapters',
    online: false,
    health: 'offline',
    lastContact: 'Ikke koblet',
    integrationLinks: ['sonoff-zbdongle-e'],
    runtimeRole: 'Edge transport senere',
    criticality: 'important',
    foundationStatus: 'planned',
    notes: 'Konfigurasjon finnes, men broker-runtime er ikke aktiv.',
  },
  {
    id: 'sonoff-zbdongle-e',
    name: 'SONOFF ZBDongle-E',
    type: 'sonoff-zbdongle-e',
    location: 'Teknisk / USB host',
    role: 'Zigbee coordinator',
    online: false,
    health: 'standby',
    lastContact: 'Foundation',
    integrationLinks: ['mqtt-broker', 'zigbee'],
    runtimeRole: 'Zigbee edge gateway senere',
    criticality: 'important',
    foundationStatus: 'foundation',
    notes: 'Coordinator er representert i Edge, men ekte Zigbee runtime mangler.',
  },
  {
    id: 'google-home-kitchen',
    name: 'Google Home Kjøkken',
    type: 'google-home',
    location: 'Kjøkken',
    role: 'Media output',
    online: false,
    health: 'unknown',
    lastContact: 'Ikke oppdaget',
    integrationLinks: ['google-home-cast'],
    runtimeRole: 'Cast output senere',
    criticality: 'optional',
    foundationStatus: 'foundation',
    notes: 'Fysisk media-output er modellert. Cast discovery er ikke bygget.',
  },
  {
    id: 'sonos-foundation',
    name: 'Sonos foundation',
    type: 'sonos',
    location: 'Oppholdsrom',
    role: 'Multiroom media senere',
    online: false,
    health: 'unknown',
    lastContact: 'Ikke konfigurert',
    integrationLinks: ['sonos-foundation'],
    runtimeRole: 'Media output senere',
    criticality: 'optional',
    foundationStatus: 'planned',
    notes: 'Sonos er kun en fremtidig hardware-retning ennå.',
  },
  {
    id: 'dream-d20-plus',
    name: 'Dream D20 Plus',
    type: 'assistant',
    location: 'Ladestasjon',
    role: 'Fysisk assistent',
    online: false,
    health: 'standby',
    lastContact: 'Simulert status',
    integrationLinks: ['dream-d20-plus'],
    runtimeRole: 'Assistent-runtime senere',
    criticality: 'optional',
    foundationStatus: 'foundation',
    notes: 'Robotstatus er foundation/mock. Ekte API er ikke koblet.',
  },
  {
    id: 'home-access-point',
    name: 'Access Point / LAN',
    type: 'access-point',
    location: 'Huset',
    role: 'Lokal nettverksinfrastruktur',
    online: false,
    health: 'unknown',
    lastContact: 'Ikke overvåket',
    integrationLinks: ['google-home-cast', 'mqtt-broker'],
    runtimeRole: 'LAN discovery senere',
    criticality: 'important',
    foundationStatus: 'planned',
    notes: 'Ikke pinget eller overvåket. Kun topologi-awareness.',
  },
  {
    id: 'weather-station',
    name: 'Weather station',
    type: 'weather-station',
    location: 'Ute',
    role: 'Lokal vær og miljødata',
    online: false,
    health: 'unknown',
    lastContact: 'Ikke koblet',
    integrationLinks: ['weather-api'],
    runtimeRole: 'Værstasjon-runtime senere',
    criticality: 'optional',
    foundationStatus: 'foundation',
    notes: 'KNX-punkter finnes i Manager, men live værstasjon-runtime mangler.',
  },
]

export const hardwareTopologyGroups: HardwareTopologyGroup[] = [
  {
    id: 'core',
    title: 'Lynell Core',
    summary: 'App, awareness og lokal systemflate.',
    itemIds: ['lynell-core', 'knx-bridge-server'],
  },
  {
    id: 'backbone',
    title: 'KNX / lokal backbone',
    summary: 'Fysisk basis for lys, klima og feedback.',
    itemIds: ['knx-ip-interface'],
  },
  {
    id: 'edge',
    title: 'Edge / gateways',
    summary: 'Gateways og meldingslag for fremtidige lokale adapters.',
    itemIds: ['mqtt-broker', 'sonoff-zbdongle-e', 'home-access-point'],
  },
  {
    id: 'media',
    title: 'Media hardware',
    summary: 'Fysiske outputs og multiroom-retning.',
    itemIds: ['google-home-kitchen', 'sonos-foundation'],
  },
  {
    id: 'physical',
    title: 'Assistenter og miljø',
    summary: 'Fysiske assistenter og lokal miljøhardware.',
    itemIds: ['dream-d20-plus', 'weather-station'],
  },
]

export function formatHardwareType(type: HardwareType) {
  const labels: Record<HardwareType, string> = {
    'knx-ip-interface': 'KNX IP Interface',
    'knx-ip-router': 'KNX IP Router',
    'raspberry-pi': 'Raspberry Pi',
    'mini-pc': 'Mini-PC',
    'sonoff-zbdongle-e': 'SONOFF ZBDongle-E',
    'mqtt-broker': 'MQTT broker',
    'google-home': 'Google Home',
    sonos: 'Sonos',
    'access-point': 'Access Point',
    nas: 'NAS',
    'weather-station': 'Weather station',
    'bridge-server': 'Bridge/server',
    assistant: 'Assistent',
  }

  return labels[type]
}

export function formatHardwareHealth(health: HardwareHealthState) {
  if (health === 'online') {
    return 'Online'
  }

  if (health === 'standby') {
    return 'Foundation'
  }

  if (health === 'offline') {
    return 'Ikke koblet'
  }

  return 'Ikke overvåket'
}

export function getHardwareHealthSummary(items = hardwareInventoryItems) {
  const criticalItems = items.filter((item) => item.criticality === 'critical')
  const onlineItems = items.filter((item) => item.online)
  const offlineImportant = items.filter(
    (item) => !item.online && item.criticality !== 'optional' && item.foundationStatus !== 'planned',
  )

  return {
    label:
      offlineImportant.length > 0
        ? 'Hardware foundation delvis klar'
        : 'Hardware foundation ryddig',
    nivaSummary:
      offlineImportant.length > 0
        ? `${criticalItems.length} kritiske hardware-roller er modellert, men enkelte signaler er ikke live-overvåket ennå.`
        : `${onlineItems.length} hardware-roller er markert som aktive i foundation. Ekte hardware-monitoring er ikke bygget ennå.`,
    criticalCount: criticalItems.length,
    onlineCount: onlineItems.length,
    offlineImportantCount: offlineImportant.length,
  }
}

export function findHardwareItem(text: string, items = hardwareInventoryItems) {
  const normalized = text.toLowerCase()

  return items.find((item) => {
    const haystack = `${item.id} ${item.name} ${item.type} ${item.role} ${item.runtimeRole}`.toLowerCase()

    return haystack
      .split(/[\s/.-]+/)
      .filter((part) => part.length > 2)
      .some((part) => normalized.includes(part))
  }) ?? null
}
