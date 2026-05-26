import { useState } from 'react'
import type { ManagerDiagnostics } from './managerTypes'
import {
  createKnxSignalLogger,
  deleteKnxSignalLogger,
  runKnxEtsAudit,
  runKnxSingleGaAction,
  updateKnxSignalLogger,
} from '../../api/homeApi'
import {
  formatRuntimeConnectionState,
  formatRuntimeReadinessState,
  getRuntimeConnectionTone,
} from '../../integrations/runtime/integrationRuntimeState'
import { ambientRuntimeCopy } from '../../niva/ambientLanguage'
import { createFallbackNivaPresenceComfortSummary } from '../../niva/nivaPresenceComfort'
import { createInitialNivaSessionMemory } from '../../niva/nivaConversationMemory'

type DiagnosticSignal =
  | ManagerDiagnostics['lastKnxIn']
  | ManagerDiagnostics['lastKnxOut']
  | ManagerDiagnostics['lastClimateEvent']

type ManagerDiagnosticsSectionProps = {
  diagnostics: ManagerDiagnostics
  onClearTestLog: () => void
  onRuntimeActionDecision?: (actionId: string, decision: 'approve' | 'deny') => void | Promise<void>
  onManualRuntimeConfigSync?: () => void | Promise<void>
  onSceneSchedulerTest?: (sceneId: string, dryRun: boolean) => void | Promise<void>
}

function formatDiagnosticSignal(signal: DiagnosticSignal) {
  if (!signal) {
    return ['—']
  }

  const lines = [`${signal.at} · ${signal.label} · ${signal.detail}`]

  if (signal.address) {
    lines.push(`Adresse: ${signal.address}`)
  }

  if (signal.dataType) {
    lines.push(`Datatype: ${signal.dataType}`)
  }

  if ('interpretationRule' in signal && signal.interpretationRule && signal.interpretationRule !== 'standard') {
    lines.push(`Tolkning: ${signal.interpretationRule}`)
  }

  if (signal.mappingVariant) {
    lines.push(`Mapping: ${signal.mappingVariant}`)
  }

  if (signal.rawValue !== undefined && signal.rawValue !== null) {
    lines.push(`Rå verdi: ${String(signal.rawValue)}`)
  }

  if (signal.mappedValue !== undefined && signal.mappedValue !== null) {
    lines.push(`Mappet verdi: ${String(signal.mappedValue)}`)
  }

  return lines
}

function formatStrategyLabel(strategy: string) {
  return strategy === 'polling-fallback' ? 'polling-fallback' : strategy
}

function formatDateTime(value: string | number | null | undefined) {
  if (!value) {
    return '—'
  }

  const timestamp = typeof value === 'number' ? value : Date.parse(value)
  if (!Number.isFinite(timestamp)) {
    return '—'
  }

  return new Intl.DateTimeFormat('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(timestamp)
}

function formatOptimisticLightingStatus(status: string) {
  if (status === 'pendingFeedback') {
    return 'avventer'
  }

  if (status === 'delayedFeedback') {
    return 'forsinket'
  }

  return status
}

function getReadinessStatus(diagnostics: ManagerDiagnostics) {
  const hasUnavailableFeedback =
    diagnostics.lightFeedbackStatus === 'Utilgjengelig' ||
    diagnostics.climateFeedbackStatus === 'Utilgjengelig'
  const hasRuntimeError = Boolean(diagnostics.lastRuntimeError || diagnostics.lastClimateError)

  if (diagnostics.bridgeReachable === false) {
    return {
      label: 'Needs attention',
      tone: 'danger',
      detail: 'Appen er våken, men bridge er ikke tilgjengelig på valgt URL.',
    }
  }

  if (diagnostics.bridgeStatus === 'error' || hasUnavailableFeedback || hasRuntimeError) {
    return {
      label: 'Watch',
      tone: 'danger',
      detail: 'Et runtime-signal trenger oppfølging.',
    }
  }

  if (
    diagnostics.systemMode === 'live' &&
    diagnostics.connectionMode === 'localDirect' &&
    diagnostics.bridgeStatus === 'ready' &&
    diagnostics.activeTargetsCount > 0
  ) {
    return {
      label: 'Live',
      tone: 'ready',
      detail: 'Live Mode, lokal tilgang og aktive runtime-kilder er på plass.',
    }
  }

  return {
    label: ambientRuntimeCopy.gentleWatch,
    tone: 'partial',
    detail: 'Systemet er stabilt, men enkelte kilder bruker siste kjente eller forberedt state.',
  }
}

function formatCompactDiagnosticEvent(
  signal: ManagerDiagnostics['lastKnxIn'] | ManagerDiagnostics['lastClimateEvent'],
) {
  if (!signal) {
    return '—'
  }

  const address = signal.address ? ` · ${signal.address}` : ''
  const value =
    signal.mappedValue !== undefined && signal.mappedValue !== null
      ? ` · ${String(signal.mappedValue)}`
      : signal.rawValue !== undefined && signal.rawValue !== null
        ? ` · ${String(signal.rawValue)}`
        : ''

  return `${signal.at} · ${signal.label}${address}${value}`
}

function formatCompactDiagnosticError(diagnostics: ManagerDiagnostics) {
  const error = diagnostics.lastRuntimeError ?? diagnostics.lastClimateError
  return error ? `${error.at} · ${error.detail}` : '—'
}

export function ManagerDiagnosticsSection({
  diagnostics,
  onClearTestLog,
  onRuntimeActionDecision,
  onManualRuntimeConfigSync,
  onSceneSchedulerTest,
}: ManagerDiagnosticsSectionProps) {
  const [signalLoggerDraft, setSignalLoggerDraft] = useState({
    name: '',
    groupAddress: '',
    dataType: '1-byte' as '1-bit' | '1-byte' | '2-byte',
    dpt: '5.001',
    category: 'runtime',
    roomKey: '',
    updateMode: 'unknown' as 'cyclic' | 'onChange' | 'manualPoll' | 'unknown',
    expectedIntervalMs: '',
  })
  const [signalLoggerStatus, setSignalLoggerStatus] = useState<string | null>(null)
  const [singleGaDraft, setSingleGaDraft] = useState({
    action: 'poll' as 'poll' | 'write',
    groupAddress: '',
    dpt: '5.001' as '1.001' | '5.001' | '9.001' | '20.102',
    value: '',
  })
  const [singleGaStatus, setSingleGaStatus] = useState<string | null>(null)
  const [etsAuditStatus, setEtsAuditStatus] = useState<string | null>(null)
  const sceneScheduler = diagnostics.sceneScheduler
  const nextSceneId = sceneScheduler?.nextExecution?.sceneId ?? null
  const lastExecutionTargetResults = Array.isArray(sceneScheduler?.lastExecutionResult?.targetResults)
    ? sceneScheduler.lastExecutionResult.targetResults
    : []
  const lastDryRunTargets = Array.isArray(sceneScheduler?.lastDryRun?.targets)
    ? sceneScheduler.lastDryRun.targets
    : []
  const readinessStatus = getReadinessStatus(diagnostics)
  const latestIncomingEvent = diagnostics.lastClimateEvent ?? diagnostics.lastKnxIn
  const isDeveloperMode = diagnostics.systemMode === 'developer'
  const visibleRuntimeContracts = isDeveloperMode
    ? diagnostics.runtimeContracts ?? []
    : (diagnostics.runtimeContracts ?? []).filter(
        (contract) =>
          contract.connectionState === 'connected' ||
          contract.connectionState === 'degraded' ||
          contract.connectionState === 'offline',
      )
  const nivaSessionMemory =
    diagnostics.nivaSessionMemory ?? createInitialNivaSessionMemory('manager', diagnostics.systemMode)
  const nivaRecentIntents = Array.isArray(nivaSessionMemory.recentIntents)
    ? nivaSessionMemory.recentIntents
    : []
  const nivaRecentQuestions = Array.isArray(nivaSessionMemory.recentQuestions)
    ? nivaSessionMemory.recentQuestions
    : []
  const nivaIntentGaps = Array.isArray(diagnostics.nivaIntentGaps)
    ? diagnostics.nivaIntentGaps
    : []
  const latestNivaIntentGap = nivaIntentGaps[0] ?? null
  const recentNivaIntents = nivaRecentIntents.slice(0, 4).join(' · ')
  const recentUnresolvedIntentGaps = nivaIntentGaps.filter((gap) => !gap.resolved).slice(0, 3)
  const nivaPresenceComfort =
    diagnostics.nivaPresenceComfort ?? createFallbackNivaPresenceComfortSummary('diagnostics-missing')
  const nivaLanguageDiagnostics = diagnostics.nivaLanguageDiagnostics ?? {
    sourceSummary: 'venter på runtime-kilde',
    liveWordingCount: 0,
    restoredWordingCount: 0,
    sparseWordingCount: 0,
    dedupeCount: 0,
    staleBasedWordingCount: 0,
    lastPolishedAt: null,
  }
  const nivaInteractionDiagnostics = diagnostics.nivaInteractionDiagnostics ?? {
    confidenceDistribution: {
      understood: 0,
      partial: 0,
      uncertain: 0,
    },
    clarificationCount: 0,
    misunderstoodIntentCount: 0,
    successfulConversationalActions: 0,
    roomAliasMatches: 0,
    fallbackUsageCount: 0,
    latestParse: null,
    rawParses: [],
  }
  const nivaObservationDiagnostics = diagnostics.nivaObservationDiagnostics ?? {
    enabled: false,
    deterministic: true,
    rules: [],
    ruleCount: 0,
    observationCount: 0,
    temperatureDropCandidates: 0,
    unmetSetpointCandidates: 0,
    staleConfidenceWarnings: 0,
    explanationIntentCount: 0,
    severityCounts: { info: 0, notice: 0, warning: 0 },
    sourceDistribution: {
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
    signalUpdatePolicySummary: {
      byMode: {
        cyclic: 0,
        onChange: 0,
        manualPoll: 0,
        unknown: 0,
      },
      nivaStaleRelevant: 0,
      staleSuppressedBecauseOnChange: 0,
    },
    latestObservations: [],
    actionButtonsEnabled: false,
    activeObservationCount: 0,
    snoozedObservationCount: 0,
    lastActionInvoked: null,
    conversationalFollowThrough: {
      pendingActionSummary: null,
      pendingActionExpiresAt: null,
      hits: 0,
      misses: 0,
      lastHitAt: null,
      lastMissAt: null,
    },
  }
  const calendarActionTrust = diagnostics.calendarActionTrust ?? {
    pending: 0,
    queued: 0,
    creating: 0,
    created: 0,
    failed: 0,
    cancelled: 0,
    stale: 0,
    duplicatePreventedCount: 0,
    latestAction: null,
    recentActions: [],
  }
  const energyIntelligence = diagnostics.energyIntelligence ?? null
  const serverRuntimeSummary = diagnostics.serverRuntimeState?.summary ?? null
  const serverRuntimeHistory = diagnostics.serverRuntimeHistory
  const serverRuntimeAggregates = diagnostics.serverRuntimeAggregates
  const serverRuntimeInsights = diagnostics.serverRuntimeInsights
  const serverRuntimePersistence =
    diagnostics.serverRuntimeState?.persistence ??
    serverRuntimeSummary?.persistence ??
    (serverRuntimeHistory?.retention
      ? {
          enabled: Boolean(serverRuntimeHistory.retention.persisted),
          restored: Boolean(serverRuntimeHistory.retention.restored),
          restoredEvents: 0,
          restoredPoints: 0,
          restoredRooms: 0,
          restoredAt: null,
          storagePath: serverRuntimeHistory.retention.storagePath ?? '—',
          lastFlushAt: serverRuntimeHistory.retention.lastFlushAt ?? null,
          lastCompactAt: null,
          lastError: serverRuntimeHistory.retention.lastError ?? null,
          pendingWrites: 0,
          retention: {
            historyLimit: serverRuntimeHistory.retention.historyLimit,
            pointLimit: serverRuntimeHistory.retention.pointLimit,
            database: serverRuntimeHistory.retention.database,
          },
        }
      : null)
  const integrationManager = diagnostics.integrationManager
  const integrationProviders = integrationManager?.providers ?? []
  const assistantIntegrationProviders = integrationProviders.filter(
    (provider) => provider.category === 'assistant',
  )
  const castRuntime = diagnostics.castRuntime
  const castDiagnostics = castRuntime?.diagnostics
  const castOnlineCount =
    castDiagnostics?.onlineCount ??
    castRuntime?.devices.filter((device) => (device.state ?? device.status) === 'online' || device.online).length ??
    0
  const castStaleCount =
    castDiagnostics?.staleCount ??
    castRuntime?.devices.filter((device) => (device.state ?? device.status) === 'stale').length ??
    0
  const castOfflineCount =
    castDiagnostics?.offlineCount ??
    castRuntime?.devices.filter((device) => (device.state ?? device.status) === 'offline').length ??
    0
  const vacuumRuntime = diagnostics.vacuumRuntime
  const vacuumTrust = vacuumRuntime?.trust
  const vacuumDiagnostics = vacuumRuntime?.diagnostics
  const serverRoomSnapshots =
    serverRuntimeAggregates?.roomSnapshots ?? diagnostics.serverRuntimeState?.roomSnapshots ?? []
  const serverRuntimeCategoryCounts =
    serverRuntimeHistory?.categoryCounts ?? serverRuntimeSummary?.categoryCounts ?? {}
  const serverRuntimeRanges = serverRuntimeHistory?.ranges ?? serverRuntimeSummary?.ranges ?? {}
  const serverRuntimeRates = serverRuntimeHistory?.rates ?? {}
  const serverRuntimeOldestSample =
    Object.values(serverRuntimeCategoryCounts)
      .map((category) => category.oldestAt)
      .filter(Boolean)
      .sort()[0] ?? null
  const serverRuntimeNewestSample =
    Object.values(serverRuntimeCategoryCounts)
      .map((category) => category.newestAt)
      .filter(Boolean)
      .sort()
      .reverse()[0] ?? null
  const handleCreateSignalLogger = async () => {
    try {
      setSignalLoggerStatus('Oppretter signal logger...')
      const result = await createKnxSignalLogger({
        ...signalLoggerDraft,
        dpt:
          signalLoggerDraft.dpt.trim() ||
          (signalLoggerDraft.dataType === '1-bit'
            ? '1.001'
            : signalLoggerDraft.dataType === '2-byte'
              ? '9.001'
              : '5.001'),
        roomKey: signalLoggerDraft.roomKey || undefined,
        expectedIntervalMs: signalLoggerDraft.expectedIntervalMs.trim()
          ? Number(signalLoggerDraft.expectedIntervalMs)
          : null,
      })
      setSignalLoggerStatus(`Opprettet ${result.logger.name} uten å sende kommandoer.`)
      setSignalLoggerDraft((current) => ({
        ...current,
        name: '',
        groupAddress: '',
      }))
    } catch (error) {
      setSignalLoggerStatus(
        error instanceof Error ? error.message : 'Signal logger kunne ikke opprettes',
      )
    }
  }
  const handleToggleSignalLogger = async (id: string, enabled: boolean) => {
    try {
      setSignalLoggerStatus(enabled ? 'Aktiverer logger...' : 'Deaktiverer logger...')
      await updateKnxSignalLogger({ id, enabled })
      setSignalLoggerStatus(enabled ? 'Signal logger aktivert.' : 'Signal logger deaktivert.')
    } catch (error) {
      setSignalLoggerStatus(
        error instanceof Error ? error.message : 'Signal logger kunne ikke oppdateres',
      )
    }
  }
  const handleDeleteSignalLogger = async (id: string) => {
    try {
      setSignalLoggerStatus('Sletter signal logger...')
      await deleteKnxSignalLogger(id)
      setSignalLoggerStatus('Signal logger slettet.')
    } catch (error) {
      setSignalLoggerStatus(
        error instanceof Error ? error.message : 'Signal logger kunne ikke slettes',
      )
    }
  }
  const handleSingleGaAction = async () => {
    try {
      const actionLabel = singleGaDraft.action === 'poll' ? 'Poller' : 'Skriver'
      setSingleGaStatus(`${actionLabel} ${singleGaDraft.groupAddress}...`)
      const result = await runKnxSingleGaAction({
        action: singleGaDraft.action,
        groupAddress: singleGaDraft.groupAddress,
        dpt: singleGaDraft.dpt,
        value: singleGaDraft.value,
      })
      setSingleGaStatus(
        result.action === 'poll'
          ? `Poll OK: ${String(result.decodedValue ?? '—')} (${result.groupAddress})`
          : `Write sendt: ${result.groupAddress} · ${result.dpt}`,
      )
    } catch (error) {
      setSingleGaStatus(error instanceof Error ? error.message : 'Single GA action feilet')
    }
  }
  const handleRunEtsAudit = async () => {
    try {
      setEtsAuditStatus('Kjører ETS audit...')
      const result = await runKnxEtsAudit()
      setEtsAuditStatus(
        result.ok
          ? `Audit OK: ${result.etsTelegramCount ?? 0} ETS-telegrammer · ${result.summary?.seenInEtsMissingInRuntime ?? 0} mangler i runtime`
          : result.error ?? 'ETS audit feilet',
      )
    } catch (error) {
      setEtsAuditStatus(error instanceof Error ? error.message : 'ETS audit feilet')
    }
  }
  const staleServerRooms = serverRoomSnapshots.filter((room) => room.runtimeConfidence === 'low')
  const canonicalRoomTruthDiagnostics = diagnostics.canonicalRoomTruthDiagnostics ?? {
    resolver: 'frontend-canonical-resolvedRooms',
    priorityModel: [],
    roomCount: 0,
    truthDivergenceCount: diagnostics.resolvedRoomTruthConflicts.length,
    crossViewMismatchCount: diagnostics.resolvedRoomTruthConflicts.length,
    optimisticConsistency: 'unknown',
    staleConsistency: {},
    sourceDistribution: {},
    pendingCount: 0,
    staleOrOfflineCount: 0,
    lastReconciliationCorrection: null,
    clientDriftSuspected: false,
    rooms: [],
  }
  const aggregateRanges = serverRuntimeAggregates?.aggregates ?? {}
  const insightTypeCounts = (serverRuntimeInsights?.insights ?? []).reduce<Record<string, number>>(
    (counts, insight) => ({
      ...counts,
      [insight.type]: (counts[insight.type] ?? 0) + 1,
    }),
    {},
  )
  const bridgeReachableLabel =
    diagnostics.bridgeReachable === null ? 'Sjekker...' : diagnostics.bridgeReachable ? 'Ja' : 'Nei'
  const bridgeRuntimeReceivedLabel = diagnostics.bridgeRuntimeConfigReceived ? 'Ja' : 'Nei'
  const bridgeWriteCounts = diagnostics.bridgeHealthWriteMappingCounts
    ? `Lys ${diagnostics.bridgeHealthWriteMappingCounts.light} · Dim ${diagnostics.bridgeHealthWriteMappingCounts.dim} · Klima ${diagnostics.bridgeHealthWriteMappingCounts.climate}`
    : '—'
  const bridgeSubscribeLabel =
    diagnostics.bridgeReachable === false
      ? '—'
      : `Lys ${diagnostics.bridgeLightSubscribeActive ? 'aktiv' : 'av'} · Klima ${
          diagnostics.bridgeClimateSubscribeActive ? 'aktiv' : 'av'
        }`

  return (
    <>
      <article className="manager-card manager-card--wide manager-readiness">
        <div>
          <p className="room-card__label">Runtime feeling</p>
          <h3>{readinessStatus.label}</h3>
          <p className="manager-helper">{readinessStatus.detail}</p>
        </div>
        <span className={`manager-readiness__indicator is-${readinessStatus.tone}`}>
          {readinessStatus.label}
        </span>
      </article>

      <article className="manager-card manager-card--wide">
        <div className="manager-block__header">
          <div>
            <p className="room-card__label">Systemlyder / hvileskjerm</p>
            <p className="manager-helper">
              Lokal UI-foundation for touchskjerm. Lyder er konservativt av som standard.
            </p>
          </div>
          <span className={`manager-readiness__indicator ${
            diagnostics.audioDiagnostics?.enabled || diagnostics.idleScreenDiagnostics?.enabled
              ? 'is-partial'
              : 'is-ready'
          }`}>
            {diagnostics.audioDiagnostics?.enabled || diagnostics.idleScreenDiagnostics?.enabled
              ? 'Aktiv foundation'
              : 'Av'}
          </span>
        </div>
        <div className="manager-list">
          <div className="manager-row">
            <span>Audio</span>
            <strong>
              {diagnostics.audioDiagnostics?.enabled ? 'På' : 'Av'} · manifest{' '}
              {diagnostics.audioDiagnostics?.manifestCount ?? 0} · placeholders{' '}
              {diagnostics.audioDiagnostics?.placeholderCount ?? 0}
            </strong>
          </div>
          <div className="manager-row">
            <span>Siste lyd</span>
            <strong className={diagnostics.audioDiagnostics?.lastSoundPlayed?.ok === false ? 'manager-status-error' : ''}>
              {diagnostics.audioDiagnostics?.lastSoundPlayed
                ? `${diagnostics.audioDiagnostics.lastSoundPlayed.soundId} · ${
                    diagnostics.audioDiagnostics.lastSoundPlayed.skipped
                      ? diagnostics.audioDiagnostics.lastSoundPlayed.reason ?? 'skipped'
                      : 'spilt'
                  }`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Mangler filer</span>
            <strong className={(diagnostics.audioDiagnostics?.missingFiles.length ?? 0) > 0 ? 'manager-status-error' : ''}>
              {diagnostics.audioDiagnostics?.missingFiles.length ?? 0}
            </strong>
          </div>
          <div className="manager-row">
            <span>Hvileskjerm</span>
            <strong>
              {diagnostics.idleScreenDiagnostics?.enabled ? 'På' : 'Av'} ·{' '}
              {diagnostics.idleScreenDiagnostics?.idleTimeoutSeconds ?? 300}s ·{' '}
              {diagnostics.idleScreenDiagnostics?.usingCustomImage
                ? 'custom bilde'
                : 'NIVA-core'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Idle state</span>
            <strong>
              {diagnostics.idleScreenDiagnostics?.currentlyVisible ? 'viser hvileskjerm' : 'aktiv UI'} · sist aktivitet{' '}
              {diagnostics.idleScreenDiagnostics?.lastActivityAt ?? '—'}
            </strong>
          </div>
        </div>
      </article>

      <article className="manager-card manager-card--wide">
        <div className="manager-block__header">
          <div>
            <p className="room-card__label">Dreame / vacuum trust</p>
            <p className="manager-helper">
              Viser om robotstatus er fersk, stale/offline eller bare sist kjente cache.
            </p>
          </div>
          <span className={`manager-readiness__indicator ${vacuumTrust?.state === 'online' ? 'is-ready' : 'is-partial'}`}>
            {vacuumTrust?.state === 'online' ? 'Online' : vacuumTrust?.state ?? 'Ukjent'}
          </span>
        </div>
        <div className="manager-list">
          <div className="manager-row">
            <span>Runtime trust</span>
            <strong>
              {vacuumTrust?.state ?? '—'} · freshness {vacuumTrust?.freshness ?? '—'} · confidence{' '}
              {vacuumTrust?.stateConfidence ?? '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Cloud / runtime / robot</span>
            <strong className="manager-status-signal">
              <span>Cloud {vacuumTrust?.cloudAuthenticated ? 'OK' : 'venter'}</span>
              <span>Runtime {vacuumTrust?.runtimeConnected ? 'connected' : 'ikke live'}</span>
              <span>Robot {vacuumTrust?.deviceReachable ? 'reachable' : 'ikke bekreftet'}</span>
            </strong>
          </div>
          <div className="manager-row">
            <span>Siste sikre sync</span>
            <strong>
              {vacuumTrust?.lastSuccessfulSync ?? vacuumRuntime?.lastSuccessfulSync ?? '—'}
              {typeof vacuumTrust?.sourceAgeMs === 'number' ? ` · age ${vacuumTrust.sourceAgeMs} ms` : ''}
            </strong>
          </div>
          <div className="manager-row">
            <span>Reconnect / login</span>
            <strong>
              reconnect {vacuumTrust?.reconnectCount ?? vacuumDiagnostics?.reconnectCount ?? 0} · login failures{' '}
              {vacuumTrust?.loginFailures ?? vacuumDiagnostics?.loginFailures ?? 0}
            </strong>
          </div>
          <div className="manager-row">
            <span>Device states</span>
            <strong>
              online {vacuumRuntime?.onlineCount ?? vacuumDiagnostics?.onlineCount ?? 0} · stale{' '}
              {vacuumRuntime?.staleCount ?? vacuumDiagnostics?.staleCount ?? 0} · offline{' '}
              {vacuumRuntime?.offlineCount ?? vacuumDiagnostics?.offlineCount ?? 0}
            </strong>
          </div>
          <div className="manager-row">
            <span>Status</span>
            <strong className={vacuumRuntime?.error ? 'manager-status-error' : ''}>
              {vacuumTrust?.message ?? vacuumRuntime?.message ?? vacuumRuntime?.error ?? 'Vacuum runtime ikke lest ennå.'}
            </strong>
          </div>
        </div>
        <details className="manager-advanced-diagnostics">
          <summary>Developer · Dreame/vacuum raw diagnostics</summary>
          <div className="manager-list">
            <div className="manager-row">
              <span>Provider</span>
              <strong>
                {vacuumRuntime?.providerLabel ?? '—'} · maturity {vacuumDiagnostics?.providerMaturity ?? '—'} · control{' '}
                {vacuumDiagnostics?.controlAvailable ? 'available' : 'not available'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Selected robot</span>
              <strong>
                {vacuumRuntime?.selectedRobot?.name ?? '—'} · raw {vacuumRuntime?.selectedRobot?.rawStatus ?? vacuumRuntime?.selectedRobot?.status ?? '—'} · safe{' '}
                {vacuumRuntime?.selectedRobot?.status ?? '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Attempt / error</span>
              <strong>
                {vacuumDiagnostics?.lastRefreshAttemptAt ?? '—'} · {vacuumDiagnostics?.lastRefreshErrorAt ?? 'ingen feil'}
              </strong>
            </div>
          </div>
        </details>
      </article>

      <article className="manager-card manager-card--wide">
        <div className="manager-block__header">
          <div>
            <p className="room-card__label">Runtime logg</p>
            <p className="manager-helper">Siste systemhendelser i denne app-sessionen.</p>
          </div>
          <button
            type="button"
            className="manager-action"
            onClick={onClearTestLog}
            disabled={diagnostics.testLog.length === 0}
          >
            Tøm testlogg
          </button>
        </div>
        <div className="manager-list">
          {diagnostics.testLog.length === 0 ? (
            <div className="manager-row">
              <span>Stille akkurat nå</span>
              <strong>—</strong>
            </div>
          ) : (
            diagnostics.testLog.map((entry) => (
              <div key={entry.id} className="manager-row">
                <span>{entry.at}</span>
                <strong className="manager-status-signal">
                  <span>
                    {entry.category}: {entry.text}
                  </span>
                </strong>
              </div>
            ))
          )}
        </div>
      </article>

      <article className="manager-card manager-card--wide">
        <p className="room-card__label">Frontend / Bridge</p>
        <p className="manager-helper">
          Skiller mellom at appen er åpnet, at bridge svarer på LAN, og at runtime-config er synket.
        </p>
        {diagnostics.bridgeReachable === false ? (
          <p className="manager-helper manager-status-error">
            Appen er åpnet, men bridge svarer ikke. Sjekk at npm run bridge kjører og at port 8787
            er åpen.
          </p>
        ) : null}
        <div className="manager-list">
          <div className="manager-row">
            <span>Frontend lastet</span>
            <strong>{diagnostics.frontendLoadedAt}</strong>
          </div>
          <div className="manager-row">
            <span>Bridge URL</span>
            <strong>{diagnostics.bridgeBaseUrl}</strong>
          </div>
          <div className="manager-row">
            <span>API base</span>
            <strong className="manager-status-signal">
              <span>{diagnostics.bridgeApiDiagnostics.bridgeBaseUrl}</span>
              {diagnostics.bridgeApiDiagnostics.loopbackOverride ? (
                <span>localhost override for LAN/mobile</span>
              ) : null}
              {diagnostics.bridgeApiDiagnostics.configuredBridgeIgnoredReason ? (
                <span>{diagnostics.bridgeApiDiagnostics.configuredBridgeIgnoredReason}</span>
              ) : null}
            </strong>
          </div>
          <div className="manager-row">
            <span>Aktiv app-host</span>
            <strong>{diagnostics.frontendHost}</strong>
          </div>
          <div className="manager-row">
            <span>Tilgangsmodus</span>
            <strong>
              {diagnostics.frontendAccessMode === 'vpn'
                ? 'VPN'
                : diagnostics.frontendAccessMode === 'local'
                  ? 'Lokal'
                  : 'Ukjent'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Lokal URL</span>
            <strong>{diagnostics.localFrontendUrl}</strong>
          </div>
          <div className="manager-row">
            <span>VPN URL</span>
            <strong>{diagnostics.vpnFrontendUrl}</strong>
          </div>
          <div className="manager-row">
            <span>VPN-ready</span>
            <strong className={diagnostics.vpnReady ? '' : 'manager-status-error'}>
              {diagnostics.vpnReady
                ? 'Ja'
                : diagnostics.vpnEnabled
                  ? 'Mangler host'
                  : 'Av'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Foretrukket tilgang</span>
            <strong>{diagnostics.preferredConnection === 'vpn' ? 'VPN' : 'Lokal'}</strong>
          </div>
          <div className="manager-row">
            <span>Bridge reachable</span>
            <strong className={diagnostics.bridgeReachable === false ? 'manager-status-error' : ''}>
              {bridgeReachableLabel}
            </strong>
          </div>
          <div className="manager-row">
            <span>Sist health check</span>
            <strong>{diagnostics.bridgeHealthCheckedAt ?? '—'}</strong>
          </div>
          <div className="manager-row">
            <span>Runtime-config mottatt</span>
            <strong>{bridgeRuntimeReceivedLabel}</strong>
          </div>
          <div className="manager-row">
            <span>Manual config trigger</span>
            <strong>
              <button
                type="button"
                className="manager-action"
                onClick={() => void onManualRuntimeConfigSync?.()}
                disabled={!onManualRuntimeConfigSync}
              >
                Send runtime-config nå
              </button>
            </strong>
          </div>
          <div className="manager-row">
            <span>Config sync debug</span>
            <strong className={diagnostics.runtimeConfigSyncPostFailed ? 'manager-status-error' : ''}>
              {[
                diagnostics.runtimeConfigSyncAttempted ? 'attempted' : 'not attempted',
                diagnostics.runtimeConfigSyncPosted ? 'posted' : 'not posted',
                diagnostics.runtimeConfigSyncPostFailed ? 'post failed' : null,
                diagnostics.runtimeConfigSyncSkippedReason,
              ].filter(Boolean).join(' · ')}
            </strong>
          </div>
          <div className="manager-row">
            <span>Manual trigger</span>
            <strong>
              {diagnostics.lastManualRuntimeConfigTriggerAt ?? '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>POST URL/status</span>
            <strong className={diagnostics.lastRuntimeConfigPostError ? 'manager-status-error' : ''}>
              {diagnostics.lastRuntimeConfigPostUrl
                ? `${diagnostics.lastRuntimeConfigPostStatus ?? '—'} · ${diagnostics.lastRuntimeConfigPostUrl}`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Builder ready</span>
            <strong className={diagnostics.runtimeConfigBuilderReady ? '' : 'manager-status-error'}>
              {diagnostics.runtimeConfigBuilderReady ? 'ja' : 'nei'} · rooms {diagnostics.runtimeConfigBuilderRoomCount} · write {diagnostics.runtimeConfigBuilderMappingCounts.write} · feedback {diagnostics.runtimeConfigBuilderMappingCounts.feedback} · targets {diagnostics.runtimeConfigBuilderMappingCounts.targets}
            </strong>
          </div>
          <div className="manager-row">
            <span>Payload preview</span>
            <strong>{diagnostics.lastRuntimeConfigPayloadPreview ?? '—'}</strong>
          </div>
          <div className="manager-row">
            <span>POST error</span>
            <strong className={diagnostics.lastRuntimeConfigPostError ? 'manager-status-error' : ''}>
              {diagnostics.lastRuntimeConfigPostError ?? '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Siste config push attempt</span>
            <strong>{diagnostics.lastRuntimeConfigPushAttemptAt ?? '—'}</strong>
          </div>
          <div className="manager-row">
            <span>Siste config push</span>
            <strong className={diagnostics.lastRuntimeConfigPushOk === false ? 'manager-status-error' : ''}>
              {diagnostics.lastRuntimeConfigPushAt
                ? `${diagnostics.lastRuntimeConfigPushAt} · ${
                    diagnostics.lastRuntimeConfigPushOk === true
                      ? 'OK'
                      : diagnostics.lastRuntimeConfigPushOk === false
                        ? 'Feilet'
                        : 'Pågår'
                  }`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Config push-feil</span>
            <strong className={diagnostics.lastRuntimeConfigPushError ? 'manager-status-error' : ''}>
              {diagnostics.lastRuntimeConfigPushError ?? '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Payload source</span>
            <strong>{diagnostics.latestRuntimeConfigPayloadSummary?.source ?? '—'}</strong>
          </div>
          <div className="manager-row">
            <span>Payload mappings</span>
            <strong>
              {diagnostics.latestRuntimeConfigPayloadSummary
                ? `rom ${diagnostics.latestRuntimeConfigPayloadSummary.roomCount} · KNX-rom ${diagnostics.latestRuntimeConfigPayloadSummary.knxEnabledRoomCount} · write ${diagnostics.latestRuntimeConfigPayloadSummary.totalWriteMappings} · feedback ${diagnostics.latestRuntimeConfigPayloadSummary.totalFeedbackMappings} · targets ${diagnostics.latestRuntimeConfigPayloadSummary.totalRuntimeTargets}`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Payload size</span>
            <strong>
              {diagnostics.latestRuntimeConfigPayloadSummary?.payloadSizeBytes
                ? `${diagnostics.latestRuntimeConfigPayloadSummary.payloadSizeBytes} bytes`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Bridge connection mode</span>
            <strong>{diagnostics.bridgeHealthConnectionMode ?? '—'}</strong>
          </div>
          <div className="manager-row">
            <span>Write mapping</span>
            <strong>{bridgeWriteCounts}</strong>
          </div>
          <div className="manager-row">
            <span>Subscribe aktiv</span>
            <strong>{bridgeSubscribeLabel}</strong>
          </div>
          <div className="manager-row">
            <span>Health-feil</span>
            <strong className={diagnostics.bridgeHealthError ? 'manager-status-error' : ''}>
              {diagnostics.bridgeHealthError ?? '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Siste API-feil</span>
            <strong className={diagnostics.bridgeApiDiagnostics.lastFailedEndpoint ? 'manager-status-error' : ''}>
              {diagnostics.bridgeApiDiagnostics.lastFailedEndpoint
                ? `${diagnostics.bridgeApiDiagnostics.lastFailedEndpoint.endpoint} · ${diagnostics.bridgeApiDiagnostics.lastFailedEndpoint.message}`
                : '—'}
            </strong>
          </div>
        </div>
      </article>

      <article className="manager-card">
        <p className="room-card__label">Nøkkelstatus</p>
        <p className="manager-helper">Kompakt operatørstatus for runtime og bridge akkurat nå.</p>
        <div className="manager-list">
          <div className="manager-row">
            <span>Driftsmodus</span>
            <strong>
              {diagnostics.systemMode === 'developer'
                ? 'Developer Mode'
                : diagnostics.systemMode === 'demo' || diagnostics.systemMode === 'simulate'
                  ? 'Demo Mode'
                  : 'Live Mode'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Connection mode</span>
            <strong>{diagnostics.connectionMode}</strong>
          </div>
          <div className="manager-row">
            <span>Bridge status</span>
            <strong>{diagnostics.bridgeStatusLabel}</strong>
          </div>
          <div className="manager-row">
            <span>Config source</span>
            <strong>
              {diagnostics.systemConfigSource === 'server'
                ? `Server v${diagnostics.systemConfigTrust?.configVersion ?? '—'}`
                : 'Local fallback'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Scene scheduler</span>
            <strong>
              {diagnostics.sceneScheduler?.schedulerActive
                ? `${diagnostics.sceneScheduler.schedulerSource} · ${diagnostics.sceneScheduler.scheduledSceneCount} scener`
                : 'Ikke aktiv'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Neste scene</span>
            <strong>
              {diagnostics.sceneScheduler?.nextExecution
                ? `${diagnostics.sceneScheduler.nextExecution.sceneName} · ${diagnostics.sceneScheduler.nextExecution.triggerTime}`
                : 'Ingen planlagt'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Sist kjørte scene</span>
            <strong>
              {diagnostics.sceneScheduler?.lastExecution
                ? `${diagnostics.sceneScheduler.lastExecution.sceneName} · ${formatDateTime(diagnostics.sceneScheduler.lastExecution.executedAt)}`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Missed scenes</span>
            <strong>
              {diagnostics.sceneScheduler
                ? `${diagnostics.sceneScheduler.missedExecutionCount} missed · ${diagnostics.sceneScheduler.lastError ?? 'ingen aktiv feil'}`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Scheduler tick</span>
            <strong>
              {sceneScheduler
                ? `${sceneScheduler.tickCount ?? 0} ticks · sist ${formatDateTime(sceneScheduler.lastTickAt ?? sceneScheduler.lastCheckAt)}`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Due/skipped</span>
            <strong>
              {sceneScheduler
                ? `${sceneScheduler.dueScenes?.length ?? 0} due · ${
                    sceneScheduler.lastSkippedReason?.reason ?? 'ingen skip'
                  }`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Execution result</span>
            <strong>
              {sceneScheduler?.lastExecutionResult
                ? `${String(sceneScheduler.lastExecutionResult.sceneName ?? sceneScheduler.lastExecutionResult.sceneId ?? 'scene')} · ${
                    String(sceneScheduler.lastExecutionResult.failedCount ?? 0)
                  } feil · ${lastExecutionTargetResults.length} targets`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Dry-run sist</span>
            <strong>
              {sceneScheduler?.lastDryRun
                ? `${String(sceneScheduler.lastDryRun.sceneName ?? sceneScheduler.lastDryRun.sceneId ?? 'scene')} · ${lastDryRunTargets.length} targets`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Scene test</span>
            <strong className="manager-inline-actions">
              <button
                type="button"
                className="manager-action manager-action--mini"
                disabled={!nextSceneId || !onSceneSchedulerTest}
                onClick={() => {
                  if (nextSceneId) {
                    void onSceneSchedulerTest?.(nextSceneId, true)
                  }
                }}
              >
                Dry-run neste scene
              </button>
              <button
                type="button"
                className="manager-action manager-action--mini"
                disabled={!nextSceneId || !onSceneSchedulerTest}
                onClick={() => {
                  if (nextSceneId) {
                    void onSceneSchedulerTest?.(nextSceneId, false)
                  }
                }}
              >
                Test scene nå
              </button>
            </strong>
          </div>
          <div className="manager-row">
            <span>Heat power coverage</span>
            <strong>
              {diagnostics.heatPowerDiagnostics
                ? `${diagnostics.heatPowerDiagnostics.heatPowerCoveragePercent}% · ${diagnostics.heatPowerDiagnostics.roomsMissingHeatPower.length} mangler`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Conversation logging</span>
            <strong>{diagnostics.conversationLoggingEnabled ? 'På' : 'Av'}</strong>
          </div>
          <div className="manager-row">
            <span>Language</span>
            <strong>{diagnostics.systemConfigTrust?.language === 'en' ? 'English' : 'Norsk'}</strong>
          </div>
          <div className="manager-row">
            <span>Auto-poll quiet signals</span>
            <strong>{diagnostics.autoPollQuietSignals?.enabled ? 'På' : 'Av'}</strong>
          </div>
          <div className="manager-row">
            <span>Auto-poll targets</span>
            <strong>
              {diagnostics.autoPollTargetDiagnostics
                ? `${diagnostics.autoPollTargetDiagnostics.selectedCount} valgt · ${diagnostics.autoPollTargetDiagnostics.eligibleCount} eligible`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Optimistic lys</span>
            <strong>
              {diagnostics.optimisticLightingDiagnostics
                ? `${diagnostics.optimisticLightingDiagnostics.pendingFeedbackCount} avventer · ${diagnostics.optimisticLightingDiagnostics.rollbackCount} korrigert`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Solskjerming</span>
            <strong>
              {diagnostics.shadingDiagnostics
                ? `${diagnostics.shadingDiagnostics.visibleCount} synlig · ${diagnostics.shadingDiagnostics.missingMappingCount} mangler mapping`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Kamera / NVR</span>
            <strong>
              {diagnostics.cameraFoundationDiagnostics
                ? `${diagnostics.cameraFoundationDiagnostics.visibleCount} synlig · ${diagnostics.cameraFoundationDiagnostics.recordingEnabledCount} recording`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Media groups</span>
            <strong>
              {diagnostics.mediaGroupDiagnostics
                ? `${diagnostics.mediaGroupDiagnostics.groupCount} grupper · ${diagnostics.mediaGroupDiagnostics.delayOffsetCount} offsets`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>NIVA feedback review</span>
            <strong>
              {diagnostics.conversationFeedbackReview
                ? `${diagnostics.conversationFeedbackReview.itemCount} funn`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Learning proposals</span>
            <strong>
              {diagnostics.learningSuggestionFoundation?.candidateCount ?? 0} kandidater · proposal only
            </strong>
          </div>
          <div className="manager-row">
            <span>Lys feedback status</span>
            <strong>{diagnostics.lightFeedbackStatus}</strong>
          </div>
          <div className="manager-row">
            <span>Klima feedback status</span>
            <strong>{diagnostics.climateFeedbackStatus}</strong>
          </div>
          <div className="manager-row">
            <span>HeatDemand</span>
            <strong>{diagnostics.heatDemandStatus}</strong>
          </div>
          <div className="manager-row">
            <span>Aktiv visning</span>
            <strong>{diagnostics.activeViewLabel}</strong>
          </div>
          <div className="manager-row">
            <span>Antall aktive targets</span>
            <strong>{diagnostics.activeTargetsCount}</strong>
          </div>
          <div className="manager-row">
            <span>I bruk nå</span>
            <strong>{diagnostics.activeTargetsLabel}</strong>
          </div>
          <div className="manager-row">
            <span>Sist oppdatert</span>
            <strong>{diagnostics.lastUpdatedAt ?? '—'}</strong>
          </div>
        </div>
      </article>

      <article className="manager-card manager-card--wide runtime-contract-panel">
        <div className="manager-block__header">
          <div>
            <p className="room-card__label">Runtime Insight</p>
            <p className="manager-helper">
              {isDeveloperMode
                ? 'Developer Mode viser hele runtime-kontrakten når du trenger dypere innsikt.'
                : 'Live Mode viser aktive kilder og det som trenger oppfølging.'}
            </p>
          </div>
          <span className="manager-readiness__indicator is-partial">
              {(diagnostics.runtimeContracts ?? []).filter((contract) => contract.connectionState === 'connected').length} live
          </span>
        </div>
        <div className="runtime-contract-grid">
          {visibleRuntimeContracts.map((contract) => (
            <article
              key={contract.id}
              className={`runtime-contract-card runtime-contract-card--${getRuntimeConnectionTone(contract.connectionState)}`}
            >
              <div>
                <span>{contract.domain} · {contract.provider}</span>
                <strong>{contract.name}</strong>
              </div>
              <p>{contract.summary}</p>
              <div className="runtime-contract-card__meta">
                <span>{formatRuntimeConnectionState(contract.connectionState)}</span>
                <span>{formatRuntimeReadinessState(contract.readiness)}</span>
                {contract.derivedState ? <span>Derived state</span> : null}
              </div>
              {isDeveloperMode && contract.diagnostics.length > 0 ? (
                <small>{contract.diagnostics.join(' · ')}</small>
              ) : null}
            </article>
          ))}
        </div>
        {!isDeveloperMode ? (
          <p className="manager-helper runtime-contract-panel__note">
            Developer Mode åpner full contract, readiness og Runtime Insight når du trenger det.
          </p>
        ) : null}
      </article>

      <article className="manager-card">
        <p className="room-card__label">Siste signal</p>
        <div className="manager-list">
          <div className="manager-row">
            <span>Siste event inn</span>
            <strong className="manager-status-signal">
              <span>{formatCompactDiagnosticEvent(latestIncomingEvent)}</span>
            </strong>
          </div>
          <div className="manager-row">
            <span>Siste feil</span>
            <strong
              className={
                diagnostics.lastRuntimeError || diagnostics.lastClimateError
                  ? 'manager-status-error'
                  : ''
              }
            >
              {formatCompactDiagnosticError(diagnostics)}
            </strong>
          </div>
          <div className="manager-row">
            <span>Bridge sist synket</span>
            <strong>{diagnostics.bridgeSyncedAt ?? '—'}</strong>
          </div>
        </div>
      </article>

      <article className="manager-card">
        <p className="room-card__label">Klima subscribe</p>
        <div className="manager-list">
          <div className="manager-row">
            <span>Klima ønsket strategi</span>
            <strong>{diagnostics.climateFeedbackRequestedMethod}</strong>
          </div>
          <div className="manager-row">
            <span>Klima strategi i bruk</span>
            <strong>{formatStrategyLabel(diagnostics.climateFeedbackStrategy)}</strong>
          </div>
          <div className="manager-row">
            <span>Status</span>
            <strong>{diagnostics.climateFeedbackStatus}</strong>
          </div>
          <div className="manager-row">
            <span>Årsak</span>
            <strong>{diagnostics.climateFeedbackStatusReason}</strong>
          </div>
          <div className="manager-row">
            <span>Punkter</span>
            <strong>{diagnostics.climateSubscribePointCount}</strong>
          </div>
          <div className="manager-row">
            <span>HeatDemand readiness</span>
            <strong className="manager-status-signal">
              <span>{diagnostics.heatDemandStatusDetail}</span>
              <span>
                Konfigurert {diagnostics.heatDemandConfiguredRoomCount} · live {diagnostics.heatDemandLiveRoomCount} · historikk {diagnostics.heatDemandHistoryPointCount}
              </span>
            </strong>
          </div>
          <div className="manager-row">
            <span>Rom</span>
            <strong>
              {diagnostics.climateSubscribeRooms.length > 0
                ? diagnostics.climateSubscribeRooms.join(', ')
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Siste klima-event</span>
            <strong className="manager-status-signal">
              {formatDiagnosticSignal(diagnostics.lastClimateEvent).map((line) => (
                <span key={line}>{line}</span>
              ))}
            </strong>
          </div>
          <div className="manager-row">
            <span>Siste klima-feil</span>
            <strong className={diagnostics.lastClimateError ? 'manager-status-error' : ''}>
              {diagnostics.lastClimateError
                ? `${diagnostics.lastClimateError.at} · ${diagnostics.lastClimateError.detail}`
                : '—'}
            </strong>
          </div>
        </div>
      </article>

      <article className="manager-card manager-card--wide">
        <div className="manager-block__header">
          <div>
            <p className="room-card__label">KNX subscription runtime</p>
            <p className="manager-helper">
              Server-eid cache for KNX telegrammer. Sidebytte skal lese cache, ikke trigge bus-read.
            </p>
          </div>
          <span className={`manager-readiness__indicator ${
            diagnostics.knxDiagnostics?.runtime.active ? 'is-ready' : 'is-partial'
          }`}>
            {diagnostics.knxDiagnostics?.runtime.active ? 'Subscription active' : 'Cache standby'}
          </span>
        </div>
        <div className="manager-list">
          <div className="manager-row">
            <span>Cached groups</span>
            <strong>{diagnostics.knxDiagnostics?.runtime.cachedGroupCount ?? 0}</strong>
          </div>
          <div className="manager-row">
            <span>KNX monitor</span>
            <strong className="manager-status-signal">
              <span>
                {diagnostics.knxMonitor?.active ? 'aktiv' : 'standby'} · buffer{' '}
                {diagnostics.knxMonitor?.bufferSize ?? diagnostics.knxMonitor?.localEventCount ?? 0}/
                {diagnostics.knxMonitor?.bufferLimit ?? '—'}
              </span>
              <span>
                rate {diagnostics.knxMonitor?.liveTelegramRatePerMinute ?? 0}/min · dropped{' '}
                {diagnostics.knxMonitor?.droppedEvents ?? 0} · latency{' '}
                {diagnostics.knxMonitor?.monitorLatencyMs ?? '—'} ms
              </span>
              <span>
                window {diagnostics.knxMonitor?.windowMode ?? 'closed'} · filtered{' '}
                {diagnostics.knxMonitor?.filteredEventCount ?? 0} ·{' '}
                {diagnostics.knxMonitor?.paused ? 'pauset' : 'live'}
              </span>
              {diagnostics.knxMonitor?.error ? (
                <span className="manager-status-error">{diagnostics.knxMonitor.error}</span>
              ) : null}
            </strong>
          </div>
          <div className="manager-row">
            <span>Write path</span>
            <strong className={diagnostics.knxDiagnostics?.writePath?.status === 'ready' ? '' : 'manager-status-error'}>
              {diagnostics.knxDiagnostics?.writePath
                ? `${diagnostics.knxDiagnostics.writePath.status} · ${diagnostics.knxDiagnostics.writePath.connectionState} · action block ${diagnostics.knxDiagnostics.writePath.actionPipelineBlocking ? 'ja' : 'nei'}`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Targets</span>
            <strong>{diagnostics.knxDiagnostics?.runtime.targetCount ?? 0}</strong>
          </div>
          <div className="manager-row">
            <span>Runtime config source</span>
            <strong>
              {diagnostics.knxDiagnostics?.runtimeConfigSource ??
                diagnostics.knxDiagnostics?.runtimeConfig?.runtimeConfigSource ??
                '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Persisted KNX config</span>
            <strong>
              {diagnostics.knxDiagnostics
                ? [
                    (diagnostics.knxDiagnostics.persistedConfigRestored ??
                      diagnostics.knxDiagnostics.runtimeConfig?.persistedConfigRestored)
                      ? 'restored'
                      : 'standby',
                    diagnostics.knxDiagnostics.latestValidConfigAt ??
                      diagnostics.knxDiagnostics.runtimeConfig?.latestValidConfigAt ??
                      'no-valid-config',
                  ].join(' · ')
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Restore integrity</span>
            <strong
              className={
                diagnostics.knxDiagnostics?.missingClimateMappings ||
                diagnostics.knxDiagnostics?.runtimeConfig?.missingClimateMappings
                  ? 'manager-status-error'
                  : ''
              }
            >
              {diagnostics.knxDiagnostics
                ? [
                    (diagnostics.knxDiagnostics.restoredConfigIntegrity ??
                      diagnostics.knxDiagnostics.runtimeConfig?.restoredConfigIntegrity) &&
                    (diagnostics.knxDiagnostics.restoredConfigIntegrity as { ok?: boolean } | undefined)?.ok !== false
                      ? 'OK'
                      : (diagnostics.knxDiagnostics.restoredConfigIntegrity ??
                          diagnostics.knxDiagnostics.runtimeConfig?.restoredConfigIntegrity)
                        ? 'mismatch'
                        : '—',
                    `rooms ${diagnostics.knxDiagnostics.restoredRoomCount ?? diagnostics.knxDiagnostics.runtimeConfig?.restoredRoomCount ?? 0}`,
                    `climate write ${diagnostics.knxDiagnostics.restoredClimateWriteCount ?? diagnostics.knxDiagnostics.runtimeConfig?.restoredClimateWriteCount ?? 0}`,
                    `climate feedback ${diagnostics.knxDiagnostics.restoredClimateFeedbackCount ?? diagnostics.knxDiagnostics.runtimeConfig?.restoredClimateFeedbackCount ?? 0}`,
                  ].join(' · ')
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Target build</span>
            <strong
              className={
                diagnostics.knxDiagnostics?.whyTargetCountZero ||
                diagnostics.knxDiagnostics?.runtimeConfig?.whyTargetCountZero
                  ? 'manager-status-error'
                  : ''
              }
            >
              {diagnostics.knxDiagnostics
                ? `${diagnostics.knxDiagnostics.targetBuildCount ?? diagnostics.knxDiagnostics.runtimeConfig?.targetBuildCount ?? 0} targets · ${
                    diagnostics.knxDiagnostics.whyTargetCountZero ??
                    diagnostics.knxDiagnostics.runtimeConfig?.whyTargetCountZero ??
                    'OK'
                  }`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Runtime config POST</span>
            <strong className={diagnostics.knxDiagnostics?.runtimeConfigPostError ? 'manager-status-error' : ''}>
              {diagnostics.knxDiagnostics
                ? [
                    diagnostics.knxDiagnostics.runtimeConfigPostReceivedAt ?? 'ikke mottatt',
                    diagnostics.knxDiagnostics.runtimeConfigPostParsed ? 'parsed' : 'ikke parsed',
                    diagnostics.knxDiagnostics.runtimeConfigPostPayloadBytes
                      ? `${diagnostics.knxDiagnostics.runtimeConfigPostPayloadBytes} bytes`
                      : null,
                    diagnostics.knxDiagnostics.runtimeConfigPostError ?? null,
                  ].filter(Boolean).join(' · ')
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Feedback mapping</span>
            <strong>
              {diagnostics.knxDiagnostics?.feedbackMappingCounts ||
              diagnostics.knxDiagnostics?.runtimeConfig?.feedbackMappingCounts
                ? `lys ${
                    (diagnostics.knxDiagnostics.feedbackMappingCounts ??
                      diagnostics.knxDiagnostics.runtimeConfig?.feedbackMappingCounts)?.light ?? 0
                  } · dim ${
                    (diagnostics.knxDiagnostics.feedbackMappingCounts ??
                      diagnostics.knxDiagnostics.runtimeConfig?.feedbackMappingCounts)?.dim ?? 0
                  } · klima ${
                    (diagnostics.knxDiagnostics.feedbackMappingCounts ??
                      diagnostics.knxDiagnostics.runtimeConfig?.feedbackMappingCounts)?.climate ?? 0
                  }`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Restored light/dim counts</span>
            <strong>
              {diagnostics.knxDiagnostics
                ? `lys ${diagnostics.knxDiagnostics.restoredLightCount ?? diagnostics.knxDiagnostics.runtimeConfig?.restoredLightCount ?? 0} · dim ${diagnostics.knxDiagnostics.restoredDimCount ?? diagnostics.knxDiagnostics.runtimeConfig?.restoredDimCount ?? 0}`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Siste telegram</span>
            <strong>{diagnostics.knxDiagnostics?.runtime.lastTelegramAt ?? '—'}</strong>
          </div>
          <div className="manager-row">
            <span>Stale groups</span>
            <strong>{diagnostics.knxDiagnostics?.runtime.staleGroupCount ?? 0}</strong>
          </div>
          <div className="manager-row">
            <span>Freshness</span>
            <strong>
              {diagnostics.knxDiagnostics?.runtime.freshnessCounts
                ? Object.entries(diagnostics.knxDiagnostics.runtime.freshnessCounts)
                    .map(([state, count]) => `${state} ${count}`)
                    .join(' · ')
                : 'fresh/aging/stale/unknown'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Stale policy</span>
            <strong className="manager-status-signal">
              {Object.entries(diagnostics.knxDiagnostics?.runtime.stalePolicies ?? {})
                .filter(([field]) => ['temperature', 'setpointFeedback', 'heatDemand', 'lightFeedback', 'customSignal'].includes(field))
                .map(([field, policy]) => (
                  <span key={field}>
                    {field}: {Math.round(policy.staleMs / 60000)} min
                  </span>
                ))}
              {!diagnostics.knxDiagnostics?.runtime.stalePolicies ? <span>Venter på policy</span> : null}
            </strong>
          </div>
          <div className="manager-row">
            <span>HeatDemand parser</span>
            <strong className="manager-status-signal">
              <span>{diagnostics.knxDiagnostics?.runtime.heatDemandParser.status ?? '—'}</span>
              <span>
                {diagnostics.knxDiagnostics?.runtime.heatDemandParser.mapping ??
                  'DPT 5.001 percent scaling'}
              </span>
            </strong>
          </div>
          <div className="manager-row">
            <span>Settpunktstrategi</span>
            <strong>
              {(diagnostics.knxDiagnostics?.runtime.setpointStrategies ?? [])
                .map((strategy) => `${strategy.label}: ${strategy.strategy}`)
                .join(' · ') || 'absoluteTemperature default'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Room truth conflicts</span>
            <strong className={diagnostics.resolvedRoomTruthConflicts.length > 0 ? 'manager-status-error' : ''}>
              {diagnostics.resolvedRoomTruthConflicts.length > 0
                ? diagnostics.resolvedRoomTruthConflicts.slice(0, 3).join(' · ')
                : 'Ingen kjente konflikter'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Canonical room truth</span>
            <strong className={canonicalRoomTruthDiagnostics.truthDivergenceCount > 0 ? 'manager-status-error' : ''}>
              {canonicalRoomTruthDiagnostics.resolver} · rooms {canonicalRoomTruthDiagnostics.roomCount} · divergence{' '}
              {canonicalRoomTruthDiagnostics.truthDivergenceCount} · cross-view{' '}
              {canonicalRoomTruthDiagnostics.crossViewMismatchCount}
            </strong>
          </div>
          <div className="manager-row">
            <span>Freshness consistency</span>
            <strong>
              fresh {canonicalRoomTruthDiagnostics.staleConsistency.fresh ?? 0} · aging{' '}
              {canonicalRoomTruthDiagnostics.staleConsistency.aging ?? 0} · stale{' '}
              {canonicalRoomTruthDiagnostics.staleConsistency.stale ?? 0} · offline{' '}
              {canonicalRoomTruthDiagnostics.staleConsistency.offline ?? 0} · pending{' '}
              {canonicalRoomTruthDiagnostics.staleConsistency.pending ?? 0}
            </strong>
          </div>
          <div className="manager-row">
            <span>Optimistic / drift</span>
            <strong>
              {canonicalRoomTruthDiagnostics.optimisticConsistency} · pending{' '}
              {canonicalRoomTruthDiagnostics.pendingCount} · stale/offline{' '}
              {canonicalRoomTruthDiagnostics.staleOrOfflineCount} · client drift{' '}
              {canonicalRoomTruthDiagnostics.clientDriftSuspected ? 'watch' : 'nei'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Priority model</span>
            <strong>{canonicalRoomTruthDiagnostics.priorityModel.join(' → ') || '—'}</strong>
          </div>
          {canonicalRoomTruthDiagnostics.lastReconciliationCorrection ? (
            <div className="manager-row">
              <span>Last reconciliation correction</span>
              <strong>
                {canonicalRoomTruthDiagnostics.lastReconciliationCorrection.roomName} /{' '}
                {canonicalRoomTruthDiagnostics.lastReconciliationCorrection.zoneName} ·{' '}
                {canonicalRoomTruthDiagnostics.lastReconciliationCorrection.reason}
              </strong>
            </div>
          ) : null}
          <div className="manager-row">
            <span>Room truth sources</span>
            <strong className="manager-status-signal">
              {diagnostics.resolvedRoomTruthSources.length > 0
                ? diagnostics.resolvedRoomTruthSources.slice(0, 4).map((room) => (
                    <span key={`${room.roomKey}-${room.roomName}`}>
                      {room.roomName}: temp {room.temperatureSource}
                      {room.temperatureGroupAddress ? ` ${room.temperatureGroupAddress}` : ''} · setpoint{' '}
                      {room.setpointSource ?? '—'}
                      {room.setpointGroupAddress ? ` ${room.setpointGroupAddress}` : ''} · lys {room.lightSource}
                      {room.lightGroupAddress ? ` ${room.lightGroupAddress}` : ''} · dim {room.brightnessSource}
                      {room.brightnessGroupAddress ? ` ${room.brightnessGroupAddress}` : ''}
                    </span>
                  ))
                : <span>Venter på resolved room truth</span>}
            </strong>
          </div>
          <div className="manager-row">
            <span>Setpoint feedback latest</span>
            <strong className="manager-status-signal">
              {diagnostics.resolvedRoomTruthSources
                .filter((room) => room.setpointGroupAddress)
                .slice(0, 4)
                .map((room) => (
                  <span key={`${room.roomKey}-${room.setpointGroupAddress}`}>
                    {room.roomName}: {room.setpointGroupAddress} · {room.setpointSource ?? 'unknown'}
                    {room.setpointTimestamp ? ` · ${room.setpointTimestamp}` : ''}
                  </span>
                ))}
              {diagnostics.resolvedRoomTruthSources.filter((room) => room.setpointGroupAddress).length === 0 ? (
                <span>Ingen setpoint-feedback lineage ennå</span>
              ) : null}
            </strong>
          </div>
          {isDeveloperMode ? (
            <details className="manager-advanced-diagnostics">
              <summary>Developer · raw canonical room truth</summary>
              <div className="manager-list">
                {canonicalRoomTruthDiagnostics.rooms.slice(0, 8).map((room) => (
                  <div key={room.roomKey} className="manager-row manager-row--stacked">
                    <span>
                      {room.roomName} · pending {room.optimisticPending ? 'ja' : 'nei'} · stale {room.staleCount}
                    </span>
                    <strong className="manager-status-signal">
                      {Object.entries(room.fields).map(([field, value]) => (
                        <span key={`${room.roomKey}-${field}`}>
                          {field}: {value.valueLabel} · {value.source}/{value.freshness}/{value.confidence}
                          {value.groupAddress ? ` · ${value.groupAddress}` : ''}
                        </span>
                      ))}
                    </strong>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
          <div className="manager-row">
            <span>Latest lighting feedback merges</span>
            <strong className="manager-status-signal">
              {(diagnostics.knxDiagnostics?.recentTelegrams ?? [])
                .filter((event) => event.field === 'lightFeedback' || event.field === 'valueFeedback')
                .slice(0, 4)
                .map((event) => (
                  <span key={`${event.groupAddress}-${event.timestamp}`}>
                    {event.roomKey ?? 'room'} / {event.zoneKey ?? 'zone'} · {event.groupAddress} · {event.field} · {String(event.decodedValue ?? '—')} · {event.source}
                  </span>
                ))}
              {(diagnostics.knxDiagnostics?.recentTelegrams ?? []).filter(
                (event) => event.field === 'lightFeedback' || event.field === 'valueFeedback',
              ).length === 0 ? (
                <span>Ingen lysfeedback i siste telegrammer</span>
              ) : null}
            </strong>
          </div>
          <div className="manager-row">
            <span>Siste rompoll</span>
            <strong className="manager-status-signal">
              {(diagnostics.knxDiagnostics?.roomPolls ?? []).slice(0, 3).map((poll) => (
                <span key={`${poll.roomId}-${poll.lastAttemptAt ?? poll.lastPollAt ?? 'poll'}`}>
                  {poll.roomId} · {poll.lastPollAt ?? poll.lastAttemptAt ?? '—'} ·{' '}
                  {(poll.updatedGroups ?? []).length}/{(poll.requestedGroups ?? []).length} svarte
                  {poll.diagnostics?.skippedCount ? ` · ${poll.diagnostics.skippedCount} skipped` : ''}
                  {poll.diagnostics?.realFailedCount ? ` · ${poll.diagnostics.realFailedCount} reelle feil` : ''}
                  {poll.rateLimited ? ' · rate-limit' : ''}
                  {poll.lastError ? ` · ${poll.lastError}` : ''}
                </span>
              ))}
              {(diagnostics.knxDiagnostics?.roomPolls ?? []).length === 0 ? (
                <span>Ingen manuelle rompoller ennå</span>
              ) : null}
            </strong>
          </div>
          <div className="manager-row">
            <span>Runtime UX</span>
            <strong className="manager-status-signal">
              <span>Update highlight: timestamp/value-token</span>
              <span>Slider debounce: commit-on-release + 300ms fallback</span>
              <span>Poll failures: skipped/notConfigured skilles fra noResponse/timeout</span>
            </strong>
          </div>
          <div className="manager-row">
            <span>Signal Logger</span>
            <strong className="manager-status-signal">
              <span>
                {diagnostics.knxDiagnostics?.signalLoggers?.activeCount ?? 0} aktive ·{' '}
                {diagnostics.knxDiagnostics?.signalLoggers?.count ?? 0} totalt
              </span>
              {(diagnostics.knxDiagnostics?.signalLoggers?.loggers ?? []).slice(0, 3).map((logger) => (
                <span key={logger.id}>
                  {logger.name} · {logger.groupAddress} · {logger.updateMode ?? 'unknown'} ·{' '}
                  {logger.enabled ? 'aktiv' : 'av'} · {String(logger.lastValue ?? 'venter')}
                </span>
              ))}
            </strong>
          </div>
          {isDeveloperMode ? (
            <>
              <details className="manager-advanced-diagnostics">
                <summary>Developer Mode · Advanced diagnostics</summary>
                <p className="manager-helper">
                  Single GA-verktøy, ETS audit, signal loggers og raw runtime-metadata er samlet her for feilsøking.
                </p>
              <div className="manager-row manager-row--stack">
                <span>KNX Single Action</span>
                <strong className="manager-signal-logger-form">
                  <input
                    value={singleGaDraft.groupAddress}
                    onChange={(event) =>
                      setSingleGaDraft((current) => ({
                        ...current,
                        groupAddress: event.target.value,
                      }))
                    }
                    placeholder="Gruppeadresse, f.eks. 1/1/2"
                  />
                  <select
                    value={singleGaDraft.dpt}
                    onChange={(event) =>
                      setSingleGaDraft((current) => ({
                        ...current,
                        dpt: event.target.value as '1.001' | '5.001' | '9.001' | '20.102',
                      }))
                    }
                  >
                    <option value="1.001">1.001 switch</option>
                    <option value="5.001">5.001 percentage</option>
                    <option value="9.001">9.001 temperature</option>
                    <option value="20.102">20.102 mode</option>
                  </select>
                  <select
                    value={singleGaDraft.action}
                    onChange={(event) =>
                      setSingleGaDraft((current) => ({
                        ...current,
                        action: event.target.value as 'poll' | 'write',
                      }))
                    }
                  >
                    <option value="poll">Poll</option>
                    <option value="write">Write</option>
                  </select>
                  {singleGaDraft.action === 'write' ? (
                    <input
                      value={singleGaDraft.value}
                      onChange={(event) =>
                        setSingleGaDraft((current) => ({
                          ...current,
                          value: event.target.value,
                        }))
                      }
                      placeholder="Verdi"
                    />
                  ) : null}
                  <button
                    type="button"
                    className="manager-action"
                    onClick={() => void handleSingleGaAction()}
                    disabled={!singleGaDraft.groupAddress.trim()}
                  >
                    {singleGaDraft.action === 'poll' ? 'Poll GA' : 'Debug write'}
                  </button>
                  <span>Debug-verktøy: ingen repeat eller automasjon.</span>
                  {singleGaStatus ? <span>{singleGaStatus}</span> : null}
                </strong>
              </div>
              <div className="manager-row">
                <span>Single GA historikk</span>
                <strong className="manager-status-signal">
                  {(diagnostics.knxDiagnostics?.singleGaActions?.history ?? []).slice(0, 4).map((entry, index) => (
                    <span key={`${entry.groupAddress}-${entry.timestamp ?? index}`}>
                      {entry.action} · {entry.groupAddress} · {entry.dpt} ·{' '}
                      {String(entry.decodedValue ?? entry.value ?? entry.message ?? '—')}
                    </span>
                  ))}
                  {(diagnostics.knxDiagnostics?.singleGaActions?.history ?? []).length === 0 ? (
                    <span>Ingen single-GA-kall ennå</span>
                  ) : null}
                </strong>
              </div>
              <div className="manager-row">
                <span>ETS audit</span>
                <strong className="manager-status-signal">
                  <button
                    type="button"
                    className="manager-action"
                    onClick={() => void handleRunEtsAudit()}
                  >
                    Kjør ETS audit
                  </button>
                  <span>
                    {diagnostics.knxDiagnostics?.etsAudit?.ok
                      ? `${diagnostics.knxDiagnostics.etsAudit.etsTelegramCount ?? 0} ETS · ${diagnostics.knxDiagnostics.etsAudit.summary?.seenInEtsMissingInRuntime ?? 0} mangler`
                      : diagnostics.knxDiagnostics?.etsAudit?.message ?? 'Ikke kjørt'}
                  </span>
                  {(diagnostics.knxDiagnostics?.etsAudit?.watchedGroups ?? []).slice(0, 5).map((group) => (
                    <span key={group.groupAddress}>
                      {group.groupAddress}: ETS {group.etsCount} · Lynell {group.runtimeCount}
                    </span>
                  ))}
                  {etsAuditStatus ? <span>{etsAuditStatus}</span> : null}
                </strong>
              </div>
              <div className="manager-row manager-row--stack">
                <span>Ny Signal Logger</span>
                <strong className="manager-signal-logger-form">
                  <input
                    value={signalLoggerDraft.name}
                    onChange={(event) =>
                      setSignalLoggerDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Navn"
                  />
                  <input
                    value={signalLoggerDraft.groupAddress}
                    onChange={(event) =>
                      setSignalLoggerDraft((current) => ({
                        ...current,
                        groupAddress: event.target.value,
                      }))
                    }
                    placeholder="1/1/24"
                  />
                  <select
                    value={signalLoggerDraft.dataType}
                    onChange={(event) => {
                      const nextDataType = event.target.value as '1-bit' | '1-byte' | '2-byte'
                      setSignalLoggerDraft((current) => ({
                        ...current,
                        dataType: nextDataType,
                        dpt:
                          nextDataType === '1-bit'
                            ? '1.001'
                            : nextDataType === '2-byte'
                              ? '9.001'
                              : '5.001',
                      }))
                    }}
                  >
                    <option value="1-bit">1-bit</option>
                    <option value="1-byte">1-byte</option>
                    <option value="2-byte">2-byte</option>
                  </select>
                  <input
                    value={signalLoggerDraft.dpt}
                    onChange={(event) =>
                      setSignalLoggerDraft((current) => ({
                        ...current,
                        dpt: event.target.value,
                      }))
                    }
                    placeholder="DPT"
                  />
                  <input
                    value={signalLoggerDraft.category}
                    onChange={(event) =>
                      setSignalLoggerDraft((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    placeholder="Kategori"
                  />
                  <select
                    value={signalLoggerDraft.updateMode}
                    onChange={(event) =>
                      setSignalLoggerDraft((current) => ({
                        ...current,
                        updateMode: event.target.value as 'cyclic' | 'onChange' | 'manualPoll' | 'unknown',
                      }))
                    }
                  >
                    <option value="unknown">unknown</option>
                    <option value="cyclic">cyclic</option>
                    <option value="onChange">onChange</option>
                    <option value="manualPoll">manualPoll</option>
                  </select>
                  <input
                    value={signalLoggerDraft.expectedIntervalMs}
                    onChange={(event) =>
                      setSignalLoggerDraft((current) => ({
                        ...current,
                        expectedIntervalMs: event.target.value,
                      }))
                    }
                    placeholder="Forventet intervall ms"
                  />
                  <select
                    value={signalLoggerDraft.roomKey}
                    onChange={(event) =>
                      setSignalLoggerDraft((current) => ({
                        ...current,
                        roomKey: event.target.value,
                      }))
                    }
                  >
                    <option value="">Ingen romkobling</option>
                    {serverRoomSnapshots.map((room) => (
                      <option key={room.roomKey} value={room.roomKey}>
                        {room.label ?? room.roomKey}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="manager-action"
                    onClick={() => void handleCreateSignalLogger()}
                    disabled={!signalLoggerDraft.name.trim() || !signalLoggerDraft.groupAddress.trim()}
                  >
                    Legg til logger
                  </button>
                  {signalLoggerStatus ? <span>{signalLoggerStatus}</span> : null}
                </strong>
              </div>
              <div className="manager-row">
                <span>Signal Logger drift</span>
                <strong className="manager-status-signal">
                  {(diagnostics.knxDiagnostics?.signalLoggers?.loggers ?? []).slice(0, 8).map((logger) => (
                    <span key={`ops-${logger.id}`}>
                      {logger.name} · {logger.groupAddress} · {logger.enabled ? 'aktiv' : 'av'}
                      <button
                        type="button"
                        className="manager-action manager-action--mini"
                        onClick={() => void handleToggleSignalLogger(logger.id, !logger.enabled)}
                      >
                        {logger.enabled ? 'Deaktiver' : 'Aktiver'}
                      </button>
                      <button
                        type="button"
                        className="manager-action manager-action--mini"
                        onClick={() => void handleDeleteSignalLogger(logger.id)}
                      >
                        Slett
                      </button>
                    </span>
                  ))}
                  {(diagnostics.knxDiagnostics?.signalLoggers?.loggers ?? []).length === 0 ? (
                    <span>Ingen custom signal loggers</span>
                  ) : null}
                </strong>
              </div>
              <div className="manager-row">
                <span>Runtime UX</span>
                <strong className="manager-status-signal">
                  <span>Value blink: timestamp-token basert</span>
                  <span>Lys-slider debounce: 300 ms / release</span>
                  <span>NIVA runtime intents: poll, snitt, romstatus, heatDemand</span>
                </strong>
              </div>
              <div className="manager-row">
                <span>Poll-grupper</span>
                <strong className="manager-status-signal">
                  {(diagnostics.knxDiagnostics?.roomPolls ?? []).slice(0, 2).flatMap((poll) =>
                    (poll.requestedGroups ?? []).slice(0, 5).map((group) => (
                      <span key={`${poll.roomId}-${group.groupAddress}-${group.field}`}>
                        {poll.roomId} · {group.groupAddress} · {group.field}
                      </span>
                    )),
                  )}
                  {(diagnostics.knxDiagnostics?.roomPolls ?? []).length === 0 ? (
                    <span>Ingen poll-metadata</span>
                  ) : null}
                </strong>
              </div>
              <div className="manager-row">
                <span>Siste decode</span>
                <strong className="manager-status-signal">
                  {(diagnostics.knxDiagnostics?.recentTelegrams ?? []).slice(0, 3).map((event) => (
                    <span key={`${event.groupAddress}-${event.timestamp}`}>
                      {event.groupAddress} · {event.field ?? 'signal'} · {String(event.decodedValue ?? '—')}
                    </span>
                  ))}
                  {(diagnostics.knxDiagnostics?.recentTelegrams ?? []).length === 0 ? (
                    <span>Venter på KNX telegram</span>
                  ) : null}
                </strong>
              </div>
              <div className="manager-row">
                <span>Diagnostics</span>
                <strong className={diagnostics.knxDiagnosticsError ? 'manager-status-error' : ''}>
                  {diagnostics.knxDiagnosticsError ?? diagnostics.knxDiagnosticsCheckedAt ?? '—'}
                </strong>
              </div>
              </details>
            </>
          ) : null}
        </div>
      </article>

      <article className="manager-card">
        <p className="room-card__label">MQTT</p>
        <div className="manager-list">
          <div className="manager-row">
            <span>Status</span>
            <strong>
              {diagnostics.mqttStatus?.connected
                ? 'Broker tilkoblet'
                : diagnostics.mqttEnabled
                  ? 'Aktiv i config'
                  : 'Ikke aktiv'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Base topic</span>
            <strong>{diagnostics.mqttBaseTopic || '—'}</strong>
          </div>
          <div className="manager-row">
            <span>Topic trust</span>
            <strong>
              live {diagnostics.mqttStatus?.topicTrust?.liveTopicCount ?? 0} · retained{' '}
              {diagnostics.mqttStatus?.topicTrust?.retainedOnlyCount ?? 0} · stale{' '}
              {diagnostics.mqttStatus?.topicTrust?.staleTopicCount ?? 0}
            </strong>
          </div>
          <div className="manager-row">
            <span>Broker health</span>
            <strong>
              reconnect {diagnostics.mqttStatus?.reconnectCount ?? 0} · subscribe failures{' '}
              {diagnostics.mqttStatus?.subscribeFailures ?? 0} · publish failures{' '}
              {diagnostics.mqttStatus?.publishFailures ?? 0}
            </strong>
          </div>
          <details className="manager-advanced-diagnostics">
            <summary>Developer · raw MQTT topics</summary>
            <div className="manager-list">
              {(diagnostics.mqttStatus?.topicTrust?.topics ?? []).slice(0, 10).map((topic) => (
                <div key={topic.topicName} className="manager-row">
                  <span>{topic.retainedOnly ? 'retained-only' : topic.live ? 'live' : topic.stale ? 'stale' : 'topic'}</span>
                  <strong>
                    {topic.topicName} · confidence {topic.confidence} · age {topic.sourceAgeMs ?? '—'} ms
                  </strong>
                </div>
              ))}
              {(diagnostics.mqttStatus?.topicTrust?.topics ?? []).length === 0 ? (
                <div className="manager-row">
                  <span>Topics</span>
                  <strong>Ingen MQTT topics mottatt ennå.</strong>
                </div>
              ) : null}
            </div>
          </details>
        </div>
      </article>

      {isDeveloperMode ? (
        <article className="manager-card manager-card--wide">
          <div className="manager-block__header">
            <div>
              <p className="room-card__label">Server runtime truth</p>
              <p className="manager-helper">
                Read-only foundation for delt runtime-state på bridge. Klientene leser samme summary/history.
              </p>
            </div>
            <span className="manager-readiness__indicator is-partial">
              {serverRuntimeSummary ? 'Active store' : 'No snapshot'}
            </span>
          </div>
          <div className="manager-list">
            <div className="manager-row">
              <span>Source of truth</span>
              <strong>{serverRuntimeSummary?.sourceOfTruth ?? '—'}</strong>
            </div>
            <div className="manager-row">
              <span>Server uptime</span>
              <strong>
                {serverRuntimeSummary
                  ? `${Math.floor(serverRuntimeSummary.uptimeMs / 1000)} sek`
                  : '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Snapshot cadence</span>
              <strong>
                {serverRuntimeSummary ? `${serverRuntimeSummary.snapshotCadenceMs / 1000} sek` : '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>History samples</span>
              <strong>
                {serverRuntimeSummary
                  ? `${serverRuntimeSummary.historySampleCount} events · ${serverRuntimeSummary.historyPointCount} points`
                  : serverRuntimeHistory
                    ? `${serverRuntimeHistory.count} events · ${serverRuntimeHistory.pointCount} points`
                    : '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>History persistence</span>
              <strong>
                {serverRuntimePersistence
                  ? `${serverRuntimePersistence.enabled ? 'Enabled' : 'Disabled'} · restored ${serverRuntimePersistence.restoredPoints} points`
                  : '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Runtime-history storage</span>
              <strong>{serverRuntimePersistence?.storagePath ?? '—'}</strong>
            </div>
            <div className="manager-row">
              <span>Last history flush</span>
              <strong>{serverRuntimePersistence?.lastFlushAt ?? '—'}</strong>
            </div>
            <div className="manager-row">
              <span>Retention policy</span>
              <strong>
                {serverRuntimePersistence
                  ? `${serverRuntimePersistence.retention.maxEvents ?? serverRuntimePersistence.retention.historyLimit ?? '—'} events · ${serverRuntimePersistence.retention.maxPoints ?? serverRuntimePersistence.retention.pointLimit ?? '—'} points · ${serverRuntimePersistence.retention.rotation ?? 'compact'}`
                  : '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Persistence errors</span>
              <strong className={serverRuntimePersistence?.lastError ? 'manager-status-error' : ''}>
                {serverRuntimePersistence?.lastError ?? '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Category counts</span>
              <strong>
                {Object.entries(serverRuntimeCategoryCounts).length > 0
                  ? Object.entries(serverRuntimeCategoryCounts)
                      .map(([category, counts]) => `${category} ${counts.points}/${counts.events}`)
                      .join(' · ')
                  : '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Source distribution</span>
              <strong>
                {Object.entries(serverRuntimeHistory?.sourceDistribution ?? {}).length > 0
                  ? Object.entries(serverRuntimeHistory?.sourceDistribution ?? {})
                      .filter(([, count]) => Number(count) > 0)
                      .map(([source, count]) => `${source} ${count}`)
                      .join(' · ') || '—'
                  : '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Source trust</span>
              <strong
                className={
                  ((serverRuntimeHistory?.sourceDistribution?.restoredHistory ?? 0) +
                    (serverRuntimeHistory?.sourceDistribution?.roomSnapshotReference ?? 0) +
                    (serverRuntimeHistory?.sourceDistribution?.frontendFallback ?? 0) +
                    (serverRuntimeHistory?.sourceDistribution?.derivedQuery ?? 0) +
                    (serverRuntimeHistory?.sourceDistribution?.aggregate ?? 0) +
                    (serverRuntimeHistory?.sourceDistribution?.demo ?? 0) +
                    (serverRuntimeHistory?.sourceDistribution?.simulate ?? 0) +
                    (serverRuntimeHistory?.sourceDistribution?.unknown ?? 0)) >
                  ((serverRuntimeHistory?.sourceDistribution?.liveKnx ?? 0) +
                    (serverRuntimeHistory?.sourceDistribution?.manualPoll ?? 0) +
                    (serverRuntimeHistory?.sourceDistribution?.groupValueResponse ?? 0))
                    ? 'manager-status-error'
                    : ''
                }
              >
                {serverRuntimeHistory?.sourceDistribution
                  ? `live ${
                      (serverRuntimeHistory.sourceDistribution.liveKnx ?? 0) +
                      (serverRuntimeHistory.sourceDistribution.manualPoll ?? 0) +
                      (serverRuntimeHistory.sourceDistribution.groupValueResponse ?? 0)
                    } · reference ${
                      (serverRuntimeHistory.sourceDistribution.restoredHistory ?? 0) +
                      (serverRuntimeHistory.sourceDistribution.roomSnapshotReference ?? 0) +
                      (serverRuntimeHistory.sourceDistribution.frontendFallback ?? 0) +
                      (serverRuntimeHistory.sourceDistribution.derivedQuery ?? 0) +
                      (serverRuntimeHistory.sourceDistribution.aggregate ?? 0) +
                      (serverRuntimeHistory.sourceDistribution.demo ?? 0) +
                      (serverRuntimeHistory.sourceDistribution.simulate ?? 0) +
                      (serverRuntimeHistory.sourceDistribution.unknown ?? 0)
                    }`
                  : '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Lineage warnings</span>
              <strong
                className={
                  (serverRuntimeHistory?.lineageDiagnostics?.liveMissingGroupAddressCount ?? 0) > 0 ||
                  serverRuntimeHistory?.lineageDiagnostics?.derivedDominatesLive
                    ? 'manager-status-error'
                    : ''
                }
              >
                {serverRuntimeHistory?.lineageDiagnostics
                  ? `live missing GA ${serverRuntimeHistory.lineageDiagnostics.liveMissingGroupAddressCount} · derived/query ${serverRuntimeHistory.lineageDiagnostics.derivedQueryPointCount}`
                  : '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Latest missing GA</span>
              <strong>
                {serverRuntimeHistory?.lineageDiagnostics?.latestMissingGroupAddressPoints?.length
                  ? serverRuntimeHistory.lineageDiagnostics.latestMissingGroupAddressPoints
                      .slice(0, 3)
                      .map((point) =>
                        `${point.at ?? '—'} · ${point.roomKey ?? 'room'} · ${point.field ?? 'field'} · ${point.source ?? 'source'}`,
                      )
                      .join(' / ')
                  : '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Datapoint rates</span>
              <strong>
                {Object.entries(serverRuntimeRates).length > 0
                  ? Object.entries(serverRuntimeRates)
                      .map(([category, rate]) => `${category} ${rate.pointsLastHour}/t`)
                      .join(' · ')
                : '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Storage growth</span>
              <strong className="manager-status-signal">
                {(diagnostics.runtimeEventStream.soakMetrics as {
                  storageGrowth?: Record<
                    string,
                    { bytes?: number; count?: number; points?: number; events?: number }
                  >
                } | null)?.storageGrowth
                  ? Object.entries(
                      (diagnostics.runtimeEventStream.soakMetrics as {
                        storageGrowth?: Record<
                          string,
                          { bytes?: number; count?: number; points?: number; events?: number }
                        >
                      }).storageGrowth ?? {},
                    ).map(([name, value]) => (
                      <span key={name}>
                        {name.replace(/^runtime/, '')} · {Math.round((value.bytes ?? 0) / 1024)} KB
                        {typeof value.count === 'number' ? ` · ${value.count}` : ''}
                        {typeof value.points === 'number' ? ` · ${value.points} points` : ''}
                      </span>
                    ))
                  : '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Sparse ranges</span>
              <strong>
                {Object.entries(serverRuntimeRanges).length > 0
                  ? Object.entries(serverRuntimeRanges)
                      .map(([range, meta]) => `${range}: ${meta.sparse ? 'sparse' : 'data'}`)
                      .join(' · ')
                  : '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Oldest/newest sample</span>
              <strong>
                {[serverRuntimeOldestSample, serverRuntimeNewestSample].filter(Boolean).join(' → ') || '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Rom med signaler</span>
              <strong>{serverRuntimeSummary?.roomSummary.roomsWithSignals.length ?? 0}</strong>
            </div>
            <div className="manager-row">
              <span>Room snapshots</span>
              <strong>
                {serverRoomSnapshots.length} snapshots · {staleServerRooms.length} stale
              </strong>
            </div>
            <div className="manager-row">
              <span>Aggregation ranges</span>
              <strong>
                {Object.entries(aggregateRanges).length > 0
                  ? Object.entries(aggregateRanges)
                      .map(([range, aggregate]) => `${range}: ${aggregate.sparse ? 'sparse' : 'data'}`)
                      .join(' · ')
                  : '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Aggregation density</span>
              <strong>
                {serverRuntimeAggregates
                  ? Object.entries(serverRuntimeAggregates.aggregates.day?.categories ?? {})
                      .map(([category, aggregate]) => `${category} ${aggregate.count}`)
                      .join(' · ') || '—'
                  : '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Cadence health</span>
              <strong>
                {serverRuntimeAggregates
                  ? Object.entries(serverRuntimeAggregates.cadence.categories)
                      .map(([category, cadence]) => `${category} ${Math.round(cadence / 1000)}s`)
                      .join(' · ')
                  : '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>NIVA observations</span>
              <strong>
                {serverRuntimeInsights
                  ? `${serverRuntimeInsights.insightCount} insights · ${serverRuntimeInsights.sparse ? 'sparse' : 'data'}`
                  : '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Insight types</span>
              <strong>
                {Object.entries(insightTypeCounts).length > 0
                  ? Object.entries(insightTypeCounts)
                      .map(([type, count]) => `${type} ${count}`)
                      .join(' · ')
                  : '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Siste server-event</span>
              <strong>{serverRuntimeSummary?.latestHistory?.summary ?? '—'}</strong>
            </div>
            <div className="manager-row">
              <span>Sist lest av klient</span>
              <strong>{diagnostics.serverRuntimeCheckedAt ?? '—'}</strong>
            </div>
            <div className="manager-row">
              <span>Server runtime-feil</span>
              <strong className={diagnostics.serverRuntimeError ? 'manager-status-error' : ''}>
                {diagnostics.serverRuntimeError ?? '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Runtime event stream</span>
              <strong className={diagnostics.runtimeEventStream.connected ? '' : 'manager-status-error'}>
                {diagnostics.runtimeEventStream.connectionState ?? (diagnostics.runtimeEventStream.connected ? 'synced' : 'disconnected')}
                {' · '}
                {diagnostics.runtimeEventStream.eventsLastMinute}/min
                {' · reconnect '}
                {diagnostics.runtimeEventStream.reconnectCount}
              </strong>
            </div>
            <div className="manager-row">
              <span>Mobile continuity</span>
              <strong className="manager-status-signal">
                <span>freshness {diagnostics.runtimeEventStream.frontendFreshness ?? 'stale'}</span>
                <span>
                  state age{' '}
                  {diagnostics.runtimeEventStream.frontendStateAgeMs === null
                    ? '—'
                    : `${Math.round(diagnostics.runtimeEventStream.frontendStateAgeMs / 1000)}s`}
                </span>
                <span>last sync {diagnostics.runtimeEventStream.lastSuccessfulSyncAt ?? '—'}</span>
                <span>next retry {diagnostics.runtimeEventStream.reconnectDelayMs ?? '—'} ms</span>
                <span>drift {diagnostics.runtimeEventStream.runtimeDriftSuspected ? 'watch' : 'no'}</span>
                <span>
                  stale/offline {diagnostics.runtimeEventStream.staleStateCount}/
                  {diagnostics.runtimeEventStream.offlineStateCount}
                </span>
              </strong>
            </div>
            {diagnostics.runtimeEventStream.reconnectHistory.length > 0 ? (
              <div className="manager-row manager-row--stacked">
                <span>Reconnect history</span>
                <strong className="manager-status-signal">
                  {diagnostics.runtimeEventStream.reconnectHistory.slice(0, 5).map((entry) => (
                    <span key={`${entry.at}-${entry.attempt}`}>
                      {entry.state} · attempt {entry.attempt} · delay {entry.delayMs ?? 0} ms ·{' '}
                      {entry.lastEventId ?? 'no event'}
                    </span>
                  ))}
                </strong>
              </div>
            ) : null}
            <div className="manager-row">
              <span>Runtime observability</span>
              <strong className="manager-status-signal">
                <span>Polling {diagnostics.runtimeEventStream.pollingRequestsPerMinute}/min</span>
                <span>Fallback refresh {diagnostics.runtimeEventStream.fallbackRefreshCount}</span>
                <span>Reducer applied {diagnostics.runtimeEventStream.reducerApplyCount}</span>
                <span>Replay {diagnostics.runtimeEventStream.replayedEvents}</span>
                <span>Stale transitions {diagnostics.runtimeEventStream.staleTransitions}</span>
              </strong>
            </div>
            <div className="manager-row">
              <span>Soak counters</span>
              <strong className="manager-status-signal">
                <span>
                  Runtime restarts{' '}
                  {Number(diagnostics.runtimeEventStream.soakMetrics?.runtimeRestartCount ?? 0)}
                </span>
                <span>
                  SSE reconnect{' '}
                  {Number(diagnostics.runtimeEventStream.soakMetrics?.sseReconnectCount ?? diagnostics.runtimeEventStream.reconnectCount)}
                </span>
                <span>
                  KNX reconnect{' '}
                  {Number(diagnostics.runtimeEventStream.soakMetrics?.knxReconnectCount ?? 0)}
                </span>
                <span>
                  Actions{' '}
                  {Number(diagnostics.runtimeEventStream.soakMetrics?.actionExecutionCount ?? 0)}
                </span>
              </strong>
            </div>
            <div className="manager-row">
              <span>Runtime continuity</span>
              <strong className="manager-status-signal">
                <span>
                  Snapshot{' '}
                  {diagnostics.runtimeEventStream.runtimeContinuity?.lastSnapshotId?.slice(0, 20) ?? 'venter'}
                </span>
                <span>
                  Restored {diagnostics.runtimeEventStream.runtimeContinuity?.restored ? 'ja' : 'nei'}
                </span>
                <span>
                  Partial {diagnostics.runtimeEventStream.runtimeContinuity?.partialRestore ? 'ja' : 'nei'}
                </span>
                <span>
                  Count {diagnostics.runtimeEventStream.runtimeContinuity?.snapshotCount ?? 0}
                </span>
                <span>
                  Cadence{' '}
                  {diagnostics.runtimeEventStream.runtimeContinuity
                    ? `${Math.round(diagnostics.runtimeEventStream.runtimeContinuity.retention.cadenceMs / 1000)}s`
                    : '—'}
                </span>
                <span>
                  Pending{' '}
                  {diagnostics.runtimeEventStream.runtimeContinuity?.lastSnapshot?.pendingActions ?? 0}
                </span>
                {diagnostics.runtimeEventStream.runtimeContinuity?.lastError ? (
                  <span>{diagnostics.runtimeEventStream.runtimeContinuity.lastError}</span>
                ) : null}
              </strong>
            </div>
            <div className="manager-row">
              <span>Runtime boot</span>
              <strong className="manager-status-signal">
                <span>
                  Phase {diagnostics.runtimeEventStream.runtimeBoot?.currentPhase ?? 'venter'}
                </span>
                <span>
                  Ready {diagnostics.runtimeEventStream.runtimeBoot?.ready ? 'ja' : 'nei'}
                </span>
                <span>
                  Degraded {diagnostics.runtimeEventStream.runtimeBoot?.degraded ? 'ja' : 'nei'}
                </span>
                <span>
                  Providers{' '}
                  {diagnostics.runtimeEventStream.runtimeBoot
                    ? `${diagnostics.runtimeEventStream.runtimeBoot.providersReady}/${diagnostics.runtimeEventStream.runtimeBoot.providerCount}`
                    : '—'}
                </span>
                <span>
                  Uptime{' '}
                  {diagnostics.runtimeEventStream.runtimeBoot
                    ? `${Math.round(diagnostics.runtimeEventStream.runtimeBoot.uptimeMs / 1000)}s`
                    : '—'}
                </span>
                <span>
                  Startup{' '}
                  {diagnostics.runtimeEventStream.runtimeBoot?.startupLatencyMs === null ||
                  diagnostics.runtimeEventStream.runtimeBoot?.startupLatencyMs === undefined
                    ? '—'
                    : `${Math.round(diagnostics.runtimeEventStream.runtimeBoot.startupLatencyMs)} ms`}
                </span>
              </strong>
            </div>
            <div className="manager-row">
              <span>Provider readiness</span>
              <strong className="manager-status-signal">
                {(diagnostics.runtimeEventStream.runtimeBoot?.providerReadiness ?? []).length > 0
                  ? diagnostics.runtimeEventStream.runtimeBoot?.providerReadiness.slice(0, 8).map((provider) => (
                      <span key={provider.providerId}>
                        {provider.displayName} · {provider.maturity ?? provider.bootState} · {provider.dependencyStatus}
                        {provider.recoveryCapable ? ' · recovery' : ''}
                        {provider.foundationOnly ? ' · foundation-only' : ''}
                        {provider.controlAvailable ? ' · control' : ''}
                      </span>
                    ))
                  : <span>—</span>}
              </strong>
            </div>
            <div className="manager-row">
              <span>Runtime actions</span>
              <strong className="manager-status-signal">
                <span>{diagnostics.runtimeEventStream.actionMetrics?.actionsLastMinute ?? 0}/min</span>
                <span>Pending {diagnostics.runtimeEventStream.actionMetrics?.pendingApprovals ?? 0}</span>
                <span>Failed {diagnostics.runtimeEventStream.actionMetrics?.failedActions ?? 0}</span>
                <span>Approval-required {diagnostics.runtimeEventStream.actionMetrics?.approvalRequiredCount ?? 0}</span>
                <span>
                  Latency{' '}
                  {diagnostics.runtimeEventStream.actionMetrics?.averageActionLatency === null ||
                  diagnostics.runtimeEventStream.actionMetrics?.averageActionLatency === undefined
                    ? '—'
                    : `${Math.round(diagnostics.runtimeEventStream.actionMetrics.averageActionLatency)} ms`}
                </span>
                <span>
                  Persisted{' '}
                  {diagnostics.runtimeEventStream.actionMetrics?.persistence?.enabled
                    ? diagnostics.runtimeEventStream.actionMetrics.persistence.lastFlushAt ?? 'klar'
                    : 'nei'}
                </span>
              </strong>
            </div>
            <div className="manager-row manager-row--stacked">
              <span>Approval queue</span>
              <div className="runtime-approval-list">
                {(diagnostics.runtimeEventStream.actionMetrics?.approvalQueue?.pending ?? []).length > 0 ? (
                  (diagnostics.runtimeEventStream.actionMetrics?.approvalQueue?.pending ?? []).slice(0, 6).map((action) => (
                    <article key={action.actionId} className="runtime-approval-card">
                      <div>
                        <strong>
                          {action.source === 'niva' ? 'NIVA foreslår handling' : action.type}
                        </strong>
                        <span>
                          {action.category} · {action.policy?.riskLevel ?? 'medium'} ·{' '}
                          {action.trustedClient ? 'trusted local' : action.initiatedFrom ?? 'unknown'}
                        </span>
                        <small>
                          {action.createdAt} · {action.source}
                        </small>
                      </div>
                      <div className="runtime-approval-card__actions">
                        <button
                          type="button"
                          className="manager-action"
                          disabled={!onRuntimeActionDecision}
                          onClick={() => void onRuntimeActionDecision?.(action.actionId, 'approve')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="manager-action manager-action--ghost"
                          disabled={!onRuntimeActionDecision}
                          onClick={() => void onRuntimeActionDecision?.(action.actionId, 'deny')}
                        >
                          Deny
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <strong>Ingen pending approvals.</strong>
                )}
              </div>
            </div>
            <div className="manager-row">
              <span>Runtime policy</span>
              <strong className="manager-status-signal">
                <span>Policies {diagnostics.runtimeEventStream.actionMetrics?.governance?.policyCount ?? 0}</span>
                <span>Trusted clients {diagnostics.runtimeEventStream.actionMetrics?.governance?.trustedClientCount ?? 0}</span>
                <span>Untrusted {diagnostics.runtimeEventStream.actionMetrics?.governance?.untrustedClientCount ?? 0}</span>
                <span>Risk attempts {diagnostics.runtimeEventStream.actionMetrics?.governance?.riskyActionAttempts ?? 0}</span>
                <span>Audit {diagnostics.runtimeEventStream.actionMetrics?.governance?.auditEventCount ?? 0}</span>
              </strong>
            </div>
            <div className="manager-row">
              <span>Runtime domains</span>
              <strong className="manager-status-signal">
                <span>
                  Domains{' '}
                  {diagnostics.runtimeEventStream.runtimeDomains?.counts.domains ??
                    diagnostics.runtimeEventStream.actionMetrics?.domains?.counts.domains ??
                    0}
                </span>
                <span>
                  Realtime{' '}
                  {diagnostics.runtimeEventStream.runtimeDomains?.counts.realtimeCapable ??
                    diagnostics.runtimeEventStream.actionMetrics?.domains?.counts.realtimeCapable ??
                    0}
                </span>
                <span>
                  Approval-sensitive{' '}
                  {diagnostics.runtimeEventStream.runtimeDomains?.counts.approvalSensitive ??
                    diagnostics.runtimeEventStream.actionMetrics?.domains?.counts.approvalSensitive ??
                    0}
                </span>
                <span>
                  Experimental{' '}
                  {diagnostics.runtimeEventStream.runtimeDomains?.counts.experimental ??
                    diagnostics.runtimeEventStream.actionMetrics?.domains?.counts.experimental ??
                    0}
                </span>
              </strong>
            </div>
            <div className="manager-row">
              <span>Domain capabilities</span>
              <strong className="manager-status-signal">
                {(diagnostics.runtimeEventStream.runtimeDomains?.domains ??
                  diagnostics.runtimeEventStream.actionMetrics?.domains?.domains ??
                  []).length > 0
                  ? (diagnostics.runtimeEventStream.runtimeDomains?.domains ??
                      diagnostics.runtimeEventStream.actionMetrics?.domains?.domains ??
                      []).map((domain) => (
                        <span key={domain.domainId}>
                          {domain.displayName} · {domain.health} · {domain.capabilities.length} caps
                          {domain.approvalHeavy ? ' · approval' : ''}
                          {domain.realtimeCritical ? ' · realtime' : ''}
                        </span>
                      ))
                  : <span>—</span>}
              </strong>
            </div>
            {diagnostics.uiCapabilities ? (
              <div className="manager-row manager-row--stacked">
                <span>UI capability visibility</span>
                <strong className="manager-status-signal">
                  <span>visible {diagnostics.uiCapabilities.summary.visible}</span>
                  <span>enabled {diagnostics.uiCapabilities.summary.enabled}</span>
                  <span>hidden {diagnostics.uiCapabilities.summary.hidden}</span>
                  <span>future {diagnostics.uiCapabilities.summary.future}</span>
                  <span>room scoped {diagnostics.uiCapabilities.summary.roomScoped}</span>
                  <span>future shown {diagnostics.uiCapabilities.showFutureFeatures ? 'yes' : 'no'}</span>
                  <span>HCL {diagnostics.uiCapabilities.hclFoundationActive ? 'visible' : 'hidden'} · dryRun {diagnostics.uiCapabilities.hclDryRun ? 'yes' : 'no'}</span>
                  <span>shading {diagnostics.uiCapabilities.shadingVisible ? 'visible' : 'hidden'}</span>
                  <span>
                    room caps{' '}
                    {diagnostics.uiCapabilities.roomSummaries.reduce(
                      (sum, room) => sum + room.enabled.length,
                      0,
                    )}
                  </span>
                </strong>
              </div>
            ) : null}
            {diagnostics.shadingDiagnostics ? (
              <div className="manager-row manager-row--stacked">
                <span>Shading foundation</span>
                <strong className="manager-status-signal">
                  <span>entries {diagnostics.shadingDiagnostics.entryCount}</span>
                  <span>active {diagnostics.shadingDiagnostics.activeCount}</span>
                  <span>visible {diagnostics.shadingDiagnostics.visibleCount}</span>
                  <span>live-ready {diagnostics.shadingDiagnostics.liveReadyCount ?? 0}</span>
                  <span>partial {diagnostics.shadingDiagnostics.partialMappingCount ?? 0}</span>
                  <span>missing mapping {diagnostics.shadingDiagnostics.missingMappingCount}</span>
                  <span>pending {diagnostics.shadingDiagnostics.pendingConfirmationCount ?? 0}</span>
                  <span>write failures {diagnostics.shadingDiagnostics.writeFailureCount ?? 0}</span>
                  {diagnostics.shadingDiagnostics.lastCommand ? (
                    <span>last command {JSON.stringify(diagnostics.shadingDiagnostics.lastCommand).slice(0, 120)}</span>
                  ) : null}
                  {diagnostics.shadingDiagnostics.lastFeedback ? (
                    <span>last feedback {JSON.stringify(diagnostics.shadingDiagnostics.lastFeedback).slice(0, 120)}</span>
                  ) : null}
                  {diagnostics.shadingDiagnostics.entries.slice(0, 6).map((entry) => (
                    <span key={entry.shadingId}>
                      {entry.roomName} · {entry.label} · {entry.statusLabel}
                      {entry.missingFields.length > 0 ? ` · mangler ${entry.missingFields.join(', ')}` : ''}
                    </span>
                  ))}
                </strong>
              </div>
            ) : null}
            {diagnostics.cameraFoundationDiagnostics ? (
              <div className="manager-row manager-row--stacked">
                <span>Camera / NVR foundation</span>
                <strong className="manager-status-signal">
                  <span>{diagnostics.cameraFoundationDiagnostics.providerEnabled ? 'provider enabled' : 'provider off'}</span>
                  <span>cameras {diagnostics.cameraFoundationDiagnostics.cameraCount}</span>
                  <span>visible {diagnostics.cameraFoundationDiagnostics.visibleCount}</span>
                  <span>missing stream {diagnostics.cameraFoundationDiagnostics.missingInputCount}</span>
                  <span>recording {diagnostics.cameraFoundationDiagnostics.recordingEnabledCount}</span>
                  <span>storage {diagnostics.cameraFoundationDiagnostics.recorderTargetLabel} · {diagnostics.cameraFoundationDiagnostics.storageHealth}</span>
                  {diagnostics.cameraFoundationDiagnostics.entries.slice(0, 6).map((entry) => (
                    <span key={entry.cameraId}>
                      {entry.displayName} · {entry.typeLabel} · {entry.statusLabel}
                      {entry.missingStream ? ' · mangler stream/snapshot' : ''}
                    </span>
                  ))}
                </strong>
              </div>
            ) : null}
            {diagnostics.mediaGroupDiagnostics ? (
              <div className="manager-row manager-row--stacked">
                <span>Media groups foundation</span>
                <strong className="manager-status-signal">
                  <span>groups {diagnostics.mediaGroupDiagnostics.groupCount}</span>
                  <span>enabled {diagnostics.mediaGroupDiagnostics.enabledCount}</span>
                  <span>speakers {diagnostics.mediaGroupDiagnostics.speakerCount}</span>
                  <span>cast targets {diagnostics.mediaGroupDiagnostics.castTargetCount}</span>
                  <span>delay offsets {diagnostics.mediaGroupDiagnostics.delayOffsetCount}</span>
                  {diagnostics.mediaGroupDiagnostics.groups.slice(0, 6).map((group) => (
                    <span key={group.mediaGroupId}>
                      {group.displayName} · {group.status} · {group.speakerCount} speakers
                    </span>
                  ))}
                </strong>
              </div>
            ) : null}
            {diagnostics.autoPollTargetDiagnostics ? (
              <div className="manager-row manager-row--stacked">
                <span>Auto-poll targeting</span>
                <strong className="manager-status-signal">
                  <span>{diagnostics.autoPollTargetDiagnostics.enabled ? 'enabled' : 'disabled'}</span>
                  <span>mode {diagnostics.autoPollTargetDiagnostics.mode}</span>
                  <span>selected {diagnostics.autoPollTargetDiagnostics.selectedCount}</span>
                  <span>eligible {diagnostics.autoPollTargetDiagnostics.eligibleCount}</span>
                  <span>skipped {diagnostics.autoPollTargetDiagnostics.skippedReason ?? '—'}</span>
                  {diagnostics.autoPollTargetDiagnostics.preview.slice(0, 6).map((target) => (
                    <span key={target.signalId}>
                      {target.roomName} · {target.field} · {target.groupAddress} · {target.selected ? 'selected' : target.reason}
                    </span>
                  ))}
                </strong>
              </div>
            ) : null}
            {diagnostics.optimisticLightingDiagnostics ? (
              <div className="manager-row manager-row--stacked">
                <span>Lighting response trust</span>
                <strong className="manager-status-signal">
                  <span>aktiv {diagnostics.optimisticLightingDiagnostics.optimisticStateCount}</span>
                  <span>avventer {diagnostics.optimisticLightingDiagnostics.pendingFeedbackCount}</span>
                  <span>forsinket {diagnostics.optimisticLightingDiagnostics.delayedFeedbackCount}</span>
                  <span>bekreftet {diagnostics.optimisticLightingDiagnostics.confirmedCount}</span>
                  <span>korrigert {diagnostics.optimisticLightingDiagnostics.rollbackCount}</span>
                  <span>
                    indikatorer {diagnostics.optimisticLightingDiagnostics.calmIndicatorsActive ? 'på' : 'av'} · tooltip{' '}
                    {diagnostics.optimisticLightingDiagnostics.tooltipSystemActive ? 'på' : 'av'}
                  </span>
                  <span>
                    snitt feedback{' '}
                    {diagnostics.optimisticLightingDiagnostics.averageFeedbackLatencyMs !== null
                      ? `${diagnostics.optimisticLightingDiagnostics.averageFeedbackLatencyMs}ms`
                      : '—'}
                  </span>
                  {diagnostics.optimisticLightingDiagnostics.activeEntries.slice(0, 6).map((entry) => (
                    <span key={entry.key}>
                      {entry.roomName} · {entry.zoneName} · {entry.expectedBrightness}% ·{' '}
                      {formatOptimisticLightingStatus(entry.status)}
                    </span>
                  ))}
                  {diagnostics.optimisticLightingDiagnostics.latestRollbackSignals.slice(0, 4).map((entry) => (
                    <span key={`${entry.key}-${entry.at}`}>
                      korrigert {entry.roomName}/{entry.zoneName} · {entry.reason}
                    </span>
                  ))}
                </strong>
              </div>
            ) : null}
            {diagnostics.conversationFeedbackReview ? (
              <div className="manager-row manager-row--stacked">
                <span>NIVA conversation feedback</span>
                <strong className="manager-status-signal">
                  <span>
                    {diagnostics.conversationFeedbackReview.available ? 'available' : 'none'} · {diagnostics.conversationFeedbackReview.itemCount} items
                  </span>
                  {Object.entries(diagnostics.conversationFeedbackReview.byIssueType ?? {}).map(([issue, count]) => (
                    <span key={issue}>
                      {issue} {count}
                    </span>
                  ))}
                  {diagnostics.conversationFeedbackReview.latestFeedbackItems.slice(0, 4).map((item) => (
                    <span key={`${item.at ?? 'unknown'}-${item.message}`}>
                      {item.page} · {item.issueTypes.join('/')} · {item.message}
                    </span>
                  ))}
                </strong>
              </div>
            ) : null}
            <div className="manager-row">
              <span>Runtime registry</span>
              <strong className="manager-status-signal">
                <span>Providers {diagnostics.runtimeEventStream.runtimeRegistry?.providers.length ?? 0}</span>
                <span>Services {diagnostics.runtimeEventStream.runtimeRegistry?.runtimeServices.length ?? 0}</span>
                <span>Capabilities {diagnostics.runtimeEventStream.runtimeRegistry?.capabilities.length ?? 0}</span>
                <span>
                  Updated {diagnostics.runtimeEventStream.runtimeRegistry?.lastUpdatedAt ?? '—'}
                </span>
                <span>
                  Plugins {diagnostics.runtimeEventStream.runtimeRegistry?.pluginSystem ? 'on' : 'off'}
                </span>
              </strong>
            </div>
            <div className="manager-row">
              <span>Provider manifests</span>
              <strong className="manager-status-signal">
                {(diagnostics.runtimeEventStream.runtimeRegistry?.providers ?? []).length > 0
                  ? (diagnostics.runtimeEventStream.runtimeRegistry?.providers ?? []).slice(0, 10).map((provider) => (
                      <span key={provider.providerId}>
                        {provider.displayName} · {provider.domainId} · {provider.maturity ?? 'foundation'} · {provider.health}
                        {provider.realtime ? ' · realtime' : ''}
                        {provider.approvalSensitive ? ' · approval' : ''}
                        {provider.persistenceAware ? ' · persisted' : ''}
                        {provider.recoveryAware ? ' · recovery' : ''}
                        {provider.foundationOnly ? ' · foundation-only' : ''}
                        {provider.sendsCommands ? ' · commands' : ' · no-commands'}
                      </span>
                    ))
                  : <span>—</span>}
              </strong>
            </div>
            <div className="manager-row">
              <span>Capability matrix</span>
              <strong className="manager-status-signal">
                {(diagnostics.runtimeEventStream.runtimeRegistry?.capabilities ?? []).length > 0
                  ? (diagnostics.runtimeEventStream.runtimeRegistry?.capabilities ?? []).slice(0, 8).map((capability) => (
                      <span key={capability.capability}>
                        {capability.capability} · {capability.providers.length} providers
                        {capability.sensitive ? ' · sensitive' : ''}
                      </span>
                    ))
                  : <span>—</span>}
              </strong>
            </div>
            <div className="manager-row">
              <span>Runtime services</span>
              <strong className="manager-status-signal">
                {(diagnostics.runtimeEventStream.runtimeRegistry?.runtimeServices ?? []).length > 0
                  ? (diagnostics.runtimeEventStream.runtimeRegistry?.runtimeServices ?? []).map((service) => (
                      <span key={service.serviceId}>
                        {service.displayName} · {service.health}
                        {service.realtime ? ' · realtime' : ''}
                        {service.persistenceAware ? ' · persisted' : ''}
                        {service.recoveryAware ? ' · recovery' : ''}
                      </span>
                    ))
                  : <span>—</span>}
              </strong>
            </div>
            <div className="manager-row">
              <span>Runtime semantics</span>
              <strong className="manager-status-signal">
                <span>
                  Entities {diagnostics.runtimeEventStream.runtimeRegistry?.contextGraph?.summary.entityCount ?? 0}
                </span>
                <span>
                  Relations {diagnostics.runtimeEventStream.runtimeRegistry?.contextGraph?.summary.relationshipCount ?? 0}
                </span>
                <span>
                  Realtime-critical {diagnostics.runtimeEventStream.runtimeRegistry?.contextGraph?.summary.realtimeCriticalCount ?? 0}
                </span>
                <span>
                  Approval-sensitive {diagnostics.runtimeEventStream.runtimeRegistry?.contextGraph?.summary.approvalSensitiveCount ?? 0}
                </span>
                <span>
                  Orphaned {diagnostics.runtimeEventStream.runtimeRegistry?.contextGraph?.summary.orphanedCount ?? 0}
                </span>
              </strong>
            </div>
            <div className="manager-row">
              <span>Runtime insights</span>
              <strong className="manager-status-signal">
                <span>
                  Active {diagnostics.serverRuntimeInsights?.runtimeInsightEngine?.insightCount ?? 0}
                </span>
                <span>
                  Stale {diagnostics.serverRuntimeInsights?.runtimeInsightEngine?.lifecycle.stale ?? 0}
                </span>
                <span>
                  Resolved {diagnostics.serverRuntimeInsights?.runtimeInsightEngine?.lifecycle.resolved ?? 0}
                </span>
                <span>
                  Restored {diagnostics.serverRuntimeInsights?.runtimeInsightEngine?.persistence.restoredInsights ?? 0}
                </span>
                <span>
                  Deterministic {diagnostics.serverRuntimeInsights?.runtimeInsightEngine?.deterministic ? 'ja' : 'venter'}
                </span>
              </strong>
            </div>
            <div className="manager-row">
              <span>Insight categories</span>
              <strong className="manager-status-signal">
                {diagnostics.serverRuntimeInsights?.runtimeInsightEngine?.categoryDistribution
                  ? Object.entries(diagnostics.serverRuntimeInsights.runtimeInsightEngine.categoryDistribution)
                      .slice(0, 8)
                      .map(([category, count]) => (
                        <span key={category}>{category} · {count}</span>
                      ))
                  : <span>—</span>}
              </strong>
            </div>
            <div className="manager-row">
              <span>Explainable insights</span>
              <strong className="manager-status-signal">
                {(diagnostics.serverRuntimeInsights?.runtimeInsightEngine?.activeInsights ?? []).length > 0
                  ? (diagnostics.serverRuntimeInsights?.runtimeInsightEngine?.activeInsights ?? [])
                      .slice(0, 6)
                      .map((insight) => (
                        <span key={insight.insightId}>
                          {insight.category} · {insight.severity} · {insight.explanation}
                        </span>
                      ))
                  : <span>—</span>}
              </strong>
            </div>
            <div className="manager-row">
              <span>Semantic roles</span>
              <strong className="manager-status-signal">
                {diagnostics.runtimeEventStream.runtimeRegistry?.contextGraph?.summary.semanticRoles
                  ? Object.entries(diagnostics.runtimeEventStream.runtimeRegistry.contextGraph.summary.semanticRoles)
                      .slice(0, 8)
                      .map(([role, count]) => (
                        <span key={role}>{role} · {count}</span>
                      ))
                  : <span>—</span>}
              </strong>
            </div>
            <div className="manager-row">
              <span>Context graph entities</span>
              <strong className="manager-status-signal">
                {(diagnostics.runtimeEventStream.runtimeRegistry?.semanticEntities ?? []).length > 0
                  ? (diagnostics.runtimeEventStream.runtimeRegistry?.semanticEntities ?? [])
                      .slice(0, 10)
                      .map((entity) => (
                        <span key={entity.entityId}>
                          {entity.displayName} · {entity.entityType} · {entity.semanticRole}
                          {entity.critical ? ' · critical' : ''}
                          {entity.realtime ? ' · realtime' : ''}
                        </span>
                      ))
                  : <span>—</span>}
              </strong>
            </div>
            <div className="manager-row">
              <span>Runtime clients</span>
              <strong className="manager-status-signal">
                <span>Clients {diagnostics.runtimeEventStream.clientIdentity?.counts.clients ?? 0}</span>
                <span>Sessions {diagnostics.runtimeEventStream.clientIdentity?.counts.sessions ?? 0}</span>
                <span>Trusted {diagnostics.runtimeEventStream.clientIdentity?.counts.trusted ?? 0}</span>
                <span>Untrusted {diagnostics.runtimeEventStream.clientIdentity?.counts.untrusted ?? 0}</span>
                <span>SSE {diagnostics.runtimeEventStream.clientIdentity?.counts.eventStreams ?? 0}</span>
                <span>Stale {diagnostics.runtimeEventStream.clientIdentity?.counts.staleSessions ?? 0}</span>
              </strong>
            </div>
            <div className="manager-row">
              <span>Client sessions</span>
              <strong className="manager-status-signal">
                {(diagnostics.runtimeEventStream.clientIdentity?.sessions ?? []).length > 0
                  ? (diagnostics.runtimeEventStream.clientIdentity?.sessions ?? []).slice(0, 5).map((session) => (
                      <span key={session.sessionId}>
                        {session.clientId.slice(0, 14)} · {session.connectionType} · {session.trustedSession ? 'trusted' : 'unknown'}
                      </span>
                    ))
                  : <span>—</span>}
              </strong>
            </div>
            <div className="manager-row">
              <span>SSE client streams</span>
              <strong className="manager-status-signal">
                {diagnostics.runtimeEventStream.clients.length > 0
                  ? diagnostics.runtimeEventStream.clients.slice(0, 5).map((client) => (
                      <span key={`${client.clientId}-${client.sessionId}`}>
                        {client.clientId.slice(0, 14)} · sent {client.sentEvents} · dropped {client.droppedEvents} · reconnect {client.reconnectCount}
                      </span>
                    ))
                  : <span>—</span>}
              </strong>
            </div>
            <div className="manager-row">
              <span>Approval policies</span>
              <strong className="manager-status-signal">
                {(diagnostics.runtimeEventStream.actionMetrics?.policies ?? []).length > 0
                  ? (diagnostics.runtimeEventStream.actionMetrics?.policies ?? []).slice(0, 5).map((policy) => (
                      <span key={policy.policyId}>
                        {policy.category}/{policy.actionType} · {policy.requiresApproval ? 'approval' : 'auto'} · {policy.riskLevel}
                      </span>
                    ))
                  : <span>—</span>}
              </strong>
            </div>
            <div className="manager-row">
              <span>Runtime audit</span>
              <strong className="manager-status-signal">
                {(diagnostics.runtimeEventStream.actionMetrics?.audit?.recentEvents ?? []).length > 0
                  ? (diagnostics.runtimeEventStream.actionMetrics?.audit?.recentEvents ?? []).slice(0, 5).map((event) => (
                      <span key={event.auditId}>
                        {event.eventType} · {event.actionType} · {event.initiatedFrom ?? 'unknown'}
                      </span>
                    ))
                  : <span>—</span>}
              </strong>
            </div>
            <div className="manager-row">
              <span>Latest runtime actions</span>
              <strong className="manager-status-signal">
                {(diagnostics.runtimeEventStream.actionMetrics?.recentActions ?? []).length > 0
                  ? (diagnostics.runtimeEventStream.actionMetrics?.recentActions ?? []).slice(0, 5).map((action) => (
                      <span key={`${action.actionId}-${action.executionState}`}>
                        {action.type} · {action.executionState}
                      </span>
                    ))
                  : <span>—</span>}
              </strong>
            </div>
            <div className="manager-row">
              <span>Runtime stream diagnostics</span>
              <strong className="manager-status-signal">
                <span>Last event: {diagnostics.runtimeEventStream.lastEventAt ?? '—'}</span>
                <span>Latency: {diagnostics.runtimeEventStream.latencyMs ?? '—'} ms</span>
                <span>Avg latency: {diagnostics.runtimeEventStream.averageEventLatency === null ? '—' : `${Math.round(diagnostics.runtimeEventStream.averageEventLatency)} ms`}</span>
                <span>Max latency: {diagnostics.runtimeEventStream.maxEventLatency === null ? '—' : `${Math.round(diagnostics.runtimeEventStream.maxEventLatency)} ms`}</span>
                <span>Reducer: {diagnostics.runtimeEventStream.averageReducerTime === null ? '—' : `${diagnostics.runtimeEventStream.averageReducerTime.toFixed(1)} ms`}</span>
                <span>Refresh: {diagnostics.runtimeEventStream.averageRuntimeRefreshTime === null ? '—' : `${Math.round(diagnostics.runtimeEventStream.averageRuntimeRefreshTime)} ms`}</span>
                <span>Dropped: {diagnostics.runtimeEventStream.droppedEvents}</span>
                <span>Buffer: {diagnostics.runtimeEventStream.eventBufferSize}</span>
                <span>Replay: {diagnostics.runtimeEventStream.replaySupported ? 'klar' : 'ikke klar'}</span>
                {diagnostics.runtimeEventStream.error ? (
                  <span>{diagnostics.runtimeEventStream.error}</span>
                ) : null}
              </strong>
            </div>
            <div className="manager-row">
              <span>Runtime event reducer</span>
              <strong className="manager-status-signal">
                <span>Status: {diagnostics.runtimeEventStream.reducerStatus}</span>
                <span>Mode: {diagnostics.runtimeEventStream.pollingFallbackMode}</span>
                <span>Healthy: {diagnostics.runtimeEventStream.runtimeEventHealthy ? 'ja' : 'nei'}</span>
                <span>Latest: {diagnostics.runtimeEventStream.latestEventId ?? '—'}</span>
                <span>Applied: {diagnostics.runtimeEventStream.lastAppliedEventId ?? '—'}</span>
                <span>Resync: {diagnostics.runtimeEventStream.resyncRequiredCount}</span>
                <span>Fallback: {diagnostics.runtimeEventStream.fallbackPollingStatus}</span>
              </strong>
            </div>
            <div className="manager-row">
              <span>Event lineage</span>
              <strong className="manager-status-signal">
                {diagnostics.runtimeEventStream.lastEventChain.length > 0
                  ? diagnostics.runtimeEventStream.lastEventChain.slice(0, 6).map((step) => (
                      <span key={step}>{step}</span>
                    ))
                  : <span>—</span>}
              </strong>
            </div>
            <div className="manager-row">
              <span>Polling pressure</span>
              <strong className="manager-status-signal">
                {diagnostics.runtimeEventStream.topPollingSources.length > 0
                  ? diagnostics.runtimeEventStream.topPollingSources.slice(0, 5).map((source) => (
                      <span key={source.path}>{source.path} · {source.count}</span>
                    ))
                  : <span>—</span>}
              </strong>
            </div>
          </div>
        </article>
      ) : null}

      <article className="manager-card manager-card--wide">
        <div className="manager-block__header">
          <div>
            <p className="room-card__label">Cast reliability</p>
            <p className="manager-helper">
              Stabil enhetsliste og playback-tillit for Google Home / Chromecast.
            </p>
          </div>
          <span className={`manager-readiness__indicator ${castOnlineCount > 0 ? 'is-ready' : 'is-partial'}`}>
            {castOnlineCount > 0 ? `${castOnlineCount} online` : 'Venter på discovery'}
          </span>
        </div>
        <div className="manager-list">
          <div className="manager-row">
            <span>Device states</span>
            <strong className="manager-status-signal">
              <span>Online {castOnlineCount}</span>
              <span>Stale {castStaleCount}</span>
              <span>Offline {castOfflineCount}</span>
            </strong>
          </div>
          <div className="manager-row">
            <span>Discovery health</span>
            <strong>
              {castRuntime?.enabled
                ? castRuntime.discoveryEnabled
                  ? `${castRuntime.state} · mDNS ${castDiagnostics?.mdnsActive ? 'aktiv' : 'rolig'}`
                  : 'Discovery disabled'
                : 'Cast disabled'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Siste discovery</span>
            <strong>
              {castRuntime?.lastDiscoveryAt ?? '—'}
              {castDiagnostics?.lastDiscoveryDurationMs
                ? ` · ${castDiagnostics.lastDiscoveryDurationMs} ms · ${castDiagnostics.discoveryFoundCount ?? 0} svar`
                : ''}
            </strong>
          </div>
          <div className="manager-row">
            <span>Interface / reconnect</span>
            <strong>
              {castDiagnostics?.discoveryInterfaceUsed ?? castDiagnostics?.networkInterfaceUsed ?? '—'} · reconnect{' '}
              {castDiagnostics?.reconnectCount ?? 0}
            </strong>
          </div>
          <div className="manager-row">
            <span>Playback trust</span>
            <strong>
              {castRuntime?.playback?.state ?? '—'} · confidence{' '}
              {castRuntime?.playback?.playbackConfidence ?? castDiagnostics?.playbackConfidence ?? '—'} · freshness{' '}
              {castRuntime?.playback?.sourceFreshness ?? '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Discovery note</span>
            <strong className={castRuntime?.error ? 'manager-status-error' : ''}>
              {castDiagnostics?.note ?? castRuntime?.error ?? 'Ingen Cast-feil rapportert.'}
            </strong>
          </div>
        </div>
        <details className="manager-advanced-diagnostics">
          <summary>Developer · Cast raw discovery</summary>
          <div className="manager-list">
            {(castDiagnostics?.deviceAges ?? []).slice(0, 6).map((device) => (
              <div key={device.id} className="manager-row">
                <span>{device.name}</span>
                <strong>
                  {device.state} · age {device.ageMs ?? '—'} ms · {device.lastSeenAt ?? '—'}
                </strong>
              </div>
            ))}
            {(castDiagnostics?.rawDiscoveryLog ?? []).slice(0, 6).map((entry, index) => (
              <div key={`${String(entry.at ?? index)}-${index}`} className="manager-row">
                <span>{String(entry.at ?? '—')}</span>
                <strong>{String(entry.message ?? 'Cast discovery event')}</strong>
              </div>
            ))}
            {(castDiagnostics?.deviceAges ?? []).length === 0 && (castDiagnostics?.rawDiscoveryLog ?? []).length === 0 ? (
              <div className="manager-row">
                <span>Ingen raw Cast discovery ennå</span>
                <strong>Discovery kjøres manuelt eller fra Media</strong>
              </div>
            ) : null}
          </div>
        </details>
      </article>

      <article className="manager-card manager-card--wide">
        <div className="manager-block__header">
          <div>
            <p className="room-card__label">Assistant Manager</p>
            <p className="manager-helper">
              Server-eid provideroversikt for assistenter og integrasjoner. Secrets vises ikke i frontend.
            </p>
          </div>
          <span className="manager-readiness__indicator is-partial">
            {integrationManager
              ? `${integrationManager.counts.liveConnected ?? integrationManager.counts.connected}/${integrationManager.counts.providers} live · ${integrationManager.counts.statusOnly ?? 0} status`
              : 'Venter'}
          </span>
        </div>
        <div className="manager-list">
          <div className="manager-row">
            <span>Provider maturity</span>
            <strong className="manager-status-signal">
              <span>Live {integrationManager?.counts.liveRuntime ?? 0}</span>
              <span>Status only {integrationManager?.counts.statusOnly ?? 0}</span>
              <span>Foundation {integrationManager?.counts.foundation ?? 0}</span>
              <span>Prepared {integrationManager?.counts.prepared ?? 0}</span>
              <span>Future {integrationManager?.counts.future ?? 0}</span>
              <span>Commands {integrationManager?.counts.commandCapable ?? 0}</span>
            </strong>
          </div>
        </div>
        <div className="runtime-contract-grid">
          {(isDeveloperMode ? integrationProviders : assistantIntegrationProviders).slice(0, 8).map((provider) => (
            <article
              key={provider.id}
              className={`runtime-contract-card runtime-contract-card--${
                provider.maturity === 'liveRuntime' && provider.runtimeConnected
                  ? 'connected'
                  : provider.connectionState === 'degraded'
                    ? 'degraded'
                    : provider.connectionState === 'disabled'
                      ? 'offline'
                      : 'foundation'
              }`}
            >
              <div>
                <span>{provider.category} · {provider.provider}</span>
                <strong>{provider.name}</strong>
              </div>
              <p>{provider.readiness}</p>
              <div className="runtime-contract-card__meta">
                <span>
                  {provider.maturity === 'liveRuntime'
                    ? 'Live'
                    : provider.maturity === 'statusOnly'
                      ? 'Status only'
                      : provider.maturity === 'future'
                        ? 'Prepared / future'
                        : provider.maturity === 'mock'
                          ? 'Mock/demo'
                          : 'Foundation only'}
                </span>
                <span>{provider.lifecycle?.lifecycleState ?? provider.connectionState}</span>
                <span>{provider.runtimeHealth}</span>
                <span>{provider.controlAvailable ? 'control available' : 'no control'}</span>
                <span>{provider.credentials.configured ? 'auth klar' : provider.authRequired ? 'auth mangler' : 'uten auth'}</span>
              </div>
              {isDeveloperMode ? (
                <small>
                  {[
                    `maturity ${provider.maturity ?? 'foundation'}`,
                    `read ${provider.supportsRead ? 'yes' : 'no'}`,
                    `write ${provider.supportsWrite ? 'yes' : 'no'}`,
                    `discovery ${provider.supportsDiscovery ? 'yes' : 'no'}`,
                    `commands ${provider.sendsCommands ? 'yes' : 'no'}`,
                    `connected ${provider.runtimeConnected ? 'yes' : 'no'}`,
                    provider.foundationOnly ? 'foundation-only' : null,
                    ...provider.supportedFeatures.slice(0, 4),
                    provider.lifecycle
                      ? `lifecycle ${provider.lifecycle.lifecycleState}`
                      : null,
                    provider.lifecycle?.healthReason,
                    provider.orchestration
                      ? `recovery ${provider.orchestration.recoveryState}`
                      : null,
                    provider.orchestration?.stale ? 'stale' : null,
                    provider.orchestration?.reconnectRecommended ? 'reconnect-ready' : null,
                    provider.orchestration?.recoveryEligible ? 'recovery-eligible' : null,
                    provider.orchestration?.recoveryBlocked ? 'recovery-blocked' : null,
                    provider.orchestration
                      ? `attempts ${provider.orchestration.recoveryAttempts ?? provider.orchestration.reconnectAttempts ?? 0}`
                      : null,
                    provider.orchestration
                      ? `cadence ${Math.round(provider.orchestration.pollingCadence / 1000)}s`
                      : null,
                    provider.orchestration?.nextRecoveryAttemptAt
                      ? `next ${provider.orchestration.nextRecoveryAttemptAt}`
                      : null,
                    provider.orchestration?.recoveryCooldownUntil
                      ? `cooldown ${provider.orchestration.recoveryCooldownUntil}`
                      : null,
                    provider.orchestration?.recoveryPolicy
                      ? `policy ${provider.orchestration.recoveryPolicy.strategy}`
                      : null,
                    provider.orchestration?.recoveryReason,
                    provider.orchestration?.degradedReason,
                    provider.persistence
                      ? `persistence ${provider.persistence.persisted ? 'stored' : 'session'}`
                      : null,
                    provider.persistence?.encryptedCredentials ? 'credentials encrypted' : null,
                    provider.persistence?.restored ? `restored ${provider.persistence.restoredAt}` : null,
                    provider.onboarding
                      ? `onboarding ${provider.onboarding.onboardingStatus}`
                      : null,
                    provider.onboarding?.missingRequirements.length
                      ? `missing ${provider.onboarding.missingRequirements.join(', ')}`
                      : null,
                    provider.provider === 'deltacoTuya'
                      ? `candidates ${String(provider.safeConfig.candidateCount ?? 0)}`
                      : null,
                    provider.provider === 'deltacoTuya'
                      ? `reachable ${String(provider.safeConfig.reachableCount ?? 0)}`
                      : null,
                    provider.provider === 'deltacoTuya'
                      ? `active ${String(Array.isArray(provider.safeConfig.activeCandidates) ? provider.safeConfig.activeCandidates.length : 0)}`
                      : null,
                    provider.provider === 'deltacoTuya'
                      ? `excluded ${String(Array.isArray(provider.safeConfig.excludedCandidates) ? provider.safeConfig.excludedCandidates.length : 0)}`
                      : null,
                    provider.provider === 'deltacoTuya'
                      ? `confirmed ${String(Array.isArray(provider.safeConfig.confirmedMappings) ? provider.safeConfig.confirmedMappings.length : 0)}`
                      : null,
                    provider.provider === 'deltacoTuya' && provider.safeConfig.lastDiscoveryAt
                      ? `last scan ${String(provider.safeConfig.lastDiscoveryAt)}`
                      : null,
                    provider.provider === 'deltacoTuya' && Array.isArray(provider.safeConfig.confirmedMappings)
                      ? `confirmed devices ${(provider.safeConfig.confirmedMappings as Array<Record<string, unknown>>)
                        .map((mapping) => `${String(mapping.displayName)} ${String(mapping.ip)}`)
                        .slice(0, 3)
                        .join(', ')}`
                      : null,
                    provider.provider === 'deltacoTuya' && provider.safeConfig.protocolResearch
                      ? `protocol ${String((provider.safeConfig.protocolResearch as Record<string, unknown>).protocolResearchState ?? (provider.safeConfig.protocolResearch as Record<string, unknown>).researchState ?? 'observed')}`
                      : null,
                    provider.provider === 'deltacoTuya' && provider.safeConfig.protocolResearch
                      ? `hints ${String((((provider.safeConfig.protocolResearch as Record<string, unknown>).summary as Record<string, unknown> | undefined)?.protocolHints as unknown[] | undefined)?.join(', ') ?? 'none')}`
                      : null,
                    provider.provider === 'deltacoTuya' && provider.safeConfig.protocolResearch
                      ? `cloud ${String((((provider.safeConfig.protocolResearch as Record<string, unknown>).summary as Record<string, unknown> | undefined)?.cloudDependencyLikelihood) ?? 'unknown')}`
                      : null,
                    provider.provider === 'deltacoTuya' && Array.isArray(provider.safeConfig.excludedCandidates)
                      ? `excluded devices ${(provider.safeConfig.excludedCandidates as Array<Record<string, unknown>>)
                        .map((candidate) => `${String(candidate.ip)} ${String(candidate.deviceFamilyHint ?? candidate.classification)}`)
                        .slice(0, 3)
                        .join(', ')}`
                      : null,
                    ...provider.diagnostics.slice(0, 2),
                  ].filter(Boolean).join(' · ') || '—'}
                </small>
              ) : null}
            </article>
          ))}
        </div>
        <div className="manager-list">
          <div className="manager-row">
            <span>Credential policy</span>
            <strong>
              {integrationManager?.credentialPolicy.note ?? 'Bridge rapporterer kun safe credential-status.'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Persistence</span>
            <strong>
              {integrationManager?.persistencePolicy
                ? `${integrationManager.persistencePolicy.owner} · encrypted ${integrationManager.persistencePolicy.encrypted ? 'ja' : 'nei'} · boot ${integrationManager.persistencePolicy.boot?.ok ? 'OK' : 'watch'}`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Sist lest</span>
            <strong>{diagnostics.integrationManagerCheckedAt ?? '—'}</strong>
          </div>
          <div className="manager-row">
            <span>Feil</span>
            <strong className={diagnostics.integrationManagerError ? 'manager-status-error' : ''}>
              {diagnostics.integrationManagerError ?? '—'}
            </strong>
          </div>
        </div>
      </article>

      {isDeveloperMode ? (
        <article className="manager-card manager-card--wide">
          <div className="manager-block__header">
            <div>
              <p className="room-card__label">NIVA server observations</p>
              <p className="manager-helper">
                Heuristiske, read-only observasjoner fra server-owned snapshots og aggregater.
              </p>
            </div>
            <span className="manager-readiness__indicator is-partial">
              {serverRuntimeInsights?.model.kind ?? 'foundation'}
            </span>
          </div>
          <div className="manager-list">
            {(serverRuntimeInsights?.insights ?? []).length > 0 ? (
              serverRuntimeInsights?.insights.slice(0, 8).map((insight) => (
                <div key={insight.id} className="manager-row">
                  <span>
                    {insight.type} · {insight.observationWindow}
                  </span>
                  <strong className="manager-status-signal">
                    <span>{insight.title}</span>
                    <span>{insight.summary}</span>
                    <span>
                      confidence {insight.confidence} · severity {insight.severity} · source {insight.source}
                    </span>
                    {insight.signals.length > 0 ? (
                      <span>
                        {insight.signals
                          .slice(0, 4)
                          .map((signal) => `${signal.key}: ${String(signal.value ?? '—')}`)
                          .join(' · ')}
                      </span>
                    ) : null}
                  </strong>
                </div>
              ))
            ) : (
              <div className="manager-row">
                <span>Ingen server-observasjoner ennå</span>
                <strong>Venter på mer runtime-historikk</strong>
              </div>
            )}
          </div>
        </article>
      ) : null}

      {isDeveloperMode ? (
        <article className="manager-card manager-card--wide">
          <div className="manager-block__header">
            <div>
              <p className="room-card__label">NIVA learning signals</p>
              <p className="manager-helper">
                Ukjente spørsmål logges som læringssignaler, ikke runtime-feil.
              </p>
            </div>
            <span className="manager-readiness__indicator is-partial">
              {nivaIntentGaps.length} gap
            </span>
          </div>
          <div className="manager-list">
            {latestNivaIntentGap ? (
              <>
                <div className="manager-row">
                  <span>Siste ukjente spørsmål</span>
                  <strong>{latestNivaIntentGap.userText}</strong>
                </div>
                <div className="manager-row">
                  <span>Kategori</span>
                  <strong>{latestNivaIntentGap.suggestedCategory}</strong>
                </div>
                <div className="manager-row">
                  <span>Svar gitt</span>
                  <strong>{latestNivaIntentGap.responseGiven}</strong>
                </div>
                <div className="manager-row">
                  <span>Forslag</span>
                  <strong>{latestNivaIntentGap.note}</strong>
                </div>
              </>
            ) : (
              <div className="manager-row">
                <span>Ingen intent-gaps i denne sessionen</span>
                <strong>Stabilt</strong>
              </div>
            )}
          </div>
        </article>
      ) : null}

      {isDeveloperMode ? (
        <article className="manager-card manager-card--wide">
          <div className="manager-block__header">
            <div>
              <p className="room-card__label">NIVA session context</p>
              <p className="manager-helper">
                Korttidshukommelse for denne sessionen. Brukes til mer presise oppfølgingssvar.
              </p>
            </div>
            <span className="manager-readiness__indicator is-partial">
              {nivaSessionMemory.activeContextFocus}
            </span>
          </div>
          <div className="manager-list">
            <div className="manager-row">
              <span>Aktivt fokus</span>
              <strong>{nivaSessionMemory.activeContextFocus}</strong>
            </div>
            <div className="manager-row">
              <span>Siste intents</span>
              <strong>{recentNivaIntents || '—'}</strong>
            </div>
            <div className="manager-row">
              <span>Siste spørsmål</span>
              <strong>{nivaRecentQuestions[0] ?? '—'}</strong>
            </div>
            <div className="manager-row">
              <span>Rom/media/system</span>
              <strong>
                {[
                  nivaSessionMemory.lastRoomFocus,
                  nivaSessionMemory.lastMediaFocus,
                  nivaSessionMemory.lastSystemFocus,
                ]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Siste forslag</span>
              <strong>{nivaSessionMemory.lastProposedAction ?? '—'}</strong>
            </div>
            <div className="manager-row">
              <span>Uløste learning signals</span>
              <strong>
                {recentUnresolvedIntentGaps.length > 0
                  ? recentUnresolvedIntentGaps.map((gap) => gap.suggestedCategory).join(' · ')
                  : '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Intent confidence</span>
              <strong>
                understood {nivaInteractionDiagnostics.confidenceDistribution.understood} · partial{' '}
                {nivaInteractionDiagnostics.confidenceDistribution.partial} · uncertain{' '}
                {nivaInteractionDiagnostics.confidenceDistribution.uncertain}
              </strong>
            </div>
            <div className="manager-row">
              <span>Clarifications/actions</span>
              <strong>
                clarifications {nivaInteractionDiagnostics.clarificationCount} · successful{' '}
                {nivaInteractionDiagnostics.successfulConversationalActions} · aliases{' '}
                {nivaInteractionDiagnostics.roomAliasMatches} · fallback {nivaInteractionDiagnostics.fallbackUsageCount}
              </strong>
            </div>
            <div className="manager-row">
              <span>Latest parse</span>
              <strong>
                {nivaInteractionDiagnostics.latestParse
                  ? `${nivaInteractionDiagnostics.latestParse.confidence} · ${nivaInteractionDiagnostics.latestParse.intent ?? 'unknown'} · ${
                      nivaInteractionDiagnostics.latestParse.roomName ?? 'no room'
                    } · ${nivaInteractionDiagnostics.latestParse.proposedAction ?? nivaInteractionDiagnostics.latestParse.clarification ?? 'answer'}`
                  : '—'}
              </strong>
            </div>
            {nivaInteractionDiagnostics.rawParses.length > 0 ? (
              <details className="manager-advanced-diagnostics">
                <summary>Developer · raw NIVA intent parse</summary>
                <div className="manager-list">
                  {nivaInteractionDiagnostics.rawParses.slice(0, 6).map((parse) => (
                    <div key={`${parse.at}-${parse.text}`} className="manager-row">
                      <span>{parse.at}</span>
                      <strong>
                        {parse.confidence} · {parse.intent ?? 'unknown'} · {parse.roomName ?? 'no room'} ·{' '}
                        {parse.proposedAction ?? parse.clarification ?? 'answer'} · {parse.text}
                      </strong>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        </article>
      ) : null}

      {isDeveloperMode ? (
        <article className="manager-card manager-card--wide">
          <div className="manager-block__header">
            <div>
              <p className="room-card__label">NIVA home atmosphere</p>
              <p className="manager-helper">
                Viser hvilke heuristikker som former NIVA sin hjemfølelse i denne sessionen.
              </p>
            </div>
            <span className="manager-readiness__indicator is-partial">
              {nivaPresenceComfort.label}
            </span>
          </div>
          <div className="manager-list">
            <div className="manager-row">
              <span>Oppsummering</span>
              <strong>{nivaPresenceComfort.summary}</strong>
            </div>
            <div className="manager-row">
              <span>Heuristikker</span>
              <strong>{nivaPresenceComfort.heuristics.join(' · ') || '—'}</strong>
            </div>
            <div className="manager-row">
              <span>Signalgrunnlag</span>
              <strong>
                {[
                  `presence ${nivaPresenceComfort.signals.presenceState}`,
                  `comfort ${nivaPresenceComfort.signals.comfortState}`,
                  `${nivaPresenceComfort.signals.activeRoomCount} aktive rom`,
                  nivaPresenceComfort.signals.mediaActive ? 'media aktiv' : 'media stille',
                  nivaPresenceComfort.signals.runtimeStable ? 'runtime stabil' : 'runtime watch',
                ].join(' · ')}
              </strong>
            </div>
            <div className="manager-row">
              <span>Oppfølging</span>
              <strong>{nivaPresenceComfort.followUpLine ?? '—'}</strong>
            </div>
            <div className="manager-row">
              <span>Språk/source</span>
              <strong>{nivaLanguageDiagnostics.sourceSummary}</strong>
            </div>
            <div className="manager-row">
              <span>Wording counts</span>
              <strong>
                live {nivaLanguageDiagnostics.liveWordingCount} · restored{' '}
                {nivaLanguageDiagnostics.restoredWordingCount} · sparse{' '}
                {nivaLanguageDiagnostics.sparseWordingCount}
              </strong>
            </div>
            <div className="manager-row">
              <span>Dedupe/stale wording</span>
              <strong>
                dedupe {nivaLanguageDiagnostics.dedupeCount} · stale{' '}
                {nivaLanguageDiagnostics.staleBasedWordingCount}
              </strong>
            </div>
            <div className="manager-row">
              <span>Siste språkpolish</span>
              <strong>{nivaLanguageDiagnostics.lastPolishedAt ?? '—'}</strong>
            </div>
            <div className="manager-row">
              <span>NIVA observation rules</span>
              <strong>
                {nivaObservationDiagnostics.enabled ? 'enabled' : 'standby'} ·{' '}
                {nivaObservationDiagnostics.ruleCount} regler
              </strong>
            </div>
            <div className="manager-row">
              <span>Observation actions</span>
              <strong>
                {nivaObservationDiagnostics.actionButtonsEnabled ? 'buttons enabled' : 'standby'} · active{' '}
                {nivaObservationDiagnostics.activeObservationCount ?? nivaObservationDiagnostics.observationCount} · snoozed{' '}
                {nivaObservationDiagnostics.snoozedObservationCount ?? 0}
              </strong>
            </div>
            <div className="manager-row">
              <span>Last NIVA action</span>
              <strong>
                {nivaObservationDiagnostics.lastActionInvoked
                  ? `${nivaObservationDiagnostics.lastActionInvoked.label} · ${nivaObservationDiagnostics.lastActionInvoked.invokedAt}`
                  : '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Primary observation score</span>
              <strong>
                {nivaObservationDiagnostics.primaryObservationScore ?? '—'} · suppressed{' '}
                {nivaObservationDiagnostics.suppressedObservationCount ?? 0} · grouped{' '}
                {nivaObservationDiagnostics.groupedObservationCount ?? 0}
              </strong>
            </div>
            <div className="manager-row">
              <span>Observation cooldowns</span>
              <strong>{nivaObservationDiagnostics.cooldownObservationCount ?? 0} active policies</strong>
            </div>
            <div className="manager-row">
              <span>Conversation follow-through</span>
              <strong>
                hits {nivaObservationDiagnostics.conversationalFollowThrough?.hits ?? 0} · misses{' '}
                {nivaObservationDiagnostics.conversationalFollowThrough?.misses ?? 0}
              </strong>
            </div>
            <div className="manager-row">
              <span>Pending conversational action</span>
              <strong>
                {nivaObservationDiagnostics.conversationalFollowThrough?.pendingActionSummary ?? '—'}
              </strong>
            </div>
            {(nivaObservationDiagnostics.groupedObservations ?? []).length > 0 ? (
              <div className="manager-row manager-row--stacked">
                <span>Grouped observations</span>
                <strong className="manager-status-signal">
                  {(nivaObservationDiagnostics.groupedObservations ?? []).slice(0, 4).map((group) => (
                    <span key={group.groupKey}>{group.summary}</span>
                  ))}
                </strong>
              </div>
            ) : null}
            <div className="manager-row">
              <span>Temperaturfall / setpunkt</span>
              <strong>
                drop {nivaObservationDiagnostics.temperatureDropCandidates} · unmet{' '}
                {nivaObservationDiagnostics.unmetSetpointCandidates}
              </strong>
            </div>
            <div className="manager-row">
              <span>Stale / forklaringer</span>
              <strong>
                stale {nivaObservationDiagnostics.staleConfidenceWarnings} · intents{' '}
                {nivaObservationDiagnostics.explanationIntentCount}
              </strong>
            </div>
            <div className="manager-row">
              <span>Observation severity</span>
              <strong>
                info {nivaObservationDiagnostics.severityCounts.info} · notice{' '}
                {nivaObservationDiagnostics.severityCounts.notice} · warning{' '}
                {nivaObservationDiagnostics.severityCounts.warning}
              </strong>
            </div>
            <div className="manager-row">
              <span>Signal update policy</span>
              <strong>
                cyclic {nivaObservationDiagnostics.signalUpdatePolicySummary.byMode.cyclic} · onChange{' '}
                {nivaObservationDiagnostics.signalUpdatePolicySummary.byMode.onChange} · manual{' '}
                {nivaObservationDiagnostics.signalUpdatePolicySummary.byMode.manualPoll}
              </strong>
            </div>
            <div className="manager-row">
              <span>Stale policy</span>
              <strong>
                relevant {nivaObservationDiagnostics.signalUpdatePolicySummary.nivaStaleRelevant} · suppressed onChange{' '}
                {nivaObservationDiagnostics.signalUpdatePolicySummary.staleSuppressedBecauseOnChange}
              </strong>
            </div>
            {nivaObservationDiagnostics.latestObservations.length > 0 ? (
              <div className="manager-row manager-row--stacked">
                <span>Siste NIVA observations</span>
                <strong className="manager-status-signal">
                  {nivaObservationDiagnostics.latestObservations.slice(0, 4).map((observation) => (
                    <span key={observation.observationId}>
                      {observation.relatedRoomName ? `${observation.relatedRoomName}: ` : ''}
                      {observation.explanation} ({observation.severity}/{observation.confidence})
                    </span>
                  ))}
                </strong>
              </div>
            ) : null}
          </div>
        </article>
      ) : null}

      <article className="manager-card manager-card--wide">
        <div className="manager-card__header">
          <div>
            <p className="room-card__label">Calendar action trust</p>
            <h3>NIVA kalenderflyt</h3>
          </div>
          <span className="manager-readiness__indicator is-partial">
            {calendarActionTrust.pending > 0 || calendarActionTrust.creating > 0
              ? 'pending'
              : calendarActionTrust.failed > 0
                ? 'watch'
                : 'standby'}
          </span>
        </div>
        <div className="manager-list">
          <div className="manager-row">
            <span>Lifecycle</span>
            <strong>
              pending {calendarActionTrust.pending} · queued {calendarActionTrust.queued} · creating{' '}
              {calendarActionTrust.creating} · created {calendarActionTrust.created}
            </strong>
          </div>
          <div className="manager-row">
            <span>Failure/idempotency</span>
            <strong>
              failed {calendarActionTrust.failed} · stale {calendarActionTrust.stale} · cancelled{' '}
              {calendarActionTrust.cancelled} · duplicate stopped {calendarActionTrust.duplicatePreventedCount}
            </strong>
          </div>
          <div className="manager-row">
            <span>Siste handling</span>
            <strong>
              {calendarActionTrust.latestAction
                ? `${calendarActionTrust.latestAction.state} · ${calendarActionTrust.latestAction.summary}`
                : '—'}
            </strong>
          </div>
          {calendarActionTrust.latestAction ? (
            <div className="manager-row">
              <span>Bekreftet/opprettet</span>
              <strong>
                {calendarActionTrust.latestAction.confirmedAt ?? 'ikke bekreftet'} ·{' '}
                {calendarActionTrust.latestAction.completedAt ?? calendarActionTrust.latestAction.failedAt ?? 'venter'}
              </strong>
            </div>
          ) : null}
          {calendarActionTrust.recentActions.length > 0 ? (
            <div className="manager-row manager-row--stacked">
              <span>Recent calendar actions</span>
              <strong className="manager-status-signal">
                {calendarActionTrust.recentActions.slice(0, 5).map((action) => (
                  <span key={action.actionId}>
                    {action.state} · {action.summary}
                    {action.error ? ` · ${action.error}` : ''}
                  </span>
                ))}
              </strong>
            </div>
          ) : null}
        </div>
      </article>

      {energyIntelligence ? (
        <article className="manager-card manager-card--wide">
          <div className="manager-card__header">
            <div>
              <p className="room-card__label">Energy intelligence</p>
              <h3>Strøm og varmeestimat</h3>
            </div>
            <span className="manager-readiness__indicator is-partial">
              foundation
            </span>
          </div>
          <div className="manager-list">
            <div className="manager-row">
              <span>Provider</span>
              <strong>
                {energyIntelligence.provider.providerId} · {energyIntelligence.provider.maturity} ·{' '}
                {energyIntelligence.provider.controlAvailable ? 'control' : 'no control'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Datakilder</span>
              <strong className="manager-status-signal">
                <span>Live meter {energyIntelligence.diagnostics.liveMeterAvailable ? 'ja' : 'nei'}</span>
                <span>Fortum/leverandør {energyIntelligence.provider.requiresCredentials}</span>
                <span>Spotpris {energyIntelligence.diagnostics.spotPriceFoundation ? 'foundation' : 'nei'}</span>
                <span>Benchmark {energyIntelligence.diagnostics.similarHomeBenchmarkAvailable ? 'ja' : 'nei'}</span>
              </strong>
            </div>
            <div className="manager-row">
              <span>Provider candidates</span>
              <strong>{energyIntelligence.provider.providerCandidates.join(' · ')}</strong>
            </div>
            <div className="manager-row">
              <span>Forbruk/effekt</span>
              <strong>
                {energyIntelligence.data.currentPowerW === null
                  ? 'Live effekt utilgjengelig'
                  : `${energyIntelligence.data.currentPowerW} W`}
                {' · '}
                {energyIntelligence.data.dailyConsumptionKwh === null
                  ? 'døgnforbruk utilgjengelig'
                  : `${energyIntelligence.data.dailyConsumptionKwh} kWh`}
              </strong>
            </div>
            <div className="manager-row">
              <span>Varmeestimat</span>
              <strong>
                {energyIntelligence.data.heatingEstimatedKwh === null
                  ? 'venter på nok grunnlag'
                  : `${energyIntelligence.data.heatingEstimatedKwh.toLocaleString('nb-NO')} kWh indikasjon`}
                {' · confidence '}
                {energyIntelligence.diagnostics.heatingEstimateConfidence}
              </strong>
            </div>
            <div className="manager-row">
              <span>NIVA energy observations</span>
              <strong>
                {energyIntelligence.diagnostics.observationCount} observasjoner · high heat{' '}
                {energyIntelligence.diagnostics.highHeatRoomCount} · nattvarme{' '}
                {energyIntelligence.diagnostics.nightHeatingRoomCount}
              </strong>
            </div>
            <div className="manager-row">
              <span>Energy source distribution</span>
              <strong>
                {Object.entries(energyIntelligence.diagnostics.sourceDistribution)
                  .map(([source, count]) => `${source} ${count}`)
                  .join(' · ') || '—'}
              </strong>
            </div>
            <div className="manager-row">
              <span>Auto-poll stille rom</span>
              <strong>
                {energyIntelligence.autoPollQuietRooms.autoPollQuietRoomsEnabled ? 'på' : 'av'} · quiet{' '}
                {Math.round(energyIntelligence.autoPollQuietRooms.quietThresholdMs / 60000)} min · cooldown{' '}
                {Math.round(energyIntelligence.autoPollQuietRooms.perRoomAutoPollCooldownMs / 60000)} min
              </strong>
            </div>
            <div className="manager-row">
              <span>Energy event</span>
              <strong>
                {energyIntelligence.energyEventParticipation.eventType} · dryRun{' '}
                {energyIntelligence.energyEventParticipation.dryRun ? 'ja' : 'nei'} · approval{' '}
                {energyIntelligence.energyEventParticipation.requiresApproval ? 'påkrevd' : 'nei'}
              </strong>
            </div>
            <div className="manager-row">
              <span>KNX block-signal</span>
              <strong>
                possible {energyIntelligence.energyEventParticipation.possibleKnxBlockSignal ? 'ja' : 'nei'} · GA design{' '}
                {energyIntelligence.energyEventParticipation.requiresGroupAddressDesign ? 'påkrevd' : 'ikke påkrevd'}
              </strong>
            </div>
            {energyIntelligence.observations.length > 0 ? (
              <div className="manager-row manager-row--stacked">
                <span>Siste energy observations</span>
                <strong className="manager-status-signal">
                  {energyIntelligence.observations.slice(0, 4).map((observation) => (
                    <span key={observation.observationId}>
                      {observation.relatedRoomName ? `${observation.relatedRoomName}: ` : ''}
                      {observation.explanation} ({observation.severity}/{observation.confidence})
                    </span>
                  ))}
                </strong>
              </div>
            ) : null}
            <div className="manager-row">
              <span>Foundation safety</span>
              <strong>
                no credentials · no scraping · no autonomous control · no KNX block write
              </strong>
            </div>
          </div>
        </article>
      ) : null}

      <article className="manager-card manager-card--wide">
        <p className="room-card__label">KNX signaler</p>
        <div className="manager-list">
          <div className="manager-row">
            <span>Siste KNX inn</span>
            <strong className="manager-status-signal">
              {formatDiagnosticSignal(diagnostics.lastKnxIn).map((line) => (
                <span key={line}>{line}</span>
              ))}
              {diagnostics.lastKnxInMqttTopic ? (
                <span>MQTT: {diagnostics.lastKnxInMqttTopic}</span>
              ) : null}
            </strong>
          </div>
          <div className="manager-row">
            <span>Siste KNX ut</span>
            <strong className="manager-status-signal">
              {formatDiagnosticSignal(diagnostics.lastKnxOut).map((line) => (
                <span key={line}>{line}</span>
              ))}
              {diagnostics.lastKnxOutMqttTopic ? (
                <span>MQTT: {diagnostics.lastKnxOutMqttTopic}</span>
              ) : null}
            </strong>
          </div>
          <div className="manager-row">
            <span>Siste feil</span>
            <strong className={diagnostics.lastRuntimeError ? 'manager-status-error' : ''}>
              {diagnostics.lastRuntimeError
                ? `${diagnostics.lastRuntimeError.at} · ${diagnostics.lastRuntimeError.detail}`
                : '—'}
            </strong>
          </div>
          <div className="manager-row">
            <span>Siste timeout</span>
            <strong className={diagnostics.lastRuntimeTimeout ? 'manager-status-error' : ''}>
              {diagnostics.lastRuntimeTimeout
                ? `${diagnostics.lastRuntimeTimeout.at} · ${diagnostics.lastRuntimeTimeout.detail}`
                : '—'}
            </strong>
          </div>
        </div>
      </article>
    </>
  )
}
