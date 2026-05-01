// API Types
export interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  status: 'active' | 'inactive' | 'error';
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_activity?: string;
  role?: 'team_lead' | 'worker' | 'specialist';
  parent_agent_id?: string;
  capabilities: string[];
}

export interface Hook {
  id: string;
  name: string;
  type: 'pre' | 'post' | 'error';
  trigger: string;
  action: string;
  enabled: boolean;
  config: Record<string, any>;
  created_at: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'codex' | 'antigravity' | 'custom';
  api_endpoint?: string;
  api_key?: string;
  model_id: string;
  capabilities: string[];
  enabled: boolean;
  config: Record<string, any>;
}

export interface ActivityLog {
  id: string;
  agent_id: string;
  type: 'request' | 'response' | 'error' | 'hook';
  message: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface Stats {
  total_agents: number;
  active_agents: number;
  total_hooks: number;
  enabled_hooks: number;
  total_models: number;
  enabled_models: number;
  total_activities: number;
  total_tasks: number;
  total_messages: number;
  total_memory: number;
}

export interface Message {
  id: string;
  agent_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface Task {
  id: string;
  agent_id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  created_at: string;
  completed_at?: string;
  metadata: Record<string, any>;
}

export interface Memory {
  id: string;
  agent_id: string;
  key: string;
  value: any;
  created_at: string;
  updated_at: string;
  ttl?: number;
}

export interface TrainingData {
  id: string;
  agent_id: string;
  prompt: string;
  completion: string;
  created_at: string;
  metadata: Record<string, any>;
}

export interface ChatRequest {
  agent_id: string;
  message: string;
  context?: Record<string, any>;
  tools?: string[];
}

export interface AgentCallRequest {
  from_agent_id: string;
  to_agent_id: string;
  task: string;
  context?: Record<string, any>;
}
