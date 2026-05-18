# General AI Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Convert the Claude-focused dashboard into a general AI control plane where skills from Claude and Codex are visible together and can be assigned to Claude agents, Codex roles, models, providers, and future AI targets.

**Architecture:** Add a backend control-plane layer that normalizes skills, assignable targets, and skill assignments into stable JSON APIs. Keep source-specific data where it belongs (`.claude/skills.json`, `.claude/data/agents.json`, `~/.codex`) and store cross-runtime assignments in `.claude/data/skill_assignments.json` as dashboard-managed metadata. Upgrade the Skills UI into a unified catalog plus assignment matrix, then reuse the same target model from agent/model/provider screens.

**Tech Stack:** Next.js 16 App Router client components, React 19, Tailwind CSS 4, Express/TypeScript backend, JSON/Markdown local persistence, Node `tsx --test`.

---

## File Structure

- Create `backend-node/lib/aiControlPlane.ts`: pure helpers for unified skills, assignable targets, and assignment persistence.
- Create `backend-node/aiControlPlane.test.ts`: TDD coverage for mixed Claude/Codex skills and future target assignment.
- Modify `backend-node/server.ts`: expose `/api/ai/overview`, `/api/ai/targets`, `/api/ai/skill-assignments`, and assignment update endpoints.
- Modify `src/types/index.ts`: add `UnifiedSkill`, `AITarget`, `SkillAssignment`, and `AIControlPlaneOverview`.
- Modify `src/lib/api.ts`: add control-plane client calls.
- Modify `src/components/SkillManager.tsx`: replace Claude-only skill list with unified catalog, source filters, target chips, and assignment editor.
- Modify `src/components/AgentModal.tsx`: use the same unified targets/skills later so creating a Claude agent can show assigned skills consistently.
- Modify `src/components/ModelList.tsx` and `src/components/AIProviderManager.tsx`: later surface assigned skills per model/provider.

## Data Model

`skill_assignments.json` stores records like:

```json
[
  {
    "skill_key": "claude:update-config",
    "skill_id": "update-config",
    "skill_source": "claude",
    "target_key": "claude_agent:team_leader",
    "target_type": "claude_agent",
    "target_id": "team_leader",
    "created_at": "2026-05-18T00:00:00.000Z",
    "updated_at": "2026-05-18T00:00:00.000Z"
  }
]
```

Target types:

- `claude_agent`
- `codex_agent`
- `model`
- `provider`

Skill sources:

- `claude`
- `codex-system`
- `codex-plugin`
- `codex-user`

## Task 1: Backend Control-Plane Helpers

**Files:**
- Create: `backend-node/lib/aiControlPlane.ts`
- Create: `backend-node/aiControlPlane.test.ts`

- [x] **Step 1: Write failing tests**

Add tests that create sample Claude skills, Codex inventory skills, Claude agents, Codex agents, models, and providers. Assert that unified skills include stable `skill_key` values, targets include future-safe `target_key` values, and assignment replacement only touches the selected skill.

- [x] **Step 2: Run tests to verify failure**

Run: `cd backend-node && npm test`

Expected: FAIL because `backend-node/lib/aiControlPlane.ts` does not exist.

- [x] **Step 3: Implement helpers**

Implement:

- `buildUnifiedSkills(claudeSkills, codexSkills, assignments)`
- `buildAITargets({ agents, codexAgents, models, providers })`
- `replaceSkillAssignments(existingAssignments, request, now)`

- [x] **Step 4: Run tests to verify pass**

Run: `cd backend-node && npm test`

Expected: PASS for `codexInventory.test.ts` and `aiControlPlane.test.ts`.

## Task 2: Backend API

**Files:**
- Modify: `backend-node/server.ts`

- [x] **Step 1: Add assignment storage path**

Use `.claude/data/skill_assignments.json`.

- [x] **Step 2: Add overview endpoints**

Add:

- `GET /api/ai/overview`
- `GET /api/ai/targets`
- `GET /api/ai/skill-assignments`
- `PUT /api/ai/skills/:encodedSkillKey/assignments`

- [x] **Step 3: Verify API manually**

Run:

```powershell
Invoke-RestMethod http://localhost:8000/api/ai/overview
```

Expected: JSON with `skills`, `targets`, and `assignments`.

## Task 3: Unified Skills UI

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/components/SkillManager.tsx`

- [x] **Step 1: Add frontend types and API methods**

Add typed methods for `getAIOverview()` and `replaceSkillAssignments(skillKey, targetKeys)`.

- [x] **Step 2: Replace Claude-only list with unified catalog**

Show each skill with source, description, path/category, assigned target count, and assigned target names.

- [x] **Step 3: Add assignment editor**

When a skill is selected, show checkboxes grouped by Claude agents, Codex roles, models, and providers. Saving replaces assignments for that skill.

- [x] **Step 4: Verify in browser**

Open `http://localhost:3000`, go to Skills, confirm Codex skills appear and can be assigned to `Default Codex`, `Explorer`, `Worker`, and Claude agents.

## Task 4: Agent, Model, Provider Surfaces

**Files:**
- Modify: `src/components/AgentModal.tsx`
- Modify: `src/components/ModelList.tsx`
- Modify: `src/components/AIProviderManager.tsx`

- [x] **Step 1: Show assigned skills on each target**

Use `AIControlPlaneOverview.assignments` to display skills per target.

- [x] **Step 2: Use shared assignment editor or target detail panel**

Avoid separate relationship logic in each component.

- [x] **Step 3: Verify future model support**

Create a custom model/provider and confirm it appears as an assignment target without code changes.

## Task 5: Final Verification

**Files:**
- All modified files

- [x] **Step 1: Run backend tests**

Run: `cd backend-node && npm test`

- [x] **Step 2: Run focused lint**

Run: `npx eslint src/components/SkillManager.tsx src/components/CodexControlPanel.tsx backend-node/lib/aiControlPlane.ts backend-node/lib/codexInventory.ts`

- [x] **Step 3: Run production build**

Run: `npm run build`

- [x] **Step 4: Browser smoke test**

Open dashboard, verify Skills and Codex tabs load without console errors.

## Self-Review

- Spec coverage: Skills show Claude and Codex sources; assignments support Claude, Codex, model, provider, and future targets.
- Placeholder scan: No implementation step depends on an undefined target type or endpoint.
- Type consistency: `skill_key` and `target_key` are the stable cross-runtime identifiers throughout backend, API, and UI.
