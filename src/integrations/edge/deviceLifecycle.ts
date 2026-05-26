import type { ZigbeeDevice } from '../zigbee/zigbeeTypes'

export type EdgeDeviceCategory =
  | 'sensor'
  | 'switch'
  | 'climate'
  | 'lighting'
  | 'assistant'
  | 'media'
  | 'gateway'
  | 'safety'
  | 'energy'

export type EdgeDeviceLifecycleState =
  | 'discovered'
  | 'pairing'
  | 'active'
  | 'inactive'
  | 'unreachable'

export type EdgeRoomOption = {
  key: string
  label: string
}

export type EdgeLifecycleDevice = {
  id: string
  name: string
  type: string
  category: EdgeDeviceCategory
  manufacturer: string
  protocol: string
  roomKey: string | null
  roomLabel: string
  status: 'online' | 'offline' | 'foundation'
  signal: number | null
  battery: number | null
  firmwareVersion: string | null
  pairedAt: string | null
  lastSeen: string | null
  lifecycleState: EdgeDeviceLifecycleState
  notes: string
}

export type EdgeDeviceHealthSummary = {
  label: string
  nivaSummary: string
  offlineCount: number
  weakSignalCount: number
  lowBatteryCount: number
  staleCount: number
}

const categoryByKind: Record<ZigbeeDevice['kind'], EdgeDeviceCategory> = {
  coordinator: 'gateway',
  sensor: 'sensor',
  switch: 'switch',
  battery: 'energy',
}

const normalizeLabel = (value: string) =>
  value
    .toLowerCase()
    .replace(/\//g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const findRoomForDevice = (roomName: string | null, roomOptions: EdgeRoomOption[]) => {
  if (!roomName) {
    return null
  }

  const normalizedRoomName = normalizeLabel(roomName)

  return (
    roomOptions.find((option) => normalizeLabel(option.label).endsWith(normalizedRoomName)) ??
    roomOptions.find((option) => normalizeLabel(option.label).includes(normalizedRoomName)) ??
    null
  )
}

export function buildEdgeLifecycleDevices(
  zigbeeDevices: ZigbeeDevice[],
  roomOptions: EdgeRoomOption[],
  roomAssignments: Record<string, string | null> = {},
): EdgeLifecycleDevice[] {
  return zigbeeDevices.map((device) => {
    const assignedRoomKey = roomAssignments[device.deviceId]
    const matchedRoom =
      assignedRoomKey !== undefined
        ? roomOptions.find((option) => option.key === assignedRoomKey) ?? null
        : findRoomForDevice(device.room, roomOptions)
    const lifecycleState: EdgeDeviceLifecycleState = device.online
      ? 'active'
      : device.kind === 'coordinator'
        ? 'unreachable'
        : 'discovered'

    return {
      id: device.deviceId,
      name: device.name,
      type: device.model,
      category: device.category ?? categoryByKind[device.kind],
      manufacturer: device.manufacturer ?? 'Ukjent',
      protocol: device.protocol.toUpperCase(),
      roomKey: matchedRoom?.key ?? null,
      roomLabel: matchedRoom?.label ?? 'Ikke plassert',
      status: device.online ? 'online' : device.kind === 'coordinator' ? 'offline' : 'foundation',
      signal: device.signalStrength,
      battery: device.batteryLevel,
      firmwareVersion: device.firmwareVersion ?? null,
      pairedAt: device.pairedAt ?? null,
      lastSeen: device.lastSeen ?? null,
      lifecycleState,
      notes: device.notes,
    }
  })
}

export function getEdgeDeviceHealthSummary(devices: EdgeLifecycleDevice[]): EdgeDeviceHealthSummary {
  const offlineCount = devices.filter((device) => device.lifecycleState === 'unreachable').length
  const weakSignalCount = devices.filter(
    (device) => typeof device.signal === 'number' && device.signal < 50,
  ).length
  const lowBatteryCount = devices.filter(
    (device) => typeof device.battery === 'number' && device.battery < 25,
  ).length
  const staleCount = devices.filter(
    (device) => device.lifecycleState === 'discovered' || device.status === 'foundation',
  ).length

  if (offlineCount === 0 && weakSignalCount === 0 && lowBatteryCount === 0) {
    return {
      label: 'Device health rolig',
      nivaSummary: 'Edge-devicene har en ryddig foundation. Ingen kritiske signaler er markert.',
      offlineCount,
      weakSignalCount,
      lowBatteryCount,
      staleCount,
    }
  }

  return {
    label: 'Device health trenger oppfølging',
    nivaSummary: 'Noen edge-devices trenger senere oppfølging for signal, batteri eller live-status.',
    offlineCount,
    weakSignalCount,
    lowBatteryCount,
    staleCount,
  }
}

export function formatLifecycleState(state: EdgeDeviceLifecycleState) {
  if (state === 'discovered') {
    return 'Oppdaget'
  }

  if (state === 'pairing') {
    return 'Pairing'
  }

  if (state === 'active') {
    return 'Aktiv'
  }

  if (state === 'inactive') {
    return 'Inaktiv'
  }

  return 'Ikke nåbar'
}

export function formatDeviceCategory(category: EdgeDeviceCategory) {
  const labels: Record<EdgeDeviceCategory, string> = {
    sensor: 'Sensor',
    switch: 'Bryter',
    climate: 'Klima',
    lighting: 'Lys',
    assistant: 'Assistent',
    media: 'Media',
    gateway: 'Gateway',
    safety: 'Sikkerhet',
    energy: 'Energi',
  }

  return labels[category]
}
