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
  enabled?: boolean;
  active?: boolean;
  agent?: 'antigravity' | 'claude' | 'codex' | 'none';
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
  title: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'failed';
  assigned_to: string;
  dependencies?: string[];
  estimated_hours?: number;
  command?: string;
  result?: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
  metadata?: Record<string, any>;
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

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  version?: string;
  language?: string;
  file_path?: string;
  tags?: string[];
  usage_count?: number;
  created_at: string;
}

export interface CodexAgent {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
}

export interface CodexSkill {
  id: string;
  name: string;
  description: string;
  source: 'system' | 'plugin' | 'user';
  file_path: string;
  updated_at: string | null;
}

export interface CodexOverview {
  runtime: {
    name: 'Codex';
    codex_home: string;
    workspace_dir: string;
    available: boolean;
  };
  agents: CodexAgent[];
  skills: {
    total: number;
    by_source: Record<'system' | 'plugin' | 'user', number>;
    items: CodexSkill[];
  };
  config: {
    files: Array<{ name: string; exists: boolean; updated_at: string | null }>;
    redacted: Record<string, string>;
  };
  sessions: {
    total: number;
    recent: Array<Record<string, unknown>>;
  };
}

export type SkillSource = 'claude' | 'codex-system' | 'codex-plugin' | 'codex-user';
export type AITargetType = 'claude_agent' | 'codex_agent' | 'antigravity_agent' | 'model' | 'provider';

export interface SkillAssignment {
  skill_key: string;
  skill_id: string;
  skill_source: SkillSource;
  target_key: string;
  target_type: AITargetType;
  target_id: string;
  created_at: string;
  updated_at: string;
}

export interface UnifiedSkill {
  skill_key: string;
  id: string;
  name: string;
  description: string;
  source: SkillSource;
  origin: 'claude' | 'codex';
  category: string;
  enabled: boolean;
  file_path?: string;
  assigned_targets: SkillAssignment[];
}

export interface AITarget {
  target_key: string;
  id: string;
  name: string;
  type: AITargetType;
  provider?: string;
  status?: string;
  metadata: Record<string, string | boolean | undefined>;
}

export interface AIControlPlaneOverview {
  skills: UnifiedSkill[];
  targets: AITarget[];
  assignments: SkillAssignment[];
  summary: {
    skills: number;
    targets: number;
    assignments: number;
    codex_skills: number;
    claude_skills: number;
  };
}

export interface AntigravityOverview {
  antigravity_home: string;
  workspace_dir: string;
  files: Array<{
    name: string;
    exists: boolean;
    size: number;
    updated_at: string | null;
  }>;
}
