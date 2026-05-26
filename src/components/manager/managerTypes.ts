import type { RuntimeConfig } from '../../config/systemConfig'
import type { RuntimeDeviceContract } from '../../integrations/runtime/integrationRuntimeState'
import type { NivaPresenceComfortSummary } from '../../niva/nivaPresenceComfort'
import type { NivaSessionMemory } from '../../niva/nivaConversationMemory'
import type { NivaIntentGap } from '../../niva/nivaIntentGaps'
import type { NivaObservationDiagnostics } from '../../runtime/nivaObservationalIntelligence'
import type { EnergyIntelligence } from '../../runtime/energyIntelligence'
import type { LynellAudioPlaybackStatus } from '../../audio/audioPlayer'
import type {
  ResolvedUiCapability,
  RoomCapabilitySummary,
  UiCapabilitySummary,
} from '../../runtime/uiCapabilities'
import type {
  IntegrationManagerSnapshot,
  KnxDiagnosticsSnapshot,
  KnxMonitorDiagnostics,
  ServerRuntimeAggregates,
  ServerRuntimeHistory,
  ServerRuntimeInsights,
  ServerRuntimeState,
  RuntimeActionMetrics,
  RuntimeClientSnapshot,
  RuntimeDomainSnapshot,
  RuntimeContinuityStatus,
  RuntimeRegistrySnapshot,
  RuntimeBootStatus,
  BridgeRuntimeConfigPayloadSummary,
  BridgeCastStatus,
  BridgeMqttStatus,
  BridgeVacuumStatus,
  ServerSystemConfigDiagnostics,
  SceneSchedulerDiagnostics,
  AutoPollQuietSignalsConfig,
} from '../../api/homeApi'

export type ManagerDiagnostics = {
  frontendLoadedAt: string
  bridgeBaseUrl: string
  systemConfigTrust?: ServerSystemConfigDiagnostics | null
  systemConfigSource?: 'server' | 'localFallback'
  sceneScheduler?: SceneSchedulerDiagnostics | null
  heatPowerDiagnostics?: {
    roomCount: number
    climateRoomCount: number
    configuredHeatPowerCount: number
    nominalPowerCount: number
    heatPowerCoveragePercent: number
    roomsMissingHeatPower: Array<{ roomKey: string; roomName: string }>
  }
  optimisticLightingDiagnostics?: {
    optimisticStateCount: number
    pendingFeedbackCount: number
    delayedFeedbackCount: number
    averageFeedbackLatencyMs: number | null
    rollbackCount: number
    failedWriteCount: number
    createdCount: number
    confirmedCount: number
    timeoutMs: number
    calmIndicatorsActive: boolean
    tooltipSystemActive: boolean
    activeEntries: Array<{
      key: string
      roomName: string
      zoneName: string
      expectedLightsOn: boolean
      expectedBrightness: number
      source: string
      status: string
      ageMs: number
      startedAt: string
      timeoutAt: string
      writeGroupAddress: string | null
      feedbackGroupAddress: string | null
      message: string
    }>
    latestDelayedSignals: Array<{
      key: string
      roomName: string
      zoneName: string
      expectedBrightness: number
      ageMs: number
      at: string
    }>
    latestRollbackSignals: Array<{
      key: string
      roomName: string
      zoneName: string
      reason: string
      at: string
    }>
  }
  audioDiagnostics?: {
    enabled: boolean
    manifestCount: number
    placeholderCount: number
    missingFiles: string[]
    lastSoundPlayed: LynellAudioPlaybackStatus | null
    categoriesEnabled: Record<string, boolean>
  }
  idleScreenDiagnostics?: {
    enabled: boolean
    idleTimeoutSeconds: number
    customImageConfigured: boolean
    usingCustomImage: boolean
    currentlyVisible: boolean
    lastActivityAt: string | null
  }
  knxMonitor?: (Partial<KnxMonitorDiagnostics> & {
    localEventCount?: number
    filteredEventCount?: number
    paused?: boolean
    windowMode?: string
    error?: string | null
  }) | null
  conversationLoggingEnabled?: boolean
  conversationLoggingStatus?: string
  autoPollQuietSignals?: AutoPollQuietSignalsConfig
  autoPollTargetDiagnostics?: {
    enabled: boolean
    mode: string
    eligibleCount: number
    selectedCount: number
    ineligibleCount: number
    lastAutoPoll: string | null
    nextAllowedPoll: string | null
    skippedReason: string | null
    preview: Array<{
      signalId: string
      roomKey: string
      roomName: string
      field: string
      groupAddress: string
      updateMode: 'cyclic' | 'onChange' | 'manualPoll' | 'unknown'
      staleRelevant: boolean
      eligible: boolean
      selected: boolean
      reason: string
    }>
  }
  shadingDiagnostics?: {
    entryCount: number
    activeCount: number
    visibleCount: number
    missingMappingCount: number
    partialMappingCount?: number
    liveReadyCount?: number
    hiddenReason: string | null
    lastCommand?: Record<string, unknown> | null
    lastFeedback?: Record<string, unknown> | null
    pendingConfirmationCount?: number
    writeFailureCount?: number
    entries: Array<{
      shadingId: string
      roomId: string
      roomName: string
      zoneId: string
      zoneName: string
      label: string
      type: string
      enabled: boolean
      visible: boolean
      maturity: string
      status: string
      statusLabel: string
      missingFields: string[]
      missingMapping: boolean
      partialMapping?: boolean
      liveReady?: boolean
      actionAvailability?: Record<string, unknown>
      defaultDpts?: Record<string, string>
      invertUpDown?: boolean
      invertPosition?: boolean
      hiddenReason: string | null
      configuredAddresses: Array<{ field: string; groupAddress: string }>
    }>
  }
  cameraFoundationDiagnostics?: {
    providerEnabled: boolean
    cameraCount: number
    visibleCount: number
    enabledCount: number
    missingInputCount: number
    recordingEnabledCount: number
    onlineCount: number
    staleCount: number
    offlineCount: number
    recorderTarget: string
    recorderTargetLabel: string
    retentionDays: number
    overwriteOldest: boolean
    storageHealth: string
    freeSpaceEstimateGb: number | null
    entries: Array<{
      cameraId: string
      displayName: string
      type: string
      typeLabel: string
      roomId: string
      roomName: string
      enabled: boolean
      visible: boolean
      state: string
      trustStatus: string
      statusLabel: string
      recordingEnabled: boolean
      recorderTarget: string
      retentionDays: number
      overwriteOldest: boolean
      motionAvailable: boolean
      audioAvailable: boolean
      confidence: string
      hasRtsp: boolean
      hasOnvif: boolean
      hasSnapshot: boolean
      missingStream: boolean
    }>
  }
  mediaGroupDiagnostics?: {
    groupCount: number
    enabledCount: number
    onlineCount: number
    staleCount: number
    offlineCount: number
    speakerCount: number
    castTargetCount: number
    delayOffsetCount: number
    lowConfidenceCount: number
    groups: Array<{
      mediaGroupId: string
      displayName: string
      enabled: boolean
      state: string
      groupConfidence: string
      speakerCount: number
      castTargetCount: number
      delayOffsetCount: number
      status: string
    }>
  }
  conversationFeedbackReview?: ServerSystemConfigDiagnostics['conversationFeedbackReview'] | null
  learningSuggestionFoundation?: {
    enabled: boolean
    proposalOnly: boolean
    actionExecution: boolean
    approvalRequiredFuture: boolean
    candidateCount: number
    candidates: Array<{
      roomKey: string
      roomName: string
      zoneKey: string | null
      hour: number
      brightness: number
      count: number
    }>
  }
  bridgeApiDiagnostics: {
    bridgeBaseUrl: string
    configuredBridgeBaseUrl: string | null
    defaultBridgeBaseUrl: string
    configuredBridgeIgnoredReason: string | null
    loopbackOverride: boolean
    lastFailedEndpoint: {
      endpoint: string
      message: string
      at: string
      bridgeBaseUrl: string
    } | null
  }
  frontendHost: string
  frontendAccessMode: 'local' | 'vpn' | 'unknown'
  localFrontendUrl: string
  vpnFrontendUrl: string
  vpnEnabled: boolean
  vpnReady: boolean
  preferredConnection: 'local' | 'vpn'
  bridgeReachable: boolean | null
  bridgeHealthCheckedAt: string | null
  bridgeHealthError: string | null
  bridgeRuntimeConfigReceived: boolean
  bridgeHealthConnectionMode: 'localDirect' | 'remoteTunnel' | null
  bridgeHealthWriteMappingCounts: {
    light: number
    dim: number
    climate: number
  } | null
  bridgeLightSubscribeActive: boolean
  bridgeClimateSubscribeActive: boolean
  bridgeStatus: 'syncing' | 'ready' | 'error'
  bridgeStatusLabel: string
  bridgeSyncedAt: string | null
  runtimeConfigSyncAttempted: boolean
  runtimeConfigSyncSkippedReason: string | null
  runtimeConfigSyncPosted: boolean
  runtimeConfigSyncPostFailed: boolean
  lastManualRuntimeConfigTriggerAt: string | null
  lastRuntimeConfigPostUrl: string | null
  lastRuntimeConfigPayloadPreview: string | null
  lastRuntimeConfigPostStatus: string | null
  lastRuntimeConfigPostError: string | null
  runtimeConfigBuilderReady: boolean
  runtimeConfigBuilderRoomCount: number
  runtimeConfigBuilderMappingCounts: {
    write: number
    feedback: number
    targets: number
  }
  lastRuntimeConfigPushAttemptAt: string | null
  lastRuntimeConfigPushAt: string | null
  lastRuntimeConfigPushOk: boolean | null
  lastRuntimeConfigPushError: string | null
  latestRuntimeConfigPayloadSummary: BridgeRuntimeConfigPayloadSummary | null
  lastUpdatedAt: string | null
  systemMode: RuntimeConfig['systemMode']
  connectionMode: 'localDirect' | 'remoteTunnel'
  lightFeedbackStrategy: 'subscribe' | 'polling-fallback' | 'off'
  lightFeedbackStatus: string
  lightFeedbackReason: string
  climateFeedbackStrategy: 'subscribe' | 'polling-fallback' | 'off'
  climateFeedbackRequestedMethod: RuntimeConfig['climateFeedbackMethod']
  climateFeedbackReason: string
  climateFeedbackStatus: string
  climateFeedbackStatusReason: string
  climateSubscribePointCount: number
  climateSubscribeRooms: string[]
  heatDemandStatus: string
  heatDemandStatusDetail: string
  heatDemandConfiguredRoomCount: number
  heatDemandLiveRoomCount: number
  heatDemandHistoryPointCount: number
  lastClimateEvent: {
    label: string
    detail: string
    at: string
    address?: string | null
    dataType?: string | null
    mappingVariant?: string | null
    rawValue?: string | number | boolean | null
    mappedValue?: string | number | boolean | null
  } | null
  lastClimateError: {
    label: string
    detail: string
    at: string
  } | null
  activeViewLabel: string
  activeTargetsLabel: string
  activeTargetsCount: number
  mqttEnabled: boolean
  mqttBaseTopic: string
  mqttStatus?: BridgeMqttStatus | null
  lastKnxInMqttTopic: string | null
  lastKnxOutMqttTopic: string | null
  lastKnxIn: {
    label: string
    detail: string
    at: string
    address?: string | null
    dataType?: string | null
    interpretationRule?: string | null
    mappingVariant?: string | null
    rawValue?: string | number | boolean | null
    mappedValue?: string | number | boolean | null
  } | null
  lastKnxOut: {
    label: string
    detail: string
    at: string
    address?: string | null
    dataType?: string | null
    interpretationRule?: string | null
    mappingVariant?: string | null
    rawValue?: string | number | boolean | null
    mappedValue?: string | number | boolean | null
  } | null
  lastRuntimeError: {
    label: string
    detail: string
    at: string
  } | null
  lastRuntimeTimeout: {
    label: string
    detail: string
    at: string
  } | null
  testLog: {
    id: string
    at: string
    category: string
    text: string
  }[]
  runtimeContracts: RuntimeDeviceContract[]
  serverRuntimeState: ServerRuntimeState | null
  serverRuntimeHistory: ServerRuntimeHistory | null
  serverRuntimeAggregates: ServerRuntimeAggregates | null
  serverRuntimeInsights: ServerRuntimeInsights | null
  serverRuntimeCheckedAt: string | null
  serverRuntimeError: string | null
  nivaLanguageDiagnostics: {
    sourceSummary: string
    liveWordingCount: number
    restoredWordingCount: number
    sparseWordingCount: number
    dedupeCount: number
    staleBasedWordingCount: number
    lastPolishedAt: string | null
  }
  nivaObservationDiagnostics?: NivaObservationDiagnostics
  uiCapabilities?: {
    summary: UiCapabilitySummary
    capabilities: ResolvedUiCapability[]
    roomSummaries: RoomCapabilitySummary[]
    showFutureFeatures: boolean
    hclFoundationActive: boolean
    hclDryRun: boolean
    shadingVisible: boolean
  }
  calendarActionTrust?: {
    pending: number
    queued: number
    creating: number
    created: number
    failed: number
    cancelled: number
    stale: number
    duplicatePreventedCount: number
    latestAction: {
      actionId: string
      state: string
      summary: string
      confidence: string
      proposedAt: string
      confirmedAt: string | null
      completedAt: string | null
      failedAt: string | null
      cancelledAt: string | null
      staleAt: string | null
      error: string | null
      duplicatePrevented: boolean
      duplicateOf: string | null
      eventCount: number
      events: Array<{
        id: string
        title: string
        date: string
        startTime: string
        endTime: string
      }>
    } | null
    recentActions: Array<{
      actionId: string
      state: string
      summary: string
      confidence: string
      proposedAt: string
      confirmedAt: string | null
      completedAt: string | null
      failedAt: string | null
      cancelledAt: string | null
      staleAt: string | null
      error: string | null
      duplicatePrevented: boolean
      duplicateOf: string | null
      eventCount: number
      events: Array<{
        id: string
        title: string
        date: string
        startTime: string
        endTime: string
      }>
    }>
  }
  energyIntelligence?: EnergyIntelligence
  runtimeEventStream: {
    connected: boolean
    connectionState: 'connecting' | 'reconnecting' | 'synced' | 'stale' | 'offline'
    reconnectAttempt: number
    reconnectDelayMs: number | null
    reconnectCount: number
    eventsLastMinute: number
    pollingRequestsPerMinute: number
    fallbackRefreshCount: number
    reducerApplyCount: number
    replayedEvents: number
    droppedEvents: number
    staleTransitions: number
    eventBufferSize: number
    latestEventId: string | null
    lastAppliedEventId: string | null
    replaySupported: boolean
    resyncRequiredCount: number
    reducerStatus: 'applied' | 'ignored' | 'resyncRequired' | 'standby'
    fallbackPollingStatus: string
    runtimeEventHealthy: boolean
    degradedEventStream: boolean
    pollingFallbackMode: 'steady' | 'relaxed' | 'elevated'
    averageEventLatency: number | null
    maxEventLatency: number | null
    averageReducerTime: number | null
    averageRuntimeRefreshTime: number | null
    topPollingSources: Array<{ path: string; count: number }>
    actionMetrics: RuntimeActionMetrics | null
    clientIdentity: RuntimeClientSnapshot | null
    runtimeDomains: RuntimeDomainSnapshot | null
    runtimeContinuity: RuntimeContinuityStatus | null
    runtimeRegistry: RuntimeRegistrySnapshot | null
    runtimeBoot: RuntimeBootStatus | null
    soakMetrics: Record<string, unknown> | null
    clients: Array<{
      clientId: string
      sessionId: string
      connectedAt: string
      lastEventId: string | null
      sentEvents: number
      droppedEvents: number
      reconnectCount: number
      lastSentAt: string | null
    }>
    lastEventChain: string[]
    lastEventAt: string | null
    lastSuccessfulSyncAt: string | null
    lastDisconnectedAt: string | null
    frontendFreshness: 'fresh' | 'stale' | 'offline'
    staleAfterMs: number
    offlineAfterMs: number
    frontendStateAgeMs: number | null
    runtimeDriftSuspected: boolean
    staleStateCount: number
    offlineStateCount: number
    reconnectHistory: Array<{
      at: string
      state: 'connecting' | 'reconnecting' | 'synced' | 'stale' | 'offline'
      attempt: number
      delayMs: number | null
      lastEventId: string | null
    }>
    latencyMs: number | null
    error: string | null
  }
  integrationManager: IntegrationManagerSnapshot | null
  integrationManagerCheckedAt: string | null
  integrationManagerError: string | null
  castRuntime: BridgeCastStatus | null
  vacuumRuntime: BridgeVacuumStatus | null
  knxDiagnostics: KnxDiagnosticsSnapshot | null
  knxDiagnosticsCheckedAt: string | null
  knxDiagnosticsError: string | null
  resolvedRoomTruthConflicts: string[]
  resolvedRoomTruthSources: Array<{
    roomKey: string
    roomName: string
    temperatureSource: string
    temperatureGroupAddress: string | null
    setpointSource?: string
    setpointGroupAddress?: string | null
    setpointTimestamp?: string | null
    heatDemandSource: string
    heatDemandGroupAddress: string | null
    lightSource: string
    lightGroupAddress: string | null
    brightnessSource: string
    brightnessGroupAddress: string | null
  }>
  canonicalRoomTruthDiagnostics?: {
    resolver: string
    priorityModel: string[]
    roomCount: number
    truthDivergenceCount: number
    crossViewMismatchCount: number
    optimisticConsistency: string
    staleConsistency: Record<string, number>
    sourceDistribution: Record<string, number>
    pendingCount: number
    staleOrOfflineCount: number
    lastReconciliationCorrection: {
      key: string
      roomName: string
      zoneName: string
      reason: string
      at: string
    } | null
    clientDriftSuspected: boolean
    rooms: Array<{
      roomKey: string
      roomName: string
      optimisticPending: boolean
      staleCount: number
      fields: Record<
        string,
        {
          valueLabel: string
          source: string
          groupAddress: string | null
          freshness: string
          confidence: string
          timestamp: string | null
        }
      >
    }>
  }
  nivaIntentGaps: NivaIntentGap[]
  nivaInteractionDiagnostics?: {
    confidenceDistribution: {
      understood: number
      partial: number
      uncertain: number
    }
    clarificationCount: number
    misunderstoodIntentCount: number
    successfulConversationalActions: number
    roomAliasMatches: number
    fallbackUsageCount: number
    latestParse: {
      at: string
      text: string
      intent: string | null | undefined
      confidence: 'understood' | 'partial' | 'uncertain'
      roomName: string | null
      proposedAction: string | null
      clarification: string | null
    } | null
    rawParses: Array<{
      at: string
      text: string
      intent: string | null | undefined
      confidence: 'understood' | 'partial' | 'uncertain'
      roomName: string | null
      proposedAction: string | null
      clarification: string | null
    }>
  }
  nivaSessionMemory: NivaSessionMemory
  nivaPresenceComfort: NivaPresenceComfortSummary
}
