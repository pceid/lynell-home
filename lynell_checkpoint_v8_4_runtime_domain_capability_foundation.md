# Lynell checkpoint v8.4 - Runtime domain + capability foundation

## Status

v8.4 etablerer runtime domain + capability foundation.

Målet er domain separation, capability governance og grunnlag for senere modular runtime architecture.

Dette er ikke plugin-system, ikke microservices og ikke distributed runtime.

## Domains

Runtime domains:

- `climate`
- `lighting`
- `media`
- `utility`
- `security`
- `integration`
- `runtime`
- `diagnostics`

## Capabilities

Capability foundation:

- `readState`
- `writeState`
- `executeAction`
- `proposeAction`
- `realtimeEvents`
- `persistentHistory`
- `signalLogging`
- `polling`
- `subscriptions`
- `providerLifecycle`
- `diagnosticsAccess`

## Sensitive capabilities

Sensitive capabilities:

- `writeState`
- `executeAction`
- `providerLifecycle`
- `proposeAction`
- `diagnosticsAccess`

## Runtime

- Actions får `domainId` og `capabilityRequired`.
- Runtime events får `domainId` og `capabilityContext`.
- Endpoint:
  - `GET /api/runtime/domains`
- Manager Diagnose viser runtime domains med health, capabilities, approval-sensitivity og realtime-status.

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- `/api/runtime/domains` smoke OK:
  - 8 domains
  - 6 realtime-capable
  - 3 approval-sensitive
- `/api/runtime/actions` viser domain snapshot i metrics.

## Ikke rørt

- KNX payload/DPT/write behavior
- Dreame/Cast/Deltaco runtime behavior
- automasjoner
- ML
- remote control
- runtime splitting/microservices

## Gjenstår

- Flytte domain-modellen ut av `server.mjs`.
- Policy-regler basert direkte på `domainId`/capability.
- Domain-aware approval UI.
- NIVA domain context.
- Senere plugin/distributed runtime-lag.

## Merk

Ingen kodeendringer i dette checkpoint-steget.
Ingen build nødvendig.
