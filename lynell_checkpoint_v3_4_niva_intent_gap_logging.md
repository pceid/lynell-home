# Lynell checkpoint v3.4 - NIVA intent-gap logging

## Status

NIVA intent-gap logging er lagt inn som lokalt læringssignal.

Intent gaps er ikke feil. De er signaler om hva NIVA bør lære å forstå eller svare bedre på.

Dette er foundation for senere lokal AI/ML, ikke ekte AI/ML ennå.

## Ny intent-gap foundation

Ny fil:

- `src/niva/nivaIntentGaps.ts`

Intent gaps lagrer:

- `id`
- `timestamp`
- `userText`
- `activeView`
- `runtimeMode`
- `suggestedCategory`
- `responseGiven`
- `resolved=false`
- `note`

Intent-gap logg er foreløpig session/in-memory.

## Når gaps logges

Gaps logges ved:

- ukjent intent
- svak fallback
- utrygg action-prep uten faktisk forslag

Live Mode viser ikke dette som feil.

Developer Mode viser `NIVA learning signals` i Manager Diagnose / Runtime Insight.

## NIVA fallback og identitet

Fallback-svar er roligere og mer presist.

`presenter deg selv` har nå konkret intent og svarer:

> Jeg er NIVA, Lynell sitt lokale systemlag. Jeg følger med på hjemmets tilstand, forklarer hva som skjer og foreslår trygge handlinger når du ber om det.

## Endrede filer

- `src/niva/nivaIntentGaps.ts`
- `src/App.tsx`
- `src/niva/nivaResponses.ts`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`

## Ikke rørt

- Dreame/Cast/KNX runtime
- vacuum-runtime
- automasjoner
- backend/database
- handlinger uten bekreftelse

## Verifisert

- `npm run build` OK

## Neste anbefalte fase

- samle flere NIVA-intents fra faktisk bruk
- forbedre microcopy/intents trinnvis
- senere persistent local learning store
- senere NIVA Local Intelligence / ML foundation, fortsatt approval-gated
