# Lynell checkpoint v8.33 - Language selection + MQTT trust

## Status

v8.33 er Product stabilization sprint 8.

Målet er språkvalg Norsk/Engelsk og MQTT trust completion.

Dette er product usability + provider trust.

Ingen KNX write/DPT, provider command paths, automasjoner, ML eller remote execution er endret.

## Endrede filer

- `src/i18n/`
- `src/App.tsx`
- `src/components/ManagerPanel.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/components/manager/managerTypes.ts`
- `bridge/server.mjs`
- `bridge/mqtt-runtime.mjs`

Merk:

- `bridge/runtime-state-store.mjs` ble ikke funksjonelt endret i denne sprinten, men ble verifisert med `node --check`.

## 1. Språkvalg

Lynell har nå språkvalg foundation for:

- `no`
- `en`

Norsk er default.

Språkvalg eies av server-owned SystemConfig:

- `SystemConfig.language`

Frontend bruker fortsatt eksisterende lokal fallback/cache dersom server-config ikke er tilgjengelig.

Manager har global språkvelger:

- Norsk
- English

Språk kan byttes uten reload der React-state brukes.

## 2. Translation foundation

Ny enkel translation-struktur:

- `src/i18n/no.ts`
- `src/i18n/en.ts`
- `src/i18n/index.ts`

Dette er bevisst ikke et stort enterprise-i18n rammeverk.

Oversatt foundation dekker:

- navigasjon
- common labels
- Manager språkvalg
- NIVA welcome/help/fallback/source wording
- MQTT-status/diagnostikk

Bevisst ikke fulloversatt:

- rå developer/debug-strenger
- low-level diagnostics

## 3. NIVA language awareness

NIVA bruker valgt språk for sentrale system- og hjelpetekster.

Norsk er default.

NIVA foundation-svar for blant annet systemforklaring, fallback og source/confidence wording følger valgt språk.

Dette er ikke AI-oversettelse og ikke automatisk flerspråklig prompt-system.

## 4. MQTT trust completion

MQTT runtime skiller nå mellom:

- broker connected
- subscribed
- live topics
- retained-only topics
- stale/offline topics
- publish failures
- subscribe failures

MQTT er ikke lenger bare en binær `connected` foundation.

## 5. MQTT topic trust

Per topic spores:

- `retained`
- `live`
- `stale`
- `sourceAgeMs`
- `lastPayload`
- `lastUpdate`
- `confidence`

Viktig trust-regel:

- retained payload teller ikke som fersk live data.
- retained-only topic vises som historisk/retained grunnlag, ikke som live truth.
- Integration truth teller ikke MQTT som reelt live/kontrollklart bare fordi broker er connected.

## 6. MQTT UX og diagnostics

Manager/Assistenter viser tydeligere MQTT-status:

- broker state
- topic count
- freshness
- retained/live
- stale/offline

Manager Diagnose viser:

- MQTT runtime health
- broker state
- reconnect count
- retained/live/stale/offline topic counts
- subscribe failures
- publish failures
- raw topic list under Developer

Hvis MQTT er stale eller retained-only, brukes roligere trust wording i stedet for aggressiv error-tone.

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/mqtt-runtime.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK

## Ikke gjort

- ingen full MQTT automation engine
- ingen MQTT scene orchestration
- ingen remote execution redesign
- ingen AI translation
- ingen ekstra språk
- ingen KNX/runtime action-endringer
- ingen provider command path-endringer

## Gjenstår live

- live broker soak-test
- retained/live topics
- reconnect
- stale-overganger
- publish/subscribe failure handling
- PC/mobil språkvalg sync

## Resultat

Lynell har nå en enkel, server-eid språkfoundation for Norsk/Engelsk og en mer troverdig MQTT runtime-modell.

MQTT kan forklares og vises med freshness, retained/live trust og topic-level confidence, uten å late som broker connection alene betyr live, styrbar integrasjon.

Ingen kodeendringer.
Ingen build nødvendig.
