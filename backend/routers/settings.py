from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from backend.auth import verify_api_key
from backend.database import get_session
from backend.models.settings import AppSettings, SettingsRead, SettingsPatch

router = APIRouter(
    prefix="/api/settings",
    tags=["settings"],
    dependencies=[Depends(verify_api_key)],
)


def _get_or_create(session: Session) -> AppSettings:
    row = session.get(AppSettings, 1)
    if row is None:
        row = AppSettings()
        session.add(row)
        session.commit()
        session.refresh(row)
    return row


@router.get("", response_model=SettingsRead)
def get_settings(session: Session = Depends(get_session)):
    """Return current non-sensitive settings."""
    row = _get_or_create(session)
    return SettingsRead(llm_provider=row.llm_provider, llm_model=row.llm_model)


@router.patch("", response_model=SettingsRead)
def patch_settings(body: SettingsPatch, session: Session = Depends(get_session)):
    """Persist LLM provider/model/key. API key is accepted but never returned."""
    row = _get_or_create(session)
    if body.llm_provider is not None:
        row.llm_provider = body.llm_provider
    if body.llm_model is not None:
        row.llm_model = body.llm_model
    if body.llm_api_key is not None:
        row.llm_api_key = body.llm_api_key
    session.add(row)
    session.commit()
    session.refresh(row)
    return SettingsRead(llm_provider=row.llm_provider, llm_model=row.llm_model)
