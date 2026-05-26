import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_HISTORY_LIMIT = 720
const DEFAULT_POINT_LIMIT = 2500
const DEFAULT_HEARTBEAT_MS = 60_000
const DEFAULT_PERSISTENCE_DIR = join(dirname(fileURLToPath(import.meta.url)), '.lynell-state', 'runtime-history')
const PERSISTENCE_COMPACT_EVERY_WRITES = 50
const HISTORY_CATEGORIES = ['climate', 'atmosphere', 'runtime', 'media', 'vacuum']
const HISTORY_RANGES = {
  lastHour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
}
const CATEGORY_CADENCE_MS = {
  climate: 60_000,
  runtime: 60_000,
  media: 5 * 60_000,
  vacuum: 2 * 60_000,
  atmosphere: 5 * 60_000,
}
const INSIGHT_TYPES = [
  'comfortDrift',
  'unstableRoom',
  'staleRuntime',
  'unusualActivity',
  'atmosphereShift',
  'inactiveRoom',
  'highHeatDemand',
]

function nowIso() {
  return new Date().toISOString()
}

function toFiniteNumber(value) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

function readJsonFile(filePath, fallback = null) {
  try {
    if (!existsSync(filePath)) {
      return fallback
    }

    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

function readJsonLinesFile(filePath) {
  try {
    if (!existsSync(filePath)) {
      return []
    }

    return readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line)
        } catch {
          return null
        }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

function writeJsonFile(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function appendJsonLineFile(filePath, value) {
  appendFileSync(filePath, `${JSON.stringify(value)}\n`, 'utf8')
}

function writeJsonLinesFile(filePath, values) {
  writeFileSync(filePath, values.map((value) => JSON.stringify(value)).join('\n') + '\n', 'utf8')
}

function createCategoryCollections() {
  return Object.fromEntries(HISTORY_CATEGORIES.map((category) => [category, []]))
}

function normalizeCategory(category) {
  return HISTORY_CATEGORIES.includes(category) ? category : 'runtime'
}

function inferCategoryFromSource(source) {
  const normalizedSource = String(source ?? '').toLowerCase()

  if (normalizedSource.includes('climate') || normalizedSource.includes('heat')) {
    return 'climate'
  }

  if (normalizedSource.includes('cast') || normalizedSource.includes('media')) {
    return 'media'
  }

  if (normalizedSource.includes('vacuum') || normalizedSource.includes('dreame')) {
    return 'vacuum'
  }

  if (normalizedSource.includes('atmosphere') || normalizedSource.includes('presence')) {
    return 'atmosphere'
  }

  return 'runtime'
}

function classifyHistorySource(point) {
  const source = String(point?.source ?? '').toLowerCase()
  const responseSource = String(point?.responseSource ?? '').toLowerCase()
  if (point?.restored || source.includes('restored')) {
    return 'restoredHistory'
  }
  if (responseSource.includes('groupvalueresponse') || source.includes('groupvalueresponse')) {
    return 'groupValueResponse'
  }
  if (source.includes('manualpoll')) {
    return 'manualPoll'
  }
  if (source.includes('knx-subscription') || source.includes('liveknx')) {
    return 'liveKnx'
  }
  if (source.includes('climate-query') || source.includes('query') || source.includes('derived')) {
    return 'derivedQuery'
  }
  if (source.includes('aggregate') || source.includes('summary')) {
    return 'aggregate'
  }
  if (source.includes('snapshot') || source.includes('reference')) {
    return 'roomSnapshotReference'
  }
  if (source.includes('fallback')) {
    return 'frontendFallback'
  }
  if (source.includes('simulate')) {
    return 'simulate'
  }
  if (source.includes('demo')) {
    return 'demo'
  }
  return 'unknown'
}

function getHistorySourceDistribution(points) {
  return points.reduce(
    (distribution, point) => {
      const category = classifyHistorySource(point)
      distribution[category] = (distribution[category] ?? 0) + 1
      return distribution
    },
    {
      liveKnx: 0,
      manualPoll: 0,
      groupValueResponse: 0,
      restoredHistory: 0,
      roomSnapshotReference: 0,
      frontendFallback: 0,
      derivedQuery: 0,
      aggregate: 0,
      demo: 0,
      simulate: 0,
      unknown: 0,
    },
  )
}

function trimCollection(collection, limit) {
  if (collection.length > limit) {
    collection.splice(0, collection.length - limit)
  }
}

function getRangeWindow(range = 'day') {
  const key = Object.hasOwn(HISTORY_RANGES, range) ? range : 'day'
  const to = Date.now()
  const from = to - HISTORY_RANGES[key]

  return {
    key,
    from,
    to,
    fromIso: new Date(from).toISOString(),
    toIso: new Date(to).toISOString(),
    durationMs: HISTORY_RANGES[key],
  }
}

function summarizeNumericPoints(points) {
  const values = points.map((point) => Number(point.value)).filter(Number.isFinite)

  if (values.length === 0) {
    return {
      avg: null,
      min: null,
      max: null,
      count: 0,
      confidence: 'low',
    }
  }

  const sum = values.reduce((total, value) => total + value, 0)

  return {
    avg: Number((sum / values.length).toFixed(2)),
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length,
    confidence: values.length >= 12 ? 'high' : values.length >= 3 ? 'medium' : 'low',
  }
}

function summarizeInsightConfidence(pointCount, fallback = 'low') {
  if (pointCount >= 12) {
    return 'high'
  }

  if (pointCount >= 3) {
    return 'medium'
  }

  return fallback
}

function createInsight({
  type,
  severity = 'low',
  confidence = 'low',
  roomId = null,
  roomLabel = null,
  title,
  summary,
  source,
  observationWindow = 'server-runtime',
  signals = [],
}) {
  const safeType = INSIGHT_TYPES.includes(type) ? type : 'staleRuntime'
  const target = roomId ? `-${roomId}` : ''

  return {
    id: `niva-${safeType}${target}-${observationWindow}`,
    timestamp: Date.now(),
    at: nowIso(),
    type: safeType,
    severity,
    confidence,
    roomId,
    roomLabel,
    title,
    summary,
    source,
    observationWindow,
    signals,
  }
}

function summarizeIntegration(kind, payload) {
  if (!payload) {
    return `${kind}: no snapshot`
  }

  if (kind === 'cast') {
    const deviceCount = Array.isArray(payload.devices) ? payload.devices.length : 0
    return payload.enabled
      ? `Cast ${payload.state ?? 'enabled'} · ${deviceCount} devices`
      : 'Cast disabled'
  }

  if (kind === 'vacuum') {
    return payload.connected
      ? `Vacuum ${payload.provider ?? 'provider'} connected`
      : `Vacuum ${payload.state ?? 'not connected'}`
  }

  if (kind === 'mqtt') {
    return payload.connected
      ? `MQTT ${payload.state ?? 'connected'}`
      : `MQTT ${payload.state ?? 'not connected'}`
  }

  return `${kind}: snapshot`
}

function createEmptySnapshot(startedAt) {
  return {
    server: {
      startedAt,
      updatedAt: startedAt,
      uptimeMs: 0,
      sourceOfTruth: 'bridge-runtime-store',
    },
    runtime: {
      configReceived: false,
      connectionMode: null,
      writeMappingCounts: {
        light: 0,
        dim: 0,
        climate: 0,
      },
      lightSubscribeActive: false,
      climateSubscribeActive: false,
    },
    rooms: {},
    media: {
      cast: null,
      playback: null,
    },
    vacuum: null,
    mqtt: null,
    atmosphere: {
      label: 'Server runtime foundation',
      summary: 'Serveren samler delt runtime-state når signaler kommer inn.',
      updatedAt: startedAt,
    },
    runtimeContracts: [],
  }
}

function upsertRoom(snapshot, roomKey, label) {
  const safeRoomKey = String(roomKey ?? '').trim()
  if (!safeRoomKey) {
    return null
  }

  const existing = snapshot.rooms[safeRoomKey] ?? {
    roomKey: safeRoomKey,
    label: label || safeRoomKey,
    zones: {},
    climate: {},
    updatedAt: null,
  }

  snapshot.rooms[safeRoomKey] = {
    ...existing,
    label: label || existing.label,
    updatedAt: nowIso(),
  }

  return snapshot.rooms[safeRoomKey]
}

export function createRuntimeStateStore({
  historyLimit = DEFAULT_HISTORY_LIMIT,
  pointLimit = DEFAULT_POINT_LIMIT,
  heartbeatMs = DEFAULT_HEARTBEAT_MS,
  persistenceDir = process.env.LYNELL_RUNTIME_HISTORY_DIR || DEFAULT_PERSISTENCE_DIR,
} = {}) {
  const startedAt = nowIso()
  const snapshot = createEmptySnapshot(startedAt)
  const history = []
  const historyPoints = []
  const historyByCategory = createCategoryCollections()
  const pointsByCategory = createCategoryCollections()
  const lastCategorySnapshotAt = Object.fromEntries(
    HISTORY_CATEGORIES.map((category) => [category, 0]),
  )
  let sequence = 0
  let heartbeatTimer = null
  let persistenceTimer = null
  let persistenceWritesSinceCompact = 0
  const persistence = {
    enabled: true,
    restored: false,
    restoredEvents: 0,
    restoredPoints: 0,
    restoredRooms: 0,
    restoredAt: null,
    storagePath: persistenceDir,
    lastFlushAt: null,
    lastCompactAt: null,
    lastError: null,
    pendingWrites: 0,
    files: {
      events: join(persistenceDir, 'history-events.jsonl'),
      points: join(persistenceDir, 'history-points.jsonl'),
      snapshots: join(persistenceDir, 'snapshots.json'),
      metadata: join(persistenceDir, 'metadata.json'),
    },
    retention: {
      maxEvents: historyLimit,
      maxPoints: pointLimit,
      database: false,
      rotation: 'compact-jsonl',
    },
  }

  function ensurePersistenceDir() {
    if (!persistence.enabled) {
      return false
    }

    try {
      mkdirSync(persistenceDir, { recursive: true })
      return true
    } catch (error) {
      persistence.enabled = false
      persistence.lastError = error instanceof Error ? error.message : 'Could not create runtime-history directory'
      return false
    }
  }

  function getPersistenceStatus() {
    return {
      enabled: persistence.enabled,
      restored: persistence.restored,
      restoredEvents: persistence.restoredEvents,
      restoredPoints: persistence.restoredPoints,
      restoredRooms: persistence.restoredRooms,
      restoredAt: persistence.restoredAt,
      storagePath: persistence.storagePath,
      lastFlushAt: persistence.lastFlushAt,
      lastCompactAt: persistence.lastCompactAt,
      lastError: persistence.lastError,
      pendingWrites: persistence.pendingWrites,
      files: persistence.files,
      retention: persistence.retention,
    }
  }

  function compactPersistence() {
    if (!ensurePersistenceDir()) {
      return
    }

    try {
      writeJsonLinesFile(persistence.files.events, history.slice(-historyLimit))
      writeJsonLinesFile(persistence.files.points, historyPoints.slice(-pointLimit))
      persistSnapshotMetadata()
      persistence.lastFlushAt = nowIso()
      persistence.lastCompactAt = persistence.lastFlushAt
      persistence.pendingWrites = 0
      persistenceWritesSinceCompact = 0
      persistence.lastError = null
    } catch (error) {
      persistence.lastError = error instanceof Error ? error.message : 'Could not persist runtime history'
    }
  }

  function persistSnapshotMetadata() {
    if (!ensurePersistenceDir()) {
      return
    }

    writeJsonFile(persistence.files.snapshots, {
      generatedAt: nowIso(),
      rooms: snapshot.rooms,
      media: snapshot.media,
      vacuum: snapshot.vacuum,
      mqtt: snapshot.mqtt,
      atmosphere: snapshot.atmosphere,
    })
    writeJsonFile(persistence.files.metadata, {
      generatedAt: nowIso(),
      sourceOfTruth: snapshot.server.sourceOfTruth,
      counts: getHistoryCategoryCounts(),
      ranges: getRangeMetadata(),
      retention: persistence.retention,
    })
    persistence.lastFlushAt = nowIso()
  }

  function appendPersistentRecord(kind, value) {
    if (!ensurePersistenceDir()) {
      return
    }

    try {
      appendJsonLineFile(kind === 'point' ? persistence.files.points : persistence.files.events, value)
      persistSnapshotMetadata()
      persistence.lastError = null
    } catch (error) {
      persistence.lastError = error instanceof Error ? error.message : 'Could not append runtime history'
    }
  }

  function schedulePersistenceFlush(forceCompact = false) {
    if (!persistence.enabled) {
      return
    }

    persistence.pendingWrites += 1
    persistenceWritesSinceCompact += 1

    if (forceCompact || persistenceWritesSinceCompact >= PERSISTENCE_COMPACT_EVERY_WRITES) {
      compactPersistence()
      return
    }

    if (persistenceTimer) {
      return
    }

    persistenceTimer = setTimeout(() => {
      persistenceTimer = null
      compactPersistence()
    }, 5000)

    if (typeof persistenceTimer.unref === 'function') {
      persistenceTimer.unref()
    }
  }

  function restorePersistence() {
    if (!ensurePersistenceDir()) {
      return
    }

    try {
      const restoredEvents = readJsonLinesFile(persistence.files.events)
        .filter((entry) => Number.isFinite(Number(entry?.timestamp)))
        .slice(-historyLimit)
        .map((entry) => ({ ...entry, persisted: true, restored: true }))
      const restoredPoints = readJsonLinesFile(persistence.files.points)
        .filter((point) => Number.isFinite(Number(point?.timestamp)))
        .slice(-pointLimit)
        .map((point) => ({ ...point, persisted: true, restored: true }))
      const restoredSnapshot = readJsonFile(persistence.files.snapshots, null)

      for (const entry of restoredEvents) {
        const category = normalizeCategory(entry.category ?? inferCategoryFromSource(entry.source))
        history.push({ ...entry, category })
        historyByCategory[category].push({ ...entry, category })
      }

      for (const point of restoredPoints) {
        const category = normalizeCategory(point.category ?? inferCategoryFromSource(point.source))
        historyPoints.push({ ...point, category })
        pointsByCategory[category].push({ ...point, category })
      }

      if (restoredSnapshot && typeof restoredSnapshot === 'object') {
        snapshot.rooms = restoredSnapshot.rooms && typeof restoredSnapshot.rooms === 'object'
          ? restoredSnapshot.rooms
          : snapshot.rooms
        snapshot.media = restoredSnapshot.media && typeof restoredSnapshot.media === 'object'
          ? restoredSnapshot.media
          : snapshot.media
        snapshot.vacuum = restoredSnapshot.vacuum ?? snapshot.vacuum
        snapshot.mqtt = restoredSnapshot.mqtt ?? snapshot.mqtt
        snapshot.atmosphere = restoredSnapshot.atmosphere && typeof restoredSnapshot.atmosphere === 'object'
          ? restoredSnapshot.atmosphere
          : snapshot.atmosphere
      }

      persistence.restored = restoredEvents.length > 0 || restoredPoints.length > 0 || Boolean(restoredSnapshot)
      persistence.restoredEvents = restoredEvents.length
      persistence.restoredPoints = restoredPoints.length
      persistence.restoredRooms = Object.keys(snapshot.rooms).length
      persistence.restoredAt = persistence.restored ? nowIso() : null
      persistence.lastError = null
      compactPersistence()
    } catch (error) {
      persistence.lastError = error instanceof Error ? error.message : 'Could not restore runtime history'
    }
  }

  function touch() {
    snapshot.server.updatedAt = nowIso()
    snapshot.server.uptimeMs = Date.now() - Date.parse(startedAt)
    sequence += 1
  }

  function shouldRecordCategory(category, timestamp = Date.now()) {
    const normalizedCategory = normalizeCategory(category)
    const cadenceMs = CATEGORY_CADENCE_MS[normalizedCategory] ?? DEFAULT_HEARTBEAT_MS
    const lastTimestamp = lastCategorySnapshotAt[normalizedCategory] ?? 0

    if (timestamp - lastTimestamp < cadenceMs) {
      return false
    }

    lastCategorySnapshotAt[normalizedCategory] = timestamp
    return true
  }

  function pushHistory(entry) {
    const timestamp = Date.now()
    const category = normalizeCategory(entry.category ?? inferCategoryFromSource(entry.source))
    const nextEntry = {
      id: `server-history-${Date.now()}-${sequence}`,
      timestamp,
      at: nowIso(),
      category,
      confidence: entry.confidence ?? 'medium',
      ...entry,
    }

    history.push(nextEntry)
    historyByCategory[category].push(nextEntry)
    if (history.length > historyLimit) {
      history.splice(0, history.length - historyLimit)
    }
    trimCollection(historyByCategory[category], historyLimit)
    appendPersistentRecord('event', nextEntry)
    schedulePersistenceFlush()
  }

  function pushHistoryPoint(point) {
    const timestamp = Date.now()
    const category = normalizeCategory(point.category ?? inferCategoryFromSource(point.source))
    const nextPoint = {
      timestamp,
      at: new Date(timestamp).toISOString(),
      category,
      confidence: point.confidence ?? 'medium',
      roomId: point.roomId ?? point.roomKey ?? null,
      ...point,
    }

    historyPoints.push(nextPoint)
    pointsByCategory[category].push(nextPoint)
    if (historyPoints.length > pointLimit) {
      historyPoints.splice(0, historyPoints.length - pointLimit)
    }
    trimCollection(pointsByCategory[category], pointLimit)
    appendPersistentRecord('point', nextPoint)
    schedulePersistenceFlush()
  }

  function getHistoryCategoryCounts() {
    return Object.fromEntries(
      HISTORY_CATEGORIES.map((category) => [
        category,
        {
          events: historyByCategory[category].length,
          points: pointsByCategory[category].length,
          oldestAt:
            historyByCategory[category][0]?.at ??
            pointsByCategory[category][0]?.at ??
            null,
          newestAt:
            historyByCategory[category][historyByCategory[category].length - 1]?.at ??
            pointsByCategory[category][pointsByCategory[category].length - 1]?.at ??
            null,
        },
      ]),
    )
  }

  function getRangeMetadata() {
    return Object.fromEntries(
      Object.keys(HISTORY_RANGES).map((rangeKey) => {
        const range = getRangeWindow(rangeKey)
        const pointCounts = Object.fromEntries(
          HISTORY_CATEGORIES.map((category) => [
            category,
            pointsByCategory[category].filter(
              (point) => point.timestamp >= range.from && point.timestamp <= range.to,
            ).length,
          ]),
        )

        return [
          rangeKey,
          {
            ...range,
            sparse: Object.values(pointCounts).every((count) => count === 0),
            pointCounts,
            expectedCadenceMs: CATEGORY_CADENCE_MS,
          },
        ]
      }),
    )
  }

  function getRateMetadata() {
    const now = Date.now()
    const hourStart = now - HISTORY_RANGES.lastHour

    return Object.fromEntries(
      HISTORY_CATEGORIES.map((category) => {
        const pointsLastHour = pointsByCategory[category].filter(
          (point) => point.timestamp >= hourStart,
        ).length
        const eventsLastHour = historyByCategory[category].filter(
          (entry) => entry.timestamp >= hourStart,
        ).length

        return [
          category,
          {
            eventsLastHour,
            pointsLastHour,
            approximatePointsPerHour: pointsLastHour,
            cadenceMs: CATEGORY_CADENCE_MS[category],
          },
        ]
      }),
    )
  }

  function getRoomSummary() {
    const rooms = Object.values(snapshot.rooms)
    const activeLightRooms = rooms.filter((room) =>
      Object.values(room.zones).some((zone) => zone.lightOn || Number(zone.brightness ?? 0) > 0),
    ).length
    const climateRooms = rooms.filter((room) => Object.keys(room.climate).length > 0).length

    return {
      roomCount: rooms.length,
      activeLightRooms,
      climateRooms,
      roomsWithSignals: rooms
        .filter((room) => room.updatedAt)
        .map((room) => ({
          roomKey: room.roomKey,
          label: room.label,
          updatedAt: room.updatedAt,
        })),
    }
  }

  function getRoomSnapshots() {
    const currentTime = Date.now()

    return Object.values(snapshot.rooms).map((room) => {
      const climate = room.climate ?? {}
      const zones = Object.values(room.zones ?? {})
      const currentTemperature = toFiniteNumber(climate.temperature?.value)
      const targetTemperature = toFiniteNumber(climate.setpoint?.value)
      const heatDemand = toFiniteNumber(climate.heatDemand?.value)
      const brightnessValues = zones
        .map((zone) => toFiniteNumber(zone.brightness))
        .filter((value) => value !== null)
      const averageBrightness =
        brightnessValues.length > 0
          ? brightnessValues.reduce((sum, value) => sum + value, 0) / brightnessValues.length
          : null
      const lightActive = zones.some((zone) => zone.lightOn === true || Number(zone.brightness ?? 0) > 0)
      const lastUpdatedAt = room.updatedAt ?? null
      const lastUpdatedMs = lastUpdatedAt ? currentTime - Date.parse(lastUpdatedAt) : Infinity
      const runtimeConfidence =
        lastUpdatedMs <= 5 * 60_000
          ? 'high'
          : lastUpdatedMs <= 30 * 60_000
            ? 'medium'
            : 'low'
      const comfortState =
        currentTemperature === null || targetTemperature === null
          ? 'missing'
          : Math.abs(currentTemperature - targetTemperature) <= 0.5
            ? 'comfortable'
            : currentTemperature < targetTemperature
              ? 'cool'
              : 'warm'
      const activityLevel =
        lightActive || Number(averageBrightness ?? 0) >= 20
          ? 'active'
          : lastUpdatedMs <= 15 * 60_000
            ? 'present'
            : 'quiet'

      return {
        roomKey: room.roomKey,
        roomId: room.roomKey,
        label: room.label,
        currentTemperature,
        targetTemperature,
        heatDemand,
        comfortState,
        lightState: lightActive ? 'on' : zones.length > 0 ? 'off' : 'unknown',
        averageBrightness:
          averageBrightness === null ? null : Number(averageBrightness.toFixed(1)),
        activityLevel,
        runtimeConfidence,
        lastUpdatedAt,
        latestDatapoints: {
          climate,
          zones,
        },
      }
    })
  }

  function getAggregates() {
    const aggregates = Object.fromEntries(
      Object.keys(HISTORY_RANGES).map((rangeKey) => {
        const range = getRangeWindow(rangeKey)
        const categories = Object.fromEntries(
          HISTORY_CATEGORIES.map((category) => {
            const points = pointsByCategory[category].filter(
              (point) => point.timestamp >= range.from && point.timestamp <= range.to,
            )
            const fieldGroups = new Map()
            const roomGroups = new Map()

            for (const point of points) {
              const fieldKey = String(point.field ?? 'value')
              const roomKey = String(point.roomKey ?? point.roomId ?? 'house')
              fieldGroups.set(fieldKey, [...(fieldGroups.get(fieldKey) ?? []), point])
              roomGroups.set(roomKey, [...(roomGroups.get(roomKey) ?? []), point])
            }

            return [
              category,
              {
                ...summarizeNumericPoints(points),
                sparse: points.length === 0,
                fields: Object.fromEntries(
                  Array.from(fieldGroups.entries()).map(([field, fieldPoints]) => [
                    field,
                    summarizeNumericPoints(fieldPoints),
                  ]),
                ),
                rooms: Object.fromEntries(
                  Array.from(roomGroups.entries()).map(([roomKey, roomPoints]) => [
                    roomKey,
                    summarizeNumericPoints(roomPoints),
                  ]),
                ),
              },
            ]
          }),
        )

        return [
          rangeKey,
          {
            range,
            sparse: Object.values(categories).every((aggregate) => aggregate.count === 0),
            categories,
          },
        ]
      }),
    )

    return {
      ok: true,
      sourceOfTruth: snapshot.server.sourceOfTruth,
      generatedAt: nowIso(),
      cadence: {
        heartbeatMs,
        categories: CATEGORY_CADENCE_MS,
      },
      persistence: getPersistenceStatus(),
      roomSnapshots: getRoomSnapshots(),
      aggregates,
      sparseHandling: {
        ranges: Object.keys(HISTORY_RANGES),
        emptyWindowsRemainVisible: true,
        fakeDatapoints: false,
      },
      analysisFoundation: {
        comfortDrift: 'prepared',
        unstableRooms: 'prepared',
        abnormalEnergyUsage: 'prepared',
        activityRhythm: 'prepared',
        atmosphereShifts: 'prepared',
      },
    }
  }

  function getRoomFieldPoints(roomKey, field, rangeKey = 'day') {
    const range = getRangeWindow(rangeKey)

    return pointsByCategory.climate.filter(
      (point) =>
        point.timestamp >= range.from &&
        point.timestamp <= range.to &&
        point.roomKey === roomKey &&
        point.field === field,
    )
  }

  function getRuntimeInsights({ limit = 12 } = {}) {
    const roomSnapshots = getRoomSnapshots()
    const aggregates = getAggregates()
    const insights = []
    const currentTime = Date.now()
    const latestHistory = history[history.length - 1] ?? null
    const latestHistoryAgeMs = latestHistory ? currentTime - latestHistory.timestamp : Infinity
    const dayAggregate = aggregates.aggregates.day
    const weekAggregate = aggregates.aggregates.week

    if (!snapshot.runtime.configReceived) {
      insights.push(
        createInsight({
          type: 'staleRuntime',
          severity: 'medium',
          confidence: 'medium',
          title: 'Serveren venter på runtime-config',
          summary: 'NIVA har server-store klart, men appen har ikke synket runtime-config ennå.',
          source: 'runtime-store',
          observationWindow: 'now',
          signals: [
            { key: 'runtimeConfigReceived', value: false },
            { key: 'sourceOfTruth', value: snapshot.server.sourceOfTruth },
          ],
        }),
      )
    } else if (latestHistoryAgeMs > heartbeatMs * 3) {
      insights.push(
        createInsight({
          type: 'staleRuntime',
          severity: 'low',
          confidence: 'medium',
          title: 'Runtime-signalet er litt stille',
          summary: 'Det kan tyde på at huset bare er stabilt, men siste server-event er eldre enn forventet.',
          source: 'runtime-history',
          observationWindow: 'lastHeartbeat',
          signals: [
            { key: 'latestHistoryAgeMs', value: latestHistoryAgeMs },
            { key: 'heartbeatMs', value: heartbeatMs },
          ],
        }),
      )
    }

    for (const room of roomSnapshots) {
      const temperaturePoints = getRoomFieldPoints(room.roomKey, 'temperature', 'lastHour')
      const heatDemandDayPoints = getRoomFieldPoints(room.roomKey, 'heatDemand', 'day')
      const temperatureSummary = summarizeNumericPoints(temperaturePoints)
      const heatDemandSummary = summarizeNumericPoints(heatDemandDayPoints)
      const temperatureSpread =
        temperatureSummary.max !== null && temperatureSummary.min !== null
          ? Number((temperatureSummary.max - temperatureSummary.min).toFixed(2))
          : null
      const staleMs = room.lastUpdatedAt ? currentTime - Date.parse(room.lastUpdatedAt) : Infinity
      const confidence = summarizeInsightConfidence(
        Math.max(temperatureSummary.count, heatDemandSummary.count),
        room.runtimeConfidence === 'high' ? 'medium' : 'low',
      )

      if (typeof room.heatDemand === 'number' && room.heatDemand >= 70) {
        insights.push(
          createInsight({
            type: 'highHeatDemand',
            severity: room.heatDemand >= 85 ? 'medium' : 'low',
            confidence: room.runtimeConfidence === 'low' ? 'low' : 'medium',
            roomId: room.roomId,
            roomLabel: room.label,
            title: `${room.label} bruker mye varme`,
            summary:
              room.runtimeConfidence === 'low'
                ? `${room.label} kan ha høyt varmebehov, men signalet bygger på siste kjente state.`
                : `${room.label} har høyt varmebehov akkurat nå.`,
            source: 'room-snapshot',
            observationWindow: 'now',
            signals: [
              { key: 'heatDemand', value: room.heatDemand },
              { key: 'runtimeConfidence', value: room.runtimeConfidence },
            ],
          }),
        )
      }

      if (heatDemandSummary.avg !== null && heatDemandSummary.avg >= 55 && heatDemandSummary.count >= 3) {
        insights.push(
          createInsight({
            type: 'comfortDrift',
            severity: heatDemandSummary.avg >= 70 ? 'medium' : 'low',
            confidence,
            roomId: room.roomId,
            roomLabel: room.label,
            title: `${room.label} har hatt jevnt varmebehov`,
            summary:
              confidence === 'low'
                ? `${room.label} kan ha hatt litt høy varmeaktivitet, men datagrunnlaget er tynt.`
                : `${room.label} har ligget med høyere varmeaktivitet gjennom dagen.`,
            source: 'climate-aggregate',
            observationWindow: 'day',
            signals: [
              { key: 'avgHeatDemand', value: heatDemandSummary.avg },
              { key: 'count', value: heatDemandSummary.count },
            ],
          }),
        )
      }

      if (temperatureSpread !== null && temperatureSpread >= 1.2 && temperatureSummary.count >= 3) {
        insights.push(
          createInsight({
            type: 'unstableRoom',
            severity: temperatureSpread >= 2 ? 'medium' : 'low',
            confidence,
            roomId: room.roomId,
            roomLabel: room.label,
            title: `${room.label} har variert i temperatur`,
            summary:
              confidence === 'low'
                ? `${room.label} kan ha litt ujevn temperatur, men jeg trenger mer historikk.`
                : `${room.label} har variert mer enn resten av grunnlaget den siste timen.`,
            source: 'climate-history',
            observationWindow: 'lastHour',
            signals: [
              { key: 'temperatureSpread', value: temperatureSpread },
              { key: 'count', value: temperatureSummary.count },
            ],
          }),
        )
      }

      if (room.runtimeConfidence === 'low' && staleMs > 30 * 60_000) {
        insights.push(
          createInsight({
            type: 'inactiveRoom',
            severity: 'low',
            confidence: 'medium',
            roomId: room.roomId,
            roomLabel: room.label,
            title: `${room.label} har få nye signaler`,
            summary: `${room.label} har ikke oppdatert romstatus på en stund.`,
            source: 'room-snapshot',
            observationWindow: 'day',
            signals: [
              { key: 'lastUpdatedAt', value: room.lastUpdatedAt },
              { key: 'staleMs', value: Number.isFinite(staleMs) ? staleMs : null },
            ],
          }),
        )
      }
    }

    const runtimeLastHour = aggregates.aggregates.lastHour.categories.runtime
    const runtimeDay = dayAggregate.categories.runtime
    const runtimeWeek = weekAggregate.categories.runtime
    const dayHourlyPace = runtimeDay.count / 24
    const weekHourlyPace = runtimeWeek.count / (7 * 24)

    if (
      runtimeLastHour.count >= 4 &&
      ((dayHourlyPace > 0 && runtimeLastHour.count > dayHourlyPace * 2.2) ||
        (weekHourlyPace > 0 && runtimeLastHour.count > weekHourlyPace * 2.5))
    ) {
      insights.push(
        createInsight({
          type: 'unusualActivity',
          severity: 'low',
          confidence: summarizeInsightConfidence(runtimeLastHour.count),
          title: 'Aktiviteten er litt høyere enn vanlig',
          summary: 'Huset har hatt flere runtime-signaler den siste timen enn resten av historikken antyder.',
          source: 'runtime-aggregate',
          observationWindow: 'lastHour',
          signals: [
            { key: 'lastHourRuntimePoints', value: runtimeLastHour.count },
            { key: 'dayHourlyPace', value: Number(dayHourlyPace.toFixed(2)) },
            { key: 'weekHourlyPace', value: Number(weekHourlyPace.toFixed(2)) },
          ],
        }),
      )
    }

    const atmosphereLastHour = aggregates.aggregates.lastHour.categories.atmosphere
    const atmosphereDay = dayAggregate.categories.atmosphere

    if (!atmosphereLastHour.sparse && atmosphereDay.count > 0 && atmosphereLastHour.count >= 2) {
      insights.push(
        createInsight({
          type: 'atmosphereShift',
          severity: 'low',
          confidence: summarizeInsightConfidence(atmosphereLastHour.count),
          title: 'Atmosfæren har nye signaler',
          summary: 'NIVA ser flere oppdateringer i hjemmets atmosfæregrunnlag den siste timen.',
          source: 'atmosphere-aggregate',
          observationWindow: 'lastHour',
          signals: [
            { key: 'lastHourAtmospherePoints', value: atmosphereLastHour.count },
            { key: 'dayAtmospherePoints', value: atmosphereDay.count },
          ],
        }),
      )
    }

    const sortedInsights = insights
      .sort((a, b) => {
        const severityRank = { high: 3, medium: 2, low: 1 }
        const confidenceRank = { high: 3, medium: 2, low: 1 }
        const severityDiff =
          (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0)
        if (severityDiff !== 0) {
          return severityDiff
        }

        return (confidenceRank[b.confidence] ?? 0) - (confidenceRank[a.confidence] ?? 0)
      })
      .slice(0, Math.max(1, Math.min(Number(limit) || 12, 25)))

    return {
      ok: true,
      sourceOfTruth: snapshot.server.sourceOfTruth,
      generatedAt: nowIso(),
      model: {
        kind: 'heuristic',
        aiMl: false,
        readOnly: true,
        actions: false,
        automations: false,
      },
      sparse: historyPoints.length === 0,
      insightCount: sortedInsights.length,
      insightTypes: INSIGHT_TYPES,
      insights: sortedInsights,
      signals: {
        roomSnapshotCount: roomSnapshots.length,
        historyPointCount: historyPoints.length,
        historyEventCount: history.length,
        latestHistoryAt: latestHistory?.at ?? null,
        ranges: getRangeMetadata(),
      },
      futureFoundation: {
        anomalyDetection: 'future',
        comfortOptimization: 'future',
        energyBehavior: 'future',
        adaptiveSuggestions: 'future',
      },
    }
  }

  function getSummary() {
    const roomSummary = getRoomSummary()
    const connectedIntegrations = [
      snapshot.media.cast?.enabled ? 'cast' : null,
      snapshot.vacuum?.connected ? 'vacuum' : null,
      snapshot.mqtt?.connected ? 'mqtt' : null,
    ].filter(Boolean)

    return {
      ok: true,
      sourceOfTruth: snapshot.server.sourceOfTruth,
      startedAt: snapshot.server.startedAt,
      updatedAt: snapshot.server.updatedAt,
      uptimeMs: snapshot.server.uptimeMs,
      runtimeConfigReceived: snapshot.runtime.configReceived,
      connectionMode: snapshot.runtime.connectionMode,
      historySampleCount: history.length,
      historyPointCount: historyPoints.length,
      snapshotCadenceMs: heartbeatMs,
      cadence: {
        heartbeatMs,
        categories: CATEGORY_CADENCE_MS,
      },
      categoryCounts: getHistoryCategoryCounts(),
      ranges: getRangeMetadata(),
      persistence: getPersistenceStatus(),
      roomSummary,
      roomSnapshotCount: getRoomSnapshots().length,
      connectedIntegrations,
      atmosphere: snapshot.atmosphere,
      latestHistory: history[history.length - 1] ?? null,
    }
  }

  function recordRuntimeConfig(config, health = {}) {
    touch()
    snapshot.runtime = {
      configReceived: Boolean(config),
      connectionMode: config?.connectionMode ?? null,
      writeMappingCounts: health.writeMappingCounts ?? snapshot.runtime.writeMappingCounts,
      lightSubscribeActive: Boolean(health.lightSubscribeActive),
      climateSubscribeActive: Boolean(health.climateSubscribeActive),
    }
    pushHistory({
      source: 'runtime-config',
      category: 'runtime',
      confidence: 'high',
      summary: config
        ? `Runtime config received · ${config.connectionMode ?? 'unknown'}`
        : 'Runtime config missing',
      snapshot: {
        runtime: snapshot.runtime,
        rooms: getRoomSummary(),
      },
    })
  }

  function recordHealth(health) {
    touch()
    snapshot.runtime = {
      ...snapshot.runtime,
      configReceived: Boolean(health?.runtimeConfigReceived),
      connectionMode: health?.connectionMode ?? snapshot.runtime.connectionMode,
      writeMappingCounts: health?.writeMappingCounts ?? snapshot.runtime.writeMappingCounts,
      lightSubscribeActive: Boolean(health?.lightSubscribeActive),
      climateSubscribeActive: Boolean(health?.climateSubscribeActive),
    }
  }

  function recordLightFeedback(payload, source = 'light-feedback') {
    if (!payload) {
      return
    }

    touch()
    const room = upsertRoom(snapshot, payload.room, payload.room)
    if (!room) {
      return
    }

    const zoneKey = String(payload.zone ?? 'zone').trim() || 'zone'
    const existingZone = room.zones[zoneKey] ?? {}
    const explicitBrightness = toFiniteNumber(payload.brightness)
    const lightOn =
      typeof payload.lightOn === 'boolean'
        ? payload.lightOn
        : typeof existingZone.lightOn === 'boolean'
          ? existingZone.lightOn
          : null
    const brightness =
      explicitBrightness ??
      (payload.lightOn === false
        ? 0
        : toFiniteNumber(existingZone.brightness) ??
          (payload.lightOn === true ? 100 : null))

    room.zones[zoneKey] = {
      ...existingZone,
      zoneKey,
      label: payload.label ?? existingZone.label ?? zoneKey,
      lightOn,
      brightness,
      updatedAt: snapshot.server.updatedAt,
      source,
      lightSource: typeof payload.lightOn === 'boolean' ? source : existingZone.lightSource ?? null,
      brightnessSource: explicitBrightness !== null ? source : existingZone.brightnessSource ?? null,
      lightGroupAddress:
        typeof payload.lightOn === 'boolean'
          ? payload.address ?? null
          : existingZone.lightGroupAddress ?? null,
      brightnessGroupAddress:
        explicitBrightness !== null
          ? payload.address ?? null
          : existingZone.brightnessGroupAddress ?? null,
      dpt: payload.dpt ?? existingZone.dpt ?? null,
      dataType: payload.dataType ?? existingZone.dataType ?? null,
      mappingVariant: payload.mappingVariant ?? existingZone.mappingVariant ?? null,
      responseSource: payload.responseSource ?? existingZone.responseSource ?? null,
    }

      if (brightness !== null) {
      pushHistoryPoint({
        roomKey: room.roomKey,
        zoneKey,
        field: 'brightness',
        value: brightness,
        category: 'runtime',
        confidence: source.includes('subscribe') ? 'high' : 'medium',
        source,
        groupAddress: payload.address ?? null,
        dpt: payload.dpt ?? payload.dataType ?? null,
        dataType: payload.dataType ?? null,
        mappingVariant: payload.mappingVariant ?? null,
        responseSource: payload.responseSource ?? null,
      })
    }

    pushHistory({
      source,
      category: 'runtime',
      confidence: source.includes('subscribe') ? 'high' : 'medium',
      summary: `Light feedback · ${room.label} · ${zoneKey}`,
      snapshot: {
        rooms: getRoomSummary(),
      },
    })
  }

  function recordClimateFeedback(payload, source = 'climate-feedback') {
    if (!payload) {
      return
    }

    touch()
    const room = upsertRoom(snapshot, payload.roomKey, payload.roomKey)
    if (!room) {
      return
    }

    const fieldMap = {
      temperature: 'temperature',
      setpointFeedback: 'setpoint',
      heatDemand: 'heatDemand',
      modeFeedback: 'mode',
    }
    const normalizedField = fieldMap[payload.field] ?? payload.field
    const numericValue = toFiniteNumber(payload.mappedValue)

    room.climate[normalizedField] = {
      value: numericValue ?? payload.mappedValue ?? null,
      source,
      mappingVariant: payload.mappingVariant ?? null,
      groupAddress: payload.address ?? payload.groupAddress ?? null,
      dpt: payload.dpt ?? payload.dataType ?? null,
      dataType: payload.dataType ?? null,
      responseSource: payload.responseSource ?? null,
      updatedAt: snapshot.server.updatedAt,
    }

    if (
      numericValue !== null &&
      ['temperature', 'setpoint', 'heatDemand'].includes(normalizedField)
    ) {
      pushHistoryPoint({
        roomKey: room.roomKey,
        field: normalizedField,
        value: numericValue,
        category: 'climate',
        confidence: source.includes('subscribe') ? 'high' : 'medium',
        source,
        groupAddress: payload.address ?? payload.groupAddress ?? null,
        dpt: payload.dpt ?? payload.dataType ?? null,
        dataType: payload.dataType ?? null,
        mappingVariant: payload.mappingVariant ?? null,
        responseSource: payload.responseSource ?? null,
      })
    }

    pushHistory({
      source,
      category: 'climate',
      confidence: source.includes('subscribe') ? 'high' : 'medium',
      summary: `Climate feedback · ${room.label} · ${normalizedField}`,
      snapshot: {
        rooms: getRoomSummary(),
      },
    })
  }

  function recordClimateTemperatureQuery(payload, result) {
    if (!result?.ok) {
      return
    }

    const roomKey = String(payload?.room ?? payload?.roomKey ?? result.room ?? '').trim()
    const room = upsertRoom(snapshot, roomKey, result.room ?? roomKey)
    if (!room) {
      return
    }

    touch()
    const fields = [
      ['temperature', result.temperature],
      ['setpoint', result.setpoint],
      ['heatDemand', result.heatDemand],
    ]

    for (const [field, value] of fields) {
      const numericValue = toFiniteNumber(value)
      if (numericValue === null) {
        continue
      }

      room.climate[field] = {
        value: numericValue,
        source: 'climate-query',
        sourceType: 'derivedQuery',
        confidence: 'low',
        updatedAt: snapshot.server.updatedAt,
      }
    }

    pushHistory({
      source: 'climate-query',
      category: 'climate',
      confidence: 'low',
      summary: `Climate query · ${room.label}`,
      snapshot: {
        rooms: getRoomSummary(),
      },
    })
  }

  function recordCustomSignalFeedback(payload, source = 'custom-signal') {
    if (!payload) {
      return
    }

    touch()
    const room = payload.roomKey ? upsertRoom(snapshot, payload.roomKey, payload.roomKey) : null
    const numericValue = toFiniteNumber(payload.mappedValue)
    const field = `customSignal:${payload.id ?? payload.groupAddress ?? 'signal'}`

    if (room) {
      room.customSignals = {
        ...(room.customSignals ?? {}),
        [payload.id ?? payload.groupAddress]: {
          id: payload.id ?? null,
          name: payload.name ?? payload.groupAddress,
          category: payload.category ?? 'custom',
          value: numericValue ?? payload.mappedValue ?? null,
          groupAddress: payload.groupAddress ?? null,
          dpt: payload.dpt ?? null,
          dataType: payload.dataType ?? null,
          source,
          mappingVariant: payload.mappingVariant ?? null,
          updatedAt: snapshot.server.updatedAt,
        },
      }
    }

    if (numericValue !== null) {
      pushHistoryPoint({
        roomKey: payload.roomKey ?? null,
        field,
        value: numericValue,
        category: 'runtime',
        confidence: source.includes('subscription') ? 'high' : 'medium',
        source,
        groupAddress: payload.groupAddress ?? null,
        dpt: payload.dpt ?? payload.dataType ?? null,
        mappingVariant: payload.mappingVariant ?? null,
        signalName: payload.name ?? null,
        signalCategory: payload.category ?? 'custom',
      })
    }

    pushHistory({
      source,
      category: 'runtime',
      confidence: source.includes('subscription') ? 'high' : 'medium',
      summary: `Custom signal · ${payload.name ?? payload.groupAddress ?? 'signal'}`,
      snapshot: {
        rooms: getRoomSummary(),
      },
    })
  }

  function recordIntegrationSnapshot(kind, payload) {
    touch()

    if (kind === 'cast') {
      snapshot.media.cast = payload
      snapshot.media.playback = payload?.playback ?? snapshot.media.playback
    } else if (kind === 'cast-playback') {
      snapshot.media.playback = payload
    } else if (kind === 'vacuum') {
      snapshot.vacuum = payload
    } else if (kind === 'mqtt') {
      snapshot.mqtt = payload
    }

    pushHistory({
      source: kind,
      category:
        kind === 'cast' || kind === 'cast-playback'
          ? 'media'
          : kind === 'vacuum'
            ? 'vacuum'
            : 'runtime',
      confidence: payload?.connected || payload?.state === 'playing' ? 'high' : 'medium',
      summary: summarizeIntegration(kind, payload),
      snapshot: {
        media: snapshot.media,
        vacuum: snapshot.vacuum
          ? {
              enabled: snapshot.vacuum.enabled,
              provider: snapshot.vacuum.provider,
              connected: snapshot.vacuum.connected,
              state: snapshot.vacuum.state,
            }
          : null,
        mqtt: snapshot.mqtt
          ? {
              enabled: snapshot.mqtt.enabled,
              connected: snapshot.mqtt.connected,
              state: snapshot.mqtt.state,
            }
          : null,
      },
    })
  }

  function recordHeartbeat() {
    touch()
    const timestamp = Date.now()

    if (shouldRecordCategory('runtime', timestamp)) {
      pushHistory({
        source: 'server-heartbeat',
        category: 'runtime',
        confidence: snapshot.runtime.configReceived ? 'medium' : 'low',
        summary: 'Server runtime heartbeat',
        snapshot: {
          runtime: snapshot.runtime,
          rooms: getRoomSummary(),
          media: {
            castEnabled: Boolean(snapshot.media.cast?.enabled),
            playbackState: snapshot.media.playback?.state ?? null,
          },
          vacuum: snapshot.vacuum
            ? {
                provider: snapshot.vacuum.provider,
                connected: snapshot.vacuum.connected,
                state: snapshot.vacuum.state,
              }
            : null,
          mqtt: snapshot.mqtt
            ? {
                connected: snapshot.mqtt.connected,
                state: snapshot.mqtt.state,
              }
            : null,
        },
      })
    }

    if (shouldRecordCategory('atmosphere', timestamp)) {
      pushHistory({
        source: 'server-atmosphere',
        category: 'atmosphere',
        confidence: getRoomSummary().roomCount > 0 ? 'medium' : 'low',
        summary: snapshot.atmosphere.summary,
        snapshot: {
          atmosphere: snapshot.atmosphere,
          rooms: getRoomSummary(),
        },
      })
    }
  }

  function startHeartbeat() {
    if (heartbeatTimer) {
      return
    }

    heartbeatTimer = setInterval(recordHeartbeat, heartbeatMs)
    if (typeof heartbeatTimer.unref === 'function') {
      heartbeatTimer.unref()
    }
  }

  function getState() {
    touch()
    return {
      ok: true,
      sequence,
      ...cloneJson(snapshot),
      persistence: getPersistenceStatus(),
      roomSnapshots: getRoomSnapshots(),
      aggregates: getAggregates().aggregates,
      insights: getRuntimeInsights({ limit: 8 }).insights,
      summary: getSummary(),
    }
  }

  function getHistory({ limit = 120, range = 'day', category = 'all' } = {}) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 120, historyLimit))
    const selectedCategory = category === 'all' ? 'all' : normalizeCategory(category)
    const selectedRange = getRangeWindow(range)
    const eventSource = selectedCategory === 'all' ? history : historyByCategory[selectedCategory]
    const pointSource = selectedCategory === 'all' ? historyPoints : pointsByCategory[selectedCategory]
    const rangedEvents = eventSource.filter(
      (entry) => entry.timestamp >= selectedRange.from && entry.timestamp <= selectedRange.to,
    )
    const rangedPoints = pointSource.filter(
      (point) => point.timestamp >= selectedRange.from && point.timestamp <= selectedRange.to,
    )
    const sourceDistribution = getHistorySourceDistribution(rangedPoints)
    const allLiveMissingGroupAddressPoints = rangedPoints
      .filter((point) =>
        ['liveKnx', 'manualPoll', 'groupValueResponse'].includes(classifyHistorySource(point)) &&
        !point.groupAddress,
      )
    const liveMissingGroupAddressPoints = allLiveMissingGroupAddressPoints
      .slice(-12)
      .reverse()
    const derivedQueryPointCount =
      (sourceDistribution.derivedQuery ?? 0) + (sourceDistribution.aggregate ?? 0)
    const livePointCount =
      (sourceDistribution.liveKnx ?? 0) +
      (sourceDistribution.manualPoll ?? 0) +
      (sourceDistribution.groupValueResponse ?? 0)

    return {
      ok: true,
      sourceOfTruth: snapshot.server.sourceOfTruth,
      count: history.length,
      pointCount: historyPoints.length,
      category: selectedCategory,
      range: selectedRange,
      sparse: rangedEvents.length === 0 && rangedPoints.length === 0,
      history: cloneJson(rangedEvents.slice(-safeLimit)),
      points: cloneJson(rangedPoints.slice(-Math.min(safeLimit * 4, pointLimit))),
      collections: cloneJson(
        Object.fromEntries(
          HISTORY_CATEGORIES.map((historyCategory) => [
            historyCategory,
            {
              events: historyByCategory[historyCategory]
                .filter((entry) => entry.timestamp >= selectedRange.from && entry.timestamp <= selectedRange.to)
                .slice(-safeLimit),
              points: pointsByCategory[historyCategory]
                .filter((point) => point.timestamp >= selectedRange.from && point.timestamp <= selectedRange.to)
                .slice(-Math.min(safeLimit * 4, pointLimit)),
            },
          ]),
        ),
      ),
      categoryCounts: getHistoryCategoryCounts(),
      sourceDistribution,
      lineageDiagnostics: {
        liveMissingGroupAddressCount: allLiveMissingGroupAddressPoints.length,
        derivedQueryPointCount,
        derivedDominatesLive: derivedQueryPointCount > livePointCount,
        latestMissingGroupAddressPoints: liveMissingGroupAddressPoints.map((point) => ({
          at: point.at ?? null,
          roomKey: point.roomKey ?? null,
          field: point.field ?? null,
          source: point.source ?? null,
          responseSource: point.responseSource ?? null,
          value: point.value ?? null,
        })),
      },
      ranges: getRangeMetadata(),
      rates: getRateMetadata(),
      retention: {
        inMemory: true,
        persisted: persistence.enabled,
        restored: persistence.restored,
        historyLimit,
        pointLimit,
        database: false,
        storagePath: persistence.storagePath,
        lastFlushAt: persistence.lastFlushAt,
        lastError: persistence.lastError,
      },
      analysisFoundation: {
        roomTrendAnalysis: 'prepared',
        comfortDrift: 'prepared',
        energyBehavior: 'prepared',
        activityRhythm: 'prepared',
        anomalyDetection: 'future',
      },
    }
  }

  restorePersistence()
  startHeartbeat()

  return {
    getState,
    getHistory,
    getSummary,
    getAggregates,
    getRuntimeInsights,
    recordRuntimeConfig,
    recordHealth,
    recordLightFeedback,
    recordClimateFeedback,
    recordClimateTemperatureQuery,
    recordCustomSignalFeedback,
    recordIntegrationSnapshot,
    recordHeartbeat,
  }
}
