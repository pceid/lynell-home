# Lynell Checkpoint v3.8 - Language Cleanup and Live Startup

## Status

P0-rydding fra helgetest er gjennomført.

Denne runden ryddet de første mest synlige friksjonspunktene etter mobil-/helgetest:

- overbruk av ordet `rolig` i NIVA, atmosfære, readiness, runtime og Manager er redusert
- `rolig` beholdes kun der det er semantisk riktig, for eksempel rolig musikk-intent
- Live-start for Dreame + Cast er samlet i ett anbefalt script
- ingen runtime-adferd ble endret

## NIVA Language Cleanup

`Rolig` skal fortsatt være et tone- og designprinsipp i Lynell, men ikke et ord som repeteres i UI og NIVA-svar.

Eksempler på ny mikrotekst:

- `Noen signaler trenger oppfølging`
- `Hjemmet virker stabilt`
- `Jevnlig oppdatert`
- `Det er lite aktivitet`

Eksempler på områder som er ryddet:

- NIVA home atmosphere
- readiness/status-linjer
- runtime contract summaries
- Manager Diagnose / Runtime Insight
- Home/NIVA mikrotekst
- presence/comfort/memory-språk der `rolig` var brukt som fyllord

Beholdt bruk:

- rolig musikk-intent
- eksisterende media-spor som heter `Rolig hus`
- intent matching der bruker faktisk spør om huset er rolig

## Nytt Live Startup-Script

Ny fil:

- `scripts/start-live-dreame-cast.ps1`

Scriptet:

- starter bridge for Live Mode
- aktiverer native `dreameCloud` status-only
- bruker Dreame experimental login-profile
- aktiverer Cast discovery
- leser `LYNELL_DREAME_USERNAME` / `LYNELL_DREAME_PASSWORD` fra env eller spør interaktivt
- skriver ikke passord tilbake til console
- setter passord kun som process-env for gjeldende bridge-session

## Env / Defaults

Scriptet setter disse verdiene hvis de mangler:

```text
LYNELL_VACUUM_ENABLED=true
LYNELL_VACUUM_PROVIDER=dreameCloud
LYNELL_DREAME_CLOUD_ENABLED=true
LYNELL_DREAME_EXPERIMENTAL_LOGIN=true
LYNELL_DREAME_SELECTED_CLIENT=dreameHomeReverseEngineered
LYNELL_DREAME_AUTH_PROFILE=explicit-form-urlencoded
LYNELL_DREAME_REGION=eu
LYNELL_DREAME_COUNTRY=NO
LYNELL_CAST_ENABLED=true
LYNELL_CAST_DISCOVERY_ENABLED=true
```

Credentials:

```text
LYNELL_DREAME_USERNAME
LYNELL_DREAME_PASSWORD
```

Disse leses fra eksisterende PowerShell-env hvis de finnes. Hvis ikke spør scriptet interaktivt.

## Dokumentasjon

`SERVER_SETUP.md` er oppdatert med anbefalt Live Mode-start.

Gamle scripts er beholdt som smalere/legacy testflyter:

- `start-bridge.ps1`
- `start-cast-discovery-bridge.ps1`
- `start-vacuum-ha-bridge.ps1`

## Ikke Rørt

Denne runden endret ikke:

- Dreame runtime behavior
- Cast runtime behavior
- KNX write-path
- robotkommandoer
- automasjoner
- AI/ML
- backend/database

## Verifisert

- `npm run build` OK
- PowerShell syntax check for nytt script OK
- `node --check bridge/server.mjs` OK

## Neste Anbefalte Fase

1. Teste nytt script i praksis.
2. Starte P0 server/source-of-truth plan.
3. Starte uavhengig historikklogging som ikke avhenger av aktiv app-view.

