# Lynell checkpoint v8.11 - Module split phase 1

## Status

v8.11 starter modul-splitt fase 1.

Dette er en lav-risiko refactor. Ingen runtime behavior er endret.

Målet er å redusere risiko i `server.mjs` og `App.tsx` ved å flytte rene modell- og helper-lag ut først.

## Opprettede filer

- `bridge/runtime-domains.mjs`
- `bridge/runtime-registry.mjs`
- `bridge/runtime-semantics.mjs`
- `src/runtime/sourceTrust.ts`
- `src/runtime/runtimeConfigSummary.ts`

## Flyttet ut

- runtime domain/capability-definisjoner
- provider manifest helpers
- capability matrix helpers
- semantic context graph builder helpers
- source trust/source allowlist helpers
- KNX runtime-config payload summary helpers

## Beholdt urørt

- HTTP routes
- SSE emitter
- KNX runtime/write/DPT paths
- action/policy execution
- persistence/write flows
- React state/effects/config push/NIVA/write handlers

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-domains.mjs` OK
- `node --check bridge/runtime-registry.mjs` OK
- `node --check bridge/runtime-semantics.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK

## Smoke

`/api/runtime/registry`:

- providers=11
- domains=8
- capabilities=11
- services=6

Semantic graph:

- entities=95
- relationships=402

`/api/runtime/domains`:

- domains=8

`/api/knx/diagnostics`:

- active=true
- targetCount=61
- runtimeConfigSource=persisted-server-config

## Fase 2 kandidat

- `bridge/runtime-events.mjs`
- `bridge/runtime-actions.mjs`
- `bridge/runtime-policies.mjs`
- `src/runtime/roomTruthResolver.ts`

## Viktig avgrensning

Ingen runtime behavior er endret.

Ingen nye features er lagt til.

Ingen build er kjørt for dette checkpointet.
