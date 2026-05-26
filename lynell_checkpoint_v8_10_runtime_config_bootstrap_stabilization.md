# Lynell checkpoint v8.10 - Runtime config bootstrap stabilization

## Status

v8.10 stabiliserer runtime-config bootstrap etter v8.x foundations.

Målet var å få KNX runtime live igjen, fjerne frontend/bridge config-regresjon og gjøre bridge mer selvstendig.

Dette er stabilisering, ikke ny feature.

## Inkludert

- CORS/preflight fix for `POST /api/runtime/config`
- frontend boot/reconnect runtime-config push
- manuell `Send runtime-config nå`
- `start-frontend.ps1` build-before-serve fix
- server-owned persisted KNX runtime config
- source trust cleanup
- SSE heartbeat cleanup
- storage hygiene
- persisted climate mapping restore fix
- soak metrics/storage diagnostics

## Viktig root cause

- `/api/runtime/config` ble først stoppet av action/policy/CORS/preflight/lifecycle-problemer.
- Frontend kunne kjøre gammel `dist` uten `npm run build`.
- Frontend runtime-config push kunne stoppe før POST.
- Bridge mottok ikke runtime config og sto på safe-default.
- Persisted restore mistet climate mappings fordi lagret server-normalisert format ikke matchet frontend-payload-format.

## Resultat

- `frontend-runtime-config` fungerer
- `persisted-server-config` fungerer
- KNX runtime kan starte uten frontend
- `runtime.active=true`
- `targetBuildCount=61`
- feedback mappings:
  - `light=18`
  - `dim=19`
  - `climate=24`
- write mappings:
  - `light=19`
  - `dim=18`
  - `climate=7`
- `restoredConfigIntegrity=true`
- `missingClimateMappings=false`

## Endrede filer

- `bridge/server.mjs`
- `bridge/runtime-state-store.mjs`
- `src/App.tsx`
- `src/api/homeApi.ts`
- `src/runtime/runtimeHistory.ts`
- `src/components/ManagerPanel.tsx`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`
- `scripts/start-frontend.ps1`
- `.gitignore`
- `docs/runtime-state-storage.md`

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- PowerShell syntax OK for `start-frontend.ps1`
- OPTIONS smoke mot `/api/runtime/config` OK
- `frontend-runtime-config` live OK
- `persisted-server-config` restore OK
- KNX runtime active OK

## Ikke rørt

- KNX DPT payload behavior
- HeatDemand parser
- Dreame/Cast/Deltaco runtime mutation
- automasjoner
- ML
- remote control

## Gjenstår før videre utvikling

- større soak-test
- PC + mobil samtidig
- ETS monitor på writes/polls
- source trust over tid
- SSE/client stability
- storage growth
- `lynell_checkpoint_index.md` oppdatering
- modul-splitt senere

Ingen nye kodeendringer.
Ingen build nødvendig.
