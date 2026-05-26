import { createProviderStateStore } from './provider-state-store.mjs'
import { execFile } from 'node:child_process'
import dgram from 'node:dgram'
import { promises as dns } from 'node:dns'
import { Socket } from 'node:net'

const PROVIDER_CATEGORIES = {
  assistant: 'assistant',
  media: 'media',
  camera: 'camera',
  edge: 'edge',
  climate: 'climate',
  network: 'network',
  utility: 'utility',
}
const DEFAULT_ORCHESTRATION_CADENCE_MS = 60_000
const PROVIDER_POLLING_CADENCE_MS = {
  dreameCloud: 2 * 60_000,
  homeAssistantBridge: 2 * 60_000,
  cast: 90_000,
  mqtt: 60_000,
  cameraNvr: 5 * 60_000,
  sonos: 5 * 60_000,
  deco: 5 * 60_000,
  mill: 5 * 60_000,
  namron: 5 * 60_000,
  deltacoTuya: 5 * 60_000,
  energyMeter: 5 * 60_000,
}
const PROVIDER_STALE_MULTIPLIER = 3
const PROVIDER_RECOVERY_POLICIES = {
  dreameCloud: {
    strategy: 'conservative-cloud',
    maxAttempts: 3,
    baseBackoffMs: 5 * 60_000,
    maxBackoffMs: 30 * 60_000,
    cooldownMs: 20 * 60_000,
    degradedToleranceMs: 10 * 60_000,
  },
  homeAssistantBridge: {
    strategy: 'conservative-bridge',
    maxAttempts: 3,
    baseBackoffMs: 5 * 60_000,
    maxBackoffMs: 30 * 60_000,
    cooldownMs: 20 * 60_000,
    degradedToleranceMs: 10 * 60_000,
  },
  cast: {
    strategy: 'medium-local-discovery',
    maxAttempts: 4,
    baseBackoffMs: 2 * 60_000,
    maxBackoffMs: 12 * 60_000,
    cooldownMs: 10 * 60_000,
    degradedToleranceMs: 6 * 60_000,
  },
  mqtt: {
    strategy: 'local-transport',
    maxAttempts: 5,
    baseBackoffMs: 60_000,
    maxBackoffMs: 8 * 60_000,
    cooldownMs: 6 * 60_000,
    degradedToleranceMs: 4 * 60_000,
  },
  cameraNvr: {
    strategy: 'foundation-camera-recorder',
    maxAttempts: 1,
    baseBackoffMs: 5 * 60_000,
    maxBackoffMs: 5 * 60_000,
    cooldownMs: 15 * 60_000,
    degradedToleranceMs: 10 * 60_000,
  },
  deltacoTuya: {
    strategy: 'foundation-reachability',
    maxAttempts: 2,
    baseBackoffMs: 5 * 60_000,
    maxBackoffMs: 10 * 60_000,
    cooldownMs: 20 * 60_000,
    degradedToleranceMs: 10 * 60_000,
  },
  default: {
    strategy: 'foundation-observe-only',
    maxAttempts: 1,
    baseBackoffMs: 5 * 60_000,
    maxBackoffMs: 5 * 60_000,
    cooldownMs: 15 * 60_000,
    degradedToleranceMs: 10 * 60_000,
  },
}
const DELTACO_TUYA_TCP_PORTS = [6668, 6669]
const DELTACO_TUYA_DEEP_TCP_PORTS = [6668, 6667, 6669, 80, 443, 8883]
const DELTACO_TUYA_PROTOCOL_PORTS = [6668, 6667, 6669, 8883, 80, 443]
const DELTACO_TUYA_PROTOCOL_OBSERVATION_CADENCE_MS = 10 * 60_000
const MAC_VENDOR_HINTS = {
  '10:d5:61': 'Tuya/Smart Life vendor range',
  '38:1f:8d': 'Tuya/Smart Life vendor range',
  '50:02:91': 'Tuya/Smart Life vendor range',
  '68:57:2d': 'Tuya/Smart Life vendor range',
  '84:e3:42': 'Tuya/Smart Life vendor range',
  'a4:cf:12': 'Tuya/Smart Life vendor range',
  'bc:dd:c2': 'Tuya/Smart Life vendor range',
  'd4:a6:51': 'Tuya/Smart Life vendor range',
  'dc:4f:22': 'Tuya/Smart Life vendor range',
}
const DELTACO_TUYA_DEVICE_CANDIDATES = [
  {
    id: 'deltaco-lampe-1',
    name: 'Lampe 1',
    ip: '192.168.86.22',
    mac: null,
    room: 'Stue',
    type: 'smartPlug',
    role: 'lampPlug',
    physicalOrder: 1,
    control: 'onOffOnly',
  },
  {
    id: 'deltaco-lampe-2',
    name: 'Lampe 2',
    ip: '192.168.86.23',
    mac: null,
    observedHostname: 'google-home.lan',
    knownDeviceFamily: 'Google Home / Cast',
    room: 'Stue',
    type: 'smartPlug',
    role: 'lampPlug',
    physicalOrder: 2,
    control: 'onOffOnly',
  },
  {
    id: 'deltaco-lampe-3',
    name: 'Lampe 3',
    ip: '192.168.86.25',
    mac: null,
    room: 'Stue',
    type: 'smartPlug',
    role: 'lampPlug',
    physicalOrder: 3,
    control: 'onOffOnly',
  },
  {
    id: 'deltaco-lampe-4',
    name: 'Lampe 4',
    ip: '192.168.86.26',
    mac: null,
    observedHostname: 'google-nest-mini.lan',
    knownDeviceFamily: 'Google Nest',
    room: 'Stue',
    type: 'smartPlug',
    role: 'lampPlug',
    physicalOrder: 4,
    control: 'onOffOnly',
  },
  {
    id: 'deltaco-lampe-5',
    name: 'Lampe 5',
    ip: '192.168.86.29',
    mac: null,
    room: 'Stue',
    type: 'smartPlug',
    role: 'lampPlug',
    physicalOrder: 5,
    control: 'onOffOnly',
  },
  {
    id: 'deltaco-extra-candidate',
    name: 'Ekstra LAN-kandidat',
    ip: '192.168.86.33',
    mac: null,
    room: 'Stue',
    type: 'smartPlug',
    role: 'unassignedCandidate',
    physicalOrder: null,
    control: 'onOffOnly',
  },
]

function nowIso() {
  return new Date().toISOString()
}

function createCredentialState({
  authRequired = false,
  configured = false,
  required = [],
  missing = [],
  source = 'env',
} = {}) {
  return {
    authRequired,
    configured: Boolean(configured),
    source,
    required,
    missing,
    secretsReturned: false,
    note: authRequired
      ? 'Credentials eies av bridge/env. Frontend får kun configured/missing-status.'
      : 'Ingen credentials kreves for denne provider-statusen.',
  }
}

function hasText(value) {
  return String(value ?? '').trim().length > 0
}

function createOnboardingState({
  provider,
  configured,
  connected,
  capabilities = [],
  missingRequirements = [],
  validationErrors = [],
  runtimeReady = false,
  recommendedNextStep = 'Fullfør provider-konfigurasjon.',
  steps = [],
} = {}) {
  const validated = validationErrors.length === 0 && missingRequirements.length === 0
  const onboardingStatus = connected
    ? 'connected'
    : runtimeReady
      ? 'runtimeReady'
      : validated && configured
        ? 'validated'
        : configured
          ? 'configured'
          : 'missingRequirements'

  return {
    provider,
    onboardingStatus,
    configured: Boolean(configured),
    validated,
    connected: Boolean(connected),
    runtimeReady: Boolean(runtimeReady),
    missingRequirements,
    validationErrors,
    capabilities,
    recommendedNextStep,
    steps,
  }
}

function createLifecycleState({
  status,
  connectionState,
  runtimeHealth,
  configured,
  authRequired,
  onboarding = null,
  sessionLifecycle = null,
  runtimeError = null,
  defaultEnabled = true,
  activationAllowed = true,
  requiresConfig = false,
  requiresValidation = false,
  recommendedAction = null,
  healthReason = null,
} = {}) {
  const enabled = sessionLifecycle?.enabled ?? defaultEnabled
  const configuredOk = !requiresConfig || Boolean(configured)
  const validationOk = !requiresValidation || Boolean(onboarding?.validated)
  const canActivate = Boolean(enabled && activationAllowed && configuredOk && validationOk)
  const now = nowIso()
  let lifecycleState = 'ready'
  let resolvedHealthReason = healthReason

  if (!enabled) {
    lifecycleState = 'disabled'
    resolvedHealthReason = resolvedHealthReason ?? 'Provider er deaktivert i lifecycle foundation.'
  } else if (runtimeError) {
    lifecycleState = 'failed'
    resolvedHealthReason = resolvedHealthReason ?? 'Runtime rapporterer feil eller validering feilet.'
  } else if (connectionState === 'connected') {
    lifecycleState = 'active'
    resolvedHealthReason = resolvedHealthReason ?? 'Runtime rapporterer aktiv/connected status.'
  } else if (sessionLifecycle?.activationRequestedAt && canActivate) {
    lifecycleState = 'activating'
    resolvedHealthReason = resolvedHealthReason ?? 'Aktivering er markert i lifecycle foundation. Runtime startes ikke automatisk.'
  } else if (status === 'disabled' || connectionState === 'disabled') {
    lifecycleState = 'offline'
    resolvedHealthReason = resolvedHealthReason ?? 'Provider er enabled i lifecycle, men runtime/env er ikke aktiv.'
  } else if (connectionState === 'degraded' || runtimeHealth === 'degraded') {
    lifecycleState = 'degraded'
    resolvedHealthReason = resolvedHealthReason ?? 'Provider er tilgjengelig, men ikke helt stabil.'
  } else if (!configuredOk || !validationOk) {
    lifecycleState = 'offline'
    resolvedHealthReason = resolvedHealthReason ?? 'Provider mangler config eller validering før aktivering.'
  } else {
    lifecycleState = 'ready'
    resolvedHealthReason = resolvedHealthReason ?? 'Provider er klar for kontrollert aktivering når runtime er konfigurert.'
  }

  return {
    lifecycleState,
    enabled: Boolean(enabled),
    activationAllowed: Boolean(activationAllowed),
    lastLifecycleChangeAt: sessionLifecycle?.lastLifecycleChangeAt ?? null,
    lastHealthCheckAt: now,
    healthReason: resolvedHealthReason,
    recommendedAction:
      recommendedAction ??
      (lifecycleState === 'active'
        ? 'Følg runtime-status. Ingen handling kreves.'
        : lifecycleState === 'disabled'
          ? 'Aktiver provider når du vil teste videre.'
          : canActivate
            ? 'Provider kan aktiveres kontrollert uten fysisk handling.'
            : 'Fullfør manglende config/readiness før aktivering.'),
    canActivate,
    canDeactivate: Boolean(enabled),
    requiresConfig: Boolean(requiresConfig),
    requiresValidation: Boolean(requiresValidation),
    runtimeMutated: false,
    persisted: false,
    safeMode: 'lifecycle-foundation',
  }
}

function parseTimestamp(value) {
  const timestamp = Date.parse(value ?? '')
  return Number.isFinite(timestamp) ? timestamp : null
}

function futureIso(ms) {
  return new Date(Date.now() + Math.max(0, Number(ms ?? 0))).toISOString()
}

function getRecoveryPolicy(provider, pollingCadence) {
  const policy = PROVIDER_RECOVERY_POLICIES[provider] ?? PROVIDER_RECOVERY_POLICIES.default

  return {
    strategy: policy.strategy,
    maxAttempts: policy.maxAttempts,
    baseBackoffMs: policy.baseBackoffMs,
    maxBackoffMs: policy.maxBackoffMs,
    cooldownMs: policy.cooldownMs,
    degradedToleranceMs: policy.degradedToleranceMs,
    staleTimeoutMs: pollingCadence * PROVIDER_STALE_MULTIPLIER,
    hardwareAction: false,
    runtimeRestart: false,
    reconnectsHardware: false,
  }
}

function createRecoveryMetadata({
  provider,
  lifecycleState,
  connectionState,
  stale,
  reconnectRecommended,
  recovered,
  error,
  previous = null,
  pollingCadence,
  orchestrationRun = false,
} = {}) {
  const now = Date.now()
  const recoveryPolicy = getRecoveryPolicy(provider, pollingCadence)
  const previousAttempts = Number(previous?.recoveryAttempts ?? previous?.reconnectAttempts ?? 0)
  const previousNextAttemptAt = previous?.nextRecoveryAttemptAt ?? null
  const previousCooldownUntil = previous?.recoveryCooldownUntil ?? null
  const nextAttemptMs = parseTimestamp(previousNextAttemptAt)
  const cooldownMs = parseTimestamp(previousCooldownUntil)
  const cooldownActive = cooldownMs !== null && cooldownMs > now
  const nextAttemptDue = nextAttemptMs === null || nextAttemptMs <= now
  const disabled = lifecycleState === 'disabled'
  const failed = lifecycleState === 'failed'
  const maxAttemptsReached = previousAttempts >= recoveryPolicy.maxAttempts
  const recoveryWanted = Boolean(reconnectRecommended || stale || lifecycleState === 'degraded' || lifecycleState === 'offline')
  let recoveryAttempts = previousAttempts
  let recoveryBackoffMs = previous?.recoveryBackoffMs ?? recoveryPolicy.baseBackoffMs
  let nextRecoveryAttemptAt = previousNextAttemptAt
  let recoveryCooldownUntil = previousCooldownUntil
  let recoveredAt = previous?.recoveredAt ?? null
  let recoveryBlocked = false
  let recoveryEligible = false
  let recoveryReason = 'Provider er stabil. Ingen recovery trengs.'
  let recoveryState = 'stable'

  if (recovered || (connectionState === 'connected' && previous?.recoveryState === 'reconnecting' && !stale && !error)) {
    recoveryAttempts = 0
    recoveryBackoffMs = recoveryPolicy.baseBackoffMs
    nextRecoveryAttemptAt = null
    recoveryCooldownUntil = null
    recoveredAt = nowIso()
    recoveryState = 'recovered'
    recoveryReason = 'Provider rapporterer fersk runtime etter recovery-vindu.'
  } else if (connectionState === 'connected' && !stale && !error) {
    recoveryAttempts = 0
    recoveryBackoffMs = recoveryPolicy.baseBackoffMs
    nextRecoveryAttemptAt = null
    recoveryCooldownUntil = null
    recoveryState = previous?.recoveryState === 'recovered' ? 'stable' : 'stable'
    recoveryReason = 'Provider rapporterer fersk runtime.'
  } else if (disabled) {
    recoveryBlocked = true
    recoveryState = 'stable'
    recoveryReason = 'Provider er disabled. Recovery er blokkert til den aktiveres.'
  } else if (failed) {
    recoveryBlocked = true
    recoveryState = 'degraded'
    recoveryReason = 'Provider er failed. Recovery krever ny validering før retry.'
  } else if (cooldownActive) {
    recoveryBlocked = true
    recoveryState = stale ? 'stale' : 'degraded'
    recoveryReason = 'Recovery er i cooldown etter tidligere forsøk.'
  } else if (maxAttemptsReached && recoveryWanted) {
    recoveryBlocked = true
    recoveryState = stale ? 'stale' : 'degraded'
    recoveryCooldownUntil = futureIso(recoveryPolicy.cooldownMs)
    recoveryReason = 'Maks recovery-forsøk er nådd. Provider holdes i cooldown.'
  } else if (recoveryWanted) {
    recoveryEligible = nextAttemptDue
    recoveryState = recoveryEligible ? 'reconnecting' : stale ? 'stale' : 'degraded'
    recoveryReason = recoveryEligible
      ? 'Provider er klar for kontrollert recovery-vindu. Ingen faktisk reconnect kjøres ennå.'
      : 'Provider venter på neste recovery-vindu.'

    if (orchestrationRun && recoveryEligible) {
      recoveryAttempts = Math.min(previousAttempts + 1, recoveryPolicy.maxAttempts)
      recoveryBackoffMs = Math.min(
        recoveryPolicy.baseBackoffMs * 2 ** Math.max(0, recoveryAttempts - 1),
        recoveryPolicy.maxBackoffMs,
      )
      nextRecoveryAttemptAt = futureIso(recoveryBackoffMs)
      if (recoveryAttempts >= recoveryPolicy.maxAttempts) {
        recoveryCooldownUntil = futureIso(recoveryPolicy.cooldownMs)
      }
    }
  }

  return {
    recoveryState,
    recoveryAttempts,
    recoveryBackoffMs,
    nextRecoveryAttemptAt,
    recoveryEligible,
    recoveryBlocked,
    recoveryReason,
    recoveryPolicy,
    recoveryCooldownUntil,
    recoveredAt,
  }
}

function createRuntimeOrchestrationState({
  provider,
  lifecycleState,
  connectionState,
  lastSyncAt = null,
  error = null,
  runtimeSnapshotAt = null,
  previous = null,
  orchestrationRun = false,
} = {}) {
  const pollingCadence = PROVIDER_POLLING_CADENCE_MS[provider] ?? DEFAULT_ORCHESTRATION_CADENCE_MS
  const now = Date.now()
  const lastSuccessfulContactAt =
    connectionState === 'connected'
      ? (lastSyncAt ?? runtimeSnapshotAt ?? nowIso())
      : previous?.lastSuccessfulContactAt ?? null
  const freshnessSourceAt =
    parseTimestamp(lastSuccessfulContactAt) ??
    parseTimestamp(lastSyncAt) ??
    parseTimestamp(runtimeSnapshotAt)
  const ageMs = freshnessSourceAt === null ? null : now - freshnessSourceAt
  const stale = ageMs === null ? lifecycleState !== 'disabled' && lifecycleState !== 'ready' : ageMs > pollingCadence * PROVIDER_STALE_MULTIPLIER
  const wasDegraded = previous?.recoveryState === 'degraded' || previous?.recoveryState === 'stale'
  const recovered = Boolean(wasDegraded && connectionState === 'connected' && !stale && !error)
  const reconnectRecommended = Boolean(
    lifecycleState !== 'disabled' &&
      (stale || lifecycleState === 'degraded' || lifecycleState === 'offline' || lifecycleState === 'failed'),
  )
  const runtimeLatency = ageMs === null ? null : Math.max(0, ageMs)
  const degradedReason = error
    ? 'Runtime rapporterer feil.'
    : stale
      ? 'Provider har ikke rapportert fersk status innen forventet cadence.'
      : lifecycleState === 'offline'
        ? 'Provider er ikke connected.'
        : null
  const recovery = createRecoveryMetadata({
    provider,
    lifecycleState,
    connectionState,
    stale,
    reconnectRecommended,
    recovered,
    error,
    previous,
    pollingCadence,
    orchestrationRun,
  })

  return {
    runtimeHeartbeatAt: runtimeSnapshotAt ?? nowIso(),
    lastSuccessfulContactAt,
    stale,
    reconnectRecommended,
    reconnectAttempts: recovery.recoveryAttempts,
    runtimeLatency,
    pollingCadence,
    degradedReason,
    recoveryState: recovery.recoveryState,
    recoveryAttempts: recovery.recoveryAttempts,
    recoveryBackoffMs: recovery.recoveryBackoffMs,
    nextRecoveryAttemptAt: recovery.nextRecoveryAttemptAt,
    recoveryEligible: recovery.recoveryEligible,
    recoveryBlocked: recovery.recoveryBlocked,
    recoveryReason: recovery.recoveryReason,
    recoveryPolicy: recovery.recoveryPolicy,
    recoveryCooldownUntil: recovery.recoveryCooldownUntil,
    recoveredAt: recovery.recoveredAt,
    cadenceDriftMs: ageMs === null ? null : Math.max(0, ageMs - pollingCadence),
    watchdog: {
      source: 'bridge-integration-orchestrator',
      aggressiveReconnect: false,
      hardwareAction: false,
      note: 'Orchestration vurderer recovery-readiness. Den reconnecter, restarter eller styrer ikke hardware.',
    },
  }
}

function createStep(id, label, ok, detail) {
  return {
    id,
    label,
    ok: Boolean(ok),
    detail,
  }
}

function checkTcpReachability(host, port, timeoutMs = 650) {
  return new Promise((resolve) => {
    const startedAt = Date.now()
    const socket = new Socket()
    let settled = false

    function finish(reachable, error = null) {
      if (settled) {
        return
      }

      settled = true
      socket.destroy()
      resolve({
        port,
        reachable,
        latencyMs: Math.max(0, Date.now() - startedAt),
        error,
      })
    }

    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false, 'timeout'))
    socket.once('error', (error) => finish(false, error?.code ?? 'tcp-error'))
    socket.connect(port, host)
  })
}

function runArpTableScan() {
  return new Promise((resolve) => {
    try {
      execFile('arp', ['-a'], { timeout: 1_500, windowsHide: true }, (error, stdout) => {
        if (error) {
          resolve({
            ok: false,
            entries: [],
            error: error.code === 'ENOENT' ? 'arp-unavailable' : 'arp-scan-failed',
          })
          return
        }

        const entries = []
        const pattern = /(\d{1,3}(?:\.\d{1,3}){3})\s+([0-9a-fA-F:-]{11,17})/g
        let match = pattern.exec(stdout)

        while (match) {
          entries.push({
            ip: match[1],
            mac: match[2].toLowerCase().replaceAll('-', ':'),
          })
          match = pattern.exec(stdout)
        }

        resolve({
          ok: true,
          entries,
          error: null,
        })
      })
    } catch (error) {
      resolve({
        ok: false,
        entries: [],
        error: error instanceof Error ? error.message : 'arp-scan-unavailable',
      })
    }
  })
}

function findArpEntry(arpEntries, ip) {
  return arpEntries.find((entry) => entry.ip === ip) ?? null
}

function getVendorHint(mac) {
  const prefix = String(mac ?? '').toLowerCase().slice(0, 8)

  return MAC_VENDOR_HINTS[prefix] ?? null
}

async function lookupHostname(ip) {
  try {
    const names = await dns.reverse(ip)

    return {
      ok: true,
      hostname: names[0] ?? null,
      error: null,
    }
  } catch (error) {
    return {
      ok: false,
      hostname: null,
      error: error?.code ?? 'reverse-dns-unavailable',
    }
  }
}

function runUdpDiscovery({ type, address, port, payload, timeoutMs = 900 }) {
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4')
    const responses = []
    let settled = false

    function finish(error = null) {
      if (settled) {
        return
      }

      settled = true
      socket.close()
      resolve({
        ok: error === null,
        type,
        responses,
        error,
      })
    }

    socket.on('message', (message, remote) => {
      responses.push({
        ip: remote.address,
        port: remote.port,
        text: message.toString('utf8').slice(0, 600),
      })
    })
    socket.on('error', (error) => finish(error?.code ?? `${type}-error`))
    socket.bind(() => {
      try {
        socket.setBroadcast(true)
        socket.send(payload, port, address, (error) => {
          if (error) {
            finish(error.code ?? `${type}-send-failed`)
          }
        })
      } catch (error) {
        finish(error instanceof Error ? error.message : `${type}-unavailable`)
      }
    })
    setTimeout(() => finish(), timeoutMs).unref?.()
  })
}

function createMdnsQuery() {
  return Buffer.from([
    0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x09, 0x5f, 0x73, 0x65,
    0x72, 0x76, 0x69, 0x63, 0x65, 0x73, 0x07, 0x5f,
    0x64, 0x6e, 0x73, 0x2d, 0x73, 0x64, 0x04, 0x5f,
    0x75, 0x64, 0x70, 0x05, 0x6c, 0x6f, 0x63, 0x61,
    0x6c, 0x00, 0x00, 0x0c, 0x00, 0x01,
  ])
}

async function runDeltacoNetworkDiscovery(deep) {
  if (!deep) {
    return {
      mdns: { ok: false, responses: [], error: 'deep-disabled' },
      ssdp: { ok: false, responses: [], error: 'deep-disabled' },
    }
  }

  const ssdpPayload = Buffer.from(
    [
      'M-SEARCH * HTTP/1.1',
      'HOST: 239.255.255.250:1900',
      'MAN: "ssdp:discover"',
      'MX: 1',
      'ST: ssdp:all',
      '',
      '',
    ].join('\r\n'),
  )
  const [mdns, ssdp] = await Promise.all([
    runUdpDiscovery({
      type: 'mdns',
      address: '224.0.0.251',
      port: 5353,
      payload: createMdnsQuery(),
      timeoutMs: 900,
    }),
    runUdpDiscovery({
      type: 'ssdp',
      address: '239.255.255.250',
      port: 1900,
      payload: ssdpPayload,
      timeoutMs: 900,
    }),
  ])

  return { mdns, ssdp }
}

function findUdpEvidence(discovery, ip) {
  const evidence = []
  const mdnsHit = discovery.mdns.responses.find((response) => response.ip === ip)
  const ssdpHit = discovery.ssdp.responses.find((response) => response.ip === ip)

  if (mdnsHit) {
    evidence.push('mDNS response observed')
  }

  if (ssdpHit) {
    evidence.push('SSDP/UPnP response observed')
  }

  return evidence
}

function findUdpNegativeEvidence(discovery, ip) {
  const negativeEvidence = []
  const responses = [
    ...discovery.mdns.responses.filter((response) => response.ip === ip),
    ...discovery.ssdp.responses.filter((response) => response.ip === ip),
  ]

  for (const response of responses) {
    const text = String(response.text ?? '').toLowerCase()

    if (text.includes('google') || text.includes('chromecast') || text.includes('google cast')) {
      negativeEvidence.push('Cast/Google service response observed')
    }

    if (text.includes('mediarenderer') || text.includes('dial-multiscreen')) {
      negativeEvidence.push('Media renderer service observed')
    }

    if (text.includes('router') || text.includes('gateway')) {
      negativeEvidence.push('Router/gateway service observed')
    }
  }

  return Array.from(new Set(negativeEvidence))
}

function getKnownDeviceHint({ candidate, hostname, vendorHint, openPorts, udpNegativeEvidence }) {
  if (candidate?.knownDeviceFamily) {
    return {
      family: candidate.knownDeviceFamily,
      reason: candidate.observedHostname
        ? `Tidligere discovery viste hostname ${candidate.observedHostname}.`
        : `Kandidaten er markert som ${candidate.knownDeviceFamily}.`,
    }
  }

  const normalizedHostname = String(hostname ?? '').toLowerCase()
  const normalizedVendor = String(vendorHint ?? '').toLowerCase()

  if (/google|nest|chromecast|cast/.test(normalizedHostname)) {
    return {
      family: normalizedHostname.includes('nest') ? 'Google Nest' : 'Google Home / Cast',
      reason: `Hostname ${hostname} indikerer Google/Cast-enhet.`,
    }
  }

  if (/router|gateway|deco|unifi|eero/.test(normalizedHostname)) {
    return {
      family: 'Router/Gateway',
      reason: `Hostname ${hostname} indikerer router/gateway.`,
    }
  }

  if (/iphone|ipad|android|samsung|pixel|desktop|laptop|pc|macbook|windows/.test(normalizedHostname)) {
    return {
      family: 'Phone/Desktop',
      reason: `Hostname ${hostname} indikerer telefon/PC.`,
    }
  }

  if (/apple|samsung|intel|microsoft/.test(normalizedVendor) && !openPorts.includes(6668) && !openPorts.includes(6667)) {
    return {
      family: 'Known non-Tuya client',
      reason: `Vendor ${vendorHint} passer dårlig med Deltaco/Tuya-plugg.`,
    }
  }

  return null
}

function scoreDeltacoCandidate({
  candidate,
  openPorts,
  arpPresent,
  hostname,
  vendorHint,
  udpEvidence,
  udpNegativeEvidence,
}) {
  const evidence = []
  const negativeEvidence = []
  let score = 0

  if (openPorts.includes(6668) || openPorts.includes(6667) || openPorts.includes(6669)) {
    score += 0.42
    evidence.push('Tuya LAN port responded')
  }

  if (openPorts.includes(8883)) {
    score += 0.18
    evidence.push('MQTT/TLS style port responded')
  }

  if (arpPresent) {
    score += 0.18
    evidence.push('ARP entry present')
  }

  if (vendorHint) {
    score += 0.22
    evidence.push(`MAC vendor hint: ${vendorHint}`)
  }

  if (hostname) {
    score += 0.08
    evidence.push(`Hostname: ${hostname}`)
  }

  if (candidate.role === 'lampPlug' && candidate.physicalOrder !== null) {
    score += 0.14
    evidence.push('Manual Lampe 1-5 candidate')
  }

  if (!hostname && !openPorts.includes(80) && !openPorts.includes(443)) {
    score += 0.08
    evidence.push('Low-noise IoT profile')
  }

  if (udpEvidence.length > 0) {
    score += 0.1
    evidence.push(...udpEvidence)
  }

  const knownDeviceHint = getKnownDeviceHint({ candidate, hostname, vendorHint, openPorts, udpNegativeEvidence })

  if (knownDeviceHint) {
    score -= 0.7
    negativeEvidence.push(knownDeviceHint.reason)
  }

  if (openPorts.includes(80) || openPorts.includes(443)) {
    score -= hostname ? 0.18 : 0.05
    negativeEvidence.push('Common web/device port responded')
  }

  if (udpNegativeEvidence.length > 0) {
    score -= 0.25
    negativeEvidence.push(...udpNegativeEvidence)
  }

  const boundedScore = Math.max(0, Math.min(1, score))
  const confidence =
    boundedScore >= 0.7
      ? 'high'
      : boundedScore >= 0.4
        ? 'medium'
        : boundedScore > 0
          ? 'low'
          : 'low'
  const likelyTuyaDevice =
    knownDeviceHint
      ? false
      : openPorts.includes(6668) || openPorts.includes(6667) || openPorts.includes(6669) || vendorHint
      ? true
      : openPorts.length > 0 || arpPresent || hostname
        ? 'unknown'
        : false
  const classification = knownDeviceHint
    ? 'excludedKnownDevice'
    : likelyTuyaDevice === true && boundedScore >= 0.7
      ? 'likelyDeltacoTuya'
      : likelyTuyaDevice === true || boundedScore >= 0.28
        ? 'possibleDeltacoTuya'
        : arpPresent || hostname || openPorts.length > 0 || candidate.role === 'lampPlug'
          ? 'unknownLanDevice'
          : 'unlikelyDeltacoTuya'
  const recommendedAction = knownDeviceHint
    ? 'Ekskluder fra Deltaco/Tuya research. Ikke slett automatisk.'
    : classification === 'likelyDeltacoTuya'
      ? 'Kandidat kan brukes til senere bekreftet mapping når bruker validerer fysisk lampe.'
      : classification === 'possibleDeltacoTuya'
        ? 'Behold som aktiv kandidat og bekreft med manuell fysisk observasjon.'
        : classification === 'unknownLanDevice'
          ? 'Behold som ukjent LAN-kandidat til mer evidens finnes.'
          : 'Lav prioritet for Tuya research.'

  return {
    confidence,
    evidence,
    negativeEvidence: Array.from(new Set(negativeEvidence)),
    likelyTuyaDevice,
    score: Number(boundedScore.toFixed(2)),
    classification,
    classificationConfidence: confidence,
    exclusionReason: knownDeviceHint?.reason ?? null,
    deviceFamilyHint: knownDeviceHint?.family ?? (vendorHint ? 'Tuya/Smart Life' : null),
    recommendedAction,
  }
}

async function scanDeltacoTuyaCandidates({ timeoutMs = 650, deep = false } = {}) {
  const scannedAt = nowIso()
  const arp = await runArpTableScan()
  const networkDiscovery = await runDeltacoNetworkDiscovery(deep)
  const ports = deep ? DELTACO_TUYA_DEEP_TCP_PORTS : DELTACO_TUYA_TCP_PORTS
  const candidates = await Promise.all(
    DELTACO_TUYA_DEVICE_CANDIDATES.map(async (candidate) => {
      const checks = await Promise.all(
        ports.map((port) => checkTcpReachability(candidate.ip, port, timeoutMs)),
      )
      const reachableCheck = checks.find((check) => check.reachable)
      const reachable = Boolean(reachableCheck)
      const latencyMs = reachableCheck?.latencyMs ?? Math.min(...checks.map((check) => check.latencyMs))
      const arpEntry = findArpEntry(arp.entries, candidate.ip)
      const hostnameResult = deep ? await lookupHostname(candidate.ip) : { hostname: null, ok: false, error: 'deep-disabled' }
      const hostname = hostnameResult.hostname ?? candidate.observedHostname ?? null
      const openPorts = checks.filter((check) => check.reachable).map((check) => check.port)
      const vendorHint = getVendorHint(candidate.mac ?? arpEntry?.mac ?? null)
      const udpEvidence = findUdpEvidence(networkDiscovery, candidate.ip)
      const udpNegativeEvidence = findUdpNegativeEvidence(networkDiscovery, candidate.ip)
      const score = scoreDeltacoCandidate({
        candidate,
        openPorts,
        arpPresent: Boolean(arpEntry),
        hostname,
        vendorHint,
        udpEvidence,
        udpNegativeEvidence,
      })

      return {
        ...candidate,
        mac: candidate.mac ?? arpEntry?.mac ?? null,
        vendorHint,
        hostname,
        hostnameLookup: {
          ok: hostnameResult.ok || Boolean(candidate.observedHostname),
          error: hostnameResult.error,
          source: hostnameResult.hostname ? 'reverse-dns' : candidate.observedHostname ? 'observed-discovery' : null,
        },
        arpPresent: Boolean(arpEntry),
        openPorts,
        reachable,
        lastSeenAt: reachable ? scannedAt : null,
        latencyMs,
        confidence: score.confidence,
        evidence: score.evidence,
        negativeEvidence: score.negativeEvidence,
        likelyTuyaDevice: score.likelyTuyaDevice,
        score: score.score,
        classification: score.classification,
        classificationConfidence: score.classificationConfidence,
        exclusionReason: score.exclusionReason,
        deviceFamilyHint: score.deviceFamilyHint,
        recommendedAction: score.recommendedAction,
        notes: reachable
          ? 'TCP-port for Tuya/LAN responderte. Ingen Tuya-kommandoer er sendt.'
          : 'Ikke nådd med trygg TCP-check. Enheten kan være offline, på annen IP eller lukket for LAN.',
        checks,
      }
    }),
  )
  const reachableCount = candidates.filter((candidate) => candidate.reachable).length
  const excludedCandidates = candidates.filter((candidate) => candidate.classification === 'excludedKnownDevice')
  const activeCandidates = candidates.filter((candidate) =>
    ['likelyDeltacoTuya', 'possibleDeltacoTuya', 'unknownLanDevice'].includes(candidate.classification),
  )
  const recommendedManualMappings = candidates
    .filter((candidate) => ['likelyDeltacoTuya', 'possibleDeltacoTuya'].includes(candidate.classification))
    .map((candidate) => ({
      name: candidate.name,
      physicalOrder: candidate.physicalOrder,
      ip: candidate.ip,
      mac: candidate.mac,
      classification: candidate.classification,
      confidence: candidate.classificationConfidence,
      confirmed: false,
    }))
  const needsUserConfirmation = activeCandidates.map((candidate) => ({
    name: candidate.name,
    physicalOrder: candidate.physicalOrder,
    ip: candidate.ip,
    classification: candidate.classification,
    reason: candidate.recommendedAction,
  }))

  return {
    ok: true,
    provider: 'deltacoTuya',
    sourceOfTruth: 'bridge-integration-manager',
    generatedAt: scannedAt,
    discoveryMode: 'tcp-reachability-only',
    deep,
    arp: {
      ok: arp.ok,
      error: arp.error,
      candidateMatches: candidates.filter((candidate) => candidate.arpPresent).length,
    },
    mdns: {
      ok: networkDiscovery.mdns.ok,
      responseCount: networkDiscovery.mdns.responses.length,
      error: networkDiscovery.mdns.error,
    },
    ssdp: {
      ok: networkDiscovery.ssdp.ok,
      responseCount: networkDiscovery.ssdp.responses.length,
      error: networkDiscovery.ssdp.error,
    },
    sendsCommands: false,
    cloudLogin: false,
    localKeys: false,
    candidateCount: candidates.length,
    reachableCount,
    missingCount: candidates.length - reachableCount,
    excludedCandidates,
    activeCandidates,
    recommendedManualMappings,
    needsUserConfirmation,
    candidates,
    confidence: reachableCount > 0 ? 'medium' : 'low',
    notes: [
      'Discovery er read-only og sjekker kun lett LAN reachability.',
      'Ingen Tuya cloud login, local key/token-jakt eller av/på-kommandoer er implementert.',
      'Lampe 1-5 er lagt inn med fysisk rekkefølge fra venstre i stua.',
    ],
  }
}

function compareDeltacoCandidateSignals(baseline, current, target) {
  const baselineByIp = new Map((baseline?.candidates ?? []).map((candidate) => [candidate.ip, candidate]))

  return (current?.candidates ?? []).map((candidate) => {
    const before = baselineByIp.get(candidate.ip) ?? {}
    const reachableChanged = Boolean(before.reachable) !== Boolean(candidate.reachable)
    const arpChanged = Boolean(before.arpPresent) !== Boolean(candidate.arpPresent)
    const beforeLatency = Number(before.latencyMs ?? 0)
    const afterLatency = Number(candidate.latencyMs ?? 0)
    const latencyDeltaMs = Math.abs(afterLatency - beforeLatency)
    let score = 0
    const signals = []

    if (reachableChanged) {
      score += 0.45
      signals.push('reachability changed')
    }

    if (arpChanged) {
      score += 0.25
      signals.push('arp presence changed')
    }

    if (latencyDeltaMs >= 150) {
      score += 0.2
      signals.push(`latency changed ${latencyDeltaMs}ms`)
    }

    if (candidate.physicalOrder === target.physicalOrder) {
      score += 0.05
      signals.push('matches requested lamp order')
    }

    const confidence =
      score >= 0.65
        ? 'high'
        : score >= 0.35
          ? 'medium'
          : score > 0
            ? 'low'
            : 'none'

    return {
      candidateId: candidate.id,
      name: candidate.name,
      ip: candidate.ip,
      mac: candidate.mac ?? null,
      physicalOrder: candidate.physicalOrder,
      reachable: Boolean(candidate.reachable),
      arpPresent: Boolean(candidate.arpPresent),
      latencyMs: candidate.latencyMs ?? null,
      latencyDeltaMs,
      score: Number(score.toFixed(2)),
      confidence,
      signals,
      suggestedFor: target.name,
      confirmed: false,
    }
  }).sort((left, right) => right.score - left.score)
}

function sanitizeProviderConfigPatch(providerId, patch = {}) {
  const normalizedProvider = String(providerId ?? '').trim()
  const secretPresence = {}
  const secretValues = {}
  const safeConfig = {}
  const acceptedFields = []

  for (const [key, value] of Object.entries(patch ?? {})) {
    const normalizedKey = String(key)
    const lowerKey = normalizedKey.toLowerCase()
    const isSecret =
      lowerKey.includes('password') ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('apikey') ||
      lowerKey.includes('api_key')

    if (isSecret) {
      secretPresence[normalizedKey] = hasText(value)
      if (hasText(value)) {
        secretValues[normalizedKey] = String(value)
      }
      acceptedFields.push(normalizedKey)
      continue
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      safeConfig[normalizedKey] = typeof value === 'string' ? value.trim() : value
      acceptedFields.push(normalizedKey)
    }
  }

  return {
    provider: normalizedProvider,
    safeConfig,
    secretPresence,
    secretValues,
    acceptedFields,
    updatedAt: nowIso(),
  }
}

function normalizeConnectionState({ enabled, connected, state }) {
  if (!enabled) {
    return 'disabled'
  }

  if (connected || state === 'connected' || state === 'playing') {
    return 'connected'
  }

  if (state === 'degraded' || state === 'fallback' || state === 'error') {
    return 'degraded'
  }

  return 'disconnected'
}

function normalizeRuntimeHealth(connectionState, error = null) {
  if (connectionState === 'connected') {
    return 'healthy'
  }

  if (connectionState === 'degraded') {
    return 'degraded'
  }

  if (error) {
    return 'needs-attention'
  }

  return 'prepared'
}

const PROVIDER_MATURITY = {
  liveRuntime: 'liveRuntime',
  statusOnly: 'statusOnly',
  foundation: 'foundation',
  prepared: 'prepared',
  mock: 'mock',
  future: 'future',
}

function createProviderCapabilityClarity({
  maturity = PROVIDER_MATURITY.foundation,
  supportsRead = false,
  supportsWrite = false,
  supportsDiscovery = false,
  supportsLifecycle = true,
  sendsCommands = false,
  requiresCredentials = false,
  runtimeConnected = false,
  controlAvailable = false,
  foundationOnly,
} = {}) {
  const foundationLike = ['foundation', 'prepared', 'mock', 'future'].includes(maturity)
  return {
    maturity,
    supportsRead: Boolean(supportsRead),
    supportsWrite: Boolean(supportsWrite),
    supportsDiscovery: Boolean(supportsDiscovery),
    supportsLifecycle: Boolean(supportsLifecycle),
    sendsCommands: Boolean(sendsCommands),
    requiresCredentials: Boolean(requiresCredentials),
    runtimeConnected: Boolean(runtimeConnected),
    controlAvailable: Boolean(controlAvailable && supportsWrite && sendsCommands),
    foundationOnly: foundationOnly ?? foundationLike,
  }
}

function buildProvider({
  id,
  provider,
  category,
  name,
  status,
  readiness,
  authRequired = false,
  configured = false,
  credentials,
  capabilities = [],
  supportedFeatures = [],
  runtimeHealth,
  connectionState,
  lastSyncAt = null,
  diagnostics = [],
  safeConfig = {},
  onboarding,
  lifecycle,
  orchestration,
  persistence,
  maturity = PROVIDER_MATURITY.foundation,
  capabilityClarity,
}) {
  const safeConnectionState = connectionState ?? status ?? 'foundation'
  const resolvedCapabilityClarity = createProviderCapabilityClarity({
    maturity,
    supportsRead: capabilities.some((capability) =>
      ['status', 'battery', 'reachability', 'discovery', 'subscriptions'].includes(capability),
    ),
    supportsDiscovery: capabilities.includes('discovery') || supportedFeatures.some((feature) =>
      String(feature).includes('discovery'),
    ),
    requiresCredentials: authRequired,
    runtimeConnected: safeConnectionState === 'connected',
    ...capabilityClarity,
  })

  return {
    id,
    provider,
    category,
    name,
    status,
    readiness,
    authRequired,
    configured,
    credentials: credentials ?? createCredentialState({ authRequired, configured }),
    capabilities,
    supportedFeatures,
    maturity: resolvedCapabilityClarity.maturity,
    capabilityClarity: resolvedCapabilityClarity,
    supportsRead: resolvedCapabilityClarity.supportsRead,
    supportsWrite: resolvedCapabilityClarity.supportsWrite,
    supportsDiscovery: resolvedCapabilityClarity.supportsDiscovery,
    supportsLifecycle: resolvedCapabilityClarity.supportsLifecycle,
    sendsCommands: resolvedCapabilityClarity.sendsCommands,
    requiresCredentials: resolvedCapabilityClarity.requiresCredentials,
    runtimeConnected: resolvedCapabilityClarity.runtimeConnected,
    controlAvailable: resolvedCapabilityClarity.controlAvailable,
    foundationOnly: resolvedCapabilityClarity.foundationOnly,
    runtimeHealth: runtimeHealth ?? normalizeRuntimeHealth(safeConnectionState),
    connectionState: safeConnectionState,
    lastSyncAt,
    diagnostics: diagnostics.filter(Boolean).slice(0, 8),
    safeConfig,
    onboarding,
    lifecycle:
      lifecycle ??
      createLifecycleState({
        status,
        connectionState: safeConnectionState,
        runtimeHealth: runtimeHealth ?? normalizeRuntimeHealth(safeConnectionState),
        configured,
        authRequired,
        requiresConfig: authRequired,
        defaultEnabled: status !== 'disabled',
      }),
    orchestration,
    persistence,
  }
}

function buildDreameProvider(
  vacuumStatus,
  sessionConfig = null,
  sessionLifecycle = null,
  previousOrchestration = null,
  orchestrationRun = false,
) {
  const config = vacuumStatus?.config ?? {}
  const provider = vacuumStatus?.providers?.find?.((item) => item.id === 'dreameCloud')
  const selected = vacuumStatus?.provider === 'dreameCloud'
  const trust = vacuumStatus?.trust ?? {}
  const connected = Boolean(
    selected &&
      vacuumStatus?.connected &&
      trust.state !== 'stale' &&
      trust.state !== 'offline' &&
      trust.stateConfidence !== 'low',
  )
  const enabled = Boolean(vacuumStatus?.enabled)
  const missing = []

  const sessionSafeConfig = sessionConfig?.safeConfig ?? {}
  const sessionSecrets = sessionConfig?.secretPresence ?? {}
  const regionConfigured = Boolean(config.dreameRegion || sessionSafeConfig.region)
  const usernameConfigured = Boolean(config.dreameUsernameConfigured || sessionSafeConfig.username)
  const passwordConfigured = Boolean(config.dreamePasswordConfigured || sessionSecrets.password)
  const cloudEnabled = Boolean(
    vacuumStatus?.enabled ||
      sessionSafeConfig.cloudEnabled === true ||
      sessionSafeConfig.enabled === true,
  )
  const providerEnabled = Boolean(
    selected ||
      sessionSafeConfig.providerEnabled === true ||
      sessionSafeConfig.selectedProvider === 'dreameCloud',
  )
  const authProfileAvailable = Boolean(config.dreameCloudClient || sessionSafeConfig.authProfile)
  const selectedClientAvailable = Boolean(config.dreameCloudClient || sessionSafeConfig.selectedClient)
  const deviceReachable = Boolean(connected && trust.deviceReachable && (vacuumStatus?.deviceCount ?? 0) > 0)

  if (!regionConfigured) {
    missing.push('LYNELL_DREAME_REGION')
  }

  if (!usernameConfigured) {
    missing.push('LYNELL_DREAME_USERNAME')
  }

  if (!passwordConfigured) {
    missing.push('LYNELL_DREAME_PASSWORD')
  }

  const connectionState = normalizeConnectionState({
    enabled,
    connected,
    state: selected ? vacuumStatus?.state : enabled ? 'foundation' : 'disabled',
  })

  const onboarding = createOnboardingState({
    provider: 'dreameCloud',
    configured: missing.length === 0,
    connected,
    runtimeReady: Boolean(connected && selected),
    capabilities: provider?.supportedCapabilities ?? vacuumStatus?.capabilities ?? ['status', 'battery'],
    missingRequirements: [
      ...missing,
      !cloudEnabled ? 'LYNELL_DREAME_CLOUD_ENABLED' : null,
      !providerEnabled ? 'LYNELL_VACUUM_PROVIDER=dreameCloud' : null,
      !authProfileAvailable ? 'LYNELL_DREAME_AUTH_PROFILE' : null,
      !selectedClientAvailable ? 'LYNELL_DREAME_SELECTED_CLIENT' : null,
    ].filter(Boolean),
    validationErrors: vacuumStatus?.error ? [vacuumStatus.error] : [],
    recommendedNextStep: connected
      ? 'Status-only runtime er live. Neste steg er fortsatt observasjon, ikke kommandoer.'
      : missing.length > 0
        ? 'Fyll inn manglende Dreame credentials/env i bridge-session eller startup-script.'
        : !providerEnabled
          ? 'Velg dreameCloud som vacuum provider og restart bridge for ekte runtime.'
          : 'Kjør status-only connect og verifiser device-list før noen kommandoer vurderes.',
    steps: [
      createStep('username', 'Username configured', usernameConfigured, 'Dreame brukernavn finnes som env/session-presence.'),
      createStep('password', 'Password configured', passwordConfigured, 'Passord finnes som env/session-presence. Selve verdien returneres ikke.'),
      createStep('authProfile', 'Auth profile available', authProfileAvailable, 'explicit-form-urlencoded er anbefalt profil fra v2.4/v2.5.'),
      createStep('cloudEnabled', 'Dreame cloud enabled', cloudEnabled, 'Cloud adapter må være eksplisitt aktivert.'),
      createStep('providerEnabled', 'Vacuum provider selected', providerEnabled, 'dreameCloud må være valgt provider for runtime.'),
      createStep('selectedClient', 'Selected client available', selectedClientAvailable, 'dreameHomeReverseEngineered er golden-path client.'),
      createStep('deviceReachable', 'Device reachable', deviceReachable, 'Device-list må finne Dream/Dreame-enheten med fersk status.'),
      createStep('runtimeConnected', 'Runtime connected', connected, 'Status-only runtime må rapportere connected=true med høy nok tillit.'),
    ],
  })

  const lifecycle = createLifecycleState({
    status: connected ? 'connected' : enabled ? 'readyToConnect' : 'disabled',
    connectionState,
    runtimeHealth: normalizeRuntimeHealth(connectionState, vacuumStatus?.error),
    configured: missing.length === 0,
    authRequired: true,
    onboarding,
    sessionLifecycle,
    runtimeError: vacuumStatus?.error,
    defaultEnabled: enabled,
    activationAllowed: true,
    requiresConfig: true,
    requiresValidation: true,
    healthReason: connected
      ? 'Dreame status-only runtime er connected med fersk robotstatus.'
      : onboarding.validated
        ? 'Dreame er validert og klar for kontrollert lifecycle-aktivering.'
        : 'Dreame mangler fortsatt onboarding-krav før aktivering.',
    recommendedAction: connected
      ? 'Behold status-only observasjon. Ingen robotkommandoer er aktivert.'
      : onboarding.validated
        ? 'Aktiver lifecycle når du vil markere provider klar. Dette starter ikke roboten.'
        : onboarding.recommendedNextStep,
  })

  return buildProvider({
    id: 'assistant.dreameCloud',
    provider: 'dreameCloud',
    category: PROVIDER_CATEGORIES.assistant,
    name: 'Dreame Cloud',
    status: connected ? 'connected' : enabled ? 'readyToConnect' : 'disabled',
    readiness: connected
      ? 'Live status-runtime aktiv'
      : selected
        ? vacuumStatus?.readiness?.label ?? 'Klar for status-only test'
        : 'Native provider er klargjort, men ikke valgt',
    authRequired: true,
    configured: missing.length === 0,
    credentials: createCredentialState({
      authRequired: true,
      configured: missing.length === 0,
      required: ['LYNELL_DREAME_USERNAME', 'LYNELL_DREAME_PASSWORD', 'LYNELL_DREAME_REGION'],
      missing,
      source: sessionConfig ? 'env/session' : 'env',
    }),
    capabilities: provider?.supportedCapabilities ?? vacuumStatus?.capabilities ?? ['status', 'battery'],
    supportedFeatures: [
      'status-only',
      'device-list',
      'battery',
      'charging-state',
      'provider-switching',
    ],
    maturity: PROVIDER_MATURITY.statusOnly,
    capabilityClarity: {
      supportsRead: true,
      supportsWrite: false,
      supportsDiscovery: false,
      supportsLifecycle: true,
      sendsCommands: false,
      requiresCredentials: true,
      runtimeConnected: connected,
      controlAvailable: false,
      foundationOnly: false,
    },
    runtimeHealth: normalizeRuntimeHealth(connectionState, vacuumStatus?.error),
    connectionState,
    lastSyncAt: selected ? vacuumStatus?.lastSyncAt ?? null : null,
    diagnostics: [
      'Native Lynell-runtime er premium-retning.',
      'Reverse-engineered cloud flow er experimental/unstable.',
      selected ? `Trust: ${trust.state ?? 'unknown'} · confidence ${trust.stateConfidence ?? 'low'}.` : null,
      selected ? `Siste sikre sync: ${trust.lastSuccessfulSync ?? vacuumStatus?.lastSuccessfulSync ?? '—'}.` : null,
      selected ? vacuumStatus?.message : 'Provider kan velges via env senere.',
      vacuumStatus?.error,
    ],
    safeConfig: {
      selected,
      region: config.dreameRegion ?? sessionSafeConfig.region ?? null,
      country: config.dreameCountry ?? null,
      client: config.dreameCloudClient ?? null,
      deviceIdConfigured: Boolean(config.dreameDeviceIdConfigured),
      usernameConfigured,
      passwordConfigured,
      sessionConfigUpdatedAt: sessionConfig?.updatedAt ?? null,
    },
    onboarding,
    lifecycle,
    orchestration: createRuntimeOrchestrationState({
      provider: 'dreameCloud',
      lifecycleState: lifecycle.lifecycleState,
      connectionState,
      lastSyncAt: selected ? vacuumStatus?.lastSyncAt ?? null : null,
      error: vacuumStatus?.error,
      previous: previousOrchestration,
      orchestrationRun,
    }),
  })
}

function buildHomeAssistantVacuumProvider(
  vacuumStatus,
  sessionLifecycle = null,
  previousOrchestration = null,
  orchestrationRun = false,
) {
  const config = vacuumStatus?.config ?? {}
  const provider = vacuumStatus?.providers?.find?.((item) => item.id === 'homeAssistantBridge')
  const selected = vacuumStatus?.provider === 'homeAssistantBridge'
  const trust = vacuumStatus?.trust ?? {}
  const connected = Boolean(
    selected &&
      vacuumStatus?.connected &&
      trust.state !== 'stale' &&
      trust.state !== 'offline' &&
      trust.stateConfidence !== 'low',
  )
  const enabled = Boolean(vacuumStatus?.enabled)
  const missing = []

  if (!config.homeAssistantBaseUrl) {
    missing.push('LYNELL_HA_BASE_URL')
  }

  if (!config.homeAssistantTokenConfigured) {
    missing.push('LYNELL_HA_TOKEN')
  }

  if (!config.homeAssistantVacuumEntityId) {
    missing.push('LYNELL_HA_VACUUM_ENTITY_ID')
  }

  const connectionState = normalizeConnectionState({
    enabled,
    connected,
    state: selected ? vacuumStatus?.state : enabled ? 'foundation' : 'disabled',
  })

  const lifecycle = createLifecycleState({
    status: connected ? 'connected' : enabled ? 'readyToConnect' : 'disabled',
    connectionState,
    runtimeHealth: normalizeRuntimeHealth(connectionState, vacuumStatus?.error),
    configured: missing.length === 0,
    authRequired: true,
    sessionLifecycle,
    runtimeError: vacuumStatus?.error,
    defaultEnabled: enabled,
    activationAllowed: true,
    requiresConfig: true,
    requiresValidation: false,
    healthReason: connected
      ? 'Home Assistant bridge rapporterer fersk robotstatus.'
      : missing.length === 0
        ? 'Bridge-config finnes, men runtime er ikke connected.'
        : 'Home Assistant bridge mangler config.',
  })

  return buildProvider({
    id: 'assistant.homeAssistantBridge',
    provider: 'homeAssistantBridge',
    category: PROVIDER_CATEGORIES.assistant,
    name: 'Home Assistant Vacuum Bridge',
    status: connected ? 'connected' : enabled ? 'readyToConnect' : 'disabled',
    readiness: connected
      ? 'Kompatibilitetsbro er live'
      : selected
        ? vacuumStatus?.readiness?.label ?? 'Klar for HA-test'
        : 'Optional bridge for testing',
    authRequired: true,
    configured: missing.length === 0,
    credentials: createCredentialState({
      authRequired: true,
      configured: missing.length === 0,
      required: ['LYNELL_HA_BASE_URL', 'LYNELL_HA_TOKEN', 'LYNELL_HA_VACUUM_ENTITY_ID'],
      missing,
    }),
    capabilities: ['status'],
    supportedFeatures: ['status-only', 'compatibility-bridge'],
    maturity: connected ? PROVIDER_MATURITY.statusOnly : PROVIDER_MATURITY.foundation,
    capabilityClarity: {
      supportsRead: true,
      supportsWrite: false,
      supportsDiscovery: false,
      supportsLifecycle: true,
      sendsCommands: false,
      requiresCredentials: true,
      runtimeConnected: connected,
      controlAvailable: false,
      foundationOnly: !connected,
    },
    runtimeHealth: normalizeRuntimeHealth(connectionState, vacuumStatus?.error),
    connectionState,
    lastSyncAt: selected ? vacuumStatus?.lastSyncAt ?? null : null,
    diagnostics: [
      'Optional compatibility bridge, ikke premium-sluttretning.',
      selected ? vacuumStatus?.message : 'Kan brukes for rask ekte robot-test.',
      vacuumStatus?.error,
    ],
    safeConfig: {
      selected,
      baseUrlConfigured: Boolean(config.homeAssistantBaseUrl),
      tokenConfigured: Boolean(config.homeAssistantTokenConfigured),
      entityIdConfigured: Boolean(config.homeAssistantVacuumEntityId),
      entityId: config.homeAssistantVacuumEntityId ?? null,
    },
    lifecycle,
    orchestration: createRuntimeOrchestrationState({
      provider: 'homeAssistantBridge',
      lifecycleState: lifecycle.lifecycleState,
      connectionState,
      lastSyncAt: selected ? vacuumStatus?.lastSyncAt ?? null : null,
      error: vacuumStatus?.error,
      previous: previousOrchestration,
      orchestrationRun,
    }),
  })
}

function buildCastProvider(castStatus, sessionLifecycle = null, previousOrchestration = null, orchestrationRun = false) {
  const playback = castStatus?.playback ?? null
  const onlineDeviceCount =
    castStatus?.diagnostics?.onlineCount ??
    (Array.isArray(castStatus?.devices)
      ? castStatus.devices.filter((device) => device.online || device.state === 'online').length
      : 0)
  const staleDeviceCount =
    castStatus?.diagnostics?.staleCount ??
    (Array.isArray(castStatus?.devices)
      ? castStatus.devices.filter((device) => device.state === 'stale').length
      : 0)
  const offlineDeviceCount =
    castStatus?.diagnostics?.offlineCount ??
    (Array.isArray(castStatus?.devices)
      ? castStatus.devices.filter((device) => device.state === 'offline').length
      : 0)
  const playbackTrusted = playback?.playbackConfidence !== 'low' && !playback?.stale
  const connectionState = normalizeConnectionState({
    enabled: Boolean(castStatus?.enabled),
    connected: Boolean(playbackTrusted && (playback?.state === 'playing' || playback?.state === 'paused')),
    state: playback?.state === 'error' ? 'degraded' : castStatus?.state,
  })

  const lifecycle = createLifecycleState({
    status: connectionState === 'connected' ? 'connected' : castStatus?.enabled ? 'readyToConnect' : 'disabled',
    connectionState,
    runtimeHealth: normalizeRuntimeHealth(connectionState, castStatus?.error),
    configured: Boolean(castStatus?.enabled && castStatus?.discoveryEnabled),
    authRequired: false,
    sessionLifecycle,
    runtimeError: castStatus?.error,
    defaultEnabled: Boolean(castStatus?.enabled),
    activationAllowed: true,
    requiresConfig: false,
    requiresValidation: false,
    healthReason:
      connectionState === 'connected'
        ? 'Cast playback-session er aktiv.'
        : castStatus?.enabled
          ? 'Cast discovery/playback foundation er aktivert.'
          : 'Cast er disabled.',
  })

  return buildProvider({
    id: 'media.cast',
    provider: 'cast',
    category: PROVIDER_CATEGORIES.media,
    name: 'Google Home / Chromecast',
    status:
      connectionState === 'connected'
        ? 'connected'
        : castStatus?.enabled
          ? 'readyToConnect'
          : 'disabled',
    readiness: castStatus?.enabled
      ? castStatus.discoveryEnabled
        ? onlineDeviceCount > 0
          ? `${onlineDeviceCount} Cast-enheter online`
          : staleDeviceCount + offlineDeviceCount > 0
            ? 'Cast-enheter er husket, men ikke ferskt online'
            : 'Discovery er klargjort'
        : 'Cast er aktivert, discovery er av'
      : 'Cast er disabled',
    authRequired: false,
    configured: Boolean(castStatus?.enabled && castStatus?.discoveryEnabled),
    credentials: createCredentialState({ authRequired: false, configured: true }),
    capabilities: ['discovery', 'playback-test', 'pause', 'stop', 'volume'],
    supportedFeatures: ['local-discovery', 'mp3-playback-test', 'single-device-routing'],
    maturity: castStatus?.enabled ? PROVIDER_MATURITY.liveRuntime : PROVIDER_MATURITY.prepared,
    capabilityClarity: {
      supportsRead: true,
      supportsWrite: Boolean(castStatus?.enabled),
      supportsDiscovery: Boolean(castStatus?.discoveryEnabled),
      supportsLifecycle: true,
      sendsCommands: Boolean(castStatus?.enabled),
      requiresCredentials: false,
      runtimeConnected: connectionState === 'connected',
      controlAvailable: Boolean(castStatus?.enabled && onlineDeviceCount > 0 && playback?.dependencyReady),
      foundationOnly: !castStatus?.enabled,
    },
    runtimeHealth: normalizeRuntimeHealth(connectionState, castStatus?.error),
    connectionState,
    lastSyncAt: castStatus?.lastDiscoveryAt ?? playback?.updatedAt ?? null,
    diagnostics: [
      castStatus?.dependencyReady === false ? 'bonjour-service mangler.' : null,
      playback?.dependencyReady === false ? 'castv2-client mangler for playback.' : null,
      playback?.message,
      castStatus?.error,
    ],
    safeConfig: {
      discoveryEnabled: Boolean(castStatus?.discoveryEnabled),
      dependencyReady: castStatus?.dependencyReady ?? null,
      playbackDependencyReady: playback?.dependencyReady ?? null,
      discoveredDevices: Array.isArray(castStatus?.devices) ? castStatus.devices.length : 0,
      onlineDeviceCount,
      staleDeviceCount,
      offlineDeviceCount,
      playbackConfidence: playback?.playbackConfidence ?? null,
      playbackFreshness: playback?.sourceFreshness ?? null,
    },
    lifecycle,
    orchestration: createRuntimeOrchestrationState({
      provider: 'cast',
      lifecycleState: lifecycle.lifecycleState,
      connectionState,
      lastSyncAt: castStatus?.lastDiscoveryAt ?? playback?.updatedAt ?? null,
      error: castStatus?.error,
      previous: previousOrchestration,
      orchestrationRun,
    }),
  })
}

function buildMqttProvider(mqttStatus, sessionLifecycle = null, previousOrchestration = null, orchestrationRun = false) {
  const missing = []

  if (mqttStatus?.enabled && !mqttStatus?.broker?.host) {
    missing.push('LYNELL_MQTT_HOST')
  }

  const connectionState = normalizeConnectionState({
    enabled: Boolean(mqttStatus?.enabled),
    connected: Boolean(mqttStatus?.connected),
    state: mqttStatus?.state,
  })

  const lifecycle = createLifecycleState({
    status: connectionState === 'connected' ? 'connected' : mqttStatus?.enabled ? 'readyToConnect' : 'disabled',
    connectionState,
    runtimeHealth: normalizeRuntimeHealth(connectionState, mqttStatus?.error),
    configured: Boolean(mqttStatus?.enabled && mqttStatus?.broker?.host),
    authRequired: false,
    sessionLifecycle,
    runtimeError: mqttStatus?.error,
    defaultEnabled: Boolean(mqttStatus?.enabled),
    activationAllowed: true,
    requiresConfig: Boolean(mqttStatus?.enabled),
    requiresValidation: false,
    healthReason:
      connectionState === 'connected'
        ? 'MQTT bridge rapporterer connected.'
        : mqttStatus?.enabled
          ? 'MQTT er aktivert, men ikke connected.'
          : 'MQTT er disabled.',
  })

  return buildProvider({
    id: 'edge.mqtt',
    provider: 'mqtt',
    category: PROVIDER_CATEGORIES.edge,
    name: 'MQTT Bridge',
    status:
      connectionState === 'connected'
        ? 'connected'
        : mqttStatus?.enabled
          ? 'readyToConnect'
          : 'disabled',
    readiness: mqttStatus?.enabled
      ? mqttStatus.connected
        ? 'MQTT runtime er live'
        : mqttStatus.error ?? 'MQTT er klargjort for lokal broker-test'
      : 'MQTT er disabled',
    authRequired: false,
    configured: Boolean(mqttStatus?.enabled && mqttStatus?.broker?.host),
    credentials: createCredentialState({
      authRequired: false,
      configured: missing.length === 0,
      required: ['LYNELL_MQTT_HOST'],
      missing,
    }),
    capabilities: ['status', 'connect', 'disconnect', 'subscriptions', 'retained-awareness'],
    supportedFeatures: ['zigbee2mqtt-transport', 'topic-root', 'availability-topics'],
    maturity: mqttStatus?.connected ? PROVIDER_MATURITY.statusOnly : mqttStatus?.enabled ? PROVIDER_MATURITY.prepared : PROVIDER_MATURITY.foundation,
    capabilityClarity: {
      supportsRead: Boolean(mqttStatus?.enabled),
      supportsWrite: false,
      supportsDiscovery: false,
      supportsLifecycle: true,
      sendsCommands: false,
      requiresCredentials: true,
      runtimeConnected: Boolean(mqttStatus?.connected),
      controlAvailable: false,
      foundationOnly: !mqttStatus?.connected,
    },
    runtimeHealth: normalizeRuntimeHealth(connectionState, mqttStatus?.error),
    connectionState,
    lastSyncAt: mqttStatus?.lastMessageAt ?? null,
    diagnostics: [
      mqttStatus?.dependency ? `Dependency: ${mqttStatus.dependency}` : null,
      mqttStatus?.error,
      mqttStatus?.lastMessage ? `Siste topic: ${mqttStatus.lastMessage.topic}` : null,
    ],
    safeConfig: {
      brokerHost: mqttStatus?.broker?.host ?? null,
      brokerPort: mqttStatus?.broker?.port ?? null,
      topicRoot: mqttStatus?.topicRoot ?? null,
      subscribedTopics: mqttStatus?.subscribedTopics ?? [],
    },
    lifecycle,
    orchestration: createRuntimeOrchestrationState({
      provider: 'mqtt',
      lifecycleState: lifecycle.lifecycleState,
      connectionState,
      lastSyncAt: mqttStatus?.lastMessageAt ?? null,
      error: mqttStatus?.error,
      previous: previousOrchestration,
      orchestrationRun,
    }),
  })
}

function createDeltacoDeviceId(physicalOrder) {
  return `deltaco-tuya-lampe-${Number(physicalOrder)}`
}

function normalizeDeltacoMapping(mapping) {
  if (!mapping) {
    return null
  }

  return {
    deviceId: String(mapping.deviceId),
    displayName: String(mapping.displayName),
    provider: 'deltacoTuya',
    room: mapping.room ?? 'Stue',
    role: mapping.role ?? 'lampPlug',
    physicalOrder: Number(mapping.physicalOrder),
    ip: String(mapping.ip),
    mac: mapping.mac ?? null,
    confirmed: Boolean(mapping.confirmed),
    confirmedAt: mapping.confirmedAt ?? null,
    confidence: mapping.confidence ?? 'low',
    source: mapping.source ?? 'manual-confirmation',
    notes: Array.isArray(mapping.notes) ? mapping.notes : [],
    lifecycleOwner: mapping.lifecycleOwner ?? 'bridge/integration-manager',
    orchestrationOwner: mapping.orchestrationOwner ?? 'bridge/orchestrator',
    evidence: Array.isArray(mapping.evidence) ? mapping.evidence : [],
    classification: mapping.classification ?? null,
    updatedAt: mapping.updatedAt ?? mapping.confirmedAt ?? nowIso(),
  }
}

function createDeltacoMappingFromCandidate(candidate, physicalOrder, notes = []) {
  const order = Number(physicalOrder)
  const confirmedAt = nowIso()

  return normalizeDeltacoMapping({
    deviceId: createDeltacoDeviceId(order),
    displayName: `Lampe ${order}`,
    provider: 'deltacoTuya',
    room: candidate?.room ?? 'Stue',
    role: 'lampPlug',
    physicalOrder: order,
    ip: candidate?.ip,
    mac: candidate?.mac ?? null,
    confirmed: true,
    confirmedAt,
    confidence: candidate?.classificationConfidence ?? candidate?.confidence ?? 'manual',
    source: 'manual-confirmation',
    notes: [
      'Bekreftet manuelt i Lynell. Ingen Tuya-kommandoer ble sendt.',
      ...notes,
    ],
    lifecycleOwner: 'bridge/integration-manager',
    orchestrationOwner: 'bridge/orchestrator',
    evidence: candidate?.evidence ?? [],
    classification: candidate?.classification ?? null,
    updatedAt: confirmedAt,
  })
}

function classifyDeltacoCommunicationProfile({ openPorts, latencyDriftMs, reachable }) {
  if (openPorts.includes(6668) || openPorts.includes(6667) || openPorts.includes(6669)) {
    return 'likelyTuyaLan'
  }

  if (openPorts.includes(8883) && !openPorts.some((port) => [6668, 6667, 6669].includes(port))) {
    return 'tlsOnly'
  }

  if (!reachable) {
    return 'passiveLocal'
  }

  if (openPorts.length === 0 && latencyDriftMs !== null && latencyDriftMs < 80) {
    return 'cloudDominant'
  }

  return 'passiveLocal'
}

function buildDeltacoProtocolHints({ openPorts, latencySamples, reachable }) {
  const hints = []
  const transportHints = []
  const evidence = []
  const latencyValues = latencySamples.filter((value) => Number.isFinite(value))
  const latencyDriftMs = latencyValues.length >= 2
    ? Math.abs(latencyValues[1] - latencyValues[0])
    : null

  if (openPorts.includes(6668) || openPorts.includes(6667) || openPorts.includes(6669)) {
    hints.push('likelyTuyaLan')
    transportHints.push('tuya-lan-tcp')
    evidence.push('Tuya LAN-port svarte på passiv TCP-connect.')
  }

  if (openPorts.includes(8883)) {
    hints.push('tlsOnly')
    transportHints.push('mqtt-tls-or-cloud-style-transport')
    evidence.push('Port 8883 svarte. Dette kan tyde på TLS/cloud-orientert transport.')
  }

  if (openPorts.includes(80) || openPorts.includes(443)) {
    transportHints.push('web-or-device-service')
    evidence.push('Web/TLS-port svarte. Ikke nok til å bekrefte Tuya.')
  }

  if (openPorts.length === 0 && reachable) {
    hints.push('passiveLocal')
    evidence.push('Enheten er nåbar i LAN-kandidatliste, men eksponerer ingen observerte Tuya-porter.')
  }

  if (!reachable && openPorts.length === 0) {
    hints.push('cloudDominant')
    evidence.push('Ingen lokale porter svarte i denne passive observasjonen.')
  }

  if (latencyDriftMs !== null) {
    evidence.push(`Latency drift observert: ${latencyDriftMs}ms.`)
    if (latencyDriftMs > 120) {
      hints.push('localHeartbeatObserved')
    }
  }

  return {
    protocolHints: Array.from(new Set(hints.length > 0 ? hints : ['unknownPassive'])),
    transportHints: Array.from(new Set(transportHints)),
    passiveEvidence: evidence,
    latencyDriftMs,
  }
}

async function observeDeltacoProtocolForMapping(mapping, { timeoutMs = 500 } = {}) {
  const observedAt = nowIso()
  const firstPass = await Promise.all(
    DELTACO_TUYA_PROTOCOL_PORTS.map((port) => checkTcpReachability(mapping.ip, port, timeoutMs)),
  )
  await new Promise((resolve) => setTimeout(resolve, 120))
  const secondPass = await Promise.all(
    DELTACO_TUYA_PROTOCOL_PORTS.map((port) => checkTcpReachability(mapping.ip, port, timeoutMs)),
  )
  const openPorts = Array.from(new Set([
    ...firstPass.filter((check) => check.reachable).map((check) => check.port),
    ...secondPass.filter((check) => check.reachable).map((check) => check.port),
  ])).sort((left, right) => left - right)
  const reachable = openPorts.length > 0
  const latencySamples = [
    Math.min(...firstPass.map((check) => check.latencyMs)),
    Math.min(...secondPass.map((check) => check.latencyMs)),
  ].filter((value) => Number.isFinite(value))
  const hints = buildDeltacoProtocolHints({ openPorts, latencySamples, reachable })
  const communicationProfile = classifyDeltacoCommunicationProfile({
    openPorts,
    latencyDriftMs: hints.latencyDriftMs,
    reachable,
  })
  const cloudDependencyLikelihood =
    communicationProfile === 'likelyTuyaLan'
      ? 'medium'
      : communicationProfile === 'cloudDominant' || communicationProfile === 'tlsOnly'
        ? 'high'
        : 'unknown'
  const protocolConfidence =
    communicationProfile === 'likelyTuyaLan'
      ? 'medium'
      : openPorts.length > 0
        ? 'low'
        : 'low'

  return {
    deviceId: mapping.deviceId,
    displayName: mapping.displayName,
    provider: 'deltacoTuya',
    ip: mapping.ip,
    mac: mapping.mac ?? null,
    room: mapping.room,
    role: mapping.role,
    physicalOrder: mapping.physicalOrder,
    observedAt,
    protocolHints: hints.protocolHints,
    communicationProfile,
    localActivity: openPorts.length > 0 ? 'tcp-connect-observed' : 'no-local-port-response',
    cloudDependencyLikelihood,
    observedPorts: openPorts,
    observedServices: openPorts.map((port) => ({
      port,
      service:
        [6668, 6667, 6669].includes(port)
          ? 'tuya-lan-candidate'
          : port === 8883
            ? 'tls-mqtt-candidate'
            : port === 443
              ? 'https-candidate'
              : port === 80
                ? 'http-candidate'
                : 'tcp-candidate',
    })),
    transportHints: hints.transportHints,
    protocolConfidence,
    protocolResearchState: 'passive-observed',
    latencySamples,
    latencyDriftMs: hints.latencyDriftMs,
    passiveEvidence: hints.passiveEvidence,
    recommendations: [
      communicationProfile === 'likelyTuyaLan'
        ? 'Tuya LAN research kan vurderes senere, men local key/onboarding må avklares trygt først.'
        : 'Behold som passiv observasjon. Ikke bygg styring før protokoll og mapping er trygg.',
      'Ingen kommandoer, payloads, auth eller local key-ekstraksjon er brukt.',
    ],
  }
}

function buildDeltacoTuyaProvider(
  discoverySnapshot = null,
  sessionLifecycle = null,
  previousOrchestration = null,
  orchestrationRun = false,
  identifySession = null,
  manualMappings = [],
  confirmedMappings = [],
  protocolResearch = null,
) {
  const candidateCount = DELTACO_TUYA_DEVICE_CANDIDATES.length
  const reachableCount = discoverySnapshot?.reachableCount ?? 0
  const missingCount = discoverySnapshot?.missingCount ?? candidateCount
  const hasDiscovery = Boolean(discoverySnapshot?.generatedAt)
  const confirmedCount = confirmedMappings.filter((mapping) => mapping.confirmed).length
  const connectionState = reachableCount > 0 ? 'degraded' : 'foundation'
  const runtimeHealth = reachableCount > 0 ? 'prepared' : 'prepared'
  const onboarding = createOnboardingState({
    provider: 'deltacoTuya',
    configured: true,
    connected: false,
    runtimeReady: false,
    capabilities: ['status', 'reachability', 'switchLater'],
    missingRequirements: [],
    validationErrors: [],
    recommendedNextStep: hasDiscovery
      ? reachableCount > 0
        ? 'Bekreft IP mot fysisk Lampe 1-5 for senere Tuya local-protokoll research.'
        : 'Sjekk at pluggene er på nett og at IP-kandidatene fortsatt stemmer.'
      : 'Kjør read-only discovery for å sjekke LAN reachability. Ingen kommandoer sendes.',
    steps: [
      createStep('manualCandidates', 'Manual candidates registered', true, 'Lampe 1-5 er lagt inn med fysisk rekkefølge i Stue.'),
      createStep('reachabilityScan', 'Reachability scan', hasDiscovery, 'GET /api/integrations/deltacoTuya/discovery kjører trygg TCP-check.'),
      createStep('confirmedMapping', 'Confirmed device identity', confirmedCount > 0, `${confirmedCount} Lampe-mappinger er bekreftet manuelt.`),
      createStep('tuyaProtocol', 'Tuya protocol research', false, 'Local key/protokoll er ikke implementert ennå.'),
      createStep('switchControl', 'Switch control later', false, 'Av/på er eksplisitt ikke aktivert.'),
    ],
  })
  const lifecycle = createLifecycleState({
    status: 'foundation',
    connectionState,
    runtimeHealth,
    configured: true,
    authRequired: false,
    onboarding,
    sessionLifecycle,
    defaultEnabled: false,
    activationAllowed: false,
    requiresConfig: false,
    requiresValidation: true,
    healthReason: hasDiscovery
      ? `${reachableCount}/${candidateCount} Deltaco/Tuya-kandidater svarte på trygg reachability.`
      : 'Deltaco/Tuya er registrert som discovery foundation. Ingen kommandoer er aktive.',
    recommendedAction: hasDiscovery
      ? 'Bruk discovery-resultatet til å verifisere fysisk rekkefølge og IP-er.'
      : 'Kjør read-only discovery når pluggene er på samme LAN.',
  })

  return buildProvider({
    id: 'utility.deltacoTuya',
    provider: 'deltacoTuya',
    category: PROVIDER_CATEGORIES.utility,
    name: 'Deltaco / Tuya lampeplugger',
    status: 'foundation',
    readiness: hasDiscovery
      ? `${reachableCount}/${candidateCount} kandidater reachable · ${confirmedCount} bekreftet`
      : 'Discovery foundation klar',
    authRequired: false,
    configured: true,
    credentials: createCredentialState({ authRequired: false, configured: true }),
    capabilities: ['status', 'reachability', 'switchLater'],
    supportedFeatures: [
      'manual-device-candidates',
      'tcp-reachability-only',
      'physical-order',
      'future-tuya-local-research',
    ],
    maturity: PROVIDER_MATURITY.foundation,
    capabilityClarity: {
      supportsRead: true,
      supportsWrite: false,
      supportsDiscovery: true,
      supportsLifecycle: true,
      sendsCommands: false,
      requiresCredentials: false,
      runtimeConnected: false,
      controlAvailable: false,
      foundationOnly: true,
    },
    runtimeHealth,
    connectionState,
    lastSyncAt: discoverySnapshot?.generatedAt ?? null,
    diagnostics: [
      'Read-only discovery. Ingen Tuya cloud login eller local key/token-jakt.',
      'Ingen av/på-kommandoer er implementert.',
      confirmedCount > 0
        ? `${confirmedCount} Deltaco/Tuya-mappinger er bekreftet som device identity.`
        : 'Ingen Deltaco/Tuya device identity er confirmed ennå.',
      hasDiscovery ? `${missingCount} kandidater ikke bekreftet reachable.` : 'Discovery er ikke kjørt i denne bridge-sessionen.',
    ],
    safeConfig: {
      room: 'Stue',
      type: 'smartPlug',
      role: 'lampPlug',
      control: 'onOffOnly',
      candidateCount,
      reachableCount,
      missingCount,
      lastDiscoveryAt: discoverySnapshot?.generatedAt ?? null,
      discoveryMode: discoverySnapshot?.discoveryMode ?? 'tcp-reachability-only',
      identifySessionActive: Boolean(identifySession),
      identifyTarget: identifySession?.target ?? null,
      manualMappings,
      confirmedMappings,
      confirmedCount,
      protocolResearch,
      protocolResearchState: protocolResearch?.researchState ?? 'notObserved',
      protocolObservedAt: protocolResearch?.generatedAt ?? null,
      unconfirmedCandidates: (discoverySnapshot?.activeCandidates ?? []).filter((candidate) =>
        !confirmedMappings.some((mapping) => mapping.ip === candidate.ip || mapping.physicalOrder === candidate.physicalOrder),
      ),
      candidates: (discoverySnapshot?.candidates ?? DELTACO_TUYA_DEVICE_CANDIDATES).map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        ip: candidate.ip,
        mac: candidate.mac ?? null,
        vendorHint: candidate.vendorHint ?? null,
        hostname: candidate.hostname ?? null,
        classification: candidate.classification ?? 'unknownLanDevice',
        classificationConfidence: candidate.classificationConfidence ?? candidate.confidence ?? 'unknown',
        exclusionReason: candidate.exclusionReason ?? null,
        deviceFamilyHint: candidate.deviceFamilyHint ?? null,
        room: candidate.room,
        role: candidate.role,
        physicalOrder: candidate.physicalOrder,
        reachable: Boolean(candidate.reachable),
        lastSeenAt: candidate.lastSeenAt ?? null,
        latencyMs: candidate.latencyMs ?? null,
        openPorts: candidate.openPorts ?? [],
        confidence: candidate.confidence ?? 'unknown',
        evidence: candidate.evidence ?? [],
        negativeEvidence: candidate.negativeEvidence ?? [],
        likelyTuyaDevice: candidate.likelyTuyaDevice ?? 'unknown',
        recommendedAction: candidate.recommendedAction ?? null,
      })),
      excludedCandidates: (discoverySnapshot?.excludedCandidates ?? []).map((candidate) => ({
        name: candidate.name,
        ip: candidate.ip,
        hostname: candidate.hostname ?? null,
        classification: candidate.classification,
        exclusionReason: candidate.exclusionReason,
        deviceFamilyHint: candidate.deviceFamilyHint,
      })),
      activeCandidates: (discoverySnapshot?.activeCandidates ?? []).map((candidate) => ({
        name: candidate.name,
        ip: candidate.ip,
        physicalOrder: candidate.physicalOrder,
        classification: candidate.classification,
        confidence: candidate.classificationConfidence,
      })),
      recommendedManualMappings: discoverySnapshot?.recommendedManualMappings ?? [],
      needsUserConfirmation: discoverySnapshot?.needsUserConfirmation ?? [],
    },
    onboarding,
    lifecycle,
    orchestration: createRuntimeOrchestrationState({
      provider: 'deltacoTuya',
      lifecycleState: lifecycle.lifecycleState,
      connectionState,
      lastSyncAt: discoverySnapshot?.generatedAt ?? null,
      previous: previousOrchestration,
      orchestrationRun,
    }),
  })
}

function buildFutureProvider(
  id,
  provider,
  category,
  name,
  supportedFeatures,
  sessionLifecycle = null,
  previousOrchestration = null,
  orchestrationRun = false,
) {
  const lifecycle = createLifecycleState({
    status: 'foundation',
    connectionState: 'foundation',
    runtimeHealth: 'prepared',
    configured: false,
    authRequired: false,
    sessionLifecycle,
    defaultEnabled: false,
    activationAllowed: false,
    requiresConfig: true,
    requiresValidation: true,
    healthReason: 'Provider er foundation og kan ikke aktiveres før adapter finnes.',
    recommendedAction: 'Avklar provider/metode før lifecycle-aktivering.',
  })

  return buildProvider({
    id,
    provider,
    category,
    name,
    status: 'foundation',
    readiness: 'Provider-modell er forberedt for senere integrasjon.',
    authRequired: false,
    configured: false,
    credentials: createCredentialState({ authRequired: false, configured: false }),
    capabilities: ['status-foundation'],
    supportedFeatures,
    maturity: PROVIDER_MATURITY.future,
    capabilityClarity: {
      supportsRead: false,
      supportsWrite: false,
      supportsDiscovery: false,
      supportsLifecycle: true,
      sendsCommands: false,
      requiresCredentials: false,
      runtimeConnected: false,
      controlAvailable: false,
      foundationOnly: true,
    },
    runtimeHealth: 'prepared',
    connectionState: 'foundation',
    diagnostics: ['Ingen live adapter er implementert ennå.'],
    lifecycle,
    orchestration: createRuntimeOrchestrationState({
      provider,
      lifecycleState: lifecycle.lifecycleState,
      connectionState: 'foundation',
      previous: previousOrchestration,
      orchestrationRun,
    }),
  })
}

function buildEnergyMeterProvider(
  sessionLifecycle = null,
  previousOrchestration = null,
  orchestrationRun = false,
) {
  const lifecycle = createLifecycleState({
    status: 'foundation',
    connectionState: 'foundation',
    runtimeHealth: 'prepared',
    configured: false,
    authRequired: true,
    sessionLifecycle,
    defaultEnabled: false,
    activationAllowed: false,
    requiresConfig: true,
    requiresValidation: true,
    healthReason: 'Energy Meter er foundation: live måler, leverandør-API og spotpris er ikke koblet til ennå.',
    recommendedAction: 'Velg senere datakilde: Fortum, HAN/AMS, Elhub eller Nord Pool. Ingen credentials lagres nå.',
  })

  return buildProvider({
    id: 'utility.energyMeter',
    provider: 'energyMeter',
    category: PROVIDER_CATEGORIES.utility,
    name: 'Energy Meter Foundation',
    status: 'foundation',
    readiness: 'Foundation for strømdata, spotpris og energiestimater',
    authRequired: true,
    configured: false,
    credentials: createCredentialState({
      authRequired: true,
      configured: false,
      required: ['future-energy-source'],
      missing: ['fortum-or-han-ams-or-elhub-or-nordpool'],
      source: 'future',
    }),
    capabilities: ['status', 'energy-foundation', 'heating-estimate', 'spot-price-foundation'],
    supportedFeatures: [
      'provider-candidates',
      'heating-estimate',
      'spot-price-foundation',
      'no-control',
    ],
    maturity: PROVIDER_MATURITY.foundation,
    capabilityClarity: {
      supportsRead: true,
      supportsWrite: false,
      supportsDiscovery: false,
      supportsLifecycle: true,
      sendsCommands: false,
      requiresCredentials: true,
      runtimeConnected: false,
      controlAvailable: false,
      foundationOnly: true,
    },
    runtimeHealth: 'prepared',
    connectionState: 'foundation',
    diagnostics: [
      'Ingen Fortum-login, scraping eller credentials er aktivert.',
      'HAN/AMS, Elhub og Nord Pool er datakilde-kandidater for senere arbeid.',
      'Energidata er estimat/foundation inntil live måler eller prisfeed finnes.',
    ],
    safeConfig: {
      providerCandidates: ['fortum', 'hanPort', 'elhub', 'nordpool'],
      supportsLivePower: false,
      supportsHourlyConsumption: false,
      supportsSpotPrice: 'foundation',
      currentLiveMeterAvailable: false,
      controlAvailable: false,
      similarHomeBenchmarkAvailable: false,
      autoPollQuietRoomsEnabled: false,
      earthHourDryRun: true,
      possibleKnxBlockSignal: true,
      requiresGroupAddressDesign: true,
      secretsReturned: false,
    },
    lifecycle,
    orchestration: createRuntimeOrchestrationState({
      provider: 'energyMeter',
      lifecycleState: lifecycle.lifecycleState,
      connectionState: 'foundation',
      previous: previousOrchestration,
      orchestrationRun,
    }),
  })
}

function buildCameraNvrProvider(
  sessionLifecycle = null,
  previousOrchestration = null,
  orchestrationRun = false,
) {
  const lifecycle = createLifecycleState({
    status: 'foundation',
    connectionState: 'foundation',
    runtimeHealth: 'prepared',
    configured: false,
    authRequired: true,
    sessionLifecycle,
    defaultEnabled: false,
    activationAllowed: false,
    requiresConfig: true,
    requiresValidation: true,
    healthReason: 'Camera/NVR er foundation: RTSP/ONVIF, lagring og recorder pipeline er ikke aktivert ennå.',
    recommendedAction: 'Legg inn kamera og recorder-target i Manager. Secrets holdes utenfor diagnostics.',
  })

  return buildProvider({
    id: 'camera.nvr',
    provider: 'cameraNvr',
    category: PROVIDER_CATEGORIES.camera,
    name: 'Camera / NVR Foundation',
    status: 'foundation',
    readiness: 'Foundation for IP-kamera, recorder og storage trust',
    authRequired: true,
    configured: false,
    credentials: createCredentialState({
      authRequired: true,
      configured: false,
      required: ['camera-stream-or-onvif-credentials'],
      missing: ['rtsp-or-onvif-source'],
      source: 'manager-config/future-env',
    }),
    capabilities: ['liveStream-foundation', 'snapshot-foundation', 'recording-foundation', 'storage-foundation'],
    supportedFeatures: [
      'rtsp',
      'onvif',
      'tapo-c520ws-foundation',
      'generic-ip-camera',
      'retention-policy',
      'overwrite-oldest',
    ],
    maturity: PROVIDER_MATURITY.foundation,
    capabilityClarity: {
      supportsRead: true,
      supportsWrite: false,
      supportsDiscovery: false,
      supportsLifecycle: true,
      sendsCommands: false,
      requiresCredentials: true,
      runtimeConnected: false,
      controlAvailable: false,
      foundationOnly: true,
    },
    runtimeHealth: 'prepared',
    connectionState: 'foundation',
    diagnostics: [
      'Ingen full NVR recorder pipeline er aktivert.',
      'RTSP/ONVIF/Tapo er configuration foundation og vises uten secrets.',
      'Ingen ML/videoanalyse, cloud upload eller autonomous recording logic er aktivert.',
    ],
    safeConfig: {
      cameraTypes: ['rtsp', 'onvif', 'tapoFoundation', 'genericIpCamera'],
      recorderTargets: ['localDisk', 'externalDisk', 'networkPath'],
      liveStreamDecoding: false,
      recordingEngine: false,
      cloudUpload: false,
      videoMlAnalysis: false,
      secretsReturned: false,
    },
    lifecycle,
    orchestration: createRuntimeOrchestrationState({
      provider: 'cameraNvr',
      lifecycleState: lifecycle.lifecycleState,
      connectionState: 'foundation',
      previous: previousOrchestration,
      orchestrationRun,
    }),
  })
}

export function createIntegrationManager({
  castRuntime,
  mqttRuntime,
  vacuumRuntime,
  providerStateStore = createProviderStateStore(),
} = {}) {
  providerStateStore.ensureReady()
  const restoredProviderState = providerStateStore.restoreAll()
  const sessionConfigByProvider = restoredProviderState.configs
  const sessionLifecycleByProvider = restoredProviderState.lifecycles
  const orchestrationByProvider = restoredProviderState.orchestrations
  const deviceMappingsByProvider = restoredProviderState.deviceMappings
  const protocolResearchByProvider = restoredProviderState.protocolResearch
  let deltacoTuyaDiscoverySnapshot = null
  let deltacoTuyaIdentifySession = null
  const deltacoTuyaManualMappings = new Map()
  let orchestrationTimer = null
  let protocolObservationTimer = null
  let orchestrationStartedAt = null
  let orchestrationLastRunAt = null
  let protocolObservationLastRunAt = null

  async function getProviders({ orchestrationRun = false } = {}) {
    const orchestrationSnapshotAt = nowIso()
    const castStatus = castRuntime?.getStatus?.() ?? null
    const mqttStatus = mqttRuntime?.getStatus?.() ?? null
    const vacuumStatus = vacuumRuntime?.getStatus ? await vacuumRuntime.getStatus() : null
    const providers = [
      buildDreameProvider(
        vacuumStatus,
        sessionConfigByProvider.get('dreameCloud'),
        sessionLifecycleByProvider.get('dreameCloud'),
        orchestrationByProvider.get('dreameCloud'),
        orchestrationRun,
      ),
      buildHomeAssistantVacuumProvider(
        vacuumStatus,
        sessionLifecycleByProvider.get('homeAssistantBridge'),
        orchestrationByProvider.get('homeAssistantBridge'),
        orchestrationRun,
      ),
      buildCastProvider(
        castStatus,
        sessionLifecycleByProvider.get('cast'),
        orchestrationByProvider.get('cast'),
        orchestrationRun,
      ),
      buildMqttProvider(
        mqttStatus,
        sessionLifecycleByProvider.get('mqtt'),
        orchestrationByProvider.get('mqtt'),
        orchestrationRun,
      ),
      buildDeltacoTuyaProvider(
        deltacoTuyaDiscoverySnapshot,
        sessionLifecycleByProvider.get('deltacoTuya'),
        orchestrationByProvider.get('deltacoTuya'),
        orchestrationRun,
        deltacoTuyaIdentifySession,
        Array.from(deltacoTuyaManualMappings.values()),
        deviceMappingsByProvider.get('deltacoTuya') ?? [],
        protocolResearchByProvider.get('deltacoTuya') ?? null,
      ),
      buildEnergyMeterProvider(
        sessionLifecycleByProvider.get('energyMeter'),
        orchestrationByProvider.get('energyMeter'),
        orchestrationRun,
      ),
      buildCameraNvrProvider(
        sessionLifecycleByProvider.get('cameraNvr'),
        orchestrationByProvider.get('cameraNvr'),
        orchestrationRun,
      ),
      buildFutureProvider('media.sonos', 'sonos', PROVIDER_CATEGORIES.media, 'Sonos', [
        'local-discovery',
        'grouping',
        'playback-endpoint',
      ], sessionLifecycleByProvider.get('sonos'), orchestrationByProvider.get('sonos'), orchestrationRun),
      buildFutureProvider('network.deco', 'deco', PROVIDER_CATEGORIES.network, 'Deco WiFi plugger', [
        'device-status',
        'energy',
        'local-or-cloud-api-research',
      ], sessionLifecycleByProvider.get('deco'), orchestrationByProvider.get('deco'), orchestrationRun),
      buildFutureProvider('climate.mill', 'mill', PROVIDER_CATEGORIES.climate, 'Mill WiFi varmeovn', [
        'status-only',
        'temperature',
        'setpoint',
      ], sessionLifecycleByProvider.get('mill'), orchestrationByProvider.get('mill'), orchestrationRun),
      buildFutureProvider('climate.namron', 'namron', PROVIDER_CATEGORIES.climate, 'Namron varmeovn', [
        'status-only',
        'local-or-zigbee-path',
      ], sessionLifecycleByProvider.get('namron'), orchestrationByProvider.get('namron'), orchestrationRun),
    ].map((provider) => ({
      ...provider,
      persistence: providerStateStore.getProviderPersistence(provider.provider),
    }))

    for (const provider of providers) {
      orchestrationByProvider.set(provider.provider, {
        ...provider.orchestration,
        runtimeHeartbeatAt: orchestrationSnapshotAt,
      })
      if (orchestrationRun) {
        providerStateStore.persistOrchestration(provider.provider, provider.orchestration)
      }
    }

    if (orchestrationRun) {
      orchestrationLastRunAt = orchestrationSnapshotAt
    }

    const liveRuntimeCount = providers.filter((provider) => provider.maturity === PROVIDER_MATURITY.liveRuntime).length
    const liveConnectedCount = providers.filter(
      (provider) => provider.maturity === PROVIDER_MATURITY.liveRuntime && provider.runtimeConnected,
    ).length
    const statusOnlyCount = providers.filter((provider) => provider.maturity === PROVIDER_MATURITY.statusOnly).length
    const foundationCount = providers.filter((provider) => provider.maturity === PROVIDER_MATURITY.foundation).length
    const preparedCount = providers.filter((provider) => provider.maturity === PROVIDER_MATURITY.prepared).length
    const futureCount = providers.filter((provider) => provider.maturity === PROVIDER_MATURITY.future).length
    const mockCount = providers.filter((provider) => provider.maturity === PROVIDER_MATURITY.mock).length
    const commandCapableCount = providers.filter((provider) => provider.sendsCommands && provider.controlAvailable).length
    const configuredCount = providers.filter((provider) => provider.configured).length
    const needsAuthCount = providers.filter(
      (provider) => provider.authRequired && !provider.credentials.configured,
    ).length

    return {
      ok: true,
      sourceOfTruth: 'bridge-integration-manager',
      generatedAt: nowIso(),
      credentialPolicy: {
        owner: 'bridge/env',
        frontendReceivesSecrets: false,
        persistence: 'local-encrypted-foundation',
        secureStorage: providerStateStore.policy.encrypted,
        note: 'Frontend får kun configured/missing-status. Secrets returneres aldri.',
      },
      persistencePolicy: {
        ...providerStateStore.policy,
        boot: restoredProviderState.boot,
      },
      lifecyclePolicy: {
        owner: 'bridge/session',
        persistence: 'local-provider-state-foundation',
        runtimeMutation: false,
        actions: false,
        note: 'Enable/activate lagres lokalt som provider-state foundation. Ekte runtime/hardware startes ikke.',
      },
      orchestrationPolicy: {
        owner: 'bridge/orchestrator',
        startedAt: orchestrationStartedAt,
        lastRunAt: orchestrationLastRunAt,
        cadenceMs: DEFAULT_ORCHESTRATION_CADENCE_MS,
        pollingCadenceMs: PROVIDER_POLLING_CADENCE_MS,
        recoveryPolicies: PROVIDER_RECOVERY_POLICIES,
        reconnectEngine: false,
        runtimeMutation: false,
        hardwareAction: false,
        note: 'Orchestrator poller eksisterende statusmetoder og markerer freshness/degraded/recovery-readiness. Den reconnecter ikke.',
      },
      protocolResearchPolicy: {
        provider: 'deltacoTuya',
        owner: 'bridge/protocol-observer',
        cadenceMs: DELTACO_TUYA_PROTOCOL_OBSERVATION_CADENCE_MS,
        lastRunAt: protocolObservationLastRunAt,
        sendsCommands: false,
        payloadsSent: false,
        packetCapture: false,
        note: 'Protocol observer gjør kun lavfrekvent passiv TCP-connect-observasjon for confirmed mappings.',
      },
      counts: {
        providers: providers.length,
        connected: liveConnectedCount,
        liveConnected: liveConnectedCount,
        liveRuntime: liveRuntimeCount,
        statusOnly: statusOnlyCount,
        foundation: foundationCount,
        prepared: preparedCount,
        future: futureCount,
        mock: mockCount,
        commandCapable: commandCapableCount,
        configured: configuredCount,
        needsAuth: needsAuthCount,
      },
      categories: Object.values(PROVIDER_CATEGORIES),
      providers,
      futureFoundation: {
        credentialPersistence: 'future',
        encryptedStorage: 'future',
        multiSite: 'future',
        userPermissions: 'future',
        providerMarketplace: 'future',
        localPlugins: 'future',
        approvalGatedActions: 'future',
        backgroundReconnect: 'future',
        providerRestart: 'future',
        distributedRuntime: 'future',
      },
    }
  }

  async function getProvider(providerId) {
    const snapshot = await getProviders()
    const normalizedProviderId = String(providerId ?? '').trim().toLowerCase()
    const provider = snapshot.providers.find(
      (candidate) =>
        candidate.id.toLowerCase() === normalizedProviderId ||
        candidate.provider.toLowerCase() === normalizedProviderId,
    )

    if (!provider) {
      return {
        ok: false,
        sourceOfTruth: snapshot.sourceOfTruth,
        generatedAt: snapshot.generatedAt,
        error: 'Integration provider not found',
        provider: providerId,
      }
    }

    return {
      ok: true,
      sourceOfTruth: snapshot.sourceOfTruth,
      generatedAt: snapshot.generatedAt,
      provider,
      credentialPolicy: snapshot.credentialPolicy,
      lifecyclePolicy: snapshot.lifecyclePolicy,
      orchestrationPolicy: snapshot.orchestrationPolicy,
      persistencePolicy: snapshot.persistencePolicy,
    }
  }

  async function discoverDeltacoTuya({ deep = false } = {}) {
    const snapshot = await scanDeltacoTuyaCandidates({ deep })
    deltacoTuyaDiscoverySnapshot = snapshot
    const providerSnapshot = await getProvider('deltacoTuya')

    return {
      ...snapshot,
      providerContract: providerSnapshot.provider,
    }
  }

  async function startDeltacoTuyaIdentifySession(payload = {}) {
    const requestedOrder = Number(payload?.physicalOrder ?? payload?.lamp ?? 1)
    const target =
      DELTACO_TUYA_DEVICE_CANDIDATES.find((candidate) => candidate.physicalOrder === requestedOrder) ??
      DELTACO_TUYA_DEVICE_CANDIDATES.find((candidate) => candidate.physicalOrder === 1)
    const baseline = await scanDeltacoTuyaCandidates({ timeoutMs: 650 })
    const startedAt = nowIso()

    deltacoTuyaDiscoverySnapshot = baseline
    deltacoTuyaIdentifySession = {
      id: `deltaco-identify-${Date.now()}`,
      provider: 'deltacoTuya',
      startedAt,
      updatedAt: startedAt,
      target: {
        name: target.name,
        physicalOrder: target.physicalOrder,
        room: target.room,
      },
      baseline,
      latestObservation: null,
      candidateMappings: [],
      manualCandidate: null,
      confirmed: false,
      sendsCommands: false,
      cloudLogin: false,
      localKeys: false,
      instruction: `Slå ${target.name} av/på i Deltaco-appen, og trykk deretter observer på nytt.`,
      notes: [
        'Lynell sender ingen kommandoer til pluggen.',
        'Økten sammenligner ARP/reachability-signaler før og etter manuell toggle.',
        'Mapping lagres kun som foreløpig kandidat, ikke confirmed.',
      ],
    }

    return {
      ok: true,
      sourceOfTruth: 'bridge-integration-manager',
      generatedAt: startedAt,
      session: deltacoTuyaIdentifySession,
    }
  }

  async function observeDeltacoTuyaIdentifySession() {
    if (!deltacoTuyaIdentifySession) {
      return {
        ok: false,
        sourceOfTruth: 'bridge-integration-manager',
        generatedAt: nowIso(),
        error: 'No Deltaco/Tuya identify session is active',
        sendsCommands: false,
        cloudLogin: false,
        localKeys: false,
      }
    }

    const observation = await scanDeltacoTuyaCandidates({ timeoutMs: 650 })
    const correlations = compareDeltacoCandidateSignals(
      deltacoTuyaIdentifySession.baseline,
      observation,
      deltacoTuyaIdentifySession.target,
    )
    const bestCandidate = correlations[0] ?? null
    const manualCandidate = bestCandidate && bestCandidate.score > 0
      ? {
          lampName: deltacoTuyaIdentifySession.target.name,
          physicalOrder: deltacoTuyaIdentifySession.target.physicalOrder,
          candidateIp: bestCandidate.ip,
          candidateMac: bestCandidate.mac,
          confidence: bestCandidate.confidence,
          score: bestCandidate.score,
          confirmed: false,
          status: 'manualCandidate',
          updatedAt: observation.generatedAt,
        }
      : null

    if (manualCandidate) {
      deltacoTuyaManualMappings.set(String(manualCandidate.physicalOrder), manualCandidate)
    }

    deltacoTuyaDiscoverySnapshot = observation
    deltacoTuyaIdentifySession = {
      ...deltacoTuyaIdentifySession,
      updatedAt: observation.generatedAt,
      latestObservation: observation,
      candidateMappings: correlations,
      manualCandidate,
      confirmed: false,
    }

    return {
      ok: true,
      sourceOfTruth: 'bridge-integration-manager',
      generatedAt: observation.generatedAt,
      session: deltacoTuyaIdentifySession,
      correlations,
      manualCandidate,
      sendsCommands: false,
      cloudLogin: false,
      localKeys: false,
    }
  }

  function getDeltacoTuyaIdentifySession() {
    return {
      ok: true,
      sourceOfTruth: 'bridge-integration-manager',
      generatedAt: nowIso(),
      active: Boolean(deltacoTuyaIdentifySession),
      session: deltacoTuyaIdentifySession,
      manualMappings: Array.from(deltacoTuyaManualMappings.values()),
      sendsCommands: false,
      cloudLogin: false,
      localKeys: false,
    }
  }

  function getDeltacoTuyaMappings() {
    const mappings = deviceMappingsByProvider.get('deltacoTuya') ?? []

    return {
      ok: true,
      sourceOfTruth: 'bridge-integration-manager',
      generatedAt: nowIso(),
      provider: 'deltacoTuya',
      mappings,
      confirmedDevices: mappings.filter((mapping) => mapping.confirmed),
      count: mappings.length,
      confirmedCount: mappings.filter((mapping) => mapping.confirmed).length,
      sendsCommands: false,
      cloudLogin: false,
      localKeys: false,
      secretsReturned: false,
      persistence: {
        provider: 'deltacoTuya',
        persisted: mappings.some((mapping) => mapping.persisted),
        owner: 'bridge/provider-state-store',
        runtimeMutated: false,
      },
      notes: [
        'Mappings er device identity, ikke kontroll.',
        'Ingen av/på, Tuya-login eller local keys brukes av mapping-endpointet.',
      ],
    }
  }

  async function confirmDeltacoTuyaMapping(payload = {}) {
    const ip = String(payload?.ip ?? payload?.candidateIp ?? '').trim()
    const physicalOrder = Number(payload?.physicalOrder ?? payload?.lamp ?? 0)
    const displayName = String(payload?.displayName ?? `Lampe ${physicalOrder}`).trim()

    if (!ip || !Number.isInteger(physicalOrder) || physicalOrder < 1 || physicalOrder > 5) {
      return {
        ok: false,
        sourceOfTruth: 'bridge-integration-manager',
        generatedAt: nowIso(),
        provider: 'deltacoTuya',
        error: 'Mapping krever ip og physicalOrder 1-5.',
        sendsCommands: false,
        secretsReturned: false,
      }
    }

    const candidate =
      deltacoTuyaDiscoverySnapshot?.candidates?.find((item) => item.ip === ip) ??
      DELTACO_TUYA_DEVICE_CANDIDATES.find((item) => item.ip === ip)

    if (!candidate) {
      return {
        ok: false,
        sourceOfTruth: 'bridge-integration-manager',
        generatedAt: nowIso(),
        provider: 'deltacoTuya',
        error: 'Kandidat-IP finnes ikke i Deltaco/Tuya candidate foundation.',
        sendsCommands: false,
        secretsReturned: false,
      }
    }

    if (candidate.classification === 'excludedKnownDevice' || candidate.knownDeviceFamily) {
      return {
        ok: false,
        sourceOfTruth: 'bridge-integration-manager',
        generatedAt: nowIso(),
        provider: 'deltacoTuya',
        error: 'Kandidaten er klassifisert som kjent ikke-Tuya-enhet og kan ikke bekreftes som lampeplugg.',
        candidate: {
          ip,
          classification: candidate.classification ?? 'excludedKnownDevice',
          exclusionReason: candidate.exclusionReason ?? candidate.knownDeviceFamily ?? null,
        },
        sendsCommands: false,
        secretsReturned: false,
      }
    }

    const currentMappings = deviceMappingsByProvider.get('deltacoTuya') ?? []
    const mapping = {
      ...createDeltacoMappingFromCandidate(candidate, physicalOrder, [
        `Bekreftet fra kandidat ${ip}.`,
        candidate.classification ? `Classification ved bekreftelse: ${candidate.classification}.` : 'Classification manglet ved bekreftelse.',
      ]),
      displayName,
    }
    const nextMappings = [
      ...currentMappings.filter((item) => item.deviceId !== mapping.deviceId && item.ip !== mapping.ip),
      mapping,
    ].sort((a, b) => Number(a.physicalOrder ?? 99) - Number(b.physicalOrder ?? 99))

    deviceMappingsByProvider.set('deltacoTuya', nextMappings)
    providerStateStore.persistDeviceMappings('deltacoTuya', nextMappings)

    const providerSnapshot = await getProvider('deltacoTuya')

    return {
      ok: true,
      sourceOfTruth: 'bridge-integration-manager',
      generatedAt: mapping.confirmedAt,
      provider: 'deltacoTuya',
      mapping,
      mappings: nextMappings,
      providerContract: providerSnapshot.provider,
      persistence: {
        persisted: true,
        owner: 'bridge/provider-state-store',
      },
      safety: {
        sendsCommands: false,
        cloudLogin: false,
        localKeys: false,
        automations: false,
        runtimeMutated: false,
        secretsReturned: false,
      },
    }
  }

  async function getDeltacoTuyaProtocolResearch() {
    const mappings = (deviceMappingsByProvider.get('deltacoTuya') ?? []).filter((mapping) => mapping.confirmed)
    const generatedAt = nowIso()

    if (mappings.length === 0) {
      const emptySnapshot = {
        ok: true,
        sourceOfTruth: 'bridge-integration-manager',
        generatedAt,
        provider: 'deltacoTuya',
        researchState: 'waitingForConfirmedMappings',
        protocolResearchState: 'waitingForConfirmedMappings',
        observationCadence: 'manual-read-only',
        sendsCommands: false,
        cloudLogin: false,
        localKeys: false,
        payloadsSent: false,
        packetCapture: false,
        secretsReturned: false,
        deviceCount: 0,
        devices: [],
        summary: {
          protocolHints: [],
          communicationProfiles: [],
          cloudDependencyLikelihood: 'unknown',
          confidence: 'low',
        },
        recommendations: [
          'Bekreft Lampe 1-5 mapping før protocol research kjøres.',
        ],
      }
      protocolResearchByProvider.set('deltacoTuya', emptySnapshot)
      providerStateStore.persistProtocolResearch('deltacoTuya', emptySnapshot)

      return emptySnapshot
    }

    const devices = await Promise.all(mappings.map((mapping) => observeDeltacoProtocolForMapping(mapping)))
    const protocolHints = Array.from(new Set(devices.flatMap((device) => device.protocolHints)))
    const communicationProfiles = Array.from(new Set(devices.map((device) => device.communicationProfile)))
    const anyLikelyLan = devices.some((device) => device.communicationProfile === 'likelyTuyaLan')
    const anyTlsOnly = devices.some((device) => device.communicationProfile === 'tlsOnly')
    const cloudDependencyLikelihood = anyLikelyLan ? 'medium' : anyTlsOnly ? 'high' : 'unknown'
    const confidence = anyLikelyLan ? 'medium' : devices.some((device) => device.observedPorts.length > 0) ? 'low' : 'low'
    const snapshot = {
      ok: true,
      sourceOfTruth: 'bridge-integration-manager',
      generatedAt,
      provider: 'deltacoTuya',
      researchState: 'passiveReadOnly',
      protocolResearchState: 'passiveReadOnly',
      observationCadence: 'manual-read-only-low-load',
      sendsCommands: false,
      cloudLogin: false,
      localKeys: false,
      payloadsSent: false,
      packetCapture: false,
      secretsReturned: false,
      deviceCount: devices.length,
      devices,
      summary: {
        protocolHints,
        communicationProfiles,
        cloudDependencyLikelihood,
        confidence,
        observedPorts: Array.from(new Set(devices.flatMap((device) => device.observedPorts))).sort((left, right) => left - right),
      },
      recommendations: [
        anyLikelyLan
          ? 'Tuya LAN-port er observert på minst en bekreftet enhet. Neste steg er protokollresearch uten styring.'
          : 'Ingen sikker Tuya LAN-port er bekreftet. Fortsett med passiv observasjon og cloud/local-metodeavklaring.',
        'Ikke bygg av/på-path før mapping, local key-strategi og sikker kommandomodell er avklart.',
      ],
    }

    protocolResearchByProvider.set('deltacoTuya', snapshot)
    providerStateStore.persistProtocolResearch('deltacoTuya', snapshot)
    protocolObservationLastRunAt = generatedAt

    const providerSnapshot = await getProvider('deltacoTuya')

    return {
      ...snapshot,
      providerContract: providerSnapshot.provider,
    }
  }

  async function updateProviderConfig(providerId, patch = {}) {
    const normalizedProviderId = String(providerId ?? '').trim()
    const normalizedLookup = normalizedProviderId.toLowerCase()
    const currentSnapshot = await getProviders()
    const existingProvider = currentSnapshot.providers.find(
      (candidate) =>
        candidate.id.toLowerCase() === normalizedLookup ||
        candidate.provider.toLowerCase() === normalizedLookup,
    )

    if (!existingProvider) {
      return {
        ok: false,
        sourceOfTruth: currentSnapshot.sourceOfTruth,
        generatedAt: currentSnapshot.generatedAt,
        error: 'Integration provider not found',
        provider: providerId,
      }
    }

    const sanitizedPatch = sanitizeProviderConfigPatch(existingProvider.provider, patch)
    const currentConfig = sessionConfigByProvider.get(existingProvider.provider) ?? {
      safeConfig: {},
      secretPresence: {},
      acceptedFields: [],
      updatedAt: null,
    }

    const nextConfig = {
      safeConfig: {
        ...currentConfig.safeConfig,
        ...sanitizedPatch.safeConfig,
      },
      secretPresence: {
        ...currentConfig.secretPresence,
        ...sanitizedPatch.secretPresence,
      },
      acceptedFields: Array.from(
        new Set([...(currentConfig.acceptedFields ?? []), ...sanitizedPatch.acceptedFields]),
      ),
      updatedAt: sanitizedPatch.updatedAt,
      persisted: true,
    }

    sessionConfigByProvider.set(existingProvider.provider, nextConfig)
    providerStateStore.persistConfig(existingProvider.provider, nextConfig)
    const secretPersistResult = providerStateStore.persistSecrets(
      existingProvider.provider,
      sanitizedPatch.secretValues,
    )

    const nextProvider = await getProvider(existingProvider.provider)

    return {
      ok: true,
      sourceOfTruth: currentSnapshot.sourceOfTruth,
      generatedAt: nowIso(),
      provider: nextProvider.provider,
      update: {
        acceptedFields: sanitizedPatch.acceptedFields,
        secretsAcceptedAsPresenceOnly: Object.keys(sanitizedPatch.secretPresence),
        persisted: true,
        persistence: true,
        encryptedCredentialsUpdated: secretPersistResult.fields ?? [],
        credentialEncryptionOk: secretPersistResult.ok || (secretPersistResult.fields ?? []).length === 0,
        runtimeMutated: false,
        secretsReturned: false,
        note: 'Config lagres som lokal provider-state foundation. Secrets krypteres server-side og returneres ikke.',
      },
      credentialPolicy: currentSnapshot.credentialPolicy,
      persistencePolicy: currentSnapshot.persistencePolicy,
    }
  }

  async function updateProviderLifecycle(providerId, action) {
    const normalizedAction = String(action ?? '').trim()
    const allowedActions = new Set(['enable', 'disable', 'activate', 'deactivate'])

    if (!allowedActions.has(normalizedAction)) {
      return {
        ok: false,
        sourceOfTruth: 'bridge-integration-manager',
        generatedAt: nowIso(),
        error: 'Unsupported lifecycle action',
        action: normalizedAction,
        provider: providerId,
      }
    }

    const normalizedProviderId = String(providerId ?? '').trim()
    const normalizedLookup = normalizedProviderId.toLowerCase()
    const currentSnapshot = await getProviders()
    const existingProvider = currentSnapshot.providers.find(
      (candidate) =>
        candidate.id.toLowerCase() === normalizedLookup ||
        candidate.provider.toLowerCase() === normalizedLookup,
    )

    if (!existingProvider) {
      return {
        ok: false,
        sourceOfTruth: currentSnapshot.sourceOfTruth,
        generatedAt: currentSnapshot.generatedAt,
        error: 'Integration provider not found',
        provider: providerId,
      }
    }

    const previousLifecycle = sessionLifecycleByProvider.get(existingProvider.provider) ?? {}
    const changedAt = nowIso()
    const nextLifecycle = {
      ...previousLifecycle,
      lastLifecycleChangeAt: changedAt,
    }
    let accepted = true
    let reason = 'Lifecycle foundation oppdatert.'

    if (normalizedAction === 'enable') {
      nextLifecycle.enabled = true
      nextLifecycle.activationRequestedAt = null
      reason = 'Provider er enabled i session-lifecycle. Runtime er ikke mutert.'
    }

    if (normalizedAction === 'disable') {
      nextLifecycle.enabled = false
      nextLifecycle.activationRequestedAt = null
      reason = 'Provider er disabled i session-lifecycle. Runtime er ikke stoppet.'
    }

    if (normalizedAction === 'activate') {
      nextLifecycle.enabled = true
      if (!existingProvider.lifecycle?.canActivate) {
        accepted = false
        reason = existingProvider.lifecycle?.healthReason ?? 'Provider er ikke klar for aktivering.'
      } else {
        nextLifecycle.activationRequestedAt = changedAt
        reason = 'Aktivering er validert som lifecycle-signal. Ingen fysisk handling ble sendt.'
      }
    }

    if (normalizedAction === 'deactivate') {
      nextLifecycle.activationRequestedAt = null
      reason = 'Aktivering er fjernet fra lifecycle foundation. Runtime er ikke stoppet.'
    }

    if (accepted) {
      sessionLifecycleByProvider.set(existingProvider.provider, nextLifecycle)
      providerStateStore.persistLifecycle(existingProvider.provider, nextLifecycle)
    }

    const nextProvider = await getProvider(existingProvider.provider)

    return {
      ok: accepted,
      sourceOfTruth: currentSnapshot.sourceOfTruth,
      generatedAt: changedAt,
      provider: nextProvider.provider,
      lifecycleAction: {
        action: normalizedAction,
        accepted,
        reason,
        persisted: false,
        runtimeMutated: false,
        secretsReturned: false,
        hardwareAction: false,
        automations: false,
      },
      lifecyclePolicy: currentSnapshot.lifecyclePolicy,
      persistencePolicy: currentSnapshot.persistencePolicy,
    }
  }

  async function runOrchestrationTick() {
    try {
      await getProviders({ orchestrationRun: true })
    } catch (error) {
      console.log('[Bridge] Integration orchestration tick failed', {
        error: error instanceof Error ? error.message : String(error),
        runtimeMutation: false,
        hardwareAction: false,
      })
    }
  }

  async function runDeltacoProtocolObservationTick() {
    const mappings = (deviceMappingsByProvider.get('deltacoTuya') ?? []).filter((mapping) => mapping.confirmed)

    if (mappings.length === 0) {
      return
    }

    try {
      await getDeltacoTuyaProtocolResearch()
    } catch (error) {
      console.log('[Bridge] Deltaco/Tuya protocol observation failed', {
        error: error instanceof Error ? error.message : String(error),
        sendsCommands: false,
        payloadsSent: false,
        hardwareAction: false,
      })
    }
  }

  function startOrchestration() {
    if (orchestrationTimer) {
      return
    }

    orchestrationStartedAt = nowIso()
    void runOrchestrationTick()
    orchestrationTimer = setInterval(runOrchestrationTick, DEFAULT_ORCHESTRATION_CADENCE_MS)
    if (typeof orchestrationTimer.unref === 'function') {
      orchestrationTimer.unref()
    }
  }

  startOrchestration()

  protocolObservationTimer = setInterval(
    runDeltacoProtocolObservationTick,
    DELTACO_TUYA_PROTOCOL_OBSERVATION_CADENCE_MS,
  )
  if (typeof protocolObservationTimer.unref === 'function') {
    protocolObservationTimer.unref()
  }

  return {
    getProvider,
    getProviders,
    discoverDeltacoTuya,
    startDeltacoTuyaIdentifySession,
    observeDeltacoTuyaIdentifySession,
    getDeltacoTuyaIdentifySession,
    getDeltacoTuyaMappings,
    confirmDeltacoTuyaMapping,
    getDeltacoTuyaProtocolResearch,
    updateProviderLifecycle,
    updateProviderConfig,
  }
}
