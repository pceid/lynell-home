# Lynell checkpoint v8.8 - Runtime insight engine foundation

## Status

v8.8 etablerer Runtime insight engine foundation.

Målet er observerende, explainable runtime intelligence.

Dette er ikke AI execution, ikke ML, ikke automasjoner og ikke autonomous behavior.

## Endrede filer

- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/runtime/runtimeEventReducer.ts`
- `src/components/manager/ManagerDiagnostics.tsx`

## Insight model

Insight-modellen inneholder:

- `insightId`
- `category`
- `severity`
- `confidence`
- `createdAt`
- `updatedAt`
- `source`
- `relatedEntities`
- `affectedDomains`
- `semanticContext`
- `explanation`
- `suggestedAction`
- `requiresApproval`
- `acknowledged`
- `resolved`
- `stale`
- `lifecycleState`

## Insight-kategorier

- `staleSignal`
- `runtimeHealth`
- `recoveryEvent`
- `pollingPressure`
- `realtimeInstability`
- `approvalAttention`
- `orphanedEntity`
- `diagnosticsObservation`

## Generering

- Kun deterministiske regler.
- Ingen ML/AI.
- Bruker semantic registry/context graph.
- Bruker domain health.
- Bruker event stream stats.
- Bruker polling pressure.
- Bruker approval queue.
- Bruker recovery continuity.
- Forklaringer bruker entity/displayName/semantic role når mulig.

## Persistence

Runtime insights lagres lokalt i:

- `bridge/.lynell-state/runtime-insights/insights.jsonl`
- `bridge/.lynell-state/runtime-insights/metadata.json`

Tidligere insights restores ved bridge-start.

Active/resolved/acknowledged state bevares.

## Endpoints

- `GET /api/runtime/insights`
  - returnerer server insights og `runtimeInsightEngine`
- `POST /api/runtime/insights/:insightId/acknowledge`

## SSE events

- `insightGenerated`
- `insightUpdated`
- `insightResolved`
- `insightAcknowledged`

## Manager Diagnose

Manager Diagnose viser:

- active insights
- stale/resolved/acknowledged foundation
- severity/category distribution
- explainable insight descriptions
- persistence/restore status

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- `/api/runtime/insights` smoke OK:
  - `engine OK`
  - `deterministic=true`
  - `aiMl=false`
  - `actionExecution=false`
  - `persisted=true`
- SSE smoke OK:
  - insight events ble sendt
- Acknowledge smoke OK:
  - insight gikk til `acknowledged`
  - `sendsCommands=false`
  - `autonomousExecution=false`

## Ikke rørt

- KNX payload/DPT/write behavior
- Dreame/Cast/Deltaco runtime mutation
- automasjoner
- ML
- AI execution
- autonomous actions
- remote control

## Gjenstår

- flytte insight engine ut av `server.mjs`
- bedre human-readable room/entity names
- UI for acknowledge/resolve
- insight dedupe/retention mer production-grade
- NIVA-spørringer og forklaringer over insight/context graph

Ingen kodeendringer.
Ingen build nødvendig.
