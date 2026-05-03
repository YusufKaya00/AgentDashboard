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
import TaskManager from '@/components/TaskManager';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import Terminal from '@/components/Terminal';
import AIProviderManager from '@/components/AIProviderManager';
import CLAUDEEditor from '@/components/CLAUDEEditor';

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agents' | 'skills' | 'hooks' | 'models' | 'activity' | 'clisessions' | 'system' | 'tasks' | 'analytics' | 'terminal' | 'providers' | 'claude-editor'>('dashboard');

  useEffect(() => {
    loadInitialData();

    const ws = connectWebSocket((data) => {
      if (data.type === 'activity') {
        setActivities((prev) => [data.data, ...prev].slice(0, 100));
        loadStats();
      }
    });

    return () => ws.close();
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

  const PageHeader = ({ title, subtitle, accent = "Intelligence" }: { title: string, subtitle: string, accent?: string }) => (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#d97757] animate-pulse" />
        <span className="text-[10px] font-black text-[#d97757] uppercase tracking-[0.3em]">System {accent}</span>
      </div>
      <h1 className="text-3xl font-black text-white tracking-tight">
        {title} <span className="text-[#8e8e93] font-light">{subtitle}</span>
      </h1>
    </div>
  );

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
                <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.3em]">System Intelligence</span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Dashboard <span className="text-[var(--foreground-muted)] font-light">Overview</span>
              </h1>
            </div>
            <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/5">
              <div className="px-4 py-2 bg-[var(--primary)] bg-opacity-10 rounded-xl border border-[var(--primary)] border-opacity-20">
                <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest">v5.0 Stable</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <AgentSummary />
            <SystemStatus />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="w-1 h-5 bg-[var(--primary)] rounded-full" />
                Recent Agents
              </h2>
              <AgentList agents={agents.slice(0, 5)} onRefresh={refreshAgents} />
            </div>
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="w-1 h-5 bg-[var(--accent)] rounded-full" />
                Live Activity
              </h2>
              <ActivityFeed activities={activities.slice(0, 10)} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="Task" subtitle="Orchestration" accent="Flow" />
          <TaskManager />
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="System" subtitle="Analytics" accent="Insights" />
          <AnalyticsDashboard />
        </div>
      )}

      {activeTab === 'terminal' && (
        <div className="animate-fade-in space-y-6 h-[calc(100vh-120px)]">
          <PageHeader title="Direct" subtitle="Terminal" accent="Command" />
          <Terminal />
        </div>
      )}

      {activeTab === 'agents' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="Agent" subtitle="Management" accent="Nodes" />
          <AgentList agents={agents} onRefresh={refreshAgents} showAll />
        </div>
      )}

      {activeTab === 'clisessions' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="CLI" subtitle="Sessions" accent="Active" />
          <CLISessions />
        </div>
      )}

      {activeTab === 'hooks' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="Hook" subtitle="Management" accent="Interceptors" />
          <HookList hooks={hooks} onRefresh={refreshHooks} />
        </div>
      )}

      {activeTab === 'models' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="Model" subtitle="Inventory" accent="Neural Engines" />
          <ModelList models={models} onRefresh={refreshModels} />
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="System" subtitle="Activity" accent="Audit Log" />
          <ActivityFeed activities={activities} showAll />
        </div>
      )}

      {activeTab === 'skills' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="Skill" subtitle="Manager" accent="Capabilities" />
          <SkillManager />
        </div>
      )}

      {activeTab === 'providers' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="AI" subtitle="Providers" accent="Connectivity" />
          <AIProviderManager />
        </div>
      )}

      {activeTab === 'claude-editor' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="CLAUDE.md" subtitle="Editor" accent="Documentation" />
          <CLAUDEEditor />
        </div>
      )}

      {activeTab === 'system' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="System" subtitle="Diagnostics" accent="Resources" />
          <SystemStatus />
        </div>
      )}
    </DashboardLayout>
  );
}
