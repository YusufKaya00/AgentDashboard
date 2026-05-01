'use client';

import { useState, useEffect } from 'react';
import { Agent } from '@/types';
import { api } from '@/lib/api';

interface AgentModalProps {
  agent: Agent | null;
  onSave: (agent: Agent) => void;
  onClose: () => void;
}

export default function AgentModal({ agent, onSave, onClose }: AgentModalProps) {
  const [formData, setFormData] = useState({
    id: agent?.id || '',
    name: agent?.name || '',
    description: agent?.description || '',
    model: agent?.model || 'claude-opus',
    status: agent?.status || 'inactive',
    config: agent?.config || {},
  });

  const [models, setModels] = useState<any[]>([]);

  useEffect(() => {
    api.getModels().then(setModels);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: formData.id || crypto.randomUUID(),
      created_at: agent?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Agent);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-zinc-800">
        <div className="p-8">
          <h2 className="text-2xl font-bold mb-6 text-white">
            {agent ? 'Edit Agent' : 'Create New Agent'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-zinc-500 transition-all"
                placeholder="Agent name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-zinc-500 resize-none transition-all"
                rows={3}
                placeholder="Agent description"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">
                Model
              </label>
              <select
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white transition-all"
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.provider})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">
                Initial Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white transition-all"
              >
                <option value="inactive">Inactive</option>
                <option value="active">Active</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-zinc-700 rounded-xl hover:bg-zinc-800 transition-all text-zinc-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl transition-all font-medium shadow-lg shadow-orange-500/25"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
