# Native Agent Runtime System

Verified: 2026-07-26

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
3. Name the installed package `dashboard-<source-runtime>-<source-id>`.
4. Update the target agent's native file with the new skill reference.
5. Return the installed path and a compatibility classification.

Package installation and agent mutation are one dashboard transaction. If the
agent write or installed-skill validation fails, the prior package and agent
file are restored. Packages containing symlinks or junctions are rejected.

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
mode. It filters `threads` by workspace and reads `thread_spawn_edges` to build
the parent/subagent tree. Nickname, role, model, token count, and edge state are
shown when the database exposes those columns.

Workspace filtering happens in SQLite before the 500-row limit. Windows device
paths such as `\\?\C:\workspace` are normalized before comparison, matching the
format currently written by Codex Desktop.

This makes the current Codex task and spawned subagents visible in Overview,
Agent Registry, and Codex > Live Runs. Definitions and running threads are
different records and are labeled separately.

### Claude Code

The adapter reads recent JSONL files under:

```text
~/.claude/projects/
```

It matches the workspace using transcript `cwd` values or Claude's encoded
project directory. Parent ids and agent ids are used when present. Status is
inferred from file modification time, so these rows are marked `observed`.

### Antigravity

The adapter reads matching `transcript.jsonl` files under:

```text
~/.gemini/antigravity/brain/
~/.gemini/antigravity-ide/brain/
~/.gemini/antigravity-cli/brain/
```

Only transcripts containing the current workspace path/name are included.
Parent relationships are inferred from recorded messaging calls. Status is
based on transcript recency and is marked `observed`.

### Current control boundary

The dashboard does not yet subscribe to native lifecycle hooks and does not
call runtime control APIs to stop, steer, resume, or spawn a live session.
`sessions_control` is therefore always `false`. Transcript and database writes
are intentionally prohibited.

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
| `HOST` | Backend bind host; defaults to `127.0.0.1` |
| `PORT` | Backend port; defaults to `8000` |
| `DASHBOARD_ALLOWED_ORIGINS` | Additional comma-separated browser origins |

Runtime detection is read-only. Merely starting the server or calling
`GET /api/runtimes` does not create native runtime folders.

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

Legacy side effects are opt-in:

```text
ENABLE_LEGACY_BOOTSTRAP=true
ENABLE_FILE_WATCHER=true
INSTALL_GIT_HOOKS=true
```

## Known Limitations

1. Standalone Gemini CLI agent/session inventory is not implemented.
2. Claude and Antigravity live status is inferred from transcripts, not native
   hook events.
3. Live session control and dashboard-originated spawning are not implemented.
4. Native writes do not yet use content hashes/ETags for concurrent edit
   conflict detection.
5. The backend has no user authentication. Loopback binding limits exposure,
   but remote hosting requires authentication and authorization first.
6. Legacy JSON APIs, terminal execution, task execution, and hook execution
   remain in `server.ts`. They are outside the new native control plane and
   should be isolated or removed before a production release.
7. Cross-runtime skill compatibility is a static warning heuristic, not an
   execution test.
8. The 2026-07-26 frontend production audit reports three high-severity
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
2. Run backend tests and typecheck.
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
npm.cmd exec tsc --prefix backend-node -- --noEmit
npm.cmd run lint
npm.cmd run build
npm.cmd audit --omit=dev
npm.cmd audit --omit=dev --prefix backend-node
```

The startup safety test verifies that read-only discovery does not create or
migrate `.codex`, `.claude`, `.gemini`, `.agents`, or Git hook content.
