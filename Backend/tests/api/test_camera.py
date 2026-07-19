import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.core.auth_deps import require_principal_or_teacher, require_principal
from app.database.database import get_db
from app.models.camera import Camera

@pytest.fixture
def client(db_session):
    def _get_test_db():
        yield db_session
    app.dependency_overrides[get_db] = _get_test_db
    app.dependency_overrides[require_principal] = lambda: {"sub": "admin-id", "role": "principal"}
    app.dependency_overrides[require_principal_or_teacher] = lambda: {"sub": "admin-id", "role": "principal"}
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def setup_camera(db, name=None, endpoint=None):
    uid = uuid.uuid4().hex[:6]
    cam = Camera(
        name=name or f"Cam-{uid}",
        endpoint=endpoint or f"http://10.0.0.{uid}",
        status="ONLINE"
    )
    db.add(cam)
    db.commit()
    db.refresh(cam)
    return cam

def test_create_camera_api(client):
    uid = uuid.uuid4().hex[:4]
    data = {"name": f"API Cam {uid}", "endpoint": f"http://api.{uid}.local"}
    response = client.post("/cameras/", json=data)
    assert response.status_code == 200
    assert response.json()["message"] == "Kamera berhasil ditambahkan"
    assert response.json()["data"]["name"] == data["name"]

def test_list_cameras_api(client, db_session):
    setup_camera(db_session)
    response = client.get("/cameras/?page=1&size=10")
    assert response.status_code == 200
    assert "items" in response.json()["data"]
    assert len(response.json()["data"]["items"]) >= 1

def test_get_camera_select_api(client, db_session):
    setup_camera(db_session, name="Select Cam API", endpoint="http://select.api")
    response = client.get("/cameras/select")
    assert response.status_code == 200
    items = response.json()["data"]
    assert len(items) >= 1
    assert "id" in items[0]
    assert "name" in items[0]
    assert "endpoint" not in items[0]

def test_get_camera_detail_api(client, db_session):
    cam = setup_camera(db_session)
    response = client.get(f"/cameras/{cam.id}")
    assert response.status_code == 200
    assert response.json()["data"]["name"] == cam.name

def test_update_camera_api(client, db_session):
    cam = setup_camera(db_session)
    update_data = {"name": f"Updated {cam.name}", "status": "OFFLINE"}
    response = client.patch(f"/cameras/{cam.id}", json=update_data)
    assert response.status_code == 200
    assert response.json()["data"]["name"] == update_data["name"]
    assert response.json()["data"]["status"] == "OFFLINE"

def test_delete_camera_api(client, db_session):
    cam = setup_camera(db_session)
    response = client.delete(f"/cameras/{cam.id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Kamera berhasil dihapus"
    get_response = client.get(f"/cameras/{cam.id}")
    assert get_response.status_code == 404
