# Lynell checkpoint v8.36 — Shading live KNX control

## Status

v8.36 løfter solskjerming fra visibility/foundation til trygg live KNX-control path.

Dette er shading control trust, mapping validation, pending/reconcile UX og diagnostics.

Eksisterende lys/klima write-path og DPT-adferd er ikke endret.

## Endrede filer

- `bridge/server.mjs`
- `src/App.tsx`
- `src/api/homeApi.ts`
- `src/config/systemConfig.ts`
- `src/components/ManagerPanel.tsx`
- `src/components/RoomManagerPanel.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/styles.css`

## Live KNX Control

- Ny safe endpoint:
  - `POST /api/knx/shading`
- Dry-run og live execution via eksisterende runtime action pipeline.
- Ingen write hvis GA mangler.
- Mapping-validering:
  - klar
  - delvis konfigurert
  - mangler mapping

## Støttede Actions

- Opp
- Stopp
- Ned
- Posisjon hvis position-GA finnes

## DPT Defaults

- `upDown`: `1.008`
- `stop`: `1.007`
- `position`: `5.001`
- `feedbackPosition`: `5.001`

## Direction Semantics

- Shared GA:
  - standard `0 = opp / 1 = ned`
- `invertUpDown` flipper retning.
- Separate `up`/`down`-GA sender `true` til valgt GA.
- `invertPosition` sender `100 - ønsket`.

## Feedback Trust

- `feedbackPosition` blir subscription target.
- `feedbackPosition` historiseres som shading/custom signal.
- UI viser pending/ikke-bekreftet shading-status rolig.
- Feedback-reconcile skjer når `feedbackPosition` kommer.
- Uten feedback vises sist sendt kommando med lavere confidence.

## UI

- Solskjerming-side viser kort per sone.
- Knapper:
  - Opp
  - Stopp
  - Ned
- Posisjon-slider vises når mapping finnes.
- Manglende mapping skjuler ikke sone.
- Actions er disabled hvis GA mangler.

## Manager / Room Manager

- DPT-felter.
- Invert flags.
- Test/dry-run-knapper.
- Mapping validation.
- Status for:
  - klar
  - delvis konfigurert
  - mangler mapping

## Diagnostics

Manager Diagnose viser:

- live-ready count
- partial/missing mapping count
- pending confirmations
- siste command
- siste feedback
- write failures
- direction/invert summary

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK

## Ikke Live-Verifisert Mot Ekte Solskjerming

- Bruker har ikke solskjerming hjemme ennå.
- Kan testes videre med simulert/test-GA og ETS Monitor.

## Ikke Endret

- Ingen eksisterende lys/klima write-path ble endret.
- Ingen generell DPT/write redesign.
- Ingen automatisk solstyring.
- Ingen vindlogikk som kjører kommando.
- Ingen scheduler for shading.
- Ingen ML.
- Ingen automasjoner.

## Gjenstår Før Full Premium Solskjerming

- Test mot ekte screen/persienneaktor.
- Bekreft direction semantics på fysisk motor.
- `feedbackPosition` live truth.
- Vindalarm/sperre.
- Solautomatikk.
- Scene/scheduler-integrasjon senere.
