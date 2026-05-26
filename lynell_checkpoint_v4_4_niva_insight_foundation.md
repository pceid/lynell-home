# Lynell Checkpoint v4.4 - NIVA Insight Foundation

## Status

NIVA insight foundation er implementert.

Dette er heuristisk og read-only innsikt, ikke AI/ML.

NIVA observerer, men bestemmer ikke.

Ingen handlinger eller automasjoner er lagt til.

## Nytt Endpoint

Nytt read-only endpoint:

```text
GET /api/runtime/insights
```

## Insight-Modell

NIVA server insights bruker en enkel modell:

- `id`
- `timestamp`
- `type`
- `severity`
- `confidence`
- `roomId`
- `title`
- `summary`
- `source`
- `observationWindow`
- `signals`

## Insight-Typer

Første insight-typer:

- `comfortDrift`
- `unstableRoom`
- `staleRuntime`
- `unusualActivity`
- `atmosphereShift`
- `inactiveRoom`
- `highHeatDemand`

## Datagrunnlag

Insights bygges fra server-owned runtime foundation:

- server-owned room snapshots
- aggregates
- runtime history
- cadence awareness

Dette legger grunnlaget for senere NIVA intelligence uten å gjøre frontend til eier av sannheten.

## Oppførsel

Low-confidence insights formuleres forsiktig.

Sparse data tåles.

Live Mode viser kun få, milde observasjoner i NIVA/Home.

Developer Mode viser full `NIVA server observations` med:

- signalgrunnlag
- confidence
- severity
- source
- observation window

## Endrede Filer

- `bridge/runtime-state-store.mjs`
- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- `/api/runtime/insights` smoke test OK

Smoke test:

```text
ok=true
model=heuristic
readOnly=true
actions=false
```

## Ikke Rørt

- Dreame runtime
- Cast runtime
- KNX write-path
- automasjoner
- AI/ML
- database
- websocket/socket.io

## Gjenstår Før Adaptive Intelligence

- persistent historikk
- rikere server-eid romdata
- robust baseline/normalmodell
- senere ML/anomaly detection
- fortsatt approval-gated handlinger

