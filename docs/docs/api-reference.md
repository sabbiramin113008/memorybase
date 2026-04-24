# API Reference

MemoryBase exposes a REST API at `/api/*`. Interactive documentation (Swagger UI) is available at:

```
http://localhost:8000/docs
```

ReDoc alternative:

```
http://localhost:8000/redoc
```

---

## Authentication

All `/api/*` endpoints require the `X-MemoryBase-Key` header:

```bash
curl http://localhost:8000/api/projects \
  -H "X-MemoryBase-Key: your-api-key"
```

Returns `401` if the header is missing or incorrect.

---

## Endpoint Groups

### Projects

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create a project |
| `GET` | `/api/projects/{id}` | Get a project |
| `PATCH` | `/api/projects/{id}` | Update a project |
| `DELETE` | `/api/projects/{id}` | Delete a project |
| `GET` | `/api/projects/{id}/blueprint` | Get blueprint |
| `PATCH` | `/api/projects/{id}/blueprint` | Update blueprint |
| `GET` | `/api/projects/{id}/skills` | List skills |
| `POST` | `/api/projects/{id}/skills` | Create skill |
| `PATCH` | `/api/projects/{id}/skills/{skill_id}` | Update skill |

### Tasks

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/projects/{id}/tasks` | List tasks (filterable by status, phase) |
| `POST` | `/api/projects/{id}/tasks` | Create task |
| `GET` | `/api/projects/{id}/tasks/{task_id}` | Get task |
| `PATCH` | `/api/projects/{id}/tasks/{task_id}` | Update task |
| `PATCH` | `/api/projects/{id}/tasks/{task_id}/status` | Update task status + append note |
| `DELETE` | `/api/projects/{id}/tasks/{task_id}` | Delete task |

### Vault

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/projects/{id}/vault` | List entries (filterable by type, tags) |
| `POST` | `/api/projects/{id}/vault` | Create entry |
| `GET` | `/api/projects/{id}/vault/{entry_id}` | Get entry |
| `GET` | `/api/projects/{id}/vault/search?q=` | Full-text search |
| `DELETE` | `/api/projects/{id}/vault/{entry_id}` | Delete entry |

### Settings

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/settings` | Get current LLM settings (no secrets returned) |
| `PATCH` | `/api/settings` | Update LLM provider / model / API key |

### Real-time Events

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/events/{project_id}` | SSE stream for a project |

### Meta

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check — returns `{"status": "ok", "version": "0.1.0"}` |

---

## Common Response Shapes

### Project

```json
{
  "id": "uuid",
  "name": "My Project",
  "description": "...",
  "domain": "developer-tools",
  "status": "active",
  "created_at": "2026-04-22T10:00:00Z",
  "updated_at": "2026-04-22T10:00:00Z"
}
```

### Task

```json
{
  "id": "uuid",
  "project_id": "uuid",
  "title": "Implement auth",
  "description": "...",
  "phase": "Phase 1",
  "milestone": "MVP",
  "status": "in_progress",
  "acceptance_criteria": "...",
  "agent_notes": "[2026-04-22] Started.\n",
  "blocked_reason": null,
  "created_at": "...",
  "updated_at": "..."
}
```

### Vault Entry

```json
{
  "id": "uuid",
  "project_id": "uuid",
  "entry_type": "decision",
  "summary": "Use SQLite for development",
  "detail": "Chosen for zero-config local dev. PostgreSQL for prod.",
  "tags": ["database", "architecture"],
  "created_at": "..."
}
```

### SSE Event

```json
{
  "event": "task.updated",
  "project_id": "uuid",
  "data": { "task_id": "uuid", "new_status": "done" },
  "timestamp": "2026-04-22T10:00:00Z"
}
```
