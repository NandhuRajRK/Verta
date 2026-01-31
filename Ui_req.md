

* Modern AI-native research editor patterns
* Cloud LaTeX editor UX patterns (editor + preview + collaboration)
* AI-embedded document workflow patterns

Prism-like tools unify drafting, LaTeX editing, collaboration, and AI assistance into one workspace where AI has document-level context. ([OpenAI][1])
Cloud LaTeX editors typically use a code editor + preview + collaboration panel layout. ([Digital Science][2])

---

# AGENT PROMPT — BUILD PRISM-STYLE UI/UX (POC)

## ROLE

You are a senior frontend + product UI engineer building the UI for an AI-native scientific writing workspace.

You must produce:

* Production-ready UI architecture
* Component system
* State model
* Interaction flows
* Testable UI logic (TDD compatible)

---

# PRIMARY OBJECTIVE

Build a **3-pane AI scientific writing interface** with:

LEFT → Project / Files / Navigation
CENTER → LaTeX Editor + AI Inline Suggestions
RIGHT → Preview + AI Actions / Agent Panel

---

# CORE UX PRINCIPLES

### 1. AI INSIDE THE DOCUMENT (NOT CHAT FIRST)

AI must feel embedded in the writing workflow.

AI has access to:

* Document structure
* Equations
* References
* Section context

---

### 2. ZERO TOOL SWITCHING

User can:

* Write
* Compile
* Ask AI
* Insert citations
* Generate LaTeX
  All in one UI.

---

### 3. REAL-TIME FEEDBACK

* Compile progress
* AI suggestion diff preview
* Change highlights

---

# LAYOUT SPECIFICATION

## GLOBAL LAYOUT GRID

```
| Sidebar | Editor Workspace | Preview / AI Panel |
| 20%     | 50%              | 30%                |
```

Responsive rules:

* < 1200px → Collapse sidebar
* < 900px → Toggle preview panel

---

# LEFT SIDEBAR — PROJECT NAVIGATION

## Sections

### Project Switcher

Dropdown with:

* Recent projects
* New project
* Import project

### File Tree

Supports:

* .tex
* .bib
* images
* markdown notes

### Navigation Outline

Auto-generated from LaTeX:

* Chapters
* Sections
* Subsections

---

## Required Components

```
SidebarContainer
ProjectSelector
FileTree
OutlineNavigator
SearchFilesInput
```

---

# CENTER PANEL — EDITOR WORKSPACE

## Editor Requirements

Must support:

* LaTeX syntax highlighting
* Inline error diagnostics
* Inline AI suggestion ghost text
* Cursor context extraction

---

## Editor Header

Contains:

* Current file name
* Compile status
* Tools dropdown
* Model selector

---

## Inline AI Interaction

### Trigger Methods

* Keyboard shortcut
* Floating toolbar
* Right click

---

## AI Suggestion UI

Show:

* Diff view
* Accept / Reject buttons
* Confidence indicator

---

## Components

```
EditorContainer
CodeEditor
InlineSuggestionOverlay
CompileStatusBar
ModelSelectorDropdown
FloatingAIActions
```

---

# RIGHT PANEL — PREVIEW + AI PANEL

## Top Section — Preview

PDF or rendered LaTeX
Controls:

* Zoom
* Page navigation
* Compile logs

---

## Bottom Section — AI Agent Panel

Capabilities:

* Suggested changes list
* Citation suggestions
* Refactor suggestions
* Section summaries

---

## Components

```
PreviewContainer
PDFViewer
CompileLogsPanel
AIInsightsPanel
ProposedChangesList
```

---

# AI UX BEHAVIOR

## Proposed Changes System

Each suggestion includes:

* File path
* Lines affected
* Additions (green)
* Removals (red)

---

## Example Item

```
File: chapters/02-methods.tex
Type: Citation Suggestion
Impact: +3 references
Confidence: High
```

---

# VISUAL DESIGN SYSTEM

## Colors

Background → #0B0F14
Panel → #121821
Border → #1E293B
Accent → #7C9CFF

AI Suggestions:
Green → additions
Red → removals
Blue → AI generated

---

## Typography

Editor → JetBrains Mono
UI → Inter

---

# STATE MODEL

## Global State

```
currentProject
currentFile
editorContent
compileStatus
activeModel
aiSuggestions[]
previewState
```

---

# EVENT FLOW

## AI Suggestion Flow

```
User selects text
→ Context extractor runs
→ Model routing called
→ Suggestion returned
→ Diff UI rendered
```

---

## Compile Flow

```
User saves
→ Compile triggered
→ Logs streamed
→ Preview refreshed
```

---

# TDD REQUIREMENTS

## Editor Tests

* Syntax highlighting loads correctly
* Inline suggestions render correctly
* Cursor context extraction works

---

## Panel Tests

* Preview updates after compile
* Proposed changes list syncs with AI output

---

## Interaction Tests

* Accept suggestion updates editor
* Reject suggestion removes overlay

---

# PERFORMANCE TARGETS

Editor latency → < 50ms typing delay
Compile preview → < 2s refresh
AI suggestion → < 3s response

---

# ACCESSIBILITY

Must support:

* Keyboard navigation
* Screen reader labels
* High contrast mode

---

# OPTIONAL (IF EASY)

* Command palette
* Dark / darker theme toggle
* Multi-cursor presence

---

# OUTPUT REQUIREMENTS

Agent must deliver:

1. Component tree
2. UI state machine
3. Tailwind or CSS tokens
4. Test cases
5. Storybook components
6. Basic working UI shell

---
