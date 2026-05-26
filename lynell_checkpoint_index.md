# Lynell Checkpoint Index

Denne filen er en samlet indeks over prosjektets checkpoints. Den er ment som rask orientering for videre arbeid, ikke som erstatning for de enkelte checkpoint-filene.

Sist oppdatert: etter `lynell_checkpoint_v8_10_runtime_config_bootstrap_stabilization.md`.

## Phase Overview

| Fase | Omfang | Kort status |
|---|---|---|
| v1-v4 | Runtime truth, NIVA foundation, history/insights groundwork | Fra tidlig runtime/UI til server truth, history, room snapshots, aggregater og første NIVA insights. |
| v5 | Integration OS foundation | Provider model, onboarding, lifecycle, orchestration, persistence og recovery foundation. |
| v6 | Deltaco/Tuya utility provider foundation | Discovery, classification, confirmed mapping og passiv protocol research uten styring. |
| v7 | KNX realtime/runtime truth + event-driven frontend | KNX subscription/runtime truth, persistent history, per-room poll, SSE og event-driven runtime foundation. |
| v8.0-v8.3 | Runtime governance, actions, policy, approval, identity | Action pipeline, policy, audit, client/session trust og approval UX foundation. |
| v8.4-v8.7 | Domains, registry, semantics, context graph | Runtime domains/capabilities, registry/provider composition og semantic context graph. |
| v8.8-v8.10 | Insight engine, boot orchestration, runtime stabilization | Explainable insights, boot health/readiness og critical runtime-config/KNX bootstrap stabilization. |

## v1 / v2 Runtime & Integrations

| Checkpoint | Kort tittel | Hovedformål | Status | Neste relevante oppfølging |
|---|---|---|---|---|
| `lynell_checkpoint_v1.md` | Tidlig prosjektstatus | Første grunnlag for Lynell Home, rom, runtime og UI-retning. | Historisk checkpoint. | Bruk kun som bakgrunn ved behov. |
| `lynell_checkpoint_v2.md` | Foundation v2 | Prosjektkontekst for foundation/mock, Manager, NIVA og første runtime-modeller. | Aktiv historisk baseline. | Les ved større endringer som berører grunnarkitektur. |
| `lynell_checkpoint_v2_2_integrations.md` | Integration checkpoint v2.2 | Første integrasjonsgjennombrudd: Cast, MQTT, Zigbee2MQTT, Dreame D20 Plus, HA bridge og native vacuum-retning. | Fullført. | Bruk som integrasjonsbaseline ved nye providers. |
| `lynell_checkpoint_v2_3_dreame_native_foundation.md` | Dreame native foundation | Status-only foundation for native Dreame cloud adapter, uten login eller kommandoer. | Fullført. | Auth/device-list metodevalg. |
| `lynell_checkpoint_v2_4_dreame_native_auth_device_success.md` | Dreame auth/device success | DreameHome auth og device-list fungerer status-only. | Fullført. | Status refinement og feltmapping. |
| `lynell_checkpoint_v2_5_dreame_status_refinement.md` | Dreame status refinement | Battery/online/latestStatus leses, observed status codes innført. | Fullført. | Manuell statusobservasjon. |
| `lynell_checkpoint_v2_6_dreame_keydefine_status_mapping.md` | Dreame keyDefine mapping | `keyDefine` brukes som live status dictionary, charging/docked avledet trygt. | Fullført. | Videre statusfelt og senere safe dock command. |
| `lynell_checkpoint_v2_7_media_cast_cleanup.md` | Media/Cast cleanup | Cast track change, volume routing og live/mock output-separasjon ryddet. | Fullført. | Lengre Cast stabilitetstest. |
| `lynell_checkpoint_v2_8_runtime_modes_cleanup.md` | Runtime modes cleanup | Simulering erstattet med Live Mode, Demo Mode og Developer Mode. | Fullført. | Holde mock ute av Live Mode. |
| `lynell_checkpoint_v2_9_live_mobile_validation.md` | Live mobile validation | Live Mode validert på mobil med Dreame, Cast playback/volume og LAN-tilgang. | Fullført. | Bruke LAN-IP/host riktig ved videre mobiltesting. |

## v3 NIVA Identity / Context

| Checkpoint | Kort tittel | Hovedformål | Status | Neste relevante oppfølging |
|---|---|---|---|---|
| `lynell_checkpoint_v3_0_runtime_abstraction_foundation.md` | Runtime abstraction foundation | Etablerer `RuntimeDeviceContract` og felles runtime states. | Fullført. | Flytte flere builders ut av `App.tsx`. |
| `lynell_checkpoint_v3_1_runtime_architecture_cleanup.md` | Runtime architecture cleanup | Runtime contract builders flyttet ut til `runtimeContractBuilders.ts`. | Fullført. | NIVA/UI polish oppå samme contract-output. |
| `lynell_checkpoint_v3_2_niva_ui_polish.md` | NIVA UI polish | Roligere runtime-presentasjon, Developer-only dypere diagnose. | Fullført. | Mer konsistent mikrotekst. |
| `lynell_checkpoint_v3_3_niva_ambient_language.md` | Ambient language | Samlet språkfoundation for runtime/readiness/media/device-state. | Fullført. | Presence/weather/comfort språksett. |
| `lynell_checkpoint_v3_4_niva_intent_gap_logging.md` | Intent-gap logging | Ukjente/svake NIVA-intents logges som læringssignal i session. | Fullført. | Samle flere intents fra faktisk bruk. |
| `lynell_checkpoint_v3_5_niva_session_context.md` | Session context | NIVA får korttidskontekst og mild oppfølgingsforståelse. | Fullført. | Persistent local learning senere. |
| `lynell_checkpoint_v3_6_niva_presence_comfort_awareness.md` | Presence/comfort awareness | NIVA beskriver hjemmets atmosfære med enkle heuristikker. | Fullført. | Live Mode mobiltesting og mer mikrotekst. |
| `lynell_checkpoint_v3_7_render_safety_guards.md` | Render safety | Blank screen fikset med ErrorBoundary og root cause rundt `systemMode` init-rekkefølge. | Fullført. | Beholde ErrorBoundary og sjekke console stack først ved blank screen. |
| `lynell_checkpoint_v3_8_language_and_live_startup.md` | Language cleanup + Live startup | Redusert språkstøy og lagt til Live Mode script for Dreame + Cast. | Fullført. | Teste scriptet praktisk og fortsette server truth. |

## v4 Server Truth / History / Insights

| Checkpoint | Kort tittel | Hovedformål | Status | Neste relevante oppfølging |
|---|---|---|---|---|
| `lynell_checkpoint_v4_0_persistent_server_intelligence_foundation.md` | Server intelligence foundation | Server-centric runtime store med `/api/runtime/state`, history og summary. | Fullført. | Disk/database persistence og server-owned subscriptions. |
| `lynell_checkpoint_v4_1_trend_history_server_logging.md` | Server-owned history | Separate in-memory history collections og sparse-safe ranges. | Fullført. | Trend UI direkte fra server datapoints. |
| `lynell_checkpoint_v4_2_ui_trend_engine.md` | UI trend engine | Trendvisningen bruker `/api/runtime/history` som primærkilde. | Fullført. | Kategori-velger, aggregater og detail diagnostics. |
| `lynell_checkpoint_v4_3_server_aggregates_room_snapshots.md` | Aggregates + room snapshots | Server-owned room snapshots og aggregater for hour/day/week. | Fullført. | Rikere server-eid romdata. |
| `lynell_checkpoint_v4_4_niva_insight_foundation.md` | NIVA insight foundation | Heuristiske read-only insights fra snapshots/aggregates/history. | Fullført. | Persistent historikk og baseline/normalmodell. |

## v5 Integration OS

| Checkpoint | Kort tittel | Hovedformål | Status | Neste relevante oppfølging |
|---|---|---|---|---|
| `lynell_checkpoint_v5_0_assistant_manager_integration_foundation.md` | Assistant Manager foundation | Server-eid provider model og read-only integration endpoints. | Fullført. | Persistent/encrypted credential store. |
| `lynell_checkpoint_v5_1_integration_onboarding_dreame.md` | Dreame onboarding | Første safe/read-only onboarding-flow med Dreame som golden path. | Fullført. | Runtime activation flow og encrypted config. |
| `lynell_checkpoint_v5_2_integration_lifecycle_foundation.md` | Lifecycle foundation | Enable/disable/activate/deactivate som session-level lifecycle intent. | Fullført. | Persistent lifecycle og faktisk adapter activation senere. |
| `lynell_checkpoint_v5_3_provider_runtime_orchestration.md` | Runtime orchestration | Mild server-owned provider health/orchestration metadata. | Fullført. | Ekte reconnect/restart engine senere. |
| `lynell_checkpoint_v5_4_persistent_provider_state_credentials.md` | Provider persistence + credentials | Persistent provider state og AES-256-GCM credential foundation. | Fullført. | Production-grade vault/OS keystore. |
| `lynell_checkpoint_v5_5_provider_recovery_foundation.md` | Recovery foundation | Recovery windows, cooldowns og policy metadata uten faktisk reconnect. | Fullført. | Ekte reconnect engine og approval-gated recovery. |

## v6 Deltaco/Tuya Utility Provider

| Checkpoint | Kort tittel | Hovedformål | Status | Neste relevante oppfølging |
|---|---|---|---|---|
| `lynell_checkpoint_v6_3_deltaco_tuya_candidate_classification.md` | Candidate classification | Read-only klassifisering/ekskludering av LAN-kandidater før Tuya research. | Fullført. | Confirmed manual mapping for Lampe 1-5. |
| `lynell_checkpoint_v6_4_deltaco_tuya_confirmed_mapping.md` | Confirmed mapping | Persistent device identity foundation for Deltaco/Tuya lamp plugs. | Fullført. | Bekrefte alle Lampe 1-5 og fortsette protocol research. |
| `lynell_checkpoint_v6_5_deltaco_tuya_protocol_research.md` | Passive protocol research | Passiv TCP/transport-observasjon uten payloads, auth eller kommandoer. | Fullført. | Tuya local/cloud metode, local key-strategi og senere safe on/off model. |

## v7 KNX Subscription / Runtime Truth

| Checkpoint | Kort tittel | Hovedformål | Status | Neste relevante oppfølging |
|---|---|---|---|---|
| `lynell_checkpoint_v7_2_unified_room_truth_trend_detail.md` | Unified room truth + trend detail | Romkort, Trendhistorikk, NIVA og KNX cache peker mot samme resolved room truth. | Fullført. | Flytte resolver ut av `App.tsx` senere. |
| `lynell_checkpoint_v7_3_per_room_knx_poll_feedback.md` | Per-room KNX poll + feedback | Trygg manuell per-rom KNX poll, cache/history propagation og value highlight. | Fullført. | Langtidstest med ETS på poll/write. |
| `lynell_checkpoint_v7_5_persistent_history_room_runtime_ui.md` | Persistent history + Room-runtime UI | Persistent runtime-history og flytting av Hent verdi til Rom-runtime. | Fullført. | Retention/downsampling og langtidstest. |
| `lynell_checkpoint_v7_6_runtime_ux_stale_slider_poll.md` | Runtime UX/stale/slider/poll | Hent verdi under Trendhistorikk, poll classification, update highlight og slider commit-on-release. | Fullført. | Live-verifisere grønt blink og ETS brightness write ved release. |
| `lynell_checkpoint_v7_7_runtime_event_stream_sse.md` | Runtime Event Stream SSE | Første server-owned SSE stream via `/api/runtime/events`. | Fullført. | PC + mobil live-test og Last-Event-ID replay. |
| `lynell_checkpoint_v7_8_event_driven_runtime_foundation.md` | Event-driven runtime foundation | Event bus contract, event buffer, Last-Event-ID foundation og frontend reducer. | Fullført. | Mer presis client tracking og gradvis pollingreduksjon. |
| `lynell_checkpoint_v7_9_runtime_observability_adaptive_polling.md` | Runtime observability + adaptive polling | Runtime metrics, latency, polling pressure og adaptive polling foundation. | Fullført. | Full Runtime Bus senere, etter live stability. |

## v8 Runtime Governance / Registry / Stabilization

| Checkpoint | Kort tittel | Hovedformål | Status | Neste relevante oppfølging |
|---|---|---|---|---|
| `lynell_checkpoint_v8_0_runtime_action_pipeline_foundation.md` | Runtime action pipeline | Modellerer eksisterende handlinger som runtime actions med lifecycle, events og history. | Fullført. | Full approval UI og action queue UX. |
| `lynell_checkpoint_v8_1_runtime_policy_approval_foundation.md` | Runtime policy + approval | Policy model, approval pipeline foundation og audit. | Fullført. | Policy editor, roles og hardere trust enforcement. |
| `lynell_checkpoint_v8_2_runtime_identity_client_trust.md` | Runtime identity + client trust | Client/session observability, trust classification og action/audit ownership. | Fullført. | Persistent client registry og trust management UI. |
| `lynell_checkpoint_v8_3_approval_ux_foundation.md` | Approval UX foundation | Pending approval queue, approve/deny endpoints, audit og trust-aware governance UI. | Fullført. | Bedre approval panel utenfor Diagnose. |
| `lynell_checkpoint_v8_4_runtime_domain_capability_foundation.md` | Runtime domain + capability foundation | Domain separation, capability governance og domain-aware actions/events. | Fullført. | Flytte domain-modell ut av `server.mjs`. |
| `lynell_checkpoint_v8_5_runtime_snapshot_recovery_continuity.md` | Runtime snapshot + recovery continuity | Runtime snapshots, restore/recovery events og pending approvals over restart. | Fullført. | Snapshot compaction og recovery lineage. |
| `lynell_checkpoint_v8_6_runtime_registry_provider_composition.md` | Runtime registry + provider composition | Runtime registry, provider manifests, capability matrix og runtime services. | Fullført. | Persistent manifest registry og NIVA capability discovery. |
| `lynell_checkpoint_v8_7_runtime_semantics_context_graph.md` | Runtime semantics + context graph | Semantic entities, relationships og context graph foundation. | Fullført. | Flytte graph-builder ut av `server.mjs` og bedre display names. |
| `lynell_checkpoint_v8_8_runtime_insight_engine_foundation.md` | Runtime insight engine foundation | Deterministisk explainable runtime insight engine med persistence og acknowledge endpoint. | Fullført. | UI for acknowledge/resolve og bedre dedupe/retention. |
| `lynell_checkpoint_v8_9_runtime_boot_orchestration.md` | Runtime boot orchestration | Boot lifecycle, provider readiness og `/api/runtime/health`. | Fullført. | Soak-test, PC + mobil og uptime/memory validation. |
| `lynell_checkpoint_v8_10_runtime_config_bootstrap_stabilization.md` | Runtime config bootstrap stabilization | CORS/preflight, boot/reconnect config push, manual trigger, build-before-serve, persisted-server-config, source trust, SSE heartbeat cleanup, storage hygiene, persisted climate restore og soak diagnostics. | Fullført stabilisering. | Større soak-test før v9-planlegging. |

## Known Missing Historical Checkpoints

Disse arbeidspunktene er implementert i kode, men har ikke egne checkpoint-filer. Ikke opprett dem automatisk nå; de kan lages som retrospektive checkpoints senere hvis historikken bør bli komplett.

| Manglende checkpoint | Status | Kommentar |
|---|---|---|
| v6.0 Deltaco/Tuya discovery foundation | Implemented in code, checkpoint missing, optional retrospective checkpoint later. | Første Deltaco/Tuya provider foundation, manual candidates og read-only discovery endpoint. |
| v6.1 Deltaco/Tuya toggle-correlation discovery | Implemented in code, checkpoint missing, optional retrospective checkpoint later. | Read-only identify session for manuell toggling og low-confidence IP-korrelasjon. |
| v6.2 Deltaco/Tuya discovery enrichment | Implemented in code, checkpoint missing, optional retrospective checkpoint later. | ARP/vendor/hostname/mDNS/SSDP/TCP enrichment for candidates. |
| v7.0 KNX subscription/runtime truth foundation | Implemented in code, checkpoint missing, optional retrospective checkpoint later. | Server-side KNX subscription/cache, DPT 5.001 HeatDemand, diagnostics og setpoint strategy foundation. |
| v7.1 KNX subscription idempotency + Dreame singleflight fix | Implemented in code, checkpoint missing, optional retrospective checkpoint later. | KNX singleton/fingerprint/debounce og Dreame duplicate-login guard. |
| v7.4 Runtime UX alignment + Signal Logger foundation | Implemented in code, checkpoint missing, optional retrospective checkpoint later. | Poll UX cleanup, conditional climate rendering, slider debounce, runtime intents og Signal Logger foundation. |

## Current Recommended Next Work

1. Kjør større soak-test på v8.10: bridge restart, frontend restart, PC + mobil samtidig, ETS monitor på writes/polls, source trust over tid, SSE/client stability og storage growth.
2. Rydd provider/foundation labels slik at foundation/mock/prepared providers ikke fremstår som ekte healthy runtime.
3. Start module split phase 1 etter soak-test, særlig `bridge/server.mjs` og `src/App.tsx`.
4. Oppdater checkpoint-indeksen igjen etter soak-test hvis v8.10 får live-test status.
5. Planlegg v9 først når runtime-config bootstrap, KNX live truth, source trust og SSE multi-client oppfører seg stabilt.

## Do Not Build Yet

- automasjoner
- ML
- remote control
- plugin loader
- Tuya on/off path
- mer provider control
- distributed runtime

## Notes Before v9.0

- v8.10 er nå hovedstabiliseringspunktet etter boot/config-regresjonen.
- Checkpoint-kjeden er dokumentert opp til v8.10, men v6.0-v6.2 og v7.0/v7.1/v7.4 er fortsatt historiske hull.
- Arkitekturaudit anbefaler stabilisering, modul-splitt og live-validering før nye foundations.

Ingen build nødvendig for denne indeksen.
