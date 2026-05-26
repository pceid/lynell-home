# Lynell Checkpoint v2.3 - Dreame Native Cloud Foundation

Dato: 2026-05-16

Formål: dokumentere status etter første native Dreame cloud foundation for Dream/Dreame D20 Plus, slik at videre arbeid ikke blander foundation, testklarhet og ekte live-integrasjon.

## 1. Status nå

Native Dreame cloud-retningen er startet som status-only foundation.

Opprettet foundation:

- `bridge/dreame-cloud-runtime.mjs`
- `GET /api/dreame-cloud/status`
- `POST /api/dreame-cloud/connect`
- frontend API-typer/funksjoner i `src/api/homeApi.ts`
- researchnotat: `dreame_native_adapter_research.md`

Dette er ikke en live robotintegrasjon ennå.

## 2. Viktig sannhet

- Ingen Dreame cloud-login er implementert.
- Ingen device list hentes ennå.
- Ingen status hentes fra Dreame cloud ennå.
- Ingen robotkommandoer sendes.
- `connect` betyr kun readiness/status-only foundation, ikke ekte tilkobling.
- Dream/Dreame D20 Plus er ikke native-koblet ennå.

## 3. Env-template

Planlagt env for senere status-only test:

```powershell
$env:LYNELL_DREAME_CLOUD_ENABLED="true"
$env:LYNELL_DREAME_USERNAME="DREAME_ACCOUNT_EMAIL_OR_PHONE"
$env:LYNELL_DREAME_PASSWORD="DREAME_PASSWORD"
$env:LYNELL_DREAME_REGION="eu"
$env:LYNELL_DREAME_SELECTED_CLIENT="dreameHomeReverseEngineered"
$env:LYNELL_DREAME_DEVICE_ID="" # optional
```

Støttet fallback/legacy env finnes fortsatt for kompatibilitet:

- `LYNELL_DREAME_CLOUD_REGION`
- `LYNELL_DREAME_CLOUD_USERNAME`
- `LYNELL_DREAME_CLOUD_PASSWORD`
- `LYNELL_DREAME_CLOUD_DEVICE_ID`
- `LYNELL_DREAME_CLOUD_CLIENT`
- `LYNELL_VACUUM_DREAME_REGION`
- `LYNELL_VACUUM_DREAME_USERNAME`
- `LYNELL_VACUUM_DREAME_PASSWORD`

## 4. Safe logging og credentials

Bridge skal aldri logge eller eksponere:

- username
- password
- token
- fremtidige refresh tokens

Status/logg viser kun trygge indikatorer:

- `hasCredentials=true/false`
- `selectedRegion`
- `targetDeviceIdConfigured=true/false`
- `selectedClient`

Frontend og API payload skal ikke inneholde passord eller token.

## 5. Statusfelter

Dreame cloud status foundation viser:

- `enabled`
- `state`
- `configured`
- `missingEnv`
- `selectedRegion`
- `hasCredentials`
- `connected`
- `deviceCount`
- `config`
- `adapterContract`
- `researchSources`
- `devices`
- `selectedDevice`
- `lastSyncAt`
- `error`
- `message`

Forventet nå:

- disabled uten env
- missing-env hvis aktivert men ufullstendig
- ready-for-status-only-test hvis env er komplett
- `connected=false`
- `deviceCount=0`

## 6. Adapter contract

Provider: `dreameCloud`

Nåværende fase:

- research
- adapter-kontrakt
- env/readiness
- status-only foundation

Tillatt nå:

- lese readiness
- vise manglende env
- dokumentere auth/device-list/status mapping
- forberede senere status-only test

Eksplisitt ikke tillatt nå:

- start cleaning
- pause
- dock
- room cleaning
- zone cleaning
- map operations
- schedules
- cloud command execution

## 7. Home Assistant bridge

Home Assistant er fortsatt optional compatibility bridge.

HA kan brukes som første praktiske live-testbro for robotstatus og kommandoer når HA-env er satt, men dette er ikke Lynells premium-sluttretning.

Langsiktig retning:

- native Lynell runtime der det er trygt og stabilt
- `dreameCloud` som mulig native cloud provider
- HA som bro/kompatibilitet, ikke hovedmotor

## 8. Neste steg

Neste tekniske valg må være metodevalg for:

- auth/login
- regionhåndtering
- device list
- device id matching
- Dream/Dreame D20 Plus modellidentifikasjon
- statusfelter: status, battery, docked, charging, error

Mulige research-retninger:

- Tasshack/dreame-vacuum som protokoll-/HA-referanse
- ioBroker Dreame/DreameHome-adaptere som device-state referanse
- node/DreameHome-client hvis en trygg og vedlikeholdt metode finnes
- python-miio/lokal token-retning kun hvis modellen faktisk støtter det

## 9. Kommando-rekkefølge senere

Første fremtidige fysiske kommando skal være:

1. dock / return_to_base

Ikke:

- start cleaning
- room cleaning
- zone cleaning

Start cleaning kommer først etter at status-only har vært stabilt og device mapping er verifisert.

## 10. Ikke gjør videre uten eksplisitt valg

- Ikke implementer Dreame cloud login blindt.
- Ikke installer tilfeldig robotbibliotek uten metodevalg.
- Ikke send fysiske kommandoer fra native adapter ennå.
- Ikke lat som native Dreame er live.
- Ikke eksponer credentials i frontend/API/logg.
- Ikke fjern Home Assistant bridge.
- Ikke rør KNX runtime eller KNX write-path.
