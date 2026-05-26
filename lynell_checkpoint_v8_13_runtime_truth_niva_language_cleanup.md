# Lynell Checkpoint v8.13 - Runtime Truth + NIVA Language Cleanup

## Status

v8.13 rydder runtime truth, trend/detail lineage og NIVA språk før soak-test.

Dette er stabilisering/polish, ikke ny feature.

Ingen runtime actions, automasjoner, ML, write/DPT eller provider-adferd er endret.

## Runtime Truth / Lighting Feedback

- `lightFeedback` og `valueFeedback` merger nå per sone i `runtime-state-store`.
- `lightFeedback` og `valueFeedback` overskriver ikke lenger hverandre.
- `lightSource`, `brightnessSource`, GA, DPT og metadata bevares.
- Runtime-events sender råfelt og `normalizedField` slik at UI-token/grønt blink får riktig trigger.
- App resolver lys fra KNX-cache, server snapshot og historikk med samme room truth som UI.
- Sone-matching støtter både `zone.key` og `zone.id`.

## Trend / Detail Lineage

- Trend detail bygger nå fra zone-level lighting points.
- Egen "Sonenivå lys"-seksjon viser:
  - zone
  - verdi
  - source type
  - source
  - confidence
  - GA/DPT
  - timestamp
- `snapshot`, `roomSnapshotReference`, `frontendFallback`, `derivedQuery`, `aggregate`, `demo`, `simulate` og `unknown` filtreres ut fra normal live detail.
- Reference/derived vises separat.
- `groupValueResponse` prioriteres over `knx-subscription` ved dedupe.
- Zone3 timeout vises som timeout, ikke liveverdi.
- Room-level lys-snitt merkes som `aggregate`, ikke snapshot.

## HeatDemand Precision

- HeatDemand beholder presisjon i tooltip/detail.
- Kort kan vise rundet verdi, men detail skal kunne vise f.eks. `16,9%`.

## Room / Klima / NIVA Truth

- NIVA, house snapshot og comfort awareness bruker `resolvedRooms`.
- Rom, Klima og NIVA bygger på samme temperatur/lys/heatDemand truth.

## NIVA Language Cleanup

- NIVA-svar går gjennom dedupe/polish før visning.
- Gjentatte observasjoner slås sammen.
- Live KNX/manualPoll gir tryggere direkte språk.
- Restored/sparse data får forsiktigere språk og caveat som "Basert på sist kjente historikk".
- Flere "virker ..."-fraser er byttet til roligere og mer konkrete formuleringer.
- Manager Diagnose viser:
  - NIVA source summary
  - live/restored/sparse wording counts
  - dedupe count
  - stale/source-aware wording count

## Endrede Filer

- `bridge/server.mjs`
- `bridge/runtime-state-store.mjs`
- `bridge/cast-runtime.mjs`
- `src/App.tsx`
- `src/api/homeApi.ts`
- `src/runtime/sourceTrust.ts`
- `src/runtime/runtimeHistory.ts`
- `src/runtime/lightHistory.ts`
- `src/runtime/comfortEnergy.ts`
- `src/runtime/heatDemandAnalysis.ts`
- `src/niva/nivaPresenceComfort.ts`
- `src/components/RoomCard.tsx`
- `src/components/trend/TrendHistoryView.tsx`
- `src/components/trend/TrendHistoryChart.tsx`
- `src/components/ManagerPanel.tsx`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/styles.css`

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- `node --check bridge/cast-runtime.mjs` OK
- `/api/runtime/history` returnerer `lineageDiagnostics`
- KNX `active=true`
- `targetCount=61`
- `runtimeConfigSource=persisted-server-config`

## Ikke Rørt

- KNX write/DPT payload behavior
- HeatDemand parser
- Cast runtime behavior utover diagnostics note
- Dreame runtime
- Deltaco/Tuya runtime
- automasjoner
- ML
- AI execution
- remote control

## Gjenstår Live Før Soak

- Hent verdier Entré
- bekreft zone1/zone2 med GA/DPT
- bekreft zone3 timeout
- bekreft ingen snapshot i live-logg
- bekreft NIVA ikke gjentar samme setning

## Merknad

Ingen kodeendringer.

Ingen build nødvendig.
