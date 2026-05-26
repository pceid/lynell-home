# Lynell checkpoint v8.14 - NIVA observational intelligence

## Status

v8.14 legger inn deterministisk NIVA observational intelligence og systemforklaringer.

Dette er observerende og forklarende, ikke autonomt. Ingen automasjoner, ML, AI execution, writes, DPT-endringer eller provider-runtime-endringer er lagt inn.

## Endrede filer

- `src/runtime/nivaObservationalIntelligence.ts`
- `src/App.tsx`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`

## Nye observasjonsregler

NIVA har nå deterministiske regler for:

- Brått temperaturfall, ca. >0,7°C på 15 min med aktivt varmebehov
- Temperatur nærmer seg ikke setpunkt etter ca. 90 min med heatDemand
- HeatDemand øker mens temperatur faller
- Temperatur over setpunkt mens varmebehov fortsatt finnes
- Stale temperatur/heatDemand-par
- Høyt heatDemand over tid
- 0% heatDemand mens rom ligger under setpunkt
- Poll timeouts
- Restored/reference-data dominerer live data
- Runtime event-stream instabilitet
- Foundation/prepared providers som ikke skal tolkes som styrbare

## NIVA forklarer nå

NIVA kan svare kort og konkret på:

- Hvor en verdi kommer fra, inkludert GA/DPT/source når finnes
- HeatDemand
- Live KNX vs manual poll
- Restored data
- KNX subscription
- Hent verdier
- Timeout på sone/GA
- Foundation only / Cast foundation
- Hva Lynell er og hva systemet kan hjelpe med

## Manager Diagnose

Manager Diagnose viser:

- NIVA observation rules enabled
- Siste observations
- Temperature drop candidates
- Unmet setpoint candidates
- Stale-confidence warnings
- Explanation intent count
- Severity counts

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK

## Bevisst ikke gjort

- Ingen KNX write/DPT-endring
- Ingen automasjoner
- Ingen ML/AI execution
- Ingen remote control
- Ingen Dreame/Cast/Deltaco runtime-endring
- Ingen provider-styring

## Gjenstår live

- Se om NIVA gir for mange/få observasjoner under soak-test
- Justere terskler etter ekte drift
- Validere språk rundt usikkerhet
- Passe på at "åpent vindu/dør" alltid formuleres som mulig årsak, ikke fasit

## Merknad

Ingen kodeendringer ble gjort i denne checkpoint-oppgaven.
Ingen build ble kjørt for checkpoint-opprettelsen.
