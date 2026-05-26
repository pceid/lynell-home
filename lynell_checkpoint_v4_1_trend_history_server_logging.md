# Lynell Checkpoint v4.1 - Trend History Server Logging

## Status

v4.1 legger server-owned history foundation oppå v4.0.

Dette er fortsatt en foundation-runde:

- ingen database
- ingen sockets/websocket/socket.io
- ingen endret runtime-adferd
- ingen AI/ML
- ingen automasjoner

Server eier nå logging foundation, ikke frontend. Loggingen er grunnlag for fremtidig NIVA intelligence.

## Endrede Filer

- `bridge/runtime-state-store.mjs`
- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/components/manager/ManagerDiagnostics.tsx`

## Server-Owned History

Separate in-memory collections:

- `climate`
- `atmosphere`
- `runtime`
- `media`
- `vacuum`

Standard datapunkter:

- `timestamp`
- `at`
- `source`
- `roomId`
- `roomKey`
- `category`
- `value`
- `confidence`

Cadence metadata:

- `climate`: 60 sek
- `runtime`: 60 sek
- `vacuum`: 2 min
- `media`: 5 min
- `atmosphere`: 5 min

Sparse-safe ranges:

- `lastHour`
- `day`
- `week`

`/api/runtime/history` støtter:

- `limit`
- `range`
- `category`

## Frontend

Frontend leser server-history periodisk via v4.0 flow.

Developer Mode viser:

- category counts
- datapoint rates
- sparse ranges
- oldest/newest sample
- cadence/snapshot-status

Live Mode er ikke gjort tyngre.

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK

Endpoint-røykprøve OK:

```text
historyOk=true
source=bridge-runtime-store
range=lastHour
hasRanges=true
hasCollections=true
hasRates=true
categories=climate, atmosphere, runtime, media, vacuum
```

## Ikke Rørt

- Dreame runtime behavior
- Cast runtime behavior
- KNX write-path
- automasjoner
- AI/ML
- database
- websocket/socket.io

## Gjenstår Før Persistent Intelligence / Analytics

- disk/database persistence
- server-owned KNX subscriptions uten frontend-init
- UI trendgraf som leser server datapoints direkte
- aggregater for time/dag/uke
- NIVA-analyse som bruker server-history som primær truth

