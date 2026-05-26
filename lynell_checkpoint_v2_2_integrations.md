# Lynell Checkpoint v2.2 - Integrations

Dette checkpointet oppsummerer integrasjonsstatus etter første ekte physical integration-runde. Bruk dette sammen med `lynell_checkpoint_v2.md` og `integration_transition_notes.md` i ny Codex-chat.

Viktig prinsipp: Lynell skal alltid skille tydelig mellom `Live`, `Klar for test`, `Klargjort`, `Foundation`, `Mock`, `Disabled`, `Mangler dependency`, `Mangler env` og `Ikke koblet`.

## 1. Integrasjonsstatus nå

### Cast / Google Home

- Cast discovery er implementert i `bridge/cast-runtime.mjs`.
- Cast er disabled by default og aktiveres med env.
- Discovery bruker `bonjour-service`.
- Playback-test bruker `castv2-client`.
- Bridge har trygge endpoints for status, discovery og minimal playback.
- Media UI kan rute lokal MP3 til valgt discovered Cast device.
- Dette er første ekte physical integration-spor i Lynell.
- Ikke full Cast engine, ikke multiroom, ikke auth, ikke Spotify/YouTube.

### Lokal media playback

- Lokal MP3 playback er ekte og fungerer i nettleseren via HTMLAudioElement.
- Bridge scanner og serverer filer fra `media/music/`.
- Media UI viser lokalt bibliotek, aktiv output og playback state.
- Dette er live runtime, ikke mock.

### MQTT

- `bridge/mqtt-runtime.mjs` finnes som isolated bridge foundation.
- MQTT er disabled by default.
- Endpoints finnes:
  - `GET /api/mqtt/status`
  - `POST /api/mqtt/connect`
  - `POST /api/mqtt/disconnect`
- Dependency `mqtt` kreves for ekte client-test.
- Dette er status/connect foundation, ikke full live MQTT runtime.
- Ingen Zigbee subscriptions, discovery, retained-state restore eller device mapping er aktiv ennå.

### Zigbee2MQTT

- Zigbee-retningen er valgt: SONOFF ZBDongle-E + Zigbee2MQTT + MQTT.
- Manager har Zigbee Runtime readiness med coordinator, broker, topic root, pairing readiness og next steps.
- Zigbee devices/lifecycle finnes som foundation/mock i frontend.
- Ekte Zigbee2MQTT runtime er ikke installert eller koblet.
- Pairing, discovery og live device mapping er ikke implementert.

### Dream D20 Plus

- Dream D20 Plus finnes som tydelig fysisk assistent/foundation target.
- Assistenter-flaten viser robotstatus, batteri, docking, område, readiness og kontrollflate.
- Native direkte integrasjon er ikke implementert.
- Mock/foundation-handlinger starter ikke fysisk robot.
- Ved `homeAssistantBridge` + komplett HA-env kan robotstatus og enkle kommandoer gå via Home Assistant.

### Home Assistant bridge

- HA er implementert som optional compatibility bridge i `bridge/vacuum-runtime.mjs`.
- Provider: `homeAssistantBridge`.
- Kan hente status fra Home Assistant:
  - `GET /api/states/<entity_id>`
- Kan sende service calls:
  - `vacuum/start`
  - `vacuum/pause`
  - `vacuum/return_to_base`
  - `vacuum/stop`
- Krever:
  - `LYNELL_VACUUM_ENABLED=true`
  - `LYNELL_VACUUM_PROVIDER=homeAssistantBridge`
  - `LYNELL_HA_BASE_URL`
  - `LYNELL_HA_TOKEN`
  - `LYNELL_HA_VACUUM_ENTITY_ID`
- Token vises ikke i API eller UI.
- HA er ikke premium-sluttretning. Den er en bro for rask ekte test.

### Native vacuum runtime

- Provider-strategi er etablert, men native runtime er ikke implementert.
- Primary future direction:
  - `dreameCloud`
  - `localRuntime`
  - `mqttBridge`
- Optional compatibility bridge:
  - `homeAssistantBridge`
- Development/testing:
  - `mock`
- Provider metadata finnes:
  - `strategicRole`
  - `premiumFit`
  - `dependencyLevel`
  - `futurePriority`
- Native Lynell-runtime er ønsket premium-retning.

### Weather API

- Weather awareness finnes i frontend/NIVA.
- Weather kan være aktiv hvis eksisterende API/config er aktiv.
- Værstasjon/KNX weather foundation finnes i config, men full live værstasjon-runtime er ikke ferdig.
- NIVA skal være ærlig ved fallback eller manglende data.

### KNX bridge

- `bridge/server.mjs` er fortsatt sentral lokal KNX/media bridge.
- KNX write-path er runtime-config-drevet og skal ikke hardkodes i UI.
- Write og feedback skal holdes separert.
- KNX kan være live hvis eksisterende live runtime er aktiv og bridge har runtime config.
- Dette checkpointet endrer ikke KNX-strategi.

## 2. Ekte fungerende nå

- Lokal MP3 playback i nettleser via HTMLAudioElement.
- Lokal media library fra `media/music/` via bridge.
- Cast discovery når `bonjour-service` og Cast env er satt.
- Cast MP3 playback-test til én valgt Cast device via LAN-tilgjengelig media URL.
- KNX dersom eksisterende live runtime/bridge config er aktiv i miljøet.
- Weather dersom eksisterende weather config/API er aktiv.

Viktig: Cast playback er ekte testmodus, men ikke full castingplattform.

## 3. Klar for test

### Home Assistant vacuum bridge

- Klar for hjemmetest når HA URL, Long-Lived Access Token og vacuum entity ID er satt.
- Start med status.
- Test dock før start hvis fysisk kommando skal prøves.
- Script finnes:

```powershell
npm run bridge:vacuum-ha
```

### MQTT status endpoints

- Klar for disabled/status/connect røykprøve.
- Krever `mqtt` dependency og broker env før ekte connect-test.
- Ikke koble Zigbee devices via MQTT ennå.

### Cast videre test

- Klar for lengre discovery/playback-stabilitetstest.
- Cast device må nå Lynell bridge på LAN-IP, ikke `localhost`.
- Test én valgt device om gangen.

### Zigbee når SONOFF ZBDongle-E kommer

- Klar for fysisk planlegging.
- Ikke start full Zigbee runtime før hardware, coordinator path, MQTT broker og Zigbee2MQTT config er avklart.

## 4. Klargjort / foundation

- Zigbee2MQTT readiness.
- MQTT runtime foundation.
- Native vacuum provider strategy.
- Home Assistant vacuum compatibility bridge.
- Sonos foundation.
- Google Home/Cast routing foundation.
- Integration setup wizard.
- Hardware inventory.
- Hybrid runtime state.
- Integration truth-model.
- Device lifecycle and onboarding foundation.
- Sensor intelligence and environmental awareness foundation.
- Spatial awareness foundation.
- House memory, comfort/energy and adaptive awareness foundations.

Disse lagene skal brukes til awareness og struktur, ikke tolkes som full live runtime.

## 5. Mock / ikke ekte koblet

- Dream D20 Plus native direkte integrasjon.
- Dreame cloud login/API.
- Local robot runtime.
- MQTT robot bridge.
- Sonos playback.
- Zigbee devices før hardware/runtime.
- Zigbee pairing/discovery.
- Robot actions uten HA eller senere native provider.
- Google Home/Sonos foundation outputs uten discovery/playback support.
- Værstasjon KNX runtime for alle punkter.

Mock/foundation skal aldri presenteres som live.

## 6. Viktige arkitekturvalg

- HA er optional compatibility bridge, ikke premium-sluttretning.
- Native Lynell runtime er ønsket premium-retning for robot og fremtidige integrasjoner.
- Provider abstraction gjør bytte mulig uten å bygge om Assistenter, NIVA eller Manager.
- Cast er første ekte physical integration utenfor lokal browser/media.
- Zigbee2MQTT er valgt lokal-first edge-retning for Zigbee.
- MQTT er lokal transport og edge-nervesystem, ikke cloud dependency.
- Hybrid-runtime skal alltid vise state origin.
- Credentials skal eies av bridge/adapter, aldri frontend.
- KNX write-path skal ikke endres av integrasjonsrundene.
- SystemConfig er fortsatt source of truth.

## 7. NIVA-status

- NIVA skal være ærlig om hva som er ekte, foundation, mock, disabled eller fallback.
- NIVA kan forklare:
  - Cast discovery/playback-test
  - lokal media playback
  - MQTT status og edge-retning
  - Zigbee2MQTT readiness
  - Dream D20 Plus provider-strategi
  - Home Assistant som optional bridge
  - native vacuum runtime som premium-retning
  - KNX bridge og runtime origin
- NIVA skal ikke late som noe er live før runtime bekrefter det.
- Robotkommandoer skal fortsatt bruke trygg bekreftelsesflyt.
- Ved lav datakvalitet skal NIVA bruke forsiktig språk.

## 8. Testinstruksjoner

### Cast test

1. Installer dependencies hvis de mangler:

```powershell
npm install bonjour-service
npm install castv2-client
```

2. Start bridge med Cast aktivert:

```powershell
$env:LYNELL_CAST_ENABLED="true"
$env:LYNELL_CAST_DISCOVERY_ENABLED="true"
npm run bridge
```

3. Sjekk:

```text
GET  http://localhost:8787/api/cast/status
POST http://localhost:8787/api/cast/discover
```

4. For playback:

- Velg én discovered `deviceId`.
- Bruk lokal MP3 fra `/media/music`.
- Sørg for LAN-IP URL, ikke `localhost`.

### HA vacuum test

1. Lag Long-Lived Access Token i Home Assistant.
2. Finn vacuum entity ID, for eksempel `vacuum.dream_d20_plus`.
3. Start:

```powershell
$env:LYNELL_VACUUM_ENABLED="true"
$env:LYNELL_VACUUM_PROVIDER="homeAssistantBridge"
$env:LYNELL_HA_BASE_URL="http://homeassistant.local:8123"
$env:LYNELL_HA_TOKEN="LONG_LIVED_ACCESS_TOKEN"
$env:LYNELL_HA_VACUUM_ENTITY_ID="vacuum.xxx"
npm run bridge
```

eller:

```powershell
npm run bridge:vacuum-ha
```

4. Test:

```text
GET  /api/vacuum/status
POST /api/vacuum/connect
POST /api/vacuum/command { "command": "status" }
POST /api/vacuum/command { "command": "dock" }
```

Anbefalt rekkefølge: status først, dock før start.

### MQTT disabled/status test

1. Uten env skal `/api/mqtt/status` vise disabled/foundation.
2. Med env og dependency kan status/connect røykprøves.
3. Ikke bygg Zigbee subscriptions eller device mapping i denne fasen.

### Senere Zigbee test

1. Skaff SONOFF ZBDongle-E.
2. Avklar coordinator path.
3. Sett opp MQTT broker.
4. Sett opp Zigbee2MQTT.
5. Test bridge/MQTT status før pairing.
6. Ikke bygg Lynell pairing/discovery før hardware og runtime er stabilt.

## 9. Neste anbefalte arbeid

1. Lengre Cast stabilitetstest.
2. HA vacuum fysisk test hvis Home Assistant settes opp.
3. Undersøke native Dreame/Dream D20 Plus API og auth-metode.
4. Vente med Zigbee runtime til SONOFF ZBDongle-E finnes.
5. Manager cleanup etter integrasjonsvekst.

## 10. Ikke gjør videre uten eksplisitt valg

- Ikke bygg mer robot-cloud før metode er avklart.
- Ikke bygg full Zigbee runtime før hardware finnes.
- Ikke kjør `npm audit fix` ukontrollert.
- Ikke la mock/foundation fremstå som live.
- Ikke hardkod KNX write-path i UI.
- Ikke eksponer Home Assistant token eller andre credentials i frontend/API.
- Ikke bygg automasjoner fra awareness-lagene uten separat beslutning.

## 11. Rehydrering i ny Codex-chat

Les først:

1. `lynell_checkpoint_v2.md`
2. `integration_transition_notes.md`
3. `lynell_checkpoint_v2_2_integrations.md`

Deretter les relevante filer for oppgaven.

Hvis oppgaven gjelder integrasjoner, sjekk alltid faktisk runtime/bridge-kode før endring:

- `bridge/server.mjs`
- `bridge/cast-runtime.mjs`
- `bridge/mqtt-runtime.mjs`
- `bridge/vacuum-runtime.mjs`
- `src/api/homeApi.ts`
- `src/components/ManagerPanel.tsx`
- `src/App.tsx`

Standard verifisering ved kodeendringer:

- `npm run build`
- `node --check bridge/server.mjs` hvis bridge berøres
- `node --check bridge/<module>.mjs` hvis en bridge-modul berøres

Dette dokumentet er kun dokumentasjon. Ingen build er nødvendig når bare dette checkpointet endres.
