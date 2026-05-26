# Lynell Checkpoint v2

## 1. Prosjektstatus

**Lynell Home** er en lokal-first smartbolig-app for styring, overvaking og konfigurasjon av boligfunksjoner. Appen er bygget med React, Vite og TypeScript, med mork premium UI, KNX-integrasjon via lokal bridge, lokal media-runtime og regelbasert NIVA-assistent.

**NIVA** er per naa et regelbasert systemlag for:
- systemstatus og forklaring
- romrapport og anbefalinger
- lys-/klima-/scene-/kalender-/media-handlinger med bekreftelse
- global house snapshot og siste-kjente state
- presence/atmosphere awareness
- visuell presence via NIVA Core

**Nylig ferdigstilt siden checkpoint v1:**
- Home er tydeligere systemflate med stor NIVA presence, klokke/vaer, atmosfaere og diskret boligstatus.
- Global NIVA presence finnes paa alle ikke-Home-flater via floating NIVA Core.
- NIVA Core har visuelle states: `idle`, `thinking`, `alert`.
- NIVA bruker global siste-kjente house snapshot, ikke aktiv view alene.
- Presence Engine er etablert som enkel atmosphere model.
- Runtime-historikk, trend og heatDemand-analyse er flyttet ut i `src/runtime/`.
- NIVA-logikk er splittet i `src/niva/`.
- Manager er splittet i `Manager` og `Room Manager`.
- Room Manager har egne underfaner: Oversikt, Romdata, Klima, Lys, Sensorer, Solskjerming.
- Manager har Bygningsstruktur med Lokasjoner og Rom, inkludert rekkeflytting med opp/ned.
- Teknisk PIN beskytter Manager og Room Manager.
- Desktop/Landscape layout foundation er lagt inn med app-shell, venstre rail og justert floating NIVA.
- Mobilnav er flyttet ut av innholdsflow og bruker kompakt meny/drawer.
- Lokal media runtime er etablert med lokalt MP3-bibliotek, fallback mock library og HTMLAudioElement-avspilling.
- Bridge har media-endepunkter for bibliotek og servering av lydfiler.
- Vacuum og Zigbee har mock/strukturmoduler.
- VPN/Tailscale readiness er lagt inn i config og dokumentasjon.

**Modenhet/stadie:**
- Funksjonell lokal prototype med ekte KNX bridge-struktur og lokal mediaavspilling.
- UI er i aktiv premium/polish-fase.
- NIVA er regelbasert og integrert, men ikke AI/backend.
- Runtime/cache/snapshot er etablert, men trenger fullskala hjemmetest.
- Manager/Room Manager er funksjonelle, men krever videre teknisk UX-polish.

## 2. Arkitektur

### Frontend

- Hovedappen ligger i `src/App.tsx`.
- Ingen routing; appen bruker intern view-switch.
- App-shell har:
  - Home som systemflate
  - funksjonsflater for Rom, Lys, Klima, Solskjerming, Kamera, Media, Kalender, Manager og Room Manager
  - venstre side-rail paa desktop/bred skjerm
  - mobil menyknapp med slide-in drawer
  - floating NIVA Core paa ikke-Home-flater
- `layoutMode` finnes som foundation:
  - `mobile`
  - `desktop`
  - lagres i `localStorage`
  - setter `app-shell--mobile` / `app-shell--desktop`
- Desktop mode er foundation, ikke full desktop redesign.

### Runtime

- Runtime-rom avledes fra `SystemConfig.rooms`.
- `Room` i `src/data/rooms.ts` er fortsatt runtime-visningsmodell.
- Appen holder siste-kjente `rooms` state globalt.
- Live/simulate feedback merges inn i global rooms state.
- Runtime-historikk ligger i app-state, men ren logikk ligger i `src/runtime/`.
- Historikk brukes for:
  - mini-grafer
  - temperaturtrend
  - brightness trend
  - heatDemand-analyse
  - NIVA-romrapport
- Snapshot-punkter opprettes jevnlig fra siste-kjente rooms state, ikke bare aktiv view.

### Global NIVA Awareness

- `src/niva/nivaHouseSnapshot.ts` bygger `NivaHouseSnapshot`.
- Snapshot inkluderer:
  - alle rom
  - rom med temperatur
  - rom med heatDemand
  - aktive lyssoner
  - systemstatus
  - bridge/connection
  - media
  - weather
  - calendar
  - presence
  - diagnose-tellinger
- NIVA skal bruke global snapshot som hovedkilde.
- Aktiv view brukes kun som kontekst, for eksempel "her" eller valgt rom.

### Managers

**Manager**
- System-manager for global boligstruktur og drift.
- Eier redigering av:
  - Bolig
  - Nettverk/VPN
  - Bygningsstruktur
  - Lys/klima globalt
  - Solskjerming
  - Sensorer
  - Værstasjon
  - Kalender/scener/media config
  - Drift/diagnose
  - MQTT/integrasjoner
  - Teknisk tilgang/PIN
- Bruker samme draft `SystemConfig` som resten av appen.

**Room Manager**
- Teknisk romflate for ett valgt rom.
- Viser og redigerer per-rom data:
  - romdata
  - klimaadresser/datatypes
  - lyssoner/adresser/datatypes/tolkningsregler
  - sensorer
  - solskjerming for rommet
- Har romvelger gruppert etter lokasjon/rekkefolge.
- Er full side, ikke modal.
- Bruker samme draft `SystemConfig` som Manager.

### Bridge

- `bridge/server.mjs` er lokal Node bridge.
- KNX-bibliotek: `knx`.
- Bridge er passiv ved oppstart og venter paa runtime config fra appen.
- Appen sender runtime config til `/api/runtime/config`.
- Write-path er runtime-config-drevet.
- Bridge har health endpoint.
- Bridge har lokale media-endepunkter:
  - `GET /api/media/library`
  - `GET /media/music/:filename`
- Media-filer serveres trygt fra `media/music/` med path traversal-beskyttelse.

### Media

- `src/media/` eier media-modeller og lokal player state.
- Library kan vaere:
  - `local`
  - `mock`
  - `empty`
- Lokal MP3-avspilling skjer i nettleseren via HTMLAudioElement.
- Bridge scanner `media/music/` for `.mp3`.
- Sonos/Google Home er kun device-struktur/mock, ikke ekte integrasjon.

### Presence

- `src/presence/` eier atmosphere engine.
- Presence er ikke automasjon.
- Presence bygger stemningstilstand fra:
  - tid
  - global mode
  - lys
  - romaktivitet/heatDemand
  - weather
  - media mood
  - kalender
  - robot mock
- Output brukes paa Home og i NIVA.

## 3. Viktige filer

### App og UI

- `src/App.tsx`
  - Hovedapp, view-switch, state ownership, runtime sync, NIVA-panel, Home, funksjonsflater, media audio runtime, PIN-flow og Manager/Room Manager wiring.
- `src/styles.css`
  - Globalt designsystem, app-shell, mobile drawer, desktop rail, NIVA presence, Home, Rom, Manager, Room Manager, media og responsive polish.
- `src/components/NivaCore.tsx`
  - Visuell NIVA Core med glow, puls og states.
- `src/components/ManagerPanel.tsx`
  - Manager UI for global systemkonfig, diagnose, nettverk, bygningsstruktur, media, vaerstasjon, sensorer, MQTT og teknisk tilgang.
- `src/components/RoomManagerPanel.tsx`
  - Room Manager UI med underfaner og per-rom teknisk konfig.
- `src/components/manager/*`
  - Utskilte Manager-seksjoner, blant annet tabs, diagnose og media-seksjon.

### Config og data

- `src/config/systemConfig.ts`
  - `SystemConfig` source of truth, initial config, typer og mapping helpers.
- `src/data/rooms.ts`
  - Runtime room/zone typer: `Room`, `LightZone`, `RoomMode`, `RoomKey`, `RoomGroup`, `ZoneKey`.
- `src/knx/knxMapping.ts`
  - KNX mapping-relaterte typer og adaptergrunnlag.

### Runtime

- `src/runtime/runtimeHistory.ts`
  - Historikktyper, append/limit per serie, trend, mini-grafverdier og bygging av historikkpunkter.
- `src/runtime/roomAnalytics.ts`
  - Rominnsikt basert paa temperaturhistorikk.
- `src/runtime/heatDemandAnalysis.ts`
  - Romvolum, heatDemand-analyse, labels og symboler.

### NIVA

- `src/niva/nivaTypes.ts`
  - NIVA meldinger, actions og felles typer.
- `src/niva/nivaIntent.ts`
  - Regelbasert intent parsing.
- `src/niva/nivaResponses.ts`
  - Quick prompts og tekstrespons-logikk.
- `src/niva/nivaActions.ts`
  - NIVA action/proposal helpers.
- `src/niva/nivaInsights.ts`
  - Proaktive innspill og innsikter.
- `src/niva/nivaWeather.ts`
  - Værbevissthet.
- `src/niva/nivaRoomReport.ts`
  - Romrapport og anbefalinger.
- `src/niva/nivaDiagnostics.ts`
  - Diagnoseoversettelser.
- `src/niva/nivaHouseSnapshot.ts`
  - Global NIVA house snapshot.

### Media

- `src/media/mediaTypes.ts`
  - `MediaTrack`, `MediaDevice`, `MediaPlayerState`.
- `src/media/mediaLibrary.ts`
  - Lokal/mock library loading og fallback.
- `src/media/mediaPlayer.ts`
  - Player state helpers: play, pause, next, previous, volume, progress.
- `src/media/mediaDevices.ts`
  - Device-modell for Local Speaker, Google Home, Sonos.

### Presence

- `src/presence/presenceTypes.ts`
  - Presence state, input og signaltyper.
- `src/presence/presenceEngine.ts`
  - Enkel heuristisk atmosphere engine.

### Integrasjoner

- `src/integrations/vacuum/vacuumTypes.ts`
  - Vacuum device/status-modell.
- `src/integrations/vacuum/vacuumMock.ts`
  - Dream D20 Plus mock device.
- `src/integrations/zigbee/zigbeeTypes.ts`
  - Zigbee device-konsepter.
- `src/integrations/zigbee/zigbeeDevices.ts`
  - SONOFF ZBDongle-E og mock edge devices.

### API og bridge

- `src/api/homeApi.ts`
  - Frontend API-lag mot bridge og fallback/simulate.
- `src/api/weatherApi.ts`
  - Værdata/forecast API.
- `bridge/server.mjs`
  - Node bridge for KNX, health, runtime config, feedback og media servering.

### Drift

- `scripts/start-bridge.ps1`
  - Starter bridge.
- `scripts/start-frontend.ps1`
  - Starter frontend.
- `scripts/start-lynell-server.ps1`
  - Starter Lynell serveroppsett.
- `SERVER_SETUP.md`
  - Lokal serverdrift, autostart og Tailscale/VPN-anbefaling.

## 4. Datamodeller

### Room / LightZone

```ts
type LightZone = {
  id: string
  key: string
  name: string
  lightsOn: boolean
  brightness: number
  dimmable: boolean
}

type Room = {
  id: number
  key: string
  group: string
  name: string
  configured: boolean
  temperature: number
  targetTemperature: number
  zones: LightZone[]
  mode: 'Komfort' | 'Natt'
  heatDemand?: number | null
}
```

### SystemConfig

```ts
type SystemConfig = {
  housing: HousingConfig
  network: NetworkConfig
  mqtt: MqttConfig
  runtime: RuntimeConfig
  security: SecurityConfig
  media: MediaConfig
  calendar: CalendarConfig
  scenes: SceneConfig[]
  floors: FloorConfig[]
  rooms: SystemRoomConfig[]
  shading: SystemShadingConfig[]
  weatherStation: SystemWeatherStationConfig
  technical: SystemTechnicalConfig
  integrations: SystemIntegrationConfig
}
```

### Room Manager relevante modeller

```ts
type FloorConfig = {
  id: string
  label: string
  roomGroup: string
}

type SystemRoomConfig = {
  id: number
  key: string
  group: string
  name: string
  configured: boolean
  heatEmitterType?: HeatEmitterType
  floorAreaM2?: number | null
  ceilingHeightM?: number | null
  roomVolumeM3?: number | null
  manualVolumeM3?: number | null
  note?: string
  climate: SystemClimateConfig
  sensors?: SystemSensorConfig
  zones: SystemZoneConfig[]
}
```

### Zone config

```ts
type SystemZoneConfig = {
  id: string
  key: string
  name: string
  dimmable: boolean
  light: string
  lightDataType?: KnxDataType
  value: string
  valueDataType?: KnxDataType
  lightFeedback: string
  lightFeedbackDataType?: KnxDataType
  valueFeedback: string
  valueFeedbackDataType?: KnxDataType
  feedbackInterpretationRule?: 'standard' | 'boolFromValueAboveZero'
  deriveLightStateFromValueFeedback?: boolean
}
```

### Sensor config

```ts
type SystemSensorConfig = {
  presence: { address: string; dataType?: KnxDataType }
  motion: { address: string; dataType?: KnxDataType }
  co2: { address: string; dataType?: KnxDataType }
  humidity: { address: string; dataType?: KnxDataType }
  floorTemperature: { address: string; dataType?: KnxDataType }
  lux: { address: string; dataType?: KnxDataType }
}
```

### Weather station config

```ts
type SystemWeatherStationConfig = {
  active: boolean
  outdoorTemperature: string
  lightEast: string
  lightSouth: string
  lightWest: string
  lux: string
  wind: string
  windAlarm: string
  rain: string
  frostAlarm: string
  sunElevation: string
  azimuth: string
}
```

Alle punkter har tilhorende `...DataType?: KnxDataType`.

### Media

```ts
type MediaTrack = {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  filename: string
  mood?: 'calm' | 'focus' | 'morning' | 'evening' | 'energetic' | 'sleep'
  source?: 'local' | 'mock'
  sourceUrl?: string
}

type MediaPlayerState = {
  currentTrackId: string | null
  isPlaying: boolean
  volume: number
  activeDeviceId: string
  queueTrackIds: string[]
  elapsed: number
  updatedAt: number
}
```

### Presence

```ts
type HousePresenceState =
  | 'quiet'
  | 'active'
  | 'evening'
  | 'night'
  | 'away'
  | 'focus'
  | 'storm'
  | 'cozy'
```

`HousePresence` inneholder `state`, `label`, `nivaSummary`, aktive romnavn og signaler.

### NIVA snapshot

```ts
type NivaHouseSnapshot = {
  rooms: Room[]
  roomsWithTemperature: Room[]
  roomsWithHeatDemand: Room[]
  activeLightZones: Array<{ roomName: string; zoneName: string; brightness: number }>
  system: {
    homeStatus: string
    systemMode: string
    bridgeStatusLabel: string
    bridgeReady: boolean
    connectionMode: 'localDirect' | 'remoteTunnel'
  }
  media: {
    player: MediaPlayerState
    currentTrack: MediaTrack | null
    activeDevice: MediaDevice | null
  }
  weather: NivaWeatherAwareness
  calendar: { todayCount: number; nextEventText: string | null }
  presence: HousePresence
  diagnostics: {
    roomCount: number
    roomsWithTemperatureCount: number
    roomsWithLightDataCount: number
    roomsWithHeatDemandCount: number
    historyPointCount: number
  }
}
```

## 5. Ferdig funksjonalitet

### Home

- Home er systemflate.
- Stor NIVA presence vises kun paa Home.
- Home viser klokke, vaer, presence-linje, boligstatus, scener/kalender/media-status der relevant.
- Boligstatus er sekundar/collapsible.

### Rom

- Rom-fanen viser valgt rom med:
  - temperatur
  - settpunkt
  - modus
  - heatDemand/status
  - lysstatus
  - mini-graf
  - NIVA romrapport
- Rom-fanen har knapp til Room Manager for valgt rom.

### Room Manager

- Full side.
- Romvelger gruppert etter lokasjon.
- Underfaner:
  - Oversikt
  - Romdata
  - Klima
  - Lys
  - Sensorer
  - Solskjerming
- Lys bruker accordion per sone.
- Lagre/Forkast bruker samme config-flyt som Manager.

### Manager

- Global system-manager.
- Har struktur for:
  - Bolig
  - Nettverk/VPN
  - Bygningsstruktur
  - Lys
  - Klima
  - Solskjerming
  - Sensorer
  - Værstasjon
  - Kalender
  - Media
  - Drift
  - MQTT
  - Diagnose
  - Teknisk
  - Integrasjoner
- Lokasjoner og rom kan flyttes opp/ned.
- Sensorer er tabell-lignende: 1 sensor = 1 rad.
- Værstasjon har realistiske KNX-punkter.

### PIN

- `security.pinEnabled` beskytter Manager og Room Manager.
- Unlock skjer i session.
- `lockOnNewSession` styrer session/local storage.
- Dette er kun lokal teknisk tilgang, ikke backend-auth.

### Media playback

- Frontend henter lokalt bibliotek fra bridge.
- Fallback til mock library hvis bridge/media ikke er tilgjengelig.
- MP3 fra `media/music/` kan spilles i nettleseren.
- Play/pause, next/previous, volume og progress finnes.
- NIVA kan svare paa/spille/pause lokal media-state.

### Diagnose

- Manager Diagnose viser system-/bridge-/runtime-helse.
- Bridge health viser runtime config mottatt, connection mode, mapping counts og subscribe status.
- NIVA snapshot debug logger tellerom/data i console.

### Global snapshot

- NIVA bruker global house snapshot for:
  - husstatus
  - lys paa
  - temperatur
  - heatDemand
  - media
  - kalender
  - presence
  - bridge/diagnose

### Weather awareness

- NIVA kan svare paa vaer, regn, vind, i morgen og sist oppdatert.
- Home viser vaerstatus.
- Værstasjon config finnes, men ikke full runtime for alle punkter.

### Presence engine

- Home viser diskret presence-linje.
- NIVA kan svare paa:
  - "Hvordan foles huset?"
  - "Hva skjer hjemme naa?"
  - "Er huset rolig naa?"

### HeatDemand

- HeatDemand-analyse finnes per rom.
- Bruker historikk og/eller siste kjente heatDemand.
- Romrapport kan gi forelopig vurdering naar datagrunnlaget er begrenset.

### Layout

- Mobil:
  - kompakt menyknapp
  - slide-in nav drawer
  - floating NIVA paa ikke-Home
- Desktop:
  - venstre rail
  - desktop/landscape foundation
  - bredere content wrapper

### NIVA actions

- NIVA kan lage forslag med Bekreft/Avbryt.
- Handlinger utfores kun etter bekreftelse.
- Effektbekreftelse finnes for relevante lys/klima/media-handlinger.
- NIVA kan aapne Room Manager for valgt rom via regelbasert intent.

## 6. Delvis implementert

- Desktop/Landscape mode:
  - shell foundation finnes
  - full desktop dashboard/wall-panel layout er ikke ferdig
- MQTT:
  - config og UI finnes
  - ingen broker-runtime
- Sonos/Google Home:
  - device-modell/mock finnes
  - ingen ekte API
- Vacuum:
  - Dream D20 Plus mock finnes
  - ingen ekte integrasjon
- Zigbee:
  - SONOFF ZBDongle-E og device-konsepter finnes
  - ingen runtime
- Weather:
  - ekstern vaer-awareness finnes
  - vaerstasjon config finnes
  - ingen full KNX runtime for vaerstasjon
- NIVA:
  - regelbasert
  - ingen ekstern AI
  - ingen tale
  - ingen langtidshukommelse utover app-state/localStorage
- Analytics:
  - grunnlag via runtime history
  - ingen avansert rapportering
- Persistent history:
  - ikke implementert
- Automations:
  - scener finnes
  - ingen full regelmotor/automasjonsmotor

## 7. Ikke startet

- Full AI/NIVA backend.
- Tale/stemme.
- Brukeradmin/roller/backend-auth.
- Pushvarsler.
- Ekte Sonos runtime.
- Ekte Google Home runtime.
- Ekte Zigbee runtime.
- Ekte robotstovsuger-integrasjon.
- Database.
- Persistent runtime history.
- Wall panel mode.
- Avansert energianalyse.
- Full automasjonsmotor.
- Ekte MQTT broker runtime.
- BACnet runtime.
- Produksjonsklar sikkerhetsmodell.

## 8. Viktige arkitekturvalg

- `SystemConfig` er source of truth for bolig/anlegg.
- Runtime state er avledet fra `SystemConfig` og feedback.
- Appen er local-first og offline-first saa langt som mulig.
- Minimal backend dependency: bridge brukes for KNX/media, ikke som sentral database.
- Home er systemflate.
- Andre views er funksjonsflater og skal ikke vise Home hero.
- Manager er systemets sannhet.
- Room Manager er rommets sannhet.
- NIVA er system awareness layer, ikke bare chat.
- NIVA skal bruke global snapshot/siste-kjente state.
- KNX er robust grunnsystem/backbone.
- Write-path skal vaere separert fra feedback.
- Write-path skal komme fra runtime config, ikke hardkodes.
- Feedback kan vaere subscribe eller polling avhengig av mode/tilgjengelighet.
- UI skal vaere rolig, premium, mork og lav-stoy.
- Mobil er primarplattform, desktop er system shell/foundation.
- Ingen KNX/runtime/bridge-endringer uten eksplisitt behov.

## 9. Kjente feil / teknisk gjeld

- `src/App.tsx` er fortsatt stor og kompleks.
- Vite advarer om chunk > 500 kB etter minification.
- Manager er splittet, men trenger mer komponentisering.
- Manager layout har faatt bedre scaling, men bor testes paa ekte mobil/landscape.
- Desktop mode er foundation, ikke ferdig desktop UX.
- Runtime feedback/subscription/polling er kompleks.
- Subscribe-strategier er localDirect-orientert og maa testes stabilt hjemme.
- Runtime history er kun i memory.
- NIVA snapshot er globalt, men ma verifiseres med ekte live-data over tid.
- Media playback er lokal browser-avspilling, ikke multiroom.
- Media metadata er enkel og basert paa filename/mock.
- Integrasjoner for vacuum/Zigbee/Sonos/Google er mock/struktur.
- PIN er lokal klientbeskyttelse, ikke ekte sikker auth.
- Vaerstasjon har config, men ingen full runtime.
- Weather forecast/awareness kan feile ved nett/API-problemer.
- Layout edge cases kan finnes i:
  - Manager Bolig/Nettverk/Media/Værstasjon/Sensorer
  - Room Manager brede felt
  - mobil keyboard/input
  - landscape small tablets

## 10. Neste anbefalte spor

### 1. Etter hjemme-test

- Stabiliser live KNX feedback.
- Bekreft at NIVA snapshot leser siste-kjente state fra Home uten aa besoeke Lys/Klima/Rom forst.
- Test heatDemand/historikk over tid.
- Test reconnect/refresh etter bridge restart.
- Test Manager/Room Manager PIN-flow.
- Test media med ekte MP3-filer.
- Logg konkrete layoutfeil fra mobil og landscape.

### 2. Kort sikt

- Mobile polish etter ekte bruk.
- Manager/Room Manager komponentisering.
- Bedre runtime diagnostics for subscriptions/cache.
- Persist runtime history lett i localStorage eller IndexedDB.
- Forbedre media metadata uten tung parser.
- Rydde App.tsx videre.
- Legge bedre error states for media/bridge/weather.

### 3. Mellomlang sikt

- MQTT runtime.
- Ekte Zigbee foundation.
- Sonos eller Google Home som forste ekte media-output.
- Bedre analytics for rom, varmebehov og lysbruk.
- Automations foundation med enkle regler.
- Wall-panel layout mode.
- NIVA mer kontekstuell, men fortsatt trygg og bekreftelsesbasert.

### 4. Lang sikt

- AI/NIVA backend eller lokal modell.
- Taleinput/output.
- Robust bruker-/rollemodell.
- Pushvarsler.
- Persistent database.
- Multiroom media.
- Full integrasjonsplattform.
- Avansert energioptimalisering.

## 11. Hjemmetest / fullskala test

Test dette hjemme:

- Mobil:
  - Home top spacing
  - nav drawer
  - floating NIVA
  - scrolling
  - input/touch targets
- Desktop/Landscape:
  - venstre rail
  - content margin
  - floating NIVA edge-position
  - Manager bredde
- Manager:
  - PIN aktiv/inaktiv
  - session unlock
  - lagre/forkast
  - Bygningsstruktur rekkefolge
  - sensor rows uten overlap
  - vaerstasjon rows uten overlap
- Room Manager:
  - romvelger gruppert etter lokasjon
  - underfaner
  - endre heatDemand-adresse og lagre
  - lys accordion
  - sensorer/solskjerming per rom
- Media:
  - legg `.mp3` i `media/music/`
  - start bridge/frontend
  - se sang i Media
  - play/pause
  - next/previous
  - volume
  - progress
  - fallback ved tomt bibliotek
- NIVA snapshot:
  - sporr fra Home: "Hvordan har huset det?"
  - sporr: "Er noen lys paa?"
  - sporr: "Hvordan er det i Entre?"
  - sporr: "Har noen rom hoyt varmebehov?"
  - bekreft at NIVA bruker siste-kjente globale data
- Weather:
  - Home vaer
  - NIVA vaersporsmal
  - feilstate ved manglende nett/API
- Room reports:
  - rom med temperatur
  - rom med settpunkt
  - rom med heatDemand
  - lite data -> forelopig vurdering
- Live feedback:
  - lys subscribe/polling
  - klima subscribe/polling
  - heatDemand feedback
  - reconnect etter bridge restart
- LAN/VPN:
  - lokal URL
  - Tailscale/VPN host
  - bridge health
- Performance:
  - lang sesjon
  - memory leaks
  - timers/audio cleanup
  - repeated view switching
- Refresh behavior:
  - localStorage config lastes
  - PIN session/local unlock
  - layoutMode beholdes
  - media fallback fungerer

## 12. Rehydrering i ny chat

### Slik brukes checkpointet

- Les `lynell_checkpoint_v2.md` for prosjektstatus og prinsipper.
- Ikke anta tidligere samtalehistorikk.
- Behandle dette dokumentet som gjeldende hovedkontekst.
- Verifiser alltid faktisk kode foer endringer.
- Ikke ror KNX/runtime/bridge/write-path uten eksplisitt oppgave.

### Filer som bor leses forst

1. `lynell_checkpoint_v2.md`
2. `src/App.tsx`
3. `src/config/systemConfig.ts`
4. `src/components/ManagerPanel.tsx`
5. `src/components/RoomManagerPanel.tsx`
6. `src/niva/nivaHouseSnapshot.ts`
7. `src/runtime/runtimeHistory.ts`
8. `src/runtime/heatDemandAnalysis.ts`
9. `src/media/mediaTypes.ts`
10. `src/presence/presenceEngine.ts`
11. `bridge/server.mjs` bare hvis oppgaven gjelder bridge/media/KNX
12. `src/styles.css` hvis oppgaven gjelder UI/layout

### Slik startes ny Codex-chat

Bruk en kort oppgave med:
- referanse til `lynell_checkpoint_v2.md`
- tydelig maal
- eksplisitte ikke-gjor-regler
- verifisering, normalt `npm run build`

### Standard startprompt

```text
Les lynell_checkpoint_v2.md i prosjektet og bruk den som systemkontekst.

Vi jobber videre med Lynell Home / Lynell NIVA.
Viktig:
- Ikke ror KNX runtime, bridge, write-path eller subscribe-strategier uten eksplisitt behov.
- SystemConfig er source of truth.
- Home er systemflate, funksjonsflater er separate.
- Manager = systemets sannhet.
- Room Manager = rommets sannhet.
- NIVA er system awareness layer og skal bruke global siste-kjente state.

Oppgave:
[beskriv konkret neste steg]

Verifisering:
- npm run build
```

## 13. Viktig

- Dette checkpointet erstatter tidligere checkpoint som hovedkontekst.
- Det beskriver prosjektet slik det er naa etter Manager/Room Manager-arkitektur, media runtime, presence engine, global NIVA snapshot, mobilnav og desktop foundation.
- Videre arbeid skal vaere kontrollert og trinnvis.
- Ikke bygg nye runtime-/bridge-/KNX-sideeffekter som del av UI- eller Manager-polish.
- Nye integrasjoner skal bygges modulart og mock/foundation forst.
- NIVA skal utvikles som rolig systemlag, ikke som separat chatbot.

## Kritiske prinsipper som ikke skal brytes

- SystemConfig er eneste source of truth.
- Runtime skal avledes fra config + feedback.
- Home er systemflate, ikke dashboard-grid.
- Funksjonsflater skal være separate og rolige.
- NIVA skal være system-awareness layer, ikke chat-widget.
- KNX write-path skal aldri hardkodes i UI.
- Write og feedback skal holdes separert.
- Manager og Room Manager skal bruke samme draft/save-flyt.
- UI-polish skal ikke introdusere nye runtime-sideeffekter.
- Mobilopplevelse er primær prioritet.

---

## Designintensjon for NIVA

NIVA skal oppleves som en rolig systemtilstedeværelse i huset,
ikke som en tradisjonell AI-chatbot.

Designreferanser:
- ambient OS-presence
- subtil teal glow
- mørk premium UI
- lav visuell støy
- myke overganger
- system awareness først, tekst sekundært

NIVA Core er husets “heartbeat”, ikke en app-logo.

---

## Presence Engine-prinsipp

Presence Engine skal i første omgang:
- beskrive
- tolke
- visualisere

husets stemning og aktivitetstilstand.

Presence Engine skal ikke automatisk styre huset uten et senere eksplisitt automasjonslag.

---

## Nåværende hovedfokus

Prosjektet er nå i:
- stabiliseringsfase
- fullskala hjemmetest
- runtime-validering
- UI/polish-fase

Prioritet:
1. stabilitet
2. korrekt snapshot/runtime
3. mobilopplevelse
4. premium-følelse
5. trygg lokal drift

---

## Viktig milepæl – lokal media runtime

Lynell har nå ekte lokal audio-runtime via HTMLAudioElement.

Dette er ikke lenger kun simulert media-state.

MP3-filer fra `media/music/` kan:
- listes fra bridge
- avspilles lokalt
- styres via NIVA
- bruke play/pause/progress/volume

---

## Sikkerhetsstatus

Dagens PIN/systemtilgang er kun lokal teknisk beskyttelse
for hjemmetest og intern drift.

Dette er ikke produksjonsklar sikkerhet.

Ingen backend-auth, brukerroller eller sikker ekstern eksponering er implementert ennå.
