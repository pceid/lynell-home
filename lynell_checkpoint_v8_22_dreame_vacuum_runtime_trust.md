# Lynell checkpoint v8.22 - Dreame vacuum runtime trust

v8.22 er Product stabilization sprint 2.

Målet er Dreame/vacuum runtime trust, stale/offline-handtering og troverdig feedback.

Dette er reliability/product trust, ikke nye vacuum-features.

## Endrede filer

- `bridge/vacuum-runtime.mjs`
- `bridge/integration-manager.mjs`
- `src/App.tsx`
- `src/api/homeApi.ts`
- `src/integrations/vacuum/vacuumTypes.ts`
- `src/integrations/truth/integrationTruth.ts`
- `src/integrations/runtime/runtimeContractBuilders.ts`
- `src/components/ManagerPanel.tsx`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`

## Root cause

- Vacuum runtime var oyeblikksbasert.
- Nar Dreame/HA-status feilet eller ble gammel, frontend oppdaterte bare ved `connected=true`.
- Gammel robotstate kunne derfor enten bli hengende som trygg eller forsvinne fra UI.
- Det manglet stale/offline/freshness/stateConfidence-modell.

## Hva som ble lagt inn

- `firstSeen`
- `lastSeenAt`
- `statusAgeMs`
- `sourceAgeMs`
- `staleAfterMs`
- `offlineAfterMs`
- `reconnectCount`
- `loginFailures`
- `lastSuccessfulSync`
- `runtimeConnected`
- `cloudAuthenticated`
- `deviceReachable`
- `stateConfidence`
- `freshness`
- `cachedData`
- `estimatedState`

## Device/runtime state

- `online`
- `stale`
- `offline`
- `unknown`

## UX/trust

- Sist kjente robot beholdes.
- UI viser ikke `Rengjor` nar status er stale/offline/lav tillit.
- Stale/offline/cloud/runtime forklares rolig.
- Integration Manager teller ikke Dreame som live/trustworthy uten fersk status.

## Manager Diagnose

Ny seksjon:

- `Dreame / vacuum trust`

Viser:

- reconnect count
- login failures
- lastSuccessfulSync
- freshness
- state confidence
- cached/estimated state

## NIVA

NIVA kan forklare:

- stale/offline
- cloud authenticated vs runtime connected
- hvorfor status kan vaere gammel
- hvorfor robot ikke bor tolkes som trygg/live uten fersk status

## Verifisert

- `node --check bridge/vacuum-runtime.mjs` OK
- `node --check bridge/dreame-cloud-runtime.mjs` OK
- `node --check bridge/integration-manager.mjs` OK
- `node --check bridge/server.mjs` OK
- `npm run build` OK

## Ikke endret

- ingen nye cleaning actions
- ingen automasjoner
- ingen ML
- ingen map/editor/routines
- ingen cloud rewrite
- ingen fysisk command-path endret

## Gjenstar live for family-ready

- teste ekte Dreame over tid med cloud reconnect
- sleep/wake og nettverksbrudd
- stale -> online overgang i UI
- mobil/desktop sync samtidig
- tune stale/offline terskler etter faktisk polling/cloud-latens

Ingen kodeendringer.
Ingen build nodvendig.
