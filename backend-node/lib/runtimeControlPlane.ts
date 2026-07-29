import fs from 'fs-extra';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { open } from 'node:fs/promises';
import type { DatabaseSync } from 'node:sqlite';
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export type RuntimeId = 'codex' | 'claude' | 'antigravity';
export type RuntimeScope = 'builtin' | 'system' | 'plugin' | 'global' | 'project' | 'legacy';
export type WritableRuntimeScope = 'global' | 'project';
export type RuntimeThreadStatus = 'running' | 'idle' | 'completed' | 'failed' | 'archived' | 'unknown';
export type RuntimeSessionScope = 'all' | 'workspace';

export interface RuntimeControlPlaneOptions {
  homeDir: string;
  workspaceDir: string;
  codexHome?: string;
  codexSqliteHome?: string;
  claudeHome?: string;
  geminiHome?: string;
  sessionScope?: RuntimeSessionScope;
}

export interface RuntimeAgentDefinition {
  runtime: RuntimeId;
  id: string;
  name: string;
  description: string;
  instructions: string;
  model: string | null;
  scope: RuntimeScope;
  file_path: string | null;
  editable: boolean;
  skills: string[];
  tools: string[];
  updated_at: string | null;
  metadata: Record<string, unknown>;
}

export interface RuntimeSkillDefinition {
  runtime: RuntimeId;
  id: string;
  name: string;
  description: string;
  instructions: string;
  scope: RuntimeScope;
  file_path: string;
  editable: boolean;
  updated_at: string | null;
  metadata: Record<string, unknown>;
}

export interface RuntimeThread {
  runtime: RuntimeId;
  id: string;
  parent_id: string | null;
  title: string;
  status: RuntimeThreadStatus;
  workspace: string | null;
  model: string | null;
  role: string | null;
  nickname: string | null;
  source: string | null;
  created_at: string | null;
  updated_at: string | null;
  tokens_used: number | null;
  transcript_path: string | null;
  is_subagent: boolean;
  inferred: boolean;
}

export interface RuntimeThreadEdge {
  parent_id: string;
  child_id: string;
  status: string;
}

export interface RuntimeTransmission {
  id: string;
  runtime: RuntimeId;
  thread_id: string;
  role: 'user' | 'assistant';
  message: string;
  timestamp: string;
  agent_name: string | null;
  is_subagent: boolean;
}

export interface RuntimeSessionSummary {
  id: string;
  runtime: RuntimeId;
  thread_id: string;
  title: string;
  status: RuntimeThreadStatus;
  workspace: string | null;
  model: string | null;
  agent_name: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_subagent: boolean;
  inferred: boolean;
}

export interface RuntimeSessionMessage {
  id: string;
  runtime: RuntimeId;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model: string | null;
  agent_name: string | null;
  is_subagent: boolean;
}

export interface RuntimePaths {
  home: string;
  workspace: string;
  agent_roots: {
    global: string;
    project: string;
    legacy?: string;
  };
  skill_roots: {
    global: string;
    project: string;
    system?: string;
    plugin?: string;
    compat_global?: string;
    compat_project?: string;
    legacy?: string;
  };
  session_roots: string[];
  sqlite_home?: string;
}

export interface RuntimeOverview {
  runtime: {
    id: RuntimeId;
    name: string;
    available: boolean;
    workspace_dir: string;
    home_dir: string;
    session_scope: RuntimeSessionScope;
  };
  paths: RuntimePaths;
  capabilities: {
    definitions_read: boolean;
    definitions_write: boolean;
    skills_read: boolean;
    skills_write: boolean;
    sessions_read: boolean;
    sessions_control: boolean;
  };
  agents: RuntimeAgentDefinition[];
  skills: RuntimeSkillDefinition[];
  threads: RuntimeThread[];
  edges: RuntimeThreadEdge[];
  diagnostics: Array<{
    level: 'info' | 'warning' | 'error';
    code: string;
    message: string;
  }>;
}

export interface RuntimeAgentInput {
  id?: string;
  name: string;
  description?: string;
  instructions: string;
  model?: string | null;
  scope: WritableRuntimeScope;
  skills?: string[];
  tools?: string[];
  metadata?: Record<string, unknown>;
}

export interface RuntimeSkillInput {
  id?: string;
  name: string;
  description?: string;
  instructions: string;
  scope: WritableRuntimeScope;
  metadata?: Record<string, unknown>;
}

export interface AssignRuntimeSkillInput {
  source_runtime: RuntimeId;
  source_scope: RuntimeScope;
  source_skill_id: string;
  target_runtime: RuntimeId;
  target_scope: WritableRuntimeScope;
  target_agent_scope?: RuntimeScope;
  target_agent_id: string;
}

export interface RuntimeSkillAssignmentResult {
  source: RuntimeSkillDefinition;
  installed_skill: RuntimeSkillDefinition;
  target_agent: RuntimeAgentDefinition;
  compatibility: 'native' | 'portable' | 'adapted';
  warnings: string[];
  installed_path: string;
  assigned_at: string;
  target_agent_imported: boolean;
}

interface MarkdownDocument {
  frontmatter: Record<string, unknown>;
  body: string;
}

interface RuntimeThreadInventory {
  threads: RuntimeThread[];
  edges: RuntimeThreadEdge[];
  diagnostics: RuntimeOverview['diagnostics'];
}

interface ManagedLocation {
  anchor: string;
  root: string;
  recovery_root: string;
}

const RUNTIME_NAMES: Record<RuntimeId, string> = {
  codex: 'Codex',
  claude: 'Claude Code',
  antigravity: 'Gemini Antigravity',
};

const CODEX_BUILTIN_AGENTS: Array<Pick<RuntimeAgentDefinition, 'id' | 'name' | 'description' | 'instructions'>> = [
  {
    id: 'default',
    name: 'Default',
    description: 'General-purpose Codex agent selected when no custom role is requested.',
    instructions: '',
  },
  {
    id: 'worker',
    name: 'Worker',
    description: 'Built-in implementation-focused Codex subagent.',
    instructions: '',
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Built-in read-oriented Codex codebase explorer.',
    instructions: '',
  },
];

const WRITABLE_SCOPES = new Set<RuntimeScope>(['global', 'project']);
const SLUG_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const MAX_MARKDOWN_FILES = 600;
const MAX_SESSION_FILES = 160;
const MAX_TRANSCRIPT_BYTES = 2 * 1024 * 1024;

const asRecord = (value: unknown): Record<string, unknown> => {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
};

const asString = (value: unknown, fallback = ''): string => {
  return typeof value === 'string' ? value : fallback;
};

const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const uniqueStrings = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const cleanObject = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(cleanObject).filter((item) => item !== undefined);
  }
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined && item !== null && item !== '')
      .map(([key, item]) => [key, cleanObject(item)])
  );
};

const normalizePathForMatch = (value: string): string => {
  const withoutDevicePrefix = value.replace(/^\\\\\?\\/, '');
  return path.resolve(withoutDevicePrefix).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
};

const workspaceMatches = (candidate: unknown, workspaceDir: string): boolean => {
  if (typeof candidate !== 'string' || !candidate.trim()) return false;
  const normalizedCandidate = normalizePathForMatch(candidate);
  const normalizedWorkspace = normalizePathForMatch(workspaceDir);
  return normalizedCandidate === normalizedWorkspace || normalizedCandidate.startsWith(`${normalizedWorkspace}/`);
};

const toIsoDate = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    const milliseconds = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return toIsoDate(Number(value));
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const isRecent = (value: string | null, thresholdMs = 2 * 60 * 1000): boolean => {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp < thresholdMs;
};

const statUpdatedAt = async (filePath: string): Promise<string | null> => {
  const stat = await fs.stat(filePath).catch(() => null);
  return stat ? stat.mtime.toISOString() : null;
};

const normalizeRuntimeId = (value: string): RuntimeId => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'gemini') return 'antigravity';
  if (normalized === 'codex' || normalized === 'claude' || normalized === 'antigravity') {
    return normalized;
  }
  throw new Error(`Unsupported runtime: ${value}`);
};

const assertWritableScope = (scope: string): WritableRuntimeScope => {
  if (scope === 'global' || scope === 'project') return scope;
  throw new Error(`Scope must be "global" or "project", received: ${scope}`);
};

const assertRuntimeScope = (scope: unknown): RuntimeScope => {
  if (
    scope === 'builtin'
    || scope === 'system'
    || scope === 'plugin'
    || scope === 'global'
    || scope === 'project'
    || scope === 'legacy'
  ) {
    return scope;
  }
  throw new Error(`Source scope must be a supported runtime scope, received: ${String(scope)}`);
};

const assertInputObject = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
};

const requiredInputString = (
  record: Record<string, unknown>,
  field: string,
  maxLength: number
): string => {
  const value = record[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required and must be a string`);
  }
  if (value.length > maxLength) {
    throw new Error(`${field} is too long; maximum length is ${maxLength}`);
  }
  return value;
};

const optionalInputString = (
  record: Record<string, unknown>,
  field: string,
  maxLength: number
): string | null | undefined => {
  const value = record[field];
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string') throw new Error(`${field} must be a string or null`);
  if (value.length > maxLength) {
    throw new Error(`${field} is too long; maximum length is ${maxLength}`);
  }
  return value;
};

const optionalStringArray = (
  record: Record<string, unknown>,
  field: string,
  maxItems: number,
  maxItemLength: number
): string[] | undefined => {
  const value = record[field];
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${field} must be an array of strings`);
  }
  if (value.length > maxItems) throw new Error(`${field} contains too many entries`);
  const normalized = value.map((item) => item.trim()).filter(Boolean);
  if (normalized.some((item) => item.length > maxItemLength)) {
    throw new Error(`${field} contains an entry that is too long`);
  }
  return normalized;
};

const validateRuntimeAgentInput = (value: unknown): RuntimeAgentInput => {
  const record = assertInputObject(value, 'Agent input');
  const id = optionalInputString(record, 'id', 80);
  const model = optionalInputString(record, 'model', 200);
  const skills = optionalStringArray(record, 'skills', 256, 500);
  const tools = optionalStringArray(record, 'tools', 256, 300);
  const metadata = record.metadata === undefined
    ? undefined
    : assertInputObject(record.metadata, 'metadata');
  return {
    ...(id ? { id } : {}),
    name: requiredInputString(record, 'name', 120),
    description: requiredInputString(record, 'description', 4_000),
    instructions: requiredInputString(record, 'instructions', 1_000_000),
    ...(model !== undefined ? { model } : {}),
    scope: assertWritableScope(requiredInputString(record, 'scope', 20)),
    ...(skills !== undefined ? { skills } : {}),
    ...(tools !== undefined ? { tools } : {}),
    ...(metadata ? { metadata } : {}),
  };
};

const validateRuntimeSkillInput = (value: unknown): RuntimeSkillInput => {
  const record = assertInputObject(value, 'Skill input');
  const id = optionalInputString(record, 'id', 80);
  const metadata = record.metadata === undefined
    ? undefined
    : assertInputObject(record.metadata, 'metadata');
  return {
    ...(id ? { id } : {}),
    name: requiredInputString(record, 'name', 120),
    description: requiredInputString(record, 'description', 4_000),
    instructions: requiredInputString(record, 'instructions', 1_000_000),
    scope: assertWritableScope(requiredInputString(record, 'scope', 20)),
    ...(metadata ? { metadata } : {}),
  };
};

const validateSkillAssignmentInput = (value: unknown): AssignRuntimeSkillInput => {
  const record = assertInputObject(value, 'Skill assignment input');
  return {
    source_runtime: normalizeRuntimeId(requiredInputString(record, 'source_runtime', 40)),
    source_scope: assertRuntimeScope(record.source_scope),
    source_skill_id: assertLookupId(requiredInputString(record, 'source_skill_id', 200)),
    target_runtime: normalizeRuntimeId(requiredInputString(record, 'target_runtime', 40)),
    target_scope: assertWritableScope(requiredInputString(record, 'target_scope', 20)),
    target_agent_scope: assertRuntimeScope(record.target_agent_scope ?? record.target_scope),
    target_agent_id: assertSafeId(requiredInputString(record, 'target_agent_id', 80)),
  };
};

const slugify = (value: string): string => {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 80);

  if (!SLUG_PATTERN.test(slug)) {
    throw new Error('Agent and skill ids must contain letters, numbers, dots, underscores, or hyphens');
  }
  return slug;
};

const normalizeNativeAgentName = (runtime: RuntimeId, value: string): string => {
  const slug = slugify(value);
  return runtime === 'codex' ? slug : slug.replace(/[._]+/g, '-');
};

const normalizeNativeSkillName = (value: string): string => {
  return slugify(value).replace(/[._]+/g, '-');
};

const assertSafeId = (value: string): string => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!SLUG_PATTERN.test(normalized)) {
    throw new Error(`Unsafe id: ${value}`);
  }
  return normalized;
};

const assertLookupId = (value: string): string => {
  const normalized = String(value || '').trim();
  if (
    !normalized
    || normalized.length > 200
    || normalized === '.'
    || normalized === '..'
    || normalized.includes('/')
    || normalized.includes('\\')
  ) {
    throw new Error(`Unsafe lookup id: ${value}`);
  }
  return normalized;
};

const assertPathInside = (root: string, candidate: string): string => {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  const relative = path.relative(resolvedRoot, resolvedCandidate);
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    return resolvedCandidate;
  }
  throw new Error(`Refusing to access a path outside the managed runtime root: ${candidate}`);
};

const realPathIsInside = (realRoot: string, candidate: string): boolean => {
  const relative = path.relative(realRoot, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const ensureDirectoryInsideAnchor = async (anchorRoot: string, directoryPath: string): Promise<void> => {
  const safeDirectory = assertPathInside(anchorRoot, directoryPath);
  await fs.ensureDir(anchorRoot);
  const realAnchor = await fs.realpath(anchorRoot);
  const relative = path.relative(path.resolve(anchorRoot), safeDirectory);
  let cursor = path.resolve(anchorRoot);

  for (const segment of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    if (!(await fs.pathExists(cursor))) {
      await fs.mkdir(cursor);
    }
    const realCursor = await fs.realpath(cursor);
    if (!realPathIsInside(realAnchor, realCursor)) {
      throw new Error(`Refusing to follow a symlink or junction outside the managed runtime anchor: ${cursor}`);
    }
  }
};

const assertExistingRealPathInside = async (
  location: ManagedLocation,
  targetPath: string
): Promise<void> => {
  const safePath = assertPathInside(location.root, targetPath);
  await ensureDirectoryInsideAnchor(location.anchor, location.root);
  const [realAnchor, realRoot, realTarget] = await Promise.all([
    fs.realpath(location.anchor),
    fs.realpath(location.root),
    fs.realpath(safePath),
  ]);
  if (!realPathIsInside(realAnchor, realRoot)) {
    throw new Error(`Refusing to use a managed runtime root outside its anchor: ${location.root}`);
  }
  if (!realPathIsInside(realRoot, realTarget)) {
    throw new Error(`Refusing to access a symlink or junction outside the managed runtime root: ${targetPath}`);
  }
};

const timestampForFile = () => new Date().toISOString().replace(/[:.]/g, '-');
let recoverySequence = 0;

const recoveryFileName = (location: ManagedLocation, targetPath: string): string => {
  const relative = path.relative(location.root, targetPath)
    .replace(/[\\/]+/g, '__')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .slice(-140);
  recoverySequence += 1;
  return `${timestampForFile()}-${process.pid}-${recoverySequence.toString(36)}-${relative || path.basename(targetPath)}`;
};

const backupFile = async (location: ManagedLocation, filePath: string): Promise<string | null> => {
  if (!(await fs.pathExists(filePath))) return null;
  await assertExistingRealPathInside(location, filePath);
  const fileStat = await fs.lstat(filePath);
  if (fileStat.isSymbolicLink()) {
    throw new Error(`Refusing to write through a symbolic link: ${filePath}`);
  }
  const backupDir = path.join(location.recovery_root, 'backups');
  await ensureDirectoryInsideAnchor(location.anchor, backupDir);
  const backupPath = path.join(backupDir, recoveryFileName(location, filePath));
  await fs.copy(filePath, backupPath, { overwrite: false });
  return backupPath;
};

const atomicWriteFile = async (
  location: ManagedLocation,
  filePath: string,
  content: string
): Promise<string | null> => {
  const safePath = assertPathInside(location.root, filePath);
  await ensureDirectoryInsideAnchor(location.anchor, path.dirname(safePath));
  const backupPath = await backupFile(location, safePath);

  const tempPath = path.join(
    path.dirname(safePath),
    `.${path.basename(safePath)}.${process.pid}.${Date.now()}.tmp`
  );
  await fs.writeFile(tempPath, content, 'utf-8');
  try {
    await fs.rename(tempPath, safePath);
  } catch (error: unknown) {
    const code = asString(asRecord(error).code);
    if (code !== 'EEXIST' && code !== 'EPERM') throw error;
    await fs.move(tempPath, safePath, { overwrite: true });
  } finally {
    await fs.remove(tempPath).catch(() => undefined);
  }
  return backupPath;
};

const moveToTrash = async (location: ManagedLocation, targetPath: string): Promise<string> => {
  const safePath = assertPathInside(location.root, targetPath);
  if (!(await fs.pathExists(safePath))) {
    throw new Error(`Definition not found: ${targetPath}`);
  }
  await assertExistingRealPathInside(location, safePath);

  const trashDir = path.join(location.recovery_root, 'trash');
  await ensureDirectoryInsideAnchor(location.anchor, trashDir);
  const trashPath = path.join(trashDir, recoveryFileName(location, safePath));
  await fs.move(safePath, trashPath, { overwrite: false });
  return trashPath;
};

const parseMarkdownDocument = (content: string): MarkdownDocument => {
  const normalized = content.replace(/^\uFEFF/, '');
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: normalized.trim() };
  }

  try {
    return {
      frontmatter: asRecord(parseYaml(match[1] || '')),
      body: (match[2] || '').trim(),
    };
  } catch {
    return { frontmatter: {}, body: (match[2] || '').trim() };
  }
};

const serializeMarkdownDocument = (frontmatter: Record<string, unknown>, body: string): string => {
  const yaml = stringifyYaml(cleanObject(frontmatter), { lineWidth: 0 }).trim();
  return `---\n${yaml}\n---\n\n${body.trim()}\n`;
};

const collectFiles = async (
  root: string,
  predicate: (filePath: string) => boolean,
  maxDepth = 4,
  limit = MAX_MARKDOWN_FILES
): Promise<string[]> => {
  if (!(await fs.pathExists(root))) return [];
  const found: string[] = [];
  const queue: Array<{ dir: string; depth: number }> = [{ dir: root, depth: 0 }];

  while (queue.length > 0 && found.length < limit) {
    const current = queue.shift();
    if (!current) break;
    const entries = await fs.readdir(current.dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (entry.name.startsWith('.dashboard-')) continue;
      const fullPath = path.join(current.dir, entry.name);
      if (entry.isDirectory() && current.depth < maxDepth) {
        queue.push({ dir: fullPath, depth: current.depth + 1 });
      } else if (entry.isFile() && predicate(fullPath)) {
        found.push(fullPath);
        if (found.length >= limit) break;
      }
    }
  }

  return found;
};

const readTail = async (filePath: string, maxBytes = MAX_TRANSCRIPT_BYTES): Promise<string> => {
  const stat = await fs.stat(filePath);
  const start = Math.max(0, stat.size - maxBytes);
  const length = stat.size - start;
  const handle = await open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, start);
    let content = buffer.toString('utf-8');
    if (start > 0) {
      const firstNewline = content.indexOf('\n');
      content = firstNewline === -1 ? '' : content.slice(firstNewline + 1);
    }
    return content;
  } finally {
    await handle.close();
  }
};

const parseJsonLines = (content: string): Record<string, unknown>[] => {
  return content
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return asRecord(JSON.parse(line));
      } catch {
        return null;
      }
    })
    .filter((item): item is Record<string, unknown> => Boolean(item));
};

const discoverCodexSqliteHome = async (
  options: Required<Pick<RuntimeControlPlaneOptions, 'codexHome'>> & RuntimeControlPlaneOptions
): Promise<string> => {
  const configPath = path.join(options.codexHome, 'config.toml');
  if (await fs.pathExists(configPath)) {
    try {
      const config = asRecord(parseToml(await fs.readFile(configPath, 'utf-8')));
      const configured = asString(config.sqlite_home);
      if (configured) {
        return path.isAbsolute(configured)
          ? path.resolve(configured)
          : path.resolve(options.codexHome, configured);
      }
    } catch {
      // A malformed config must not prevent the rest of the runtime inventory.
    }
  }
  return path.resolve(options.codexSqliteHome || options.codexHome);
};

export const discoverRuntimePaths = async (
  input: RuntimeControlPlaneOptions,
  runtimeValue: RuntimeId | string
): Promise<RuntimePaths> => {
  const runtime = normalizeRuntimeId(runtimeValue);
  const workspace = path.resolve(input.workspaceDir);
  const homeDir = path.resolve(input.homeDir);
  const codexHome = path.resolve(input.codexHome || path.join(homeDir, '.codex'));
  const claudeHome = path.resolve(input.claudeHome || path.join(homeDir, '.claude'));
  const geminiHome = path.resolve(input.geminiHome || path.join(homeDir, '.gemini'));

  if (runtime === 'codex') {
    const sqliteHome = await discoverCodexSqliteHome({ ...input, codexHome });
    return {
      home: codexHome,
      workspace,
      agent_roots: {
        global: path.join(codexHome, 'agents'),
        project: path.join(workspace, '.codex', 'agents'),
      },
      skill_roots: {
        global: path.join(homeDir, '.agents', 'skills'),
        project: path.join(workspace, '.agents', 'skills'),
        system: path.join(codexHome, 'skills', '.system'),
        plugin: path.join(codexHome, 'plugins', 'cache'),
        compat_global: path.join(codexHome, 'skills'),
        compat_project: path.join(workspace, '.codex', 'skills'),
      },
      session_roots: [path.join(codexHome, 'sessions')],
      sqlite_home: sqliteHome,
    };
  }

  if (runtime === 'claude') {
    return {
      home: claudeHome,
      workspace,
      agent_roots: {
        global: path.join(claudeHome, 'agents'),
        project: path.join(workspace, '.claude', 'agents'),
      },
      skill_roots: {
        global: path.join(claudeHome, 'skills'),
        project: path.join(workspace, '.claude', 'skills'),
      },
      session_roots: [path.join(claudeHome, 'projects')],
    };
  }

  return {
    home: geminiHome,
    workspace,
    agent_roots: {
      global: path.join(geminiHome, 'config', 'agents'),
      project: path.join(workspace, '.agents', 'agents'),
      legacy: path.join(geminiHome, 'antigravity', 'agents'),
    },
    skill_roots: {
      global: path.join(geminiHome, 'config', 'skills'),
      project: path.join(workspace, '.agents', 'skills'),
      legacy: path.join(geminiHome, 'antigravity', 'skills'),
    },
    session_roots: [
      path.join(geminiHome, 'antigravity', 'brain'),
      path.join(geminiHome, 'antigravity-ide', 'brain'),
      path.join(geminiHome, 'antigravity-cli', 'brain'),
    ],
  };
};

const codexSkillIdFromConfig = (value: unknown): string => {
  const skillPath = asString(asRecord(value).path);
  return skillPath ? path.basename(path.dirname(skillPath)) : '';
};

const codexAgentSkills = (raw: Record<string, unknown>): string[] => {
  const skills = asRecord(raw.skills);
  const config = Array.isArray(skills.config) ? skills.config : [];
  return uniqueStrings(
    config
      .map(codexSkillIdFromConfig)
      .filter(Boolean)
  );
};

const readCodexAgent = async (
  filePath: string,
  scope: RuntimeScope
): Promise<RuntimeAgentDefinition | null> => {
  try {
    const raw = asRecord(parseToml(await fs.readFile(filePath, 'utf-8')));
    const id = path.basename(filePath, '.toml');
    return {
      runtime: 'codex',
      id,
      name: asString(raw.name, id),
      description: asString(raw.description),
      instructions: asString(raw.developer_instructions),
      model: asString(raw.model) || null,
      scope,
      file_path: filePath,
      editable: WRITABLE_SCOPES.has(scope),
      skills: codexAgentSkills(raw),
      tools: [],
      updated_at: await statUpdatedAt(filePath),
      metadata: raw,
    };
  } catch {
    return null;
  }
};

const idForMarkdownAgent = (filePath: string): string => {
  const base = path.basename(filePath, '.md');
  return base.toLowerCase() === 'agent' ? path.basename(path.dirname(filePath)) : base;
};

const markdownAgentId = (filePath: string, root?: string): string => {
  const baseId = slugify(idForMarkdownAgent(filePath));
  if (!root) return baseId;
  const relative = path.relative(root, filePath).replace(/\\/g, '/');
  if (!relative.includes('/')) return baseId;
  const digest = createHash('sha256').update(relative.toLowerCase()).digest('hex').slice(0, 12);
  return `${baseId.slice(0, 60)}-${digest}`;
};

const readMarkdownAgent = async (
  runtime: 'claude' | 'antigravity',
  filePath: string,
  scope: RuntimeScope,
  root?: string
): Promise<RuntimeAgentDefinition | null> => {
  try {
    const document = parseMarkdownDocument(await fs.readFile(filePath, 'utf-8'));
    const id = markdownAgentId(filePath, root);
    const hasNativeFrontmatter = Boolean(
      asString(document.frontmatter.name).trim()
      && asString(document.frontmatter.description).trim()
    );
    const effectiveScope = WRITABLE_SCOPES.has(scope) && !hasNativeFrontmatter
      ? 'legacy'
      : scope;
    const rawSkills = asStringArray(document.frontmatter.skills);
    return {
      runtime,
      id,
      name: asString(document.frontmatter.name, id),
      description: asString(document.frontmatter.description),
      instructions: document.body,
      model: asString(document.frontmatter.model) || null,
      scope: effectiveScope,
      file_path: filePath,
      editable: WRITABLE_SCOPES.has(effectiveScope),
      skills: runtime === 'antigravity'
        ? rawSkills.map((skill) => path.basename(skill.replace(/\\/g, '/')))
        : rawSkills,
      tools: asStringArray(document.frontmatter.tools),
      updated_at: await statUpdatedAt(filePath),
      metadata: document.frontmatter,
    };
  } catch {
    return null;
  }
};

const listRuntimeAgents = async (
  paths: RuntimePaths,
  runtime: RuntimeId
): Promise<RuntimeAgentDefinition[]> => {
  const agents: RuntimeAgentDefinition[] = [];
  const seenPaths = new Set<string>();
  if (runtime === 'codex') {
    for (const [scope, root] of [
      ['global', paths.agent_roots.global],
      ['project', paths.agent_roots.project],
    ] as const) {
      const files = await collectFiles(root, (filePath) => filePath.endsWith('.toml'), 1);
      const parsed = await Promise.all(files.map((filePath) => readCodexAgent(filePath, scope)));
      agents.push(...parsed.filter((item): item is RuntimeAgentDefinition => Boolean(item)));
    }

    agents.push(...CODEX_BUILTIN_AGENTS.map((agent) => ({
      runtime: 'codex' as const,
      ...agent,
      model: null,
      scope: 'builtin' as const,
      file_path: null,
      editable: false,
      skills: [],
      tools: [],
      updated_at: null,
      metadata: { built_in: true },
    })));
  } else {
    for (const [scope, root] of [
      ['global', paths.agent_roots.global],
      ['project', paths.agent_roots.project],
      ['legacy', paths.agent_roots.legacy],
    ] as const) {
      if (!root) continue;
      const files = await collectFiles(
        root,
        (filePath) => filePath.endsWith('.md'),
        runtime === 'claude' ? 8 : 2
      );
      const newFiles = files.filter((filePath) => {
        const normalized = normalizePathForMatch(filePath);
        if (seenPaths.has(normalized)) return false;
        seenPaths.add(normalized);
        return true;
      });
      const parsed = await Promise.all(
        newFiles.map((filePath) => readMarkdownAgent(runtime, filePath, scope, root))
      );
      agents.push(...parsed.filter((item): item is RuntimeAgentDefinition => Boolean(item)));
    }
  }

  return agents.sort((left, right) => {
    const scopeOrder: RuntimeScope[] = ['project', 'global', 'builtin', 'system', 'plugin', 'legacy'];
    const scopeDelta = scopeOrder.indexOf(left.scope) - scopeOrder.indexOf(right.scope);
    return scopeDelta || left.name.localeCompare(right.name);
  });
};

const readRuntimeSkill = async (
  runtime: RuntimeId,
  filePath: string,
  scope: RuntimeScope
): Promise<RuntimeSkillDefinition | null> => {
  try {
    const document = parseMarkdownDocument(await fs.readFile(filePath, 'utf-8'));
    const folderId = path.basename(path.dirname(filePath));
    const id = asString(document.frontmatter.name, folderId);
    return {
      runtime,
      id,
      name: asString(document.frontmatter.name, folderId),
      description: asString(document.frontmatter.description),
      instructions: document.body,
      scope,
      file_path: filePath,
      editable: WRITABLE_SCOPES.has(scope),
      updated_at: await statUpdatedAt(filePath),
      metadata: document.frontmatter,
    };
  } catch {
    return null;
  }
};

const listRuntimeSkills = async (
  paths: RuntimePaths,
  runtime: RuntimeId
): Promise<RuntimeSkillDefinition[]> => {
  const roots: Array<[RuntimeScope, string | undefined]> = [
    ['global', paths.skill_roots.global],
    ['project', paths.skill_roots.project],
  ];

  if (runtime === 'codex') {
    roots.push(
      ['system', paths.skill_roots.system],
      ['plugin', paths.skill_roots.plugin],
      ['legacy', paths.skill_roots.compat_global],
      ['legacy', paths.skill_roots.compat_project],
    );
  } else {
    roots.push(['legacy', paths.skill_roots.legacy]);
  }

  const skills: RuntimeSkillDefinition[] = [];
  const seenPaths = new Set<string>();
  for (const [defaultScope, root] of roots) {
    if (!root) continue;
    const files = await collectFiles(root, (filePath) => path.basename(filePath) === 'SKILL.md', 8);
    for (const filePath of files) {
      const normalized = normalizePathForMatch(filePath);
      if (seenPaths.has(normalized)) continue;
      seenPaths.add(normalized);

      let scope = defaultScope;
      if (
        runtime === 'codex'
        && paths.skill_roots.system
        && normalizePathForMatch(filePath).startsWith(`${normalizePathForMatch(paths.skill_roots.system)}/`)
      ) {
        scope = 'system';
      }
      const skill = await readRuntimeSkill(runtime, filePath, scope);
      if (skill) skills.push(skill);
    }
  }

  return skills.sort((left, right) => left.name.localeCompare(right.name));
};

const findNewestStateDatabase = async (sqliteHome: string): Promise<string | null> => {
  if (!(await fs.pathExists(sqliteHome))) return null;
  const entries = await fs.readdir(sqliteHome, { withFileTypes: true }).catch(() => []);
  const candidates = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && /^state(?:_\d+)?\.sqlite$/.test(entry.name))
      .map(async (entry) => {
        const filePath = path.join(sqliteHome, entry.name);
        const stat = await fs.stat(filePath).catch(() => null);
        return stat ? { filePath, mtime: stat.mtimeMs } : null;
      })
  );
  return candidates
    .filter((candidate): candidate is { filePath: string; mtime: number } => Boolean(candidate))
    .sort((left, right) => right.mtime - left.mtime)[0]?.filePath || null;
};

const readCodexThreads = async (
  paths: RuntimePaths,
  workspaceDir: string,
  sessionScope: RuntimeSessionScope
): Promise<RuntimeThreadInventory> => {
  const diagnostics: RuntimeOverview['diagnostics'] = [];
  const databasePath = await findNewestStateDatabase(paths.sqlite_home || paths.home);
  if (!databasePath) {
    diagnostics.push({
      level: 'info',
      code: 'codex_sqlite_missing',
      message: 'No Codex state SQLite database was found. Agent definitions and skills are still available.',
    });
    return { threads: [], edges: [], diagnostics };
  }

  let database: DatabaseSync | null = null;
  try {
    const sqlite = await import('node:sqlite');
    const db = new sqlite.DatabaseSync(databasePath, { readOnly: true });
    database = db;
    const columns = new Set(
      db.prepare('PRAGMA table_info(threads)').all()
        .map((row) => asString(asRecord(row).name))
        .filter(Boolean)
    );
    const desiredColumns = [
      'id',
      'rollout_path',
      'created_at',
      'updated_at',
      'source',
      'cwd',
      'title',
      'tokens_used',
      'archived',
      'agent_nickname',
      'agent_role',
      'model',
      'reasoning_effort',
      'agent_path',
      'thread_source',
      'preview',
      'name',
    ].filter((column) => columns.has(column));

    if (!desiredColumns.includes('id') || !desiredColumns.includes('cwd')) {
      throw new Error('Codex threads table does not expose the required id and cwd columns');
    }

    const orderColumn = columns.has('updated_at')
      ? '"updated_at"'
      : columns.has('created_at')
        ? '"created_at"'
        : 'rowid';
    const normalizedWorkspace = normalizePathForMatch(workspaceDir);
    const selectColumns = desiredColumns.map((column) => `"${column}"`).join(', ');
    const normalizedCwdSql = `replace(lower(replace("cwd", char(92), '/')), '//?/', '')`;
    const workspaceRows = sessionScope === 'all'
      ? db
          .prepare(`
            SELECT ${selectColumns}
            FROM threads
            ORDER BY ${orderColumn} DESC
            LIMIT 500
          `)
          .all()
          .map(asRecord)
      : db
          .prepare(`
            SELECT ${selectColumns}
            FROM threads
            WHERE ${normalizedCwdSql} = ?
               OR instr(${normalizedCwdSql}, ? || '/') = 1
            ORDER BY ${orderColumn} DESC
            LIMIT 500
          `)
          .all(normalizedWorkspace, normalizedWorkspace)
          .map(asRecord)
          .filter((row) => workspaceMatches(row.cwd, workspaceDir));
    const workspaceIds = new Set(workspaceRows.map((row) => asString(row.id)).filter(Boolean));
    const edgeTableExists = Boolean(db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'thread_spawn_edges'"
    ).get());
    let rawEdges: Record<string, unknown>[] = [];
    if (edgeTableExists && workspaceIds.size > 0) {
      try {
        const ids = Array.from(workspaceIds);
        const placeholders = ids.map(() => '?').join(', ');
        rawEdges = db.prepare(`
          SELECT parent_thread_id, child_thread_id, status
          FROM thread_spawn_edges
          WHERE parent_thread_id IN (${placeholders})
             OR child_thread_id IN (${placeholders})
          ORDER BY rowid DESC
          LIMIT 2000
        `).all(...ids, ...ids).map(asRecord);
      } catch (error: unknown) {
        diagnostics.push({
          level: 'warning',
          code: 'codex_spawn_edges_unreadable',
          message: `Codex threads are available, but spawn edges could not be read: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }
    const includedIds = new Set(workspaceIds);
    for (const edge of rawEdges) {
      const parentId = asString(edge.parent_thread_id);
      const childId = asString(edge.child_thread_id);
      if (workspaceIds.has(parentId) || workspaceIds.has(childId)) {
        includedIds.add(parentId);
        includedIds.add(childId);
      }
    }

    const missingIds = Array.from(includedIds).filter((id) => !workspaceIds.has(id));
    const linkedRows = missingIds.length > 0
      ? db.prepare(`
          SELECT ${selectColumns}
          FROM threads
          WHERE id IN (${missingIds.map(() => '?').join(', ')})
        `).all(...missingIds).map(asRecord)
      : [];
    const selectedRows = [...workspaceRows, ...linkedRows]
      .filter((row, index, rows) => (
        rows.findIndex((candidate) => asString(candidate.id) === asString(row.id)) === index
      ));
    const selectedIds = new Set(selectedRows.map((row) => asString(row.id)));
    const edges = rawEdges
      .map((edge) => ({
        parent_id: asString(edge.parent_thread_id),
        child_id: asString(edge.child_thread_id),
        status: asString(edge.status, 'unknown'),
      }))
      .filter((edge) => selectedIds.has(edge.parent_id) && selectedIds.has(edge.child_id));

    const parentByChild = new Map(edges.map((edge) => [edge.child_id, edge]));
    const threads = selectedRows.map((row): RuntimeThread => {
      const id = asString(row.id);
      const parentEdge = parentByChild.get(id);
      const updatedAt = toIsoDate(row.updated_at);
      const archived = Number(row.archived || 0) === 1;
      const recentlyObserved = isRecent(updatedAt, 2 * 60 * 1000);
      let status: RuntimeThreadStatus = archived ? 'archived' : recentlyObserved ? 'running' : 'idle';
      if (parentEdge?.status) {
        const edgeStatus = parentEdge.status.toLowerCase();
        // Codex can leave spawn edges open after work stops, so recency is also
        // required before presenting an open child as actively running.
        if (edgeStatus === 'open' || edgeStatus === 'running') {
          status = recentlyObserved ? 'running' : 'idle';
        }
        else if (edgeStatus === 'failed' || edgeStatus === 'error') status = 'failed';
        else if (edgeStatus === 'closed' || edgeStatus === 'completed') status = 'completed';
      }

      const title = asString(row.title)
        || asString(row.name)
        || asString(row.agent_nickname)
        || asString(row.preview).slice(0, 100)
        || id;

      return {
        runtime: 'codex',
        id,
        parent_id: parentEdge?.parent_id || null,
        title,
        status,
        workspace: asString(row.cwd) || null,
        model: asString(row.model) || null,
        role: asString(row.agent_role) || null,
        nickname: asString(row.agent_nickname) || null,
        source: asString(row.thread_source) || asString(row.source) || null,
        created_at: toIsoDate(row.created_at),
        updated_at: updatedAt,
        tokens_used: typeof row.tokens_used === 'number' ? row.tokens_used : Number(row.tokens_used) || null,
        transcript_path: asString(row.rollout_path) || null,
        is_subagent: Boolean(parentEdge) || asString(row.thread_source).toLowerCase() === 'subagent',
        inferred: false,
      };
    });

    return { threads, edges, diagnostics };
  } catch (error: unknown) {
    diagnostics.push({
      level: 'warning',
      code: 'codex_sqlite_unreadable',
      message: `Codex state database could not be read: ${error instanceof Error ? error.message : String(error)}`,
    });
    return { threads: [], edges: [], diagnostics };
  } finally {
    database?.close();
  }
};

const extractTextContent = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((item) => extractTextContent(item)).filter(Boolean).join(' ');
  }
  const record = asRecord(value);
  if (typeof record.text === 'string') return record.text;
  if (record.content !== value) return extractTextContent(record.content);
  return '';
};

const recentSessionFiles = async (
  roots: string[],
  predicate: (filePath: string) => boolean,
  maxDepth: number
): Promise<Array<{ filePath: string; updatedAt: string }>> => {
  const files = (await Promise.all(
    roots.map((root) => collectFiles(root, predicate, maxDepth, MAX_SESSION_FILES * 3))
  )).flat();
  const withStats = await Promise.all(
    files.map(async (filePath) => {
      const updatedAt = await statUpdatedAt(filePath);
      return updatedAt ? { filePath, updatedAt } : null;
    })
  );
  return withStats
    .filter((item): item is { filePath: string; updatedAt: string } => Boolean(item))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, MAX_SESSION_FILES);
};

const readClaudeThreads = async (
  paths: RuntimePaths,
  workspaceDir: string,
  sessionScope: RuntimeSessionScope
): Promise<RuntimeThreadInventory> => {
  const diagnostics: RuntimeOverview['diagnostics'] = [];
  const files = await recentSessionFiles(paths.session_roots, (filePath) => filePath.endsWith('.jsonl'), 3);
  const threads: RuntimeThread[] = [];
  const edges: RuntimeThreadEdge[] = [];
  const workspaceSlug = normalizePathForMatch(workspaceDir).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  for (const file of files) {
    const records = parseJsonLines(await readTail(file.filePath).catch(() => ''));
    const cwd = records.map((record) => asString(record.cwd)).find(Boolean);
    const encodedParent = path.basename(path.dirname(file.filePath)).toLowerCase();
    const slugMatches = workspaceSlug && (
      encodedParent.includes(workspaceSlug)
      || workspaceSlug.includes(encodedParent.replace(/^-|-$/g, ''))
    );
    if (sessionScope === 'workspace' && !workspaceMatches(cwd, workspaceDir) && !slugMatches) continue;

    const firstUserRecord = records.find((record) => asString(record.type).toLowerCase() === 'user');
    const message = asRecord(firstUserRecord?.message);
    const id = records.map((record) => asString(record.sessionId || record.session_id)).find(Boolean)
      || path.basename(file.filePath, '.jsonl');
    const parentId = records.map((record) => asString(record.parentSessionId || record.parent_session_id)).find(Boolean) || null;
    const agentId = records.map((record) => asString(record.agentId || record.agent_id)).find(Boolean) || null;
    const createdAt = records.map((record) => toIsoDate(record.timestamp || record.created_at)).find(Boolean) || null;
    const updatedAt = file.updatedAt;
    const title = extractTextContent(message.content || firstUserRecord?.content).trim().slice(0, 120)
      || agentId
      || id;

    threads.push({
      runtime: 'claude',
      id,
      parent_id: parentId,
      title,
      status: isRecent(updatedAt, 5 * 60 * 1000) ? 'running' : 'idle',
      workspace: cwd || workspaceDir,
      model: records.map((record) => asString(record.model)).find(Boolean) || null,
      role: agentId,
      nickname: agentId,
      source: agentId ? 'subagent' : 'session',
      created_at: createdAt,
      updated_at: updatedAt,
      tokens_used: null,
      transcript_path: file.filePath,
      is_subagent: Boolean(agentId || parentId || records.some((record) => record.isSidechain === true)),
      inferred: true,
    });
    if (parentId) edges.push({ parent_id: parentId, child_id: id, status: 'observed' });
  }

  if (sessionScope === 'workspace' && threads.length === 0 && files.length > 0) {
    diagnostics.push({
      level: 'info',
      code: 'claude_workspace_sessions_missing',
      message: 'Claude session logs were found, but none could be matched to this workspace.',
    });
  }
  return { threads, edges, diagnostics };
};

const toolCallsFromRecord = (record: Record<string, unknown>): Array<{ name: string; args: Record<string, unknown> }> => {
  const possibleCalls = [
    ...((Array.isArray(record.tool_calls) ? record.tool_calls : []) as unknown[]),
    ...((Array.isArray(asRecord(record.message).tool_calls) ? asRecord(record.message).tool_calls : []) as unknown[]),
  ];
  return possibleCalls.map((rawCall) => {
    const call = asRecord(rawCall);
    let args = asRecord(call.args || call.arguments);
    if (typeof call.args === 'string' || typeof call.arguments === 'string') {
      try {
        args = asRecord(JSON.parse(asString(call.args || call.arguments)));
      } catch {
        args = {};
      }
    }
    return { name: asString(call.name), args };
  }).filter((call) => Boolean(call.name));
};

const readAntigravityThreads = async (
  paths: RuntimePaths,
  workspaceDir: string,
  sessionScope: RuntimeSessionScope
): Promise<RuntimeThreadInventory> => {
  const diagnostics: RuntimeOverview['diagnostics'] = [];
  const files = await recentSessionFiles(
    paths.session_roots,
    (filePath) => path.basename(filePath) === 'transcript.jsonl',
    5
  );
  const threads: RuntimeThread[] = [];
  const edges: RuntimeThreadEdge[] = [];

  for (const file of files) {
    const transcriptContent = await readTail(file.filePath).catch(() => '');
    const normalizedContent = transcriptContent
      .toLowerCase()
      .replace(/\\\\/g, '\\')
      .replace(/\\\//g, '/');
    const workspaceWindows = path.resolve(workspaceDir).toLowerCase();
    const workspaceForward = workspaceWindows.replace(/\\/g, '/');
    const workspaceName = path.basename(workspaceDir).toLowerCase();
    if (
      sessionScope === 'workspace'
      &&
      !normalizedContent.includes(workspaceWindows)
      && !normalizedContent.includes(workspaceForward)
      && !normalizedContent.includes(workspaceName)
    ) {
      continue;
    }

    const records = parseJsonLines(transcriptContent);
    const conversationId = path.basename(path.resolve(path.dirname(file.filePath), '..', '..'));
    const userRecord = records.find((record) => asString(record.type) === 'USER_INPUT');
    const title = asString(userRecord?.content)
      .replace(/<\/?USER_REQUEST>/g, '')
      .replace(/<ADDITIONAL_METADATA>[\s\S]*/g, '')
      .trim()
      .slice(0, 120) || conversationId;
    const toolCalls = records.flatMap(toolCallsFromRecord);
    const sendToParent = toolCalls.find((call) => call.name === 'send_message');
    const parentId = asString(
      sendToParent?.args.Recipient
      || sendToParent?.args.recipient
      || sendToParent?.args.parentConversationId
    ) || null;
    const modelSetting = records
      .map((record) => asString(record.content).match(/Model Selection` from .*? to ([^.(\n]+)/)?.[1]?.trim() || '')
      .find(Boolean) || null;

    threads.push({
      runtime: 'antigravity',
      id: conversationId,
      parent_id: parentId,
      title,
      status: isRecent(file.updatedAt, 5 * 60 * 1000) ? 'running' : 'idle',
      workspace: sessionScope === 'workspace' ? workspaceDir : null,
      model: modelSetting,
      role: parentId ? 'subagent' : null,
      nickname: null,
      source: parentId ? 'subagent-transcript' : 'conversation',
      created_at: records.map((record) => toIsoDate(record.created_at)).find(Boolean) || null,
      updated_at: file.updatedAt,
      tokens_used: null,
      transcript_path: file.filePath,
      is_subagent: Boolean(parentId),
      inferred: true,
    });
    if (parentId) edges.push({ parent_id: parentId, child_id: conversationId, status: 'observed' });
  }

  if (files.length === 0) {
    diagnostics.push({
      level: 'info',
      code: 'antigravity_transcripts_missing',
      message: 'No Antigravity transcript logs were found in the known desktop, IDE, or CLI roots.',
    });
  } else if (sessionScope === 'workspace' && threads.length === 0) {
    diagnostics.push({
      level: 'info',
      code: 'antigravity_workspace_transcripts_missing',
      message: 'Antigravity transcripts were found, but none could be matched to this workspace.',
    });
  }
  return { threads, edges, diagnostics };
};

const readRuntimeThreads = async (
  paths: RuntimePaths,
  runtime: RuntimeId,
  workspaceDir: string,
  sessionScope: RuntimeSessionScope
): Promise<RuntimeThreadInventory> => {
  if (runtime === 'codex') return readCodexThreads(paths, workspaceDir, sessionScope);
  if (runtime === 'claude') return readClaudeThreads(paths, workspaceDir, sessionScope);
  return readAntigravityThreads(paths, workspaceDir, sessionScope);
};

export const getRuntimeOverview = async (
  options: RuntimeControlPlaneOptions,
  runtimeValue: RuntimeId | string
): Promise<RuntimeOverview> => {
  const runtime = normalizeRuntimeId(runtimeValue);
  const paths = await discoverRuntimePaths(options, runtime);
  const sessionScope = options.sessionScope || 'workspace';
  const [agents, skills, threadInventory] = await Promise.all([
    listRuntimeAgents(paths, runtime),
    listRuntimeSkills(paths, runtime),
    readRuntimeThreads(paths, runtime, paths.workspace, sessionScope),
  ]);
  const [homeAvailable, projectAvailable] = await Promise.all([
    fs.pathExists(paths.home),
    fs.pathExists(path.dirname(paths.agent_roots.project)),
  ]);
  const available = homeAvailable || projectAvailable;

  const diagnostics = [...threadInventory.diagnostics];
  if (!homeAvailable) {
    diagnostics.push({
      level: projectAvailable ? 'info' : 'warning',
      code: `${runtime}_home_missing`,
      message: `${RUNTIME_NAMES[runtime]} home directory was not found at ${paths.home}. It will be created only when you create a global definition.`,
    });
  }
  if (
    agents.some((agent) => agent.scope === 'legacy')
    || (paths.agent_roots.legacy && await fs.pathExists(paths.agent_roots.legacy))
  ) {
    diagnostics.push({
      level: 'info',
      code: `${runtime}_legacy_detected`,
      message: 'Legacy dashboard files were detected and are shown read-only. Native definitions use the global or project paths listed here.',
    });
  }

  return {
    runtime: {
      id: runtime,
      name: RUNTIME_NAMES[runtime],
      available,
      workspace_dir: paths.workspace,
      home_dir: paths.home,
      session_scope: sessionScope,
    },
    paths,
    capabilities: {
      definitions_read: true,
      definitions_write: true,
      skills_read: true,
      skills_write: true,
      sessions_read: true,
      sessions_control: false,
    },
    agents,
    skills,
    threads: threadInventory.threads,
    edges: threadInventory.edges,
    diagnostics,
  };
};

export const getAllRuntimeOverviews = async (
  options: RuntimeControlPlaneOptions
): Promise<RuntimeOverview[]> => {
  return Promise.all(
    (['codex', 'claude', 'antigravity'] as const).map((runtime) => getRuntimeOverview(options, runtime))
  );
};

const transmissionText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const record = asRecord(item);
        const type = asString(record.type).toLowerCase();
        if (
          type
          && type !== 'text'
          && type !== 'input_text'
          && type !== 'output_text'
        ) {
          return '';
        }
        return transmissionText(record.text ?? record.content ?? item);
      })
      .filter(Boolean)
      .join(' ');
  }
  const record = asRecord(value);
  if (typeof record.text === 'string') return record.text;
  if (record.content !== value) return transmissionText(record.content);
  return '';
};

const cleanTransmissionText = (value: unknown, limit = 320): string => {
  return transmissionText(value)
    .replace(/<in-app-browser-context[\s\S]*?<\/in-app-browser-context>/gi, ' ')
    .replace(/<ADDITIONAL_METADATA>[\s\S]*$/gi, ' ')
    .replace(/<\/?USER_REQUEST>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
};

const transmissionFromRecord = (
  runtime: RuntimeId,
  thread: RuntimeThread,
  record: Record<string, unknown>,
  textLimit = 320
): Omit<RuntimeTransmission, 'id'> | null => {
  let role: RuntimeTransmission['role'] | null = null;
  let message = '';

  if (runtime === 'codex') {
    const payload = asRecord(record.payload);
    if (asString(record.type) !== 'response_item' || asString(payload.type) !== 'message') {
      return null;
    }
    const payloadRole = asString(payload.role).toLowerCase();
    if (payloadRole !== 'user' && payloadRole !== 'assistant') return null;
    role = payloadRole;
    message = cleanTransmissionText(payload.content, textLimit);
  } else if (runtime === 'claude') {
    const recordType = asString(record.type).toLowerCase();
    const messageRecord = asRecord(record.message);
    const messageRole = asString(messageRecord.role || record.role || recordType).toLowerCase();
    if (messageRole !== 'user' && messageRole !== 'assistant') return null;
    role = messageRole;
    message = cleanTransmissionText(messageRecord.content ?? record.content, textLimit);
  } else {
    const recordType = asString(record.type);
    if (recordType === 'USER_INPUT') role = 'user';
    else if (recordType === 'PLANNER_RESPONSE') role = 'assistant';
    else return null;
    message = cleanTransmissionText(record.content, textLimit);
  }

  const timestamp = toIsoDate(record.timestamp || record.created_at);
  if (!role || !message || !timestamp) return null;
  return {
    runtime,
    thread_id: thread.id,
    role,
    message,
    timestamp,
    agent_name: thread.nickname || thread.role || null,
    is_subagent: thread.is_subagent,
  };
};

export const getRuntimeTransmissions = async (
  options: RuntimeControlPlaneOptions,
  limit = 24
): Promise<RuntimeTransmission[]> => {
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 24, 1), 300);
  const overviews = await getAllRuntimeOverviews(options);
  const transmissions = (
    await Promise.all(overviews.flatMap((overview) => (
      overview.threads
        .filter((thread) => Boolean(thread.transcript_path))
        .sort((left, right) => (right.updated_at || '').localeCompare(left.updated_at || ''))
        .slice(0, 12)
        .map(async (thread) => {
          const transcriptPath = thread.transcript_path;
          if (!transcriptPath) return [];
          const content = await readTail(transcriptPath, 512 * 1024).catch(() => '');
          return parseJsonLines(content)
            .map((record) => transmissionFromRecord(overview.runtime.id, thread, record))
            .filter((item): item is Omit<RuntimeTransmission, 'id'> => Boolean(item))
            .slice(-Math.max(safeLimit, 12));
        })
    )))
  ).flat();

  const unique = new Map<string, RuntimeTransmission>();
  for (const transmission of transmissions) {
    const digest = createHash('sha256')
      .update([
        transmission.runtime,
        transmission.thread_id,
        transmission.role,
        transmission.timestamp,
        transmission.message,
      ].join('\0'))
      .digest('hex')
      .slice(0, 16);
    unique.set(`${transmission.runtime}:${digest}`, {
      ...transmission,
      id: `${transmission.runtime}:${digest}`,
    });
  }

  const perRuntimeLimit = Math.ceil(safeLimit / 3);
  const balanced = (['codex', 'claude', 'antigravity'] as const)
    .flatMap((runtime) => Array.from(unique.values())
      .filter((item) => item.runtime === runtime)
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .slice(0, perRuntimeLimit));

  return balanced
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, safeLimit);
};

export const getRuntimeSessions = async (
  options: RuntimeControlPlaneOptions,
  limit = 240
): Promise<RuntimeSessionSummary[]> => {
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 240, 1), 500);
  const overviews = await getAllRuntimeOverviews(options);

  return overviews
    .flatMap((overview) => overview.threads
      .filter((thread) => Boolean(thread.transcript_path))
      .map((thread): RuntimeSessionSummary => ({
        id: `${overview.runtime.id}:${thread.id}`,
        runtime: overview.runtime.id,
        thread_id: thread.id,
        title: thread.title,
        status: thread.status,
        workspace: thread.workspace,
        model: thread.model,
        agent_name: thread.nickname || thread.role || null,
        created_at: thread.created_at,
        updated_at: thread.updated_at,
        is_subagent: thread.is_subagent,
        inferred: thread.inferred,
      })))
    .sort((left, right) => (
      right.updated_at || right.created_at || ''
    ).localeCompare(left.updated_at || left.created_at || ''))
    .slice(0, safeLimit);
};

export const getRuntimeSessionMessages = async (
  options: RuntimeControlPlaneOptions,
  runtimeValue: RuntimeId | string,
  threadId: string,
  limit = 500
): Promise<RuntimeSessionMessage[]> => {
  const runtime = normalizeRuntimeId(runtimeValue);
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 500, 1), 1000);
  const overview = await getRuntimeOverview(options, runtime);
  const thread = overview.threads.find((item) => item.id === threadId);
  if (!thread?.transcript_path) {
    throw new Error(`Session not found: ${runtime}/${threadId}`);
  }

  const content = await readTail(thread.transcript_path, MAX_TRANSCRIPT_BYTES);
  return parseJsonLines(content)
    .map((record, index) => {
      const transmission = transmissionFromRecord(runtime, thread, record, 12_000);
      if (!transmission) return null;
      const digest = createHash('sha256')
        .update([
          runtime,
          thread.id,
          String(index),
          transmission.role,
          transmission.timestamp,
          transmission.message,
        ].join('\0'))
        .digest('hex')
        .slice(0, 16);
      return {
        id: `${runtime}:${digest}`,
        runtime,
        thread_id: thread.id,
        role: transmission.role,
        content: transmission.message,
        timestamp: transmission.timestamp,
        model: thread.model,
        agent_name: transmission.agent_name,
        is_subagent: transmission.is_subagent,
      } satisfies RuntimeSessionMessage;
    })
    .filter((item): item is RuntimeSessionMessage => Boolean(item))
    .slice(-safeLimit);
};

const findAgent = async (
  options: RuntimeControlPlaneOptions,
  runtime: RuntimeId,
  scope: RuntimeScope,
  id: string
): Promise<RuntimeAgentDefinition> => {
  const paths = await discoverRuntimePaths(options, runtime);
  const agents = await listRuntimeAgents(paths, runtime);
  const agent = agents.find((item) => item.scope === scope && item.id === id);
  if (!agent) throw new Error(`Agent not found: ${runtime}/${scope}/${id}`);
  return agent;
};

export const getRuntimeAgentDefinition = async (
  options: RuntimeControlPlaneOptions,
  runtimeValue: RuntimeId | string,
  scope: RuntimeScope,
  id: string
): Promise<RuntimeAgentDefinition> => {
  return findAgent(options, normalizeRuntimeId(runtimeValue), scope, id);
};

const findSkill = async (
  options: RuntimeControlPlaneOptions,
  runtime: RuntimeId,
  scope: RuntimeScope,
  id: string
): Promise<RuntimeSkillDefinition> => {
  const paths = await discoverRuntimePaths(options, runtime);
  const skills = await listRuntimeSkills(paths, runtime);
  const skill = skills.find((item) => item.scope === scope && item.id === id);
  if (!skill) throw new Error(`Skill not found: ${runtime}/${scope}/${id}`);
  return skill;
};

const managedAgentRoot = (paths: RuntimePaths, scope: WritableRuntimeScope) => paths.agent_roots[scope];
const managedSkillRoot = (paths: RuntimePaths, scope: WritableRuntimeScope) => paths.skill_roots[scope];

const createManagedLocation = (
  paths: RuntimePaths,
  root: string,
  scope: WritableRuntimeScope
): ManagedLocation => ({
  anchor: scope === 'project' ? paths.workspace : path.dirname(root),
  root,
  recovery_root: path.join(path.dirname(root), '.dashboard-recovery', path.basename(root)),
});

const managedAgentLocation = (
  paths: RuntimePaths,
  scope: WritableRuntimeScope
): ManagedLocation => createManagedLocation(paths, managedAgentRoot(paths, scope), scope);

const managedSkillLocation = (
  paths: RuntimePaths,
  scope: WritableRuntimeScope
): ManagedLocation => createManagedLocation(paths, managedSkillRoot(paths, scope), scope);

const agentFilePath = (
  paths: RuntimePaths,
  runtime: RuntimeId,
  scope: WritableRuntimeScope,
  id: string
): string => {
  const root = managedAgentRoot(paths, scope);
  const extension = runtime === 'codex' ? '.toml' : '.md';
  return assertPathInside(root, path.join(root, `${assertSafeId(id)}${extension}`));
};

const skillFilePath = (
  paths: RuntimePaths,
  scope: WritableRuntimeScope,
  id: string
): string => {
  const root = managedSkillRoot(paths, scope);
  return assertPathInside(root, path.join(root, assertSafeId(id), 'SKILL.md'));
};

const resolveCodexSkillConfig = async (
  options: RuntimeControlPlaneOptions,
  requestedSkills: string[],
  existingValue: unknown
): Promise<Array<{ path: string; enabled: boolean }>> => {
  const paths = await discoverRuntimePaths(options, 'codex');
  const skills = await listRuntimeSkills(paths, 'codex');
  const requested = uniqueStrings(requestedSkills);
  const requestedSet = new Set(requested);
  const matched = new Set<string>();
  const result: Array<Record<string, unknown>> = [];
  const existing = Array.isArray(existingValue) ? existingValue.map(asRecord) : [];

  for (const entry of existing) {
    const skillId = codexSkillIdFromConfig(entry);
    if (!skillId) {
      result.push(entry);
      continue;
    }
    if (requestedSet.has(skillId)) {
      result.push(entry);
      matched.add(skillId);
    }
  }

  for (const skillId of requested) {
    if (matched.has(skillId)) continue;
    const normalizedId = path.basename(skillId.replace(/\\/g, '/'));
    const matches = skills.filter((skill) => skill.id === normalizedId);
    const selected = matches.find((skill) => skill.scope === 'project')
      || matches.find((skill) => skill.scope === 'global')
      || matches[0];
    if (!selected) throw new Error(`Codex skill not found: ${skillId}`);
    result.push({ path: selected.file_path, enabled: true });
  }

  return result as Array<{ path: string; enabled: boolean }>;
};

const writeRuntimeAgent = async (
  options: RuntimeControlPlaneOptions,
  runtime: RuntimeId,
  scope: WritableRuntimeScope,
  id: string,
  input: RuntimeAgentInput,
  existing?: RuntimeAgentDefinition
): Promise<RuntimeAgentDefinition> => {
  const validated = validateRuntimeAgentInput({ ...asRecord(input), scope });
  const paths = await discoverRuntimePaths(options, runtime);
  const location = managedAgentLocation(paths, scope);
  const filePath = existing?.file_path || agentFilePath(paths, runtime, scope, id);
  if (!filePath) throw new Error(`Cannot write the built-in agent: ${id}`);
  const nativeName = normalizeNativeAgentName(runtime, validated.name);

  if (runtime === 'codex') {
    let raw: Record<string, unknown> = {};
    if (await fs.pathExists(filePath)) {
      raw = asRecord(parseToml(await fs.readFile(filePath, 'utf-8')));
    }
    raw = {
      ...raw,
      ...(validated.metadata || {}),
      name: nativeName,
      description: (validated.description || '').trim(),
      developer_instructions: validated.instructions.trim(),
    };
    if (validated.model === null || validated.model === '') delete raw.model;
    else if (validated.model !== undefined) raw.model = validated.model;
    if (validated.skills !== undefined) {
      const currentSkills = asRecord(raw.skills);
      raw.skills = {
        ...currentSkills,
        config: await resolveCodexSkillConfig(options, validated.skills, currentSkills.config),
      };
    }
    await atomicWriteFile(location, filePath, `${stringifyToml(cleanObject(raw) as Record<string, unknown>).trim()}\n`);
  } else {
    let document: MarkdownDocument = { frontmatter: {}, body: '' };
    if (await fs.pathExists(filePath)) {
      document = parseMarkdownDocument(await fs.readFile(filePath, 'utf-8'));
    }
    const frontmatter: Record<string, unknown> = {
      ...document.frontmatter,
      ...(validated.metadata || {}),
      name: nativeName,
      description: (validated.description || '').trim(),
    };
    if (runtime === 'antigravity' && !existing) {
      if (frontmatter.mainAgent === undefined) frontmatter.mainAgent = false;
      if (frontmatter.subagent === undefined) frontmatter.subagent = true;
    }
    if (validated.model === null || validated.model === '') delete frontmatter.model;
    else if (validated.model !== undefined) frontmatter.model = validated.model;
    if (validated.tools !== undefined) {
      if (validated.tools.length === 0) delete frontmatter.tools;
      else frontmatter.tools = uniqueStrings(validated.tools);
    }
    if (validated.skills !== undefined) {
      if (validated.skills.length === 0) {
        delete frontmatter.skills;
      } else {
        frontmatter.skills = runtime === 'antigravity'
          ? uniqueStrings(validated.skills).map((skill) => skill.includes('/') ? skill : `skills/${skill}`)
          : uniqueStrings(validated.skills);
      }
    }
    await atomicWriteFile(location, filePath, serializeMarkdownDocument(frontmatter, validated.instructions));
  }

  const result = runtime === 'codex'
    ? await readCodexAgent(filePath, scope)
    : await readMarkdownAgent(runtime, filePath, scope, location.root);
  if (!result) throw new Error(`Agent was written but could not be parsed: ${filePath}`);
  return result;
};

export const createRuntimeAgent = async (
  options: RuntimeControlPlaneOptions,
  runtimeValue: RuntimeId | string,
  input: RuntimeAgentInput
): Promise<RuntimeAgentDefinition> => {
  const runtime = normalizeRuntimeId(runtimeValue);
  const validated = validateRuntimeAgentInput(input);
  const scope = validated.scope;
  const id = normalizeNativeAgentName(runtime, validated.id || validated.name);
  const paths = await discoverRuntimePaths(options, runtime);
  const filePath = agentFilePath(paths, runtime, scope, id);
  if (await fs.pathExists(filePath)) {
    throw new Error(`Agent already exists: ${runtime}/${scope}/${id}`);
  }
  return writeRuntimeAgent(options, runtime, scope, id, validated);
};

export const updateRuntimeAgent = async (
  options: RuntimeControlPlaneOptions,
  runtimeValue: RuntimeId | string,
  scopeValue: RuntimeScope | string,
  idValue: string,
  input: RuntimeAgentInput
): Promise<RuntimeAgentDefinition> => {
  const runtime = normalizeRuntimeId(runtimeValue);
  const scope = assertWritableScope(scopeValue);
  const id = assertSafeId(idValue);
  const existing = await findAgent(options, runtime, scope, id);
  return writeRuntimeAgent(options, runtime, scope, id, { ...input, scope }, existing);
};

export const deleteRuntimeAgent = async (
  options: RuntimeControlPlaneOptions,
  runtimeValue: RuntimeId | string,
  scopeValue: RuntimeScope | string,
  idValue: string
): Promise<{ success: true; trash_path: string }> => {
  const runtime = normalizeRuntimeId(runtimeValue);
  const scope = assertWritableScope(scopeValue);
  const id = assertSafeId(idValue);
  const paths = await discoverRuntimePaths(options, runtime);
  const existing = await findAgent(options, runtime, scope, id);
  if (!existing.file_path) throw new Error(`Agent is read-only: ${id}`);
  return {
    success: true,
    trash_path: await moveToTrash(managedAgentLocation(paths, scope), existing.file_path),
  };
};

const writeRuntimeSkill = async (
  options: RuntimeControlPlaneOptions,
  runtime: RuntimeId,
  scope: WritableRuntimeScope,
  id: string,
  input: RuntimeSkillInput,
  existing?: RuntimeSkillDefinition
): Promise<RuntimeSkillDefinition> => {
  const validated = validateRuntimeSkillInput({ ...asRecord(input), scope });
  const paths = await discoverRuntimePaths(options, runtime);
  const location = managedSkillLocation(paths, scope);
  const filePath = existing?.file_path || skillFilePath(paths, scope, id);
  let document: MarkdownDocument = { frontmatter: {}, body: '' };
  if (await fs.pathExists(filePath)) {
    document = parseMarkdownDocument(await fs.readFile(filePath, 'utf-8'));
  }
  const frontmatter = {
    ...document.frontmatter,
    ...(validated.metadata || {}),
    name: id,
    description: (validated.description || '').trim(),
  };
  await atomicWriteFile(location, filePath, serializeMarkdownDocument(frontmatter, validated.instructions));
  const result = await readRuntimeSkill(runtime, filePath, scope);
  if (!result) throw new Error(`Skill was written but could not be parsed: ${filePath}`);
  return result;
};

export const createRuntimeSkill = async (
  options: RuntimeControlPlaneOptions,
  runtimeValue: RuntimeId | string,
  input: RuntimeSkillInput
): Promise<RuntimeSkillDefinition> => {
  const runtime = normalizeRuntimeId(runtimeValue);
  const validated = validateRuntimeSkillInput(input);
  const scope = validated.scope;
  const id = normalizeNativeSkillName(validated.id || validated.name);
  const paths = await discoverRuntimePaths(options, runtime);
  const filePath = skillFilePath(paths, scope, id);
  if (await fs.pathExists(filePath)) {
    throw new Error(`Skill already exists: ${runtime}/${scope}/${id}`);
  }
  return writeRuntimeSkill(options, runtime, scope, id, validated);
};

export const updateRuntimeSkill = async (
  options: RuntimeControlPlaneOptions,
  runtimeValue: RuntimeId | string,
  scopeValue: RuntimeScope | string,
  idValue: string,
  input: RuntimeSkillInput
): Promise<RuntimeSkillDefinition> => {
  const runtime = normalizeRuntimeId(runtimeValue);
  const scope = assertWritableScope(scopeValue);
  const id = assertSafeId(idValue);
  const existing = await findSkill(options, runtime, scope, id);
  return writeRuntimeSkill(options, runtime, scope, id, { ...input, scope }, existing);
};

export const deleteRuntimeSkill = async (
  options: RuntimeControlPlaneOptions,
  runtimeValue: RuntimeId | string,
  scopeValue: RuntimeScope | string,
  idValue: string
): Promise<{ success: true; trash_path: string }> => {
  const runtime = normalizeRuntimeId(runtimeValue);
  const scope = assertWritableScope(scopeValue);
  const id = assertSafeId(idValue);
  const paths = await discoverRuntimePaths(options, runtime);
  const existing = await findSkill(options, runtime, scope, id);
  const skillIds = new Set([id, existing.id, path.basename(path.dirname(existing.file_path))]);
  const referencingAgents = (await listRuntimeAgents(paths, runtime))
    .filter((agent) => agent.skills.some((skillId) => skillIds.has(skillId)));
  if (referencingAgents.length > 0) {
    throw new Error(
      `Skill is assigned to agents: ${referencingAgents.map((agent) => agent.name).join(', ')}`
    );
  }
  const packageDir = path.dirname(existing.file_path);
  return {
    success: true,
    trash_path: await moveToTrash(managedSkillLocation(paths, scope), packageDir),
  };
};

const assertPortableSkillPackage = async (sourceDir: string): Promise<void> => {
  const queue = [sourceDir];
  let inspected = 0;
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const stat = await fs.lstat(current);
    if (stat.isSymbolicLink()) {
      throw new Error(`Skill packages containing symbolic links or junctions cannot be copied: ${current}`);
    }
    inspected += 1;
    if (inspected > 2_000) {
      throw new Error('Skill package is too large to copy safely');
    }
    if (!stat.isDirectory()) continue;
    const entries = await fs.readdir(current);
    queue.push(...entries.map((entry) => path.join(current, entry)));
  }
};

interface CopiedSkillPackage {
  installed_path: string;
  destination_dir: string;
  previous_backup_path: string | null;
}

const copySkillPackage = async (
  source: RuntimeSkillDefinition,
  destination: ManagedLocation,
  installedId: string
): Promise<CopiedSkillPackage> => {
  const sourceDir = path.dirname(source.file_path);
  const destinationRoot = destination.root;
  const destinationDir = assertPathInside(destinationRoot, path.join(destinationRoot, installedId));
  const tempDir = assertPathInside(destinationRoot, path.join(
    destinationRoot,
    `.${installedId}.${process.pid}.${Date.now()}.tmp`
  ));
  await assertPortableSkillPackage(sourceDir);
  await ensureDirectoryInsideAnchor(destination.anchor, destinationRoot);
  await fs.remove(tempDir);
  await fs.copy(sourceDir, tempDir, { overwrite: false, errorOnExist: true });

  let previousBackupPath: string | null = null;
  try {
    if (await fs.pathExists(destinationDir)) {
      const backupDir = path.join(destination.recovery_root, 'backups');
      await ensureDirectoryInsideAnchor(destination.anchor, backupDir);
      await assertExistingRealPathInside(destination, destinationDir);
      previousBackupPath = path.join(backupDir, recoveryFileName(destination, destinationDir));
      await fs.move(destinationDir, previousBackupPath, { overwrite: false });
    }
    await fs.move(tempDir, destinationDir, { overwrite: false });
  } catch (error: unknown) {
    await fs.remove(tempDir).catch(() => undefined);
    if (
      previousBackupPath
      && await fs.pathExists(previousBackupPath)
      && !(await fs.pathExists(destinationDir))
    ) {
      await fs.move(previousBackupPath, destinationDir, { overwrite: false }).catch(() => undefined);
    }
    throw error;
  }

  return {
    installed_path: path.join(destinationDir, 'SKILL.md'),
    destination_dir: destinationDir,
    previous_backup_path: previousBackupPath,
  };
};

export const assignRuntimeSkill = async (
  options: RuntimeControlPlaneOptions,
  input: AssignRuntimeSkillInput
): Promise<RuntimeSkillAssignmentResult> => {
  const validated = validateSkillAssignmentInput(input);
  const sourceRuntime = validated.source_runtime;
  const targetRuntime = validated.target_runtime;
  const targetScope = validated.target_scope;
  const sourceSkillId = validated.source_skill_id;
  const targetAgentId = validated.target_agent_id;
  const targetAgentScope = validated.target_agent_scope || targetScope;
  const source = await findSkill(options, sourceRuntime, validated.source_scope, sourceSkillId);
  const targetAgent = await findAgent(options, targetRuntime, targetAgentScope, targetAgentId);
  if (!targetAgent.editable && targetAgent.scope !== 'legacy') {
    throw new Error(`Target agent cannot be imported or edited: ${targetAgentId}`);
  }
  if (targetAgent.editable && targetAgent.scope !== targetScope) {
    throw new Error(
      `Editable target agent scope must match the install scope: ${targetAgent.scope} !== ${targetScope}`
    );
  }

  const installedId = slugify(`dashboard-${sourceRuntime}-${source.id}`);
  const targetPaths = await discoverRuntimePaths(options, targetRuntime);
  const targetSkillLocation = managedSkillLocation(targetPaths, targetScope);
  const targetAgentLocation = managedAgentLocation(targetPaths, targetScope);
  const targetAgentImported = targetAgent.scope === 'legacy';
  const destinationAgentId = targetAgentImported
    ? normalizeNativeAgentName(targetRuntime, targetAgent.id)
    : targetAgent.id;
  const destinationAgentPath = targetAgentImported
    ? agentFilePath(targetPaths, targetRuntime, targetScope, destinationAgentId)
    : targetAgent.file_path;
  if (!destinationAgentPath) throw new Error(`Target agent is read-only: ${targetAgentId}`);

  const legacyUsesDestination = Boolean(
    targetAgentImported
    && targetAgent.file_path
    && normalizePathForMatch(targetAgent.file_path) === normalizePathForMatch(destinationAgentPath)
  );
  if (
    targetAgentImported
    && !legacyUsesDestination
    && await fs.pathExists(destinationAgentPath)
  ) {
    throw new Error(
      `A native ${targetRuntime}/${targetScope}/${destinationAgentId} agent already exists; select that agent instead`
    );
  }

  const originalAgentContent = await fs.readFile(destinationAgentPath, 'utf-8').catch(() => null);
  const existingForWrite = targetAgentImported
    ? legacyUsesDestination
      ? {
          ...targetAgent,
          id: destinationAgentId,
          scope: targetScope,
          editable: true,
          file_path: destinationAgentPath,
        }
      : undefined
    : targetAgent;
  let copiedPackage: CopiedSkillPackage | null = null;

  try {
    copiedPackage = await copySkillPackage(source, targetSkillLocation, installedId);
    const installedPath = copiedPackage.installed_path;
    const copiedDocument = parseMarkdownDocument(await fs.readFile(installedPath, 'utf-8'));
    await atomicWriteFile(
      targetSkillLocation,
      installedPath,
      serializeMarkdownDocument(
        { ...copiedDocument.frontmatter, name: installedId },
        copiedDocument.body
      )
    );

    const updatedAgent = await writeRuntimeAgent(
      options,
      targetRuntime,
      targetScope,
      destinationAgentId,
      {
        name: targetAgent.name,
        description: targetAgent.description
          || `Imported from legacy ${targetRuntime} agent ${targetAgent.id}.`,
        instructions: targetAgent.instructions,
        model: targetAgent.model,
        scope: targetScope,
        skills: uniqueStrings([...targetAgent.skills, installedId]),
        tools: targetAgent.tools,
        metadata: targetAgent.metadata,
      },
      existingForWrite
    );
    const installedSkill = await readRuntimeSkill(targetRuntime, installedPath, targetScope);
    if (!installedSkill) throw new Error('Installed skill could not be read after assignment');

    const sourceContent = await fs.readFile(source.file_path, 'utf-8');
    const runtimeSpecific = /(?:\.codex|\.claude|\.gemini|CODEX_HOME|CLAUDE_HOME|ANTIGRAVITY_HOME)/i.test(sourceContent);
    const compatibility = sourceRuntime === targetRuntime
      ? 'native'
      : runtimeSpecific
        ? 'adapted'
        : 'portable';
    const warnings = compatibility === 'adapted'
      ? ['The skill package contains runtime-specific paths or names. Its Markdown instructions were copied, but runtime-specific tools must be reviewed.']
      : [];

    return {
      source,
      installed_skill: installedSkill,
      target_agent: updatedAgent,
      compatibility,
      warnings,
      installed_path: installedPath,
      assigned_at: new Date().toISOString(),
      target_agent_imported: targetAgentImported,
    };
  } catch (error: unknown) {
    const rollbackErrors: string[] = [];
    if (copiedPackage) {
      await fs.remove(copiedPackage.destination_dir).catch((rollbackError: unknown) => {
        rollbackErrors.push(`remove copied package: ${String(rollbackError)}`);
      });
      if (copiedPackage.previous_backup_path && await fs.pathExists(copiedPackage.previous_backup_path)) {
        await fs.move(
          copiedPackage.previous_backup_path,
          copiedPackage.destination_dir,
          { overwrite: false }
        ).catch((rollbackError: unknown) => {
          rollbackErrors.push(`restore previous package: ${String(rollbackError)}`);
        });
      }
    }
    const currentAgentContent = await fs.readFile(destinationAgentPath, 'utf-8').catch(() => null);
    if (currentAgentContent !== originalAgentContent) {
      if (originalAgentContent === null) {
        await fs.remove(destinationAgentPath).catch((rollbackError: unknown) => {
          rollbackErrors.push(`remove imported target agent: ${String(rollbackError)}`);
        });
      } else {
        await atomicWriteFile(targetAgentLocation, destinationAgentPath, originalAgentContent)
          .catch((rollbackError: unknown) => {
            rollbackErrors.push(`restore target agent: ${String(rollbackError)}`);
          });
      }
    }

    if (rollbackErrors.length > 0) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${message}. Assignment rollback failed: ${rollbackErrors.join('; ')}`);
    }
    throw error;
  }
};

export const parseRuntimeId = normalizeRuntimeId;
