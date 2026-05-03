'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface AgentSummaryProps {
  refreshTrigger?: number;
}

export default function AgentSummary({ refreshTrigger = 0 }: AgentSummaryProps) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, [refreshTrigger]);

  const loadSummary = async () => {
    try {
      const data = await api.getAgentsSummary();
      setSummary(data);
    } catch (error) {
      console.error('Error loading agent summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-border">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-zinc-800 rounded w-1/3"></div>
          <div className="h-8 bg-zinc-800 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-border">
        <p className="text-zinc-500">No agent data available</p>
      </div>
    );
  }

  return (
    <div className="glass-card relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Agent Summary</h2>
          <p className="text-[10px] text-[var(--foreground-muted)] font-bold uppercase tracking-widest mt-1">Multi-Agent State</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-[var(--accent)] bg-opacity-10 rounded-full border border-[var(--accent)] border-opacity-20">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse"></div>
          <span className="text-[10px] text-[var(--accent)] font-bold uppercase tracking-wider">Live Monitoring</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total', value: summary.total, color: 'var(--foreground)' },
          { label: 'Active', value: summary.status.active, color: 'var(--accent)' },
          { label: 'Issues', value: summary.status.error, color: '#ff4b4b' }
        ].map((item, i) => (
          <div key={i} className="bg-white/5 rounded-2xl p-5 border border-white/5 flex flex-col items-center">
            <div className="text-3xl font-black mb-1" style={{ color: item.color }}>{item.value}</div>
            <div className="text-[10px] text-[var(--foreground-muted)] font-bold uppercase tracking-widest">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-[0.2em] mb-4">Model matrix</h3>
          <div className="space-y-3">
            {Object.entries(summary.models).map(([model, count]) => (
              <div key={model} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group/row hover:bg-white/10 transition-colors">
                <span className="text-xs text-white/70 font-mono group-hover/row:text-white transition-colors">{model}</span>
                <div className="flex items-center gap-3">
                  <div className="px-2 py-0.5 rounded-md bg-[var(--primary)] bg-opacity-10 text-[var(--primary)] text-[10px] font-bold uppercase">Active</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
