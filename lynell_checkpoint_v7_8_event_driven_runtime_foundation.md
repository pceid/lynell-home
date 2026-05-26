# Lynell checkpoint v7.8 - Event-driven runtime foundation

## Status

v7.8 bygger videre på SSE-foundation fra v7.7.

Målet er en kontrollert overgang mot event-driven runtime architecture. Dette er en foundation, ikke en full rewrite. KNX write-path og andre runtimes er ikke endret.

## Endrede filer

- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/runtime/runtimeEventReducer.ts`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`

## Runtime event-kontrakt

Runtime-events har nå en tydeligere kontrakt:

- `eventId`
- `type`
- `timestamp`
- `source`
- `category`
- `roomId`
- `groupAddress`
- `dpt`
- `value`
- `previousValue`
- `updateToken`
- `confidence`
- `persisted`
- `replayable`

## Server

- Enkel event-buffer for siste events.
- Last-Event-ID foundation er lagt inn.
- Buffered events kan replayes.
- Hvis replay ikke er mulig sendes `resyncRequired`.
- Ikke-replaybare `resyncRequired`-events setter ikke SSE id.

## Frontend

Ny reducer:

- `src/runtime/runtimeEventReducer.ts`
- `applyRuntimeEvent()`

Frontend-endringer:

- Merge-logikk er flyttet delvis ut av `App.tsx`.
- `historyPointAdded` merges event-aware.
- `pollCompleted` oppdaterer poll state.
- Update tokens håndteres event-aware.
- Runtime refresh er mer throttlet.

## Polling

- Fallback polling beholdes.
- Runtime-state fallback er redusert fra 30 sek til 120 sek.
- Diagnostics kan fortsatt polles.

## Manager Diagnose

Manager Diagnose viser nå:

- event buffer size
- replay support
- latest/applied eventId
- resync count
- reducer status
- fallback polling status

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- SSE smoke test OK:
  - `connected` event mottas
  - replay support annonseres
  - ukjent `Last-Event-ID` gir `resyncRequired`
  - ikke-replaybare `resyncRequired`-events setter ikke SSE id

## Ikke rørt

- KNX write-path
- DPT 9.001
- Dreame/Cast/Deltaco runtime behavior
- automasjoner
- ML
- provider orchestration

## Gjenstår

- Live-test PC/mobil samtidig på ekte KNX-telegrammer.
- Mer presis client event tracking.
- Gradvis erstatte flere pollingintervaller.
- Full Lynell Runtime Bus senere.

## Merk

Ingen kodeendringer i dette checkpoint-steget.
Ingen build nødvendig.
