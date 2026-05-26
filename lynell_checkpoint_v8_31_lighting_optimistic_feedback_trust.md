# Lynell checkpoint v8.31 — Lighting optimistic feedback trust

## Status

v8.31 er Product stabilization sprint 6.

Målet er å fjerne opplevd treghet ved lys av/på og dimming.

Dette er frontend trust/optimistic UI + reconciliation.

Ingen KNX write-path, DPT, backend runtime, automasjoner eller ML ble endret.

## Endrede filer

- `src/App.tsx`
- `src/components/RoomCard.tsx`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/styles.css`

## Hva som ble lagt inn

- `optimisticLighting` state
- `pendingFeedback` status
- umiddelbar UI-oppdatering ved:
  - lys av/på
  - dimming
  - scene-triggered lys
- room truth overstyres midlertidig med sist sendte verdi
- kortene reagerer med en gang

## Reconciliation

- fersk KNX `lightFeedback` / `valueFeedback` bekrefter sendt verdi
- pending fjernes når feedback stemmer
- hvis feedback avviker:
  - optimistic state fjernes
  - UI faller tilbake til faktisk KNX/cache truth
- hvis feedback mangler etter ca. 2500 ms:
  - status blir `delayedFeedback`
  - rolig tekst: “Venter fortsatt på bekreftelse”

## Scene handling

Disse får samme optimistic/pending behandling:

- frontend scene-triggered lys
- nylig server-reported scene execution

## UX

- subtile pending cues i Romkort
- ingen store spinnere
- ingen aggressive error banners
- NIVA kan forklare:
  - lysverdien er sendt
  - venter på KNX-feedback
  - status er foreløpig basert på sist sendte verdi

## Manager Diagnose

Viser:

- optimistic count
- pending feedback count
- delayed feedback
- rollback count
- average feedback latency

## Verifisert

- `npm run build` OK

## Ikke endret

- KNX payload/DPT
- KNX write-path
- backend runtime behavior
- automasjoner
- ML

## Gjenstår live

- test lys av/på fysisk/ETS
- test dimming
- test manglende feedback-GA
- test scene-triggered lys
- bekreft at UI føles umiddelbar
- bekreft at feil/manglende feedback forklares rolig

## Merk

Ingen kodeendringer.

Ingen build nødvendig.
