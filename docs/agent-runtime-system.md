# Agent Runtime System: Current Behavior

Date checked: 2026-06-23

This document describes what the dashboard actually does today. It is not a target architecture document.

## Short Answers

- Codex, Gemini/Antigravity, and Claude agents are categorized in the UI in a 3-column view (`.gemini`, `.claude`, `.codex`).
- A newly created agent has an explicit runtime selection in the dashboard; model string is only fallback routing.
- The dashboard is a 14-tab Single Page Application managed in `page.tsx`, offering deep integration into agents, skills, hooks, analytics, background tasks, and terminal execution.
- Skill assignment works across runtimes as assignment metadata, agent capability updates, persona prompt injection, and dashboard-managed `SKILL.md` export.
- Agent invocation is wired through `POST /api/chat` and `POST /api/agents/call`; the runtime command prompt is built from the saved agent persona plus assigned skill instructions.
- Native runtime support is uneven: dashboard-created skills assigned to Codex are exported as Codex `SKILL.md`; Gemini/Antigravity and Claude receive dashboard-managed skill markdown plus prompt injection.
- Codex-created agents are written under `~/.codex` when the selected model resolves to Codex.
- Gemini/Antigravity-created agents are written under `~/.gemini/antigravity`.
- Claude-created agents are written under this repo's `.claude` directory.

## Runtime Storage Map

| Runtime | Source of truth used by backend | Metadata file | Prompt/persona files | Notes |
| --- | --- | --- | --- | --- |
| Antigravity / Gemini | `~/.gemini/antigravity` | `~/.gemini/antigravity/agents.json` | `~/.gemini/antigravity/agents/<agent-id>.md` | Default route for non-Claude, non-Codex models. |
| Claude | `<repo>/.claude` | `<repo>/.claude/agents.json` | `<repo>/.claude/agents/<agent-id>.md` | Separate local Claude dashboard config. |
| Codex | `~/.codex` | `~/.codex/agents.json` | `~/.codex/agents/<agent-id>.md` | Backend creates these files/folders when a Codex-routed agent is saved. |

## How Agent Runtime Routing Works

Backend routing is implemented by `determineRuntime(model, explicitRuntime)` in `backend-node/server.ts`.

Rules:

| Input | Runtime |
| --- | --- |
| Explicit `runtime: "claude"` | `claude` |
| Explicit `runtime: "codex"` | `codex` |
| Explicit `runtime: "antigravity"` or `"gemini"` | `antigravity` |
| Starts with `claude:` or contains `claude` or `anthropic` | `claude` |
| Starts with `codex:` or contains `codex` | `codex` |
| Anything else | `antigravity` |

## Agent Creation Flow

The create modal (`AgentModal.tsx`) collects:
- `name`
- `description`
- `model`
- `system_prompt`
- selected `skills` (from the unified AI overview)

Backend `POST /api/agents` creates:
- `id`: provided id or generated from the agent name
- `runtime`: calculated via `determineRuntime`
- `status: active`
- `capabilities`
- `config`
- Persona prompt saved to the respective `.md` file.

## Agent Categorization In The UI

`src/components/AgentList.tsx` groups agents into three columns:
- `.gemini`
- `.claude`
- `.codex`

Grouping rules:
- Gemini/Antigravity column: `runtime === "antigravity"`
- Claude column: `runtime === "claude"`
- Codex column: `runtime === "codex"`

## Dashboard Layout & Component Architecture

The frontend is a single-page application (`src/app/page.tsx`) with **14 distinct tabs** managed in state. Data is fetched on mount and kept live via WebSocket.

| Tab | Main Component | Notes |
| --- | --- | --- |
| `dashboard` | `AgentSummary`, `SystemStatus`, `AgentList`, `ActivityFeed` | The quick overview grid |
| `agents` | `AgentList` | Full width 3-column agent registry |
| `claude` | `ClaudeControlPanel` | Claude specific metrics and `CLAUDE.md` editor |
| `antigravity` | `AntigravityControlPanel` | Deep Antigravity control, subagents, and slash commands |
| `codex` | `CodexControlPanel` | Codex skills, agents, config, and sessions |
| `skills` | `SkillManager` | Unified skill catalog & assignment matrix |
| `tasks` | `TaskManager` | Background CLI task orchestration |
| `terminal` | `Terminal` | Real-time terminal with backend execution |
| `clisessions` | `CLISessions` | Combined Antigravity/Claude CLI transcript browser |
| `activity` | `ActivityFeed` | Full chronological feed of WS events |
| `system` | `SystemStatus` | Telemetry & resource usage |
| `hooks` | `HookList` | Event-driven git/file hooks |
| `analytics` | `AnalyticsDashboard` | Telemetry visualization and Git stats |
| `models` | `ModelList` | Model inventory manager |

*Note: `AIProviderManager.tsx` and `CLAUDEEditor.tsx` are currently unused standalone components. Provider management might be orphaned, and CLAUDE.md editing was moved inside `ClaudeControlPanel`.*

## Skill Catalog Sources

The unified skill catalog is built from:

| Source | Backend read path | Unified source key |
| --- | --- | --- |
| Claude dashboard skills | `.claude/skills.json` | `claude:<id>` |
| Gemini/Antigravity skills | `~/.gemini/antigravity/skills.json` | `gemini:<id>` |
| Codex system/user/plugins | `~/.codex/skills/`, `~/.codex/plugins/cache/` | `codex-system:<id>`, `codex-user:<id>`, `codex-plugin:<id>` |

## Skill Assignment Source Of Truth

Active assignment file: `~/.gemini/antigravity/data/skill_assignments.json`.

When a skill is assigned (`PUT /api/ai/skills/:skillKey/assignments`), the backend:
1. Updates `skill_assignments.json`.
2. Updates each agent's `capabilities` list.
3. Injects a dashboard skill block into the agent's prompt/persona Markdown file.
4. Exports dashboard-created skills assigned to Codex into `~/.codex/skills/dashboard-<skill-key>/SKILL.md`.
5. Exports dashboard-created skills assigned to Gemini/Claude agents into runtime-local dashboard-managed directories.
6. Syncs active dashboard skills into `CLAUDE.md`.

## Agent Invocation

| Endpoint | Behavior |
| --- | --- |
| `POST /api/chat` | Builds an agent execution prompt from persona + assigned skills + user message. |
| `POST /api/agents/call` | Builds the execution prompt for agent-to-agent calls. |

When `execute` is `false`, the endpoint returns the exact prompt and command preview without launching a CLI. When `execute` is `true`, it runs `execAsync` with:
- `codex` → `codex run "<prompt>"`
- `claude` → `claude -p "<prompt>"`
- `antigravity` → `antigravity "<prompt>"`

## Hook Execution

Hooks (`POST /api/hooks/trigger`) can run an executor:
- Triggered by `git.commit`, `git.push`, or `file.change` (from Chokidar).
- Extracts `git diff HEAD` to construct a prompt.
- Executes: `antigravity`, `claude`, `codex`, or raw shell command.
- History is kept in `hook_history.json`.

## Data Migration & Self-Healing

On startup, `server.ts` performs data migration:
- Copies legacy local `.claude/` files to global `~/.gemini/antigravity/` (if missing).
- Ensures `google-search` and `url-context` skills exist.
- Creates a default "First Agent" if none exist.
- Parses Antigravity transcripts (`transcript.jsonl`) to auto-discover dynamic subagents (`define_subagent` calls).

## Known Gaps To Fix

1. `AIProviderManager` is fully implemented but currently orphaned from the dashboard tabs.
2. Cross-runtime skill assignments inject textual instructions, but native tool execution (e.g., executing a Claude tool inside Codex) depends on whether the runtime naturally parses text instructions into function calls.
3. Hook system currently truncates the diff prompt to 2000 characters for command safety; very large diffs might need file-based context passing.
