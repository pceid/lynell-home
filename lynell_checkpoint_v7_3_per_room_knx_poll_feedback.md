# Lynell Checkpoint v7.3 - Per-Room KNX Poll + Feedback

## Status

v7.3 legger inn trygg manuell per-rom KNX poll.

Poll brukes til:

- integrasjonstest
- feilsøking
- oppstart
- stale rom
- verifisering av KNX feedback-GA-er

KNX subscription/cache er fortsatt primær sannhet.

## Endrede Filer

- `bridge/server.mjs`
- `bridge/runtime-state-store.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/components/RoomCard.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/styles.css`

## Nytt Endpoint

```text
POST /api/knx/rooms/:roomId/poll
```

## Poll-Omfang

Poll leser kun feedback-GA-er for valgt rom:

- temperatur
- setpunkt-feedback
- heatDemand
- lys-feedback
- brightness-feedback

Poll leser ikke:

- write-GA-er
- command-GA-er
- andre rom
- globale KNX-grupper

## Safety

- Rate limit per rom: `15 sek`
- Ingen aggressive retries
- Fail closed ved manglende mapping
- Kun ett rom per request
- Påvirker ikke andre rom
- Ingen automatisk poll ved sidebytte

## Runtime

Poll-resultat går gjennom samme server-eide truth-flow som subscription:

1. KNX cache
2. `runtime-state-store`
3. room snapshot
4. history datapoints

Dette gjør at PC/mobil kan se samme oppdaterte verdi etter neste sync.

## Trend / Detail

Datapunkter fra poll får:

- `source=manualPoll`
- gruppeadresse der tilgjengelig
- timestamp
- faktisk verdi
- confidence/source metadata

Trend/detail kan derfor vise manuell poll som egen kilde uten å fake datapunkter.

## UI

`RoomCard` har nå:

- `Hent verdi`
- loading per rom
- siste poll-status
- feiltekst ved manglende mapping/rate-limit

Verdier som faktisk oppdateres skal blinke grønt på selve verdien:

- temperatur
- settpunkt
- heatDemand
- lysstatus
- brightness

Blinket trigges kun ved ny timestamp/verdi, ikke kontinuerlig ved vanlig render.

## Manager Diagnostics

Manager diagnostics viser:

- siste poll per rom
- rate-limit status
- failures
- leste grupper
- hvilke grupper som svarte

Developer Mode kan vise mer poll-gruppeinformasjon.

## Live-Verifisering

Bekreftet mål for live-test:

- ETS Monitor viser `GroupValueRead` kun for valgt roms feedback-adresser
- PC/mobil holder sync
- rate-limit fungerer
- andre rom polles ikke

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK

## Ikke Rørt

- KNX write-path
- DPT `9.001` write behavior
- HeatDemand parserlogikk utover propagation
- Dreame runtime
- Cast runtime
- Deltaco runtime
- automasjoner

## Neste Relevante Oppfølging

- Live langtidstest på PC og mobil
- Verifisere ETS Monitor per rom under faktisk poll
- Eventuelt flytte room truth resolver ut av `App.tsx`
- Mer detaljert per-rom cache/snapshot/history conflict-view i Manager

