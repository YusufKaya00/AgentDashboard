# Commands

- **Run Dev Environment (Frontend & Backend)**: `npm run dev`
- **Run Frontend Only**: `npx next dev`
- **Run Backend Only**: `npm run dev --prefix backend-node`
- **Build Frontend**: `npm run build`
- **Lint Frontend**: `npm run lint`
- **Run Backend Tests**: `npm run test --prefix backend-node`

---

# Multi-Agent Control Plane Support

This project supports the orchestration of three major agent runtimes:
1. **Antigravity Core**: Handles deep task reasoning, planning, and tool execution. Settings and logs are synced to `~/.gemini/antigravity/`.
2. **Claude Code**: Anthropic's interactive agent harness. Integrated via `.claude/` local skills and configurations.
3. **Codex Engine**: Specialized agent workspace management. Integrates with user/system/plugin inventories from `~/.codex/`.

---

# Workflow Orchestration

## 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

## 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

## 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

## 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

## 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

## 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

# Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

---

# Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

<!-- DASHBOARD_SKILLS_START -->
## 🛠 Active Skills (Dashboard Synced)

### update-config
- **Category:** configuration
- **Description:** Configure the Claude Code harness via settings.json

### keybindings-help
- **Category:** configuration
- **Description:** Customize keyboard shortcuts and keybindings

### simplify
- **Category:** code-review
- **Description:** Review changed code for reuse, quality, and efficiency

### init
- **Category:** documentation
- **Description:** Initialize a new CLAUDE.md file with codebase documentation

### review
- **Category:** code-review
- **Description:** Review a pull request

### security-review
- **Category:** security
- **Description:** Complete a security review of the pending changes

### fewer-permission-prompts
- **Category:** configuration
- **Description:** Scan transcripts for common read-only Bash and MCP tool calls

### loop
- **Category:** automation
- **Description:** Run a prompt or slash command on a recurring interval

### schedule
- **Category:** automation
- **Description:** Create, update, list, or run scheduled remote agents

### claude-api
- **Category:** development
- **Description:** Build, debug, and optimize Claude API / Anthropic SDK apps

### performance-tuning
- **Category:** performance
- **Description:** Optimize Next.js web application load time, asset delivery, and database query latency.

### seo-optimization
- **Category:** marketing-seo
- **Description:** Scan pages to automatically audit and implement metadata, structured schema markup, and Google Search Console compliance.

### vitest-testing
- **Category:** qa-testing
- **Description:** Generate high-coverage unit and integration tests using Vitest and React Testing Library.

### dependency-sec-audit
- **Category:** security
- **Description:** Run npm audit, verify package licenses, check for deprecations, and upgrade safe dependencies.

### tailwind-refactoring
- **Category:** styling
- **Description:** Convert custom CSS and inline styling to modern Tailwind utility classes using optimal design tokens.

### framer-motion-effects
- **Category:** ui-ux
- **Description:** Design and implement premium glassmorphic hover animations and page transition effects.

<!-- DASHBOARD_SKILLS_END -->
