import chokidar, { type FSWatcher } from 'chokidar';
import fs from 'fs-extra';
import path from 'node:path';
import {
  discoverRuntimePaths,
  type RuntimeControlPlaneOptions,
  type RuntimeId,
  type RuntimePaths,
} from './runtimeControlPlane.js';

const RUNTIMES: RuntimeId[] = ['codex', 'claude', 'antigravity'];

export type RuntimeChangeCategory = 'agents' | 'skills' | 'sessions' | 'runtime';

export interface RuntimeLiveUpdate {
  type: 'runtime-inventory-changed';
  runtime: RuntimeId;
  categories: RuntimeChangeCategory[];
  observed_at: string;
}

interface RuntimeLiveUpdateOptions {
  debounceMs?: number;
  rootRefreshMs?: number;
}

export interface RuntimeLiveUpdateService {
  close: () => Promise<void>;
  notify: (runtime: RuntimeId, category?: RuntimeChangeCategory) => void;
  refresh: (runtime?: RuntimeId) => Promise<void>;
}

const normalizePath = (value: string) => {
  const resolved = path.resolve(value).replace(/\\/g, '/');
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
};

const isWithin = (candidate: string, root: string) => {
  const normalizedCandidate = normalizePath(candidate);
  const normalizedRoot = normalizePath(root).replace(/\/+$/, '');
  return normalizedCandidate === normalizedRoot
    || normalizedCandidate.startsWith(`${normalizedRoot}/`);
};

const uniqueExistingRoots = async (roots: Array<string | undefined>) => {
  const existing = new Map<string, string>();
  for (const root of roots) {
    if (!root || !(await fs.pathExists(root))) continue;
    existing.set(normalizePath(root), path.resolve(root));
  }

  return Array.from(existing.values())
    .sort((left, right) => left.length - right.length)
    .filter((candidate, index, values) => (
      !values.slice(0, index).some((root) => isWithin(candidate, root))
    ));
};

const watchRootsForRuntime = async (paths: RuntimePaths) => {
  return uniqueExistingRoots([
    paths.agent_roots.global,
    paths.agent_roots.project,
    paths.agent_roots.legacy,
    paths.skill_roots.global,
    paths.skill_roots.project,
    paths.skill_roots.system,
    paths.skill_roots.plugin,
    paths.skill_roots.compat_global,
    paths.skill_roots.compat_project,
    paths.skill_roots.legacy,
    ...paths.session_roots,
    paths.sqlite_home,
  ]);
};

const categoryForPath = (filePath: string): RuntimeChangeCategory => {
  const normalized = normalizePath(filePath);
  if (
    normalized.endsWith('.jsonl')
    || normalized.includes('/brain/')
    || normalized.includes('/projects/')
    || /\/state(?:_\d+)?\.sqlite(?:-(?:wal|shm))?$/.test(normalized)
  ) {
    return 'sessions';
  }
  if (normalized.includes('/skills/') || normalized.endsWith('/skill.md')) return 'skills';
  if (normalized.includes('/agents/')) return 'agents';
  return 'runtime';
};

export const startRuntimeLiveUpdates = async (
  controlPlaneOptions: RuntimeControlPlaneOptions,
  onUpdate: (update: RuntimeLiveUpdate) => void,
  liveOptions: RuntimeLiveUpdateOptions = {}
): Promise<RuntimeLiveUpdateService> => {
  const debounceMs = liveOptions.debounceMs ?? 180;
  const rootRefreshMs = liveOptions.rootRefreshMs ?? 30_000;
  const watchers = new Map<RuntimeId, FSWatcher>();
  const watchedRoots = new Map<RuntimeId, Set<string>>();
  const pendingCategories = new Map<RuntimeId, Set<RuntimeChangeCategory>>();
  const debounceTimers = new Map<RuntimeId, NodeJS.Timeout>();
  let closed = false;

  const notify = (runtime: RuntimeId, category: RuntimeChangeCategory = 'runtime') => {
    if (closed) return;
    const categories = pendingCategories.get(runtime) || new Set<RuntimeChangeCategory>();
    categories.add(category);
    pendingCategories.set(runtime, categories);

    const previousTimer = debounceTimers.get(runtime);
    if (previousTimer) clearTimeout(previousTimer);
    const timer = setTimeout(() => {
      debounceTimers.delete(runtime);
      const pending = pendingCategories.get(runtime);
      const nextCategories: RuntimeChangeCategory[] = pending
        ? Array.from(pending)
        : ['runtime'];
      pendingCategories.delete(runtime);
      onUpdate({
        type: 'runtime-inventory-changed',
        runtime,
        categories: nextCategories,
        observed_at: new Date().toISOString(),
      });
    }, debounceMs);
    timer.unref();
    debounceTimers.set(runtime, timer);
  };

  const ensureWatcher = async (runtime: RuntimeId) => {
    let watcher = watchers.get(runtime);
    if (!watcher) {
      const paths = await discoverRuntimePaths(controlPlaneOptions, runtime);
      const initialRoots = await watchRootsForRuntime(paths);
      watcher = chokidar.watch(initialRoots, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 120,
          pollInterval: 40,
        },
      });
      watcher.on('all', (_eventName, filePath) => {
        notify(runtime, categoryForPath(filePath));
      });
      watcher.on('error', (error) => {
        console.error(`[Runtime Live Updates] ${runtime} watcher error:`, error);
      });
      watchers.set(runtime, watcher);
      watchedRoots.set(runtime, new Set(initialRoots.map(normalizePath)));
      if (initialRoots.length > 0) {
        await new Promise<void>((resolve) => watcher!.once('ready', () => resolve()));
        notify(runtime, 'runtime');
      }
      return;
    }

    const paths = await discoverRuntimePaths(controlPlaneOptions, runtime);
    const roots = await watchRootsForRuntime(paths);
    const knownRoots = watchedRoots.get(runtime)!;
    const additions = roots.filter((root) => !knownRoots.has(normalizePath(root)));
    if (additions.length === 0) return;

    watcher.add(additions);
    additions.forEach((root) => knownRoots.add(normalizePath(root)));
    notify(runtime, 'runtime');
  };

  const refresh = async (runtime?: RuntimeId) => {
    if (closed) return;
    if (runtime) {
      await ensureWatcher(runtime);
      return;
    }
    await Promise.all(RUNTIMES.map((runtimeId) => ensureWatcher(runtimeId)));
  };

  await refresh();

  const rootRefreshTimer = setInterval(() => {
    void refresh().catch((error: unknown) => {
      console.error('[Runtime Live Updates] Failed to refresh watch roots:', error);
    });
  }, rootRefreshMs);
  rootRefreshTimer.unref();

  return {
    notify,
    refresh,
    async close() {
      if (closed) return;
      closed = true;
      clearInterval(rootRefreshTimer);
      debounceTimers.forEach((timer) => clearTimeout(timer));
      debounceTimers.clear();
      await Promise.all(Array.from(watchers.values(), (watcher) => watcher.close()));
      watchers.clear();
    },
  };
};
