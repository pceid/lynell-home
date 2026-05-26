# Lynell Checkpoint v5.5 - Provider Recovery Foundation

## Status

v5.5 etablerer første provider recovery foundation for Lynell Integration OS.

Recovery er orchestration/intention-state, ikke faktisk reconnect, restart eller hardware-handling.

Server vurderer recovery-vinduer og cooldown kontrollert.

Frontend viser recovery-status.

## Endrede Filer

- `bridge/integration-manager.mjs`
- `bridge/provider-state-store.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`

## Recovery Metadata

Provider orchestration kan nå vise:

- `recoveryAttempts`
- `recoveryBackoffMs`
- `nextRecoveryAttemptAt`
- `recoveryEligible`
- `recoveryBlocked`
- `recoveryReason`
- `recoveryPolicy`
- `recoveryCooldownUntil`
- `recoveredAt`

## Provider Recovery Policies

Recovery-policy er provider-spesifikk:

- Dreame: konservativ cloud recovery
- Cast: medium lokal discovery recovery
- MQTT: raskere lokal transport recovery

## Orchestration

- recovery-vinduer vurderes i orchestration loop
- cooldown håndteres
- recovery-state persisteres via `provider-state-store`
- recovery-state kan gjenopprettes etter restart

## Assistant Manager

Assistant Manager viser:

- recovery readiness
- cooldown
- recovered status

Developer Mode viser:

- attempts
- policy
- cooldown
- next window
- recovery reason

## Viktig Avgrensning

- ingen faktisk reconnect
- ingen runtime restart
- ingen hardware handling
- ingen robotkommandoer
- ingen automasjoner
- Dreame/Cast/MQTT runtime behavior er ikke endret
- KNX write-path er ikke rørt
- secrets returneres ikke

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/integration-manager.mjs` OK
- `node --check bridge/provider-state-store.mjs` OK

`/api/integrations` røykprøve OK:

```text
recovery metadata returneres
Dreame/Cast/MQTT policies finnes
secretsReturned=false
```

## Gjenstår Før Ekte Reconnect/Recovery Engine

- faktisk reconnect-engine
- adapter restart
- provider prioritization
- adaptive retry
- distributed/multi-site orchestration
- approval-gated recovery actions

## Ikke Gjort

Ingen kodeendringer i denne checkpoint-operasjonen.

Ingen build nødvendig.
