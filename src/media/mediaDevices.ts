import type { BridgeCastDevice } from '../api/homeApi'
import type { MediaDevice, MediaDeviceAvailability, MediaDeviceType } from './mediaTypes'

export const initialMediaDevices: MediaDevice[] = [
  {
    deviceId: 'local-speaker',
    name: 'Denne enheten',
    type: 'localDevice',
    roomName: 'Lokal avspilling',
    availability: 'available',
    online: true,
    volume: 42,
    active: true,
    capabilities: ['localPlayback', 'volume'],
  },
  {
    deviceId: 'tv-stue',
    name: 'TV-stue TV',
    type: 'tv',
    roomKey: 'plan1-living-room',
    roomName: 'TV-stue',
    aliases: ['tv', 'stue', 'stua', 'tv-stue'],
    availability: 'foundation',
    online: true,
    volume: 28,
    active: false,
    capabilities: ['externalPlayback', 'castFoundation', 'volume', 'roomRouting'],
  },
  {
    deviceId: 'google-home-kjokken',
    name: 'Google Home Kjøkken',
    type: 'googleHome',
    roomKey: 'plan1-kitchen-dining',
    roomName: 'Kjøkken',
    aliases: ['kjøkken', 'kjokken', 'google kjøkken', 'google kjokken'],
    availability: 'foundation',
    online: true,
    volume: 35,
    active: false,
    capabilities: ['externalPlayback', 'castFoundation', 'volume', 'roomRouting'],
  },
  {
    deviceId: 'google-home-oppholdsrom',
    name: 'Oppholdsrom gruppe',
    type: 'googleHomeGroup',
    roomName: 'Oppholdsrom',
    aliases: ['oppholdsrom', 'hovedetasjen', 'gruppe', 'multiroom'],
    availability: 'foundation',
    online: true,
    volume: 32,
    active: false,
    capabilities: ['externalPlayback', 'castFoundation', 'groupPlayback', 'volume', 'roomRouting'],
  },
  {
    deviceId: 'sonos-foundation',
    name: 'Sonos Foundation',
    type: 'sonos',
    roomName: 'Foundation',
    aliases: ['sonos'],
    availability: 'foundation',
    online: false,
    volume: 35,
    active: false,
    capabilities: ['externalPlayback', 'groupPlayback', 'volume'],
  },
  {
    deviceId: 'bluetooth-hobby',
    name: 'Bluetooth Hobby',
    type: 'bluetoothSpeaker',
    roomKey: 'basement-hobby',
    roomName: 'Hobby',
    aliases: ['hobby', 'hobbydel', 'bluetooth'],
    availability: 'foundation',
    online: false,
    volume: 40,
    active: false,
    capabilities: ['externalPlayback', 'volume', 'roomRouting'],
  },
]

const typeLabels: Record<MediaDeviceType, string> = {
  localDevice: 'Lokal enhet',
  tv: 'TV',
  googleHome: 'Google Home',
  googleHomeGroup: 'Google Home-gruppe',
  sonos: 'Sonos',
  bluetoothSpeaker: 'Bluetooth',
}

const availabilityLabels: Record<MediaDeviceAvailability, string> = {
  available: 'Tilgjengelig',
  foundation: 'Foundation',
  offline: 'Offline',
  discovered: 'Oppdaget på LAN',
}

export function getActiveMediaDevice(devices: MediaDevice[]) {
  return devices.find((device) => device.active) ?? devices[0] ?? null
}

export function setActiveMediaDevice(devices: MediaDevice[], deviceId: string) {
  return devices.map((device) => ({
    ...device,
    active: device.deviceId === deviceId,
  }))
}

export function setMediaDeviceVolume(devices: MediaDevice[], deviceId: string, volume: number) {
  const nextVolume = Math.max(0, Math.min(100, volume))

  return devices.map((device) =>
    device.deviceId === deviceId ? { ...device, volume: nextVolume } : device,
  )
}

export function getMediaDeviceTypeLabel(type: MediaDeviceType) {
  return typeLabels[type]
}

export function getMediaDeviceAvailabilityLabel(availability: MediaDeviceAvailability) {
  return availabilityLabels[availability]
}

export function getMediaDeviceLocationLabel(device: MediaDevice) {
  return device.roomName ?? 'Hele huset'
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/é/g, 'e')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/æ/g, 'ae')
}

export function findMediaDeviceForText(devices: MediaDevice[], text: string) {
  const normalizedText = normalize(text)

  return devices.find((device) => {
    const candidates = [
      device.name,
      device.roomName ?? '',
      device.type,
      getMediaDeviceTypeLabel(device.type),
      device.name.replace(/^Google Home\s+/i, ''),
      device.name.replace(/^Sonos\s+/i, ''),
      ...(device.aliases ?? []),
    ].map(normalize)

    return candidates.some((candidate) => candidate.length > 0 && normalizedText.includes(candidate))
  }) ?? null
}

export function mergeDiscoveredCastDevices(
  devices: MediaDevice[],
  castDevices: BridgeCastDevice[],
): MediaDevice[] {
  const castDeviceById = new Map(castDevices.map((device) => [device.id, device]))
  const existingIds = new Set(devices.map((device) => device.deviceId))
  const updatedDevices = devices.map((device) => {
    const castDevice = castDeviceById.get(device.deviceId)

    if (!castDevice) {
      return device
    }

    const trustState = castDevice.state ?? castDevice.status ?? (castDevice.online ? 'online' : 'unknown')
    const availability = trustState === 'offline' ? 'offline' : 'discovered'

    return {
      ...device,
      name: castDevice.name || device.name,
      type: castDevice.type === 'tv' ? 'tv' : 'googleHome',
      aliases: [castDevice.name, castDevice.host, castDevice.ip, ...(device.aliases ?? [])].filter(Boolean),
      availability,
      online: trustState === 'online',
      trustState,
      lastSeenAt: castDevice.lastSeenAt ?? castDevice.lastSeen ?? device.lastSeenAt ?? null,
      statusDetail:
        trustState === 'online'
          ? 'Ferskt oppdaget på LAN'
          : trustState === 'stale'
            ? 'Ikke sett nylig, men husket fra discovery'
            : trustState === 'offline'
              ? 'Offline etter discovery-vindu'
              : 'Discovery-status ukjent',
    } satisfies MediaDevice
  })
  const discoveredDevices = castDevices
    .filter((device) => !existingIds.has(device.id))
    .map((device): MediaDevice => {
      const trustState = device.state ?? device.status ?? (device.online ? 'online' : 'unknown')

      return {
      deviceId: device.id,
      name: device.name,
      type: device.type === 'tv' ? 'tv' : 'googleHome',
      roomName: 'Oppdaget lokalt',
      aliases: [device.name, device.host, device.ip].filter(Boolean),
        availability: trustState === 'offline' ? 'offline' : 'discovered',
        online: trustState === 'online',
        trustState,
        lastSeenAt: device.lastSeenAt ?? device.lastSeen ?? null,
        statusDetail:
          trustState === 'online'
            ? 'Ferskt oppdaget på LAN'
            : trustState === 'stale'
              ? 'Ikke sett nylig, men husket fra discovery'
              : trustState === 'offline'
                ? 'Offline etter discovery-vindu'
                : 'Discovery-status ukjent',
      volume: 35,
      active: false,
      capabilities: ['externalPlayback', 'castFoundation', 'volume', 'roomRouting'],
      }
    })

  if (discoveredDevices.length === 0) {
    return updatedDevices
  }

  return [...updatedDevices, ...discoveredDevices]
}
