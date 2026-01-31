from fastapi.testclient import TestClient

from app.main import app


def test_latex_validate_ok():
    client = TestClient(app)
    resp = client.post(
        "/api/latex/validate",
        json={"sourceLatex": r"\section{Intro}\begin{equation}E=mc^2\end{equation}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert data["errors"] == []


def test_latex_validate_detects_unbalanced_braces():
    client = TestClient(app)
    resp = client.post("/api/latex/validate", json={"sourceLatex": r"\section{Intro"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is False
    assert any("brace" in e.lower() for e in data["errors"])


def test_latex_validate_detects_env_mismatch():
    client = TestClient(app)
    resp = client.post(
        "/api/latex/validate",
        json={"sourceLatex": r"\begin{equation}E=mc^2\end{align}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is False
    assert any("environment" in e.lower() for e in data["errors"])

