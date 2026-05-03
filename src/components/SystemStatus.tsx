'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface SystemStatusProps {
  refreshTrigger?: number;
}

export default function SystemStatus({ refreshTrigger = 0 }: SystemStatusProps) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, [refreshTrigger]);

  const loadStatus = async () => {
    try {
      const data = await api.getSystemStatus();
      setStatus(data);
    } catch (error) {
      console.error('Error loading system status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-surface rounded w-1/3"></div>
          <div className="h-8 bg-surface rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="card p-6">
        <p className="text-foreground-muted">No system status available</p>
      </div>
    );
  }

  return (
    <div className="glass-card relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">System Status</h2>
          <p className="text-[10px] text-[var(--foreground-muted)] font-bold uppercase tracking-widest mt-1">Resource monitoring</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-[var(--accent)] bg-opacity-10 rounded-full border border-[var(--accent)] border-opacity-20">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse"></div>
          <span className="text-[10px] text-[var(--accent)] font-bold uppercase tracking-wider">Operational</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-[10px] text-[var(--foreground-muted)] font-bold uppercase tracking-widest">CPU LOAD</span>
            <span className="text-lg font-black text-white">{status.resources.cpu_percent}%</span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[2px]">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[#e89a7f] transition-all duration-1000 ease-out"
              style={{ width: `${status.resources.cpu_percent}%` }}
            />
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-[10px] text-[var(--foreground-muted)] font-bold uppercase tracking-widest">MEMORY</span>
            <span className="text-lg font-black text-white">{status.resources.memory_percent}%</span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[2px]">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[#00e676] transition-all duration-1000 ease-out shadow-[0_0_10px_var(--accent)]"
              style={{ width: `${status.resources.memory_percent}%`, boxShadow: '0 0 10px var(--accent-glow)' }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { val: status.storage.agents_count, lab: 'Agents' },
          { val: status.storage.skills_count, lab: 'Skills' },
          { val: status.storage.activity_count, lab: 'Events' }
        ].map((s, i) => (
          <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/5 text-center group/stat hover:bg-white/10 transition-colors">
            <div className="text-xl font-black text-white group-hover/stat:text-[var(--primary)] transition-colors">{s.val}</div>
            <div className="text-[10px] text-[var(--foreground-muted)] font-bold uppercase tracking-widest mt-1">{s.lab}</div>
          </div>
        ))}
      </div>

      <div className="p-5 bg-black/20 rounded-2xl border border-white/5">
        <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-[11px]">
          <div className="space-y-1">
            <div className="text-[var(--foreground-muted)] font-bold uppercase tracking-widest">Platform</div>
            <div className="text-white font-mono">{status.system.platform}</div>
          </div>
          <div className="space-y-1">
            <div className="text-[var(--foreground-muted)] font-bold uppercase tracking-widest">Runtime</div>
            <div className="text-white font-mono">Node.js {process.version}</div>
          </div>
          <div className="space-y-1">
            <div className="text-[var(--foreground-muted)] font-bold uppercase tracking-widest">Last Update</div>
            <div className="text-white font-mono">{new Date(status.timestamp).toLocaleTimeString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
