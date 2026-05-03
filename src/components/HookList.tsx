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
    trigger: '',
    action: '',
    enabled: true,
  });

  const handleCreate = () => {
    setFormData({
      name: '',
      type: 'pre',
      trigger: '',
      action: '',
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
          <h2 className="text-3xl font-black text-white tracking-tight">Hook <span className="text-[var(--foreground-muted)] font-light">Architecture</span></h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse"></span>
            <p className="text-[10px] text-[var(--foreground-muted)] font-bold uppercase tracking-[0.2em]">Interception Layer</p>
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="btn btn-primary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>Register Hook</span>
        </button>
      </div>

      {!Array.isArray(hooks) || hooks.length === 0 ? (
        <div className="glass-card p-20 text-center border-dashed border-white/10">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Active Hooks Detected</h3>
          <p className="text-sm text-[var(--foreground-muted)]">Configure interception hooks to monitor or modify system event flows.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hooks.map((hook) => (
            <div
              key={hook.id}
              className={`glass-card group flex flex-col ${
                !hook.enabled ? 'opacity-40 grayscale pointer-events-none' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                    <h3 className="text-lg font-bold text-white tracking-tight">{hook.name}</h3>
                  </div>
                  <span className={`badge ${getTypeColor(hook.type || 'custom')}`}>
                    {(hook.type || 'custom').toUpperCase()} INTERCEPTOR
                  </span>
                </div>
                <div className="flex flex-col items-end gap-3 pl-4 border-l border-white/5 ml-4">
                  <button
                    onClick={() => handleToggle(hook)}
                    className={`switch ${hook.enabled ? 'active' : ''}`}
                  />
                  <button
                    onClick={() => handleDelete(hook.id)}
                    className="btn btn-secondary p-1.5 hover:text-red-500"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 group-hover:bg-white/10 transition-colors">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-1.5">Event Trigger</span>
                  <span className="text-[11px] text-white font-mono break-all">{hook.trigger}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 group-hover:bg-white/10 transition-colors">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-1.5">Action Executable</span>
                  <span className="text-[11px] text-[var(--primary)] font-mono break-all">{hook.action}</span>
                </div>
              </div>
            </div>
          ))}
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
                  Trigger
                </label>
                <input
                  type="text"
                  value={formData.trigger}
                  onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                  className="input"
                  placeholder="agent.request"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground-muted mb-2">
                  Action
                </label>
                <input
                  type="text"
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  className="input"
                  placeholder="log_request"
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
