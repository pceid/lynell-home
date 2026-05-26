export type ZigbeeDeviceKind = 'coordinator' | 'sensor' | 'switch' | 'battery'

export type ZigbeeDevice = {
  deviceId: string
  name: string
  model: string
  kind: ZigbeeDeviceKind
  category?: 'sensor' | 'switch' | 'climate' | 'lighting' | 'gateway' | 'safety' | 'energy'
  manufacturer?: string
  online: boolean
  batteryLevel: number | null
  batteryPowered: boolean
  room: string | null
  signalStrength: number | null
  protocol: 'zigbee'
  firmwareVersion?: string | null
  pairedAt?: string | null
  lastSeen?: string | null
  notes: string
}
