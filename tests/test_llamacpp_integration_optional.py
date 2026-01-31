import os

import pytest


def test_llamacpp_backend_completes_if_installed_and_model_provided():
    pytest.importorskip("llama_cpp")
    model_path = os.environ.get("LLAMACPP_TEST_MODEL_PATH")
    if not model_path:
        pytest.skip("Set LLAMACPP_TEST_MODEL_PATH to a GGUF file to run this test")

    from app.modeling.backends import LlamaCppBackend
    from app.modeling.models import CompletionOptions, CompletionRequest, ModelConfig

    backend = LlamaCppBackend(model_path=model_path)
    req = CompletionRequest(
        modelConfig=ModelConfig(type="local", provider="llamacpp", id="test", settings={"modelPath": model_path}),
        context="",
        prompt="Hello",
        options=CompletionOptions(maxTokens=1, timeoutS=30.0),
    )

    # Run in event loop via pytest's built-in loop support if present; otherwise use asyncio.
    import asyncio

    resp = asyncio.run(backend.completion(req))
    assert isinstance(resp.text, str)

