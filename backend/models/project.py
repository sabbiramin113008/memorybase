import json
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlmodel import SQLModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ProjectStatus(str, Enum):
    active = "active"
    archived = "archived"
    paused = "paused"


class SkillType(str, Enum):
    backend = "backend"
    frontend = "frontend"
    infra = "infra"
    testing = "testing"


# ---------------------------------------------------------------------------
# Project table model
# ---------------------------------------------------------------------------

class Project(SQLModel, table=True):
    __tablename__ = "project"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(index=True)
    description: str = Field(default="")
    domain: str = Field(default="")
    status: ProjectStatus = Field(default=ProjectStatus.active)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Blueprint table model
# ---------------------------------------------------------------------------

class Blueprint(SQLModel, table=True):
    __tablename__ = "blueprint"

    project_id: str = Field(foreign_key="project.id", primary_key=True)
    overview: str = Field(default="")
    tech_stack: str = Field(default="{}")        # JSON string
    folder_structure: str = Field(default="")
    external_integrations: str = Field(default="{}")  # JSON string
    constraints: str = Field(default="")
    api_specs: str = Field(default="")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Skill table model
# ---------------------------------------------------------------------------

class Skill(SQLModel, table=True):
    __tablename__ = "skill"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    project_id: str = Field(foreign_key="project.id", index=True)
    skill_type: SkillType
    framework: str = Field(default="")
    version: str = Field(default="")
    libraries: str = Field(default="[]")   # JSON string
    practices: str = Field(default="")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class ProjectCreate(SQLModel):
    name: str
    description: str = ""
    domain: str = ""
    status: ProjectStatus = ProjectStatus.active


class ProjectRead(SQLModel):
    id: str
    name: str
    description: str
    domain: str
    status: ProjectStatus
    created_at: datetime
    updated_at: datetime


class ProjectUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[str] = None
    status: Optional[ProjectStatus] = None


class BlueprintRead(SQLModel):
    project_id: str
    overview: str
    tech_stack: dict
    folder_structure: str
    external_integrations: dict
    constraints: str
    api_specs: str
    updated_at: datetime

    @classmethod
    def from_orm_blueprint(cls, bp: Blueprint) -> "BlueprintRead":
        return cls(
            project_id=bp.project_id,
            overview=bp.overview,
            tech_stack=json.loads(bp.tech_stack or "{}"),
            folder_structure=bp.folder_structure,
            external_integrations=json.loads(bp.external_integrations or "{}"),
            constraints=bp.constraints,
            api_specs=bp.api_specs,
            updated_at=bp.updated_at,
        )


class BlueprintUpdate(SQLModel):
    overview: Optional[str] = None
    tech_stack: Optional[dict] = None
    folder_structure: Optional[str] = None
    external_integrations: Optional[dict] = None
    constraints: Optional[str] = None
    api_specs: Optional[str] = None


class SkillCreate(SQLModel):
    skill_type: SkillType
    framework: str = ""
    version: str = ""
    libraries: list = []
    practices: str = ""


class SkillRead(SQLModel):
    id: str
    project_id: str
    skill_type: SkillType
    framework: str
    version: str
    libraries: list
    practices: str
    updated_at: datetime

    @classmethod
    def from_orm_skill(cls, sk: Skill) -> "SkillRead":
        return cls(
            id=sk.id,
            project_id=sk.project_id,
            skill_type=sk.skill_type,
            framework=sk.framework,
            version=sk.version,
            libraries=json.loads(sk.libraries or "[]"),
            practices=sk.practices,
            updated_at=sk.updated_at,
        )


class SkillUpdate(SQLModel):
    framework: Optional[str] = None
    version: Optional[str] = None
    libraries: Optional[list] = None
    practices: Optional[str] = None
