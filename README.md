# AI Writing Studio — Desktop App

A desktop writing companion built with **Node.js, Electron, React, and TipTap**, featuring local Markdown storage, Gemini AI companion, parallel diff comparison, Git-style chunk-level accept/reject, and time-travel version restoration.

---

## 🚀 Quick Start

To launch the desktop application:

```bash
# In C:\Users\stefa\.gemini\antigravity\scratch\ai-writer-app
npm start
```

Or for live development with hot reload:
```bash
npm run app
```

---

## ✨ Features

### 1. Rich Text & Markdown Editor
- Powered by **TipTap** (ProseMirror engine).
- Formatting toolbar: Headings (H1, H2, H3), Bold, Italic, Strikethrough, Bullet Lists, Numbered Lists, Blockquotes, Code Blocks, Horizontal rules, Undo/Redo.
- Automatic bi-directional Markdown sync.
- Continuous auto-save directly to local `.md` files.

### 2. Gemini AI Writing Companion
- Powered by `@google/generative-ai` with your personal Gemini API key.
- Modes:
  - **Polish Prose**: Refines rhythm, grammar, and vocabulary without losing voice.
  - **Continue & Expand**: Elaborates on core ideas and drives the narrative forward.
  - **Make Concise**: Trims wordiness and tightens phrasing.
  - **Shift Tone**: Rephrase in Academic, Persuasive, Poetic, Executive, or Witty tones.
  - **Editorial Review**: Generates high-level constructive critiques with actionable recommendations.
  - **Custom Prompt**: Give any custom instruction (e.g., *"Make this dialogue suspenseful"*).
- Target scope: Apply to the **Entire Document** or only to **Highlighted/Selected Text**.

### 3. Parallel Version Window & Git-like Diff Merging
- Parallel side-by-side view: **Original Draft** (left) vs. **AI Proposal** (right).
- Visual diff highlights:
  - Additions in green (`+`)
  - Deletions in red (`-`)
  - Modified sentences with word-level diff highlights
- **Granular chunk-level decision making**:
  - Accept (`✓`) or Reject (`✗`) each changed block individually.
  - Bulk actions: **Accept All**, **Reject All**, or **Reset**.
  - **Apply to Document**: Merges your accepted decisions into your active document and automatically records a version checkpoint.

### 4. Time-Travel Version History & Restore
- Every manual save (`Save Checkpoint`), auto-save milestone, or accepted AI merge creates a snapshot.
- Open **History** to view all recorded versions, timestamps, and word counts.
- Preview any previous version's full text.
- One-click **"Restore This Version"** restores the document state while safely archiving newer edits.

### 5. Local Storage & Privacy
- Documents are saved as standard `.md` Markdown files in your local storage folder (customizable in **Settings**).
- Your Gemini API key is stored only on your machine.

---

## 🛠 Project Structure

```
ai-writer-app/
├── electron/
│   ├── main.cjs         # Electron main process (IPC, file operations, versioning, Gemini API)
│   └── preload.cjs      # Secure context bridge exposing window.electronAPI
├── src/
│   ├── components/
│   │   ├── AiAssistantBar.tsx    # AI prompt bar & mode selector
│   │   ├── Editor.tsx            # TipTap rich text editor
│   │   ├── ParallelDiffView.tsx  # Side-by-side diff comparison & Git-style chunk merge
│   │   ├── SettingsModal.tsx     # Gemini API key & model settings
│   │   ├── Sidebar.tsx           # Document navigator & search
│   │   └── VersionHistory.tsx    # Checkpoints timeline & restore drawer
│   ├── utils/
│   │   ├── diffHelper.ts         # Line/word-level diff algorithms & merge assembly
│   │   └── markdownHelper.ts     # HTML <-> Markdown converter
│   ├── types.ts                  # TypeScript interfaces
│   ├── App.tsx                   # Main application layout & state coordinator
│   ├── main.tsx                  # React entry point
│   └── index.css                 # Tailwind & typography styling
├── package.json
└── vite.config.ts
```
