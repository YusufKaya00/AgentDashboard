'use client';

import { useState, useEffect } from 'react';
import { Agent, Memory } from '@/types';
import { api } from '@/lib/api';

interface MemoryManagerProps {
  agents: Agent[];
}

export default function MemoryManager({ agents }: MemoryManagerProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    ttl: '',
  });

  useEffect(() => {
    if (selectedAgent) {
      loadMemories();
    }
  }, [selectedAgent]);

  const loadMemories = async () => {
    if (!selectedAgent) return;
    try {
      const data = await api.getMemory(selectedAgent.id);
      setMemories(data);
    } catch (error) {
      console.error('Error loading memories:', error);
    }
  };

  const handleCreateMemory = async () => {
    if (!selectedAgent || !formData.key || !formData.value) return;

    try {
      await api.createMemory({
        id: crypto.randomUUID(),
        agent_id: selectedAgent.id,
        key: formData.key,
        value: formData.value,
        ttl: formData.ttl ? parseInt(formData.ttl) : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setShowModal(false);
      setFormData({ key: '', value: '', ttl: '' });
      loadMemories();
    } catch (error) {
      console.error('Error creating memory:', error);
    }
  };

  const handleDeleteMemory = async (key: string) => {
    if (!selectedAgent) return;
    try {
      await api.deleteMemory(selectedAgent.id, key);
      loadMemories();
    } catch (error) {
      console.error('Error deleting memory:', error);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US');
  };

  const activeAgents = agents.filter(a => a.status === 'active');

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Memory Management</h1>
          <p className="text-zinc-400">Manage agent memory and context</p>
        </div>
        {selectedAgent && (
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl transition-all font-medium shadow-lg shadow-orange-500/25"
          >
            + New Memory
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Agent Selection */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 p-6">
            <h2 className="text-lg font-semibold mb-4 text-white">Select Agent</h2>
            {activeAgents.length === 0 ? (
              <p className="text-zinc-400 text-sm">No active agents</p>
            ) : (
              <div className="space-y-2">
                {activeAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      selectedAgent?.id === agent.id
                        ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/10 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/10'
                        : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <div className="font-semibold">{agent.name}</div>
                    <div className="text-xs text-zinc-500 mt-1">{memories.length} memories</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Memory List */}
        <div className="lg:col-span-3">
          {!selectedAgent ? (
            <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
              <div className="text-6xl mb-4">🧠</div>
              <p className="text-zinc-400">Select an agent to view memory</p>
            </div>
          ) : !Array.isArray(memories) || memories.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-zinc-400 text-lg">No memories yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 p-6 hover:border-zinc-700/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{memory.key}</h3>
                      <div className="text-xs text-zinc-500 mt-1">
                        Updated: {formatTime(memory.updated_at)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteMemory(memory.key)}
                      className="text-zinc-400 hover:text-red-400 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="bg-zinc-800/50 rounded-xl p-4">
                    <pre className="text-sm text-zinc-300 whitespace-pre-wrap break-all">
                      {typeof memory.value === 'object'
                        ? JSON.stringify(memory.value, null, 2)
                        : String(memory.value)}
                    </pre>
                  </div>

                  {memory.ttl && (
                    <div className="text-xs text-zinc-500 mt-3">
                      TTL: {memory.ttl} seconds
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Memory Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-zinc-800 p-8">
            <h2 className="text-2xl font-bold mb-6 text-white">Create New Memory</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateMemory(); }} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  Key
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 text-white placeholder-zinc-500 transition-all"
                  placeholder="e.g., user_preferences"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  Value
                </label>
                <textarea
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 text-white placeholder-zinc-500 resize-none transition-all"
                  rows={4}
                  placeholder="Value to store in memory"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  TTL (seconds) - Optional
                </label>
                <input
                  type="number"
                  value={formData.ttl}
                  onChange={(e) => setFormData({ ...formData, ttl: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 text-white placeholder-zinc-500 transition-all"
                  placeholder="e.g., 3600"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border border-zinc-700 rounded-xl hover:bg-zinc-800 transition-all text-zinc-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl transition-all font-medium shadow-lg shadow-orange-500/25"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
