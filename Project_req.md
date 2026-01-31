
---

## **Agent Prompt — Build AI Scientific Writing PoC**

**Goal:**
Build a *proof of concept* web application that is an **AI-augmented scientific document editor**. It must support **multiple model backends** (local open-source + remote API) and follow **modular architecture** with **Test-Driven Development (TDD)**. The editor must be LaTeX-native and allow contextual assistance from models.

---

## **High-Level Requirements**

1. **LaTeX-Native Editor**

   * Web-based editor with LaTeX syntax highlighting
   * Live compiled preview (PDF/HTML)
   * Handles sections, equations, labels

2. **Multi-Model Support**

   * Integrate a modular Model Routing Layer
   * Support:

     * Local open-source LLMs (configurable by user)
     * API models (OpenAI, HF Endpoints)
   * Unified interface to request completions from any backend

3. **Contextual AI Assistance**

   * User selects text or cursor point
   * System builds context from LaTeX AST
   * Sends context + prompt to Model Routing
   * Inserts suggestion back into editor

4. **Modular Architecture**

   * Editor UI
   * Model Routing Module
   * Context Extraction Module
   * Persistence Module
   * (Optional) Real-time Collaboration

5. **Test-Driven Development**

   * TDD for every module
   * Write tests before implementing features
   * Provide test coverage ≥ 90%

---

## **Deliverables**

### **1) Application Structure**

* Frontend (React/Vue/Svelte or equivalent)
* Backend (Node.js/Python)
* Local model support via local inference library
* API model support via SDKs (OpenAI, Hugging Face, etc.)

---

### **2) Core Features & Modules (with Testing Requirements)**

---

#### **A) LaTeX Editor Module**

**Description:**
Web editor with LaTeX syntax support and a live preview.

**Acceptance Criteria**

* LaTeX code renders correctly
* Editor detects syntax errors
* Live preview updates with changes

**Mandatory Tests**

* Editor syntax highlighting test
* Preview render test
* Save/restore cycle test

---

#### **B) Model Routing Module**

**Description:**
Abstracted layer to switch between backends.

**Capabilities**

* Accepts model configuration

  * `{ type: "local" | "api", id: "model-identifier", settings }`
* Routes prompt + context to correct inference engine
* Normalized output format

**Mandatory Tests**

* Local model inference returns structured output
* Remote API returns structured output
* Backend switching test

---

#### **C) Context Extraction Module**

**Description:**
Parse LaTeX into context chunks for prompts.

**Mandatory Tests**

* Parse LaTeX into a valid AST
* Build context respecting token limits

---

#### **D) AI Assistance UI**

**Description:**
Buttons and UI to trigger AI generation

**Mandatory Tests**

* Suggestion insertion test
* Model selector UI test

---

#### **E) Persistence Module**

**Description:**
Store and retrieve documents + settings

**Mandatory Tests**

* Save document test
* Load document test
* Settings restore test

---

## **API Contracts**

### **Internal Model Endpoint**

```
POST /api/model/completion
{
  "modelConfig": { "type": "...", "id": "...", "settings": {} },
  "context": "...",
  "prompt": "...",
  "options": { "maxTokens": n }
}
```

Response:

```
{ "text": "...", "metadata": {} }
```

**Test Requirements**

* Test response structure
* Test error handling
* Test timeout behavior

---

### **Doc API**

```
GET /api/doc/{id}
POST /api/doc
```

**Tests**

* Test doc save
* Test doc read

---

## **Tech Stack Constraints**

* Frontend: modern JS framework
* Backend: Node.js or Python
* Local model inference: accessible via Python or Node
* Persistence: local files or lightweight DB (SQLite)
* Tests: Jest / PyTest / equivalent

---

## **Workout Plan (Execution Stages)**

### **Stage 1 — Setup & TDD Framework**

* Create repo + branches
* Setup UI framework
* Setup testing frameworks
* Write initial failing tests

---

### **Stage 2 — Editor & Preview**

* Build LaTeX syntax editor
* Build live preview
* Pass tests

---

### **Stage 3 — Model Routing + Local Model Support**

* Implement routing layer
* Add local LLM support
* Add tests

---

### **Stage 4 — API Model Support**

* Integrate OpenAI API
* Integrate Hugging Face endpoints
* Add tests

---

### **Stage 5 — Context Extraction + AI UI**

* Build AST parser
* Trigger suggestions
* Insert in editor

---

### **Stage 6 — Persistence**

* Save & load docs
* Add tests

---

### **Optional Stage — Collaboration**

* Socket/CRDT sync
* Tests for concurrency

---

## **Testing Requirements (Always First)**

* Unit tests for all pure logic
* Integration tests for editor + model routing
* End-to-end tests for user flows
* Auto-run in CI/CD

---

## **Success Criteria**

* Editor with LaTeX + preview
* Model routing works with local & API
* Contextual suggestions appear in editor
* All tests passing
* Document persistence

---

## **Deliverables Checklist**

* [ ] Repo with modular structure
* [ ] TDD test suite with high coverage
* [ ] Readme with setup instructions
* [ ] UI prototype
* [ ] Local & API model integration
* [ ] Document editor + preview
* [ ] AI assistant UI

---

## **Notes (For the Agent)**

* Prioritize modularity & testability
* Build minimal PoC
* Avoid org-level features
* Keep model swap at runtime

---
