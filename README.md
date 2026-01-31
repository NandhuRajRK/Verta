# Verta (AI Scientific Writing PoC)

This repository implements the backend/frontend scaffolding for a Prism-like AI-native scientific writing workspace. The backend exposes document storage, LaTeX tools, multi-backend completion routing, Zotero integration, OCR extraction, and a persistence layer. The frontend delivers the 3-pane workspace, AI assistant threads, preview panel, and integration controls described in `Ui_req.md`.

## Architecture Overview

1. **Backend (`backend/app`)**  
   - `api/`: FastAPI routers for docs, models, completion, latex services, context building, Zotero, local models, auth, presence, search, sharing.  
   - `modeling/`: ModelRouter and pluggable backends (Ollama, llama.cpp, OpenAI, Hugging Face) with timeout/error handling.  
   - `latex/`: Compiler abstractions (tectonic/latexmk/pdflatex) plus image-to-LaTeX pipeline (stub → Tesseract → Mathpix).  
   - `persistence/`: SQLite stores for docs, revisions, comments, sessions, shares, local models, presence, etc.  
   - `zotero/`: Small client validating Zotero credentials.  
   - `wiring.py`: Singleton factories for stores, compiler, extractor, and manager wiring.

2. **Frontend (`frontend/src`)**  
   - `App.tsx`: Single-page UI with splitter-enabled sidebar/editor/preview layout, assistant threads, workspace/file-tree state, upload handlers, compile controls, settings modal, Zotero buttons, and AI suggestion handling.  
   - `components/`: Code editor wrapper and shared UI primitives.  
   - `api/`: Typed client wrappers for every backend route plus shared model/context types.  
   - `test/`: Vitest/Jest files covering components and interactions referenced in `Ui_req.md`.

3. **Tests (`tests/`)**  
   - Pytest suites covering context extraction, completion routing, latex APIs, Zotero, local models, model registry, Mathpix/Tesseract logic, error handling, etc.

## Getting Started

### Prerequisites

- **Node 18+ / npm** for the frontend.
- **Python 3.12+** (virtual env via `backend/.venv` recommended).
- **Optional**: Tesseract OCR binary on `PATH` for local image extraction.
- **Optional API keys**:
  - `OPENAI_API_KEY` or `HF_ENDPOINT_URL` + `HF_TOKEN`.
  - `VERTA_MATHPIX_APP_ID` and `VERTA_MATHPIX_APP_KEY` for Mathpix extraction (`VERTA_LATEX_IMAGE_EXTRACTOR=mathpix`).
  - Zotero `userId` + `apiKey` for the Zotero connect button.

### Backend Setup

```powershell
cd backend
.\scripts\venv.ps1       # create/activate venv if not already active
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --app-dir backend
```

Environment variables:

- `VERTA_LATEX_COMPILER`: `auto` / `tectonic` / `latexmk` / `pdflatex`.
- `VERTA_LATEX_IMAGE_EXTRACTOR`: `auto` / `tesseract` / `mathpix`.
- `VERTA_MATHPIX_URL`, `VERTA_MATHPIX_APP_ID`, `VERTA_MATHPIX_APP_KEY` for Mathpix.
- `VERTA_MODELS_DIR` (default `backend/.models`) for local model files.

### Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

Default backend API base is `/api`. Adjust `frontend/src/api/client.ts` if you proxy through another host.

## Key Features

- **Document + model persistence** with revision history, comments, logs, shares, local model registry, presence heartbeats.
- **Multi-backend completion** – Ollama, llama.cpp, OpenAI, Hugging Face routed through `ModelRouter`.
- **LaTeX tooling** – Validation/compile/extract-image endpoints plus structured context builder.
- **OCR pipeline** – Stub response, local Tesseract route (requires binary on `PATH`), Mathpix integration when credentials provided.
- **Zotero integration** – Validates credentials via `POST /api/zotero/connect` and returns a sample bibliographic entry.
- **Frontend UX** – 3-pane layout, inline AI assistant threads, file tree editor, compile/log buttons, settings modal, Zotero/connect flows, suggestions UI, upload handlers.

## API Highlights

- `POST /api/doc` / `PUT /api/doc/{id}` / `GET /api/doc/{id}` for document CRUD.
- `POST /api/model/completion` with `{type, provider, id, settings}` plus context/prompt/options.
- `POST /api/context/build` builds LaTeX context for assistant prompts.
- `POST /api/latex/compile` (PDF) / `POST /api/latex/validate` / `POST /api/latex/extract-image`.
- `POST /api/zotero/connect` (requires `userId` + `apiKey`).
- Local model registry endpoints under `/api/local-models`.

## Testing

- Backend: `python -m pytest -q` (runs `tests/` suites).
- Frontend: `cd frontend && npm run test:run`.
- OCR-specific: `python -m pytest tests/test_latex_extract_image.py`.
- Zotero: `python -m pytest tests/test_zotero_api.py`.

## Workflow Notes

- Save workspace state/backups via the frontend, which syncs to `/doc` endpoints.
- Toggle settings (editor, PDF, integrations) via the settings modal; passing new models persists them through `/api/doc/{id}/models`.
- Upload files/folders via hidden inputs; the file tree lives in `App.tsx` state serialized to the backend.
- Use the Zotero buttons/menus to trigger `connectZotero` and show status to the user.

## Deployment

- Serve FastAPI via Uvicorn/Gunicorn behind a reverse proxy; ensure `backend/.data` is writable.
- Build the frontend (e.g., `npm run build`) and host the `dist` files alongside or proxy to the API.
- Configure environment variables for remote model providers, Mathpix, Zotero, etc.
 
## Contributing

- Align new features with `Project_req.md` and `Ui_req.md` deliverables.
- Write tests first for backend logic or frontend interactions.
- Keep the API client/types in sync (`frontend/src/api`).
- Expand UI stories/tests if you add components; refer to the `App.*.test.tsx` files.

## License & Acknowledgments

- Mention third-party licenses if you redistribute (e.g., Tesseract is GPL, Mathpix has its own agreement, FastAPI/React/Node/etc. follow their respective licenses).
