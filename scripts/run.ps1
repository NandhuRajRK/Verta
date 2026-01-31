$ErrorActionPreference = "Stop"

Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)

python -m uvicorn app.main:app --reload --app-dir backend

