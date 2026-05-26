# Lynell Home Server

Kort oppsett for å kjøre Lynell fast fra en Windows-PC/laptop på hjemmenettet og åpne appen fra mobil.

## Production Mode

Kjør dette fra prosjektmappen på server-PC-en:

```powershell
npm run build
```

Dette lager produksjonsfilene i `dist`. Det er `dist` som skal serveres i fast drift.

## Enkel Startpakke På Windows

Prosjektet har enkle PowerShell-scripts i `scripts` for manuell serverstart uten å installere Windows Service.

Start hele Lynell med ett script:

```powershell
.\scripts\start-lynell-server.ps1
```

Dette åpner to egne PowerShell-vinduer:

- ett vindu for bridge på port `8787`
- ett vindu for frontend på port `3000`

Hvis `dist` mangler, kjører frontend-scriptet `npm run build` før det starter static server.
Scriptet skriver tydelig status i konsollen:

- `Lynell startet`
- `Bridge startet`
- `Frontend startet`

Hvis bridge eller frontend feiler, blir feilen vist i vinduet og vinduet blir stående åpent. Det gjør at Lynell ikke feiler stille ved oppstart.

Du kan også starte delene hver for seg:

```powershell
.\scripts\start-bridge.ps1
.\scripts\start-frontend.ps1
```

## Anbefalt Live Mode: Dreame + Cast

For live-test med native Dreame status-only og Cast discovery/playback foundation, bruk ett samlet script:

```powershell
.\scripts\start-live-dreame-cast.ps1
```

Scriptet setter bridge-sessionen opp for:

- `Live Mode`
- native Dreame provider: `dreameCloud`
- Dreame cloud status-only med `dreameHomeReverseEngineered`
- Cast og Cast discovery
- bridge på `http://localhost:8787`

Scriptet hardkoder aldri e-post eller passord. Hvis `LYNELL_DREAME_USERNAME` eller `LYNELL_DREAME_PASSWORD` mangler, spør scriptet i terminalen. Passord skrives ikke tilbake til console og settes bare som process-env for denne bridge-sessionen.

For full Dreame status-only må disse være satt eller fylles inn når scriptet spør:

```powershell
$env:LYNELL_DREAME_USERNAME="DREAME_ACCOUNT_EMAIL_OR_PHONE"
$env:LYNELL_DREAME_PASSWORD="DREAME_PASSWORD"
```

Scriptet setter disse runtime-verdiene automatisk hvis de mangler:

```text
LYNELL_SYSTEM_MODE=live
LYNELL_RUNTIME_MODE=live
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

Valgfritt:

```text
LYNELL_DREAME_DEVICE_ID
LYNELL_DREAME_AUTH_DEBUG=true
LYNELL_DREAME_DEVICE_LIST_DEBUG=true
LYNELL_CAST_MEDIA_HOST
```

Eldre scripts beholdes som smalere testflyter:

- `scripts/start-bridge.ps1` generisk bridge-start
- `scripts/start-cast-discovery-bridge.ps1` legacy Cast-only discovery-test
- `scripts/start-vacuum-ha-bridge.ps1` legacy Home Assistant compatibility-test

## Start Bridge

Åpne ett terminalvindu og start Lynell bridge:

```powershell
npm run bridge
```

Eller bruk script:

```powershell
.\scripts\start-bridge.ps1
```

Bridge kjører på port `8787` og venter på runtime-config fra appen. KNX-runtime, connection mode og write mapping styres fortsatt av Lynell/SystemConfig.

## Dreame Cloud Status-Only Foundation

Native Dreame cloud er klargjort som status-only foundation. Den gjør ingen login ennå, og sender aldri start/pause/dock/clean til roboten før et konkret bibliotek/metode er valgt og testet.

### Env-template

Sett env i samme PowerShell-vindu som bridge startes fra:

```powershell
$env:LYNELL_DREAME_CLOUD_ENABLED="true"
$env:LYNELL_DREAME_USERNAME="DREAME_ACCOUNT_EMAIL_OR_PHONE"
$env:LYNELL_DREAME_PASSWORD="DREAME_PASSWORD"
$env:LYNELL_DREAME_REGION="eu"
$env:LYNELL_DREAME_SELECTED_CLIENT="dreameHomeReverseEngineered"
$env:LYNELL_DREAME_AUTH_PROFILE="explicit-form-urlencoded" # optional parity profile
$env:LYNELL_DREAME_AUTH_DEBUG="true" # optional, viser kun saniterte auth diagnostics
$env:LYNELL_DREAME_DEVICE_LIST_DEBUG="true" # optional, viser kun sanitert device-list struktur
$env:LYNELL_DREAME_DEVICE_ID="" # optional, settes senere hvis device list finner flere roboter
npm run bridge
```

Viktig:

- Ikke legg ekte passord i repo eller dokumentasjon.
- Bridge logger aldri username, password eller token.
- Status viser bare `hasCredentials=true/false`.
- `LYNELL_DREAME_DEVICE_ID` er valgfri til status-only device matching senere.
- `LYNELL_DREAME_SELECTED_CLIENT` må settes til `dreameHomeReverseEngineered` før eksperimentell login/device-list kan forsøkes.
- `LYNELL_DREAME_AUTH_PROFILE=tasshack-compatible` legger på én isolert parity-endring mot referansene: eksplisitt `host` header.
- `LYNELL_DREAME_AUTH_PROFILE=explicit-form-urlencoded` beholder samme headers/hash/body keys, men serialiserer body eksplisitt i fast URL-encoded key order.
- `LYNELL_DREAME_AUTH_DEBUG=true` viser bare saniterte diagnostics: auth stage, endpoint category, response status og klassifisering. Det viser aldri headers, body, username, password, token eller device-id.
- `LYNELL_DREAME_DEVICE_LIST_DEBUG=true` viser bare sanitert device-list struktur hvis device-list svarer: top-level keys, array paths, count-kandidater, navn/modell-kandidater, maskerte id-er og online/status-kandidater.

### Test status uten robotkommando

```powershell
Invoke-RestMethod -Uri "http://localhost:8787/api/dreame-cloud/status"
```

Hvis env er komplett kan du teste foundation-connect. Dette gjør fortsatt ikke login:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8787/api/dreame-cloud/connect" `
  -ContentType "application/json" `
  -Body "{}"
```

Forventet status nå:

- `enabled`
- `missingEnv`
- `selectedRegion`
- `hasCredentials`
- `connected=false`
- `deviceCount=0`

## Home Assistant Vacuum Bridge Test

Dream D20 Plus kan testes som første ekte robotintegrasjon via Home Assistant. Dette er en trygg bro: Lynell lagrer ikke token i frontend, og bridge eksponerer bare om token er satt, aldri selve tokenet.

### 1. Lag Long-Lived Access Token i Home Assistant

I Home Assistant:

1. Åpne brukerprofilen din.
2. Gå til `Security` / `Long-Lived Access Tokens`.
3. Velg `Create token`.
4. Gi tokenet et navn, for eksempel `Lynell Vacuum Bridge`.
5. Kopier tokenet én gang og legg det kun i PowerShell-env når du tester.

Ikke legg ekte token i repo, frontend, dokumentasjon eller skjermbilder.

### 2. Finn robotens entity_id

I Home Assistant:

1. Gå til `Settings -> Devices & services -> Entities`.
2. Søk etter robotstøvsugeren eller `vacuum`.
3. Kopier entity ID, for eksempel:

```text
vacuum.dream_d20_plus
```

Alternativt kan du bruke `Developer Tools -> States` og søke etter `vacuum.`.

### 3. Start bridge med HA vacuum aktivert

Sett env i samme PowerShell-vindu som bridge startes fra:

```powershell
$env:LYNELL_VACUUM_ENABLED="true"
$env:LYNELL_VACUUM_PROVIDER="homeAssistantBridge"
$env:LYNELL_HA_BASE_URL="http://homeassistant.local:8123"
$env:LYNELL_HA_TOKEN="PASTE_LONG_LIVED_ACCESS_TOKEN_HERE"
$env:LYNELL_HA_VACUUM_ENTITY_ID="vacuum.dream_d20_plus"
npm run bridge
```

Eller bruk testscriptet:

```powershell
npm run bridge:vacuum-ha
```

Scriptet viser hvilke env-verdier som mangler, men printer aldri token. Du kan enten fylle inn lokale verdier i scriptet under test, eller sette env manuelt i PowerShell før du kjører det.

### 4. Test endepunkter

Start alltid med status:

```powershell
Invoke-RestMethod -Uri "http://localhost:8787/api/vacuum/status"
```

Valider HA-kontakt:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8787/api/vacuum/connect" `
  -ContentType "application/json" `
  -Body "{}"
```

Hent status via kommando-endepunktet:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8787/api/vacuum/command" `
  -ContentType "application/json" `
  -Body '{"command":"status"}'
```

Hvis du vil teste en fysisk kommando først, bruk `dock` før `start`:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8787/api/vacuum/command" `
  -ContentType "application/json" `
  -Body '{"command":"dock"}'
```

Forventede statusmeldinger:

- `Disabled` hvis `LYNELL_VACUUM_ENABLED` ikke er satt til `true`
- `Mangler HA URL`
- `Mangler HA token`
- `Mangler entity ID`
- `Home Assistant svarer ikke stabilt`
- `Robot entity ikke funnet`
- `Kontakt med Home Assistant OK`
- `Live robotstatus aktiv`

NIVA og Manager skal vise samme teststatus uten å avsløre token.

## Cast Discovery Test Readiness

Cast/Google Home discovery er klargjort som bridge-foundation, men er deaktivert som standard og har ingen playback/cast-engine ennå.

Installer discovery-dependency når du er klar for første lokale test:

```powershell
npm install bonjour-service
```

Aktiver Cast discovery i bridge-vinduet før oppstart:

```powershell
$env:LYNELL_CAST_ENABLED="true"
$env:LYNELL_CAST_DISCOVERY_ENABLED="true"
npm run bridge
```

Eller bruk den dedikerte testflyten:

```powershell
npm run bridge:cast
```

Hvis du starter bridge via vanlig script, sett de samme miljøvariablene i terminalen før du kjører scriptet.

Sjekk status:

```text
GET http://localhost:8787/api/cast/status
```

Start manuell discovery:

```text
POST http://localhost:8787/api/cast/discover
```

Playback test-endepunkter finnes for én valgt Cast-enhet og lokal MP3:

```text
GET  http://localhost:8787/api/cast/playback
POST http://localhost:8787/api/cast/play
POST http://localhost:8787/api/cast/pause
POST http://localhost:8787/api/cast/stop
```

Når discovery returnerer flere enheter, velg én konkret `deviceId` fra responsen. Lynell skal ikke auto-velge tilfeldig.

Eksempel på kontrollert MP3-test:

```powershell
$body = @{
  deviceId = "cast-device-id-fra-discovery"
  mediaUrl = "/media/music/filnavn.mp3"
  title = "Lynell Cast test"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8787/api/cast/play" `
  -ContentType "application/json" `
  -Body $body
```

Viktig for lokal media:

- Cast-enheten må kunne nå Lynell server på LAN-IP, ikke `localhost`
- bruk derfor media-URL som peker på server-PC-en, for eksempel:

```text
http://SERVER-IP:8787/media/music/filnavn.mp3
```

- playback-endepunktene er minimal testmodus og lover ikke full stabil casting ennå
- `castv2-client` brukes for første ekte MP3-load til valgt Cast-enhet

Forventet trygg default:

- uten `bonjour-service`: bridge starter fortsatt, men status forklarer at dependency mangler
- uten env aktivert: `/api/cast/status` svarer disabled
- discovery finner eventuelle Google Home/Chromecast/TV-enheter på LAN
- hvis ingen enheter finnes innen discovery-timeout, svarer endpointet kontrollert med tom enhetsliste
- playback forsøker bare valgt enhet og lokal MP3, og feiler kontrollert hvis Cast-enheten ikke når LAN-URL-en

## Start Frontend Static Server

Åpne et annet terminalvindu og server produksjonsbygget på LAN:

```powershell
npx serve dist -l tcp://0.0.0.0:3000
```

Eller bruk script:

```powershell
.\scripts\start-frontend.ps1
```

Dette gjør frontend tilgjengelig fra andre enheter på samme nettverk.

## Windows Firewall

Tillat trafikk på privat nettverk hvis Windows spør.

Porter som må være åpne lokalt:

- `3000` frontend static server
- `8787` Lynell bridge/API

Hvis mobil ikke får kontakt, sjekk først Windows Defender Firewall for disse portene.

## LAN Test

Finn server-PC-ens lokale IP:

```powershell
ipconfig
```

Se etter IPv4-adresse på hjemmenettet, for eksempel:

```text
192.168.86.50
```

Test fra en annen PC på samme nettverk:

```text
http://SERVER-IP:3000
```

Eksempel:

```text
http://192.168.86.50:3000
```

På server-PC-en kan du også teste direkte:

```text
http://localhost:3000
```

Frontend bruker som standard samme host for bridge:

```text
http://SERVER-IP:8787
```

Det betyr at mobil ikke prøver å kontakte `localhost` på telefonen.

## Mobil Test

På telefon på samme Wi-Fi:

```text
http://SERVER-IP:3000
```

Sjekk:

- Lynell åpner uten dev-server.
- PIN-skjerm vises hvis PIN er aktiv.
- Home laster normalt etter opplåsing.
- Live/Simulate kan leses i status.
- `Manager -> Drift -> Diagnose` viser `Bridge reachable = Ja`.
- Diagnose viser at bridge URL peker på `http://SERVER-IP:8787`.
- Lys/Klima-flater er trykkbare på mobil.

Hvis Diagnose viser at appen er åpnet, men bridge ikke svarer:

- sjekk at `start-bridge.ps1` eller `npm run bridge` kjører
- sjekk Windows Firewall for port `8787`
- sjekk at telefonen er på samme nettverk som server-PC-en

## Ekstern Tilgang Via Tailscale

Anbefalt ekstern tilgang er VPN/Tailscale. Ikke åpne port `3000` eller `8787` direkte mot internett.

Lynell er lokal-first: frontend og bridge skal fortsatt kjøre på server-PC-en i hjemmet. Tailscale gir telefonen/PC-en en trygg privat vei inn til samme maskin uten cloud-backend i Lynell.

Enkel fremgangsmåte:

1. Installer Tailscale på Lynell server-PC-en.
2. Logg inn med samme Tailscale-konto som skal brukes på mobil/ekstern PC.
3. Installer Tailscale på mobilen.
4. Kontroller serverens Tailscale-navn eller Tailscale-IP i Tailscale-appen/admin.
5. Åpne Lynell fra mobil via:

```text
http://TAILSCALE-HOSTNAME:3000
```

Eksempler:

```text
http://lynell-server:3000
http://100.x.y.z:3000
```

Bridge følger samme host som frontend i standardoppsettet:

```text
http://TAILSCALE-HOSTNAME:8787
```

I Lynell kan `Manager -> Bolig -> Nettverk` brukes til å lagre:

- lokal app-host og port
- VPN/Tailscale host og port
- foretrukket tilgang: Lokal eller VPN

`Manager -> Drift -> Diagnose` viser om appen kjører via lokal host eller VPN-host, aktiv bridge URL og om VPN-konfig er klar.

Sikkerhetsregel:

- Ikke port-forward frontend eller bridge i ruteren.
- Ikke eksponer `8787` åpent på internett.
- Bruk Tailscale/VPN for ekstern tilgang.
- PIN i Lynell er lokal app-sikring, ikke erstatning for VPN.

## PIN Test

Standard PIN i første lokale versjon:

```text
1234
```

Test:

- Åpne appen fra mobil.
- Tast PIN.
- Refresh siden: appen skal normalt fortsatt være åpen i samme browser-session.
- Lukk browser/session og åpne på nytt: appen kan kreve PIN igjen når `Lås ved ny session` er aktiv.
- Endre PIN senere i `Manager -> Drift / Avansert -> Lokal PIN`, og trykk `Lagre endringer`.

Dette er enkel lokal tilgangssikring for LAN. Det er ikke full sikkerhet for eksponering mot internett.

## Stoppe Serveren

Stopp Lynell manuelt ved å gå til hvert PowerShell-vindu og trykke:

```text
Ctrl+C
```

Lukk deretter vinduet. Bridge og frontend kjører ikke som Windows Service i denne versjonen.

## Autostart Ved Reboot

Dette er første enkle "alltid på"-oppsett. Lynell installeres ikke som Windows Service ennå. Velg én av metodene under.

### Alternativ A: Startup Folder

Dette er enklest for en dedikert server-PC der brukeren logger inn automatisk.

1. Trykk `Win + R`.
2. Skriv:

```text
shell:startup
```

3. Trykk Enter.
4. Lag en snarvei i Startup-mappen.
5. Sett snarveiens mål til:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "C:\FULL\PATH\TO\lynell-home\scripts\start-lynell-server.ps1"
```

Eksempel:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "C:\Users\perchristian.e\OneDrive - Instell\Skrivebord\lynell-home\scripts\start-lynell-server.ps1"
```

6. Restart PC-en.
7. Etter innlogging skal to PowerShell-vinduer åpnes:

- Lynell bridge
- Lynell frontend

### Alternativ B: Task Scheduler

Dette er ryddigere for fast serverdrift.

1. Åpne `Task Scheduler`.
2. Velg `Create Task...`.
3. Gi oppgaven navn:

```text
Lynell Home Server
```

4. Under `Triggers`, legg til:

```text
At log on
```

5. Under `Actions`, velg `Start a program`.
6. Program/script:

```text
powershell.exe
```

7. Arguments:

```powershell
-ExecutionPolicy Bypass -File "C:\FULL\PATH\TO\lynell-home\scripts\start-lynell-server.ps1"
```

8. Start in:

```text
C:\FULL\PATH\TO\lynell-home
```

9. Lagre oppgaven.
10. Høyreklikk oppgaven og velg `Run` for å teste.

Anbefaling: Start med `At log on`. `At startup` kan brukes senere, men krever mer bevissthet rundt brukerrettigheter, nettverk og hvor PowerShell-vinduene skal kjøre.

## Autostart Test

Etter at Startup folder eller Task Scheduler er satt opp:

1. Restart server-PC-en.
2. Logg inn på Windows hvis oppsettet bruker `At log on`.
3. Kontroller at bridge-vinduet viser at port `8787` kjører.
4. Kontroller at frontend-vinduet viser at `serve` kjører på port `3000`.
5. Åpne på server-PC:

```text
http://localhost:3000
```

6. Åpne fra telefon på samme Wi-Fi:

```text
http://SERVER-IP:3000
```

7. Gå til `Manager -> Drift / Avansert -> Diagnose`.
8. Sjekk:

- `Bridge reachable = Ja`
- `Runtime config mottatt = Ja`
- bridge URL peker på `http://SERVER-IP:8787`

Hvis telefonen åpner appen, men Diagnose sier at bridge ikke svarer, sjekk:

- bridge-vinduet kjører
- Windows Firewall tillater port `8787`
- telefon og server-PC er på samme nettverk

## PWA / Hjemskjerm

Lynell har enkel PWA-forberedelse:

- manifest
- appnavn `Lynell`
- theme color
- ikon-placeholder
- enkel service worker

På mobil kan du teste `Legg til på hjemskjerm` fra nettlesermenyen.

## Hvis Bridge Kjører På Annen Maskin

Bygg frontend med eksplisitt bridge-adresse:

```powershell
$env:VITE_BRIDGE_BASE_URL="http://BRIDGE-IP:8787"
npm run build
```

Deretter serveres `dist` som vanlig.

## Neste Steg

- Autostart som Windows Service senere, hvis Lynell skal kjøre uten innlogget bruker.
- Tailscale/VPN for trygg fjernaksess.
- Config backup/restore.
- PIN/login videreutvikling.
- PWA/native app senere.
