# Lynell checkpoint v8.26 — Server-owned truth, config sync og NIVA repair

v8.26 er en kritisk product trust sprint.

Hovedmålet var å fjerne PC/mobil-drift ved å gjøre SystemConfig server-eid.

Dette er stabilisering, ikke ny feature-sprint.

## Endrede filer

- `bridge/server.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/components/ManagerPanel.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/components/manager/managerTypes.ts`
- `src/niva/nivaIntent.ts`

## Root cause

- SystemConfig var fortsatt per klient/localStorage.
- PC kunne ha HeatDemand-GA, mens mobil hadde eldre lokal config.
- Bridge hadde persisted runtime-config, men ikke den redigerbare source-of-truth-configen.
- Resultatet var at PC og mobil kunne vise ulike HeatDemand mappings, trenddata og poll targets.

## Server-owned SystemConfig

- Ny server persistence for SystemConfig.
- Nye endpoints:
  - `GET /api/runtime/config/system`
  - `POST /api/runtime/config/system`
- Frontend henter server config ved boot.
- Manager-endringer lagres til server.
- Etter lagring trigges runtime-config rebuild og push til bridge.
- Frontend kan fortsatt ha lokal cache/fallback, men server er source of truth.

Omfatter nå:

- HeatDemand config
- romareal
- uiCapabilities
- calendar config
- relevante Manager/SystemConfig-endringer

## Diagnostics

- config source
- server version
- conversation logging status
- auto-poll foundation
- learning proposal candidates

## Conversation logging

- lokal/server-only samtalelogg foundation
- default OFF
- logger kun hvis toggle er på
- grunnlag for side-aware NIVA senere

## Auto-poll quiet signals

- foundation lagt inn
- OFF default
- ingen execution
- ingen automasjon

## NIVA intent repair

- Entré/entre/endré/basement-entry matches bedre.
- “sett Entré til 21,5 grader” lager setpoint-forslag hvis trygg setpoint-adresse finnes.
- Weather intent, f.eks. “været i morgen”, tolkes ikke lenger som kalender.
- Hvis weather provider mangler, gir NIVA konkret foundation-svar.

## Custom signal loggers

- var allerede server-persisted
- beholdes som server-owned runtime tooling

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK

## Ikke gjort

- ingen automasjoner
- ingen ML
- ingen nye KNX writes
- ingen DPT/write payload-endring
- ingen provider-runtime-endring
- ingen ekstern weather provider
- ingen ekte kalenderprovider

## Gjenstår live

- legg inn HeatDemand på PC og bekreft samme GA på mobil
- lagre config, restart bridge/frontend og bekreft mapping
- legg til signal logger på PC og bekreft mobil ser den
- test “sett Entré til 21,5 grader”
- test conversation logging toggle
- test “hvordan blir været i morgen?”

Ingen kodeendringer.
Ingen build nødvendig.
