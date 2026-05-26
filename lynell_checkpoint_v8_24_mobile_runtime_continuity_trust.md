# Lynell checkpoint v8.24 - Mobile runtime continuity trust

v8.24 er Product stabilization sprint 4.

Målet er mobil/runtime continuity trust. Fokus er roligere reconnect, frontend freshness, siste kjente truth og bedre mobilopplevelse.

Dette er stabilisering av frontend-runtime-opplevelsen. Ingen backend/runtime behavior-endringer er gjort.

## Endrede filer

- `src/api/homeApi.ts`
- `src/App.tsx`
- `src/components/manager/ManagerDiagnostics.tsx`
- `src/styles.css`

## Endringer

### 1. SSE reconnect smoothing

SSE/EventSource reconnect er gjort roligere og mer mobilvennlig.

Lagt inn:

- backoff
- jitter
- reconnect state
- roligere error wording
- replay resume fra latest replayable event only

Viktig detalj:

- Frontend bruker ikke lenger ikke-replaybare heartbeat/resync-events som resume-punkt.
- Dette reduserer risiko for unødvendig `resyncRequired` etter mobile sleep/wake eller midlertidig nettverksbrudd.

### 2. Frontend continuity state

Ny frontend runtime continuity state:

- `connecting`
- `reconnecting`
- `synced`
- `stale`
- `offline`

Lagt inn:

- freshness aging
- drift suspicion
- reconnect history
- stale/offline counts
- last sync tracking

Frontend kan dermed skille bedre mellom:

- aktiv sync
- midlertidig reconnect
- stale, men brukbar sist kjent truth
- offline/ikke fersk runtime state

### 3. UX/trust

Home beholder sist kjente truth under midlertidig reconnect.

UI skal ikke hard-resette eller spamme aggressive feil når runtime bare reconnecter.

Roligere tekst lagt inn:

- `Oppdaterer tilkobling`
- `Viser sist kjente data`

Dette gjør mobil sleep/wake og WiFi-skifter mindre dramatiske for vanlige brukere.

### 4. Manager Diagnose

Manager Diagnose viser nå:

- mobile continuity
- last sync
- retry delay
- drift suspicion
- stale/offline counts
- reconnect history

Dette gir et enklere bilde av om frontend bare venter på runtime-events, eller om den faktisk har mistet fersk runtime-state.

### 5. Mobile responsive polish

Lagt inn mobilpolish for:

- ingen horisontal overflow i statisk sanity check
- bedre touch targets
- scrollable tabs
- tryggere trend modal
- sticky NIVA composer
- mobile drawer light-mode polish

## Root cause

Mobile sleep/wake og EventSource-feil ble behandlet for binært.

Frontend hadde ikke tydelig freshness aging, og reconnect hadde ikke synlig lifecycle. UI kunne derfor høres ut som alt var unavailable selv om siste kjente truth fortsatt var brukbar.

v8.24 gjør dette mer tillitsbyggende:

- sist kjente truth beholdes
- freshness markeres
- reconnect forklares rolig
- fallback polling kan løftes midlertidig ved stale/offline event stream

## Verifisert

- `npm run build` OK
- Statisk mobile sanity check `390x844` OK:
  - Home uten horisontal overflow
  - mobile drawer uten horisontal overflow
  - locked Manager uten horisontal overflow

## Ikke gjort

- ingen backend redesign
- ingen PWA/service worker
- ingen push notifications
- ingen offline DB
- ingen auth-system
- ingen automasjoner
- ingen ML
- ingen runtime behavior-endringer

## Merk

Midlertidige `.tmp-static-server.out/.err` ble låst av Windows/OneDrive etter smoke check.

De inneholder kun `ready`/empty og kan slettes senere når lås slipper.

## Gjenstår live

- mobile browser sleep/wake
- WiFi reconnect
- PC + mobil samtidig
- live SSE recovery mot bridge
- bekrefte at UI ikke hard-resetter
- bekrefte at stale/offline wording føles riktig

## Status

Ingen kodeendringer i dette checkpointet.

Ingen build nødvendig for selve dokumentasjonssteget.
