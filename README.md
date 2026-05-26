# Tnega: Unified Multi-Agent Control Plane & Dashboard

Tnega is a centralized **Management, Monitoring, and Control Plane** designed for orchestrating advanced AI agent runtimes—specifically **Antigravity Core**, **Claude Code** (Anthropic), and **Codex Engine**—alongside custom models and providers. 

It unifies disparate agent ecosystems into a single visual dashboard, providing real-time telemetry, a shared skill catalog, task execution monitoring, and an event-driven automation engine.

---

## ✨ Features

- 🤖 **Unified AI Control Plane**: Monitor, configure, and manage active agents, subagents, models, and providers (Gemini, Anthropic, Codex, OpenAI, local runners) in one unified interface.
- 🔗 **Event-Driven Hook Engine**: 
  - **Git Hook Integration**: Automatically installs `.git/hooks/pre-commit` and `.git/hooks/pre-push` hooks when the backend server boots.
  - **Automated Workflows**: Define actions triggered by `git.push`, `git.commit`, or real-time `file.change` events.
  - **Auto-Review Execution**: On trigger, Tnega captures the active `git diff` and forwards it to your agent of choice (Antigravity Core, Claude Code, or Codex Engine) with a customizable prompt (e.g., *"Perform a security audit"*).
- 🎛️ **Unified Skill Catalog & Matrix**:
  - Aggregates capabilities and skills across frameworks (Claude's settings, Codex system/plugin/user skills, Gemini skills).
  - Map specific skills to specific targets (agents, subagents, models, or API providers) through an interactive matrix.
- 📊 **Real-time System Telemetry & Health**: Monitor CPU load, RAM usage, storage states, active agent status, and event feeds in real-time via WebSockets.
- 💻 **CLI Sessions & Terminal**: Manage and monitor active terminal sessions and command runs in the background.
- 📂 **Global Configuration Store**: Centralizes configs at `~/.gemini/antigravity/` with automated data migration from local paths.

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
3. **Automatic Execution**: When you make a commit/push in your terminal, the Git hook curls the Tnega API. The backend retrieves the `git diff`, packages it with your prompt, runs the AI executor in the background, and streams stdout/stderr directly to the dashboard logs.

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
