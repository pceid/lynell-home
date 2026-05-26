import type { SystemRoomConfig } from '../config/systemConfig'
import type { Room } from '../data/rooms'
import {
  classifyRuntimeHistorySource,
  type RuntimeHistoryPoint,
  type RuntimeHistorySourceCategory,
} from './runtimeHistory'

export type EnergyProviderCandidateId = 'fortum' | 'hanPort' | 'elhub' | 'nordpool'
export type EnergyConfidence = 'none' | 'low' | 'medium' | 'high'
export type EnergyObservationSeverity = 'info' | 'notice' | 'warning'

export type EnergyProviderFoundation = {
  providerId: 'energyMeter'
  maturity: 'foundation'
  category: 'utility/energy'
  readState: true
  writeState: false
  controlAvailable: false
  supportsLivePower: false
  supportsHourlyConsumption: false
  supportsSpotPrice: 'foundation'
  requiresCredentials: 'unknown'
  providerCandidates: EnergyProviderCandidateId[]
  noCredentialsStored: true
  noScraping: true
}

export type EnergyDataModel = {
  currentPowerW: number | null
  currentConsumptionKwh: number | null
  hourlyConsumptionKwh: number | null
  dailyConsumptionKwh: number | null
  heatingEstimatedKwh: number | null
  heatingShareEstimate: number | null
  spotPrice: number | null
  gridTariff: number | null
  priceArea: string | null
  source: 'foundation' | 'estimate' | 'liveMeter' | 'spotPriceFoundation' | 'manualImportFuture'
  confidence: EnergyConfidence
  timestamp: number
  estimated: boolean
  actual: boolean
}

export type RoomHeatingEnergyEstimate = {
  roomKey: string
  roomName: string
  heatEmitterType: string | null
  floorHeatingType: string | null
  floorAreaM2: number | null
  configuredHeatPowerWatts: number | null
  nominalPowerWatts: number | null
  averageHeatDemand: number | null
  temperatureDelta: number | null
  durationHours: number
  estimatedPeakW: number | null
  heatPowerSource: 'configuredHeatPowerWatts' | 'nominalPowerWatts' | 'areaEmitterEstimate' | 'missing'
  heatingEstimatedKwh: number | null
  heatingShareEstimate: number | null
  confidence: EnergyConfidence
  sourceBasis: string
}

export type EnergyObservation = {
  observationId: string
  category:
    | 'highHeatDemand'
    | 'nightFloorHeating'
    | 'heatWithoutTemperatureRise'
    | 'energyThiefCandidate'
    | 'vacationPatternCandidate'
    | 'energyProviderFoundation'
  severity: EnergyObservationSeverity
  confidence: EnergyConfidence
  sourceBasis: string
  relatedRoomKey?: string | null
  relatedRoomName?: string | null
  explanation: string
  suggestedManualCheck: string
  evidence: string[]
  requiresApproval: false
}

export type EnergyIntelligence = {
  model: 'energy-intelligence-foundation'
  provider: EnergyProviderFoundation
  data: EnergyDataModel
  roomEstimates: RoomHeatingEnergyEstimate[]
  observations: EnergyObservation[]
  diagnostics: {
    enabled: true
    foundationOnly: true
    liveMeterAvailable: false
    spotPriceAvailable: false
    spotPriceFoundation: true
    similarHomeBenchmarkAvailable: false
    heatingEstimateConfidence: EnergyConfidence
    observationCount: number
    highHeatRoomCount: number
    nightHeatingRoomCount: number
    sourceDistribution: Partial<Record<RuntimeHistorySourceCategory | 'estimate' | 'foundation', number>>
  }
  autoPollQuietRooms: {
    autoPollQuietRoomsEnabled: false
    quietThresholdMs: number
    globalAutoPollMinIntervalMs: number
    perRoomAutoPollCooldownMs: number
    onlyCyclicStaleRelevantSignals: true
    excludesOnChangeOnlyLightRooms: true
    usesRoomPollActionPipeline: true
    sourceWhenEnabled: 'autoPoll'
    localRuntimeOnly: true
  }
  energyEventParticipation: {
    available: true
    eventType: 'earthHour/manualEnergyHour'
    scheduledWindow: null
    eligibleActions: string[]
    requiresApproval: true
    dryRun: true
    automaticExecution: false
    possibleKnxBlockSignal: true
    requiresGroupAddressDesign: true
  }
  vacationModePattern: {
    available: 'foundation'
    detected: boolean
    confidence: EnergyConfidence
    requiresApproval: true
    activationAvailable: false
    explanation: string
  }
}

const hourMs = 60 * 60 * 1000
const heatDemandHighThreshold = 65
const nightHeatDemandThreshold = 20

export const energyProviderFoundation: EnergyProviderFoundation = {
  providerId: 'energyMeter',
  maturity: 'foundation',
  category: 'utility/energy',
  readState: true,
  writeState: false,
  controlAvailable: false,
  supportsLivePower: false,
  supportsHourlyConsumption: false,
  supportsSpotPrice: 'foundation',
  requiresCredentials: 'unknown',
  providerCandidates: ['fortum', 'hanPort', 'elhub', 'nordpool'],
  noCredentialsStored: true,
  noScraping: true,
}

function average(points: RuntimeHistoryPoint[]) {
  if (points.length === 0) {
    return null
  }

  return points.reduce((sum, point) => sum + point.value, 0) / points.length
}

function getPoints(
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

function durationHours(points: RuntimeHistoryPoint[], fallbackWindowMs: number) {
  if (points.length < 2) {
    return points.length === 1 ? Math.min(1, fallbackWindowMs / hourMs) : 0
  }

  return Math.max(0.25, (points[points.length - 1].timestamp - points[0].timestamp) / hourMs)
}

function getEmitterMultiplier(value: string | null) {
  const normalized = String(value ?? '').toLowerCase()

  if (normalized.includes('gulv') || normalized.includes('floor')) {
    return 0.85
  }

  if (normalized.includes('panel') || normalized.includes('radiator')) {
    return 1
  }

  return 0.75
}

function getPositiveNumber(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

function formatPercent(value: number) {
  return `${Number(value.toFixed(value > 0 && value < 10 ? 1 : 0)).toLocaleString('nb-NO')}%`
}

function formatKwh(value: number) {
  return `${Number(value.toFixed(2)).toLocaleString('nb-NO')} kWh`
}

function getConfidence({
  heatPointCount,
  hasHeatPowerBasis,
  estimatedKwh,
}: {
  heatPointCount: number
  hasHeatPowerBasis: boolean
  estimatedKwh: number | null
}) {
  if (estimatedKwh === null) {
    return 'none' as const
  }

  if (heatPointCount >= 6 && hasHeatPowerBasis) {
    return 'medium' as const
  }

  return 'low' as const
}

function latestValue(points: RuntimeHistoryPoint[]) {
  return points.length > 0 ? points[points.length - 1].value : null
}

function delta(points: RuntimeHistoryPoint[]) {
  if (points.length < 2) {
    return null
  }

  return points[points.length - 1].value - points[0].value
}

function isNightPoint(point: RuntimeHistoryPoint) {
  const hour = new Date(point.timestamp).getHours()
  return hour >= 22 || hour < 6
}

function addObservation(observations: EnergyObservation[], observation: EnergyObservation) {
  if (!observations.some((candidate) => candidate.observationId === observation.observationId)) {
    observations.push(observation)
  }
}

export function buildEnergyIntelligence({
  rooms,
  roomConfigs,
  history,
  now,
}: {
  rooms: Room[]
  roomConfigs: SystemRoomConfig[]
  history: RuntimeHistoryPoint[]
  now: number
}): EnergyIntelligence {
  const observationWindowMs = 6 * hourMs
  const observations: EnergyObservation[] = []
  const roomEstimates = rooms
    .map((room): RoomHeatingEnergyEstimate | null => {
      const config = roomConfigs.find((candidate) => candidate.key === room.key)

      if (!config?.climate.active) {
        return null
      }

      const heatPoints = getPoints(history, room.key, 'heatDemand', now, observationWindowMs)
      const temperaturePoints = getPoints(history, room.key, 'temperature', now, observationWindowMs)
      const averageHeatDemand = average(heatPoints) ?? (typeof room.heatDemand === 'number' ? room.heatDemand : null)
      const floorAreaM2 = typeof config.floorAreaM2 === 'number' ? config.floorAreaM2 : null
      const heatEmitterType = config.heatEmitterType ? String(config.heatEmitterType) : null
      const floorHeatingType = config.floorHeatingType ? String(config.floorHeatingType) : null
      const configuredHeatPowerWatts = getPositiveNumber(config.heatPowerWatts)
      const nominalPowerWatts = getPositiveNumber(config.nominalPowerWatts)
      const duration = durationHours(heatPoints, observationWindowMs)
      const areaEstimatedPeakW =
        floorAreaM2 && averageHeatDemand !== null
          ? Math.round(floorAreaM2 * 65 * getEmitterMultiplier(heatEmitterType))
          : null
      const estimatedPeakW = configuredHeatPowerWatts ?? nominalPowerWatts ?? areaEstimatedPeakW
      const heatPowerSource =
        configuredHeatPowerWatts !== null
          ? 'configuredHeatPowerWatts'
          : nominalPowerWatts !== null
            ? 'nominalPowerWatts'
            : areaEstimatedPeakW !== null
              ? 'areaEmitterEstimate'
              : 'missing'
      const heatingEstimatedKwh =
        estimatedPeakW !== null && averageHeatDemand !== null && duration > 0
          ? Number(((estimatedPeakW * (averageHeatDemand / 100) * duration) / 1000).toFixed(3))
          : null
      const temperatureDelta =
        Number.isFinite(room.temperature) && Number.isFinite(room.targetTemperature)
          ? Number((room.temperature - room.targetTemperature).toFixed(1))
          : null
      const confidence = getConfidence({
        heatPointCount: heatPoints.length,
        hasHeatPowerBasis: heatPowerSource !== 'missing',
        estimatedKwh: heatingEstimatedKwh,
      })

      const latestTemperature = latestValue(temperaturePoints) ?? room.temperature
      const temperatureChange = delta(temperaturePoints)
      const nightHeatPoints = heatPoints.filter(isNightPoint)
      const nightAverageHeatDemand = average(nightHeatPoints)
      const roomName = room.name.toLowerCase()
      const isBathroomOrFloorHeating =
        roomName.includes('bad') ||
        roomName.includes('bath') ||
        String(heatEmitterType ?? '').toLowerCase().includes('gulv') ||
        String(heatEmitterType ?? '').toLowerCase().includes('floor') ||
        String(floorHeatingType ?? '').toLowerCase().includes('vann') ||
        String(floorHeatingType ?? '').toLowerCase().includes('elektr')

      if (averageHeatDemand !== null && averageHeatDemand >= heatDemandHighThreshold && heatPoints.length >= 3) {
        addObservation(observations, {
          observationId: `${room.key}:energy-high-heat`,
          category: 'highHeatDemand',
          severity: 'notice',
          confidence,
          sourceBasis: 'heatDemand historikk og estimatmodell',
          relatedRoomKey: room.key,
          relatedRoomName: room.name,
          explanation: `${room.name} har hatt høyt varmebehov over tid. Det er et energiestimat, ikke målt kWh.`,
          suggestedManualCheck: 'Sjekk settpunkt, lufting og om rommet normalt skal ha så mye varmebehov.',
          evidence: [
            `snitt heatDemand ${formatPercent(averageHeatDemand)}`,
            heatingEstimatedKwh !== null ? `beregnet indikasjon ${formatKwh(heatingEstimatedKwh)}` : 'mangler estimert varmeeffekt',
            estimatedPeakW !== null ? `estimert varmeeffekt ${estimatedPeakW} W` : 'ingen varmeeffekt satt',
          ],
          requiresApproval: false,
        })
      }

      if (
        nightAverageHeatDemand !== null &&
        nightAverageHeatDemand >= nightHeatDemandThreshold &&
        isBathroomOrFloorHeating
      ) {
        addObservation(observations, {
          observationId: `${room.key}:night-floor-heating`,
          category: 'nightFloorHeating',
          severity: 'info',
          confidence: nightHeatPoints.length >= 3 ? 'medium' : 'low',
          sourceBasis: 'night heatDemand pattern',
          relatedRoomKey: room.key,
          relatedRoomName: room.name,
          explanation: `${room.name} har hatt varmebehov gjennom natten. Det kan være normalt for gulvvarme, men hvis dette gjentar seg, kan rommet være verdt å sjekke.`,
          suggestedManualCheck: 'Se om nattsettpunktet er ønsket, særlig i våtrom/gulvvarme.',
          evidence: [`natt-snitt heatDemand ${formatPercent(nightAverageHeatDemand)}`],
          requiresApproval: false,
        })
      }

      if (
        averageHeatDemand !== null &&
        averageHeatDemand >= 20 &&
        temperatureDelta !== null &&
        temperatureDelta < -0.5 &&
        (temperatureChange === null || temperatureChange < 0.2)
      ) {
        addObservation(observations, {
          observationId: `${room.key}:heat-no-temperature-rise`,
          category: 'heatWithoutTemperatureRise',
          severity: 'notice',
          confidence: temperaturePoints.length >= 3 && heatPoints.length >= 3 ? 'medium' : 'low',
          sourceBasis: 'heatDemand og temperaturtrend',
          relatedRoomKey: room.key,
          relatedRoomName: room.name,
          explanation: `${room.name} ber om varme, men temperaturen nærmer seg ikke settpunktet tydelig. Dette kan være treg gulvvarme, lufting eller lav effekt.`,
          suggestedManualCheck: 'Sjekk rommet manuelt før du tolker dette som faktisk energitap.',
          evidence: [
            `temperatur ${Number(latestTemperature.toFixed(1)).toLocaleString('nb-NO')} °C`,
            `avvik ${Number(temperatureDelta.toFixed(1)).toLocaleString('nb-NO')} °C`,
            `snitt heatDemand ${formatPercent(averageHeatDemand)}`,
          ],
          requiresApproval: false,
        })
      }

      return {
        roomKey: room.key,
        roomName: room.name,
        heatEmitterType,
        floorHeatingType,
        floorAreaM2,
        configuredHeatPowerWatts,
        nominalPowerWatts,
        averageHeatDemand: averageHeatDemand === null ? null : Number(averageHeatDemand.toFixed(1)),
        temperatureDelta,
        durationHours: Number(duration.toFixed(2)),
        estimatedPeakW,
        heatPowerSource,
        heatingEstimatedKwh,
        heatingShareEstimate: null,
        confidence,
        sourceBasis: heatPoints.length > 0 ? 'heatDemand history + estimert varmeeffekt' : 'current room state/foundation',
      }
    })
    .filter((estimate): estimate is RoomHeatingEnergyEstimate => Boolean(estimate))

  const heatValues = roomEstimates
    .map((estimate) => estimate.averageHeatDemand)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    .sort((a, b) => a - b)
  const medianHeat =
    heatValues.length > 0
      ? heatValues[Math.floor(heatValues.length / 2)]
      : null

  for (const estimate of roomEstimates) {
    if (
      estimate.averageHeatDemand !== null &&
      medianHeat !== null &&
      estimate.averageHeatDemand >= Math.max(45, medianHeat * 1.6)
    ) {
      addObservation(observations, {
        observationId: `${estimate.roomKey}:energy-thief-candidate`,
        category: 'energyThiefCandidate',
        severity: 'notice',
        confidence: estimate.confidence === 'medium' ? 'medium' : 'low',
        sourceBasis: 'intern heatDemand-baseline',
        relatedRoomKey: estimate.roomKey,
        relatedRoomName: estimate.roomName,
        explanation: `${estimate.roomName} trekker mer varme relativt til de andre rommene i det interne grunnlaget. Dette er en indikasjon, ikke målt energiforbruk.`,
        suggestedManualCheck: 'Sjekk rommet manuelt hvis mønsteret holder seg over tid.',
        evidence: [
          `rom ${formatPercent(estimate.averageHeatDemand)}`,
          `intern median ${formatPercent(medianHeat)}`,
        ],
        requiresApproval: false,
      })
    }
  }

  const activeLightZoneCount = rooms.reduce(
    (sum, room) => sum + room.zones.filter((zone) => zone.lightsOn).length,
    0,
  )
  const stableClimateCount = roomEstimates.filter(
    (estimate) => estimate.temperatureDelta !== null && Math.abs(estimate.temperatureDelta) <= 0.7,
  ).length
  const vacationPatternDetected =
    rooms.length > 0 &&
    activeLightZoneCount === 0 &&
    roomEstimates.length > 0 &&
    stableClimateCount >= Math.max(1, Math.ceil(roomEstimates.length * 0.6))

  if (vacationPatternDetected) {
    addObservation(observations, {
      observationId: 'energy:vacation-pattern-foundation',
      category: 'vacationPatternCandidate',
      severity: 'info',
      confidence: 'low',
      sourceBasis: 'lav lysaktivitet og stabil temperatur',
      explanation: 'Huset ligner en rolig/borte-periode, men feriemodus er bare foundation ennå.',
      suggestedManualCheck: 'Jeg kan foreslå dette, men selve modusen må konfigureres før jeg kan aktivere den.',
      evidence: [`aktive lyssoner ${activeLightZoneCount}`, `stabile klimarom ${stableClimateCount}`],
      requiresApproval: false,
    })
  }

  const heatingEstimatedKwh = roomEstimates.reduce(
    (sum, estimate) => sum + (estimate.heatingEstimatedKwh ?? 0),
    0,
  )
  const sourceDistribution = history.reduce<Partial<Record<RuntimeHistorySourceCategory | 'estimate' | 'foundation', number>>>(
    (distribution, point) => {
      const category = classifyRuntimeHistorySource(point)
      distribution[category] = (distribution[category] ?? 0) + 1
      return distribution
    },
    { estimate: roomEstimates.filter((estimate) => estimate.heatingEstimatedKwh !== null).length, foundation: 1 },
  )
  const mediumEstimateCount = roomEstimates.filter((estimate) => estimate.confidence === 'medium').length
  const heatingEstimateConfidence =
    roomEstimates.length === 0
      ? 'none'
      : mediumEstimateCount > 0
        ? 'medium'
        : 'low'

  return {
    model: 'energy-intelligence-foundation',
    provider: energyProviderFoundation,
    data: {
      currentPowerW: null,
      currentConsumptionKwh: null,
      hourlyConsumptionKwh: null,
      dailyConsumptionKwh: null,
      heatingEstimatedKwh: heatingEstimatedKwh > 0 ? Number(heatingEstimatedKwh.toFixed(3)) : null,
      heatingShareEstimate: null,
      spotPrice: null,
      gridTariff: null,
      priceArea: null,
      source: 'estimate',
      confidence: heatingEstimateConfidence,
      timestamp: now,
      estimated: true,
      actual: false,
    },
    roomEstimates,
    observations,
    diagnostics: {
      enabled: true,
      foundationOnly: true,
      liveMeterAvailable: false,
      spotPriceAvailable: false,
      spotPriceFoundation: true,
      similarHomeBenchmarkAvailable: false,
      heatingEstimateConfidence,
      observationCount: observations.length,
      highHeatRoomCount: roomEstimates.filter(
        (estimate) => (estimate.averageHeatDemand ?? 0) >= heatDemandHighThreshold,
      ).length,
      nightHeatingRoomCount: observations.filter((observation) => observation.category === 'nightFloorHeating').length,
      sourceDistribution,
    },
    autoPollQuietRooms: {
      autoPollQuietRoomsEnabled: false,
      quietThresholdMs: 60 * 60 * 1000,
      globalAutoPollMinIntervalMs: 5 * 60 * 1000,
      perRoomAutoPollCooldownMs: 60 * 60 * 1000,
      onlyCyclicStaleRelevantSignals: true,
      excludesOnChangeOnlyLightRooms: true,
      usesRoomPollActionPipeline: true,
      sourceWhenEnabled: 'autoPoll',
      localRuntimeOnly: true,
    },
    energyEventParticipation: {
      available: true,
      eventType: 'earthHour/manualEnergyHour',
      scheduledWindow: null,
      eligibleActions: ['dim/turnOff selected lights', 'restore after event'],
      requiresApproval: true,
      dryRun: true,
      automaticExecution: false,
      possibleKnxBlockSignal: true,
      requiresGroupAddressDesign: true,
    },
    vacationModePattern: {
      available: 'foundation',
      detected: vacationPatternDetected,
      confidence: vacationPatternDetected ? 'low' : 'none',
      requiresApproval: true,
      activationAvailable: false,
      explanation: vacationPatternDetected
        ? 'Mønsteret kan ligne borte/feriemodus, men det er bare et forslag.'
        : 'Feriemodus-mønster er forberedt, men ikke aktivt eller styrende.',
    },
  }
}

export function getNivaEnergyExplanation(
  normalizedText: string,
  energy: EnergyIntelligence,
) {
  if (
    normalizedText.includes('energiestimat') ||
    normalizedText.includes('strømestimat') ||
    normalizedText.includes('stromestimat') ||
    normalizedText.includes('hva betyr estimat')
  ) {
    return 'Energiestimat betyr at Lynell bruker varmebehov, romareal, varmegivertype og varighet til å lage en indikasjon. Det er ikke målt kWh før en HAN/AMS-, Fortum-, Elhub- eller annen målekilde er koblet til.'
  }

  if (
    normalizedText.includes('energityv') ||
    normalizedText.includes('trekker mye varme') ||
    normalizedText.includes('mistenkes')
  ) {
    const candidate = energy.observations.find((observation) => observation.category === 'energyThiefCandidate')
    return candidate
      ? `${candidate.explanation} Grunnlaget er ${candidate.evidence.join(' · ')}.`
      : 'Energityv betyr her et rom som skiller seg ut i internt varmebehov. Jeg bruker ikke ekstern benchmark ennå, så dette er bare en indikasjon.'
  }

  if (
    normalizedText.includes('lignende hus') ||
    normalizedText.includes('benchmark') ||
    normalizedText.includes('andre hus')
  ) {
    return 'Jeg kan ikke sammenligne mot lignende hus ennå. similarHomeBenchmarkAvailable=false, så jeg bruker bare intern historikk og rommønstre.'
  }

  if (
    normalizedText.includes('han') ||
    normalizedText.includes('ams') ||
    normalizedText.includes('fortum') ||
    normalizedText.includes('elhub') ||
    normalizedText.includes('nordpool') ||
    normalizedText.includes('spotpris')
  ) {
    return 'Fortum kan senere være leverandør/API-kilde hvis trygg tilgang finnes. HAN/AMS gir lokal live effekt fra måleren. Elhub kan gi måledata/metadata der tilgang finnes. Nord Pool/spotpris kan gi timepris. Ingen credentials eller scraping er aktivert nå.'
  }

  if (
    normalizedText.includes('earth hour') ||
    normalizedText.includes('energitime') ||
    normalizedText.includes('strøm-time') ||
    normalizedText.includes('strom-time')
  ) {
    return 'Energitime/Earth Hour er bare dry-run foundation nå. Lynell kan senere lage et godkjenningsforslag for å dimme eller slå av valgte lys og gjenopprette etterpå, men ingenting kjøres automatisk.'
  }

  if (normalizedText.includes('auto-poll') || normalizedText.includes('autopoll') || normalizedText.includes('stille rom')) {
    return 'Auto-poll stille rom er av som standard. Hvis det aktiveres senere, skal det bare gjelde cyclic/stale-relevante signaler, aldri onChange-only lysrom, og gå gjennom roomPoll action pipeline.'
  }

  if (normalizedText.includes('feriemodus') || normalizedText.includes('borte-modus') || normalizedText.includes('bortemodus')) {
    return energy.vacationModePattern.detected
      ? 'Dette kan ligne et borte-/feriemodusmønster, men modusen er ikke konfigurert som styring. Jeg kan foreslå det, men kan ikke aktivere noe før en trygg modus finnes.'
      : 'Feriemodus er foreløpig bare et mønster Lynell kan observere. Selve modusen må konfigureres før den kan foreslås som en trygg handling.'
  }

  if (normalizedText.includes('strøm') || normalizedText.includes('strom') || normalizedText.includes('energi')) {
    return `Energy intelligence er foundation nå. Live måler er ikke koblet til, spotpris er bare forberedt, og varmebruk vises som estimat med ${energy.diagnostics.heatingEstimateConfidence} confidence.`
  }

  return null
}
