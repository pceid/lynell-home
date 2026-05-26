# Lynell Checkpoint v6.4 - Deltaco/Tuya Confirmed Mapping

## Status

v6.4 legger inn confirmed manual mapping som device identity foundation for Deltaco/Tuya.

Dette er fortsatt uten av/på, Tuya-login, local keys eller runtime control.

Målet er trygg fysisk/device-identitet før protokoll eller kommandoer.

## Endrede filer

- bridge/integration-manager.mjs
- bridge/provider-state-store.mjs
- bridge/server.mjs
- src/api/homeApi.ts
- src/App.tsx
- src/components/manager/ManagerDiagnostics.tsx

## Nye endpoints

- GET /api/integrations/deltacoTuya/mappings
- POST /api/integrations/deltacoTuya/mappings/confirm

## Confirmed mapping lagrer

- deviceId
- displayName
- provider
- room
- role
- physicalOrder
- ip
- mac
- confirmed
- confirmedAt
- confidence
- source
- notes
- lifecycleOwner
- orchestrationOwner

## Persistence

- mappings persisteres via Integration OS state
- mappings gjenopprettes etter bridge-restart
- Windows/OneDrive-sikkerhet lagt inn i provider-state-store:
  - hvis atomic rename får EPERM, faller den tilbake til direkte trygg skriving av målfilen

## Assistant Manager

- viser bekreftede enheter
- viser ubekreftede kandidater
- viser "Bekreft Lampe X"-valg for aktive kandidater

## Verifisert

- npm run build OK
- node --check bridge/server.mjs OK
- node --check bridge/integration-manager.mjs OK
- node --check bridge/provider-state-store.mjs OK
- Mapping smoke test OK:
  - Lampe 1 -> 192.168.86.22
- Restore smoke test OK:
  - confirmedCount=1
- sendsCommands=false
- secretsReturned=false

## Ikke gjort

- av/på
- Tuya cloud login
- local keys/token
- automasjoner
- runtime control
- endring i Dreame/Cast/KNX runtime behavior

## Neste anbefalte steg

- bekrefte Lampe 1-5 manuelt i UI
- deretter Tuya local/cloud protocol research
- fortsatt ingen styring før mapping er trygg

## Avgrensning

Ingen kodeendringer.

Ingen build nødvendig.
