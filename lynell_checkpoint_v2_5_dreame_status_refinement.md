# Lynell Checkpoint v2.5 - Dreame Status Refinement

Dato: 2026-05-16

Formål: dokumentere Dreame native cloud status refinement etter første live status-only mapping, slik at videre arbeid holder riktig skille mellom bekreftet status, observasjon og fysisk robotkontroll.

Bruk sammen med:

- `lynell_checkpoint_v2.md`
- `lynell_checkpoint_v2_2_integrations.md`
- `lynell_checkpoint_v2_3_dreame_native_foundation.md`
- `lynell_checkpoint_v2_4_dreame_native_auth_device_success.md`
- `dreame_native_adapter_research.md`

## 1. Status nå

Dreame native cloud er live status-only via `bridge/vacuum-runtime.mjs`.

Bekreftet:

- Auth fungerer.
- Device-list fungerer.
- Device path er:
  - `data.page.records`
- `dreameCloud` er koblet inn som status-provider i vacuum-runtime.
- `/api/vacuum/status` kan vise live native Dreame status når env er satt.

Dette er fortsatt status-only.

## 2. Identifisert robot

Robot er identifisert som:

- name: `Vaskepott`
- model: `dreame.vacuum.r2564b`

Sanitert device-id brukes fortsatt. Full device-id skal aldri logges eller returneres.

## 3. Felt som fungerer

Fungerer:

- `online`
- `battery`
- `latestStatus` som statuskode
- `lastUpdatedAt` fra `updateTime`

Battery og online fungerer i live status.

## 4. Statuskode-mapping

`latestStatus` leses som statuskode, ikke som tekstlig område.

Viktig opprydding:

- `currentArea` settes ikke lenger feil til statuskode.
- `latestStatus="3"` er tentativt mappet til idle/standby.
- `latestStatus="12"` er observert, men ikke bekreftet eller hardmappet.

`latestStatus=3`:

- tentative meaning: idle/standby
- confidence: tentative
- bekrefter ikke docked
- bekrefter ikke charging

`latestStatus=12`:

- observert
- ikke bekreftet
- ikke mappet til docked/charging/idle ennå

## 5. Observed status codes

`observedStatusCodes` finnes som in-memory observasjon i bridge-runtime.

Den viser kun saniterte data:

- statuskode
- antall observasjoner i gjeldende bridge-prosess
- første/siste observasjonstid
- feltkilde, for eksempel `latestStatus`
- tentativ eller unknown mapping
- docked/charging hvis sikkert kjent
- note

Den viser aldri:

- token
- credentials
- full payload
- full device-id

Observasjonen resetter ved bridge-restart. Dette er bevisst og lettvekts in-memory foundation.

## 6. Mangler fortsatt

Eksplisitte felt mangler fortsatt for:

- `docked`
- `charging`

Disse skal stå som unknown/missing til Dreame-status er bekreftet fra tydelige felt eller trygt verifiserte statuskoder.

Ikke utled docked/charging bastant fra `latestStatus=12` ennå.

## 7. Ikke implementert

Ingen robotkommandoer er implementert.

Ikke implementert:

- dock
- return_to_base
- start
- clean
- pause
- maps
- zones
- schedules
- consumables
- automasjoner

Ingen robotkommandoer skal sendes fra Lynell i denne fasen.

## 8. Secrets og sikkerhet

Skal aldri logges eller returneres:

- passord
- token
- authorization headers
- password hash
- full request body
- full response payload
- full device-id

Credentials eies av bridge/env, ikke frontend.

Token-session:

- mottas ved auth
- lagres ikke permanent
- returneres ikke til frontend/API

## 9. Arkitekturvalg

Home Assistant beholdes som optional compatibility bridge.

Native `dreameCloud` er premium-retningen for Dream/Dreame D20 Plus i Lynell.

HA skal fortsatt omtales som:

- compatibility bridge
- optional bridge
- test/fallback-retning

Ikke som permanent hovedmotor for robotintegrasjon.

## 10. Verifisert

Verifisert OK:

- `npm run build`
- `node --check bridge/dreame-cloud-runtime.mjs`
- `node --check bridge/vacuum-runtime.mjs`
- `node --check bridge/server.mjs`

## 11. Neste anbefalte fase

Neste fase: Dreame manual state observation.

Observer `latestStatus` mens roboten:

- står i dock
- lader
- rengjør manuelt startet fra Dreame app
- returnerer til dock manuelt fra Dreame app

Viktig:

- Ikke send kommandoer fra Lynell ennå.
- Ikke implementer dock/start/clean før statuskodene er bedre forstått.
- Ikke map `latestStatus=12` hardt før den er bekreftet.
- Bruk Dreame appen manuelt for observasjon av fysiske tilstander.

## 12. Ikke gjør videre uten eksplisitt valg

- Ikke implementer robotkommandoer.
- Ikke implementer dock/return_to_base.
- Ikke implementer start/clean.
- Ikke bygg maps, zones, schedules eller consumables.
- Ikke bygg automasjoner.
- Ikke eksponer credentials/token/full device-id.
- Ikke endre KNX runtime.
- Ikke endre KNX write-path.
