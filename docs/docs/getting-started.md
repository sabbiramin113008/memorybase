# Getting Started

## Prerequisites

- Python 3.11+
- Node.js 18+
- Git

---

## Option A — pip (simplest)

```bash
pip install memorybase
memorybase --port 8000
```

Open [http://localhost:8000](http://localhost:8000). SQLite database is created in the current directory automatically.

Set a secure API key before exposing to a network:

```bash
MEMORYBASE_API_KEY=my-secret memorybase --port 8000
```

---

## Option B — Docker

```bash
# 1. Pull the image
docker pull ghcr.io/sabbiramin113008/memorybase:latest

# 2. Create a data directory for SQLite persistence
mkdir -p memorybase_data

# 3. Run
docker run -p 8000:8000 \
  -v $(pwd)/memorybase_data:/app/data \
  -e MEMORYBASE_API_KEY=change-me \
  ghcr.io/sabbiramin113008/memorybase:latest
```

Open [http://localhost:8000](http://localhost:8000).

---

## Option C — Local Development

### 1. Clone the repo

```bash
git clone https://github.com/sabbiramin113008/memorybase.git
cd memorybase
```

### 2. Start the backend

```bash
./start-backend.sh
```

This script:

- Creates and activates a Python virtual environment at `./venv`
- Installs all dependencies from `backend/requirements.txt`
- Starts the FastAPI server with `--reload` on **http://localhost:8000**

### 3. Start the frontend

In a second terminal:

```bash
./start-frontend.sh
```

This script:

- Installs npm dependencies if `node_modules` is missing
- Starts the Vite dev server on **http://localhost:5273**

The frontend proxies all `/api`, `/events`, and `/mcp` requests to the backend automatically.

---

## First Project Walkthrough

### 1. Open the UI

Navigate to [http://localhost:5273](http://localhost:5273) (dev) or [http://localhost:8000](http://localhost:8000) (Docker).

### 2. Create a project

Click **New Project**, fill in a name, domain, and description, then click **Create Project**.

### 3. Define a blueprint

Click **Blueprint** in the sidebar. Hover over any section and click **Edit** to fill in your tech stack, folder structure, and constraints.

### 4. Add tasks

Click **Kanban Board**. Use the **Add Task** button (or the `+` link at the bottom of any column) to create tasks. Drag cards between columns to update status.

### 5. Connect an AI agent

Go to **Settings** and copy the MCP config for your tool:

=== "Claude Code"

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

=== "Cursor"

    ```json
    {
      "mcpServers": {
        "memorybase": {
          "url": "http://localhost:8000/mcp/sse"
        }
      }
    }
    ```

Once connected, your agent can call tools like `list_projects()`, `get_blueprint()`, `update_task_status()`, and more.

See [MCP Tools](mcp-tools.md) for the full reference.

---

## Environment Variables

See [Configuration](configuration.md) for all available settings.

The most important ones to set before going to production:

```bash
MEMORYBASE_API_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:pass@host:5432/memorybase
```
