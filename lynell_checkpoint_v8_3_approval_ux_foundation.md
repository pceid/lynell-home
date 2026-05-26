# Lynell checkpoint v8.3 - Approval UX foundation

## Status

v8.3 etablerer første Approval UX foundation.

Dette er fortsatt ikke automasjoner, ikke AI/autonomous execution og ikke ekte remote control. Målet er synlig approval queue, approve/deny lifecycle, audit og trust-aware governance UX.

## Endrede filer

- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/runtime/runtimeEventReducer.ts`
- `src/components/ManagerPanel.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/styles.css`

## Approval queue

Approval queue støtter:

- `pending`
- `approved`
- `denied`
- `completed`

## Nye endpoints

- `POST /api/runtime/actions/:actionId/approve`
- `POST /api/runtime/actions/:actionId/deny`

## Behavior

- Provider lifecycle-actions går først til `pendingApproval`.
- `approve` flytter action videre gjennom lifecycle.
- `approve` kjører kontrollert provider lifecycle-intent.
- `deny` stopper execution og markerer action som `denied`.
- Duplicate/replay beskyttes via pending-state/idempotency.

## SSE events

Nye runtime events:

- `actionApprovalRequested`
- `actionApproved`
- `actionDenied`
- `actionExecutionStarted`
- `actionExecutionCompleted`

## Audit

- Approve/deny-resultat logges.
- Audit inkluderer client/session/trust-kontekst.

## Manager Diagnose

Manager Diagnose viser:

- pending approvals
- risk level
- source client
- trust level
- action summary
- approve/deny-knapper
- NIVA proposal-kilde som "NIVA foreslår handling"

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- Smoke test:
  - provider lifecycle action havnet i `pendingApproval`
  - deny ga `denied`
  - approve ga `completed`
  - SSE annonserte approval-events
  - audit ble skrevet
  - duplicate/replay beskyttet via pending-state/idempotency
- Smoke-testens secrets-regex traff `updateToken`-feltet, ikke passord/credential/token-secret.
- Testdata for dummy actions/audit ble ryddet etterpå.

## Ikke rørt

- KNX payload/DPT/write-adferd
- Dreame/Cast/Deltaco runtime
- automasjoner
- ML/autonomous execution
- ekte remote control

## Gjenstår før full governance/security UX

- Bedre approval panel utenfor Diagnose.
- Policy editor.
- User roles.
- Persistent client registry.
- Trust management.
- NIVA proposal UX.
- Full audit viewer.

## Merk

Ingen kodeendringer i dette checkpoint-steget.
Ingen build nødvendig.
