import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import chokidar from 'chokidar';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

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

// ============ START ============
server.listen(PORT, () => {
  console.log(`🚀 Node.js Backend running on http://localhost:${PORT}`);
});
