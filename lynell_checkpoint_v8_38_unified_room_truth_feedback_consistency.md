# Lynell checkpoint v8.38 - Unified room truth + feedback consistency

## Status

v8.38 er Product stabilization sprint 13.

Målet er unified room truth og feedback consistency på tvers av Room, Klima, Trend, NIVA og Manager.

Dette samler rom-sannheten rundt eksisterende `resolvedRooms` / canonical truth.

Dette er stabilisering av presentasjon, forklaring og diagnostikk. Ingen backend, KNX write-path, DPT, providerlogikk, automasjoner eller ML er endret.

## Endrede filer

- `src/App.tsx`
- `src/components/trend/TrendHistoryView.tsx`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`

## Canonical room truth

Det er lagt inn canonical metadata for sentrale romverdier:

- `temperature`
- `setpoint`
- `heatDemand`
- `light`
- `brightness`

Samme truth brukes nå tydeligere av:

- Room
- Klima
- Trend summary
- NIVA
- Manager diagnostics

Målet er at ett rom skal ha én samlet sannhet som presenteres likt på tvers av visninger.

## Priority model

Canonical room truth følger denne prioriteten:

1. live KNX feedback
2. fresh provider/runtime feedback
3. optimistic pending
4. recent server snapshot
5. retained/reference/history
6. fallback/default

Dette gjør det tydeligere hvorfor en verdi vises, og hvilken kilde den bygger på.

## Freshness

Freshness samles i felles statusverdier:

- fresh
- aging
- stale
- offline
- pending

Room, Klima, Trend, NIVA og Manager skal ikke lenger presentere ulik freshness for samme romverdi.

## Confidence

Confidence beregnes likt fra source/freshness.

Dette gjør at en verdi fra live KNX feedback, optimistic pending, snapshot eller historikk får mer konsistent tillitsnivå i UI og diagnostics.

## Trendhistorikk

Trendhistorikk viser nå `Romstatus nå` fra samme canonical truth som Room/Klima/NIVA.

`Siste verdi` i trend skal ikke fremstå som en egen konkurrerende sannhet. Den er historikk/trend-kontekst, mens romstatus nå kommer fra canonical resolver.

## Manager Diagnose

Manager Diagnose viser nå:

- canonical resolver
- divergence/cross-view mismatch count
- freshness distribution
- source distribution
- optimistic consistency
- last reconciliation correction
- raw canonical room truth under Developer

Dette gjør det enklere å se om Room, Klima, Trend, NIVA og Manager faktisk er enige om romtilstanden.

## Tidligere divergens

Før v8.38 kunne samme rom oppleves forskjellig mellom visninger:

- Trend kunne oppleves som egen sannhet fordi siste verdi kom fra historikk.
- Room/Klima brukte resolved room truth.
- Manager viste lineage, men ikke samlet freshness/confidence/pending-status.
- Optimistic/pending var synlig i RoomCard, men ikke tydelig knyttet til samlet truth-diagnose.

v8.38 gjør denne forskjellen eksplisitt og samler presentasjonen rundt canonical room truth.

## Viktig edge case

Lokal optimistic state etter manuelt trykk kan fortsatt være klient-lokal i noen sekunder.

Dette betyr at PC og mobil kan se forskjellig pending-status kortvarig mens systemet venter på KNX feedback/SSE.

Full PC/mobil pending-sync krever senere server-owned pending action state. UI og diagnostics skal nå vise dette tydeligere, ikke late som alt er bekreftet.

## Verifisert

- `npm run build` OK

## Ikke gjort

- ingen ny KNX write path
- ingen DPT/payload-endring
- ingen backend/runtime-endring
- ingen provider-endring
- ingen ML
- ingen automasjoner

## Gjenstår live

- bekreft at Room/Klima/Trend/NIVA viser samme truth
- bekreft at stale/freshness matcher mellom sider
- bekreft at optimistic pending forklares likt
- test PC/mobil med samme romdata
- senere vurdere server-owned pending action state

## Resultat

v8.38 gjør romverdier mer konsistente på tvers av Lynell.

Trend, Room, Klima, NIVA og Manager peker nå tydeligere mot samme canonical room truth, og historikk/pending/snapshot skilles mer eksplisitt fra bekreftet live truth.
