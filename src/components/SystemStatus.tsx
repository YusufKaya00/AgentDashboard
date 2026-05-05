'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface SystemStatusData {
  backend: string;
  database: string;
  websocket: string;
  resources: {
    cpu_percent: number;
    memory_percent: number;
    memory_used_mb: number;
  };
  uptime: string;
  version: string;
}

export default function SystemStatus({ refreshTrigger = 0 }) {
  const [status, setStatus] = useState<SystemStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, [refreshTrigger]);

  const loadStatus = async () => {
    try {
      const data = await api.getSystemStatus();
      setStatus(data);
    } catch (e) {
      console.error('Failed to load system status:', e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (statusStr: string) => {
    switch (statusStr?.toLowerCase()) {
      case 'online':
      case 'connected': return 'text-accent';
      case 'warning': return 'text-warning';
      case 'error':
      case 'disconnected': return 'text-error';
      default: return 'text-muted';
    }
  };

  if (loading) {
    return (
      <div className="card h-full p-8 border-border">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-white/5 rounded w-1/3"></div>
          <div className="space-y-4">
            <div className="h-4 bg-white/5 rounded w-full"></div>
            <div className="h-4 bg-white/5 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="card h-full border-border bg-surface/30 backdrop-blur-sm overflow-hidden flex flex-col">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">System Core</h2>
          <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-0.5">Infrastructure Monitoring</p>
        </div>
        <div className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-md">
          <span className="text-[9px] font-black text-white/50 uppercase tracking-wider">v5.0 Stable</span>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Resource Bars */}
        <div className="space-y-8">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-muted font-black uppercase tracking-widest">Processing Unit</span>
              <span className="text-sm font-bold text-white tabular-nums">{status.resources.cpu_percent}%</span>
            </div>
            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(217,119,87,0.3)]"
                style={{ width: `${status.resources.cpu_percent}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-muted font-black uppercase tracking-widest">Memory Matrix</span>
              <span className="text-sm font-bold text-white tabular-nums">{status.resources.memory_percent}%</span>
            </div>
            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-accent transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,200,83,0.3)]"
                style={{ width: `${status.resources.memory_percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="grid grid-cols-1 gap-3">
          {[
            { label: 'Neural Backend', status: status.backend },
            { label: 'Data Warehouse', status: status.database },
            { label: 'Signal Link', status: status.websocket }
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] font-bold text-muted uppercase tracking-widest">{item.label}</span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${getStatusColor(item.status)}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto p-4 bg-white/[0.02] border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-3 px-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_10px_rgba(0,200,83,0.5)]"></div>
          <span className="text-[9px] font-bold text-muted uppercase tracking-widest">Pulse Active</span>
        </div>
        <div className="text-[9px] font-mono text-muted/50 uppercase tracking-widest">
          Uptime: {status.uptime}
        </div>
      </div>
    </div>
  );
}
