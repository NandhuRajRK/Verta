from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.latex.compile import LatexCompiler, LatexCompileError
from app.latex.extract_image import LatexImageExtractor
from app.latex.validate import validate_latex
from app.wiring import get_latex_compiler, get_latex_image_extractor

router = APIRouter()


class LatexValidateRequest(BaseModel):
    sourceLatex: str = Field(min_length=0)


class LatexValidateResponse(BaseModel):
    ok: bool
    errors: list[str]


@router.post("/validate", response_model=LatexValidateResponse)
def validate(req: LatexValidateRequest) -> LatexValidateResponse:
    errors = validate_latex(req.sourceLatex)
    return LatexValidateResponse(ok=len(errors) == 0, errors=errors)


class LatexCompileRequest(BaseModel):
    sourceLatex: str = Field(min_length=0)


@router.post("/compile")
def compile_pdf(
    req: LatexCompileRequest, compiler: LatexCompiler = Depends(get_latex_compiler)
) -> Response:
    try:
        pdf_bytes = compiler.compile_pdf(req.sourceLatex)
        return Response(content=pdf_bytes, media_type="application/pdf")
    except LatexCompileError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc


class LatexExtractImageResponse(BaseModel):
    latex: str
    metadata: dict[str, Any] = Field(default_factory=dict)


@router.post("/extract-image", response_model=LatexExtractImageResponse)
async def extract_image(
    file: UploadFile = File(...),
    extractor: LatexImageExtractor = Depends(get_latex_image_extractor),
) -> LatexExtractImageResponse:
    data = await file.read()
    try:
        result = extractor.extract(data, filename=file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return LatexExtractImageResponse(
        latex=result.latex,
        metadata=result.metadata or {},
    )
