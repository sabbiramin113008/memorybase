import json
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlmodel import SQLModel, Field


# ---------------------------------------------------------------------------
# Enum
# ---------------------------------------------------------------------------

class VaultEntryType(str, Enum):
    decision = "decision"
    error_pattern = "error_pattern"
    architectural_note = "architectural_note"
    agent_observation = "agent_observation"


# ---------------------------------------------------------------------------
# VaultEntry table model
# ---------------------------------------------------------------------------

class VaultEntry(SQLModel, table=True):
    __tablename__ = "vaultentry"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    project_id: str = Field(foreign_key="project.id", index=True)
    entry_type: VaultEntryType
    summary: str
    detail: str = Field(default="")
    tags: str = Field(default="[]")   # JSON string — list of strings
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class VaultEntryCreate(SQLModel):
    entry_type: VaultEntryType
    summary: str
    detail: str = ""
    tags: list[str] = []


class VaultEntryRead(SQLModel):
    id: str
    project_id: str
    entry_type: VaultEntryType
    summary: str
    detail: str
    tags: list[str]
    created_at: datetime

    @classmethod
    def from_orm_entry(cls, entry: VaultEntry) -> "VaultEntryRead":
        return cls(
            id=entry.id,
            project_id=entry.project_id,
            entry_type=entry.entry_type,
            summary=entry.summary,
            detail=entry.detail,
            tags=json.loads(entry.tags or "[]"),
            created_at=entry.created_at,
        )
