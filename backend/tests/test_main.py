from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/v1/utils/health-check")
    assert response.status_code == 200
    assert response.json() == {"msg": "OK"}
