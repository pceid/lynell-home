# Lynell checkpoint v3.6 - NIVA presence + comfort awareness

## Status

NIVA har fått presence + comfort awareness foundation.

Dette er et rolig awareness-lag. Ingen ekte AI/ML, automasjoner eller runtime-endringer er lagt til.

## Ny foundation

Ny fil:

- `src/niva/nivaPresenceComfort.ts`

Modellen vurderer:

- `quiet`
- `calm`
- `active`
- `focused`
- `windingDown`
- `mixedComfort`
- `needsAttention`

Vurderingen baseres på:

- presence
- comfort
- media
- lys
- runtime confidence

## NIVA-opplevelse

NIVA svarer nå mer helhetlig på:

- "hvordan har huset det?"
- "hvordan føles huset?"

Svarene er mindre device-oppramsing og mer home-atmosphere.

Eksempelretning:

- "Hjemmet virker rolig akkurat nå."
- "Det er aktivitet i noen rom, men systemene virker stabile."
- "Hjemmet virker rolig, men noen rom trenger litt oppmerksomhet for jevn komfort."

Session-kontekst brukes bedre ved oppfølgingsspørsmål som:

- "hva trenger oppfølging?"

## Home og Developer Mode

Home-atmosfærelinjen bruker ny NIVA home-state vurdering.

Developer Mode viser `NIVA home atmosphere` med:

- heuristikker
- signalgrunnlag
- oppsummering
- oppfølgingslinje

Dette vises ikke som teknisk diagnose i Live Mode.

## Endrede filer

- `src/niva/nivaPresenceComfort.ts`
- `src/App.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/components/manager/managerTypes.ts`

## Ikke rørt

- Dreame runtime
- Cast runtime
- KNX write-path
- automasjoner
- handlinger
- ekte AI/ML
- persistent learning

## Verifisert

- `npm run build` OK

## Neste anbefalte fase

- Teste NIVA-svar i Live Mode fra mobil.
- Samle flere intent gaps.
- Polere mikrotekst for comfort/weather/presence.
- Senere persistent local learning store.
- Senere NIVA Local Intelligence / ML foundation med approval-gated handlinger.
