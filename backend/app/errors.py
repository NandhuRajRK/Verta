from typing import Any

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ErrorBody(BaseModel):
    status: int
    message: str
    code: str | None = None
    details: Any | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody


def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    message = exc.detail if isinstance(exc.detail, str) else "Request failed"
    body = ErrorResponse(error=ErrorBody(status=exc.status_code, message=message, details=exc.detail))
    return JSONResponse(status_code=exc.status_code, content=body.model_dump())

