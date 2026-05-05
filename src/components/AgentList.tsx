'use client';

import { useState } from 'react';
import { Agent } from '@/types';
import { api } from '@/lib/api';
import AgentModal from './AgentModal';

interface AgentListProps {
  agents: Agent[];
  onRefresh: () => void;
  showAll?: boolean;
}

export default function AgentList({ agents, onRefresh, showAll = false }: AgentListProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const handleCreate = () => {
    setSelectedAgent(null);
    setShowModal(true);
  };

  const handleEdit = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this agent?')) {
      await api.deleteAgent(id);
      onRefresh();
    }
  };

  const handleToggle = async (agent: Agent) => {
    if (agent.status === 'active') {
      await api.deactivateAgent(agent.id);
    } else {
      await api.activateAgent(agent.id);
    }
    onRefresh();
  };

  const handleSave = async (agent: Agent) => {
    if (selectedAgent) {
      await api.updateAgent(agent.id, agent);
    } else {
      await api.createAgent(agent);
    }
    setShowModal(false);
    onRefresh();
  };

  const displayAgents = showAll ? agents : agents.slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Agent Registry</h2>
          <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Autonomous Entity Management</p>
        </div>
        {showAll && (
          <button onClick={handleCreate} className="btn btn-primary btn-sm px-4">
            New Agent
          </button>
        )}
      </div>

      <div className="card p-0 overflow-hidden border-border bg-surface/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-white/[0.02]">
                <th className="px-6 py-4 text-[10px] font-black text-muted uppercase tracking-widest">Name & Model</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted uppercase tracking-widest">Capabilities</th>
                {showAll && <th className="px-6 py-4 text-[10px] font-black text-muted uppercase tracking-widest text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {displayAgents.length === 0 ? (
                <tr>
                  <td colSpan={showAll ? 5 : 4} className="px-6 py-12 text-center text-muted text-sm">
                    No agents found in the registry.
                  </td>
                </tr>
              ) : (
                displayAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{agent.name}</span>
                        <span className="text-[10px] text-muted font-mono mt-0.5">{agent.model}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${
                        agent.status === 'active' ? 'text-accent border-accent/20 bg-accent/5' : 
                        agent.status === 'error' ? 'text-error border-error/20 bg-error/5' : 
                        'text-muted border-border bg-surface'
                      }`}>
                        {agent.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-white/70 font-medium">{agent.role || 'Agent'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {agent.capabilities?.slice(0, 3).map((cap, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-muted border border-white/5">
                            {cap}
                          </span>
                        ))}
                        {agent.capabilities && agent.capabilities.length > 3 && (
                          <span className="text-[9px] text-muted px-1">+{agent.capabilities.length - 3}</span>
                        )}
                      </div>
                    </td>
                    {showAll && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleToggle(agent)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              agent.status === 'active' ? 'hover:bg-error/10 hover:text-error border-transparent' : 'hover:bg-accent/10 hover:text-accent border-transparent'
                            }`}
                            title={agent.status === 'active' ? 'Suspend' : 'Resume'}
                          >
                            {agent.status === 'active' ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                            )}
                          </button>
                          <button onClick={() => handleEdit(agent)} className="p-1.5 rounded-lg border border-transparent hover:border-border hover:bg-white/5 text-muted hover:text-white transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(agent.id)} className="p-1.5 rounded-lg border border-transparent hover:bg-error/10 text-muted hover:text-error transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <AgentModal
          agent={selectedAgent}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
