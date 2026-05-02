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
    <div className="glass-card rounded-2xl p-6 border border-border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Agent Summary</h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs text-zinc-500 font-mono">LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
          <div className="text-2xl font-bold text-white">{summary.total}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Total Agents</div>
        </div>
        <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
          <div className="text-2xl font-bold text-green-500">{summary.status.active}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Active</div>
        </div>
        <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
          <div className="text-2xl font-bold text-red-500">{summary.status.error}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Errors</div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Models Distribution</h3>
          <div className="space-y-2">
            {Object.entries(summary.models).map(([model, count]) => (
              <div key={model} className="flex items-center justify-between">
                <span className="text-sm text-zinc-400 font-mono">{model}</span>
                <span className="text-sm text-white font-bold">{count as number}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Status Breakdown</h3>
          <div className="flex gap-2">
            <div className="flex-1 bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-green-500">{summary.status.active}</div>
              <div className="text-[10px] text-zinc-500 uppercase">Active</div>
            </div>
            <div className="flex-1 bg-zinc-500/10 border border-zinc-500/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-zinc-500">{summary.status.inactive}</div>
              <div className="text-[10px] text-zinc-500 uppercase">Inactive</div>
            </div>
            <div className="flex-1 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-red-500">{summary.status.error}</div>
              <div className="text-[10px] text-zinc-500 uppercase">Error</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
