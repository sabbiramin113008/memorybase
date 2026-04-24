import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from backend.auth import verify_api_key
from backend.database import get_session
from backend.models.project import (
    Blueprint,
    BlueprintRead,
    BlueprintUpdate,
    Project,
    ProjectCreate,
    ProjectRead,
    ProjectUpdate,
    Skill,
    SkillCreate,
    SkillRead,
    SkillUpdate,
)
from backend.services.event_bus import event_bus

router = APIRouter(
    prefix="/api/projects",
    tags=["projects"],
    dependencies=[Depends(verify_api_key)],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _project_or_404(project_id: str, session: Session) -> Project:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail={"error": "Project not found"})
    return project


def _blueprint_or_404(project_id: str, session: Session) -> Blueprint:
    bp = session.get(Blueprint, project_id)
    if not bp:
        raise HTTPException(status_code=404, detail={"error": "Blueprint not found"})
    return bp


def _emit(project_id: str, event_type: str, data: dict) -> None:
    """Fire-and-forget: schedule event publish without blocking the response."""
    asyncio.ensure_future(event_bus.publish(project_id, event_type, data))


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

@router.get("", response_model=list[ProjectRead])
def list_projects(session: Session = Depends(get_session)):
    return session.exec(select(Project)).all()


@router.post("", response_model=ProjectRead, status_code=201)
async def create_project(body: ProjectCreate, session: Session = Depends(get_session)):
    project = Project(**body.model_dump())
    session.add(project)
    session.flush()

    blueprint = Blueprint(project_id=project.id)
    session.add(blueprint)
    session.commit()
    session.refresh(project)

    _emit(project.id, "project.created", ProjectRead.model_validate(project).model_dump(mode="json"))
    return project


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: str, session: Session = Depends(get_session)):
    return _project_or_404(project_id, session)


@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    session: Session = Depends(get_session),
):
    project = _project_or_404(project_id, session)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    project.updated_at = datetime.now(timezone.utc)
    session.add(project)
    session.commit()
    session.refresh(project)

    _emit(project_id, "project.updated", ProjectRead.model_validate(project).model_dump(mode="json"))
    return project


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: str, session: Session = Depends(get_session)):
    """Soft delete — sets status to archived."""
    project = _project_or_404(project_id, session)
    project.status = "archived"
    project.updated_at = datetime.now(timezone.utc)
    session.add(project)
    session.commit()

    _emit(project_id, "project.updated", {"id": project_id, "status": "archived"})


# ---------------------------------------------------------------------------
# Blueprint
# ---------------------------------------------------------------------------

@router.get("/{project_id}/blueprint", response_model=BlueprintRead)
def get_blueprint(project_id: str, session: Session = Depends(get_session)):
    _project_or_404(project_id, session)
    bp = _blueprint_or_404(project_id, session)
    return BlueprintRead.from_orm_blueprint(bp)


@router.patch("/{project_id}/blueprint", response_model=BlueprintRead)
async def update_blueprint(
    project_id: str,
    body: BlueprintUpdate,
    session: Session = Depends(get_session),
):
    _project_or_404(project_id, session)
    bp = _blueprint_or_404(project_id, session)

    for field, value in body.model_dump(exclude_unset=True).items():
        if field in ("tech_stack", "external_integrations") and isinstance(value, dict):
            setattr(bp, field, json.dumps(value))
        else:
            setattr(bp, field, value)
    bp.updated_at = datetime.now(timezone.utc)
    session.add(bp)
    session.commit()
    session.refresh(bp)

    bp_read = BlueprintRead.from_orm_blueprint(bp)
    _emit(project_id, "blueprint.updated", bp_read.model_dump(mode="json"))
    return bp_read


# ---------------------------------------------------------------------------
# Skills
# ---------------------------------------------------------------------------

@router.get("/{project_id}/skills", response_model=list[SkillRead])
def list_skills(project_id: str, session: Session = Depends(get_session)):
    _project_or_404(project_id, session)
    skills = session.exec(select(Skill).where(Skill.project_id == project_id)).all()
    return [SkillRead.from_orm_skill(s) for s in skills]


@router.post("/{project_id}/skills", response_model=SkillRead, status_code=201)
def create_skill(
    project_id: str,
    body: SkillCreate,
    session: Session = Depends(get_session),
):
    _project_or_404(project_id, session)
    data = body.model_dump()
    data["libraries"] = json.dumps(data.get("libraries", []))
    skill = Skill(project_id=project_id, **data)
    session.add(skill)
    session.commit()
    session.refresh(skill)
    return SkillRead.from_orm_skill(skill)


@router.patch("/{project_id}/skills/{skill_id}", response_model=SkillRead)
def update_skill(
    project_id: str,
    skill_id: str,
    body: SkillUpdate,
    session: Session = Depends(get_session),
):
    _project_or_404(project_id, session)
    skill = session.get(Skill, skill_id)
    if not skill or skill.project_id != project_id:
        raise HTTPException(status_code=404, detail={"error": "Skill not found"})

    for field, value in body.model_dump(exclude_unset=True).items():
        if field == "libraries" and isinstance(value, list):
            skill.libraries = json.dumps(value)
        else:
            setattr(skill, field, value)
    skill.updated_at = datetime.now(timezone.utc)
    session.add(skill)
    session.commit()
    session.refresh(skill)
    return SkillRead.from_orm_skill(skill)
