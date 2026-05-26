# Lynell Checkpoint v2.4 - Dreame Native Auth + Device Success

Dato: 2026-05-16

Formål: dokumentere første ekte status-only runtime-milepæl for native Dreame cloud-adapteren, slik at videre arbeid ikke forveksler live status, foundation og fysiske robotkommandoer.

Bruk dette sammen med:

- `lynell_checkpoint_v2.md`
- `lynell_checkpoint_v2_2_integrations.md`
- `lynell_checkpoint_v2_3_dreame_native_foundation.md`
- `dreame_native_adapter_research.md`

## 1. Milepæl

Dreame native cloud adapter har nå passert første ekte status-only runtime-milepæl.

Bekreftet:

- DreameHome auth fungerer med:
  - `LYNELL_DREAME_AUTH_PROFILE="explicit-form-urlencoded"`
  - `LYNELL_DREAME_SELECTED_CLIENT="dreameHomeReverseEngineered"`
- Token-session mottas.
- Token lagres ikke permanent.
- Token returneres ikke til frontend eller API.
- Device-list fungerer.
- Korrekt device-list path er:
  - `data.page.records`
- Normalisert device count er `1`.
- `dreameCloud` er koblet inn som status-provider i `bridge/vacuum-runtime.mjs`.
- `/api/vacuum/status` kan vise:
  - `enabled=true`
  - `provider=dreameCloud`
  - `connected=true`
  - `state=connected`

Dette er fortsatt kun status-only.

## 2. Status og begrensninger

Alt under er fortsatt eksplisitt ikke implementert:

- robotkommandoer
- start cleaning
- pause
- dock / return_to_base
- maps
- zones
- schedules
- consumables
- automasjoner

Ingen robotkommandoer er sendt i denne milepælen.

Første fremtidige safe command skal være:

- `dock` / `return_to_base`

Ikke:

- `start`
- `clean`
- room cleaning
- zone cleaning

Start/clean skal vente til status-only har vært stabilt og device/status mapping er verifisert over tid.

## 3. Arkitekturstatus

### Native Dreame cloud

- `dreameCloud` er nå den native premium-retningen for Dream/Dreame D20 Plus.
- Adapteren er reverse-engineered og skal fortsatt merkes:
  - `experimental`
  - `unstable`
  - `reverseEngineered`
- Runtime mode er fortsatt `status-only`.
- Credentials eies av bridge/env, ikke frontend.
- Frontend/API skal aldri motta passord, token, full request body eller full device-id.

### Home Assistant bridge

Home Assistant beholdes som optional compatibility bridge.

HA er nyttig for:

- praktisk test
- fallback
- kompatibilitet

HA er ikke premium-sluttretningen for native robot-runtime.

## 4. Test-env

Status-only Dreame test kan kjøres med:

```powershell
$env:LYNELL_VACUUM_ENABLED="true"
$env:LYNELL_VACUUM_PROVIDER="dreameCloud"

$env:LYNELL_DREAME_CLOUD_ENABLED="true"
$env:LYNELL_DREAME_EXPERIMENTAL_LOGIN="true"
$env:LYNELL_DREAME_SELECTED_CLIENT="dreameHomeReverseEngineered"
$env:LYNELL_DREAME_AUTH_PROFILE="explicit-form-urlencoded"
$env:LYNELL_DREAME_REGION="eu"
$env:LYNELL_DREAME_COUNTRY="NO"

$env:LYNELL_DREAME_USERNAME="DREAME_ACCOUNT_EMAIL_OR_PHONE"
$env:LYNELL_DREAME_PASSWORD="DREAME_PASSWORD"

# Optional diagnostics. Sanitert output only.
$env:LYNELL_DREAME_DEVICE_LIST_DEBUG="true"
$env:LYNELL_DREAME_AUTH_DEBUG="true"
```

Viktig:

- Ikke hardkod ekte credentials i repo.
- Ikke committ lokale scripts med ekte username/password.
- Ikke aktiver auth/device-list debug med forventning om full payload; debug skal være sanitert.

## 5. Verifisert

Kode/syntaks/build:

- `npm run build` OK
- `node --check bridge/dreame-cloud-runtime.mjs` OK
- `node --check bridge/vacuum-runtime.mjs` OK
- `node --check bridge/server.mjs` OK

Dreame cloud endpoint:

- `/api/dreame-cloud/connect`
  - login `200`
  - device-list `200`
  - `connected=true`
  - `deviceCount=1`
  - device-list path: `data.page.records`
  - token-session mottatt, ikke lagret permanent, ikke returnert til frontend/API

Vacuum runtime endpoint:

- `/api/vacuum/status`
  - `enabled=true`
  - `provider=dreameCloud`
  - `connected=true`
  - `state=connected`
  - kan vise normalisert device name/model
  - kan vise online/status, battery, docked og charging hvis feltene er tilgjengelige

## 6. Secrets og logging

Skal aldri logges eller returneres:

- passord
- token
- authorization headers
- password hash
- full request body
- full response payload
- full device-id

Tillatt sanitert output:

- `hasCredentials=true/false`
- `selectedRegion`
- `selectedClient`
- `authProfile`
- `targetDeviceIdConfigured=true/false`
- `deviceCount`
- masked device identifiers
- top-level keys
- array paths
- candidate field names
- status/code/message når det er trygt

## 7. NIVA og UI-sannhet

NIVA og UI skal beskrive dette som:

- native Dreame cloud status-only er live når runtime bekrefter `connected=true`
- robotkommandoer er ikke aktivert
- adapteren er experimental/unstable/reverse-engineered
- HA er optional bridge, ikke nødvendig for native-retningen
- credentials ligger i bridge/env, ikke frontend

NIVA skal ikke si at roboten fysisk startes, pauses eller sendes til lading før en fremtidig kommando-fase er eksplisitt implementert.

## 8. Neste anbefalte fase

Neste fase: Dreame status refinement v1.0.

Mål:

- bedre mapping av `battery`
- bedre mapping av `docked`
- bedre mapping av `charging`
- bedre mapping av `online`
- bedre mapping av `statusText`
- bedre mapping av `lastUpdatedAt`
- refresh/sync-stabilisering
- fortsatt status-only

Mulig testfokus:

- sammenligne rå candidate field names mot normalisert Lynell-status
- bekrefte hvilke felter som faktisk finnes for Dream/Dreame D20 Plus
- verifisere om charging/docked må utledes fra statusText eller egne felter
- sikre at `/api/vacuum/status` ikke forsøker kommandoer

## 9. Ikke gjør videre uten eksplisitt valg

- Ikke implementer robotkommandoer i native adapter ennå.
- Ikke implementer `dock` før status refinement er stabil.
- Ikke implementer `start`/`clean` før `dock` er testet trygt.
- Ikke bygg maps, zones, schedules eller consumables.
- Ikke bygg automasjoner.
- Ikke eksponer credentials/token/full device-id.
- Ikke fjern Home Assistant compatibility bridge.
- Ikke endre KNX runtime.
- Ikke endre KNX write-path.
