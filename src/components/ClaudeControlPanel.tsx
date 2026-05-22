'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ClaudeOverview } from '@/types';

const formatDate = (value: string | null) => {
  if (!value) return 'Not found';
  return new Date(value).toLocaleString();
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function ClaudeControlPanel() {
  const [activeInnerTab, setActiveInnerTab] = useState<'overview' | 'guidelines'>('overview');
  
  // Overview Tab State
  const [overview, setOverview] = useState<ClaudeOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // Guidelines Tab State
  const [markdownContent, setMarkdownContent] = useState('');
  const [loadingMarkdown, setLoadingMarkdown] = useState(true);
  const [savingMarkdown, setSavingMarkdown] = useState(false);
  const [syncingSkills, setSyncingSkills] = useState(false);
  const [markdownSaved, setMarkdownSaved] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Load Overview Data
  const loadOverview = async () => {
    try {
      setOverviewError(null);
      const data = await api.getClaudeOverview();
      if (data.error) throw new Error(data.error);
      setOverview(data);
    } catch (err: unknown) {
      setOverviewError(err instanceof Error ? err.message : 'Claude inventory could not be loaded');
    } finally {
      setLoadingOverview(false);
    }
  };

  // Load CLAUDE.md content
  const loadMarkdown = async () => {
    try {
      setLoadingMarkdown(true);
      const data = await api.getClaudeMd();
      setMarkdownContent(data.content);
    } catch (e) {
      console.error('Failed to load CLAUDE.md:', e);
    } finally {
      setLoadingMarkdown(false);
    }
  };

  useEffect(() => {
    void loadOverview();
    void loadMarkdown();
  }, []);

  const saveMarkdown = async () => {
    setSavingMarkdown(true);
    try {
      await api.updateClaudeMd(markdownContent);
      setMarkdownSaved(true);
      setLastSavedTime(new Date().toLocaleTimeString());
      setTimeout(() => setMarkdownSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save CLAUDE.md:', e);
    } finally {
      setSavingMarkdown(false);
    }
  };

  const syncSkills = async () => {
    setSyncingSkills(true);
    try {
      const data = await api.syncAllSkills();
      alert(`✅ ${data.synced || 'All'} skills successfully synchronized to CLAUDE.md`);
      await loadMarkdown();
    } catch (e) {
      console.error('Skill synchronization failed:', e);
    } finally {
      setSyncingSkills(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void saveMarkdown();
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Subnavigation Tabs */}
      <div className="flex border-b border-white/5 pb-px gap-6">
        <button
          onClick={() => setActiveInnerTab('overview')}
          className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all border-b-2 ${
            activeInnerTab === 'overview'
              ? 'border-orange-500 text-orange-500'
              : 'border-transparent text-muted hover:text-white'
          }`}
        >
          🎛️ Overview & Config
        </button>
        <button
          onClick={() => setActiveInnerTab('guidelines')}
          className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all border-b-2 ${
            activeInnerTab === 'guidelines'
              ? 'border-orange-500 text-orange-500'
              : 'border-transparent text-muted hover:text-white'
          }`}
        >
          📝 Guidelines (CLAUDE.md)
        </button>
      </div>

      {activeInnerTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          {loadingOverview ? (
            <div className="card p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-white/5 rounded w-1/4" />
                <div className="h-32 bg-white/5 rounded" />
              </div>
            </div>
          ) : overviewError || !overview ? (
            <div className="glass-card border-error/20">
              <h3 className="text-lg font-bold text-white mb-2">Claude Code Inventory Offline</h3>
              <p className="text-sm text-muted">{overviewError || 'No Claude data was returned.'}</p>
              <button onClick={loadOverview} className="btn btn-primary btn-sm mt-5">Retry</button>
            </div>
          ) : (
            <>
              {/* Summary Stats Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                <div className="glass-card xl:col-span-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] text-orange-500 font-black uppercase tracking-[0.3em]">Runtime Info</p>
                      <h2 className="text-3xl font-black text-white mt-2">Claude Code</h2>
                      <p className="text-sm text-muted mt-3 max-w-2xl">
                        Active local configuration files, custom agent registry, and instructions loaded in this repository directory.
                      </p>
                    </div>
                    <span className={`badge ${overview.runtime.available ? 'text-orange-400 border-orange-500/30 bg-orange-500/10' : 'text-error border-error/20 bg-error/5'}`}>
                      {overview.runtime.available ? 'Configured' : 'Missing'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    <div className="card-sm">
                      <span className="text-[10px] text-muted font-black uppercase tracking-widest">Global Home</span>
                      <p className="text-xs text-white font-mono break-all mt-2">{overview.runtime.home_dir}</p>
                    </div>
                    <div className="card-sm">
                      <span className="text-[10px] text-muted font-black uppercase tracking-widest">Local Config Path</span>
                      <p className="text-xs text-white font-mono break-all mt-2">{overview.runtime.local_dir}</p>
                    </div>
                  </div>
                </div>

                {[
                  { label: 'Agents Configured', value: overview.agents.length, sub: 'roles registered' },
                  { label: 'System Skills', value: overview.skills.total, sub: 'dashboard skills injected' },
                ].map((stat) => (
                  <div key={stat.label} className="glass-card">
                    <span className="text-[10px] text-muted font-black uppercase tracking-widest">{stat.label}</span>
                    <div className="text-4xl font-black text-white mt-4">{stat.value}</div>
                    <div className="text-xs text-muted mt-2">{stat.sub}</div>
                  </div>
                ))}
              </div>

              {/* Main Content Layout */}
              <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-8">
                {/* Claude Agents */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">Claude Fleet Agents</h3>
                      <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Autonomous roles defined in agents.json</p>
                    </div>
                    <button onClick={loadOverview} className="btn btn-secondary btn-sm">Refresh</button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {overview.agents.length === 0 ? (
                      <div className="glass-card lg:col-span-2 text-center py-12">
                        <p className="text-sm text-muted">No custom agents configured in agents.json</p>
                      </div>
                    ) : (
                      overview.agents.map((agent: any) => (
                        <article key={agent.id} className="glass-card flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-3">
                              <h4 className="text-base font-black text-white truncate">{agent.name}</h4>
                              <span className="badge text-orange-400 border-orange-500/20 bg-orange-500/5">{agent.role || 'Agent'}</span>
                            </div>
                            <p className="text-sm text-muted leading-relaxed mt-4 min-h-[50px]">{agent.description || 'No description provided.'}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-5">
                            {agent.model && (
                              <span className="text-[9px] px-2 py-1 rounded-md bg-white/5 text-orange-400/80 border border-white/5 font-mono">
                                🤖 {agent.model}
                              </span>
                            )}
                            {agent.capabilities && agent.capabilities.map((capability: string) => (
                              <span key={capability} className="text-[9px] px-2 py-1 rounded-md bg-white/5 text-muted border border-white/5 uppercase tracking-wider">
                                {capability}
                              </span>
                            ))}
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>

                {/* Configuration Snapshots */}
                <aside className="space-y-6">
                  <div className="glass-card">
                    <h3 className="text-lg font-bold text-white tracking-tight">Config Snapshot</h3>
                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Local .claude workspace directory</p>
                    
                    <div className="space-y-3 mt-6">
                      {overview.config.files.map((file) => (
                        <div key={file.name} className="flex items-center justify-between gap-4 py-2 border-b border-white/5 last:border-0">
                          <div>
                            <div className="text-sm font-bold text-white font-mono">{file.name}</div>
                            <div className="text-[10px] text-muted mt-1">
                              {file.exists ? `${formatSize(file.size)} · ${formatDate(file.updated_at)}` : 'File not found'}
                            </div>
                          </div>
                          <span className={`badge ${file.exists ? 'text-orange-400 border-orange-500/20 bg-orange-500/5' : 'text-muted border-border bg-surface'}`}>
                            {file.exists ? 'Found' : 'Missing'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      )}

      {activeInnerTab === 'guidelines' && (
        <div className="space-y-6 animate-fade-in">
          {loadingMarkdown ? (
            <div className="glass-card p-12 flex flex-col items-center justify-center animate-pulse">
              <div className="w-16 h-16 bg-white/5 rounded-2xl mb-6" />
              <div className="h-4 bg-white/5 rounded w-48 mb-2" />
              <div className="h-3 bg-white/5 rounded w-32" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-end justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Guidelines (CLAUDE.md)</h3>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Specify prompt rules and environment details for Claude Code</p>
                </div>
                <div className="flex items-center gap-3">
                  {lastSavedTime && (
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      Saved {lastSavedTime}
                    </span>
                  )}
                  <button
                    onClick={syncSkills}
                    disabled={syncingSkills}
                    className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-xl hover:bg-blue-600/30 transition-all text-xs font-medium disabled:opacity-50"
                  >
                    {syncingSkills ? '⏳ Syncing...' : '🔄 Sync Skills'}
                  </button>
                  <button
                    onClick={saveMarkdown}
                    disabled={savingMarkdown}
                    className={`px-5 py-2 rounded-xl text-xs font-medium transition-all ${
                      markdownSaved 
                        ? 'bg-green-600/20 border border-green-500/30 text-green-400'
                        : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25'
                    } disabled:opacity-50`}
                  >
                    {savingMarkdown ? '⏳ Saving...' : markdownSaved ? '✓ Saved!' : '💾 Save (Ctrl+S)'}
                  </button>
                </div>
              </div>

              {/* Editor Workspace */}
              <div className="glass-card rounded-2xl border border-border overflow-hidden p-0">
                {/* Editor Header */}
                <div className="flex items-center justify-between px-5 py-3 bg-zinc-900/50 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/70" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                    <div className="w-3 h-3 rounded-full bg-green-500/70" />
                    <span className="text-xs text-zinc-500 font-mono ml-3">CLAUDE.md</span>
                  </div>
                  <div className="text-xs text-zinc-500 font-mono">
                    {markdownContent.split('\n').length} lines · {markdownContent.length} chars
                  </div>
                </div>

                {/* Text Area */}
                <textarea
                  value={markdownContent}
                  onChange={(e) => setMarkdownContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full h-[calc(100vh-22rem)] p-6 bg-zinc-950/80 text-zinc-300 font-mono text-sm leading-relaxed resize-none focus:outline-none selection:bg-orange-500/20"
                  spellCheck={false}
                  placeholder="# CLAUDE.md guidelines..."
                />
              </div>

              {/* Info Banner */}
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>💡</span>
                <span>
                  Save changes or press Ctrl+S to update CLAUDE.md. Use "Sync Skills" to inject configured capabilities into your instructions.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
