# Lynell Checkpoint v4.2 - UI Trend Engine

## Status

Trendvisningen bruker nå `/api/runtime/history` som primær trendkilde.

Lokal `runtimeHistory` brukes kun som fallback.

Dette er første UI-steg der trendmotoren faktisk leser server-owned datapoints i stedet for å være bundet til frontend-state.

## Trend Source

Frontend henter server-history med:

```text
range=week
category=all
```

Deretter filtrerer frontend lokalt til:

- Time
- Dag
- Uke

## Sparse-Safe Trend Rendering

Time/Dag/Uke viser tidsstruktur selv med null eller ett datapunkt.

Sparse data håndteres uten fake datapunkter:

- tomme perioder kollapser ikke grafen
- UI viser `Sparse` / `Venter på data` når datagrunnlaget er tynt
- akser og tidsvindu vises fortsatt
- datapunkter interpoleres ikke

## UI Behavior

Trendheader viser:

- kilde
- datatetthet

Ukesvisning fungerer nå med samme sparse-safe struktur som Time/Dag.

Per-sone lyslogg bruker samme server/fallback-kilde og range.

## Endrede Filer

- `src/App.tsx`
- `src/api/homeApi.ts`
- `src/components/trend/TrendHistoryView.tsx`
- `src/components/trend/TrendHistoryChart.tsx`
- `src/styles.css`

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK

Endpoint-røykprøve for `range=week` OK:

```text
ok=true
sparse=true
hasCollections=true
hasRanges=true
hasRates=true
```

## Ikke Rørt

- Dreame runtime
- Cast runtime
- KNX write-path
- automasjoner
- AI/ML
- database
- websocket/socket.io

## Gjenstår Før Analytics / NIVA Insight Layer

- server-side aggregater for time/dag/uke
- trend UI kategori-velger
- NIVA-analyse av server-history
- persistent lagring på disk/database
- server-owned KNX subscriptions uten frontend-init

