#!/usr/bin/env bash
# Air cloud startup script for WaterBnB (React 19 + Vite 6 + TypeScript + Vitest).
#
# Runs in two modes, selected by AIR_STARTUP_MODE:
#   warmup - snapshot-baking run and env-setup verification: install deps, prime
#            build/test caches, start the dev server and BLOCK in `healthcheck`
#            until the environment is proven to work.
#   task   - real task run: install deps if the lockfile changed, start the dev
#            server in the background and return promptly.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

if [ "${AIR_STARTUP_MODE:-}" = warmup ]; then WARMUP=1; else WARMUP=; fi

DEV_PORT="${AIR_DEV_PORT:-5173}"
export AIR_DEV_PORT="$DEV_PORT"
VITE_CONFIG=".air/cloud/vite.config.ts"
LOG_DIR="/tmp/air-startup"
DEV_LOG="$LOG_DIR/vite-dev.log"
mkdir -p "$LOG_DIR"

log() { printf '[startup %s] %s\n' "$(date +%H:%M:%S)" "$*"; }
die() { log "ERROR: $*"; exit 1; }

log "mode=${AIR_STARTUP_MODE:-task} repo=$REPO_ROOT port=$DEV_PORT"

# ---------------------------------------------------------------------------
# 1. Toolchain: the image ships Node + npm. README requires Node >= 22.13.
# ---------------------------------------------------------------------------
command -v node >/dev/null 2>&1 || die "node is not installed; this project needs Node.js 22.13+ (24 LTS recommended)"
command -v npm  >/dev/null 2>&1 || die "npm is not installed"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
log "node $(node -v), npm $(npm -v)"
[ "$NODE_MAJOR" -ge 22 ] || die "Node.js $(node -v) is too old; this project requires Node.js 22.13+"

# ---------------------------------------------------------------------------
# 2. Dependencies: `npm ci` from the lockfile, skipped when node_modules already
#    matches it (true on a task run booted from the warm snapshot).
# ---------------------------------------------------------------------------
STAMP="node_modules/.air-install-stamp"
LOCK_HASH="$(sha256sum package-lock.json | cut -d' ' -f1)"
if [ -d node_modules ] && [ "$(cat "$STAMP" 2>/dev/null || true)" = "$LOCK_HASH" ]; then
  log "dependencies already installed for current package-lock.json; skipping npm ci"
else
  log "installing dependencies (npm ci)..."
  npm ci --no-audit --no-fund
  echo "$LOCK_HASH" > "$STAMP"
  log "dependencies installed"
fi

# ---------------------------------------------------------------------------
# 3. Warm-up only: production build primes the tsc incremental state
#    (tsconfig.*.tsbuildinfo) and Vite/esbuild caches; the output is also the
#    smoke test that the project compiles.
# ---------------------------------------------------------------------------
if [ -n "$WARMUP" ]; then
  log "running production build (tsc -b && vite build)..."
  npm run build
  log "production build OK -> dist/"
fi

# ---------------------------------------------------------------------------
# 4. Dev server: Vite on 0.0.0.0:$DEV_PORT accepting any Host (see
#    .air/cloud/vite.config.ts), started detached so the script can return.
# ---------------------------------------------------------------------------
port_in_use() {
  curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$DEV_PORT/" 2>/dev/null
}

if port_in_use; then
  log "something already answers on port $DEV_PORT; not starting another dev server"
else
  log "starting Vite dev server on port $DEV_PORT (log: $DEV_LOG)"
  nohup npx vite --config "$VITE_CONFIG" >"$DEV_LOG" 2>&1 &
  echo $! > "$LOG_DIR/vite-dev.pid"
fi

# ---------------------------------------------------------------------------
# 5. healthcheck: proves the environment works the way a task needs it to.
#    Waits (without its own deadline; the launcher owns the timeout) until the
#    dev server serves the app shell and transforms a module, then runs the
#    Vitest suite. Any failure exits non-zero.
# ---------------------------------------------------------------------------
healthcheck() {
  local url="http://127.0.0.1:$DEV_PORT"
  local host_header="localhost"
  local exposed="${JBCENTRAL_EXPOSED_PORT_URL_5173:-}"
  if [ -n "$exposed" ]; then
    host_header="${exposed#*://}"; host_header="${host_header%%/*}"
  fi

  log "healthcheck: waiting for dev server at $url (Host: $host_header)..."
  local i=0 code body
  while :; do
    code="$(curl -s -o "$LOG_DIR/index.html" -w '%{http_code}' --max-time 5 -H "Host: $host_header" "$url/" || true)"
    if [ "$code" = "200" ] && grep -q 'id="root"' "$LOG_DIR/index.html" && grep -q '/src/main.tsx' "$LOG_DIR/index.html"; then
      break
    fi
    if [ "$code" = "403" ] && grep -qi 'Blocked request' "$LOG_DIR/index.html"; then
      die "Vite rejected the Host header '$host_header' (allowedHosts); check $VITE_CONFIG"
    fi
    i=$((i + 1))
    if [ $((i % 10)) -eq 0 ]; then
      log "healthcheck: still waiting (last status: ${code:-none}); dev server log tail:"
      tail -n 5 "$DEV_LOG" 2>/dev/null || true
    fi
    sleep 2
  done
  log "healthcheck: GET / -> 200 with app shell"

  # The dev server must also compile the entry module, not just serve HTML.
  body="$(curl -s --max-time 30 -H "Host: $host_header" "$url/src/main.tsx" || true)"
  echo "$body" | grep -q 'ClerkProvider' || die "dev server did not transform /src/main.tsx (got: $(echo "$body" | head -c 300))"
  log "healthcheck: GET /src/main.tsx -> transformed module OK"

  [ -f dist/index.html ] || die "dist/index.html missing: production build did not run"

  if [ -z "${VITE_SUPABASE_URL:-}" ] || [ -z "${VITE_SUPABASE_PUBLISHABLE_KEY:-}" ] || [ -z "${VITE_CLERK_PUBLISHABLE_KEY:-}" ]; then
    log "WARNING: VITE_CLERK_PUBLISHABLE_KEY / VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are not all set."
    log "         The app throws at startup without them and the test suite imports src/utils/supabase.ts,"
    log "         so the tests below will fail until these environment secrets are filled."
  fi

  log "healthcheck: running test suite (vitest run)..."
  if ! npx vitest run; then
    die "vitest run failed; see output above"
  fi
  log "healthcheck: test suite passed"
  log "healthcheck: OK - dev server on :$DEV_PORT, build and tests green"
}

if [ -n "$WARMUP" ]; then
  healthcheck
else
  log "task mode: dev server starting in background on port $DEV_PORT; not waiting"
fi
log "startup complete"
