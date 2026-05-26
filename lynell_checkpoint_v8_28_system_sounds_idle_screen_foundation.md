# Lynell checkpoint v8.28 — Systemlyder og hvileskjerm foundation

v8.28 legger inn foundation for Lynell/NIVA systemlyder og hvileskjerm.

Dette er asset/UI/foundation.

Ingen runtime, KNX, provider, action, automasjon eller ML-endringer.

## Endret/opprettet

- `public/audio/lynell/`
- `src/audio/audioManifest.ts`
- `src/audio/audioPlayer.ts`
- `src/App.tsx`
- `src/components/ManagerPanel.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/components/manager/managerTypes.ts`
- `src/config/systemConfig.ts`
- `src/styles.css`

## Audio

- Opprettet audio-struktur under:
  - `public/audio/lynell/`
- 26 gyldige placeholder-WAVer.
- Placeholders er enkle syntetiske toner, ikke ferdig lydproduksjon.
- Mapper inkluderer:
  - `feedback`
  - `information`
  - `alert`
  - `critical`
  - `ambient`
  - `voice`
  - `system`
  - `placeholders`

## Audio manifest/player

- `audioManifest.ts`
- `audioPlayer.ts`
- Manifest inneholder:
  - id
  - filnavn
  - kategori
  - formål
  - defaultEnabled
  - volume
  - cooldown/interrupt
  - placeholder-status
- Audio player håndterer:
  - `playSound(id)`
  - enabled/volume
  - category toggles
  - cooldown
  - missing file graceful handling
  - browser autoplay limitations

## Manager

- Ny `Systemlyder`-seksjon.
- Systemlyder er OFF default.
- Manager viser:
  - master volume
  - kategori-toggles
  - testknapp
  - placeholder-status
  - siste lydstatus

## Safe hooks

- Scene started/completed er koblet som trygg optional audio-hook.
- Hooken spiller ingenting før systemlyder aktiveres.
- Ingen ambient loop er aktivert default.
- Ingen critical sounds spilles automatisk.

## Idle screen

- Hvileskjerm foundation.
- Inneholder:
  - NIVA-core
  - klokke
  - dato
  - rolig runtime-status
  - custom image preview/upload
  - touch/click/keyboard wake
  - idle timeout/config
- Default er konservativ foundation.
- Hvileskjerm er disabled default.

## Custom idle image

- Custom idle image lagres foreløpig som data URL i SystemConfig.
- Dette er praktisk foundation.
- Senere kiosk/server-versjon bør få egen asset-upload/persistence.

## Manager Diagnose

Manager Diagnose viser:

- audio enabled
- idle status
- manifest count
- placeholder count
- missing files
- last sound played
- idle state

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- 26 WAV-placeholders finnes
- Audio-mappene finnes, inkludert `voice` og `placeholders`

## Ikke gjort

- ingen ferdig lydproduksjon
- ingen ambient loops default
- ingen høy lyd default
- ingen runtime/KNX/provider-endringer
- ingen automasjoner
- ingen ML
- ingen ekstern nedlasting
- ingen OS-level screensaver
- ingen ekte kiosk deployment

## Gjenstår senere

- ekte lydproduksjon
- bedre lydprofil per rom/tid/profil
- server asset-upload for kiosk
- evt. egen IP touch/kiosk mode
- mer presis mapping mellom runtime events og lydprofil

Ingen kodeendringer.
Ingen build nødvendig.
