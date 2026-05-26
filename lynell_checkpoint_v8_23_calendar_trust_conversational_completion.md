# Lynell checkpoint v8.23 - Calendar trust + conversational completion

v8.23 er Product stabilization sprint 3.

Målet er kalender/NIVA conversational completion og action trust.

Dette er ikke full kalenderprovider og ikke household sync ennå.

Ingen backend-, KNX-, provider- eller runtime-write-endringer er gjort.

## Endrede filer

- `src/App.tsx`
- `src/niva/nivaTypes.ts`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`

## Forbedringer

Kalenderforslag har nå lifecycle:

- `pendingConfirmation`
- `queued`
- `creating`
- `created`
- `failed`
- `cancelled`
- `stale`

NIVA holder kalenderforslag i live i 15 minutter.

Tekstlig bekreftelse med "bekrefter" følger opp riktig pending handling.

Flere kalenderhendelser i én setning støttes.

Eksempel:

- båttur 28 mai
- grilling hos LT 19 juni

Manglende klokkeslett håndteres rolig:

- NIVA foreslår kl. 12:00 hvis bruker bekrefter.

Duplicate/idempotency er lagt inn med:

- fingerprint
- 30 minutters recent-window

Dobbelt "bekrefter" eller retry skal ikke lage kopi.

Stale pending actions markeres automatisk.

Kalender-siden viser siste NIVA kalenderhandling med status.

Manager Diagnose viser:

- pending
- created
- failed
- stale
- duplicate-prevented count
- recent calendar actions

## Viktig bugfix

Gammel kalenderbekreftelse sjekket React state fra samme render.

NIVA kunne derfor "vente" selv etter at eventet var lagt inn.

Intern `savedSystemConfigDataRef` gjør at kalenderopprettelse kan bekreftes direkte etter lokal lagring.

## Verifisert

- `npm run build` OK

## Begrensning

Kalender ligger fortsatt i lokal `SystemConfig` / `localStorage`.

Dette er robust per klient, men ikke full household sync.

Family-ready kalender krever senere:

- server-eid kalenderstate
- eller ekte kalenderprovider
- sync mellom PC/mobil
- persistent audit/history

## Ikke gjort

- ingen autonom kalenderstyring
- ingen Google/Outlook kalenderintegrasjon
- ingen invites
- ingen recurring AI scheduling
- ingen email
- ingen backend/provider-endringer
- ingen KNX/runtime write-endringer

## Gjenstår live

- test "legg inn ..." -> "bekrefter"
- test duplicate protection
- test stale pending etter 15 min
- test PC/mobil begrensning tydelig i UI senere

Ingen kodeendringer.
Ingen build nødvendig.
