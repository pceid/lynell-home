# Lynell checkpoint v8.16 - NIVA priority + follow-through

## Status

v8.16 legger inn roligere NIVA-prioritering og conversational follow-through.

Målet er mindre støy, én hovedobservasjon om gangen og bedre oppfølging av bekreftede forslag.

Dette er fortsatt ikke automasjoner, ikke ML, ikke autonome handlinger og ikke nye writes.

## Endrede filer

- `src/runtime/nivaObservationalIntelligence.ts`
- `src/App.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/styles.css`

## NIVA observation priority

NIVA-observasjoner får priority scoring basert på:

- severity
- confidence
- actionability
- domain criticality
- runtime instability
- noise

Low/noisy info-observasjoner dempes før panelet.

Flere stale/poll/source-observasjoner grupperes.

Eksempel:

- "3 rom mangler ferske klimasignaler."

## NIVA UI

- Viser 1 hovedobservasjon
- Resten ligger under "+ flere observasjoner"
- Reduserer stale/info-støy

## Conversational follow-through

Tekstlig bekreftelse støttes:

- `ja`
- `ok`
- `bekreft`
- `bekrefter`
- `gjør det`
- `kjør`

Hvis fersk pending NIVA-handling finnes, bruker bekreftelse samme `handleResolveNivaProposal(..., completed)`-flow som UI-knappen.

Kalenderforslag kan følges opp via tekstbekreftelse.

Hvis ingen fersk handling finnes, svarer NIVA konkret i stedet for "det har jeg ikke lært".

## Diagnostics

Manager Diagnose viser:

- pending conversational action
- follow-through hits/misses
- primary observation score
- suppressed observations
- grouped observations
- cooldown counts

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK

## Ikke gjort

- Ingen automasjoner
- Ingen ML/AI execution
- Ingen nye KNX writes
- Ingen DPT/write payload-endring
- Ingen remote control
- Ingen provider-runtime-endring

## Gjenstår live

- NIVA viser bare én hovedobservasjon
- "+ flere observasjoner" holder resten rolig
- Stale/info-støy er redusert
- Kalenderforslag -> "bekrefter" fullfører handlingen

## Merknad

Ingen kodeendringer ble gjort i denne checkpoint-oppgaven.
Ingen build ble kjørt for checkpoint-opprettelsen.
