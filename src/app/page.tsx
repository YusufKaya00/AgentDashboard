/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect } from 'react';
import { api, connectWebSocket } from '@/lib/api';
import { Agent, Hook, AIModel, ActivityLog, RuntimeOverview } from '@/types';
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
import CodexControlPanel from '@/components/CodexControlPanel';
import AntigravityControlPanel from '@/components/AntigravityControlPanel';
import ClaudeControlPanel from '@/components/ClaudeControlPanel';

const PageHeader = ({ title, subtitle, accent = "Intelligence" }: { title: string, subtitle: string, accent?: string }) => (
  <div className="mb-6">
    <div className="mb-1 text-[10px] font-semibold text-zinc-600">{accent}</div>
    <h1 className="text-2xl font-semibold text-white">
      {title} <span className="font-normal text-zinc-500">{subtitle}</span>
    </h1>
  </div>
);

type DashboardTab = 'dashboard' | 'agents' | 'claude' | 'antigravity' | 'skills' | 'clisessions' | 'codex' | 'terminal' | 'tasks' | 'activity' | 'system' | 'hooks' | 'analytics' | 'models';

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [runtimeOverviews, setRuntimeOverviews] = useState<RuntimeOverview[]>([]);
  const [runtimeConnection, setRuntimeConnection] = useState<'loading' | 'connected' | 'error'>('loading');
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');

  const mapRuntimesToAgents = (overviews: RuntimeOverview[]): Agent[] => {
    const mapped: Agent[] = [];
    for (const overview of overviews) {
      for (const thread of overview.threads) {
        mapped.push({
          id: `${overview.runtime.id}:thread:${thread.id}`,
          name: thread.nickname || thread.title,
          description: thread.is_subagent
            ? `Subagent run${thread.role ? ` · ${thread.role}` : ''}`
            : 'Runtime session',
          model: thread.model || 'Runtime default',
          status: thread.status === 'running'
            ? 'active'
            : thread.status === 'failed'
              ? 'error'
              : 'inactive',
          config: {
            type: 'runtime_thread',
            runtime_id: overview.runtime.id,
            thread_id: thread.id,
            parent_id: thread.parent_id,
          },
          created_at: thread.created_at || '',
          updated_at: thread.updated_at || '',
          last_activity: thread.updated_at || undefined,
          role: thread.is_subagent ? 'worker' : 'team_lead',
          capabilities: [
            thread.is_subagent ? 'subagent' : 'session',
            thread.inferred ? 'observed' : 'native-index',
          ],
          skills: [],
          runtime: overview.runtime.id,
        });
      }
      for (const definition of overview.agents) {
        mapped.push({
          id: `${overview.runtime.id}:${definition.scope}:${definition.id}`,
          name: definition.name,
          description: definition.description || 'Native agent definition',
          model: definition.model || 'Runtime default',
          status: definition.scope === 'legacy' ? 'inactive' : 'active',
          config: {
            type: 'runtime_definition',
            runtime_id: overview.runtime.id,
            scope: definition.scope,
            native_id: definition.id,
            file_path: definition.file_path,
            editable: definition.editable,
          },
          created_at: '',
          updated_at: definition.updated_at || '',
          role: definition.scope === 'builtin' ? 'specialist' : 'worker',
          capabilities: ['definition', definition.scope],
          skills: definition.skills,
          runtime: overview.runtime.id,
        });
      }
    }
    return mapped;
  };

  const loadInitialData = async () => {
    setRuntimeConnection('loading');
    const [runtimesResult, hooksResult, modelsResult, activitiesResult] = await Promise.allSettled([
      api.getRuntimeOverviews(),
      api.getHooks(),
      api.getModels(),
      api.getActivity(50),
    ]);

    if (runtimesResult.status === 'fulfilled') {
      setRuntimeOverviews(runtimesResult.value);
      setAgents(mapRuntimesToAgents(runtimesResult.value));
      setRuntimeConnection('connected');
    } else {
      setRuntimeConnection('error');
      console.error('Error loading runtime inventory:', runtimesResult.reason);
    }

    if (hooksResult.status === 'fulfilled') {
      setHooks(Array.isArray(hooksResult.value) ? hooksResult.value : []);
    } else {
      console.error('Error loading hooks:', hooksResult.reason);
    }

    if (modelsResult.status === 'fulfilled') {
      setModels(Array.isArray(modelsResult.value) ? modelsResult.value : []);
    } else {
      console.error('Error loading models:', modelsResult.reason);
    }

    if (activitiesResult.status === 'fulfilled') {
      setActivities(Array.isArray(activitiesResult.value) ? activitiesResult.value : []);
    } else {
      console.error('Error loading activity:', activitiesResult.reason);
    }
  };

  useEffect(() => {
    loadInitialData();

    const ws = connectWebSocket((data) => {
      if (data.type === 'activity') {
        setActivities((prev) => [data.data, ...prev].slice(0, 100));
      }
    });

    return () => ws.close();
  }, []);

  const refreshAgents = async () => {
    setRuntimeConnection('loading');
    try {
      const runtimesData = await api.getRuntimeOverviews();
      setRuntimeOverviews(runtimesData);
      setAgents(mapRuntimesToAgents(runtimesData));
      setRuntimeConnection('connected');
    } catch (error) {
      setRuntimeConnection('error');
      console.error('Error refreshing agents:', error);
    }
  };

  const refreshHooks = async () => {
    const data = await api.getHooks();
    setHooks(data);
  };

  const refreshModels = async () => {
    const data = await api.getModels();
    setModels(data);
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-fade-in">
          {/* Dashboard Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-1 text-[10px] font-semibold text-zinc-600">Local agent runtimes</div>
              <h1 className="text-3xl font-semibold text-white">
                Runtime <span className="font-normal text-zinc-500">Overview</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-white/10 bg-[#101318] px-3 py-2 text-xs text-zinc-400">
              <span
                className={`h-2 w-2 rounded-full ${
                  runtimeConnection === 'connected'
                    ? 'bg-emerald-400'
                    : runtimeConnection === 'error'
                      ? 'bg-rose-400'
                      : 'bg-amber-300'
                }`}
              />
              {runtimeConnection === 'connected'
                ? 'Backend connected'
                : runtimeConnection === 'error'
                  ? 'Backend unavailable'
                  : 'Loading runtimes'}
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              {
                label: 'Detected Runtimes',
                value: `${runtimeOverviews.filter((item) => item.runtime.available).length} / 3`,
                desc: 'Codex, Claude, Antigravity',
                color: 'text-sky-300',
              },
              {
                label: 'Running Sessions',
                value: `${runtimeOverviews.flatMap((item) => item.threads).filter((thread) => thread.status === 'running').length}`,
                desc: 'Native and observed activity',
                color: 'text-emerald-300',
              },
              {
                label: 'Agent Definitions',
                value: `${runtimeOverviews.reduce((total, item) => total + item.agents.length, 0)}`,
                desc: 'Native and legacy inventory',
                color: 'text-amber-300',
              },
              {
                label: 'Diagnostics',
                value: `${runtimeOverviews.flatMap((item) => item.diagnostics).filter((item) => item.level !== 'info').length}`,
                desc: 'Warnings and errors',
                color: 'text-rose-300',
              },
            ].map((metric, i) => (
              <div key={i} className="runtime-panel p-4">
                <span className="text-[10px] font-medium text-zinc-600">{metric.label}</span>
                <div className={`mt-2 text-2xl font-semibold ${metric.color}`}>{metric.value}</div>
                <p className="mt-1 text-[10px] text-zinc-600">{metric.desc}</p>
              </div>
            ))}
          </div>

          {/* Core Metrics Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <AgentSummary />
            <SystemStatus />
          </div>

          {/* Secondary Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xl font-bold text-white tracking-tight">Recent Nodes</h2>
                <button onClick={() => setActiveTab('agents')} className="text-[10px] font-black text-muted hover:text-primary uppercase tracking-widest transition-colors">View All</button>
              </div>
              <AgentList agents={agents.slice(0, 5)} onRefresh={refreshAgents} />
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xl font-bold text-white tracking-tight">Active Transmissions</h2>
                <button onClick={() => setActiveTab('activity')} className="text-[10px] font-black text-muted hover:text-primary uppercase tracking-widest transition-colors">Audit Logs</button>
              </div>
              <ActivityFeed activities={activities.slice(0, 8)} />
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

      {activeTab === 'terminal' && (
        <div className="animate-fade-in space-y-6 h-[calc(100vh-120px)]">
          <PageHeader title="Direct" subtitle="Terminal" accent="Command" />
          <Terminal />
        </div>
      )}

      {activeTab === 'agents' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="Agent" subtitle="Registry" accent="Deployed Nodes" />
          <AgentList agents={agents} onRefresh={refreshAgents} showAll={true} />
        </div>
      )}

      {activeTab === 'claude' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="Claude Code" subtitle="Control" accent="Runtime" />
          <ClaudeControlPanel />
        </div>
      )}

      {activeTab === 'antigravity' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="Antigravity" subtitle="Control Panel" accent="Autonomous Core" />
          <AntigravityControlPanel />
        </div>
      )}

      {activeTab === 'clisessions' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="CLI" subtitle="Sessions" accent="Active" />
          <CLISessions />
        </div>
      )}

      {activeTab === 'codex' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="Codex" subtitle="Control" accent="Runtime" />
          <CodexControlPanel />
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



      {activeTab === 'system' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="System" subtitle="Diagnostics" accent="Resources" />
          <SystemStatus />
        </div>
      )}

      {activeTab === 'hooks' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="System" subtitle="Hooks" accent="Automation" />
          <HookList hooks={hooks} onRefresh={refreshHooks} />
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="Intelligence" subtitle="Analytics" accent="Performance" />
          <AnalyticsDashboard />
        </div>
      )}



      {activeTab === 'models' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="Model" subtitle="Inventory" accent="Neural Engines" />
          <ModelList models={models} onRefresh={refreshModels} />
        </div>
      )}
    </DashboardLayout>
  );
}
