# Lynell checkpoint v8.6 - Runtime registry + provider composition

## Status

v8.6 etablerer Runtime registry + provider composition foundation.

Målet er runtime composition, provider manifests, capability discovery og domain/provider relationships.

Dette er ikke plugin-system, ikke dynamic code loading, ikke distributed runtime og ikke package manager.

## Endrede filer

- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/runtime/runtimeEventReducer.ts`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`

## Nytt endpoint

- `GET /api/runtime/registry`

## Runtime registry model

Runtime registry model:

- providers
- domains
- capabilities
- runtime services
- active runtimes
- health summaries

## Provider manifests

Provider manifests finnes for:

- KNX runtime
- Lynell bridge/SSE runtime
- Deltaco/Tuya
- Dreame
- Cast
- MQTT
- signal logger/diagnostics-relaterte runtime-flater

## Runtime services

Runtime services:

- `eventBus`
- `actionPipeline`
- `snapshotRuntime`
- `approvalRuntime`
- `diagnosticsRuntime`
- `registryRuntime`

## Capability matrix

- Viser providers/domains per capability.
- Markerer sensitive capabilities.

## Domain composition

Domains viser:

- providers
- runtime services
- exposed capabilities

## SSE/runtime events

Nye runtime events:

- `providerRegistered`
- `registryUpdated`
- `runtimeServiceHealthChanged`

## Manager Diagnose

Manager Diagnose viser:

- runtime registry
- provider manifests
- capability matrix
- realtime providers
- approval-sensitive providers
- persistence/recovery-aware providers
- runtime service health

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- `/api/runtime/registry` OK:
  - `providers=11`
  - `domains=8`
  - `capabilities=11`
  - `services=6`
  - `pluginSystem=false`
  - `dynamicCodeLoading=false`
- SSE-smoke OK:
  - `registryUpdated`
  - `providerRegistered`
  - `runtimeServiceHealthChanged`

## Ikke rørt

- KNX payload/DPT/write behavior
- Dreame/Cast/Deltaco runtime mutation
- automasjoner
- ML
- distributed runtime
- plugin loading
- dynamic code loading
- package manager

## Gjenstår

- Flytte registry/domain manifests ut av `server.mjs`.
- Persistent provider manifest registry.
- Policy koblet direkte mot registry capabilities.
- NIVA capability discovery over registry.
- Senere plugin loader, signering og sandboxing.

## Merk

Ingen kodeendringer i dette checkpoint-steget.
Ingen build nødvendig.
