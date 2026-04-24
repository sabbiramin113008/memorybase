"""Smoke tests for MemoryBase API endpoints."""
from .conftest import AUTH


def test_health(client):
    """GET /health returns 200 and status ok."""
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_auth_required(client):
    """Requests without API key return 401."""
    r = client.get("/api/projects")
    assert r.status_code == 401


def test_create_and_list_projects(client):
    """Create a project and verify it appears in the list."""
    payload = {"name": "Test Project", "domain": "testing", "description": "A test"}
    r = client.post("/api/projects", json=payload, headers=AUTH)
    assert r.status_code in (200, 201)
    project = r.json()
    assert project["name"] == "Test Project"
    assert project["status"] == "active"

    r = client.get("/api/projects", headers=AUTH)
    assert r.status_code == 200
    names = [p["name"] for p in r.json()]
    assert "Test Project" in names


def test_create_and_update_task(client):
    """Create a project + task, then update task status."""
    proj = client.post("/api/projects", json={"name": "Proj"}, headers=AUTH).json()
    pid = proj["id"]

    task_r = client.post(
        f"/api/projects/{pid}/tasks",
        json={"title": "Do something", "phase": "Phase 1"},
        headers=AUTH,
    )
    assert task_r.status_code in (200, 201)
    task = task_r.json()
    assert task["status"] == "todo"
    tid = task["id"]

    status_r = client.patch(
        f"/api/projects/{pid}/tasks/{tid}/status",
        json={"status": "in_progress", "notes": "Started."},
        headers=AUTH,
    )
    assert status_r.status_code == 200
    assert status_r.json()["status"] == "in_progress"


def test_vault_create_and_search(client):
    """Create a vault entry and verify search finds it."""
    proj = client.post("/api/projects", json={"name": "VProj"}, headers=AUTH).json()
    pid = proj["id"]

    entry_r = client.post(
        f"/api/projects/{pid}/vault",
        json={
            "entry_type": "decision",
            "summary": "Use SQLite for dev",
            "detail": "Zero-config local development",
            "tags": ["database"],
        },
        headers=AUTH,
    )
    assert entry_r.status_code in (200, 201)
    entry = entry_r.json()
    assert entry["entry_type"] == "decision"
    assert "database" in entry["tags"]

    search_r = client.get(f"/api/projects/{pid}/vault/search?q=SQLite", headers=AUTH)
    assert search_r.status_code == 200
    results = search_r.json()
    assert any("SQLite" in e["summary"] for e in results)


def test_settings_get_and_patch(client):
    """GET and PATCH /api/settings."""
    r = client.get("/api/settings", headers=AUTH)
    assert r.status_code == 200
    data = r.json()
    assert "llm_provider" in data
    assert "version" in data
    # API key must NOT be in response
    assert "llm_api_key" not in data

    patch_r = client.patch(
        "/api/settings",
        json={"llm_provider": "openai", "llm_model": "gpt-4o"},
        headers=AUTH,
    )
    assert patch_r.status_code == 200
    assert patch_r.json()["llm_provider"] == "openai"
    assert patch_r.json()["llm_model"] == "gpt-4o"
    assert "llm_api_key" not in patch_r.json()
