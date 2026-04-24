import asyncio
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from backend.auth import verify_api_key
from backend.database import get_session
from backend.models.project import Project
from backend.models.vault import VaultEntry, VaultEntryCreate, VaultEntryRead
from backend.services.event_bus import event_bus

router = APIRouter(
    prefix="/api/projects",
    tags=["vault"],
    dependencies=[Depends(verify_api_key)],
)


def _project_or_404(project_id: str, session: Session) -> Project:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail={"error": "Project not found"})
    return project


def _entry_or_404(entry_id: str, project_id: str, session: Session) -> VaultEntry:
    entry = session.get(VaultEntry, entry_id)
    if not entry or entry.project_id != project_id:
        raise HTTPException(status_code=404, detail={"error": "Vault entry not found"})
    return entry


def _emit(project_id: str, event_type: str, data: dict) -> None:
    asyncio.ensure_future(event_bus.publish(project_id, event_type, data))


@router.get("/{project_id}/vault", response_model=list[VaultEntryRead])
def list_vault_entries(
    project_id: str,
    type: Optional[str] = Query(default=None),
    tags: Optional[str] = Query(default=None, description="Comma-separated list of tags"),
    session: Session = Depends(get_session),
):
    _project_or_404(project_id, session)
    stmt = (
        select(VaultEntry)
        .where(VaultEntry.project_id == project_id)
        .order_by(VaultEntry.created_at.desc())
    )
    if type:
        stmt = stmt.where(VaultEntry.entry_type == type)

    entries = session.exec(stmt).all()

    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        entries = [
            e for e in entries
            if any(t in json.loads(e.tags or "[]") for t in tag_list)
        ]

    return [VaultEntryRead.from_orm_entry(e) for e in entries]


@router.post("/{project_id}/vault", response_model=VaultEntryRead, status_code=201)
async def create_vault_entry(
    project_id: str,
    body: VaultEntryCreate,
    session: Session = Depends(get_session),
):
    _project_or_404(project_id, session)
    entry = VaultEntry(
        project_id=project_id,
        entry_type=body.entry_type,
        summary=body.summary,
        detail=body.detail,
        tags=json.dumps(body.tags),
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)

    entry_read = VaultEntryRead.from_orm_entry(entry)
    _emit(project_id, "vault.entry_added", entry_read.model_dump(mode="json"))
    return entry_read


@router.get("/{project_id}/vault/search", response_model=list[VaultEntryRead])
def search_vault(
    project_id: str,
    q: str = Query(..., description="Search query"),
    session: Session = Depends(get_session),
):
    _project_or_404(project_id, session)
    like = f"%{q}%"
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
    return [VaultEntryRead.from_orm_entry(e) for e in session.exec(stmt).all()]


@router.get("/{project_id}/vault/{entry_id}", response_model=VaultEntryRead)
def get_vault_entry(
    project_id: str,
    entry_id: str,
    session: Session = Depends(get_session),
):
    _project_or_404(project_id, session)
    return VaultEntryRead.from_orm_entry(_entry_or_404(entry_id, project_id, session))


@router.delete("/{project_id}/vault/{entry_id}", status_code=204)
def delete_vault_entry(
    project_id: str,
    entry_id: str,
    session: Session = Depends(get_session),
):
    _project_or_404(project_id, session)
    entry = _entry_or_404(entry_id, project_id, session)
    session.delete(entry)
    session.commit()
