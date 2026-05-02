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
        return 'bg-accent/10 text-accent border-accent/20';
      case 'inactive':
        return 'bg-zinc-800 text-zinc-500 border-zinc-700';
      case 'error':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-zinc-800 text-zinc-500 border-zinc-700';
    }
  };

  const displayAgents = showAll ? agents : agents.slice(0, 5);

  return (
    <div className="space-y-6">
      {showAll && (
        <button
          onClick={handleCreate}
          className="btn-primary px-8 py-3"
        >
          + Initialize New Node
        </button>
      )}

      {displayAgents.length === 0 ? (
        <div className="text-center py-24 bg-secondary border border-border rounded-lg">
          <div className="text-4xl mb-4 opacity-20">_</div>
          <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase">No_Active_Nodes_Detected</p>
        </div>
      ) : (
        <div className="bg-secondary border border-border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-black/50">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Agent_Identity</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Model_Matrix</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">State</th>
                {showAll && (
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Command</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {displayAgents.map((agent) => (
                <tr key={agent.id} className="hover:bg-primary/5 transition-colors group">
                  <td className="px-6 py-6">
                    <div>
                      <div className="text-sm font-bold text-white mb-1">{agent.name}</div>
                      <div className="text-[11px] text-zinc-500 mb-3">{agent.description}</div>
                      <div className="flex flex-wrap gap-2">
                        {agent.capabilities?.map((cap, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-zinc-900 border border-border text-[9px] text-zinc-400 rounded uppercase tracking-wider">
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className="text-xs text-primary">{agent.model}</span>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded border ${getStatusColor(agent.status)}`}>
                      {agent.status}
                    </span>
                  </td>
                  {showAll && (
                    <td className="px-6 py-6 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => handleToggle(agent)} className="p-2 hover:text-primary transition-colors text-zinc-600">
                          {agent.status === 'active' ? 'PAUSE' : 'RUN'}
                        </button>
                        <button onClick={() => handleEdit(agent)} className="p-2 hover:text-white transition-colors text-zinc-600">
                          EDIT
                        </button>
                        <button onClick={() => handleDelete(agent.id)} className="p-2 hover:text-red-500 transition-colors text-zinc-600">
                          KILL
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
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
