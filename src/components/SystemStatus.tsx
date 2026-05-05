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
      <div className="card-sm bg-surface p-6 animate-pulse border border-border">
        <div className="h-4 bg-white/5 rounded w-1/3 mb-6"></div>
        <div className="space-y-6">
          <div className="h-12 bg-white/5 rounded"></div>
          <div className="h-12 bg-white/5 rounded"></div>
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="card-sm bg-surface relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <svg className="w-20 h-20 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">System Status</h2>
          <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Resource monitoring</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-accent/10 rounded-full border border-accent/20">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
          <span className="text-[10px] text-accent font-bold uppercase tracking-wider">Operational</span>
        </div>
      </div>

      {/* Connection Grid */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="card-sm p-4 bg-background flex flex-col items-center justify-center text-center">
          <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Backend</div>
          <div className={`text-sm font-black uppercase tracking-tighter ${getStatusColor(status.backend)}`}>
            {status.backend}
          </div>
        </div>
        
        <div className="card-sm p-4 bg-background flex flex-col items-center justify-center text-center">
          <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Database</div>
          <div className={`text-sm font-black uppercase tracking-tighter ${getStatusColor(status.database)}`}>
            {status.database}
          </div>
        </div>
        
        <div className="card-sm p-4 bg-background flex flex-col items-center justify-center text-center">
          <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">WebSocket</div>
          <div className={`text-sm font-black uppercase tracking-tighter ${getStatusColor(status.websocket)}`}>
            {status.websocket}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-[10px] text-muted font-bold uppercase tracking-widest">CPU LOAD</span>
            <span className="text-lg font-black text-foreground">{status.resources.cpu_percent}%</span>
          </div>
          <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border p-[2px]">
            <div 
              className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
              style={{ width: `${status.resources.cpu_percent}%` }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-[10px] text-muted font-bold uppercase tracking-widest">MEMORY</span>
            <span className="text-lg font-black text-foreground">{status.resources.memory_percent}%</span>
          </div>
          <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border p-[2px]">
            <div 
              className="h-full rounded-full bg-accent transition-all duration-1000 ease-out"
              style={{ width: `${status.resources.memory_percent}%` }}
            />
          </div>
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-border mt-4">
          <div className="text-[10px] font-bold text-muted uppercase tracking-widest">Uptime</div>
          <div className="text-[10px] font-mono text-foreground">{status.uptime}</div>
        </div>
      </div>
    </div>
  );
}
