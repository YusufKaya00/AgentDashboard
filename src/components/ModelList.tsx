'use client';

import { useState, useEffect } from 'react';
import { AIModel, AIControlPlaneOverview } from '@/types';
import { api } from '@/lib/api';

interface ModelListProps {
  models: AIModel[];
  onRefresh: () => void;
}

export default function ModelList({ models, onRefresh }: ModelListProps) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<{
    id: string;
    name: string;
    provider: string;
    api_endpoint: string;
    api_key: string;
    model_id: string;
    capabilities: string[];
  }>({
    id: '',
    name: '',
    provider: 'custom',
    api_endpoint: '',
    api_key: '',
    model_id: '',
    capabilities: [],
  });

  const [isEditing, setIsEditing] = useState(false);
  const [overview, setOverview] = useState<AIControlPlaneOverview | null>(null);

  useEffect(() => {
    api.getAIOverview().then(setOverview);
  }, [models]); // refresh overview when models change

  const handleCreate = () => {
    setFormData({
      id: crypto.randomUUID(),
      name: '',
      provider: 'custom',
      api_endpoint: '',
      api_key: '',
      model_id: '',
      capabilities: [],
    });
    setIsEditing(false);
    setShowModal(true);
  };

  const handleEdit = (model: AIModel) => {
    setFormData({
      id: model.id,
      name: model.name,
      provider: model.provider,
      api_endpoint: model.api_endpoint ?? '',
      api_key: model.api_key ?? '',
      model_id: model.model_id,
      capabilities: Array.isArray(model.capabilities) ? model.capabilities : [],
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      await api.updateModel(formData.id, {
        ...formData,
        enabled: true,
        config: {},
      });
    } else {
      await api.createModel({
        ...formData,
        enabled: true,
        config: {},
      });
    }
    setShowModal(false);
    onRefresh();
  };

  const handleToggle = async (model: AIModel) => {
    await api.toggleModel(model.id);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;
    await api.deleteModel(id);
    onRefresh();
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'anthropic':
        return 'bg-primary/10 text-primary border-primary/30';
      case 'openai':
        return 'bg-accent/10 text-accent border-accent/30';
      case 'codex':
        return 'bg-secondary/10 text-secondary border-secondary/30';
      case 'antigravity':
        return 'bg-info/10 text-info border-info/30';
      case 'custom':
        return 'bg-surface text-foreground-muted border-border';
      default:
        return 'bg-surface text-foreground-muted border-border';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Model <span className="text-[var(--foreground-muted)] font-light">Inventory</span></h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse"></span>
            <p className="text-[10px] text-[var(--foreground-muted)] font-bold uppercase tracking-[0.2em]">Neural Engine Matrix</p>
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="btn btn-primary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>Register Model</span>
        </button>
      </div>

      {!Array.isArray(models) || models.length === 0 ? (
        <div className="glass-card p-20 text-center border-dashed border-white/10">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Neural Engines Registered</h3>
          <p className="text-sm text-[var(--foreground-muted)]">Initialize a connection to an AI provider to register your first model.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model) => (
            <div
              key={model.id}
              className="glass-card group flex flex-col"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-[var(--primary)] group-hover:bg-[var(--primary-glow)] transition-all">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`badge ${getProviderColor(model.provider)}`}>
                    {model.provider}
                  </span>
                  {model.source && model.source !== 'custom' && (
                    <span className="badge text-accent border-accent/30 bg-accent/10 normal-case tracking-normal text-[9px] px-2 py-0.5">
                      .{model.source} cache
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-[var(--primary)] transition-colors">{model.name}</h3>
                
                <div className="space-y-4 mt-6">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 group-hover:bg-white/10 transition-colors">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-1">Model ID</span>
                    <span className="text-[11px] text-white font-mono break-all">{model.model_id}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {overview?.skills.filter(s => s.assigned_targets.some(t => t.target_key === `model:${model.id}`)).map((skill) => (
                      <span key={skill.skill_key} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[9px] font-bold text-white/60 group-hover:text-white transition-colors">
                        {skill.name}
                      </span>
                    ))}
                    {(!overview?.skills.filter(s => s.assigned_targets.some(t => t.target_key === `model:${model.id}`)).length) && (
                      <span className="text-[10px] text-muted">No skills assigned</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-6 border-t border-white/5 mt-6">
                {(!model.source || model.source === 'custom') ? (
                  <>
                    <button
                      onClick={() => handleToggle(model)}
                      className={`switch ${model.enabled ? 'active' : ''}`}
                      title={model.enabled ? 'Deactivate' : 'Activate'}
                    />
                    <button
                      onClick={() => handleEdit(model)}
                      className="btn btn-secondary flex-1 py-1.5 text-xs"
                    >
                      Configure
                    </button>
                    <button
                      onClick={() => handleDelete(model.id)}
                      className="btn btn-secondary p-2 hover:text-red-500"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <span className="text-[10px] font-bold text-muted text-center w-full py-2 bg-white/[0.02] border border-white/[0.04] rounded-lg tracking-wider uppercase">
                    Read-only System Model
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content p-8">
            <h2 className="text-2xl font-bold mb-6 text-white">
              {isEditing ? 'Edit Model' : 'Add New Model'}
            </h2>
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
                  placeholder="Model name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground-muted mb-2">
                  Provider
                </label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="select"
                >
                  <option value="anthropic">Anthropic</option>
                  <option value="openai">OpenAI</option>
                  <option value="codex">Codex</option>
                  <option value="antigravity">Antigravity</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground-muted mb-2">
                  API Endpoint
                </label>
                <input
                  type="url"
                  value={formData.api_endpoint}
                  onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                  className="input"
                  placeholder="https://api.example.com/v1"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground-muted mb-2">
                  Model ID
                </label>
                <input
                  type="text"
                  value={formData.model_id}
                  onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
                  className="input"
                  placeholder="model-id"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground-muted mb-2">
                  Assigned Skills (Control Plane)
                </label>
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                  <p className="text-xs text-muted">Manage assignments in the AI Skill Control Plane.</p>
                </div>
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
                  {isEditing ? 'Save Changes' : 'Add Model'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
