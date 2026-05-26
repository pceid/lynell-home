# Lynell checkpoint v8.30 — Shading visibility, auto-poll targeting and feedback review

## Status

v8.30 er en targeted stabilization for solskjerming visibility, auto-poll targeting og NIVA feedback review.

Dette er UI/config/diagnostics foundation.

Ingen KNX write/DPT-endringer, MQTT, kamera, Cast groups eller språkvalg.

## Endrede filer

- `src/App.tsx`
- `src/config/systemConfig.ts`
- `src/api/homeApi.ts`
- `src/components/ManagerPanel.tsx`
- `src/components/RoomManagerPanel.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`
- `bridge/server.mjs`
- `src/styles.css`

## Solskjerming

- Solskjerming vises nå når aktivert, også med tom GA.
- Tom GA vises som:
  - `Mangler mapping`
- Solskjerming skjules ikke lenger bare fordi mapping mangler.
- Solskjerming-modellen er utvidet med:
  - type
  - sone
  - maturity
  - visibility
  - flere GA-roller
- Actions er disabled/safe ved manglende mapping.
- Ingen KNX write sendes på tom GA.

## Auto-poll quiet signals

Targeting-modell:

- `allEligible`
- `selectedSignals`
- `selectedRooms`
- `selectedGroupAddresses`

Status:

- fortsatt OFF default
- preview viser:
  - GA
  - rom
  - felt
  - updateMode
  - stale-relevans
  - eligibility reason
- onChange-only signaler velges ikke automatisk uten eksplisitt valg

## NIVA / diagnostics

- Conversation feedback review fra lokal/server samtalelogg.
- Feedback grupperes på:
  - page
  - issue type
- Manager Diagnose viser:
  - feedback summary
  - grouped issues
  - latest feedback items

NIVA kan forklare:

- hvorfor solskjerming ikke vises
- hvorfor sone ikke kan styres
- hvilke mappinger som mangler
- hvordan auto-poll er konfigurert
- hvilke signaler auto-poll ville valgt

## Feedback review

NIVA feedback review identifiserte særlig:

- light mode contrast/synlighet
- trend/fullscreen readability
- mobilskalering
- runtime trust mismatch:
  - KNX reagerer før UI feedback
- fragmented light truth/detaljopplevelse

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK

## Ikke gjort

- ingen live KNX shading execution
- ingen shading DPT/write-logikk
- ingen MQTT
- ingen kamera
- ingen Cast groups
- ingen språkvalg
- ingen automasjoner
- ingen ML

## Gjenstår live

- shading KNX write-path
- DPT-valg per shading-control
- feedbackPosition live truth
- trygg ETS-test for shading

## Merk

Ingen kodeendringer.

Ingen build nødvendig.
