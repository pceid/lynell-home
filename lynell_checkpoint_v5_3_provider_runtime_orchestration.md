# Lynell Checkpoint v5.3 - Provider Runtime Orchestration

## Status

v5.3 etablerer første runtime orchestration foundation for Lynell Integration OS.

Server eier provider orchestration policy.

Frontend observerer og visualiserer.

Ingen faktisk runtime behavior, reconnect, restart eller hardware-handling er endret.

## Endrede Filer

- `bridge/integration-manager.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/styles.css`

## Orchestration

Provider orchestration har nå:

- mild bakgrunnsloop hvert 60. sekund
- `orchestrationOwner=bridge/orchestrator`
- `cadenceMs=60000`

## Provider Orchestration Metadata

Provider-kontraktene kan nå vise:

- `runtimeHeartbeatAt`
- `lastSuccessfulContactAt`
- `stale`
- `reconnectRecommended`
- `reconnectAttempts`
- `runtimeLatency`
- `pollingCadence`
- `degradedReason`
- `recoveryState`

## Recovery States

- `stable`
- `reconnecting`
- `degraded`
- `recovered`
- `stale`

## Cadence Mapping

- Dreame/HA vacuum: 2 min
- Cast: 90 sek
- MQTT: 60 sek
- foundation providers: 5 min

## Provider Mapping

Dreame leses kun via eksisterende vacuum status.

Cast leses kun via eksisterende Cast status/playback state.

MQTT leses kun via eksisterende MQTT status.

Ingen runtime behavior ble endret.

## Assistant Manager

Assistant Manager viser freshness/recovery-status.

Developer Mode viser orchestration diagnostics.

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/integration-manager.mjs` OK

`/api/integrations` smoke test OK:

```text
orchestrationOwner=bridge/orchestrator
cadenceMs=60000
Dreame recovery state returneres
Cast cadence returneres
secretsReturned=false
```

## Ikke Gjort

- ekte reconnect engine
- provider restart
- persistent orchestration state
- adaptive polling
- distributed/multi-site orchestration
- approval-gated runtime actions

## Ikke Rørt

- Dreame runtime behavior
- Cast runtime behavior
- MQTT runtime behavior
- KNX write-path
- robotkommandoer
- automasjoner
- hardware reconnect/restart

