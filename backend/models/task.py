import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlmodel import SQLModel, Field


# ---------------------------------------------------------------------------
# Enum
# ---------------------------------------------------------------------------

class TaskStatus(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    blocked = "blocked"
    done = "done"
    tested = "tested"


# ---------------------------------------------------------------------------
# Task table model
# ---------------------------------------------------------------------------

class Task(SQLModel, table=True):
    __tablename__ = "task"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    project_id: str = Field(foreign_key="project.id", index=True)
    title: str
    description: str = Field(default="")
    phase: str = Field(default="")
    milestone: str = Field(default="")
    status: TaskStatus = Field(default=TaskStatus.todo)
    acceptance_criteria: Optional[str] = Field(default=None)
    agent_notes: Optional[str] = Field(default=None)
    blocked_reason: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class TaskCreate(SQLModel):
    title: str
    description: str = ""
    phase: str = ""
    milestone: str = ""
    status: TaskStatus = TaskStatus.todo
    acceptance_criteria: Optional[str] = None
    agent_notes: Optional[str] = None


class TaskRead(SQLModel):
    id: str
    project_id: str
    title: str
    description: str
    phase: str
    milestone: str
    status: TaskStatus
    acceptance_criteria: Optional[str]
    agent_notes: Optional[str]
    blocked_reason: Optional[str]
    created_at: datetime
    updated_at: datetime


class TaskUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    phase: Optional[str] = None
    milestone: Optional[str] = None
    status: Optional[TaskStatus] = None
    acceptance_criteria: Optional[str] = None
    agent_notes: Optional[str] = None
    blocked_reason: Optional[str] = None


class TaskStatusUpdate(SQLModel):
    status: TaskStatus
    notes: Optional[str] = None
    blocked_reason: Optional[str] = None
