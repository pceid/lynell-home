# Lynell checkpoint v8.21 - Cast reliability + media trust

v8.21 er første provider trust/reliability sprint.

Målet er å gjøre Cast/media oppførsel troverdig og stabil, ikke å bygge flere media-features.

Dette er reliability, stale/offline-håndtering, playback trust og roligere UX.

## Endrede filer

- `bridge/cast-runtime.mjs`
- `bridge/integration-manager.mjs`
- `src/api/homeApi.ts`
- `src/media/mediaTypes.ts`
- `src/media/mediaDevices.ts`
- `src/integrations/truth/integrationTruth.ts`
- `src/App.tsx`
- `src/components/ManagerPanel.tsx`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`

## Root cause

- Cast-runtime behandlet discovery som øyeblikksbasert.
- Enheter hadde bare `online=true` uten:
  - alder
  - stale/offline
  - discovery health
- Frontend merge oppdaterte ikke eksisterende devices når status endret seg.
- Playback kunne derfor fremstå som trygg/playing selv om session/status var gammel.

## Hva som ble lagt inn

### 1. Stable Cast registry

Devices har nå:

- `firstSeen`
- `lastSeenAt`
- `ageMs`
- `discoveryMisses`
- `staleAfterMs`
- `offlineAfterMs`
- `state`:
  - `online`
  - `stale`
  - `offline`
  - `unknown`

Enheter forsvinner ikke aggressivt fra UI ved én misset discovery-runde.

### 2. Playback trust

Playback får:

- `playbackConfidence`
- `sourceFreshness`
- `sessionAgeMs`
- `statusAgeMs`
- `selectedDeviceState`

Stale playback vises ikke lenger som trygg `playing`.

Stale session går til `disconnected`.

### 3. UI/media trust

Media UI og Manager viser:

- online/stale/offline
- siste aktivitet
- confidence
- roligere forklaring ved ingen devices

### 4. NIVA media explanations

NIVA kan forklare:

- hvorfor ingen Cast-enheter vises
- stale/offline
- discovery
- playback confidence
- hvorfor systemet venter på ny discovery

### 5. Integration truth

Integration Manager teller ikke Cast som kontrollklar uten:

- online device
- playback dependency OK

## Verifisert

- `node --check bridge/cast-runtime.mjs` OK
- `node --check bridge/integration-manager.mjs` OK
- `node --check bridge/server.mjs` OK
- `npm run build` OK

## Ikke gjort

- Ingen nye media-features
- Ingen multiroom
- Ingen queue system
- Ingen autoplay
- Ingen automasjoner
- Ingen ML
- Ingen provider-runtime redesign
- Ingen remote control redesign

## Gjenstår live

- Test med ekte Chromecast/Google Home over tid.
- Sleep/wake.
- Nettverksbytte.
- Mobile/desktop stale/offline sync.
- Discovery cadence tuning senere.

## Resultat

- Cast oppfører seg nå mer troverdig og mindre "tilfeldig".
- Provider trust er forbedret uten nye media-features.

