# MemoryBase

**The project operating system for AI agents.**

[![CI](https://github.com/sabbiramin113008/memorybase/actions/workflows/test.yml/badge.svg)](https://github.com/sabbiramin113008/memorybase/actions/workflows/test.yml)
[![Docs](https://github.com/sabbiramin113008/memorybase/actions/workflows/docs.yml/badge.svg)](https://github.com/sabbiramin113008/memorybase/actions/workflows/docs.yml)
[![PyPI](https://img.shields.io/pypi/v/memorybase.svg)](https://pypi.org/project/memorybase/)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-github.io-blue)](https://sabbiramin113008.github.io/memorybase/)

MemoryBase gives your AI coding assistants a shared memory and task system. Agents read your project blueprint, update task statuses, record decisions, and coordinate with each other — all through a standardised MCP interface.

---

## Key Features

- **17 MCP tools** — projects, blueprints, tasks, vault — works with Claude Code, Cursor, and any MCP-compatible client
- **Real-time Kanban board** — drag-and-drop tasks, live updates via Server-Sent Events when agents make changes
- **Blueprint editor** — structured project definition with in-place editing (tech stack, folder layout, API specs, constraints)
- **Vault explorer** — searchable, filterable log of decisions, error patterns, and architectural notes
- **Zero-config defaults** — SQLite out of the box; PostgreSQL for production
- **Single Docker image** — frontend and backend ship together

---

## Quick Start (pip)

```bash
pip install memorybase
memorybase --port 8000
```

Open http://localhost:8000 — that's it.

---

## Quick Start (Docker)

```bash
# 1. Run MemoryBase
docker run -p 8000:8000 \
  -v $(pwd)/data:/app/data \
  -e MEMORYBASE_API_KEY=my-secret-key \
  ghcr.io/sabbiramin113008/memorybase:latest

# 2. Open in browser
open http://localhost:8000
```

That's it. SQLite data is persisted in `./data`.

---

## Quick Start (Local Dev)

```bash
# Clone
git clone https://github.com/sabbiramin113008/memorybase.git
cd memorybase

# Start backend (creates venv, installs deps, starts with --reload)
./start-backend.sh

# In a second terminal — start frontend dev server
./start-frontend.sh
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5273
- API Docs: http://localhost:8000/docs

---

## MCP Configuration

Connect any MCP-compatible AI agent to MemoryBase:

### Claude Code / Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "memorybase": {
      "type": "sse",
      "url": "http://localhost:8000/mcp/sse"
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "memorybase": {
      "url": "http://localhost:8000/mcp/sse"
    }
  }
}
```

Your agent can now call tools like `list_projects()`, `get_blueprint()`, `create_task()`, `update_task_status()`, `add_vault_entry()`, and more. See [MCP Tools Reference](https://sabbiramin113008.github.io/memorybase/mcp-tools/).

---

## Screenshots

> _Kanban board screenshot — coming soon_

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI, SQLModel, SQLite / PostgreSQL |
| Real-time | Server-Sent Events (sse-starlette) |
| Agent Protocol | MCP (FastMCP) |
| Frontend | React 18, Vite, Tailwind CSS v3, shadcn/ui |
| State | React Query, Zustand |
| Routing | React Router v6 |
| Drag & Drop | @dnd-kit/core |
| Docs | MkDocs Material |

---

## Project Structure

```
memorybase/
├── backend/          # FastAPI app, SQLModel models, MCP tools, routers
├── frontend/         # React + Vite + Tailwind frontend
├── docs/             # MkDocs documentation source
├── tests/            # pytest smoke tests
├── Dockerfile        # Multi-stage build (node → python)
├── docker-compose.yml
├── start-backend.sh  # Dev convenience script
└── start-frontend.sh # Dev convenience script
```

---

## Contributing

See [CONTRIBUTING](https://sabbiramin113008.github.io/memorybase/contributing/) for dev setup, project structure, and how to add new MCP tools.

---

## License

MIT © sabbiramin113008
