# Lynell checkpoint v8.9 - Runtime boot orchestration

## Status

v8.9 etablerer Runtime boot orchestration foundation.

Målet er runtime boot lifecycle, startup sequencing, provider readiness og runtime health bootstrap.

Dette er ikke distributed runtime, supervisor cluster, process manager eller container orchestration.

## Endrede filer

- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/runtime/runtimeEventReducer.ts`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`
- `scripts/start-live-dreame-cast.ps1`
- `scripts/start-frontend.ps1`

## Boot lifecycle

- `initializing`
- `registryLoading`
- `runtimeServicesBoot`
- `restoring`
- `providerBoot`
- `realtimeStartup`
- `ready`
- `degraded`
- `failed`

## Provider readiness

Provider readiness inneholder:

- `bootState`
- `ready`
- `degraded`
- `dependencyStatus`
- `startupLatency`
- `recoveryCapable`

## Nytt endpoint

- `GET /api/runtime/health`

## Runtime/SSE events

- `runtimeBootPhaseChanged`
- `providerBootCompleted`
- `providerBootDegraded`
- `runtimeReady`
- `runtimeDegraded`

## Manager Diagnose

Manager Diagnose viser:

- boot phase
- provider readiness
- uptime
- startup latency
- degraded/ready-status

## Startup scripts

- viser runtime health URL
- tydeligere boot flow
- PowerShell syntax check OK

## Restore-aware startup

- bruker eksisterende snapshot/continuity/insight state
- pending approvals auto-executer ikke

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- PowerShell syntax check for begge startup-scripts OK
- `/api/runtime/health` smoke OK:
  - `phase=ready`
  - `ready=true`
  - `providersReady=11/11`
  - `eventStream=sse`
  - `distributed=false`
  - `automations=false`

## Ikke rørt

- KNX payload/DPT/write behavior
- Dreame/Cast/Deltaco runtime mutation
- automasjoner
- ML/autonomous execution
- remote control
- distributed runtime/failover/cloud sync

## Gjenstår før større soak-testing/live-runtime validation

- live boot/restart test
- PC + mobil samtidig
- SSE continuity
- provider readiness over tid
- memory/uptime observability
- oppdatere evt. videre unified runtime startup scripts

Ingen kodeendringer.
Ingen build nødvendig.
