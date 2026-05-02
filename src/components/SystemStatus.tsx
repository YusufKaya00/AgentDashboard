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
      <div className="glass-card rounded-2xl p-6 border border-border">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-zinc-800 rounded w-1/3"></div>
          <div className="h-8 bg-zinc-800 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-border">
        <p className="text-zinc-500">No system status available</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 border border-border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">System Status</h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs text-zinc-500 font-mono">ONLINE</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">CPU Usage</div>
          <div className="text-2xl font-bold text-white">{status.resources.cpu_percent}%</div>
          <div className="w-full bg-zinc-800 rounded-full h-1 mt-2">
            <div
              className="bg-primary h-1 rounded-full transition-all"
              style={{ width: `${status.resources.cpu_percent}%` }}
            ></div>
          </div>
        </div>
        <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Memory Usage</div>
          <div className="text-2xl font-bold text-white">{status.resources.memory_percent}%</div>
          <div className="w-full bg-zinc-800 rounded-full h-1 mt-2">
            <div
              className="bg-primary h-1 rounded-full transition-all"
              style={{ width: `${status.resources.memory_percent}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Storage Stats</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 text-center">
              <div className="text-lg font-bold text-white">{status.storage.agents_count}</div>
              <div className="text-[10px] text-zinc-500 uppercase">Agents</div>
            </div>
            <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 text-center">
              <div className="text-lg font-bold text-white">{status.storage.skills_count}</div>
              <div className="text-[10px] text-zinc-500 uppercase">Skills</div>
            </div>
            <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 text-center">
              <div className="text-lg font-bold text-white">{status.storage.activity_count}</div>
              <div className="text-[10px] text-zinc-500 uppercase">Activities</div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">System Info</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Platform</span>
              <span className="text-white font-mono">{status.system.platform}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Python</span>
              <span className="text-white font-mono">{status.system.python_version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Last Update</span>
              <span className="text-white font-mono">
                {new Date(status.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
