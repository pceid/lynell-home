# Lynell Checkpoint

## 1. Prosjektstatus

**Lynell Home** er nå en lokal smartbolig-app for styring, overvåking og konfigurasjon av boligfunksjoner, med mørkt premium UI, KNX-integrasjon og en regelbasert førsteversjon av NIVA-assistenten.

**Hovedformål:**
- Lokal kontroll av lys og klima.
- Manager som source of truth for bolig-/anleggskonfig.
- Diagnose og driftsovervåking for hjemmetest/serverdrift.
- NIVA som intelligent, trygg assistent som forklarer, foreslår og etter hvert utfører handlinger med bekreftelse.

**Nylig ferdigstilt:**
- Rom-fane som egen hovedflate.
- Premium romvisning med temperatur, settpunkt, modus, varme, lys, mini-graf og NIVA-romrapport.
- Avanserte romdata: varmeavgiver, areal, takhøyde, volum, notat.
- Enkel varmebehovsanalyse basert på romdata + heatDemand-historikk.
- NIVA-romrapport med anbefalinger.
- NIVA-handlinger med Bekreft/Avbryt og effektbekreftelse.
- NIVA-værbevissthet med enkel værstatus/proaktive varsler.
- Windows server-startscripts og `SERVER_SETUP.md` med autostart-forberedelse.

---

## 2. Arkitektur

### Frontend
- React/Vite/TypeScript.
- Hovedappen ligger i `src/App.tsx`.
- Enkel view-switch, ikke routing.
- Hovedfaner nå:
  - Home
  - Rom
  - Lys
  - Klima
  - Kamera
  - Solskjerming
  - Media
  - Kalender
  - Manager
- UI er mørk, rolig, premium og mobiltilpasset med maks bredde.

### API-/simuleringslag
- `src/api/homeApi.ts` håndterer frontend-kall mot bridge og simulert state.
- Simulate/Live beholdes.
- I Simulate brukes lokal simulering.
- I Live brukes bridge/API mot KNX der config tillater det.
- Frontend sender runtime-config til bridge.

### Datastruktur
- `SystemConfig` er source of truth.
- `createInitialSystemConfig()` er bootstrap.
- Konfig kan redigeres i Manager.
- `Lagre endringer` persisterer til `localStorage`.
- `Forkast endringer` går tilbake til sist lagret config.
- Runtime-rom er avledet fra SystemConfig og holder live/simulerte verdier.

### NIVA-logikk
- NIVA er regelbasert, ikke ekstern AI.
- Har meldingshistorikk i app-state.
- Kan svare på system-, rom-, klima-, lys-, kalender-, scene- og værspørsmål.
- Kan lage forslag med Bekreft/Avbryt.
- Utfører kun etter bekreftelse.
- Bruker eksisterende funksjoner for scene, lys og klima.
- Har enkel proaktiv melding/cooldown.

### KNX-integrasjon / fremtidig integrasjon
- Bridge bruker etablert Node KNX-bibliotek.
- Write-path er config-drevet fra runtime-config, ikke hardkodet.
- Light write bruker `zone.light`.
- Brightness write bruker `zone.value`.
- Climate setpoint write bruker `climate.setpoint`.
- Feedback:
  - localDirect: lys og klima kan bruke subscribe/event-basert strategi.
  - remoteTunnel: konservativ fallback/off.
- MQTT-struktur er klargjort som mapping/helper, men ingen broker-runtime ennå.
- BACnet, værstasjon, solskjerming, sensorer og tekniske alarmer finnes strukturelt i config/Manager, men ikke full runtime.

---

## 3. Viktige filer

### `src/App.tsx`
Hovedfilen. Inneholder:
- App-state.
- View-switch.
- runtime state.
- Manager state/draft/save/discard.
- runtime sync mot bridge.
- feedback merge.
- NIVA-logikk.
- romrapport/varmebehovsanalyse.
- kalender/scener/media/home UI.
- Diagnose snapshot/testlogg.

### `src/api/homeApi.ts`
API-lag mot bridge og simulering:
- `getRooms`
- `setLight`
- `setBrightness`
- `setSetpoint`
- `setMode`
- `syncBridgeRuntimeConfig`
- light/climate feedback streams
- bridge health
- fallback/polling-endepunkter

### `src/data/rooms.ts`
Tidligere seed/rommodell.
- Skal ikke være primær bootstrap lenger.
- Kan fortsatt brukes for typer som `Room`, `RoomMode`, `ZoneKey`.
- Runtime-rom avledes nå fra SystemConfig.

### `src/knx/knxMapping.ts`
KNX mapping-relatert struktur.
- Mye mapping er flyttet/avledet via SystemConfig.
- Viktig at write ikke bruker feedback-adresser.
- Brukes fortsatt som type-/adaptergrunnlag.

### `src/config/systemConfig.ts`
Viktigste config-fil.
Inneholder:
- `SystemConfig`
- bolig
- nettverk
- runtime
- sikkerhet/PIN
- media
- kalender/bookings
- scener
- etasjer
- rom
- lyssoner
- klima
- sensorer
- solskjerming
- værstasjon
- teknisk
- integrasjoner
- MQTT
- `createInitialSystemConfig()`
- `buildRoomsFromSystemConfig()`
- `buildKnxMappingFromSystemConfig()`

### `src/components/RoomCard.tsx`
Romkort for Lys/Klima-visninger.
- Viser lys/klima avhengig av view.
- Bruker runtime-data.
- Har setpoint +/- og varmeindikator.

### `src/components/ManagerPanel.tsx`
Manager UI.
- Redigerer SystemConfig draft.
- Fanestruktur med Bolig, funksjoner og Drift/Avansert.
- Diagnose-fane.
- Import/eksport.
- Save/discard styres fra App.

### `src/components/Sparkline.tsx`
Mini-graf for romhistorikk.

### `src/api/weatherApi.ts`
Henter værdata fra MET API.
- Returnerer enkel `WeatherSnapshot`.
- Nåværende data brukes av Home og NIVA.
- Forecast-struktur i NIVA er klargjort, men ikke full API-utvidet.

### `src/mqtt/mqttMapping.ts`
Klargjort MQTT-topic mapping.
- Speiler huset/funksjoner, ikke KNX gruppeadresser.
- Ingen broker-runtime ennå.

### `bridge/server.mjs`
Bridge-server.
- API mot frontend.
- KNX write.
- runtime-config mottak.
- health endpoint.
- subscribe/fallback-strategier.
- Skal bruke runtime config fra app, ikke gamle defaults.

### `scripts/`
Windows server scripts:
- `start-bridge.ps1`
- `start-frontend.ps1`
- `start-lynell-server.ps1`

### `SERVER_SETUP.md`
Driftsdokumentasjon:
- build
- serve
- bridge
- LAN/mobil
- PIN
- Windows Firewall
- autostart via Startup folder / Task Scheduler

---

## 4. Datamodeller

### Room
Runtime-rom, avledet fra SystemConfig.

Eksempel:
```ts
type Room = {
  id: number
  key: string
  group: RoomGroup
  name: string
  configured: boolean
  temperature: number
  targetTemperature: number
  mode: RoomMode
  heatDemand?: number | null
  zones: Zone[]
}
```

### Zone
Lyssone i rom.

Eksempel:
```ts
type Zone = {
  id: string
  key: ZoneKey
  name: string
  lightsOn: boolean
  brightness: number
  dimmable: boolean
}
```

### Mode
```ts
type RoomMode = 'Komfort' | 'Natt'
```

### Weather
Nåværende værdata:

```ts
type WeatherSnapshot = {
  location: string
  condition: string
  temperature: number
  windSpeed: number
  precipitation: number | null
  symbolCode: string
}
```

NIVA bygger i tillegg intern værbevisst struktur:

```ts
type NivaWeatherAwareness = {
  current: {
    temperature: number
    windSpeed: number
    windGust: number | null
    rainAmount: number | null
    rainExpected: boolean
    weatherText: string
    symbol: string
  } | null
  forecastToday: ...
  forecastTomorrow: ...
  updatedAt: number | null
  source: 'live' | 'unavailable'
  alert: null | {
    key: string
    message: string
    tone: 'active' | 'warning'
  }
}
```

### NIVA-status
NIVA meldinger:

```ts
type NivaMessage = {
  id: string
  timestamp: number
  role: 'user' | 'niva'
  text: string
  type: 'insight' | 'command' | 'response'
  status: 'pending' | 'acknowledged' | 'completed'
  intent?: 'calendar' | 'scene' | 'climate' | 'light' | 'weather' | 'system' | 'unknown'
  proposedAction?: NivaProposedAction
}
```

NIVA actions:
- `scene`
- `lightsOff`
- `roomLightsOff`
- `roomMode`
- `calendar`
- `climateSetpoint`

### KNX mapping
Config per lyssone:
```ts
type SystemZoneConfig = {
  id: string
  key: ZoneKey
  name: string
  dimmable: boolean
  light: string
  lightDataType?: KnxDataType
  dim: string
  value: string
  valueDataType?: KnxDataType
  lightFeedback: string
  lightFeedbackDataType?: KnxDataType
  valueFeedback: string
  valueFeedbackDataType?: KnxDataType
  feedbackInterpretationRule?: KnxInterpretationRule
  deriveLightStateFromValueFeedback?: boolean
}
```

Config per klima:
```ts
type SystemClimateConfig = {
  active: boolean
  liveActive: boolean
  temperature: string
  temperatureDataType?: KnxDataType
  setpoint: string
  setpointDataType?: KnxDataType
  mode: string
  modeDataType?: KnxDataType
  setpointFeedback: string
  setpointFeedbackDataType?: KnxDataType
  modeFeedback: string
  modeFeedbackDataType?: KnxDataType
  heatDemand: string
  heatDemandDataType?: KnxDataType
}
```

Avanserte romdata:
```ts
type SystemRoomConfig = {
  heatEmitterType?: HeatEmitterType
  floorAreaM2?: number | null
  ceilingHeightM?: number | null
  roomVolumeM3?: number | null
  manualVolumeM3?: number | null
  note?: string
}
```

---

## 5. Ferdig funksjonalitet

### Generelt
- Home, Rom, Lys, Klima, Kalender, Media, Manager.
- Mørkt premium UI.
- Mobiltilpasset.
- PIN-lås med sessionStorage.
- SystemConfig lagres i localStorage.
- Import/eksport JSON.

### Manager
- Rediger bolig, nettverk, runtime, etasjer, rom, lys, klima, scener, kalender, media, sensorer, teknisk, integrasjoner, MQTT.
- Lagre/Forkast.
- Sletting med confirm.
- Diagnose/readiness/testlogg.
- Manager er hovedverktøy for integrator.

### Lys
- Live write config-drevet.
- Av/på og brightness.
- Bod kun av/på i UI.
- Feedback via subscribe/fallback etter modus.
- `deriveLightStateFromValueFeedback` finnes for soner uten boolsk feedback.

### Klima
- Live setpoint write.
- Mode Komfort/Natt.
- Klima subscribe for localDirect er implementert/diagnostiserbart.
- HeatDemand kan vises og historiseres.
- Romkort viser temperatur, settpunkt, varme, trend.

### Rom-fane
- Egen hovedfane.
- Velg rom.
- Viser helhetlig romstatus.
- Mini-graf.
- NIVA-romlinje.
- Romrapport.
- Varmebehovsanalyse.
- Anbefalinger.
- Handlingsbare NIVA-forslag.
- Avansert romdata-panel.

### NIVA
- Regelbasert assistent.
- Spørsmål om:
  - huset
  - rom
  - lys
  - klima
  - kalender
  - scener
  - system/diagnose
  - vær
- Forslag med Bekreft/Avbryt.
- Kan kjøre:
  - scene
  - slå av lys
  - slå av romlys
  - sette rommodus
  - endre settpunkt
  - legge inn enkel kalenderhendelse
- Effektbekreftelse etter handling:
  - viser `Utfører...`
  - observerer runtime
  - bekrefter eller sier at den venter på systembekreftelse
- Proaktive meldinger med cooldown:
  - bridge tilbake
  - første KNX-data
  - subscribe stoppet
  - heatDemand
  - værvarsel

### Kalender/Booking
- Familieaktiviteter.
- Bookbare ressurser.
- Bookinger.
- Enkel konfliktsjekk.
- Kalender vises på Home og egen Kalender-side.
- NIVA kan bruke kalender/booking som innsikt.

### Scener
- Scene-editor i Manager.
- Manuell sceneaktivering.
- Enkel time-trigger.
- Scene-status sist aktivert.
- NIVA kan foreslå/aktivere scene med bekreftelse.

### Media
- Home-kort og Media-flate som placeholder.
- Manager media-config.
- Ingen ekte integrasjon.

### Drift
- Windows scripts.
- `SERVER_SETUP.md`.
- LAN/mobil/PWA-forberedelse.
- Bridge health check.
- Diagnose viser bridge/runtime/feedback/testlogg.

---

## 6. Delvis implementert

### NIVA
- Ingen ekstern AI.
- Ingen tale.
- Enkel intent parsing.
- Handlingsbekreftelser observerer runtime, men har ikke full KNX feedback-garanti.
- Værbevissthet bruker nåværende MET-data, men ikke full forecast.

### Klima
- Subscribe finnes for localDirect, men bør live-testes mer.
- RemoteTunnel skal fortsatt være forsiktig/off.
- Ingen avansert regulering.
- Ingen energiberegning.
- HeatDemand-analyse er heuristisk.

### Lys feedback
- Subscribe/cache-retning er etablert.
- Må fortsatt hjemmetestes for alle soner.
- Noen soner kan ha særegen ETS-feedback.

### Manager
- Stor og funksjonsrik.
- Har fanestruktur, men kan fortsatt ryddes mer.
- Avanserte romdata primært i Rom -> Avansert; Manager-kobling kan utvides.

### MQTT
- Topic helper/struktur finnes.
- Ingen broker, publish/subscribe eller KNX-MQTT bridge.

### Værstasjon
- Struktur i SystemConfig/Manager.
- Ingen KNX/runtime værstasjon ennå.
- Ekstern MET-vær brukes kun i frontend.

### Solskjerming/sensorer/teknisk/BACnet
- Strukturelt i config/Manager.
- Ikke runtime.

### Serverdrift
- Scripts og dokumentasjon finnes.
- Ikke Windows Service.
- Ikke autoinstall av Task Scheduler.
- Ikke backup/autostart-hardening.

---

## 7. Ikke startet

- Full ekstern AI for NIVA.
- Taleinput/taleoutput.
- Native app.
- Backend/database.
- Permanent historikk.
- Ekte graf-/analysemodul.
- Full værforecast.
- Pushvarsler.
- Brukeradministrasjon.
- Tailscale/VPN-oppsett.
- Windows Service installasjon.
- KNX scene/automatikk motor utover enkel manuell/time-trigger.
- BACnet runtime.
- MQTT broker runtime.
- Full solskjerming runtime.
- Sensor runtime.
- Teknisk alarm runtime.

---

## 8. Viktige beslutninger

### Source of truth
- `SystemConfig` er sannhet.
- Manager redigerer draft.
- Lagret config brukes av runtime og bridge-sync.
- Bridge skal ikke ha egen hardkodet mapping.

### Offline-first / lokal kontroll
- Lynell skal fungere lokalt først.
- Server-PC på hjemmenett.
- LocalDirect er primær hjemme.
- RemoteTunnel holdes konservativt.

### KNX-prinsipp
- KNX er underliggende robust styring.
- Frontend skal ikke gjette for mye.
- Write og feedback skal være separert.
- Write bruker aldri feedback-adresser.

### UI-prinsipp
- Rolig, mørk, premium.
- Kundevisning skal ikke føles som teknisk dashboard.
- Manager/Diagnose er integratorrettet.

### NIVA-prinsipp
- NIVA er assistent, ikke chatbot-widget.
- NIVA skal være trygg, rolig og ærlig.
- Ingen automatisk handling uten bekreftelse.
- Første versjon er regelbasert.
- Svar skal være korte og menneskelige.

### Runtime-prinsipp
- Simulate/Live skal bevares.
- localDirect kan bruke subscribe.
- remoteTunnel skal ikke overbelastes.
- Siste kjente state skal bevares, ikke nulles aggressivt.

### Produktretning

- NIVA er systemet
- Appen er innsikt og kontrollflate
- Bruker skal kunne forstå og styre boligen gjennom NIVA, ikke gjennom mange separate UI-komponenter
- UI skal støtte NIVA, ikke konkurrere med den
---

## 9. Kjente feil / teknisk gjeld

### Stor App.tsx
- `App.tsx` er svært stor og inneholder for mye:
  - NIVA
  - runtime
  - UI
  - Manager handlers
  - analyse
  - scenes
  - calendar
- Bør splittes senere.

### NIVA-logikk bør modulæres
- Intent parsing, room report, weather awareness og action execution bør ut i egne filer.

### Runtime/feedback kompleksitet
- Feedback-strategier er komplekse.
- Subscribe/polling/fallback bør isoleres tydeligere.
- RemoteTunnel må fortsatt behandles forsiktig.

### Weather
- `weatherApi.ts` henter bare nåværende vær.
- NIVA har forecast-struktur, men ikke ekte forecast-data.
- Værspørsmål om morgen/i natt svarer ærlig, men begrenset.

### LocalStorage config
- Ingen schema migration utover enkel normalize.
- Ved store modellendringer kan gamle configs mangle felt.

### Manager
- Mange config-domener i samme komponent.
- Kan bli tungt for integrator.
- Bør få mer understruktur.

### Historikk
- Kun runtime/app-state.
- Forsvinner ved refresh.
- Ingen tidsserie-database.

### Server
- Scripts er enkle.
- Ingen process supervisor.
- Hvis bridge/frontend dør etter start, restartes de ikke automatisk.
- Task Scheduler er dokumentert, ikke installert.

### Security
- PIN er enkel lokal sikring, ikke sterk security.
- Ikke egnet for internett-eksponering uten VPN/login.

---

## 10. Neste anbefalte spor

### 1. Neste konkrete oppgave
**Hjemmetest / server-PC test:**
- Kjør `npm run build`.
- Start med `.\scripts\start-lynell-server.ps1`.
- Test fra telefon.
- Sjekk Manager -> Diagnose:
  - bridge reachable
  - runtime config received
  - active feedback strategy
  - testlogg
- Test:
  - lys write
  - klima setpoint
  - NIVA handling med Bekreft
  - Rom-fane
  - PIN
  - localStorage config etter refresh

### 2. Kort sikt
- Splitte NIVA-logikk ut av `App.tsx`.
- Splitte romrapport/varmebehovsanalyse til egen helper.
- Gjøre weather forecast mer ekte med MET timeseries.
- Legge Manager-redigering for avanserte romdata.
- Forbedre Diagnose for NIVA actions/effect confirmation.
- Hjemmeteste localDirect subscribe lys/klima.

### 3. Lang sikt
- Backend/persistent config.
- Persistent historikk/tidsserie.
- MQTT runtime.
- Tailscale/VPN.
- Windows Service eller process supervisor.
- Ekstern AI for NIVA.
- Tale.
- Full automasjonsmotor.
- Native/PWA videreføring.
- BACnet/solskjerming/sensor-runtime.

---

## 11. Rehydrering i ny chat

Bruk slik i ny Codex-samtale:

1. Lim inn hele dette checkpointet.
2. Skriv hvilken oppgave som skal fortsettes, f.eks.:
   - “Fortsett med å splitte NIVA ut av App.tsx”
   - “Fortsett med hjemmetest-readiness”
   - “Fortsett med ekte værforecast”
   - “Fortsett med Manager avansert romdata”
3. Be Codex lese relevante filer før endringer:
   - `src/App.tsx`
   - `src/config/systemConfig.ts`
   - `src/api/homeApi.ts`
   - `bridge/server.mjs`
   - `src/components/ManagerPanel.tsx`
   - `src/api/weatherApi.ts`
4. Hvis oppgaven gjelder runtime/KNX:
   - be Codex være ekstra forsiktig med write-path
   - ikke endre bridge uten eksplisitt mål
5. Hvis oppgaven gjelder UI/NIVA:
   - be Codex ikke røre KNX/runtime/bridge
6. Kjør alltid relevant verifisering:
   - `npm run build`
   - `node --check bridge/server.mjs` hvis bridge endres
   - PowerShell parser-sjekk hvis scripts endres

Fast startprompt i ny chat:

```text
Dette er Lynell checkpoint. Bruk dette som prosjektstatus og les relevante filer før du endrer kode. Ikke anta tidligere samtalehistorikk. Fortsett fra valgt oppgave og hold samme prinsipper: SystemConfig som source of truth, lokal kontroll først, rolig premium UI, NIVA som trygg assistent, og ikke rør KNX/runtime/bridge uten eksplisitt behov.

[lim inn checkpoint her]

Neste oppgave:
[skriv konkret oppgave her]
```
