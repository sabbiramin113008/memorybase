# Contributing

Thank you for your interest in contributing to AgentDock!

---

## Development Setup

### 1. Fork and clone

```bash
git clone https://github.com/sabbiramin113008/memorybase.git
cd agentdock
```

### 2. Backend

```bash
# Create venv
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install deps
pip install -r backend/requirements.txt

# Start with reload
uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev  # starts at http://localhost:5273
```

---

## Project Structure

```
agentdock/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # pydantic-settings configuration
│   ├── database.py          # SQLModel engine + session dependency
│   ├── auth.py              # API key verification dependency
│   ├── models/              # SQLModel table definitions + Pydantic schemas
│   │   ├── project.py       # Project, Blueprint, Skill
│   │   ├── task.py          # Task
│   │   ├── vault.py         # VaultEntry
│   │   └── settings.py      # AppSettings (persisted runtime config)
│   ├── routers/             # FastAPI routers (one per resource)
│   │   ├── projects.py
│   │   ├── tasks.py
│   │   ├── vault.py
│   │   ├── events.py        # SSE endpoint
│   │   └── settings.py
│   ├── services/
│   │   └── event_bus.py     # In-process pub/sub for SSE
│   └── mcp/
│       ├── server.py        # FastMCP instance
│       └── tools.py         # All 17 MCP tool definitions
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Root component, router, layout
│   │   ├── lib/
│   │   │   ├── api.ts       # Typed API client
│   │   │   └── utils.ts     # cn() helper
│   │   ├── hooks/
│   │   │   └── useSSE.ts    # EventSource hook with reconnect
│   │   ├── components/ui/   # shadcn/ui components
│   │   └── pages/           # Route-level page components
│   └── vite.config.ts
├── docs/
│   └── docs/                # MkDocs source pages
├── mkdocs.yml
├── start-backend.sh
└── start-frontend.sh
```

---

## Adding a New MCP Tool

1. Open `backend/mcp/tools.py`
2. Define a new function decorated with `@mcp.tool()`
3. The function must return a JSON string (`str`) — use `json.dumps()`
4. Call `_emit(project_id, "event.type", {...})` if the tool mutates data
5. Add an entry to `docs/docs/mcp-tools.md`

Example:

```python
@mcp.tool()
def my_new_tool(project_id: str, value: str) -> str:
    """Description shown to the agent."""
    with Session(engine) as session:
        # ... do work ...
        _emit(project_id, "my.event", {"value": value})
        return json.dumps({"ok": True})
```

---

## Code Style

- **Backend:** PEP 8. Type hints everywhere. No bare `except`.
- **Frontend:** TypeScript strict mode. No `any`. Prefer named exports.
- **Commits:** Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`).

---

## Running Tests

```bash
# Backend
source venv/bin/activate
pytest

# Frontend (type check + build)
cd frontend && npm run build
```

---

## Submitting a Pull Request

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes
3. Ensure `npm run build` and `pytest` pass
4. Open a PR against `main` with a clear description of the change
