'use client';

import { useMemo, useState } from 'react';
import {
  Bot,
  Cpu,
  Link2,
  LoaderCircle,
  Play,
  Plus,
  SquareTerminal,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AIModel,
  Hook,
  RuntimeId,
  RuntimeOverview,
  RuntimeScope,
} from '@/types';
import { api } from '@/lib/api';

interface HookListProps {
  hooks: Hook[];
  models: AIModel[];
  runtimeOverviews: RuntimeOverview[];
  onRefresh: () => void;
}

interface HookForm {
  name: string;
  type: Hook['type'];
  trigger: string;
  action: string;
  execution_mode: NonNullable<Hook['execution_mode']>;
  runtime: RuntimeId;
  model: string;
  agent_key: string;
  enabled: boolean;
}

const DEFAULT_FORM: HookForm = {
  name: '',
  type: 'pre',
  trigger: 'git.push',
  action: 'Review code changes for bugs',
  execution_mode: 'runtime',
  runtime: 'codex',
  model: '',
  agent_key: '',
  enabled: true,
};

const RUNTIME_META: Record<RuntimeId, { label: string; badge: string }> = {
  codex: {
    label: 'Codex',
    badge: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
  },
  claude: {
    label: 'Claude',
    badge: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  },
  antigravity: {
    label: 'Antigravity',
    badge: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  },
};

const hookRuntime = (hook: Hook): RuntimeId | null => {
  if (hook.runtime) return hook.runtime;
  if (hook.agent && hook.agent !== 'none') return hook.agent;
  return null;
};

const hookMode = (hook: Hook): NonNullable<Hook['execution_mode']> => (
  hook.execution_mode || (hook.agent === 'none' ? 'shell' : 'runtime')
);

export default function HookList({
  hooks,
  models,
  runtimeOverviews,
  onRefresh,
}: HookListProps) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<HookForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [runningHookId, setRunningHookId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const compatibleModels = useMemo(() => (
    models.filter((model) => (
      model.enabled !== false
      && (model.source === formData.runtime || model.id.startsWith(`${formData.runtime}:`))
    ))
  ), [formData.runtime, models]);

  const compatibleAgents = useMemo(() => (
    runtimeOverviews
      .find((overview) => overview.runtime.id === formData.runtime)
      ?.agents
      .map((agent) => ({
        ...agent,
        key: `${agent.scope}:${agent.id}`,
      }))
      .sort((left, right) => left.name.localeCompare(right.name))
      || []
  ), [formData.runtime, runtimeOverviews]);

  const handleCreate = () => {
    setFormData(DEFAULT_FORM);
    setStatusMessage(null);
    setShowModal(true);
  };

  const updateRuntime = (runtime: RuntimeId) => {
    setFormData((current) => ({
      ...current,
      runtime,
      model: '',
      agent_key: '',
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    try {
      const [agentScope, ...agentIdParts] = formData.agent_key.split(':');
      const agentId = agentIdParts.join(':');
      await api.createHook({
        name: formData.name,
        type: formData.type,
        trigger: formData.trigger,
        action: formData.action,
        execution_mode: formData.execution_mode,
        runtime: formData.execution_mode === 'shell' ? undefined : formData.runtime,
        model: formData.execution_mode === 'shell' ? null : formData.model || null,
        agent: formData.execution_mode === 'shell' ? 'none' : formData.runtime,
        agent_scope: formData.execution_mode === 'agent'
          ? agentScope as RuntimeScope
          : null,
        agent_id: formData.execution_mode === 'agent' ? agentId : null,
        enabled: formData.enabled,
        config: {},
        created_at: new Date().toISOString(),
      });
      setShowModal(false);
      onRefresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to create hook');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (hook: Hook) => {
    await api.toggleHook(hook.id);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this hook?')) return;
    await api.deleteHook(id);
    onRefresh();
  };

  const handleExecute = async (hook: Hook) => {
    setRunningHookId(hook.id);
    setStatusMessage(null);
    try {
      const result = await api.executeHook(hook.id);
      setStatusMessage(
        result.status === 'success'
          ? `${hook.name} completed successfully.`
          : `${hook.name} failed: ${result.error || 'Unknown execution error'}`
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to execute hook');
    } finally {
      setRunningHookId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Automation hooks</h2>
          <p className="mt-1 text-[10px] text-zinc-600">{hooks.length} event bindings configured</p>
        </div>
        <button type="button" onClick={handleCreate} className="btn btn-primary">
          <Plus className="h-4 w-4" />
          Create hook
        </button>
      </div>

      {statusMessage && (
        <div className="runtime-panel flex items-center justify-between gap-3 px-4 py-3 text-xs text-zinc-300">
          <span>{statusMessage}</span>
          <button
            type="button"
            className="icon-button"
            onClick={() => setStatusMessage(null)}
            title="Dismiss status"
            aria-label="Dismiss status"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!Array.isArray(hooks) || hooks.length === 0 ? (
        <div className="runtime-panel runtime-empty min-h-[320px] flex-col">
          <Link2 className="h-7 w-7 text-zinc-700" />
          <div>
            <h3 className="text-sm font-medium text-zinc-300">No hooks configured</h3>
            <p className="mt-1 text-xs text-zinc-600">Create a hook to bind an event to a runtime or shell action.</p>
          </div>
        </div>
      ) : (
        <section className="runtime-panel overflow-hidden">
          <div className="hidden grid-cols-[minmax(180px,1.2fr)_120px_minmax(190px,1fr)_minmax(220px,1.3fr)_120px] gap-4 border-b border-white/[0.07] px-5 py-3 text-[9px] font-semibold text-zinc-600 lg:grid">
            <span>Hook</span>
            <span>Trigger</span>
            <span>Target</span>
            <span>Action</span>
            <span className="text-right">Controls</span>
          </div>
          {hooks.map((hook) => {
            const isEnabled = hook.active ?? hook.enabled ?? true;
            const runtime = hookRuntime(hook);
            const mode = hookMode(hook);
            const targetName = mode === 'shell'
              ? 'Direct shell'
              : hook.agent_id
                ? hook.agent_id
                : 'Runtime default';
            return (
              <article
                key={hook.id}
                className="grid gap-4 border-b border-white/[0.06] px-5 py-4 last:border-b-0 lg:grid-cols-[minmax(180px,1.2fr)_120px_minmax(190px,1fr)_minmax(220px,1.3fr)_120px] lg:items-center"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 shrink-0 text-zinc-600" />
                    <span className="truncate text-sm font-medium text-zinc-200">{hook.name}</span>
                  </div>
                  <div className="mt-1 pl-6 text-[10px] text-zinc-600">{hook.type} hook</div>
                </div>

                <div>
                  <div className="mb-1 text-[9px] text-zinc-700 lg:hidden">Trigger</div>
                  <span className="font-mono text-[10px] text-zinc-400">{hook.trigger}</span>
                </div>

                <div className="min-w-0">
                  <div className="mb-1 text-[9px] text-zinc-700 lg:hidden">Target</div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {runtime ? (
                      <span className={`runtime-badge ${RUNTIME_META[runtime].badge}`}>
                        {RUNTIME_META[runtime].label}
                      </span>
                    ) : (
                      <span className="runtime-badge border-zinc-500/20 bg-zinc-500/10 text-zinc-400">
                        shell
                      </span>
                    )}
                    <span className="truncate text-[10px] text-zinc-500">{targetName}</span>
                  </div>
                  {hook.model && (
                    <div className="mt-1 truncate font-mono text-[9px] text-zinc-700">{hook.model}</div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="mb-1 text-[9px] text-zinc-700 lg:hidden">Action</div>
                  <p className="line-clamp-2 text-xs leading-5 text-zinc-400">{hook.action}</p>
                </div>

                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => void handleExecute(hook)}
                    disabled={runningHookId === hook.id}
                    title={`Run ${hook.name}`}
                    aria-label={`Run ${hook.name}`}
                  >
                    {runningHookId === hook.id
                      ? <LoaderCircle className="h-4 w-4 animate-spin" />
                      : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggle(hook)}
                    className={`switch scale-75 ${isEnabled ? 'active' : ''}`}
                    title={isEnabled ? `Disable ${hook.name}` : `Enable ${hook.name}`}
                    aria-label={isEnabled ? `Disable ${hook.name}` : `Enable ${hook.name}`}
                    aria-pressed={isEnabled}
                  />
                  <button
                    type="button"
                    onClick={() => void handleDelete(hook.id)}
                    className="icon-button danger"
                    title={`Delete ${hook.name}`}
                    aria-label={`Delete ${hook.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {showModal && (
        <div className="modal-overlay pt-14 sm:p-4">
          <div className="runtime-modal max-h-[calc(100vh-72px)] overflow-y-auto sm:max-h-[calc(100vh-32px)]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Create hook</h2>
                <p className="mt-1 text-[10px] text-zinc-600">Bind an event to a runtime execution target.</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowModal(false)}
                title="Close"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="runtime-field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    className="input"
                    placeholder="Review before push"
                    required
                  />
                </label>
                <label className="runtime-field">
                  <span>Trigger event</span>
                  <select
                    value={formData.trigger}
                    onChange={(event) => setFormData({ ...formData, trigger: event.target.value })}
                    className="select"
                  >
                    <option value="git.push">git.push</option>
                    <option value="git.commit">git.commit</option>
                    <option value="file.change">file.change</option>
                  </select>
                </label>
              </div>

              <label className="runtime-field">
                <span>Hook phase</span>
                <select
                  value={formData.type}
                  onChange={(event) => setFormData({ ...formData, type: event.target.value as Hook['type'] })}
                  className="select"
                >
                  <option value="pre">Pre</option>
                  <option value="post">Post</option>
                  <option value="error">Error</option>
                </select>
              </label>

              <div className="runtime-field">
                <span>Execution target</span>
                <div className="grid grid-cols-3 gap-1 rounded-md border border-white/[0.07] bg-zinc-950/40 p-1">
                  {([
                    ['runtime', Cpu, 'Runtime'],
                    ['agent', Bot, 'Agent'],
                    ['shell', SquareTerminal, 'Shell'],
                  ] as const).map(([mode, Icon, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFormData({ ...formData, execution_mode: mode })}
                      className={`flex h-9 items-center justify-center gap-2 rounded text-[10px] font-medium transition-colors ${
                        formData.execution_mode === mode
                          ? 'bg-zinc-800 text-zinc-100'
                          : 'text-zinc-600 hover:text-zinc-300'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {formData.execution_mode !== 'shell' && (
                <>
                  <div className="runtime-field">
                    <span>Runtime</span>
                    <div className="grid grid-cols-3 gap-1 rounded-md border border-white/[0.07] bg-zinc-950/40 p-1">
                      {(Object.keys(RUNTIME_META) as RuntimeId[]).map((runtime) => (
                        <button
                          key={runtime}
                          type="button"
                          onClick={() => updateRuntime(runtime)}
                          className={`h-9 rounded border text-[10px] font-medium transition-colors ${
                            formData.runtime === runtime
                              ? RUNTIME_META[runtime].badge
                              : 'border-transparent text-zinc-600 hover:text-zinc-300'
                          }`}
                        >
                          {RUNTIME_META[runtime].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="runtime-field">
                    <span>Model</span>
                    <select
                      value={formData.model}
                      onChange={(event) => setFormData({ ...formData, model: event.target.value })}
                      className="select"
                    >
                      <option value="">Runtime default</option>
                      {compatibleModels.map((model) => (
                        <option key={model.id} value={model.model_id}>
                          {model.name} ({model.model_id})
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              {formData.execution_mode === 'agent' && (
                <label className="runtime-field">
                  <span>Native agent context</span>
                  <select
                    value={formData.agent_key}
                    onChange={(event) => setFormData({ ...formData, agent_key: event.target.value })}
                    className="select"
                    required
                  >
                    <option value="">Select an agent</option>
                    {compatibleAgents.map((agent) => (
                      <option key={agent.key} value={agent.key}>
                        {agent.name} ({agent.scope})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="runtime-field">
                <span>{formData.execution_mode === 'shell' ? 'Shell command' : 'Task prompt'}</span>
                <textarea
                  value={formData.action}
                  onChange={(event) => setFormData({ ...formData, action: event.target.value })}
                  className="textarea"
                  placeholder={formData.execution_mode === 'shell'
                    ? 'npm test'
                    : 'Review the current changes for regressions'}
                  required
                />
              </label>

              {statusMessage && (
                <div className="rounded-md border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-xs text-rose-300">
                  {statusMessage}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-white/[0.07] pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || (formData.execution_mode === 'agent' && !formData.agent_key)}
                >
                  {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  Create hook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
