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

import 'dotenv/config';

// ESM path helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// ============ PATHS ============
const ROOT_DIR = path.resolve(__dirname, process.env.WORKSPACE_DIR || '..');
const CLAUDE_DIR = path.join(ROOT_DIR, process.env.STORAGE_DIR || '.claude');
const AGENTS_DIR = path.join(CLAUDE_DIR, 'agents');
const DATA_DIR = path.join(CLAUDE_DIR, 'data');
const MODELS_FILE = path.join(CLAUDE_DIR, 'models.json');
const HOOKS_FILE = path.join(CLAUDE_DIR, 'hooks.json');
const SKILLS_FILE = path.join(CLAUDE_DIR, 'skills.json');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activities.json');

// Ensure directories exist
[AGENTS_DIR, DATA_DIR].forEach(dir => fs.ensureDirSync(dir));

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

// ============ FILE WATCHER ============
const watcher = chokidar.watch(ROOT_DIR, {
  ignored: [/(^|[\/\\])\../, '**/node_modules/**', '**/backend-node/**', '**/backend/**', '**/.next/**'],
  persistent: true,
  ignoreInitial: true
});

watcher.on('change', (filePath) => {
  const rel = path.relative(ROOT_DIR, filePath);
  logActivity('workspace', `File modified: ${rel}`, 'system');
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
  
  // Basic resource simulation (or use 'os-utils' for real ones)
  const cpuLoad = os.loadavg()[0];
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsagePercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

  res.json({
    resources: {
      cpu_percent: Math.round(cpuLoad * 10), // Simulated percent
      memory_percent: memUsagePercent
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
    timestamp: new Date().toISOString()
  });
});

// ============ AGENTS ============
app.get('/api/agents/summary', async (_req, res) => {
  const agentFiles = (await fs.readdir(AGENTS_DIR).catch(() => [])).filter((f: string) => f.endsWith('.md'));
  res.json({ 
    total: agentFiles.length,
    status: {
      active: agentFiles.length, 
      inactive: 0,
      error: 0
    },
    models: {
      "claude-opus-4-7": agentFiles.length
    }
  });
});

app.get('/api/agents', async (_req, res) => {
  const agentFiles = (await fs.readdir(AGENTS_DIR).catch(() => [])).filter((f: string) => f.endsWith('.md'));
  const agents = agentFiles.map((f: string) => ({
    id: f.replace('.md', ''),
    name: f.replace('.md', '').split(/[-_]/).map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
    role: 'agent',
    status: 'active',
    model: 'claude-opus-4-7',
    capabilities: ['code', 'analysis', 'architecture']
  }));
  res.json(agents);
});

app.get('/api/agents/:id', async (req, res) => {
  const fp = path.join(AGENTS_DIR, `${req.params.id}.md`);
  if (!await fs.pathExists(fp)) return res.status(404).json({ error: 'Agent not found' });
  res.json({ id: req.params.id, name: req.params.id, status: 'active', role: 'agent' });
});

app.post('/api/agents', async (req, res) => {
  const { name, prompt } = req.body;
  const id = name.toLowerCase().replace(/\s+/g, '-');
  await fs.writeFile(path.join(AGENTS_DIR, `${id}.md`), prompt || `# ${name}\n\nAgent prompt.`, 'utf-8');
  logActivity('agent', `Agent created: ${name}`, id);
  res.json({ id, name, status: 'active', role: 'agent' });
});

app.put('/api/agents/:id', async (req, res) => {
  const fp = path.join(AGENTS_DIR, `${req.params.id}.md`);
  if (req.body.prompt) await fs.writeFile(fp, req.body.prompt, 'utf-8');
  logActivity('agent', `Agent updated: ${req.params.id}`, req.params.id);
  res.json({ id: req.params.id, ...req.body, status: 'active' });
});

app.delete('/api/agents/:id', async (req, res) => {
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
app.get('/api/skills', async (_req, res) => res.json(await readJson(SKILLS_FILE, [])));
app.get('/api/skills/stats', async (_req, res) => {
  const skills = await readJson(SKILLS_FILE, []);
  const active = skills.filter((s: any) => s.active !== false).length;
  res.json({ total: skills.length, active, inactive: skills.length - active });
});
app.post('/api/skills', async (req, res) => {
  const skills = await readJson(SKILLS_FILE, []);
  const skill = { id: genId(), ...req.body, active: true };
  skills.push(skill);
  await writeJson(SKILLS_FILE, skills);
  logActivity('skill', `Skill created: ${skill.name}`, 'system');
  res.json(skill);
});
app.put('/api/skills/:id', async (req, res) => {
  const skills = await readJson(SKILLS_FILE, []);
  const idx = skills.findIndex((s: any) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  skills[idx] = { ...skills[idx], ...req.body };
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
  s.active = !s.active;
  await writeJson(SKILLS_FILE, skills);
  res.json(s);
});

// ============ ACTIVITY ============
app.get('/api/activity', async (req, res) => {
  const activities = await readJson(ACTIVITIES_FILE, []);
  const limit = parseInt(req.query.limit as string) || 50;
  res.json(activities.slice(-limit));
});
app.get('/api/activity/agent/:id', async (req, res) => {
  const activities = await readJson(ACTIVITIES_FILE, []);
  const limit = parseInt(req.query.limit as string) || 50;
  res.json(activities.filter((a: any) => a.agent_id === req.params.id).slice(-limit));
});
app.get('/api/activities/detailed', async (req, res) => {
  const activities = await readJson(ACTIVITIES_FILE, []);
  const limit = parseInt(req.query.limit as string) || 100;
  res.json(activities.slice(-limit));
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
  const task = tasks.find((t: any) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Not found' });
  // Simulate task execution
  res.json({ success: true, result: 'Task executed successfully' });
});

// ============ ANALYTICS ============
app.get('/api/analytics', async (req, res) => {
  const range = req.query.range || '7d';
  const tasks = await readJson(TASKS_FILE, []);
  const activities = await readJson(ACTIVITIES_FILE, []);

  // Generate trend data
  const trends = [];
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayActivities = activities.filter((a: any) =>
      new Date(a.timestamp).toDateString() === date.toDateString()
    );
    trends.push({
      timestamp: date.toISOString(),
      commits: Math.floor(Math.random() * 10) + 2,
      tasks: tasks.filter((t: any) =>
        new Date(t.created_at).toDateString() === date.toDateString()
      ).length,
      errors: dayActivities.filter((a: any) => a.type === 'error').length,
    });
  }

  res.json({
    development: {
      commits: 47,
      pull_requests: 12,
      code_velocity: 2340,
      test_coverage: 87,
      bug_count: 3,
      deployment_frequency: 5,
    },
    system: {
      cpu_usage: Math.round(os.loadavg()[0] * 10),
      memory_usage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
      uptime: 99.9,
      response_time: 145,
      error_rate: 0.02,
    },
    agents: {
      total_tasks: tasks.length,
      completed_tasks: tasks.filter((t: any) => t.status === 'completed').length,
      average_duration: 2.3,
      utilization: 78,
      communication_count: activities.filter((a: any) => a.type === 'agent').length,
    },
    trends,
  });
});

// ============ TERMINAL ============
app.post('/api/terminal/execute', async (req, res) => {
  const { command } = req.body;
  // Simulate command execution
  const output = `Executed: ${command}`;
  res.json({ success: true, output });
});

app.get('/api/terminal/history', async (_req, res) => {
  res.json([]);
});

// ============ HEALTH ============
app.get('/api/health', (_req, res) => res.json({ status: 'ok', runtime: 'Node.js', uptime: process.uptime() }));

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

app.get('/api/cli/sessions', async (_req, res) => {
  const dir = getClaudeSessionsDir();
  if (!dir) return res.json([]);
  const files = fs.readdirSync(dir).filter((f: string) => f.endsWith('.jsonl'));
  const sessions = files.map((f: string) => {
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
  }).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json(sessions);
});

app.get('/api/cli/sessions/:id', async (req, res) => {
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
          if (typeof rawContent === 'string') text = rawContent;
          else if (Array.isArray(rawContent)) text = rawContent.find(b => b.type === 'text')?.text || '';
          
          messages.push({
            id: entry.uuid || genId(),
            role: 'user',
            type: 'user',
            content: text || '[Complex Message]',
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
          
          if (text || tools.length > 0) {
            messages.push({
              id: entry.uuid || genId(),
              role: 'assistant',
              type: 'assistant',
              content: text || `[Tool Use: ${tools.join(', ')}]`,
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
const HOOK_HISTORY_FILE = path.join(DATA_DIR, 'hook_history.json');

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
const execAsync = promisify(exec);

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
  
  try {
    const { stdout, stderr } = await execAsync(hook.action, { 
      cwd: ROOT_DIR, 
      timeout: 30000,
      env: { ...process.env, HOOK_NAME: hook.name, HOOK_TRIGGER: hook.trigger }
    });
    historyEntry.status = 'success';
    historyEntry.output = stdout.substring(0, 2000);
    historyEntry.error = stderr ? stderr.substring(0, 500) : null;
    historyEntry.completed_at = new Date().toISOString();
    
    logActivity('hook-exec', `Hook "${hook.name}" executed successfully`, 'system', { output: stdout.substring(0, 200) });
  } catch (e: any) {
    historyEntry.status = 'error';
    historyEntry.error = e.message?.substring(0, 500) || 'Unknown error';
    historyEntry.completed_at = new Date().toISOString();
    
    logActivity('hook-exec', `Hook "${hook.name}" failed: ${e.message?.substring(0, 100)}`, 'system');
  }
  
  // Save to history
  const history = await readJson(HOOK_HISTORY_FILE, []);
  history.push(historyEntry);
  await writeJson(HOOK_HISTORY_FILE, history.slice(-200));
  
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
