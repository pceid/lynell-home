# Lynell Checkpoint v5.2 - Integration Lifecycle Foundation

## Status

v5.2 etablerer første lifecycle-lag for Lynell Integration OS.

Provider lifecycle styres server-side.

Frontend viser status og trygge valg.

Ingen faktisk hardware-start/stopp eller runtime-mutasjon er lagt til.

## Endrede Filer

- `bridge/integration-manager.mjs`
- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/styles.css`

## Lifecycle States

- `disabled`
- `ready`
- `activating`
- `active`
- `degraded`
- `offline`
- `failed`

## Lifecycle-Modell

Lifecycle-modellen inkluderer:

- `enabled`
- `activationAllowed`
- `lastLifecycleChangeAt`
- `lastHealthCheckAt`
- `healthReason`
- `recommendedAction`
- `canActivate`
- `canDeactivate`
- `requiresConfig`
- `requiresValidation`

## Nye Safe Endpoints

```text
POST /api/integrations/:provider/enable
POST /api/integrations/:provider/disable
POST /api/integrations/:provider/activate
POST /api/integrations/:provider/deactivate
```

## Viktig Avgrensning

Lifecycle foundation er:

- session/process-level only
- ingen persistence
- ingen secrets
- ingen robotkommandoer
- ingen automasjoner
- ingen hardware-start/stopp

`activate` markerer kun kontrollert lifecycle intent.

`runtimeMutated=false`

## Provider Mapping

Dreame krever validert onboarding før `activate` aksepteres.

Dreame runtime behavior er ikke endret.

Cast/MQTT har enklere lifecycle mapping fra eksisterende runtime-status.

KNX write-path er ikke rørt.

## Assistant Manager

Assistant Manager viser:

- lifecycle state
- health reason
- recommended action
- enable/activate/deactivate-valg

Developer Mode viser lifecycle diagnostics.

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/integration-manager.mjs` OK

Lifecycle smoke test OK:

```text
config/update returnerer ingen secrets
activate kan bli activating
runtimeMutated=false
```

## Gjenstår Før Full Integration OS Lifecycle

- persistent provider enablement
- encrypted credentials
- background reconnect
- provider restart
- runtime activation mot faktiske adapters
- approval-gated actions
- multi-site lifecycle

## Ikke Rørt

- Dreame runtime behavior
- Cast runtime behavior
- KNX write-path
- robotkommandoer
- automasjoner
- hardware-start/stopp
- database
- encrypted storage

