# Lynell checkpoint v8.20 - UI structure + visual cleanup

v8.20 er en ren UI/UX cleanup og visual polish-pass.

Målet var bedre struktur, hierarki, light mode, Manager/Assistenter, Trendhistorikk og generell lesbarhet.

Ingen runtime, KNX, providerlogikk, actions, automasjoner eller ML ble endret.

## Endrede filer

- `src/App.tsx`
- `src/components/ManagerPanel.tsx`
- `src/styles.css`

## Hovedendringer

### 1. Manager/Assistenter struktur

- Diagnose lagt i egen `manager-diagnostics-shell`.
- Tydelig nivådeling:
  - Status
  - Integrasjoner
  - NIVA
  - Energi
  - Verktøy
  - Developer
- Normal status vises først, rådata/advanced etterpå.
- Advanced provider details og Developer diagnostics er visuelt dempet.
- Provider-kort og runtime summary skalerer bedre.

### 2. Trendhistorikk

- Forbedret tabell-, modal- og tooltip-lesbarhet.
- Fullbredde trend er tydeligere.
- Fikset overlap der "Utvid"-knapp lå bak/over "Siste verdi".
- Responsive chart header.
- Bedre light/dark lesbarhet.

### 3. Home / Rom

- Mer kompakt Home hero.
- Mindre klokke/vær/NIVA-core.
- Roligere Room/Romrapport-visning.
- "Ikke komplett" byttet til "Venter på data".
- Teknisk analysefotnote byttet til "Venter på romdata for varmebehovsanalyse".

### 4. Light mode redesign

- Warm/beige light mode ble erstattet av "Northern winter intelligence".
- Kald ice grey/off-white base.
- Subtil cyan/teal aurora-bakgrunn.
- Frostet glass-retning.
- Bedre kontrast, borders, shadows og paneldybde.
- Home hero light treatment med deep pine/frosted glass.
- Compact NIVA pill forbedret.
- Cards/surfaces er mer premium og mindre flate.

### 5. Light mode contrast polish

Forbedret:

- Trendhistorikk-knapper
- ONSKET-rad
- Minus/pluss
- Komfort/Natt-knapper
- Chips for setpoint/komfort/varme
- Disabled/inactive states
- Secondary labels

### 6. Final light mode fixes

- Plan 0 / Plan 1 / Hybel tabs fikk bedre kontrast.
- Active/inactive floor tabs er tydeligere.
- Velg rom dropdown ble byttet fra mørk blokk til lys frost-glass.
- Manager/signal logger selects fikk samme select-polish.
- Alt ligger under `body.theme-light` der relevant.

## Designretning

- Premium
- Nordisk vinter
- Aurora/mint accent
- Rolig
- Teknisk elegant
- Mindre developer dashboard-støy

## Verifisert

- `npm run build` OK

## Ikke endret

- Backend
- Runtime dataflow
- KNX write/DPT payloads
- Provider runtime
- Actions/policies
- Automasjoner
- ML/AI execution
- NIVA regler

## Gjenstår senere

- Praktisk mobil UX-pass på Manager/Assistenter med aktiv runtime.
- Eventuell ny screenshot-basert polish etter mer bruk.
- Modul-splitt fase 2 senere.

