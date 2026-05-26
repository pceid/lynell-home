# Lynell Checkpoint v5.4 - Persistent Provider State + Credentials

## Status

v5.4 etablerer persistent provider state + encrypted credential foundation.

Server eier provider persistence.

Providers kan gjenopprettes etter restart.

Secrets eksponeres ikke til frontend.

Fail-closed ved decrypt/key-feil.

## Ny Fil

- `bridge/provider-state-store.mjs`

## Endrede Filer

- `bridge/integration-manager.mjs`
- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/styles.css`

## Lokal Storage-Struktur

Standard lokal struktur:

```text
bridge/.lynell-state/integration-os
  providers
  credentials
  runtime
  orchestration
```

## Env Override

```text
LYNELL_INTEGRATION_STATE_DIR
```

## Credential Foundation

- AES-256-GCM encrypted credential foundation
- local-only
- server-owned
- never exposed to frontend
- never logged
- fail closed ved decrypt/key-feil

## Boot Restoration

Boot restoration støtter:

- provider config restore
- lifecycle restore
- orchestration metadata restore
- `restoredConfigured`
- `restoredPersisted`
- `restoredEncrypted`

## Assistant Manager

Assistant Manager viser:

- persisted/session state
- restored etter boot
- encrypted credentials status
- secure local storage foundation

Developer Mode viser persistence diagnostics.

## Ikke Rørt

- Dreame runtime behavior
- Cast runtime behavior
- MQTT runtime behavior
- KNX write-path
- robotkommandoer
- reconnect/restart engine
- automasjoner
- cloud sync
- account system
- production vault

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/integration-manager.mjs` OK
- `node --check bridge/provider-state-store.mjs` OK

Restart smoke test med midlertidig state-dir OK:

```text
configPersisted=true
secretsReturned=false
restoredConfigured=true
restoredPersisted=true
restoredEncrypted=true
credentialsExposed=false
```

## Gjenstår Før Production-Grade Integration OS

- OS keystore/TPM eller robust vault
- user/site-bound credential ownership
- persistent runtime activation flow
- provider restart/reconnect engine
- multi-site persistence og permissions

