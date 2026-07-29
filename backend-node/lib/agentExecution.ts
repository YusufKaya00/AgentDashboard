export interface AgentExecutionInput {
  agent: {
    id: string;
    name?: string;
    runtime?: string;
    model?: string;
  };
  persona: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface AgentExecutionPlan {
  agent_id: string;
  runtime: string;
  model?: string;
  prompt: string;
  command_preview: string;
}

const truncateForCommand = (value: string, limit = 12000) => {
  return value.length > limit ? `${value.slice(0, limit)}\n\n[Prompt truncated by dashboard command guard]` : value;
};

export const quoteForShell = (value: string) => {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ')}"`;
};

export const commandForRuntime = (runtime: string, prompt: string) => {
  const safePrompt = quoteForShell(truncateForCommand(prompt));
  if (runtime === 'claude') return `claude -p ${safePrompt}`;
  if (runtime === 'codex') return `codex exec ${safePrompt}`;
  return `antigravity ${safePrompt}`;
};

export const buildAgentExecutionPlan = ({ agent, persona, message, context = {} }: AgentExecutionInput): AgentExecutionPlan => {
  const runtime = agent.runtime || 'antigravity';
  const contextBlock = Object.keys(context).length > 0
    ? `\n\n## Dashboard Context\n${JSON.stringify(context, null, 2)}`
    : '';

  const prompt = [
    `# Dashboard Agent Invocation`,
    `Agent: ${agent.name || agent.id}`,
    `Runtime: ${runtime}`,
    agent.model ? `Model: ${agent.model}` : '',
    '',
    `## Agent Persona And Assigned Skills`,
    persona.trim() || `# ${agent.name || agent.id}\n\nNo persona prompt configured.`,
    contextBlock,
    '',
    `## User Task`,
    message,
  ].filter(Boolean).join('\n');

  return {
    agent_id: agent.id,
    runtime,
    ...(agent.model ? { model: agent.model } : {}),
    prompt,
    command_preview: commandForRuntime(runtime, prompt),
  };
};
