# Lynell checkpoint v8.5 - Runtime snapshot + recovery continuity

## Status

v8.5 etablerer runtime snapshot + recovery continuity foundation.

Målet er resilient runtime continuity ved restart/reconnect. Dette er ikke distributed runtime, failover eller cloud sync.

Pending approvals og runtime truth skal kunne overleve restart uten feilaktig execution.

## Endrede filer

- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/runtime/runtimeEventReducer.ts`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`

## Runtime snapshot model

Snapshot-modellen inneholder:

- `snapshotId`
- `createdAt`
- `runtimeVersion`
- `domains`
- `activeClients`
- `activeSessions`
- `pendingActions`
- `approvalQueue`
- `runtimeHealth`
- `eventStreamHealth`
- `staleCounts`
- `providerStates`
- `roomTruthSummary`
- `restored`
- `partialRestore`

## Persistence

Lokal storage:

- `bridge/.lynell-state/runtime-snapshots/`
- `latest.json` brukes som siste continuity snapshot
- `snapshots.jsonl` holder historikk

## Nytt endpoint

- `GET /api/runtime/snapshots`

## Restore/recovery

- Bridge forsøker snapshot restore ved oppstart.
- Restore markeres med:
  - `restored`
  - `partialRestore`
  - `restoredSnapshotId`
  - `snapshotAge`
- Pending approvals overlever restart.
- Pending approvals auto-executer ikke ved restore.
- Runtime action history brukes videre for continuity.

## Nye runtime events

- `runtimeSnapshotCreated`
- `runtimeSnapshotRestored`
- `runtimePartialRestore`
- `runtimeRecoveryDetected`

## Frontend/runtime

- `runtimeEventReducer` kjenner snapshot/recovery-events.
- Reconnect/recovery info merges uten full reset av runtime truth.
- SSE `connected` payload inkluderer continuity-status.

## Manager Diagnose

Manager Diagnose viser:

- siste snapshot
- restore-status
- partial restore
- snapshot count
- cadence
- continuity health
- pending actions i siste snapshot

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- Restart-smoke OK:
  - provider lifecycle action havnet i `pendingApproval`
  - pending action ble restored etter restart
  - action ble ikke auto-executed
  - `restored=true`
  - `partialRestore=false`
- Test-action/audit/snapshot-spor ble ryddet etterpå.

## Ikke rørt

- KNX payload/DPT/write behavior
- Dreame/Cast/Deltaco runtime mutation
- automasjoner
- ML/autonomous execution
- remote control
- distributed runtime/failover/cloud sync

## Gjenstår før ekte resilient runtime layer

- Snapshot compaction/retention.
- Tettere kobling mellom Last-Event-ID og snapshot-resync.
- Mer detaljert recovery lineage per domain/provider.
- Production-grade audit/snapshot viewer.
- Domain-aware recovery diagnostics.

## Merk

Ingen kodeendringer i dette checkpoint-steget.
Ingen build nødvendig.
