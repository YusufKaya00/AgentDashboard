import fs from 'fs-extra';
import path from 'path';

export interface CodexInventoryOptions {
  codexHome: string;
  workspaceDir: string;
}

export interface CodexSkillInfo {
  id: string;
  name: string;
  description: string;
  source: 'system' | 'plugin' | 'user';
  file_path: string;
  updated_at: string | null;
}

export interface CodexInventory {
  runtime: {
    name: 'Codex';
    codex_home: string;
    workspace_dir: string;
    available: boolean;
  };
  agents: Array<{
    id: string;
    name: string;
    role: string;
    description: string;
    capabilities: string[];
  }>;
  skills: {
    total: number;
    by_source: Record<CodexSkillInfo['source'], number>;
    items: CodexSkillInfo[];
  };
  config: {
    files: Array<{ name: string; exists: boolean; updated_at: string | null }>;
    redacted: Record<string, string>;
  };
  sessions: {
    total: number;
    recent: Array<Record<string, unknown>>;
  };
}

const CODEX_AGENTS = [
  {
    id: 'default',
    name: 'Default Codex',
    role: 'primary',
    description: 'Main coding collaborator for implementation, debugging, review, and workspace operation.',
    capabilities: ['code-editing', 'terminal', 'repo-analysis', 'verification'],
  },
  {
    id: 'explorer',
    name: 'Explorer',
    role: 'subagent',
    description: 'Read-only codebase investigator for focused questions that can run in parallel.',
    capabilities: ['code-search', 'architecture-reading', 'risk-scouting'],
  },
  {
    id: 'worker',
    name: 'Worker',
    role: 'subagent',
    description: 'Bounded implementation agent for disjoint file ownership and parallel code changes.',
    capabilities: ['implementation', 'test-fixing', 'refactoring'],
  },
];

const SECRET_KEY_PATTERN = /(api[_-]?key|token|secret|password|auth|credential|session|sid)/i;

const parseFrontMatter = (content: string) => {
  const result: Record<string, string> = {};
  if (!content.startsWith('---')) return result;

  const end = content.indexOf('\n---', 3);
  if (end === -1) return result;

  const lines = content.slice(3, end).split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) {
      result[match[1]] = match[2].replace(/^['"]|['"]$/g, '').trim();
    }
  }
  return result;
};

const walkForSkillFiles = async (dir: string, limit = 300): Promise<string[]> => {
  const found: string[] = [];
  const stack = [dir];

  while (stack.length > 0 && found.length < limit) {
    const current = stack.pop();
    if (!current || !(await fs.pathExists(current))) continue;

    const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name === 'SKILL.md') {
        found.push(fullPath);
      }
    }
  }

  return found;
};

const sourceForSkill = (codexHome: string, filePath: string): CodexSkillInfo['source'] => {
  const relative = path.relative(codexHome, filePath).replace(/\\/g, '/');
  if (relative.startsWith('plugins/cache/')) return 'plugin';
  if (relative.startsWith('skills/.system/')) return 'system';
  return 'user';
};

const readSkill = async (codexHome: string, filePath: string): Promise<CodexSkillInfo | null> => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const frontMatter = parseFrontMatter(content);
    const dirName = path.basename(path.dirname(filePath));
    const stat = await fs.stat(filePath);

    return {
      id: frontMatter.name || dirName,
      name: frontMatter.name || dirName,
      description: frontMatter.description || 'No description available',
      source: sourceForSkill(codexHome, filePath),
      file_path: filePath,
      updated_at: stat.mtime.toISOString(),
    };
  } catch {
    return null;
  }
};

const parseTomlLikeConfig = async (filePath: string) => {
  const redacted: Record<string, string> = {};
  if (!(await fs.pathExists(filePath))) return redacted;

  const content = await fs.readFile(filePath, 'utf-8').catch(() => '');
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z0-9_.-]+)\s*=\s*(.+?)\s*$/);
    if (!match) continue;

    const key = match[1];
    const value = match[2].replace(/^['"]|['"]$/g, '');
    redacted[key] = SECRET_KEY_PATTERN.test(key) ? '[redacted]' : value;
  }

  return redacted;
};

const getFileSummary = async (dir: string, fileName: string) => {
  const filePath = path.join(dir, fileName);
  const exists = await fs.pathExists(filePath);
  const stat = exists ? await fs.stat(filePath).catch(() => null) : null;
  return {
    name: fileName,
    exists,
    updated_at: stat ? stat.mtime.toISOString() : null,
  };
};

const readSessionIndex = async (codexHome: string, workspaceDir: string) => {
  const indexPath = path.join(codexHome, 'session_index.jsonl');
  if (!(await fs.pathExists(indexPath))) return { total: 0, recent: [] };

  const content = await fs.readFile(indexPath, 'utf-8').catch(() => '');
  const all = content
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
    .filter((item): item is Record<string, unknown> => Boolean(item));

  const normalizedWorkspace = workspaceDir.replace(/\\/g, '/').toLowerCase();
  const matching = all.filter((item) => {
    const rawWorkspace = String(item.workspace || item.cwd || '');
    return rawWorkspace.replace(/\\/g, '/').toLowerCase().includes(normalizedWorkspace);
  });
  const sessions = matching.length > 0 ? matching : all;

  return {
    total: sessions.length,
    recent: sessions.slice(-8).reverse(),
  };
};

export const getCodexInventory = async ({
  codexHome,
  workspaceDir,
}: CodexInventoryOptions): Promise<CodexInventory> => {
  const available = await fs.pathExists(codexHome);
  const skillRoots = [
    path.join(codexHome, 'skills'),
    path.join(codexHome, 'plugins', 'cache'),
  ];

  const skillFiles = (await Promise.all(skillRoots.map((root) => walkForSkillFiles(root)))).flat();
  const skills = (await Promise.all(skillFiles.map((filePath) => readSkill(codexHome, filePath))))
    .filter((skill): skill is CodexSkillInfo => Boolean(skill))
    .sort((a, b) => a.name.localeCompare(b.name));

  const bySource = skills.reduce<Record<CodexSkillInfo['source'], number>>(
    (acc, skill) => {
      acc[skill.source] += 1;
      return acc;
    },
    { system: 0, plugin: 0, user: 0 }
  );

  const [configFiles, redacted, sessions] = await Promise.all([
    Promise.all(['config.toml', 'models_cache.json', 'session_index.jsonl', '.codex-global-state.json'].map((name) => getFileSummary(codexHome, name))),
    parseTomlLikeConfig(path.join(codexHome, 'config.toml')),
    readSessionIndex(codexHome, workspaceDir),
  ]);

  return {
    runtime: {
      name: 'Codex',
      codex_home: codexHome,
      workspace_dir: workspaceDir,
      available,
    },
    agents: CODEX_AGENTS,
    skills: {
      total: skills.length,
      by_source: bySource,
      items: skills,
    },
    config: {
      files: configFiles,
      redacted,
    },
    sessions,
  };
};
