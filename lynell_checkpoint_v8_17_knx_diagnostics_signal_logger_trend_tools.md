# Lynell checkpoint v8.17 - KNX diagnostics, signal logger og trend tools

## Status

v8.17 legger inn KNX diagnostics/audit-verktøy, custom signal loggers og utvidet trendverktøy for runtime validation og feilsøking.

Dette er debug/testing/runtime-validation tooling.

Det er ikke gjort automasjoner, ML eller endring i eksisterende KNX DPT/write behavior.

## Endrede filer

- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/components/trend/TrendHistoryView.tsx`
- `src/components/trend/TrendHistoryChart.tsx`
- `src/styles.css`

## 1. ETS audit

Ny endpoint:

- `GET /api/knx/ets-audit`

Audit-verktøyet:

- leser `ETS_monitor.xml`
- dekoder raw cEMI
- henter GA
- henter DPT der runtime kjenner mapping
- henter verdi/timestamp
- sammenligner ETS-logg mot runtime-history

Diagnostics viser:

- missing runtime datapoints
- suspected dedupe drops
- unknown GA events
- field/DPT mismatches

Eksempler fra audit:

- `1/1/2`: ETS 90, Lynell history 18
- `1/1/7`: ETS 118, Lynell history 59
- `0/1/4`: ETS 6, Lynell history 17
- `0/1/7`: ETS 21, Lynell history 49
- `0/1/9`: ETS 21, Lynell history 38

## 2. Runtime history integrity

- Custom signal live-events bruker stabilt feltformat:
  - `customSignal:<id>`
- `manualTool/groupValueResponse` kan logges uten å bli romtruth hvis GA er ukjent.
- KNX lineage bevares:
  - `groupAddress`
  - `dpt`
  - `field`
  - `source`
  - `timestamp`
  - `decodedValue`

## 3. Manager "KNX Single Action"

Ny seksjon i Developer/Manager:

- gruppeadresse
- datatype/DPT
- Poll
- Write
- value input ved write

Støttede DPT:

- `1.001`
- `5.001`
- `9.001`
- `20.102` (write blokkert foreløpig)

Poll:

- sender `GroupValueRead`
- viser response value
- viser decoded value
- viser DPT
- viser timestamp
- viser timeout/error

Write:

- går gjennom runtime action pipeline
- er tydelig debug/manual write
- har ingen repeat
- har ingen automation
- har ingen bakgrunnswrite

## 4. Custom Signal Logger

Persistent lagring:

- `bridge/.lynell-state/signal-loggers/signal-loggers.json`

Felter:

- navn
- gruppeadresse
- datatype/DPT
- kategori
- rom optional
- updateMode
- expectedIntervalMs

Funksjoner:

- aktiver/deaktiver
- slett
- subscription targets
- vises i trendhistorikk

## 5. Fullbredde trend

- "Utvid"-knapp på grafer
- fullscreen/fullbredde trend view
- tooltip viser:
  - verdi
  - tid
  - source
  - GA/DPT
- stepped rendering for:
  - lys
  - sparse/onChange signaler
- line rendering beholdes for:
  - temperatur
  - heatDemand

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- ETS/history parser OK

## Bevisst ikke gjort

- ingen KNX DPT/write-endring
- ingen automasjoner
- ingen ML
- ingen remote control
- ingen Cast/Dreame/Deltaco runtime-endring

## Merk

- Windows kunne varsle midlertidig under smoke-test når Node/PowerShell startet prosesser automatisk.
- Ingen vedvarende Windows Security-trussel etter kjøring.
- Videre smoke-tests bør unngå `Start-Process`/background launch og heller bruke allerede kjørende bridge/runtime.

## Gjenstår live

- `GET /api/knx/ets-audit`
- Single Poll `1/1/2` og `1/1/7`
- kontrollert Single Write på test-GA
- custom signal logger i trend
- fullbredde trend i browser

