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
    if (confirm('Are you sure you want to delete this node?')) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-accent/10 text-accent border-accent/30';
      case 'inactive':
        return 'bg-surface text-foreground-muted border-border';
      case 'error':
        return 'bg-error/10 text-error border-error/30';
      default:
        return 'bg-surface text-foreground-muted border-border';
    }
  };

  const displayAgents = showAll ? agents : agents.slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Agent <span className="text-[var(--foreground-muted)] font-light">Nodes</span></h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse"></span>
            <p className="text-[10px] text-[var(--foreground-muted)] font-bold uppercase tracking-[0.2em]">Active Neural Network</p>
          </div>
        </div>
        {showAll && (
          <button
            onClick={handleCreate}
            className="btn btn-primary"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Deploy New Agent</span>
          </button>
        )}
      </div>

      {displayAgents.length === 0 ? (
        <div className="glass-card p-20 text-center border-dashed border-white/10">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Active Nodes Detected</h3>
          <p className="text-sm text-[var(--foreground-muted)]">The neural network is currently dormant. Deploy an agent to begin operations.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayAgents.map((agent) => (
            <div 
              key={agent.id} 
              className={`glass-card group flex flex-col ${
                agent.status !== 'active' ? 'opacity-50 grayscale' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[var(--primary-glow)] flex items-center justify-center border border-[var(--primary)] border-opacity-20 group-hover:scale-110 transition-transform">
                  <span className="text-xl">🤖</span>
                </div>
                <div className={`badge ${getStatusColor(agent.status)}`}>
                  {agent.status}
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-[var(--primary)] transition-colors">{agent.name}</h3>
                <p className="text-xs text-[var(--foreground-muted)] leading-relaxed mb-4 line-clamp-2">{agent.description}</p>
                
                <div className="space-y-4 mb-6">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Model Matrix</span>
                    <span className="text-[11px] font-mono font-bold text-[var(--primary)]">{agent.model}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {agent.capabilities?.map((cap, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[9px] font-bold text-white/60 group-hover:text-white transition-colors">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {showAll && (
                <div className="flex items-center gap-2 pt-4 border-t border-white/5 mt-auto">
                  <button onClick={() => handleToggle(agent)} className="btn btn-secondary flex-1 text-xs py-1.5">
                    {agent.status === 'active' ? 'Suspend' : 'Resume'}
                  </button>
                  <button onClick={() => handleEdit(agent)} className="btn btn-secondary p-2 hover:text-[var(--primary)]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(agent.id)} className="btn btn-secondary p-2 hover:text-red-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
