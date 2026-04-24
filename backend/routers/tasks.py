import asyncio
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from backend.auth import verify_api_key
from backend.database import get_session
from backend.models.project import Project
from backend.models.task import Task, TaskCreate, TaskRead, TaskStatusUpdate, TaskUpdate
from backend.services.event_bus import event_bus

router = APIRouter(
    prefix="/api/projects",
    tags=["tasks"],
    dependencies=[Depends(verify_api_key)],
)


def _project_or_404(project_id: str, session: Session) -> Project:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail={"error": "Project not found"})
    return project


def _task_or_404(task_id: str, project_id: str, session: Session) -> Task:
    task = session.get(Task, task_id)
    if not task or task.project_id != project_id:
        raise HTTPException(status_code=404, detail={"error": "Task not found"})
    return task


def _emit(project_id: str, event_type: str, data: dict) -> None:
    asyncio.ensure_future(event_bus.publish(project_id, event_type, data))


@router.get("/{project_id}/tasks", response_model=list[TaskRead])
def list_tasks(
    project_id: str,
    status: Optional[str] = Query(default=None),
    phase: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
):
    _project_or_404(project_id, session)
    stmt = select(Task).where(Task.project_id == project_id)
    if status:
        stmt = stmt.where(Task.status == status)
    if phase:
        stmt = stmt.where(Task.phase == phase)
    return session.exec(stmt).all()


@router.post("/{project_id}/tasks", response_model=TaskRead, status_code=201)
async def create_task(
    project_id: str,
    body: TaskCreate,
    session: Session = Depends(get_session),
):
    _project_or_404(project_id, session)
    task = Task(project_id=project_id, **body.model_dump())
    session.add(task)
    session.commit()
    session.refresh(task)

    _emit(project_id, "task.created", TaskRead.model_validate(task).model_dump(mode="json"))
    return task


@router.get("/{project_id}/tasks/{task_id}", response_model=TaskRead)
def get_task(
    project_id: str,
    task_id: str,
    session: Session = Depends(get_session),
):
    _project_or_404(project_id, session)
    return _task_or_404(task_id, project_id, session)


@router.patch("/{project_id}/tasks/{task_id}", response_model=TaskRead)
async def update_task(
    project_id: str,
    task_id: str,
    body: TaskUpdate,
    session: Session = Depends(get_session),
):
    _project_or_404(project_id, session)
    task = _task_or_404(task_id, project_id, session)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    task.updated_at = datetime.now(timezone.utc)
    session.add(task)
    session.commit()
    session.refresh(task)

    _emit(project_id, "task.updated", TaskRead.model_validate(task).model_dump(mode="json"))
    return task


@router.patch("/{project_id}/tasks/{task_id}/status", response_model=TaskRead)
async def update_task_status(
    project_id: str,
    task_id: str,
    body: TaskStatusUpdate,
    session: Session = Depends(get_session),
):
    _project_or_404(project_id, session)
    task = _task_or_404(task_id, project_id, session)
    task.status = body.status

    if body.notes:
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        new_note = f"[{timestamp}] {body.notes}"
        task.agent_notes = (
            f"{task.agent_notes}\n{new_note}" if task.agent_notes else new_note
        )

    if body.blocked_reason is not None:
        task.blocked_reason = body.blocked_reason

    task.updated_at = datetime.now(timezone.utc)
    session.add(task)
    session.commit()
    session.refresh(task)

    _emit(project_id, "task.updated", TaskRead.model_validate(task).model_dump(mode="json"))
    return task


@router.delete("/{project_id}/tasks/{task_id}", status_code=204)
async def delete_task(
    project_id: str,
    task_id: str,
    session: Session = Depends(get_session),
):
    _project_or_404(project_id, session)
    task = _task_or_404(task_id, project_id, session)
    task_id_copy = task.id
    session.delete(task)
    session.commit()

    _emit(project_id, "task.deleted", {"id": task_id_copy, "project_id": project_id})
