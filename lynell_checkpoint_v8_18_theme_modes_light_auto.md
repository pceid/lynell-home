# Lynell checkpoint v8.18 - Theme modes light/auto

v8.18 legger inn light/dark/auto theme mode.

Dette er ren frontend UI/UX.

Ingen backend, KNX, provider runtime, actions, automasjoner eller ML er endret.

## Endrede filer

- `src/App.tsx`
- `src/styles.css`

## Theme modes

- Dark
- Light
- Auto

## Theme state

- `themeMode`
- `resolvedTheme`
- localStorage key:
  - `lynell.themeMode`

## Auto mode

Fallback basert på lokal tid:

- light 07:00-19:00
- dark ellers

Auto re-evalueres hvert 5. minutt.

Viser:

- `Auto · Light nå`
- `Auto · Dark nå`

## UI

Global toggle i øvre UI:

- Dark
- Light
- Auto

## CSS

Lagt inn:

- `body.theme-dark`
- `body.theme-light`

CSS tokens for:

- background
- surface
- surface-soft
- text
- text-muted
- border
- accent
- status
- shadow

## Light mode

- varm off-white/premium palett
- bedre lesbarhet i dagslys
- overrides for:
  - app shell
  - RoomCard
  - Manager/Assistenter
  - NIVA-flater
  - trend/fullscreen chart

## Dark mode

- beholdt dagens uttrykk så nært som mulig

## Verifisert

- `npm run build` OK

## Gjenstår live/UI

- visuell sjekk på desktop
- visuell sjekk på mobil
- sjekk kontrast i trend/fullscreen
- senere sunrise/sunset hook når location/weather finnes

Ingen kodeendringer.
Ingen build nødvendig.
