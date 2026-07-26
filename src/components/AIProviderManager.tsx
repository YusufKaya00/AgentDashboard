'use client';

import { useState, useEffect } from 'react';
import {
  Bot,
  CircleCheck,
  CircleX,
  CloudCog,
  KeyRound,
  Link2,
  LoaderCircle,
  MessageSquareCode,
  Network,
  Plus,
  Server,
  Settings2,
  Sparkles,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { AIControlPlaneOverview } from '@/types';

interface Provider {
  id: string;
  name: string;
  type: 'anthropic' | 'openai' | 'gemini' | 'ollama' | 'custom';
  api_key?: string;
  base_url?: string;
  models: string[];
  default_model?: string;
  active: boolean;
  created_at?: string;
}

const PROVIDER_TEMPLATES: Partial<Provider>[] = [
  { name: 'Anthropic (Claude)', type: 'anthropic', base_url: 'https://api.anthropic.com', models: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'] },
  { name: 'OpenAI', type: 'openai', base_url: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { name: 'Google Gemini', type: 'gemini', base_url: 'https://generativelanguage.googleapis.com', models: ['gemini-pro', 'gemini-pro-vision'] },
  { name: 'Ollama (Local)', type: 'ollama', base_url: 'http://localhost:11434', models: ['llama3', 'codellama', 'mixtral'] },
];

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: 'bg-amber-500/5 border-amber-500/25',
  openai: 'bg-emerald-500/5 border-emerald-500/25',
  gemini: 'bg-sky-500/5 border-sky-500/25',
  ollama: 'bg-violet-500/5 border-violet-500/25',
  custom: 'bg-zinc-500/5 border-zinc-500/25',
};

const PROVIDER_ICONS: Record<string, LucideIcon> = {
  anthropic: MessageSquareCode,
  openai: Bot,
  gemini: Sparkles,
  ollama: Server,
  custom: Settings2,
};

export default function AIProviderManager() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { connected: boolean; message: string }>>({});
  const [overview, setOverview] = useState<AIControlPlaneOverview | null>(null);
  const [newProvider, setNewProvider] = useState<Partial<Provider>>({
    name: '', type: 'anthropic', api_key: '', base_url: '', models: []
  });

  const loadProviders = async () => {
    try {
      const [providersData, aiOverview] = await Promise.all([
        api.getProviders(),
        api.getAIOverview()
      ]);
      setProviders(providersData);
      setOverview(aiOverview);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadProviders(); }, []);

  const addProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createProvider(newProvider);
      setShowAddForm(false);
      setNewProvider({ name: '', type: 'anthropic', api_key: '', base_url: '', models: [] });
      loadProviders();
    } catch (e) { console.error(e); }
  };

  const deleteProvider = async (id: string) => {
    if (!confirm('Delete this provider?')) return;
    await api.deleteProvider(id);
    loadProviders();
  };

  const testConnection = async (id: string) => {
    setTesting(id);
    try {
      const result = await api.testProvider(id);
      setTestResults(prev => ({ ...prev, [id]: result }));
    } catch { setTestResults(prev => ({ ...prev, [id]: { connected: false, message: 'Network error' } })); }
    finally { setTesting(null); }
  };

  const selectTemplate = (template: Partial<Provider>) => {
    setNewProvider({ ...newProvider, ...template, api_key: '' });
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-border animate-pulse">
        <div className="h-4 bg-zinc-800 rounded w-1/3 mb-4"></div>
        <div className="h-48 bg-zinc-800 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">AI Providers</h1>
          <p className="text-zinc-500 text-sm uppercase tracking-wider">
            Manage multi-AI connections — Claude, OpenAI, Gemini, Ollama
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary"
        >
          {!showAddForm && <Plus className="h-4 w-4" />}
          {showAddForm ? 'Cancel' : 'Add Provider'}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="glass-card rounded-2xl p-6 border border-border">
          <h3 className="text-lg font-semibold text-white mb-4">New AI Provider</h3>
          
          {/* Quick Templates */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {PROVIDER_TEMPLATES.map((t) => (
              (() => {
                const TemplateIcon = PROVIDER_ICONS[t.type!] || CloudCog;
                return (
                  <button
                    key={t.type}
                    onClick={() => selectTemplate(t)}
                    className={`rounded-md border p-3 text-center transition-colors ${
                      newProvider.type === t.type
                        ? `${PROVIDER_COLORS[t.type!]} border-opacity-100`
                        : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <TemplateIcon className="mx-auto mb-1 h-5 w-5 text-zinc-300" />
                    <div className="text-xs text-zinc-400">{t.name}</div>
                  </button>
                );
              })()
            ))}
          </div>

          <form onSubmit={addProvider} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Name</label>
                <input
                  type="text"
                  value={newProvider.name}
                  onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="My AI Provider"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Base URL</label>
                <input
                  type="text"
                  value={newProvider.base_url}
                  onChange={(e) => setNewProvider({ ...newProvider, base_url: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="https://api.example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">API Key</label>
              <input
                type="password"
                value={newProvider.api_key}
                onChange={(e) => setNewProvider({ ...newProvider, api_key: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
                placeholder="sk-..."
              />
            </div>
            <button type="submit" className="btn btn-primary w-full">
              Add Provider
            </button>
          </form>
        </div>
      )}

      {/* Provider List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((p) => {
          const ProviderIcon = PROVIDER_ICONS[p.type] || CloudCog;
          return (
          <div key={p.id} className={`glass-card rounded-md p-6 border ${PROVIDER_COLORS[p.type] || PROVIDER_COLORS.custom}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <ProviderIcon className="h-6 w-6 text-zinc-300" />
                <div>
                  <h3 className="text-lg font-semibold text-white">{p.name}</h3>
                  <p className="text-xs text-zinc-500 font-mono">{p.base_url}</p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${p.active ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
                {p.active ? 'Active' : 'Inactive'}
              </div>
            </div>

            {/* Models & Skills */}
            <div className="mb-4 space-y-2">
              <div className="flex flex-wrap gap-1">
                {(p.models || []).map((m, i) => (
                  <span key={i} className="px-2 py-1 bg-zinc-800/50 rounded-md text-[10px] text-zinc-400 font-mono">{m}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {overview?.skills.filter(s => s.assigned_targets.some(t => t.target_key === `provider:${p.id}`)).map(skill => (
                  <span key={skill.skill_key} className="px-2 py-1 bg-white/10 border border-white/20 rounded-md text-[9px] font-bold text-white/80">
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>

            {/* API Key Status */}
            <div className="mb-4 flex items-center gap-2 text-xs text-zinc-500">
              <KeyRound className="h-3.5 w-3.5" />
              {p.api_key ? `Key: ****${p.api_key.slice(-4)}` : 'No key set'}
            </div>

            {/* Test Result */}
            {testResults[p.id] && (
              <div className={`mb-3 flex items-center gap-2 rounded-md p-2 text-xs ${testResults[p.id].connected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {testResults[p.id].connected
                  ? <CircleCheck className="h-3.5 w-3.5" />
                  : <CircleX className="h-3.5 w-3.5" />}
                {testResults[p.id].message}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => testConnection(p.id)}
                disabled={testing === p.id}
                className="flex-1 px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-xl text-xs text-zinc-300 hover:bg-zinc-700/50 transition-all disabled:opacity-50"
              >
                <span className="flex items-center justify-center gap-2">
                  {testing === p.id
                    ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    : <Link2 className="h-3.5 w-3.5" />}
                  {testing === p.id ? 'Testing...' : 'Test Connection'}
                </span>
              </button>
              <button
                onClick={() => deleteProvider(p.id)}
                className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 hover:bg-red-500/20 transition-all"
                title={`Delete ${p.name}`}
                aria-label={`Delete ${p.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )})}
      </div>

      {providers.length === 0 && !showAddForm && (
        <div className="glass-card rounded-2xl p-12 border border-border text-center">
          <Network className="mx-auto mb-4 h-10 w-10 text-zinc-600" />
          <h3 className="text-xl font-semibold text-white mb-2">No AI Providers</h3>
          <p className="text-zinc-500 mb-6">Add your first AI provider to start managing multiple AI services</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4" />
            Add First Provider
          </button>
        </div>
      )}
    </div>
  );
}
