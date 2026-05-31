/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect } from 'react';
import { api, connectWebSocket } from '@/lib/api';
import { Agent, Hook, AIModel, ActivityLog, Stats, AITarget } from '@/types';
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
import CodexControlPanel from '@/components/CodexControlPanel';
import AntigravityControlPanel from '@/components/AntigravityControlPanel';
import ClaudeControlPanel from '@/components/ClaudeControlPanel';

const PageHeader = ({ title, subtitle, accent = "Intelligence" }: { title: string, subtitle: string, accent?: string }) => (
  <div className="mb-8">
    <div className="flex items-center gap-2 mb-1">
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">System {accent}</span>
    </div>
    <h1 className="text-3xl font-black text-white tracking-tight">
      {title} <span className="text-muted font-light">{subtitle}</span>
    </h1>
  </div>
);

type DashboardTab = 'dashboard' | 'agents' | 'claude' | 'antigravity' | 'skills' | 'clisessions' | 'codex' | 'terminal' | 'tasks' | 'activity' | 'system' | 'hooks' | 'analytics' | 'models';

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');

  const mapTargetsToAgents = (targets: AITarget[], assignments: any[] = []): Agent[] => {
    return targets
      .filter(t => t.type === 'claude_agent' || t.type === 'antigravity_agent' || t.type === 'codex_agent' || t.type === 'subagent')
      .map(t => ({
        id: t.id,
        name: t.name,
        description: (t.metadata.description as string) || (t.metadata.role as string) || (t.type === 'antigravity_agent' ? 'Autonomous Core Agent' : 'Sub-Agent Node'),
        model: (t.metadata.model as string) || (t.type === 'codex_agent' ? 'Codex Engine' : 'N/A'),
        status: t.status === 'active' || t.status === 'Online' || t.type === 'codex_agent' ? 'active' : (t.status === 'error' ? 'error' : 'inactive'),
        config: { type: t.type, target_key: t.target_key },
        created_at: '',
        updated_at: '',
        role: t.type === 'antigravity_agent' ? 'team_lead' : (t.type === 'codex_agent' ? 'specialist' : 'worker'),
        capabilities: t.metadata.capabilities
          ? (t.metadata.capabilities as string).split(',').filter(Boolean)
          : (t.type === 'antigravity_agent' 
             ? ['reasoning', 'planning', 'tools-exec'] 
             : (t.type === 'codex_agent' ? ['codex-task', 'code-generation'] : ['chat', 'tool-call'])),
        runtime: t.provider || (t.type === 'claude_agent' ? 'claude' : t.type === 'codex_agent' ? 'codex' : 'antigravity'),
        skills: assignments
          .filter((a: any) => a.target_key === t.target_key)
          .map((a: any) => a.skill_key)
      }));
  };

  const loadInitialData = async () => {
    try {
      const [statsData, targetsData, hooksData, modelsData, activitiesData, assignmentsData] = await Promise.all([
        api.getStats(),
        api.getAITargets(),
        api.getHooks(),
        api.getModels(),
        api.getActivity(50),
        api.getSkillAssignments().catch(() => []),
      ]);
      setStats(statsData);
      setAgents(mapTargetsToAgents(targetsData, assignmentsData));
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

  const refreshAgents = async () => {
    try {
      const [targetsData, assignmentsData] = await Promise.all([
        api.getAITargets(),
        api.getSkillAssignments().catch(() => []),
      ]);
      setAgents(mapTargetsToAgents(targetsData, assignmentsData));
      loadStats();
    } catch (error) {
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
    loadStats();
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && (
        <div className="space-y-10 animate-fade-in">
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Core Intelligence Unit</span>
              </div>
              <h1 className="text-4xl font-black text-white tracking-tighter">
                Dashboard <span className="text-muted font-light">Overview</span>
              </h1>
            </div>
            <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-xl border border-white/5 self-start">
              <div className="px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">System v5.0</span>
              </div>
              <div className="px-4 py-2 bg-accent/10 rounded-lg border border-accent/20">
                <span className="text-[10px] font-black text-accent uppercase tracking-widest">Operational</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Active Cores", value: "3 Cores", desc: "Claude, Codex, Antigravity", color: "text-primary" },
              { label: "Fleet Nodes", value: `${agents.length} Registered`, desc: "Claude sub-agents configured", color: "text-accent" },
              { label: "Active Tasks", value: `${stats?.total_tasks || 0} Queued`, desc: "Orchestrator task lists", color: "text-warning" },
              { label: "Diagnostic Health", value: "99.9% Optimal", desc: "All core engines online", color: "text-secondary" }
            ].map((metric, i) => (
              <div key={i} className="card p-5 bg-surface/20 border-border/80 backdrop-blur-sm hover:border-primary/30 transition-all group duration-300">
                <span className="text-[9px] font-black text-muted uppercase tracking-[0.2em]">{metric.label}</span>
                <div className={`text-2xl font-black ${metric.color} tracking-tight mt-2.5 mb-1`}>{metric.value}</div>
                <p className="text-[10px] text-muted/70 font-semibold">{metric.desc}</p>
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
