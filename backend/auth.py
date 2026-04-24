from fastapi import Header, HTTPException
from fastapi.security import APIKeyHeader

from backend.config import settings

_api_key_header = APIKeyHeader(name="X-MemoryBase-Key", auto_error=False)


async def verify_api_key(x_memorybase_key: str = Header(default=None, alias="X-MemoryBase-Key")) -> None:
    """FastAPI dependency: validates X-MemoryBase-Key header on all /api/* routes."""
    if x_memorybase_key is None:
        raise HTTPException(status_code=401, detail={"error": "Missing API key"})
    if x_memorybase_key != settings.MEMORYBASE_API_KEY:
        raise HTTPException(status_code=401, detail={"error": "Invalid API key"})
