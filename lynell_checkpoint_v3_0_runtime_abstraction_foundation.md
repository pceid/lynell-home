# Lynell Checkpoint v3.0 - Runtime abstraction foundation

## Status

Prosjektet har startet overgangen fra prototype til en mer konsistent Lynell runtime-plattform.

Dette checkpointet dokumenterer foerste foundation for felles runtime/device-state contracts, tydeligere Live/Demo/Developer-opplevelse og roligere runtime-status i UI.

## RuntimeDeviceContract

Ny `RuntimeDeviceContract` er etablert som frontend foundation for runtime/device-state.

Kontrakten standardiserer:

- `provider`
- `domain`
- `connectionState`
- `readiness`
- `capabilities`
- `derivedState`
- `diagnostics`
- `lastUpdatedAt`

Dette er ikke en full backend-arkitektur ennå. Det er en kontrollert type-/contract-foundation for aa gi Lynell samme spraak paa tvers av runtime-kilder og integrasjoner.

## Connection states

Felles connection states:

- `connected`
- `degraded`
- `offline`
- `demo`
- `developer`
- `foundation`
- `fallback`
- `loading`

Disse brukes for aa skille ekte live runtime, begrenset runtime, fallback, foundation og test-/utviklingsmiljoer tydeligere i UI og diagnostics.

## Runtime contracts bygges for

Runtime contracts bygges naa for:

- Lynell mode
- KNX bridge
- Cast
- media output
- Dreame/vacuum
- MQTT edge

Dette gir ett felles lag for aa beskrive:

- hvem som eier state
- om state er live, demo, developer, foundation eller fallback
- hvilke capabilities som finnes
- om state er derived
- hvilke diagnostics som er relevante
- naar state sist ble oppdatert

## UI / UX

Home viser naa en rolig NIVA runtime-oppsummering.

NIVA-panelet viser:

- aktiv mode
- runtime-stabilitet

uten teknisk overload.

Manager Diagnose har en ny `Runtime contracts`-flate som viser standardisert runtime-state for live, demo, developer og foundation-kilder.

Mobil-layout viser kontraktkort i en kolonne for bedre lesbarhet og mindre overfylt opplevelse.

Live Mode foeles mer som ekte runtime foerst.

Demo Mode og Developer Mode er tydelig adskilt:

- Demo Mode for demo/mock-data uten hardware
- Developer Mode for foundation/readiness/diagnostics

Resterende synlig `Simuler`-spraak er byttet til Demo-spraak der det gjaldt assistentkontroller.

## Ikke roert

Foelgende ble ikke endret:

- Dreame bridge/runtime behavior
- Cast bridge behavior
- KNX write-path
- vacuum-runtime behavior
- robotkommandoer
- automasjoner
- auth-system
- database
- voice logic
- queue-system

Ingen nye Dreame-kommandoer ble lagt til.
Ingen KNX write-path ble endret.
Ingen stabil Cast/Dreame behavior ble endret.

## Endrede filer

- `src/integrations/runtime/integrationRuntimeState.ts`
- `src/App.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/components/manager/managerTypes.ts`
- `src/styles.css`

## Verifisert

- `npm run build` OK

## Gjenstaar foer full v3 runtime-arkitektur

- Flytte flere runtime builders ut av `App.tsx`.
- La integrasjoner produsere kontrakter direkte selv.
- Mer sentralisert readiness/confidence-kontrakt mellom bridge og frontend.
- Developer-only gating av dyp diagnose i Manager.

## Notat

Dette checkpointet er kun dokumentasjon av fullfoert v3.0 foundation-steg.

Ingen kodeendringer ble gjort i dette dokumentasjonssteget.
Ingen ny build var noedvendig.
