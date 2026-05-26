import type {
  KnxRoomPollResult,
  RuntimeEventPayload,
  ServerRuntimeHistory,
} from '../api/homeApi'

export type RuntimeEventPollState = {
  loading: boolean
  lastPollAt: string | null
  error: string | null
  result: KnxRoomPollResult | null
}

export type RuntimeEventReducerState = {
  history: ServerRuntimeHistory | null
  updateTokens: Record<string, string>
  roomPollStateByKey: Record<string, RuntimeEventPollState>
}

export type RuntimeEventReducerResult = RuntimeEventReducerState & {
  shouldRefreshRuntime: boolean
  resyncRequired: boolean
  lastAppliedEventId: string | null
  reducerStatus: 'applied' | 'ignored' | 'resyncRequired'
  reducerDurationMs: number
  eventLineage: string[]
}

function getEventToken(event: RuntimeEventPayload) {
  return event.updateToken ?? `${event.type}:${event.timestamp}`
}

function getEventFieldKey(event: RuntimeEventPayload) {
  if (event.field === 'setpointFeedback') {
    return 'setpoint'
  }

  if (event.field === 'lightFeedback') {
    return `light:${event.zoneKey ?? 'room'}`
  }

  if (event.field === 'valueFeedback') {
    return `brightness:${event.zoneKey ?? 'room'}`
  }

  if (event.field === 'brightness') {
    return event.zoneKey ? `brightness:${event.zoneKey}` : 'brightness'
  }

  if (event.field === 'light') {
    return event.zoneKey ? `light:${event.zoneKey}` : 'light'
  }

  return event.field ?? event.type
}

function mergeHistoryPoint(
  history: ServerRuntimeHistory | null,
  event: RuntimeEventPayload,
): ServerRuntimeHistory | null {
  if (!history || event.type !== 'historyPointAdded' || !event.point) {
    return history
  }

  const point = event.point
  const category = point.category ?? 'runtime'
  const nextPoints = [...history.points, point].slice(-2400)
  const categoryCollection = history.collections[category] ?? {
    events: [],
    points: [],
  }

  return {
    ...history,
    pointCount: Math.max(history.pointCount, nextPoints.length),
    points: nextPoints,
    collections: {
      ...history.collections,
      [category]: {
        ...categoryCollection,
        points: [...categoryCollection.points, point].slice(-2400),
      },
    },
    sparse: false,
  }
}

function mergePollState(
  roomPollStateByKey: Record<string, RuntimeEventPollState>,
  event: RuntimeEventPayload,
) {
  if (event.type !== 'pollCompleted' || !event.poll || !event.roomKey) {
    return roomPollStateByKey
  }

  const failedGroups = Array.isArray(event.poll.failedGroups) ? event.poll.failedGroups : []
  const skippedGroups = Array.isArray(event.poll.skippedGroups) ? event.poll.skippedGroups : []
  const normalizedPoll = {
    ...event.poll,
    requestedGroups: Array.isArray(event.poll.requestedGroups) ? event.poll.requestedGroups : [],
    updatedGroups: Array.isArray(event.poll.updatedGroups) ? event.poll.updatedGroups : [],
    failedGroups,
    skippedGroups,
    diagnostics: {
      realFailedCount: event.poll.diagnostics?.realFailedCount ?? failedGroups.length,
      skippedCount: event.poll.diagnostics?.skippedCount ?? skippedGroups.length,
      failedCount: event.poll.diagnostics?.failedCount ?? failedGroups.length,
      classifications: event.poll.diagnostics?.classifications ?? {},
    },
  }

  return {
    ...roomPollStateByKey,
    [event.roomKey]: {
      loading: false,
      lastPollAt: normalizedPoll.timestamp ?? event.at,
      error:
        normalizedPoll.diagnostics.realFailedCount && normalizedPoll.diagnostics.realFailedCount > 0
          ? `${normalizedPoll.diagnostics.realFailedCount} grupper svarte ikke`
          : null,
      result: normalizedPoll,
    },
  }
}

function mergeUpdateTokens(updateTokens: Record<string, string>, event: RuntimeEventPayload) {
  if (!event.roomKey && !event.roomId) {
    return updateTokens
  }

  const roomKey = event.roomKey ?? event.roomId ?? ''
  const fieldKey = getEventFieldKey(event)

  return {
    ...updateTokens,
    [`${roomKey}:${fieldKey}`]: getEventToken(event),
  }
}

export function applyRuntimeEvent(
  state: RuntimeEventReducerState,
  event: RuntimeEventPayload,
): RuntimeEventReducerResult {
  const startedAt = performance.now()
  if (event.type === 'resyncRequired') {
    return {
      ...state,
      shouldRefreshRuntime: true,
      resyncRequired: true,
      lastAppliedEventId: event.eventId ?? event.id ?? null,
      reducerStatus: 'resyncRequired',
      reducerDurationMs: performance.now() - startedAt,
      eventLineage: [
        'SSE resyncRequired',
        'Runtime reducer requested full refresh',
        'Polling fallback refresh scheduled',
      ],
    }
  }

  const nextState = {
    history: mergeHistoryPoint(state.history, event),
    updateTokens: mergeUpdateTokens(state.updateTokens, event),
    roomPollStateByKey: mergePollState(state.roomPollStateByKey, event),
  }
  const shouldRefreshRuntime = [
    'roomUpdated',
    'knxValueUpdated',
    'signalLoggerPoint',
    'pollCompleted',
    'providerStateChanged',
    'runtimeSnapshotUpdated',
    'runtimeFreshnessChanged',
    'runtimeSnapshotRestored',
    'runtimePartialRestore',
    'runtimeRecoveryDetected',
  ].includes(event.type)
  const actionEventApplied = [
    'actionCreated',
    'actionApproved',
    'actionExecuted',
    'actionFailed',
    'actionCancelled',
    'actionPendingApproval',
    'actionApprovalRequested',
    'actionDenied',
    'actionExecutionStarted',
    'actionExecutionCompleted',
    'runtimeSnapshotCreated',
    'runtimeSnapshotRestored',
    'runtimePartialRestore',
    'runtimeRecoveryDetected',
    'insightGenerated',
    'insightUpdated',
    'insightResolved',
    'insightAcknowledged',
    'providerRegistered',
    'registryUpdated',
    'runtimeServiceHealthChanged',
    'runtimeBootPhaseChanged',
    'providerBootCompleted',
    'providerBootDegraded',
    'runtimeReady',
    'runtimeDegraded',
    'policyUpdated',
    'auditEventCreated',
  ].includes(event.type)

  return {
    ...nextState,
    shouldRefreshRuntime,
    resyncRequired: false,
    lastAppliedEventId: event.eventId ?? event.id ?? null,
    reducerStatus: shouldRefreshRuntime || event.type === 'historyPointAdded' || actionEventApplied ? 'applied' : 'ignored',
    reducerDurationMs: performance.now() - startedAt,
    eventLineage: [
      event.source ? `${event.source} emitted ${event.type}` : `SSE emitted ${event.type}`,
      event.domainId ? `domain ${event.domainId}` : null,
      event.capabilityContext ? `capability ${event.capabilityContext}` : null,
      event.relatedEntityIds?.length ? `entities ${event.relatedEntityIds.slice(0, 3).join(', ')}` : null,
      event.groupAddress ? `KNX/cache ${event.groupAddress}` : null,
      event.roomKey ?? event.roomId ? `room ${event.roomKey ?? event.roomId} updated` : null,
      event.type === 'historyPointAdded' ? 'history datapoint merged' : null,
      'runtime reducer applied update token',
    ].filter((entry): entry is string => Boolean(entry)),
  }
}
