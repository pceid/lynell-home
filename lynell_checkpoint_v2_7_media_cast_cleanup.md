# Lynell Checkpoint v2.7 - Media / Cast cleanup

## Status

Dette checkpointet dokumenterer Media/Cast cleanup etter Dreame native status-milepælen.

Målet var å rydde kjente Media/Cast-feil uten å endre Dreame, KNX eller vacuum-runtime.

## Cast track change

Fikset:

- `next`
- `previous`
- valg av ny sang

Når aktiv output er en discovered Cast-device, rutes track change nå til aktiv Cast-device via Cast playback.

Lokal browser playback pauses når Cast er aktiv output, slik at HTMLAudioElement ikke starter parallelt i nettleseren.

## Cast volume

Cast volum er koblet via bridge endpoint:

- `POST /api/cast/volume`

Når aktiv output er Cast:

- volumendring sendes til Cast-session
- lokal `HTMLAudioElement.volume` brukes ikke som runtime-eier

Når aktiv output er lokal:

- lokal `HTMLAudioElement.volume` brukes som før

Begrensning:

- faktisk Cast volume krever aktiv Cast-session
- hvis ingen aktiv Cast-session finnes, rapporterer Lynell dette rolig og ærlig

## Live outputs vs foundation/mock

Mock/foundation devices er skilt fra live outputs.

Når ekte Cast devices finnes, viser live output-listen:

- Denne enheten
- discovered Cast devices

Foundation/mock outputs vises separat som dev/foundation og fremstår ikke som live-valgbare enheter.

Dette gjelder særlig:

- mock Google Home
- mock Sonos
- foundation Bluetooth/output devices

## Ikke rørt

Følgende runtime-lag ble ikke endret:

- Dreame runtime
- KNX runtime/write-path
- vacuum-runtime

Ingen endringer ble gjort i robotstatus, robotkommandoer, KNX write-path eller KNX feedback-strategi.

## Gjenværende begrensninger

Ikke implementert:

- multiroom
- queue-system
- Spotify auth
- YouTube auth
- full Cast session manager
- robust reconnect/session recovery

Cast playback er fortsatt kontrollert test/live foundation, ikke full streamingplattform.

## Arkitekturretning

Lynell går gradvis bort fra mock-first og mot live-runtime-first arkitektur.

Mock beholdes primært for:

- development
- offline UI testing
- demo/foundation mode

Live runtime skal alltid vises tydelig som live, og mock/foundation skal ikke blandes inn som om det er ekte tilkoblet hardware.

## Verifisert

- `npm run build` OK
- `node --check bridge/cast-runtime.mjs` OK
- `node --check bridge/server.mjs` OK
