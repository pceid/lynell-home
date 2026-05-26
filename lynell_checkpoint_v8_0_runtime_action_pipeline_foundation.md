# Lynell checkpoint v8.0 - Runtime action pipeline foundation

## Status

v8.0 etablerer første runtime action pipeline foundation.

Dette er ikke automasjoner, ikke AI-styring og ikke autonomous behavior. Pipeline modellerer og observerer handlinger rundt eksisterende flow.

KNX payload/DPT/write-adferd er ikke endret.

## Endrede filer

- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/runtime/runtimeEventReducer.ts`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`

## Runtime action model

Runtime action model inneholder:

- `actionId`
- `type`
- `category`
- `source`
- `target`
- payload summary
- approval flags
- lifecycle state
- result summary
- runtime context

## Lifecycle states

Støttede lifecycle states:

- `created`
- `pendingApproval`
- `queued`
- `executing`
- `completed`
- `failed`
- `denied`
- `cancelled`

## Runtime bus action events

Runtime bus støtter action events:

- `actionCreated`
- `actionApproved`
- `actionExecuted`
- `actionFailed`
- `actionCancelled`

## Persistent action history

Persistent action history foundation:

- `bridge/.lynell-state/runtime-actions/`

Dette er en lett lokal foundation for recent actions, execution status og timestamps.

## Manager Diagnose

Manager Diagnose viser:

- actions/min
- pending approvals
- failed actions
- approval-required count
- action latency
- persistence
- latest actions

## Eksisterende handlinger modellert som runtime actions

Disse eksisterende handlingene modelleres nå som runtime actions:

- rom-poll
- lys write
- brightness write
- setpoint/mode write
- provider lifecycle
- runtime config refresh

## Viktig avgrensning

- Ingen endring i faktisk KNX payload/DPT/write-adferd.
- Ingen nye automasjoner.
- Ingen autonomous actions.
- Ingen ML.
- Ingen endring i Dreame/Cast/Deltaco runtime behavior.
- Pipeline observerer og modellerer handlingene rundt eksisterende flow.

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- Smoke-test OK for trygg room-poll action uten mapping/hardware-kommando.
- `/api/runtime/actions` returnerte action metrics.
- SSE stream annonserte `actionMetrics`.
- Ingen secrets funnet i stream-smoke.
- Dummy-action fra smoke-test ble ryddet bort etterpå.

## Gjenstår før ekte approval-gated runtime actions

- Full approval UI.
- Action queue UX.
- Deny/approve flow.
- NIVA action proposals.
- Policy per action type.
- Persistent user/action ownership.
- Audit log.

## Merk

Ingen kodeendringer i dette checkpoint-steget.
Ingen build nødvendig.
