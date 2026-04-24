# MemoryBase

**The project operating system for AI agents.**

MemoryBase gives your AI coding assistants a shared memory and task system. Agents can read your project blueprint, update task statuses, record decisions, and coordinate with each other — all through a standardised MCP interface.

---

## Why MemoryBase?

Modern AI coding workflows break down as soon as you have more than one agent, more than one session, or more than a few days of work. Context gets lost, tasks get duplicated, decisions go undocumented.

MemoryBase solves this with three primitives:

| Primitive | What it does |
|-----------|-------------|
| **Blueprint** | Structured project definition — tech stack, folder layout, constraints, API specs |
| **Tasks** | Kanban-style task tracker with phase/milestone grouping and real-time SSE updates |
| **Vault** | Searchable log of decisions, error patterns, and architectural notes |

All three are accessible to any AI agent via **MCP tools**, and to humans via a **React web UI**.

---

## Key Features

- **17 MCP tools** covering projects, tasks, and vault — works with Claude Code, Cursor, and any MCP-compatible client
- **Real-time updates** via Server-Sent Events — the UI reflects agent changes instantly
- **Kanban board** with drag-and-drop, phase filtering, and SSE live sync
- **Blueprint editor** with in-place editing and structured JSON views
- **Vault explorer** with full-text search and tag filtering
- **Zero config** defaults — SQLite out of the box, PostgreSQL for production
- **Single Docker image** — ships frontend and backend together

---

## Quick Start

=== "pip (fastest)"

    ```bash
    pip install memorybase
    memorybase --port 8000
    ```

    Open [http://localhost:8000](http://localhost:8000) — done.

=== "Docker"

    ```bash
    docker run -p 8000:8000 \
      -e MEMORYBASE_API_KEY=my-secret \
      ghcr.io/sabbiramin113008/memorybase:latest
    ```

=== "Local dev"

    ```bash
    git clone https://github.com/sabbiramin113008/memorybase.git
    cd memorybase
    ./start-backend.sh   # terminal 1
    ./start-frontend.sh  # terminal 2
    ```

For full setup instructions, see [Getting Started](getting-started.md).

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                MemoryBase                     │
│                                             │
│  ┌──────────┐   ┌──────────┐   ┌─────────┐ │
│  │  React   │   │ FastAPI  │   │   MCP   │ │
│  │   UI     │◄──│ REST API │◄──│  Tools  │ │
│  └──────────┘   └────┬─────┘   └─────────┘ │
│                      │                      │
│               ┌──────▼──────┐               │
│               │   SQLite /  │               │
│               │  PostgreSQL │               │
│               └─────────────┘               │
└─────────────────────────────────────────────┘
         ▲                      ▲
    Human browser          AI agent (MCP)
```
