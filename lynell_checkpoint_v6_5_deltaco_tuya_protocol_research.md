# Lynell Checkpoint v6.5 - Deltaco/Tuya Protocol Research

## Status

v6.5 legger inn passivt protocol intelligence layer for Deltaco/Tuya.

Fortsatt ingen av/på, Tuya-auth, local keys, payloads, sniffing eller runtime control.

Målet er å forstå lokal/cloud oppførsel før kommando-path vurderes.

## Endrede filer

- bridge/integration-manager.mjs
- bridge/provider-state-store.mjs
- bridge/server.mjs
- src/api/homeApi.ts
- src/App.tsx
- src/components/manager/ManagerDiagnostics.tsx

## Nytt endpoint

- GET /api/integrations/deltacoTuya/protocol-research

## Protocol research

- kun passive TCP-connect-observasjoner
- porter:
  - 6668
  - 6667
  - 6669
  - 8883
  - 80
  - 443
- returnerer:
  - protocol hints
  - communication profile
  - observed ports/services
  - transport hints
  - cloud/local likelihood
  - confidence
  - recommended next step

## Server-owned observer

- cadence: 10 min
- kjører bare når confirmed mappings finnes
- sender ingen payloads
- sender ingen kommandoer

## Smoke test

Med:

- Lampe 1 -> 192.168.86.22

Resultat:

- hints=unknownPassive
- profile=passiveLocal
- cloud=unknown
- sendsCommands=false
- payloadsSent=false
- localKeys=false
- secretsReturned=false

## Verifisert

- npm run build OK
- node --check bridge/server.mjs OK
- node --check bridge/integration-manager.mjs OK
- node --check bridge/provider-state-store.mjs OK
- protocol research endpoint OK

## Vurdering

- Første trygge on/off-path er fortsatt ikke klar.
- Lynell har nå:
  - device identity
  - persistence
  - passive transportforståelse
- Mangler fortsatt:
  - trygg Tuya local/cloud metode
  - local key-strategi
  - approval-gated kommandomodell
  - command safety model

## Ikke rørt

- Dreame runtime
- Cast runtime
- KNX write-path
- automasjoner
- AI/ML

## Avgrensning

Ingen kodeendringer.

Ingen build nødvendig.
