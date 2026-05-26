# Lynell checkpoint v8.25 - Adaptive UI capability framework

## Status

v8.25 legger inn Adaptive UI capability framework.

Målet er å kunne aktivere/deaktivere kort, domains og future foundations fra Manager, slik at Lynell kan ha mange foundations uten at UI blir støy.

Dette er visibility/config/UI foundation.

Ingen backend, KNX, provider, actions, runtime execution, automasjoner eller ML er endret.

## Endret/opprettet

- `src/runtime/uiCapabilities.ts`
- `src/App.tsx`
- `src/components/ManagerPanel.tsx`
- `src/components/RoomManagerPanel.tsx`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/styles.css`

## Capability visibility model

Ny modell for UI capability visibility:

- `visible`
- `enabled`
- `maturity`
- `roomScoped`
- `requiresProvider`
- `requiresCapability`
- `developerOnly`
- `futureOnly`

Maturity brukes for å skille live/faktisk funksjonalitet fra foundation/future/developer-flater.

## Manager styring

Manager kan styre:

- aktivere/deaktivere UI-kort
- aktivere/deaktivere domains
- aktivere/deaktivere future foundations
- styre synlighet for room capabilities

Konfigurasjonen lagres lokalt:

- `lynell.uiCapabilities.v1`

Sidebar/main navigation filtrerer disabled/future capabilities som default.

## Future foundations

Future foundations er default skjult/deaktivert.

Eksempler:

- HCL
- spjeld
- VAV
- optimizer
- varmesentral
- ventilasjon
- teknisk drift
- solceller
- batteri
- EV charging
- vannmåler
- lekkasje
- andre micro-SD/premium-home foundations

Disse er tydelig modellert som foundation/prepared/future og har ingen runtime execution.

## HCL foundation

HCL er lagt inn som ren UI/config foundation:

- timeline/intensity/color-temperature UI
- optional GA-felter
- `dryRun`
- ingen execution

Dette forbereder senere HCL-arbeid uten å aktivere runtime eller KNX-styring.

## Room capability gating

Room Manager og romvisning bruker capability gating.

Resultat:

- irrelevante tabs/sections skjules når capability ikke er aktiv
- rom uten capability viser ikke tomme eller misvisende seksjoner
- room capabilities kan styres separat fra globale UI capabilities

Eksempler:

- rom uten klima viser ikke klima-flater
- rom uten spjeld viser ikke spjeld-flater
- HCL-paneler er skjult nar HCL ikke er aktivert

## Manager Diagnose

Manager Diagnose viser:

- capability summary
- hidden counts
- future counts
- room scoped counts
- HCL visibility
- shading visibility

Developer/raw capability registry kan senere utvides rundt samme modell.

## Verifisert

- `npm run build` OK
- mobil sanity Home 390x844 OK uten horisontal overflow
- Manager visuell sanity ble stoppet av teknisk PIN-lock i testbrowser fordi storage-API ikke var tilgjengelig der
- build kompilerer alle Manager-paths

## Ikke gjort

- ingen HCL runtime
- ingen spjeldlogikk
- ingen optimizer
- ingen SD-system
- ingen KNX write/DPT-endringer
- ingen providerlogikk
- ingen automasjoner
- ingen ML
- ingen runtime execution

## Gjenstår live

- teste Manager capability toggles i ekte browser
- aktivere/deaktivere future cards
- sjekke at sidebar/main navigation oppfører seg riktig
- sjekke Room Manager gating per rom
- senere vurdere server-owned capability config

## Avgrensning

Dette checkpointet handler kun om synlighet, lokal UI-konfigurasjon og foundation-struktur.

Det gir Lynell et roligere og mer skalerbart UI-lag uten å gjøre fremtidige foundations aktive.
