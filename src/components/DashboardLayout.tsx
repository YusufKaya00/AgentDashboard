'use client';

import { useState, type ReactNode } from 'react';
import {
  Activity,
  BarChart3,
  Bot,
  Code2,
  Cpu,
  Gauge,
  LayoutDashboard,
  Link2,
  ListChecks,
  Menu,
  Network,
  Orbit,
  PanelsTopLeft,
  SquareTerminal,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';

type DashboardTab = 'dashboard' | 'agents' | 'claude' | 'antigravity' | 'skills' | 'clisessions' | 'codex' | 'terminal' | 'tasks' | 'activity' | 'system' | 'hooks' | 'analytics' | 'models';

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

interface TabItem {
  id: DashboardTab;
  label: string;
  icon: LucideIcon;
}

interface TabGroup {
  title: string;
  items: TabItem[];
}

const GROUPS: TabGroup[] = [
  {
    title: 'Workspace',
    items: [
      { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
      { id: 'agents', label: 'Agent Registry', icon: Users },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'system', label: 'Diagnostics', icon: Gauge },
    ],
  },
  {
    title: 'Runtimes',
    items: [
      { id: 'codex', label: 'Codex', icon: Code2 },
      { id: 'claude', label: 'Claude Code', icon: Bot },
      { id: 'antigravity', label: 'Antigravity', icon: Orbit },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { id: 'skills', label: 'Skills', icon: Wrench },
      { id: 'models', label: 'Models', icon: Cpu },
      { id: 'hooks', label: 'Hooks', icon: Link2 },
    ],
  },
  {
    title: 'Operations',
    items: [
      { id: 'tasks', label: 'Tasks', icon: ListChecks },
      { id: 'terminal', label: 'Terminal', icon: SquareTerminal },
      { id: 'clisessions', label: 'CLI Sessions', icon: PanelsTopLeft },
      { id: 'activity', label: 'Activity', icon: Activity },
    ],
  },
];

export default function DashboardLayout({ children, activeTab, onTabChange }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const selectTab = (tab: DashboardTab) => {
    onTabChange(tab);
    setMobileOpen(false);
  };

  return (
    <div className="dashboard-container">
      <button
        className={`icon-button fixed top-3 z-[70] border-white/10 bg-[#101318] transition-[left] duration-200 md:hidden ${
          mobileOpen ? 'left-[216px]' : 'left-3'
        }`}
        onClick={() => setMobileOpen((current) => !current)}
        title={mobileOpen ? 'Close navigation' : 'Open navigation'}
        aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {mobileOpen && (
        <button
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside className={`sidebar fixed inset-y-0 left-0 transition-transform duration-200 md:relative md:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="border-b border-white/[0.06] px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-sky-400/25 bg-sky-400/10 text-sky-300">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white">Tnega</h1>
              <p className="mt-0.5 text-[10px] text-zinc-600">Agent runtime control</p>
            </div>
          </div>
        </div>

        <nav className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h2 className="px-3 pb-1.5 text-[9px] font-semibold text-zinc-700">{group.title}</h2>
              <div className="space-y-0.5">
                {group.items.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => selectTab(tab.id)}
                      className={`nav-button ${isActive ? 'active' : ''}`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-zinc-600'}`} />
                      <span className="truncate text-xs">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className="border-t border-white/[0.06] p-4">
          <div className="flex items-center gap-3 rounded-md border border-white/[0.06] bg-zinc-950/30 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-zinc-500">
              <SquareTerminal className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-zinc-300">Local workspace</div>
              <div className="mt-0.5 text-[10px] text-zinc-600">127.0.0.1 control plane</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content pt-14 md:pt-0">
        <div className="main-container">
          <div className="animate-fade-in">{children}</div>
        </div>
      </main>
    </div>
  );
}
