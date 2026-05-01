'use client';

import { useState } from 'react';
import { AIModel } from '@/types';
import { api } from '@/lib/api';

interface ModelListProps {
  models: AIModel[];
  onRefresh: () => void;
}

export default function ModelList({ models, onRefresh }: ModelListProps) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'custom' as const,
    api_endpoint: '',
    api_key: '',
    model_id: '',
    capabilities: [] as string[],
  });

  const handleCreate = () => {
    setFormData({
      name: '',
      provider: 'custom',
      api_endpoint: '',
      api_key: '',
      model_id: '',
      capabilities: [],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createModel({
      id: crypto.randomUUID(),
      ...formData,
      enabled: true,
      config: {},
    });
    setShowModal(false);
    onRefresh();
  };

  const handleToggle = async (model: AIModel) => {
    await api.toggleModel(model.id);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this model?')) {
      await api.deleteModel(id);
      onRefresh();
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'anthropic':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'openai':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'codex':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'antigravity':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'custom':
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
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
        + Add Model
      </button>

      {models.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
          <div className="text-6xl mb-4">🔧</div>
          <p className="text-zinc-400 text-lg">No models yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model) => (
            <div
              key={model.id}
              className={`bg-zinc-900/50 rounded-2xl border ${
                model.enabled ? 'border-zinc-800/50' : 'border-zinc-800/50 opacity-60'
              } p-6 hover:border-zinc-700/50 transition-all`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{model.name}</h3>
                  <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${getProviderColor(model.provider)}`}>
                    {model.provider}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggle(model)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      model.enabled
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                    }`}
                  >
                    {model.enabled ? '✓' : '○'}
                  </button>
                  <button
                    onClick={() => handleDelete(model.id)}
                    className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-all"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-zinc-500">Model ID:</span>
                  <span className="ml-2 text-zinc-300">{model.model_id}</span>
                </div>
                {model.api_endpoint && (
                  <div>
                    <span className="text-zinc-500">Endpoint:</span>
                    <span className="ml-2 text-zinc-300 break-all">{model.api_endpoint}</span>
                  </div>
                )}
                <div>
                  <span className="text-zinc-500">Capabilities:</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {model.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="px-3 py-1 bg-orange-500/10 text-orange-400 text-xs rounded-lg"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-zinc-800 p-8">
            <h2 className="text-2xl font-bold mb-6 text-white">Add New Model</h2>
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
                  placeholder="Model name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  Provider
                </label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 text-white transition-all"
                >
                  <option value="anthropic">Anthropic</option>
                  <option value="openai">OpenAI</option>
                  <option value="codex">Codex</option>
                  <option value="antigravity">Antigravity</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  API Endpoint
                </label>
                <input
                  type="url"
                  value={formData.api_endpoint}
                  onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 text-white placeholder-zinc-500 transition-all"
                  placeholder="https://api.example.com/v1"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  Model ID
                </label>
                <input
                  type="text"
                  value={formData.model_id}
                  onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 text-white placeholder-zinc-500 transition-all"
                  placeholder="model-id"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  Capabilities (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.capabilities.join(', ')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capabilities: e.target.value.split(',').map((c) => c.trim()),
                    })
                  }
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 text-white placeholder-zinc-500 transition-all"
                  placeholder="text, code, analysis"
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
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
