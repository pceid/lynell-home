# Lynell weekend test report v1

## Formål

Dette dokumentet rydder helgetest-notater inn i en prioritert backlog for videre Lynell-arbeid.

Fokus:

- stabilitet
- runtime truth
- historikk
- NIVA-opplevelse
- integrasjonsretning
- fremtidig plattformstruktur

Ingen av punktene under er implementert i dette dokumentet.

## 1. Quick fixes

### NIVA/Atmosfære språk

Fjern overbruk av ordet `rolig` i NIVA/Atmosfære.

Eksempel:

```text
Noen signaler trenger rolig oppfølging.
```

bør bli:

```text
Noen signaler trenger oppfølging.
```

`Rolig` skal være tone/designprinsipp, ikke et ord som repeteres i UI.

Mål:

- mindre repetitiv mikrotekst
- mer premium følelse
- mindre "AI-polert" språk
- fortsatt dempet og trygg tone

## 2. Runtime / server truth

Flere klienter må speile samme sannhet.

Server skal være source of truth.

Klienter skal oppføre seg som plugins/views mot server.

Dette er viktig før videre multi-device bruk.

Retning:

- frontend skal ikke eie endelig runtime truth
- app-state skal være view/cache, ikke primær runtime
- server skal eie live state, historikk og integrasjonsstatus
- mobil, desktop og eventuelle wall-panels skal vise samme virkelighet

Dette må planlegges kontrollert uten å bryte eksisterende KNX/Cast/Dreame runtime.

## 3. Historikk og logging

Trendhistorikk må forbedres for:

- time
- dag
- uke

Skalering skal vises selv om data mangler.

Appen/serveren må alltid lytte og logge data uavhengig av aktiv view/app-state.

Dette er kritisk for:

- NIVA-intelligens
- komfortanalyse
- trendhistorikk
- adaptive awareness
- senere lokal AI/ML

Retning:

- logging skal være kontinuerlig
- historikk skal ikke være avhengig av at bruker står i riktig view
- server/runtime må etter hvert eie logging
- frontend kan fortsatt vise graf og analyse

## 4. NIVA Local Intelligence

Fremtidig lokal AI/ML.

Prinsipper:

- local-first
- privacy-first
- ingen autonom fysisk handling uten godkjenning
- alle automasjoner og fysiske handlinger krever godkjenning
- NIVA skal kunne lære mønstre og foreslå handlinger
- NIVA kan hente informasjon fra nett når det er relevant og godkjent/trygt

Mulige bruksområder:

- lære husets rytme
- foreslå komforttiltak
- foreslå energitiltak
- forklare avvik
- hjelpe med topologi/integrasjoner
- forbedre intent-forståelse over tid

Ikke bygges nå:

- full AI-agent
- autonom automasjonsmotor
- fysisk handling uten eksplisitt approval

## 5. Local alerts / news

Vurdere rullende banner for lokale viktige hendelser.

Eksempler:

- naturhendelser
- forurenset vann
- lokale driftsmeldinger
- andre relevante varsler

Første versjon:

- kun informasjonslag
- ingen handlinger
- ingen push/alarm-system
- ikke overdramatisk UI

Retning:

- diskret banner
- kildebevisst
- lokal relevans
- NIVA kan forklare hva varselet betyr

## 6. Manager / import-export

Avklare dagens import/export-status.

Fremtidig KNX-retning:

- `.knxproj` import
- NIVA kan foreslå topologi og gruppeadresser
- arkivere tilgjengelige gruppeadresser
- eksport kan lagre kopi av `.knxproj`

Mål:

- Manager blir tydeligere arbeidsflate
- import/export får klar status
- KNX-topologi kan etter hvert bli mer assistert

Ikke nå:

- full ETS-erstatning
- automatisk KNX-endring uten brukerbekreftelse
- ukontrollert write-path-endring

## 7. Admin / users / license / multi-site

Fremtidig struktur:

- Eier
- Admin
- Superbruker
- Bruker
- Brukerbibliotek med e-post/passord/brukernavn
- Anleggstilgang
- Brukerlisens
- Mulighet for flere anlegg

Backend-auth planlegges, men aktiveres ikke ennå.

Retning:

- brukere og anlegg må modelleres tidlig nok til at plattformen kan vokse
- multi-site må planlegges før datastrukturen låses
- lisens/tilgang skal ikke forstyrre lokal runtime i første fase

## 8. Assistenter / integrations

Egen Assistant Manager.

Denne skal være sted for:

- innlogging/credentials til utstyr
- leverandørvalg
- provider-strategi
- status/readiness
- kontrollert test

Første leverandør:

- Dreame

Senere kommandoer:

- start
- pause
- dock

Viktig:

- credentials skal aldri ligge i frontend
- kommandoer skal være approval-gated
- status og capability mapping må være stabil før flere kommandoer åpnes

## 9. Media

Vurdere om server kan brukes som cast/grouping tool.

Mulige retninger:

- server som media coordinator
- bedre Cast session ownership
- grouping foundation
- senere multiroom

Ikke nå:

- Spotify/YouTube auth
- full streamingplattform
- queue-system uten klar plan

## 10. Nye live-test integrasjoner

Mulige neste live-test devices:

- Deco WiFi plugger
- Mill WiFi varmeovn
- Namron varmeovn

Retning:

- undersøk lokal/cloud API
- status-only først
- ingen kommandoer før status er stabil
- tydelig truth-status i Manager/NIVA

## 11. Scripts

Lag ett rent script for Live Mode med:

- Dreame
- Chromecast

Rydd gamle scripts som ikke trengs.

Mål:

- enklere oppstart hjemme
- mindre forvirring mellom demo/dev/live
- tydelig env-oppsett
- ingen credentials i repo

## Prioritert backlog

### P0

- NIVA-språk `rolig` cleanup
- Live startup script
- server/source-of-truth plan
- historikklogging uavhengig av app-state

### P1

- Trendhistorikk v2
- Assistant Manager credentials
- Manager import/export clarification
- local alert banner foundation

### P2

- users/license/multi-site
- KNX `.knxproj` import
- local AI/ML foundation
- new device integrations

## Notater

Denne rapporten er et planleggings- og prioriteringsdokument.

Ingen kodeendringer er gjort som del av rapporten.

Ingen build er nødvendig.
