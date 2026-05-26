export type UiCapabilityMaturity = 'live' | 'enabled' | 'foundation' | 'future' | 'developer'

export type UiCapabilityCategory = 'core' | 'premiumHome' | 'microSd' | 'energyFuture' | 'developer'

export type UiCapabilityScope =
  | 'card'
  | 'domain'
  | 'roomFeature'
  | 'systemPanel'
  | 'futureFeature'

export type UiCapabilityId =
  | 'home'
  | 'rooms'
  | 'lighting'
  | 'climate'
  | 'shading'
  | 'camera'
  | 'media'
  | 'assistants'
  | 'calendar'
  | 'manager'
  | 'trendHistory'
  | 'centralFunctions'
  | 'windowWash'
  | 'screenWash'
  | 'awayMode'
  | 'nightMode'
  | 'guestMode'
  | 'hcl'
  | 'energy'
  | 'heatingPlant'
  | 'ventilation'
  | 'optimizer'
  | 'dampers'
  | 'vav'
  | 'technicalOperations'
  | 'energyFlow'
  | 'faultsAlarms'
  | 'solar'
  | 'battery'
  | 'evCharging'
  | 'waterMeter'
  | 'leakDetection'
  | 'developerDiagnostics'

export type RoomCapabilityId = 'lighting' | 'climate' | 'shading' | 'hcl' | 'dampers' | 'ventilation'

export type HclTimelinePoint = {
  id: string
  time: string
  intensity: number
  colorTemperature: number
}

export type HclFoundationConfig = {
  enabled: boolean
  dryRun: boolean
  optionalIntensityGa: string
  optionalColorTemperatureGa: string
  timeline: HclTimelinePoint[]
}

export type UiCapabilityDefinition = {
  id: UiCapabilityId
  label: string
  description: string
  category: UiCapabilityCategory
  scopes: UiCapabilityScope[]
  defaultVisible: boolean
  defaultEnabled: boolean
  maturity: UiCapabilityMaturity
  roomScoped?: boolean
  requiresProvider?: string | null
  requiresCapability?: string | null
  developerOnly?: boolean
  futureOnly?: boolean
  locked?: boolean
  navView?: string | null
}

export type UiCapabilityOverride = {
  visible?: boolean
  enabled?: boolean
}

export type RoomCapabilityOverride = Partial<Record<RoomCapabilityId, UiCapabilityOverride>>

export type UiCapabilityConfig = {
  version: 1
  showFutureFeatures: boolean
  updatedAt: string | null
  overrides: Partial<Record<UiCapabilityId, UiCapabilityOverride>>
  roomOverrides: Record<string, RoomCapabilityOverride>
  hcl: HclFoundationConfig
}

export type ResolvedUiCapability = UiCapabilityDefinition & {
  visible: boolean
  enabled: boolean
  hiddenReason: string | null
}

export type UiCapabilitySummary = {
  total: number
  visible: number
  enabled: number
  disabled: number
  hidden: number
  future: number
  developer: number
  foundation: number
  roomScoped: number
  futureVisible: number
}

export type RoomCapabilitySummary = {
  roomKey: string
  roomName: string
  visible: RoomCapabilityId[]
  enabled: RoomCapabilityId[]
  hidden: RoomCapabilityId[]
}

const defaultHclTimeline: HclTimelinePoint[] = [
  { id: 'morning', time: '07:00', intensity: 35, colorTemperature: 2700 },
  { id: 'day', time: '12:00', intensity: 75, colorTemperature: 4200 },
  { id: 'evening', time: '19:00', intensity: 45, colorTemperature: 3000 },
  { id: 'night', time: '23:00', intensity: 12, colorTemperature: 2200 },
]

export const roomCapabilityDefinitions: Array<{
  id: RoomCapabilityId
  label: string
  description: string
  defaultVisible: boolean
  defaultEnabled: boolean
  maturity: UiCapabilityMaturity
}> = [
  {
    id: 'lighting',
    label: 'Lys',
    description: 'Lysstatus og soner for rommet.',
    defaultVisible: true,
    defaultEnabled: true,
    maturity: 'live',
  },
  {
    id: 'climate',
    label: 'Klima',
    description: 'Temperatur, settpunkt og varmebehov når rommet har klima.',
    defaultVisible: true,
    defaultEnabled: true,
    maturity: 'live',
  },
  {
    id: 'shading',
    label: 'Solskjerming',
    description: 'Romspesifikk solskjerming når det er konfigurert.',
    defaultVisible: true,
    defaultEnabled: true,
    maturity: 'foundation',
  },
  {
    id: 'hcl',
    label: 'HCL',
    description: 'Human Centric Lighting foundation. Ingen runtime execution.',
    defaultVisible: false,
    defaultEnabled: false,
    maturity: 'future',
  },
  {
    id: 'dampers',
    label: 'Spjeld',
    description: 'Spjeld/VAV foundation for tekniske rom. Ingen runtime execution.',
    defaultVisible: false,
    defaultEnabled: false,
    maturity: 'future',
  },
  {
    id: 'ventilation',
    label: 'Ventilasjon',
    description: 'Romrelatert ventilasjon foundation. Ingen runtime execution.',
    defaultVisible: false,
    defaultEnabled: false,
    maturity: 'future',
  },
]

export const uiCapabilityDefinitions: UiCapabilityDefinition[] = [
  {
    id: 'home',
    label: 'Hjem',
    description: 'Hovedoversikt og NIVA presence.',
    category: 'core',
    scopes: ['systemPanel'],
    defaultVisible: true,
    defaultEnabled: true,
    maturity: 'live',
    locked: true,
    navView: 'home',
  },
  {
    id: 'rooms',
    label: 'Rom',
    description: 'Romoversikt og romkort.',
    category: 'core',
    scopes: ['domain', 'card'],
    defaultVisible: true,
    defaultEnabled: true,
    maturity: 'live',
    locked: true,
    navView: 'rooms',
  },
  {
    id: 'lighting',
    label: 'Lys',
    description: 'Lys og lyssoner.',
    category: 'core',
    scopes: ['domain', 'roomFeature'],
    defaultVisible: true,
    defaultEnabled: true,
    maturity: 'live',
    roomScoped: true,
    requiresCapability: 'writeState',
    navView: 'lights',
  },
  {
    id: 'climate',
    label: 'Klima',
    description: 'Temperatur, settpunkt og varmebehov.',
    category: 'core',
    scopes: ['domain', 'roomFeature'],
    defaultVisible: true,
    defaultEnabled: true,
    maturity: 'live',
    roomScoped: true,
    requiresCapability: 'readState',
    navView: 'climate',
  },
  {
    id: 'shading',
    label: 'Solskjerming',
    description: 'Solskjerming foundation og romtilknytning.',
    category: 'premiumHome',
    scopes: ['domain', 'roomFeature'],
    defaultVisible: true,
    defaultEnabled: true,
    maturity: 'foundation',
    roomScoped: true,
    navView: 'shading',
  },
  {
    id: 'camera',
    label: 'Kamera',
    description: 'Kameraflate for senere provider-kobling.',
    category: 'premiumHome',
    scopes: ['domain', 'card'],
    defaultVisible: true,
    defaultEnabled: true,
    maturity: 'foundation',
    navView: 'camera',
  },
  {
    id: 'media',
    label: 'Media',
    description: 'Media og Cast-provider trust.',
    category: 'premiumHome',
    scopes: ['domain', 'card'],
    defaultVisible: true,
    defaultEnabled: true,
    maturity: 'foundation',
    requiresProvider: 'cast',
    navView: 'media',
  },
  {
    id: 'assistants',
    label: 'Assistenter',
    description: 'NIVA og fysiske assistent-flater.',
    category: 'premiumHome',
    scopes: ['domain', 'card'],
    defaultVisible: true,
    defaultEnabled: true,
    maturity: 'foundation',
    navView: 'assistants',
  },
  {
    id: 'calendar',
    label: 'Kalender',
    description: 'Lokal kalender og NIVA forslag.',
    category: 'premiumHome',
    scopes: ['domain', 'card'],
    defaultVisible: true,
    defaultEnabled: true,
    maturity: 'foundation',
    navView: 'calendar',
  },
  {
    id: 'manager',
    label: 'Manager',
    description: 'Teknisk konfigurasjon og governance.',
    category: 'developer',
    scopes: ['systemPanel'],
    defaultVisible: true,
    defaultEnabled: true,
    maturity: 'developer',
    developerOnly: true,
    locked: true,
    navView: 'manager',
  },
  {
    id: 'trendHistory',
    label: 'Trendhistorikk',
    description: 'Historikk og lineage. Åpnes fra rom og detaljer.',
    category: 'developer',
    scopes: ['systemPanel'],
    defaultVisible: true,
    defaultEnabled: true,
    maturity: 'developer',
    developerOnly: true,
    navView: 'trend-history',
  },
  {
    id: 'developerDiagnostics',
    label: 'Developer diagnostics',
    description: 'Raw diagnostics, KNX tools, SSE og storage.',
    category: 'developer',
    scopes: ['systemPanel'],
    defaultVisible: true,
    defaultEnabled: true,
    maturity: 'developer',
    developerOnly: true,
    locked: true,
  },
  ...[
    ['centralFunctions', 'Sentralfunksjoner', 'Samlet foundation for globale husfunksjoner.'],
    ['windowWash', 'Vindusvask', 'Foundation for vindusvasker/robot senere.'],
    ['screenWash', 'Screenvask', 'Foundation for vedlikehold av screens.'],
    ['awayMode', 'Borte', 'Premium borte-modus foundation.'],
    ['nightMode', 'Natt', 'Premium natt-modus foundation.'],
    ['guestMode', 'Gjester', 'Gjesteopplevelse foundation.'],
    ['hcl', 'HCL', 'Human Centric Lighting UI/config foundation.'],
    ['energy', 'Energi', 'Energiopplevelse og prisbevisst UI foundation.'],
  ].map(
    ([id, label, description]) =>
      ({
        id,
        label,
        description,
        category: 'premiumHome',
        scopes: ['futureFeature', id === 'hcl' ? 'roomFeature' : 'card'],
        defaultVisible: false,
        defaultEnabled: false,
        maturity: 'future',
        roomScoped: id === 'hcl',
        futureOnly: true,
      }) as UiCapabilityDefinition,
  ),
  ...[
    ['heatingPlant', 'Varmesentral', 'Micro-SD teknisk foundation for varmesentral.'],
    ['ventilation', 'Ventilasjon', 'Micro-SD teknisk foundation for ventilasjon.'],
    ['optimizer', 'Optimizer', 'Optimizer foundation. Ingen execution.'],
    ['dampers', 'Spjeld', 'Spjeld foundation. Ingen spjeldlogikk.'],
    ['vav', 'VAV', 'VAV foundation. Ingen runtime execution.'],
    ['technicalOperations', 'Teknisk drift', 'Driftsflate foundation for bygg/runtime.'],
    ['energyFlow', 'Energiflyt', 'Energiflyt foundation.'],
    ['faultsAlarms', 'Feil/alarm', 'Feil/alarm foundation uten alarm-runtime.'],
  ].map(
    ([id, label, description]) =>
      ({
        id,
        label,
        description,
        category: 'microSd',
        scopes: ['futureFeature'],
        defaultVisible: false,
        defaultEnabled: false,
        maturity: 'future',
        futureOnly: true,
      }) as UiCapabilityDefinition,
  ),
  ...[
    ['solar', 'Solceller', 'Solcelle foundation.'],
    ['battery', 'Batteri', 'Batteri foundation.'],
    ['evCharging', 'EV charging', 'Elbillading foundation.'],
    ['waterMeter', 'Vannmåler', 'Vannmåler foundation.'],
    ['leakDetection', 'Lekkasjedeteksjon', 'Lekkasjedeteksjon foundation.'],
  ].map(
    ([id, label, description]) =>
      ({
        id,
        label,
        description,
        category: 'energyFuture',
        scopes: ['futureFeature'],
        defaultVisible: false,
        defaultEnabled: false,
        maturity: 'future',
        futureOnly: true,
      }) as UiCapabilityDefinition,
  ),
]

export function createInitialUiCapabilityConfig(): UiCapabilityConfig {
  return {
    version: 1,
    showFutureFeatures: false,
    updatedAt: null,
    overrides: {},
    roomOverrides: {},
    hcl: {
      enabled: false,
      dryRun: true,
      optionalIntensityGa: '',
      optionalColorTemperatureGa: '',
      timeline: defaultHclTimeline,
    },
  }
}

export function normalizeUiCapabilityConfig(value: unknown): UiCapabilityConfig {
  const fallback = createInitialUiCapabilityConfig()

  if (!value || typeof value !== 'object') {
    return fallback
  }

  const candidate = value as Partial<UiCapabilityConfig>

  return {
    version: 1,
    showFutureFeatures: Boolean(candidate.showFutureFeatures),
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : null,
    overrides:
      candidate.overrides && typeof candidate.overrides === 'object'
        ? candidate.overrides
        : {},
    roomOverrides:
      candidate.roomOverrides && typeof candidate.roomOverrides === 'object'
        ? candidate.roomOverrides
        : {},
    hcl: {
      enabled: Boolean(candidate.hcl?.enabled),
      dryRun: candidate.hcl?.dryRun !== false,
      optionalIntensityGa:
        typeof candidate.hcl?.optionalIntensityGa === 'string'
          ? candidate.hcl.optionalIntensityGa
          : '',
      optionalColorTemperatureGa:
        typeof candidate.hcl?.optionalColorTemperatureGa === 'string'
          ? candidate.hcl.optionalColorTemperatureGa
          : '',
      timeline:
        Array.isArray(candidate.hcl?.timeline) && candidate.hcl.timeline.length > 0
          ? candidate.hcl.timeline
          : defaultHclTimeline,
    },
  }
}

export function resolveUiCapabilities(config: UiCapabilityConfig): ResolvedUiCapability[] {
  return uiCapabilityDefinitions.map((definition) => {
    const override = config.overrides[definition.id] ?? {}
    const enabled = definition.locked
      ? true
      : typeof override.enabled === 'boolean'
        ? override.enabled
        : definition.defaultEnabled
    const visible = definition.locked
      ? true
      : typeof override.visible === 'boolean'
        ? override.visible
        : definition.defaultVisible
    const hiddenReason = visible
      ? null
      : definition.futureOnly
        ? 'future-disabled'
        : definition.developerOnly
          ? 'developer-hidden'
          : 'disabled'

    return {
      ...definition,
      enabled,
      visible,
      hiddenReason,
    }
  })
}

export function getUiCapabilityById(
  resolvedCapabilities: ResolvedUiCapability[],
  capabilityId: UiCapabilityId,
) {
  return resolvedCapabilities.find((capability) => capability.id === capabilityId) ?? null
}

export function isUiCapabilityVisible(
  resolvedCapabilities: ResolvedUiCapability[],
  capabilityId: UiCapabilityId,
) {
  const capability = getUiCapabilityById(resolvedCapabilities, capabilityId)
  return Boolean(capability?.visible && capability.enabled)
}

export function buildUiCapabilitySummary(
  resolvedCapabilities: ResolvedUiCapability[],
): UiCapabilitySummary {
  return {
    total: resolvedCapabilities.length,
    visible: resolvedCapabilities.filter((capability) => capability.visible).length,
    enabled: resolvedCapabilities.filter((capability) => capability.enabled).length,
    disabled: resolvedCapabilities.filter((capability) => !capability.enabled).length,
    hidden: resolvedCapabilities.filter((capability) => !capability.visible).length,
    future: resolvedCapabilities.filter((capability) => capability.maturity === 'future').length,
    developer: resolvedCapabilities.filter((capability) => capability.developerOnly).length,
    foundation: resolvedCapabilities.filter((capability) => capability.maturity === 'foundation').length,
    roomScoped: resolvedCapabilities.filter((capability) => capability.roomScoped).length,
    futureVisible: resolvedCapabilities.filter(
      (capability) => capability.futureOnly && capability.visible,
    ).length,
  }
}

export function getRoomCapabilityState(
  config: UiCapabilityConfig,
  roomKey: string,
  capabilityId: RoomCapabilityId,
) {
  const definition = roomCapabilityDefinitions.find((capability) => capability.id === capabilityId)
  const override = config.roomOverrides[roomKey]?.[capabilityId] ?? {}
  const enabled =
    typeof override.enabled === 'boolean'
      ? override.enabled
      : definition?.defaultEnabled ?? false
  const visible =
    typeof override.visible === 'boolean'
      ? override.visible
      : definition?.defaultVisible ?? false

  return { enabled, visible }
}

export function isRoomCapabilityVisible(
  config: UiCapabilityConfig,
  roomKey: string,
  capabilityId: RoomCapabilityId,
) {
  const state = getRoomCapabilityState(config, roomKey, capabilityId)
  return state.visible && state.enabled
}

export function buildRoomCapabilitySummaries(
  config: UiCapabilityConfig,
  rooms: Array<{ key: string; name: string }>,
): RoomCapabilitySummary[] {
  return rooms.map((room) => {
    const visible: RoomCapabilityId[] = []
    const enabled: RoomCapabilityId[] = []
    const hidden: RoomCapabilityId[] = []

    for (const definition of roomCapabilityDefinitions) {
      const state = getRoomCapabilityState(config, room.key, definition.id)
      if (state.visible) {
        visible.push(definition.id)
      } else {
        hidden.push(definition.id)
      }
      if (state.enabled) {
        enabled.push(definition.id)
      }
    }

    return {
      roomKey: room.key,
      roomName: room.name,
      visible,
      enabled,
      hidden,
    }
  })
}
