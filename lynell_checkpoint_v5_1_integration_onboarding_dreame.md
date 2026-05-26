# Lynell Checkpoint v5.1 - Integration Onboarding, Dreame First

## Status

v5.1 etablerer første onboarding-flow for Lynell Integration OS.

Dreame er første golden-path provider.

Onboarding er safe/read-only og readiness-basert.

Ingen automasjoner, handlinger eller robotkommandoer er lagt til.

## Endrede Filer

- `bridge/integration-manager.mjs`
- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/styles.css`

## Onboarding-Modell Per Provider

Provider-kontrakten har nå onboarding foundation:

- `onboardingStatus`
- `configured`
- `validated`
- `connected`
- `runtimeReady`
- `missingRequirements`
- `validationErrors`
- `capabilities`
- `recommendedNextStep`
- `steps`

## Dreame Onboarding

Dreame onboarding sjekker:

- username presence
- password presence
- auth profile
- cloud enabled
- provider selected
- selected client
- device reachable
- runtime connected

Dette er readiness og validering, ikke kommando eller automasjon.

## Nytt Endpoint

Safe config foundation:

```text
POST /api/integrations/:provider/config
```

## Config Foundation

Config er foreløpig:

- session/process-level only
- ingen persistence
- ingen encrypted storage ennå

Secrets:

- returneres ikke
- logges ikke
- lagres ikke persistent
- behandles kun som presence/configured-signal

Frontend får kun:

- presence
- configured
- readiness
- missing requirements
- validation state

## Assistant Manager

Assistant Manager viser:

- onboarding status
- missing requirements
- validation state
- recommended next step
- runtime connected
- capabilities

Developer Mode viser provider/onboarding diagnostics.

Live Mode holdes ryddig.

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/integration-manager.mjs` OK

Dreame config POST smoke test OK:

```text
configured=true
secretsReturned=false
onboarding=validated
runtimeMutated=false
persisted=false
```

## Ikke Rørt

- Dreame runtime behavior
- Cast runtime behavior
- KNX write-path
- robotkommandoer
- automasjoner
- database
- encrypted storage

## Gjenstår Før Full Integration OS Onboarding

- encrypted credential store
- persistent provider config
- runtime activation flow
- multi-provider onboarding
- plugin/marketplace
- approval-gated actions

