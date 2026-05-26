import type { EdgeDeviceHealthSummary, EdgeLifecycleDevice } from '../integrations/edge/deviceLifecycle'
import type { SensorIntelligenceSummary } from '../integrations/edge/sensorIntelligence'
import type { VacuumDevice } from '../integrations/vacuum/vacuumTypes'
import type { HouseMemoryInsight } from '../memory/houseMemory'
import type { MediaPlayerState } from '../media/mediaTypes'
import type { AdaptiveAwarenessInsight } from './adaptiveAwareness'
import type { HouseComfortInsight, RoomComfortInsight } from './comfortEnergy'

export type LynellRecommendationCategory =
  | 'comfort'
  | 'energy'
  | 'sensor'
  | 'device'
  | 'assistant'
  | 'media'
  | 'system'
  | 'weather'

export type LynellRecommendationPriority = 'low' | 'medium' | 'high'

export type LynellRecommendation = {
  id: string
  category: LynellRecommendationCategory
  priority: LynellRecommendationPriority
  title: string
  shortText: string
  reason: string
  relatedRoomKey?: string
  relatedDeviceId?: string
  actionType?: 'openRoom' | 'reviewClimate' | 'reviewDevice' | 'openAssistants' | 'openMedia' | 'reviewSystem'
  dismissible: boolean
  createdAt: number
}

export type RecommendationWeatherSignal = {
  alertMessage: string | null
  windSpeed: number | null
  rainExpected: boolean
}

const priorityWeight: Record<LynellRecommendationPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
}

function compactRecommendations(recommendations: LynellRecommendation[]) {
  const seen = new Set<string>()

  return recommendations
    .filter((recommendation) => {
      const key = `${recommendation.category}:${recommendation.relatedRoomKey ?? recommendation.relatedDeviceId ?? recommendation.title}`

      if (seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
    .sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority])
}

function isRecommendation(value: LynellRecommendation | null): value is LynellRecommendation {
  return value !== null
}

function recommendationFromRoomComfort(room: RoomComfortInsight, createdAt: number): LynellRecommendation | null {
  if (room.state === 'highHeat') {
    return {
      id: `comfort-high-heat-${room.roomKey}`,
      category: 'comfort',
      priority: 'medium',
      title: `Følg med på ${room.roomName}`,
      shortText: 'Rommet har litt høy varmeaktivitet over tid.',
      reason: room.nivaSummary,
      relatedRoomKey: room.roomKey,
      actionType: 'reviewClimate',
      dismissible: true,
      createdAt,
    }
  }

  if (room.state === 'cool' || room.state === 'unstable') {
    return {
      id: `comfort-watch-${room.roomKey}`,
      category: 'comfort',
      priority: 'low',
      title: `${room.roomName} kan trenge litt oppfølging`,
      shortText: room.state === 'cool' ? 'Rommet ligger litt kjølig.' : 'Temperaturen virker litt ujevn.',
      reason: room.confidenceLine ?? room.nivaSummary,
      relatedRoomKey: room.roomKey,
      actionType: 'openRoom',
      dismissible: true,
      createdAt,
    }
  }

  return null
}

function recommendationFromDevice(device: EdgeLifecycleDevice, createdAt: number): LynellRecommendation | null {
  if (typeof device.battery === 'number' && device.battery < 25) {
    return {
      id: `device-battery-${device.id}`,
      category: 'device',
      priority: 'medium',
      title: 'Batteri begynner å bli lavt',
      shortText: `${device.name} viser ${device.battery}% batteri.`,
      reason: device.roomLabel,
      relatedDeviceId: device.id,
      actionType: 'reviewDevice',
      dismissible: true,
      createdAt,
    }
  }

  if (typeof device.signal === 'number' && device.signal < 45) {
    return {
      id: `device-signal-${device.id}`,
      category: 'device',
      priority: 'low',
      title: 'Zigbee-signal virker svakt',
      shortText: `${device.name} ligger på ${device.signal}% signal.`,
      reason: device.roomLabel,
      relatedDeviceId: device.id,
      actionType: 'reviewDevice',
      dismissible: true,
      createdAt,
    }
  }

  if (device.lifecycleState === 'unreachable') {
    return {
      id: `device-unreachable-${device.id}`,
      category: 'device',
      priority: 'medium',
      title: 'Sjekk device-status',
      shortText: `${device.name} virker ikke nåbar i foundation.`,
      reason: device.notes,
      relatedDeviceId: device.id,
      actionType: 'reviewDevice',
      dismissible: true,
      createdAt,
    }
  }

  return null
}

export function buildLynellRecommendations({
  comfort,
  adaptive,
  memory,
  sensorIntelligence,
  edgeDevices,
  edgeHealth,
  mediaPlayer,
  vacuum,
  weather,
  confidenceLevel,
  createdAt = Date.now(),
}: {
  comfort: HouseComfortInsight
  adaptive: AdaptiveAwarenessInsight
  memory: HouseMemoryInsight
  sensorIntelligence: SensorIntelligenceSummary
  edgeDevices: EdgeLifecycleDevice[]
  edgeHealth: EdgeDeviceHealthSummary
  mediaPlayer: MediaPlayerState
  vacuum: VacuumDevice | null
  weather: RecommendationWeatherSignal
  confidenceLevel: 'høy' | 'middels' | 'lav'
  createdAt?: number
}): LynellRecommendation[] {
  const recommendations: Array<LynellRecommendation | null> = []

  if (confidenceLevel === 'lav') {
    recommendations.push({
      id: 'system-confidence-fallback',
      category: 'system',
      priority: 'low',
      title: 'Bruk siste kjente status med litt ro',
      shortText: 'Noen verdier bygger på siste kjente state.',
      reason: adaptive.confidenceLine ?? 'Runtime confidence er lav akkurat nå.',
      actionType: 'reviewSystem',
      dismissible: true,
      createdAt,
    })

    return compactRecommendations(recommendations.filter(isRecommendation))
  }

  for (const room of comfort.roomsToWatch.slice(0, 3)) {
    recommendations.push(recommendationFromRoomComfort(room, createdAt))
  }

  if (comfort.state === 'comfortable' && memory.presenceLine) {
    recommendations.push({
      id: 'energy-stable-comfort',
      category: 'energy',
      priority: 'low',
      title: 'Komforten virker stabil',
      shortText: 'Flere rom holder temperaturen jevnt.',
      reason: memory.presenceLine,
      dismissible: true,
      createdAt,
    })
  }

  if (adaptive.kind === 'comfort' && comfort.highHeatRooms.length > 0) {
    const room = comfort.highHeatRooms[0]
    recommendations.push({
      id: `adaptive-heat-${room.roomKey}`,
      category: 'energy',
      priority: 'medium',
      title: 'Varmebehovet virker litt annerledes',
      shortText: adaptive.comfortLine,
      reason: room.energySummary,
      relatedRoomKey: room.roomKey,
      actionType: 'reviewClimate',
      dismissible: true,
      createdAt,
    })
  }

  if (sensorIntelligence.staleSensorCount > 0) {
    recommendations.push({
      id: 'sensor-stale-foundation',
      category: 'sensor',
      priority: 'low',
      title: 'Noen sensorer er fortsatt stille',
      shortText: 'Sensorlaget bruker foundation-state for enkelte signaler.',
      reason: sensorIntelligence.nivaSummary,
      actionType: 'reviewDevice',
      dismissible: true,
      createdAt,
    })
  }

  for (const device of edgeDevices) {
    recommendations.push(recommendationFromDevice(device, createdAt))
  }

  if (edgeHealth.offlineCount > 0 || edgeHealth.weakSignalCount > 0 || edgeHealth.lowBatteryCount > 0) {
    recommendations.push({
      id: 'edge-health-follow-up',
      category: 'device',
      priority: edgeHealth.offlineCount > 0 ? 'medium' : 'low',
      title: 'Edge health kan sjekkes senere',
      shortText: edgeHealth.nivaSummary,
      reason: edgeHealth.label,
      actionType: 'reviewDevice',
      dismissible: true,
      createdAt,
    })
  }

  if (vacuum && !vacuum.cleaning && (adaptive.assistantLine.includes('rolig aktivitet') || adaptive.assistantLine.includes('lav aktivitet'))) {
    recommendations.push({
      id: `assistant-vacuum-${vacuum.deviceId}`,
      category: 'assistant',
      priority: 'low',
      title: 'Støvsuging kan passe i dag',
      shortText: 'Assistentlaget har lav aktivitet akkurat nå.',
      reason: adaptive.assistantLine,
      relatedDeviceId: vacuum.deviceId,
      actionType: 'openAssistants',
      dismissible: true,
      createdAt,
    })
  }

  if (!mediaPlayer.isPlaying && comfort.state === 'comfortable' && adaptive.kind === 'stable') {
    recommendations.push({
      id: 'media-calm-home',
      category: 'media',
      priority: 'low',
      title: 'Media kan støtte roen',
      shortText: 'Huset virker stabilt og stille nok for dempet avspilling.',
      reason: adaptive.summary,
      actionType: 'openMedia',
      dismissible: true,
      createdAt,
    })
  }

  if (weather.alertMessage) {
    recommendations.push({
      id: 'weather-alert-awareness',
      category: 'weather',
      priority: 'medium',
      title: 'Følg litt med på været',
      shortText: weather.alertMessage,
      reason: 'Basert på vær-awareness',
      dismissible: true,
      createdAt,
    })
  } else if (typeof weather.windSpeed === 'number' && weather.windSpeed >= 10) {
    recommendations.push({
      id: 'weather-wind-awareness',
      category: 'weather',
      priority: 'low',
      title: 'Det kan blåse litt opp',
      shortText: 'Løse ting ute kan være verdt en enkel sjekk.',
      reason: `Vind er ${weather.windSpeed} m/s.`,
      dismissible: true,
      createdAt,
    })
  }

  return compactRecommendations(recommendations.filter(isRecommendation)).slice(0, 8)
}
