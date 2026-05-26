# Lynell Checkpoint v2.8 - Runtime modes cleanup

## Status

Begrepet "Simulering" er ryddet ut av vanlig runtime-språk og erstattet med tre tydelige moduser:

- Live Mode
- Demo Mode
- Developer Mode

Dette checkpointet dokumenterer runtime-mode cleanup etter Media/Cast og Dreame status-milepælene.

## Runtime modes

### Live Mode

Live Mode er standard.

Prinsipp:

- ekte runtime prioriteres
- mock/foundation skjules som aktive live-valg
- live devices vises først
- siste kjente state kan brukes som continuity, men skal ikke late som live

Live Mode viser ikke mock-assistenter som live devices.

### Demo Mode

Demo Mode kan bruke demo/mock-data uten hardware.

Brukes for:

- presentasjon
- offline demo
- visning uten aktiv bridge/hardware

Gammel `simulate` leses som Demo Mode for bakoverkompatibilitet.

### Developer Mode

Developer Mode viser:

- mock
- foundation
- readiness
- diagnostics
- debug-/testflater

Brukes for videre utvikling, ikke som vanlig brukerflate.

## UI-status

Home viser nå aktiv runtime mode og readiness/forklaring.

Manager har tre tydelige modusvalg:

- Live Mode
- Demo Mode
- Developer Mode

Manager forklarer kort:

- Live Mode prioriterer ekte runtime
- Demo Mode bruker demo-data for presentasjon
- Developer Mode viser foundation, mock og diagnostics

## Media og assistenter

Media outputs skiller nå mellom:

- live outputs
- foundation/dev outputs

I Live Mode er aktive live-valg:

- Denne enheten
- discovered Cast devices

Foundation/dev devices vises ikke som vanlige live-valg i Live Mode.

Mock-assistenter vises ikke som live devices i Live Mode.

Demo Mode og Developer Mode kan fortsatt bruke mock/foundation for offline visning og utvikling.

## Ikke rørt

Følgende runtime-lag ble ikke endret:

- Dreame runtime
- KNX write-path
- Cast runtime, bortsett fra labels/filter der nødvendig i UI

Ingen endringer ble gjort i Dreame cloud status-runtime, KNX write-path eller robot command path.

## Endrede filer

- `src/App.tsx`
- `src/api/homeApi.ts`
- `src/config/systemConfig.ts`
- `src/components/ManagerPanel.tsx`
- `src/components/RoomCard.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/components/manager/managerTypes.ts`
- `src/integrations/runtime/integrationRuntimeState.ts`

## Verifisert

- `npm run build` OK
