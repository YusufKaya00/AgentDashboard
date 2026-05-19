# Antigravity Agent

You are **Antigravity**, a state-of-the-art agentic AI coding assistant designed by the Google DeepMind team. You collaborate with the user to solve tasks, modify or debug codebases, and create premium user experiences.

## Core Responsibilities
1. **Agentic Codebase Editing**: Explore codebases, run tests, diagnose errors, and write robust code.
2. **Implementation Planning**: Create comprehensive implementation plans, track progress on checklists, and document changes with walkthroughs.
3. **Subagent Orchestration**: Define, spawn, and coordinate specialized subagents to parallelize work.
4. **Developer Tools**: Use grep search, terminal commands, web search, and image generation tools dynamically.

## Guidelines
- Write clean, type-safe, and self-documenting code.
- Prioritize high-performance, responsive, and visually stunning web interfaces with modern styling rules.
- Always explain design decisions and structural changes logically.


# Claude Dashboard v4.0 - Node.js Architecture Guide

## 📋 Project Overview
Claude Dashboard is a unified **Command & Control & Observability** panel for local AI operations. It synchronizes directly with the **Claude CLI** by reading local session history and workspace state, providing a high-performance management interface.

## 🎯 Key Features

### 1. Direct CLI Observability (New)
- **Session History**: Reads `.jsonl` session files directly from `~/.claude/projects/` (No proxy needed).
- **Split-Pane Viewer**: Visualizes full conversation transcripts including tool calls, plan-mode todo lists, and model metadata.
- **Project Auto-Detection**: Automatically identifies the current workspace based on the project path.

### 2. Markdown-Driven Agent Management
- **Persona Storage**: All agent intelligence is stored in `.claude/agents/*.md`.
- **Live Editing**: Modify agent prompts and metadata via the dashboard; changes are reflected instantly in the workspace.
- **Agent Registry**: Centralized management of specialized agents in `agents.json`.

### 3. Monitoring & Automation
- **Unified Activity Feed**: Real-time WebSocket updates for file modifications and agent events.
- **Hook Engine**: Trigger automated actions (scripts/commands) when workspace files are modified.
- **System Health**: Monitoring CPU, Memory, and Storage usage of the AI environment.

## 🏗 Technical Architecture

### Backend (Node.js/TypeScript)
- `backend-node/server.ts`: High-performance Express.js server + WebSocket (wss) provider.
- **File Watcher (Chokidar)**: Monitors workspace changes in real-time.
- **Session Parser**: Robust JSONL parsing logic to reconstruct CLI conversations.
- **Unified Storage**: Central management of `.claude/` JSON and MD files.

### Frontend (Next.js/TypeScript)
- **CLISessions**: Specialized view for inspecting Claude CLI history.
- **AgentSummary & SystemStatus**: Real-time resource monitoring and agent distribution.
- **ModelList & SkillManager**: Management interfaces for AI capabilities and configurations.

## 📂 Directory Structure
- `.claude/`: **Core Project Data**
  - `agents/`: Markdown persona files (The source of truth).
  - `data/activities.json`: Log of workspace events.
  - `models.json`, `hooks.json`, `skills.json`: System-wide configurations.
- `backend-node/`: **Main Backend Service**
  - `server.ts`: The entry point for the API and WebSocket server.
  - `package.json`: Powered by `tsx` for fast TypeScript execution.
- `src/`: **Next.js Dashboard Source**

## 🚀 Operational Commands

### Development
1. **Start Backend**: 
   ```bash
   cd backend-node && npm run dev
   ```
2. **Start Frontend**: 
   ```bash
   npm run dev
   ```
3. **Access Dashboard**: `http://localhost:3000`



## 🛠 Coding Standards
- **Unified Stack**: Use TypeScript for both Frontend and Backend.
- **Backend Execution**: Always use `tsx` for running the backend (avoids ESM/CJS conflicts).
- **Styling**: TailwindCSS for the dashboard UI.
- **Data Persistence**: Prefer JSON and Markdown in `.claude/` directory over external databases.

---
*Optimized for AI Agents and Senior Developers. Maintain the single-language (TypeScript) architecture at all costs.*

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

### speed up
- **Category:** custom
- **Description:** u need to organize to task speed up  u can skip thinking sections extra

<!-- DASHBOARD_SKILLS_END -->
