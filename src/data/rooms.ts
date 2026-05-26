export type RoomMode = 'Komfort' | 'Natt'
export type RoomKey = string
export type ZoneKey = string
export type RoomGroup = string

export type LightZone = {
  id: string
  key: ZoneKey
  name: string
  lightsOn: boolean
  brightness: number
  dimmable: boolean
}

export type Room = {
  id: number
  key: RoomKey
  group: RoomGroup
  name: string
  configured: boolean
  temperature: number
  targetTemperature: number
  zones: LightZone[]
  mode: RoomMode
  heatDemand?: number | null
}
