export type IntegrationSetupCategory =
  | 'media'
  | 'assistant'
  | 'edge'
  | 'calendar'
  | 'weather'
  | 'security'

export type IntegrationSetupStatus =
  | 'notConfigured'
  | 'foundation'
  | 'readyToConnect'
  | 'connected'
  | 'error'

export type IntegrationConnectionType = 'local' | 'cloud' | 'hybrid' | 'foundation'
export type IntegrationReadinessStatus =
  | 'Ikke startet'
  | 'Foundation klar'
  | 'Klar for teknisk kobling'
  | 'Krever ekstern avklaring'
  | 'Koblet'

export type IntegrationSetupItem = {
  integrationId: string
  name: string
  category: IntegrationSetupCategory
  provider: string
  status: IntegrationSetupStatus
  setupStep: string
  connectionType: IntegrationConnectionType
  requiresAuth: boolean
  requiresLocalNetwork: boolean
  notes: string
  nextAction: string
  readinessStatus: IntegrationReadinessStatus
  ready: string[]
  missing: string[]
  technicalNextActions: string[]
  methodOptions?: IntegrationSetupMethodOption[]
  steps: string[]
}

export type IntegrationSetupMethodOption = {
  methodId: string
  label: string
  connectionType: IntegrationConnectionType | 'bridge'
  authRequired: boolean
  status: 'research' | 'candidate' | 'later'
  risk: 'lav' | 'middels' | 'høy'
  uncertainty: string
  nextStep: string
  recommended: boolean
}

export const integrationSetupItems: IntegrationSetupItem[] = [
  {
    integrationId: 'dream-d20-plus',
    name: 'Dream D20 Plus',
    category: 'assistant',
    provider: 'Robot adapter-strategi',
    status: 'foundation',
    setupStep: '4. Koble senere',
    connectionType: 'cloud',
    requiresAuth: true,
    requiresLocalNetwork: false,
    notes: 'Assistentmodellen og bridge-adapterfundamentet er klart, men ekte robot-API og innlogging er ikke implementert.',
    nextAction: 'Premium-retningen er native Lynell-runtime. Bruk Home Assistant kun som optional bro for rask live-test.',
    readinessStatus: 'Krever ekstern avklaring',
    ready: [
      'Assistentmodell og Dream D20 Plus-target finnes',
      'Foundation-status, batteri, område og kontrollflate er modellert',
      'NIVA vet at roboten ikke er ekte koblet ennå',
      'Bridge har disabled-by-default robot-runtime foundation uten credentials i frontend',
    ],
    missing: [
      'Valgt ekte adapter må avklares',
      'Auth/login og modell-ID mangler',
      'Sone- og rommapping mot robotens områdebegreper mangler',
    ],
    technicalNextActions: [
      'Avklar Dreame native cloud adapter som primær premium-retning',
      'Bruk Home Assistant bridge kun som optional kompatibilitetstest hvis tilgjengelig',
      'Finn modell-ID og provider-krav',
      'Definer soner/rommapping',
      'Test kommando: status/start/dock',
    ],
    methodOptions: [
      {
        methodId: 'dreame-xiaomi-cloud',
        label: 'Dreame native cloud adapter',
        connectionType: 'cloud',
        authRequired: true,
        status: 'candidate',
        risk: 'middels',
        uncertainty: 'API-tilgang, auth-flyt og stabilitet må avklares før implementering.',
        nextStep: 'Avklar Dreame API/metode, modell-ID og auth-flyt for native Lynell-runtime.',
        recommended: true,
      },
      {
        methodId: 'local-runtime',
        label: 'Lynell lokal runtime',
        connectionType: 'local',
        authRequired: false,
        status: 'research',
        risk: 'høy',
        uncertainty: 'Det er ikke bekreftet at Dream D20 Plus tilbyr stabil lokal LAN-kontroll.',
        nextStep: 'Undersøk lokal protokoll/token og capability mapping før lokal runtime bygges.',
        recommended: false,
      },
      {
        methodId: 'home-assistant-bridge',
        label: 'Home Assistant kompatibilitetsbro',
        connectionType: 'bridge',
        authRequired: true,
        status: 'candidate',
        risk: 'middels',
        uncertainty: 'Avhenger av valgt HA-integrasjon og hvordan robotens rom/soner eksponeres.',
        nextStep: 'Bruk som optional bro for rask live-test; ikke som langsiktig hovedmotor.',
        recommended: false,
      },
      {
        methodId: 'mqtt-bridge',
        label: 'Lynell MQTT bridge',
        connectionType: 'hybrid',
        authRequired: false,
        status: 'later',
        risk: 'middels',
        uncertainty: 'Krever en egen adapter som normaliserer robotstatus til Lynell.',
        nextStep: 'Definer topic namespace og payload-modell for robotstatus/kommandoer.',
        recommended: false,
      },
    ],
    steps: [
      'Velg leverandør',
      'Velg tilkoblingstype',
      'Autentisering kreves',
      'Koble senere',
    ],
  },
  {
    integrationId: 'google-home-cast',
    name: 'Google Home / Cast',
    category: 'media',
    provider: 'Google Cast',
    status: 'foundation',
    setupStep: '4. Koble senere',
    connectionType: 'local',
    requiresAuth: false,
    requiresLocalNetwork: true,
    notes: 'Media outputs er modellert, men Cast discovery og avspilling er ikke aktivert.',
    nextAction: 'Avklar LAN-discovery og stream-kilde før testavspilling legges inn.',
    readinessStatus: 'Foundation klar',
    ready: [
      'Media output-modell og routing-foundation finnes',
      'Google Home kan vises som fysisk output',
      'NIVA kan forklare at ekstern casting ikke er aktiv',
    ],
    missing: [
      'Cast-enheter oppdages ikke på LAN ennå',
      'Stream-kilde/bibliotek for ekstern avspilling er ikke valgt',
      'Volume- og output-mapping mangler',
    ],
    technicalNextActions: [
      'Finn Cast-enheter på LAN',
      'Velg bibliotek/stream-kilde',
      'Test avspilling',
      'Map volume og output devices',
    ],
    steps: [
      'Finn enheter på nettverk',
      'Velg output',
      'Test avspilling',
      'Koble senere',
    ],
  },
  {
    integrationId: 'sonos-foundation',
    name: 'Sonos',
    category: 'media',
    provider: 'Sonos',
    status: 'notConfigured',
    setupStep: '1. Velg leverandør',
    connectionType: 'local',
    requiresAuth: false,
    requiresLocalNetwork: true,
    notes: 'Klar som fremtidig media-output, men ingen Sonos runtime finnes ennå.',
    nextAction: 'Velg lokal discovery-strategi og definer playback/volume-endepunkter senere.',
    readinessStatus: 'Ikke startet',
    ready: [
      'Sonos er definert som fremtidig media-kategori',
      'Media-routing kan senere gjenbruke output-modellen',
    ],
    missing: [
      'Lokal discovery mangler',
      'Device grouping mangler',
      'Playback endpoint og volume mapping mangler',
    ],
    technicalNextActions: [
      'Legg lokal discovery',
      'Definer device grouping',
      'Velg playback endpoint',
      'Map volume per device/gruppe',
    ],
    steps: [
      'Velg leverandør',
      'Finn høyttalere lokalt',
      'Velg output-grupper',
      'Koble senere',
    ],
  },
  {
    integrationId: 'sonoff-zbdongle-e',
    name: 'SONOFF ZBDongle-E',
    category: 'edge',
    provider: 'SONOFF / Zigbee',
    status: 'foundation',
    setupStep: '3. Pair devices senere',
    connectionType: 'local',
    requiresAuth: false,
    requiresLocalNetwork: true,
    notes: 'Coordinator og device-lifecycle er modellert med Zigbee2MQTT som første lokale runtime-retning. Ekte runtime er ikke startet.',
    nextAction: 'Sett MQTT-parametre, coordinator path og Zigbee2MQTT topic namespace før pairing-flow kobles senere.',
    readinessStatus: 'Klar for teknisk kobling',
    ready: [
      'Coordinator og joined devices finnes som foundation',
      'Device lifecycle, signal, batteri og room assignment er modellert',
      'Manager viser Zigbee som edge-nivå, ikke brukerflate',
    ],
    missing: [
      'Zigbee2MQTT er ikke installert eller startet',
      'Coordinator path og MQTT broker må avklares',
      'Pairing flow og device mapping mangler',
    ],
    technicalNextActions: [
      'Bruk Zigbee2MQTT som første runtime-retning',
      'Sett coordinator path',
      'Koble MQTT broker',
      'Definer Zigbee2MQTT topic namespace',
      'Planlegg retained state og birth/last-will',
      'Definer pairing flow',
      'Map devices til rom og kategori',
    ],
    steps: [
      'Registrer coordinator',
      'Klargjør Zigbee2MQTT senere',
      'Pair devices senere',
    ],
  },
  {
    integrationId: 'mqtt-broker',
    name: 'MQTT',
    category: 'edge',
    provider: 'MQTT Broker',
    status: 'readyToConnect',
    setupStep: '2. Koble lokal broker senere',
    connectionType: 'local',
    requiresAuth: false,
    requiresLocalNetwork: true,
    notes: 'Konfigurasjonsfelt finnes. Broker-runtime og Zigbee2MQTT-trafikk er ikke implementert.',
    nextAction: 'Fyll broker-parametre og definer topic namespace for Zigbee2MQTT før runtime kobles.',
    readinessStatus: 'Klar for teknisk kobling',
    ready: [
      'MQTT-konfigurasjon finnes i SystemConfig',
      'Manager har teknisk feltstruktur',
      'Edge foundation kan vise MQTT-status',
    ],
    missing: [
      'Broker host/port/auth må valideres',
      'Topic namespace for Zigbee2MQTT mangler',
      'Retained state og birth/last-will er ikke definert',
    ],
    technicalNextActions: [
      'Sett broker host',
      'Sett port',
      'Avklar auth',
      'Definer topic namespace',
      'Bestem retained state',
      'Definer birth/last-will',
    ],
    steps: [
      'Sett broker host',
      'Koble lokal broker senere',
      'Rute adaptertrafikk senere',
    ],
  },
  {
    integrationId: 'weather-api',
    name: 'Weather API',
    category: 'weather',
    provider: 'Yr / ekstern værkilde',
    status: 'foundation',
    setupStep: '2. Bekreft datakilde senere',
    connectionType: 'cloud',
    requiresAuth: false,
    requiresLocalNetwork: false,
    notes: 'Vær-awareness finnes med fallback. Full værstasjon-runtime er ikke koblet.',
    nextAction: 'Bekreft lokasjon, forecast-intervall og fallback-regel for videre værintegrasjon.',
    readinessStatus: 'Foundation klar',
    ready: [
      'Vær-awareness og fallback-språk finnes',
      'Værstasjonspunkter finnes i Manager',
      'NIVA kan forklare værstatus uten live værstasjon',
    ],
    missing: [
      'Lokasjon/koordinater bør bekreftes',
      'Forecast-intervall og fallback-regel må formaliseres',
      'Last updated-flyt må vises tydelig når datakilde kobles',
    ],
    technicalNextActions: [
      'Bekreft lokasjon/koordinater',
      'Velg forecast-intervall',
      'Definer fallback',
      'Vis last updated fra valgt kilde',
    ],
    steps: [
      'Velg værkilde',
      'Bekreft datakilde senere',
      'Koble lokal værstasjon senere',
    ],
  },
]

export function formatIntegrationSetupStatus(status: IntegrationSetupStatus) {
  if (status === 'notConfigured') {
    return 'Ikke koblet'
  }

  if (status === 'foundation') {
    return 'Foundation'
  }

  if (status === 'readyToConnect') {
    return 'Klar for test'
  }

  if (status === 'connected') {
    return 'Koblet'
  }

  return 'Trenger sjekk'
}

export function getIntegrationReadinessRank(status: IntegrationReadinessStatus) {
  const ranks: Record<IntegrationReadinessStatus, number> = {
    Koblet: 5,
    'Klar for teknisk kobling': 4,
    'Foundation klar': 3,
    'Krever ekstern avklaring': 2,
    'Ikke startet': 1,
  }

  return ranks[status]
}

export function getIntegrationSetupSummary(items = integrationSetupItems) {
  const foundationCount = items.filter((item) => item.status === 'foundation').length
  const readyCount = items.filter((item) => item.status === 'readyToConnect').length
  const connectedCount = items.filter((item) => item.status === 'connected').length

  if (connectedCount > 0) {
    return `${connectedCount} integrasjoner er koblet, og ${foundationCount} står som foundation.`
  }

  if (readyCount > 0) {
    return `${readyCount} integrasjoner er klare for senere kobling. De fleste bruker fortsatt foundation.`
  }

  return 'Integrasjonsoppsettet er ryddet som foundation, men ingen ekte eksterne koblinger er aktive ennå.'
}

export function findIntegrationSetupItem(text: string, items = integrationSetupItems) {
  const normalized = text.toLowerCase()

  return items.find((item) => {
    const haystack = `${item.integrationId} ${item.name} ${item.provider} ${item.category}`.toLowerCase()
    return haystack
      .split(/[\s/.-]+/)
      .filter((part) => part.length > 2)
      .some((part) => normalized.includes(part))
  }) ?? null
}
