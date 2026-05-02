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
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'post':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'error':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleCreate}
        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl transition-all font-medium shadow-lg shadow-orange-500/25"
      >
        + Create Hook
      </button>

      {!Array.isArray(hooks) || hooks.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
          <div className="text-6xl mb-4">⚡</div>
          <p className="text-zinc-400 text-lg">No hooks yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hooks.map((hook) => (
            <div
              key={hook.id}
              className={`bg-zinc-900/50 rounded-2xl border ${
                hook.enabled ? 'border-zinc-800/50' : 'border-zinc-800/50 opacity-60'
              } p-6 hover:border-zinc-700/50 transition-all`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{hook.name}</h3>
                  <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${getTypeColor(hook.type)}`}>
                    {hook.type}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggle(hook)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      hook.enabled
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                    }`}
                  >
                    {hook.enabled ? '✓' : '○'}
                  </button>
                  <button
                    onClick={() => handleDelete(hook.id)}
                    className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-all"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-zinc-500">Trigger:</span>
                  <span className="ml-2 text-zinc-300">{hook.trigger}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Action:</span>
                  <span className="ml-2 text-zinc-300">{hook.action}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-zinc-800 p-8">
            <h2 className="text-2xl font-bold mb-6 text-white">Create New Hook</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 text-white placeholder-zinc-500 transition-all"
                  placeholder="Hook name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 text-white transition-all"
                >
                  <option value="pre">Pre (Before action)</option>
                  <option value="post">Post (After action)</option>
                  <option value="error">Error (On error)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  Trigger
                </label>
                <input
                  type="text"
                  value={formData.trigger}
                  onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 text-white placeholder-zinc-500 transition-all"
                  placeholder="agent.request"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  Action
                </label>
                <input
                  type="text"
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 text-white placeholder-zinc-500 transition-all"
                  placeholder="log_request"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border border-zinc-700 rounded-xl hover:bg-zinc-800 transition-all text-zinc-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl transition-all font-medium shadow-lg shadow-orange-500/25"
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
