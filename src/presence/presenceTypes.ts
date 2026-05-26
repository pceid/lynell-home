export type HousePresenceState =
  | 'quiet'
  | 'active'
  | 'activeAfternoon'
  | 'evening'
  | 'quietEvening'
  | 'lateActivity'
  | 'darkQuiet'
  | 'rainQuietEvening'
  | 'night'
  | 'away'
  | 'empty'
  | 'focus'
  | 'storm'
  | 'cozy'

export type PresenceTimeBucket = 'morning' | 'day' | 'evening' | 'night'

export type PresenceRoomSignal = {
  key: string
  name: string
  lightsOn: number
  averageBrightness: number
  heatDemand: number | null
}

export type PresenceWeatherSignal = {
  rainExpected: boolean
  windSpeed: number | null
  alert: boolean
  weatherText?: string
}

export type PresenceMediaSignal = {
  isPlaying: boolean
  mood?: 'calm' | 'focus' | 'morning' | 'evening' | 'energetic' | 'sleep'
  trackTitle?: string
  deviceName?: string
}

export type PresenceRobotSignal = {
  isCleaning: boolean
  currentRoom?: string | null
}

export type PresenceSensorSignal = {
  activeRoomNames: string[]
  staleSensorCount: number
  weakSignalCount: number
  lowBatteryCount: number
  environmentalSummary?: string
}

export type HousePresenceInput = {
  now: Date
  globalMode: string
  rooms: PresenceRoomSignal[]
  weather?: PresenceWeatherSignal | null
  media?: PresenceMediaSignal | null
  calendarActivityCount: number
  robot?: PresenceRobotSignal | null
  sensors?: PresenceSensorSignal | null
}

export type HousePresence = {
  state: HousePresenceState
  label: string
  nivaSummary: string
  activeRoomNames: string[]
  signals: {
    timeBucket: PresenceTimeBucket
    lightsOnCount: number
    averageBrightness: number
    hasCalendarActivity: boolean
    hasMediaActivity: boolean
    hasRobotActivity: boolean
    hasSensorActivity: boolean
    hasWeatherAlert: boolean
  }
}
