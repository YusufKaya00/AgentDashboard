import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRuntimeHookExecutionPlan,
  runtimeCommandCandidates,
} from './lib/hookExecution.js';

describe('runtime hook execution planning', () => {
  it('builds a Codex stdin invocation with a selected model and native instructions', () => {
    const plan = buildRuntimeHookExecutionPlan({
      runtime: 'codex',
      executable: 'codex',
      action: 'Review the change.',
      diff: 'diff --git a/a.ts b/a.ts',
      model: 'codex:gpt-5.6',
      agent: {
        runtime: 'codex',
        id: 'reviewer',
        name: 'Reviewer',
        description: '',
        instructions: 'Prioritize correctness and regressions.',
        model: null,
        scope: 'project',
        file_path: 'agents/reviewer.toml',
        editable: true,
        skills: [],
        tools: [],
        updated_at: null,
        metadata: {},
      },
    });

    assert.equal(plan.shell_command, 'codex exec --model gpt-5.6 -');
    assert.equal(plan.model, 'gpt-5.6');
    assert.equal(plan.agent_id, 'reviewer');
    assert.match(plan.stdin, /Prioritize correctness and regressions/);
    assert.match(plan.stdin, /diff --git/);
    assert.doesNotMatch(plan.shell_command, /Review the change/);
  });

  it('uses Claude native agent selection and Gemini as the Antigravity fallback', () => {
    const plan = buildRuntimeHookExecutionPlan({
      runtime: 'claude',
      executable: 'claude',
      action: 'Inspect the diff.',
      diff: 'clean',
      model: 'claude:opus',
      agent: {
        runtime: 'claude',
        id: 'security-reviewer',
        name: 'Security Reviewer',
        description: '',
        instructions: 'Check trust boundaries.',
        model: null,
        scope: 'global',
        file_path: '.claude/agents/security-reviewer.md',
        editable: true,
        skills: [],
        tools: [],
        updated_at: null,
        metadata: {},
      },
    });

    assert.equal(
      plan.shell_command,
      'claude -p --model opus --agent security-reviewer'
    );
    assert.deepEqual(runtimeCommandCandidates('antigravity'), ['antigravity', 'gemini']);
  });

  it('rejects unsafe model tokens before they reach a shell command', () => {
    assert.throws(
      () => buildRuntimeHookExecutionPlan({
        runtime: 'codex',
        executable: 'codex',
        action: 'Review',
        diff: 'clean',
        model: 'gpt-5.6 & whoami',
      }),
      /unsafe/
    );
  });
});
