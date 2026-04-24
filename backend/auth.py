from fastapi import Header, HTTPException
from fastapi.security import APIKeyHeader

from backend.config import settings

_api_key_header = APIKeyHeader(name="X-AgentDock-Key", auto_error=False)


async def verify_api_key(x_agentdock_key: str = Header(default=None, alias="X-AgentDock-Key")) -> None:
    """FastAPI dependency: validates X-AgentDock-Key header on all /api/* routes."""
    if x_agentdock_key is None:
        raise HTTPException(status_code=401, detail={"error": "Missing API key"})
    if x_agentdock_key != settings.AGENTDOCK_API_KEY:
        raise HTTPException(status_code=401, detail={"error": "Invalid API key"})
