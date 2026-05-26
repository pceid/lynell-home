import { networkInterfaces } from 'node:os'

const CAST_DISCOVERY_DEPENDENCY = 'bonjour-service'
const CAST_PLAYBACK_DEPENDENCY = 'castv2-client'
const CAST_SERVICE_TYPE = 'googlecast'
const CAST_DISCOVERY_TIMEOUT_MS = 3500
const CAST_PLAYBACK_TIMEOUT_MS = 12000
const CAST_DEVICE_STALE_AFTER_MS = 10 * 60_000
const CAST_DEVICE_OFFLINE_AFTER_MS = 60 * 60_000
const CAST_PLAYBACK_STALE_AFTER_MS = 90_000
const CAST_DISCOVERY_LOG_LIMIT = 20
const DEFAULT_BRIDGE_PORT = 8787

function readCastConfigFromEnv(env = process.env) {
  return {
    enabled: String(env.LYNELL_CAST_ENABLED ?? 'false').toLowerCase() === 'true',
    discoveryEnabled:
      String(env.LYNELL_CAST_DISCOVERY_ENABLED ?? 'false').toLowerCase() === 'true',
    mediaHost: String(env.LYNELL_CAST_MEDIA_HOST ?? '').trim(),
    mediaPort: Number(env.LYNELL_CAST_MEDIA_PORT ?? DEFAULT_BRIDGE_PORT),
  }
}

function getFirstLanIpv4() {
  const interfaces = networkInterfaces()

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal && entry.address) {
        return entry.address
      }
    }
  }

  return null
}

function nowIso() {
  return new Date().toISOString()
}

function parseTimestamp(value) {
  const timestamp = Date.parse(value ?? '')

  return Number.isFinite(timestamp) ? timestamp : null
}

function normalizeCastService(service) {
  const txt = service?.txt ?? {}
  const name = String(txt.fn ?? service?.name ?? 'Cast device').trim()
  const host = String(service?.host ?? '').trim()
  const addresses = Array.isArray(service?.addresses) ? service.addresses : []
  const ip = String(addresses.find((address) => !String(address).includes(':')) ?? addresses[0] ?? '').trim()
  const model = String(txt.md ?? txt.model_name ?? service?.type ?? 'Cast').trim()
  const idSource = String(txt.id ?? host ?? name).trim().toLowerCase()
  const id = `cast-${Buffer.from(idSource || name).toString('base64url')}`
  const seenAt = nowIso()

  return {
    id,
    name,
    host,
    ip,
    type: model.toLowerCase().includes('tv') || model.toLowerCase().includes('chromecast')
      ? 'tv'
      : 'googleHome',
    model,
    online: true,
    status: 'online',
    state: 'online',
    firstSeen: seenAt,
    lastSeen: seenAt,
    lastSeenAt: seenAt,
    staleAfterMs: CAST_DEVICE_STALE_AFTER_MS,
    offlineAfterMs: CAST_DEVICE_OFFLINE_AFTER_MS,
    discoveryMisses: 0,
  }
}

export function createCastRuntime(options = {}) {
  const config = readCastConfigFromEnv(options.env)
  const devicesById = new Map()
  let lastDiscoveryAt = null
  let error = null
  let discoveryDependencyReady = null
  let playbackDependencyReady = null
  let castClient = null
  let castPlayer = null
  let discoveryPromise = null
  let discoveryCycleCount = 0
  let discoveryStateCounts = { online: 0, stale: 0, offline: 0, unknown: 0 }
  let discoveryStartedAt = null
  let discoveryCompletedAt = null
  let discoveryDurationMs = null
  let discoveryFoundCount = 0
  let discoveryInterfaceUsed = getFirstLanIpv4()
  let mdnsActive = false
  let discoveryReconnectCount = 0
  let discoveryErrors = []
  let discoveryLog = []
  let playbackReconnectCount = 0
  let playbackSessionStartedAt = null
  let playbackLastStatusAt = null
  let discoveryState = config.enabled && config.discoveryEnabled ? 'idle' : 'disabled'
  let playbackState = {
    state: 'idle',
    rawState: 'idle',
    selectedDeviceId: null,
    mediaUrl: null,
    title: null,
    updatedAt: null,
    message: 'Cast playback foundation er klar, men ingen avspilling er startet.',
    deviceName: null,
    actualMediaUrl: null,
    volume: null,
  }

  function appendDiscoveryLog(message, extra = {}) {
    discoveryLog = [
      {
        at: nowIso(),
        message,
        ...extra,
      },
      ...discoveryLog,
    ].slice(0, CAST_DISCOVERY_LOG_LIMIT)
  }

  function rememberDiscoveryError(discoverError) {
    const message = discoverError?.message ?? String(discoverError)
    discoveryErrors = [
      {
        at: nowIso(),
        message,
      },
      ...discoveryErrors,
    ].slice(0, CAST_DISCOVERY_LOG_LIMIT)
  }

  function classifyDevice(device, now = Date.now()) {
    const lastSeenMs = parseTimestamp(device?.lastSeenAt ?? device?.lastSeen)
    const ageMs = lastSeenMs === null ? null : Math.max(0, now - lastSeenMs)
    const staleAfterMs = Number(device?.staleAfterMs ?? CAST_DEVICE_STALE_AFTER_MS)
    const offlineAfterMs = Number(device?.offlineAfterMs ?? CAST_DEVICE_OFFLINE_AFTER_MS)
    const state =
      ageMs === null
        ? 'unknown'
        : ageMs >= offlineAfterMs
          ? 'offline'
          : ageMs >= staleAfterMs
            ? 'stale'
            : 'online'

    return {
      ...device,
      online: state === 'online',
      status: state,
      state,
      ageMs,
      stale: state === 'stale',
      offline: state === 'offline',
      staleAfterMs,
      offlineAfterMs,
      lastSeenAt: device?.lastSeenAt ?? device?.lastSeen ?? null,
    }
  }

  function getClassifiedDevices() {
    const rank = { online: 0, stale: 1, unknown: 2, offline: 3 }

    return Array.from(devicesById.values())
      .map((device) => classifyDevice(device))
      .sort((left, right) => {
        const stateDiff = (rank[left.state] ?? 9) - (rank[right.state] ?? 9)

        if (stateDiff !== 0) {
          return stateDiff
        }

        return String(left.name).localeCompare(String(right.name), 'nb')
      })
  }

  function countDeviceStates(devices = getClassifiedDevices()) {
    return devices.reduce(
      (counts, device) => ({
        ...counts,
        [device.state]: (counts[device.state] ?? 0) + 1,
      }),
      { online: 0, stale: 0, offline: 0, unknown: 0 },
    )
  }

  function upsertDiscoveredDevice(service) {
    const discovered = normalizeCastService(service)
    const existing = devicesById.get(discovered.id)
    const nextDevice = {
      ...existing,
      ...discovered,
      firstSeen: existing?.firstSeen ?? discovered.firstSeen,
      lastSeen: discovered.lastSeen,
      lastSeenAt: discovered.lastSeenAt,
      lastDiscoverySeenAt: discoveryStartedAt ?? discovered.lastSeenAt,
      discoveryMisses: 0,
      addresses: Array.isArray(service?.addresses) ? service.addresses : existing?.addresses ?? [],
    }

    devicesById.set(discovered.id, nextDevice)

    return nextDevice
  }

  function getTrustedPlaybackState() {
    const rawState = playbackState.state ?? 'idle'
    const updatedMs = parseTimestamp(playbackState.updatedAt)
    const sessionStartedMs = parseTimestamp(playbackSessionStartedAt)
    const lastStatusMs = parseTimestamp(playbackLastStatusAt ?? playbackState.updatedAt)
    const now = Date.now()
    const updatedAgeMs = updatedMs === null ? null : Math.max(0, now - updatedMs)
    const sessionAgeMs = sessionStartedMs === null ? null : Math.max(0, now - sessionStartedMs)
    const statusAgeMs = lastStatusMs === null ? null : Math.max(0, now - lastStatusMs)
    const selectedDevice = playbackState.selectedDeviceId
      ? classifyDevice(devicesById.get(playbackState.selectedDeviceId))
      : null
    const playbackCanGoStale = ['playing', 'paused', 'buffering', 'connecting'].includes(rawState)
    const stale = Boolean(
      playbackCanGoStale &&
        (statusAgeMs === null ||
          statusAgeMs > CAST_PLAYBACK_STALE_AFTER_MS ||
          selectedDevice?.state === 'stale' ||
          selectedDevice?.state === 'offline' ||
          selectedDevice?.state === 'unknown'),
    )
    const dependencyMissing = playbackDependencyReady === false
    const state =
      dependencyMissing
        ? 'unavailable'
        : stale
          ? 'disconnected'
          : rawState
    const playbackConfidence =
      dependencyMissing || state === 'blocked' || state === 'error' || state === 'unavailable'
        ? 'low'
        : stale
          ? 'low'
          : state === 'playing'
            ? 'high'
            : ['paused', 'stopped', 'idle'].includes(state)
              ? 'medium'
              : 'low'
    const sourceFreshness =
      statusAgeMs === null
        ? 'unknown'
        : statusAgeMs <= 15_000
          ? 'fresh'
          : statusAgeMs <= CAST_PLAYBACK_STALE_AFTER_MS
            ? 'aging'
            : 'stale'
    const message =
      state === 'disconnected'
        ? `Cast playback-statusen er gammel eller enheten er ikke fersk. Sist kjente state var ${rawState}.`
        : playbackState.message

    return {
      state,
      rawState,
      playbackConfidence,
      sourceFreshness,
      stale,
      updatedAgeMs,
      sessionAgeMs,
      statusAgeMs,
      selectedDeviceState: selectedDevice?.state ?? null,
      selectedDeviceLastSeenAt: selectedDevice?.lastSeenAt ?? null,
      message,
    }
  }

  async function loadPlaybackDependency() {
    try {
      const module = await import(CAST_PLAYBACK_DEPENDENCY)
      playbackDependencyReady = true
      return module
    } catch {
      playbackDependencyReady = false
      return null
    }
  }

  function getPlayback() {
    const trustedPlayback = getTrustedPlaybackState()

    return {
      ok: true,
      enabled: config.enabled,
      dependency: CAST_PLAYBACK_DEPENDENCY,
      dependencyReady: playbackDependencyReady,
      lanReachabilityNote: 'Cast-enhet må nå Lynell server på LAN-IP, ikke localhost.',
      ...playbackState,
      ...trustedPlayback,
      reconnectCount: playbackReconnectCount,
      sessionStartedAt: playbackSessionStartedAt,
      lastStatusAt: playbackLastStatusAt,
    }
  }

  function getStatus() {
    const devices = getClassifiedDevices()
    const networkInterfaceUsed = getFirstLanIpv4()
    const stateCounts = countDeviceStates(devices)
    discoveryStateCounts = stateCounts

    return {
      ok: true,
      enabled: config.enabled,
      discoveryEnabled: config.discoveryEnabled,
      state: discoveryState,
      devices,
      lastDiscoveryAt,
      error,
      dependency: CAST_DISCOVERY_DEPENDENCY,
      dependencyReady: discoveryDependencyReady,
      diagnostics: {
        discoveryActive: config.enabled && config.discoveryEnabled && discoveryState === 'discovering',
        mdnsActive,
        lastDiscoveryAt,
        lastDiscoveryStartedAt: discoveryStartedAt,
        lastDiscoveryCompletedAt: discoveryCompletedAt,
        lastDiscoveryDurationMs: discoveryDurationMs,
        discoveryCycleCount,
        discoveryFoundCount,
        networkInterfaceUsed,
        discoveryInterfaceUsed,
        deviceCount: devices.length,
        onlineCount: stateCounts.online,
        staleCount: stateCounts.stale,
        offlineCount: stateCounts.offline,
        unknownCount: stateCounts.unknown,
        staleAfterMs: CAST_DEVICE_STALE_AFTER_MS,
        offlineAfterMs: CAST_DEVICE_OFFLINE_AFTER_MS,
        reconnectCount: discoveryReconnectCount,
        discoveryErrors,
        rawDiscoveryLog: discoveryLog,
        deviceAges: devices.map((device) => ({
          id: device.id,
          name: device.name,
          state: device.state,
          ageMs: device.ageMs,
          lastSeenAt: device.lastSeenAt,
        })),
        playbackSessionAgeMs: getTrustedPlaybackState().sessionAgeMs,
        playbackConfidence: getTrustedPlaybackState().playbackConfidence,
        note:
          config.enabled && config.discoveryEnabled && lastDiscoveryAt && devices.length === 0
            ? 'Ingen Cast-enheter funnet akkurat nå. Discovery er aktiv; sjekk samme nettverk, mDNS og Windows firewall.'
            : stateCounts.online === 0 && devices.length > 0
              ? 'Cast-enheter er husket, men ingen er ferskt online akkurat nå.'
            : null,
      },
      playback: getPlayback(),
    }
  }

  function normalizeMediaUrl(mediaUrl) {
    if (!config.enabled) {
      return { error: 'Cast disabled', mediaUrl: null }
    }

    if (!mediaUrl) {
      return { error: 'Ingen lokal media-URL er valgt.', mediaUrl: null }
    }

    let url

    try {
      url = new URL(mediaUrl, `http://localhost:${config.mediaPort}`)
    } catch {
      return { error: 'Media-URL er ikke gyldig.', mediaUrl: null }
    }

    if (!url.pathname.startsWith('/media/music/') || !url.pathname.toLowerCase().endsWith('.mp3')) {
      return { error: 'Cast-testen støtter bare lokale MP3-filer fra /media/music.', mediaUrl: null }
    }

    const hostIsLocal = ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
    const lanHost = config.mediaHost || getFirstLanIpv4()

    if (hostIsLocal || !url.hostname) {
      if (!lanHost) {
        return { error: 'Cast trenger LAN-IP for å nå lydfilen.', mediaUrl: null }
      }

      url.hostname = lanHost
      url.port = String(config.mediaPort || DEFAULT_BRIDGE_PORT)
      url.protocol = 'http:'
    }

    return { error: null, mediaUrl: url.toString() }
  }

  function getPlaybackReadiness(payload = {}) {
    const selectedDeviceId = String(payload.deviceId ?? playbackState.selectedDeviceId ?? '').trim()

    if (!selectedDeviceId || !devicesById.has(selectedDeviceId)) {
      return 'Ingen Cast-enhet er valgt eller oppdaget ennå.'
    }

    const device = classifyDevice(devicesById.get(selectedDeviceId))

    if (device.state !== 'online') {
      return `Valgt Cast-enhet er ${device.state}. Kjør discovery på nytt eller sjekk at den er på samme nettverk.`
    }

    return null
  }

  function normalizePlaybackPayload(payload = {}) {
    const mediaUrl = String(payload.mediaUrl ?? '').trim()
    const selectedDeviceId = String(payload.deviceId ?? playbackState.selectedDeviceId ?? '').trim()
    const title = String(payload.title ?? '').trim() || null
    const localhostWarning =
      mediaUrl.includes('localhost') || mediaUrl.includes('127.0.0.1')
        ? ' Cast-enhet må nå Lynell via LAN-IP, ikke localhost.'
        : ''

    return {
      mediaUrl,
      selectedDeviceId,
      title,
      localhostWarning,
    }
  }

  function closeCastSession() {
    try {
      castPlayer = null
      castClient?.close?.()
    } catch {
      // Keep bridge stable if the Cast socket is already gone.
    } finally {
      castClient = null
      playbackLastStatusAt = nowIso()
    }
  }

  function withTimeout(promise, message) {
    let timeoutId
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), CAST_PLAYBACK_TIMEOUT_MS)
    })

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
  }

  async function connectAndLoad(device, mediaUrl, title) {
    const castModule = await loadPlaybackDependency()

    if (!castModule) {
      throw new Error('Cast playback dependency mangler. Installer castv2-client før ekte playback-test.')
    }

    const Client = castModule.Client ?? castModule.default?.Client
    const DefaultMediaReceiver =
      castModule.DefaultMediaReceiver ?? castModule.default?.DefaultMediaReceiver

    if (typeof Client !== 'function' || !DefaultMediaReceiver) {
      playbackDependencyReady = false
      throw new Error('Cast playback dependency ble funnet, men API-et kunne ikke initialiseres.')
    }

    const host = device.ip || device.host

    if (!host) {
      throw new Error('Valgt Cast-enhet mangler host/IP.')
    }

    closeCastSession()
    playbackReconnectCount += 1
    playbackSessionStartedAt = nowIso()
    playbackLastStatusAt = playbackSessionStartedAt

    const client = new Client()
    castClient = client

    client.on('error', (clientError) => {
      playbackState = {
        ...playbackState,
        state: 'error',
        rawState: 'error',
        updatedAt: new Date().toISOString(),
        message: `Cast playback feilet: ${clientError?.message ?? String(clientError)}`,
      }
      closeCastSession()
    })

    await withTimeout(
      new Promise((resolve, reject) => {
        client.connect(host, () => resolve(null))
        client.once('error', reject)
      }),
      'Tidsavbrudd ved tilkobling til Cast-enhet.',
    )

    const player = await withTimeout(
      new Promise((resolve, reject) => {
        client.launch(DefaultMediaReceiver, (launchError, launchedPlayer) => {
          if (launchError) {
            reject(launchError)
            return
          }
          resolve(launchedPlayer)
        })
      }),
      'Tidsavbrudd ved start av Cast media receiver.',
    )

    castPlayer = player

    player.on?.('status', (status) => {
      const castPlayerState = String(status?.playerState ?? '').toUpperCase()
      const nextState =
        castPlayerState === 'PLAYING'
          ? 'playing'
          : castPlayerState === 'PAUSED'
            ? 'paused'
            : castPlayerState === 'BUFFERING'
              ? 'buffering'
              : castPlayerState === 'IDLE'
                ? 'idle'
                : playbackState.state
      playbackLastStatusAt = nowIso()
      playbackState = {
        ...playbackState,
        state: nextState,
        rawState: nextState,
        updatedAt: playbackLastStatusAt,
        message:
          nextState === 'playing'
            ? `Cast rapporterer avspilling på ${device.name}.`
            : nextState === 'paused'
              ? `Cast rapporterer pause på ${device.name}.`
              : playbackState.message,
      }
    })

    const media = {
      contentId: mediaUrl,
      contentType: 'audio/mpeg',
      streamType: 'BUFFERED',
      metadata: {
        type: 0,
        metadataType: 0,
        title: title ?? 'Lynell lokal MP3',
      },
    }

    await withTimeout(
      new Promise((resolve, reject) => {
        player.load(media, { autoplay: true }, (loadError, status) => {
          if (loadError) {
            reject(loadError)
            return
          }
          resolve(status)
        })
      }),
      'Tidsavbrudd ved lasting av media på Cast-enhet.',
    )
  }

  async function play(payload = {}) {
    const normalized = normalizePlaybackPayload(payload)
    const readinessError = getPlaybackReadiness(payload)
    const normalizedMedia = normalizeMediaUrl(normalized.mediaUrl)
    const device = devicesById.get(normalized.selectedDeviceId)
    const blockingError = readinessError || normalizedMedia.error

    if (blockingError) {
      playbackState = {
        state: 'blocked',
        rawState: 'blocked',
        selectedDeviceId: normalized.selectedDeviceId || null,
        mediaUrl: normalized.mediaUrl || null,
        title: normalized.title,
        updatedAt: new Date().toISOString(),
        message: `${blockingError}${normalized.localhostWarning}`,
        deviceName: device?.name ?? null,
        actualMediaUrl: normalizedMedia.mediaUrl,
      }
      return getPlayback()
    }

    playbackState = {
      state: 'connecting',
      rawState: 'connecting',
      selectedDeviceId: normalized.selectedDeviceId,
      mediaUrl: normalized.mediaUrl,
      title: normalized.title,
      updatedAt: new Date().toISOString(),
      message: `Kobler til ${device.name} for Cast playback-test.`,
      deviceName: device.name,
      actualMediaUrl: normalizedMedia.mediaUrl,
    }

    try {
      await connectAndLoad(device, normalizedMedia.mediaUrl, normalized.title)
      playbackState = {
        ...playbackState,
        state: 'playing',
        rawState: 'playing',
        updatedAt: new Date().toISOString(),
        message: `Musikken spiller på ${device.name} i Cast testmodus.`,
      }
      return getPlayback()
    } catch (playbackError) {
      closeCastSession()
      playbackState = {
        ...playbackState,
        state: 'error',
        rawState: 'error',
        updatedAt: new Date().toISOString(),
        message: `Cast playback feilet: ${playbackError?.message ?? String(playbackError)}`,
      }
      return getPlayback()
    }
  }

  async function pause() {
    if (!config.enabled) {
      playbackState = {
        ...playbackState,
        state: 'blocked',
        rawState: 'blocked',
        updatedAt: new Date().toISOString(),
        message: 'Cast disabled',
      }
      return getPlayback()
    }

    if (castPlayer && playbackState.state === 'playing') {
      try {
        await withTimeout(
          new Promise((resolve, reject) => {
            castPlayer.pause((pauseError, status) => {
              if (pauseError) {
                reject(pauseError)
                return
              }
              resolve(status)
            })
          }),
          'Tidsavbrudd ved pause av Cast playback.',
        )
        playbackState = {
          ...playbackState,
          state: 'paused',
          rawState: 'paused',
          updatedAt: new Date().toISOString(),
          message: `Cast playback er pauset på ${playbackState.deviceName ?? 'valgt enhet'}.`,
        }
        return getPlayback()
      } catch (pauseError) {
        playbackState = {
          ...playbackState,
          state: 'error',
          rawState: 'error',
          updatedAt: new Date().toISOString(),
          message: `Cast pause feilet: ${pauseError?.message ?? String(pauseError)}`,
        }
        return getPlayback()
      }
    }

    playbackState = {
      ...playbackState,
      state: playbackState.mediaUrl ? 'paused' : 'idle',
      rawState: playbackState.mediaUrl ? 'paused' : 'idle',
      updatedAt: new Date().toISOString(),
      message: playbackState.mediaUrl
        ? 'Pause registrert, men ingen aktiv Cast session var tilgjengelig.'
        : 'Ingen Cast playback er aktiv.',
    }
    return getPlayback()
  }

  async function stop() {
    if (castPlayer) {
      try {
        await withTimeout(
          new Promise((resolve, reject) => {
            castPlayer.stop((stopError, status) => {
              if (stopError) {
                reject(stopError)
                return
              }
              resolve(status)
            })
          }),
          'Tidsavbrudd ved stopp av Cast playback.',
        )
      } catch {
        // Still close the local session; playback state below will stay honest.
      }
    }

    closeCastSession()

    playbackState = {
      state: 'stopped',
      rawState: 'stopped',
      selectedDeviceId: playbackState.selectedDeviceId,
      mediaUrl: null,
      title: null,
      updatedAt: new Date().toISOString(),
      message: config.enabled
        ? 'Cast playback er stoppet i testmodus.'
        : 'Cast disabled',
      deviceName: playbackState.deviceName,
      actualMediaUrl: null,
    }
    return getPlayback()
  }

  async function setVolume(payload = {}) {
    const volume = Math.max(0, Math.min(100, Number(payload.volume ?? playbackState.volume ?? 35)))
    const level = volume / 100

    if (!config.enabled) {
      playbackState = {
        ...playbackState,
        state: 'blocked',
        rawState: 'blocked',
        volume,
        updatedAt: new Date().toISOString(),
        message: 'Cast disabled',
      }
      return getPlayback()
    }

    if (!castClient) {
      playbackState = {
        ...playbackState,
        volume,
        updatedAt: new Date().toISOString(),
        message: 'Cast volum er lagret for valgt output, men ingen aktiv Cast session er tilgjengelig ennå.',
      }
      return getPlayback()
    }

    try {
      await withTimeout(
        new Promise((resolve, reject) => {
          castClient.setVolume({ level, muted: false }, (volumeError, status) => {
            if (volumeError) {
              reject(volumeError)
              return
            }
            resolve(status)
          })
        }),
        'Tidsavbrudd ved volumendring på Cast-enhet.',
      )
      playbackState = {
        ...playbackState,
        volume,
        updatedAt: new Date().toISOString(),
        message: `Cast volum er satt til ${volume}% på ${playbackState.deviceName ?? 'valgt enhet'}.`,
      }
      return getPlayback()
    } catch (volumeError) {
      playbackState = {
        ...playbackState,
        state: 'error',
        rawState: 'error',
        volume,
        updatedAt: new Date().toISOString(),
        message: `Cast volum feilet: ${volumeError?.message ?? String(volumeError)}`,
      }
      return getPlayback()
    }
  }

  async function discover() {
    if (!config.enabled || !config.discoveryEnabled) {
      discoveryState = 'disabled'
      error = 'Cast disabled'
      return getStatus()
    }

    if (discoveryPromise) {
      return discoveryPromise
    }

    discoveryPromise = runDiscovery().finally(() => {
      discoveryPromise = null
    })

    return discoveryPromise
  }

  async function runDiscovery() {
    const stateCountsBefore = countDeviceStates()
    const foundIds = new Set()
    const startedMs = Date.now()
    discoveryCycleCount += 1
    discoveryStartedAt = nowIso()
    discoveryCompletedAt = null
    discoveryDurationMs = null
    discoveryFoundCount = 0
    discoveryInterfaceUsed = getFirstLanIpv4()
    appendDiscoveryLog('Discovery startet', {
      cycle: discoveryCycleCount,
      networkInterfaceUsed: discoveryInterfaceUsed,
    })

    let bonjourModule

    try {
      bonjourModule = await import(CAST_DISCOVERY_DEPENDENCY)
      discoveryDependencyReady = true
    } catch {
      discoveryDependencyReady = false
      discoveryState = 'fallback'
      error = 'Cast discovery dependency mangler. Installer bonjour-service før live discovery testes.'
      rememberDiscoveryError(new Error(error))
      appendDiscoveryLog('Discovery dependency mangler', { dependency: CAST_DISCOVERY_DEPENDENCY })
      return getStatus()
    }

    const Bonjour = bonjourModule.Bonjour ?? bonjourModule.default?.Bonjour ?? bonjourModule.default

    if (typeof Bonjour !== 'function') {
      discoveryDependencyReady = false
      discoveryState = 'fallback'
      error = 'Cast discovery dependency ble funnet, men API-et kunne ikke initialiseres.'
      rememberDiscoveryError(new Error(error))
      appendDiscoveryLog('Discovery dependency API kunne ikke initialiseres')
      return getStatus()
    }

    discoveryState = 'discovering'
    mdnsActive = true
    error = null
    lastDiscoveryAt = discoveryStartedAt

    const bonjour = new Bonjour()
    let browser = null

    try {
      browser = bonjour.find({ type: CAST_SERVICE_TYPE }, (service) => {
        const device = upsertDiscoveredDevice(service)
        foundIds.add(device.id)
        appendDiscoveryLog('Cast-enhet sett', {
          id: device.id,
          name: device.name,
          ip: device.ip,
          host: device.host,
        })
      })

      await new Promise((resolve) => setTimeout(resolve, CAST_DISCOVERY_TIMEOUT_MS))
      for (const [deviceId, device] of devicesById.entries()) {
        if (!foundIds.has(deviceId)) {
          devicesById.set(deviceId, {
            ...device,
            discoveryMisses: Number(device.discoveryMisses ?? 0) + 1,
          })
        }
      }
      discoveryCompletedAt = nowIso()
      discoveryDurationMs = Math.max(0, Date.now() - startedMs)
      discoveryFoundCount = foundIds.size
      discoveryState = 'idle'
      const stateCountsAfter = countDeviceStates()
      if (stateCountsBefore.online === 0 && stateCountsAfter.online > 0) {
        discoveryReconnectCount += 1
      }
      appendDiscoveryLog('Discovery fullført', {
        cycle: discoveryCycleCount,
        durationMs: discoveryDurationMs,
        foundCount: foundIds.size,
        onlineCount: stateCountsAfter.online,
        staleCount: stateCountsAfter.stale,
        offlineCount: stateCountsAfter.offline,
      })
      return getStatus()
    } catch (discoverError) {
      discoveryState = 'fallback'
      error = discoverError?.message ?? String(discoverError)
      discoveryCompletedAt = nowIso()
      discoveryDurationMs = Math.max(0, Date.now() - startedMs)
      rememberDiscoveryError(discoverError)
      appendDiscoveryLog('Discovery feilet', { error })
      return getStatus()
    } finally {
      mdnsActive = false
      try {
        browser?.stop?.()
        bonjour.destroy?.()
      } catch {
        // Ignore cleanup errors; discovery must never stop the bridge.
      }
    }
  }

  return {
    discover,
    getPlayback,
    getStatus,
    pause,
    play,
    setVolume,
    stop,
  }
}
