# Lynell checkpoint v8.32 - Calm status indicators + optimistic UX

## Status

v8.32 er Product stabilization sprint 7.

Målet er roligere og mer premium statusindikatorer for optimistic/pending states.

Dette er UX/presentasjon, ikke runtime-/KNX-endring.

## Endrede filer

- `src/components/RoomCard.tsx`
- `src/styles.css`
- `src/App.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/components/manager/managerTypes.ts`

## 1. Calm status indicators

Synlig tekst som:

- "Venter fortsatt på bekreftelse"
- "Sendt, venter på feedback"

ble fjernet fra normal RoomCard-visning.

Erstattet med:

- liten amber pending-indikator
- subtil glow/pulse
- tooltip/detail ved hover/fokus/tap

Målet er:

- mindre teknisk støy
- roligere premium UX
- fortsatt explainable status

## 2. Tooltip/detail system

Ny reusable status-presentasjon:

- `calm-status-indicator`
- light/dark tooltip styling

Tooltip forklarer:

- "Venter på KNX-feedback"
- "Sist sendte verdi vises midlertidig"

Mobil:

- info tilgjengelig via tap/fokus
- ikke avhengig av desktop hover

Accessibility:

- `title`
- `aria-label`
- tooltip/detail tilgjengelig

## 3. Optimistic lighting UX

- Lys av/på og dimming reagerer fortsatt umiddelbart.
- Pending-state vises nå subtilt i stedet for som tekstlinje.
- Scene-kjøring får samme rolige pending-indikator.

## 4. Runtime wording cleanup

Pending/rollback wording er dempet:

- `pending/rollback` -> `avventer/korrigert`
- `Optimistic lighting trust` -> `Lighting response trust`

Dette gir mindre developer-/runtime-tone i UI.

## 5. Diagnostics

Manager Diagnose viser:

- calm indicators enabled
- tooltip system active
- optimistic/pending metrics
- rollback/korrigert metrics
- delayed feedback metrics

## Verifisert

- `npm run build` OK

## Ikke endret

- KNX write-path
- DPT/payload
- optimistic reconciliation logic
- backend runtime
- automasjoner
- ML

## Resultat

- lysstyring føles fortsatt umiddelbar
- pending-state er nå subtil og premium
- KNX truth/reconciliation beholdes
- UI roper ikke om status lenger

Ingen kodeendringer.
Ingen build nødvendig.
