import type {
  CameraDeviceConfig,
  CameraFoundationConfig,
  CameraRuntimeState,
  CameraType,
  MediaConfig,
  MediaGroupConfig,
  RecorderTarget,
} from '../config/systemConfig'

function hasText(value?: string | null) {
  return String(value ?? '').trim().length > 0
}

export function formatCameraType(type: CameraType) {
  const labels: Record<CameraType, string> = {
    rtsp: 'RTSP',
    onvif: 'ONVIF',
    tapoFoundation: 'Tapo C520WS foundation',
    genericIpCamera: 'Generic IP camera',
  }

  return labels[type] ?? type
}

export function formatCameraState(state: CameraRuntimeState) {
  const labels: Record<CameraRuntimeState, string> = {
    online: 'Online',
    stale: 'Stale',
    offline: 'Offline',
    unknown: 'Foundation',
  }

  return labels[state] ?? state
}

export function formatRecorderTarget(target: RecorderTarget) {
  const labels: Record<RecorderTarget, string> = {
    localDisk: 'Lokal disk',
    externalDisk: 'Ekstern disk',
    networkPath: 'Nettverkssti',
  }

  return labels[target] ?? target
}

export function getCameraConfiguredInputs(camera: CameraDeviceConfig) {
  return {
    rtsp: hasText(camera.rtspUrl),
    onvif: hasText(camera.onvif),
    snapshot: hasText(camera.snapshotUrl),
  }
}

export function getCameraTrustStatus(camera: CameraDeviceConfig) {
  const inputs = getCameraConfiguredInputs(camera)
  const hasLiveInput = inputs.rtsp || inputs.onvif || inputs.snapshot

  if (!camera.enabled) {
    return 'disabled'
  }

  if (!hasLiveInput) {
    return 'missingStream'
  }

  if (camera.state === 'online') {
    return 'online'
  }

  return camera.state === 'unknown' ? 'foundation' : camera.state
}

export function formatCameraTrustStatus(camera: CameraDeviceConfig) {
  const status = getCameraTrustStatus(camera)
  const labels: Record<string, string> = {
    disabled: 'Deaktivert',
    missingStream: 'Mangler stream/snapshot',
    foundation: 'Foundation',
    online: 'Online',
    stale: 'Stale',
    offline: 'Offline',
  }

  return labels[status] ?? status
}

export function summarizeCameraFoundation(config: CameraFoundationConfig) {
  const cameras = config.cameras ?? []
  const visibleCameras = cameras.filter((camera) => camera.visible !== false)
  const enabledCameras = cameras.filter((camera) => camera.enabled)
  const missingInputCameras = enabledCameras.filter((camera) => {
    const inputs = getCameraConfiguredInputs(camera)
    return !inputs.rtsp && !inputs.onvif && !inputs.snapshot
  })
  const recordingEnabledCameras = enabledCameras.filter((camera) => camera.recordingEnabled)

  return {
    providerEnabled: config.providerEnabled,
    cameraCount: cameras.length,
    visibleCount: visibleCameras.length,
    enabledCount: enabledCameras.length,
    missingInputCount: missingInputCameras.length,
    recordingEnabledCount: recordingEnabledCameras.length,
    onlineCount: cameras.filter((camera) => camera.state === 'online').length,
    staleCount: cameras.filter((camera) => camera.state === 'stale').length,
    offlineCount: cameras.filter((camera) => camera.state === 'offline').length,
    recorderTarget: config.recorder.target,
    recorderTargetLabel: formatRecorderTarget(config.recorder.target),
    retentionDays: config.recorder.retentionDays,
    overwriteOldest: config.recorder.overwriteOldest,
    storageHealth: config.recorder.storageHealth,
    freeSpaceEstimateGb: config.recorder.freeSpaceEstimateGb,
  }
}

export function summarizeMediaGroups(mediaConfig: MediaConfig) {
  const groups = mediaConfig.groups ?? []
  const speakers = groups.flatMap((group) => group.speakers ?? [])
  const offsetCount = speakers.filter((speaker) => Number.isFinite(speaker.offsetMs) && speaker.offsetMs !== 0).length

  return {
    groupCount: groups.length,
    enabledCount: groups.filter((group) => group.enabled).length,
    onlineCount: groups.filter((group) => group.state === 'online').length,
    staleCount: groups.filter((group) => group.state === 'stale').length,
    offlineCount: groups.filter((group) => group.state === 'offline').length,
    speakerCount: speakers.length,
    castTargetCount: groups.reduce((sum, group) => sum + (group.castTargets?.length ?? 0), 0),
    delayOffsetCount: offsetCount,
    lowConfidenceCount: groups.filter((group) => group.groupConfidence === 'low').length,
  }
}

export function getMediaGroupStatus(group: MediaGroupConfig) {
  if (!group.enabled) {
    return 'Foundation off'
  }

  if (group.speakers.length === 0 && group.castTargets.length === 0) {
    return 'Mangler medlemmer'
  }

  if (group.state === 'online') {
    return 'Online'
  }

  return group.state === 'unknown' ? 'Foundation' : group.state
}
