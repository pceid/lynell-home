# Lynell checkpoint v8.15 - NIVA actions + signal update policy

## Status

v8.15 legger inn NIVA actionable suggestions, snooze/ack og signal update policy.

Dette er fortsatt observerende og brukerstyrt. Ingen automasjoner, ML, autonomous execution, nye KNX writes eller DPT-endringer er lagt inn.

## Endrede filer

- `src/runtime/signalUpdatePolicy.ts`
- `src/runtime/nivaObservationalIntelligence.ts`
- `src/App.tsx`
- `src/components/manager/managerTypes.ts`
- `src/components/manager/ManagerDiagnostics.tsx`
- `scripts/start-frontend.ps1`

## NIVA action buttons

NIVA-observasjoner kan nå få trygge knapper:

- `Hent verdier` for rom-observasjoner som stale/poll/temperaturfall
- `Åpne trend` for rom-observasjoner
- `Vis diagnose` for runtime/system-observasjoner

Disse bruker eksisterende trygge flows. Det er ikke lagt inn ny write-path.

## Snooze/ack

`Skjul` fungerer nå som snooze/ack:

- info/low: 1 time
- notice: 30 min
- warning: 15 min

Fingerprint baseres på:

- observasjon
- severity
- confidence
- rom
- evidence

Samme observasjon kommer ikke rett tilbake før snooze utløper.

## Signal update policy

Signalene får nå update policy:

- `temperature`: cyclic/stale-relevant
- `heatDemand`: cyclic/stale-relevant
- `setpoint`: onChange / mindre aggressiv stale
- `lightFeedback`: onChange / ikke NIVA-stale-spam
- `valueFeedback`: onChange / ikke NIVA-stale-spam
- `modeFeedback`: onChange/manual / ikke NIVA-stale-spam
- manual poll skilles som egen update mode

## Bod/onChange behavior

Bod og andre lysstatus-only rom behandles som "sist kjent status", ikke som stale-feil bare fordi det ikke kommer nye telegrammer.

## Setpoint feedback robustness

- Cache/history lookup matcher både `setpointFeedback` og normalisert `setpoint`
- Ferskere setpoint history kan overstyre eldre server snapshot
- ETS-telegram på f.eks. `1/1/2` skal ikke maskeres av snapshot

## Manager Diagnose

Manager Diagnose viser:

- NIVA active/snoozed observation count
- Action buttons enabled
- Last NIVA action invoked
- Signal update policy summary
- Cyclic/onChange/manual counts
- Stale suppressed because onChange count
- Setpoint feedback GA/source/timestamp

## Startup script

- `start-frontend.ps1` printer tydelig mobil-URL
- Scriptet viser kort nettverks-/firewall-sjekk

## Verifisert

- `npm run build` OK
- `node --check bridge/server.mjs` OK
- `node --check bridge/runtime-state-store.mjs` OK
- PowerShell syntax for `start-frontend.ps1` OK

## Ikke gjort

- Ingen automasjoner
- Ingen ML/AI execution
- Ingen nye writes
- Ingen DPT/write payload-endring
- Ingen Cast/Dreame/Deltaco runtime-endring

## Gjenstår live

- NIVA stale-observasjon for Hobby viser `Hent verdier`
- Skjul/snooze holder observasjonen borte
- Bod lysstatus gir sist kjent, ikke stale-mas
- Entré setpoint feedback `1/1/2` oppdaterer Rom/Klima/NIVA/trend med GA/DPT/source

## Merknad

Ingen kodeendringer ble gjort i denne checkpoint-oppgaven.
Ingen build ble kjørt for checkpoint-opprettelsen.
