'use client';

import { useState } from 'react';
import { Hook } from '@/types';
import { api } from '@/lib/api';

interface HookListProps {
  hooks: Hook[];
  onRefresh: () => void;
}

export default function HookList({ hooks, onRefresh }: HookListProps) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'pre' as const,
    trigger: 'git.push',
    action: 'Review code changes for bugs',
    agent: 'antigravity' as 'antigravity' | 'claude' | 'codex' | 'none',
    enabled: true,
  });

  const handleCreate = () => {
    setFormData({
      name: '',
      type: 'pre',
      trigger: 'git.push',
      action: 'Review code changes for bugs',
      agent: 'antigravity',
      enabled: true,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createHook({
      id: crypto.randomUUID(),
      ...formData,
      config: {},
      created_at: new Date().toISOString(),
    });
    setShowModal(false);
    onRefresh();
  };

  const handleToggle = async (hook: Hook) => {
    await api.toggleHook(hook.id);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this hook?')) {
      await api.deleteHook(id);
      onRefresh();
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pre':
        return 'bg-secondary/10 text-secondary border-secondary/30';
      case 'post':
        return 'bg-accent/10 text-accent border-accent/30';
      case 'error':
        return 'bg-error/10 text-error border-error/30';
      default:
        return 'bg-surface text-foreground-muted border-border';
    }
  };
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">System <span className="text-muted font-light">Hooks</span></h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
            <p className="text-[10px] text-muted font-bold uppercase tracking-[0.2em]">Event Interceptors</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>Register Hook</span>
        </button>
      </div>

      {!Array.isArray(hooks) || hooks.length === 0 ? (
        <div className="glass-card p-20 text-center border-dashed border-border">
          <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Active Hooks Detected</h3>
          <p className="text-sm text-muted">Configure interception hooks to monitor or modify system event flows.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hooks.map((hook) => {
            const isEnabled = hook.active ?? hook.enabled;
            return (
              <div
                key={hook.id}
                className="glass-card-sm border border-border group hover:border-primary/20 transition-all flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center border border-border group-hover:border-primary group-hover:bg-primary/10 transition-all">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight group-hover:text-primary transition-colors">{hook.name}</h3>
                      <span className={`px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-[8px] font-black text-accent uppercase tracking-wider`}>
                        {hook.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(hook)}
                      className={`switch scale-75 ${isEnabled ? 'active' : ''}`}
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-4 flex-1">
                  <div className="p-2 rounded-lg bg-background border border-border">
                    <span className="text-[8px] font-black text-muted uppercase tracking-widest block mb-0.5">Trigger</span>
                    <span className="text-[10px] text-white font-mono truncate block">{hook.trigger}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border">
                    <span className="text-[8px] font-black text-muted uppercase tracking-widest block mb-0.5">Executor Agent</span>
                    <span className="text-[10px] text-accent font-mono truncate block capitalize">
                      {hook.agent || 'none'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border">
                    <span className="text-[8px] font-black text-muted uppercase tracking-widest block mb-0.5">Action / Prompt</span>
                    <span className="text-[10px] text-primary font-mono truncate block">{hook.action}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-border mt-auto">
                  <button
                    onClick={() => handleDelete(hook.id)}
                    className="p-1.5 text-muted hover:text-error transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content p-8">
            <h2 className="text-2xl font-bold mb-6 text-white">Create New Hook</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-foreground-muted mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Hook name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground-muted mb-2">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="select"
                >
                  <option value="pre">Pre (Before action)</option>
                  <option value="post">Post (After action)</option>
                  <option value="error">Error (On error)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground-muted mb-2">
                  Trigger Event
                </label>
                <select
                  value={formData.trigger}
                  onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                  className="select"
                >
                  <option value="git.push">git.push (Git Push Event)</option>
                  <option value="git.commit">git.commit (Git Commit Event)</option>
                  <option value="file.change">file.change (File Watcher Change)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground-muted mb-2">
                  Executor Agent
                </label>
                <select
                  value={formData.agent}
                  onChange={(e) => setFormData({ ...formData, agent: e.target.value as any })}
                  className="select"
                >
                  <option value="antigravity">Antigravity Core</option>
                  <option value="claude">Claude Code</option>
                  <option value="codex">Codex Engine</option>
                  <option value="none">None (Direct Shell Action)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground-muted mb-2">
                  {formData.agent === 'none' ? 'Action / Shell Command' : 'A.I. Prompt / Instruction'}
                </label>
                <input
                  type="text"
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  className="input"
                  placeholder={formData.agent === 'none' ? 'e.g. echo "Running tests..."' : 'e.g. Inspect changes for security vulnerabilities'}
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
