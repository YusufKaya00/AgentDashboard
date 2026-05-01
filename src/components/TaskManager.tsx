'use client';

import { useState, useEffect } from 'react';
import { Agent, Task } from '@/types';
import { api } from '@/lib/api';

interface TaskManagerProps {
  agents: Agent[];
}

export default function TaskManager({ agents }: TaskManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    agent_id: '',
    description: '',
  });

  useEffect(() => {
    loadTasks();
  }, [selectedAgent]);

  const loadTasks = async () => {
    try {
      const data = await api.getTasks(selectedAgent || undefined);
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const handleCreateTask = async () => {
    if (!formData.agent_id || !formData.description) return;

    try {
      await api.createTask({
        id: crypto.randomUUID(),
        agent_id: formData.agent_id,
        description: formData.description,
        status: 'pending',
        created_at: new Date().toISOString(),
        metadata: {}
      });
      setShowModal(false);
      setFormData({ agent_id: '', description: '' });
      loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleExecuteTask = async (taskId: string) => {
    try {
      await api.executeTask(taskId);
      loadTasks();
    } catch (error) {
      console.error('Error executing task:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'in_progress':
        return '🔄';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '❓';
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
          <h1 className="text-4xl font-bold text-white mb-2">Task Management</h1>
          <p className="text-zinc-400">Create and manage agent tasks</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl transition-all font-medium shadow-lg shadow-orange-500/25"
        >
          + New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={selectedAgent || ''}
          onChange={(e) => setSelectedAgent(e.target.value || null)}
          className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 transition-all"
        >
          <option value="">All Agents</option>
          {activeAgents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </div>

      {/* Task List */}
      {!Array.isArray(tasks) || tasks.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-zinc-400 text-lg">No tasks yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 p-6 hover:border-zinc-700/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getStatusIcon(task.status)}</span>
                  <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>
                {task.status === 'pending' && (
                  <button
                    onClick={() => handleExecuteTask(task.id)}
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm rounded-xl transition-all font-medium shadow-lg shadow-orange-500/25"
                  >
                    Execute
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-zinc-500 text-sm">Task:</span>
                  <p className="text-white mt-1">{task.description}</p>
                </div>

                <div>
                  <span className="text-zinc-500 text-sm">Agent:</span>
                  <p className="text-zinc-300 mt-1">
                    {agents.find(a => a.id === task.agent_id)?.name || 'Unknown'}
                  </p>
                </div>

                <div className="text-xs text-zinc-500">
                  <div>Created: {formatTime(task.created_at)}</div>
                  {task.completed_at && (
                    <div>Completed: {formatTime(task.completed_at)}</div>
                  )}
                </div>

                {task.result && (
                  <div>
                    <span className="text-zinc-500 text-sm">Result:</span>
                    <p className="text-zinc-300 mt-1 text-sm bg-zinc-800/50 p-3 rounded-xl">
                      {task.result}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-zinc-800 p-8">
            <h2 className="text-2xl font-bold mb-6 text-white">Create New Task</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateTask(); }} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  Agent
                </label>
                <select
                  value={formData.agent_id}
                  onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 text-white transition-all"
                  required
                >
                  <option value="">Select an agent</option>
                  {activeAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  Task Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 text-white placeholder-zinc-500 resize-none transition-all"
                  rows={4}
                  placeholder="Describe the task..."
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
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
