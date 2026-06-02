# Agent Runtime System: Current Behavior

Date checked: 2026-06-02

This document describes what the dashboard actually does today. It is not a target architecture document.

## Short Answers

- Codex, Gemini/Antigravity, and Claude agents are categorized in the UI.
- A newly created agent now has an explicit runtime selection in the dashboard; model string is only fallback routing.
- Agent fields mostly match the pasted flow: name, description, instructions/prompt, model, and skills/tools.
- Dashboard-created skills can now be created as Gemini/Antigravity, Claude dashboard, or Codex user skills.
- Skill assignment works across runtimes as assignment metadata, agent capability updates, persona prompt injection, and dashboard-managed `SKILL.md` export where a runtime has a local skill directory.
- Agent invocation is wired through `/api/chat` and `/api/agents/call`; the runtime command prompt is built from the saved agent persona plus assigned skill instructions.
- Native runtime support is still uneven: dashboard-created skills assigned to Codex are exported as Codex `SKILL.md`; Gemini/Antigravity and Claude receive dashboard-managed skill markdown plus prompt injection, but this is not the same as a verified native tool loader.
- Codex-created agents are written under `C:\Users\skyks\.codex` only when the selected model resolves to Codex.
- Gemini/Antigravity-created agents are written under `C:\Users\skyks\.gemini\antigravity`.
- Claude-created agents are written under this repo's `.claude` directory.
- Codex screen agent visibility is no longer hardcoded; it reads `C:\Users\skyks\.codex\agents.json` and `C:\Users\skyks\.codex\agents\*.md`.

## Runtime Storage Map

| Runtime | Source of truth used by backend | Metadata file | Prompt/persona files | Notes |
| --- | --- | --- | --- | --- |
| Antigravity / Gemini | `C:\Users\skyks\.gemini\antigravity` | `C:\Users\skyks\.gemini\antigravity\agents.json` | `C:\Users\skyks\.gemini\antigravity\agents\<agent-id>.md` | Default route for non-Claude, non-Codex models. |
| Claude | `C:\Users\skyks\Desktop\AgentDashboard\.claude` | `C:\Users\skyks\Desktop\AgentDashboard\.claude\agents.json` | `C:\Users\skyks\Desktop\AgentDashboard\.claude\agents\<agent-id>.md` | Separate local Claude dashboard config. |
| Codex | `C:\Users\skyks\.codex` | `C:\Users\skyks\.codex\agents.json` | `C:\Users\skyks\.codex\agents\<agent-id>.md` | Backend creates these files/folders when a Codex-routed agent is saved. |

Important current state:

- If `C:\Users\skyks\.codex\agents.json` or `C:\Users\skyks\.codex\agents` is missing, the backend creates them when a Codex agent is saved.
- `C:\Users\skyks\Desktop\AgentDashboard\.antigravitycli` exists, but the backend does not use it as the main Antigravity agent store.

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

The dashboard now sends `runtime` explicitly. The model value remains a fallback for older callers.

Examples:

| Model value | Result |
| --- | --- |
| `claude-3-5-sonnet-20241022` | Claude |
| `claude:opus-4.1` | Claude |
| `codex:gpt-5` | Codex |
| `codex-mini` | Codex |
| `gemini-2.5-pro` | Antigravity/Gemini |
| `antigravity:gemini-1.5-pro` | Antigravity/Gemini |
| `gpt-5` | Antigravity/Gemini unless registered as `codex:*` |

Risk: if an older caller omits `runtime` and saves an OpenAI/Codex-capable model as plain `gpt-5`, it will still fall back to Antigravity/Gemini because the string does not contain `codex`.

## Agent Creation Flow

The create modal currently collects:

- `name`
- `description`
- `model`
- `system_prompt`
- selected skills

Backend `/api/agents` then creates:

- `id`: provided id or generated from the agent name
- `name`
- `description`
- `model`
- `runtime`
- `status: active`
- `role: agent` unless provided
- `capabilities`
- `created_at`
- `updated_at`
- `config`

Prompt behavior:

- UI field: `system_prompt`
- Backend create endpoint now accepts both `system_prompt` and legacy `prompt`.
- If neither is sent, it falls back to:

```md
# <name>

Agent prompt.
```

- Create and edit both save to the selected runtime prompt file.

## Agent Categorization In The UI

`src/components/AgentList.tsx` groups agents into three columns:

- `.gemini`
- `.claude`
- `.codex`

Grouping rules:

- Gemini/Antigravity column: `runtime === "antigravity"` or id/config indicates Antigravity.
- Claude column: `runtime === "claude"` or config indicates Claude.
- Codex column: `runtime === "codex"` or config indicates Codex.

This works when backend metadata has the correct `runtime` field. The field is injected when the backend loads each runtime's agent JSON.

## Model Assignment

Yes, the created agent can be assigned to a selected model.

Current caveats:

- Runtime and model are separate in AgentModal and AgentDetailPanel.
- Both create and edit now use model inventory `id` as the select value.
- Skill assignments to `model:<id>` can be inherited by agents using that model during capability/prompt sync.

Remaining recommendation: keep providers/models consistently registered with stable ids because model/provider skill inheritance depends on those ids.

## Skill Catalog Sources

The unified skill catalog is built from:

| Source | Backend read path | Unified source key |
| --- | --- | --- |
| Local Claude dashboard skills | `C:\Users\skyks\Desktop\AgentDashboard\.claude\skills.json` | `claude:<id>` |
| Gemini/Antigravity dashboard skills | `C:\Users\skyks\.gemini\antigravity\skills.json` | `gemini:<id>` |
| Codex system/user/plugin skills | `C:\Users\skyks\.codex\skills` and `C:\Users\skyks\.codex\plugins\cache` | `codex-system:<id>`, `codex-user:<id>`, `codex-plugin:<id>` |

Dashboard-created skills through `/api/skills` are written according to `source`:

| Requested source | Write target |
| --- | --- |
| `gemini` | `C:\Users\skyks\.gemini\antigravity\skills.json` |
| `claude` | `C:\Users\skyks\Desktop\AgentDashboard\.claude\skills.json` |
| `codex-user` / `codex` | `C:\Users\skyks\.codex\skills\<skill-id>\SKILL.md` |

The SkillManager label is now "New Dashboard Skill" and exposes source selection plus an `instructions` field.

## Skill Assignment Source Of Truth

Active assignment file:

```text
C:\Users\skyks\.gemini\antigravity\data\skill_assignments.json
```

This is the file the backend uses now for `/api/ai/overview`, `/api/ai/skill-assignments`, and assignment writes.

The repo also has:

```text
C:\Users\skyks\Desktop\AgentDashboard\.claude\data\skill_assignments.json
```

That local file currently has fewer/older assignments and should not be treated as the active source of truth unless backend storage is changed.

## What Skill Assignment Actually Does

When a skill is assigned, the backend:

1. Updates `skill_assignments.json`.
2. Updates each agent's `capabilities` list with assigned skill names.
3. Includes direct agent assignments plus matching `model:<id>` and `provider:<id>` assignments when calculating an agent's effective skills.
4. Injects a dashboard skill block into the agent's prompt/persona Markdown file.
5. Exports dashboard-created skills assigned to Codex, or inherited by a Codex agent through model/provider assignment, into `C:\Users\skyks\.codex\skills\dashboard-<skill-key>\SKILL.md`.
6. Exports dashboard-created skills assigned to Gemini/Antigravity or Claude agents into runtime-local dashboard-managed skill directories.
7. Syncs active dashboard skills into `CLAUDE.md` if they are unassigned eligible skills or assigned to Claude agents.

The injected prompt block uses:

```md
<!-- DASHBOARD_SKILLS_START -->
### Capabilities & Skills
- **Skill Name**: description (Category: custom)
  - Instructions: full dashboard skill instructions when provided
<!-- DASHBOARD_SKILLS_END -->
```

## Agent Invocation

The dashboard API has a real invocation path:

| Endpoint | Behavior |
| --- | --- |
| `POST /api/chat` | Builds an agent execution prompt from the saved runtime persona file, dashboard-assigned skills, optional context, and user message. |
| `GET /api/chat/:agentId` | Returns persisted dashboard chat/invocation logs for one agent. |
| `GET /api/chats/all` | Returns recent dashboard chat/invocation logs. |
| `POST /api/agents/call` | Builds the same execution prompt for agent-to-agent calls. |

The AgentDetailPanel now exposes this path in the dashboard. The "Agent Invocation" section lets you type a task for the selected agent, preview the exact runtime prompt by default, or explicitly enable CLI execution. The preview mode is the safe default because it confirms persona plus assigned skill injection without spending tokens or launching an external CLI.

`POST /api/chat` accepts:

```json
{
  "agent_id": "agent-id",
  "message": "User task",
  "context": {},
  "execute": false
}
```

When `execute` is `false`, the endpoint returns the exact prompt and command preview without launching a CLI. When `execute` is `true`, it runs:

| Runtime | Command |
| --- | --- |
| `codex` | `codex run "<prompt>"` |
| `claude` | `claude -p "<prompt>"` |
| `antigravity` | `antigravity "<prompt>"` |

This proves the dashboard-created agent can be invoked with its assigned skill instructions. Actual model response still depends on the matching CLI being installed and authenticated on the machine.

## Cross-Runtime Skill Reality

| Assignment | Current behavior | Native runtime behavior |
| --- | --- | --- |
| Dashboard/Gemini skill -> Codex agent | Exports `SKILL.md` into `C:\Users\skyks\.codex\skills\dashboard-<skill-key>` and updates metadata/persona. | Closest to native Codex support. |
| Dashboard/Claude skill -> Codex agent | Same Codex export path as above. | Closest to native Codex support. |
| Codex skill -> Gemini/Antigravity agent | Updates assignment metadata, capabilities, and persona prompt. | Not a native Gemini tool install. |
| Codex skill -> Claude agent | Updates assignment metadata, capabilities, and persona prompt. | Not a true Claude Code skill install. |
| Skill -> model/provider | Stored as assignment metadata; agents using that model/provider inherit it during capability/prompt sync. | Works through dashboard sync, not through provider APIs. |
| Skill -> subagent | Stored as assignment metadata and exported to the Antigravity dashboard-managed skill directory for subagent targets. | Execution inheritance depends on how the subagent reads its prompt/config. |

Answer to "Can I give your Codex skills to a Gemini agent?":

Yes, the dashboard can assign a Codex skill to an Antigravity/Gemini target. It will appear in the control plane and be injected into the agent persona/capabilities. It does not mean Gemini natively receives Codex's MCP tools, plugin runtime, or executable skill loader.

## Codex Screen And Subagents

The Codex control panel reads `getCodexInventory()`.

It shows:

- Codex home path.
- Config snapshot.
- Installed Codex skills from `C:\Users\skyks\.codex\skills` and `C:\Users\skyks\.codex\plugins\cache`.
- Recent Codex sessions from `C:\Users\skyks\.codex\session_index.jsonl`.
- Configured Codex agents from:
  - `C:\Users\skyks\.codex\agents.json`
  - `C:\Users\skyks\.codex\agents\*.md`

It does not currently inspect live Codex subagents created inside the Codex desktop thread unless they are persisted into the Codex agent files above. The "your subagents" visible in this dashboard are Antigravity subagents exposed through:

```text
GET /api/antigravity/subagents
```

Those are shown as targets in the Skill Matrix under Antigravity/Subagents, not as live Codex subagents in the Codex screen.

## Hook Execution

Hooks can run an executor:

| Hook agent value | Command |
| --- | --- |
| `antigravity` | `antigravity "<prompt>"` |
| `claude` | `claude -p "<prompt>"` |
| `codex` | `codex run "<prompt>"` |
| `none` | raw shell command |

This is command-level execution. It does not automatically select a created dashboard agent persona unless the CLI command itself supports that and the command is extended.

## Verified Current Files

Checked on 2026-06-02:

- `C:\Users\skyks\.gemini\antigravity\agents.json`: exists.
- `C:\Users\skyks\.gemini\antigravity\skills.json`: exists.
- `C:\Users\skyks\.gemini\antigravity\data\skill_assignments.json`: exists and has active assignments.
- `C:\Users\skyks\.gemini\antigravity\subagents.json`: exists.
- `C:\Users\skyks\Desktop\AgentDashboard\.claude\agents.json`: exists.
- `C:\Users\skyks\Desktop\AgentDashboard\.claude\skills.json`: exists.
- `C:\Users\skyks\.codex\skills\.system\...\SKILL.md`: exists.
- `C:\Users\skyks\.codex\agents.json`: created by backend when a Codex agent is saved.
- `C:\Users\skyks\.codex\agents`: created by backend when a Codex agent prompt is saved.

## Known Gaps To Fix

1. Decide whether `.claude/data/skill_assignments.json` is obsolete or should be resynced from `C:\Users\skyks\.gemini\antigravity\data\skill_assignments.json`.
2. Broaden direct tests for `syncAgentCapabilities()` edge cases and dashboard-managed `SKILL.md` export cleanup.
3. Add real Codex live subagent/session parsing if those should appear in the Codex screen without being persisted as Codex agents.
4. Add native runtime adapters if cross-runtime skill assignment should execute provider-specific tools, not just inject instructions and managed skill markdown.

## Recommended Future Skill For Auto-Updating This Document

A future documentation-maintenance skill should read only these high-signal files first:

- `backend-node/server.ts`
- `backend-node/lib/agentExecution.ts`
- `backend-node/agentExecution.test.ts`
- `backend-node/lib/aiControlPlane.ts`
- `backend-node/lib/codexInventory.ts`
- `src/components/AgentModal.tsx`
- `src/components/AgentDetailPanel.tsx`
- `src/components/AgentList.tsx`
- `src/components/SkillManager.tsx`
- `src/components/CodexControlPanel.tsx`
- `src/lib/api.ts`
- `src/types/index.ts`
- `docs/agent-runtime-system.md`

Then it should optionally verify:

- `C:\Users\skyks\.gemini\antigravity\agents.json`
- `C:\Users\skyks\.gemini\antigravity\skills.json`
- `C:\Users\skyks\.gemini\antigravity\data\skill_assignments.json`
- `C:\Users\skyks\.codex\agents.json`
- `C:\Users\skyks\.codex\skills`
- `C:\Users\skyks\Desktop\AgentDashboard\.claude\agents.json`
- `C:\Users\skyks\Desktop\AgentDashboard\.claude\skills.json`

Suggested update rule:

- Treat this file as the canonical short audit.
- Update it when any route, storage path, target key, skill source key, or UI grouping rule changes.
- Keep claims separated into "metadata works", "prompt injection works", and "native runtime execution works".

## Verification

Ran:

```powershell
npm test --prefix backend-node
npx tsc --noEmit
npx tsc --noEmit --project backend-node\tsconfig.json
npm run build
```

Also ran an isolated API smoke test with a temporary HOME/USERPROFILE:

- Created a Gemini dashboard skill with instruction `E2E_SKILL_INSTRUCTION_MUST_APPEAR`.
- Created a Codex runtime agent with that skill assigned.
- Called `POST /api/chat` with `execute: false`.
- Verified the generated invocation prompt included the skill instruction.
- Verified the Codex agent prompt file existed.
- Verified the exported Codex dashboard skill file existed.

Result:

- 7 backend tests passed.
- `aiControlPlane` tests passed.
- `codexInventory` tests passed.
- `agentExecution` tests passed.
- Root TypeScript passed.
- Backend TypeScript passed.
- Next production build passed.
- API smoke test passed.
