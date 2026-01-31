from typing import Any

from pydantic import BaseModel, Field


class DocCreateRequest(BaseModel):
    id: str | None = None
    title: str | None = None
    content: str = ""
    settings: dict[str, Any] = Field(default_factory=dict)


class DocUpdateRequest(BaseModel):
    title: str | None = None
    content: str = ""
    settings: dict[str, Any] = Field(default_factory=dict)


class DocResponse(BaseModel):
    id: str
    title: str | None = None
    content: str = ""
    settings: dict[str, Any] = Field(default_factory=dict)
