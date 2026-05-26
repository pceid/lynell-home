export type VacuumStatus = 'idle' | 'cleaning' | 'paused' | 'returning' | 'docked' | 'charging' | 'error'

export type VacuumCapability =
  | 'start'
  | 'pause'
  | 'dock'
  | 'cleanRoom'
  | 'cleanZone'
  | 'battery'
  | 'mapSupport'
  | 'binStatus'

export type AssistantIntegrationStatus = {
  provider: string
  selectedMethodId: string
  mode: 'local' | 'cloud' | 'foundation'
  authRequired: boolean
  connected: boolean
  lastSyncAt: string | null
  apiStatus: 'foundation' | 'connected' | 'offline' | 'error'
  label: string
  nextStep: string
  options: AssistantIntegrationOption[]
  trustState?: 'online' | 'stale' | 'offline' | 'unknown' | string
  freshness?: 'fresh' | 'aging' | 'stale' | 'unknown' | string
  stateConfidence?: 'high' | 'medium' | 'low' | string
  sourceAgeMs?: number | null
  runtimeConnected?: boolean
  cloudAuthenticated?: boolean
  deviceReachable?: boolean
}

export type AssistantIntegrationOption = {
  methodId: string
  label: string
  connectionType: 'cloud' | 'local' | 'bridge' | 'hybrid'
  authRequired: boolean
  status: 'research' | 'candidate' | 'later'
  risk: 'lav' | 'middels' | 'høy'
  strategicRole: 'native' | 'bridge' | 'compatibility' | 'development'
  premiumFit: 'high' | 'medium' | 'low'
  dependencyLevel: 'standalone' | 'externalBridge' | 'cloudDependency'
  futurePriority: number
  uncertainty: string
  nextStep: string
  recommended: boolean
}

export type VacuumDevice = {
  id: string
  deviceId: string
  name: string
  type: 'robotVacuum'
  manufacturer: string
  model: string
  battery: number
  status: VacuumStatus
  currentRoom: string | null
  currentArea: string | null
  cleaning: boolean
  docked: boolean
  charging: boolean
  rawStatus?: VacuumStatus | string | null
  trustState?: 'online' | 'stale' | 'offline' | 'unknown' | string
  freshness?: 'fresh' | 'aging' | 'stale' | 'unknown' | string
  stateConfidence?: 'high' | 'medium' | 'low' | string
  firstSeen?: string | null
  lastSeenAt?: string | null
  statusAgeMs?: number | null
  sourceAgeMs?: number | null
  cachedData?: boolean
  estimatedState?: boolean
  trustMessage?: string | null
  runtimeConnected?: boolean
  cloudAuthenticated?: boolean
  deviceReachable?: boolean
  progress: number
  cleaningProgress: number
  lastCleanedAt: string | null
  estimatedFinishAt: string | null
  errorState: string | null
  capabilities: VacuumCapability[]
  integrationStatus: AssistantIntegrationStatus
  availableAreas: string[]
}
