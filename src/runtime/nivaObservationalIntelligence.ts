import type { Room } from '../data/rooms'
import {
  classifyRuntimeHistorySource,
  getRuntimeHistorySourceDistribution,
  type RuntimeHistoryPoint,
  type RuntimeHistorySourceCategory,
} from './runtimeHistory'
import { getSignalUpdatePolicy, summarizeSignalUpdatePolicies } from './signalUpdatePolicy'

export type NivaObservationSeverity = 'info' | 'notice' | 'warning'
export type NivaObservationConfidence = 'low' | 'medium' | 'high'

export type NivaObservation = {
  observationId: string
  category:
    | 'temperatureDrop'
    | 'unmetSetpoint'
    | 'heatWhileCooling'
    | 'overheat'
    | 'staleSignal'
    | 'highHeatDemand'
    | 'lowHeatWhileCold'
    | 'pollTimeout'
    | 'restoredOnly'
    | 'staleDomain'
    | 'runtimeInstability'
    | 'sourceTrust'
    | 'providerFoundation'
  severity: NivaObservationSeverity
  confidence: NivaObservationConfidence
  createdAt: number
  sourceBasis: string
  relatedRoomKey?: string | null
  relatedRoomName?: string | null
  relatedEntity?: string | null
  affectedDomains: string[]
  explanation: string
  suggestedManualCheck: string
  requiresApproval: false
  evidence: string[]
  priorityScore?: number
  noiseScore?: number
  observationCooldownMs?: number
  groupKey?: string
}

export type NivaObservationRuleId =
  | 'temperature-drop'
  | 'unmet-setpoint'
  | 'heat-while-cooling'
  | 'overheat'
  | 'stale-temperature-heat'
  | 'long-high-heat-demand'
  | 'zero-heat-below-setpoint'
  | 'poll-timeouts'
  | 'restored-only'
  | 'stale-domain'
  | 'runtime-instability'
  | 'source-trust-dominance'
  | 'provider-foundation'

type PollGroup = {
  groupAddress?: string | null
  address?: string | null
  name?: string | null
  label?: string | null
  type?: string | null
  failureType?: string | null
  reason?: string | null
}

type RoomPollStateLike = {
  lastPollAt?: string | null
  result?: {
    failedGroups?: PollGroup[]
    skippedGroups?: PollGroup[]
    requestedGroups?: PollGroup[]
    updatedGroups?: PollGroup[]
  } | null
}

export type NivaObservationDiagnostics = {
  enabled: boolean
  deterministic: true
  rules: NivaObservationRuleId[]
  ruleCount: number
  observationCount: number
  temperatureDropCandidates: number
  unmetSetpointCandidates: number
  staleConfidenceWarnings: number
  explanationIntentCount: number
  severityCounts: Record<NivaObservationSeverity, number>
  sourceDistribution: Record<RuntimeHistorySourceCategory, number>
  signalUpdatePolicySummary: ReturnType<typeof summarizeSignalUpdatePolicies>
  latestObservations: NivaObservation[]
  primaryObservationId?: string | null
  primaryObservationScore?: number | null
  suppressedObservationCount?: number
  groupedObservationCount?: number
  cooldownObservationCount?: number
  groupedObservations?: Array<{
    groupKey: string
    count: number
    summary: string
  }>
  actionButtonsEnabled?: boolean
  activeObservationCount?: number
  snoozedObservationCount?: number
  lastActionInvoked?: {
    label: string
    roomKey?: string | null
    invokedAt: string
  } | null
  conversationalFollowThrough?: {
    pendingActionSummary: string | null
    pendingActionExpiresAt: string | null
    hits: number
    misses: number
    lastHitAt: string | null
    lastMissAt: string | null
  }
}

export type NivaObservationalIntelligenceContext = {
  rooms: Room[]
  history: RuntimeHistoryPoint[]
  now: number
  explanationIntentCount?: number
  roomPollStates?: Record<string, RoomPollStateLike>
  sourceDistribution?: Partial<Record<RuntimeHistorySourceCategory, number>>
  runtime?: {
    knxLive?: boolean
    restoredOnly?: boolean
    eventStreamReconnects?: number
    degradedEventStream?: boolean
  }
  providers?: Array<{
    providerId?: string | null
    displayName?: string | null
    maturity?: string | null
    foundationOnly?: boolean | null
    controlAvailable?: boolean | null
    runtimeConnected?: boolean | null
  }>
  climateActiveRoomKeys?: string[]
}

export type NivaObservationalIntelligence = {
  observations: NivaObservation[]
  diagnostics: NivaObservationDiagnostics
}

const minuteMs = 60 * 1000
const temperatureDropWindowMs = 15 * minuteMs
const temperatureDropThresholdC = 0.7
const unmetSetpointWindowMs = 90 * minuteMs
const unmetSetpointToleranceC = 0.5
const heatDemandActiveThreshold = 10
const highHeatDemandThreshold = 70
const temperatureStaleMs = 120 * minuteMs
const heatDemandStaleMs = 60 * minuteMs

const observationRules: NivaObservationRuleId[] = [
  'temperature-drop',
  'unmet-setpoint',
  'heat-while-cooling',
  'overheat',
  'stale-temperature-heat',
  'long-high-heat-demand',
  'zero-heat-below-setpoint',
  'poll-timeouts',
  'restored-only',
  'stale-domain',
  'runtime-instability',
  'source-trust-dominance',
  'provider-foundation',
]

function createEmptySourceDistribution() {
  return {
    liveKnx: 0,
    manualPoll: 0,
    groupValueResponse: 0,
    restoredHistory: 0,
    roomSnapshotReference: 0,
    frontendFallback: 0,
    derivedQuery: 0,
    aggregate: 0,
    demo: 0,
    simulate: 0,
    unknown: 0,
  } satisfies Record<RuntimeHistorySourceCategory, number>
}

function normalizeSourceDistribution(
  history: RuntimeHistoryPoint[],
  override?: Partial<Record<RuntimeHistorySourceCategory, number>>,
) {
  const base = history.length > 0 ? getRuntimeHistorySourceDistribution(history) : createEmptySourceDistribution()

  if (!override) {
    return base
  }

  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(override).map(([key, value]) => [key, Number.isFinite(value) ? Number(value) : 0]),
    ),
  } as Record<RuntimeHistorySourceCategory, number>
}

function recentPoints(
  history: RuntimeHistoryPoint[],
  roomKey: string,
  field: string,
  now: number,
  windowMs: number,
) {
  return history
    .filter(
      (point) =>
        point.roomKey === roomKey &&
        point.field === field &&
        Number.isFinite(point.value) &&
        point.timestamp >= now - windowMs &&
        !point.zoneKey,
    )
    .sort((a, b) => a.timestamp - b.timestamp)
}

function latestPoint(history: RuntimeHistoryPoint[], roomKey: string, field: string) {
  return history
    .filter(
      (point) =>
        point.roomKey === roomKey &&
        point.field === field &&
        Number.isFinite(point.value) &&
        !point.zoneKey,
    )
    .sort((a, b) => b.timestamp - a.timestamp)[0] ?? null
}

function averageValue(points: RuntimeHistoryPoint[]) {
  if (points.length === 0) {
    return null
  }

  return points.reduce((sum, point) => sum + point.value, 0) / points.length
}

function deltaValue(points: RuntimeHistoryPoint[]) {
  if (points.length < 2) {
    return null
  }

  return points[points.length - 1].value - points[0].value
}

function formatTemperature(value: number) {
  return `${Number(value.toFixed(1)).toLocaleString('nb-NO')} °C`
}

function formatPercent(value: number) {
  return `${Number(value.toFixed(value > 0 && value < 10 ? 1 : 0)).toLocaleString('nb-NO')}%`
}

function freshnessConfidence(point: RuntimeHistoryPoint | null, now: number, staleMs: number) {
  if (!point) {
    return 'low' as const
  }

  const source = classifyRuntimeHistorySource(point)
  const age = now - point.timestamp

  if (source === 'liveKnx' || source === 'manualPoll' || source === 'groupValueResponse') {
    return age <= staleMs ? ('high' as const) : ('medium' as const)
  }

  return 'low' as const
}

function addObservation(
  observations: NivaObservation[],
  observation: Omit<NivaObservation, 'requiresApproval'>,
) {
  if (observations.some((candidate) => candidate.observationId === observation.observationId)) {
    return
  }

  observations.push({
    ...observation,
    requiresApproval: false,
  })
}

function getRealPollFailures(state: RoomPollStateLike | undefined) {
  return (state?.result?.failedGroups ?? []).filter((group) => {
    const reason = String(group.failureType ?? group.reason ?? '').toLowerCase()
    return reason === '' || reason.includes('timeout') || reason.includes('noresponse') || reason.includes('no response')
  })
}

function getProviderName(provider: NonNullable<NivaObservationalIntelligenceContext['providers']>[number]) {
  return provider.displayName ?? provider.providerId ?? 'Provider'
}

function getObservationGroupKey(observation: NivaObservation) {
  if (observation.category === 'staleSignal') {
    return 'stale-climate'
  }

  if (observation.category === 'pollTimeout') {
    return 'poll-timeouts'
  }

  if (observation.category === 'sourceTrust' || observation.category === 'restoredOnly') {
    return 'source-trust'
  }

  if (observation.category === 'providerFoundation') {
    return 'provider-foundation'
  }

  return `${observation.category}:${observation.relatedRoomKey ?? observation.relatedEntity ?? 'runtime'}`
}

function getObservationCooldownMs(observation: NivaObservation) {
  if (observation.severity === 'warning') {
    return 15 * minuteMs
  }

  if (observation.severity === 'notice') {
    return 30 * minuteMs
  }

  return 60 * minuteMs
}

function scoreObservationPriority(observation: NivaObservation) {
  const severityScore =
    observation.severity === 'warning' ? 100 : observation.severity === 'notice' ? 62 : 24
  const confidenceScore =
    observation.confidence === 'high' ? 22 : observation.confidence === 'medium' ? 12 : -10
  const actionableScore = [
    'staleSignal',
    'pollTimeout',
    'temperatureDrop',
    'unmetSetpoint',
    'heatWhileCooling',
  ].includes(observation.category)
    ? 22
    : 0
  const domainScore = observation.affectedDomains.includes('climate')
    ? 16
    : observation.affectedDomains.includes('runtime')
      ? 12
      : 0
  const runtimeScore = observation.category === 'runtimeInstability' ? 28 : 0
  const highValueScore = ['temperatureDrop', 'unmetSetpoint', 'overheat', 'highHeatDemand'].includes(
    observation.category,
  )
    ? 18
    : 0
  const lowValuePenalty = ['providerFoundation', 'sourceTrust', 'restoredOnly'].includes(observation.category)
    ? -24
    : 0
  const infoPenalty = observation.severity === 'info' && observation.confidence === 'low' ? -16 : 0

  return severityScore + confidenceScore + actionableScore + domainScore + runtimeScore + highValueScore + lowValuePenalty + infoPenalty
}

function scoreObservationNoise(observation: NivaObservation) {
  let score = 0

  if (observation.severity === 'info') {
    score += 20
  }

  if (observation.confidence === 'low') {
    score += 25
  }

  if (['providerFoundation', 'sourceTrust', 'restoredOnly'].includes(observation.category)) {
    score += 35
  }

  if (observation.category === 'staleSignal' && observation.confidence === 'low') {
    score += 15
  }

  return score
}

function annotateObservationPriority(observation: NivaObservation): NivaObservation {
  return {
    ...observation,
    priorityScore: scoreObservationPriority(observation),
    noiseScore: scoreObservationNoise(observation),
    observationCooldownMs: getObservationCooldownMs(observation),
    groupKey: getObservationGroupKey(observation),
  }
}

function summarizeObservationGroup(groupKey: string, observations: NivaObservation[]) {
  if (groupKey === 'stale-climate') {
    return `${observations.length} rom mangler ferske klimasignaler.`
  }

  if (groupKey === 'poll-timeouts') {
    return `${observations.length} rom har poll-timeouts.`
  }

  if (groupKey === 'source-trust') {
    return `${observations.length} source-trust observasjoner er dempet.`
  }

  if (groupKey === 'provider-foundation') {
    return `${observations.length} provider-observasjoner gjelder foundation/prepared runtime.`
  }

  return `${observations.length} observasjoner i ${groupKey}.`
}

export function buildNivaObservationalIntelligence(
  context: NivaObservationalIntelligenceContext,
): NivaObservationalIntelligence {
  const observations: NivaObservation[] = []
  const sourceDistribution = normalizeSourceDistribution(context.history, context.sourceDistribution)
  const signalUpdatePolicySummary = summarizeSignalUpdatePolicies(context.history)
  const climateActiveRoomKeys = new Set(context.climateActiveRoomKeys ?? context.rooms.map((room) => room.key))
  let temperatureDropCandidates = 0
  let unmetSetpointCandidates = 0
  let staleConfidenceWarnings = 0

  for (const room of context.rooms) {
    const temp15 = recentPoints(context.history, room.key, 'temperature', context.now, temperatureDropWindowMs)
    const temp45 = recentPoints(context.history, room.key, 'temperature', context.now, 45 * minuteMs)
    const temp90 = recentPoints(context.history, room.key, 'temperature', context.now, unmetSetpointWindowMs)
    const heat45 = recentPoints(context.history, room.key, 'heatDemand', context.now, 45 * minuteMs)
    const heat90 = recentPoints(context.history, room.key, 'heatDemand', context.now, unmetSetpointWindowMs)
    const tempLatest = latestPoint(context.history, room.key, 'temperature')
    const heatLatest = latestPoint(context.history, room.key, 'heatDemand')
    const tempDelta15 = deltaValue(temp15)
    const tempDelta45 = deltaValue(temp45)
    const heatDelta45 = deltaValue(heat45)
    const heatAverage90 = averageValue(heat90)
    const tempDelta90 = deltaValue(temp90)
    const latestHeatValue = heatLatest?.value ?? room.heatDemand ?? null
    const latestTemperature = tempLatest?.value ?? room.temperature
    const setpoint = room.targetTemperature
    const tempConfidence = freshnessConfidence(tempLatest, context.now, temperatureStaleMs)
    const heatConfidence = freshnessConfidence(heatLatest, context.now, heatDemandStaleMs)
    const roomHasClimate = climateActiveRoomKeys.has(room.key)

    if (
      tempDelta15 !== null &&
      tempDelta15 <= -temperatureDropThresholdC &&
      typeof latestHeatValue === 'number' &&
      latestHeatValue >= heatDemandActiveThreshold
    ) {
      temperatureDropCandidates += 1
      addObservation(observations, {
        observationId: `${room.key}:temperature-drop`,
        category: 'temperatureDrop',
        severity: 'notice',
        confidence: tempConfidence === 'high' && heatConfidence !== 'low' ? 'medium' : 'low',
        createdAt: context.now,
        sourceBasis: tempConfidence === 'high' ? 'live/manual KNX temperaturhistorikk' : 'sist kjente temperaturhistorikk',
        relatedRoomKey: room.key,
        relatedRoomName: room.name,
        relatedEntity: 'climateZone',
        affectedDomains: ['climate'],
        explanation: `Temperaturen i ${room.name} faller raskt samtidig som rommet ber om varme. Det kan være lufting, åpen dør eller et varmetap.`,
        suggestedManualCheck: 'Sjekk manuelt om rommet luftes, om døren står åpen, eller om varmen trenger tid.',
        evidence: [
          `temperatur ${formatTemperature(temp15[0].value)} → ${formatTemperature(temp15[temp15.length - 1].value)}`,
          `delta ${formatTemperature(tempDelta15)}`,
          `heatDemand ${formatPercent(latestHeatValue)}`,
        ],
      })
    }

    if (
      heatAverage90 !== null &&
      heatAverage90 >= heatDemandActiveThreshold &&
      Number.isFinite(latestTemperature) &&
      Number.isFinite(setpoint) &&
      latestTemperature < setpoint - unmetSetpointToleranceC &&
      (tempDelta90 === null || tempDelta90 < 0.2)
    ) {
      unmetSetpointCandidates += 1
      addObservation(observations, {
        observationId: `${room.key}:unmet-setpoint`,
        category: 'unmetSetpoint',
        severity: 'notice',
        confidence: tempConfidence === 'high' && heatConfidence !== 'low' ? 'medium' : 'low',
        createdAt: context.now,
        sourceBasis: 'temperatur, setpunkt og varmebehov over tid',
        relatedRoomKey: room.key,
        relatedRoomName: room.name,
        relatedEntity: 'climateZone',
        affectedDomains: ['climate'],
        explanation: `${room.name} ber om varme, men temperaturen nærmer seg ikke settpunktet tydelig. Det kan skyldes åpent vindu, lav effekt, feil innstilling eller treg gulvvarme.`,
        suggestedManualCheck: 'Sjekk rommet manuelt før du tolker dette som en feil.',
        evidence: [
          `temperatur ${formatTemperature(latestTemperature)}`,
          `settpunkt ${formatTemperature(setpoint)}`,
          `snitt heatDemand ${formatPercent(heatAverage90)}`,
        ],
      })
    }

    if (
      tempDelta45 !== null &&
      heatDelta45 !== null &&
      tempDelta45 <= -0.3 &&
      heatDelta45 >= 10 &&
      typeof latestHeatValue === 'number' &&
      latestHeatValue >= heatDemandActiveThreshold
    ) {
      addObservation(observations, {
        observationId: `${room.key}:heat-while-cooling`,
        category: 'heatWhileCooling',
        severity: 'info',
        confidence: tempConfidence === 'high' ? 'medium' : 'low',
        createdAt: context.now,
        sourceBasis: 'temperaturfall og økende varmebehov',
        relatedRoomKey: room.key,
        relatedRoomName: room.name,
        relatedEntity: 'climateZone',
        affectedDomains: ['climate'],
        explanation: `Varmebehovet i ${room.name} øker mens temperaturen faller. Det kan være normalt ved lufting, men bør følges med.`,
        suggestedManualCheck: 'Se om rommet får kald trekk eller om reguleringen bare reagerer tregt.',
        evidence: [
          `temperaturdelta ${formatTemperature(tempDelta45)}`,
          `heatDemand-delta ${formatPercent(heatDelta45)}`,
        ],
      })
    }

    if (
      Number.isFinite(latestTemperature) &&
      Number.isFinite(setpoint) &&
      latestTemperature > setpoint + 0.7 &&
      typeof latestHeatValue === 'number' &&
      latestHeatValue > 5
    ) {
      addObservation(observations, {
        observationId: `${room.key}:overheat-active-heat`,
        category: 'overheat',
        severity: 'notice',
        confidence: tempConfidence === 'high' && heatConfidence !== 'low' ? 'medium' : 'low',
        createdAt: context.now,
        sourceBasis: 'temperatur over settpunkt og fortsatt heatDemand',
        relatedRoomKey: room.key,
        relatedRoomName: room.name,
        relatedEntity: 'climateZone',
        affectedDomains: ['climate'],
        explanation: `Temperaturen i ${room.name} ligger over settpunkt mens varmebehov fortsatt er registrert. Dette kan indikere treg regulering eller feil feedback.`,
        suggestedManualCheck: 'Følg med på om heatDemand faller etter hvert, eller sjekk termostatfeedback.',
        evidence: [
          `temperatur ${formatTemperature(latestTemperature)}`,
          `settpunkt ${formatTemperature(setpoint)}`,
          `heatDemand ${formatPercent(latestHeatValue)}`,
        ],
      })
    }

    const tempStale = tempLatest ? context.now - tempLatest.timestamp > temperatureStaleMs : true
    const heatStale = heatLatest ? context.now - heatLatest.timestamp > heatDemandStaleMs : true

    if (roomHasClimate && ((heatLatest && tempStale) || (tempLatest && heatStale))) {
      const tempPolicy = getSignalUpdatePolicy('temperature', tempLatest?.source)
      const heatPolicy = getSignalUpdatePolicy('heatDemand', heatLatest?.source)
      const staleRelevant = tempPolicy.nivaStaleRelevant || heatPolicy.nivaStaleRelevant

      if (staleRelevant) {
        staleConfidenceWarnings += 1
        addObservation(observations, {
          observationId: `${room.key}:stale-climate-pair`,
          category: 'staleSignal',
          severity: 'info',
          confidence: 'low',
          createdAt: context.now,
          sourceBasis: 'manglende ferske temperatur/heatDemand-par',
          relatedRoomKey: room.key,
          relatedRoomName: room.name,
          relatedEntity: 'climateZone',
          affectedDomains: ['climate'],
          explanation: `Jeg mangler ferske signaler for ${room.name} til å vurdere temperatur og varmebehov sikkert.`,
          suggestedManualCheck: 'Hent verdier for rommet eller vent på nye KNX-telegrammer før du konkluderer.',
          evidence: [
            tempLatest ? `temperatur alder ${Math.round((context.now - tempLatest.timestamp) / minuteMs)} min` : 'temperatur mangler',
            heatLatest ? `heatDemand alder ${Math.round((context.now - heatLatest.timestamp) / minuteMs)} min` : 'heatDemand mangler',
          ],
        })
      }
    }

    if (heatAverage90 !== null && heatAverage90 >= highHeatDemandThreshold) {
      addObservation(observations, {
        observationId: `${room.key}:high-heat-demand`,
        category: 'highHeatDemand',
        severity: 'notice',
        confidence: heatConfidence === 'high' ? 'medium' : 'low',
        createdAt: context.now,
        sourceBasis: 'heatDemand historikk',
        relatedRoomKey: room.key,
        relatedRoomName: room.name,
        relatedEntity: 'climateZone',
        affectedDomains: ['climate'],
        explanation: `${room.name} har hatt uvanlig høyt varmebehov over tid.`,
        suggestedManualCheck: 'Sjekk om rommet luftes, om gulvvarmen reagerer tregt, eller om settpunktet er høyere enn ønsket.',
        evidence: [`snitt heatDemand ${formatPercent(heatAverage90)}`],
      })
    }

    if (
      typeof latestHeatValue === 'number' &&
      latestHeatValue <= 1 &&
      Number.isFinite(latestTemperature) &&
      Number.isFinite(setpoint) &&
      latestTemperature < setpoint - unmetSetpointToleranceC
    ) {
      addObservation(observations, {
        observationId: `${room.key}:zero-heat-below-setpoint`,
        category: 'lowHeatWhileCold',
        severity: 'notice',
        confidence: tempConfidence === 'high' && heatConfidence !== 'low' ? 'medium' : 'low',
        createdAt: context.now,
        sourceBasis: 'temperatur under settpunkt og heatDemand 0%',
        relatedRoomKey: room.key,
        relatedRoomName: room.name,
        relatedEntity: 'climateZone',
        affectedDomains: ['climate'],
        explanation: `${room.name} ligger under settpunkt, men heatDemand er 0%. Det kan være normal regulering, sparemodus eller manglende feedback.`,
        suggestedManualCheck: 'Sjekk termostatmodus og om heatDemand-signalet er ferskt.',
        evidence: [
          `temperatur ${formatTemperature(latestTemperature)}`,
          `settpunkt ${formatTemperature(setpoint)}`,
          `heatDemand ${formatPercent(latestHeatValue)}`,
        ],
      })
    }

    const pollFailures = getRealPollFailures(context.roomPollStates?.[room.key])
    if (pollFailures.length > 0) {
      addObservation(observations, {
        observationId: `${room.key}:poll-timeout`,
        category: 'pollTimeout',
        severity: 'info',
        confidence: 'medium',
        createdAt: context.now,
        sourceBasis: 'siste manuelle rom-poll',
        relatedRoomKey: room.key,
        relatedRoomName: room.name,
        relatedEntity: 'room',
        affectedDomains: ['diagnostics', 'climate', 'lighting'],
        explanation: `${room.name} har ${pollFailures.length} feedback-adresser som ikke svarte på siste Hent verdier.`,
        suggestedManualCheck: 'Sjekk om adressene er i bruk, eller om de bare er forberedte tomme soner.',
        evidence: pollFailures
          .slice(0, 4)
          .map((group) => `${group.name ?? group.label ?? group.type ?? 'Feedback'} ${group.groupAddress ?? group.address ?? 'uten GA'}`),
      })
    }
  }

  const liveCount =
    sourceDistribution.liveKnx + sourceDistribution.manualPoll + sourceDistribution.groupValueResponse
  const restoredOrReferenceCount =
    sourceDistribution.restoredHistory +
    sourceDistribution.roomSnapshotReference +
    sourceDistribution.frontendFallback +
    sourceDistribution.derivedQuery +
    sourceDistribution.aggregate +
    sourceDistribution.demo +
    sourceDistribution.simulate

  if (liveCount === 0 && restoredOrReferenceCount > 0) {
    addObservation(observations, {
      observationId: 'runtime:restored-only',
      category: 'restoredOnly',
      severity: 'notice',
      confidence: 'low',
      createdAt: context.now,
      sourceBasis: 'source-distribution',
      relatedEntity: 'runtime',
      affectedDomains: ['runtime', 'diagnostics'],
      explanation: 'KNX live-data mangler akkurat nå, men Lynell har sist kjente historikk.',
      suggestedManualCheck: 'Kontroller bridge/KNX-diagnostics før du tolker gamle verdier som live.',
      evidence: [`restored/reference ${restoredOrReferenceCount}`, `live ${liveCount}`],
    })
  }

  if (staleConfidenceWarnings >= 3) {
    addObservation(observations, {
      observationId: 'climate:many-stale-signals',
      category: 'staleDomain',
      severity: 'notice',
      confidence: 'medium',
      createdAt: context.now,
      sourceBasis: 'climate stale-policy',
      relatedEntity: 'climate',
      affectedDomains: ['climate', 'diagnostics'],
      explanation: 'Flere klima-signaler mangler ferske temperatur/heatDemand-par.',
      suggestedManualCheck: 'Sjekk KNX subscription eller bruk Hent verdier på ett rom om gangen.',
      evidence: [`stale warnings ${staleConfidenceWarnings}`],
    })
  }

  if (restoredOrReferenceCount > liveCount && restoredOrReferenceCount >= 5) {
    addObservation(observations, {
      observationId: 'runtime:source-trust-dominance',
      category: 'sourceTrust',
      severity: 'info',
      confidence: 'medium',
      createdAt: context.now,
      sourceBasis: 'source-distribution',
      relatedEntity: 'runtime',
      affectedDomains: ['runtime', 'diagnostics'],
      explanation: 'Restored, reference eller derived data dominerer over live datapunkter akkurat nå.',
      suggestedManualCheck: 'Bruk Live KNX eller Hent verdier for å få ferskere signaler før du konkluderer.',
      evidence: [`live ${liveCount}`, `restored/reference ${restoredOrReferenceCount}`],
    })
  }

  if ((context.runtime?.eventStreamReconnects ?? 0) >= 3 || context.runtime?.degradedEventStream) {
    addObservation(observations, {
      observationId: 'runtime:event-stream-instability',
      category: 'runtimeInstability',
      severity: 'notice',
      confidence: 'medium',
      createdAt: context.now,
      sourceBasis: 'runtime event stream diagnostics',
      relatedEntity: 'runtimeEventStream',
      affectedDomains: ['runtime', 'diagnostics'],
      explanation: 'Runtime event-stream har hatt flere reconnects eller kjører degradert.',
      suggestedManualCheck: 'Se på nettverk/bridge-status hvis live oppdateringer føles trege.',
      evidence: [
        `reconnects ${context.runtime?.eventStreamReconnects ?? 0}`,
        `degraded ${context.runtime?.degradedEventStream ? 'ja' : 'nei'}`,
      ],
    })
  }

  const foundationProviders = (context.providers ?? []).filter((provider) => {
    const maturity = String(provider.maturity ?? '').toLowerCase()
    return provider.foundationOnly || ['foundation', 'prepared', 'mock', 'future'].includes(maturity)
  })

  if (foundationProviders.length > 0) {
    addObservation(observations, {
      observationId: 'providers:foundation-only',
      category: 'providerFoundation',
      severity: 'info',
      confidence: 'high',
      createdAt: context.now,
      sourceBasis: 'provider maturity registry',
      relatedEntity: 'provider',
      affectedDomains: ['integration', 'utility', 'media'],
      explanation: `${foundationProviders.length} providers er merket foundation/prepared og kan ikke behandles som full styring.`,
      suggestedManualCheck: 'Bruk provider-diagnostics for å se hva som er liveRuntime, statusOnly og foundationOnly.',
      evidence: foundationProviders.slice(0, 5).map(getProviderName),
    })
  }

  const annotatedObservations = observations.map(annotateObservationPriority)
  const noiseSuppressedObservations = annotatedObservations.filter(
    (observation) =>
      observation.severity === 'info' &&
      (observation.noiseScore ?? 0) >= 55 &&
      (observation.priorityScore ?? 0) < 45,
  )
  const candidateObservations = annotatedObservations.filter(
    (observation) => !noiseSuppressedObservations.some((suppressed) => suppressed.observationId === observation.observationId),
  )
  const groupedObservationMap = candidateObservations.reduce<Record<string, NivaObservation[]>>(
    (groups, observation) => {
      const groupKey = observation.groupKey ?? getObservationGroupKey(observation)
      groups[groupKey] = [...(groups[groupKey] ?? []), observation]
      return groups
    },
    {},
  )
  const groupedObservations = Object.entries(groupedObservationMap)
    .filter(([, groupObservations]) => groupObservations.length > 1)
    .map(([groupKey, groupObservations]) => ({
      groupKey,
      count: groupObservations.length,
      summary: summarizeObservationGroup(groupKey, groupObservations),
    }))
  const groupRepresentativeIds = new Set(
    Object.values(groupedObservationMap)
      .filter((groupObservations) => groupObservations.length > 1)
      .map(
        (groupObservations) =>
          [...groupObservations].sort(
            (a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0) || b.createdAt - a.createdAt,
          )[0].observationId,
      ),
  )
  const sortedObservations = candidateObservations
    .filter(
      (observation) =>
        !groupedObservationMap[observation.groupKey ?? ''] ||
        groupedObservationMap[observation.groupKey ?? ''].length === 1 ||
        groupRepresentativeIds.has(observation.observationId),
    )
    .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0) || b.createdAt - a.createdAt)
  const primaryObservation = sortedObservations[0] ?? null
  const suppressedObservationCount = annotatedObservations.length - sortedObservations.length

  const severityCounts = sortedObservations.reduce<Record<NivaObservationSeverity, number>>(
    (counts, observation) => {
      counts[observation.severity] += 1
      return counts
    },
    { info: 0, notice: 0, warning: 0 },
  )

  return {
    observations: sortedObservations,
    diagnostics: {
      enabled: true,
      deterministic: true,
      rules: observationRules,
      ruleCount: observationRules.length,
      observationCount: sortedObservations.length,
      temperatureDropCandidates,
      unmetSetpointCandidates,
      staleConfidenceWarnings,
      explanationIntentCount: context.explanationIntentCount ?? 0,
      severityCounts,
      sourceDistribution,
      signalUpdatePolicySummary,
      primaryObservationId: primaryObservation?.observationId ?? null,
      primaryObservationScore: primaryObservation?.priorityScore ?? null,
      suppressedObservationCount,
      groupedObservationCount: groupedObservations.reduce((sum, group) => sum + group.count, 0),
      cooldownObservationCount: annotatedObservations.filter((observation) => observation.observationCooldownMs).length,
      groupedObservations,
      latestObservations: sortedObservations.slice(0, 8),
    },
  }
}
