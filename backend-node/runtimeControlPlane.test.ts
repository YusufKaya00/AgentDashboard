import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';
import {
  assignRuntimeSkill,
  createRuntimeAgent,
  createRuntimeSkill,
  deleteRuntimeAgent,
  deleteRuntimeSkill,
  getRuntimeSessionMessages,
  getRuntimeSessions,
  getRuntimeOverview,
  getRuntimeTransmissions,
  updateRuntimeAgent,
  type RuntimeControlPlaneOptions,
} from './lib/runtimeControlPlane.js';

let tempDir: string;
let options: RuntimeControlPlaneOptions;

describe('native runtime control plane', () => {
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'runtime-control-plane-'));
    options = {
      homeDir: path.join(tempDir, 'home'),
      workspaceDir: path.join(tempDir, 'workspace'),
      codexHome: path.join(tempDir, 'home', '.codex'),
      codexSqliteHome: path.join(tempDir, 'home', '.codex-state'),
      claudeHome: path.join(tempDir, 'home', '.claude'),
      geminiHome: path.join(tempDir, 'home', '.gemini'),
    };
    await fs.ensureDir(options.workspaceDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('writes each agent and skill in its runtime-native path and format', async () => {
    const codexSkill = await createRuntimeSkill(options, 'codex', {
      id: 'review-checklist',
      name: 'Review checklist',
      description: 'Shared review steps',
      instructions: 'Check behavior and tests.',
      scope: 'project',
    });
    const codexAgent = await createRuntimeAgent(options, 'codex', {
      id: 'reviewer',
      name: 'Reviewer',
      description: 'Reviews changes',
      instructions: 'Review the requested patch.',
      model: 'gpt-5.6-sol',
      scope: 'project',
      skills: ['review-checklist'],
    });

    const claudeSkill = await createRuntimeSkill(options, 'claude', {
      id: 'docs',
      name: 'Docs',
      description: 'Documentation workflow',
      instructions: 'Update documentation from verified behavior.',
      scope: 'global',
    });
    const claudeAgent = await createRuntimeAgent(options, 'claude', {
      id: 'documenter',
      name: 'Documenter',
      description: 'Maintains project documentation',
      instructions: 'Keep the runtime guide current.',
      model: 'sonnet',
      scope: 'global',
      skills: ['docs'],
      tools: ['Read', 'Write'],
    });

    const antigravitySkill = await createRuntimeSkill(options, 'antigravity', {
      id: 'research',
      name: 'Research',
      description: 'Research workflow',
      instructions: 'Inspect evidence before reporting.',
      scope: 'project',
    });
    const antigravityAgent = await createRuntimeAgent(options, 'gemini', {
      id: 'researcher',
      name: 'Researcher',
      description: 'Inspects the workspace',
      instructions: 'Inspect files and report evidence.',
      model: 'inherit',
      scope: 'project',
      skills: ['research'],
      tools: ['read_file'],
    });

    assert.equal(
      codexAgent.file_path,
      path.join(options.workspaceDir, '.codex', 'agents', 'reviewer.toml')
    );
    assert.equal(
      claudeAgent.file_path,
      path.join(options.claudeHome || '', 'agents', 'documenter.md')
    );
    assert.equal(
      antigravityAgent.file_path,
      path.join(options.workspaceDir, '.agents', 'agents', 'researcher.md')
    );
    assert.equal(
      codexSkill.file_path,
      path.join(options.workspaceDir, '.agents', 'skills', 'review-checklist', 'SKILL.md')
    );
    assert.equal(
      claudeSkill.file_path,
      path.join(options.claudeHome || '', 'skills', 'docs', 'SKILL.md')
    );
    assert.equal(
      antigravitySkill.file_path,
      path.join(options.workspaceDir, '.agents', 'skills', 'research', 'SKILL.md')
    );

    const codexContent = await fs.readFile(codexAgent.file_path || '', 'utf-8');
    const claudeContent = await fs.readFile(claudeAgent.file_path || '', 'utf-8');
    const antigravityContent = await fs.readFile(antigravityAgent.file_path || '', 'utf-8');
    assert.match(codexContent, /name = "reviewer"/);
    assert.match(codexContent, /developer_instructions = "Review the requested patch\."/);
    assert.match(codexContent, /\[\[skills\.config\]\]/);
    assert.match(claudeContent, /name: documenter/);
    assert.match(claudeContent, /skills:\s*\n\s+- docs/);
    assert.match(claudeContent, /tools:\s*\n\s+- Read\s*\n\s+- Write/);
    assert.match(antigravityContent, /name: researcher/);
    assert.match(antigravityContent, /skills:\s*\n\s+- skills\/research/);

    const claudeOverview = await getRuntimeOverview(options, 'claude');
    assert.equal(
      claudeOverview.agents.some((agent) => agent.id === 'docs'),
      false,
      'A Claude SKILL.md must not be inventoried as an agent'
    );
  });

  it('detects a project-only runtime without creating its global home', async () => {
    await createRuntimeAgent(options, 'claude', {
      name: 'Project Reviewer',
      description: 'Reviews this project',
      instructions: 'Inspect project changes.',
      scope: 'project',
    });

    const overview = await getRuntimeOverview(options, 'claude');
    assert.equal(overview.runtime.available, true);
    assert.equal(await fs.pathExists(options.claudeHome || ''), false);
    assert.equal(overview.agents[0]?.name, 'project-reviewer');
  });

  it('updates with a backup and soft-deletes into the managed trash directory', async () => {
    await createRuntimeAgent(options, 'claude', {
      id: 'editor',
      name: 'Editor',
      description: 'Initial description',
      instructions: 'Initial prompt.',
      scope: 'project',
    });
    const updated = await updateRuntimeAgent(options, 'claude', 'project', 'editor', {
      name: 'Editor',
      description: 'Updated description',
      instructions: 'Updated prompt.',
      scope: 'project',
    });

    const recoveryRoot = path.join(
      options.workspaceDir,
      '.claude',
      '.dashboard-recovery',
      'agents'
    );
    const backupRoot = path.join(recoveryRoot, 'backups');
    const backups = await fs.readdir(backupRoot);
    assert.equal(backups.length, 1);
    assert.equal(updated.description, 'Updated description');

    const deleted = await deleteRuntimeAgent(options, 'claude', 'project', 'editor');
    assert.equal(path.dirname(deleted.trash_path), path.join(recoveryRoot, 'trash'));
    assert.equal(await fs.pathExists(updated.file_path || ''), false);
    assert.equal(await fs.pathExists(deleted.trash_path), true);

    const overview = await getRuntimeOverview(options, 'claude');
    assert.equal(overview.agents.some((agent) => agent.id === 'editor'), false);
    assert.equal(
      overview.agents.some((agent) => agent.file_path?.includes('.dashboard-recovery')),
      false
    );
  });

  it('copies a portable skill package and adds a real native reference to the target agent', async () => {
    await createRuntimeSkill(options, 'claude', {
      id: 'portable-review',
      name: 'Portable review',
      description: 'Runtime-neutral review steps',
      instructions: 'Read the diff, run tests, and report evidence.',
      scope: 'project',
    });
    await createRuntimeAgent(options, 'antigravity', {
      id: 'gemini-reviewer',
      name: 'Gemini Reviewer',
      description: 'Reviews patches',
      instructions: 'Review repository changes.',
      scope: 'project',
    });

    const assignment = await assignRuntimeSkill(options, {
      source_runtime: 'claude',
      source_scope: 'project',
      source_skill_id: 'portable-review',
      target_runtime: 'antigravity',
      target_scope: 'project',
      target_agent_id: 'gemini-reviewer',
    });

    assert.equal(assignment.compatibility, 'portable');
    assert.equal(await fs.pathExists(assignment.installed_path), true);
    assert.deepEqual(assignment.target_agent.skills, ['dashboard-claude-portable-review']);
    const agentContent = await fs.readFile(assignment.target_agent.file_path || '', 'utf-8');
    assert.match(agentContent, /skills\/dashboard-claude-portable-review/);
  });

  it('imports a legacy Antigravity agent before assigning a Codex skill', async () => {
    await createRuntimeSkill(options, 'codex', {
      id: 'codex-review',
      name: 'Codex review',
      description: 'Portable review instructions',
      instructions: 'Inspect the change and report evidence.',
      scope: 'project',
    });
    const legacyAgentPath = path.join(
      options.geminiHome || '',
      'antigravity',
      'agents',
      'legacy-reviewer.md'
    );
    const legacyContent = '# Legacy reviewer\n\nReview changes using the existing instructions.\n';
    await fs.ensureDir(path.dirname(legacyAgentPath));
    await fs.writeFile(legacyAgentPath, legacyContent, 'utf-8');

    const assignment = await assignRuntimeSkill(options, {
      source_runtime: 'codex',
      source_scope: 'project',
      source_skill_id: 'codex-review',
      target_runtime: 'antigravity',
      target_scope: 'global',
      target_agent_scope: 'legacy',
      target_agent_id: 'legacy-reviewer',
    });

    const nativeAgentPath = path.join(
      options.geminiHome || '',
      'config',
      'agents',
      'legacy-reviewer.md'
    );
    assert.equal(assignment.target_agent_imported, true);
    assert.equal(assignment.target_agent.file_path, nativeAgentPath);
    assert.equal(await fs.readFile(legacyAgentPath, 'utf-8'), legacyContent);
    const nativeContent = await fs.readFile(nativeAgentPath, 'utf-8');
    assert.match(nativeContent, /description: Imported from legacy antigravity agent legacy-reviewer\./);
    assert.match(nativeContent, /skills\/dashboard-codex-codex-review/);
    assert.match(nativeContent, /Review changes using the existing instructions\./);
  });

  it('backs up and promotes an in-place legacy Claude agent during assignment', async () => {
    await createRuntimeSkill(options, 'codex', {
      id: 'claude-review',
      name: 'Claude review',
      description: 'Review instructions for Claude',
      instructions: 'Run the focused review workflow.',
      scope: 'project',
    });
    const legacyAgentPath = path.join(
      options.workspaceDir,
      '.claude',
      'agents',
      'legacy-claude.md'
    );
    await fs.ensureDir(path.dirname(legacyAgentPath));
    await fs.writeFile(
      legacyAgentPath,
      '# Legacy Claude\n\nKeep these original agent instructions.\n',
      'utf-8'
    );

    const assignment = await assignRuntimeSkill(options, {
      source_runtime: 'codex',
      source_scope: 'project',
      source_skill_id: 'claude-review',
      target_runtime: 'claude',
      target_scope: 'project',
      target_agent_scope: 'legacy',
      target_agent_id: 'legacy-claude',
    });

    assert.equal(assignment.target_agent_imported, true);
    assert.equal(assignment.target_agent.scope, 'project');
    assert.match(await fs.readFile(legacyAgentPath, 'utf-8'), /skills:\s*\n\s+- dashboard-codex-claude-review/);
    const backupRoot = path.join(
      options.workspaceDir,
      '.claude',
      '.dashboard-recovery',
      'agents',
      'backups'
    );
    const backups = await fs.readdir(backupRoot);
    assert.ok(backups.length >= 1);
  });

  it('keeps frontmatter-free legacy markdown read-only', async () => {
    const legacyPath = path.join(options.workspaceDir, '.claude', 'agents', 'legacy-agent.md');
    await fs.ensureDir(path.dirname(legacyPath));
    await fs.writeFile(legacyPath, '# Legacy Agent\n\nOld dashboard prompt without native metadata.\n', 'utf-8');

    const overview = await getRuntimeOverview(options, 'claude');
    const legacy = overview.agents.find((agent) => agent.id === 'legacy-agent');
    assert.equal(legacy?.scope, 'legacy');
    assert.equal(legacy?.editable, false);
  });

  it('keeps legacy Codex skill roots visible but read-only', async () => {
    const compatibilityPath = path.join(
      options.codexHome || '',
      'skills',
      'compatibility-only',
      'SKILL.md'
    );
    await fs.ensureDir(path.dirname(compatibilityPath));
    await fs.writeFile(
      compatibilityPath,
      [
        '---',
        'name: compatibility-only',
        'description: Existing Codex compatibility skill',
        '---',
        '',
        'Keep this skill in its existing compatibility location.',
        '',
      ].join('\n'),
      'utf-8'
    );

    const overview = await getRuntimeOverview(options, 'codex');
    const skill = overview.skills.find((item) => item.id === 'compatibility-only');
    assert.equal(skill?.scope, 'legacy');
    assert.equal(skill?.editable, false);
    assert.equal(skill?.file_path, compatibilityPath);
  });

  it('rejects a managed runtime root that is a junction outside the workspace', async () => {
    const outside = path.join(tempDir, 'outside-runtime-root');
    await fs.ensureDir(outside);
    await fs.symlink(outside, path.join(options.workspaceDir, '.claude'), 'junction');

    await assert.rejects(
      () => createRuntimeAgent(options, 'claude', {
        id: 'escaped-agent',
        name: 'Escaped agent',
        description: 'Must not be written',
        instructions: 'Do not write outside the workspace.',
        scope: 'project',
      }),
      /symlink or junction outside/
    );
    assert.equal(await fs.pathExists(path.join(outside, 'agents', 'escaped-agent.md')), false);
  });

  it('rejects a skill write through a junction outside the managed root', async () => {
    const skillRoot = path.join(options.workspaceDir, '.claude', 'skills');
    const outside = path.join(tempDir, 'outside');
    await fs.ensureDir(skillRoot);
    await fs.ensureDir(outside);
    await fs.symlink(outside, path.join(skillRoot, 'escaped'), 'junction');

    await assert.rejects(
      () => createRuntimeSkill(options, 'claude', {
        id: 'escaped',
        name: 'Escaped',
        description: 'Must not be written',
        instructions: 'Do not write outside the managed root.',
        scope: 'project',
      }),
      /symlink or junction outside/
    );
    assert.equal(await fs.pathExists(path.join(outside, 'SKILL.md')), false);
  });

  it('uses stable unique ids for duplicate nested Claude filenames', async () => {
    const agentRoot = path.join(options.workspaceDir, '.claude', 'agents');
    const reviewPath = path.join(agentRoot, 'review', 'shared.md');
    const researchPath = path.join(agentRoot, 'research', 'shared.md');
    await fs.ensureDir(path.dirname(reviewPath));
    await fs.ensureDir(path.dirname(researchPath));
    await fs.writeFile(
      reviewPath,
      [
        '---',
        'name: shared-reviewer',
        'description: Reviews changes',
        '---',
        '',
        'Review the patch.',
        '',
      ].join('\n'),
      'utf-8'
    );
    await fs.writeFile(
      researchPath,
      [
        '---',
        'name: shared-researcher',
        'description: Researches changes',
        '---',
        '',
        'Research the repository.',
        '',
      ].join('\n'),
      'utf-8'
    );

    const overview = await getRuntimeOverview(options, 'claude');
    const reviewer = overview.agents.find((agent) => agent.description === 'Reviews changes');
    const researcher = overview.agents.find((agent) => agent.description === 'Researches changes');
    assert.ok(reviewer);
    assert.ok(researcher);
    assert.notEqual(reviewer.id, researcher.id);

    await updateRuntimeAgent(options, 'claude', 'project', reviewer.id, {
      name: reviewer.name,
      description: 'Updated review definition',
      instructions: 'Review only the intended patch.',
      scope: 'project',
    });

    assert.match(await fs.readFile(reviewPath, 'utf-8'), /Updated review definition/);
    assert.doesNotMatch(await fs.readFile(researchPath, 'utf-8'), /Updated review definition/);
  });

  it('preserves Antigravity main-agent defaults and native metadata during edits', async () => {
    const agentPath = path.join(
      options.workspaceDir,
      '.agents',
      'agents',
      'default-main.md'
    );
    await fs.ensureDir(path.dirname(agentPath));
    await fs.writeFile(
      agentPath,
      [
        '---',
        'name: default-main',
        'description: Uses the native mainAgent default',
        'model: inherit',
        'customField: preserve-me',
        '---',
        '',
        'Inspect the workspace.',
        '',
      ].join('\n'),
      'utf-8'
    );

    await updateRuntimeAgent(options, 'antigravity', 'project', 'default-main', {
      name: 'default-main',
      description: 'Updated without changing native defaults',
      instructions: 'Inspect the workspace and report evidence.',
      model: 'inherit',
      scope: 'project',
      tools: ['view_file', 'grep_search'],
    });

    const content = await fs.readFile(agentPath, 'utf-8');
    assert.doesNotMatch(content, /mainAgent:/);
    assert.doesNotMatch(content, /subagent:/);
    assert.match(content, /customField: preserve-me/);
    assert.match(content, /view_file/);
  });

  it('preserves Codex skill config state and custom entries during agent edits', async () => {
    await createRuntimeSkill(options, 'codex', {
      id: 'stateful-skill',
      name: 'Stateful skill',
      description: 'Keeps native Codex config state',
      instructions: 'Use the configured state.',
      scope: 'project',
    });
    const agent = await createRuntimeAgent(options, 'codex', {
      id: 'stateful-agent',
      name: 'Stateful agent',
      description: 'Uses a stateful skill',
      instructions: 'Use the assigned skill.',
      scope: 'project',
      skills: ['stateful-skill'],
    });
    const agentPath = agent.file_path || '';
    const raw = parseToml(await fs.readFile(agentPath, 'utf-8')) as Record<string, unknown>;
    const skills = raw.skills as { config: Array<Record<string, unknown>> };
    skills.config[0] = {
      ...skills.config[0],
      enabled: false,
      policy: 'preserve-me',
    };
    skills.config.push({ note: 'pathless-entry' });
    skills.config.push({
      path: path.join(tempDir, 'removed-skill', 'SKILL.md'),
      enabled: true,
    });
    await fs.writeFile(agentPath, `${stringifyToml(raw).trim()}\n`, 'utf-8');

    await updateRuntimeAgent(options, 'codex', 'project', agent.id, {
      name: agent.name,
      description: 'Updated while preserving config',
      instructions: 'Continue using the assigned skill.',
      scope: 'project',
      skills: ['stateful-skill'],
    });

    const updatedRaw = parseToml(await fs.readFile(agentPath, 'utf-8')) as Record<string, unknown>;
    const updatedConfig = (updatedRaw.skills as {
      config: Array<Record<string, unknown>>;
    }).config;
    assert.equal(updatedConfig.length, 2);
    assert.equal(updatedConfig[0]?.enabled, false);
    assert.equal(updatedConfig[0]?.policy, 'preserve-me');
    assert.equal(updatedConfig[1]?.note, 'pathless-entry');
  });

  it('rolls back the copied package and target agent when assignment fails', async () => {
    await createRuntimeSkill(options, 'claude', {
      id: 'rollback-source',
      name: 'Rollback source',
      description: 'Exercises assignment rollback',
      instructions: 'This package must not remain after a failed assignment.',
      scope: 'project',
    });

    const targetAgentPath = path.join(
      options.workspaceDir,
      '.agents',
      'agents',
      'cyclic-target.md'
    );
    const originalAgentContent = [
      '---',
      'name: cyclic-target',
      'description: Contains valid recursive YAML metadata',
      'cycle: &cycle',
      '  self: *cycle',
      '---',
      '',
      'Keep this file unchanged when assignment fails.',
      '',
    ].join('\n');
    await fs.ensureDir(path.dirname(targetAgentPath));
    await fs.writeFile(targetAgentPath, originalAgentContent, 'utf-8');

    const installedDir = path.join(
      options.workspaceDir,
      '.agents',
      'skills',
      'dashboard-claude-rollback-source'
    );
    const installedPath = path.join(installedDir, 'SKILL.md');
    const previousSkillContent = [
      '---',
      'name: dashboard-claude-rollback-source',
      'description: Existing target package',
      '---',
      '',
      'Restore this package after failure.',
      '',
    ].join('\n');
    await fs.ensureDir(installedDir);
    await fs.writeFile(installedPath, previousSkillContent, 'utf-8');

    await assert.rejects(() => assignRuntimeSkill(options, {
      source_runtime: 'claude',
      source_scope: 'project',
      source_skill_id: 'rollback-source',
      target_runtime: 'antigravity',
      target_scope: 'project',
      target_agent_id: 'cyclic-target',
    }));

    assert.equal(await fs.readFile(targetAgentPath, 'utf-8'), originalAgentContent);
    assert.equal(await fs.readFile(installedPath, 'utf-8'), previousSkillContent);
  });

  it('blocks deletion while a native agent still references the skill', async () => {
    await createRuntimeSkill(options, 'claude', {
      id: 'required-skill',
      name: 'Required skill',
      description: 'Referenced by an agent',
      instructions: 'Remain installed while referenced.',
      scope: 'project',
    });
    const agent = await createRuntimeAgent(options, 'claude', {
      id: 'skill-consumer',
      name: 'Skill consumer',
      description: 'Consumes the required skill',
      instructions: 'Use the required skill.',
      scope: 'project',
      skills: ['required-skill'],
    });

    await assert.rejects(
      () => deleteRuntimeSkill(options, 'claude', 'project', 'required-skill'),
      /assigned to agents/
    );

    await updateRuntimeAgent(options, 'claude', 'project', agent.id, {
      name: agent.name,
      description: agent.description,
      instructions: agent.instructions,
      scope: 'project',
      skills: [],
    });
    const deleted = await deleteRuntimeSkill(
      options,
      'claude',
      'project',
      'required-skill'
    );
    assert.equal(await fs.pathExists(deleted.trash_path), true);
  });

  it('reads Codex threads and spawn edges from SQLite without mutating the database', async () => {
    const sqliteHome = options.codexSqliteHome || '';
    await fs.ensureDir(sqliteHome);
    const databasePath = path.join(sqliteHome, 'state_5.sqlite');
    const database = new DatabaseSync(databasePath);
    database.exec(`
      CREATE TABLE threads (
        id TEXT PRIMARY KEY,
        rollout_path TEXT,
        created_at INTEGER,
        updated_at INTEGER,
        source TEXT,
        cwd TEXT,
        title TEXT,
        tokens_used INTEGER,
        archived INTEGER,
        agent_nickname TEXT,
        agent_role TEXT,
        model TEXT,
        thread_source TEXT,
        preview TEXT,
        name TEXT
      );
      CREATE TABLE thread_spawn_edges (
        parent_thread_id TEXT,
        child_thread_id TEXT,
        status TEXT
      );
    `);
    const now = Math.floor(Date.now() / 1000);
    const deviceWorkspace = `\\\\?\\${options.workspaceDir}`;
    const insertThread = database.prepare(`
      INSERT INTO threads (
        id, rollout_path, created_at, updated_at, source, cwd, title, tokens_used,
        archived, agent_nickname, agent_role, model, thread_source, preview, name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertThread.run(
      'parent', 'parent.jsonl', now, now, 'user', deviceWorkspace,
      'Dashboard work', 100, 0, null, null, 'gpt-test', 'user', '', null
    );
    insertThread.run(
      'child', 'child.jsonl', now, now, 'subagent', deviceWorkspace,
      'Claude audit', 20, 0, 'Audit Agent', 'explorer', 'gpt-test', 'subagent', '', null
    );
    insertThread.run(
      'stale-child', 'stale-child.jsonl', now - 3_600, now - 3_600, 'subagent',
      deviceWorkspace, 'Stale audit', 10, 0, 'Stale Agent', 'explorer',
      'gpt-test', 'subagent', '', null
    );
    database.prepare(
      'INSERT INTO thread_spawn_edges (parent_thread_id, child_thread_id, status) VALUES (?, ?, ?)'
    ).run('parent', 'child', 'open');
    database.prepare(
      'INSERT INTO thread_spawn_edges (parent_thread_id, child_thread_id, status) VALUES (?, ?, ?)'
    ).run('parent', 'stale-child', 'open');
    database.close();

    const overview = await getRuntimeOverview(options, 'codex');
    assert.equal(overview.threads.length, 3);
    assert.equal(overview.threads.find((thread) => thread.id === 'child')?.parent_id, 'parent');
    assert.equal(overview.threads.find((thread) => thread.id === 'child')?.nickname, 'Audit Agent');
    assert.equal(overview.threads.find((thread) => thread.id === 'child')?.status, 'running');
    assert.equal(overview.threads.find((thread) => thread.id === 'stale-child')?.status, 'idle');
    assert.deepEqual([...overview.edges].sort((left, right) => left.child_id.localeCompare(right.child_id)), [
      { parent_id: 'parent', child_id: 'child', status: 'open' },
      { parent_id: 'parent', child_id: 'stale-child', status: 'open' },
    ]);
  });

  it('merges native Codex, Claude, and Antigravity messages by timestamp', async () => {
    const codexTranscript = path.join(tempDir, 'codex-transcript.jsonl');
    await fs.writeFile(
      codexTranscript,
      [
        JSON.stringify({
          timestamp: '2026-07-29T10:00:01.000Z',
          type: 'response_item',
          payload: {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: 'Codex user message' }],
          },
        }),
        JSON.stringify({
          timestamp: '2026-07-29T10:00:02.000Z',
          type: 'response_item',
          payload: {
            type: 'function_call',
            name: 'ignored_tool',
          },
        }),
        JSON.stringify({
          timestamp: '2026-07-29T10:00:03.000Z',
          type: 'response_item',
          payload: {
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: 'Codex assistant message' }],
          },
        }),
        '',
      ].join('\n'),
      'utf-8'
    );
    const sqliteHome = options.codexSqliteHome || '';
    await fs.ensureDir(sqliteHome);
    const database = new DatabaseSync(path.join(sqliteHome, 'state_5.sqlite'));
    database.exec(`
      CREATE TABLE threads (
        id TEXT PRIMARY KEY,
        rollout_path TEXT,
        created_at INTEGER,
        updated_at INTEGER,
        cwd TEXT,
        title TEXT,
        archived INTEGER
      );
    `);
    database.prepare(`
      INSERT INTO threads (id, rollout_path, created_at, updated_at, cwd, title, archived)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'codex-chat',
      codexTranscript,
      1785319201,
      1785319203,
      options.workspaceDir,
      'Codex chat',
      0
    );
    database.close();

    const claudeTranscript = path.join(
      options.claudeHome || '',
      'projects',
      'workspace',
      'claude-chat.jsonl'
    );
    await fs.ensureDir(path.dirname(claudeTranscript));
    await fs.writeFile(
      claudeTranscript,
      [
        JSON.stringify({
          type: 'user',
          sessionId: 'claude-chat',
          cwd: options.workspaceDir,
          timestamp: '2026-07-29T10:00:04.000Z',
          message: { role: 'user', content: 'Claude user message' },
        }),
        JSON.stringify({
          type: 'assistant',
          sessionId: 'claude-chat',
          cwd: options.workspaceDir,
          timestamp: '2026-07-29T10:00:05.000Z',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'Claude assistant message' }],
          },
        }),
        '',
      ].join('\n'),
      'utf-8'
    );

    const antigravityTranscript = path.join(
      options.geminiHome || '',
      'antigravity',
      'brain',
      'antigravity-chat',
      '.system_generated',
      'logs',
      'transcript.jsonl'
    );
    await fs.ensureDir(path.dirname(antigravityTranscript));
    await fs.writeFile(
      antigravityTranscript,
      [
        JSON.stringify({
          type: 'USER_INPUT',
          created_at: '2026-07-29T10:00:06.000Z',
          content: '<USER_REQUEST>Antigravity user message</USER_REQUEST>',
        }),
        JSON.stringify({
          type: 'PLANNER_RESPONSE',
          created_at: '2026-07-29T10:00:07.000Z',
          content: 'Antigravity assistant message',
        }),
        '',
      ].join('\n'),
      'utf-8'
    );

    const transmissions = await getRuntimeTransmissions(
      { ...options, sessionScope: 'all' },
      10
    );

    assert.deepEqual(
      transmissions.map((item) => `${item.runtime}:${item.role}:${item.message}`),
      [
        'antigravity:assistant:Antigravity assistant message',
        'antigravity:user:Antigravity user message',
        'claude:assistant:Claude assistant message',
        'claude:user:Claude user message',
        'codex:assistant:Codex assistant message',
        'codex:user:Codex user message',
      ]
    );

    const sessions = await getRuntimeSessions(
      { ...options, sessionScope: 'all' },
      10
    );
    assert.deepEqual(
      sessions.map((item) => `${item.runtime}:${item.thread_id}`).sort(),
      [
        'antigravity:antigravity-chat',
        'claude:claude-chat',
        'codex:codex-chat',
      ]
    );

    const claudeMessages = await getRuntimeSessionMessages(
      { ...options, sessionScope: 'all' },
      'claude',
      'claude-chat'
    );
    assert.deepEqual(
      claudeMessages.map((item) => `${item.role}:${item.content}`),
      [
        'user:Claude user message',
        'assistant:Claude assistant message',
      ]
    );

    await assert.rejects(
      () => getRuntimeSessionMessages(
        { ...options, sessionScope: 'all' },
        'codex',
        '../outside'
      ),
      /Session not found/
    );
  });

  it('filters Codex threads by workspace before limiting and tolerates a missing edge table', async () => {
    const sqliteHome = options.codexSqliteHome || '';
    await fs.ensureDir(sqliteHome);
    const databasePath = path.join(sqliteHome, 'state_5.sqlite');
    const database = new DatabaseSync(databasePath);
    database.exec(`
      CREATE TABLE threads (
        id TEXT PRIMARY KEY,
        rollout_path TEXT,
        created_at INTEGER,
        updated_at INTEGER,
        source TEXT,
        cwd TEXT,
        title TEXT,
        tokens_used INTEGER,
        archived INTEGER
      );
    `);
    const insertThread = database.prepare(`
      INSERT INTO threads (
        id, rollout_path, created_at, updated_at, source, cwd, title,
        tokens_used, archived
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = Math.floor(Date.now() / 1000);
    const deviceWorkspace = `\\\\?\\${options.workspaceDir}`;
    insertThread.run(
      'workspace-thread',
      'workspace.jsonl',
      now - 2_000,
      now - 2_000,
      'user',
      deviceWorkspace,
      'Workspace thread',
      10,
      0
    );
    for (let index = 0; index < 510; index += 1) {
      insertThread.run(
        `unrelated-${index}`,
        `unrelated-${index}.jsonl`,
        now + index,
        now + index,
        'user',
        path.join(tempDir, 'other-workspace'),
        `Unrelated ${index}`,
        1,
        0
      );
    }
    database.close();

    const overview = await getRuntimeOverview(options, 'codex');
    assert.deepEqual(overview.threads.map((thread) => thread.id), ['workspace-thread']);
    assert.deepEqual(overview.edges, []);
    assert.equal(
      overview.diagnostics.some((diagnostic) => diagnostic.code === 'codex_sqlite_unreadable'),
      false
    );

    const allWorkspacesOverview = await getRuntimeOverview(
      { ...options, sessionScope: 'all' },
      'codex'
    );
    assert.equal(allWorkspacesOverview.runtime.session_scope, 'all');
    assert.equal(allWorkspacesOverview.threads.length, 500);
    assert.ok(
      allWorkspacesOverview.threads.every((thread) => thread.id.startsWith('unrelated-'))
    );
  });
});
