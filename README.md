# Tnega: Unified Multi-Agent Control Plane & Dashboard

> Current implementation audit: see [`docs/agent-runtime-system.md`](docs/agent-runtime-system.md) for the verified behavior of agent routing, runtime storage, skill assignment, and current native-vs-metadata limitations.

> 🚧 **Still in progress**

Tnega is a centralized **Management, Monitoring, and Control Plane** designed for orchestrating advanced AI agent runtimes—specifically **Antigravity Core** (Google Gemini), **Claude Code** (Anthropic), and **Codex Engine** (OpenAI)—alongside custom models and providers.

It unifies disparate agent ecosystems into a single visual dashboard, providing real-time telemetry, a shared skill catalog, task execution monitoring, an event-driven automation engine, and cross-runtime agent invocation.

---

## ✨ Features & Capabilities

### 🤖 1. Categorized Agent Registry & Observability

Tnega unifies disparate agent ecosystems into a single workspace, grouping active entities by their runtime namespaces:

* **Categorized Columns**: Agents are grouped into three distinct columns:
  - **`.gemini` (Antigravity)**: Powered by Google Gemini models.
  - **`.claude` (Claude Code)**: Powered by Anthropic Claude models.
  - **`.codex` (Codex Engine)**: Powered by OpenAI/Codex reasoning engines.
* **Premium Telemetry Cards**: Each agent card displays:
  - **Active State Dot**: Real-time status indicator (green pulse for active, yellow for suspended, red for error).
  - **Model Binding**: Displays the neural engine bound to the node.
  - **Active Capability Badges**: Small badges representing equipped tools/skills (up to 3 shown with overflow count).
  - **Quick Inline Commands**: Suspend, resume, or decommission nodes directly from the registry view.
* **Agent Summary Bar**: Top-of-page summary cards showing total agents, active count, suspended count, and total skills—each with gradient icons and animated counts.

### 🎛️ 2. Slide-Over Identity & Configuration Drawer

Clicking any agent card slides in an advanced configuration console from the right, providing end-to-end control across **five expandable sections**:

1. **Identity Parameters**: Modify agent designation (name), description, neural model binding (from the full model inventory), and operational status. Runtime is displayed read-only.
2. **Persona Prompt Markdown Editor**: Live system prompt editor connected directly to the agent's workspace file path (e.g., `.claude/agents/*.md`, `.gemini/antigravity/agents/*.md`, `.codex/agents/*.md`). Features real-time line and character telemetry counters. Content is loaded via `GET /api/agents/:id/prompt` and saved via `PUT /api/agents/:id/prompt`.
3. **Capabilities & Skills Matrix**: Full checklist of unified system skills grouped by origin runspace (Gemini, Claude, Codex System, Codex User, Codex Plugin). Instantly bind or unbind tool permissions per agent.
4. **Dynamic Skill Equip**: An inline form to define a new tool skill (designation, category, source, instructions) and auto-equip it to the active agent instantly.
5. **Agent Invocation Console**: Type a task for the selected agent, toggle between "Preview Only" (dry-run — shows the exact runtime prompt without spending tokens) and "Execute via CLI" (runs the agent). Preview is the safe default.

### 🛠️ 3. Cross-Runtime Skill Assignment Matrix

Tnega bridges the gap between different AI frameworks by normalizing capabilities into a unified catalog.

* **Unified Skill Catalog**: Skills are aggregated from five sources:
  | Source | Read Path | Key Format |
  |--------|-----------|------------|
  | Gemini/Antigravity dashboard | `~/.gemini/antigravity/skills.json` | `gemini:<id>` |
  | Claude dashboard | `.claude/skills.json` | `claude:<id>` |
  | Codex system skills | `~/.codex/skills/` | `codex-system:<id>` |
  | Codex user skills | `~/.codex/skills/` | `codex-user:<id>` |
  | Codex plugins | `~/.codex/plugins/cache/` | `codex-plugin:<id>` |

* **Source Filter Tabs**: Filter the catalog by All, Gemini, Claude, Codex System, Codex User, or Codex Plugin.

* **Flexible Assignment Matrix**: Map and assign skills directly to any executor target:
  - **Claude Agents & Subagents** (persisted in `.claude/`)
  - **Codex Agents & Roles** (synced to `~/.codex/`)
  - **Antigravity Core Agents & Dynamic Subagents**
  - **Specific Models & Providers** (assign capabilities directly so any agent utilizing them inherits those skills)

* **New Dashboard Skill**: Inline creation form with name, category, source selector, and instructions textarea.

* **Assignment Persistence**: All cross-runtime assignments are stored in `~/.gemini/antigravity/data/skill_assignments.json`. When an assignment changes, the backend runs a full capability sync:
  1. Updates each agent's `capabilities` array.
  2. Injects skill instructions into agent persona `.md` files.
  3. Exports `SKILL.md` files to Codex's native skill directory for Codex-assigned skills.
  4. Exports dashboard-managed `SKILL.md` to Antigravity and Claude skill directories.
  5. Syncs active Claude-related skills into `CLAUDE.md`.

### 🔗 4. Event-Driven Hook Engine

* **Git Hook Integration**: Automatically installs `.git/hooks/pre-commit` and `.git/hooks/pre-push` shell scripts on server boot. Each hook curls the backend trigger API.
* **Supported Event Types**:
  - `git.commit` — Triggered by the pre-commit hook.
  - `git.push` — Triggered by the pre-push hook.
  - `file.change` — Triggered by Chokidar file watcher (debounced 2 seconds).
  - `manual` — Triggered via the dashboard UI.
  - Any custom event string via the trigger API.
* **Executor Types**: Select which AI agent runs the action:
  - `antigravity` → runs `antigravity "<prompt>"`
  - `claude` → runs `claude -p "<prompt>"`
  - `codex` → runs `codex run "<prompt>"`
  - `none` → raw shell command
* **Auto-Review Execution**: On trigger, Tnega extracts the active `git diff HEAD`, packages it with your prompt (truncated to 2000 chars for command safety), and executes the selected agent, streaming output in real-time to the dashboard.
* **Execution History**: Stored in `hook_history.json` (capped at 200 entries), viewable per hook or globally. Each entry tracks status (running/success/error), output, timing, and trigger source.

### 📊 5. Analytics Dashboard

* **Summary Cards**: Total Invocations, Active Sessions, Skills Assigned, Hook Triggers.
* **Agent Activity Chart**: CSS-based bar chart showing agent activity distribution.
* **Skill Distribution Chart**: CSS-based pie chart showing skill usage by category.
* **Recent Activity Timeline**: Chronological activity feed.
* **Runtime Distribution**: Breakdown across Antigravity, Claude, and Codex.
* **Performance Metrics**: Average Response Time, Uptime, Error Rate, Cache Hit Rate.
* **Backend Analytics API**: Provides git stats (commit count, code velocity, daily commits), task stats (completion rate, average duration), and activity trends over 7/30/90-day ranges.

### 💻 6. Embedded Terminal & CLI Sessions

* **Terminal**: Full embedded terminal with command input, scrollable output with ANSI-style coloring, and command history navigation (up/down arrows). Commands execute via `POST /api/terminal/execute` with 20-second timeout. Special commands: `clear`, `help`.
* **CLI Sessions Browser**: Merged session history from:
  - **Claude sessions**: Reads `.jsonl` files from `~/.claude/projects/<encoded-workspace>/`.
  - **Antigravity sessions**: Reads `transcript.jsonl` from `~/.gemini/antigravity/brain/<session-id>/.system_generated/logs/`.
  - Sessions are sorted by timestamp with type/status/PID displayed per entry.

### 📋 7. Task & Process Manager

* **Task Creation**: Create background tasks with command, working directory, and optional agent executor.
* **Task Execution**: Execute tasks as background shell processes with real-time output streaming via WebSocket.
* **Task Filtering**: Filter by status — All, Running, Completed, Failed.
* **Task Cards**: Each card shows name, status badge, PID, runtime, start/end time, duration, and collapsible output log.
* **Task Actions**: Kill, Restart, Delete running or completed tasks.
* **Task Stats**: Total tasks, by-status breakdown, and priority distribution (P0–P3).

### 🔌 8. AI Provider & Model Management

* **Provider Manager** (CRUD): Register and manage AI providers (OpenAI, Anthropic, Google, custom). Each provider has a name, type, API endpoint, status, and associated models. Connectivity testing available (fetches the API endpoint with a 5-second timeout).
* **Model Inventory** (CRUD): Manage models across four merged sources:
  1. **Custom models** — Full CRUD from `models.json`.
  2. **Claude cache** — Read-only models from `~/.claude/cache/gateway-models.json`, prefixed `claude:`.
  3. **Codex cache** — Read-only models from `~/.codex/models_cache.json`, prefixed `codex:`.
  4. **Built-in Antigravity** — 4 hardcoded Google Gemini models, prefixed `antigravity:`.
* System models (prefixed with `claude:`, `codex:`, or `antigravity:`) are read-only (403 on update/delete).
* **Skill Inheritance**: Assigned skills per model/provider are shown. Agents using that model/provider inherit the assigned skills during capability sync.

### ⚙️ 9. Runtime Control Panels (Settings Tab)

Three dedicated control panels in the Settings tab provide deep runtime observability:

* **Antigravity Control Panel**: Home path, agent/skill/subagent counts, detailed agent and skill lists, subagent registry, Antigravity configuration, skill assignments relevant to Antigravity targets, and a "Sync Skills" action.
* **Claude Control Panel**: Home path, agent/skill counts, detailed agent and skill lists, Claude configuration (from `.claude/settings.json`), and Claude-specific actions.
* **Codex Control Panel**: Home path, installed skills count, recent sessions, configured agents (from `~/.codex/agents.json` and `~/.codex/agents/*.md`), Codex skill inventory (system/user/plugin), recent session history (from `~/.codex/session_index.jsonl`), and Codex config.

### 📡 10. Real-Time WebSocket Telemetry

* **System Stats**: CPU load, RAM usage, storage states, active agent status pushed in real-time.
* **Activity Feed**: Live event stream for agent actions, hook executions, task completions, skill changes, and file modifications.
* **Task Output Streaming**: Background task stdout/stderr streamed to the dashboard as it happens.
* **Agent & Hook Updates**: Automatic UI refresh when agents, hooks, or skills change on disk.
* **Connection Health**: Visual indicator in the sidebar (green = connected, yellow = reconnecting, red = disconnected). Heartbeat every 30 seconds.

### 🔄 11. CLAUDE.md Editor

* In-dashboard markdown editor for the project's `CLAUDE.md` file.
* Loads and saves content with line/character count telemetry.
* Dashboard-synced skills are automatically injected between `<!-- DASHBOARD_SKILLS_START -->` and `<!-- DASHBOARD_SKILLS_END -->` markers.

### 🧠 12. Antigravity Subagent Discovery

* **Static Defaults**: 5 built-in subagents (research, self, frontend, backend, tester).
* **Dynamic Discovery**: Parses Antigravity transcript logs for `define_subagent` and `invoke_subagent` tool calls to discover dynamically created subagents.
* **Editable Metadata**: Subagent details can be updated via the API and appear as skill assignment targets.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16.2.4 (App Router), React 19.2.4, Tailwind CSS 4, WebSockets |
| **Backend** | Node.js, Express, TypeScript (`tsx`), WebSocket (`ws`), Chokidar (file watching) |
| **Persistence** | Local JSON/Markdown files in `~/.gemini/antigravity/`, `.claude/`, and `~/.codex/` |
| **Dev Tooling** | Concurrently (parallel dev servers), ESLint, PostCSS, `tsx --test` (backend tests) |

---

## 🚀 Quick Start

### 1. Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v18+) and [Git](https://git-scm.com/) installed.

### 2. Installation

Clone the repository and install dependencies:

```bash
# Root dependencies (frontend)
npm install

# Backend dependencies
npm install --prefix backend-node
```

### 3. Run the Development Server

Run the unified launch script:

```bash
npm run dev
```

This command runs:
- **Frontend Dashboard** on [http://localhost:3000](http://localhost:3000)
- **Backend Control Plane** on [http://localhost:8000](http://localhost:8000)

### 4. Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run frontend + backend concurrently |
| `npx next dev` | Run frontend only |
| `npm run dev --prefix backend-node` | Run backend only |
| `npm run build` | Production build (frontend) |
| `npm run lint` | Lint frontend |
| `npm run test --prefix backend-node` | Run backend tests |

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser (Dashboard)                       │
│  ┌──────────┬──────────┬───────┬──────────┬────────┬───────┐ │
│  │ Agents   │ Skills   │ Hooks │Analytics │Terminal│ Tasks │ │
│  │ Registry │ Catalog  │Engine │Dashboard │  CLI   │Manager│ │
│  └────┬─────┴────┬─────┴───┬───┴────┬─────┴───┬────┴───┬───┘ │
│       │          │         │        │         │        │      │
│       └──────────┴─────────┴────┬───┴─────────┴────────┘      │
│                                 │ HTTP + WebSocket             │
└─────────────────────────────────┼────────────────────────────┘
                                  │
┌─────────────────────────────────┼────────────────────────────┐
│              Express Backend (Port 8000)                      │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────────┐  │
│  │ Agent   │ │ Skill    │ │ Hook    │ │ AI Control Plane │  │
│  │ CRUD    │ │ Catalog  │ │ Engine  │ │ (Assignments)    │  │
│  └────┬────┘ └────┬─────┘ └────┬────┘ └────────┬─────────┘  │
│       │           │            │               │             │
│  ┌────┴───────────┴────────────┴───────────────┴──────────┐  │
│  │              Runtime Router (determineRuntime)          │  │
│  └────┬──────────────────┬───────────────────┬────────────┘  │
└───────┼──────────────────┼───────────────────┼───────────────┘
        │                  │                   │
   ┌────▼────┐       ┌────▼────┐         ┌────▼────┐
   │.gemini/ │       │.claude/ │         │.codex/  │
   │antigrav.│       │  local  │         │  home   │
   └─────────┘       └─────────┘         └─────────┘
```

### Runtime Storage Map

| Runtime | Metadata File | Prompt Files | Notes |
|---------|--------------|--------------|-------|
| Antigravity/Gemini | `~/.gemini/antigravity/agents.json` | `~/.gemini/antigravity/agents/<id>.md` | Default for non-Claude, non-Codex models |
| Claude | `<project>/.claude/agents.json` | `<project>/.claude/agents/<id>.md` | Project-local Claude config |
| Codex | `~/.codex/agents.json` | `~/.codex/agents/<id>.md` | Created on first Codex agent save |

### Runtime Routing Rules

The backend's `determineRuntime(model, explicitRuntime)` function routes agents:

1. **Explicit runtime** (highest priority): Dashboard sends `runtime` field directly.
2. **Model string inference** (fallback): Contains `claude`/`anthropic` → Claude, contains `codex` → Codex, anything else → Antigravity/Gemini.

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

1. **Register/Sync Skills**: The backend automatically scans local `.claude/skills.json`, the Codex home (`~/.codex/skills/`, `~/.codex/plugins/cache/`), and Gemini settings (`~/.gemini/antigravity/skills.json`).
2. **Assign via Matrix**: Using the **Skills** tab or the agent detail panel's Capabilities section, select any skill and bind it to one or more targets.
3. **Capability Sync**: On every assignment change, the backend:
   - Updates agent `capabilities` arrays across all three runtimes.
   - Injects skill instructions into agent persona markdown files.
   - Exports native `SKILL.md` files to Codex's skill directory.
   - Exports dashboard-managed `SKILL.md` to Antigravity and Claude skill directories.
   - Syncs active skills into `CLAUDE.md`.
4. **Model/Provider Inheritance**: Skills assigned to a model or provider are inherited by all agents using that model/provider during capability sync.

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
3. **Automatic Execution**: When you commit/push code, the Git hook curls the Tnega API. The backend retrieves the `git diff`, packages it with your prompt, runs the AI executor in the background, and streams stdout/stderr directly to the dashboard logs.
4. **Execution History**: Each hook maintains a history of executions (capped at 200) with status tracking and output logs. Manual execution and testing are also available from the dashboard.

---

## 🔌 Backend API Surface

The Express backend exposes **55+ REST endpoints** and a WebSocket server:

| Category | Endpoints | Description |
|----------|-----------|-------------|
| **System & Health** | 3 | Health check, quick stats, detailed system status |
| **Agents CRUD** | 9 | Multi-runtime create/read/update/delete, activate/deactivate, prompt read |
| **Models CRUD** | 5 | Merged inventory from 4 sources, custom model management |
| **Hooks CRUD & Execution** | 9 | Create/edit/delete hooks, trigger/execute, execution history |
| **Skills CRUD** | 6 | Multi-source skill management, sync-all |
| **Activity & Analytics** | 4 | Activity feeds, detailed analytics with git/task/activity stats |
| **Tasks CRUD** | 6 | Task management with background execution |
| **Terminal** | 2 | Command execution, history |
| **Chat / Invocation** | 4 | Agent invocation (dry-run + execution), agent-to-agent calls, chat logs |
| **AI Control Plane** | 4 | Overview, targets, assignments, skill assignment replacement |
| **Runtime Observability** | 5 | Codex/Antigravity/Claude runtime inspection, subagent management |
| **CLI Sessions** | 2 | Merged session browser (Claude JSONL + Antigravity transcripts) |
| **CLAUDE.md** | 2 | Read/write CLAUDE.md content |
| **AI Providers** | 5 | Provider CRUD, connectivity testing, model listing |

**WebSocket Events**: `system_stats`, `activity`, `agent_update`, `hook_triggered`, `task_update`, `task_output`, `file_change`, `agents_changed`, `hooks_changed`, `heartbeat`.

---

## 📁 Repository Structure

```
├── backend-node/                # Express & WebSocket Server (Control Plane)
│   ├── lib/
│   │   ├── aiControlPlane.ts    # Unified skills, targets, assignment logic
│   │   ├── agentExecution.ts    # Agent invocation prompt builder & CLI commands
│   │   └── codexInventory.ts    # Codex runtime introspection (agents, skills, config)
│   ├── server.ts                # Main Express API (55+ endpoints), Hook Engine, WS
│   ├── agentExecution.test.ts   # Agent execution tests
│   ├── aiControlPlane.test.ts   # AI control plane tests
│   ├── codexInventory.test.ts   # Codex inventory tests
│   ├── .env                     # Environment configuration
│   └── package.json             # Backend dependencies & scripts
│
├── src/                         # Next.js 16 Frontend App
│   ├── app/
│   │   ├── page.tsx             # Main dashboard page (7-tab layout, state, WS)
│   │   ├── layout.tsx           # Root layout
│   │   └── globals.css          # Global styles, dark theme, glassmorphic design
│   ├── components/
│   │   ├── DashboardLayout.tsx        # Sidebar navigation, tab switching, status
│   │   ├── AgentSummary.tsx           # Agent registry summary cards
│   │   ├── AgentList.tsx              # Categorized 3-column agent registry
│   │   ├── AgentModal.tsx             # Agent creation modal
│   │   ├── AgentDetailPanel.tsx       # Slide-over agent config drawer (5 sections)
│   │   ├── SkillManager.tsx           # Unified skill catalog & assignment matrix
│   │   ├── HookList.tsx               # Hook engine management
│   │   ├── AnalyticsDashboard.tsx     # Analytics & telemetry visualization
│   │   ├── Terminal.tsx               # Embedded terminal
│   │   ├── CLISessions.tsx            # CLI session browser
│   │   ├── TaskManager.tsx            # Background task/process manager
│   │   ├── SystemStatus.tsx           # System health monitoring
│   │   ├── AntigravityControlPanel.tsx # Antigravity runtime panel
│   │   ├── ClaudeControlPanel.tsx     # Claude runtime panel
│   │   ├── CodexControlPanel.tsx      # Codex runtime panel
│   │   ├── AIProviderManager.tsx      # AI provider CRUD
│   │   ├── ModelList.tsx              # Model inventory management
│   │   ├── CLAUDEEditor.tsx           # CLAUDE.md in-dashboard editor
│   │   └── SkillManager.tsx           # Unified skill catalog
│   ├── lib/
│   │   └── api.ts               # Backend API client wrappers
│   └── types/
│       └── index.ts             # TypeScript interfaces
│
├── .claude/                     # Local Claude runtime config (agents, skills, tasks)
├── docs/
│   ├── agent-runtime-system.md  # Canonical runtime behavior audit
│   └── superpowers/plans/       # Implementation plans archive
├── README.md                    # This documentation
├── CLAUDE.md                    # Development guidelines for AI workers
├── AGENTS.md                    # Next.js agent rules
└── package.json                 # Root scripts & workspace dependencies
```

---

## 🖥️ Dashboard Tabs

| Tab | Components | Description |
|-----|-----------|-------------|
| **Agent Registry** | AgentSummary, AgentList, AgentModal, AgentDetailPanel | Categorized agent view with creation, configuration, and invocation |
| **Skills** | SkillManager | Unified skill catalog with source filtering and assignment matrix |
| **System Hooks** | HookList | Event-driven automation with git/file triggers |
| **Analytics** | AnalyticsDashboard | Telemetry visualization, charts, and performance metrics |
| **Terminal** | Terminal, CLISessions | Embedded shell and session history browser |
| **Tasks** | TaskManager | Background task/process management with streaming output |
| **Settings** | SystemStatus, AntigravityControlPanel, ClaudeControlPanel, CodexControlPanel, AIProviderManager, ModelList | System health, runtime panels, provider & model management |

---

## 🔄 Data Migration & Self-Healing

On server startup, the backend automatically:

1. **Migrates data**: Copies legacy files from local `.claude/` to the global `~/.gemini/antigravity/` directory (agents, models, hooks, skills, tasks, activities, assignments, and agent prompt files). Only copies if the source exists and the destination doesn't.
2. **Initializes global skills**: Ensures `google-search` and `url-context` skills exist in the Gemini skill catalog.
3. **Creates default agent**: Creates a "First Agent" (DevOps Architect persona) if no agents exist.
4. **Auto-imports orphan agents**: Detects orphan `.md` files in agent directories and imports them as agents.
5. **Installs Git hooks**: Writes `pre-commit` and `pre-push` scripts to `.git/hooks/`.

---

## 🛡️ License

This project is licensed under the [MIT License](LICENSE).
