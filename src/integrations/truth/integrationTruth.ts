import type { BridgeCastStatus, BridgeMqttStatus, BridgeVacuumStatus } from '../../api/homeApi'
import type { MediaDevice } from '../../media/mediaTypes'

export type IntegrationTruthStatus =
  | 'Live'
  | 'Klar for test'
  | 'Klargjort'
  | 'Foundation'
  | 'Mock'
  | 'Disabled'
  | 'Mangler dependency'
  | 'Mangler env'
  | 'Ikke koblet'

export function getCastDiscoveryTruthStatus(status: BridgeCastStatus | null): IntegrationTruthStatus {
  if (!status) {
    return 'Ikke koblet'
  }

  if (!status.enabled) {
    return 'Disabled'
  }

  if (!status.discoveryEnabled) {
    return 'Mangler env'
  }

  if (status.dependencyReady === false) {
    return 'Mangler dependency'
  }

  if (status.state === 'fallback' && status.error?.toLowerCase().includes('dependency')) {
    return 'Mangler dependency'
  }

  if ((status.diagnostics?.onlineCount ?? status.devices.filter((device) => device.online).length) > 0) {
    return 'Klar for test'
  }

  if (status.devices.length > 0) {
    return 'Ikke koblet'
  }

  return 'Klargjort'
}

export function getCastPlaybackTruthStatus(status: BridgeCastStatus | null): IntegrationTruthStatus {
  const playback = status?.playback

  if (!status || !status.enabled) {
    return 'Disabled'
  }

  if (!playback?.dependencyReady) {
    return 'Foundation'
  }

  if (playback.state === 'disconnected' || playback.state === 'unavailable' || playback.playbackConfidence === 'low') {
    return 'Ikke koblet'
  }

  return playback.state === 'playing' ? 'Live' : 'Klar for test'
}

export function getMqttTruthStatus(status: BridgeMqttStatus | null): IntegrationTruthStatus {
  if (!status) {
    return 'Ikke koblet'
  }

  if (!status.enabled) {
    return 'Disabled'
  }

  if (status.error?.toLowerCase().includes('dependency')) {
    return 'Mangler dependency'
  }

  if (!status.broker.host) {
    return 'Mangler env'
  }

  if ((status.connected || status.state === 'connected') && (status.topicTrust?.liveTopicCount ?? 0) > 0) {
    return 'Live'
  }

  if (status.connected || status.state === 'connected') {
    return 'Klar for test'
  }

  return 'Klar for test'
}

export function getVacuumTruthStatus(status: BridgeVacuumStatus | null): IntegrationTruthStatus {
  if (!status) {
    return 'Mock'
  }

  if (!status.enabled) {
    return 'Disabled'
  }

  if (status.state === 'degraded') {
    return 'Klar for test'
  }

  if (
    status.connected &&
    status.trust?.state !== 'stale' &&
    status.trust?.state !== 'offline' &&
    status.trust?.stateConfidence !== 'low'
  ) {
    return 'Live'
  }

  if (status.trust?.state === 'stale' || status.trust?.state === 'offline') {
    return 'Ikke koblet'
  }

  if (!status.configured && status.authRequired) {
    return 'Mangler env'
  }

  if (status.provider === 'mock') {
    return 'Mock'
  }

  return 'Foundation'
}

export function getMediaDeviceTruthStatus(device: MediaDevice | null): IntegrationTruthStatus {
  if (!device) {
    return 'Ikke koblet'
  }

  if (device.availability === 'available') {
    return device.type === 'localDevice' ? 'Live' : 'Klar for test'
  }

  if (device.availability === 'discovered') {
    return device.online ? 'Klar for test' : 'Ikke koblet'
  }

  if (device.availability === 'offline') {
    return 'Ikke koblet'
  }

  return 'Foundation'
}
