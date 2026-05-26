# Lynell checkpoint v8.37 - Family-ready NIVA interaction

## Status

v8.37 er Product stabilization sprint 12.

Målet er mer naturlig, trygg og familievennlig NIVA-interaksjon. Dette er frontend/NIVA-stabilisering, ikke en ny agent-, automasjons- eller ML-sprint.

Ingen backend, KNX write-path, DPT, providerlogikk, automasjoner eller ML er endret.

## Endrede filer

- `src/App.tsx`
- `src/niva/nivaIntent.ts`
- `src/niva/nivaTypes.ts`
- `src/niva/nivaResponses.ts`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`

## Forbedret kommando- og intentforståelse

NIVA forstår nå flere vanlige hverdagskommandoer roligere og mer presist:

- "demp kjøkken til 30%" tolkes som lys/dimming, ikke klima
- "sett Entre til 21,5 grader" bruker rommatch og valgt rom-kontekst mer robust
- "skru av lyset i TV-stua" kan lage trygg lys-handling
- ved flere aktive soner kan NIVA spørre rolig om alle eller én sone
- kort multi-step continuity gjør at "bare sofa" kan følge opp tidligere soneavklaring

Dette er fortsatt deterministisk command repair, ikke en stor natural-language engine.

## Nye NIVA action-typer

To nye NIVA action-typer ble lagt til for eksisterende trygg frontend-flow:

- `zoneLightsOff`
- `roomBrightness`

Disse bruker eksisterende lys-/dimmeflyt. Det ble ikke laget ny KNX write-path.

## Språk og tonalitet

Vanlige NIVA-svar er myket opp og gjort mindre tekniske.

Tekniske ord er dempet i vanlig UI:

- `runtime`
- `payload`
- `DPT`
- `stale`
- `provider`

Mer familievennlige uttrykk brukes i stedet:

- system
- sist kjente status
- venter på oppdatering
- ikke tilgjengelig akkurat nå

Fallback-svaret er også roligere: NIVA ber om rom og ønsket endring i stedet for å si at den ikke har lært svaret.

## Diagnostics

Manager Diagnose viser nå NIVA interaction quality:

- understood
- partial
- uncertain
- clarification count
- misunderstood/fallback count
- successful conversational actions
- room alias matches
- raw intent parse under Developer

Dette gir bedre grunnlag for å tune NIVA uten å gjøre svarene mer tekniske for vanlige brukere.

## Verifisert

- `npm run build` OK

## Ikke gjort

- ingen ny KNX write-path
- ingen DPT/payload-endring
- ingen backend/runtime-endring
- ingen provider-endring
- ingen ML
- ingen automasjoner
- ingen stor natural-language engine

## Gjenstår live

- teste ekte hverdagskommandoer i huset
- tune romaliaser etter familiens språk
- tune sonealiaser som sofa, kjøkkenøy, spisebord osv.
- validere at NIVA spør avklarende uten å bli masete

