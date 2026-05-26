# Lynell checkpoint v8.35 — KNX monitor runtime observability

## Status

v8.35 legger inn full KNX monitor som runtime observability-verktøy.

Dette er engineering/debug workflow, ikke ETS-erstatning.

Ingen KNX write-path, DPT, payload-adferd, automasjoner eller ML ble endret.

## Endrede filer

- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/styles.css`

## KNX monitor runtime

- Server-owned KNX monitor ring-buffer.
- Default buffer limit: `2500`.
- Configurable limit via runtime/env foundation.
- Ny endpoint:
  - `GET /api/knx/monitor?limit=500`
- Ny SSE-event:
  - `knxMonitorEvent`

## Monitor logger

Monitoren logger:

- runtime KNX cache/feedback
- KNX writes fra eksisterende write-handlere
- writes med source/relation:
  - `sceneScheduler`
  - `manualTool`
  - `api/knx/brightness`
  - andre eksisterende write sources

## UI

Lagt inn KNX monitor-vindu:

- floating
- fullscreen
- minimized
- kan stå åpent kontinuerlig

Filter:

- rom
- retning
- source
- signal type
- writes
- feedback
- stale
- fritekst

Handlinger:

- pause/resume
- clear local view
- copy row
- export JSON

## Visual

Rolig fargekoding for:

- write
- feedback
- poll
- scene
- optimistic
- stale
- error

## NIVA / workbench

- NIVA workbench-panel i monitor.
- Viser siste telegram.
- Viser monitor metrics.
- NIVA kan forklare:
  - siste telegram
  - scene-GA-er
  - optimistic/feedback-relasjon

## Diagnostics

Manager Diagnose viser:

- monitor active
- buffer size
- rate
- dropped count
- latency
- window/filter-status

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK

## Ikke live-verifisert

- Ikke sammenlignet mot ETS i denne runden.

## Gjenstår live

- Åpne Lynell Monitor + ETS Monitor.
- Dim lys.
- Kjør scene.
- Hent verdier.
- Bekreft samme GA/verdi/source i Lynell og ETS.
- Sjekk at filtering og export fungerer.

## Ikke endret

- Ingen KNX write-path-endring.
- Ingen DPT/payload-endring.
- Ingen automasjoner.
- Ingen ML.
- Ingen ETS-erstatning eller packet sniffer.
