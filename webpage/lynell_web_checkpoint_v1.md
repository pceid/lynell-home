# Lynell Web Checkpoint v1

## Formal

Lynell-nettsiden er en separat marketing-side for Lynell. Den skal presentere Lynell som et rolig, intelligent og premium grensesnitt for hjemmets viktigste funksjoner: komfort, lys, klima, solskjerming, media og energi.

Siden er laget for forste publisering og skal kunne brukes mot sluttbrukere, byggherrer, eiendomsutviklere, integratorer og tekniske miljoer.

## Teknisk stack

- Vite
- React
- TypeScript
- Ren CSS
- Ingen backend
- Ingen eksterne API-er
- Ingen runtime-kobling til Lynell Home-appen

## Filstruktur

```text
webpage/
  index.html
  package.json
  README.md
  lynell_web_checkpoint_v1.md
  public/
    favicon.svg
  src/
    App.tsx
    main.tsx
    styles.css
  vite.config.ts
  tsconfig.json
  tsconfig.app.json
  tsconfig.node.json
```

## Sprakvalg

Siden stotter norsk og engelsk via React state.

- Norsk er default.
- Engelsk kan velges i header med `NO / EN`.
- Alt innhold ligger strukturert i `content.no` og `content.en` i `src/App.tsx`.
- Det er ikke innfort i18n-bibliotek.

## Designretning

Visuell retning:

- Mork nordisk premium
- Rolig gronn/teal glow
- Stor typografi og mye luft
- Minimalistisk teknisk uttrykk
- Subtile line-icons
- Glass/border cards med lav kontrast
- Arkitektonisk produktfolelse fremfor startup SaaS

Siden skal foles som premium home intelligence og building-grade control, men uten at teknisk sprak dominerer forsiden.

## NIVA-posisjonering

NIVA presenteres som Lynells assistentlag:

- Neural Intelligent Visual Assistant
- En visjon for intelligens som gjor hjemmet mer forstaelig
- Skal observere, forsta og forklare
- Skal foresla og hjelpe uten a ta kontrollen bort fra mennesket
- Fremstilles som en retning under utvikling, ikke ferdig magisk AI

NIVA-seksjonen har egen forklaring av navnet, demonstrasjonskort og cards for retningen Lynell bygger mot.

## Deploy-status

Siden er klargjort for forste publisering:

- SEO metadata er lagt inn i `index.html`.
- OpenGraph og Twitter metadata er lagt inn.
- Egen SVG favicon ligger i `public/favicon.svg`.
- Kontaktknapp bruker `mailto:post@lynell.no?subject=Demo%20av%20Lynell`.
- `npm run build` har tidligere gatt gront etter publiseringsklargjoring.

## Kjore lokalt

```bash
cd webpage
npm run dev
```

## Bygge

```bash
cd webpage
npm run build
```

## Anbefalt neste steg

1. Legg `webpage/` inn i GitHub sammen med repoet.
2. Deploy `webpage/` som egen Vite-app via Vercel eller Netlify.
3. Sett build command til `npm run build`.
4. Sett output directory til `dist`.
5. Pek `lynell.no` fra Domeneshop til valgt deploy-provider via DNS.
6. Legg senere til egen teknisk side for integratorer, radgivere og tekniske miljoer.
