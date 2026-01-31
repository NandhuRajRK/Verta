from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.latex.extract_image import (
    MathpixLatexExtractor,
    StubLatexImageExtractor,
    TesseractLatexExtractor,
    create_latex_image_extractor,
)
from app.main import app
from app.wiring import get_latex_image_extractor


def _reset_extractor_cache():
    try:
        get_latex_image_extractor.cache_clear()
    except AttributeError:
        pass


def test_extract_image_returns_placeholder_meta(monkeypatch):
    monkeypatch.setenv("VERTA_LATEX_IMAGE_EXTRACTOR", "stub")
    _reset_extractor_cache()
    client = TestClient(app)
    resp = client.post("/api/latex/extract-image", files={"file": ("example.png", b"fake", "image/png")})
    assert resp.status_code == 200
    data = resp.json()
    assert data["latex"] == ""
    assert data["metadata"]["note"] == "Image extraction not configured"


def test_tesseract_extractor_calls_pytesseract(monkeypatch):
    opened = {}

    class DummyImage:
        pass

    def fake_open(buffer):
        buffer.seek(0)
        opened["bytes"] = buffer.read()
        buffer.seek(0)
        return DummyImage()

    def fake_image_to_string(image, lang=None):
        opened["lang"] = lang
        assert isinstance(image, DummyImage)
        return "c = 3"

    monkeypatch.setattr("app.latex.extract_image.Image", SimpleNamespace(open=fake_open))
    monkeypatch.setattr("app.latex.extract_image.pytesseract", SimpleNamespace(image_to_string=fake_image_to_string))
    extractor = TesseractLatexExtractor(lang="eng")
    result = extractor.extract(b"data", filename="math.png")
    assert result.latex == "c = 3"
    assert result.metadata["backend"] == "tesseract"
    assert result.metadata["filename"] == "math.png"
    assert opened["bytes"] == b"data"
    assert opened["lang"] == "eng"


def test_mathpix_extractor_hits_api(monkeypatch):
    called = {}
    class DummyResponse:
        def raise_for_status(self):
            called["raised"] = True

        def json(self):
            called["body"] = {"latex_normal": "E=mc^2", "confidence": 0.99}
            return called["body"]

    class DummyClient:
        def __init__(self, **kwargs):
            called["client_kwargs"] = kwargs

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def post(self, url, json=None, headers=None):
            called["url"] = url
            called["payload"] = json
            called["headers"] = headers
            return DummyResponse()

    monkeypatch.setenv("VERTA_MATHPIX_APP_ID", "id")
    monkeypatch.setenv("VERTA_MATHPIX_APP_KEY", "key")
    monkeypatch.setenv("VERTA_LATEX_IMAGE_EXTRACTOR", "mathpix")
    monkeypatch.setattr("app.latex.extract_image.httpx.Client", DummyClient)
    extractor = MathpixLatexExtractor()
    result = extractor.extract(b"\x00", filename="math.png")
    assert result.latex == "E=mc^2"
    assert result.metadata["backend"] == "mathpix"
    assert called["headers"]["app_id"] == "id"
    assert "base64" in called["payload"]["src"]


def test_create_image_extractor_prefers_mathpix(monkeypatch):
    monkeypatch.setenv("VERTA_MATHPIX_APP_ID", "id")
    monkeypatch.setenv("VERTA_MATHPIX_APP_KEY", "key")
    extractor = create_latex_image_extractor()
    assert isinstance(extractor, MathpixLatexExtractor)


def test_create_image_extractor_defaults_to_stub(monkeypatch):
    monkeypatch.delenv("VERTA_LATEX_IMAGE_EXTRACTOR", raising=False)
    monkeypatch.delenv("VERTA_MATHPIX_APP_ID", raising=False)
    monkeypatch.delenv("VERTA_MATHPIX_APP_KEY", raising=False)
    monkeypatch.setattr("app.latex.extract_image.pytesseract", None)
    monkeypatch.setattr("app.latex.extract_image.Image", None)
    extractor = create_latex_image_extractor()
    assert isinstance(extractor, StubLatexImageExtractor)
