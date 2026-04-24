#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Activate venv
source "$ROOT/venv/bin/activate"

# Install/sync deps quietly
pip install -q -r "$ROOT/backend/requirements.txt"

echo "Starting AgentDock backend on http://localhost:8120 ..."
cd "$ROOT"
uvicorn backend.main:app --host 0.0.0.0 --port 8120 --reload
