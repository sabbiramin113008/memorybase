import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.config import settings

# Import all models here so SQLModel.metadata has them registered before
# create_db_and_tables() is called in the lifespan.
import backend.models.project  # noqa: F401
import backend.models.task  # noqa: F401
import backend.models.vault  # noqa: F401
import backend.models.settings  # noqa: F401

from backend.database import create_db_and_tables
from backend.routers import projects as projects_router
from backend.routers import tasks as tasks_router
from backend.routers import vault as vault_router
from backend.routers import events as events_router
from backend.routers import settings as settings_router

# Import tools module to register all @mcp.tool decorators, then grab the mcp instance
import backend.mcp.tools  # noqa: F401
from backend.mcp.server import mcp as mcp_server


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(
    title="AgentDock",
    version="0.1.0",
    description="The project operating system for AI agents.",
    lifespan=lifespan,
    openapi_tags=[
        {"name": "meta", "description": "Health and status endpoints"},
        {"name": "projects", "description": "Project, blueprint, and skill management"},
        {"name": "tasks", "description": "Task CRUD and status tracking"},
        {"name": "vault", "description": "Context vault entries"},
        {"name": "events", "description": "SSE event stream per project"},
        {"name": "mcp", "description": "MCP SSE endpoint for agent tool access"},
        {"name": "settings", "description": "Runtime configuration (LLM provider, model)"},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(projects_router.router)
app.include_router(tasks_router.router)
app.include_router(vault_router.router)
app.include_router(events_router.router)
app.include_router(settings_router.router)

# Mount MCP SSE server at /mcp — no auth here; agents configure key in MCP headers
app.mount("/mcp", mcp_server.sse_app())


@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok", "version": "0.1.0"}


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(status_code=404, content={"error": "Not found"})


# Serve frontend static files when the dist directory exists.
# This mount must come LAST so API routes take precedence.
static_dir = settings.STATIC_DIR
if os.path.isdir(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")


def cli():
    """Entry point for the `agentdock` CLI command."""
    import uvicorn
    import argparse

    parser = argparse.ArgumentParser(description="MemoryBase server")
    parser.add_argument("--host", default=settings.HOST, help="Bind host (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=settings.PORT, help="Bind port (default: 8000)")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload (dev mode)")
    args = parser.parse_args()

    uvicorn.run("backend.main:app", host=args.host, port=args.port, reload=args.reload)
