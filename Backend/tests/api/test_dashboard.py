import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database.database import get_db
from app.core.auth_deps import require_principal_or_teacher

@pytest.fixture
def client_principal(db_session):
    def _get_test_db():
        yield db_session
    app.dependency_overrides[get_db] = _get_test_db
    app.dependency_overrides[require_principal_or_teacher] = lambda: {"sub": str(uuid.uuid4()), "role": "principal"}
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def client_teacher(db_session):
    def _get_test_db():
        yield db_session
    app.dependency_overrides[get_db] = _get_test_db
    app.dependency_overrides[require_principal_or_teacher] = lambda: {"sub": "88888888-4444-4444-4444-121212121212", "role": "teacher"}
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def test_principal_dashboard_api(client_principal):
    response = client_principal.get("/dashboard/")
    assert response.status_code == 200
    data = response.json()["data"]
    assert "total_students" in data
    assert "total_teachers" in data

def test_teacher_dashboard_api(client_teacher):
    response = client_teacher.get("/dashboard/")
    assert response.status_code == 200
    data = response.json()["data"]
    assert "metrics_summary" in data
    assert "total_classrooms" in data
