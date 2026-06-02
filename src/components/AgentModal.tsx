'use client';

import { useState, useEffect } from 'react';
import { Agent, AIControlPlaneOverview } from '@/types';
import { api } from '@/lib/api';

interface AgentModalProps {
  agent: Agent | null;
  onSave: (agent: Agent) => void;
  onClose: () => void;
}

export default function AgentModal({ agent, onSave, onClose }: AgentModalProps) {
  const inferRuntime = (model: string) => {
    const value = model.toLowerCase();
    if (value.includes('claude') || value.includes('anthropic')) return 'claude';
    if (value.includes('codex')) return 'codex';
    return 'antigravity';
  };

  const [formData, setFormData] = useState({
    id: agent?.id || '',
    name: agent?.name || '',
    description: agent?.description || '',
    model: agent?.model || 'claude-3-5-sonnet-20241022',
    runtime: agent?.runtime || inferRuntime(agent?.model || 'claude-3-5-sonnet-20241022'),
    status: agent?.status || 'inactive',
    config: agent?.config || {},
    capabilities: agent?.capabilities || [],
    system_prompt: '',
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [models, setModels] = useState<any[]>([]);
  const [overview, setOverview] = useState<AIControlPlaneOverview | null>(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  useEffect(() => {
    api.getModels().then(setModels);
    api.getAIOverview().then(setOverview);
    
    if (agent?.id) {
      let active = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingPrompt(true);
      api.getAgentPrompt(agent.id)
        .then(data => {
          if (active) setFormData(prev => ({ ...prev, system_prompt: data.prompt }));
        })
        .finally(() => {
          if (active) setLoadingPrompt(false);
        });
      return () => { active = false; };
    }
  }, [agent]);

  useEffect(() => {
    if (overview && agent?.id) {
      const timer = window.setTimeout(() => {
        const agentTargetKeys = [`claude_agent:${agent.id}`, `antigravity_agent:${agent.id}`, `codex_agent:${agent.id}`];
        const initialSkills = overview.skills
          .filter(s => s.assigned_targets.some(t => agentTargetKeys.includes(t.target_key)))
          .map(s => s.skill_key);
        setSelectedSkills(initialSkills);
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [overview, agent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      skills: selectedSkills,
      id: formData.id || crypto.randomUUID(),
      created_at: agent?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Agent);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl">
        <div className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <h2 className="text-2xl font-bold mb-6 text-white tracking-tight">
            {agent ? 'Edit Agent Identity' : 'Deploy New Entity'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  Runtime
                </label>
                <select
                  value={formData.runtime}
                  onChange={(e) => setFormData({ ...formData, runtime: e.target.value })}
                  className="select"
                >
                  <option value="antigravity">Gemini / Antigravity</option>
                  <option value="codex">Codex</option>
                  <option value="claude">Claude</option>
                </select>
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
                      {model.name} ({model.provider})
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
                Equipped Agent Skills / Tools
              </label>
              <div className="p-4 bg-background/50 border border-border rounded-xl max-h-[200px] overflow-y-auto custom-scrollbar">
                {overview?.skills && overview.skills.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {overview.skills.map((skill) => {
                      const isChecked = selectedSkills.includes(skill.skill_key);
                      return (
                        <label
                          key={skill.skill_key}
                          className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer select-none ${
                            isChecked
                              ? 'bg-primary/10 border-primary/40 text-white'
                              : 'bg-surface/30 border-transparent text-muted hover:bg-surface/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedSkills(prev =>
                                prev.includes(skill.skill_key)
                                  ? prev.filter(k => k !== skill.skill_key)
                                  : [...prev, skill.skill_key]
                              );
                            }}
                            className="mt-0.5 w-3.5 h-3.5 accent-[var(--primary)] cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold truncate leading-none text-white/90">{skill.name}</div>
                            <div className="text-[9px] text-muted truncate mt-1 leading-tight">{skill.description}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted">No skills available in catalog.</p>
                )}
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
