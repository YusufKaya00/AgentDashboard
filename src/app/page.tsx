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
import SkillManager from '@/components/SkillManager';
import SystemStatus from '@/components/SystemStatus';
import ChatLogs from '@/components/ChatLogs';
import AgentSummary from '@/components/AgentSummary';

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agents' | 'hooks' | 'models' | 'activity' | 'chat' | 'tasks' | 'memory' | 'training' | 'skills' | 'chatlogs' | 'system'>('dashboard');

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
      setAgents(Array.isArray(agentsData) ? agentsData : []);
      setHooks(Array.isArray(hooksData) ? hooksData : []);
      setModels(Array.isArray(modelsData) ? modelsData : []);
      setActivities(Array.isArray(activitiesData) ? activitiesData : []);
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
      <div className="bg-glow top-[-100px] left-[-100px] opacity-40"></div>
      <div className="bg-glow bottom-[-100px] right-[-100px] opacity-20"></div>

      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          <div className="mb-12 border-b border-zinc-900 pb-8">
            <h1 className="text-4xl font-bold text-white tracking-tighter terminal-title">
              AI AGENT <span className="text-primary">CONTROL PANEL</span>
            </h1>
            <p className="text-zinc-500 text-sm mt-4 font-mono">
              v2.0 - MONITORING_READY - SKILLS_ENABLED
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AgentSummary />
            <SystemStatus />
          </div>

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

      {activeTab === 'skills' && (
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Skill Manager</h1>
            <p className="text-zinc-400">Manage and configure AI skills</p>
          </div>
          <SkillManager />
        </div>
      )}

      {activeTab === 'chatlogs' && (
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Chat Logs</h1>
            <p className="text-zinc-400">View all chat history across all agents</p>
          </div>
          <ChatLogs />
        </div>
      )}

      {activeTab === 'system' && (
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">System Status</h1>
            <p className="text-zinc-400">Monitor system health and resources</p>
          </div>
          <SystemStatus />
        </div>
      )}
    </DashboardLayout>
  );
}
