import type { CalendarEventConfig } from '../config/systemConfig'
import type { RoomMode } from '../data/rooms'

export type NivaInsight = {
  id: string
  title: string
  detail: string
  reason?: string
  actionLabel?: string
  onAction?: () => void
  dismissLabel?: string
  contextKey?: string
  dismissUntilMs?: number
}

export type NivaProposedAction =
  | {
      kind: 'scene'
      label: string
      summary: string
      sceneId: string
      sceneName: string
    }
  | {
      kind: 'lightsOff'
      label: string
      summary: string
    }
  | {
      kind: 'roomLightsOff'
      label: string
      summary: string
      roomId: number
      roomKey: string
      roomName: string
    }
  | {
      kind: 'zoneLightsOff'
      label: string
      summary: string
      roomId: number
      roomKey: string
      roomName: string
      zoneId: string
      zoneKey: string
      zoneName: string
    }
  | {
      kind: 'roomBrightness'
      label: string
      summary: string
      roomId: number
      roomKey: string
      roomName: string
      brightness: number
      zoneIds: string[]
      zoneKeys: string[]
      zoneNames: string[]
    }
  | {
      kind: 'roomMode'
      label: string
      summary: string
      roomId: number
      roomKey: string
      roomName: string
      mode: RoomMode
    }
  | {
      kind: 'calendar'
      label: string
      summary: string
      event: CalendarEventConfig
      events?: CalendarEventConfig[]
      actionId?: string
      fingerprint?: string
      confidence?: 'high' | 'medium' | 'low'
      missingFields?: string[]
      clarification?: string | null
    }
  | {
      kind: 'climateSetpoint'
      label: string
      summary: string
      roomId: number
      roomKey: string
      roomName: string
      setpoint: number
    }
  | {
      kind: 'mediaControl'
      label: string
      summary: string
      action: 'play' | 'pause' | 'playCalm' | 'playMood' | 'device'
      trackId?: string
      mood?: 'calm' | 'focus' | 'evening' | 'energetic' | 'sleep'
      deviceId?: string
      deviceName?: string
    }
  | {
      kind: 'vacuumControl'
      label: string
      summary: string
      action: 'start' | 'pause' | 'dock' | 'stop' | 'status'
      deviceId: string
    }

export type NivaIntent =
  | 'calendar'
  | 'scene'
  | 'climate'
  | 'light'
  | 'media'
  | 'vacuum'
  | 'weather'
  | 'system'
  | 'unknown'

export type NivaMessage = {
  id: string
  timestamp: number
  role: 'user' | 'niva'
  text: string
  type: 'insight' | 'command' | 'response'
  status: 'pending' | 'acknowledged' | 'completed'
  intent?: NivaIntent
  proposedAction?: NivaProposedAction
}

export type NivaWeatherAwareness = {
  current: {
    temperature: number
    windSpeed: number
    windGust: number | null
    rainAmount: number | null
    rainExpected: boolean
    weatherText: string
    symbol: string
  } | null
  forecastToday: {
    rainExpected: boolean
    rainAmount: number | null
    windSpeed: number
    windGust: number | null
    weatherText: string
  } | null
  forecastTomorrow: {
    rainExpected: boolean | null
    rainAmount: number | null
    windSpeed: number | null
    windGust: number | null
    temperature: number | null
    weatherText: string
  } | null
  updatedAt: number | null
  source: 'live' | 'unavailable'
  alert: {
    key: string
    message: string
    tone: 'active' | 'warning'
  } | null
}
