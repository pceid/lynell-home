# Lynell checkpoint v8.34 - Camera/NVR + media group foundation

## Status

v8.34 er Product stabilization sprint 9.

Målet er foundation for:

- IP kamera/NVR
- recorder/storage
- media groups
- speaker delay offsets

Dette er architecture/trust/config foundation.

Ingen KNX/write/DPT-, automasjons-, ML- eller provider command-endringer er gjort.

## Endrede filer

- `src/App.tsx`
- `src/config/systemConfig.ts`
- `src/runtime/cameraMediaFoundation.ts`
- `src/components/ManagerPanel.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerMediaSection.tsx`
- `src/api/homeApi.ts`
- `src/styles.css`
- `bridge/runtime-registry.mjs`
- `bridge/runtime-domains.mjs`
- `bridge/integration-manager.mjs`
- `bridge/server.mjs`

## 1. Camera/NVR foundation

Ny server-owned SystemConfig camera config.

Kamera-modell støtter:

- `rtsp`
- `onvif`
- `tapoFoundation`
- `genericIpCamera`

Kamera-felter inkluderer:

- `cameraId`
- `displayName`
- `type`
- `rtspUrl`
- `onvif`
- `snapshotUrl`
- `roomId`
- `enabled`
- `visible`
- `online/stale/offline/unknown`
- `sourceAgeMs`
- `recordingEnabled`
- `recorderTarget`
- `retentionDays`
- `overwriteOldest`
- `motionAvailable`
- `audioAvailable`
- `confidence`

## 2. Recorder/storage foundation

Recorder/storage foundation inkluderer:

- target
- path
- retention
- overwrite
- storage health
- max storage
- free-space estimate

Støttede recorder targets:

- `localDisk`
- `externalDisk`
- `networkPath` future

Dette er config/trust foundation, ikke en ekte recorder pipeline.

## 3. Tapo foundation

Tapo C520WS er lagt inn som prepared/foundation-kandidat.

NIVA/UI kan forklare:

- RTSP
- ONVIF
- Tapo foundation
- hvorfor kamera/recording ikke er live ennå

Det er ikke lagt inn ekte stream, credential flow eller recording.

## 4. Camera UI

Kamera-siden viser foundation-kort.

UI skiller tydelig:

- foundation
- missing stream/snapshot
- recording foundation
- recorder/storage config

Hvis ingen stream finnes, vises rolig:

- "Ingen live stream tilgjengelig ennå"

Snapshot/stream-status vises uten secrets.

## 5. Manager Camera/NVR

Manager har ny seksjon:

- Kamera / NVR

Manager støtter:

- legg til kamera
- velg type
- velg rom
- RTSP/ONVIF/snapshot foundation
- recorder target/path
- retention
- overwrite
- storage health

Secrets vises ikke i diagnostics/UI.

## 6. Media groups foundation

Media groups foundation inkluderer:

- `mediaGroupId`
- `displayName`
- `speakers`
- `castTargets`
- `delayOffsetsMs`
- `enabled`
- `online/stale/offline/unknown`
- `groupConfidence`

Per speaker:

- `offsetMs`
- `calibrationStatus`
- `lastLatencyEstimate`

## 7. Media group Manager/UI

Manager kan:

- opprette media groups
- legge til høyttalere
- sette device id
- sette room key
- sette ms-delay offset
- sette calibration status
- legge inn cast targets

Media-siden viser grupper som foundation.

Det er bevisst ikke lagt inn fake sync-engine, autoplay eller multiroom orchestration.

## 8. Runtime registry/domain

Ny runtime domain:

- `camera`

Ny provider:

- `cameraNvr`

Capabilities foundation:

- `liveStream`
- `snapshot`
- `recording`
- `motion`
- `storage`

Provider maturity er foundation.

Provider støtter read/config/diagnostics foundation, men ikke write/control.

## 9. Diagnostics

Manager Diagnose viser:

- camera count
- missing stream count
- recorder/storage status
- media group count
- speaker count
- cast target count
- delay offset count

Server-owned SystemConfig diagnostics viser også camera/media group summary foundation.

## 10. NIVA

NIVA kan forklare:

- RTSP
- ONVIF
- Tapo foundation
- hvorfor kamera/recording ikke er live ennå
- media groups
- ms-delay foundation

Svarene er forklarende og trust-aware, ikke styrende.

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/integration-manager.mjs` OK
- `node --check bridge/runtime-registry.mjs` OK
- `node --check bridge/runtime-domains.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK

## Ikke gjort

- ingen ekte NVR recording engine
- ingen stream decoding
- ingen cloud upload
- ingen ML/videoanalyse
- ingen full audio sync engine
- ingen autoplay/multiroom orchestration
- ingen KNX/write/DPT-endring
- ingen provider command path-endring

## Gjenstår før family-ready camera/media

- trygg RTSP/ONVIF credential-strategi
- faktisk snapshot/live stream rendering
- recorder pipeline
- storage free-space måling
- ekte Cast group execution
- live latency calibration

## Resultat

Lynell har nå en trygg camera/NVR og media group foundation som kan konfigureres, forklares og vises uten å late som recording, stream decoding eller audio sync allerede finnes.

Ingen kodeendringer.
Ingen build nødvendig.
