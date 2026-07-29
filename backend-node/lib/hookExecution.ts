import type { RuntimeAgentDefinition, RuntimeId } from './runtimeControlPlane.js';

export interface RuntimeHookExecutionInput {
  runtime: RuntimeId;
  executable: string;
  action: string;
  diff: string;
  model?: string | null;
  agent?: RuntimeAgentDefinition | null;
}

export interface RuntimeHookExecutionPlan {
  runtime: RuntimeId;
  executable: string;
  shell_command: string;
  stdin: string;
  command_preview: string;
  model: string | null;
  agent_id: string | null;
}

const CLI_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/;

const normalizeCliToken = (
  value: string | null | undefined,
  runtime: RuntimeId,
  label: string
): string | null => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  const prefix = `${runtime}:`;
  const normalized = trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
  if (!CLI_TOKEN.test(normalized)) {
    throw new Error(`${label} contains characters that are unsafe for CLI execution`);
  }
  return normalized;
};

const commandToken = (value: string) => {
  if (!/^[A-Za-z0-9_.:/\\ -]+$/.test(value)) {
    throw new Error('Runtime executable contains unsafe characters');
  }
  return value.includes(' ') ? `"${value}"` : value;
};

export const runtimeCommandCandidates = (runtime: RuntimeId): string[] => {
  if (runtime === 'antigravity') return ['antigravity', 'gemini'];
  return [runtime];
};

export const buildRuntimeHookExecutionPlan = ({
  runtime,
  executable,
  action,
  diff,
  model,
  agent,
}: RuntimeHookExecutionInput): RuntimeHookExecutionPlan => {
  const normalizedModel = normalizeCliToken(model, runtime, 'Model');
  const normalizedAgentId = agent
    ? normalizeCliToken(agent.id, runtime, 'Agent id')
    : null;
  const instructions = agent?.instructions.trim();
  const prompt = [
    '# Dashboard Hook Invocation',
    `Runtime: ${runtime}`,
    normalizedModel ? `Model: ${normalizedModel}` : '',
    agent ? `Agent: ${agent.name} (${agent.scope}/${agent.id})` : '',
    '',
    instructions ? '## Native Agent Instructions' : '',
    instructions || '',
    '',
    '## Hook Task',
    action.trim(),
    '',
    '## Current Git Diff',
    diff.trim() || 'No uncommitted changes detected.',
  ].filter(Boolean).join('\n');

  const executableToken = commandToken(executable);
  const modelArgs = normalizedModel ? ` --model ${normalizedModel}` : '';
  let shellCommand: string;
  if (runtime === 'claude') {
    const nativeAgentArg = agent && (agent.scope === 'global' || agent.scope === 'project')
      ? ` --agent ${normalizedAgentId}`
      : '';
    shellCommand = `${executableToken} -p${modelArgs}${nativeAgentArg}`;
  } else if (runtime === 'codex') {
    shellCommand = `${executableToken} exec${modelArgs} -`;
  } else {
    shellCommand = `${executableToken}${modelArgs} --prompt ""`;
  }

  return {
    runtime,
    executable,
    shell_command: shellCommand,
    stdin: prompt,
    command_preview: `${shellCommand} < prompt via stdin`,
    model: normalizedModel,
    agent_id: normalizedAgentId,
  };
};
