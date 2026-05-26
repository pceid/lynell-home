# Lynell checkpoint v3.7 - Render safety guards

## Status

Blank/gradient-screen ble erstattet av ErrorBoundary fallback.

Root cause var:

```text
ReferenceError: Cannot access 'systemMode' before initialization
```

Feilen lå i `App` under init av `nivaSessionMemory`.

`createInitialNivaSessionMemory` brukte `systemMode` før `systemMode` var deklarert.

Dette ble fikset ved å bruke `initialStorageState.config.runtime.systemMode` ved første init av NIVA session-memory.

## Render safety

ErrorBoundary beholdes i `main.tsx`.

Dev viser:

- error message
- component stack

Production viser:

- rolig fallback
- ingen teknisk stack til bruker

## Defensive guards

`runtimeContractBuilders` fikk trygg timestamp-formattering mot:

```text
Invalid time value
```

`nivaPresenceComfort` og `ManagerDiagnostics` har defensive fallbacks for manglende runtime-/diagnose-state.

## Endrede filer

- `src/App.tsx`
- `src/main.tsx`
- `src/integrations/runtime/runtimeContractBuilders.ts`
- `src/niva/nivaPresenceComfort.ts`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/styles.css`

## Verifisert

- `npm run build` OK
- `npm run dev` startet OK
- Headless Chrome rendret `app-shell`, ikke ErrorBoundary fallback.

## Ikke rørt

- Dreame/Cast/KNX runtime behavior
- vacuum-runtime
- automasjoner
- nye features

## Læring

Ved frontend blank screen bør browser console/error stack sjekkes først.

ErrorBoundary skal beholdes som sikkerhetsnett, men root cause skal alltid fikses.
