# Tnega: Unified Multi-Agent Control Plane & Dashboard

Tnega is a centralized **Management, Monitoring, and Control Plane** designed for orchestrating advanced AI agent runtimes—specifically **Antigravity Core**, **Claude Code** (Anthropic), and **Codex Engine**—alongside custom models and providers. 

It unifies disparate agent ecosystems into a single visual dashboard, providing real-time telemetry, a shared skill catalog, task execution monitoring, and an event-driven automation engine.

---

## ✨ Features & Capabilities

### 🤖 1. Multi-Agent & Subagent Observability
* **Centralized Dashboard**: View, inspect, and monitor all your active AI runtimes in a single unified interface.
* **Subagent Telemetry**: Real-time listing and tracking of all active subagents (both static and dynamically spawned) running across Antigravity, Claude, and Codex.
* **Model & Provider Management**: Monitor, toggle, and manage active models (including Google Gemini, Anthropic Claude, OpenAI, and custom local models) and their API providers from a central control panel.

### 🎛️ 2. Cross-Runtime Skill Assignment Matrix
Tnega bridges the gap between different AI frameworks by normalizing capabilities into a unified catalog.
* **Define Once, Run Anywhere**: Define a skill (capabilities, custom commands, or scripts) from any source—whether it's a Claude tool, a Codex system/user/plugin skill, or a Gemini capability.
* **Flexible Assignment Matrix**: Map and assign those skills directly to any executor target:
  - **Claude Agents & Subagents** (persisted in `.claude/`)
  - **Codex Agents & Roles** (synced to the local `~/.codex/` directory path)
  - **Antigravity Core Agents & Dynamic Subagents**
  - **Specific Models & Providers** (assign capabilities directly to models/providers so any agent utilizing them inherits those skills)

### 🔗 3. Event-Driven Hook Engine
* **Git Hook Integration**: Automatically installs `.git/hooks/pre-commit` and `.git/hooks/pre-push` hooks when the backend server boots.
* **Automated Review Workflows**: Setup automated tasks triggered on `git.push`, `git.commit`, or debounced `file.change` events.
* **Auto-Review Execution**: On trigger, Tnega extracts the active `git diff` and passes it to your selected agent (Antigravity Core, Claude Code, or Codex Engine) with a customizable prompt (e.g., *"Audit changes for security, performance, and code quality"*), streaming output in real-time to the dashboard.

### 📊 4. Telemetry, System Health & Background Tasks
* **Resource Telemetry**: Monitor CPU load, RAM usage, storage states, active agent status, and event feeds in real-time via WebSockets.
* **Background Tasks & CLI Sessions**: Start, monitor, kill, and interact with running shell/CLI tasks and background agent processes directly from the UI terminal.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, WebSockets.
- **Backend**: Node.js, Express, TypeScript (`tsx`), Chokidar (file watching), WS.
- **Persistence**: Local JSON/Markdown files located in `~/.gemini/antigravity/` and `.claude/`.

---

## 🚀 Quick Start

You can run both the frontend dashboard and backend control plane concurrently from the project root.

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (v18+) and [Git](https://git-scm.com/) installed.

### 2. Installation
Clone the repository and install dependencies at the root:
```bash
npm install
```

### 3. Run the Development Server
Run the unified launch script:
```bash
npm run dev
```
This command runs:
- **Frontend Dashboard** on [http://localhost:3000](http://localhost:3000)
- **Backend Control Plane** on [http://localhost:8000](http://localhost:8000)

---

## ⚙️ How the Unified Skill Assignment Matrix Works

```
                        [Unified Skill Catalog]
              (Claude Skills, Codex Skills, Gemini Skills)
                                   │
                                   ├───► Assign to: Claude Agent/Subagent (.claude/)
                                   ├───► Assign to: Codex Agent/Role (~/.codex/)
                                   ├───► Assign to: Antigravity Agent & Subagents
                                   └───► Assign to: Custom Model or Provider
```

1. **Register/Sync Skills**: The backend automatically scans local `.claude/skills.json`, the user's Codex home (`~/.codex/skills/`, `~/.codex/plugins/`), and Gemini settings.
2. **Assign via Matrix**: Using the **Skills** matrix tab on the dashboard, select any skill and bind it to one or more targets (e.g., assign a Codex refactoring skill to a Claude subagent, or an Antigravity code search skill to a Codex primary agent).
3. **Metadata Synchronization**: Tnega saves these cross-runtime assignments in `.claude/data/skill_assignments.json`. Runtimes automatically read this assignment metadata on execution to resolve dynamic skills.

---

## ⚙️ How the Hook Engine Works

```
[Git Commit/Push] or [File Change]
              │
              ▼
    Tnega Express Hook API ◄─── (Curls from .git/hooks)
              │
              ▼
    Capture "git diff HEAD"
              │
              ▼
   Build Agent Command (e.g., `claude -p "..."` or `antigravity "..."`)
              │
              ▼
Execute Agent Background Process & Stream Results to Dashboard Activity Feed
```

1. **Create Hook**: Go to the **System Hooks** tab in the dashboard.
2. **Configure Event**:
   - **Trigger**: Select `git.commit`, `git.push`, or `file.change` (debounced file modifications).
   - **Executor**: Select which AI agent (Antigravity Core, Claude Code, Codex, or raw Shell command) will run the action.
   - **Action/Prompt**: Set the prompt for the agent (e.g., *"Analyze this code for security issues and performance bottlenecks."*).
3. **Automatic Execution**: When you commit/push code in your terminal, the Git hook curls the Tnega API. The backend retrieves the `git diff`, packages it with your prompt, runs the AI executor in the background, and streams stdout/stderr directly to the dashboard logs.

---

## 📁 Repository Structure

```
├── backend-node/         # Express & WebSocket Server (Control Plane)
│   ├── lib/              # Unified Skills & Codex Inventory Helpers
│   ├── server.ts         # Main Express API and Hook Engine
│   └── package.json
├── src/                  # Next.js 16 Frontend App
│   ├── app/              # Router Pages & Layouts
│   ├── components/       # Dashboard components (Terminal, SkillManager, etc.)
│   ├── lib/              # API Client wrappers
│   └── types/            # TypeScript interfaces
├── .claude/              # Local skills, tasks and configs (migrated on boot)
├── README.md             # This documentation
├── CLAUDE.md             # Development guidelines for AI workers
└── package.json          # Root scripts and workspace concurrent dependencies
```

---

## 🛡️ License

This project is licensed under the [MIT License](LICENSE).
