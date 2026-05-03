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

### Core Paths
- **API Base**: `http://localhost:8000/api`
- **WebSocket**: `ws://localhost:8000`
- **CLI Sessions**: Local storage in `~/.claude/projects/`

## 🛠 Coding Standards
- **Unified Stack**: Use TypeScript for both Frontend and Backend.
- **Backend Execution**: Always use `tsx` for running the backend (avoids ESM/CJS conflicts).
- **Styling**: TailwindCSS for the dashboard UI.
- **Data Persistence**: Prefer JSON and Markdown in `.claude/` directory over external databases.

---
*Optimized for AI Agents and Senior Developers. Maintain the single-language (TypeScript) architecture at all costs.*
