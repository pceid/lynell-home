# Lynell checkpoint v3.5 - NIVA session context

## Status

NIVA har fått session-basert kontekstlag.

Ingen persistence, database, AI/ML eller automasjoner er lagt til.

## Ny session memory foundation

Ny fil:

- `src/niva/nivaConversationMemory.ts`

Session memory holder:

- siste intents
- siste spørsmål
- siste runtime summary
- rom/media/system-fokus
- siste foreslåtte handling
- aktiv context focus

NIVA oppdaterer memory etter hvert svar.

## Contextual awareness

NIVA bruker memory til milde oppfølgingsspørsmål.

Eksempel:

- etter `hvordan har huset det?`
- kan `hva trenger oppfølging?` tolkes i samme runtime-kontekst.

Live Mode får bedre kontinuitet uten å vise minne/diagnose.

Språk og oppførsel skal fortsatt være subtilt, ikke chatbot-aktig.

Ingen `som du sa tidligere`-stil.

## Developer visibility

Developer Mode viser:

- NIVA session context
- recent intents
- aktivt fokus
- uløste learning signals

Dette vises ikke i Live Mode.

## Endrede filer

- `src/niva/nivaConversationMemory.ts`
- `src/App.tsx`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`

## Ikke rørt

- Dreame/Cast/KNX runtime behavior
- vacuum-runtime
- automasjoner
- handlinger uten approval
- backend/database
- persistent memory
- ekte AI/ML

## Verifisert

- `npm run build` OK

## Gjenstår før local intelligence

- persistent lokal learning store
- flere intents fra faktisk bruk
- bedre focus-resolver per domene
- senere lokal AI/ML
- fortsatt approval-gated handlinger
