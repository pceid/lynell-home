# Lynell Checkpoint v4.3 - Server Aggregates + Room Snapshots

## Status

v4.3 bygger videre på server-owned history foundation fra v4.1 og trendmotoren fra v4.2.

Server har nå room snapshots og aggregater som foundation for senere NIVA insights.

Dette er fortsatt et kontrollert foundation-steg:

- ingen database
- ingen sockets/websocket/socket.io
- ingen AI/ML
- ingen automasjoner
- ingen endret runtime-adferd

## Endrede Filer

- `bridge/runtime-state-store.mjs`
- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`

## Server-Owned Room Snapshots

Server eier nå room snapshot foundation.

Room snapshots kan inneholde:

- temperatur
- settpunkt
- varmebehov
- lysstatus
- activity level
- comfort state
- runtime confidence
- siste datapunkter der data finnes

Dette gir Lynell en mer stabil server-side forståelse av romtilstand, uten at frontend må eie eller beregne hele sannheten.

## Nytt Endpoint

Nytt read-only endpoint:

```text
GET /api/runtime/aggregates
```

Endpointet returnerer:

- room snapshots
- server-side aggregater
- sparse/range metadata
- cadence/aggregation foundation

## Aggregater

Server-side aggregater finnes for disse ranges:

- `lastHour`
- `day`
- `week`

Aggregater finnes per kategori:

- `climate`
- `atmosphere`
- `runtime`
- `media`
- `vacuum`

Aggregation values:

- `avg`
- `min`
- `max`
- `count`
- `confidence`

Aggregatene er enkle med vilje. De er foundation for senere comfort drift, room behavior, activity rhythm og NIVA insight layer.

## Sparse-Safe Aggregation

Sparse-safe håndtering ligger nå på server:

- tidsområder finnes selv når data mangler
- server faker ikke datapunkter
- aggregation windows/ranges håndteres server-side
- tomme eller tynne datagrunnlag kan beskrives uten at UI må gjette

Dette gjør senere trendvisning og NIVA-analyse mer konsistent på tvers av klienter.

## Frontend

Frontend henter aggregates sammen med server runtime state/history.

Developer Mode viser:

- snapshot count
- aggregation ranges
- density
- cadence health
- stale room awareness

Live Mode er ikke gjort tyngre.

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- `/api/runtime/aggregates` smoke test OK

## Ikke Rørt

- Dreame runtime behavior
- Cast runtime behavior
- KNX write-path
- automasjoner
- AI/ML
- database
- websocket/socket.io

## Gjenstår Før Ekte NIVA Insight Layer

- persistent lagring
- server-owned KNX subscriptions uten frontend-init
- mer komplett server-eid romdata
- faktisk analyse/innsikt oppå aggregatene

