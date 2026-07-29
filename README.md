# Tnega Agent Runtime Dashboard

Local-first control and observability for Codex, Claude Code, and Gemini
Antigravity agents.

Tnega discovers the agent definitions, skills, sessions, and subagent activity
already stored on your computer. It provides one dashboard without replacing
each runtime's native file format with a proprietary schema.

> Project status: working portfolio prototype. It is suitable for local
> experimentation and demonstrations, but it is not an authenticated
> production control plane.

## Why This Exists

Agent runtimes store related concepts in different locations and formats:

- Codex uses TOML agent definitions, Agent Skills packages, JSONL rollouts, and
  a local SQLite thread index.
- Claude Code uses Markdown/YAML agents and skills plus project JSONL
  transcripts.
- Antigravity uses Gemini configuration folders, project agent files, Agent
  Skills packages, and transcript logs.

Tnega adds a normalized UI and API over those sources while keeping native
files as the source of truth.

## What Works

### Native agent management

- Automatically discovers Codex, Claude Code, and Antigravity homes for the
  current operating-system user.
- Lists global, project, built-in, plugin, system, and legacy definitions with
  their real scope.
- Creates and edits project/global agents in the selected runtime's native
  format.
- Supports agent instructions, description, model, tool, and skill fields.
- Creates timestamped recovery backups before managed updates.
- Soft-deletes managed definitions into a recovery directory.

### Native skill management

- Creates real `SKILL.md` packages in the selected runtime's native skill root.
- Copies complete skill packages, including scripts, references, examples, and
  assets, between supported runtimes.
- Updates the selected target agent's real native skill reference.
- Imports explicitly selected legacy Claude or Antigravity agents into a
  managed native scope before assignment.
- Rolls back both the package copy and agent mutation if an assignment fails.
- Blocks unsafe symlink/junction package copies and deletion of referenced
  skills.

### Sessions, chats, and subagents

- Reads the Codex task/subagent tree from the local read-only SQLite state,
  including spawn edges where available.
- Reads Claude Code and Antigravity user/assistant messages from native JSONL
  transcripts.
- Shows Codex, Claude, and Antigravity sessions in one CLI Sessions workspace.
- Merges runtime messages into one timestamp-sorted Activity view while
  excluding tool calls and tool results.
- Keeps dashboard audit events in a separate System Audit view.
- Uses native filesystem/database watchers and a reconnecting local WebSocket
  to refresh changed runtime inventories.

### Runtime and model hooks

- Creates dashboard-owned hooks for `git.push`, `git.commit`, and
  `file.change` events.
- Targets a runtime default, a selected model, or a selected native agent
  definition.
- Supports manual execution and records output or failures in hook history.
- Sends runtime prompts over stdin instead of interpolating them into a shell
  command.
- Keeps direct shell hooks available as an explicit trusted-local option.

## What "Live" Means

The dashboard reacts to local runtime file and database changes:

- Codex thread/subagent state comes from its SQLite index and rollout updates.
- Claude Code and Antigravity status is inferred from transcript recency.
- Agent and skill edits are observed through their native directories.

This is near-real-time local observation, not a universal runtime-control
protocol. Tnega does not currently stop, steer, resume, or spawn existing
Claude/Antigravity/Codex sessions. Claude and Antigravity do not expose
authoritative lifecycle state through this adapter, so their running/idle
labels remain inferred.

## Support Matrix

| Capability | Codex | Claude Code | Antigravity |
| --- | --- | --- | --- |
| Detect project/global paths | Yes | Yes | Yes |
| Read native agents | Yes | Yes | Yes |
| Create/edit/soft-delete agents | Yes | Yes | Yes |
| Read native skills | Yes | Yes | Yes |
| Create/edit/soft-delete skills | Yes | Yes | Yes |
| Copy and assign skills | Yes | Yes | Yes |
| Select a model in agent definitions | Yes | Yes | Yes |
| Observe sessions/messages | Yes | Yes, inferred | Yes, inferred |
| Observe subagent relationships | Native SQLite edges | When transcript metadata exists | Inferred from transcripts |
| Live inventory refresh | Yes | Yes | Yes |
| Dashboard hook model targeting | Yes | Yes | CLI required |
| Stop/steer/resume sessions | No | No | No |

Standalone Gemini CLI agent/session inventory is not implemented as a fourth
adapter. The hook runner can use an installed `gemini` command as an
Antigravity execution fallback, but this does not add Gemini CLI inventory or
session control.

## Native Storage

`<workspace>` is the repository selected by `WORKSPACE_DIR`, or this checkout
when no override is provided.

| Runtime | Project agents | Global agents | Project skills | Global skills |
| --- | --- | --- | --- | --- |
| Codex | `<workspace>/.codex/agents/*.toml` | `~/.codex/agents/*.toml` | `<workspace>/.agents/skills/*/SKILL.md` | `~/.agents/skills/*/SKILL.md` |
| Claude | `<workspace>/.claude/agents/*.md` | `~/.claude/agents/*.md` | `<workspace>/.claude/skills/*/SKILL.md` | `~/.claude/skills/*/SKILL.md` |
| Antigravity | `<workspace>/.agents/agents/*.md` | `~/.gemini/config/agents/*.md` | `<workspace>/.agents/skills/*/SKILL.md` | `~/.gemini/config/skills/*/SKILL.md` |

Read-only compatibility sources, system skills, plugin skills, legacy
definitions, and session roots are documented in
[docs/agent-runtime-system.md](docs/agent-runtime-system.md).

## Requirements

- Node.js 22 or newer
- npm
- Windows, macOS, or Linux
- At least one supported runtime installed and used locally

Node.js 22 is required because Codex thread discovery uses the built-in
`node:sqlite` module.

## Quick Start

```bash
git clone https://github.com/YusufKaya00/AgentDashboard.git
cd AgentDashboard
npm install
npm run dev
```

Open:

- Dashboard: [http://127.0.0.1:3000](http://127.0.0.1:3000)
- Local API: [http://127.0.0.1:8000](http://127.0.0.1:8000)

The root install also installs backend dependencies. No machine-specific path
is written into the repository.

For a production-style local build:

```bash
npm run local
```

On Windows PowerShell, use `npm.cmd` instead of `npm` if script execution
policy blocks npm's PowerShell shim.

## Point It At Another Repository

By default, project-level agents and skills belong to the AgentDashboard
checkout. Set `WORKSPACE_DIR` before starting when you want to inspect or
manage another repository.

PowerShell:

```powershell
$env:WORKSPACE_DIR = "C:\path\to\your\repository"
npm.cmd run dev
```

macOS/Linux:

```bash
WORKSPACE_DIR=/path/to/your/repository npm run dev
```

Global runtime homes are still discovered from the current user.

## First Things To Try

1. Open **Overview** and confirm the detected runtimes and live connection.
2. Open **Agent Registry**, select a runtime, and inspect its native paths.
3. Create a project agent and verify the generated file in the path shown by
   the dashboard.
4. Open **Skills**, create a skill, then assign it to an agent in the same or a
   different runtime.
5. Use Codex, Claude Code, or Antigravity normally and watch **CLI Sessions**
   and **Activity** refresh.
6. Create a runtime hook, select a compatible model, and use the manual run
   control only after reviewing its task and permissions.

If a runtime is installed but its session list is empty, use that runtime once
in a project so it creates its native state/transcript files. Starting Tnega
does not create fake runtime data.

## Configuration

The defaults should work for standard installations. Copy `.env.example` to
`.env` only when an override is needed.

| Variable | Default | Purpose |
| --- | --- | --- |
| `WORKSPACE_DIR` | Dashboard checkout | Repository whose project definitions are managed |
| `DASHBOARD_HOME_DIR` | Current user home | Base home used for automatic discovery |
| `CODEX_HOME` | `~/.codex` | Non-standard Codex configuration home |
| `CODEX_SQLITE_HOME` | Codex home/state default | Non-standard Codex SQLite state location |
| `CLAUDE_CONFIG_DIR` | `~/.claude` | Non-standard Claude Code home |
| `GEMINI_HOME` | `~/.gemini` | Non-standard Gemini/Antigravity home |
| `RUNTIME_SESSION_SCOPE` | `all` | Use `workspace` to show only matching project sessions |
| `ENABLE_RUNTIME_LIVE_UPDATES` | `true` | Enable native watchers and WebSocket refresh events |
| `HOST` | `127.0.0.1` | Backend bind host |
| `PORT` | `8000` | Backend port |
| `DASHBOARD_ALLOWED_ORIGINS` | Loopback origins | Additional comma-separated browser origins |
| `DASHBOARD_CODEX_COMMAND` | Auto-detected | Codex hook CLI command/path override |
| `DASHBOARD_CLAUDE_COMMAND` | Auto-detected | Claude hook CLI command/path override |
| `DASHBOARD_ANTIGRAVITY_COMMAND` | Auto-detected | Antigravity hook CLI command/path override |

Legacy dashboard bootstrap, workspace watcher, and Git hook installation are
disabled by default. See
[docs/agent-runtime-system.md](docs/agent-runtime-system.md) before enabling
legacy compatibility flags.

## Architecture

```text
Next.js 16 dashboard
        |
        | HTTP + local WebSocket
        v
Express backend on 127.0.0.1
        |
        +-- Runtime discovery and safe write layer
        +-- Debounced native filesystem/database watchers
        |
        +-- Codex adapter
        |   +-- TOML agents
        |   +-- SKILL.md packages
        |   +-- read-only SQLite thread index
        |   `-- read-only JSONL rollouts
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

Key implementation files:

- `backend-node/lib/runtimeControlPlane.ts` - discovery, native CRUD, session
  parsing, skill assignment, backups, rollback, and path safety.
- `backend-node/lib/runtimeLiveUpdates.ts` - runtime root watchers and debounced
  change events.
- `backend-node/lib/hookExecution.ts` - runtime/model hook command planning.
- `src/components/RuntimeControlPanel.tsx` - shared native agent/skill controls.
- `src/components/CLISessions.tsx` - combined session and transcript workspace.
- `src/components/RuntimeTransmissionFeed.tsx` - combined runtime activity.

## Native API

```text
GET    /api/runtimes
GET    /api/runtimes/activity
GET    /api/runtimes/sessions
GET    /api/runtimes/:runtime/overview
GET    /api/runtimes/:runtime/sessions/:threadId/messages

POST   /api/runtimes/:runtime/agents
PUT    /api/runtimes/:runtime/agents/:scope/:id
DELETE /api/runtimes/:runtime/agents/:scope/:id

POST   /api/runtimes/:runtime/skills
PUT    /api/runtimes/:runtime/skills/:scope/:id
DELETE /api/runtimes/:runtime/skills/:scope/:id

POST   /api/runtime-skill-assignments
POST   /api/hooks/:id/execute
```

Valid runtime ids are `codex`, `claude`, and `antigravity`. Writable native
scopes are `project` and `global`.

## Safety Boundaries

- Runtime detection and session observation are read-only.
- Session databases and transcript files are never used as CRUD targets.
- Managed writes reject unsafe ids, traversal, and symlink/junction escapes.
- Updates create recovery backups; deletes move content to recovery trash.
- Skill assignment is transactional and restores both sides on failure.
- Runtime hook prompts use stdin and validate model/agent CLI tokens.
- Direct shell hooks execute arbitrary local commands. Use them only in a
  trusted checkout.
- The backend binds to loopback by default and has no user authentication.
  Do not expose it to a network without adding authentication and
  authorization.

## Verification

```bash
npm run verify
```

Individual commands:

```bash
npm run lint
npm test --prefix backend-node
npm exec tsc -- --noEmit
npm --prefix backend-node exec tsc -- --noEmit
npm run build
npm audit --omit=dev
npm audit --omit=dev --prefix backend-node
```

Current automated coverage includes:

- Native path and format generation for all three runtimes
- Recovery backups and soft deletion
- Transactional cross-runtime skill assignment and rollback
- Referenced-skill protection
- Legacy read-only handling and explicit import
- Path traversal and Windows junction escape rejection
- Codex SQLite thread/spawn-edge discovery
- Combined Codex/Claude/Antigravity transcript parsing
- Runtime watcher and WebSocket event delivery
- Safe runtime/model hook command planning
- Zero-write startup discovery

The current suite contains 31 backend tests.

### Dependency audit

Verified on 2026-07-29:

- Backend production dependencies: 0 known vulnerabilities.
- Frontend production dependencies: 3 high-severity transitive findings in
  the current Next.js `postcss` and optional `sharp` dependency chain.

`npm audit fix --force` currently proposes a breaking Next.js downgrade, so it
has not been applied. Re-run both audits before treating a newer dependency set
as release-ready.

## Current Limitations

- No authentication or multi-user permission model.
- No live stop, steer, resume, or dashboard-originated session spawning.
- Claude and Antigravity running/idle state is transcript-recency inference.
- Cross-runtime skill compatibility checks cannot install missing tools, MCP
  servers, executables, or permission policies.
- No content hash/ETag conflict detection for concurrent external edits.
- Hook definitions are dashboard-owned; they are not installed as native
  lifecycle hooks into every runtime.
- Direct terminal/task/shell execution paths need stronger isolation before a
  production deployment.
- No packaged desktop installer yet; distribution currently uses Git and npm.

## Documentation

The canonical implementation-level reference is
[docs/agent-runtime-system.md](docs/agent-runtime-system.md). It includes
native format examples, discovery roots, compatibility rules, API contracts,
write-safety behavior, and exact runtime-control limitations.

## Tech Stack

- Next.js 16 and React 19
- TypeScript
- Tailwind CSS 4
- Express and WebSocket
- Node.js SQLite
- `chokidar`
- `smol-toml` and `yaml`
- Lucide icons

## License

No open-source license has been selected yet. The repository is publicly
viewable, but reuse and redistribution rights are not granted until a license
is added.
