# Lynell Checkpoint v6.3 - Deltaco/Tuya Candidate Classification

## Status

v6.3 legger til read-only candidate classification for Deltaco/Tuya discovery.

Målet er å skille Deltaco/Tuya-kandidater fra andre LAN-enheter før videre Tuya-protokoll research.

Ingen av/på, Tuya-login, local keys, automasjoner eller runtime-endringer er gjort.

## Endrede filer

- bridge/integration-manager.mjs
- src/api/homeApi.ts
- src/App.tsx
- src/components/manager/ManagerDiagnostics.tsx

## Klassifiseringsmodell

Per kandidat finnes nå:

- classification
- classificationConfidence
- exclusionReason
- deviceFamilyHint
- evidence[]
- negativeEvidence[]
- recommendedAction

## Discovery-resultat

Ekskludert:

- 192.168.86.23 -> google-home.lan -> excludedKnownDevice
- 192.168.86.26 -> google-nest-mini.lan -> excludedKnownDevice

Aktive kandidater videre:

- 192.168.86.22
- 192.168.86.25
- 192.168.86.29
- 192.168.86.33

## Confidence/scoring

Positiv evidens:

- manuell Lampe 1-5-kandidat
- ARP presence
- Tuya-porter hvis åpne
- vendor hint
- low-noise IoT-profil

Negativ evidens:

- Google/Nest/Cast/media-router-hostnames
- router/telefon/PC-indikasjoner
- web-port-signaler uten Tuya-evidens
- kjente mDNS/SSDP device families

Viktig:

- Løse mDNS/SSDP Cast-signaler alene ekskluderer ikke lenger en manuell lampe-kandidat.

## Verifisert

- npm run build OK
- node --check bridge/server.mjs OK
- node --check bridge/integration-manager.mjs OK
- /api/integrations/deltacoTuya/discovery?deep=true OK
- sendsCommands=false
- secretsReturned=false

## Neste anbefalte steg

- confirmed manual mapping for Lampe 1-5
- deretter Tuya local/cloud protocol research
- fortsatt ingen styring før mapping er trygg

## Avgrensning

Ingen kodeendringer.

Ingen build nødvendig.
