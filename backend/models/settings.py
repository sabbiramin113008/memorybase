from typing import Optional
from sqlmodel import SQLModel, Field


class AppSettings(SQLModel, table=True):
    """Single-row table for persisted runtime settings. id is always 1."""
    id: int = Field(default=1, primary_key=True)
    llm_provider: str = Field(default="anthropic")
    llm_model: str = Field(default="claude-sonnet-4-20250514")
    # API key is stored but never returned to the client
    llm_api_key: str = Field(default="")


# ─── API schemas ──────────────────────────────────────────────────────────────

class SettingsRead(SQLModel):
    llm_provider: str
    llm_model: str
    version: str = "0.1.0"


class SettingsPatch(SQLModel):
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    llm_api_key: Optional[str] = None
