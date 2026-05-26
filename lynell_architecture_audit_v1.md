# Lynell Architecture Audit v1

Dato: 2026-05-21

Scope:
- Audit av checkpoints mot faktisk kode.
- Ingen feature-implementering.
- Ingen refactor.
- Ingen build kjørt for denne rapporten.

Leste hovedfiler:
- `lynell_checkpoint_index.md`
- `lynell_checkpoint_*.md`
- `bridge/server.mjs`
- `bridge/runtime-state-store.mjs`
- `bridge/provider-state-store.mjs`
- `bridge/integration-manager.mjs`
- `bridge/dreame-cloud-runtime.mjs`
- `bridge/vacuum-runtime.mjs`
- `src/App.tsx`
- `src/api/homeApi.ts`
- `src/runtime/`
- `src/components/manager/`
- `src/components/trend/`
- `src/components/RoomCard.tsx`
- `scripts/start-live-dreame-cast.ps1`
- `scripts/start-frontend.ps1`
- `package.json`

## 1. Executive summary

Lynell har vokst fra UI/prototype til et reelt runtime-system med KNX subscription, persistent history, SSE, action pipeline, policy/approval, identity, registry, semantics, insight engine og boot orchestration. Arkitekturen har mange gode foundations, men flere av dem ligger fortsatt i to store monolitter:

- `src/App.tsx`: ca. 13 546 linjer.
- `bridge/server.mjs`: ca. 6 444 linjer.

Det største tekniske temaet er ikke mangel på features, men at runtime truth, config bootstrap, history source-trust og diagnostics nå er tett koblet på tvers av frontend, bridge og dokumenterte checkpoints. Dette øker regresjonsrisiko ved hvert nytt lag.

Viktigste funn:

1. `lynell_checkpoint_index.md` er utdatert og sier feilaktig at v7-checkpoints mangler, selv om flere v7-filer finnes.
2. v7.0, v7.1, v7.4 og v8.10.x er implementert helt eller delvis i kode, men mangler checkpoint-filer.
3. Serveren eier nå mye runtime-state, men KNX-topologi/config eies fortsatt i praksis av frontend/bootstrap-flow.
4. Frontend logger fortsatt snapshot/reference history i Live Mode via `createRuntimeSnapshotHistoryPoints(..., 'snapshot')`, som kan forurense trend/NIVA hvis fallback-data blandes med live KNX-data.
5. SSE heartbeat er per klient, men kaller global `emitRuntimeEvent('runtimeHeartbeat')`, som kan gi N klienter x N heartbeat-leveranser ved flere åpne klienter.
6. `bridge/.lynell-state/` og `.tmp-*` ligger i workspace og `.gitignore` ignorerer dem ikke. Dette er hygiene- og sikkerhetsrisiko, særlig fordi provider credential local-key ligger under `.lynell-state`.
7. Integration/provider readiness er nyttig, men flere foundation-providers kan fremstå friskere enn de faktisk er hvis UI ikke tydelig skiller `foundation/prepared` fra ekte connected runtime.
8. v8.10.2/v8.10.3-fiksene er kritiske og finnes i kode, men ikke låst som checkpoint. De bør live-testes og dokumenteres før ny featureutvikling.

Overordnet vurdering:
- Runtime-retningen er riktig.
- Neste fase bør være stabilisering, modul-splitt og live-validering, ikke flere foundations.
- v9.0 bør ikke starte før KNX config bootstrap, live/restored source separation, SSE multi-client behavior og storage hygiene er validert.

## 2. Status mot checkpoints

Antall checkpoint-dokumenter i workspace: 50, pluss `lynell_checkpoint_index.md`.

Faktisk funnet checkpoint-kjede:
- v1
- v2, v2.2-v2.9
- v3.0-v3.8
- v4.0-v4.4
- v5.0-v5.5
- v6.3-v6.5
- v7.2, v7.3, v7.5-v7.9
- v8.0-v8.9

Viktige avvik:

| Område | Funn | Konsekvens |
|---|---|---|
| Checkpoint index | `lynell_checkpoint_index.md` sier at ingen v7-filer finnes, men workspace har v7.2, v7.3 og v7.5-v7.9. | Videre arbeid kan starte fra feil historikk. |
| v6 | v6.0-v6.2 er implementert som discovery/identify/deep enrichment flow i `integration-manager.mjs`, men har ikke checkpoints. | Deltaco/Tuya-historikken starter dokumentert på v6.3 og mister kontekst. |
| v7 | v7.0, v7.1 og v7.4 mangler checkpoint-filer. | KNX subscription, idempotency og signal logger/runtime UX har ufullstendig dokumentasjon. |
| v8.10 | v8.10, v8.10.2 og v8.10.3 finnes som kodeendringer, men ikke checkpoints. | Kritiske startup/config fixes er ikke låst. |
| v8.9 | Checkpoint sier `/api/runtime/health` smoke hadde `ready=true` og `providersReady=11/11`. Koden etter v8.10 skiller `bridgeReady` fra `runtimeReady` og krever KNX connected for `runtimeReady`. | Checkpoint er historisk riktig, men nå misvisende hvis brukt som sannhet. |
| v8.4-v8.8 | Dokumenterer store foundations som i praksis ligger hardkodet i `server.mjs`. | Checkpointene matcher funksjonelt, men ikke ønsket modulstruktur. |

Implementasjoner som mangler checkpoint:
- `LYNELL_BRIDGE_HOST` / `LYNELL_BRIDGE_PORT` og LAN-binding.
- runtime-config target build diagnostics.
- `runtimeConfigRefresh` local auto-approve policy.
- frontend runtime-config payload fallback til baseline KNX mapping.
- Manager payload summary diagnostics.

Status:
- Checkpoint-kjeden er verdifull, men indeksen er ikke trygg som navigasjonskilde før den oppdateres.

## 3. Critical issues

### C1. Frontend kan fortsatt lage snapshot-history som ser ut som trendgrunnlag

Kodefunn:
- `src/App.tsx` legger inn snapshot-punkter når `rooms` endres og hvert 60. sekund:
  - `appendRuntimeHistory(createRuntimeSnapshotHistoryPoints(rooms, runtimeAllowsMock ? 'simulate' : 'snapshot'))`
  - `createRuntimeSnapshotHistoryPoints(..., 'snapshot', Date.now())`

Risiko:
- Live Mode kan få frontend-snapshot/reference-punkter i lokal runtimeHistory.
- Hvis server-history er sparse eller utilgjengelig, kan trend/NIVA bruke snapshot/fallback som om det var live-ish data.
- Dette strider mot prinsippet i v7/v8: server-owned datapoints og tydelig kilde.

Konsekvens:
- NIVA kan overvurdere gammel/restored/snapshot-basert temperatur, lys eller heatDemand.
- Trend kan se mer komplett ut enn den egentlig er.

Anbefalt fix:
- Slutt å logge `snapshot` som vanlig trendpunkt i Live Mode.
- Behold snapshot som egen kategori/reference, ikke som trend-datapoint.
- Trend/NIVA må kreve source allowlist for live vurderinger: `knx-subscription`, `manualPoll`, `groupValueResponse`, evt. eksplisitt `restored` med lav confidence.

### C2. KNX topology/config er fortsatt frontend-bootstrap-avhengig

Kodefunn:
- `bridge/server.mjs` har safe default runtime config uten mappings.
- KNX subscription targets bygges fra `/api/runtime/config`.
- v8.10.3 legger fallback til baseline mapping i frontend, men serveren eier ikke persistent KNX topology direkte.

Risiko:
- Hvis frontend ikke åpnes, feil API-base brukes, eller payload fallback brytes, får bridge:
  - `runtimeConfigSource=safe-default`
  - `whyTargetCountZero=noKnxMappings`
  - `targetCount=0`
  - `connectionState=standby`
- Da vises restored history, men live KNX er død.

Konsekvens:
- ETS får ingen writes/polls.
- Appen kan se delvis levende ut pga snapshots/history.

Anbefalt fix:
- Flytt KNX topology/config til server-persistent config.
- Frontend kan fortsatt redigere/pushe config, men bridge må kunne starte med siste kjente KNX topology uten app-init.

### C3. SSE heartbeat skalerer feil ved flere klienter

Kodefunn:
- Hver `/api/runtime/events`-klient får egen `setInterval`.
- Intervallet kaller global `emitRuntimeEvent('runtimeHeartbeat')`.
- `emitRuntimeEvent` sender eventet til alle klienter.

Risiko:
- Med N klienter får man N heartbeat-genereringer, hver sendt til N klienter.
- To klienter er lite problem, men mønsteret er feil for multi-device soak.

Konsekvens:
- Unødvendig event throughput.
- Skjeve `eventsPerMinute`.
- Mulig duplicate heartbeat/reducer noise.

Anbefalt fix:
- Enten send keepalive direkte til den ene response (`sendSseEvent(response, ...)`), eller ha én global heartbeat-timer.

### C4. Runtime-state og credentials ligger i workspace uten gitignore-beskyttelse

Kodefunn:
- `.gitignore` ignorerer `node_modules`, `dist`, `.DS_Store`, `*.local`.
- Den ignorerer ikke:
  - `bridge/.lynell-state/`
  - `.tmp-v64-state-*`
  - `.tmp-v75-runtime-history`
- `bridge/.lynell-state/integration-os/credentials/.local-key` finnes.

Risiko:
- Lokal key, runtime history, actions, audit og provider state kan bli committet hvis repo initieres eller flyttes.
- OneDrive-locks er allerede observert i v7.5.

Konsekvens:
- Sikkerhets- og hygieneproblem før production-grade runtime.

Anbefalt fix:
- Legg `.lynell-state/`, `bridge/.lynell-state/`, `.tmp-*` i `.gitignore`.
- Flytt runtime state ut av OneDrive-path eller gjør state-dir eksplisitt via env for live drift.

## 4. High priority issues

### H1. `server.mjs` har for mange runtime-ansvar

Størrelse:
- `bridge/server.mjs`: ca. 6 444 linjer.

Ansvar i samme fil:
- HTTP routing.
- KNX runtime.
- runtime event bus/SSE.
- action pipeline.
- policy/approval.
- audit/action persistence.
- client identity.
- runtime registry.
- semantic graph.
- insight engine.
- boot orchestration.
- runtime snapshots.
- DPT mapping.

Risiko:
- Små endringer i ett foundation-lag kan brekke bootstrap, actions eller SSE.
- Checkpoints sier ofte "foundation", men kodebanen er nå production-critical.

Anbefaling:
- Start modul-splitt før flere features.

### H2. `App.tsx` er runtime orchestrator, UI shell og Manager-hub samtidig

Størrelse:
- `src/App.tsx`: ca. 13 546 linjer.

Ansvar i samme fil:
- Runtime config push.
- room truth resolution.
- NIVA dataflow.
- SSE reducer integration.
- trend source selection.
- Manager state.
- KNX writes.
- Cast/Dreame/MQTT flows.
- config editing.

Risiko:
- Render regressions.
- Stale closures og dependency-array issues.
- Vanskelig å bevise hvilken "truth" en komponent bruker.

Anbefaling:
- Flytt room truth, bridge runtime client, config sync og NIVA runtime context ut av `App.tsx`.

### H3. Runtime-config fallback til baseline mapping er nyttig, men må behandles som midlertidig

Kodefunn:
- `src/api/homeApi.ts` velger mapping:
  1. saved system config
  2. current runtime cache
  3. baseline `knxMapping`

Fordel:
- Hindrer tom payload når localStorage/system config er tom.

Risiko:
- Frontend kan sende code-baseline KNX mappings selv om Manager egentlig har tom/disabled config.
- Dette kan bli overraskende i fremtidig multi-site/multi-user.

Anbefaling:
- Server-persistent site config bør erstatte fallbacken.
- Diagnostics må fortsette å vise `payloadSource=baseline-knx-mapping` tydelig.

### H4. Action policy/trust er observability, ikke security

Kodefunn:
- Client trust baseres på remoteAddress, `clientId` og fravær av `x-forwarded-for`.
- `localTrusted` gis til LAN-klienter med clientId.
- Det finnes ikke auth/RBAC.

Risiko:
- Dette er riktig som foundation, men farlig hvis UI eller docs begynner å behandle det som faktisk sikkerhet.

Anbefaling:
- Hold remote control disabled.
- Ikke la approval/security-UI antyde ekte auth før persistent identity og login finnes.

### H5. Provider readiness er blandet mellom ekte runtime og foundation placeholders

Kodefunn:
- `integration-manager.mjs` bygger providers for Dreame, Cast, MQTT, Deltaco/Tuya, Sonos, Deco, Mill, Namron.
- Future providers får `status=foundation`, `runtimeHealth=prepared`.
- Deltaco/Tuya kan få discovery/research status uten control.

Risiko:
- Assistant Manager kan se "rik" ut, men flere providers er bare manifests/placeholders.

Anbefaling:
- UI bør ha tydelig "Foundation only / no adapter / no commands" markering.

## 5. Medium priority issues

### M1. Checkpoint naming er ikke komplett

Mangler:
- `lynell_checkpoint_v6_0_*`
- `lynell_checkpoint_v6_1_*`
- `lynell_checkpoint_v6_2_*`
- `lynell_checkpoint_v7_0_*`
- `lynell_checkpoint_v7_1_*`
- `lynell_checkpoint_v7_4_*`
- `lynell_checkpoint_v8_10_*`

Anbefaling:
- Opprett retrospektive checkpoints eller marker dem som intentionally skipped i index.

### M2. Runtime event replay er buffer-only

Kodefunn:
- Event buffer limit: 250.
- `Last-Event-ID` replay fungerer bare hvis event finnes i buffer.
- Ellers sendes `resyncRequired`.

Risiko:
- Helt OK som foundation, men mobile sleep/reconnect vil ofte falle ut av buffer.

Anbefaling:
- Neste steg er snapshot + Last-Event-ID kobling, ikke større realtime features.

### M3. Dropped-event tracking er globalt og grovt

Kodefunn:
- `runtimeEventStats.droppedEvents` økes ved send-feil.
- Ikke per client/session.

Risiko:
- Diagnostics kan ikke si hvilken klient som mistet events.

Anbefaling:
- Per-client stream stats før polling reduseres mer.

### M4. Runtime insight engine kan gi false positives på restored/sparse data

Kodefunn:
- Insight engine bruker room snapshots, aggregates og runtime stats.
- Restored snapshots kan inngå i room summary.

Risiko:
- "Høyt varmebehov" eller "få nye signaler" kan være riktig teknisk, men misvisende uten tydelig source/confidence.

Anbefaling:
- Insights må ha strict source gating:
  - live insight
  - restored insight
  - sparse/reference insight

### M5. Runtime action history er append-heavy og lifecycle-heavy

Kodefunn:
- Hver action får flere entries: created, queued, executing, completed/failed.
- JSONL + retention finnes, men audit/actions kan vokse raskt under test.

Risiko:
- Støy og storage growth.

Anbefaling:
- Compaction og "latest action state by id" bør bli egen index.

### M6. DPT metadata er spredt

Kodefunn:
- DPT 5.001 og DPT 9.001 finnes i KNX runtime/server.
- DataType->DPT mapping er enkel og sentral nok for nå, men ligger inne i `server.mjs`.

Risiko:
- Flere datapunkttyper vil øke risiko for feil.

Anbefaling:
- Flytt DPT encode/decode/mapping til `bridge/knx-dpt.mjs`.

## 6. Low priority cleanup

1. Fjern eller dokumenter `.tmp-v64-state-*` og `.tmp-v75-runtime-history`.
2. Oppdater `package.json` scripts med anbefalt live frontend script, ikke bare `bridge`, `dev`, `preview`.
3. Standardiser checkpoint-titler: noen bruker "Checkpoint", noen "checkpoint".
4. Flytt hardkodede display strings for Manager diagnostics gradvis ut i mindre components.
5. Gjør registry/domain/semantic manifests data-drevne i egne filer.
6. Reduser `console.info('[Lynell] Runtime config payload summary', ...)` når live stabilitet er bekreftet, eller gjør det dev-only.
7. Rydd `.tmp` provider-state files hvis de ikke er aktivt låst.

## 7. Live-test checklist

### Runtime boot/config

- Start `scripts/start-live-dreame-cast.ps1`.
- Sjekk at script viser:
  - local bridge health
  - LAN bridge health
  - local frontend
  - LAN frontend
- Fra PC:
  - `Invoke-RestMethod http://localhost:8787/api/runtime/health`
  - `Invoke-RestMethod http://<LAN-IP>:8787/api/runtime/health`
- Fra mobil:
  - åpne frontend på LAN URL
  - Manager Diagnose skal vise riktig API base.

Forventet:
- `bridge.listenHost=0.0.0.0`
- `bridgeReady=true`
- `runtimeReady=true` først når KNX er connected
- `runtimeConfigSource=frontend-runtime-config`
- `targetBuildCount > 0`
- `whyTargetCountZero=null`

### KNX

- `/api/knx/diagnostics`:
  - `runtimeConfigReceived=true`
  - `feedbackMappingCounts.light > 0`
  - `feedbackMappingCounts.dim > 0`
  - `feedbackMappingCounts.climate > 0`
  - `runtime.targetCount > 0`
- ETS Monitor:
  - ingen GroupValueRead-spam ved sidebytte
  - rompoll gir kun valgte roms feedback-GA-er
  - lys av/på sender telegram
  - dimming sender telegram ved release, ikke kontinuerlig drag
  - setpunkt sender DPT 9.001 som før
- HeatDemand:
  - DPT 5.001 prosent vises som faktisk prosent
  - lave verdier som 9% vises tydelig

### Source trust

- Stopp bridge, start på nytt.
- Før live KNX-connect:
  - UI skal merke restored-only/stale.
  - Trend skal vise restored/persisted, ikke live.
  - NIVA skal ikke omtale restored snapshot som live status.
- Etter live KNX telegram:
  - RoomCard, Trend og NIVA skal konvergere på samme source.

### SSE/multi-client

- Åpne PC + mobil samtidig.
- Poll på mobil.
- PC skal oppdatere uten å vente på fallback polling.
- Se Manager Diagnose:
  - SSE connected for begge.
  - reconnect count stabil.
  - events per minute ikke uventet høy.
- La begge stå åpne i minst 30 min:
  - heartbeat throughput skal ikke eskalere uforholdsmessig.

### Actions/approval

- Local roomPoll skal auto-execute.
- Local KNX write skal auto-execute.
- Provider lifecycle skal gå pendingApproval.
- Deny skal ikke mutate runtime.
- Approve skal bare kjøre kontrollert lifecycle intent.
- Audit skal få client/session context.

### Storage

- Kjør 2-4 timer live.
- Sjekk størrelser:
  - `bridge/.lynell-state/runtime-history/history-events.jsonl`
  - `history-points.jsonl`
  - `runtime-snapshots/snapshots.jsonl`
  - `runtime-actions/actions.jsonl`
  - `runtime-audit/audit.jsonl`
- Sjekk om OneDrive lager locks eller `.tmp`-rester.

## 8. Recommended next 10 steps

1. Oppdater `lynell_checkpoint_index.md` slik at v7.2-v7.9 og v8.0-v8.9 reflekteres korrekt.
2. Opprett retrospektive checkpoints for v7.0, v7.1, v7.4 og v8.10.x, eller marker dem eksplisitt som skipped/merged.
3. Live-test v8.10.3 config bootstrap: bekreft `frontend-runtime-config`, `targetBuildCount > 0`, KNX active og ETS writes.
4. Legg `.lynell-state/`, `bridge/.lynell-state/` og `.tmp-*` i `.gitignore`.
5. Stopp Live Mode snapshot-history fra å bli vanlig trendgrunnlag; skill source `snapshot/reference/restored/live/manualPoll`.
6. Flytt KNX runtime/config/DPT ut av `server.mjs`.
7. Flytt runtime event bus/SSE ut av `server.mjs` og fiks heartbeat per-client/global timer.
8. Flytt room truth resolver og bridge runtime client ut av `App.tsx`.
9. Lag server-owned persistent KNX topology/config før videre multi-client/multi-site.
10. Kjør soak-test før nye features: PC + mobil + KNX + SSE + history + writes i minst en kveld.

## 9. Suggested module split

### Bridge

Foreslått:

- `bridge/runtime-config.mjs`
  - normalize/apply runtime config
  - config fingerprint
  - target build diagnostics
  - server-owned topology later

- `bridge/knx-runtime.mjs`
  - subscription runtime
  - group cache
  - per-room poll
  - write path wrapper
  - KNX diagnostics

- `bridge/knx-dpt.mjs`
  - DPT encode/decode
  - DPT 9.001
  - DPT 5.001
  - dataType mapping

- `bridge/runtime-events.mjs`
  - SSE clients
  - event buffer
  - Last-Event-ID
  - per-client stream stats
  - heartbeat

- `bridge/runtime-actions.mjs`
  - action model
  - lifecycle
  - action persistence

- `bridge/runtime-policies.mjs`
  - default policies
  - approval evaluation
  - risk/category/capability rules

- `bridge/runtime-identity.mjs`
  - client/session registry
  - trust classification
  - stale session cleanup

- `bridge/runtime-registry.mjs`
  - domains
  - provider manifests
  - capability matrix

- `bridge/runtime-semantics.mjs`
  - entity model
  - relationship graph
  - semantic context for events

- `bridge/runtime-insights.mjs`
  - deterministic insight rules
  - insight persistence
  - acknowledge/resolve

- `bridge/runtime-boot.mjs`
  - boot phases
  - readiness
  - health payload

### Frontend

Foreslått:

- `src/runtime/roomTruthResolver.ts`
  - KNX cache > server snapshot > history latest > fallback
  - source/confidence/stale logic

- `src/runtime/runtimeClient.ts`
  - bridge API base
  - client registration
  - SSE subscription
  - fallback polling state

- `src/runtime/runtimeConfigSync.ts`
  - KNX mapping extraction
  - payload summary
  - retry/reconnect push

- `src/runtime/sourceTrust.ts`
  - live/restored/snapshot/manualPoll/fallback classification
  - NIVA/trend allowlist helpers

- `src/components/manager/diagnostics/*`
  - split ManagerDiagnostics into smaller panels:
    - BridgeRuntimePanel
    - KnxRuntimePanel
    - EventStreamPanel
    - ActionGovernancePanel
    - ProviderRegistryPanel
    - StoragePanel

## 10. Risks before v9.0

1. Starting v9 features before v8.10.x is checkpointed will hide critical bootstrap context.
2. Treating `localTrusted` as security would be premature.
3. Treating restored snapshots as live measurements will undermine NIVA trust.
4. Keeping KNX topology frontend-owned will keep producing targetCount=0 regressions.
5. More foundations in `server.mjs` will increase accidental coupling.
6. More UI in `App.tsx` will increase render/runtime regression risk.
7. Provider marketplace/plugin work before module split will harden the current monolith.
8. AI/ML before source-trust cleanup will train/score on ambiguous data.
9. Remote control before auth/RBAC/trust hardening is unsafe.
10. Persistent state inside OneDrive without hygiene may create lock/corruption surprises.

## 11. What not to build yet

Ikke bygg ennå:

- AI/ML/anomaly detection.
- Automations.
- Remote control.
- Approval-gated physical actions beyond current foundation.
- Plugin loader/dynamic code loading.
- Distributed runtime/failover.
- Multi-site runtime.
- Provider marketplace.
- Tuya on/off path.
- More providers beyond foundation.
- Full NIVA action proposal UX.

Før dette bør Lynell ha:

- stable server-owned KNX config
- clean source trust
- checkpoint/index consistency
- storage hygiene
- module split started
- multi-client live soak test

## Appendix: concrete fix prompts for critical findings

### Fix prompt 1: Source trust cleanup

```text
Oppgave:
Runtime source trust cleanup.

Mål:
Hindre at snapshot/reference/restored/demo datapunkter behandles som live runtime data.

Gjør:
- Skill source categories:
  - liveKnx
  - manualPoll
  - restoredHistory
  - roomSnapshotReference
  - frontendFallback
  - demo/simulate
- Stopp Live Mode fra å legge `snapshot` inn i vanlig runtimeHistory som trendgrunnlag.
- Trend/NIVA skal bruke live allowlist for live claims.
- Restored/snapshot kan vises, men med lav confidence og tydelig label.

Ikke gjør:
- ingen KNX write changes
- ingen nye features
- ingen ML/automasjoner
```

### Fix prompt 2: Server-owned KNX topology

```text
Oppgave:
Server-owned KNX topology/config persistence.

Mål:
Bridge skal kunne starte med siste kjente KNX topology uten frontend-init.

Gjør:
- Persistér KNX runtime config server-side.
- Boot bridge med persisted KNX topology hvis finnes.
- Frontend runtime-config push kan raffinere/oppdatere, men ikke være eneste kilde.
- Diagnostics skal vise:
  - configSource=persisted-server-config/frontend-runtime-config/safe-default
  - targetBuildCount
  - whyTargetCountZero

Ikke gjør:
- ikke endre DPT payloads
- ikke endre write behavior
```

### Fix prompt 3: SSE heartbeat and per-client observability

```text
Oppgave:
SSE heartbeat + per-client runtime stream metrics cleanup.

Mål:
Unngå N-klienter x N-heartbeat event storm og få bedre stream diagnostics.

Gjør:
- Bruk én global runtime heartbeat eller send direct keepalive per response uten global emit.
- Track per-client:
  - connectedAt
  - lastEventId
  - sentEvents
  - droppedEvents
  - reconnect count
  - latency estimate
- Manager Diagnose skal vise per-client stream health.

Ikke gjør:
- ikke fjern polling fallback
- ikke endre KNX write path
```

### Fix prompt 4: Storage hygiene

```text
Oppgave:
Runtime storage hygiene.

Mål:
Hindre at local runtime state, credentials og temp-testdata havner i repo eller låses av OneDrive.

Gjør:
- Oppdater .gitignore:
  - bridge/.lynell-state/
  - .lynell-state/
  - .tmp-*
- Legg inn docs for LYNELL_INTEGRATION_STATE_DIR og runtime history dir utenfor OneDrive.
- Legg inn safe cleanup script for gamle tmp testmapper.

Ikke gjør:
- ikke slett state automatisk
- ikke rør credentials
```
