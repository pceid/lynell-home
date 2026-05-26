import type { FloorConfig, SystemRoomConfig } from '../config/systemConfig'
import type { Room } from '../data/rooms'
import type { HouseMemoryState } from '../memory/houseMemory'
import type { WeatherSnapshot } from '../api/weatherApi'
import type { HouseSpatialMap } from '../spatial/houseSpatial'
import { getRoomConfiguredVolume, getRoomHeatNeedAnalysis } from './heatDemandAnalysis'
import type { RuntimeHistoryPoint } from './runtimeHistory'

export type RoomComfortState =
  | 'comfortable'
  | 'cool'
  | 'warm'
  | 'unstable'
  | 'highHeat'
  | 'missing'

export type RoomComfortInsight = {
  roomKey: string
  roomName: string
  areaLabel: string | null
  state: RoomComfortState
  label: string
  comfortLine: string
  nivaSummary: string
  energySummary: string
  confidenceLine: string | null
  heatLoadScore: number
  averageHeatDemand: number | null
  temperatureDelta: number | null
}

export type HouseComfortInsight = {
  state: 'comfortable' | 'watch' | 'highLoad' | 'missing'
  label: string
  summary: string
  homeLine: string | null
  nivaSummary: string
  averageTemperature: number | null
  rooms: RoomComfortInsight[]
  roomsToWatch: RoomComfortInsight[]
  highHeatRooms: RoomComfortInsight[]
  spatialSummary: string | null
  weatherSummary: string | null
  confidenceLine: string | null
}

const comfortTolerance = 0.5
const unstableTemperatureRange = 1.2

const formatTemperature = (value: number) =>
  `${value.toLocaleString('nb-NO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} °C`

function normalizeNivaSentence(value: string) {
  return value
    .toLowerCase()
    .replace(/[.,:;!?]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function dedupeNivaText(parts: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const sentences = parts
    .filter((part): part is string => Boolean(part?.trim()))
    .flatMap((part) => part.match(/[^.!?]+[.!?]?/g) ?? [part])
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .filter((sentence) => {
      const signature = normalizeNivaSentence(sentence)

      if (seen.has(signature)) {
        return false
      }

      seen.add(signature)
      return true
    })

  return sentences.join(' ')
}

function getAverage(points: RuntimeHistoryPoint[]) {
  if (points.length === 0) {
    return null
  }

  return points.reduce((sum, point) => sum + point.value, 0) / points.length
}

function getTemperatureRange(points: RuntimeHistoryPoint[]) {
  if (points.length < 4) {
    return 0
  }

  const values = points.map((point) => point.value)
  return Math.max(...values) - Math.min(...values)
}

function getRoomAreaLabel(roomKey: string, spatialMap: HouseSpatialMap, floors: FloorConfig[]) {
  const area = spatialMap.areas.find((candidate) => candidate.roomKeys.includes(roomKey))

  if (area) {
    return area.label
  }

  return floors.find((floor) => spatialMap.areas.some((areaCandidate) => areaCandidate.id === floor.id))?.label ?? null
}

function getComfortState({
  hasClimate,
  delta,
  temperatureRange,
  averageHeatDemand,
  heatNeedStatus,
}: {
  hasClimate: boolean
  delta: number | null
  temperatureRange: number
  averageHeatDemand: number | null
  heatNeedStatus: string
}): RoomComfortState {
  if (!hasClimate || delta === null) {
    return 'missing'
  }

  if (heatNeedStatus === 'over' || (averageHeatDemand !== null && averageHeatDemand >= 70)) {
    return 'highHeat'
  }

  if (temperatureRange >= unstableTemperatureRange) {
    return 'unstable'
  }

  if (delta < -comfortTolerance) {
    return 'cool'
  }

  if (delta > comfortTolerance) {
    return 'warm'
  }

  return 'comfortable'
}

function getComfortLabel(state: RoomComfortState) {
  const labels: Record<RoomComfortState, string> = {
    comfortable: 'Komfortabelt',
    cool: 'Litt kjølig',
    warm: 'Litt varmt',
    unstable: 'Ustabilt',
    highHeat: 'Høy varmeaktivitet',
    missing: 'Mangler data',
  }

  return labels[state]
}

function getComfortLine(state: RoomComfortState) {
  const labels: Record<RoomComfortState, string> = {
    comfortable: 'Komfort: stabil',
    cool: 'Komfort: litt kjølig',
    warm: 'Komfort: litt varmt',
    unstable: 'Komfort: ujevn',
    highHeat: 'Komfort: høy varmeaktivitet',
    missing: 'Komfort: venter på data',
  }

  return labels[state]
}

function getHeatLoadScore(averageHeatDemand: number | null, volume: number | null) {
  if (averageHeatDemand === null) {
    return 0
  }

  const volumeAdjustment =
    typeof volume === 'number' && Number.isFinite(volume)
      ? volume < 25
        ? 0.85
        : volume > 80
          ? 1.15
          : volume > 50
            ? 1.05
            : 1
      : 1

  return Math.round(averageHeatDemand * volumeAdjustment)
}

function buildRoomNivaSummary({
  room,
  state,
  averageHeatDemand,
  volume,
  areaLabel,
}: {
  room: Room
  state: RoomComfortState
  averageHeatDemand: number | null
  volume: number | null
  areaLabel: string | null
}) {
  if (state === 'missing') {
    return `${room.name} trenger mer klima- og historikkdata før komforten vurderes sikkert.`
  }

  if (state === 'highHeat') {
    return `${room.name} trenger mer varme enn forventet${volume ? ' for romstørrelsen' : ''}.`
  }

  if (state === 'cool') {
    return `${room.name} ligger litt under settpunktet og kan føles kjølig.`
  }

  if (state === 'warm') {
    return `${room.name} ligger litt over settpunktet og kan føles varmt.`
  }

  if (state === 'unstable') {
    return `${room.name} har litt ujevn temperatur i historikken jeg har.`
  }

  const heatText =
    averageHeatDemand !== null && averageHeatDemand >= 35
      ? ' med moderat varmebehov'
      : ' med lavt varmebehov'
  const areaText = areaLabel ? ` i ${areaLabel}` : ''

  return `${room.name}${areaText} holder komforten stabilt${heatText}.`
}

export function buildComfortEnergyInsight({
  rooms,
  roomConfigs,
  floors,
  history,
  weather,
  spatialMap,
  memory,
  confidenceLevel,
}: {
  rooms: Room[]
  roomConfigs: SystemRoomConfig[]
  floors: FloorConfig[]
  history: RuntimeHistoryPoint[]
  weather: WeatherSnapshot | null
  spatialMap: HouseSpatialMap
  memory: HouseMemoryState
  confidenceLevel: 'høy' | 'middels' | 'lav'
}): HouseComfortInsight {
  const roomInsights = rooms.map((room): RoomComfortInsight => {
    const config = roomConfigs.find((candidate) => candidate.key === room.key)
    const hasClimate = Boolean(config?.climate.active)
    const heatPoints = history
      .filter((point) => point.roomKey === room.key && point.field === 'heatDemand')
      .slice(-18)
    const temperaturePoints = history
      .filter((point) => point.roomKey === room.key && point.field === 'temperature')
      .slice(-18)
    const averageHeatDemand =
      getAverage(heatPoints) ?? (typeof room.heatDemand === 'number' ? room.heatDemand : null)
    const heatNeedAnalysis = getRoomHeatNeedAnalysis(
      config,
      heatPoints,
      room.temperature,
      room.targetTemperature,
    )
    const delta = hasClimate ? room.temperature - room.targetTemperature : null
    const temperatureRange = getTemperatureRange(temperaturePoints)
    const state = getComfortState({
      hasClimate,
      delta,
      temperatureRange,
      averageHeatDemand,
      heatNeedStatus: heatNeedAnalysis.status,
    })
    const volume = getRoomConfiguredVolume(config)
    const areaLabel = getRoomAreaLabel(room.key, spatialMap, floors)
    const heatLoadScore = getHeatLoadScore(averageHeatDemand, volume)
    const confidenceLine =
      confidenceLevel === 'lav'
        ? 'Basert på siste kjente verdier.'
        : heatPoints.length < 3 && temperaturePoints.length < 3
          ? 'Tynt komfortgrunnlag.'
          : null

    return {
      roomKey: room.key,
      roomName: room.name,
      areaLabel,
      state,
      label: getComfortLabel(state),
      comfortLine: getComfortLine(state),
      nivaSummary: buildRoomNivaSummary({
        room,
        state,
        averageHeatDemand,
        volume,
        areaLabel,
      }),
      energySummary:
        heatNeedAnalysis.status === 'over'
          ? heatNeedAnalysis.detail
          : averageHeatDemand !== null && averageHeatDemand >= 45
            ? 'Rommet har merkbar varmeaktivitet, men ikke nødvendigvis et avvik.'
            : 'Varmebehovet ser lavt ut.',
      confidenceLine,
      heatLoadScore,
      averageHeatDemand,
      temperatureDelta: delta,
    }
  })

  const climateRooms = roomInsights.filter((room) => room.state !== 'missing')
  const highHeatRooms = roomInsights
    .filter((room) => room.state === 'highHeat')
    .sort((a, b) => b.heatLoadScore - a.heatLoadScore)
  const roomsToWatch = roomInsights
    .filter((room) => room.state === 'cool' || room.state === 'warm' || room.state === 'unstable' || room.state === 'highHeat')
    .sort((a, b) => b.heatLoadScore - a.heatLoadScore)
  const averageTemperature =
    climateRooms.length > 0
      ? rooms
          .filter((room) => roomConfigs.some((config) => config.key === room.key && config.climate.active))
          .reduce((sum, room) => sum + room.temperature, 0) / climateRooms.length
      : null
  const state =
    climateRooms.length === 0
      ? 'missing'
      : highHeatRooms.length >= 2
        ? 'highLoad'
        : roomsToWatch.length > 0
          ? 'watch'
          : 'comfortable'
  const label =
    state === 'comfortable'
      ? 'Komforten er jevn'
      : state === 'highLoad'
        ? 'Flere rom har høyt varmebehov'
        : state === 'watch'
          ? 'Noen rom trenger oppfølging'
          : 'Mangler komfortdata'
  const areaScores = spatialMap.areas.map((area) => {
    const areaRooms = roomInsights.filter((room) => area.roomKeys.includes(room.roomKey))
    const heatScore = areaRooms.reduce((sum, room) => sum + room.heatLoadScore, 0)
    const watchCount = areaRooms.filter((room) => room.state === 'highHeat' || room.state === 'cool').length

    return {
      area,
      heatScore,
      watchCount,
      stableCount: areaRooms.filter((room) => room.state === 'comfortable').length,
    }
  })
  const warmestArea = areaScores.sort((a, b) => b.heatScore - a.heatScore)[0] ?? null
  const spatialSummary =
    warmestArea && warmestArea.heatScore > 80
      ? `${warmestArea.area.label} har mest varmeaktivitet akkurat nå.`
      : warmestArea && warmestArea.stableCount >= 2
        ? `${warmestArea.area.label} er stabil i komfortbildet.`
        : null
  const weatherSummary =
    weather && averageTemperature !== null
      ? weather.temperature <= 0 && state === 'comfortable'
        ? 'Det er kaldt ute, men huset holder temperaturen stabilt.'
        : weather.temperature <= 4 && highHeatRooms.length > 0
          ? 'Kaldt ute kan bidra til at enkelte rom ber mer om varme.'
          : weather.windSpeed >= 10 && roomsToWatch.length > 0
            ? 'Når det blåser mer ute, kan enkelte rom trenge litt mer varme.'
            : weather.precipitation && weather.precipitation > 0 && state === 'comfortable'
              ? 'Regnvær ute ser ikke ut til å påvirke komforten inne akkurat nå.'
              : null
      : null
  const latestMemory = memory.dailySnapshots[memory.dailySnapshots.length - 1] ?? null
  const memoryText =
    latestMemory && latestMemory.roomSummaries.some((room) => room.temperatureStable)
      ? 'Husets historikk viser stabil temperatur i flere rom.'
      : ''
  const confidenceLine =
    confidenceLevel === 'lav'
      ? 'Jeg trenger ferskere signaler før jeg vurderer komfort sikkert.'
      : confidenceLevel === 'middels'
        ? 'Komfortbildet bruker også siste kjente verdier.'
        : null
  const summary =
    state === 'missing'
      ? 'Jeg mangler nok klima- og historikkdata til en trygg komfortvurdering.'
      : state === 'comfortable'
        ? `Komforten er jevn${averageTemperature !== null ? ` rundt ${formatTemperature(averageTemperature)}` : ''}.`
        : state === 'highLoad'
          ? `Flere rom har høyt varmebehov: ${highHeatRooms.slice(0, 3).map((room) => room.roomName).join(', ')}.`
          : `Noen rom trenger litt oppfølging: ${roomsToWatch.slice(0, 3).map((room) => room.roomName).join(', ')}.`
  const homeLine =
    state === 'missing'
      ? null
      : state === 'comfortable'
        ? 'Komforten er stabil.'
        : state === 'highLoad'
          ? 'Flere rom ber om varme.'
          : 'Noen rom trenger litt oppfølging.'

  return {
    state,
    label,
    summary,
    homeLine,
    nivaSummary: dedupeNivaText([
      summary,
      spatialSummary,
      weatherSummary,
      memoryText,
      confidenceLine,
    ]),
    averageTemperature,
    rooms: roomInsights,
    roomsToWatch,
    highHeatRooms,
    spatialSummary,
    weatherSummary,
    confidenceLine,
  }
}
