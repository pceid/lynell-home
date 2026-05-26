# Lynell Runtime State Storage

Runtime-state er lokal driftsdata og skal ikke inn i git.

Ignorerte standardmapper:
- `bridge/.lynell-state/`
- `.lynell-state/`
- `.tmp-*`

Anbefaling for live-drift:
- Sett state-mapper utenfor OneDrive når mulig for å unngå fillåser under compaction/flush.
- Bruk eksisterende env overrides, for eksempel `LYNELL_INTEGRATION_STATE_DIR` og `LYNELL_RUNTIME_CONFIG_STATE_DIR`, når runtime-state skal flyttes.
- Ikke legg credentials, local keys, runtime-history, audit eller snapshots i repo.

