# Lynell Checkpoint v4.0 - Persistent Server Intelligence Foundation

## Status

Lynell har startet overgangen fra frontend-state til server-centric runtime intelligence.

Prinsipp:

- server er sannheten
- klienter er views/plugins
- mobil, desktop og nettbrett skal etter hvert lese samme runtime-state fra bridge/server

Dette er en foundation-runde. Eksisterende frontend-state er fortsatt fallback og hoved-UI-flyt.

## Ny Server-Side Runtime Store

Ny fil:

- `bridge/runtime-state-store.mjs`

Store holder:

- runtime snapshot
- rolling in-memory history
- datapunkter
- timestamp

Store observerer:

- runtime config
- health
- light feedback/query
- climate feedback/query
- Cast status/playback
- MQTT status
- vacuum status

Heartbeat:

- hvert 60. sekund
- gir serveren en enkel kontinuitetsrytme mens bridge kjører

Historikk kan nå leve videre mens bridge kjører, uavhengig av aktiv frontend-view.

## Nye Read-Only Endpoints

```text
GET /api/runtime/state
GET /api/runtime/history
GET /api/runtime/summary
```

Disse er read-only foundation-endpoints for shared runtime truth.

## Frontend Consumption

Frontend leser server runtime state/history periodisk.

Foreløpig bruk:

- Developer Mode / Manager Diagnose
- server runtime visibility
- fallback-friendly foundation

Eksisterende frontend-state er fortsatt:

- fallback
- hoved-UI-flyt
- aktiv state-owner for dagens views

Dette er en kontrollert overgang, ikke en stor runtime-refactor.

## Developer Mode Visibility

Developer Mode viser:

- server source-of-truth
- uptime
- snapshot cadence
- history sample count
- point count
- rom med signaler
- siste server-event
- server runtime-feil hvis relevant

Live Mode holdes renere og viser ikke dyp server-diagnose.

## Endrede Filer

- `bridge/runtime-state-store.mjs`
- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`

## Ikke Rørt

Denne runden endret ikke:

- Dreame runtime behavior
- Cast runtime behavior
- KNX write-path
- automasjoner
- AI/ML
- database
- websocket/socket.io

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK

Endpoints røykprøve OK:

```text
stateOk=true
summaryOk=true
source=bridge-runtime-store
```

## Gjenstår Før Ekte Persistent Intelligence

- disk/local persistence eller database
- server-owned subscriptions/logging uten frontend-init
- mer komplett room snapshot fra server
- trendhistorikk v2 med time/dag/uke og tomme perioder
- sentralisert NIVA/server-summary som primær truth for alle klienter

