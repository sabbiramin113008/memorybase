#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
FRONTEND="$ROOT/frontend"

# Install npm deps if node_modules is missing or package.json changed
if [ ! -d "$FRONTEND/node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install --prefix "$FRONTEND"
fi

echo "Starting AgentDock frontend dev server on http://localhost:5273 ..."
npm run dev --prefix "$FRONTEND"
