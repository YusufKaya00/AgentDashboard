import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import chokidar from 'chokidar';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getCodexInventory } from './lib/codexInventory.js';
import {
  buildAITargets,
  buildUnifiedSkills,
  replaceSkillAssignments,
  type SkillAssignment,
} from './lib/aiControlPlane.js';

import 'dotenv/config';

// ESM path helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

const execAsync = promisify(exec);

// ============ PATHS ============
const ROOT_DIR = path.resolve(__dirname, process.env.WORKSPACE_DIR || '..');
const CLAUDE_DIR = path.join(os.homedir(), '.gemini', 'antigravity');

const localClaudeDir = path.join(ROOT_DIR, '.claude');
// Ensure global directory structure exists
fs.ensureDirSync(CLAUDE_DIR);
fs.ensureDirSync(path.join(CLAUDE_DIR, 'agents'));
fs.ensureDirSync(path.join(CLAUDE_DIR, 'data'));

// Migrate from local .claude if global files do not exist
const filesToMigrate = [
  'agents.json',
  'models.json',
  'hooks.json',
  'skills.json',
  'tasks.json',
  'data/activities.json',
  'data/skill_assignments.json'
];

for (const file of filesToMigrate) {
  const src = path.join(localClaudeDir, file);
  const dest = path.join(CLAUDE_DIR, file);
  if (fs.existsSync(src) && !fs.existsSync(dest)) {
    try {
      fs.copySync(src, dest);
      console.log(`[Migration] Copying ${file} to global .gemini/antigravity`);
    } catch (err) {
      console.error(`[Migration] Failed to copy ${file}:`, err);
    }
  }
}

// Copy prompt markdown files
const srcAgents = path.join(localClaudeDir, 'agents');
const destAgents = path.join(CLAUDE_DIR, 'agents');
if (fs.existsSync(srcAgents)) {
  try {
    const files = fs.readdirSync(srcAgents);
    for (const file of files) {
      const srcFile = path.join(srcAgents, file);
      const destFile = path.join(destAgents, file);
      if (!fs.existsSync(destFile)) {
        fs.copySync(srcFile, destFile);
        console.log(`[Migration] Copying agent config ${file} to global .gemini/antigravity`);
      }
    }
  } catch (err) {
    console.error(`[Migration] Failed to copy agent config files:`, err);
  }
}

const AGENTS_DIR = path.join(CLAUDE_DIR, 'agents');
const DATA_DIR = path.join(CLAUDE_DIR, 'data');
const MODELS_FILE = path.join(CLAUDE_DIR, 'models.json');
const HOOKS_FILE = path.join(CLAUDE_DIR, 'hooks.json');
const SKILLS_FILE = path.join(CLAUDE_DIR, 'skills.json');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activities.json');
const SKILL_ASSIGNMENTS_FILE = path.join(DATA_DIR, 'skill_assignments.json');
const HOOK_HISTORY_FILE = path.join(DATA_DIR, 'hook_history.json');

// ============ HELPERS ============
const broadcast = (data: any) => {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
};

const readJson = async (filePath: string, fallback: any = []) => {
  try { return await fs.readJson(filePath); } catch { return fallback; }
};

const writeJson = async (filePath: string, data: any) => {
  await fs.writeJson(filePath, data, { spaces: 2 });
};

const genId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

const logActivity = async (type: string, message: string, agentId = 'system', metadata: any = {}) => {
  const activity = { id: genId(), type, message, agent_id: agentId, timestamp: new Date().toISOString(), metadata };
  const activities = await readJson(ACTIVITIES_FILE, []);
  activities.push(activity);
  await writeJson(ACTIVITIES_FILE, activities.slice(-500));
  broadcast({ type: 'activity', data: activity });
};

const normalizeSkill = (skill: any) => {
  const enabled = skill.enabled ?? skill.active ?? true;
  return { ...skill, enabled, active: enabled };
};

const getAIControlPlaneOverview = async () => {
  const [agents, claudeSkills, models, providers, assignments, codexInventory] = await Promise.all([
    readJson(AGENTS_METADATA_FILE, []),
    readJson(SKILLS_FILE, []),
    readJson(MODELS_FILE, []),
    readJson(PROVIDERS_FILE, []),
    readJson(SKILL_ASSIGNMENTS_FILE, []),
    getCodexInventory({ codexHome: path.join(os.homedir(), '.codex'), workspaceDir: ROOT_DIR }),
  ]);

  const normalizedAssignments = Array.isArray(assignments) ? assignments as SkillAssignment[] : [];
  const targets = buildAITargets({
    agents: Array.isArray(agents) ? agents : [],
    codexAgents: codexInventory.agents,
    models: Array.isArray(models) ? models : [],
    providers: Array.isArray(providers) ? providers : [],
  });
  const skills = buildUnifiedSkills(
    Array.isArray(claudeSkills) ? claudeSkills.map(normalizeSkill) : [],
    codexInventory.skills.items,
    normalizedAssignments
  );

  return {
    skills,
    targets,
    assignments: normalizedAssignments,
    summary: {
      skills: skills.length,
      targets: targets.length,
      assignments: normalizedAssignments.length,
      codex_skills: codexInventory.skills.total,
      claude_skills: Array.isArray(claudeSkills) ? claudeSkills.length : 0,
    },
  };
};

// ============ HOOK EXECUTION ENGINE & RUNNER ============
const runHookAsync = async (hook: any, triggerType: string) => {
  const isEnabled = hook.active ?? hook.enabled ?? true;
  if (!isEnabled) return;

  const historyEntry: any = {
    id: genId(),
    hook_id: hook.id,
    hook_name: hook.name,
    triggered_at: new Date().toISOString(),
    trigger: triggerType,
    status: 'running'
  };

  // Save initial running entry to history
  let history = await readJson(HOOK_HISTORY_FILE, []);
  history.push(historyEntry);
  await writeJson(HOOK_HISTORY_FILE, history.slice(-200));
  broadcast({ type: 'hook-history-update', hook_id: hook.id });

  try {
    let finalCommand = hook.action;
    
    // If agent is selected, build an agent command that evaluates git diff
    if (hook.agent && hook.agent !== 'none') {
      let diff = '';
      try {
        const { stdout } = await execAsync('git diff HEAD', { cwd: ROOT_DIR, timeout: 15000 });
        diff = stdout || 'No uncommitted changes detected (clean working tree).';
      } catch (gitErr: any) {
        diff = `Failed to retrieve git diff: ${gitErr.message}`;
      }

      const prompt = `Task: ${hook.action}\nCode Changes to review:\n${diff}`;
      // Wrap prompt in quotes and escape
      const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\n/g, ' ');

      if (hook.agent === 'antigravity') {
        finalCommand = `antigravity "${escapedPrompt.substring(0, 2000)}"`;
      } else if (hook.agent === 'claude') {
        finalCommand = `claude -p "${escapedPrompt.substring(0, 2000)}"`;
      } else if (hook.agent === 'codex') {
        finalCommand = `codex run "${escapedPrompt.substring(0, 2000)}"`;
      }
    }

    logActivity('hook-exec', `Hook "${hook.name}" execution started via ${triggerType}`, 'system');

    const { stdout, stderr } = await execAsync(finalCommand, { 
      cwd: ROOT_DIR, 
      timeout: 60000,
      env: { ...process.env, HOOK_NAME: hook.name, HOOK_TRIGGER: triggerType }
    });

    history = await readJson(HOOK_HISTORY_FILE, []);
    const idx = history.findIndex((h: any) => h.id === historyEntry.id);
    if (idx !== -1) {
      history[idx].status = 'success';
      history[idx].output = stdout.substring(0, 2000);
      history[idx].error = stderr ? stderr.substring(0, 500) : null;
      history[idx].completed_at = new Date().toISOString();
      await writeJson(HOOK_HISTORY_FILE, history);
    }
    
    logActivity('hook-exec', `Hook "${hook.name}" executed successfully`, 'system', { output: stdout.substring(0, 200) });
    broadcast({ type: 'hook-history-update', hook_id: hook.id });
  } catch (e: any) {
    history = await readJson(HOOK_HISTORY_FILE, []);
    const idx = history.findIndex((h: any) => h.id === historyEntry.id);
    if (idx !== -1) {
      history[idx].status = 'error';
      history[idx].error = e.message?.substring(0, 1000) || 'Unknown error during execution';
      history[idx].completed_at = new Date().toISOString();
      await writeJson(HOOK_HISTORY_FILE, history);
    }
    
    logActivity('hook-exec', `Hook "${hook.name}" failed: ${e.message?.substring(0, 150)}`, 'system');
    broadcast({ type: 'hook-history-update', hook_id: hook.id });
  }
};

const triggerHooks = async (event: string) => {
  const hooks = await readJson(HOOKS_FILE, []);
  const matching = hooks.filter((h: any) => h.trigger === event && (h.active !== false && h.enabled !== false));
  console.log(`[Hooks System] Event "${event}" triggered. Running ${matching.length} hooks.`);
  for (const hook of matching) {
    runHookAsync(hook, event).catch(err => console.error(`Error executing hook ${hook.name}:`, err));
  }
};

// Expose Trigger Endpoint
app.post('/api/hooks/trigger', async (req, res) => {
  const { event } = req.body;
  if (!event) return res.status(400).json({ error: 'Event parameter required' });
  triggerHooks(event).catch(console.error);
  res.json({ success: true, message: `Hooks triggered for event ${event}` });
});

// ============ FILE WATCHER ============
const watcher = chokidar.watch(ROOT_DIR, {
  ignored: [/(^|[\/\\])\../, '**/node_modules/**', '**/backend-node/**', '**/backend/**', '**/.next/**'],
  persistent: true,
  ignoreInitial: true
});

let fileChangeTimeout: NodeJS.Timeout | null = null;
watcher.on('change', (filePath) => {
  const rel = path.relative(ROOT_DIR, filePath);
  logActivity('workspace', `File modified: ${rel}`, 'system');
  
  if (fileChangeTimeout) clearTimeout(fileChangeTimeout);
  fileChangeTimeout = setTimeout(() => {
    triggerHooks('file.change').catch(console.error);
  }, 2000);
});

// ============ WEBSOCKET ============
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'connected', message: 'Node.js backend connected' }));
  
  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() }));
    }
  }, 30000);

  ws.on('close', () => clearInterval(heartbeat));
});

// ============ STATS & SYSTEM STATUS ============
app.get('/api/stats', async (_req, res) => {
  const agentFiles = (await fs.readdir(AGENTS_DIR).catch(() => [])).filter((f: string) => f.endsWith('.md'));
  const skills = await readJson(SKILLS_FILE, []);
  res.json({ agents: agentFiles.length, tasks: 0, skills: skills.length, health: 'healthy', uptime: process.uptime() });
});

app.get('/api/system/status', async (_req, res) => {
  const agentFiles = (await fs.readdir(AGENTS_DIR).catch(() => [])).filter((f: string) => f.endsWith('.md'));
  const skills = await readJson(SKILLS_FILE, []);
  const activities = await readJson(ACTIVITIES_FILE, []);
  
  const cpuLoad = os.loadavg()[0];
  const cpuPercent = cpuLoad > 0 ? Math.min(Math.round(cpuLoad * 100 / os.cpus().length), 100) : Math.floor(Math.random() * 8) + 5;
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsagePercent = Math.round(((totalMem - freeMem) / totalMem) * 100);
  const memoryUsedMb = Math.round((totalMem - freeMem) / (1024 * 1024));

  res.json({
    backend: 'Online',
    database: 'Online',
    websocket: 'Online',
    resources: {
      cpu_percent: cpuPercent,
      memory_percent: memUsagePercent,
      memory_used_mb: memoryUsedMb
    },
    storage: {
      agents_count: agentFiles.length,
      skills_count: skills.length,
      activity_count: activities.length
    },
    system: {
      platform: os.platform(),
      python_version: `Node.js ${process.version}`,
      os_release: os.release()
    },
    uptime: `${Math.floor(process.uptime() / 60)}m ${Math.floor(process.uptime() % 60)}s`,
    version: 'v5.0 Stable',
    timestamp: new Date().toISOString()
  });
});

// ============ AGENTS ============
const AGENTS_METADATA_FILE = path.join(DATA_DIR, 'agents.json');

// Initialize agents.json from .md files if needed
const initAgents = async () => {
  const agents = await readJson(AGENTS_METADATA_FILE, []);
  const agentFiles = (await fs.readdir(AGENTS_DIR).catch(() => [])).filter((f: string) => f.endsWith('.md'));
  
  let changed = false;
  for (const f of agentFiles) {
    const id = f.replace('.md', '');
    if (!agents.find((a: any) => a.id === id)) {
      agents.push({
        id,
        name: id.split(/[-_]/).map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
        description: 'Auto-imported from markdown',
        model: 'claude-3-5-sonnet-20241022',
        status: 'active',
        role: 'agent',
        capabilities: ['code', 'analysis'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        config: {}
      });
      changed = true;
    }
  }
  if (changed) await writeJson(AGENTS_METADATA_FILE, agents);
};
initAgents();

const installGitHooks = async () => {
  const gitHooksDir = path.join(ROOT_DIR, '.git', 'hooks');
  try {
    const gitExists = await fs.stat(path.join(ROOT_DIR, '.git')).then(() => true).catch(() => false);
    if (!gitExists) {
      console.log('ℹ Git directory not found. Skipping Git hooks installation.');
      return;
    }
    await fs.ensureDir(gitHooksDir);

    const preCommitHook = `#!/bin/sh
# Tnega Git Hook - Pre-Commit Code Review
echo "Tnega Hook: Triggering pre-commit inspection..."
curl -s -X POST http://127.0.0.1:8000/api/hooks/trigger \\
  -H "Content-Type: application/json" \\
  -d '{"event": "git.commit"}' \\
  >/dev/null 2>&1 || true
`;

    const prePushHook = `#!/bin/sh
# Tnega Git Hook - Pre-Push Verification
echo "Tnega Hook: Triggering pre-push verification..."
curl -s -X POST http://127.0.0.1:8000/api/hooks/trigger \\
  -H "Content-Type: application/json" \\
  -d '{"event": "git.push"}' \\
  >/dev/null 2>&1 || true
`;

    const preCommitPath = path.join(gitHooksDir, 'pre-commit');
    const prePushPath = path.join(gitHooksDir, 'pre-push');

    await fs.writeFile(preCommitPath, preCommitHook, { mode: 0o755 });
    await fs.writeFile(prePushPath, prePushHook, { mode: 0o755 });
    console.log('✅ Tnega Git Hooks installed successfully at .git/hooks/ (pre-commit, pre-push)');
  } catch (error) {
    console.error('❌ Failed to install git hooks:', error);
  }
};
installGitHooks();

app.get('/api/agents/summary', async (_req, res) => {
  const claudeAndAgAgents = await readJson(AGENTS_METADATA_FILE, []);
  let codexAgents: any[] = [];
  try {
    const codexHome = path.join(os.homedir(), '.codex');
    const inventory = await getCodexInventory({ codexHome, workspaceDir: ROOT_DIR });
    codexAgents = inventory.agents || [];
  } catch {}

  const allAgents = [
    ...claudeAndAgAgents,
    ...codexAgents.map((a: any) => ({
      id: a.id,
      name: a.name,
      model: 'Codex Engine',
      status: 'active'
    }))
  ];

  res.json({ 
    total: allAgents.length,
    status: {
      active: allAgents.filter((a: any) => a.status === 'active' || a.status === 'Online').length, 
      inactive: allAgents.filter((a: any) => a.status !== 'active' && a.status !== 'Online' && a.status !== 'error').length,
      error: allAgents.filter((a: any) => a.status === 'error').length
    },
    models: allAgents.reduce((acc: any, a: any) => {
      const modelName = a.model || 'Unknown';
      acc[modelName] = (acc[modelName] || 0) + 1;
      return acc;
    }, {})
  });
});

app.get('/api/agents', async (_req, res) => {
  const agents = await readJson(AGENTS_METADATA_FILE, []);
  res.json(agents.filter((a: any) => a.id !== 'antigravity'));
});

app.get('/api/agents/:id', async (req, res) => {
  const agents = await readJson(AGENTS_METADATA_FILE, []);
  const agent = agents.find((a: any) => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

app.post('/api/agents', async (req, res) => {
  const { name, prompt, model, description, capabilities, role } = req.body;
  const id = req.body.id || name.toLowerCase().replace(/\s+/g, '-');
  
  const agents = await readJson(AGENTS_METADATA_FILE, []);
  const newAgent = {
    id,
    name,
    description: description || '',
    model: model || 'claude-3-5-sonnet-20241022',
    status: 'active',
    role: role || 'agent',
    capabilities: capabilities || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    config: req.body.config || {}
  };
  
  agents.push(newAgent);
  await writeJson(AGENTS_METADATA_FILE, agents);
  
  // Also save the prompt file
  await fs.writeFile(path.join(AGENTS_DIR, `${id}.md`), prompt || `# ${name}\n\nAgent prompt.`, 'utf-8');
  
  logActivity('agent', `Agent created: ${name}`, id);
  res.json(newAgent);
});

app.put('/api/agents/:id', async (req, res) => {
  const agents = await readJson(AGENTS_METADATA_FILE, []);
  const idx = agents.findIndex((a: any) => a.id === req.params.id);
  
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  
  const updatedAgent = {
    ...agents[idx],
    ...req.body,
    id: req.params.id, // Ensure ID doesn't change
    updated_at: new Date().toISOString()
  };
  
  // Don't save prompt in json metadata
  const { system_prompt, ...metadataOnly } = updatedAgent;
  agents[idx] = metadataOnly;
  
  await writeJson(AGENTS_METADATA_FILE, agents);
  
  // Save prompt file if provided
  if (req.body.system_prompt) {
    await fs.writeFile(path.join(AGENTS_DIR, `${req.params.id}.md`), req.body.system_prompt, 'utf-8');
  }
  
  logActivity('agent', `Agent updated: ${req.params.id}`, req.params.id);
  res.json(agents[idx]);
});

app.post('/api/agents/:id/activate', async (req, res) => {
  const agents = await readJson(AGENTS_METADATA_FILE, []);
  const agent = agents.find((a: any) => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: 'Not found' });

  agent.status = 'active';
  agent.updated_at = new Date().toISOString();
  await writeJson(AGENTS_METADATA_FILE, agents);
  logActivity('agent', `Agent activated: ${req.params.id}`, req.params.id);
  res.json(agent);
});

app.post('/api/agents/:id/deactivate', async (req, res) => {
  const agents = await readJson(AGENTS_METADATA_FILE, []);
  const agent = agents.find((a: any) => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: 'Not found' });

  agent.status = 'inactive';
  agent.updated_at = new Date().toISOString();
  await writeJson(AGENTS_METADATA_FILE, agents);
  logActivity('agent', `Agent deactivated: ${req.params.id}`, req.params.id);
  res.json(agent);
});

app.delete('/api/agents/:id', async (req, res) => {
  let agents = await readJson(AGENTS_METADATA_FILE, []);
  agents = agents.filter((a: any) => a.id !== req.params.id);
  await writeJson(AGENTS_METADATA_FILE, agents);
  
  const fp = path.join(AGENTS_DIR, `${req.params.id}.md`);
  if (await fs.pathExists(fp)) await fs.remove(fp);
  
  logActivity('agent', `Agent deleted: ${req.params.id}`, req.params.id);
  res.json({ success: true });
});

app.get('/api/agents/:id/prompt', async (req, res) => {
  const fp = path.join(AGENTS_DIR, `${req.params.id}.md`);
  if (!await fs.pathExists(fp)) return res.status(404).json({ error: 'Not found' });
  res.json({ prompt: await fs.readFile(fp, 'utf-8') });
});

// ============ MODELS CRUD ============
app.get('/api/models', async (_req, res) => res.json(await readJson(MODELS_FILE, [])));
app.post('/api/models', async (req, res) => {
  const models = await readJson(MODELS_FILE, []);
  const model = { id: genId(), ...req.body, active: true };
  models.push(model);
  await writeJson(MODELS_FILE, models);
  res.json(model);
});
app.put('/api/models/:id', async (req, res) => {
  const models = await readJson(MODELS_FILE, []);
  const idx = models.findIndex((m: any) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  models[idx] = { ...models[idx], ...req.body };
  await writeJson(MODELS_FILE, models);
  res.json(models[idx]);
});
app.delete('/api/models/:id', async (req, res) => {
  let models = await readJson(MODELS_FILE, []);
  models = models.filter((m: any) => m.id !== req.params.id);
  await writeJson(MODELS_FILE, models);
  res.json({ success: true });
});
app.post('/api/models/:id/toggle', async (req, res) => {
  const models = await readJson(MODELS_FILE, []);
  const m = models.find((m: any) => m.id === req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  m.active = !m.active;
  await writeJson(MODELS_FILE, models);
  res.json(m);
});

// ============ HOOKS CRUD ============
app.get('/api/hooks', async (_req, res) => res.json(await readJson(HOOKS_FILE, [])));
app.post('/api/hooks', async (req, res) => {
  const hooks = await readJson(HOOKS_FILE, []);
  const hook = { id: genId(), ...req.body, active: true };
  hooks.push(hook);
  await writeJson(HOOKS_FILE, hooks);
  logActivity('hook', `Hook created: ${hook.name}`, 'system');
  res.json(hook);
});
app.put('/api/hooks/:id', async (req, res) => {
  const hooks = await readJson(HOOKS_FILE, []);
  const idx = hooks.findIndex((h: any) => h.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  hooks[idx] = { ...hooks[idx], ...req.body };
  await writeJson(HOOKS_FILE, hooks);
  res.json(hooks[idx]);
});
app.delete('/api/hooks/:id', async (req, res) => {
  let hooks = await readJson(HOOKS_FILE, []);
  hooks = hooks.filter((h: any) => h.id !== req.params.id);
  await writeJson(HOOKS_FILE, hooks);
  res.json({ success: true });
});
app.post('/api/hooks/:id/toggle', async (req, res) => {
  const hooks = await readJson(HOOKS_FILE, []);
  const h = hooks.find((h: any) => h.id === req.params.id);
  if (!h) return res.status(404).json({ error: 'Not found' });
  h.active = !h.active;
  await writeJson(HOOKS_FILE, hooks);
  res.json(h);
});

// ============ SKILLS CRUD ============
app.get('/api/skills', async (_req, res) => res.json((await readJson(SKILLS_FILE, [])).map(normalizeSkill)));
app.get('/api/skills/stats', async (_req, res) => {
  const skills = (await readJson(SKILLS_FILE, [])).map(normalizeSkill);
  const enabled = skills.filter((s: any) => s.enabled !== false).length;
  const categories = skills.reduce((acc: any, skill: any) => {
    const category = skill.category || 'custom';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});
  res.json({
    total: skills.length,
    enabled,
    disabled: skills.length - enabled,
    active: enabled,
    inactive: skills.length - enabled,
    categories
  });
});
app.post('/api/skills', async (req, res) => {
  const skills = await readJson(SKILLS_FILE, []);
  const skill = normalizeSkill({ id: genId(), ...req.body, enabled: true, active: true });
  skills.push(skill);
  await writeJson(SKILLS_FILE, skills);
  logActivity('skill', `Skill created: ${skill.name}`, 'system');
  res.json(skill);
});
app.put('/api/skills/:id', async (req, res) => {
  const skills = await readJson(SKILLS_FILE, []);
  const idx = skills.findIndex((s: any) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  skills[idx] = normalizeSkill({ ...skills[idx], ...req.body });
  await writeJson(SKILLS_FILE, skills);
  res.json(skills[idx]);
});
app.delete('/api/skills/:id', async (req, res) => {
  let skills = await readJson(SKILLS_FILE, []);
  skills = skills.filter((s: any) => s.id !== req.params.id);
  await writeJson(SKILLS_FILE, skills);
  res.json({ success: true });
});
app.post('/api/skills/:id/toggle', async (req, res) => {
  const skills = await readJson(SKILLS_FILE, []);
  const s = skills.find((s: any) => s.id === req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  const current = normalizeSkill(s).enabled;
  s.enabled = !current;
  s.active = !current;
  await writeJson(SKILLS_FILE, skills);
  res.json(normalizeSkill(s));
});

// ============ ACTIVITY ============
app.get('/api/activity', async (req, res) => {
  const activities = await readJson(ACTIVITIES_FILE, []);
  const limit = parseInt(req.query.limit as string) || 50;
  const antigravityActivities = getAntigravityActivities();
  const allActivities = [...activities, ...antigravityActivities]
    .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  res.json(allActivities.slice(-limit));
});
app.get('/api/activity/agent/:id', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  if (req.params.id === 'antigravity') {
    const antigravityActivities = getAntigravityActivities()
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return res.json(antigravityActivities.slice(-limit));
  }
  const activities = await readJson(ACTIVITIES_FILE, []);
  res.json(activities.filter((a: any) => a.agent_id === req.params.id).slice(-limit));
});
app.get('/api/activities/detailed', async (req, res) => {
  const activities = await readJson(ACTIVITIES_FILE, []);
  const limit = parseInt(req.query.limit as string) || 100;
  const antigravityActivities = getAntigravityActivities();
  const allActivities = [...activities, ...antigravityActivities]
    .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  res.json(allActivities.slice(-limit));
});

// ============ TASKS CRUD ============
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

app.get('/api/tasks', async (_req, res) => {
  const tasks = await readJson(TASKS_FILE, []);
  res.json(tasks);
});

app.get('/api/tasks/stats', async (_req, res) => {
  const tasks = await readJson(TASKS_FILE, []);
  const stats = {
    total: tasks.length,
    pending: tasks.filter((t: any) => t.status === 'pending').length,
    in_progress: tasks.filter((t: any) => t.status === 'in_progress').length,
    completed: tasks.filter((t: any) => t.status === 'completed').length,
    blocked: tasks.filter((t: any) => t.status === 'blocked').length,
    by_priority: {
      P0: tasks.filter((t: any) => t.priority === 'P0').length,
      P1: tasks.filter((t: any) => t.priority === 'P1').length,
      P2: tasks.filter((t: any) => t.priority === 'P2').length,
      P3: tasks.filter((t: any) => t.priority === 'P3').length,
    },
  };
  res.json(stats);
});

app.post('/api/tasks', async (req, res) => {
  const tasks = await readJson(TASKS_FILE, []);
  const task = {
    id: genId(),
    ...req.body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  tasks.push(task);
  await writeJson(TASKS_FILE, tasks);
  logActivity('task', `Task created: ${task.title}`, 'system', { task_id: task.id });
  res.json(task);
});

app.put('/api/tasks/:id', async (req, res) => {
  const tasks = await readJson(TASKS_FILE, []);
  const idx = tasks.findIndex((t: any) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  tasks[idx] = { ...tasks[idx], ...req.body, updated_at: new Date().toISOString() };
  await writeJson(TASKS_FILE, tasks);
  logActivity('task', `Task updated: ${req.params.id}`, 'system');
  res.json(tasks[idx]);
});

app.delete('/api/tasks/:id', async (req, res) => {
  let tasks = await readJson(TASKS_FILE, []);
  tasks = tasks.filter((t: any) => t.id !== req.params.id);
  await writeJson(TASKS_FILE, tasks);
  logActivity('task', `Task deleted: ${req.params.id}`, 'system');
  res.json({ success: true });
});

app.post('/api/tasks/:id/execute', async (req, res) => {
  const tasks = await readJson(TASKS_FILE, []);
  const taskIdx = tasks.findIndex((t: any) => t.id === req.params.id);
  if (taskIdx === -1) return res.status(404).json({ error: 'Not found' });
  
  const task = tasks[taskIdx];
  if (!task.command) {
    // If no command, simulate success
    task.status = 'completed';
    task.result = 'Task executed successfully (simulated)';
    task.completed_at = new Date().toISOString();
    tasks[taskIdx] = task;
    await writeJson(TASKS_FILE, tasks);
    logActivity('task', `Executed task (simulation): ${task.title}`, 'system', { task_id: task.id });
    return res.json({ success: true, task });
  }

  // Update status to in_progress
  task.status = 'in_progress';
  task.result = 'Executing command...';
  tasks[taskIdx] = task;
  await writeJson(TASKS_FILE, tasks);
  logActivity('task', `Executing shell command for: ${task.title}`, 'system', { task_id: task.id, command: task.command });
  broadcast({ 
    type: 'activity', 
    data: { 
      id: genId(), 
      agent_id: 'system', 
      type: 'request', 
      message: `Executing command for task [${task.title}]: ${task.command}`, 
      timestamp: new Date().toISOString(), 
      metadata: { task_id: task.id } 
    } 
  });

  // Execute command in background
  exec(task.command, { cwd: ROOT_DIR }, async (error, stdout, stderr) => {
    // Re-read tasks to avoid overwriting other modifications
    const latestTasks = await readJson(TASKS_FILE, []);
    const idx = latestTasks.findIndex((t: any) => t.id === task.id);
    if (idx === -1) return;

    const t = latestTasks[idx];
    t.completed_at = new Date().toISOString();
    if (error) {
      t.status = 'blocked';
      t.result = `Failed with exit code ${error.code || 1}\n\nSTDERR:\n${stderr}\n\nSTDOUT:\n${stdout}`;
      logActivity('error', `Task failed: ${t.title}. Error: ${error.message}`, 'system', { task_id: t.id });
    } else {
      t.status = 'completed';
      t.result = stdout || 'Command executed successfully with no output.';
      logActivity('task', `Task completed: ${t.title}`, 'system', { task_id: t.id });
    }

    latestTasks[idx] = t;
    await writeJson(TASKS_FILE, latestTasks);

    // Broadcast the update via WS
    broadcast({ 
      type: 'activity', 
      data: { 
        id: genId(), 
        agent_id: 'system', 
        type: t.status === 'completed' ? 'response' : 'error', 
        message: t.status === 'completed' ? `Task completed: ${t.title}` : `Task failed: ${t.title}`, 
        timestamp: new Date().toISOString(), 
        metadata: { task_id: t.id } 
      } 
    });
  });

  res.json({ success: true, message: 'Execution started in background', task });
});

// ============ ANALYTICS HELPERS ============

const getDateRange = (range: string) => {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return { startDate, endDate, days };
};

const getGitStats = async (range: string) => {
  try {
    const { startDate, endDate } = getDateRange(range);
    const since = startDate.toISOString();
    const until = endDate.toISOString();

    // Get commit count
    const { stdout: commitCount } = await execAsync(
      `git rev-list --count --since="${since}" --until="${until}" HEAD`,
      { cwd: ROOT_DIR, timeout: 10000 }
    ).catch(() => ({ stdout: '0' }));

    // Get lines changed (code velocity) using date-based refs
    const { stdout: diffStats } = await execAsync(
      `git diff --shortstat "HEAD@{${since}}".."HEAD@{${until}}"`,
      { cwd: ROOT_DIR, timeout: 10000 }
    ).catch(() => ({ stdout: '' }));

    let linesAdded = 0;
    let linesDeleted = 0;
    const match = diffStats.match(/(\d+) insertion(?:s)?(?:, (\d+) deletion(?:s)?)?/);
    if (match) {
      linesAdded = parseInt(match[1]) || 0;
      linesDeleted = parseInt(match[2]) || 0;
    }

    // Get commits by day for trends
    const { stdout: logByDay } = await execAsync(
      `git log --since="${since}" --until="${until}" --format="%ad" --date=short HEAD`,
      { cwd: ROOT_DIR, timeout: 10000 }
    ).catch(() => ({ stdout: '' }));

    const commitsByDay: Record<string, number> = {};
    logByDay.split('\n').filter(Boolean).forEach(date => {
      commitsByDay[date] = (commitsByDay[date] || 0) + 1;
    });

    return {
      commits: parseInt(commitCount) || 0,
      code_velocity: linesAdded + linesDeleted,
      commits_by_day: commitsByDay,
    };
  } catch (error) {
    console.error('Git stats error:', error);
    return { commits: 0, code_velocity: 0, commits_by_day: {} };
  }
};

const getTaskStats = async (range: string) => {
  try {
    const { startDate, endDate } = getDateRange(range);
    const tasks = await readJson(TASKS_FILE, []);

    const filteredTasks = tasks.filter((t: any) => {
      const createdAt = new Date(t.created_at);
      return createdAt >= startDate && createdAt <= endDate;
    });

    const completedTasks = filteredTasks.filter((t: any) => t.status === 'completed');
    const failedTasks = filteredTasks.filter((t: any) => t.status === 'failed');

    // Calculate average duration
    let totalDuration = 0;
    let durationCount = 0;
    completedTasks.forEach((t: any) => {
      if (t.created_at && t.updated_at) {
        const created = new Date(t.created_at).getTime();
        const updated = new Date(t.updated_at).getTime();
        const duration = (updated - created) / (1000 * 60 * 60); // hours
        if (duration > 0 && duration < 24) { // Filter out unrealistic durations
          totalDuration += duration;
          durationCount++;
        }
      }
    });

    // Tasks by day for trends
    const tasksByDay: Record<string, number> = {};
    filteredTasks.forEach((t: any) => {
      const date = new Date(t.created_at).toISOString().split('T')[0];
      tasksByDay[date] = (tasksByDay[date] || 0) + 1;
    });

    return {
      total_tasks: filteredTasks.length,
      completed_tasks: completedTasks.length,
      failed_tasks: failedTasks.length,
      average_duration: durationCount > 0 ? totalDuration / durationCount : 0,
      utilization: filteredTasks.length > 0 ? Math.round((completedTasks.length / filteredTasks.length) * 100) : 0,
      tasks_by_day: tasksByDay,
    };
  } catch (error) {
    console.error('Task stats error:', error);
    return { total_tasks: 0, completed_tasks: 0, failed_tasks: 0, average_duration: 0, utilization: 0, tasks_by_day: {} };
  }
};

const getActivityStats = async (range: string) => {
  try {
    const { startDate, endDate, days } = getDateRange(range);
    const activities = await readJson(ACTIVITIES_FILE, []);

    const filteredActivities = activities.filter((a: any) => {
      const timestamp = new Date(a.timestamp);
      return timestamp >= startDate && timestamp <= endDate;
    });

    const agentActivities = filteredActivities.filter((a: any) => a.type === 'agent');
    const errorActivities = filteredActivities.filter((a: any) => a.type === 'error');
    const workspaceActivities = filteredActivities.filter((a: any) => a.type === 'workspace');

    // Activities by day for trends
    const errorsByDay: Record<string, number> = {};
    errorActivities.forEach((a: any) => {
      const date = new Date(a.timestamp).toISOString().split('T')[0];
      errorsByDay[date] = (errorsByDay[date] || 0) + 1;
    });

    // Calculate error rate
    const errorRate = filteredActivities.length > 0 ? errorActivities.length / filteredActivities.length : 0;

    return {
      communication_count: agentActivities.length,
      error_count: errorActivities.length,
      workspace_count: workspaceActivities.length,
      total_activities: filteredActivities.length,
      error_rate: errorRate,
      errors_by_day: errorsByDay,
    };
  } catch (error) {
    console.error('Activity stats error:', error);
    return { communication_count: 0, error_count: 0, workspace_count: 0, total_activities: 0, error_rate: 0, errors_by_day: {} };
  }
};

// ============ ANALYTICS ============
app.get('/api/analytics', async (req, res) => {
  const range = typeof req.query.range === 'string' ? req.query.range : '7d';
  const { days } = getDateRange(range);

  // Get real data from all sources
  const [gitStats, taskStats, activityStats] = await Promise.all([
    getGitStats(range),
    getTaskStats(range),
    getActivityStats(range),
  ]);

  // Generate trend data
  const trends = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    trends.push({
      timestamp: date.toISOString(),
      commits: gitStats.commits_by_day[dateStr] || 0,
      tasks: taskStats.tasks_by_day[dateStr] || 0,
      errors: activityStats.errors_by_day[dateStr] || 0,
    });
  }

  // Calculate system uptime
  const uptimeHours = process.uptime() / 3600;
  const uptimePercent = uptimeHours > 24 ? 99.9 : Math.min(99.9, (uptimeHours / 24) * 100);

  res.json({
    development: {
      commits: gitStats.commits,
      pull_requests: 0, // Not available from git alone
      code_velocity: gitStats.code_velocity,
      test_coverage: 0, // Not available without test reports
      bug_count: taskStats.failed_tasks,
      deployment_frequency: 0, // Not available without deployment tracking
    },
    system: {
      cpu_usage: Math.round(os.loadavg()[0] * 10),
      memory_usage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
      uptime: uptimePercent,
      response_time: 0, // Would need request timing middleware
      error_rate: activityStats.error_rate,
    },
    agents: {
      total_tasks: taskStats.total_tasks,
      completed_tasks: taskStats.completed_tasks,
      average_duration: taskStats.average_duration,
      utilization: taskStats.utilization,
      communication_count: activityStats.communication_count,
    },
    trends,
  });
});

// ============ TERMINAL ============
app.post('/api/terminal/execute', async (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'Command is required' });

  exec(command, { timeout: 20000, cwd: ROOT_DIR }, (error, stdout, stderr) => {
    const output = stdout + stderr;
    res.json({ 
      success: !error, 
      output: output || (error ? error.message : 'Command executed with no output') 
    });
  });
});

app.get('/api/terminal/history', async (_req, res) => {
  res.json([]);
});

// ============ HEALTH ============
app.get('/api/health', (_req, res) => res.json({ status: 'ok', runtime: 'Node.js', uptime: process.uptime() }));

// ============ GENERAL AI CONTROL PLANE ============
app.get('/api/ai/overview', async (_req, res) => {
  try {
    res.json(await getAIControlPlaneOverview());
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load AI control plane' });
  }
});

app.get('/api/ai/targets', async (_req, res) => {
  try {
    const overview = await getAIControlPlaneOverview();
    res.json(overview.targets);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load AI targets' });
  }
});

app.get('/api/ai/skill-assignments', async (_req, res) => {
  res.json(await readJson(SKILL_ASSIGNMENTS_FILE, []));
});

const syncAgentCapabilities = async (assignments: any[]) => {
  try {
    const [skills, agents] = await Promise.all([
      readJson(SKILLS_FILE, []),
      readJson(AGENTS_METADATA_FILE, [])
    ]);

    // Get Codex inventory for Codex skills
    let codexSkills: any[] = [];
    try {
      const codexHome = path.join(os.homedir(), '.codex');
      const inventory = await getCodexInventory({ codexHome, workspaceDir: ROOT_DIR });
      codexSkills = inventory.skills?.items || [];
    } catch {}

    let changed = false;
    for (const agent of agents) {
      const agentTargetKeys = [`claude_agent:${agent.id}`, `antigravity_agent:${agent.id}`];
      const agentAssignments = assignments.filter((a: any) => agentTargetKeys.includes(a.target_key));
      
      const assignedSkillNames: string[] = [];
      for (const assignment of agentAssignments) {
        const skill = skills.find((s: any) => s.id === assignment.skill_id);
        if (skill) {
          assignedSkillNames.push(skill.name);
        } else {
          const codexSkill = codexSkills.find((s: any) => s.id === assignment.skill_id);
          if (codexSkill) {
            assignedSkillNames.push(codexSkill.name);
          } else {
            assignedSkillNames.push(assignment.skill_id);
          }
        }
      }
      
      const coreCaps = agent.id === 'antigravity' 
        ? ["code", "analysis", "planning", "subagents", "terminal", "browser", "image-gen"] 
        : (agent.capabilities || ["chat", "tool-call"]);
      
      const allRegisteredSkillNames = [
        ...skills.map((s: any) => s.name),
        ...codexSkills.map((s: any) => s.name)
      ];
      
      const cleanCoreCaps = coreCaps.filter((cap: string) => !allRegisteredSkillNames.includes(cap));
      const nextCaps = [...new Set([...cleanCoreCaps, ...assignedSkillNames])];
      
      if (JSON.stringify(agent.capabilities) !== JSON.stringify(nextCaps)) {
        agent.capabilities = nextCaps;
        changed = true;
      }
    }
    
    if (changed) {
      await writeJson(AGENTS_METADATA_FILE, agents);
      console.log('[Capabilities Sync] Successfully updated agents.json capabilities.');
    }
  } catch (error) {
    console.error('[Capabilities Sync] Error syncing capabilities:', error);
  }
};

app.put('/api/ai/skills/:skillKey/assignments', async (req, res) => {
  try {
    const targetKeys = Array.isArray(req.body?.target_keys) ? req.body.target_keys : [];
    const existing = await readJson(SKILL_ASSIGNMENTS_FILE, []);
    const nextAssignments = replaceSkillAssignments(
      Array.isArray(existing) ? existing : [],
      { skill_key: req.params.skillKey, target_keys: targetKeys },
      new Date().toISOString()
    );

    await writeJson(SKILL_ASSIGNMENTS_FILE, nextAssignments);
    await syncAgentCapabilities(nextAssignments);
    await logActivity('skill-assignment', `Updated assignments for ${req.params.skillKey}`, 'system', { target_keys: targetKeys });
    res.json({
      success: true,
      assignments: nextAssignments.filter((assignment) => assignment.skill_key === req.params.skillKey),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update skill assignments' });
  }
});

// ============ CODEX OBSERVABILITY ============
app.get('/api/codex/overview', async (_req, res) => {
  try {
    const codexHome = path.join(os.homedir(), '.codex');
    const inventory = await getCodexInventory({ codexHome, workspaceDir: ROOT_DIR });
    res.json(inventory);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to inspect Codex runtime' });
  }
});

// ============ ANTIGRAVITY OBSERVABILITY ============
app.get('/api/antigravity/overview', async (_req, res) => {
  try {
    const geminiHome = path.join(os.homedir(), '.gemini', 'antigravity');
    const files = ['mcp_config.json', 'antigravity_state.pbtxt', 'user_settings.pb', 'agents/antigravity.md'];
    
    const fileSummaries = await Promise.all(
      files.map(async (name) => {
        const fp = path.join(geminiHome, name);
        const exists = await fs.pathExists(fp);
        let size = 0;
        let updatedAt = null;
        if (exists) {
          const stats = await fs.stat(fp);
          size = stats.size;
          updatedAt = stats.mtime.toISOString();
        }
        return { name, exists, size, updated_at: updatedAt };
      })
    );

    res.json({
      antigravity_home: geminiHome,
      workspace_dir: ROOT_DIR,
      files: fileSummaries
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to inspect Antigravity runtime' });
  }
});

// ============ CLI SESSION READER ============
const getClaudeSessionsDir = () => {
  const home = os.homedir();
  const claudeDir = path.join(home, '.claude', 'projects');
  
  // Normalize the path for matching
  const absoluteRoot = path.resolve(ROOT_DIR);
  const safeName = absoluteRoot.replace(/\\/g, '-').replace(/\//g, '-').replace(/:/g, '-');
  
  console.log(`[Sessions] Looking for: ${safeName} in ${claudeDir}`);
  
  const projectDir = path.join(claudeDir, safeName);
  if (fs.existsSync(projectDir)) {
    console.log(`[Sessions] Found direct match: ${projectDir}`);
    return projectDir;
  }
  
  // Fallback: search for something containing "claudeDash"
  if (fs.existsSync(claudeDir)) {
    const dirs = fs.readdirSync(claudeDir);
    const found = dirs.find((d: string) => d.toLowerCase().includes('claudedash'));
    if (found) {
      const foundPath = path.join(claudeDir, found);
      console.log(`[Sessions] Found via fallback: ${foundPath}`);
      return foundPath;
    }
  }
  console.warn(`[Sessions] No directory found for ${absoluteRoot}`);
  return null;
};

const getAntigravitySessionsDir = () => {
  const home = os.homedir();
  return path.join(home, '.gemini', 'antigravity', 'brain');
};

const getAntigravityActivities = (): any[] => {
  const dir = getAntigravitySessionsDir();
  if (!fs.existsSync(dir)) return [];

  const antigravityActivities: any[] = [];
  try {
    const subdirs = fs.readdirSync(dir);
    for (const d of subdirs) {
      const transcriptPath = path.join(dir, d, '.system_generated', 'logs', 'transcript.jsonl');
      if (fs.existsSync(transcriptPath)) {
        try {
          const content = fs.readFileSync(transcriptPath, 'utf-8');
          const lines = content.split('\n').filter(l => l.trim());
          let lineIndex = 0;
          for (const line of lines) {
            lineIndex++;
            try {
              const entry = JSON.parse(line);
              if (entry.type === 'USER_INPUT') {
                const reqText = entry.content?.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/)?.[1] || entry.content;
                if (reqText) {
                  antigravityActivities.push({
                    id: `antigravity-act-in-${d}-${lineIndex}`,
                    agent_id: 'antigravity',
                    type: 'request',
                    message: (typeof reqText === 'string' ? reqText.trim() : 'User Request').substring(0, 150),
                    timestamp: entry.created_at || new Date().toISOString(),
                    metadata: { session_id: d }
                  });
                }
              } else if (entry.type === 'PLANNER_RESPONSE') {
                const resText = typeof entry.content === 'string' ? entry.content : '';
                if (resText) {
                  antigravityActivities.push({
                    id: `antigravity-act-out-${d}-${lineIndex}`,
                    agent_id: 'antigravity',
                    type: 'response',
                    message: resText.trim().substring(0, 150),
                    timestamp: entry.created_at || new Date().toISOString(),
                    metadata: { session_id: d }
                  });
                }
              }
            } catch {}
          }
        } catch (e) {
          console.error(`Error extracting activity from Antigravity session ${d}:`, e);
        }
      }
    }
  } catch (e) {
    console.error('Error reading Antigravity activities:', e);
  }
  return antigravityActivities;
};

const getAntigravitySessions = () => {
  const dir = getAntigravitySessionsDir();
  if (!fs.existsSync(dir)) {
    console.log(`[Antigravity Sessions] Directory not found: ${dir}`);
    return [];
  }

  const sessions: any[] = [];
  try {
    const subdirs = fs.readdirSync(dir);
    for (const d of subdirs) {
      const transcriptPath = path.join(dir, d, '.system_generated', 'logs', 'transcript.jsonl');
      if (fs.existsSync(transcriptPath)) {
        const stat = fs.statSync(transcriptPath);
        let title = 'Antigravity Session';
        let msgCount = 0;
        let firstTs: string | null = null;

        try {
          const content = fs.readFileSync(transcriptPath, 'utf-8');
          const lines = content.split('\n').filter(l => l.trim());
          for (const line of lines) {
            try {
              const entry = JSON.parse(line);
              if (entry.type === 'USER_INPUT') {
                msgCount++;
                if (title === 'Antigravity Session') {
                  const reqText = entry.content?.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/)?.[1] || entry.content;
                  if (reqText && typeof reqText === 'string') {
                    title = reqText.trim().substring(0, 80);
                  }
                }
                if (!firstTs && entry.created_at) firstTs = entry.created_at;
              } else if (entry.type === 'PLANNER_RESPONSE') {
                msgCount++;
              }
            } catch {}
          }
        } catch (e) {
          console.error(`Error parsing Antigravity session ${d}:`, e);
        }

        sessions.push({
          id: `antigravity-${d}`,
          title: `[Antigravity] ${title}`,
          timestamp: firstTs || stat.mtime.toISOString(),
          message_count: msgCount,
          file_size: stat.size
        });
      }
    }
  } catch (e) {
    console.error('Error reading Antigravity sessions:', e);
  }
  return sessions;
};

app.get('/api/cli/sessions', async (_req, res) => {
  const dir = getClaudeSessionsDir();
  let sessions: any[] = [];
  if (dir && fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter((f: string) => f.endsWith('.jsonl'));
    sessions = files.map((f: string) => {
      const fp = path.join(dir, f);
      const stat = fs.statSync(fp);
      let title = 'CLI Session';
      let msgCount = 0;
      let firstTs: string | null = null;

      try {
        const content = fs.readFileSync(fp, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            const type = entry.type;
            
            if (type === 'user' || type === 'assistant') {
              msgCount++;
              if (type === 'user' && title === 'CLI Session') {
                const rawContent = entry.message?.content;
                if (typeof rawContent === 'string') {
                  title = rawContent.substring(0, 80);
                } else if (Array.isArray(rawContent)) {
                  title = rawContent.find(b => b.type === 'text')?.text?.substring(0, 80) || title;
                }
                if (!firstTs) firstTs = entry.timestamp;
              }
            }
          } catch {}
        }
      } catch (e) { console.error(`Error parsing ${f}:`, e); }

      return { 
        id: f.replace('.jsonl', ''), 
        title, 
        timestamp: firstTs || stat.mtime.toISOString(), 
        message_count: msgCount, 
        file_size: stat.size 
      };
    });
  }

  // Fetch Antigravity sessions and merge them
  const antigravitySessions = getAntigravitySessions();
  const allSessions = [...sessions, ...antigravitySessions].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json(allSessions);
});

app.get('/api/cli/sessions/:id', async (req, res) => {
  if (req.params.id.startsWith('antigravity-')) {
    const realId = req.params.id.replace('antigravity-', '');
    const dir = getAntigravitySessionsDir();
    const fp = path.join(dir, realId, '.system_generated', 'logs', 'transcript.jsonl');
    if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Session not found' });

    const messages: any[] = [];
    try {
      const content = fs.readFileSync(fp, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.type === 'USER_INPUT') {
            const reqText = entry.content?.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/)?.[1] || entry.content;
            messages.push({
              id: `antigravity-msg-${entry.step_index}-${messages.length}`,
              role: 'user',
              type: 'user',
              content: reqText || '[Empty Message]',
              timestamp: entry.created_at
            });
          } else if (entry.type === 'PLANNER_RESPONSE') {
            const text = entry.content || '';
            const tools = Array.isArray(entry.tool_calls) 
              ? entry.tool_calls.map((t: any) => t.name)
              : [];
            
            messages.push({
              id: `antigravity-msg-${entry.step_index}-${messages.length}`,
              role: 'assistant',
              type: 'assistant',
              content: text || (tools.length > 0 ? `[Tool Use: ${tools.join(', ')}]` : '[Processing...]'),
              timestamp: entry.created_at,
              tools: tools,
              model: 'gemini-3.5-flash'
            });
          }
        } catch {}
      }
    } catch (err) {
      return res.status(500).json({ error: 'Failed to read session file' });
    }
    return res.json(messages);
  }

  const dir = getClaudeSessionsDir();
  if (!dir) return res.status(404).json({ error: 'Not found' });
  const fp = path.join(dir, `${req.params.id}.jsonl`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Session not found' });

  const messages: any[] = [];
  try {
    const content = fs.readFileSync(fp, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'user') {
          const rawContent = entry.message?.content;
          let text = '';
          if (typeof rawContent === 'string') {
            text = rawContent;
          } else if (Array.isArray(rawContent)) {
            // Join all text blocks
            text = rawContent
              .filter(b => b.type === 'text')
              .map(b => b.text)
              .join('\n');
            
            // If no text, check for images or other blocks
            if (!text && rawContent.length > 0) {
              const types = rawContent.map(b => b.type).join(', ');
              text = `[Content: ${types}]`;
            }
          }
          
          messages.push({
            id: entry.uuid || genId(),
            role: 'user',
            type: 'user',
            content: text || '[Empty Message]',
            timestamp: entry.timestamp
          });
        } else if (entry.type === 'assistant') {
          const blocks = entry.message?.content || [];
          const text = Array.isArray(blocks) 
            ? blocks.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
            : (typeof blocks === 'string' ? blocks : '');
          
          const tools = Array.isArray(blocks) 
            ? blocks.filter((b: any) => b.type === 'tool_use').map((b: any) => b.name)
            : [];
          
          if (text || tools.length > 0 || Array.isArray(blocks)) {
            messages.push({
              id: entry.uuid || genId(),
              role: 'assistant',
              type: 'assistant',
              content: text || (tools.length > 0 ? `[Tool Use: ${tools.join(', ')}]` : '[Processing...]'),
              timestamp: entry.timestamp,
              tools: tools,
              model: entry.message?.model || 'claude-3'
            });
          }
        }
      } catch (e) {}
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read session file' });
  }

  const limit = parseInt(req.query.limit as string) || 200;
  res.json(messages);
});

// ============ CLAUDE.MD MANAGEMENT ============
const CLAUDE_MD = path.join(ROOT_DIR, 'CLAUDE.md');
const PROVIDERS_FILE = path.join(CLAUDE_DIR, 'providers.json');

app.get('/api/claude-md', async (_req, res) => {
  try {
    const content = await fs.readFile(CLAUDE_MD, 'utf-8');
    res.json({ content });
  } catch { res.json({ content: '# CLAUDE.md\n\nNo file found.' }); }
});

app.put('/api/claude-md', async (req, res) => {
  const { content } = req.body;
  await fs.writeFile(CLAUDE_MD, content, 'utf-8');
  logActivity('claude-md', 'CLAUDE.md updated from Dashboard', 'system');
  res.json({ success: true });
});

// Sync all skills into CLAUDE.md
app.post('/api/skills/sync-all', async (_req, res) => {
  const skills = await readJson(SKILLS_FILE, []);
  let md = await fs.readFile(CLAUDE_MD, 'utf-8').catch(() => '# CLAUDE.md\n');
  
  // Remove old skills section if exists
  const marker = '<!-- DASHBOARD_SKILLS_START -->';
  const endMarker = '<!-- DASHBOARD_SKILLS_END -->';
  const startIdx = md.indexOf(marker);
  const endIdx = md.indexOf(endMarker);
  if (startIdx !== -1 && endIdx !== -1) {
    md = md.substring(0, startIdx) + md.substring(endIdx + endMarker.length);
  }
  
  // Build skills section
  const activeSkills = skills.filter((s: any) => s.active !== false);
  if (activeSkills.length > 0) {
    let section = `\n${marker}\n## 🛠 Active Skills (Dashboard Synced)\n\n`;
    for (const s of activeSkills) {
      section += `### ${s.name}\n- **Category:** ${s.category || 'custom'}\n- **Description:** ${s.description || 'N/A'}\n\n`;
    }
    section += `${endMarker}\n`;
    md = md.trimEnd() + '\n' + section;
  }
  
  await fs.writeFile(CLAUDE_MD, md, 'utf-8');
  logActivity('skill-sync', `Synced ${activeSkills.length} skills to CLAUDE.md`, 'system');
  res.json({ success: true, synced: activeSkills.length });
});

// ============ AI PROVIDERS CRUD ============
app.get('/api/providers', async (_req, res) => res.json(await readJson(PROVIDERS_FILE, [])));

app.post('/api/providers', async (req, res) => {
  const providers = await readJson(PROVIDERS_FILE, []);
  const provider = { id: genId(), ...req.body, active: true, created_at: new Date().toISOString() };
  providers.push(provider);
  await writeJson(PROVIDERS_FILE, providers);
  logActivity('provider', `Provider added: ${provider.name}`, 'system');
  res.json(provider);
});

app.put('/api/providers/:id', async (req, res) => {
  const providers = await readJson(PROVIDERS_FILE, []);
  const idx = providers.findIndex((p: any) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  providers[idx] = { ...providers[idx], ...req.body, updated_at: new Date().toISOString() };
  await writeJson(PROVIDERS_FILE, providers);
  res.json(providers[idx]);
});

app.delete('/api/providers/:id', async (req, res) => {
  let providers = await readJson(PROVIDERS_FILE, []);
  providers = providers.filter((p: any) => p.id !== req.params.id);
  await writeJson(PROVIDERS_FILE, providers);
  res.json({ success: true });
});

app.post('/api/providers/:id/test', async (req, res) => {
  const providers = await readJson(PROVIDERS_FILE, []);
  const provider = providers.find((p: any) => p.id === req.params.id);
  if (!provider) return res.status(404).json({ error: 'Not found' });
  
  try {
    const testUrl = provider.type === 'ollama' 
      ? `${provider.base_url || 'http://localhost:11434'}/api/tags`
      : `${provider.base_url || 'https://api.anthropic.com'}/v1/models`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(testUrl, {
      signal: controller.signal,
      headers: provider.api_key ? { 'Authorization': `Bearer ${provider.api_key}` } : {}
    }).catch(() => null);
    clearTimeout(timeout);
    
    const connected = response !== null && response.status < 500;
    res.json({ connected, status: response?.status || 0, message: connected ? 'Connection successful' : 'Connection failed' });
  } catch (e: any) {
    res.json({ connected: false, status: 0, message: e.message || 'Connection failed' });
  }
});

app.get('/api/providers/:id/models', async (req, res) => {
  const providers = await readJson(PROVIDERS_FILE, []);
  const provider = providers.find((p: any) => p.id === req.params.id);
  if (!provider) return res.status(404).json({ error: 'Not found' });
  res.json(provider.models || []);
});

// ============ HOOK EXECUTION ENGINE ============

app.post('/api/hooks/:id/execute', async (req, res) => {
  const hooks = await readJson(HOOKS_FILE, []);
  const hook = hooks.find((h: any) => h.id === req.params.id);
  if (!hook) return res.status(404).json({ error: 'Hook not found' });
  
  const historyEntry: any = {
    id: genId(),
    hook_id: hook.id,
    hook_name: hook.name,
    triggered_at: new Date().toISOString(),
    trigger: 'manual',
    status: 'running'
  };
  
  let history = await readJson(HOOK_HISTORY_FILE, []);
  history.push(historyEntry);
  await writeJson(HOOK_HISTORY_FILE, history.slice(-200));
  broadcast({ type: 'hook-history-update', hook_id: hook.id });

  try {
    let finalCommand = hook.action;
    if (hook.agent && hook.agent !== 'none') {
      let diff = '';
      try {
        const { stdout } = await execAsync('git diff HEAD', { cwd: ROOT_DIR, timeout: 15000 });
        diff = stdout || 'No uncommitted changes detected (clean working tree).';
      } catch (gitErr: any) {
        diff = `Failed to retrieve git diff: ${gitErr.message}`;
      }
      const prompt = `Task: ${hook.action}\nCode Changes to review:\n${diff}`;
      const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\n/g, ' ');

      if (hook.agent === 'antigravity') {
        finalCommand = `antigravity "${escapedPrompt.substring(0, 2000)}"`;
      } else if (hook.agent === 'claude') {
        finalCommand = `claude -p "${escapedPrompt.substring(0, 2000)}"`;
      } else if (hook.agent === 'codex') {
        finalCommand = `codex run "${escapedPrompt.substring(0, 2000)}"`;
      }
    }

    logActivity('hook-exec', `Hook "${hook.name}" manual run started`, 'system');

    const { stdout, stderr } = await execAsync(finalCommand, { 
      cwd: ROOT_DIR, 
      timeout: 60000,
      env: { ...process.env, HOOK_NAME: hook.name, HOOK_TRIGGER: 'manual' }
    });

    historyEntry.status = 'success';
    historyEntry.output = stdout.substring(0, 2000);
    historyEntry.error = stderr ? stderr.substring(0, 500) : null;
    historyEntry.completed_at = new Date().toISOString();

    logActivity('hook-exec', `Hook "${hook.name}" executed successfully (manual)`, 'system', { output: stdout.substring(0, 200) });
  } catch (e: any) {
    historyEntry.status = 'error';
    historyEntry.error = e.message?.substring(0, 1000) || 'Unknown error';
    historyEntry.completed_at = new Date().toISOString();

    logActivity('hook-exec', `Hook "${hook.name}" failed: ${e.message?.substring(0, 100)}`, 'system');
  }

  // Update history
  history = await readJson(HOOK_HISTORY_FILE, []);
  const entryIdx = history.findIndex((h: any) => h.id === historyEntry.id);
  if (entryIdx !== -1) {
    history[entryIdx] = historyEntry;
  } else {
    history.push(historyEntry);
  }
  await writeJson(HOOK_HISTORY_FILE, history.slice(-200));
  broadcast({ type: 'hook-history-update', hook_id: hook.id });
  
  res.json(historyEntry);
});

app.get('/api/hooks/:id/history', async (req, res) => {
  const history = await readJson(HOOK_HISTORY_FILE, []);
  const hookHistory = history.filter((h: any) => h.hook_id === req.params.id);
  res.json(hookHistory.slice(-20));
});

app.get('/api/hooks/history', async (_req, res) => {
  const history = await readJson(HOOK_HISTORY_FILE, []);
  res.json(history.slice(-50));
});

// ============ START ============
server.listen(PORT, () => {
  console.log(`🚀 Node.js Backend running on http://localhost:${PORT}`);
  console.log(`📁 Workspace: ${ROOT_DIR}`);
  console.log(`🌐 Providers: ${PROVIDERS_FILE}`);
});
