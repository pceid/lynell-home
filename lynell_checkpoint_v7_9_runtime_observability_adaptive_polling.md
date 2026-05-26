# Lynell checkpoint v7.9 - Runtime observability + adaptive polling

## Status

v7.9 etablerer runtime observability og adaptive polling foundation.

Dette bygger videre på SSE/event-driven runtime fra v7.7 og v7.8. Målet er å måle runtime behavior før videre reduksjon av polling.

Ingen KNX write-path, DPT 9.001, Dreame/Cast/Deltaco-runtime, automasjoner eller ML er endret.

## Endrede filer

- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/runtime/runtimeEventReducer.ts`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/components/trend/TrendHistoryView.tsx`

## Runtime metrics

v7.9 legger inn målinger for:

- event throughput
- polling pressure
- fallback refresh count
- reducer apply count
- replay/resync counts
- stale transitions
- event latency
- reducer timing
- runtime refresh timing

## Server polling-paths

Server måler polling-paths for:

- `/api/runtime/state`
- `/api/runtime/history`
- `/api/runtime/summary`
- `/api/runtime/aggregates`
- `/api/runtime/insights`
- `/api/knx/state`
- `/api/knx/diagnostics`

Dette gir grunnlag for å se hvilke paths som fortsatt er tunge, hvilke som er fallback, og hvilke som senere kan erstattes tryggere av events.

## Frontend timing

Frontend måler:

- event latency
- reducer-tid
- runtime refresh-tid

Dette gir synlighet i propagation-kjeden fra server-event til frontend state.

## Adaptiv polling foundation

Polling beholdes som fallback.

Foreløpig konservativ modell:

- healthy event stream -> fallback polling ca. 180s
- normal/steady -> ca. 120s
- degraded stream -> midlertidig ca. 45s

Dette er kun foundation. Polling fjernes ikke aggressivt.

## Manager Diagnose

Manager Diagnose viser:

- runtime observability
- polling pressure
- reducer timing
- replay/resync
- siste event lineage
- adaptive polling state

## Trendhistorikk

Trendhistorikk viser kildefordeling for:

- live datapunkter
- restored datapunkter
- fallback datapunkter

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- SSE smoke test OK:
  - `connected` event
  - replay support
  - polling metrics i stream-stats

## Ikke rørt

- KNX write-path
- DPT 9.001
- Dreame/Cast/Deltaco runtime
- automasjoner
- ML

## Gjenstår før full Runtime Bus

- Ekte PC/mobil live-test.
- Mer presis per-klient dropped-event tracking.
- Gradvis fjerning av flere pollingintervaller når SSE-observability viser stabil drift.

## Merk

Ingen kodeendringer i dette checkpoint-steget.
Ingen build nødvendig.
