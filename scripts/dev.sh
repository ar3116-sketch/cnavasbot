#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="/Users/advaith/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
FALLBACK_BIN="/Users/advaith/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback"
export PATH="$NODE_BIN:$FALLBACK_BIN:$PATH"

cd "$ROOT_DIR"
if [[ ! -x .venv/bin/uvicorn ]]; then
  python3 -m venv .venv
  .venv/bin/pip install -r backend/requirements.txt
fi

.venv/bin/uvicorn backend.app.main:app --reload --port 8000 &
API_PID=$!
trap 'kill "$API_PID" 2>/dev/null || true' EXIT INT TERM

cd apps/frontend
pnpm install
pnpm dev
