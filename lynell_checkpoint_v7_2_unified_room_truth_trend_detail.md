# Lynell Checkpoint v7.2 - Unified Room Truth + Trend Detail

## Status

v7.2 fikser divergerende sannheter mellom:

- Romkort
- Trendhistorikk
- NIVA
- KNX cache

Dette er et strukturelt stabiliseringssteg for server-owned runtime truth.

## Server Boot Runtime Config

Server får nå safe default runtime config ved boot.

Bridge står ikke lenger fast som:

```text
waiting for app config
```

Frontend-config kan fortsatt raffinere runtime senere.

Runtime-config fra frontend er fortsatt idempotent og fingerprint-basert.

## Årsak Til Feil

Feilen skyldtes flere konkurrerende sannheter:

- `RoomCard` brukte lokal/frontend `rooms` state.
- `RoomCard` krevde frontend-bekreftede live-nøkler før verdier ble vist.
- Trend/NIVA kunne samtidig lese server-history eller snapshots.
- Lys/varme kunne finnes i server-cache/history mens romkort fortsatt viste `AV`, `0` eller `—`.
- Bridge startet tidligere uten runtime config før frontend-init.

Resultatet var at samme rom kunne vise ulike verdier på ulike flater.

Eksempler:

- Trendhistorikk/NIVA viste temperatur fra server-history.
- Romkort viste `—`.
- Trend viste lysnivå/prosent.
- Romkort viste lys `AV` og `0%`.

## Unified Room Truth

Det er lagt inn en prioritert resolver for romdata.

Prioritet:

1. KNX subscription cache
2. Server room snapshots
3. Server-history latest datapoint
4. Frontend fallback/demo

Følgende bruker nå resolved room data:

- RoomCard
- trendrom
- NIVA house snapshot

Manager diagnostics får conflict-liste når frontend/history/snapshot spriker.

## Trend / Detail

Trend chart har nå punkt-hover/tap med:

- faktisk verdi
- timestamp
- kilde
- confidence
- gruppeadresse der tilgjengelig

Ny `Detaljer`-seksjon viser:

- datapunktliste
- min/max/snitt
- siste verdi
- datatetthet/density foundation

Sparse data håndteres fortsatt uten å lage fake datapunkter.

## HeatDemand Visibility

HeatDemand under `10%` vises med desimal ved behov.

RoomCard viser varme som faktisk prosentverdi i tillegg til symbol.

Dette gjør f.eks. `9%` synlig som faktisk verdi, ikke visuelt som `0`.

## Endrede Filer

- `bridge/server.mjs`
- `bridge/runtime-state-store.mjs`
- `src/App.tsx`
- `src/api/homeApi.ts`
- `src/components/trend`
- `src/components/RoomCard.tsx`

## Ikke Rørt

- KNX write-path
- DPT `9.001` write behavior
- HeatDemand parserlogikk utover metadata/visning
- Dreame runtime
- Cast runtime
- Deltaco runtime
- automasjoner

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK

## Gjenstår

- Server bør eie komplett KNX topologi direkte fra persistent config.
- Room truth resolver bør flyttes ut av `App.tsx`.
- Manager bør få detaljert per-rom conflict-view med cache/snapshot/history side om side.

## Neste Relevante Oppfølging

Neste naturlige steg er full server-owned KNX/runtime truth:

- persistent KNX topology/config på server
- room truth resolver som egen runtime-modul
- per-rom source diagnostics
- trend detail polish etter live-test
