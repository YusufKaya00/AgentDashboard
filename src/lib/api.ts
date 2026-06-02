// API Client
import type { AIControlPlaneOverview, AITarget, SkillAssignment } from '@/types';

const API_BASE = 'http://127.0.0.1:8000/api';

export const api = {
  // Agents
  getAgents: async (): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/agents`);
    return res.json();
  },
  getAgent: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/agents/${id}`);
    return res.json();
  },
  createAgent: async (agent: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agent),
    });
    return res.json();
  },
  updateAgent: async (id: string, agent: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agent),
    });
    return res.json();
  },
  deleteAgent: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/agents/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },
  activateAgent: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/agents/${id}/activate`, {
      method: 'POST',
    });
    return res.json();
  },
  deactivateAgent: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/agents/${id}/deactivate`, {
      method: 'POST',
    });
    return res.json();
  },
  getSubordinates: async (agentId: string): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/agents/${agentId}/subordinates`);
    return res.json();
  },
  getAgentPrompt: async (id: string): Promise<{ prompt: string }> => {
    const res = await fetch(`${API_BASE}/agents/${id}/prompt`);
    return res.json();
  },

  // Chat
  chat: async (agentId: string, message: string, context: any = {}, execute = false): Promise<any> => {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agentId, message, context, execute }),
    });
    return res.json();
  },
  getChatHistory: async (agentId: string, limit: number = 50): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/chat/${agentId}?limit=${limit}`);
    return res.json();
  },

  // Agent-to-Agent
  callAgent: async (fromAgentId: string, toAgentId: string, task: string, context: any = {}, execute = false): Promise<any> => {
    const res = await fetch(`${API_BASE}/agents/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_agent_id: fromAgentId, to_agent_id: toAgentId, task, context, execute }),
    });
    return res.json();
  },

  // Tasks
  getTasks: async (agentId?: string, status?: string): Promise<any[]> => {
    const params = new URLSearchParams();
    if (agentId) params.append('agent_id', agentId);
    if (status) params.append('status', status);
    const res = await fetch(`${API_BASE}/tasks?${params.toString()}`);
    return res.json();
  },
  getTask: async (taskId: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`);
    return res.json();
  },
  createTask: async (task: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    return res.json();
  },
  updateTask: async (taskId: string, task: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    return res.json();
  },
  executeTask: async (taskId: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/execute`, {
      method: 'POST',
    });
    return res.json();
  },
  deleteTask: async (taskId: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'DELETE',
    });
    return res.json();
  },
  getTasksStats: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/tasks/stats`);
    return res.json();
  },

  // Analytics
  getAnalytics: async (range: string = '7d'): Promise<any> => {
    const res = await fetch(`${API_BASE}/analytics?range=${range}`);
    return res.json();
  },

  // Memory
  getMemory: async (agentId: string): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/memory/${agentId}`);
    return res.json();
  },
  getMemoryItem: async (agentId: string, key: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/memory/${agentId}/${key}`);
    return res.json();
  },
  createMemory: async (memory: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memory),
    });
    return res.json();
  },
  updateMemory: async (agentId: string, key: string, value: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/memory/${agentId}/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
    return res.json();
  },
  deleteMemory: async (agentId: string, key: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/memory/${agentId}/${key}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // Training
  getTrainingData: async (agentId: string): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/training/${agentId}`);
    return res.json();
  },
  createTrainingData: async (data: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/training`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  trainAgent: async (agentId: string, epochs: number = 10): Promise<any> => {
    const res = await fetch(`${API_BASE}/agents/${agentId}/train?epochs=${epochs}`, {
      method: 'POST',
    });
    return res.json();
  },

  // Hooks
  getHooks: async (): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/hooks`);
    return res.json();
  },
  getHook: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/hooks/${id}`);
    return res.json();
  },
  createHook: async (hook: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/hooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hook),
    });
    return res.json();
  },
  updateHook: async (id: string, hook: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/hooks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hook),
    });
    return res.json();
  },
  deleteHook: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/hooks/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },
  toggleHook: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/hooks/${id}/toggle`, {
      method: 'POST',
    });
    return res.json();
  },

  // Models
  getModels: async (): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/models`);
    return res.json();
  },
  getModel: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/models/${id}`);
    return res.json();
  },
  createModel: async (model: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/models`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(model),
    });
    return res.json();
  },
  updateModel: async (id: string, model: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/models/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(model),
    });
    return res.json();
  },
  deleteModel: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/models/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },
  toggleModel: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/models/${id}/toggle`, {
      method: 'POST',
    });
    return res.json();
  },

  // Activity
  getActivity: async (limit: number = 100): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/activity?limit=${limit}`);
    return res.json();
  },
  getAgentActivity: async (agentId: string, limit: number = 50): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/activity/agent/${agentId}?limit=${limit}`);
    return res.json();
  },

  // Stats
  getStats: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/stats`);
    return res.json();
  },

  // Skills
  getSkills: async (): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/skills`);
    return res.json();
  },
  getSkillsStats: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/skills/stats`);
    return res.json();
  },
  createSkill: async (skill: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skill),
    });
    return res.json();
  },
  updateSkill: async (skillId: string, skill: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/skills/${skillId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skill),
    });
    return res.json();
  },
  deleteSkill: async (skillId: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/skills/${skillId}`, {
      method: 'DELETE',
    });
    return res.json();
  },
  toggleSkill: async (skillId: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/skills/${skillId}/toggle`, {
      method: 'POST',
    });
    return res.json();
  },

  // Agent Summary
  getAgentsSummary: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/agents/summary`);
    return res.json();
  },

  // Chat Logs
  getAllChatLogs: async (limit: number = 100): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/chats/all?limit=${limit}`);
    return res.json();
  },

  // System Status
  getSystemStatus: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/system/status`);
    return res.json();
  },

  // Detailed Activities
  getDetailedActivities: async (limit: number = 100): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/activities/detailed?limit=${limit}`);
    return res.json();
  },
  
  // Monitoring Logs
  getCLILogs: async (limit: number = 100): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/logs/cli?limit=${limit}`);
    return res.json();
  },
  getSprintLogs: async (limit: number = 100): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/logs/sprints?limit=${limit}`);
    return res.json();
  },
  
  // CLI Proxy Sessions
  getCLISessions: async (): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/cli/sessions`);
    return res.json();
  },
  getCLIMessages: async (sessionId: string): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/cli/sessions/${sessionId}`);
    return res.json();
  },

  // Codex
  getCodexOverview: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/codex/overview`);
    return res.json();
  },

  // Claude Code
  getClaudeOverview: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/claude/overview`);
    return res.json();
  },

  // Antigravity
  getAntigravityOverview: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/antigravity/overview`);
    return res.json();
  },
  getAntigravitySubagents: async (): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/antigravity/subagents`);
    return res.json();
  },
  updateAntigravitySubagent: async (id: string, subagent: { role?: string; description?: string; rules?: string }): Promise<any> => {
    const res = await fetch(`${API_BASE}/antigravity/subagents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subagent),
    });
    return res.json();
  },

  // General AI Control Plane
  getAIOverview: async (): Promise<AIControlPlaneOverview> => {
    const res = await fetch(`${API_BASE}/ai/overview`);
    return res.json();
  },
  getAITargets: async (): Promise<AITarget[]> => {
    const res = await fetch(`${API_BASE}/ai/targets`);
    return res.json();
  },
  getSkillAssignments: async (): Promise<SkillAssignment[]> => {
    const res = await fetch(`${API_BASE}/ai/skill-assignments`);
    return res.json();
  },
  replaceSkillAssignments: async (skillKey: string, targetKeys: string[]): Promise<{ success: boolean; assignments: SkillAssignment[] }> => {
    const res = await fetch(`${API_BASE}/ai/skills/${encodeURIComponent(skillKey)}/assignments`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_keys: targetKeys }),
    });
    return res.json();
  },

  // Providers
  getProviders: async (): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/providers`);
    return res.json();
  },
  createProvider: async (provider: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/providers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(provider),
    });
    return res.json();
  },
  deleteProvider: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/providers/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },
  testProvider: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/providers/${id}/test`, {
      method: 'POST',
    });
    return res.json();
  },

  // CLAUDE.md and Skill Syncing
  getClaudeMd: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/claude-md`);
    return res.json();
  },
  updateClaudeMd: async (content: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/claude-md`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    return res.json();
  },
  syncAllSkills: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/skills/sync-all`, {
      method: 'POST',
    });
    return res.json();
  },

  // Terminal Execution
  executeTerminalCommand: async (command: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/terminal/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
    return res.json();
  },
};

// WebSocket connection
export const connectWebSocket = (onMessage: (data: any) => void) => {
  const host = typeof window !== 'undefined' ? window.location.host.split(':')[0] + ':8000' : '127.0.0.1:8000';
  const ws = new WebSocket(`ws://${host}/ws`);
  let heartbeatInterval: NodeJS.Timeout | null = null;

  ws.onopen = () => {
    console.log('WebSocket connected');
    // Send heartbeat every 15 seconds to keep connection alive
    heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 15000);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('WebSocket message:', data);
      onMessage(data);
    } catch (e) {
      console.error('Error parsing WebSocket message:', e);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
  };

  return ws;
};
