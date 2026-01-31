from __future__ import annotations

import base64
import io
import os
from typing import Any, NamedTuple, Protocol

import httpx


class LatexImageExtractionResult(NamedTuple):
    latex: str
    metadata: dict[str, Any]


class LatexImageExtractor(Protocol):
    def extract(self, data: bytes, filename: str | None = None) -> LatexImageExtractionResult:
        ...


try:
    from PIL import Image
except ImportError:
    Image = None  # type: ignore[assignment]

try:
    import pytesseract
except ImportError:
    pytesseract = None  # type: ignore[assignment]


class StubLatexImageExtractor:
    def extract(self, data: bytes, filename: str | None = None) -> LatexImageExtractionResult:
        return LatexImageExtractionResult(
            latex="",
            metadata={"note": "Image extraction not configured", "filename": filename or ""},
        )


class TesseractLatexExtractor:
    def __init__(self, lang: str | None = None):
        self.lang = lang

    def extract(self, data: bytes, filename: str | None = None) -> LatexImageExtractionResult:
        if Image is None or pytesseract is None:
            raise RuntimeError("Tesseract extraction requires pytesseract and Pillow")
        with io.BytesIO(data) as buffer:
            image = Image.open(buffer)
            text = pytesseract.image_to_string(image, lang=self.lang or None)
        return LatexImageExtractionResult(
            latex=text.strip(),
            metadata={
                "backend": "tesseract",
                "filename": filename or "",
                "lang": self.lang or "",
            },
        )


class MathpixLatexExtractor:
    def __init__(
        self,
        app_id: str | None = None,
        app_key: str | None = None,
        endpoint: str | None = None,
    ):
        self._app_id = app_id or os.environ.get("VERTA_MATHPIX_APP_ID")
        self._app_key = app_key or os.environ.get("VERTA_MATHPIX_APP_KEY")
        self._endpoint = (endpoint or os.environ.get("VERTA_MATHPIX_URL") or "https://api.mathpix.com/v3/text").rstrip("/")
        if not self._app_id or not self._app_key:
            raise RuntimeError("Mathpix extractor requires app id/key credentials")

    def extract(self, data: bytes, filename: str | None = None) -> LatexImageExtractionResult:
        payload = {
            "src": f"data:image/png;base64,{base64.b64encode(data).decode()}",
            "formats": ["latex_normal", "data"],
        }
        headers = {"app_id": self._app_id, "app_key": self._app_key}
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(f"{self._endpoint}", json=payload, headers=headers)
        resp.raise_for_status()
        body = resp.json()
        latex = body.get("latex_normal") or (body.get("data") or {}).get("latex") or ""
        return LatexImageExtractionResult(
            latex=str(latex).strip(),
            metadata={
                "backend": "mathpix",
                "filename": filename or "",
                "confidence": body.get("confidence"),
            },
        )


def _normalize_preference(value: str | None) -> str:
    candidate = (value or os.environ.get("VERTA_LATEX_IMAGE_EXTRACTOR") or "auto").strip().lower()
    if candidate not in {"auto", "tesseract", "mathpix", "stub"}:
        candidate = "auto"
    return candidate


def create_latex_image_extractor(preferred: str | None = None) -> LatexImageExtractor:
    mode = _normalize_preference(preferred)
    if mode == "mathpix":
        return MathpixLatexExtractor()
    if mode == "tesseract":
        return TesseractLatexExtractor()
    if mode == "auto":
        if (
            os.environ.get("VERTA_MATHPIX_APP_ID")
            and os.environ.get("VERTA_MATHPIX_APP_KEY")
        ):
            return MathpixLatexExtractor()
        if Image is not None and pytesseract is not None:
            return TesseractLatexExtractor()
    return StubLatexImageExtractor()
