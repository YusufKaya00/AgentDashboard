'use client';

import { useState, useEffect } from 'react';
import { api, connectWebSocket } from '@/lib/api';
import { Agent, Hook, AIModel, ActivityLog, Stats } from '@/types';
import DashboardLayout from '@/components/DashboardLayout';
import StatsCard from '@/components/StatsCard';
import AgentList from '@/components/AgentList';
import ActivityFeed from '@/components/ActivityFeed';
import ModelList from '@/components/ModelList';
import HookList from '@/components/HookList';
import ChatInterface from '@/components/ChatInterface';
import TaskManager from '@/components/TaskManager';
import MemoryManager from '@/components/MemoryManager';
import TrainingInterface from '@/components/TrainingInterface';

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agents' | 'hooks' | 'models' | 'activity' | 'chat' | 'tasks' | 'memory' | 'training'>('dashboard');

  useEffect(() => {
    loadInitialData();

    // WebSocket connection for live updates
    const ws = connectWebSocket((data) => {
      setActivities((prev) => [data, ...prev].slice(0, 100));
      loadStats();
    });

    return () => {
      ws.close();
    };
  }, []);

  const loadInitialData = async () => {
    try {
      const [statsData, agentsData, hooksData, modelsData, activitiesData] = await Promise.all([
        api.getStats(),
        api.getAgents(),
        api.getHooks(),
        api.getModels(),
        api.getActivity(50),
      ]);
      setStats(statsData);
      setAgents(agentsData);
      setHooks(hooksData);
      setModels(modelsData);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await api.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const refreshAgents = async () => {
    const data = await api.getAgents();
    setAgents(data);
    loadStats();
  };

  const refreshHooks = async () => {
    const data = await api.getHooks();
    setHooks(data);
  };

  const refreshModels = async () => {
    const data = await api.getModels();
    setModels(data);
    loadStats();
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-zinc-400">Monitor and manage your AI agents</p>
          </div>

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Total Agents"
                value={stats.total_agents}
                subtitle={`${stats.active_agents} active`}
                color="blue"
              />
              <StatsCard
                title="Total Tasks"
                value={stats.total_tasks}
                subtitle="Active tasks"
                color="green"
              />
              <StatsCard
                title="Total Messages"
                value={stats.total_messages}
                subtitle="Chat history"
                color="purple"
              />
              <StatsCard
                title="Memory"
                value={stats.total_memory}
                subtitle="Stored memories"
                color="orange"
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-white">Recent Agents</h2>
              <AgentList agents={agents.slice(0, 5)} onRefresh={refreshAgents} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-white">Live Activity</h2>
              <ActivityFeed activities={activities.slice(0, 10)} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'agents' && (
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Agent Management</h1>
            <p className="text-zinc-400">Create and manage your AI agents</p>
          </div>
          <AgentList agents={agents} onRefresh={refreshAgents} showAll />
        </div>
      )}

      {activeTab === 'chat' && (
        <ChatInterface agents={agents} />
      )}

      {activeTab === 'tasks' && (
        <TaskManager agents={agents} />
      )}

      {activeTab === 'memory' && (
        <MemoryManager agents={agents} />
      )}

      {activeTab === 'training' && (
        <TrainingInterface agents={agents} />
      )}

      {activeTab === 'hooks' && (
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Hook Management</h1>
            <p className="text-zinc-400">Configure pre, post, and error hooks</p>
          </div>
          <HookList hooks={hooks} onRefresh={refreshHooks} />
        </div>
      )}

      {activeTab === 'models' && (
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Model Management</h1>
            <p className="text-zinc-400">Add and configure AI models</p>
          </div>
          <ModelList models={models} onRefresh={refreshModels} />
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Activity Logs</h1>
            <p className="text-zinc-400">View all system activities</p>
          </div>
          <ActivityFeed activities={activities} showAll />
        </div>
      )}
    </DashboardLayout>
  );
}
