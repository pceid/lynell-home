# Lynell checkpoint v8.7 - Runtime semantics + context graph

## Status

v8.7 etablerer runtime semantics + context intelligence foundation.

Målet er semantisk runtime-modell, entity-relasjoner og context graph.

Dette er ikke AI execution, ikke ML, ikke automasjoner og ikke graph database. Foundation skal senere brukes av NIVA for context intelligence.

## Endrede filer

- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/runtime/runtimeEventReducer.ts`
- `src/components/manager/ManagerDiagnostics.tsx`

## Entity/context model

Runtime registry bygger nå:

- `semanticEntities`
- `relationships`
- `contextGraph`

## Entity-typer

- `room`
- `provider`
- `runtimeService`
- `signal`
- `sensor`
- `actuator`
- `climateZone`
- `lightZone`

## Relasjoner

- `belongsTo`
- `monitors`
- `feeds`
- `relatedTo`
- `dependsOn`
- `groupedWith` er modellert som intensjon, men ikke tungt brukt ennå

## Semantic roles

- `homeSpace`
- `providerRuntime`
- `runtimeService`
- `realtimeCritical`
- `approvalSensitive`
- `recoveryAware`
- `passiveSensor`
- `comfortLighting`
- `comfortLightingLevel`
- `primaryClimateController`
- `comfortDemandSignal`
- `diagnosticsSignal`

## Registry-integrasjon

- `/api/runtime/registry` eksponerer semantisk context graph.
- Provider/domain/service registry brukes som kilde for provider- og runtimeService-entities.
- KNX subscription targets brukes som kilde for room/signal/sensor/actuator-entities.
- Orphaned entities oppdages i graph summary.

## Runtime events

Events får:

- `relatedEntityIds`
- `semanticContext`
- `affectedDomains`

Reducer lineage viser relaterte entities når de finnes.

## Manager Diagnose

Manager Diagnose viser:

- Runtime semantics
- entity count
- relationship count
- realtime-critical count
- approval-sensitive count
- orphaned count
- semantic roles
- eksempel-liste over context graph entities

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- `/api/runtime/registry` smoke OK:
  - `entities=25`
  - `relationships=97`
  - `orphaned=0`
  - provider/runtimeService entities finnes
- SSE smoke OK:
  - `registryUpdated` event hadde `semanticContext`
  - `affectedDomains=runtime`

## Ikke rørt

- KNX payload/DPT/write behavior
- Dreame/Cast/Deltaco runtime mutation
- automasjoner
- ML
- AI execution
- remote control
- graph database/distributed runtime

## Gjenstår før ekte NIVA context intelligence

- Flytte semantic graph-builder ut av `server.mjs`.
- Gi rom/entities bedre display names fra frontend/server room config.
- Action impact mapping mellom actuator/sensor/room.
- NIVA-spørringer mot context graph.
- Mer presis scene/insight entity-modell.

## Merk

Ingen kodeendringer i dette checkpoint-steget.
Ingen build nødvendig.
