'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  Check,
  CircleDot,
  Code2,
  Copy,
  Database,
  Edit3,
  FileCode2,
  FolderOpen,
  GitBranch,
  Info,
  Layers3,
  Link2,
  LoaderCircle,
  Network,
  PackagePlus,
  Plus,
  RadioTower,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  SquareTerminal,
  Trash2,
  TriangleAlert,
  Wrench,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  RuntimeAgentDefinition,
  RuntimeAgentInput,
  RuntimeId,
  RuntimeOverview,
  RuntimeScope,
  RuntimeSkillDefinition,
  RuntimeSkillInput,
  RuntimeThread,
  WritableRuntimeScope,
} from '@/types';

type PanelView = 'runs' | 'agents' | 'skills' | 'paths';

interface RuntimeControlPanelProps {
  runtime: RuntimeId;
  initialView?: PanelView;
  liveConnected?: boolean;
  liveRevision?: number;
  onOverviewChange?: (overview: RuntimeOverview) => void;
}

interface RuntimeTheme {
  label: string;
  shortLabel: string;
  accentText: string;
  accentBorder: string;
  accentBackground: string;
  icon: typeof Code2;
}

const RUNTIME_THEMES: Record<RuntimeId, RuntimeTheme> = {
  codex: {
    label: 'Codex',
    shortLabel: '.codex',
    accentText: 'text-sky-300',
    accentBorder: 'border-sky-400/30',
    accentBackground: 'bg-sky-400/10',
    icon: Code2,
  },
  claude: {
    label: 'Claude Code',
    shortLabel: '.claude',
    accentText: 'text-amber-300',
    accentBorder: 'border-amber-400/30',
    accentBackground: 'bg-amber-400/10',
    icon: Bot,
  },
  antigravity: {
    label: 'Gemini Antigravity',
    shortLabel: '.gemini / .agents',
    accentText: 'text-emerald-300',
    accentBorder: 'border-emerald-400/30',
    accentBackground: 'bg-emerald-400/10',
    icon: Network,
  },
};

const STATUS_STYLES: Record<string, string> = {
  running: 'text-emerald-300 border-emerald-400/25 bg-emerald-400/10',
  completed: 'text-sky-300 border-sky-400/25 bg-sky-400/10',
  failed: 'text-rose-300 border-rose-400/25 bg-rose-400/10',
  archived: 'text-zinc-400 border-zinc-600 bg-zinc-800/70',
  idle: 'text-amber-300 border-amber-400/25 bg-amber-400/10',
  unknown: 'text-zinc-400 border-zinc-600 bg-zinc-800/70',
};

const SCOPE_STYLES: Record<RuntimeScope, string> = {
  project: 'text-sky-300 border-sky-400/25 bg-sky-400/10',
  global: 'text-emerald-300 border-emerald-400/25 bg-emerald-400/10',
  builtin: 'text-zinc-300 border-zinc-600 bg-zinc-800',
  system: 'text-violet-300 border-violet-400/25 bg-violet-400/10',
  plugin: 'text-amber-300 border-amber-400/25 bg-amber-400/10',
  legacy: 'text-rose-300 border-rose-400/25 bg-rose-400/10',
};

const VIEWS: Array<{ id: PanelView; label: string; icon: typeof Activity }> = [
  { id: 'runs', label: 'Live Runs', icon: Activity },
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'skills', label: 'Skills', icon: Wrench },
  { id: 'paths', label: 'Paths', icon: FolderOpen },
];

const formatDate = (value: string | null) => {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleString();
};

const truncateId = (value: string) => value.length > 22 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value;

const copyText = async (value: string) => {
  await navigator.clipboard.writeText(value);
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`runtime-badge ${STATUS_STYLES[status] || STATUS_STYLES.unknown}`}>
      <CircleDot className="h-3 w-3" />
      {status}
    </span>
  );
}

function ScopeBadge({ scope }: { scope: RuntimeScope }) {
  return <span className={`runtime-badge ${SCOPE_STYLES[scope]}`}>{scope}</span>;
}

function EmptyState({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof Activity;
  title: string;
  detail: string;
}) {
  return (
    <div className="runtime-empty">
      <Icon className="h-7 w-7 text-zinc-600" />
      <div>
        <div className="text-sm font-semibold text-zinc-200">{title}</div>
        <div className="mt-1 text-xs text-zinc-500">{detail}</div>
      </div>
    </div>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="runtime-modal">
        <header className="flex items-start justify-between gap-5 border-b border-white/8 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
          </div>
          <button className="icon-button" onClick={onClose} title="Close" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function AgentEditor({
  overview,
  agent,
  saving,
  onClose,
  onSave,
}: {
  overview: RuntimeOverview;
  agent: RuntimeAgentDefinition | null;
  saving: boolean;
  onClose: () => void;
  onSave: (input: RuntimeAgentInput) => Promise<void>;
}) {
  const [scope, setScope] = useState<WritableRuntimeScope>(
    agent?.scope === 'global' ? 'global' : 'project'
  );
  const [name, setName] = useState(agent?.name || '');
  const [description, setDescription] = useState(agent?.description || '');
  const [model, setModel] = useState(agent?.model || '');
  const [instructions, setInstructions] = useState(agent?.instructions || '');
  const [tools, setTools] = useState(agent?.tools.join(', ') || '');
  const [skills, setSkills] = useState<string[]>(agent?.skills || []);

  const availableSkills = useMemo(() => {
    const unique = new Map<string, RuntimeSkillDefinition>();
    for (const skill of overview.skills) {
      if (!unique.has(skill.id) || skill.scope === 'project') unique.set(skill.id, skill);
    }
    return Array.from(unique.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [overview.skills]);

  const toggleSkill = (skillId: string) => {
    setSkills((current) => (
      current.includes(skillId)
        ? current.filter((item) => item !== skillId)
        : [...current, skillId]
    ));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSave({
      ...(agent ? {} : { id: name }),
      name,
      description,
      instructions,
      model: model || null,
      scope,
      skills,
      tools: tools.split(',').map((item) => item.trim()).filter(Boolean),
    });
  };

  return (
    <ModalShell
      title={agent ? `Edit ${agent.name}` : `New ${overview.runtime.name} agent`}
      subtitle={agent?.file_path || overview.paths.agent_roots[scope]}
      onClose={onClose}
    >
      <form onSubmit={submit} className="max-h-[78vh] overflow-y-auto px-6 py-5 custom-scrollbar">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="runtime-field">
            <span>Scope</span>
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value as WritableRuntimeScope)}
              className="select"
              disabled={Boolean(agent)}
            >
              <option value="project">Project</option>
              <option value="global">Global</option>
            </select>
          </label>
          <label className="runtime-field">
            <span>Model</span>
            <input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="input font-mono"
              placeholder={overview.runtime.id === 'antigravity' ? 'inherit' : 'runtime default'}
            />
          </label>
        </div>

        <label className="runtime-field mt-4">
          <span>Native name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="input font-mono"
            placeholder="repository-reviewer"
            required
          />
        </label>

        <label className="runtime-field mt-4">
          <span>Description</span>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="input"
            placeholder="When this agent should be used"
            required
          />
        </label>

        <label className="runtime-field mt-4">
          <span>Instructions</span>
          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            className="textarea min-h-[190px] font-mono"
            placeholder="Role, workflow, constraints, and completion criteria"
            required
          />
        </label>

        {overview.runtime.id !== 'codex' && (
          <label className="runtime-field mt-4">
            <span>Tools</span>
            <input
              value={tools}
              onChange={(event) => setTools(event.target.value)}
              className="input font-mono"
              placeholder={overview.runtime.id === 'antigravity'
                ? 'view_file, grep_search, run_command'
                : 'Read, Grep, Bash'}
            />
          </label>
        )}

        <fieldset className="mt-5">
          <legend className="runtime-label">Native skill references</legend>
          <div className="mt-2 grid max-h-44 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 custom-scrollbar">
            {availableSkills.map((skill) => (
              <label key={`${skill.scope}:${skill.file_path}`} className="runtime-checkbox-row">
                <input
                  type="checkbox"
                  checked={skills.includes(skill.id)}
                  onChange={() => toggleSkill(skill.id)}
                />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-zinc-200">{skill.name}</span>
                  <span className="block truncate text-[10px] text-zinc-500">{skill.scope}</span>
                </span>
              </label>
            ))}
            {availableSkills.length === 0 && (
              <p className="text-xs text-zinc-500">No native skills found.</p>
            )}
          </div>
        </fieldset>

        <footer className="mt-6 flex justify-end gap-2 border-t border-white/8 pt-5">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {agent ? 'Save Agent' : 'Create Agent'}
          </button>
        </footer>
      </form>
    </ModalShell>
  );
}

function SkillEditor({
  overview,
  skill,
  saving,
  onClose,
  onSave,
}: {
  overview: RuntimeOverview;
  skill: RuntimeSkillDefinition | null;
  saving: boolean;
  onClose: () => void;
  onSave: (input: RuntimeSkillInput) => Promise<void>;
}) {
  const [scope, setScope] = useState<WritableRuntimeScope>(
    skill?.scope === 'global' ? 'global' : 'project'
  );
  const [name, setName] = useState(skill?.name || '');
  const [description, setDescription] = useState(skill?.description || '');
  const [instructions, setInstructions] = useState(skill?.instructions || '');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSave({
      ...(skill ? {} : { id: name }),
      name,
      description,
      instructions,
      scope,
    });
  };

  return (
    <ModalShell
      title={skill ? `Edit ${skill.name}` : `New ${overview.runtime.name} skill`}
      subtitle={skill?.file_path || overview.paths.skill_roots[scope]}
      onClose={onClose}
    >
      <form onSubmit={submit} className="max-h-[78vh] overflow-y-auto px-6 py-5 custom-scrollbar">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="runtime-field">
            <span>Scope</span>
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value as WritableRuntimeScope)}
              className="select"
              disabled={Boolean(skill)}
            >
              <option value="project">Project</option>
              <option value="global">Global</option>
            </select>
          </label>
          <label className="runtime-field">
            <span>Native name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="input font-mono"
              placeholder="review-checklist"
              disabled={Boolean(skill)}
              required
            />
          </label>
        </div>
        <label className="runtime-field mt-4">
          <span>Description</span>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="input"
            placeholder="When this skill should be loaded"
            required
          />
        </label>
        <label className="runtime-field mt-4">
          <span>SKILL.md instructions</span>
          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            className="textarea min-h-[260px] font-mono"
            placeholder="Workflow, constraints, examples, and verification steps"
            required
          />
        </label>
        <footer className="mt-6 flex justify-end gap-2 border-t border-white/8 pt-5">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {skill ? 'Save Skill' : 'Create Skill'}
          </button>
        </footer>
      </form>
    </ModalShell>
  );
}

function AssignmentEditor({
  source,
  overviews,
  saving,
  onClose,
  onAssign,
}: {
  source: RuntimeSkillDefinition;
  overviews: RuntimeOverview[];
  saving: boolean;
  onClose: () => void;
  onAssign: (
    targetRuntime: RuntimeId,
    targetScope: WritableRuntimeScope,
    targetAgentId: string,
    targetAgentScope: RuntimeScope
  ) => Promise<void>;
}) {
  const firstRuntime = overviews.find((item) => item.runtime.id !== source.runtime)?.runtime.id || source.runtime;
  const [targetRuntime, setTargetRuntime] = useState<RuntimeId>(firstRuntime);
  const [targetScope, setTargetScope] = useState<WritableRuntimeScope>('project');
  const selectedOverview = overviews.find((item) => item.runtime.id === targetRuntime);
  const agents = selectedOverview?.agents.filter((agent) => (
    (agent.editable && agent.scope === targetScope)
    || agent.scope === 'legacy'
  )) || [];
  const [targetAgentKey, setTargetAgentKey] = useState('');
  const selectedAgentKey = agents.some(
    (agent) => `${agent.scope}:${agent.id}` === targetAgentKey
  )
    ? targetAgentKey
    : agents[0] ? `${agents[0].scope}:${agents[0].id}` : '';
  const selectedAgent = agents.find(
    (agent) => `${agent.scope}:${agent.id}` === selectedAgentKey
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedAgent) return;
    await onAssign(targetRuntime, targetScope, selectedAgent.id, selectedAgent.scope);
  };

  return (
    <ModalShell
      title={`Assign ${source.name}`}
      subtitle={`${source.runtime} / ${source.scope} / ${source.id}`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="px-6 py-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="runtime-field">
            <span>Target runtime</span>
            <select
              value={targetRuntime}
              onChange={(event) => {
                setTargetRuntime(event.target.value as RuntimeId);
                setTargetAgentKey('');
              }}
              className="select"
            >
              {overviews.map((overview) => (
                <option key={overview.runtime.id} value={overview.runtime.id}>
                  {overview.runtime.name}
                </option>
              ))}
            </select>
          </label>
          <label className="runtime-field">
            <span>Target scope</span>
            <select
              value={targetScope}
              onChange={(event) => {
                setTargetScope(event.target.value as WritableRuntimeScope);
                setTargetAgentKey('');
              }}
              className="select"
            >
              <option value="project">Project</option>
              <option value="global">Global</option>
            </select>
          </label>
        </div>
        <label className="runtime-field mt-4">
          <span>Target agent</span>
          <select
            value={selectedAgentKey}
            onChange={(event) => setTargetAgentKey(event.target.value)}
            className="select"
            disabled={agents.length === 0}
          >
            {agents.map((agent) => (
              <option
                key={`${agent.scope}:${agent.id}`}
                value={`${agent.scope}:${agent.id}`}
              >
                {agent.name}{agent.scope === 'legacy' ? ' (import legacy)' : ''}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-5 flex items-start gap-3 rounded-md border border-amber-400/20 bg-amber-400/8 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div className="text-xs leading-5 text-zinc-400">
            The complete skill package is installed in the target runtime, then the target agent&apos;s native file is updated.
            {selectedAgent?.scope === 'legacy' && (
              <span className="mt-1 block text-amber-200">
                This legacy agent will be imported into the selected {targetScope} native scope first.
              </span>
            )}
          </div>
        </div>

        {agents.length === 0 && (
          <div className="mt-4 flex items-center gap-2 text-xs text-amber-300">
            <TriangleAlert className="h-4 w-4" />
            No editable agent exists in this scope.
          </div>
        )}

        <footer className="mt-6 flex justify-end gap-2 border-t border-white/8 pt-5">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !selectedAgent}>
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Install and Assign
          </button>
        </footer>
      </form>
    </ModalShell>
  );
}

function ThreadTree({ threads }: { threads: RuntimeThread[] }) {
  const threadIds = useMemo(() => new Set(threads.map((thread) => thread.id)), [threads]);
  const childrenByParent = useMemo(() => {
    const map = new Map<string, RuntimeThread[]>();
    for (const thread of threads) {
      if (!thread.parent_id) continue;
      const children = map.get(thread.parent_id) || [];
      children.push(thread);
      map.set(thread.parent_id, children);
    }
    return map;
  }, [threads]);
  const roots = useMemo(() => (
    threads
      .filter((thread) => !thread.parent_id || !threadIds.has(thread.parent_id))
      .sort((left, right) => (right.updated_at || '').localeCompare(left.updated_at || ''))
  ), [threadIds, threads]);

  const renderThread = (thread: RuntimeThread, depth = 0): React.ReactNode => {
    const children = childrenByParent.get(thread.id) || [];
    return (
      <div key={thread.id}>
        <div className="runtime-thread-row" style={{ marginLeft: `${Math.min(depth, 4) * 22}px` }}>
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/8 bg-zinc-900 text-zinc-400">
              {thread.is_subagent ? <GitBranch className="h-4 w-4" /> : <SquareTerminal className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-semibold text-zinc-100">
                  {thread.nickname || thread.title}
                </span>
                {thread.is_subagent && <span className="runtime-badge border-white/10 bg-white/5 text-zinc-400">subagent</span>}
                {thread.inferred && <span className="runtime-badge border-white/10 bg-white/5 text-zinc-500">observed</span>}
              </div>
              {thread.nickname && thread.title !== thread.nickname && (
                <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{thread.title}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-zinc-500">
                <span className="font-mono" title={thread.id}>{truncateId(thread.id)}</span>
                {thread.model && <span>{thread.model}</span>}
                {thread.role && <span>{thread.role}</span>}
                <span>{formatDate(thread.updated_at)}</span>
                {thread.tokens_used !== null && <span>{thread.tokens_used.toLocaleString()} tokens</span>}
              </div>
            </div>
          </div>
          <StatusBadge status={thread.status} />
        </div>
        {children.map((child) => renderThread(child, depth + 1))}
      </div>
    );
  };

  return <div className="space-y-2">{roots.map((thread) => renderThread(thread))}</div>;
}

export default function RuntimeControlPanel({
  runtime,
  initialView = 'runs',
  liveConnected = false,
  liveRevision = 0,
  onOverviewChange,
}: RuntimeControlPanelProps) {
  const [overview, setOverview] = useState<RuntimeOverview | null>(null);
  const [allOverviews, setAllOverviews] = useState<RuntimeOverview[]>([]);
  const [view, setView] = useState<PanelView>(initialView);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [agentEditor, setAgentEditor] = useState<RuntimeAgentDefinition | 'new' | null>(null);
  const [skillEditor, setSkillEditor] = useState<RuntimeSkillDefinition | 'new' | null>(null);
  const [assignmentSkill, setAssignmentSkill] = useState<RuntimeSkillDefinition | null>(null);
  const [skillSearch, setSkillSearch] = useState('');
  const theme = RUNTIME_THEMES[runtime];
  const RuntimeIcon = theme.icon;

  const loadOverview = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      setError(null);
      const nextOverview = await api.getRuntimeOverview(runtime);
      setOverview(nextOverview);
      onOverviewChange?.(nextOverview);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Runtime data could not be loaded');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onOverviewChange, runtime]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadOverview();
    }, 0);
    const interval = window.setInterval(() => {
      if (view === 'runs') void loadOverview();
    }, 30000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadOverview, view]);

  useEffect(() => {
    if (liveRevision === 0) return;
    const liveRefresh = window.setTimeout(() => {
      void loadOverview();
    }, 0);
    return () => window.clearTimeout(liveRefresh);
  }, [liveRevision, loadOverview]);

  const openAssignment = async (skill: RuntimeSkillDefinition) => {
    try {
      setError(null);
      const runtimes = await api.getRuntimeOverviews();
      setAllOverviews(runtimes);
      setAssignmentSkill(skill);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Target runtimes could not be loaded');
    }
  };

  const saveAgent = async (input: RuntimeAgentInput) => {
    if (!overview) return;
    setSaving(true);
    try {
      if (agentEditor === 'new') {
        await api.createRuntimeAgent(runtime, input);
        setNotice('Native agent file created.');
      } else if (agentEditor) {
        await api.updateRuntimeAgent(
          runtime,
          agentEditor.scope as WritableRuntimeScope,
          agentEditor.id,
          input
        );
        setNotice('Native agent file updated.');
      }
      setAgentEditor(null);
      await loadOverview();
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Agent could not be saved');
    } finally {
      setSaving(false);
    }
  };

  const removeAgent = async (agent: RuntimeAgentDefinition) => {
    if (!agent.editable || (agent.scope !== 'global' && agent.scope !== 'project')) return;
    if (!window.confirm(`Move ${agent.name} to the dashboard trash?`)) return;
    try {
      await api.deleteRuntimeAgent(runtime, agent.scope, agent.id);
      setNotice('Agent moved to the managed trash directory.');
      await loadOverview();
    } catch (removeError: unknown) {
      setError(removeError instanceof Error ? removeError.message : 'Agent could not be deleted');
    }
  };

  const saveSkill = async (input: RuntimeSkillInput) => {
    setSaving(true);
    try {
      if (skillEditor === 'new') {
        await api.createRuntimeSkill(runtime, input);
        setNotice('Native SKILL.md created.');
      } else if (skillEditor) {
        await api.updateRuntimeSkill(
          runtime,
          skillEditor.scope as WritableRuntimeScope,
          skillEditor.id,
          input
        );
        setNotice('Native SKILL.md updated.');
      }
      setSkillEditor(null);
      await loadOverview();
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Skill could not be saved');
    } finally {
      setSaving(false);
    }
  };

  const removeSkill = async (skill: RuntimeSkillDefinition) => {
    if (!skill.editable || (skill.scope !== 'global' && skill.scope !== 'project')) return;
    if (!window.confirm(`Move ${skill.name} to the dashboard trash?`)) return;
    try {
      await api.deleteRuntimeSkill(runtime, skill.scope, skill.id);
      setNotice('Skill moved to the managed trash directory.');
      await loadOverview();
    } catch (removeError: unknown) {
      setError(removeError instanceof Error ? removeError.message : 'Skill could not be deleted');
    }
  };

  const assignSkill = async (
    targetRuntime: RuntimeId,
    targetScope: WritableRuntimeScope,
    targetAgentId: string,
    targetAgentScope: RuntimeScope
  ) => {
    if (!assignmentSkill) return;
    setSaving(true);
    try {
      const result = await api.assignRuntimeSkill({
        source_runtime: assignmentSkill.runtime,
        source_scope: assignmentSkill.scope,
        source_skill_id: assignmentSkill.id,
        target_runtime: targetRuntime,
        target_scope: targetScope,
        target_agent_scope: targetAgentScope,
        target_agent_id: targetAgentId,
      });
      setNotice(
        `${result.installed_skill.name} installed and assigned (${result.compatibility})${
          result.target_agent_imported ? '; legacy agent imported to native storage' : ''
        }.`
      );
      setAssignmentSkill(null);
      await loadOverview();
    } catch (assignmentError: unknown) {
      setError(assignmentError instanceof Error ? assignmentError.message : 'Skill could not be assigned');
    } finally {
      setSaving(false);
    }
  };

  const visibleSkills = useMemo(() => {
    if (!overview) return [];
    const query = skillSearch.trim().toLowerCase();
    if (!query) return overview.skills;
    return overview.skills.filter((skill) => (
      skill.name.toLowerCase().includes(query)
      || skill.id.toLowerCase().includes(query)
      || skill.description.toLowerCase().includes(query)
    ));
  }, [overview, skillSearch]);

  if (loading) {
    return (
      <div className="runtime-panel flex min-h-[420px] items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="runtime-panel p-6">
        <EmptyState
          icon={TriangleAlert}
          title={`${theme.label} inventory unavailable`}
          detail={error || 'The backend returned no runtime data.'}
        />
        <button className="btn btn-primary mt-4" onClick={() => void loadOverview(true)}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  const editableAgents = overview.agents.filter((agent) => agent.editable).length;
  const runningThreads = overview.threads.filter((thread) => thread.status === 'running').length;

  return (
    <div className="space-y-5">
      <section className="runtime-panel overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-white/8 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border ${theme.accentBorder} ${theme.accentBackground} ${theme.accentText}`}>
              <RuntimeIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-white">{theme.label}</h2>
                <span className={`runtime-badge ${overview.runtime.available ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/25 bg-amber-400/10 text-amber-300'}`}>
                  {overview.runtime.available ? 'detected' : 'not initialized'}
                </span>
                <span className={`runtime-badge ${
                  liveConnected
                    ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
                    : 'border-zinc-600 bg-zinc-800/70 text-zinc-500'
                }`}>
                  <RadioTower className="h-3 w-3" />
                  {liveConnected ? 'live updates' : 'polling fallback'}
                </span>
                <span className="runtime-badge border-white/10 bg-white/5 text-zinc-400">
                  {overview.runtime.session_scope === 'all' ? 'all workspaces' : 'workspace sessions'}
                </span>
                <span className="runtime-badge border-white/10 bg-white/5 text-zinc-400">{theme.shortLabel}</span>
              </div>
              <p className="mt-1 truncate font-mono text-xs text-zinc-500">{overview.runtime.workspace_dir}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="runtime-stat"><strong>{runningThreads}</strong><span>running</span></div>
            <div className="runtime-stat"><strong>{overview.threads.length}</strong><span>runs</span></div>
            <div className="runtime-stat"><strong>{editableAgents}</strong><span>editable agents</span></div>
            <div className="runtime-stat"><strong>{overview.skills.length}</strong><span>skills</span></div>
            <button
              className="icon-button ml-1"
              onClick={() => void loadOverview(true)}
              title="Refresh runtime"
              aria-label="Refresh runtime"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-4 pt-3 custom-scrollbar" aria-label="Runtime views">
          {VIEWS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`runtime-tab ${view === item.id ? 'active' : ''}`}
                onClick={() => setView(item.id)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {item.id === 'runs' && runningThreads > 0 && (
                  <span className="ml-1 rounded-full bg-emerald-400/15 px-1.5 text-[10px] text-emerald-300">
                    {runningThreads}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </section>

      {(error || notice) && (
        <div className={`flex items-start justify-between gap-4 rounded-md border px-4 py-3 text-sm ${
          error
            ? 'border-rose-400/20 bg-rose-400/8 text-rose-200'
            : 'border-emerald-400/20 bg-emerald-400/8 text-emerald-200'
        }`}>
          <div className="flex items-start gap-2">
            {error ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> : <Check className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{error || notice}</span>
          </div>
          <button
            className="text-current opacity-60 hover:opacity-100"
            onClick={() => {
              setError(null);
              setNotice(null);
            }}
            title="Dismiss"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {view === 'runs' && (
        <section className="runtime-panel p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="runtime-section-title">Runtime activity</h3>
              <p className="runtime-section-meta">{overview.edges.length} parent-child links</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <Database className="h-3.5 w-3.5" />
              {overview.capabilities.sessions_control ? 'read and control' : 'read-only observation'}
            </div>
          </div>
          {overview.threads.length > 0 ? (
            <ThreadTree threads={overview.threads} />
          ) : (
            <EmptyState icon={Activity} title="No matching runtime activity" detail="No session record matched the detected workspace." />
          )}
        </section>
      )}

      {view === 'agents' && (
        <section className="runtime-panel">
          <header className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-4">
            <div>
              <h3 className="runtime-section-title">Agent definitions</h3>
              <p className="runtime-section-meta">{overview.agents.length} discovered</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setAgentEditor('new')}>
              <Plus className="h-4 w-4" />
              New Agent
            </button>
          </header>
          <div className="divide-y divide-white/7">
            {overview.agents.map((agent) => (
              <article key={`${agent.scope}:${agent.id}:${agent.file_path || 'builtin'}`} className="runtime-list-row">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/8 bg-zinc-900 text-zinc-400">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-zinc-100">{agent.name}</h4>
                      <ScopeBadge scope={agent.scope} />
                      {!agent.editable && (
                        <span className="runtime-badge border-white/10 bg-white/5 text-zinc-500">read only</span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                      {agent.description || 'No description'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-zinc-500">
                      <span className="font-mono">{agent.id}</span>
                      {agent.model && <span>{agent.model}</span>}
                      {agent.skills.length > 0 && <span>{agent.skills.length} skills</span>}
                      {agent.file_path && <span className="max-w-[420px] truncate font-mono">{agent.file_path}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {agent.file_path && (
                    <button
                      className="icon-button"
                      onClick={() => void copyText(agent.file_path || '')}
                      title="Copy file path"
                      aria-label="Copy file path"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                  {agent.editable && (
                    <>
                      <button
                        className="icon-button"
                        onClick={() => setAgentEditor(agent)}
                        title="Edit agent"
                        aria-label={`Edit ${agent.name}`}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        className="icon-button danger"
                        onClick={() => void removeAgent(agent)}
                        title="Delete agent"
                        aria-label={`Delete ${agent.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
            {overview.agents.length === 0 && (
              <EmptyState
                icon={Bot}
                title="No native agents found"
                detail="Create a project or global agent for this runtime."
              />
            )}
          </div>
        </section>
      )}

      {view === 'skills' && (
        <section className="runtime-panel">
          <header className="flex flex-col gap-3 border-b border-white/8 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="runtime-section-title">Native skill packages</h3>
              <p className="runtime-section-meta">{visibleSkills.length} shown</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                <input
                  className="input py-2 pl-9"
                  value={skillSearch}
                  onChange={(event) => setSkillSearch(event.target.value)}
                  placeholder="Filter skills"
                />
              </label>
              <button className="btn btn-primary btn-sm" onClick={() => setSkillEditor('new')}>
                <Plus className="h-4 w-4" />
                New Skill
              </button>
            </div>
          </header>
          <div className="divide-y divide-white/7">
            {visibleSkills.map((skill) => (
              <article key={`${skill.scope}:${skill.file_path}`} className="runtime-list-row">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/8 bg-zinc-900 text-zinc-400">
                    <FileCode2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-zinc-100">{skill.name}</h4>
                      <ScopeBadge scope={skill.scope} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                      {skill.description || 'No description'}
                    </p>
                    <div className="mt-2 max-w-[760px] truncate font-mono text-[10px] text-zinc-600">
                      {skill.file_path}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    className="icon-button"
                    onClick={() => void openAssignment(skill)}
                    title="Assign to agent"
                    aria-label={`Assign ${skill.name}`}
                  >
                    <PackagePlus className="h-4 w-4" />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => void copyText(skill.file_path)}
                    title="Copy file path"
                    aria-label="Copy file path"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  {skill.editable && (
                    <>
                      <button
                        className="icon-button"
                        onClick={() => setSkillEditor(skill)}
                        title="Edit skill"
                        aria-label={`Edit ${skill.name}`}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        className="icon-button danger"
                        onClick={() => void removeSkill(skill)}
                        title="Delete skill"
                        aria-label={`Delete ${skill.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
            {visibleSkills.length === 0 && (
              <EmptyState icon={Search} title="No matching skills" detail="Change the filter or create a native skill." />
            )}
          </div>
        </section>
      )}

      {view === 'paths' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="runtime-panel p-5">
            <h3 className="runtime-section-title">Detected paths</h3>
            <div className="mt-4 space-y-3">
              {[
                ['Runtime home', overview.paths.home],
                ['Workspace', overview.paths.workspace],
                ['Global agents', overview.paths.agent_roots.global],
                ['Project agents', overview.paths.agent_roots.project],
                ['Global skills', overview.paths.skill_roots.global],
                ['Project skills', overview.paths.skill_roots.project],
                ...(overview.paths.skill_roots.compat_global
                  ? [['Compatibility global skills', overview.paths.skill_roots.compat_global]]
                  : []),
                ...(overview.paths.skill_roots.compat_project
                  ? [['Compatibility project skills', overview.paths.skill_roots.compat_project]]
                  : []),
                ...(overview.paths.sqlite_home ? [['SQLite home', overview.paths.sqlite_home]] : []),
                ...overview.paths.session_roots.map((root, index) => [`Session root ${index + 1}`, root]),
              ].map(([label, value]) => (
                <div key={`${label}:${value}`} className="runtime-path-row">
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase text-zinc-600">{label}</div>
                    <div className="mt-1 truncate font-mono text-xs text-zinc-300">{value}</div>
                  </div>
                  <button
                    className="icon-button"
                    onClick={() => void copyText(value)}
                    title={`Copy ${label}`}
                    aria-label={`Copy ${label}`}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="runtime-panel p-5">
            <h3 className="runtime-section-title">Diagnostics</h3>
            <div className="mt-4 space-y-3">
              <div className="runtime-path-row">
                <div className="flex items-center gap-3">
                  <Layers3 className="h-4 w-4 text-zinc-500" />
                  <div>
                    <div className="text-xs font-medium text-zinc-200">Definition and skill files</div>
                    <div className="mt-0.5 text-[10px] text-zinc-500">Read and write</div>
                  </div>
                </div>
                <Check className="h-4 w-4 text-emerald-300" />
              </div>
              <div className="runtime-path-row">
                <div className="flex items-center gap-3">
                  <Database className="h-4 w-4 text-zinc-500" />
                  <div>
                    <div className="text-xs font-medium text-zinc-200">Sessions and transcripts</div>
                    <div className="mt-0.5 text-[10px] text-zinc-500">Read only</div>
                  </div>
                </div>
                <ShieldCheck className="h-4 w-4 text-sky-300" />
              </div>
              {overview.diagnostics.map((diagnostic) => (
                <div key={diagnostic.code} className="flex items-start gap-3 rounded-md border border-white/8 bg-zinc-950/40 p-3">
                  {diagnostic.level === 'warning'
                    ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                    : <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />}
                  <div>
                    <div className="font-mono text-[10px] text-zinc-600">{diagnostic.code}</div>
                    <p className="mt-1 text-xs leading-5 text-zinc-400">{diagnostic.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {agentEditor && (
        <AgentEditor
          key={agentEditor === 'new' ? 'new-agent' : `${agentEditor.scope}:${agentEditor.id}`}
          overview={overview}
          agent={agentEditor === 'new' ? null : agentEditor}
          saving={saving}
          onClose={() => setAgentEditor(null)}
          onSave={saveAgent}
        />
      )}

      {skillEditor && (
        <SkillEditor
          key={skillEditor === 'new' ? 'new-skill' : `${skillEditor.scope}:${skillEditor.id}`}
          overview={overview}
          skill={skillEditor === 'new' ? null : skillEditor}
          saving={saving}
          onClose={() => setSkillEditor(null)}
          onSave={saveSkill}
        />
      )}

      {assignmentSkill && (
        <AssignmentEditor
          key={`${assignmentSkill.runtime}:${assignmentSkill.scope}:${assignmentSkill.id}`}
          source={assignmentSkill}
          overviews={allOverviews}
          saving={saving}
          onClose={() => setAssignmentSkill(null)}
          onAssign={assignSkill}
        />
      )}
    </div>
  );
}
