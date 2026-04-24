# MCP Tools Reference

MemoryBase exposes all project operations as MCP tools over SSE transport. Any MCP-compliant client (Claude Code, Cursor, Windsurf) can connect and use these tools.

## Connection Details

- **MCP SSE Endpoint:** `http://localhost:8000/mcp/sse`
- **Auth:** API key sent as `X-MemoryBase-Key` header in MCP config (not required on the SSE endpoint itself)

---

## Client Configuration

### Claude Code (`~/.claude/mcp.json`)

```json
{
  "mcpServers": {
    "memorybase": {
      "type": "sse",
      "url": "http://localhost:8000/mcp/sse",
      "headers": {
        "X-MemoryBase-Key": "your-api-key-here"
      }
    }
  }
}
```

### Cursor (MCP Settings)

```json
{
  "mcp": {
    "servers": {
      "memorybase": {
        "transport": "sse",
        "url": "http://localhost:8000/mcp/sse"
      }
    }
  }
}
```

---

## Tool Reference

### Project Tools

#### `list_projects()`
List all projects. Returns id, name, description, domain, status for each.

#### `get_project(project_id)`
Get a project by UUID. Returns full project fields.

#### `create_project(name, description?, domain?)`
Create a new project. Auto-creates an empty blueprint. Returns the new project.

#### `get_blueprint(project_id)`
Get all blueprint sections: overview, tech_stack, folder_structure, constraints, api_specs.

#### `update_blueprint(project_id, section, content)`
Update one blueprint section. `section` must be one of:
`overview` | `tech_stack` | `folder_structure` | `constraints` | `api_specs`

For `tech_stack`, pass a valid JSON string.

#### `get_skills(project_id)`
Get all skill profiles (backend, frontend, infra, testing).

#### `update_skill(project_id, skill_type, framework?, version?, libraries?, practices?)`
Upsert a skill profile. `skill_type`: `backend` | `frontend` | `infra` | `testing`.
`libraries` is a JSON array string.

---

### Task Tools

#### `list_tasks(project_id, status?, phase?)`
List tasks, optionally filtered. `status`: `todo` | `in_progress` | `blocked` | `done` | `tested`.

#### `get_task(project_id, task_id)`
Get a single task including `agent_notes` and `blocked_reason`.

#### `create_task(project_id, title, phase?, description?, acceptance_criteria?)`
Create a new task with `status=todo`.

#### `update_task_status(project_id, task_id, status, notes?, blocked_reason?)`
Update task status. Notes are appended (never overwritten) with ISO timestamp prefix.
`status`: `todo` | `in_progress` | `blocked` | `done` | `tested`

#### `add_task_note(project_id, task_id, note)`
Append a timestamped note to `agent_notes`. Never overwrites existing notes.

---

### Vault Tools

#### `log_decision(project_id, summary, detail?, tags?)`
Log a decision. `tags` is comma-separated: `"auth,database"`.

#### `log_error_pattern(project_id, summary, detail?, tags?)`
Log a known error pattern to prevent future agents from repeating it.

#### `log_note(project_id, entry_type, summary, detail?, tags?)`
General vault entry. `entry_type`: `decision` | `error_pattern` | `architectural_note` | `agent_observation`.

#### `get_vault(project_id, entry_type?, limit?)`
Get recent vault entries. `limit` defaults to 20, max 100.

#### `search_vault(project_id, query)`
Full-text search across summary, detail, and tags. Returns newest first.

---

## Typical Agent Session Flow

```
1. list_projects()                          → find your project_id
2. get_blueprint(project_id)                → load project context
3. get_vault(project_id)                    → load decisions + error patterns
4. list_tasks(project_id, status="todo")    → find next task
5. update_task_status(project_id, task_id, "in_progress", notes="Starting...")
6. ... do work ...
7. update_task_status(project_id, task_id, "done", notes="Completed X, Y, Z")
8. log_decision(project_id, summary, detail, tags)
```
