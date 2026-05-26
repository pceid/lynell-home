import { useState } from 'react'
import type { RuntimeHistoryPoint } from '../../runtime/runtimeHistory'

function formatTrendValue(value: number, unit: string) {
  const hasFraction = Math.abs(value - Math.round(value)) > 0.01
  const decimals = unit === '%' ? (hasFraction || (Math.abs(value) > 0 && Math.abs(value) < 10) ? 1 : 0) : 1
  return `${Number(value.toFixed(decimals)).toLocaleString('nb-NO')}${unit}`
}

function formatTrendTime(timestamp: number) {
  return new Intl.DateTimeFormat('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function formatTrendTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function formatTrendDate(timestamp: number) {
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(timestamp))
}

function getTrendChartScale(unit: string, values: number[]) {
  if (unit === '%') {
    return {
      min: 0,
      max: 100,
      labels: [0, 50, 100],
    }
  }

  if (values.length === 0) {
    return {
      min: 15,
      max: 30,
      labels: [15, 20, 25, 30],
    }
  }

  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  const min = Math.min(15, Math.floor(dataMin - 1))
  const max = Math.max(30, Math.ceil(dataMax + 1))
  const labelStart = Math.ceil(min / 5) * 5
  const labelEnd = Math.floor(max / 5) * 5
  const labels: number[] = []

  for (let value = labelStart; value <= labelEnd; value += 5) {
    labels.push(value)
  }

  return {
    min,
    max,
    labels: labels.length > 0 ? labels : [min, Math.round((min + max) / 2), max],
  }
}

export function TrendHistoryChart({
  title,
  unit,
  points,
  compact = false,
  rangeStart,
  rangeEnd,
  sparse = false,
  sourceLabel,
  renderMode = 'line',
}: {
  title: string
  unit: string
  points: RuntimeHistoryPoint[]
  compact?: boolean
  rangeStart?: number | null
  rangeEnd?: number | null
  sparse?: boolean
  sourceLabel?: string
  renderMode?: 'line' | 'stepped' | 'event'
}) {
  const [selectedPoint, setSelectedPoint] = useState<RuntimeHistoryPoint | null>(null)
  const chartPoints = points.filter((point) => Number.isFinite(point.value))
  const latestPoint = chartPoints[chartPoints.length - 1] ?? null
  const width = 320
  const height = 150
  const paddingTop = 16
  const paddingRight = 12
  const paddingBottom = 22
  const paddingLeft = 44
  const fallbackEnd = Date.now()
  const fallbackStart = fallbackEnd - 60 * 60 * 1000
  const minTime = rangeStart ?? chartPoints[0]?.timestamp ?? fallbackStart
  const maxTime = rangeEnd ?? chartPoints[chartPoints.length - 1]?.timestamp ?? fallbackEnd
  const timeRange = Math.max(1, maxTime - minTime)
  const plotWidth = width - paddingLeft - paddingRight
  const plotHeight = height - paddingTop - paddingBottom
  const values = chartPoints.map((point) => point.value)
  const scale = getTrendChartScale(unit, values)
  const valueRange = Math.max(1, scale.max - scale.min)
  const getY = (value: number) =>
    paddingTop + (1 - (value - scale.min) / valueRange) * plotHeight

  if (chartPoints.length < 2) {
    return (
      <article className={`trend-chart trend-chart--empty ${compact ? 'trend-chart--compact' : ''}`}>
        <div className="trend-chart__header">
          <div>
            <span>{title}</span>
            {sourceLabel ? <small>{sourceLabel}</small> : null}
          </div>
          <strong>{chartPoints.length === 1 ? formatTrendValue(chartPoints[0].value, unit) : 'Sparse'}</strong>
        </div>
        <svg className="trend-chart__svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} over tid`}>
          {scale.labels.map((label) => {
            const y = getY(label)

            return (
              <g key={label} className="trend-chart__gridline">
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} />
                <text x={paddingLeft - 8} y={y + 3} textAnchor="end">
                  {formatTrendValue(label, unit)}
                </text>
              </g>
            )
          })}
          <line
            className="trend-chart__axis-line"
            x1={paddingLeft}
            y1={height - paddingBottom}
            x2={width - paddingRight}
            y2={height - paddingBottom}
          />
          <line
            className="trend-chart__axis-line"
            x1={paddingLeft}
            y1={paddingTop}
            x2={paddingLeft}
            y2={height - paddingBottom}
          />
          {latestPoint ? (
            <circle
              className="trend-chart__latest-point"
              cx={paddingLeft + ((latestPoint.timestamp - minTime) / timeRange) * plotWidth}
              cy={getY(latestPoint.value)}
              r="3.2"
              onClick={() => setSelectedPoint(latestPoint)}
              tabIndex={0}
            />
          ) : null}
        </svg>
        <div className="trend-chart__axis">
          <span>{formatTrendDate(minTime)}</span>
          <span>{sparse ? 'Sparse data' : 'Venter på data'}</span>
          <span>{formatTrendDate(maxTime)}</span>
        </div>
        <p>Serveren har tidsvinduet klart, men mangler nok datapunkter til trendlinje.</p>
        {selectedPoint ? (
          <div className="trend-chart__tooltip">
            <strong>{formatTrendValue(selectedPoint.value, unit)}</strong>
            <span>{formatTrendTimestamp(selectedPoint.timestamp)}</span>
            <span>
              {selectedPoint.source}
              {selectedPoint.restored ? ' · restored' : selectedPoint.persisted ? ' · persisted' : ''} ·{' '}
              {selectedPoint.confidence ?? 'medium'}
            </span>
            {selectedPoint.groupAddress ? <span>GA {selectedPoint.groupAddress}</span> : null}
            {selectedPoint.dpt ?? selectedPoint.dataType ? <span>DPT {selectedPoint.dpt ?? selectedPoint.dataType}</span> : null}
          </div>
        ) : null}
      </article>
    )
  }

  const averageValue = values.reduce((sum, value) => sum + value, 0) / values.length
  const polyline = chartPoints
    .map((point) => {
      const x = paddingLeft + ((point.timestamp - minTime) / timeRange) * plotWidth
      const y = getY(point.value)

      return `${Number(x.toFixed(1))},${Number(y.toFixed(1))}`
    })
    .join(' ')
  const steppedPath = chartPoints
    .map((point, index) => {
      const x = paddingLeft + ((point.timestamp - minTime) / timeRange) * plotWidth
      const y = getY(point.value)
      if (index === 0) {
        return `M ${Number(x.toFixed(1))} ${Number(y.toFixed(1))}`
      }
      const previousPoint = chartPoints[index - 1]
      const previousY = getY(previousPoint.value)
      return `L ${Number(x.toFixed(1))} ${Number(previousY.toFixed(1))} L ${Number(x.toFixed(1))} ${Number(y.toFixed(1))}`
    })
    .join(' ')
  const timeRangeLabel = `${formatTrendTime(minTime)}-${formatTrendTime(maxTime)}`

  return (
    <article className={`trend-chart ${compact ? 'trend-chart--compact' : ''}`}>
      <div className="trend-chart__header">
        <div>
          <span>{title}</span>
          <small>{sourceLabel ? `${sourceLabel} · ${timeRangeLabel}` : timeRangeLabel}</small>
        </div>
        <strong>Siste: {formatTrendValue(latestPoint.value, unit)}</strong>
      </div>
      <svg className="trend-chart__svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} over tid`}>
        {scale.labels.map((label) => {
          const y = getY(label)

          return (
            <g key={label} className="trend-chart__gridline">
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} />
              <text x={paddingLeft - 8} y={y + 3} textAnchor="end">
                {formatTrendValue(label, unit)}
              </text>
            </g>
          )
        })}
        <line
          className="trend-chart__axis-line"
          x1={paddingLeft}
          y1={height - paddingBottom}
          x2={width - paddingRight}
          y2={height - paddingBottom}
        />
        <line
          className="trend-chart__axis-line"
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft}
          y2={height - paddingBottom}
        />
        {renderMode === 'line' ? <polyline points={polyline} /> : null}
        {renderMode === 'stepped' ? <path className="trend-chart__step-line" d={steppedPath} /> : null}
        {chartPoints.map((point) => {
          const x = paddingLeft + ((point.timestamp - minTime) / timeRange) * plotWidth
          const y = getY(point.value)
          const tooltip = [
            `${title}: ${formatTrendValue(point.value, unit)}`,
            formatTrendTimestamp(point.timestamp),
            `Kilde: ${point.source}${point.restored ? ' · restored' : point.persisted ? ' · persisted' : ''}`,
            `Confidence: ${point.confidence ?? 'medium'}`,
            point.groupAddress ? `GA: ${point.groupAddress}` : null,
            point.dpt ?? point.dataType ? `DPT: ${point.dpt ?? point.dataType}` : null,
            point.mappingVariant ? `Mapping: ${point.mappingVariant}` : null,
          ].filter(Boolean).join('\n')

          return (
            <circle
              key={`${point.timestamp}-${point.roomKey}-${point.zoneKey ?? 'room'}-${point.field}`}
              className={
                point === latestPoint
                  ? 'trend-chart__latest-point'
                  : 'trend-chart__data-point'
              }
              cx={x}
              cy={y}
              r={point === latestPoint ? 3.2 : 2.5}
              tabIndex={0}
              onClick={() => setSelectedPoint(point)}
            >
              <title>{tooltip}</title>
            </circle>
          )
        })}
      </svg>
      <div className="trend-chart__axis">
        <span>{formatTrendTime(minTime)}</span>
        <span>Snitt: {formatTrendValue(averageValue, unit)}</span>
        <span>{formatTrendTime(maxTime)}</span>
      </div>
      {selectedPoint ? (
        <div className="trend-chart__tooltip">
          <strong>{formatTrendValue(selectedPoint.value, unit)}</strong>
          <span>{formatTrendTimestamp(selectedPoint.timestamp)}</span>
          <span>
            {selectedPoint.source}
            {selectedPoint.restored ? ' · restored' : selectedPoint.persisted ? ' · persisted' : ''} ·{' '}
            {selectedPoint.category ?? 'runtime'} · {selectedPoint.confidence ?? 'medium'}
          </span>
          {selectedPoint.groupAddress ? <span>GA {selectedPoint.groupAddress}</span> : null}
          {selectedPoint.dpt ?? selectedPoint.dataType ? <span>DPT {selectedPoint.dpt ?? selectedPoint.dataType}</span> : null}
          {selectedPoint.mappingVariant ? <span>{selectedPoint.mappingVariant}</span> : null}
        </div>
      ) : null}
    </article>
  )
}
