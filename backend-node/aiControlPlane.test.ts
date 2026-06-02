import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAITargets,
  buildUnifiedSkills,
  replaceSkillAssignments,
} from './lib/aiControlPlane.js';

describe('ai control plane', () => {
  it('builds unified skills from Claude and Codex sources with assigned targets', () => {
    const skills = buildUnifiedSkills(
      [
        {
          id: 'review',
          name: 'review',
          description: 'Review code',
          category: 'code-review',
          enabled: true,
        },
      ],
      [], // geminiSkills
      [
        {
          id: 'systematic-debugging',
          name: 'systematic-debugging',
          description: 'Debug before fixing',
          source: 'plugin',
          file_path: 'C:/Users/skyks/.codex/plugins/debugging/SKILL.md',
          updated_at: '2026-05-18T08:00:00.000Z',
        },
      ],
      [
        {
          skill_key: 'claude:review',
          skill_id: 'review',
          skill_source: 'claude',
          target_key: 'claude_agent:team_leader',
          target_type: 'claude_agent',
          target_id: 'team_leader',
          created_at: '2026-05-18T08:00:00.000Z',
          updated_at: '2026-05-18T08:00:00.000Z',
        },
      ]
    );

    assert.deepEqual(skills.map((skill) => skill.skill_key), [
      'claude:review',
      'codex-plugin:systematic-debugging',
    ]);
    const skill0 = skills[0];
    const skill1 = skills[1];
    assert.ok(skill0);
    assert.ok(skill1);
    assert.equal(skill0.assigned_targets.length, 1);
    assert.equal(skill1.origin, 'codex');
  });

  it('builds assignable targets across agents, Codex roles, models, and providers', () => {
    const targets = buildAITargets({
      agents: [{ id: 'team_leader', name: 'Team Leader', runtime: 'claude', status: 'active', model: 'claude-sonnet' }],
      codexAgents: [{ id: 'worker', name: 'Worker', role: 'subagent', description: 'Implements', capabilities: ['code'] }],
      models: [{ id: 'gpt-5', name: 'GPT-5', provider: 'openai', enabled: true }],
      providers: [{ id: 'ollama', name: 'Ollama', type: 'ollama', active: true }],
    });

    assert.deepEqual(targets.map((target) => target.target_key), [
      'claude_agent:team_leader',
      'codex_agent:worker',
      'model:gpt-5',
      'provider:ollama',
    ]);
  });

  it('replaces assignments for only the selected skill', () => {
    const now = '2026-05-18T09:00:00.000Z';
    const updated = replaceSkillAssignments(
      [
        {
          skill_key: 'claude:review',
          skill_id: 'review',
          skill_source: 'claude',
          target_key: 'claude_agent:team_leader',
          target_type: 'claude_agent',
          target_id: 'team_leader',
          created_at: '2026-05-18T08:00:00.000Z',
          updated_at: '2026-05-18T08:00:00.000Z',
        },
        {
          skill_key: 'codex-plugin:systematic-debugging',
          skill_id: 'systematic-debugging',
          skill_source: 'codex-plugin',
          target_key: 'codex_agent:worker',
          target_type: 'codex_agent',
          target_id: 'worker',
          created_at: '2026-05-18T08:00:00.000Z',
          updated_at: '2026-05-18T08:00:00.000Z',
        },
      ],
      {
        skill_key: 'claude:review',
        target_keys: ['codex_agent:worker', 'model:gpt-5'],
      },
      now
    );

    assert.deepEqual(
      updated.map((assignment) => `${assignment.skill_key}->${assignment.target_key}`).sort(),
      [
        'claude:review->codex_agent:worker',
        'claude:review->model:gpt-5',
        'codex-plugin:systematic-debugging->codex_agent:worker',
      ]
    );
    assert.equal(updated.find((assignment) => assignment.target_key === 'model:gpt-5')?.target_type, 'model');
  });

  it('uses agent runtime when building assignable agent targets', () => {
    const targets = buildAITargets({
      agents: [
        { id: 'claude-reviewer', name: 'Claude Reviewer', runtime: 'claude', status: 'active', model: 'claude-sonnet' },
        { id: 'gemini-planner', name: 'Gemini Planner', runtime: 'antigravity', status: 'active', model: 'gemini-2.5-pro' },
        { id: 'codex-worker', name: 'Codex Worker', runtime: 'codex', status: 'active', model: 'codex:gpt-5' },
      ],
      codexAgents: [{ id: 'codex-worker', name: 'Codex Worker', role: 'agent', description: 'Works in Codex', capabilities: ['code'], model: 'codex:gpt-5', status: 'active' }],
      models: [],
      providers: [],
    });

    assert.deepEqual(targets.map((target) => target.target_key), [
      'claude_agent:claude-reviewer',
      'antigravity_agent:gemini-planner',
      'codex_agent:codex-worker',
    ]);
  });
});
