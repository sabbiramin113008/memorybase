import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session
from sqlmodel.pool import StaticPool

# Use an in-memory SQLite DB for tests
import os
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("AGENTDOCK_API_KEY", "test-key")

from backend.main import app
from backend import database


@pytest.fixture(name="client")
def client_fixture():
    # Override the database engine with an in-memory one
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    def get_session_override():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[database.get_session] = get_session_override

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


AUTH = {"X-AgentDock-Key": "test-key"}
