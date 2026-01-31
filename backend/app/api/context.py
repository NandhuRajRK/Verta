from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field, model_validator
from pydantic.config import ConfigDict

from app.context.extract import build_structured_context_with_limits, parse_latex_to_ast

router = APIRouter()


class ContextBuildRequest(BaseModel):
    sourceLatex: str = Field(default="")
    cursorIndex: int | None = None
    selectionStart: int | None = None
    selectionEnd: int | None = None
    maxContextChars: int = 4000
    maxContextTokens: int = 1000
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"sourceLatex": "\\\\section{Intro}\\nText", "cursorIndex": 10, "maxContextChars": 2000, "maxContextTokens": 500},
                {"sourceLatex": "AAA BBB CCC", "selectionStart": 4, "selectionEnd": 11},
            ]
        }
    )

    @model_validator(mode="after")
    def _validate_bounds(self):
        n = len(self.sourceLatex or "")
        if self.maxContextChars <= 0 or self.maxContextTokens <= 0:
            raise ValueError("maxContextChars and maxContextTokens must be > 0")
        if (self.selectionStart is None) != (self.selectionEnd is None):
            raise ValueError("selectionStart and selectionEnd must be provided together")
        if self.cursorIndex is not None and not (0 <= self.cursorIndex <= n):
            raise ValueError("cursorIndex out of bounds")
        if self.selectionStart is not None and self.selectionEnd is not None:
            if not (0 <= self.selectionStart <= n) or not (0 <= self.selectionEnd <= n):
                raise ValueError("selectionStart/selectionEnd out of bounds")
        return self


class ContextBuildResponse(BaseModel):
    context: str
    metadata: dict[str, Any]


def _slice_window(source: str, center: int, window: int) -> str:
    start = max(0, center - window)
    end = min(len(source), center + window)
    return source[start:end]


@router.post("/build", response_model=ContextBuildResponse)
def build(req: ContextBuildRequest) -> ContextBuildResponse:
    ast = parse_latex_to_ast(req.sourceLatex)

    if req.selectionStart is not None and req.selectionEnd is not None:
        start = max(0, min(req.selectionStart, len(req.sourceLatex)))
        end = max(0, min(req.selectionEnd, len(req.sourceLatex)))
        if end < start:
            start, end = end, start
        selection = req.sourceLatex[start:end]
        center = (start + end) // 2
        ctx, structured = build_structured_context_with_limits(
            req.sourceLatex,
            center_index=center,
            max_chars=req.maxContextChars,
            max_tokens=req.maxContextTokens,
        )
        return ContextBuildResponse(
            context=ctx,
            metadata={
                "mode": "selection",
                "selection": selection,
                **structured,
                "ast": {
                    "sections": ast.sections,
                    "labels": ast.labels,
                    "equations": len(ast.equations),
                },
            },
        )

    cursor = req.cursorIndex if req.cursorIndex is not None else len(req.sourceLatex)
    cursor = max(0, min(cursor, len(req.sourceLatex)))
    ctx, structured = build_structured_context_with_limits(
        req.sourceLatex,
        center_index=cursor,
        max_chars=req.maxContextChars,
        max_tokens=req.maxContextTokens,
    )
    return ContextBuildResponse(
        context=ctx,
        metadata={
            "mode": "cursor",
            "cursorIndex": cursor,
            **structured,
            "ast": {
                "sections": ast.sections,
                "labels": ast.labels,
                "equations": len(ast.equations),
            },
        },
    )
