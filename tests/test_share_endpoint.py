"""Test for share endpoint mounting fix - verifies public share URLs work correctly."""
import json
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.persistence.store import DocStore
from app.wiring import get_doc_store


def test_share_doc_endpoint_returns_valid_public_url(tmp_path):
    """Public share URLs should be accessible at /share/{token}, not /api/share/{token}."""
    store = DocStore(db_path=tmp_path / "test.sqlite3")
    app.dependency_overrides[get_doc_store] = lambda: store
    
    try:
        client = TestClient(app)
        
        # Create a document
        workspace = {"entries": {"main.tex": {"type": "file", "content": "hello"}}}
        create_resp = client.post("/api/doc", json={
            "title": "Share Test",
            "content": json.dumps(workspace),
            "settings": {}
        })
        assert create_resp.status_code == 200
        doc_id = create_resp.json()["id"]
        
        # Create share
        share_resp = client.post(f"/api/doc/{doc_id}/share")
        assert share_resp.status_code == 200
        share_data = share_resp.json()
        share_url = share_data["url"]
        
        # Verify share URL starts with /share/ (not /api/share/)
        assert share_url.startswith("/share/"), f"Share URL should start with /share/, got: {share_url}"
        
        # Access the shared document via the public URL
        public_resp = client.get(share_url)
        assert public_resp.status_code == 200, f"Public share URL {share_url} should return 200, got {public_resp.status_code}"
        
        # Verify the shared document data
        shared_doc = public_resp.json()
        assert shared_doc["doc_id"] == doc_id
        assert shared_doc["title"] == "Share Test"
        
    finally:
        app.dependency_overrides.clear()


def test_share_doc_not_found_returns_404(tmp_path):
    """Invalid share tokens should return 404."""
    store = DocStore(db_path=tmp_path / "test.sqlite3")
    app.dependency_overrides[get_doc_store] = lambda: store
    
    try:
        client = TestClient(app)
        resp = client.get("/share/invalid-token-12345")
        assert resp.status_code == 404
        
    finally:
        app.dependency_overrides.clear()
