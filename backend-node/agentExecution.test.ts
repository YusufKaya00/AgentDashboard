import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildAgentExecutionPlan, commandForRuntime } from './lib/agentExecution.js';

describe('agent execution planning', () => {
  it('builds an invocation prompt from persona, assigned skills, context, and user task', () => {
    const plan = buildAgentExecutionPlan({
      agent: {
        id: 'devops-agent',
        name: 'DevOps Agent',
        runtime: 'codex',
        model: 'codex:gpt-5',
      },
      persona: [
        '# DevOps Agent',
        '',
        '<!-- DASHBOARD_SKILLS_START -->',
        '### Capabilities & Skills',
        '- **terraform-review**: Review IaC (Category: devops)',
        '  - Instructions: Always check least privilege IAM and resource limits.',
        '<!-- DASHBOARD_SKILLS_END -->',
      ].join('\n'),
      message: 'Review this deployment plan.',
      context: { ticket: 'OPS-17' },
    });

    assert.equal(plan.runtime, 'codex');
    assert.equal(plan.model, 'codex:gpt-5');
    assert.match(plan.prompt, /DevOps Agent/);
    assert.match(plan.prompt, /terraform-review/);
    assert.match(plan.prompt, /least privilege IAM/);
    assert.match(plan.prompt, /OPS-17/);
    assert.match(plan.prompt, /Review this deployment plan/);
    assert.match(plan.command_preview, /^codex exec /);
  });

  it('uses runtime-specific commands', () => {
    assert.match(commandForRuntime('claude', 'hello'), /^claude -p /);
    assert.match(commandForRuntime('codex', 'hello'), /^codex exec /);
    assert.match(commandForRuntime('antigravity', 'hello'), /^antigravity /);
  });
});
