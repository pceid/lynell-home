import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEFAULT_STATE_ROOT = resolve(__dirname, '.lynell-state', 'integration-os')
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'

function nowIso() {
  return new Date().toISOString()
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

function safeReadJson(filePath, fallback = null) {
  try {
    if (!existsSync(filePath)) {
      return fallback
    }

    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.tmp`
  const serialized = `${JSON.stringify(value, null, 2)}\n`

  writeFileSync(tempPath, serialized, 'utf8')
  try {
    renameSync(tempPath, filePath)
  } catch (error) {
    if (error?.code !== 'EPERM') {
      throw error
    }

    writeFileSync(filePath, serialized, 'utf8')
    try {
      unlinkSync(tempPath)
    } catch {
      // Best-effort cleanup only. The target file has already been written.
    }
  }
}

function normalizeProviderId(provider) {
  return String(provider ?? '').trim()
}

function deriveKeyFromEnv() {
  const rawKey = process.env.LYNELL_INTEGRATION_MASTER_KEY

  if (!rawKey) {
    return null
  }

  return createHash('sha256').update(rawKey).digest()
}

function createEncryptedPayload(value, key) {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(String(value ?? ''), 'utf8'),
    cipher.final(),
  ])

  return {
    algorithm: ENCRYPTION_ALGORITHM,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    updatedAt: nowIso(),
  }
}

function decryptPayload(payload, key) {
  const decipher = createDecipheriv(
    payload.algorithm ?? ENCRYPTION_ALGORITHM,
    key,
    Buffer.from(payload.iv, 'base64'),
  )
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'))

  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

export function createProviderStateStore({
  stateRoot = process.env.LYNELL_INTEGRATION_STATE_DIR || DEFAULT_STATE_ROOT,
} = {}) {
  const root = resolve(stateRoot)
  const paths = {
    root,
    providers: join(root, 'providers'),
    credentials: join(root, 'credentials'),
    runtime: join(root, 'runtime'),
    orchestration: join(root, 'orchestration'),
  }
  const keyPath = join(paths.credentials, '.local-key')
  const boot = {
    restoredAt: nowIso(),
    ok: true,
    errors: [],
  }
  let ready = false
  let encryptionKey = null
  let encryptionSource = 'unavailable'

  function ensureReady() {
    if (ready) {
      return
    }

    try {
      for (const path of Object.values(paths)) {
        mkdirSync(path, { recursive: true })
      }

      const envKey = deriveKeyFromEnv()
      if (envKey) {
        encryptionKey = envKey
        encryptionSource = 'env'
      } else if (existsSync(keyPath)) {
        encryptionKey = Buffer.from(readFileSync(keyPath, 'utf8').trim(), 'base64')
        encryptionSource = 'local-key-file'
      } else {
        encryptionKey = randomBytes(32)
        writeFileSync(keyPath, encryptionKey.toString('base64'), 'utf8')
        try {
          chmodSync(keyPath, 0o600)
        } catch {
          // Windows may ignore chmod. The key still stays server-side only.
        }
        encryptionSource = 'generated-local-key-file'
      }
    } catch (error) {
      boot.ok = false
      boot.errors.push(error instanceof Error ? error.message : String(error))
      encryptionKey = null
      encryptionSource = 'unavailable'
    }

    ready = true
  }

  function providerFile(provider) {
    return join(paths.providers, `${normalizeProviderId(provider)}.json`)
  }

  function credentialFile(provider) {
    return join(paths.credentials, `${normalizeProviderId(provider)}.json`)
  }

  function getProviderPersistence(provider) {
    const normalizedProvider = normalizeProviderId(provider)
    const providerState = safeReadJson(providerFile(normalizedProvider), {})
    const credentialState = safeReadJson(credentialFile(normalizedProvider), {})
    const encryptedFields = Object.keys(credentialState?.fields ?? {})

    return {
      persisted: Boolean(providerState?.updatedAt || encryptedFields.length > 0),
      restored: Boolean(providerState?.restoredAt || providerState?.updatedAt || encryptedFields.length > 0),
      restoredAt: boot.restoredAt,
      storageRoot: root,
      encryptedCredentials: encryptedFields.length > 0,
      encryptedFieldCount: encryptedFields.length,
      secureLocalStorage: Boolean(encryptionKey),
      encryption: {
        enabled: Boolean(encryptionKey),
        algorithm: ENCRYPTION_ALGORITHM,
        localOnly: true,
        source: encryptionSource,
        failClosed: !encryptionKey,
      },
      diagnostics: {
        bootOk: boot.ok,
        errors: boot.errors.slice(0, 3),
      },
    }
  }

  function restoreAll() {
    const providerFiles = safeReadJson(join(paths.runtime, 'provider-index.json'), {
      providers: [],
    })
    const providerIds = Array.isArray(providerFiles.providers) ? providerFiles.providers : []
    const configs = new Map()
    const lifecycles = new Map()
    const orchestrations = new Map()
    const deviceMappings = new Map()
    const protocolResearch = new Map()

    for (const provider of providerIds) {
      const state = safeReadJson(providerFile(provider), null)
      if (!state) {
        continue
      }

      const credentialValidation = validateCredentials(provider)
      const secretPresence = credentialValidation.ok
        ? Object.fromEntries(credentialValidation.fields.map((field) => [field, true]))
        : {}

      configs.set(provider, {
        safeConfig: state.safeConfig ?? {},
        secretPresence: {
          ...(state.secretPresence ?? {}),
          ...secretPresence,
        },
        acceptedFields: state.acceptedFields ?? [],
        updatedAt: state.updatedAt ?? null,
        restoredAt: boot.restoredAt,
        persisted: true,
        credentialValidation,
      })

      if (state.lifecycle) {
        lifecycles.set(provider, {
          ...state.lifecycle,
          restoredAt: boot.restoredAt,
          persisted: true,
        })
      }

      if (state.orchestration) {
        orchestrations.set(provider, {
          ...state.orchestration,
          restoredAt: boot.restoredAt,
          persisted: true,
        })
      }

      if (Array.isArray(state.deviceMappings)) {
        deviceMappings.set(provider, state.deviceMappings.map((mapping) => ({
          ...mapping,
          restoredAt: boot.restoredAt,
          persisted: true,
        })))
      }

      if (state.protocolResearch) {
        protocolResearch.set(provider, {
          ...state.protocolResearch,
          restoredAt: boot.restoredAt,
          persisted: true,
        })
      }
    }

    return {
      configs,
      lifecycles,
      orchestrations,
      deviceMappings,
      protocolResearch,
      boot: cloneJson(boot),
    }
  }

  function persistProviderIndex(provider) {
    const indexPath = join(paths.runtime, 'provider-index.json')
    const current = safeReadJson(indexPath, { providers: [] })
    const providers = Array.from(new Set([...(current.providers ?? []), provider])).sort()
    writeJsonAtomic(indexPath, {
      providers,
      updatedAt: nowIso(),
    })
  }

  function persistProviderState(provider, statePatch = {}) {
    const normalizedProvider = normalizeProviderId(provider)
    if (!normalizedProvider) {
      return
    }

    const current = safeReadJson(providerFile(normalizedProvider), {})
    writeJsonAtomic(providerFile(normalizedProvider), {
      ...current,
      ...statePatch,
      provider: normalizedProvider,
      updatedAt: nowIso(),
    })
    persistProviderIndex(normalizedProvider)
  }

  function persistConfig(provider, config) {
    persistProviderState(provider, {
      safeConfig: config.safeConfig ?? {},
      secretPresence: config.secretPresence ?? {},
      acceptedFields: config.acceptedFields ?? [],
      configUpdatedAt: config.updatedAt ?? nowIso(),
    })
  }

  function persistLifecycle(provider, lifecycle) {
    persistProviderState(provider, {
      lifecycle,
      lifecycleUpdatedAt: nowIso(),
    })
  }

  function persistOrchestration(provider, orchestration) {
    persistProviderState(provider, {
      orchestration: {
        runtimeHeartbeatAt: orchestration?.runtimeHeartbeatAt ?? null,
        lastSuccessfulContactAt: orchestration?.lastSuccessfulContactAt ?? null,
        stale: Boolean(orchestration?.stale),
        reconnectRecommended: Boolean(orchestration?.reconnectRecommended),
        reconnectAttempts: Number(orchestration?.reconnectAttempts ?? 0),
        runtimeLatency: orchestration?.runtimeLatency ?? null,
        pollingCadence: orchestration?.pollingCadence ?? null,
        degradedReason: orchestration?.degradedReason ?? null,
        recoveryState: orchestration?.recoveryState ?? 'stable',
        recoveryAttempts: Number(orchestration?.recoveryAttempts ?? orchestration?.reconnectAttempts ?? 0),
        recoveryBackoffMs: orchestration?.recoveryBackoffMs ?? null,
        nextRecoveryAttemptAt: orchestration?.nextRecoveryAttemptAt ?? null,
        recoveryEligible: Boolean(orchestration?.recoveryEligible),
        recoveryBlocked: Boolean(orchestration?.recoveryBlocked),
        recoveryReason: orchestration?.recoveryReason ?? null,
        recoveryPolicy: orchestration?.recoveryPolicy ?? null,
        recoveryCooldownUntil: orchestration?.recoveryCooldownUntil ?? null,
        recoveredAt: orchestration?.recoveredAt ?? null,
      },
      orchestrationUpdatedAt: nowIso(),
    })
  }

  function persistDeviceMappings(provider, mappings = []) {
    persistProviderState(provider, {
      deviceMappings: Array.isArray(mappings) ? mappings.map((mapping) => ({
        deviceId: mapping.deviceId,
        displayName: mapping.displayName,
        provider: mapping.provider,
        room: mapping.room,
        role: mapping.role,
        physicalOrder: mapping.physicalOrder ?? null,
        ip: mapping.ip,
        mac: mapping.mac ?? null,
        confirmed: Boolean(mapping.confirmed),
        confirmedAt: mapping.confirmedAt ?? null,
        confidence: mapping.confidence ?? 'low',
        source: mapping.source ?? 'manual-confirmation',
        notes: mapping.notes ?? [],
        lifecycleOwner: mapping.lifecycleOwner ?? 'bridge/integration-manager',
        orchestrationOwner: mapping.orchestrationOwner ?? 'bridge/orchestrator',
        evidence: mapping.evidence ?? [],
        classification: mapping.classification ?? null,
        updatedAt: mapping.updatedAt ?? nowIso(),
      })) : [],
      deviceMappingsUpdatedAt: nowIso(),
    })
  }

  function persistProtocolResearch(provider, protocolResearch) {
    persistProviderState(provider, {
      protocolResearch: protocolResearch ?? null,
      protocolResearchUpdatedAt: nowIso(),
    })
  }

  function persistSecrets(provider, secretValues = {}) {
    const normalizedProvider = normalizeProviderId(provider)
    if (!normalizedProvider || !encryptionKey) {
      return {
        ok: false,
        encrypted: false,
        fields: [],
        error: 'Credential encryption is unavailable',
      }
    }

    const current = safeReadJson(credentialFile(normalizedProvider), {
      provider: normalizedProvider,
      fields: {},
    })
    const nextFields = { ...(current.fields ?? {}) }
    const fields = []

    for (const [field, value] of Object.entries(secretValues ?? {})) {
      if (!String(value ?? '').length) {
        continue
      }

      nextFields[field] = createEncryptedPayload(value, encryptionKey)
      fields.push(field)
    }

    writeJsonAtomic(credentialFile(normalizedProvider), {
      provider: normalizedProvider,
      fields: nextFields,
      encrypted: true,
      updatedAt: nowIso(),
    })
    persistProviderIndex(normalizedProvider)

    return {
      ok: true,
      encrypted: true,
      fields,
    }
  }

  function validateCredentials(provider) {
    const normalizedProvider = normalizeProviderId(provider)
    const credentialState = safeReadJson(credentialFile(normalizedProvider), null)

    if (!credentialState?.fields) {
      return {
        ok: true,
        configured: false,
        fields: [],
        error: null,
      }
    }

    if (!encryptionKey) {
      return {
        ok: false,
        configured: false,
        fields: [],
        error: 'Credential key unavailable',
      }
    }

    try {
      const fields = Object.entries(credentialState.fields)
        .filter(([, payload]) => decryptPayload(payload, encryptionKey).length > 0)
        .map(([field]) => field)

      return {
        ok: true,
        configured: fields.length > 0,
        fields,
        error: null,
      }
    } catch {
      return {
        ok: false,
        configured: false,
        fields: [],
        error: 'Credential decrypt failed',
      }
    }
  }

  return {
    ensureReady,
    getProviderPersistence,
    persistConfig,
    persistDeviceMappings,
    persistLifecycle,
    persistOrchestration,
    persistProtocolResearch,
    persistSecrets,
    restoreAll,
    validateCredentials,
    policy: {
      owner: 'bridge/provider-state-store',
      persistence: true,
      encrypted: true,
      localOnly: true,
      root,
      structure: {
        providers: paths.providers,
        credentials: paths.credentials,
        runtime: paths.runtime,
        orchestration: paths.orchestration,
      },
      credentialsExposedToFrontend: false,
      credentialsLogged: false,
      failClosed: true,
    },
  }
}
