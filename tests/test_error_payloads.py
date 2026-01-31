from fastapi.testclient import TestClient

from app.main import app


def test_404_uses_standard_error_payload():
    client = TestClient(app)
    resp = client.get("/api/doc/does-not-exist")
    assert resp.status_code == 404
    data = resp.json()
    assert "error" in data
    assert data["error"]["status"] == 404
    assert isinstance(data["error"]["message"], str)

