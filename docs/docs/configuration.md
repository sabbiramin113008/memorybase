# Configuration

MemoryBase is configured entirely through environment variables. All variables can also be placed in a `.env` file in the project root — `pydantic-settings` reads it automatically.

---

## Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DATABASE_URL` | `str` | `sqlite:///./memorybase.db` | SQLAlchemy database URL. Use `postgresql://user:pass@host/db` for production. |
| `MEMORYBASE_API_KEY` | `str` | `dev-key-change-in-production` | Secret key sent in `X-MemoryBase-Key` header. **Must be changed in production.** |
| `HOST` | `str` | `0.0.0.0` | Host to bind the uvicorn server to. |
| `PORT` | `int` | `8000` | Port to listen on. |
| `CORS_ORIGINS` | `list[str]` | `["http://localhost:5173", "http://localhost:3000"]` | Allowed CORS origins. |
| `STATIC_DIR` | `str` | `../frontend/dist` | Path to the frontend build output. Served at `/` when the directory exists. |
| `MEMORYBASE_LLM_PROVIDER` | `str` | `anthropic` | Default LLM provider (for future LLM features). |
| `MEMORYBASE_LLM_MODEL` | `str` | `claude-sonnet-4-20250514` | Default LLM model. |
| `MEMORYBASE_LLM_API_KEY` | `str` | `""` | API key for the LLM provider. |

---

## Example `.env` File

```dotenv
# Database
DATABASE_URL=sqlite:///./memorybase.db

# Security — change this before deploying!
MEMORYBASE_API_KEY=my-strong-secret-key

# Network
HOST=0.0.0.0
PORT=8000

# CORS — add your frontend URL
CORS_ORIGINS=["http://localhost:5273", "https://yourdomain.com"]

# LLM (optional)
MEMORYBASE_LLM_PROVIDER=anthropic
MEMORYBASE_LLM_MODEL=claude-sonnet-4-20250514
MEMORYBASE_LLM_API_KEY=sk-ant-...
```

---

## PostgreSQL Setup

To switch from SQLite to PostgreSQL, install the driver and set the URL:

```bash
pip install psycopg2-binary
```

```dotenv
DATABASE_URL=postgresql://memorybase:password@localhost:5432/memorybase
```

MemoryBase uses SQLModel (SQLAlchemy under the hood) and works with any SQLAlchemy-compatible database.

---

## Runtime Settings

LLM provider and model can also be changed at runtime via `PATCH /api/settings`. These settings are persisted to the database and take precedence over environment variables after the first save.

| Field | Description |
|-------|-------------|
| `llm_provider` | Provider name (e.g. `anthropic`, `openai`) |
| `llm_model` | Model identifier |
| `llm_api_key` | API key — accepted but **never returned** in API responses |
