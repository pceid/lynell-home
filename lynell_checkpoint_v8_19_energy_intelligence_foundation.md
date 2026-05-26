# Lynell checkpoint v8.19 - Energy intelligence foundation

v8.19 legger inn energy intelligence foundation.

Dette er grunnlag for strøm-/energimåler, varmeestimat og NIVA energiobservasjoner.

Dette er foundation og observerende intelligens, ikke autonom styring.

## Endrede filer

- `src/runtime/energyIntelligence.ts`
- `src/App.tsx`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/api/homeApi.ts`
- `bridge/runtime-domains.mjs`
- `bridge/runtime-registry.mjs`
- `bridge/integration-manager.mjs`

## Lagt inn

- `energyMeter` som foundation provider i registry/Integration Manager.
- Energy data model:
  - `currentPowerW`
  - `currentConsumptionKwh`
  - `hourlyConsumptionKwh`
  - `dailyConsumptionKwh`
  - `heatingEstimatedKwh`
  - `heatingShareEstimate`
  - `spotPrice`
  - `gridTariff`
  - `priceArea`
  - `source`
  - `confidence`
  - `timestamp`
  - `estimated/actual`
- Provider candidates:
  - `fortum`
  - `hanPort`
  - `elhub`
  - `nordpool`

## NIVA energy observations

- høyt varmebehov over tid
- nattvarme
- varme uten temperaturstigning
- mulig energityv
- feriemodus-pattern foundation
- forklaringer for energiestimat, Fortum, HAN/AMS, Elhub, Nord Pool, benchmark, Earth Hour/energitime, auto-poll og feriemodus

## Manager Diagnose

- Energy intelligence-seksjon
- provider-status
- datakilder
- varmeestimat
- observations
- auto-poll OFF
- dry-run energy event
- KNX block-signal future note

## Avgrensning

- ingen Fortum login/scraping
- ingen credentials
- ingen autonom styring
- ingen Earth Hour execution
- ingen KNX block write
- ingen DPT/write-endringer
- auto-poll stille rom er false default og kjører ingenting

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/integration-manager.mjs` OK
- `node --check bridge/runtime-registry.mjs` OK
- `node --check bridge/runtime-domains.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK

## Gjenstår for ekte integrasjon senere

- trygg datakilde
- credential-strategi
- rate limits
- prisområde
- måleformat
- source/confidence før NIVA kan omtale faktisk forbruk/spotpris

Ingen kodeendringer.
Ingen build nødvendig.
