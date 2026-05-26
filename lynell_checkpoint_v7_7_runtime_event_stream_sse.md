# Lynell Checkpoint v7.7 - Runtime Event Stream SSE

## Status

v7.7 legger inn første server-owned runtime event stream.

- Teknologi: SSE via `GET /api/runtime/events`
- Målet er realtime updates uten tung frontend polling.
- Eksisterende polling beholdes som fallback.

## Endrede Filer

- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`

## Nytt Endpoint

```text
GET /api/runtime/events
```

## Eventtyper

- `roomUpdated`
- `knxValueUpdated`
- `historyPointAdded`
- `signalLoggerPoint`
- `runtimeFreshnessChanged`
- `pollCompleted`
- `insightGenerated`
- `providerStateChanged`
- `runtimeHeartbeat`

## Event Payload

Event payload inkluderer:

- timestamp
- roomId
- category
- source
- groupAddress
- dpt
- confidence
- updateToken der relevant

## Frontend

- abonnerer med `EventSource` ved oppstart
- `historyPointAdded` merges inn i server-history i minnet
- `pollCompleted` oppdaterer poll-state
- runtime events setter update tokens for grønt blink
- throttlet runtime refresh henter full server truth etter live events
- polling beholdes som fallback

## Manager Diagnose

Manager Diagnose viser:

- stream connected/disconnected
- reconnect count
- events per minute
- dropped events
- last event timestamp
- latency estimate

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- `/api/runtime/events` smoke test OK:
  - stream åpnet
  - sendte `event: connected`

## Ikke Rørt

- KNX write-path
- DPT `9.001`
- Dreame runtime behavior
- Cast runtime behavior
- Deltaco runtime behavior
- automasjoner
- ML
- provider orchestration

## Gjenstår Før Production Realtime-Runtime

- live test PC + mobil på ekte KNX-telegrammer
- server-side event replay / `Last-Event-ID`
- mer presis dropped-event tracking per klient
- gradvis erstatte flere pollingintervaller når SSE er stabilt

