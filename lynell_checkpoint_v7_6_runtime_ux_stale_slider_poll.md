# Lynell Checkpoint v7.6 - Runtime UX, Stale Detection, Slider + Poll

## Status

v7.6 retter runtime UX etter døgnrapport.

- `Hent verdi` er flyttet fra romkort/head-card til `Rom → Trendhistorikk`.
- Poll-status og feildetaljer vises ved grafene.
- Poll-feil klassifiseres bedre.
- Update-highlight/grønt blink er forbedret.
- Lys-slider bruker commit-on-release/debounce.
- Stale detection er definert.

## Endrede Filer

- `src/components/RoomCard.tsx`
- `src/components/trend/TrendHistoryView.tsx`
- `src/components/trend/TrendHistoryChart.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/styles.css`
- `bridge/server.mjs`

## Poll UX

- `Hent verdi` ligger nå under `Rom → Trendhistorikk`.
- Poll-status, siste poll og feildetaljer vises ved grafene.

## Poll Failure Classification

Poll-feil klassifiseres som:

- `noResponse`
- `timeout`
- `invalidDpt`
- `notConfigured`
- `skippedEmptyAddress`

UI viser bare reelle feil.

`skipped`/`notConfigured` vises separat i diagnostics.

## Update-Highlight

Update-highlight bruker:

- `data-update-highlight`
- `data-update-token`

Blink trigges på timestamp/value-token.

Gjelder:

- temperatur
- settpunkt
- HeatDemand
- lysstatus
- lysprosent

## Slider

Lys-slider bruker:

- commit-on-release
- lokal UI følger fingeren
- KNX-write sendes på release/blur/key commit
- 300 ms fallback når det ikke er aktiv drag

Mål:

- redusere write-storm
- redusere jitter
- beholde optimistisk UI

## Stale Detection

States:

- `fresh`
- `aging`
- `stale`
- `unknown`

Policies:

- temperature: stale etter 120 min
- setpoint: stale etter 24 t
- HeatDemand: stale etter 60 min
- light feedback: stale etter 24 t
- custom signal: default policy

## Manager Diagnose

Manager Diagnose viser:

- stale policy
- freshness counts
- poll classification
- real failed/skipped counts
- slider debounce mode
- update-highlight status

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- `/api/knx/diagnostics` smoke test OK:
  - `stalePolicies` finnes
  - `freshnessCounts` finnes

## Ikke Rørt

- KNX write-path utover slider commit/debounce
- DPT `9.001`
- HeatDemand parser
- Dreame runtime
- Cast runtime
- Deltaco runtime
- automasjoner
- ML

## Live-Verifisering Gjenstår

- grønt blink ved ekte KNX-respons
- ETS får kun brightness-write når slider slippes

