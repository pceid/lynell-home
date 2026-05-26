# Lynell Checkpoint v7.5 - Persistent History + Room Runtime UI

## Status

v7.5 fikser plassering av `Hent verdi` og legger inn lokal persistent runtime-history.

Målet er at Trendhistorikk og NIVA ikke mister innsikt ved bridge/frontend restart.

## Endrede Filer

- `src/components/RoomCard.tsx`
- `src/styles.css`
- `bridge/runtime-state-store.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/components/trend/TrendHistoryView.tsx`
- `src/components/trend/TrendHistoryChart.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/runtime/runtimeHistory.ts`

## Årsak

- `Hent verdi` lå fortsatt visuelt i `RoomCard` sin headline/klima-struktur.
- Server-history var fortsatt hovedsakelig in-memory.
- Ved restart forsvant datapunkter/snapshots før NIVA/trend kunne bygge videre.

## Rom-Runtime

- `Hent verdi` er nå flyttet til egen `Rom-runtime` seksjon.
- Seksjonen ligger utenfor klima- og lyslayouten.
- Poll-status og feil hører til rom-runtime, ikke klima/lys.

## Persistent Runtime-History

Lokal lagring:

- `bridge/.lynell-state/runtime-history/history-events.jsonl`
- `bridge/.lynell-state/runtime-history/history-points.jsonl`
- `bridge/.lynell-state/runtime-history/snapshots.json`
- `bridge/.lynell-state/runtime-history/metadata.json`

## Restore

- Store restorer events, datapunkter og romsnapshots ved boot.
- Trendpunkter fra restored history merkes som `restored`/`persisted`.
- NIVA/room reports kan bruke restored history etter restart.

## Diagnostics

Manager Diagnose viser:

- persistence-status
- storage path
- restored counts
- last flush
- retention
- errors

## Retention

- enkel max events/points
- JSONL compaction
- ingen database ennå

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- restart-røykprøve OK:
  - `/api/runtime/history` returnerte `persisted=true`
  - `restored=true` etter bridge-restart

## Ikke Rørt

- KNX write-path
- DPT `9.001` write behavior
- Dreame runtime
- Cast runtime
- Deltaco runtime
- automasjoner
- ML

## Merk

- Midlertidig smoke-test-mappe `.tmp-v75-runtime-history` ble låst av Windows/OneDrive og lot seg ikke slette etter testen.
- Den inneholder kun dummy runtime-history fra verifikasjonen.

## Gjenstår

- ekte langtidstest
- vurdere retention/downsampling over tid
- se om persistent history gir god nok NIVA/trend-kontinuitet

