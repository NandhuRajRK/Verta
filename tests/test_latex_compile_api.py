from fastapi.testclient import TestClient

from app.main import app
from app.wiring import get_latex_compiler


class FakeCompiler:
    def compile_pdf(self, source_latex: str) -> bytes:
        assert "\\section" in source_latex or source_latex == ""
        return b"%PDF-1.4\nfake\n%%EOF\n"


def test_latex_compile_returns_pdf_bytes():
    app.dependency_overrides[get_latex_compiler] = lambda: FakeCompiler()
    try:
        client = TestClient(app)
        resp = client.post("/api/latex/compile", json={"sourceLatex": r"\section{Hi}"})
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("application/pdf")
        assert resp.content.startswith(b"%PDF-")
    finally:
        app.dependency_overrides.clear()

