from typing import Any, Literal

from pydantic import BaseModel, Field
from pydantic.config import ConfigDict


class ModelConfig(BaseModel):
    type: Literal["local", "api"]
    id: str
    provider: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"type": "local", "provider": "ollama", "id": "llama3", "settings": {}},
                {"type": "api", "provider": "openai", "id": "gpt-4.1-mini", "settings": {}},
            ]
        }
    )


class CompletionOptions(BaseModel):
    maxTokens: int = 256
    timeoutS: float = 10.0


class CompletionRequest(BaseModel):
    modelConfig: ModelConfig
    context: str = ""
    sourceLatex: str | None = None
    maxContextChars: int = 4000
    maxContextTokens: int = 1000
    prompt: str
    options: CompletionOptions = Field(default_factory=CompletionOptions)

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "modelConfig": {"type": "api", "provider": "openai", "id": "gpt-4.1-mini", "settings": {}},
                    "sourceLatex": "\\\\section{Intro}\\\\label{sec:intro}\\nHello",
                    "prompt": "Write the next paragraph in a formal tone.",
                    "options": {"maxTokens": 128, "timeoutS": 10.0},
                }
            ]
        }
    )


class CompletionResponse(BaseModel):
    text: str
    metadata: dict[str, Any] = Field(default_factory=dict)
