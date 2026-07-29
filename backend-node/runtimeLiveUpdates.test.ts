import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import {
  startRuntimeLiveUpdates,
  type RuntimeLiveUpdate,
  type RuntimeLiveUpdateService,
} from './lib/runtimeLiveUpdates.js';
import type { RuntimeControlPlaneOptions } from './lib/runtimeControlPlane.js';

let tempDir: string;
let options: RuntimeControlPlaneOptions;
let liveUpdates: RuntimeLiveUpdateService | null;

describe('runtime live updates', () => {
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'runtime-live-updates-'));
    options = {
      homeDir: path.join(tempDir, 'home'),
      workspaceDir: path.join(tempDir, 'workspace'),
      codexHome: path.join(tempDir, 'home', '.codex'),
      claudeHome: path.join(tempDir, 'home', '.claude'),
      geminiHome: path.join(tempDir, 'home', '.gemini'),
    };
    liveUpdates = null;
    await fs.ensureDir(path.join(options.claudeHome || '', 'projects', 'workspace'));
    await fs.ensureDir(options.workspaceDir);
  });

  afterEach(async () => {
    await liveUpdates?.close();
    await fs.remove(tempDir);
  });

  it('emits a debounced runtime event when a native session transcript changes', async () => {
    let resolveUpdate: (update: RuntimeLiveUpdate) => void = () => {};
    const updateReceived = new Promise<RuntimeLiveUpdate>((resolve) => {
      resolveUpdate = resolve;
    });

    liveUpdates = await startRuntimeLiveUpdates(
      options,
      (update) => {
        if (update.runtime === 'claude' && update.categories.includes('sessions')) {
          resolveUpdate(update);
        }
      },
      { debounceMs: 25, rootRefreshMs: 60_000 }
    );

    const transcriptPath = path.join(
      options.claudeHome || '',
      'projects',
      'workspace',
      'live-session.jsonl'
    );
    await fs.writeFile(
      transcriptPath,
      `${JSON.stringify({
        type: 'user',
        sessionId: 'live-session',
        cwd: options.workspaceDir,
        timestamp: new Date().toISOString(),
        message: { content: 'Observe this live session' },
      })}\n`
    );

    const update = await Promise.race([
      updateReceived,
      new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error('Runtime watcher event timed out')), 5_000);
      }),
    ]);

    assert.equal(update.type, 'runtime-inventory-changed');
    assert.equal(update.runtime, 'claude');
    assert.deepEqual(update.categories, ['sessions']);
  });
});
