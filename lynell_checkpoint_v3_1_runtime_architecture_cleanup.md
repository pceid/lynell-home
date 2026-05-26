# Lynell Checkpoint v3.1 - Runtime architecture cleanup

## Status

Runtime contract-bygging er flyttet ut av `App.tsx`.

Dette checkpointet dokumenterer at v3 runtime foundation er gjort mer modular uten aa endre faktisk bridge/runtime behavior.

## Ny fil

Ny modul:

- `src/integrations/runtime/runtimeContractBuilders.ts`

## Flyttede builders

Foelgende `RuntimeDeviceContract` builders er flyttet ut av `App.tsx`:

- Lynell mode
- KNX bridge
- Cast
- media output
- Dreame/vacuum
- MQTT edge

`App.tsx` bygger ikke lenger kontraktene inline, men bruker:

- `buildRuntimeDeviceContracts(...)`

## Ansvarsdeling

### `integrationRuntimeState.ts`

Eier:

- felles types
- formattering
- summary

Dette inkluderer blant annet:

- `RuntimeDeviceContract`
- connection/readiness state types
- runtime formattere
- runtime contract summary

### `runtimeContractBuilders.ts`

Eier:

- mapping fra eksisterende app/bridge-state til `RuntimeDeviceContract`
- helper-functions for connection/readiness state
- contract builders per runtime-kilde

Dette gjoer det enklere aa la integrasjoner produsere egne kontrakter direkte senere.

### `App.tsx`

Eier fortsatt:

- state
- snapshots
- labels
- orchestration
- UI-dataflyt

`App.tsx` sender naa runtime inputs inn til `buildRuntimeDeviceContracts(...)`, men eier ikke detaljlogikken for hvordan hver kontrakt bygges.

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

Ingen robotkommandoer ble lagt til.
Ingen KNX write-path ble endret.
Ingen stabil Cast/Dreame behavior ble endret.

## Verifisert

- `npm run build` OK

## Neste anbefalte fase

v3.2 NIVA/UI polish:

- bruke samme contract-output
- roligere runtime cards
- Developer-only gating av dyp diagnose
- mer premium/ambient NIVA-opplevelse

## Notat

Dette checkpointet er kun dokumentasjon av fullfoert v3.1 architecture cleanup.

Ingen kodeendringer ble gjort i dette dokumentasjonssteget.
Ingen ny build var noedvendig.
