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
    model: agent?.model || 'claude-3-5-sonnet-20241022',
    status: agent?.status || 'inactive',
    config: agent?.config || {},
    capabilities: agent?.capabilities || [],
    system_prompt: '',
  });

  const [models, setModels] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [loadingPrompt, setLoadingPrompt] = useState(false);

  useEffect(() => {
    api.getModels().then(setModels);
    api.getSkills().then(setSkills);
    
    if (agent?.id) {
      setLoadingPrompt(true);
      api.getAgentPrompt(agent.id)
        .then(data => {
          setFormData(prev => ({ ...prev, system_prompt: data.prompt }));
        })
        .finally(() => setLoadingPrompt(false));
    }
  }, [agent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: formData.id || crypto.randomUUID(),
      created_at: agent?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 border border-zinc-800 overflow-hidden">
        <div className="p-8 max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold mb-6 text-white">
            {agent ? 'Edit Agent' : 'Create New Agent'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
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
                  Model
                </label>
                <select
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white transition-all"
                >
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-zinc-500 transition-all"
                placeholder="Brief description"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">
                Capabilities (Skills)
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-3 bg-zinc-950 border border-zinc-700 rounded-xl">
                {skills.map((skill) => (
                  <label key={skill.id} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.capabilities.includes(skill.name)}
                      onChange={(e) => {
                        const newCaps = e.target.checked
                          ? [...formData.capabilities, skill.name]
                          : formData.capabilities.filter((c: string) => c !== skill.name);
                        setFormData({ ...formData, capabilities: newCaps });
                      }}
                      className="rounded border-zinc-700 text-orange-500 focus:ring-orange-500 bg-zinc-800"
                    />
                    <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">{skill.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2 flex justify-between">
                <span>System Prompt (Markdown)</span>
                {loadingPrompt && <span className="text-orange-500 text-xs animate-pulse">Loading MD...</span>}
              </label>
              <textarea
                value={formData.system_prompt}
                onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-zinc-500 font-mono text-sm transition-all"
                rows={10}
                placeholder="# Role Definition\n\nYou are a..."
              />
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
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
