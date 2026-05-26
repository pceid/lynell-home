import type { KnxRoomMapping } from '../knx/knxMapping'

export type BridgeRuntimeConfigPayloadSummary = {
  source: 'saved-system-config' | 'current-runtime-cache' | 'baseline-knx-mapping'
  roomCount: number
  knxEnabledRoomCount: number
  lightWriteCount: number
  dimWriteCount: number
  climateWriteCount: number
  lightFeedbackCount: number
  dimFeedbackCount: number
  climateFeedbackCount: number
  signalLoggerCount: number
  totalWriteMappings: number
  totalFeedbackMappings: number
  totalRuntimeTargets: number
  payloadSizeBytes?: number
}

export function isConfiguredAddress(value: string | undefined) {
  return Boolean(value?.trim()) && !value?.trim().startsWith('placeholder/')
}

export function summarizeKnxRuntimeMapping(
  mapping: Record<string, KnxRoomMapping>,
  source: BridgeRuntimeConfigPayloadSummary['source'] = 'saved-system-config',
): BridgeRuntimeConfigPayloadSummary {
  const rooms = Object.entries(mapping)
  const lightWriteCount = rooms.reduce(
    (count, [, roomMapping]) =>
      count +
      Object.values(roomMapping.zones ?? {}).filter((zone) =>
        isConfiguredAddress(zone.light),
      ).length,
    0,
  )
  const dimWriteCount = rooms.reduce(
    (count, [, roomMapping]) =>
      count +
      Object.values(roomMapping.zones ?? {}).filter((zone) =>
        zone.dimmable && isConfiguredAddress(zone.value),
      ).length,
    0,
  )
  const climateWriteCount = rooms.filter(([, roomMapping]) =>
    Boolean(
      roomMapping.climateActive &&
        roomMapping.liveClimateActive &&
        (isConfiguredAddress(roomMapping.setpoint) || isConfiguredAddress(roomMapping.mode)),
    ),
  ).length
  const lightFeedbackCount = rooms.reduce(
    (count, [, roomMapping]) =>
      count +
      Object.values(roomMapping.zones ?? {}).filter((zone) =>
        isConfiguredAddress(zone.lightFeedback),
      ).length,
    0,
  )
  const dimFeedbackCount = rooms.reduce(
    (count, [, roomMapping]) =>
      count +
      Object.values(roomMapping.zones ?? {}).filter((zone) =>
        isConfiguredAddress(zone.valueFeedback),
      ).length,
    0,
  )
  const climateFeedbackCount = rooms.reduce((count, [, roomMapping]) => {
    if (!roomMapping.climateActive || !roomMapping.liveClimateActive) {
      return count
    }

    return (
      count +
      [
        roomMapping.temperature,
        roomMapping.setpointFeedback,
        roomMapping.modeFeedback,
        roomMapping.heatDemand,
      ].filter((address) => isConfiguredAddress(address)).length
    )
  }, 0)
  const knxEnabledRoomCount = rooms.filter(([, roomMapping]) => {
    const zoneHasMapping = Object.values(roomMapping.zones ?? {}).some(
      (zone) =>
        isConfiguredAddress(zone.light) ||
        isConfiguredAddress(zone.value) ||
        isConfiguredAddress(zone.lightFeedback) ||
        isConfiguredAddress(zone.valueFeedback),
    )
    const climateHasMapping =
      roomMapping.climateActive &&
      roomMapping.liveClimateActive &&
      [
        roomMapping.temperature,
        roomMapping.setpoint,
        roomMapping.setpointFeedback,
        roomMapping.mode,
        roomMapping.modeFeedback,
        roomMapping.heatDemand,
      ].some((address) => isConfiguredAddress(address))

    return zoneHasMapping || climateHasMapping
  }).length

  return {
    source,
    roomCount: rooms.length,
    knxEnabledRoomCount,
    lightWriteCount,
    dimWriteCount,
    climateWriteCount,
    lightFeedbackCount,
    dimFeedbackCount,
    climateFeedbackCount,
    signalLoggerCount: 0,
    totalWriteMappings: lightWriteCount + dimWriteCount + climateWriteCount,
    totalFeedbackMappings: lightFeedbackCount + dimFeedbackCount + climateFeedbackCount,
    totalRuntimeTargets: lightFeedbackCount + dimFeedbackCount + climateFeedbackCount,
  }
}
