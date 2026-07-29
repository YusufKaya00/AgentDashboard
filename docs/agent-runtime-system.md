# Native Agent Runtime System

Verified: 2026-07-29

This is the canonical technical description of the dashboard runtime layer. It
documents implemented behavior, not the long-term product vision.

## Core Invariant

The dashboard has one normalized in-memory/API model, but it does not persist
agents or skills in a shared dashboard schema.

Every write is delegated to the selected runtime adapter:

- Codex definitions remain Codex TOML and Codex `SKILL.md` packages.
- Claude definitions remain Claude Markdown with YAML frontmatter.
- Antigravity definitions remain Antigravity Markdown with YAML frontmatter.
- Session databases and transcripts are observation sources and are never used
  as CRUD targets.

The old `agents.json`, `skills.json`, and dashboard-managed prompt injection
flow still exists behind legacy endpoints for compatibility. The new runtime
panels do not use it, and legacy bootstrap is disabled by default.

## Dashboard Surfaces

- **Overview** shows a balanced agent preview plus a timestamp-sorted Active
  Transmissions feed built from native Codex, Claude, and Antigravity
  user/assistant transcript messages. Tool calls and tool outputs are excluded.
- **CLI Sessions** lists transcript-backed sessions from all three runtimes,
  filters them by runtime, and reads the selected native transcript without
  exposing transcript file paths as API inputs.
- **System Activity** separates the combined runtime-message timeline from the
  dashboard's own system audit records.
- **Agent Registry** provides a three-runtime selector. `New Agent`, edit, and
  delete operations use the selected native runtime adapter.
- **Skill Manager** uses the same selector and native API. It can create and
  edit `SKILL.md` packages, copy complete packages across runtimes, and update
  a selected target agent's native definition.
- Runtime-specific Codex, Claude Code, and Antigravity pages remain available
  for live runs, paths, diagnostics, agents, and skills.
- **Hooks** can target a runtime default, a selected native agent definition,
  or an explicit shell command. Runtime hooks can select a compatible model.

The runtime selector stays usable when a runtime is not initialized. Creating
the first project or global agent/skill creates only the selected native path;
read-only discovery still creates nothing.

## Implemented Support

| Capability | Codex | Claude Code | Antigravity |
| --- | --- | --- | --- |
| Detect global/project paths | Yes | Yes | Yes |
| Read native agent definitions | Yes | Yes | Yes |
| Create/edit/delete native agents | Yes | Yes | Yes |
| Read native skills | Yes | Yes | Yes |
| Create/edit/delete native skills | Yes | Yes | Yes |
| Assign model in native definition | Yes | Yes | Yes |
| Assign native skills to an agent | Yes | Yes | Yes |
| Copy a skill across runtimes | Yes | Yes | Yes |
| Observe matching sessions/subagents | Yes | Inferred | Inferred |
| Event-driven inventory refresh | Yes | Yes | Yes |
| List/read sessions in CLI Sessions | Yes | Yes | Yes |
| Execute dashboard hooks with a selected model | Yes | Yes | Yes, when an Antigravity or Gemini CLI is installed |
| Stop, steer, or resume sessions | No | No | No |

`gemini` is accepted as an API alias for `antigravity`. This does not mean that
standalone Gemini CLI is implemented. Gemini CLI has different agent, skill,
and session discovery rules and remains separate work.

## Native Storage Matrix

`<workspace>` means the repository selected with `WORKSPACE_DIR`. `~` means the
detected user home unless an environment override is provided.

| Runtime | Scope | Agent definitions | Skill packages |
| --- | --- | --- | --- |
| Codex | Global | `~/.codex/agents/<id>.toml` | `~/.agents/skills/<id>/SKILL.md` |
| Codex | Project | `<workspace>/.codex/agents/<id>.toml` | `<workspace>/.agents/skills/<id>/SKILL.md` |
| Claude | Global | `~/.claude/agents/<id>.md` | `~/.claude/skills/<id>/SKILL.md` |
| Claude | Project | `<workspace>/.claude/agents/<id>.md` | `<workspace>/.claude/skills/<id>/SKILL.md` |
| Antigravity | Global | `~/.gemini/config/agents/<id>.md` | `~/.gemini/config/skills/<id>/SKILL.md` |
| Antigravity | Project | `<workspace>/.agents/agents/<id>.md` | `<workspace>/.agents/skills/<id>/SKILL.md` |

The dashboard also reads these sources without making them editable:

- Codex built-ins: `default`, `worker`, and `explorer`.
- Codex system and plugin skills under `~/.codex/skills/.system` and
  `~/.codex/plugins/cache`.
- Existing project/global Codex skills under `.codex/skills` and
  `~/.codex/skills` as read-only compatibility sources.
- Frontmatter-free Claude Markdown as `legacy`.
- Old Antigravity dashboard files under `~/.gemini/antigravity` as `legacy`.

Official format references:

- [Codex custom agents and subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents.md)
- [Codex Agent Skills](https://learn.chatgpt.com/docs/build-skills)
- [Claude Code subagents](https://code.claude.com/docs/en/sub-agents)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
- [Antigravity subagents](https://antigravity.google/docs/subagents?hl=en)
- [Antigravity skills](https://antigravity.google/docs/skills?app=antigravity-ide)

## Agent Creation

The native agent editor accepts:

| Dashboard field | Meaning |
| --- | --- |
| Scope | `project` or `global` native discovery location |
| Native name | Runtime identity; normalized to a safe lowercase slug and used as the filename on create |
| Description | Delegation and discovery guidance |
| Model | Runtime-native model value; blank means runtime default/inherit |
| Instructions | Full Markdown workflow/system prompt |
| Tools | Runtime tool allowlist for Claude and Antigravity |
| Skills | References to native skills already visible to that runtime |

The multi-phase instructions in the user's supplied example belong in the
Instructions field. The dashboard preserves the Markdown body; it does not
split or rewrite phases.

### Codex output

```toml
name = "reviewer"
description = "Reviews repository changes"
model = "gpt-5.6-sol"
developer_instructions = """
Follow the requested review phases.
"""

[[skills.config]]
path = "C:/.../.agents/skills/review-checklist/SKILL.md"
enabled = true
```

Codex custom agents can also contain other supported Codex configuration keys.
The adapter preserves unknown existing TOML keys, pathless config entries,
per-skill `enabled` state, and custom skill config fields when editing.

### Claude output

```md
---
name: reviewer
description: Reviews repository changes
model: inherit
tools:
  - Read
  - Grep
skills:
  - review-checklist
---

Follow the requested review phases.
```

The adapter preserves unknown existing YAML frontmatter fields when editing.
Markdown without native `name` and `description` frontmatter is shown as
read-only legacy content so the dashboard cannot silently convert an old file.

### Antigravity output

```md
---
name: reviewer
description: Reviews repository changes
model: inherit
tools:
  - view_file
  - grep_search
mainAgent: false
subagent: true
skills:
  - skills/review-checklist
---

Follow the requested review phases.
```

New Antigravity definitions default to a selectable subagent rather than a main
chat persona. Existing frontmatter values are preserved; an omitted
`mainAgent` value remains omitted so Antigravity can apply its native default.

## Skill Creation

All three adapters create an Agent Skills package:

```text
<skill-id>/
|-- SKILL.md
|-- scripts/       optional
|-- references/    optional
|-- examples/      optional
`-- assets/        optional
```

The dashboard editor creates the required `SKILL.md`. A skill copied from
another runtime retains every sibling file in its package.

```md
---
name: review-checklist
description: Reviews a change using the project checklist
---

1. Inspect the changed behavior.
2. Run focused tests.
3. Report evidence and remaining risks.
```

The content is the user's real skill. The dashboard does not replace it with
assignment metadata or inject it into an unrelated shared JSON file.

## Cross-Runtime Skill Assignment

`POST /api/runtime-skill-assignments` performs a real filesystem operation:

1. Resolve the source runtime, scope, and native `SKILL.md`.
2. Copy the complete source skill directory to the target native skill root.
3. If a selected Claude/Antigravity agent is legacy, import it into the
   selected native project/global scope while preserving its instruction body.
4. Name the installed package `dashboard-<source-runtime>-<source-id>`.
5. Update the target agent's native file with the new skill reference.
6. Return the installed path, imported-agent state, and compatibility class.

Package installation and agent mutation are one dashboard transaction. If the
agent write or installed-skill validation fails, the prior package and agent
file are restored. Packages containing symlinks or junctions are rejected.

Legacy agents remain read-only during discovery. Import happens only after the
user explicitly selects a `(import legacy)` target in the assignment dialog.
When the legacy file already occupies the native destination, it is backed up
and upgraded in place. Otherwise, the original legacy file remains unchanged
and a managed native copy is created in the selected scope.

Native target references are:

- Codex: `[[skills.config]]` with an absolute `SKILL.md` path.
- Claude: a skill id under YAML `skills`.
- Antigravity: `skills/<id>` under YAML `skills`.

Compatibility values:

- `native`: source and target runtimes are the same.
- `portable`: cross-runtime package contains no obvious runtime-specific paths.
- `adapted`: package mentions `.codex`, `.claude`, `.gemini`, or runtime home
  variables and requires manual review.

This copies instructions and resources. It cannot translate a runtime-specific
tool name, MCP server, shell assumption, permission policy, or executable
dependency. A copied skill is operational only when its required tools also
exist in the target runtime.

## Live Runs And Subagents

### Codex

The adapter opens the newest `state.sqlite` or `state_<n>.sqlite` in read-only
mode. It reads `thread_spawn_edges` to build the parent/subagent tree.
Nickname, role, model, token count, and edge state are shown when the database
exposes those columns.

Codex can retain an `open` spawn edge after a subagent has stopped writing.
The dashboard therefore presents an open thread as `running` only while its
SQLite record was updated during the last two minutes. A stale open edge is
kept in the tree but shown as `idle`; explicit closed/completed/failed edge
states remain authoritative.

With `RUNTIME_SESSION_SCOPE=workspace`, filtering happens in SQLite before the
500-row limit. Windows device paths such as `\\?\C:\workspace` are normalized
before comparison. The default `all` scope reads the 500 most recently updated
local Codex sessions across workspaces.

This makes the current Codex task and spawned subagents visible in Overview,
CLI Sessions, Agent Registry, and Codex > Live Runs. Definitions and running
threads are different records and are labeled separately.

### Claude Code

The adapter reads recent JSONL files under:

```text
~/.claude/projects/
```

In `workspace` scope it matches transcript `cwd` values or Claude's encoded
project directory. The default `all` scope includes recent local Claude
sessions across projects. Parent ids and agent ids are used when present.
Status is inferred from file modification time, so these rows are marked
`observed`.

### Antigravity

The adapter reads matching `transcript.jsonl` files under:

```text
~/.gemini/antigravity/brain/
~/.gemini/antigravity-ide/brain/
~/.gemini/antigravity-cli/brain/
```

The default `all` scope includes recent transcripts from every known
Antigravity brain root. `workspace` scope requires the selected workspace
path/name. Parent relationships are inferred from recorded messaging calls.
Status is based on transcript recency and is marked `observed`.

### Live update transport

The backend watches only discovered native runtime roots:

- Codex agent/skill roots and SQLite/WAL state directories.
- Claude agent/skill roots and project JSONL directories.
- Antigravity agent/skill roots and known transcript directories.

It does not recursively scan the user's whole home directory or drives. A
filesystem/database change is debounced and published as a lightweight
`runtime-inventory-changed` WebSocket event. The browser then refreshes only
the changed runtime. The socket reconnects with bounded exponential backoff.
A 60-second page-level and 30-second Live Runs fallback refresh handles missed
filesystem events and time-based transitions from `running` to `idle`.

Native agent/skill writes made through the dashboard publish the same event
after the transactional write succeeds. New runtime roots are added to the
watch set immediately after dashboard writes and rechecked every 30 seconds
for runtime folders created by external applications.

### Current control boundary

The dashboard now reacts live to native file, transcript, and database changes,
but it does not subscribe to official Claude or Antigravity lifecycle hooks.
It also does not call runtime control APIs to stop, steer, resume, or spawn a
session. `sessions_control` is therefore always `false`. Transcript and
database writes are intentionally prohibited.

## CLI Sessions And Activity

`GET /api/runtimes/sessions` normalizes transcript-backed thread summaries from
the same adapters used by the runtime control panels. The response includes the
runtime id, native thread id, title, status, workspace, model, timestamps, and
subagent state.

`GET /api/runtimes/:runtime/sessions/:threadId/messages` first resolves the
thread id against the discovered runtime inventory, then reads that thread's
known transcript path internally. A caller cannot supply an arbitrary
filesystem path. Only real user and assistant message records are returned;
tool calls and tool results remain excluded.

Both CLI Sessions and System Activity react to the native runtime WebSocket
revision events. System Activity shows up to 300 messages with a per-runtime
allowance so one busy runtime cannot remove the others from the combined view;
the resulting feed remains in descending timestamp order. CLI Sessions
preserves native transcript order inside the selected conversation.

## Dashboard Hook Execution

Hooks remain dashboard-owned event bindings stored in the dashboard hook file;
creating one does not install a native lifecycle hook into Codex, Claude, or
Antigravity configuration.

The hook runner supports three execution modes:

| Mode | Behavior |
| --- | --- |
| `runtime` | Run the selected runtime CLI with the selected model or runtime default |
| `agent` | Resolve the selected agent from its real native definition, include its instructions, and run the selected runtime/model |
| `shell` | Execute the action as a direct local shell command |

Runtime prompts are sent over stdin rather than interpolated into a shell
command. Model and agent ids are constrained to safe CLI tokens. Runtime
commands are:

- Codex: `codex exec [--model <id>] -`
- Claude: `claude -p [--model <id>]`; project/global Claude agents also use
  `--agent <id>`.
- Antigravity: prefer `antigravity`, then fall back to `gemini`; model
  selection uses `--model <id>` and non-interactive input.

Codex and Antigravity do not expose the same direct agent-selection contract as
Claude in this adapter. For those runtimes, agent mode reads the actual native
agent file and includes its instructions in the hook prompt. Execution output,
target metadata, and failures are written to hook history. A missing CLI or
unsupported local CLI flag is reported as an error; it is not treated as a
successful run.

## Automatic Discovery

On another computer, the default roots are derived from that user's home
directory and the checked-out workspace. No Yusuf-specific or fixed Windows
profile path is used by the runtime adapter.

Supported overrides:

| Variable | Purpose |
| --- | --- |
| `WORKSPACE_DIR` | Repository to inventory |
| `DASHBOARD_HOME_DIR` | User-home base used for discovery |
| `CODEX_HOME` | Codex configuration home |
| `CODEX_SQLITE_HOME` | Codex state database location |
| `CLAUDE_CONFIG_DIR` | Official Claude configuration home override |
| `CLAUDE_HOME` | Compatibility fallback for Claude home |
| `GEMINI_HOME` | Gemini/Antigravity home |
| `ANTIGRAVITY_HOME` | Legacy dashboard root only |
| `ENABLE_RUNTIME_LIVE_UPDATES` | Set `false` to disable native runtime watchers and WebSocket inventory events |
| `RUNTIME_SESSION_SCOPE` | `all` (default) observes all local sessions; `workspace` filters sessions to `WORKSPACE_DIR` |
| `DASHBOARD_CODEX_COMMAND` | Optional Codex hook CLI executable/path override |
| `DASHBOARD_CLAUDE_COMMAND` | Optional Claude hook CLI executable/path override |
| `DASHBOARD_ANTIGRAVITY_COMMAND` | Optional Antigravity hook CLI executable/path override |
| `HOST` | Backend bind host; defaults to `127.0.0.1` |
| `PORT` | Backend port; defaults to `8000` |
| `DASHBOARD_ALLOWED_ORIGINS` | Additional comma-separated browser origins |

Runtime detection is read-only. Merely starting the server or calling
`GET /api/runtimes` does not create native runtime folders.

## Native API

```text
GET    /api/runtimes
GET    /api/runtimes/activity
GET    /api/runtimes/sessions
GET    /api/runtimes/:runtime/sessions/:threadId/messages
GET    /api/runtimes/:runtime/overview

POST   /api/runtimes/:runtime/agents
PUT    /api/runtimes/:runtime/agents/:scope/:id
DELETE /api/runtimes/:runtime/agents/:scope/:id

POST   /api/runtimes/:runtime/skills
PUT    /api/runtimes/:runtime/skills/:scope/:id
DELETE /api/runtimes/:runtime/skills/:scope/:id

POST   /api/runtime-skill-assignments

POST   /api/hooks/:id/execute
```

Valid runtime ids are `codex`, `claude`, and `antigravity`; `gemini` aliases
`antigravity`. Writable scopes are `project` and `global`.

## Write Safety

- IDs are constrained to safe slugs.
- Lexical path traversal is rejected.
- Existing real paths are checked to prevent symlink/junction escapes.
- Writes use a temporary file and rename.
- Updates create timestamped backups under the sibling
  `.dashboard-recovery/<agents|skills>/backups` tree.
- Deletes move content under
  `.dashboard-recovery/<agents|skills>/trash`; they do not permanently erase it.
- Recovery folders are outside native agent/skill discovery roots and are not
  inventoried by the runtime.
- Skill deletion is blocked while any native agent still references the skill.
- Cross-runtime assignment restores both the previous package and target agent
  when a later write fails.
- The backend binds to loopback by default.
- HTTP CORS and WebSocket origins accept loopback plus explicitly configured
  origins.
- Native session databases, transcripts, Antigravity protobuf/state files, and
  runtime application databases are read-only.
- Runtime hook prompts are passed on stdin; model and agent CLI tokens are
  validated before command construction.

Legacy side effects are opt-in:

```text
ENABLE_LEGACY_BOOTSTRAP=true
ENABLE_FILE_WATCHER=true
INSTALL_GIT_HOOKS=true
```

Native runtime live updates are separate from the legacy workspace file
watcher and are enabled by default:

```text
ENABLE_RUNTIME_LIVE_UPDATES=false
```

## Known Limitations

1. Standalone Gemini CLI agent/session inventory is not implemented. The hook
   runner can use an installed `gemini` executable as an Antigravity execution
   fallback, but that does not add Gemini CLI discovery or session control.
2. Claude and Antigravity updates arrive live when their native transcript
   files change, but `running`/`idle` remains inferred from transcript recency
   rather than official lifecycle hooks.
3. Live session control and dashboard-originated spawning are not implemented.
4. Native writes do not yet use content hashes/ETags for concurrent edit
   conflict detection.
5. The backend has no user authentication. Loopback binding limits exposure,
   but remote hosting requires authentication and authorization first.
6. Legacy JSON APIs, terminal execution, task execution, and direct-shell hooks
   remain in `server.ts`. Runtime/model hook targeting uses native definitions,
   but the hook store is still dashboard-owned and should be isolated before a
   production release.
7. Cross-runtime skill compatibility is a static warning heuristic, not an
   execution test.
8. The 2026-07-29 frontend production audit reports three high-severity
   transitive findings in the current Next.js `postcss` and optional `sharp`
   dependency chain. The backend audit is clean. npm currently proposes a
   breaking Next.js downgrade for automatic remediation, so production release
   remains blocked on a compatible upstream dependency update or a separately
   tested override.

## Documentation Maintenance Skill Contract

A future documentation-maintainer skill should treat this file as canonical.
Its job is to reduce repeat investigation, not to restate assumptions.

Required workflow:

1. Read `backend-node/lib/runtimeControlPlane.ts`, native route declarations,
   and runtime tests.
2. Run backend tests and typecheck, including live watcher/WebSocket tests.
3. Query `GET /api/runtimes` for a machine snapshot.
4. Update this document only when code or verified runtime behavior changed.
5. Keep implementation facts separate from roadmap items.
6. Never claim session control, Gemini CLI support, or production readiness
   unless tests and code prove it.
7. Preserve the Native Storage Matrix, Implemented Support, Known Limitations,
   and verification date sections.
8. Keep machine-specific counts out of durable architecture sections.

Recommended trigger description:

```yaml
---
name: runtime-doc-maintainer
description: Updates the AgentDashboard native runtime documentation after verified changes to Codex, Claude, or Antigravity adapters, paths, CRUD, skills, sessions, or tests.
---
```

## Verification Commands

```powershell
npm.cmd test --prefix backend-node
npm.cmd --prefix backend-node exec tsc -- --noEmit
npm.cmd run lint
npm.cmd run build
npm.cmd audit --omit=dev
npm.cmd audit --omit=dev --prefix backend-node
```

The startup safety test verifies that read-only discovery does not create or
migrate `.codex`, `.claude`, `.gemini`, `.agents`, or Git hook content.
