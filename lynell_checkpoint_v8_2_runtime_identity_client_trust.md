# Lynell checkpoint v8.2 - Runtime identity + client trust

## Status

v8.2 etablerer første runtime identity + client trust foundation.

Dette er ikke ekte login/auth, ikke RBAC og ikke remote execution. Målet er client/session observability, trust classification og action/audit ownership.

## Endrede filer

- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`

## Nye endpoints

- `POST /api/runtime/clients/register`
- `GET /api/runtime/clients`

## Client model

Client model inneholder:

- `clientId`
- `clientName`
- `deviceType`
- `platform`
- `firstSeen`
- `lastSeen`
- `trusted`
- `localNetwork`
- `runtimeCapabilities`
- `lastRuntimeVersion`
- `activeSessionCount`

## Session model

Session model inneholder:

- `sessionId`
- `clientId`
- `connectedAt`
- `lastActivity`
- `connectionType`
- `runtimeMode`
- `eventStreamConnected`
- `trustedSession`
- `localSession`
- `staleSession`

## Classification foundation

Classification foundation:

- `localTrusted`
- `localUntrusted`
- `remoteUnknown`
- `internalRuntime`
- `developmentClient`

## Runtime behavior

- Frontend registrerer client/session ved oppstart.
- SSE stream kobles til `clientId`/`sessionId` via query params.
- Action ownership og audit bruker registrert client/session/trust der mulig.

## Manager Diagnose

Manager Diagnose viser:

- aktive klienter
- sessions
- trusted/untrusted
- SSE-connected
- stale sessions
- client capabilities

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- Runtime client registration smoke OK
- SSE session tracking smoke OK
- `/api/runtime/clients` viser clients/sessions/trust/SSE counts
- `auth=false`
- `remoteControl=false` i snapshot

## Ikke gjort

- ekte login/auth
- RBAC
- remote execution
- persistent client registry
- client naming UI
- hard trust enforcement
- endring i KNX payload/DPT/write
- Dreame/Cast/Deltaco runtime-endring
- automasjoner
- ML

## Gjenstår før ekte identity/security layer

- Persistent client registry.
- Client naming UI.
- Trust management UI.
- Auth/users/roles.
- Kobling mot approve/deny UX.
- Hardere local/remote enforcement.

## Merk

Ingen kodeendringer i dette checkpoint-steget.
Ingen build nødvendig.
