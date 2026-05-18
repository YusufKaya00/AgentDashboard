import type { CodexInventory } from './codexInventory.js';

export type SkillSource = 'claude' | 'codex-system' | 'codex-plugin' | 'codex-user';
export type TargetType = 'claude_agent' | 'codex_agent' | 'model' | 'provider';

export interface DashboardSkill {
  id: string;
  name: string;
  description?: string;
  category?: string;
  enabled?: boolean;
  active?: boolean;
  file_path?: string;
}

export interface DashboardAgent {
  id: string;
  name: string;
  status?: string;
  model?: string;
}

export interface DashboardModel {
  id: string;
  name: string;
  provider?: string;
  enabled?: boolean;
}

export interface DashboardProvider {
  id: string;
  name: string;
  type?: string;
  active?: boolean;
}

export interface SkillAssignment {
  skill_key: string;
  skill_id: string;
  skill_source: SkillSource;
  target_key: string;
  target_type: TargetType;
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
  type: TargetType;
  provider?: string;
  status?: string;
  metadata: Record<string, string | boolean | undefined>;
}

export interface BuildTargetInput {
  agents: DashboardAgent[];
  codexAgents: CodexInventory['agents'];
  models: DashboardModel[];
  providers: DashboardProvider[];
}

export interface ReplaceAssignmentRequest {
  skill_key: string;
  target_keys: string[];
}

const sourceForCodexSkill = (source: string): SkillSource => {
  if (source === 'system') return 'codex-system';
  if (source === 'user') return 'codex-user';
  return 'codex-plugin';
};

const splitKey = <T extends string>(value: string): { type: T; id: string } => {
  const [type, ...idParts] = value.split(':');
  return { type: type as T, id: idParts.join(':') };
};

const assignmentPartsForSkill = (skillKey: string) => {
  const { type, id } = splitKey<SkillSource>(skillKey);
  return { skill_source: type, skill_id: id };
};

const normalizeEnabled = (skill: DashboardSkill) => skill.enabled ?? skill.active ?? true;

export const buildUnifiedSkills = (
  claudeSkills: DashboardSkill[],
  codexSkills: CodexInventory['skills']['items'],
  assignments: SkillAssignment[]
): UnifiedSkill[] => {
  const claudeUnified = claudeSkills.map((skill) => {
    const skillKey = `claude:${skill.id}`;
    return {
      skill_key: skillKey,
      id: skill.id,
      name: skill.name,
      description: skill.description || 'No description available',
      source: 'claude' as const,
      origin: 'claude' as const,
      category: skill.category || 'custom',
      enabled: normalizeEnabled(skill),
      file_path: skill.file_path,
      assigned_targets: assignments.filter((assignment) => assignment.skill_key === skillKey),
    };
  });

  const codexUnified = codexSkills.map((skill) => {
    const source = sourceForCodexSkill(skill.source);
    const skillKey = `${source}:${skill.id}`;
    return {
      skill_key: skillKey,
      id: skill.id,
      name: skill.name,
      description: skill.description,
      source,
      origin: 'codex' as const,
      category: skill.source,
      enabled: true,
      file_path: skill.file_path,
      assigned_targets: assignments.filter((assignment) => assignment.skill_key === skillKey),
    };
  });

  return [...claudeUnified, ...codexUnified].sort((a, b) => a.name.localeCompare(b.name));
};

export const buildAITargets = ({ agents, codexAgents, models, providers }: BuildTargetInput): AITarget[] => {
  const claudeTargets = agents.map((agent) => ({
    target_key: `claude_agent:${agent.id}`,
    id: agent.id,
    name: agent.name,
    type: 'claude_agent' as const,
    provider: 'claude',
    status: agent.status,
    metadata: {
      model: agent.model,
      active: agent.status === 'active',
    },
  }));

  const codexTargets = codexAgents.map((agent) => ({
    target_key: `codex_agent:${agent.id}`,
    id: agent.id,
    name: agent.name,
    type: 'codex_agent' as const,
    provider: 'codex',
    status: agent.role,
    metadata: {
      role: agent.role,
      active: true,
    },
  }));

  const modelTargets = models.map((model) => ({
    target_key: `model:${model.id}`,
    id: model.id,
    name: model.name,
    type: 'model' as const,
    provider: model.provider,
    status: model.enabled === false ? 'inactive' : 'active',
    metadata: {
      provider: model.provider,
      active: model.enabled !== false,
    },
  }));

  const providerTargets = providers.map((provider) => ({
    target_key: `provider:${provider.id}`,
    id: provider.id,
    name: provider.name,
    type: 'provider' as const,
    provider: provider.type,
    status: provider.active === false ? 'inactive' : 'active',
    metadata: {
      provider: provider.type,
      active: provider.active !== false,
    },
  }));

  return [...claudeTargets, ...codexTargets, ...modelTargets, ...providerTargets];
};

export const replaceSkillAssignments = (
  existingAssignments: SkillAssignment[],
  request: ReplaceAssignmentRequest,
  now: string
): SkillAssignment[] => {
  const { skill_source, skill_id } = assignmentPartsForSkill(request.skill_key);
  const existingForOtherSkills = existingAssignments.filter((assignment) => assignment.skill_key !== request.skill_key);
  const existingForSkill = existingAssignments.filter((assignment) => assignment.skill_key === request.skill_key);

  const nextForSkill = request.target_keys.map((targetKey) => {
    const { type: target_type, id: target_id } = splitKey<TargetType>(targetKey);
    const previous = existingForSkill.find((assignment) => assignment.target_key === targetKey);

    return {
      skill_key: request.skill_key,
      skill_id,
      skill_source,
      target_key: targetKey,
      target_type,
      target_id,
      created_at: previous?.created_at || now,
      updated_at: now,
    };
  });

  return [...existingForOtherSkills, ...nextForSkill];
};
