import type { SystemRoomConfig } from '../config/systemConfig'
import type { RuntimeHistoryPoint } from './runtimeHistory'

const targetTolerance = 0.3

export type RoomHeatNeedAnalysis = {
  status: 'missing' | 'under' | 'normal' | 'over'
  label: string
  detail: string
  averageHeatDemand: number | null
}

export function getRoomConfiguredVolume(roomConfig: SystemRoomConfig | undefined) {
  if (!roomConfig) {
    return null
  }

  if (typeof roomConfig.manualVolumeM3 === 'number' && Number.isFinite(roomConfig.manualVolumeM3)) {
    return roomConfig.manualVolumeM3
  }

  if (typeof roomConfig.roomVolumeM3 === 'number' && Number.isFinite(roomConfig.roomVolumeM3)) {
    return roomConfig.roomVolumeM3
  }

  if (
    typeof roomConfig.floorAreaM2 === 'number' &&
    Number.isFinite(roomConfig.floorAreaM2) &&
    typeof roomConfig.ceilingHeightM === 'number' &&
    Number.isFinite(roomConfig.ceilingHeightM)
  ) {
    return roomConfig.floorAreaM2 * roomConfig.ceilingHeightM
  }

  return null
}

export function getRoomHeatNeedAnalysis(
  roomConfig: SystemRoomConfig | undefined,
  heatDemandPoints: RuntimeHistoryPoint[],
  temperature?: number,
  setpoint?: number,
): RoomHeatNeedAnalysis {
  const volume = getRoomConfiguredVolume(roomConfig)
  const hasEmitterType = Boolean(roomConfig?.heatEmitterType)
  const recentPoints = heatDemandPoints.slice(-12).filter((point) => Number.isFinite(point.value))
  const hasTemperatureBasis = typeof temperature === 'number' && typeof setpoint === 'number'
  const isBelowSetpoint =
    hasTemperatureBasis && temperature < setpoint - targetTolerance

  if (recentPoints.length === 0) {
    if (isBelowSetpoint) {
      return {
        status: 'over',
        label: 'Tynt datagrunnlag',
        detail: 'Rommet ligger under settpunktet, men jeg har lite varmehistorikk ennå.',
        averageHeatDemand: null,
      }
    }

    if (hasTemperatureBasis) {
      return {
        status: 'normal',
        label: 'Tynt datagrunnlag',
        detail: 'Temperatur og settpunkt ser stabile ut, men varmehistorikken er fortsatt tynn.',
        averageHeatDemand: null,
      }
    }

    return {
      status: 'missing',
      label: 'Ikke nok data',
      detail: 'Jeg trenger romdata og litt mer varmehistorikk før jeg vurderer behovet.',
      averageHeatDemand: null,
    }
  }

  const averageHeatDemand =
    recentPoints.reduce((sum, point) => sum + point.value, 0) / recentPoints.length
  const emitterAdjustment =
    roomConfig?.heatEmitterType === 'viftekonvektor'
      ? 6
      : roomConfig?.heatEmitterType === 'elektrisk varme'
        ? 4
        : roomConfig?.heatEmitterType === 'radiator'
          ? 2
          : 0
  const volumeAdjustment =
    typeof volume === 'number' && Number.isFinite(volume)
      ? volume < 25
        ? -8
        : volume > 80
          ? 8
          : volume > 50
            ? 4
            : 0
      : 0
  const hasRoomAnalysisBasis = Boolean(volume && hasEmitterType && recentPoints.length >= 3)
  const overThreshold = hasRoomAnalysisBasis ? 58 + emitterAdjustment + volumeAdjustment : 65
  const underThreshold = 8

  if (averageHeatDemand <= underThreshold && !isBelowSetpoint) {
    return {
      status: 'under',
      label: 'Under normalt behov',
      detail: 'Rommet har hatt svært lavt varmebehov i siste periode.',
      averageHeatDemand,
    }
  }

  if (averageHeatDemand >= overThreshold) {
    return {
      status: 'over',
      label: 'Over normalt behov',
      detail: 'Rommet har hatt høyere varmebehov enn forventet for romvolumet.',
      averageHeatDemand,
    }
  }

  return {
    status: 'normal',
    label: hasRoomAnalysisBasis ? 'Normalt behov' : 'Tynt datagrunnlag',
    detail: hasRoomAnalysisBasis
      ? 'Varmebehovet ser normalt ut for romdataene jeg har.'
      : 'Varmebehovet ser lavt ut, men vurderingen bygger på begrenset historikk.',
    averageHeatDemand,
  }
}

export function getHeatDemandText(value: number) {
  if (value >= 80) {
    return 'varmer tydelig'
  }

  if (value >= 40) {
    return 'varmer moderat'
  }

  return 'varmer lett'
}

export function getHeatDemandBars(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—'
  }

  const normalized = Math.max(0, Math.min(100, value))

  if (normalized === 0) {
    return '•'
  }

  return '|'.repeat(Math.ceil(normalized / 20))
}
