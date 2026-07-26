# Tnega Agent Runtime Dashboard

Tnega is a local-first dashboard for inspecting and editing native Codex,
Claude Code, and Gemini Antigravity agent configurations from one interface.

The project deliberately keeps each runtime's real filesystem format. The
dashboard normalizes data only for display and API responses.

## Current Status

This repository is a working portfolio prototype, not a production control
plane.

Implemented:

- Automatic user-home and workspace path discovery.
- Native agent and skill inventory for Codex, Claude Code, and Antigravity.
- Native create, edit, and soft-delete operations.
- Model, tool, instruction, and skill fields in the agent editor.
- Full skill-package copying between supported runtimes.
- Codex task/subagent tree from the local state database.
- Read-only Claude and Antigravity session observation.
- Modern runtime panels using Lucide icons.
- Loopback-only backend by default and zero-write startup discovery.

Not implemented:

- Live stop, steer, resume, or spawn controls.
- Native hook-driven lifecycle state for Claude and Antigravity.
- Standalone Gemini CLI runtime support.
- Authentication for remote/multi-user hosting.
- Guaranteed translation of runtime-specific tools inside copied skills.

See [the native runtime system document](docs/agent-runtime-system.md) for the
storage matrix, format examples, APIs, safety rules, and exact limitations.

## Native Paths

| Runtime | Project agents | Global agents | Project skills | Global skills |
| --- | --- | --- | --- | --- |
| Codex | `.codex/agents/*.toml` | `~/.codex/agents/*.toml` | `.agents/skills/*/SKILL.md` | `~/.agents/skills/*/SKILL.md` |
| Claude | `.claude/agents/*.md` | `~/.claude/agents/*.md` | `.claude/skills/*/SKILL.md` | `~/.claude/skills/*/SKILL.md` |
| Antigravity | `.agents/agents/*.md` | `~/.gemini/config/agents/*.md` | `.agents/skills/*/SKILL.md` | `~/.gemini/config/skills/*/SKILL.md` |

The dashboard does not replace these with a shared `agents.json`. Existing
Codex skills under `.codex/skills` and `~/.codex/skills` remain discoverable as
read-only compatibility sources; new Codex skills are written to the official
`.agents/skills` roots.

## Architecture

```text
Next.js dashboard
        |
        | HTTP + WebSocket
        v
Express backend on 127.0.0.1
        |
        +-- Codex adapter
        |   +-- TOML agents
        |   +-- SKILL.md packages
        |   `-- read-only state SQLite
        |
        +-- Claude adapter
        |   +-- YAML/Markdown agents
        |   +-- SKILL.md packages
        |   `-- read-only project JSONL
        |
        `-- Antigravity adapter
            +-- YAML/Markdown agents
            +-- SKILL.md packages
            `-- read-only transcript JSONL
```

The adapter implementation is in
`backend-node/lib/runtimeControlPlane.ts`. The generic frontend is in
`src/components/RuntimeControlPanel.tsx`.

## Requirements

- Node.js 22 or newer
- npm
- Windows, macOS, or Linux filesystem access to the local runtime homes
- At least one supported runtime installed for useful inventory

Node 22 is recommended because Codex session inventory uses the built-in
`node:sqlite` module in read-only mode.

## Install

```powershell
npm.cmd install
npm.cmd install --prefix backend-node
```

## Run

```powershell
npm.cmd run dev
```

Open:

- Frontend: [http://127.0.0.1:3000](http://127.0.0.1:3000)
- Backend: [http://127.0.0.1:8000](http://127.0.0.1:8000)

The backend binds to `127.0.0.1` unless `HOST` is explicitly changed.

## Configuration

Common overrides:

```powershell
$env:WORKSPACE_DIR = "C:\path\to\repository"
$env:CODEX_HOME = "$HOME\.codex"
$env:CLAUDE_CONFIG_DIR = "$HOME\.claude"
$env:GEMINI_HOME = "$HOME\.gemini"
npm.cmd run dev
```

Additional browser origins can be supplied with
`DASHBOARD_ALLOWED_ORIGINS`. Do not expose the backend remotely without adding
authentication and authorization.

Legacy startup behavior is disabled. It can be enabled explicitly for old
dashboard workflows:

```powershell
$env:ENABLE_LEGACY_BOOTSTRAP = "true"
$env:ENABLE_FILE_WATCHER = "true"
$env:INSTALL_GIT_HOOKS = "true"
```

These flags are not required by the native runtime panels.

## Native API

```text
GET    /api/runtimes
GET    /api/runtimes/:runtime/overview
POST   /api/runtimes/:runtime/agents
PUT    /api/runtimes/:runtime/agents/:scope/:id
DELETE /api/runtimes/:runtime/agents/:scope/:id
POST   /api/runtimes/:runtime/skills
PUT    /api/runtimes/:runtime/skills/:scope/:id
DELETE /api/runtimes/:runtime/skills/:scope/:id
POST   /api/runtime-skill-assignments
```

## Verification

```powershell
npm.cmd test --prefix backend-node
npm.cmd exec tsc --prefix backend-node -- --noEmit
npm.cmd run lint
npm.cmd run build
npm.cmd audit --omit=dev
npm.cmd audit --omit=dev --prefix backend-node
```

The backend tests cover native paths and formats, recovery backups, soft
deletion, transactional cross-runtime skill assignment, referenced-skill
protection, legacy read-only handling, junction escape rejection, duplicate
nested agent names, Codex skill state, workspace-filtered thread edges, and
zero-write server startup.

As of 2026-07-26, the backend production dependency audit reports zero known
vulnerabilities. The frontend audit reports three high-severity transitive
findings in the current Next.js `postcss` and optional `sharp` dependency
chain. `npm audit fix --force` proposes a breaking Next.js downgrade, so it is
not applied. Re-audit against the next compatible Next.js release before a
production deployment.

## Release Assessment

The project can be shared on LinkedIn as a local multi-runtime developer-tool
prototype. Describe it as native filesystem integration and runtime
observability, not as a finished production orchestrator.

Before a public production release:

1. Add authentication and permission boundaries.
2. Separate or remove legacy shell/task/hook execution endpoints.
3. Add native lifecycle hooks and live runtime controls.
4. Add standalone Gemini CLI support as a fourth adapter.
5. Add concurrent-edit conflict detection and packaged installer testing.
