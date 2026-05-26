# Lynell checkpoint v8.27 — Server-owned scene scheduler og heat power

v8.27 er post-soak stabilization.

Målet var scene scheduler trust, heat power model, light-mode polish og roligere runtime wording.

Dette er stabilisering, ikke ny feature-sprint.

## Endrede filer

- `bridge/server.mjs`
- `src/App.tsx`
- `src/styles.css`
- `src/api/homeApi.ts`
- `src/config/systemConfig.ts`
- `src/components/RoomManagerPanel.tsx`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/runtime/energyIntelligence.ts`
- `src/niva/nivaDiagnostics.ts`

## Server-owned scene scheduler

- Scene scheduling er nå server/runtime-owned.
- Persisteres under:
  - `bridge/.lynell-state/scene-scheduler`
- Eksponeres gjennom:
  - `/api/runtime/health`
- Kjører uavhengig av at frontend er åpen.
- Frontend timed-scene execution er deaktivert som owner path.
- Frontend observerer/logger at scenes er server-owned.
- Dette hindrer PC/mobil duplicate scheduling.

## Scene execution trust

- Scene executions går gjennom eksisterende runtime action pipeline.
- Bruker eksisterende KNX handlers.
- Ingen DPT/write payload behavior ble endret.
- Diagnostics viser:
  - scheduler active/source
  - scheduled scenes
  - next execution
  - last execution
  - missed count
  - last error

## Heat power model

Room Manager/SystemConfig har nye felt:

- `heatPowerWatts`
- `nominalPowerWatts`
- `floorHeatingType`

Energy estimates bruker nå prioritet:

1. configured `heatPowerWatts`
2. `nominalPowerWatts`
3. area/emitter estimate

NIVA/energy wording holder seg som:

- estimat
- indikasjon
- beregnet

## Runtime wording cleanup

- Hard tone som “Jeg får ikke kontakt med Lynell-serveren” er dempet.
- Reconnect/offline/degraded states forklares roligere.
- Eksempler:
  - Oppdaterer tilkobling
  - Viser sist kjente data
  - Noen sanntidssignaler er forsinket

## Light mode polish

- Siste kontrastpass for:
  - metadata
  - helper text
  - inactive tabs
  - secondary buttons
  - disabled states

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK

## Ikke endret

- ingen KNX DPT/write payload-endring
- ingen autonomous scene optimization
- ingen ML
- ingen nye provider integrations
- ingen frontend-owned scheduler
- ingen PC/mobil duplicate scheduling

## Gjenstår live

- bekreft at schedule scene overlever frontend refresh/sleep
- bekreft at scene kjører fra bridge/runtime kl. angitt tid
- bekreft Manager Diagnose viser next/last scene
- bekreft `heatPowerWatts` lagres server-side
- bekreft PC/mobil ser samme heat power

Ingen kodeendringer.
Ingen build nødvendig.
