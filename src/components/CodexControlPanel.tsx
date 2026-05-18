'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { CodexOverview } from '@/types';

const sourceStyles = {
  system: 'text-info border-info/20 bg-info/10',
  plugin: 'text-secondary border-secondary/20 bg-secondary/10',
  user: 'text-primary border-primary/20 bg-primary/10',
};

const formatDate = (value: string | null) => {
  if (!value) return 'Not found';
  return new Date(value).toLocaleString();
};

const getSessionLabel = (session: Record<string, unknown>) => {
  return String(session.title || session.id || session.session_id || session.path || 'Codex session');
};

export default function CodexControlPanel() {
  const [overview, setOverview] = useState<CodexOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<'all' | 'system' | 'plugin' | 'user'>('all');

  const loadOverview = async () => {
    try {
      setError(null);
      const data = await api.getCodexOverview();
      if (data.error) throw new Error(data.error);
      setOverview(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Codex inventory could not be loaded');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOverview();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const visibleSkills = useMemo(() => {
    if (!overview) return [];
    if (selectedSource === 'all') return overview.skills.items;
    return overview.skills.items.filter((skill) => skill.source === selectedSource);
  }, [overview, selectedSource]);

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-surface rounded w-1/4" />
          <div className="h-32 bg-surface rounded" />
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="glass-card border-error/20">
        <h3 className="text-lg font-bold text-white mb-2">Codex Inventory Offline</h3>
        <p className="text-sm text-muted">{error || 'No Codex data was returned.'}</p>
        <button onClick={loadOverview} className="btn btn-primary btn-sm mt-5">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="glass-card xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] text-primary font-black uppercase tracking-[0.3em]">Runtime</p>
              <h2 className="text-3xl font-black text-white mt-2">Codex Control</h2>
              <p className="text-sm text-muted mt-3 max-w-2xl">
                Active workspace inventory for Codex agents, installed skills, local config, and recent session index.
              </p>
            </div>
            <span className={`badge ${overview.runtime.available ? 'text-accent border-accent/20 bg-accent/5' : 'text-error border-error/20 bg-error/5'}`}>
              {overview.runtime.available ? 'Available' : 'Missing'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <div className="card-sm">
              <span className="text-[10px] text-muted font-black uppercase tracking-widest">Codex Home</span>
              <p className="text-xs text-white font-mono break-all mt-2">{overview.runtime.codex_home}</p>
            </div>
            <div className="card-sm">
              <span className="text-[10px] text-muted font-black uppercase tracking-widest">Workspace</span>
              <p className="text-xs text-white font-mono break-all mt-2">{overview.runtime.workspace_dir}</p>
            </div>
          </div>
        </div>

        {[
          { label: 'Agents', value: overview.agents.length, sub: 'default roles' },
          { label: 'Skills', value: overview.skills.total, sub: 'system + plugin + user' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card">
            <span className="text-[10px] text-muted font-black uppercase tracking-widest">{stat.label}</span>
            <div className="text-4xl font-black text-white mt-4">{stat.value}</div>
            <div className="text-xs text-muted mt-2">{stat.sub}</div>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Codex Agents</h3>
            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Manageable roles exposed by the Codex harness</p>
          </div>
          <button onClick={loadOverview} className="btn btn-secondary btn-sm">Refresh</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {overview.agents.map((agent) => (
            <article key={agent.id} className="glass-card">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-lg font-black text-white">{agent.name}</h4>
                <span className="badge text-primary border-primary/20 bg-primary/5">{agent.role}</span>
              </div>
              <p className="text-sm text-muted leading-relaxed mt-4 min-h-[72px]">{agent.description}</p>
              <div className="flex flex-wrap gap-2 mt-5">
                {agent.capabilities.map((capability) => (
                  <span key={capability} className="text-[9px] px-2 py-1 rounded-md bg-white/5 text-muted border border-white/5 uppercase tracking-wider">
                    {capability}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-8">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Skill Inventory</h3>
              <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Installed Codex capabilities</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'system', 'plugin', 'user'] as const).map((source) => (
                <button
                  key={source}
                  onClick={() => setSelectedSource(source)}
                  className={`btn btn-sm ${selectedSource === source ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {source === 'all' ? 'All' : `${source} ${overview.skills.by_source[source]}`}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="max-h-[560px] overflow-y-auto custom-scrollbar divide-y divide-border/60">
              {visibleSkills.map((skill) => (
                <div key={`${skill.source}-${skill.file_path}`} className="p-5 hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-black text-white">{skill.name}</h4>
                      <p className="text-sm text-muted mt-2 leading-relaxed">{skill.description}</p>
                    </div>
                    <span className={`badge ${sourceStyles[skill.source]}`}>{skill.source}</span>
                  </div>
                  <div className="text-[10px] text-white/40 font-mono break-all mt-4">{skill.file_path}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card">
            <h3 className="text-xl font-bold text-white tracking-tight">Config Snapshot</h3>
            <div className="space-y-3 mt-5">
              {overview.config.files.map((file) => (
                <div key={file.name} className="flex items-center justify-between gap-4 py-2 border-b border-white/5 last:border-0">
                  <div>
                    <div className="text-sm font-bold text-white">{file.name}</div>
                    <div className="text-[10px] text-muted">{formatDate(file.updated_at)}</div>
                  </div>
                  <span className={`badge ${file.exists ? 'text-accent border-accent/20 bg-accent/5' : 'text-muted border-border bg-surface'}`}>
                    {file.exists ? 'Found' : 'Missing'}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 p-4 rounded-lg bg-black/20 border border-white/5">
              {Object.entries(overview.config.redacted).slice(0, 8).map(([key, value]) => (
                <div key={key} className="grid grid-cols-[120px_1fr] gap-3 text-xs py-1">
                  <span className="text-muted font-mono truncate">{key}</span>
                  <span className="text-white font-mono truncate">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card">
            <h3 className="text-xl font-bold text-white tracking-tight">Recent Sessions</h3>
            <div className="space-y-3 mt-5">
              {overview.sessions.recent.length === 0 ? (
                <p className="text-sm text-muted">No Codex sessions indexed yet.</p>
              ) : (
                overview.sessions.recent.map((session, index) => (
                  <div key={index} className="p-3 rounded-lg bg-white/5 border border-white/5">
                    <div className="text-sm font-bold text-white truncate">{getSessionLabel(session)}</div>
                    <div className="text-[10px] text-muted font-mono truncate mt-1">
                      {String(session.workspace || session.cwd || session.updated_at || '')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
