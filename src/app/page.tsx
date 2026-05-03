'use client';

import { useState, useEffect } from 'react';
import { api, connectWebSocket } from '@/lib/api';
import { Agent, Hook, AIModel, ActivityLog, Stats } from '@/types';
import DashboardLayout from '@/components/DashboardLayout';
import AgentList from '@/components/AgentList';
import ActivityFeed from '@/components/ActivityFeed';
import ModelList from '@/components/ModelList';
import HookList from '@/components/HookList';
import SkillManager from '@/components/SkillManager';
import SystemStatus from '@/components/SystemStatus';
import AgentSummary from '@/components/AgentSummary';
import CLISessions from '@/components/CLISessions';

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agents' | 'skills' | 'hooks' | 'models' | 'activity' | 'clisessions' | 'system'>('dashboard');

  useEffect(() => {
    loadInitialData();

    // WebSocket connection for live updates
    const ws = connectWebSocket((data) => {
      if (data.type === 'activity') {
        setActivities((prev) => [data.data, ...prev].slice(0, 100));
        loadStats();
      }
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
              v3.0 — MONITORING & MANAGEMENT
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

      {activeTab === 'clisessions' && (
        <CLISessions />
      )}

      {activeTab === 'hooks' && (
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 font-display">Hook Management</h1>
            <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Configure pre, post, and error hooks</p>
          </div>
          <HookList hooks={hooks} onRefresh={refreshHooks} />
        </div>
      )}

      {activeTab === 'models' && (
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 font-display">Model Management</h1>
            <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Add and configure AI models</p>
          </div>
          <ModelList models={models} onRefresh={refreshModels} />
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 font-display">System Activity</h1>
            <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Full audit log of all system events</p>
          </div>
          <ActivityFeed activities={activities} showAll />
        </div>
      )}

      {activeTab === 'skills' && (
        <div className="space-y-8">
          <SkillManager />
        </div>
      )}

      {activeTab === 'system' && (
        <div className="space-y-8">
          <SystemStatus />
        </div>
      )}
    </DashboardLayout>
  );
}
