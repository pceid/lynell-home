import { useEffect, useMemo, useRef, useState } from 'react'
import type { SystemMode } from '../api/homeApi'
import type { Room, RoomMode } from '../data/rooms'
import { Sparkline } from './Sparkline'

type RoomCardProps = {
  room: Room
  disabled: boolean
  systemMode: SystemMode
  showLighting: boolean
  showClimate: boolean
  hasClimateConfig: boolean
  hasModeConfig: boolean
  hasHeatDemandConfig: boolean
  hasSetpointWriteConfig: boolean
  hasLiveTemperatureData: boolean
  hasLiveSetpointData: boolean
  comfortSetpoint: number
  nightSetpoint: number
  hasLiveHeatDemandData: boolean
  historyTrend?: string | null
  temperatureHistory?: number[]
  feedbackConfiguredZoneIds: string[]
  lightFeedbackConfiguredZoneIds: string[]
  valueFeedbackConfiguredZoneIds: string[]
  derivedLightStateZoneIds: string[]
  confirmedLightFeedbackZoneIds: string[]
  confirmedBrightnessFeedbackZoneIds: string[]
  optimisticLightingByZoneId?: Record<
    string,
    {
      status: 'pendingFeedback' | 'delayedFeedback'
      message: string
      expectedBrightness: number
      expectedLightsOn: boolean
      startedAt: number
    }
  >
  valueUpdateTokens?: Record<string, string | number | null | undefined>
  onOpenTrendHistory?: (roomKey: string) => void
  onToggleLight: (roomId: number, zoneId: string) => void | Promise<void>
  onBrightnessChange: (roomId: number, zoneId: string, value: number) => void | Promise<void>
  onModeChange: (roomId: number, mode: RoomMode) => void | Promise<void>
  onSetpointStep: (roomId: number, delta: number) => void | Promise<void>
}

const roomModes: RoomMode[] = ['Komfort', 'Natt']
const targetTolerance = 0.5

function getHeatDemandSymbol(value: number) {
  const normalized = Math.max(0, Math.min(100, value))

  if (normalized === 0) {
    return '•'
  }

  return '|'.repeat(Math.min(5, Math.ceil(normalized / 20)))
}

function getHeatDemandLevel(value: number) {
  const normalized = Math.max(0, Math.min(100, value))

  if (normalized === 0) {
    return 'idle'
  }

  if (normalized <= 40) {
    return 'low'
  }

  if (normalized <= 80) {
    return 'medium'
  }

  return 'high'
}

function estimateHeatDemand(temperature: number, targetTemperature: number) {
  const delta = targetTemperature - temperature

  if (delta <= 0) {
    return 0
  }

  if (delta <= 0.5) {
    return 20
  }

  if (delta <= 1) {
    return 40
  }

  if (delta <= 1.5) {
    return 60
  }

  if (delta <= 2) {
    return 80
  }

  return 100
}

function formatSetpoint(value: number) {
  return `${value.toFixed(1).replace('.', ',')}°`
}

function getTemperatureStatusSymbol(temperature: number, targetTemperature: number) {
  const delta = temperature - targetTemperature

  if (Math.abs(delta) <= targetTolerance) {
    return '●'
  }

  return delta < 0 ? '↓' : '↑'
}

export function RoomCard({
  room,
  disabled,
  systemMode,
  showLighting,
  showClimate,
  hasClimateConfig,
  hasModeConfig,
  hasHeatDemandConfig,
  hasSetpointWriteConfig,
  hasLiveTemperatureData,
  hasLiveSetpointData,
  hasLiveHeatDemandData,
  historyTrend,
  temperatureHistory = [],
  comfortSetpoint,
  nightSetpoint,
  feedbackConfiguredZoneIds,
  lightFeedbackConfiguredZoneIds,
  valueFeedbackConfiguredZoneIds,
  derivedLightStateZoneIds,
  confirmedLightFeedbackZoneIds,
  confirmedBrightnessFeedbackZoneIds,
  optimisticLightingByZoneId = {},
  valueUpdateTokens = {},
  onOpenTrendHistory,
  onToggleLight,
  onBrightnessChange,
  onModeChange,
  onSetpointStep,
}: RoomCardProps) {
  const showClimateSection = hasClimateConfig && showClimate
  const showClimateUnavailable = showClimate && !hasClimateConfig
  const showLightingSection = showLighting
  const allowDemoRuntimeData = systemMode !== 'live'
  const hasRealTemperature = allowDemoRuntimeData || hasLiveTemperatureData
  const hasRealSetpoint = allowDemoRuntimeData || hasLiveSetpointData
  const hasRealHeatDemand = allowDemoRuntimeData || hasLiveHeatDemandData
  const temperatureValue = hasRealTemperature ? `${room.temperature}°C` : '—'
  const targetValue = hasRealSetpoint ? formatSetpoint(room.targetTemperature) : '—'
  const setpointControlValue =
    hasRealSetpoint || hasSetpointWriteConfig ? formatSetpoint(room.targetTemperature) : '—'
  const modeValue = hasRealTemperature ? room.mode : '—'
  const modeSetpointValue =
    room.mode === 'Komfort' ? formatSetpoint(comfortSetpoint) : formatSetpoint(nightSetpoint)
  const heatDemandSource =
    hasRealHeatDemand && typeof room.heatDemand === 'number'
      ? 'knx'
      : !hasHeatDemandConfig && hasRealTemperature && hasRealSetpoint
        ? 'estimated'
        : 'none'
  const heatDemandValue =
    heatDemandSource === 'knx' && typeof room.heatDemand === 'number'
      ? room.heatDemand
      : heatDemandSource === 'estimated'
        ? estimateHeatDemand(room.temperature, room.targetTemperature)
        : null
  const heatDemandSymbol =
    typeof heatDemandValue === 'number' ? getHeatDemandSymbol(heatDemandValue) : '—'
  const heatDemandLevel =
    typeof heatDemandValue === 'number' ? getHeatDemandLevel(heatDemandValue) : 'unknown'
  const statusSymbol =
    hasRealTemperature && hasRealSetpoint
      ? getTemperatureStatusSymbol(room.temperature, room.targetTemperature)
      : null
  const watchedTokens = useMemo(() => {
    const values: Record<string, string> = {
      temperature: String(valueUpdateTokens.temperature ?? room.temperature),
      setpoint: String(valueUpdateTokens.setpoint ?? room.targetTemperature),
      heatDemand: String(valueUpdateTokens.heatDemand ?? room.heatDemand ?? 'none'),
    }

    for (const zone of room.zones) {
      values[`light:${zone.id}`] = String(
        valueUpdateTokens[`light:${zone.key}`] ??
          valueUpdateTokens[`light:${zone.id}`] ??
          zone.lightsOn,
      )
      values[`brightness:${zone.id}`] = String(
        valueUpdateTokens[`brightness:${zone.key}`] ??
          valueUpdateTokens[`brightness:${zone.id}`] ??
          zone.brightness,
      )
    }

    return values
  }, [room.heatDemand, room.targetTemperature, room.temperature, room.zones, valueUpdateTokens])
  const previousWatchedValuesRef = useRef<Record<string, string> | null>(null)
  const [updatedValueKeys, setUpdatedValueKeys] = useState<Set<string>>(() => new Set())
  const [localBrightnessByZoneId, setLocalBrightnessByZoneId] = useState<Record<string, number>>({})
  const brightnessDebounceRef = useRef<Record<string, number>>({})
  const brightnessDraggingRef = useRef<Record<string, boolean>>({})
  const brightnessPendingRef = useRef<Record<string, number>>({})
  const brightnessCommittedRef = useRef<Record<string, number>>({})

  useEffect(() => {
    const previousValues = previousWatchedValuesRef.current
    previousWatchedValuesRef.current = watchedTokens

    if (!previousValues) {
      return
    }

    const changedKeys = Object.keys(watchedTokens).filter(
      (key) => previousValues[key] !== watchedTokens[key],
    )

    if (changedKeys.length === 0) {
      return
    }

    setUpdatedValueKeys(new Set(changedKeys))
    const timerId = window.setTimeout(() => {
      setUpdatedValueKeys(new Set())
    }, 1400)

    return () => window.clearTimeout(timerId)
  }, [watchedTokens])

  useEffect(() => {
    setLocalBrightnessByZoneId((current) => {
      const next = { ...current }
      for (const zone of room.zones) {
        if (!brightnessDebounceRef.current[zone.id] && !brightnessDraggingRef.current[zone.id]) {
          next[zone.id] = zone.brightness
          brightnessCommittedRef.current[zone.id] = zone.brightness
        }
      }
      return next
    })
  }, [room.zones])

  useEffect(() => {
    return () => {
      for (const timerId of Object.values(brightnessDebounceRef.current)) {
        window.clearTimeout(timerId)
      }
    }
  }, [])

  const scheduleBrightnessChange = (zoneId: string, value: number) => {
    const nextValue = Math.max(0, Math.min(100, Math.round(value)))
    brightnessPendingRef.current[zoneId] = nextValue
    setLocalBrightnessByZoneId((current) => ({
      ...current,
      [zoneId]: nextValue,
    }))

    if (brightnessDebounceRef.current[zoneId]) {
      window.clearTimeout(brightnessDebounceRef.current[zoneId])
    }

    if (!brightnessDraggingRef.current[zoneId]) {
      brightnessDebounceRef.current[zoneId] = window.setTimeout(() => {
        const pendingValue = brightnessPendingRef.current[zoneId]
        if (
          typeof pendingValue === 'number' &&
          brightnessCommittedRef.current[zoneId] !== pendingValue
        ) {
          brightnessCommittedRef.current[zoneId] = pendingValue
          void Promise.resolve(onBrightnessChange(room.id, zoneId, pendingValue)).catch(() => {
            setLocalBrightnessByZoneId((current) => ({
              ...current,
              [zoneId]: brightnessCommittedRef.current[zoneId] ?? room.zones.find((zone) => zone.id === zoneId)?.brightness ?? 0,
            }))
          })
        }
        delete brightnessDebounceRef.current[zoneId]
      }, 300)
    }
  }

  const flushBrightnessChange = (zoneId: string) => {
    brightnessDraggingRef.current[zoneId] = false
    const timerId = brightnessDebounceRef.current[zoneId]
    if (timerId) {
      window.clearTimeout(timerId)
      delete brightnessDebounceRef.current[zoneId]
    }

    const nextValue = brightnessPendingRef.current[zoneId] ?? localBrightnessByZoneId[zoneId]
    if (typeof nextValue === 'number' && brightnessCommittedRef.current[zoneId] !== nextValue) {
      const previousValue = brightnessCommittedRef.current[zoneId] ?? room.zones.find((zone) => zone.id === zoneId)?.brightness ?? nextValue
      brightnessCommittedRef.current[zoneId] = nextValue
      void Promise.resolve(onBrightnessChange(room.id, zoneId, nextValue)).catch(() => {
        brightnessCommittedRef.current[zoneId] = previousValue
        setLocalBrightnessByZoneId((current) => ({
          ...current,
          [zoneId]: previousValue,
        }))
      })
    }
  }

  return (
    <article className="room-card">
      <div className="room-card__content">
        <div className="room-card__headline">
          <div className="room-card__title-row">
            <p className="room-card__name">{room.name}</p>
            {showClimateSection && statusSymbol ? (
              <p className="room-card__status room-card__status--symbol" aria-label="Klimastatus">
                {statusSymbol}
              </p>
            ) : null}
          </div>
          {showClimateSection ? (
            <div className="room-card__climate-panel">
              <strong
                className={`room-card__temperature ${
                  updatedValueKeys.has('temperature') ? 'is-value-updated' : ''
                }`}
                data-update-highlight={updatedValueKeys.has('temperature') ? 'true' : 'false'}
                data-update-token={watchedTokens.temperature}
              >
                {temperatureValue}
              </strong>
              <div className="room-card__climate-meta">
                <span
                  className={`room-card__setpoint ${
                    updatedValueKeys.has('setpoint') ? 'is-value-updated' : ''
                  }`}
                  data-update-highlight={updatedValueKeys.has('setpoint') ? 'true' : 'false'}
                  data-update-token={watchedTokens.setpoint}
                >
                  {targetValue}
                </span>
                {hasModeConfig ? (
                  <span className="room-card__mode">
                    {modeValue}
                    {hasRealSetpoint ? ` · ${modeSetpointValue}` : ''}
                  </span>
                ) : null}
                <span
                  className={`room-card__heat room-card__heat--${heatDemandLevel}`}
                  data-updated={updatedValueKeys.has('heatDemand') ? 'true' : 'false'}
                  data-update-highlight={updatedValueKeys.has('heatDemand') ? 'true' : 'false'}
                  data-update-token={watchedTokens.heatDemand}
                  aria-label="Varme"
                  title={
                    heatDemandSource === 'knx'
                      ? `Fra KNX varmepådrag${
                          typeof heatDemandValue === 'number'
                            ? ` · ${heatDemandValue.toLocaleString('nb-NO', {
                                minimumFractionDigits: heatDemandValue % 1 === 0 ? 0 : 1,
                                maximumFractionDigits: 1,
                              })}%`
                            : ''
                        }`
                      : heatDemandSource === 'estimated'
                        ? 'Estimert fra temperatur og settpunkt'
                        : 'Ingen varmepådrag-data'
                  }
                >
                  <span className="room-card__heat-label">Varme</span>
                  <span className="room-card__heat-symbol">{heatDemandSymbol}</span>
                  {typeof heatDemandValue === 'number' ? (
                    <span className="room-card__heat-value">
                      {Number(heatDemandValue.toFixed(heatDemandValue > 0 && heatDemandValue < 10 ? 1 : 0)).toLocaleString('nb-NO')}%
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="setpoint-stepper" aria-label="Settpunktjustering">
                <span className="setpoint-stepper__label">Ønsket</span>
                <button
                  type="button"
                  className="setpoint-stepper__button"
                  disabled={disabled || !hasSetpointWriteConfig}
                  onClick={() => void onSetpointStep(room.id, -0.5)}
                  aria-label="Senk settpunkt"
                >
                  −
                </button>
                <strong className="setpoint-stepper__value">{setpointControlValue}</strong>
                <button
                  type="button"
                  className="setpoint-stepper__button"
                  disabled={disabled || !hasSetpointWriteConfig}
                  onClick={() => void onSetpointStep(room.id, 0.5)}
                  aria-label="Øk settpunkt"
                >
                  +
                </button>
                {!hasSetpointWriteConfig ? (
                  <span className="setpoint-stepper__readonly">Kun visning</span>
                ) : null}
              </div>
              {temperatureHistory.length >= 2 ? (
                <Sparkline
                  values={temperatureHistory}
                  label={`Temperaturhistorikk for ${room.name}`}
                  className="room-card__sparkline"
                />
              ) : null}
              {historyTrend ? (
                <p className="room-card__history-trend">Trend: {historyTrend}</p>
              ) : null}
              {onOpenTrendHistory ? (
                <button
                  type="button"
                  className="room-card__trend-button"
                  onClick={() => onOpenTrendHistory(room.key)}
                >
                  Trendhistorikk
                </button>
              ) : null}
            </div>
          ) : showClimateUnavailable ? (
            <div className="room-card__runtime-empty">
              <span>Klima ikke konfigurert</span>
              <strong>Rommet har ingen aktiv klima-runtime i Lynell ennå.</strong>
            </div>
          ) : null}
        </div>
      </div>

      <div className="room-card__controls">
        {showLightingSection ? (
          <div className="zone-list">
            {room.zones.length === 0 ? (
            <div className="zone-card zone-card--empty">
              <p className="zone-card__meta">Ingen aktive lys-soner</p>
            </div>
            ) : room.zones.map((zone) => (
              <div
                key={zone.id}
                className={`zone-card ${
                  (
                    systemMode !== 'live' ||
                    !feedbackConfiguredZoneIds.includes(zone.id) ||
                    confirmedLightFeedbackZoneIds.includes(zone.id)
                  ) && zone.lightsOn
                    ? 'is-active'
                    : ''
                } ${optimisticLightingByZoneId[zone.id] ? 'is-pending-feedback' : ''}`}
              >
                {(() => {
                  const hasFeedbackConfig = feedbackConfiguredZoneIds.includes(zone.id)
                  const hasLightFeedbackConfig =
                    lightFeedbackConfiguredZoneIds.includes(zone.id)
                  const hasValueFeedbackConfig =
                    valueFeedbackConfiguredZoneIds.includes(zone.id)
                  const deriveLightStateFromValueFeedback =
                    derivedLightStateZoneIds.includes(zone.id)
                  const hasConfirmedLightFeedback =
                    confirmedLightFeedbackZoneIds.includes(zone.id)
                  const hasConfirmedBrightnessFeedback =
                    confirmedBrightnessFeedbackZoneIds.includes(zone.id)
                  const optimisticLighting = optimisticLightingByZoneId[zone.id]
                  const hasOptimisticLighting = Boolean(optimisticLighting)
                  const canDeriveLightStateFromBrightness =
                    deriveLightStateFromValueFeedback &&
                    !hasLightFeedbackConfig &&
                    hasValueFeedbackConfig &&
                    hasConfirmedBrightnessFeedback
                  const showLightState =
                    hasOptimisticLighting ||
                    systemMode !== 'live' ||
                    !hasFeedbackConfig ||
                    hasConfirmedLightFeedback ||
                    canDeriveLightStateFromBrightness
                  const showBrightnessState =
                    hasOptimisticLighting ||
                    systemMode !== 'live' || !hasFeedbackConfig || hasConfirmedBrightnessFeedback
                  const sliderBrightness =
                    localBrightnessByZoneId[zone.id] ?? zone.brightness
                  const displayBrightness = optimisticLighting
                    ? optimisticLighting.expectedBrightness
                    : showBrightnessState
                      ? sliderBrightness
                      : 0
                  const displayLightsOn = showLightState
                    ? optimisticLighting
                      ? optimisticLighting.expectedLightsOn
                      : canDeriveLightStateFromBrightness
                      ? displayBrightness > 0
                      : zone.lightsOn
                    : false
                  const displayValue = zone.dimmable
                    ? showBrightnessState
                      ? `${displayBrightness}%`
                      : '—'
                    : displayLightsOn
                      ? 'På'
                      : 'Av'
                  const optimisticStatusLabel =
                    optimisticLighting?.status === 'delayedFeedback'
                      ? 'Sist sendte verdi vises midlertidig. KNX-feedback er forsinket.'
                      : 'Sist sendte verdi vises midlertidig mens Lynell venter på KNX-feedback.'

                  return (
                    <>
                      <div className="zone-card__header">
                        <strong>{zone.name}</strong>
                        <span className="zone-card__status-cluster">
                          {optimisticLighting ? (
                            <button
                              type="button"
                              className={`calm-status-indicator calm-status-indicator--optimistic ${
                                optimisticLighting.status === 'delayedFeedback'
                                  ? 'calm-status-indicator--delayed'
                                  : ''
                              }`}
                              title={optimisticStatusLabel}
                              aria-label={optimisticStatusLabel}
                              data-status-detail={optimisticStatusLabel}
                            >
                              <span aria-hidden="true" />
                            </button>
                          ) : null}
                          <span
                            className={`zone-card__value ${
                              updatedValueKeys.has(`light:${zone.id}`) ||
                              updatedValueKeys.has(`brightness:${zone.id}`)
                                ? 'is-value-updated'
                                : ''
                            }`}
                            data-update-highlight={
                              updatedValueKeys.has(`light:${zone.id}`) ||
                              updatedValueKeys.has(`brightness:${zone.id}`)
                                ? 'true'
                                : 'false'
                            }
                            data-update-token={`${watchedTokens[`light:${zone.id}`]}:${watchedTokens[`brightness:${zone.id}`]}`}
                          >
                            {displayValue}
                          </span>
                        </span>
                      </div>

                      <button
                        type="button"
                        className={`light-toggle ${displayLightsOn ? 'is-on' : ''} ${
                          optimisticLighting ? 'is-pending-feedback' : ''
                        }`}
                        disabled={disabled}
                        onClick={() => onToggleLight(room.id, zone.id)}
                      >
                        <span>Lys</span>
                        <span>{displayLightsOn ? 'På' : 'Av'}</span>
                      </button>

                      {zone.dimmable ? (
                        <input
                          className="brightness-control__slider"
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={displayBrightness}
                          disabled={disabled}
                          data-debounce-mode="commit-on-release"
                          onPointerDown={() => {
                            brightnessDraggingRef.current[zone.id] = true
                          }}
                          onChange={(event) =>
                            scheduleBrightnessChange(zone.id, Number(event.target.value))
                          }
                          onPointerUp={() => flushBrightnessChange(zone.id)}
                          onPointerCancel={() => flushBrightnessChange(zone.id)}
                          onBlur={() => flushBrightnessChange(zone.id)}
                          onKeyUp={() => flushBrightnessChange(zone.id)}
                        />
                      ) : (
                        <p className="zone-card__meta">Av/på</p>
                      )}
                    </>
                  )
                })()}
              </div>
            ))}
          </div>
        ) : null}

        {showClimateSection ? (
          <div className="mode-control" aria-label={`Modus for ${room.name}`}>
            {roomModes.map((mode) => (
              <button
                key={mode}
                type="button"
                className={`mode-control__option ${room.mode === mode ? 'is-active' : ''}`}
                disabled={disabled}
                onClick={() => onModeChange(room.id, mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}
