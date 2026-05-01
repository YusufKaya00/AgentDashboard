'use client';

import { useState, useEffect } from 'react';
import { Agent, TrainingData } from '@/types';
import { api } from '@/lib/api';

interface TrainingInterfaceProps {
  agents: Agent[];
}

export default function TrainingInterface({ agents }: TrainingInterfaceProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [trainingData, setTrainingData] = useState<TrainingData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [formData, setFormData] = useState({
    prompt: '',
    completion: '',
  });

  useEffect(() => {
    if (selectedAgent) {
      loadTrainingData();
    }
  }, [selectedAgent]);

  const loadTrainingData = async () => {
    if (!selectedAgent) return;
    try {
      const data = await api.getTrainingData(selectedAgent.id);
      setTrainingData(data);
    } catch (error) {
      console.error('Error loading training data:', error);
    }
  };

  const handleCreateTrainingData = async () => {
    if (!selectedAgent || !formData.prompt || !formData.completion) return;

    try {
      await api.createTrainingData({
        id: crypto.randomUUID(),
        agent_id: selectedAgent.id,
        prompt: formData.prompt,
        completion: formData.completion,
        created_at: new Date().toISOString(),
        metadata: {}
      });
      setShowModal(false);
      setFormData({ prompt: '', completion: '' });
      loadTrainingData();
    } catch (error) {
      console.error('Error creating training data:', error);
    }
  };

  const handleTrainAgent = async () => {
    if (!selectedAgent) return;

    setIsTraining(true);
    try {
      await api.trainAgent(selectedAgent.id, 10);
      loadTrainingData();
    } catch (error) {
      console.error('Error training agent:', error);
    } finally {
      setIsTraining(false);
    }
  };

  const handleDeleteTrainingData = async (dataId: string) => {
    setTrainingData(prev => prev.filter(d => d.id !== dataId));
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
          <h1 className="text-4xl font-bold text-white mb-2">Training Management</h1>
          <p className="text-zinc-400">Train agents with custom data</p>
        </div>
        {selectedAgent && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all font-medium"
            >
              + Add Data
            </button>
            <button
              onClick={handleTrainAgent}
              disabled={isTraining || trainingData.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl transition-all font-medium shadow-lg shadow-orange-500/25"
            >
              {isTraining ? 'Training...' : 'Train'}
            </button>
          </div>
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
                    <div className="text-xs text-zinc-500 mt-1">
                      {trainingData.length} training samples
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Training Data */}
        <div className="lg:col-span-3">
          {!selectedAgent ? (
            <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-zinc-400">Select an agent to view training data</p>
            </div>
          ) : !Array.isArray(trainingData) || trainingData.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-zinc-400 text-lg">No training data yet</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 text-orange-400 hover:text-orange-300 font-medium"
              >
                Add your first sample
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {trainingData.map((data) => (
                <div
                  key={data.id}
                  className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 p-6 hover:border-zinc-700/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-xs text-zinc-500">
                      {formatTime(data.created_at)}
                    </div>
                    <button
                      onClick={() => handleDeleteTrainingData(data.id)}
                      className="text-zinc-400 hover:text-red-400 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-zinc-500 text-sm font-semibold">Prompt:</span>
                      <div className="bg-zinc-800/50 rounded-xl p-4 mt-2">
                        <p className="text-sm text-zinc-300">{data.prompt}</p>
                      </div>
                    </div>

                    <div>
                      <span className="text-zinc-500 text-sm font-semibold">Completion:</span>
                      <div className="bg-zinc-800/50 rounded-xl p-4 mt-2">
                        <p className="text-sm text-zinc-300">{data.completion}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Training Data Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 border border-zinc-800 p-8">
            <h2 className="text-2xl font-bold mb-6 text-white">Add Training Data</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateTrainingData(); }} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  Prompt
                </label>
                <textarea
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 text-white placeholder-zinc-500 resize-none transition-all"
                  rows={4}
                  placeholder="Input for the agent..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  Completion
                </label>
                <textarea
                  value={formData.completion}
                  onChange={(e) => setFormData({ ...formData, completion: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 text-white placeholder-zinc-500 resize-none transition-all"
                  rows={4}
                  placeholder="Expected output..."
                  required
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
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
