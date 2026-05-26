# Lynell Checkpoint v5.0 - Assistant Manager / Integration Foundation

## Status

v5.0 etablerer første foundation for Assistant Manager / Integration Manager.

Server eier provider-modellen for integrasjoner.

UI visualiserer integrasjoner uten å eie secrets.

Runtime-adferd er ikke endret.

## Ny Fil

- `bridge/integration-manager.mjs`

## Endrede Filer

- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/styles.css`

## Nye Endpoints

Read-only endpoints:

```text
GET /api/integrations
GET /api/integrations/:provider
```

## Provider Contracts

Provider contracts finnes for:

- Dreame
- Home Assistant bridge
- Cast
- MQTT
- Sonos foundation
- Deco foundation
- Mill foundation
- Namron foundation

## Credential Foundation

Frontend får kun:

- `configured`
- `missing`
- `authRequired`
- `policy`

Ingen secrets sendes til frontend.

Ingen passord, token eller API keys returneres.

Ingen database eller encrypted storage finnes ennå.

Dette er kun foundation med session/process/env-policy.

## Assistant Manager

Assistenter-flaten har rolig provideroversikt.

Den viser:

- status
- readiness
- runtime health
- capabilities
- auth state

Developer Mode viser:

- provider-diagnostikk
- health
- capabilities
- safe config

Live Mode holdes ryddig.

## Eksisterende Integrasjoner

Dreame, Cast og MQTT kobles inn ved å lese eksisterende runtime-status.

Runtime behavior ble ikke endret.

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/integration-manager.mjs` OK

`/api/integrations` smoke test OK:

```text
providers=8
secretsReturned=false
Dreame/Cast/MQTT finnes
```

`/api/integrations/dreameCloud` smoke test OK:

```text
viser missing env uten secrets
```

## Ikke Gjort

- database
- encrypted credential storage
- automasjoner
- nye robotkommandoer
- endring i Dreame/Cast/KNX runtime behavior

## Gjenstår Før Ekte Integration Operating System

- persistent/encrypted credential store
- provider config update-flow
- multi-site/user permissions
- plugin/marketplace-struktur
- approval-gated actions

