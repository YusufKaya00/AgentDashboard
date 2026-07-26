import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';

const spawnedChildren = new Set<ChildProcess>();
const temporaryRoots = new Set<string>();

afterEach(async () => {
  for (const child of spawnedChildren) {
    if (!child.killed) child.kill();
  }
  spawnedChildren.clear();
  await Promise.all(Array.from(temporaryRoots, (root) => fs.remove(root)));
  temporaryRoots.clear();
});

const startIsolatedServer = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'runtime-server-'));
  temporaryRoots.add(root);
  const homeDir = path.join(root, 'home');
  const workspaceDir = path.join(root, 'workspace');
  await fs.ensureDir(homeDir);
  await fs.ensureDir(workspaceDir);

  const child = spawn(
    process.execPath,
    ['--import', 'tsx', 'server.ts'],
    {
      cwd: path.resolve(import.meta.dirname),
      env: {
        ...process.env,
        PORT: '0',
        HOST: '127.0.0.1',
        DASHBOARD_HOME_DIR: homeDir,
        WORKSPACE_DIR: workspaceDir,
        ENABLE_LEGACY_BOOTSTRAP: 'false',
        ENABLE_FILE_WATCHER: 'false',
        INSTALL_GIT_HOOKS: 'false',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  spawnedChildren.add(child);

  let output = '';
  const baseUrl = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Server startup timed out.\n${output}`));
    }, 15_000);
    const inspectOutput = (chunk: Buffer) => {
      output += chunk.toString();
      const match = output.match(/Node\.js backend running on (http:\/\/127\.0\.0\.1:\d+)/);
      if (!match) return;
      clearTimeout(timeout);
      resolve(match[1]!);
    };
    child.stdout.on('data', inspectOutput);
    child.stderr.on('data', inspectOutput);
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('exit', (code) => {
      if (code === null || output.includes('Node.js backend running on')) return;
      clearTimeout(timeout);
      reject(new Error(`Server exited with code ${code}.\n${output}`));
    });
  });

  return { baseUrl, child, homeDir, workspaceDir };
};

const stopServer = async (child: ChildProcess) => {
  if (child.exitCode !== null) return;
  const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
  child.kill();
  await Promise.race([
    exited,
    new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
  ]);
  spawnedChildren.delete(child);
};

describe('server startup safety', () => {
  it('discovers runtimes without creating or migrating native runtime files', async () => {
    const { baseUrl, child, homeDir, workspaceDir } = await startIsolatedServer();

    const response = await fetch(`${baseUrl}/api/runtimes`);
    assert.equal(response.status, 200);
    const runtimes = await response.json() as Array<{ runtime: { id: string } }>;
    assert.deepEqual(
      runtimes.map((item) => item.runtime.id),
      ['codex', 'claude', 'antigravity']
    );

    const malformedResponse = await fetch(`${baseUrl}/api/runtimes/claude/agents`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'invalid-agent',
        description: 'Must not be written',
        instructions: 'Reject malformed arrays.',
        scope: 'project',
        skills: 'docs',
      }),
    });
    assert.equal(malformedResponse.status, 400);
    assert.match(
      (await malformedResponse.json() as { error: string }).error,
      /skills must be an array of strings/
    );

    for (const runtimePath of [
      path.join(homeDir, '.codex'),
      path.join(homeDir, '.claude'),
      path.join(homeDir, '.gemini'),
      path.join(workspaceDir, '.codex'),
      path.join(workspaceDir, '.claude'),
      path.join(workspaceDir, '.agents'),
      path.join(workspaceDir, '.git'),
    ]) {
      assert.equal(await fs.pathExists(runtimePath), false, runtimePath);
    }

    await stopServer(child);
  });
});
