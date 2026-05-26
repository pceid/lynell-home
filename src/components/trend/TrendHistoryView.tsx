import { useState } from 'react'
import type { Room } from '../../data/rooms'
import {
  classifyRuntimeHistorySource,
  type RuntimeHistorySourceCategory,
  type RuntimeHistoryPoint,
} from '../../runtime/runtimeHistory'
import type { LightZoneHistorySeries } from '../../runtime/lightHistory'
import { TrendHistoryChart } from './TrendHistoryChart'

export type TrendHistoryRange = 'hour' | 'day' | 'week'

type TrendPollGroup = {
  groupAddress?: string
  field?: string
  label?: string | null
  dpt?: string
  dataType?: string | null
  error?: string | null
  failureType?: string | null
}

type TrendPollState = {
  loading: boolean
  lastPollAt: string | null
  error: string | null
  result: {
    requestedGroups: TrendPollGroup[]
    updatedGroups: TrendPollGroup[]
    failedGroups: TrendPollGroup[]
    skippedGroups?: TrendPollGroup[]
    diagnostics?: {
      realFailedCount?: number
      skippedCount?: number
    }
  } | null
}

type TrendRoomTruthSummary = {
  fields: Record<
    'temperature' | 'setpoint' | 'heatDemand' | 'light' | 'brightness',
    {
      valueLabel: string
      source: string
      freshness: string
      confidence: string
      groupAddress: string | null
    }
  >
  optimisticPending: boolean
  staleCount: number
}

function summarizeTrendPoints(points: RuntimeHistoryPoint[]) {
  const values = points.map((point) => point.value).filter(Number.isFinite)
  const latest = points[points.length - 1] ?? null

  if (values.length === 0) {
    return {
      count: 0,
      min: null,
      max: null,
      avg: null,
      latest,
      oldest: points[0] ?? null,
      newest: latest,
    }
  }

  return {
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((sum, value) => sum + value, 0) / values.length,
    latest,
    oldest: points[0] ?? null,
    newest: latest,
  }
}

function formatDetailValue(value: number, unit = '') {
  const hasFraction = Math.abs(value - Math.round(value)) > 0.01
  const decimals = unit === '%' ? (hasFraction || (value > 0 && value < 10) ? 1 : 0) : 1
  return `${Number(value.toFixed(decimals)).toLocaleString('nb-NO')}${unit}`
}

function getSourceTypeLabel(category: RuntimeHistorySourceCategory) {
  const labels: Record<RuntimeHistorySourceCategory, string> = {
    liveKnx: 'Live KNX',
    manualPoll: 'Manual poll',
    groupValueResponse: 'KNX response',
    restoredHistory: 'Restored',
    roomSnapshotReference: 'Snapshot/reference',
    frontendFallback: 'Frontend fallback',
    derivedQuery: 'Derived/query',
    aggregate: 'Aggregate',
    demo: 'Demo',
    simulate: 'Simulate',
    unknown: 'Unknown',
  }
  return labels[category]
}

function getSourcePriority(point: RuntimeHistoryPoint) {
  const category = classifyRuntimeHistorySource(point)
  const priorities: Record<RuntimeHistorySourceCategory, number> = {
    groupValueResponse: 8,
    liveKnx: 7,
    manualPoll: 6,
    restoredHistory: 4,
    roomSnapshotReference: 3,
    aggregate: 2,
    derivedQuery: 1,
    frontendFallback: 1,
    demo: 0,
    simulate: 0,
    unknown: 0,
  }
  return priorities[category]
}

function isReferenceDetailPoint(point: RuntimeHistoryPoint) {
  return [
    'roomSnapshotReference',
    'frontendFallback',
    'derivedQuery',
    'aggregate',
    'demo',
    'simulate',
    'unknown',
  ].includes(classifyRuntimeHistorySource(point))
}

function getPointUnit(point: RuntimeHistoryPoint) {
  return point.field === 'temperature' || point.field === 'setpoint' ? '°C' : '%'
}

function formatLightingPointValue(point: RuntimeHistoryPoint) {
  const dpt = String(point.dpt ?? point.dataType ?? '').toLowerCase()
  if (dpt.startsWith('1.')) {
    return point.value > 0 ? 'På' : 'Av'
  }

  return formatDetailValue(point.value, '%')
}

function hasLiveMissingGaWarning(point: RuntimeHistoryPoint) {
  const category = classifyRuntimeHistorySource(point)
  return ['liveKnx', 'manualPoll', 'groupValueResponse'].includes(category) && !point.groupAddress
}

function dedupeTrendDetailPoints(points: RuntimeHistoryPoint[]) {
  const byLineage = new Map<string, RuntimeHistoryPoint>()
  for (const point of points) {
    const valueToken = Number.isFinite(point.value) ? Number(point.value.toFixed(3)) : point.value
    const timeBucket = Math.round(point.timestamp / 2000)
    const lineageKey = [
      point.roomKey,
      point.zoneKey ?? 'room',
      point.field,
      point.groupAddress ?? point.signalName ?? 'no-ga',
      valueToken,
      timeBucket,
    ].join('|')
    const existing = byLineage.get(lineageKey)
    if (!existing || getSourcePriority(point) > getSourcePriority(existing)) {
      byLineage.set(lineageKey, point)
    }
  }
  return Array.from(byLineage.values()).sort((a, b) => b.timestamp - a.timestamp)
}

function formatDetailTime(timestamp: number) {
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

export function TrendHistoryView({
  rooms,
  selectedRoom,
  range,
  temperaturePoints,
  setpointPoints,
  heatDemandPoints,
  brightnessPoints,
  customSignalPoints = [],
  lightZoneSeries,
  sourceLabel,
  sparse,
  rangeStart,
  rangeEnd,
  densityLabel,
  roomTruthSummary,
  pollState,
  onRoomChange,
  onRangeChange,
  onPollValues,
  onBackToRooms,
}: {
  rooms: Room[]
  selectedRoom: Room | null
  range: TrendHistoryRange
  temperaturePoints: RuntimeHistoryPoint[]
  setpointPoints: RuntimeHistoryPoint[]
  heatDemandPoints: RuntimeHistoryPoint[]
  brightnessPoints: RuntimeHistoryPoint[]
  customSignalPoints?: RuntimeHistoryPoint[]
  lightZoneSeries: LightZoneHistorySeries[]
  sourceLabel: string
  sparse: boolean
  rangeStart: number | null
  rangeEnd: number | null
  densityLabel: string
  roomTruthSummary?: TrendRoomTruthSummary | null
  pollState?: TrendPollState | null
  onRoomChange: (roomKey: string | null) => void
  onRangeChange: (range: TrendHistoryRange) => void
  onPollValues?: (roomKey: string) => void | Promise<void>
  onBackToRooms: () => void
}) {
  const [showExtendedLightLog, setShowExtendedLightLog] = useState(false)
  const [expandedChart, setExpandedChart] = useState<{
    title: string
    unit: string
    points: RuntimeHistoryPoint[]
    renderMode?: 'line' | 'stepped' | 'event'
    sourceLabel?: string
  } | null>(null)
  const hasLightZoneHistory = lightZoneSeries.some((series) => series.pointCount > 0)
  const zoneLightingPoints = lightZoneSeries.flatMap((series) =>
    series.points.map((point) => ({
      point,
      zoneName: series.zoneName,
      zoneKey: series.zoneKey,
    })),
  )
  const rawDetailPoints = [
    ...temperaturePoints,
    ...setpointPoints,
    ...heatDemandPoints,
    ...zoneLightingPoints.map((entry) => entry.point),
    ...customSignalPoints,
  ].sort((a, b) => b.timestamp - a.timestamp)
  const referenceDetailPoints = dedupeTrendDetailPoints(rawDetailPoints.filter(isReferenceDetailPoint))
  const allDetailPoints = dedupeTrendDetailPoints(rawDetailPoints.filter((point) => !isReferenceDetailPoint(point)))
  const dedupedPointCount = Math.max(0, rawDetailPoints.length - allDetailPoints.length - referenceDetailPoints.length)
  const detailSummary = summarizeTrendPoints(allDetailPoints)
  const sourceDistribution = rawDetailPoints.reduce<Record<string, number>>((distribution, point) => {
    const sourceCategory = classifyRuntimeHistorySource(point)
    distribution[sourceCategory] = (distribution[sourceCategory] ?? 0) + 1
    return distribution
  }, {})
  const livePointCount =
    (sourceDistribution.liveKnx ?? 0) +
    (sourceDistribution.manualPoll ?? 0) +
    (sourceDistribution.groupValueResponse ?? 0)
  const restoredPointCount = sourceDistribution.restoredHistory ?? 0
  const derivedPointCount = (sourceDistribution.derivedQuery ?? 0) + (sourceDistribution.aggregate ?? 0)
  const missingLiveGaCount = rawDetailPoints.filter(hasLiveMissingGaWarning).length
  const fallbackPointCount = rawDetailPoints.filter((point) =>
    ['frontendFallback', 'roomSnapshotReference', 'demo', 'simulate', 'unknown', 'derivedQuery', 'aggregate'].includes(
      classifyRuntimeHistorySource(point),
    ),
  ).length
  const customSignalSeries = Array.from(
    customSignalPoints.reduce<Map<string, RuntimeHistoryPoint[]>>((groups, point) => {
      const key = point.signalName ?? point.field
      groups.set(key, [...(groups.get(key) ?? []), point])
      return groups
    }, new Map()),
  ).map(([name, points]) => ({
    name,
    points,
    unit: String(points[0]?.dpt ?? '').startsWith('9.')
      ? '°C'
      : String(points[0]?.dpt ?? '').startsWith('5.') ||
          String(points[0]?.dpt ?? points[0]?.dataType ?? '').startsWith('1.')
        ? '%'
        : '',
  }))
  const realFailedGroups = (pollState?.result?.failedGroups ?? []).filter((group) =>
    ['noResponse', 'timeout', 'invalidDpt'].includes(String(group.failureType ?? 'noResponse')),
  )
  const skippedPollGroups = pollState?.result?.skippedGroups ?? []
  const pollSummary = pollState?.result
    ? `${pollState.result.updatedGroups.length}/${pollState.result.requestedGroups.length} svarte`
    : null
  const failedLightingGroups = realFailedGroups.filter((group) =>
    ['lightFeedback', 'valueFeedback', 'brightness'].includes(String(group.field ?? '')),
  )
  const latestZoneLightingRows = Array.from(
    zoneLightingPoints
      .filter((entry) => !isReferenceDetailPoint(entry.point))
      .reduce((rows, entry) => {
        const key = [
          entry.zoneKey,
          entry.point.groupAddress ?? entry.point.dpt ?? entry.point.dataType ?? entry.point.source,
        ].join('|')
        const existing = rows.get(key)
        if (!existing || entry.point.timestamp > existing.point.timestamp || getSourcePriority(entry.point) > getSourcePriority(existing.point)) {
          rows.set(key, entry)
        }
        return rows
      }, new Map<string, { point: RuntimeHistoryPoint; zoneName: string; zoneKey: string }>())
      .values(),
  ).sort((a, b) => a.zoneName.localeCompare(b.zoneName, 'nb-NO') || b.point.timestamp - a.point.timestamp)
  const liveZoneDatapointCount = zoneLightingPoints.filter((entry) => !isReferenceDetailPoint(entry.point)).length
  const zoneDatapointCount = zoneLightingPoints.length
  const pollStatusText = pollState?.loading
    ? 'Henter verdier...'
    : pollState?.error
      ? pollState.error
      : pollState?.lastPollAt
        ? `Sist hentet ${formatDetailTime(Date.parse(pollState.lastPollAt))}${pollSummary ? ` · ${pollSummary}` : ''}`
        : 'Manuell KNX-lesing for valgt rom'
  const canonicalTruthLine = roomTruthSummary
    ? [
        `Temp ${roomTruthSummary.fields.temperature.valueLabel}`,
        `Setpunkt ${roomTruthSummary.fields.setpoint.valueLabel}`,
        `Varme ${roomTruthSummary.fields.heatDemand.valueLabel}`,
        `Lys ${roomTruthSummary.fields.light.valueLabel}`,
      ].join(' · ')
    : 'Venter på canonical room truth'
  const canonicalTruthMeta = roomTruthSummary
    ? [
        roomTruthSummary.optimisticPending ? 'pending' : null,
        roomTruthSummary.staleCount > 0 ? `${roomTruthSummary.staleCount} stale/offline` : 'freshness OK',
        `temp ${roomTruthSummary.fields.temperature.source}/${roomTruthSummary.fields.temperature.freshness}`,
      ]
        .filter(Boolean)
        .join(' · ')
    : '—'

  return (
    <section className="room-section trend-history" aria-label="Trendhistorikk">
      <div className="room-section__header trend-history__header">
        <div>
          <p className="eyebrow">Trendhistorikk</p>
          <h2>{selectedRoom?.name ?? 'Velg rom'}</h2>
          <span>{sourceLabel} · {densityLabel}</span>
        </div>
        <button type="button" className="manager-action" onClick={onBackToRooms}>
          Til Rom
        </button>
      </div>

      <article className="trend-history__toolbar">
        <label className="room-focus-panel__selector trend-history__room-selector">
          <span>Rom</span>
          <select
            value={selectedRoom?.key ?? ''}
            onChange={(event) => onRoomChange(event.target.value || null)}
          >
            {rooms.map((room) => (
              <option key={room.key} value={room.key}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
        <div className="status-toggle trend-history__range" aria-label="Tidsvalg">
          {[
            { id: 'hour' as const, label: 'Time' },
            { id: 'day' as const, label: 'Dag' },
            { id: 'week' as const, label: 'Uke' },
          ].map((rangeOption) => (
            <button
              key={rangeOption.id}
              type="button"
              className={`mode-control__option ${range === rangeOption.id ? 'is-active' : ''}`}
              onClick={() => onRangeChange(rangeOption.id)}
            >
              {rangeOption.label}
            </button>
          ))}
        </div>
      </article>

      {selectedRoom ? (
        <>
          <article className="trend-history__runtime-poll">
            <div className="trend-history__runtime-poll-header">
              <div>
                <p className="room-card__label">Rom-runtime</p>
                <h3>Hent verdier</h3>
                <span>{pollStatusText}</span>
              </div>
              <button
                type="button"
                className="manager-action"
                disabled={pollState?.loading || !onPollValues}
                onClick={() => selectedRoom && onPollValues?.(selectedRoom.key)}
              >
                {pollState?.loading ? 'Henter...' : 'Hent verdi'}
              </button>
            </div>
            <p className="manager-helper">
              Leser bare feedback-adresser for valgt rom. Datapunktene dukker opp i grafene og detaljlisten når svar kommer inn.
            </p>
            {realFailedGroups.length > 0 ? (
              <div className="trend-history__poll-groups trend-history__poll-groups--failed">
                {realFailedGroups.slice(0, 6).map((group, index) => (
                  <span key={`${group.groupAddress ?? group.field ?? 'failed'}-${index}`}>
                    {[
                      group.groupAddress ?? 'ukjent GA',
                      group.label ?? group.field ?? 'signal',
                      group.dpt ?? group.dataType ?? null,
                      group.failureType ?? group.error ?? 'noResponse',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                ))}
              </div>
            ) : null}
            {skippedPollGroups.length > 0 ? (
              <div className="trend-history__poll-groups">
                <span>{skippedPollGroups.length} tomme/ikke-konfigurerte signaler ble ignorert.</span>
              </div>
            ) : null}
          </article>
          <article className="trend-history__source">
            <div>
              <span>Kilde</span>
              <strong>{sourceLabel}</strong>
            </div>
            <div>
              <span>Tidsvindu</span>
              <strong>{range === 'hour' ? 'Siste time' : range === 'day' ? 'Siste dag' : 'Siste uke'}</strong>
            </div>
            <div>
              <span>Datatetthet</span>
              <strong>{densityLabel}</strong>
            </div>
            <div>
              <span>Runtime-kilde</span>
              <strong>
                live {livePointCount} · restored {restoredPointCount} · derived {derivedPointCount} · reference/fallback {fallbackPointCount}
              </strong>
            </div>
            <div>
              <span>Lineage</span>
              <strong>
                {dedupedPointCount > 0 ? `${dedupedPointCount} deduped · ` : ''}
                {missingLiveGaCount > 0 ? `${missingLiveGaCount} live uten GA` : 'GA OK'} ·{' '}
                {referenceDetailPoints.length} reference filtrert
              </strong>
            </div>
            <div>
              <span>Siste verdi</span>
              <strong>
                {detailSummary.latest
                  ? `${detailSummary.latest.field}: ${formatDetailValue(detailSummary.latest.value, getPointUnit(detailSummary.latest))}`
                  : '—'}
              </strong>
            </div>
            <div>
              <span>Romstatus nå</span>
              <strong title={canonicalTruthMeta}>{canonicalTruthLine}</strong>
            </div>
          </article>
          <article className="trend-history__source">
            <div>
              <span>Zone datapoints</span>
              <strong>{zoneDatapointCount} totalt · {liveZoneDatapointCount} live/restored</strong>
            </div>
            <div>
              <span>Lighting timeouts</span>
              <strong>{failedLightingGroups.length}</strong>
            </div>
            <div>
              <span>Reference filtered</span>
              <strong>{referenceDetailPoints.length}</strong>
            </div>
            <div>
              <span>Zone summary</span>
              <strong>
                {latestZoneLightingRows.length > 0
                  ? `${new Set(latestZoneLightingRows.map((row) => row.zoneKey)).size} soner med live datapunkt`
                  : 'Ingen live sonepunkter i valgt vindu'}
              </strong>
            </div>
          </article>
          <article className="trend-history__light-log">
            <div className="trend-history__light-log-header">
              <div>
                <p className="room-card__label">Sonenivå lys</p>
                <h3>Live lighting truth</h3>
              </div>
            </div>
            {latestZoneLightingRows.length > 0 ? (
              <div className="trend-history__point-table" role="table" aria-label="Sonenivå lysverdier">
                <div className="trend-history__point-row trend-history__point-row--head" role="row">
                  <span>Sone</span>
                  <span>Verdi</span>
                  <span>Type</span>
                  <span>Kilde</span>
                  <span>Confidence</span>
                  <span>GA / DPT</span>
                  <span>Tid</span>
                </div>
                {latestZoneLightingRows.map(({ point, zoneName, zoneKey }) => {
                  const sourceCategory = classifyRuntimeHistorySource(point)
                  return (
                    <div
                      key={`${zoneKey}-${point.groupAddress ?? point.dpt ?? point.timestamp}-${point.source}`}
                      className="trend-history__point-row"
                      role="row"
                    >
                      <span>{zoneName} / {zoneKey}</span>
                      <span>{formatLightingPointValue(point)}</span>
                      <span>{getSourceTypeLabel(sourceCategory)}</span>
                      <span>
                        {point.source}
                        {point.responseSource ? ` · ${point.responseSource}` : ''}
                        {point.restored ? ' · restored' : point.persisted ? ' · persisted' : ''}
                      </span>
                      <span>{point.confidence ?? 'medium'}</span>
                      <span>
                        {point.groupAddress ?? '—'}
                        {point.dpt ?? point.dataType ? ` · ${point.dpt ?? point.dataType}` : ''}
                      </span>
                      <span>{formatDetailTime(point.timestamp)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="calendar-card__empty">Ingen live sonenivå-lysverdier i valgt vindu.</p>
            )}
            {failedLightingGroups.length > 0 ? (
              <div className="trend-history__poll-groups trend-history__poll-groups--failed">
                {failedLightingGroups.slice(0, 6).map((group, index) => (
                  <span key={`${group.groupAddress ?? group.field ?? 'lighting-timeout'}-${index}`}>
                    {[group.groupAddress ?? 'ukjent GA', group.label ?? group.field ?? 'lysfeedback', group.dpt ?? group.dataType ?? null, group.failureType ?? 'timeout']
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
          <div className="trend-history__grid">
            <div className="trend-history__chart-shell">
              <button type="button" className="manager-action manager-action--mini" onClick={() => setExpandedChart({ title: 'Temperatur', unit: '°C', points: temperaturePoints, sourceLabel })}>Utvid</button>
              <TrendHistoryChart title="Temperatur" unit="°C" points={temperaturePoints} rangeStart={rangeStart} rangeEnd={rangeEnd} sparse={sparse} sourceLabel={sourceLabel} />
            </div>
            <div className="trend-history__chart-shell">
              <button type="button" className="manager-action manager-action--mini" onClick={() => setExpandedChart({ title: 'Settpunkt', unit: '°C', points: setpointPoints, sourceLabel })}>Utvid</button>
              <TrendHistoryChart title="Settpunkt" unit="°C" points={setpointPoints} rangeStart={rangeStart} rangeEnd={rangeEnd} sparse={sparse} sourceLabel={sourceLabel} />
            </div>
            <div className="trend-history__chart-shell">
              <button type="button" className="manager-action manager-action--mini" onClick={() => setExpandedChart({ title: 'HeatDemand', unit: '%', points: heatDemandPoints, sourceLabel })}>Utvid</button>
              <TrendHistoryChart title="HeatDemand" unit="%" points={heatDemandPoints} rangeStart={rangeStart} rangeEnd={rangeEnd} sparse={sparse} sourceLabel={sourceLabel} />
            </div>
            <div className="trend-history__chart-shell">
              <button type="button" className="manager-action manager-action--mini" onClick={() => setExpandedChart({ title: 'Lysnivå snitt', unit: '%', points: brightnessPoints, renderMode: 'stepped', sourceLabel })}>Utvid</button>
              <TrendHistoryChart title="Lysnivå snitt" unit="%" points={brightnessPoints} rangeStart={rangeStart} rangeEnd={rangeEnd} sparse={sparse} sourceLabel={sourceLabel} renderMode="stepped" />
            </div>
            <article className="trend-history__light-log">
              <div className="trend-history__light-log-header">
                <div>
                  <p className="room-card__label">Lyssoner</p>
                  <h3>Per-sone historikk</h3>
                </div>
                <button
                  type="button"
                  className="manager-action"
                  onClick={() => setShowExtendedLightLog((isOpen) => !isOpen)}
                >
                  Utvidet logg
                </button>
              </div>
              <p className="manager-helper">
                Hovedgrafen viser gjennomsnittlig lysnivå for rommet. Utvidet logg viser hver sone separat.
              </p>
              {showExtendedLightLog ? (
                hasLightZoneHistory ? (
                  <div className="trend-history__zone-list">
                    {lightZoneSeries.map((series) => (
                      <div key={series.zoneKey} className="trend-history__zone-item">
                        <div>
                          <strong>{series.zoneName}</strong>
                          <span>{series.pointCount} punkter</span>
                        </div>
                        <div>
                          <span>
                            Snitt:{' '}
                            {series.averageValue === null
                              ? '—'
                              : `${Math.round(series.averageValue).toLocaleString('nb-NO')}%`}
                          </span>
                          <span>
                            Siste:{' '}
                            {series.latestValue === null
                              ? '—'
                              : `${Math.round(series.latestValue).toLocaleString('nb-NO')}%`}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="manager-action manager-action--mini"
                          onClick={() => setExpandedChart({ title: series.zoneName, unit: '%', points: series.points, renderMode: 'stepped', sourceLabel })}
                        >
                          Utvid
                        </button>
                        <TrendHistoryChart title={series.zoneName} unit="%" points={series.points} compact rangeStart={rangeStart} rangeEnd={rangeEnd} sparse={sparse} sourceLabel={sourceLabel} renderMode="stepped" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="calendar-card__empty">Ingen per-sone lyshistorikk ennå.</p>
                )
              ) : null}
            </article>
            {customSignalSeries.map((series) => (
              <div key={series.name} className="trend-history__chart-shell">
                <button
                  type="button"
                  className="manager-action manager-action--mini"
                  onClick={() =>
                    setExpandedChart({
                      title: series.name,
                      unit: series.unit,
                      points: series.points,
                      renderMode: 'stepped',
                      sourceLabel,
                    })
                  }
                >
                  Utvid
                </button>
                <TrendHistoryChart
                  title={series.name}
                  unit={series.unit}
                  points={series.points}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  sparse={sparse}
                  sourceLabel="Custom signal"
                  renderMode="stepped"
                />
              </div>
            ))}
          </div>
          <details className="trend-history__details">
            <summary>Detaljer</summary>
            <div className="trend-history__detail-summary">
              <span>{detailSummary.count} punkter</span>
              <span>
                Min {detailSummary.min === null ? '—' : formatDetailValue(detailSummary.min)}
              </span>
              <span>
                Max {detailSummary.max === null ? '—' : formatDetailValue(detailSummary.max)}
              </span>
              <span>
                Snitt {detailSummary.avg === null ? '—' : formatDetailValue(detailSummary.avg)}
              </span>
              <span>
                Vindu {rangeStart ? formatDetailTime(rangeStart) : '—'} → {rangeEnd ? formatDetailTime(rangeEnd) : '—'}
              </span>
            </div>
            <div className="trend-history__point-table" role="table" aria-label="Trend datapunkter">
              <div className="trend-history__point-row trend-history__point-row--head" role="row">
                <span>Tid</span>
                <span>Felt</span>
                <span>Verdi</span>
                <span>Type</span>
                <span>Kilde</span>
                <span>Confidence</span>
                <span>GA / DPT</span>
              </div>
              {allDetailPoints.length > 0 ? (
                allDetailPoints.map((point) => {
                  const sourceCategory = classifyRuntimeHistorySource(point)
                  const missingGaWarning = hasLiveMissingGaWarning(point)
                  return (
                  <div
                    key={`${point.timestamp}-${point.field}-${point.zoneKey ?? 'room'}-${point.source}`}
                    className={[
                      'trend-history__point-row',
                      sourceCategory === 'derivedQuery' || sourceCategory === 'aggregate'
                        ? 'trend-history__point-row--derived'
                        : '',
                      missingGaWarning ? 'trend-history__point-row--warning' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    role="row"
                  >
                    <span>{formatDetailTime(point.timestamp)}</span>
                    <span>
                      {point.signalName ??
                        (point.zoneKey ? `${point.field}/${point.zoneKey}` : point.field)}
                    </span>
                    <span>
                      {formatDetailValue(
                        point.value,
                        getPointUnit(point),
                      )}
                    </span>
                    <span>{getSourceTypeLabel(sourceCategory)}</span>
                    <span>
                      {point.source}
                      {point.responseSource ? ` · ${point.responseSource}` : ''}
                      {point.restored ? ' · restored' : point.persisted ? ' · persisted' : ''}
                    </span>
                    <span>{point.confidence ?? (sourceCategory === 'derivedQuery' ? 'low' : 'medium')}</span>
                    <span>
                      {point.groupAddress ?? (missingGaWarning ? 'Mangler GA' : '—')}
                      {point.dpt ?? point.dataType ? ` · ${point.dpt ?? point.dataType}` : ''}
                    </span>
                  </div>
                  )
                })
              ) : (
                <div className="trend-history__point-row" role="row">
                  <span>Ingen datapunkter i valgt range.</span>
                </div>
              )}
            </div>
          </details>
          {referenceDetailPoints.length > 0 ? (
            <details className="trend-history__details">
              <summary>Reference/restored ({referenceDetailPoints.length})</summary>
              <p className="manager-helper">
                Snapshot, derived/query og aggregate-punkter holdes utenfor live-loggen. De vises her som referanse med lavere tillit.
              </p>
              <div className="trend-history__point-table" role="table" aria-label="Reference datapunkter">
                <div className="trend-history__point-row trend-history__point-row--head" role="row">
                  <span>Tid</span>
                  <span>Felt</span>
                  <span>Verdi</span>
                  <span>Type</span>
                  <span>Kilde</span>
                  <span>Confidence</span>
                  <span>GA / DPT</span>
                </div>
                {referenceDetailPoints.slice(0, 80).map((point) => {
                  const sourceCategory = classifyRuntimeHistorySource(point)
                  return (
                    <div
                      key={`reference-${point.timestamp}-${point.field}-${point.zoneKey ?? 'room'}-${point.source}`}
                      className="trend-history__point-row trend-history__point-row--derived"
                      role="row"
                    >
                      <span>{formatDetailTime(point.timestamp)}</span>
                      <span>
                        {point.signalName ??
                          (point.zoneKey ? `${point.field}/${point.zoneKey}` : point.field)}
                      </span>
                      <span>{formatDetailValue(point.value, getPointUnit(point))}</span>
                      <span>{getSourceTypeLabel(sourceCategory)}</span>
                      <span>
                        {point.source}
                        {point.responseSource ? ` · ${point.responseSource}` : ''}
                        {point.restored ? ' · restored' : point.persisted ? ' · persisted' : ''}
                      </span>
                      <span>{point.confidence ?? 'low'}</span>
                      <span>
                        {point.groupAddress ?? '—'}
                        {point.dpt ?? point.dataType ? ` · ${point.dpt ?? point.dataType}` : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            </details>
          ) : null}
        </>
      ) : (
        <article className="trend-history__empty">
          <p className="room-card__label">Trendhistorikk</p>
          <h3>Ingen rom valgt</h3>
          <p>Velg et rom for å vise historikk.</p>
        </article>
      )}

      {expandedChart ? (
        <div className="trend-history__modal" role="dialog" aria-modal="true" aria-label={`${expandedChart.title} fullbredde`}>
          <div className="trend-history__modal-panel">
            <div className="trend-history__light-log-header">
              <div>
                <p className="room-card__label">Fullbredde trend</p>
                <h3>{expandedChart.title}</h3>
              </div>
              <button type="button" className="manager-action" onClick={() => setExpandedChart(null)}>
                Lukk
              </button>
            </div>
            <TrendHistoryChart
              title={expandedChart.title}
              unit={expandedChart.unit}
              points={expandedChart.points}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              sparse={sparse}
              sourceLabel={expandedChart.sourceLabel}
              renderMode={expandedChart.renderMode}
            />
          </div>
        </div>
      ) : null}

      <article className="trend-history__foundation">
        <p className="room-card__label">Foundation</p>
        <p>
          Trendmotoren bruker server-history som primærkilde og faller tilbake til lokal runtimeHistory
          hvis bridge ikke har datapunkter ennå. Sparse tidsvinduer vises uten å finne på datapunkter.
        </p>
      </article>
    </section>
  )
}
