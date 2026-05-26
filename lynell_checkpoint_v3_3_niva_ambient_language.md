# Lynell checkpoint v3.3 - NIVA ambient language

## Status

v3.3 er en rolig språk- og microinteraction-polish for NIVA/runtime-opplevelsen.

Ingen runtime-adferd ble endret.

## Ny ambient language foundation

Ny fil:

- `src/niva/ambientLanguage.ts`

`ambientLanguage.ts` fungerer som samlet foundation for roligere språk rundt:

- runtime
- readiness
- media
- device-state

Runtime labels bruker nå roligere språk på tvers av Home, NIVA og Diagnose.

Eksempler:

- Forbereder
- Stille
- Hjemmet er aktivt
- Systemene er tilgjengelige

## UI og microcopy

Home, readiness, media routing og NIVA-runtime microcopy er dempet.

Developer/Live-forklaringer er mindre debug-preget.

Live Mode skal føles mer som living runtime:

- ekte hjem først
- roligere status
- mindre teknisk støy
- mer ambient systemfølelse

Developer Mode beholder Runtime Insight og dypere runtime-diagnose.

## Microinteractions

Subtile hover/transitions/reveal er lagt til for:

- runtimekort
- chips
- readiness
- NIVA identity

`prefers-reduced-motion` er ivaretatt.

## Endrede filer

- `src/niva/ambientLanguage.ts`
- `src/integrations/runtime/integrationRuntimeState.ts`
- `src/App.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/styles.css`

## Ikke rørt

- Dreame/Cast bridge behavior
- KNX write-path
- vacuum-runtime
- automasjoner
- nye integrasjoner

## Verifisert

- `npm run build` OK

## Fremtidig spor: NIVA Local Intelligence / ML foundation

Senere spor for NIVA:

- ekte lokal AI / machine learning
- local-first/privacy-first
- lære mønstre over tid
- foreslå handlinger
- automasjoner og fysiske handlinger krever eksplisitt brukerbekreftelse/godkjenning
- ingen autonom fysisk handling uten godkjent regel eller bekreftelse

## Gjenstår før full NIVA identity

- mer konsistent mikrotekst på alle flater
- flere Developer-only diagnosepaneler
- samlet språksett for presence/weather/comfort
- senere lokal AI/ML-foundation
