'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface ChatLog {
  id: string;
  agent_id: string;
  role: string;
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export default function ChatLogs() {
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAgent, setFilterAgent] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const data = await api.getAllChatLogs(200);
      setLogs(data.reverse());
    } catch (error) {
      console.error('Error loading chat logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterAgent && !log.agent_id.includes(filterAgent)) return false;
    if (filterRole && log.role !== filterRole) return false;
    return true;
  });

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      user: 'bg-primary/10 border-primary/20 text-primary',
      assistant: 'bg-zinc-900/50 border-zinc-800 text-zinc-300',
      system: 'bg-red-900/10 border-red-900/50 text-red-500',
    };
    return colors[role] || colors.assistant;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      user: 'USER',
      assistant: 'AGENT',
      system: 'SYSTEM',
    };
    return labels[role] || role.toUpperCase();
  };

  const uniqueAgents = [...new Set(logs.map(log => log.agent_id))];

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

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6 border border-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Chat Logs</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-mono">{filteredLogs.length} messages</span>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Filter by Agent</label>
            <select
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-sm focus:border-primary transition-all"
            >
              <option value="">All Agents</option>
              {uniqueAgents.map(agent => (
                <option key={agent} value={agent}>{agent}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Filter by Role</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-sm focus:border-primary transition-all"
            >
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="assistant">Agent</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <div className="text-4xl mb-4 opacity-20">_</div>
              <p className="text-xs uppercase tracking-[0.3em]">No logs found</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`p-4 rounded-lg border transition-all ${getRoleColor(log.role)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {getRoleLabel(log.role)}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">{log.agent_id}</span>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{log.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
