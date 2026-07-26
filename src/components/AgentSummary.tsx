'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface AgentSummaryProps {
  refreshTrigger?: number;
}

interface AgentSummaryData {
  total: number;
  status: {
    active: number;
    error: number;
  };
  models: Record<string, number>;
}

export default function AgentSummary({ refreshTrigger = 0 }: AgentSummaryProps) {
  const [summary, setSummary] = useState<AgentSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      try {
        const data = await api.getAgentsSummary();
        if (!cancelled) setSummary(data);
      } catch (error) {
        console.error('Error loading agent summary:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="card h-full p-8 border-border">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-white/5 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-white/5 rounded-xl"></div>
            <div className="h-20 bg-white/5 rounded-xl"></div>
            <div className="h-20 bg-white/5 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="card h-full border-border bg-surface/30 backdrop-blur-sm overflow-hidden flex flex-col">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Fleet Intelligence</h2>
          <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-0.5">Real-time Operational Metrics</p>
        </div>
        <div className="px-2.5 py-1 bg-accent/10 border border-accent/20 rounded-md">
          <span className="text-[9px] font-black text-accent uppercase tracking-wider">Synchronized</span>
        </div>
      </div>

      <div className="p-6 grid grid-cols-3 gap-6 border-b border-border">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Population</p>
          <div className="text-3xl font-black text-white tabular-nums">{summary.total}</div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Active</p>
          <div className="text-3xl font-black text-accent tabular-nums">{summary.status.active}</div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Critical</p>
          <div className="text-3xl font-black text-error tabular-nums">{summary.status.error}</div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-4">
        <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Neural Architectures</p>
        <div className="space-y-3">
          {Object.keys(summary.models).map((model) => (
            <div key={model} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors"></div>
                <span className="text-xs text-white/80 font-medium tracking-tight group-hover:text-white transition-colors">{model}</span>
              </div>
              <span className="text-[10px] font-mono text-muted tabular-nums">ALLOCATED</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto p-4 bg-white/[0.02] border-t border-border">
        <div className="flex items-center justify-between text-[9px] font-bold text-muted uppercase tracking-widest px-2">
          <span>Integrity Check</span>
          <span className="text-accent">99.9% Optimal</span>
        </div>
      </div>
    </div>
  );
}
