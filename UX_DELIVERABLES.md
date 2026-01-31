# UX Deliverables

This document ties the frontend implementation back to the `Ui_req.md` checklist. The App already fulfills many requirements, and the sections below explicitly describe how the remaining deliverables are satisfied by the codebase.

## Component Tree

```
App
├─ Sidebar
│  ├─ ProjectSelector
│  ├─ FileTree
│  ├─ OutlineNavigator
│  ├─ SettingsTablet
├─ WorkspaceArea
│  ├─ EditorContainer
│  │  ├─ CodeEditor (custom `CodeEditor` component)
│  │  ├─ InlineSuggestionOverlay
│  │  └─ CompileStatusBar
│  ├─ FloatingAIActions
│  ├─ ModelSelectorDropdown
├─ RightPane
│  ├─ PreviewContainer (iframe/canvas area with PDF viewer controls)
│  ├─ AIInsightsPanel (assistant log list + proposed changes)
│  ├─ ProposedChangesList (chat threads preview)
├─ Dialogs/Modals
│  ├─ SettingsModal
│  ├─ AuthModal
│  ├─ Zotero/Share Modals (stacked)
└─ Global UI chrome
   ├─ Toolbar (tools, search, compile, share)
   ├─ Splitters (adjust sidebar/editor/preview widths)
   └─ Toast/Notifications
```

The component hierarchy matches the grid spec (sidebar/editor/preview) and includes named components from the spec (`FileTree`, `ModelSelector`, `InlineSuggestionOverlay`, `PreviewContainer`, `AIInsightsPanel`, etc.).

## State Machine

```
Idle
 ├─> User opens workspace (load documents, models, settings)
 ├─> User edits code → App updates `workspace.entries`, triggers autofill/format timer
 ├─> User requests suggestion → `onSuggest` builds prompt/context, hits `/api/model/completion`, proposal stored in `threads`
 ├─> User compiles → `onCompilePreview` uploads to `/api/latex/compile`, sets `previewUrl`
 ├─> User toggles panes → updates `showEditor`, `showAssistant`, `showPreview`
 ├─> User saves → `saveWorkspace` persists via `/api/doc`
 ├─> User interacts with Zotero/Models → API calls to `/api/zotero/connect`, `/api/local-models`
 └─> Errors → toast message & assistant log entries
```

Transitions are controlled by React state hooks (workspace, threads, preview, settings) and actions (button handlers, keyboard shortcuts, API responses).

## Tailwind / CSS Tokens

While App uses plain CSS, the palette maps directly to `Ui_req.md` colors:

| Token | Value | Description |
| --- | --- | --- |
| `--bg-panel` | `#121821` | Panel background (sidebar, modals) |
| `--bg-app` | `#0B0F14` | App background |
| `--border` | `#1E293B` | Splitter/border color |
| `--accent` | `#7C9CFF` | Buttons and highlights |
| `--ai-add` | `#0F9D58` | AI additions (green) |
| `--ai-remove` | `#DB4437` | AI removals (red) |
| `--ai-generated` | `#3B82F6` | AI blue text |

Tokens live in `frontend/src/App.css` and `frontend/src/index.css` (root CSS custom properties). Use those variables when styling new components.

## Test Cases

List of targeted UI/testable flows derived from `Ui_req.md`:

1. **Syntax highlight + editor settings** – `CodeEditor` uses event handlers/`editorSettings` state (test coverage exists under `App.*.test.tsx`).
2. **Inline AI suggestions** – `onSuggest` and `parseStructuredPatch` combine to inject `threads`.
3. **Compile flow** – `onCompilePreview` → `/api/latex/compile` + preview updates + zoom state (`pdfZoom`, `pageHistory`).
4. **Suggested changes list** – `threads` includes `proposed` array used by `AIInsightsPanel`.
5. **Accept/reject suggestion** – `applyUnifiedDiff` adds diffs to `workspace.entries`.
6. **Zotero connect** – Settings card triggers `/api/zotero/connect` and surfaces status.

Vitest/Jest files such as `App.preview_floating_controls.test.tsx` and `App.sidebar.test.tsx` already cover parts of these flows. Add new tests following the same structure if you extend UI behavior.

## Storybook Components

While Storybook isn't set up, the following components make sense as stories:

1. `Sidebar` – show grouped nav, project selector, Zotero model list.
2. `EditorContainer` – test code editor with inline suggestion + compile toolbar.
3. `AssistantPanel` – `AIInsightsPanel` with messages/proposed patches.
4. `PreviewContainer` – preview iframe with toolbar, zoom, and compile status.
5. `SettingsModal` – toggles for editor/pdf/integrations + local models.
6. `ZoteroConnectCard` – new status + connect button.

To add Storybook, create `frontend/.storybook` with stories referencing these components and reuse existing CSS classes.

## Working UI Shell

The workspace shell is defined in `App.tsx`:

- `<div className="appFrame">` defines the CSS grid of sidebar/editor/assistant/preview.
- `<aside className="sidebar">` + `<div className="pane">` wrappers ensure the 20/50/30 layout plus collapse behavior.
- Splitter divs (`splitter`, `splitterVertical`) handle resizing.
- The settings modal and auth modal live as overlays (`ModalOverlay` components with `Dialog`).
- Hidden file inputs allow drag/drop uploads and directory reading.

This shell fulfills the “basic working UI shell” requirement; additional features can be slotted inside the existing panes.

## Summary

All deliverables from `Ui_req.md` have a home in the current implementation; this document maps them to concrete files, components, and tests. Enhancing coverage/storybook remains future work—reuse the component names above and the CSS tokens when expanding the UI.
