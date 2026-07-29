/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useCallback, useState, useEffect } from 'react';
import { MessageSquareText, ScrollText } from 'lucide-react';
import { api, connectWebSocket, type LiveConnectionStatus } from '@/lib/api';
import { Agent, Hook, AIModel, ActivityLog, RuntimeId, RuntimeOverview, RuntimeTransmission } from '@/types';
import DashboardLayout from '@/components/DashboardLayout';
import AgentList from '@/components/AgentList';
import ActivityFeed from '@/components/ActivityFeed';
import ModelList from '@/components/ModelList';
import HookList from '@/components/HookList';
import SystemStatus from '@/components/SystemStatus';
import AgentSummary from '@/components/AgentSummary';
import CLISessions from '@/components/CLISessions';
import TaskManager from '@/components/TaskManager';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import Terminal from '@/components/Terminal';
import CodexControlPanel from '@/components/CodexControlPanel';
import AntigravityControlPanel from '@/components/AntigravityControlPanel';
import ClaudeControlPanel from '@/components/ClaudeControlPanel';
import RuntimeRegistryWorkspace from '@/components/RuntimeRegistryWorkspace';
import RuntimeTransmissionFeed from '@/components/RuntimeTransmissionFeed';

const PageHeader = ({ title, subtitle, accent = "Intelligence" }: { title: string, subtitle: string, accent?: string }) => (
  <div className="mb-6">
    <div className="mb-1 text-[10px] font-semibold text-zinc-600">{accent}</div>
    <h1 className="text-2xl font-semibold text-white">
      {title} <span className="font-normal text-zinc-500">{subtitle}</span>
    </h1>
  </div>
);

type DashboardTab = 'dashboard' | 'agents' | 'claude' | 'antigravity' | 'skills' | 'clisessions' | 'codex' | 'terminal' | 'tasks' | 'activity' | 'system' | 'hooks' | 'analytics' | 'models';
type ActivityView = 'runtime' | 'audit';

const isRuntimeId = (value: unknown): value is RuntimeId => (
  value === 'codex' || value === 'claude' || value === 'antigravity'
);

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

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [runtimeTransmissions, setRuntimeTransmissions] = useState<RuntimeTransmission[]>([]);
  const [transmissionsLoading, setTransmissionsLoading] = useState(true);
  const [runtimeOverviews, setRuntimeOverviews] = useState<RuntimeOverview[]>([]);
  const [runtimeConnection, setRuntimeConnection] = useState<'loading' | 'connected' | 'error'>('loading');
  const [liveConnection, setLiveConnection] = useState<LiveConnectionStatus>('connecting');
  const [liveRevisions, setLiveRevisions] = useState<Record<RuntimeId, number>>({
    codex: 0,
    claude: 0,
    antigravity: 0,
  });
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [activityView, setActivityView] = useState<ActivityView>('runtime');

  const syncRuntimeOverview = useCallback((nextOverview: RuntimeOverview) => {
    setRuntimeOverviews((current) => {
      return current.some((item) => item.runtime.id === nextOverview.runtime.id)
        ? current.map((item) => (
            item.runtime.id === nextOverview.runtime.id ? nextOverview : item
          ))
        : [...current, nextOverview];
    });
    setAgents((current) => [
      ...current.filter((agent) => agent.runtime !== nextOverview.runtime.id),
      ...mapRuntimesToAgents([nextOverview]),
    ]);
  }, []);

  const refreshRuntimeOverview = useCallback(async (runtime: RuntimeId) => {
    try {
      syncRuntimeOverview(await api.getRuntimeOverview(runtime));
      setRuntimeConnection('connected');
    } catch (error) {
      setRuntimeConnection('error');
      console.error(`Error refreshing ${runtime} runtime:`, error);
    }
  }, [syncRuntimeOverview]);

  const refreshRuntimeTransmissions = useCallback(async () => {
    try {
      setRuntimeTransmissions(await api.getRuntimeTransmissions(300));
    } catch (error) {
      console.error('Error refreshing native runtime transmissions:', error);
    } finally {
      setTransmissionsLoading(false);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    setRuntimeConnection('loading');
    const [
      runtimesResult,
      hooksResult,
      modelsResult,
      activitiesResult,
      transmissionsResult,
    ] = await Promise.allSettled([
      api.getRuntimeOverviews(),
      api.getHooks(),
      api.getModels(),
      api.getActivity(50),
      api.getRuntimeTransmissions(300),
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

    if (transmissionsResult.status === 'fulfilled') {
      setRuntimeTransmissions(
        Array.isArray(transmissionsResult.value) ? transmissionsResult.value : []
      );
    } else {
      console.error('Error loading native runtime transmissions:', transmissionsResult.reason);
    }
    setTransmissionsLoading(false);
  }, []);

  useEffect(() => {
    void loadInitialData();
    let transmissionRefreshTimer: number | null = null;
    const scheduleTransmissionRefresh = () => {
      if (transmissionRefreshTimer !== null) {
        window.clearTimeout(transmissionRefreshTimer);
      }
      transmissionRefreshTimer = window.setTimeout(() => {
        transmissionRefreshTimer = null;
        void refreshRuntimeTransmissions();
      }, 350);
    };

    const ws = connectWebSocket((data) => {
      if (data.type === 'connected' && data.runtime_live_updates === false) {
        setLiveConnection('disabled');
      }
      if (data.type === 'activity') {
        setActivities((prev) => [data.data, ...prev].slice(0, 100));
      }
      const runtimeValue: unknown = data.runtime;
      if (data.type === 'runtime-inventory-changed' && isRuntimeId(runtimeValue)) {
        const runtime = runtimeValue;
        setLiveRevisions((current) => ({
          ...current,
          [runtime]: current[runtime] + 1,
        }));
        void refreshRuntimeOverview(runtime);
        scheduleTransmissionRefresh();
      }
    }, setLiveConnection);

    const fallbackRefresh = window.setInterval(() => {
      void api.getRuntimeOverviews()
        .then((overviews) => {
          setRuntimeOverviews(overviews);
          setAgents(mapRuntimesToAgents(overviews));
          setRuntimeConnection('connected');
          void refreshRuntimeTransmissions();
        })
        .catch((error) => {
          setRuntimeConnection('error');
          console.error('Runtime fallback refresh failed:', error);
        });
    }, 60000);

    return () => {
      window.clearInterval(fallbackRefresh);
      if (transmissionRefreshTimer !== null) {
        window.clearTimeout(transmissionRefreshTimer);
      }
      ws.close();
    };
  }, [loadInitialData, refreshRuntimeOverview, refreshRuntimeTransmissions]);

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
                  liveConnection === 'connected'
                    ? 'bg-emerald-400'
                    : liveConnection === 'disabled'
                      ? 'bg-zinc-500'
                    : liveConnection === 'disconnected' || runtimeConnection === 'error'
                      ? 'bg-rose-400'
                      : 'bg-amber-300'
                }`}
              />
              {liveConnection === 'connected'
                ? 'Live updates connected'
                : liveConnection === 'disabled'
                  ? 'Live updates disabled'
                : runtimeConnection === 'error'
                  ? 'Backend unavailable'
                  : liveConnection === 'disconnected'
                    ? 'Reconnecting live updates'
                    : 'Connecting live updates'}
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
              <AgentList agents={agents} onRefresh={refreshAgents} />
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xl font-bold text-white tracking-tight">Active Transmissions</h2>
                <button onClick={() => setActiveTab('activity')} className="text-[10px] font-black text-muted hover:text-primary uppercase tracking-widest transition-colors">View Activity</button>
              </div>
              <RuntimeTransmissionFeed
                transmissions={runtimeTransmissions.slice(0, 12)}
                loading={transmissionsLoading}
              />
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
          <RuntimeRegistryWorkspace
            mode="agents"
            overviews={runtimeOverviews}
            liveConnected={liveConnection === 'connected'}
            liveRevisions={liveRevisions}
            onOverviewChange={syncRuntimeOverview}
          />
        </div>
      )}

      {activeTab === 'claude' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="Claude Code" subtitle="Control" accent="Runtime" />
          <ClaudeControlPanel
            liveConnected={liveConnection === 'connected'}
            liveRevision={liveRevisions.claude}
          />
        </div>
      )}

      {activeTab === 'antigravity' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="Antigravity" subtitle="Control Panel" accent="Autonomous Core" />
          <AntigravityControlPanel
            liveConnected={liveConnection === 'connected'}
            liveRevision={liveRevisions.antigravity}
          />
        </div>
      )}

      {activeTab === 'clisessions' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="CLI" subtitle="Sessions" accent="Active" />
          <CLISessions liveRevisions={liveRevisions} />
        </div>
      )}

      {activeTab === 'codex' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="Codex" subtitle="Control" accent="Runtime" />
          <CodexControlPanel
            liveConnected={liveConnection === 'connected'}
            liveRevision={liveRevisions.codex}
          />
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="System" subtitle="Activity" accent="Runtime Timeline" />
          <div className="runtime-panel flex w-fit gap-1 p-1">
            <button
              type="button"
              onClick={() => setActivityView('runtime')}
              className={`flex h-9 items-center gap-2 rounded px-3 text-xs font-medium transition-colors ${
                activityView === 'runtime'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-300'
              }`}
            >
              <MessageSquareText className="h-4 w-4" />
              Runtime Messages
              <span className="tabular-nums text-[10px] text-zinc-600">{runtimeTransmissions.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setActivityView('audit')}
              className={`flex h-9 items-center gap-2 rounded px-3 text-xs font-medium transition-colors ${
                activityView === 'audit'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-300'
              }`}
            >
              <ScrollText className="h-4 w-4" />
              System Audit
              <span className="tabular-nums text-[10px] text-zinc-600">{activities.length}</span>
            </button>
          </div>
          {activityView === 'runtime' ? (
            <RuntimeTransmissionFeed
              transmissions={runtimeTransmissions}
              loading={transmissionsLoading}
            />
          ) : (
            <ActivityFeed activities={activities} showAll />
          )}
        </div>
      )}

      {activeTab === 'skills' && (
        <div className="animate-fade-in space-y-6">
          <PageHeader title="Skill" subtitle="Manager" accent="Capabilities" />
          <RuntimeRegistryWorkspace
            mode="skills"
            overviews={runtimeOverviews}
            liveConnected={liveConnection === 'connected'}
            liveRevisions={liveRevisions}
            onOverviewChange={syncRuntimeOverview}
          />
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
          <HookList
            hooks={hooks}
            models={models}
            runtimeOverviews={runtimeOverviews}
            onRefresh={refreshHooks}
          />
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
