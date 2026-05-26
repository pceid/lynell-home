import type { SystemRoomConfig } from '../config/systemConfig'
import type { Room } from '../data/rooms'
import {
  getRoomHeatNeedAnalysis,
  type RoomHeatNeedAnalysis,
} from '../runtime/heatDemandAnalysis'
import type { RuntimeHistoryPoint, RuntimeHistoryTrend } from '../runtime/runtimeHistory'

const targetTolerance = 0.3

export type { RoomHeatNeedAnalysis }

export type RoomReport = {
  status: 'normal' | 'watch' | 'check'
  statusLabel: string
  text: string
  recommendations: string[]
}

export function buildNivaRoomReport({
  room,
  config,
  heatDemandPoints,
  temperatureTrend,
  intelligenceText,
  comfortText,
  confidenceText,
  formatTemperature,
}: {
  room: Room
  config: SystemRoomConfig | undefined
  heatDemandPoints: RuntimeHistoryPoint[]
  temperatureTrend: RuntimeHistoryTrend | null | undefined
  intelligenceText?: string | null
  comfortText?: string | null
  confidenceText?: string | null
  formatTemperature: (value: number) => string
}): RoomReport {
  const heatNeedAnalysis = getRoomHeatNeedAnalysis(
    config,
    heatDemandPoints,
    room.temperature,
    room.targetTemperature,
  )
  const activeZones = room.zones.filter((zone) => zone.lightsOn)
  const activeZoneText =
    room.zones.length === 0
      ? 'Ingen lyssoner er konfigurert.'
      : activeZones.length === 0
        ? 'Ingen lyssoner er aktive.'
        : `${activeZones.length} lyssone${activeZones.length === 1 ? '' : 'r'} er aktiv${
            activeZones.length === 1 ? '' : 'e'
          }.`
  const hasClimate = Boolean(config?.climate.active)
  const temperatureText = hasClimate
    ? `${room.name} holder ${formatTemperature(room.temperature)}`
    : `${room.name} har ikke aktiv klima i Lynell ennå`
  const setpointText =
    hasClimate && Math.abs(room.temperature - room.targetTemperature) <= targetTolerance
      ? 'ligger nær settpunktet'
      : hasClimate && room.temperature < room.targetTemperature
        ? 'ligger under settpunktet'
        : hasClimate
          ? 'ligger over settpunktet'
          : ''
  const heatText =
    heatNeedAnalysis.status === 'over'
      ? 'har over normalt varmebehov'
      : heatNeedAnalysis.status === 'under'
        ? 'har lavt varmebehov'
        : heatNeedAnalysis.status === 'normal'
          ? heatNeedAnalysis.label === 'Foreløpig vurdering'
            ? 'har en foreløpig varmevurdering'
            : 'har normalt varmebehov'
          : 'har foreløpig lite varmegrunnlag'
  const trendText =
    temperatureTrend && temperatureTrend !== 'stabil' ? ` Temperaturen er ${temperatureTrend}.` : ''
  const status =
    heatNeedAnalysis.status === 'over' || (typeof room.heatDemand === 'number' && room.heatDemand >= 80)
      ? 'check'
      : heatNeedAnalysis.status === 'missing' ||
          (hasClimate && Math.abs(room.temperature - room.targetTemperature) > targetTolerance)
        ? 'watch'
        : 'normal'
  const statusLabel =
    status === 'check' ? 'Krever sjekk' : status === 'watch' ? 'Følg med' : 'Alt ser normalt ut'
  const recommendations = (() => {
    if (status === 'check') {
      const nextRecommendations = [
        'Rommet bruker mer varme enn forventet.',
        'Sjekk vinduer, trekk eller isolasjon.',
      ]

      if (hasClimate && room.targetTemperature >= 23) {
        nextRecommendations[1] = 'Sjekk om rommet står med høyere settpunkt enn nødvendig.'
      }

      if (temperatureTrend === 'fallende') {
        nextRecommendations[0] = 'Temperaturen faller mens rommet ber om varme.'
      }

      return nextRecommendations
    }

    if (status === 'watch') {
      if (hasClimate && Math.abs(room.temperature - room.targetTemperature) > targetTolerance) {
        return [
          'Følg med på temperatur og varme de neste timene.',
          'Vurder å justere settpunkt litt hvis rommet føles ujevnt.',
        ]
      }

      return [
        'Følg med når mer historikk kommer inn.',
        'Legg inn romdata hvis du vil ha bedre vurdering senere.',
      ]
    }

    return []
  })()
  const followUp =
    status === 'check'
      ? ' Sjekk trekk, vinduer eller varmeinnstillinger.'
      : status === 'watch'
        ? ' Jeg følger med når mer data kommer inn.'
        : ''

  return {
    status,
    statusLabel,
    text: `${temperatureText}${setpointText ? `, ${setpointText}` : ''} og ${heatText}. ${activeZoneText}${trendText}${comfortText ? ` ${comfortText}.` : ''}${intelligenceText ? ` ${intelligenceText}` : ''}${confidenceText ? ` ${confidenceText}` : ''}${followUp}`,
    recommendations: recommendations.slice(0, 2),
  }
}
