# Integration transition notes

Kort notat til senere checkpoint. Dette beskriver integrasjonsstatus etter de siste foundation-rundene, uten å endre runtime-strategi eller love ekte koblinger der de ikke finnes ennå.

## Status

### Zigbee2MQTT readiness

- Zigbee-retningen er valgt som lokal edge-runtime: SONOFF ZBDongle-E + Zigbee2MQTT + MQTT.
- Manager har Zigbee Runtime / Integrasjoner foundation med coordinator, MQTT broker, topic namespace, pairing readiness og device mapping som neste steg.
- Zigbee devices og lifecycle finnes som foundation/mock i frontend.
- Ekte Zigbee2MQTT er ikke installert, startet eller koblet.
- Pairing, discovery, retained state restore og live device mapping er ikke implementert.

### MQTT bridge preparation

- `bridge/mqtt-runtime.mjs` finnes som isolert bridge-foundation.
- MQTT er disabled by default og skal ikke auto-koble uten env.
- Bridge har trygge MQTT-endpoints:
  - `GET /api/mqtt/status`
  - `POST /api/mqtt/connect`
  - `POST /api/mqtt/disconnect`
- Frontend API og Manager kan lese faktisk bridge MQTT-status hvis endpoint finnes.
- Dependency er guardet: `mqtt` må finnes før live client kan kobles.
- Dette er fortsatt ikke full MQTT runtime, ikke reconnect-engine, ikke Zigbee subscriptions og ikke device mapping.

### Cast discovery foundation

- `bridge/cast-runtime.mjs` finnes som isolert Cast discovery/playback foundation.
- Cast er disabled by default.
- Discovery bruker `bonjour-service` hvis dependency er installert og env er aktivert.
- Bridge har trygge Cast discovery/status endpoints:
  - `GET /api/cast/status`
  - `POST /api/cast/discover`
- Media og Manager viser Cast readiness, dependency-status og oppdagede devices når de finnes.
- Discovery kan testes lokalt, men playback er fortsatt foundation.

### Cast playback test foundation

- Cast playback testmodus er implementert med:
  - selected cast device
  - playback state
  - LAN-tilgjengelig media URL
  - play/pause/stop for valgt enhet
- Bridge har endpoints:
  - `GET /api/cast/playback`
  - `POST /api/cast/play`
  - `POST /api/cast/pause`
  - `POST /api/cast/stop`
- Endpoints svarer rolig ved disabled state, manglende dependency, manglende device eller LAN-URL-feil.
- Dette er ikke full Cast engine, men første kontrollerte MP3-playback-test via `castv2-client`.
- Viktig testkrav: Cast-enhet må nå Lynell server på LAN-IP, ikke `localhost`.

### Media routing status

- Lokal media runtime er ekte i nettleseren via HTMLAudioElement.
- Media UI viser nå tydelig:
  - Avspilling: Denne enheten / Cast device
  - aktiv output
  - Cast readiness
  - om valgt device støtter playback nå
- Hvis output er `Denne enheten`, brukes lokal HTMLAudioElement.
- Hvis output er oppdaget Cast device, brukes Cast endpoints og lokal playback stoppes for å unngå dobbel avspilling.
- Multiroom, queue, auth og ekstern streamingplattform er ikke bygget.

### Dream D20 Plus integration readiness

- Dream D20 Plus finnes som tydelig fysisk assistent/foundation target.
- Robotstatus, batteri, docking, område, fremdrift og mock-handlinger finnes.
- `bridge/vacuum-runtime.mjs` finnes som isolert robot bridge-foundation.
- Vacuum runtime er disabled by default og eksponerer ikke credentials i API.
- Bridge har trygge robot-endpoints:
  - `GET /api/vacuum/status`
  - `POST /api/vacuum/connect`
  - `POST /api/vacuum/command`
- Integrasjonsmetoder er modellert som adapter-strategi:
  - `dreameCloud` som native/premium cloud adapter-retning etter API/auth-avklaring
  - `localRuntime` som native lokal runtime hvis modellen støtter stabil lokal protokoll
  - `mqttBridge` som lokal edge-/adapterbro senere
  - `homeAssistantBridge` som optional kompatibilitetsbro for rask live-test
  - `mock` for utvikling/testing
- Home Assistant bridge v1 kan hente ekte robotstatus fra `/api/states/<entity_id>` og sende enkle vacuum service calls når env er komplett, men HA er ikke langsiktig hovedmotor.
- Provider-abstraksjonen skal gjøre overgang til native runtime mulig uten å bygge om Assistenter, NIVA eller Manager.
- Mock/foundation-kommandoer starter ikke fysisk rengjøring; Home Assistant-kommandoer krever eksplisitt provider/env.
- Ingen cloud-login, kart, schedules eller ekte robot-API er implementert.

## Fortsatt mock/foundation

- Zigbee devices, pairing og device lifecycle er foundation/mock.
- Zigbee2MQTT er bare valgt runtime-retning.
- MQTT live client er bridge-preparation, ikke aktiv runtime.
- Cast discovery krever dependency/env før ekte LAN-test.
- Cast playback er minimal testmodus og ikke full casting.
- Google Home/Sonos outputs er modellert/foundation med eventuell discovery-status, ikke full playback-platform.
- Dream D20 Plus er mock/foundation med mindre `LYNELL_VACUUM_PROVIDER=homeAssistantBridge` og HA-env er satt. HA er da en optional live-testbro, ikke native Lynell-runtime.
- MQTT bridge for robot er fortsatt et fremtidig adaptervalg.

## Klart for ekte test

- Lokal browser-media med MP3 fra `media/music/`.
- Cast discovery test når `bonjour-service` og env er satt.
- Cast playback-test med én valgt Cast-enhet og LAN-tilgjengelig MP3-URL.
- MQTT bridge status/connect-røykprøve når `mqtt` dependency, broker host og env er satt.
- Zigbee2MQTT readiness kan brukes som sjekkliste før faktisk Zigbee2MQTT/MQTT runtime kobles.
- Dream D20 Plus readiness kan brukes som research-sjekkliste før native Dreame/cloud/lokal runtime velges.
- Robot bridge-status kan testes disabled/foundation via `/api/vacuum/status`.
- Home Assistant robotstatus kan testes når HA base URL, token og vacuum entity er satt, som compatibility bridge.

## Dependencies og env

### Cast discovery

Dependency:

```powershell
npm install bonjour-service
npm install castv2-client
```

Env:

```powershell
$env:LYNELL_CAST_ENABLED="true"
$env:LYNELL_CAST_DISCOVERY_ENABLED="true"
```

Endpoints:

```text
GET  /api/cast/status
POST /api/cast/discover
GET  /api/cast/playback
POST /api/cast/play
POST /api/cast/pause
POST /api/cast/stop
```

### MQTT bridge

Dependency:

```powershell
npm install mqtt
```

Env:

```powershell
$env:LYNELL_MQTT_ENABLED="true"
$env:LYNELL_MQTT_HOST="BROKER-IP"
$env:LYNELL_MQTT_PORT="1883"
$env:LYNELL_MQTT_USERNAME=""
$env:LYNELL_MQTT_PASSWORD=""
$env:LYNELL_MQTT_TOPIC_ROOT="zigbee2mqtt"
```

Endpoints:

```text
GET  /api/mqtt/status
POST /api/mqtt/connect
POST /api/mqtt/disconnect
```

### Zigbee2MQTT senere

Må avklares før ekte runtime:

- coordinator path for SONOFF ZBDongle-E
- Zigbee2MQTT installasjon og konfig
- MQTT broker host/port/auth
- topic root, normalt `zigbee2mqtt`
- retained state policy
- birth/last-will
- pairing flow
- device-to-room mapping
- capability mapping til Lynell device model

### Dream D20 Plus senere

Må avklares før ekte robotintegrasjon:

- valgt native adaptermetode, med Dreame cloud adapter som premium-retning hvis API/auth er praktisk mulig
- Home Assistant bridge kan brukes som optional kompatibilitetsbro for første live status/kommando-test
- tilgjengelig DreameHome/Xiaomi API/metode hvis direkte cloud velges
- Dreame/Xiaomi auth/login-krav
- modell-ID og provider-krav
- lokal LAN/runtime-mulighet hvis den finnes
- sone-/rommapping mellom robot og Lynell spatial model
- testkommandoer: status, start, dock
- om MQTT bridge skal brukes som edge-adapter mellom native Lynell-runtime og eksterne lokale brotjenester

Native adapter foundation:

- `dreameCloud`: native Lynell adapter med cloud auth/token senere, ikke implementert
- `localRuntime`: native lokal protokoll hvis Dream D20 Plus støtter det, ikke implementert
- `mqttBridge`: lokal edge bridge med normalisert payload senere, ikke implementert
- `homeAssistantBridge`: optional compatibility bridge som kan brukes til live-test nå
- `mock`: utvikling/testing

Strategiprinsipp:

- HA skal ikke være permanent avhengighet for premium Lynell-runtime
- credentials skal bli bridge-/adapter-eid, aldri frontend-eid
- capability mapping må normalisere status, battery, docked, cleaning, pause/start/dock og senere room/zone-cleaning
- cloud vs local skal kunne byttes i providerlaget uten at NIVA/UI endres

Env foundation:

```powershell
$env:LYNELL_VACUUM_ENABLED="true"
$env:LYNELL_VACUUM_PROVIDER="mock"
$env:LYNELL_VACUUM_DREAME_REGION=""
$env:LYNELL_VACUUM_DREAME_USERNAME=""
$env:LYNELL_VACUUM_DREAME_PASSWORD=""
```

Home Assistant bridge v1:

```powershell
$env:LYNELL_VACUUM_ENABLED="true"
$env:LYNELL_VACUUM_PROVIDER="homeAssistantBridge"
$env:LYNELL_HA_BASE_URL="http://homeassistant.local:8123"
$env:LYNELL_HA_TOKEN="LONG_LIVED_ACCESS_TOKEN"
$env:LYNELL_HA_VACUUM_ENTITY_ID="vacuum.xxx"
```

Testscript:

```powershell
npm run bridge:vacuum-ha
```

Scriptet viser manglende HA URL/token/entity ID uten å printe token.

Endpoints:

```text
GET  /api/vacuum/status
POST /api/vacuum/connect
POST /api/vacuum/command
```
