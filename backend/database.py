from typing import Generator

from sqlmodel import SQLModel, create_engine, Session

from backend.config import settings

_connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}

engine = create_engine(settings.DATABASE_URL, echo=False, connect_args=_connect_args)


def create_db_and_tables() -> None:
    """Create all SQLModel-registered tables. Called once on app startup."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session."""
    with Session(engine) as session:
        yield session
