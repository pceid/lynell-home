# Dreame Native Cloud Adapter Research v0

Dato: 2026-05-16

Formål: starte native Dreame/Dream D20 Plus-adapter som research og bridge-foundation, uten fysisk robotkommando.

## Status

- Lynell har nå en isolert foundation-modul: `bridge/dreame-cloud-runtime.mjs`.
- Modulen er disabled by default.
- Den eksponerer kun status/kontrakt via bridge:
  - `GET /api/dreame-cloud/status`
  - `POST /api/dreame-cloud/connect`
- `connect` gjør ikke cloud-login ennå. Den validerer kun at env er komplett og svarer at adapteren er klar for senere status-only test.
- Ingen start/pause/dock/clean-kommandoer er implementert.

## Env og credential-behov

Planlagt env for native Dreame cloud:

- `LYNELL_DREAME_CLOUD_ENABLED=false`
- `LYNELL_DREAME_USERNAME=`
- `LYNELL_DREAME_PASSWORD=`
- `LYNELL_DREAME_REGION=`
- `LYNELL_DREAME_SELECTED_CLIENT=dreameHomeReverseEngineered`
- `LYNELL_DREAME_AUTH_PROFILE=lynell-default`
- `LYNELL_DREAME_AUTH_DEBUG=false`
- `LYNELL_DREAME_DEVICE_ID=` optional
- `LYNELL_DREAME_CLOUD_ACCOUNT_TYPE=dreamehome`

Fallback/legacy env fra eksisterende vacuum foundation leses også for kompatibilitet:

- `LYNELL_DREAME_CLOUD_REGION`
- `LYNELL_DREAME_CLOUD_USERNAME`
- `LYNELL_DREAME_CLOUD_PASSWORD`
- `LYNELL_DREAME_CLOUD_DEVICE_ID`
- `LYNELL_DREAME_CLOUD_CLIENT`
- `LYNELL_VACUUM_DREAME_REGION`
- `LYNELL_VACUUM_DREAME_USERNAME`
- `LYNELL_VACUUM_DREAME_PASSWORD`

Secrets-policy:

- Passord skal aldri logges.
- Passord/token skal aldri sendes til frontend.
- Username skal ikke logges; status viser kun `hasCredentials`.
- Auth debug skal kun vise stage, endpoint-kategori, responsstatus og klassifisering.
- Auth debug skal aldri vise headers, body, username, password, token eller device-id.
- Fremtidige refresh tokens må holdes server-side.
- Frontend skal bare se boolean-felter som `passwordConfigured`.

## Adapter contract

Provider: `dreameCloud`

Fase 1:

- research
- adapter-kontrakt
- env/readiness
- device/status-feltmodell

Fase 2:

- disabled foundation provider
- status endpoint
- ingen fysisk kommando

Fase 3 senere:

- status-only login/connect hvis env er komplett og dependency er valgt
- hent device list
- identifiser Dream/Dreame D20 Plus
- les status/battery/docked
- ingen kommandoer

Fase 4 senere:

- første safe command: dock/return_to_base
- start cleaning først etter stabil status over tid

## Device list contract

Fremtidig device list bør normaliseres til:

- `deviceId`
- `did` hvis API bruker Mi/Dreame-id
- `name`
- `model`
- `mac` hvis tilgjengelig
- `region`
- `localIp` hvis tilgjengelig
- `firmwareVersion`
- `roomOrHomeName`

Matching:

- Bruk eksplisitt `LYNELL_DREAME_DEVICE_ID` først.
- Hvis ikke satt, finn kandidat med navn/modell som matcher D20/D20 Plus.
- Ikke auto-velg device for fysiske kommandoer.

## Status fields

Første status-only mapping bør dekke:

- `status`
- `battery`
- `docked`
- `charging`
- `cleaning`
- `paused`
- `returning`
- `errorState`
- `fanSpeed`
- `waterLevel`
- `cleanedArea`
- `cleaningTime`
- `lastUpdatedAt`

Lynell-normalisert status:

- `idle`
- `cleaning`
- `paused`
- `returning`
- `docked`
- `charging`
- `error`
- `unavailable`

## Research-kilder

### Tasshack/dreame-vacuum

Kilde: https://github.com/Tasshack/dreame-vacuum

Relevans:

- Moden Home Assistant-integrasjon for Dreame robotstøvsugere.
- Viser både cloud/lokal konfigurasjon, modellstøtte, statusfelter, services og room/map-funksjoner.
- God protokoll- og feltreferanse, men Lynell skal ikke kopiere HA som sluttarkitektur.

Viktig risiko:

- API/auth kan variere mellom Mi Home, Dreamehome, Mova/Trouver og region.
- Kart/rom/segmenter er et senere tema, ikke v0.

### ioBroker.dreamehome

Kilde: https://github.com/spayrosam/ioBroker.dreamehome

Relevans:

- Dreame Home adapter for ioBroker.
- Dokumenterer cloud connection, token management og MQTT-kommunikasjon med roboten.
- Nyttig for å forstå mulig DreameHome state- og runtime-retning.

Viktig risiko:

- Lisensen er restriktiv. Bruk kun som research/referanse, ikke som kodegrunnlag.
- Ikke bind Lynell til ioBroker-modellen.

### TA2k/ioBroker.dreame

Kilde: https://github.com/TA2k/ioBroker.dreame

Relevans:

- Praktisk Dreame Home device-state og MIoT/custom-command-referanse.
- Nyttig for statusnavn, room cleaning-format og device capability-modell.

Viktig risiko:

- Kommandoformatene skal ikke brukes i Lynell før status-only er stabilt.
- Custom MIoT commands er eksplisitt utenfor v0.

### dreame-mcp / robotics-mcp

Kilde: https://glama.ai/mcp/servers/%40sandraschi/robotics-mcp

Relevans:

- Nevner Dreame D20 Pro som robotplattform og peker mot python-miio/discovery/token-flyt.
- Nyttig som lav-confidence D20/D20 Pro-retning.

Viktig risiko:

- Ikke en ren DreameHome cloud client.
- Må verifiseres mot faktisk Dream/Dreame D20 Plus før den påvirker runtime-valg.

## Method decision

Beslutning per 2026-05-16:

- Lynell bygger egen minimal `dreameCloud` adapter.
- Første live client-strategi er `dreameHomeReverseEngineered`, valgt eksplisitt med `LYNELL_DREAME_SELECTED_CLIENT`.
- `Tasshack/dreame-vacuum` brukes som hovedprotokollreferanse.
- `ioBroker.dreame` og `ioBroker.dreamehome` brukes kun som felt-/flow-referanser.
- Native adapter skal ikke ha runtime dependency på ioBroker, Homebridge eller Home Assistant.
- Home Assistant beholdes som optional compatibility bridge for praktisk fysisk test.
- Node/npm-clients avventes fordi modenhet for DreameHome/D20 Plus er usikker.

Begrunnelse:

- Lynell trenger en premium native runtime som kan forklare state origin, confidence og fallback uten å arve et eksternt systems UI/runtime-modell.
- Tasshack-sporet er mest modent som protokoll- og risiko-referanse, men er Home Assistant/Python-orientert.
- ioBroker-sporene gir nyttig status-/device-feltmodell, men skal ikke bli kode- eller runtime-grunnlag.
- Tilgjengelige Node/npm-spor virker foreløpig enten Mi Home-orienterte, alpha/umodne eller uklare for DreameHome-only D20 Plus.

## Neste tekniske fase

Status-only spike:

1. Login med Dreame credentials og region.
2. Hent device list.
3. Finn Dream/Dreame D20 Plus.
4. Les statusfelter:
   - `status`
   - `battery`
   - `docked`
   - `charging`
   - `error`
5. Normaliser feltene til Lynell vacuum-modell.
6. Send ingen kommandoer.

Status-only spike skal være eksplisitt og trygg:

- ingen start
- ingen pause
- ingen dock
- ingen clean
- ingen map/room/zone-operasjoner
- ingen schedules
- ingen automasjoner

## Dreame status refinement v1.0

Status v1.0 holder native `dreameCloud` strengt status-only, men gjør feltmappingen mer robust.

Primær device-list path beholdes som:

- `data.page.records`

Normalisert device summary kan nå bruke flere feltkandidater for:

- `name`
- `model`
- masked identifier
- `online`
- `battery`
- `docked`
- `charging`
- `statusText`
- `lastUpdatedAt`

Mappingen inkluderer:

- robust boolean-normalisering for online/offline, available/unavailable, true/false og 1/0
- battery fra primitive verdier eller enkle objektformer som `value`, `level` eller `percent`
- docked/charging fra eksplisitte felt når de finnes
- forsiktig utledning av docked/charging fra statusText når eksplisitte felt mangler
- timestamp-normalisering for sekund-/millisekundverdier når mulig
- `statusQuality` med:
  - `quality`
  - `found`
  - `missing`
  - sanitized field `sources`

Sanitert diagnostics kan vise:

- candidate field names
- normalized preview
- masked identifiers
- status quality

Diagnostics skal fortsatt aldri vise:

- token
- password
- password hash
- full request body
- full response payload
- full device-id

`/api/vacuum/status` bruker nå `dreameCloud` som status-provider når `LYNELL_VACUUM_PROVIDER=dreameCloud`, og viser best tilgjengelig Lynell robotstatus fra normalisert Dreame device.

Fortsatt ikke implementert:

- robotkommandoer
- dock
- start/clean
- maps
- zones
- schedules
- consumables
- automasjoner

## Dreame status refinement v1.1

Live status fra `/api/vacuum/status` viste:

- `selectedRobot.name = Vaskepot`
- `model = dreame.vacuum.r2564b`
- `online = true`
- `battery = 87`
- `statusText = "3"`
- `statusText` kom fra `latestStatus`
- `lastUpdatedAt` kom fra `updateTime`
- `docked` og `charging` manglet eksplisitte felt

v1.1 behandler derfor `latestStatus` som statuskode, ikke som område/currentArea.

Foreløpig statuskode-mapping:

- `latestStatus=3`
  - mappes tentativt til `idle` / `Standby / idle`
  - bekrefter ikke `docked`
  - bekrefter ikke `charging`
  - markeres med `statusMappingConfidence=tentative`

Begrunnelse:

- Koden er observert fra live Vaskepot-status der roboten er online og rapporterer normal status.
- Eksisterende status-only-data har ikke nok eksplisitte felt til å slå fast docked/charging.
- Lynell skal derfor vise best mulig status, men fortsatt markere docked/charging som ukjent/manglende når felt ikke finnes.

UI/runtime-konsekvens:

- `/api/vacuum/status` kan vise robotstatus som `idle`.
- `currentArea` skal ikke settes til `"3"`.
- `statusText` kan vises som `Standby / idle`.
- `statusCode` bevarer den saniterte koden `3`.
- `statusMappingNote` forklarer at mappingen er tentativ.

Fortsatt ikke implementert:

- robotkommandoer
- dock / return_to_base
- start/clean
- maps
- zones
- schedules
- consumables
- automasjoner

## Dreame status observation v1.2

Live observasjoner:

- `latestStatus=3` ble observert tidligere.
- `latestStatus=12` er observert senere.
- `latestStatus=12` vises når roboten trolig står idle/docked/standby, men dette er ikke bekreftet.
- Eksplisitte `docked` og `charging` felt mangler fortsatt.

v1.2 legger derfor inn en sanitert in-memory observation log for statuskoder.

Eksponeres trygt via:

- `/api/dreame-cloud/status`
- `/api/dreame-cloud/connect`
- `/api/vacuum/status`

Loggen viser kun:

- statuskode
- antall observasjoner i gjeldende bridge-prosess
- første/siste observasjonstid
- feltkilde, for eksempel `latestStatus`
- tentativ/unknown mapping
- docked/charging hvis sikkert kjent
- sanitert note

Den viser aldri:

- token
- credentials
- full payload
- full device-id

`latestStatus=12` er ikke hardmappet.

Notat for videre test:

- Observer status while docked/charging/cleaning manually from Dreame app before promoting unknown codes to confirmed mapping.

Fortsatt ikke implementert:

- robotkommandoer
- dock
- start/clean
- maps
- zones
- schedules
- consumables
- automasjoner

## Dreame first safe command v1.0 - dock / return_to_base

Første native Dreame kommando er lagt inn som eksplisitt safe-command foundation.

Omfang:

- kun `dock` / `return_to_base`
- kun via `POST /api/vacuum/dock`
- kun når vacuum provider er `dreameCloud`
- ingen UI-knapp eller auto-action
- ingen NIVA/voice-trigger

Sikkerhetsbrytere:

- `LYNELL_DREAME_COMMANDS_ENABLED=true`
- `LYNELL_DREAME_ALLOW_DOCK_COMMAND=true`

Hvis en av disse mangler, feiler kommandoen lukket og sender ingenting.

Command path:

- login med eksisterende DreameHome auth
- hent device-list med eksisterende status-only flow
- velg eksisterende selected device
- hent offentlig `keyDefine`/action metadata hvis device-list oppgir URL
- identifiser dock/charge/return-action fra metadata
- send `POST /dreame-iot-com-10000/device/sendCommand` med `method="action"`

Viktig:

- Dock-action hardkodes ikke for D20 Plus.
- Hvis action metadata ikke identifiserer dock/charge/return sikkert, sendes ingen kommando.
- Full request/response payload logges ikke.
- Full device-id logges eller returneres ikke.
- Token returneres ikke til frontend/API.

Fortsatt ikke implementert:

- start
- pause
- clean
- maps
- zones
- schedules
- consumables
- automasjoner

## Dreame dock metadata inspection v1.1

`POST /api/vacuum/dock` feilet trygt med:

- `safeMode.state = dock-action-not-found`
- ingen kommando sendt
- commands env aktivert

v1.1 legger derfor til metadata-inspection uten kommando:

- `GET /api/vacuum/dock/readiness`

Endpointet:

- logger ikke secrets
- sender ingen robotkommando
- henter keyDefine/action metadata for valgt device
- returnerer saniterte action/service candidates
- viser `siid`/`aiid` bare for action-kandidater
- markerer om kandidat matcher dock/charge/return/base
- velger kun `selectedCandidate` hvis akkurat én sikker kandidat finnes

Returnerer:

- `canAttemptDock`
- `reason`
- `candidates[]`
- `selectedCandidate`
- `safeMode`

Fortsatt ikke implementert:

- start
- pause
- clean
- maps
- zones
- schedules
- consumables
- automasjoner

## Dreame keyDefine structure inspection v1.2

`GET /api/vacuum/dock/readiness?debug=true` utvider readiness med sanitert keyDefine structure inspection.

Debug-return kan vise:

- `metadataInspection.responseType`
- `metadataInspection.topLevelKeys`
- `metadataInspection.payloadIsEmpty`
- `metadataInspection.knownSectionsPresent`
- `metadataInspection.arrayPaths`
- `metadataInspection.candidateStringFields`

Candidate string fields søker kun etter tekst som inneholder:

- dock
- charge
- return
- home
- base
- station
- gocharge
- charger

Debug-return skal fortsatt aldri vise:

- full payload
- token
- credentials
- full device-id

Endpointet sender ingen kommando.

## Auth 400 diagnostics

Ved HTTP 400 fra auth-endepunktet skal Lynell ikke prøve flere auth-varianter automatisk.

Sanitert debug-modus:

- aktiveres med `LYNELL_DREAME_AUTH_DEBUG=true`
- normaliserer kun:
  - auth stage
  - endpoint category
  - response status
  - timeout/network/auth classification
- viser aldri:
  - request headers
  - request body
  - username
  - password
  - password hash
  - token
  - device-id

400 kan skyldes flere forhold som må analyseres før neste forsøk:

- feil eller ufullstendig DreameHome app metadata
- feil app authorization/client identity
- manglende eller feil `dreame-rlc`/fingerprint-lignende verdi
- feil country/locale for konto
- feil region/datacenter for kontoen
- endret password hashing/signature-flow
- DreameHome-konto med sosial login/2FA/captcha-lignende krav

Viktig: Ingen retry-loop, ingen ekstra auth-forsøk og ingen kommandoer skal legges til som del av 400-analysen.

## Auth request parity check

Dato: 2026-05-16

Mål: finne sannsynlige årsaker til `dreame-auth/oauth/token` HTTP 400 uten å sende flere tilfeldige loginforsøk.

Referanser:

- Tasshack/DreameHome discussion: `dreame-auth/oauth/token`, `device/listV2` og DreameHome reverse engineering.
- ioBroker Dreame Home testadapter: EU host, headers, password hash, body keys, token/device-list flow.

| Felt | Lynell nå | Referanse | Avvik | Risiko | Anbefalt endring |
|---|---|---|---|---|---|
| Auth host for EU | `https://eu.iot.dreame.tech:13267` ved `LYNELL_DREAME_REGION=eu` | ioBroker bruker `https://eu.iot.dreame.tech:13267`; Tasshack discussion viser region-host pattern og CN-eksempel | Ingen tydelig avvik for EU-host | Lav, hvis kontoen faktisk ligger i EU. Høy hvis kontoen er bundet til annet datacenter | Behold. Verifiser region mot DreameHome-konto/app-land før flere forsøk |
| Auth path | `/dreame-auth/oauth/token` | Samme path i Tasshack discussion og ioBroker snippets | Ingen | Lav | Behold |
| HTTP method | `POST` | `POST` | Ingen | Lav | Behold |
| Content-Type | `application/x-www-form-urlencoded` | Samme i ioBroker login | Ingen | Lav | Behold |
| Authorization/client id | `Basic ZHJlYW1lX2FwcHYxOkFQXmR2QHpAU1FZVnhOODg=` | Samme Basic client i ioBroker snippets | Ingen tydelig avvik | Middels, fordi client identity kan endres av app-versjon | Behold nå. Ikke roter client id uten ny referanse |
| `tenant-id` | `000000` | `000000` | Ingen | Lav | Behold |
| `dreame-meta` | `cv=i_829` | `cv=i_829` i ioBroker snippets | Ingen mot referansen | Middels, kan være app-version-avhengig | Behold nå. Hvis 400 fortsetter, vurder å undersøke nyere app `cv` før kodeendring |
| `dreame-rlc` | `1a9bb36e6b22617cf465363ba7c232fb131899d593e8d1a1-1` | Samme i ioBroker snippets | Ingen mot referansen | Middels/høy, kan fungere som fingerprint/session/app install identity | Behold nå. Ikke generer random fingerprint uten å forstå flow |
| `dreame-auth` ved login | `bearer` | `bearer` i ioBroker login | Ingen | Lav | Behold |
| `host` header | Default: ikke satt eksplisitt. `tasshack-compatible`: setter eksplisitt `host: <region-host>:13267` | ioBroker/axios snippets setter `host: eu.iot.dreame.tech:13267` | Potensielt avvik i defaultprofil | Lav/middels. Node fetch/undici styrer Host automatisk; eksplisitt Host kan være nærmere axios-paritet | v0.3 legger dette bak `LYNELL_DREAME_AUTH_PROFILE=tasshack-compatible` som eneste protokollparitet-endring |
| Country | Default fra region: `EU` hvis `LYNELL_DREAME_COUNTRY` ikke settes | ioBroker-eksempler bruker konkret land, f.eks. `DE` | Sannsynlig avvik | Høy. Auth/device-list kan være bundet til kontoens land, ikke regionnavnet | Neste trygge endring/test: sett `LYNELL_DREAME_COUNTRY` eksplisitt til faktisk DreameHome-land, f.eks. `NO` eller landet kontoen ble registrert i |
| Locale/lang | Lynell sender `lang=en` | ioBroker-eksempler bruker `lang=de`; device-list viser også `lang` i enkelte snippets | Mulig avvik | Middels. 400 bør normalt ikke skyldes locale alene, men app-flow kan validere country/lang-kombinasjon | Legg senere egen env `LYNELL_DREAME_LANG`, default fra country/app locale, men ikke endre i denne runden |
| Password hash-format | `md5(password + RAylYC%fmSKp7%Tq)` | Samme hash-format i ioBroker snippets | Ingen | Lav/middels. Kan endres med app-versjon | Behold |
| Body: `grant_type` | `password` | `password` | Ingen | Lav | Behold |
| Body: `scope` | `all` | `all` | Ingen | Lav | Behold |
| Body: `platform` | `IOS` | `IOS` | Ingen | Lav | Behold |
| Body: `type` | `account` | `account` | Ingen | Lav | Behold |
| Body: `username` | Sendes, ikke logges | Sendes | Ingen formatmessig, men konto kan være email/phone/internal username | Middels/høy. Sosial login, telefonformat eller app-visningsnavn kan feile | Verifiser at kontoen har vanlig passord-login i DreameHome, ikke bare Google/Apple |
| Body: `password` | Hashet, ikke logges | Hashet med samme salt | Ingen | Lav | Behold |
| Body: `country` | `config.country || region.toUpperCase()` | Konkret landkode, f.eks. `DE` | Sannsynlig hovedavvik hvis country ikke er satt | Høy | Krev/bruk faktisk `LYNELL_DREAME_COUNTRY` før neste live test |
| Body: `lang` | `en` | `de` i ioBroker-eksempler | Mulig avvik | Middels | Dokumenter `LYNELL_DREAME_LANG` som neste kontrollert parity-felt |
| App version/app identity | Hardkodet `Dart/3.2`, `cv=i_829`, Basic client | Samme i ioBroker snippets | Ingen mot disse snippetene | Middels/høy. Nyere DreameHome kan kreve nyere metadata | Ikke endre uten ny referanse fra faktisk app/API |
| Device fingerprint | Kun statisk `dreame-rlc` | ioBroker bruker samme statiske `dreame-rlc`; Tasshack discussion nevner reverse engineering og app-endringer/rooting-friksjon | Mulig utilstrekkelig hvis nyere app krever fingerprint | Middels/høy | Ikke randomiser. Undersøk om nyere DreameHome krever device fingerprint før endring |
| Device-list body | `sharedStatus`, `current`, `size` | ioBroker bruker `sharedStatus`, `current`, `size`; noen snippets også `lang`, `timestamp` | Lite avvik for første device-list | Lav/middels, men først relevant etter auth success | Eventuelt legg til `lang`/`timestamp` senere etter auth er løst |

### Foreløpig parity-konklusjon

Lynell matcher de kjente ioBroker/DreameHome-snippetene på host, path, method, content-type, Basic client, tenant-id, `dreame-meta`, `dreame-rlc`, login body keys og password hash-format.

Det største sannsynlige avviket er `country`.

Lynell faller tilbake til `region.toUpperCase()`, som gir `EU` ved `LYNELL_DREAME_REGION=eu`. Referansene bruker konkret landkode som `DE`, og DreameHome-kontoer ser ut til å være følsomme for valgt country/datacenter. For norsk konto bør neste kontrollerte test bruke faktisk konto-land, sannsynligvis `NO` hvis kontoen ble opprettet i Norge, eller landet som står i DreameHome-appen.

### v0.3 protocol parity fix

Valgt minimal endring:

```powershell
$env:LYNELL_DREAME_AUTH_PROFILE="tasshack-compatible"
```

Effekt:

- gammel/default auth beholdes som `lynell-default`
- `tasshack-compatible` gjør én ting: setter eksplisitt `host` header lik referansesnippetene
- diagnostics viser `authProfile`
- ingen credentials, token, hash, full body eller device-id logges/returneres
- ingen retry-loop
- ingen robotkommandoer

Begrunnelse:

- Country er testet med EU + NO/DE og gir fortsatt 400.
- Host header var eneste konkrete header-paritetsavvik som kunne isoleres uten å endre client id, hash, body eller fingerprint.
- Dette er tryggere enn å endre app authorization, `dreame-meta`, `dreame-rlc` eller password hashing uten ny referanse.

### Anbefalt neste trygge endring etter v0.3

Ikke send flere loginforsøk før env er korrigert:

```powershell
$env:LYNELL_DREAME_REGION="eu"
$env:LYNELL_DREAME_COUNTRY="NO" # eller faktisk konto-land i DreameHome
```

Neste minimale kodeendring, hvis ønsket senere:

- Legg til `LYNELL_DREAME_LANG`.
- Bruk `LYNELL_DREAME_LANG` i login body.
- Vurder å kreve `LYNELL_DREAME_COUNTRY` eksplisitt når `LYNELL_DREAME_EXPERIMENTAL_LOGIN=true`, i stedet for fallback til `EU`.

Ingen auth-request-endring ble gjort i denne parity-runden.

## v0.4 auth parity findings

Kontekst:

- `eu + NO` gir fortsatt HTTP 400 på `dreame-auth/oauth/token`.
- `eu + DE` gir fortsatt HTTP 400 på `dreame-auth/oauth/token`.
- `LYNELL_DREAME_AUTH_PROFILE=tasshack-compatible` med eksplisitt `host` header gir fortsatt HTTP 400.
- Feilen skjer før token og før device-list.

Mål for v0.4:

- ikke sende flere loginforsøk
- ikke legge til retry-loop
- ikke legge til robotkommandoer
- ikke logge credentials, token, hash, full body eller device-id

### Parity funn

| Felt | Lynell nå | Referanse | Funn | Risiko | Vurdering |
|---|---|---|---|---|---|
| Password hash-algoritme | `md5(password + RAylYC%fmSKp7%Tq)` | ioBroker snippets viser samme hash og salt | Matcher referansen | Lav for denne referansen, men app-versjon kan endre flow | Ikke endre uten ny konkret referanse |
| Password format | Hashet passord sendes som hex string | ioBroker sender `.digest('hex')` | Matcher | Lav | Ikke endre |
| Username | Sendes som raw `LYNELL_DREAME_USERNAME` | ioBroker sender `this.config.username` uten synlig transformasjon | Matcher på form, men kontotype kan avvike | Høy hvis kontoen bruker Google/Apple/OTP eller telefonformat som ikke aksepteres av password grant | Neste trygge tiltak er å verifisere at DreameHome-kontoen har vanlig email/phone + passord-login i appen |
| Lowercase/encoding av username | Lynell lowercaser ikke og bruker `URLSearchParams` | Referansen viser raw config username i form-urlencoded data | Ingen sikkert avvik | Middels hvis email case/phone prefix er sensitivt | Ikke endre. Test heller med eksakt login-identitet fra DreameHome |
| Body encoding | `URLSearchParams`, altså form-urlencoded | Referansen bruker axios `data` med `content-type: application/x-www-form-urlencoded` | Sannsynlig parity, men axios kan transformere objekt annerledes avhengig av client | Middels | Mulig neste kodeprofil senere: eksplisitt form-urlencoded string med samme key order. Ikke sikkert nok for v0.4 |
| Body key names | `grant_type`, `scope`, `platform`, `type`, `username`, `password`, `country`, `lang` | Samme i ioBroker snippets | Matcher | Lav | Ikke endre |
| Body key order | URLSearchParams i samme rekkefølge som Lynell-koden | Referanse viser samme rekkefølge i snippet | Matcher nok | Lav/middels | Ikke endre |
| Authorization/client id | `Basic ZHJlYW1lX2FwcHYxOkFQXmR2QHpAU1FZVnhOODg=` | Samme i ioBroker snippets | Matcher | Middels/høy hvis DreameHome har rotert client identity i nyere app | Ikke endre uten ny app capture/referanse |
| `tenant-id` | `000000` | Samme i ioBroker snippets | Matcher | Lav | Ikke endre |
| `dreame-meta` | `cv=i_829` | Samme i ioBroker snippets | Matcher referansen | Middels/høy hvis nyere app krever nyere `cv` | Ikke endre uten ny referanse. Dette er en sannsynlig kandidat hvis kontotype er bekreftet riktig |
| `dreame-rlc` | Statisk `1a9...-1` | Samme i ioBroker snippets | Matcher referansen | Middels/høy hvis rlc er installasjons-/fingerprintbundet eller utløpt | Ikke randomiser. Krever bedre forståelse før endring |
| Device/app fingerprint | Kun statisk `dreame-rlc`; ingen device-id/fingerprint body | Referansene viser statisk `dreame-rlc`, men diskusjoner peker på reverse engineering og app-endringer | Ingen sikkert avvik, men mulig skjult krav | Høy | Ikke endre blindt. Hvis kontotype er riktig, neste research bør være faktisk nyere app metadata/fingerprint |
| App version / app identity | `Dart/3.2 (dart:io)`, `cv=i_829`, Basic client | Samme i ioBroker snippets | Matcher gammel/known flow | Middels/høy | Sannsynlig kandidat etter kontotype. Krever ny referanse, ikke gjetting |
| User-agent | `Dart/3.2 (dart:io)` | Samme i ioBroker snippets | Matcher | Lav/middels | Ikke endre |
| Country/locale | `NO`/`DE` testet, fortsatt 400 | Referanse bruker `DE`, `lang=de` | Country er trolig ikke hovedavvik | Middels | Ikke viderefokuser på country alene |
| Auth profile host header | v0.3 `tasshack-compatible` setter explicit host | Referanse har explicit host header | Fortsatt 400 | Lav som hovedårsak | Host header er trolig ikke hovedavvik |

### v0.4 konklusjon

Lynell matcher nå de kjente ioBroker/DreameHome-auth-snippetene på de synlige protokollfeltene:

- EU auth host
- auth path
- POST
- form-urlencoded
- Basic client id
- tenant-id
- `dreame-meta`
- `dreame-rlc`
- `dreame-auth: bearer`
- password hash-format
- body key names
- explicit host header i `tasshack-compatible`

Siden `NO`, `DE` og explicit host fortsatt gir HTTP 400 før token, er de mest sannsynlige gjenværende årsakene:

1. Kontoen støtter ikke password grant slik vi bruker den.
   - Google/Apple/sosial login, OTP eller app-opprettet passordløs konto kan gi 400 selv om login fungerer i appen.
2. Username-formatet er ikke samme identitet som DreameHome password-login forventer.
   - E-post vs telefonnummer med landkode vs intern account id.
3. DreameHome har endret app identity eller fingerprint-krav etter de kjente ioBroker-snippetene.
   - `cv=i_829`, Basic client eller `dreame-rlc` kan være foreldet for kontoen/appversjonen.
4. Auth-endepunktet forventer nyere signatur/fingerprint som ikke finnes i de gamle referansene.

### Én trygg neste endring

Ikke endre runtime ennå.

Neste tryggeste steg er en test-/konfigurasjonsavklaring, ikke kode:

1. Bekreft at DreameHome-kontoen kan logge inn med vanlig username + password uten Google/Apple/OTP.
2. Hvis appen støtter det, sett/endre passord eksplisitt i DreameHome.
3. Test med nøyaktig samme identitet som appen bruker:
   - e-post hvis kontoen er e-postbasert
   - telefonnummer med korrekt landkode hvis kontoen er telefonbasert

Kun hvis dette er bekreftet og 400 fortsetter, anbefales neste ene kodeprofil:

- `LYNELL_DREAME_AUTH_PROFILE=explicit-form-urlencoded`
- samme headers/body keys som nå
- samme hash
- samme client metadata
- eneste endring: bygg body som eksplisitt URL-encoded string i fast key order, for å eliminere fetch/URLSearchParams vs axios-transform som feilkilde

Dette er tryggere enn å endre `dreame-meta`, `dreame-rlc`, Basic client eller password hashing uten fersk app/protokollreferanse.

Ingen runtime-endring ble gjort i v0.4.

## v0.5 explicit-form-urlencoded profile

Implementert profil:

```powershell
$env:LYNELL_DREAME_AUTH_PROFILE="explicit-form-urlencoded"
```

Denne profilen gjør kun én auth-request-endring:

- login-body bygges som eksplisitt URL-encoded string
- key order er fast:
  1. `grant_type`
  2. `scope`
  3. `platform`
  4. `type`
  5. `username`
  6. `password`
  7. `country`
  8. `lang`

Uendret:

- auth host
- auth path
- method
- content-type
- Basic client
- tenant-id
- `dreame-meta`
- `dreame-rlc`
- password hash-format
- body key names
- status-only runtime

Sikkerhet:

- diagnostics viser `authProfile`
- ingen credentials, token, hash, full body eller device-id logges/returneres
- ingen retry-loop
- ingen robotkommandoer
- ingen maps/zones/schedules/automations

## v0.6 device-list inspection

Mål:

- inspisere ekte device-list respons trygt etter vellykket auth
- finne korrekt Dream/Dreame D20 Plus path
- identifisere korrekt statusfelter
- bygge trygg normalisering

Aktiveres med:

```powershell
$env:LYNELL_DREAME_DEVICE_LIST_DEBUG="true"
```

Sanitert output viser kun:

- `topLevelKeys`
- `arrayPaths`
- `deviceCountCandidates`
- `selectedDeviceArrayCount`
- per device-kandidat:
  - top-level keys
  - name candidates
  - model candidates
  - masked ids
  - online candidates
  - status candidates

Viser aldri:

- token
- full payload
- full device-id
- full body
- credentials
- maps/zones/schedules

Retningslinje:

- Bruk inspeksjonen til å oppdatere `getDeviceListFromPayload` og `normalizeDeviceSummary` med faktisk path/felt.
- Ikke legg til robotkommandoer.
- Ikke legg til retry-loop.
- Ikke gjør device-list inspection til permanent verbose debug i vanlig UI.

## v0.7 empty device-list analysis

Kontekst:

- Auth lykkes med HTTP 200.
- Device-list endpoint lykkes med HTTP 200.
- Sanitert inspection viser ingen array paths og `0` device candidates.
- Ingen robotkommandoer er sendt.

Mulige forklaringer som må undersøkes uten å eksponere payload/secrets:

- `device/listV2` kan kreve andre body-parametre enn `sharedStatus`, `current`, `size`.
- Respons-wrapper kan være tom fordi konto/country/region ikke matcher robotens binding.
- DreameHome kan kreve home/family endpoint før device-list.
- User-id/home-id/family-id kan måtte hentes før robotlisten kan filtreres riktig.
- Robot kan være bundet til Google/Apple/OTP identity, mens password-login identity er en separat/ny tom konto.
- Dream/Dreame D20 Plus kan ligge under et annet endpoint enn `listV2`.

v0.7 legger kun til sanitert diagnostics i device-list inspection:

- response type
- top-level key count
- om payload er `null`
- om payload er tomt objekt
- om kjente wrapper keys finnes:
  - `data`
  - `result`
  - `list`
  - `devices`
  - `page`
  - `items`
- nested wrapper presence for typiske paths
- sanitert `status` / `code` / `msg` / `success` hvis feltene finnes

Viser fortsatt aldri:

- full payload
- token
- full device-id
- credentials
- maps/zones/schedules

Tolkning:

- Hvis `status/code/msg` indikerer success men ingen wrapper arrays finnes, peker det mot feil konto/identity, manglende home/family context eller annet endpoint.
- Hvis `data`/`result` er tomt objekt, peker det mot tom konto eller feil scope/context.
- Hvis `page/items/devices` finnes men ikke er array, må neste steg være å legge til akkurat den pathen i `getDeviceListFromPayload` etter å ha sett sanitert type/count.

## v0.8 device normalization

Kontekst:

- Auth fungerer.
- Device-list fungerer.
- Device array ligger i `data.page.records`.
- Count = 1.
- Ingen robotkommandoer er sendt.

Implementert:

- `data.page.records` er nå primary device path i `getDeviceListFromPayload`.
- Normalisering er fortsatt begrenset til trygge status-only felter:
  - `name`
  - `model`
  - masked `deviceId`
  - `online`
  - `battery`
  - `docked`
  - `charging`
  - `statusText`
  - `lastUpdatedAt`
- Sanitert inspection viser nå `candidateFieldNames` per device-kandidat.

Ikke implementert:

- robotkommandoer
- maps
- zones
- schedules
- consumables
- automasjoner

Neste trygge arbeid etter v0.8:

- Bruk `candidateFieldNames` og maskerte id-er fra ekte respons til å velge riktig felt for Dream/Dreame D20 Plus.
- Ikke utvid til kommandoer før status/battery/docked/charging er stabilt over flere tester.

## v1.3 keyDefine status mapping

Funn:

- `keyDefine` er observert som en localization/state dictionary, ikke som sikker command/action metadata.
- Eksempel: `$.keyDefine.2.1.en.5 = "Returning to charge"`.
- `actions`, `services`, `siid` og `aiid` er ikke til stede i denne strukturen.

Implementert:

- Lynell bygger nå en sanitert status-code dictionary fra `keyDefine`.
- Språkprioritet:
  - `en`
  - `nb`
  - første tilgjengelige språk som fallback
- `latestStatus` mappes til localized status text bare når koden finnes eksakt i `keyDefine`.
- `statusMappingConfidence` settes til:
  - `confirmed` når `keyDefine` inneholder eksakt kode
  - `tentative` for eksisterende heuristikk
  - `unknown` når koden ikke finnes
- `observedStatusCodes` viser nå:
  - `code`
  - `localizedText`
  - `localizedLanguage`
  - `localizedPath`
  - `confidence`

Sikkerhetsvalg:

- Ingen nye statuskoder hardkodes.
- `Returning to charge` normaliseres som `returning`, men brukes ikke til å anta `docked` eller `charging`.
- `docked` og `charging` forblir ukjent hvis Dreame ikke leverer eksplisitte felt eller en senere bekreftet mapping.
- KeyDefine-inspection er fortsatt sanitert og returnerer ikke full payload, token, credentials eller full device-id.

## Ikke gjør nå

- Ikke implementer Dreame cloud commands.
- Ikke bygg kart eller room cleaning.
- Ikke lag schedules.
- Ikke bygg zones.
- Ikke bygg consumables.
- Ikke bygg robot commands.
- Ikke bygg automasjoner.
- Ikke eksponer credentials.
- Ikke lat som Dream D20 Plus er live native-koblet.
- Ikke endre KNX, Cast eller MQTT runtime-strategier.
