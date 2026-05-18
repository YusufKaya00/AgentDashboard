import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { getCodexInventory } from './lib/codexInventory.js';

let tempDir: string;

describe('getCodexInventory', () => {
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-inventory-'));
    await fs.ensureDir(path.join(tempDir, 'skills', '.system', 'imagegen'));
    await fs.ensureDir(path.join(tempDir, 'plugins', 'cache', 'openai-curated', 'superpowers', 'skills', 'debugging'));
    await fs.ensureDir(path.join(tempDir, 'sessions'));

    await fs.writeFile(
      path.join(tempDir, 'skills', '.system', 'imagegen', 'SKILL.md'),
      '---\nname: imagegen\ndescription: Generate raster images\n---\n# Imagegen\n',
      'utf-8'
    );
    await fs.writeFile(
      path.join(tempDir, 'plugins', 'cache', 'openai-curated', 'superpowers', 'skills', 'debugging', 'SKILL.md'),
      '---\nname: systematic-debugging\ndescription: Debug before fixing\n---\n# Debugging\n',
      'utf-8'
    );
    await fs.writeFile(
      path.join(tempDir, 'config.toml'),
      'model = "gpt-5.5"\napproval_policy = "never"\napi_key = "secret-value"\n',
      'utf-8'
    );
    await fs.writeFile(
      path.join(tempDir, 'session_index.jsonl'),
      JSON.stringify({ id: 'session-1', workspace: 'C:/repo', updated_at: '2026-05-18T08:00:00.000Z' }) + '\n',
      'utf-8'
    );
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('summarizes Codex skills, built-in agents, config, and recent sessions without leaking secrets', async () => {
    const inventory = await getCodexInventory({
      codexHome: tempDir,
      workspaceDir: 'C:/repo',
    });

    assert.equal(inventory.runtime.name, 'Codex');
    assert.equal(inventory.skills.total, 2);
    assert.deepEqual(inventory.skills.items.map((skill) => skill.name).sort(), [
      'imagegen',
      'systematic-debugging',
    ]);
    assert.deepEqual(inventory.agents.map((agent) => agent.id), ['default', 'explorer', 'worker']);
    assert.equal(inventory.sessions.total, 1);
    assert.equal(inventory.config.redacted.api_key, '[redacted]');
    assert.equal(inventory.config.redacted.model, 'gpt-5.5');
  });
});
