# Lynell Checkpoint v2.6 - Dreame keyDefine status mapping

## Status

Dreame native cloud adapter er nå live status-runtime for Dream/Dreame robot via `dreameCloud`.

Dette checkpointet dokumenterer at Lynell bruker `keyDefine` som live status dictionary, ikke som command/action metadata.

## keyDefine som status dictionary

`keyDefine` brukes nå til trygg mapping av `latestStatus`.

Bekreftet mapping:

- `latestStatus=6`
- `localizedText=Charging`
- `normalizedStatus=charging`
- mapping path: `$.keyDefine.2.1.en.6`
- `statusMappingConfidence=confirmed`

Språkprioritet:

- `en`
- `nb`
- fallback til første tilgjengelige språk

## Derived charging / docked

Når status kommer fra confirmed keyDefine mapping:

- `normalizedStatus=charging`
- `statusMappingConfidence=confirmed`

Da avleder Lynell trygt:

- `charging=true`
- `docked=true`
- `derivedState=true`
- `derivedFromStatusCode=true`
- `derivedFromCode="6"`

Dette vises nå i final `selectedRobot` og `robots[]` payload.

## Observed status codes

`observedStatusCodes` fungerer som in-memory observasjon for statuskoder.

Den kan vise:

- `code`
- `localizedText`
- `localizedLanguage`
- `localizedPath`
- `normalizedStatus`
- `confidence`
- `count`
- `firstSeenAt`
- `lastSeenAt`

`statusMappingConfidence` støtter:

- `confirmed`
- `tentative`
- `unknown`

## Command/action metadata status

`keyDefine` inneholder ikke sikker command/action metadata for denne roboten.

Funn:

- keyDefine ser ut til å være localization/state dictionary.
- `actions`, `services`, `siid` og `aiid` finnes ikke som trygg command-struktur.
- Dock command readiness fant ingen sikre command candidates.

Konsekvens:

- Ingen robotkommandoer er sendt av Lynell.
- All command path er fortsatt disabled/safe-mode.
- Ingen dock/start/clean/pause er aktivert.
- Ingen hardkodede command actions er lagt inn.

## Stabil status nå

Følgende statusfelt er nå stabile nok for Lynell status-runtime:

- `online`
- `battery`
- `charging`
- `docked`
- `statusText`
- `lastUpdatedAt`

`charging` og `docked` kan være derived fra confirmed keyDefine status når eksplisitte felt mangler eller er usikre.

## Fortsatt mangler

Ikke implementert / ikke bekreftet:

- cleaning progress
- room/maps
- zones
- schedules
- consumables
- explicit command actions
- safe dock command
- start/clean commands
- automations

## Arkitekturstatus

- Native `dreameCloud` er live status-runtime.
- Native `dreameCloud` er fortsatt experimental / unstable / reverse-engineered.
- Home Assistant beholdes som optional compatibility bridge.
- Credentials eies fortsatt av bridge/env, ikke frontend.
- Secrets, token og full device-id skal aldri logges eller returneres.

## Verifisert

- `npm run build` OK
- `node --check bridge/dreame-cloud-runtime.mjs` OK
- `node --check bridge/vacuum-runtime.mjs` OK
- `node --check bridge/server.mjs` OK

## Neste anbefalte fase

Fortsett status-only til flere manuelle robottilstander er observert:

- charging
- idle/standby
- cleaning manuelt startet fra Dreame app
- returning to charge manuelt startet fra Dreame app

Første fremtidige safe command er fortsatt:

- dock / return_to_base

Ikke implementer start/clean før status og command metadata er sikkert forstått.
