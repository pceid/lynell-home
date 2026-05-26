import type { AssistantIntegrationOption, VacuumDevice } from './vacuumTypes'

const dreamCapabilities: VacuumDevice['capabilities'] = [
  'start',
  'pause',
  'dock',
  'cleanRoom',
  'cleanZone',
  'battery',
  'mapSupport',
  'binStatus',
]

const dreamCleaningAreas = ['Oppholdsrom', 'Hovedetasjen', 'Hobbydel', 'Entré']

export const dreamD20PlusIntegrationOptions: AssistantIntegrationOption[] = [
  {
    methodId: 'dreame-xiaomi-cloud',
    label: 'Dreame native cloud adapter',
    connectionType: 'cloud',
    authRequired: true,
    status: 'candidate',
    risk: 'middels',
    strategicRole: 'native',
    premiumFit: 'high',
    dependencyLevel: 'cloudDependency',
    futurePriority: 1,
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
    strategicRole: 'native',
    premiumFit: 'high',
    dependencyLevel: 'standalone',
    futurePriority: 2,
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
    strategicRole: 'compatibility',
    premiumFit: 'medium',
    dependencyLevel: 'externalBridge',
    futurePriority: 4,
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
    strategicRole: 'bridge',
    premiumFit: 'high',
    dependencyLevel: 'externalBridge',
    futurePriority: 3,
    uncertainty: 'Krever en egen adapter som normaliserer robotstatus til Lynell.',
    nextStep: 'Definer topic namespace og payload-modell for robotstatus/kommandoer.',
    recommended: false,
  },
]

export const mockVacuumDevices: VacuumDevice[] = [
  {
    id: 'dream-d20-plus',
    deviceId: 'dream-d20-plus',
    name: 'Dream D20 Plus',
    type: 'robotVacuum',
    manufacturer: 'Dreame',
    model: 'Dream D20 Plus',
    battery: 86,
    status: 'docked',
    currentRoom: 'Ladestasjon',
    currentArea: 'Ladestasjon',
    cleaning: false,
    docked: true,
    charging: true,
    progress: 0,
    cleaningProgress: 0,
    lastCleanedAt: 'I går 18:42',
    estimatedFinishAt: null,
    errorState: null,
    capabilities: dreamCapabilities,
    integrationStatus: {
      provider: 'Robot adapter-strategi',
      selectedMethodId: 'dreame-xiaomi-cloud',
      mode: 'foundation',
      authRequired: true,
      connected: false,
      lastSyncAt: 'Simulert status',
      apiStatus: 'foundation',
      label: 'Foundation / ikke koblet',
      nextStep: 'Premium-retningen er native Lynell-runtime. HA kan brukes som optional bridge for første live-test.',
      options: dreamD20PlusIntegrationOptions,
    },
    availableAreas: dreamCleaningAreas,
  },
]

export function startMockVacuumCleaning(device: VacuumDevice, area = 'Oppholdsrom'): VacuumDevice {
  const finishAt = new Date(Date.now() + 38 * 60 * 1000)
  const startRoom = area === 'Entré' ? 'Entré' : area === 'Hobbydel' ? 'Hobby' : 'Stue'

  return {
    ...device,
    status: 'cleaning',
    currentRoom: startRoom,
    currentArea: area,
    cleaning: true,
    docked: false,
    charging: false,
    progress: Math.max(4, device.progress >= 100 ? 4 : device.progress),
    cleaningProgress: Math.max(4, device.cleaningProgress >= 100 ? 4 : device.cleaningProgress),
    estimatedFinishAt: new Intl.DateTimeFormat('nb-NO', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(finishAt),
  }
}

export function pauseMockVacuumCleaning(device: VacuumDevice): VacuumDevice {
  if (!device.cleaning) {
    return device
  }

  return {
    ...device,
    status: 'paused',
    cleaning: false,
    estimatedFinishAt: null,
  }
}

export function dockMockVacuum(device: VacuumDevice): VacuumDevice {
  return {
    ...device,
    status: 'returning',
    currentRoom: 'På vei til ladestasjon',
    currentArea: 'Ladestasjon',
    cleaning: false,
    docked: false,
    charging: false,
    estimatedFinishAt: null,
  }
}

export function tickMockVacuum(device: VacuumDevice): VacuumDevice {
  if (device.status === 'returning') {
    return {
      ...device,
      status: 'docked',
      currentRoom: 'Ladestasjon',
      currentArea: 'Ladestasjon',
      docked: true,
      charging: true,
    }
  }

  if (!device.cleaning) {
    return device
  }

  const nextProgress = Math.min(100, device.cleaningProgress + 2)
  const nextBattery = Math.max(12, device.battery - (nextProgress % 6 === 0 ? 1 : 0))

  if (nextProgress >= 100) {
    return {
      ...device,
      battery: nextBattery,
      status: 'docked',
      currentRoom: 'Ladestasjon',
      currentArea: 'Ladestasjon',
      cleaning: false,
      docked: true,
      charging: true,
      progress: 100,
      cleaningProgress: 100,
      lastCleanedAt: 'Nettopp',
      estimatedFinishAt: null,
    }
  }

  const activeArea = device.currentArea ?? 'Oppholdsrom'
  const nextRoom =
    activeArea === 'Entré'
      ? 'Entré'
      : activeArea === 'Hobbydel'
        ? 'Hobby'
        : nextProgress > 65
          ? 'Kjøkken'
          : nextProgress > 32
            ? 'Gang'
            : 'Stue'

  return {
    ...device,
    battery: nextBattery,
    currentRoom: nextRoom,
    progress: nextProgress,
    cleaningProgress: nextProgress,
  }
}

export function getVacuumStatusText(device: VacuumDevice) {
  const integrationText = device.integrationStatus.connected
    ? ''
    : ' Robotintegrasjonen er foundation og ikke koblet til ekte API ennå.'

  if (device.cleaning) {
    return `${device.model} rengjør ${device.currentArea ?? device.currentRoom ?? 'huset'} nå, ${device.cleaningProgress}% ferdig (${device.battery}%).${integrationText}`
  }

  if (device.docked) {
    return `${device.model} står på ladestasjonen med ${device.battery}% batteri. Sist rengjort: ${device.lastCleanedAt ?? 'ukjent'}.${integrationText}`
  }

  return `${device.model} er ${device.status} (${device.battery}%).${integrationText}`
}
