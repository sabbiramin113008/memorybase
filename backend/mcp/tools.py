"""All MCP tool implementations for MemoryBase.

All tools return a JSON string (str). This ensures FastMCP always wraps the
response in exactly one TextContent item, making client parsing trivial.

Tools reuse the same SQLModel models as the REST API — no DB logic duplicated.
"""

import json
import asyncio
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select

from backend.database import engine
from backend.models.project import (
    Blueprint,
    BlueprintRead,
    Project,
    ProjectCreate,
    ProjectRead,
    Skill,
    SkillRead,
    SkillType,
)
from backend.models.task import Task, TaskRead, TaskStatus
from backend.models.vault import VaultEntry, VaultEntryRead, VaultEntryType
from backend.services.event_bus import event_bus
from backend.mcp.server import mcp


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _session() -> Session:
    return Session(engine)


def _emit(project_id: str, event_type: str, data: dict) -> None:
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(event_bus.publish(project_id, event_type, data))
    except RuntimeError:
        pass


def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _ok(data) -> str:
    return json.dumps(data, default=str)


def _err(msg: str) -> str:
    return json.dumps({"error": msg})


# ---------------------------------------------------------------------------
# Project tools
# ---------------------------------------------------------------------------

@mcp.tool(description="List all MemoryBase projects. Returns id, name, description, domain, status for each project.")
def list_projects() -> str:
    with _session() as session:
        projects = session.exec(select(Project)).all()
        return _ok([ProjectRead.model_validate(p).model_dump(mode="json") for p in projects])


@mcp.tool(description="Get a project by its UUID. Returns full project fields.")
def get_project(project_id: str) -> str:
    with _session() as session:
        project = session.get(Project, project_id)
        if not project:
            return _err(f"Project {project_id} not found")
        return _ok(ProjectRead.model_validate(project).model_dump(mode="json"))


@mcp.tool(description="Create a new project. Auto-creates an empty blueprint. Returns the new ProjectRead object.")
def create_project(name: str, description: str = "", domain: str = "") -> str:
    with _session() as session:
        project = Project(name=name, description=description, domain=domain)
        session.add(project)
        session.flush()
        session.add(Blueprint(project_id=project.id))
        session.commit()
        session.refresh(project)
        result = ProjectRead.model_validate(project).model_dump(mode="json")
    _emit(result["id"], "project.created", result)
    return _ok(result)


@mcp.tool(description=(
    "Get the blueprint for a project. Returns all sections: "
    "overview, tech_stack (dict), folder_structure, constraints, api_specs."
))
def get_blueprint(project_id: str) -> str:
    with _session() as session:
        bp = session.get(Blueprint, project_id)
        if not bp:
            return _err(f"Blueprint for project {project_id} not found")
        return _ok(BlueprintRead.from_orm_blueprint(bp).model_dump(mode="json"))


@mcp.tool(description=(
    "Update one section of a project blueprint. "
    "section must be one of: overview, tech_stack, folder_structure, constraints, api_specs. "
    "content is a plain string (for tech_stack, pass a valid JSON string)."
))
def update_blueprint(project_id: str, section: str, content: str) -> str:
    valid = {"overview", "tech_stack", "folder_structure", "constraints", "api_specs"}
    if section not in valid:
        return _err(f"Invalid section '{section}'. Must be one of: {', '.join(sorted(valid))}")
    with _session() as session:
        bp = session.get(Blueprint, project_id)
        if not bp:
            return _err(f"Blueprint for project {project_id} not found")
        if section == "tech_stack":
            try:
                json.loads(content)
            except json.JSONDecodeError:
                return _err("tech_stack content must be valid JSON")
            bp.tech_stack = content
        else:
            setattr(bp, section, content)
        bp.updated_at = datetime.now(timezone.utc)
        session.add(bp)
        session.commit()
        session.refresh(bp)
        result = BlueprintRead.from_orm_blueprint(bp).model_dump(mode="json")
    _emit(project_id, "blueprint.updated", result)
    return _ok(result)


@mcp.tool(description="Get all skill profiles for a project (backend, frontend, infra, testing).")
def get_skills(project_id: str) -> str:
    with _session() as session:
        skills = session.exec(select(Skill).where(Skill.project_id == project_id)).all()
        return _ok([SkillRead.from_orm_skill(s).model_dump(mode="json") for s in skills])


@mcp.tool(description=(
    "Upsert (create or update) a skill profile for a project. "
    "skill_type: backend | frontend | infra | testing. "
    "libraries: JSON array string e.g. '[{\"name\":\"fastapi\",\"version\":\"0.111\"}]'."
))
def update_skill(
    project_id: str,
    skill_type: str,
    framework: str = "",
    version: str = "",
    libraries: str = "[]",
    practices: str = "",
) -> str:
    try:
        SkillType(skill_type)
    except ValueError:
        return _err(f"Invalid skill_type '{skill_type}'. Must be: backend, frontend, infra, testing")
    with _session() as session:
        existing = session.exec(
            select(Skill)
            .where(Skill.project_id == project_id)
            .where(Skill.skill_type == skill_type)
        ).first()
        if existing:
            existing.framework = framework
            existing.version = version
            existing.libraries = libraries
            existing.practices = practices
            existing.updated_at = datetime.now(timezone.utc)
            session.add(existing)
            session.commit()
            session.refresh(existing)
            return _ok(SkillRead.from_orm_skill(existing).model_dump(mode="json"))
        else:
            skill = Skill(
                project_id=project_id,
                skill_type=skill_type,
                framework=framework,
                version=version,
                libraries=libraries,
                practices=practices,
            )
            session.add(skill)
            session.commit()
            session.refresh(skill)
            return _ok(SkillRead.from_orm_skill(skill).model_dump(mode="json"))


# ---------------------------------------------------------------------------
# Task tools
# ---------------------------------------------------------------------------

@mcp.tool(description=(
    "List tasks for a project. Optionally filter by status "
    "(todo | in_progress | blocked | done | tested) and/or phase (e.g. 'Phase 1'). "
    "Returns all tasks if no filters provided."
))
def list_tasks(project_id: str, status: Optional[str] = None, phase: Optional[str] = None) -> str:
    with _session() as session:
        stmt = select(Task).where(Task.project_id == project_id)
        if status:
            stmt = stmt.where(Task.status == status)
        if phase:
            stmt = stmt.where(Task.phase == phase)
        tasks = session.exec(stmt).all()
        return _ok([TaskRead.model_validate(t).model_dump(mode="json") for t in tasks])


@mcp.tool(description="Get a single task by ID. Returns full task including agent_notes and blocked_reason.")
def get_task(project_id: str, task_id: str) -> str:
    with _session() as session:
        task = session.get(Task, task_id)
        if not task or task.project_id != project_id:
            return _err(f"Task {task_id} not found in project {project_id}")
        return _ok(TaskRead.model_validate(task).model_dump(mode="json"))


@mcp.tool(description=(
    "Create a new task in a project with status=todo. "
    "phase should follow project conventions e.g. 'Phase 1: Foundation'."
))
def create_task(
    project_id: str,
    title: str,
    phase: str = "",
    description: str = "",
    acceptance_criteria: Optional[str] = None,
) -> str:
    with _session() as session:
        task = Task(
            project_id=project_id,
            title=title,
            phase=phase,
            description=description,
            acceptance_criteria=acceptance_criteria,
        )
        session.add(task)
        session.commit()
        session.refresh(task)
        result = TaskRead.model_validate(task).model_dump(mode="json")
    _emit(project_id, "task.created", result)
    return _ok(result)


@mcp.tool(description=(
    "Update a task status and optionally append a timestamped note to agent_notes. "
    "status: todo | in_progress | blocked | done | tested. "
    "Notes are always appended — existing notes are never overwritten. "
    "Set blocked_reason when status=blocked."
))
def update_task_status(
    project_id: str,
    task_id: str,
    status: str,
    notes: Optional[str] = None,
    blocked_reason: Optional[str] = None,
) -> str:
    try:
        TaskStatus(status)
    except ValueError:
        return _err(f"Invalid status '{status}'. Must be: todo, in_progress, blocked, done, tested")
    with _session() as session:
        task = session.get(Task, task_id)
        if not task or task.project_id != project_id:
            return _err(f"Task {task_id} not found in project {project_id}")
        task.status = status
        if notes:
            line = f"[{_ts()}] {notes}"
            task.agent_notes = f"{task.agent_notes}\n{line}" if task.agent_notes else line
        if blocked_reason is not None:
            task.blocked_reason = blocked_reason
        task.updated_at = datetime.now(timezone.utc)
        session.add(task)
        session.commit()
        session.refresh(task)
        result = TaskRead.model_validate(task).model_dump(mode="json")
    _emit(project_id, "task.updated", result)
    return _ok(result)


@mcp.tool(description=(
    "Append a timestamped note to a task's agent_notes. "
    "Each call appends a new line — notes are never overwritten."
))
def add_task_note(project_id: str, task_id: str, note: str) -> str:
    with _session() as session:
        task = session.get(Task, task_id)
        if not task or task.project_id != project_id:
            return _err(f"Task {task_id} not found in project {project_id}")
        line = f"[{_ts()}] {note}"
        task.agent_notes = f"{task.agent_notes}\n{line}" if task.agent_notes else line
        task.updated_at = datetime.now(timezone.utc)
        session.add(task)
        session.commit()
        session.refresh(task)
        result = TaskRead.model_validate(task).model_dump(mode="json")
    _emit(project_id, "task.updated", result)
    return _ok(result)


# ---------------------------------------------------------------------------
# Vault tools
# ---------------------------------------------------------------------------

def _vault_entry(project_id: str, entry_type: str, summary: str, detail: str, tags: str) -> str:
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    with _session() as session:
        entry = VaultEntry(
            project_id=project_id,
            entry_type=entry_type,
            summary=summary,
            detail=detail,
            tags=json.dumps(tag_list),
        )
        session.add(entry)
        session.commit()
        session.refresh(entry)
        result = VaultEntryRead.from_orm_entry(entry).model_dump(mode="json")
    _emit(project_id, "vault.entry_added", result)
    return _ok(result)


@mcp.tool(description=(
    "Log an architectural or workflow decision to the project vault. "
    "tags: comma-separated string e.g. 'auth,database,performance'."
))
def log_decision(project_id: str, summary: str, detail: str = "", tags: str = "") -> str:
    return _vault_entry(project_id, VaultEntryType.decision, summary, detail, tags)


@mcp.tool(description=(
    "Log a known error pattern or bug to the vault so future agents avoid repeating it. "
    "tags: comma-separated string."
))
def log_error_pattern(project_id: str, summary: str, detail: str = "", tags: str = "") -> str:
    return _vault_entry(project_id, VaultEntryType.error_pattern, summary, detail, tags)


@mcp.tool(description=(
    "Log a general vault entry. entry_type: decision | error_pattern | architectural_note | agent_observation. "
    "tags: comma-separated string."
))
def log_note(project_id: str, entry_type: str, summary: str, detail: str = "", tags: str = "") -> str:
    try:
        VaultEntryType(entry_type)
    except ValueError:
        return _err(
            f"Invalid entry_type '{entry_type}'. "
            "Must be: decision, error_pattern, architectural_note, agent_observation"
        )
    return _vault_entry(project_id, entry_type, summary, detail, tags)


@mcp.tool(description=(
    "Get recent vault entries for a project, sorted newest first. "
    "entry_type filters by type. limit defaults to 20, max 100."
))
def get_vault(
    project_id: str,
    entry_type: Optional[str] = None,
    limit: int = 20,
) -> str:
    limit = min(max(1, limit), 100)
    with _session() as session:
        stmt = (
            select(VaultEntry)
            .where(VaultEntry.project_id == project_id)
            .order_by(VaultEntry.created_at.desc())
            .limit(limit)
        )
        if entry_type:
            stmt = stmt.where(VaultEntry.entry_type == entry_type)
        entries = session.exec(stmt).all()
        return _ok([VaultEntryRead.from_orm_entry(e).model_dump(mode="json") for e in entries])


@mcp.tool(description=(
    "Full-text search of the vault for a project. "
    "Searches across summary, detail, and tags. Results sorted newest first."
))
def search_vault(project_id: str, query: str) -> str:
    like = f"%{query}%"
    with _session() as session:
        stmt = (
            select(VaultEntry)
            .where(VaultEntry.project_id == project_id)
            .where(
                (VaultEntry.summary.like(like))
                | (VaultEntry.detail.like(like))
                | (VaultEntry.tags.like(like))
            )
            .order_by(VaultEntry.created_at.desc())
        )
        entries = session.exec(stmt).all()
        return _ok([VaultEntryRead.from_orm_entry(e).model_dump(mode="json") for e in entries])
