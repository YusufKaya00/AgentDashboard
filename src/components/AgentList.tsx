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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'inactive':
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
      case 'error':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
    }
  };

  const displayAgents = showAll ? agents : agents.slice(0, 5);

  return (
    <div className="space-y-4">
      {showAll && (
        <button
          onClick={handleCreate}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl transition-all duration-200 font-medium shadow-lg shadow-orange-500/25"
        >
          + New Agent
        </button>
      )}

      {displayAgents.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
          <div className="text-6xl mb-4">🤖</div>
          <p className="text-zinc-400 text-lg">No agents yet</p>
          {showAll && (
            <button
              onClick={handleCreate}
              className="mt-4 text-orange-400 hover:text-orange-300 font-medium"
            >
              Create your first agent
            </button>
          )}
        </div>
      ) : (
        <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 overflow-hidden">
          <table className="min-w-full divide-y divide-zinc-800/50">
            <thead className="bg-zinc-800/30">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
                {showAll && (
                  <th className="px-6 py-4 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {displayAgents.map((agent) => (
                <tr key={agent.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-semibold text-white">{agent.name}</div>
                      <div className="text-sm text-zinc-500">{agent.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-zinc-300">{agent.model}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${getStatusColor(agent.status)}`}>
                      {agent.status}
                    </span>
                  </td>
                  {showAll && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleToggle(agent)}
                          className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-orange-400 transition-all flex items-center justify-center"
                        >
                          {agent.status === 'active' ? '⏸️' : '▶️'}
                        </button>
                        <button
                          onClick={() => handleEdit(agent)}
                          className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-orange-400 transition-all flex items-center justify-center"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(agent.id)}
                          className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-all flex items-center justify-center"
                        >
                          🗑️
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
