# Lynell checkpoint v8.29 — Scene scheduler execution fix

v8.29 fikser scene scheduler execution-trust.

Scene scheduler er nå verifisert mot ekte ETS Monitor.

Dette er en kritisk trust-fix for server-owned scheduling.

## Endrede filer

- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/App.tsx`

## Root cause

- Scheduler-idempotency brukte:
  - `sceneId + dato`
- Dette kunne blokkere flere kjøringer samme dag.
- En scene testet kl. 18:00 kunne dermed blokkere faktisk scene kl. 18:30.
- Resultatet var at scheduler hoppet stille over legitime executions.

## Fix

- Idempotency bruker nå:
  - `sceneId + dato + triggerTime`
- Scheduler-state migreres ved restore til ny execution-key.
- Duplicate execution innen samme execution window hindres fortsatt.

## Scheduler diagnostics

Scheduler diagnostics viser:

- `schedulerStartedAt`
- `tickCount`
- `lastTickAt`
- `nextTickAt`
- `scheduledSceneCount`
- `enabledSceneCount`
- `nextExecutionAt`
- `dueScenes`
- `lastDueCheck`
- `lastExecutionAttempt`
- `lastExecutionResult`
- `lastExecutionError`
- `skippedReason`

## Scene execution

- Scene execution resolver `room/zone` til riktig dim/value GA.
- Resolver bruker persisted runtime config.
- Execution går gjennom eksisterende runtime action pipeline.
- Execution bruker eksisterende brightness write path.
- `scheduledSceneBrightnessWrite` klassifiseres som `lighting`.

## Nytt endpoint

- `POST /api/runtime/scenes/:sceneId/test`

Endpointet støtter:

- dry-run
- eksplisitt test execution
- samme execution resolver som scheduler
- samme runtime action/write path som tidsstyrt scene

## Manager Diagnose

Manager Diagnose viser:

- `Dry-run neste scene`
- `Test scene nå`
- scheduler diagnostics
- due/skipped/execution status

## NIVA

NIVA kan forklare:

- scheduler-status
- siste feil/skip
- siste execution
- hvilke GA-er som ble brukt

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK

## Live ETS-verifisert

Dry-run viste riktige GA-er:

- `0/0/16` -> 45%
- `0/1/29` -> 10%
- `0/2/6` -> 50%

`Test scene nå` sendte faktiske telegrammer i ETS Monitor.

Scene execution-path er dermed verifisert.

## Ikke endret

- ingen DPT/write payload redesign
- ingen automasjoner utover eksplisitt schedule
- ingen ML
- ingen ny KNX write path

## Resultat

- Server-owned scheduler er nå execution-trustworthy.
- Scene execution overlever frontend refresh/sleep.
- Scheduler kjører fra runtime/bridge, ikke frontend.

Ingen kodeendringer.
Ingen build nødvendig.
