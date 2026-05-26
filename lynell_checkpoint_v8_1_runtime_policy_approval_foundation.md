# Lynell checkpoint v8.1 - Runtime policy + approval foundation

## Status

v8.1 etablerer første runtime policy + approval foundation.

Dette er fortsatt ikke automasjoner, ikke AI-handlinger og ikke autonomous execution. Målet er action governance, auditability og trygg fremtidig approval-gated runtime.

## Endrede filer

- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/runtime/runtimeEventReducer.ts`
- `src/App.tsx`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`

## Runtime policy model

Runtime policy model inneholder:

- `policyId`
- `category`
- `actionType`
- `enabled`
- `requiresApproval`
- `autoApproveLocal`
- `allowRemote`
- `allowNivaProposal`
- `allowSchedule`
- `allowAutomationFuture`
- `riskLevel`
- `createdAt`
- `updatedAt`

## Default policies

Konservative default policies:

- `roomPoll`
  - auto-approved lokalt
- `knxWrite`
  - auto-approved for lokale brukerhandlinger
  - remote disabled
- `providerLifecycle`
  - krever approval
- `insightSuggestion`
  - krever approval
- future automation
  - disabled

## Action ownership

Actions får ownership metadata:

- `initiatedBy`
- `initiatedFrom`
- `clientId`
- `sessionId`
- `trustedClient`

## Approval pipeline

- Policy-krevende actions går til `pendingApproval`.
- Executor kjøres ikke.
- SSE sender `actionPendingApproval`.

## Audit foundation

Audit foundation:

- `bridge/.lynell-state/runtime-audit/`

Audit events finnes for:

- created
- queued
- executing
- executed
- failed
- pending state

## Manager Diagnose

Manager Diagnose viser:

- policy summary
- approval policies
- trusted/untrusted counts
- risky attempts
- audit events

## Runtime bus

SSE annonserer approval/action metrics.

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- Room poll auto-kjørte lokalt som før.
- Provider lifecycle gikk til `pendingApproval` uten runtime mutation.
- `/api/runtime/actions` viste policies/audit/metrics.
- SSE stream annonserte approval/action metrics.
- Ingen secrets funnet i stream-smoke.
- Smoke-testens dummy action/audit entries ble ryddet bort etter verifisering.

## Ikke rørt

- KNX payload/DPT behavior
- Dreame/Cast/Deltaco runtime behavior
- automasjoner
- ML
- autonomous execution
- remote control

## Gjenstår før full governance/runtime security layer

- Approve/deny UI.
- Policy editor.
- User roles.
- Remote/local trust hardening.
- Persistent user/action ownership.
- Full audit viewer.
- NIVA action proposal UX.

## Merk

Ingen kodeendringer i dette checkpoint-steget.
Ingen build nødvendig.
