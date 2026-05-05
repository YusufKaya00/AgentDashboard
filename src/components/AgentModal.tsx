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
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl">
        <div className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <h2 className="text-2xl font-bold mb-6 text-white tracking-tight">
            {agent ? 'Edit Agent Identity' : 'Deploy New Entity'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-muted uppercase tracking-widest ml-1">
                  Agent Designation
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Designation name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-muted uppercase tracking-widest ml-1">
                  Neural Model
                </label>
                <select
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="select"
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

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-muted uppercase tracking-widest ml-1">
                Mission Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                placeholder="Operational parameters"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-muted uppercase tracking-widest ml-1">
                Acquired Capabilities (Skills)
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-3 bg-background border border-border rounded-xl custom-scrollbar">
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
                      className="rounded border-border text-primary focus:ring-primary bg-surface"
                    />
                    <span className="text-xs text-muted group-hover:text-white transition-colors">{skill.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-muted uppercase tracking-widest ml-1 flex justify-between">
                <span>Core System Prompt (Markdown)</span>
                {loadingPrompt && <span className="text-primary text-[9px] animate-pulse">TRANSMITTING...</span>}
              </label>
              <textarea
                value={formData.system_prompt}
                onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                className="textarea font-mono text-sm leading-relaxed"
                rows={8}
                placeholder="# Role Definition\n\nYou are a..."
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1"
              >
                Authorize Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
