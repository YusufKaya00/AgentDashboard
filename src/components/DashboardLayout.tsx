'use client';

import { ReactNode } from 'react';

type DashboardTab = 'dashboard' | 'agents' | 'antigravity' | 'skills' | 'claude-editor' | 'clisessions' | 'codex' | 'terminal' | 'tasks' | 'activity' | 'system';

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

const Icon = ({ d }: { d: string }) => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

interface TabItem {
  id: DashboardTab;
  label: string;
  icon: string;
}

interface TabGroup {
  title: string;
  items: TabItem[];
}

export default function DashboardLayout({ children, activeTab, onTabChange }: DashboardLayoutProps) {
  const groups: TabGroup[] = [
    {
      title: 'Overview & Activity',
      items: [
        { id: 'dashboard', label: 'System Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
        { id: 'tasks', label: 'Orchestrator Tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
        { id: 'activity', label: 'Activity Transmissions', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
      ]
    },
    {
      title: 'Autonomous Cores',
      items: [
        { id: 'antigravity', label: 'Antigravity Core', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z' },
        { id: 'codex', label: 'Codex Engine', icon: 'M12 6V3m0 18v-3m6-6h3M3 12h3m10.95-4.95l2.12-2.12M4.93 19.07l2.12-2.12m0-9.9L4.93 4.93m14.14 14.14l-2.12-2.12M9 9h6v6H9z' }
      ]
    },
    {
      title: 'Claude Fleet',
      items: [
        { id: 'agents', label: 'Claude Fleet Nodes', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
        { id: 'claude-editor', label: 'CLAUDE Config', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' }
      ]
    },
    {
      title: 'Operations & Diagnostic',
      items: [
        { id: 'clisessions', label: 'CLI Session Hub', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
        { id: 'skills', label: 'Unified Capabilities', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
        { id: 'terminal', label: 'Command Terminal', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
        { id: 'system', label: 'System Telemetry', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
      ]
    }
  ];

  return (
    <div className="dashboard-container">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary opacity-5 blur-[160px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent opacity-5 blur-[140px] rounded-full" />
      </div>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="p-6 mb-2 border-b border-white/[0.04]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <svg className="w-7 h-7 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white leading-none uppercase">Tnega</h1>
              <p className="text-[10px] text-muted font-black uppercase tracking-[0.2em] mt-1.5">Control Plane</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav custom-scrollbar overflow-y-auto px-4 pb-6 flex-1 space-y-5">
          {groups.map((group, idx) => (
            <div key={idx} className="space-y-1.5">
              <h2 className="px-3 text-[9px] font-black text-muted/40 uppercase tracking-[0.25em]">
                {group.title}
              </h2>
              <div className="space-y-1">
                {group.items.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => onTabChange(tab.id)}
                      className={`nav-button group ${isActive ? 'active' : ''}`}
                    >
                      <div className={`${isActive ? 'text-primary' : 'text-white/30 group-hover:text-white/60 transition-colors'}`}>
                        <Icon d={tab.icon} />
                      </div>
                      <span className="text-xs font-bold tracking-wide transition-all">
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-6 mt-auto border-t border-white/[0.03]">
          <div className="p-4 bg-white/[0.01] rounded-2xl border border-white/[0.04] flex items-center gap-4 hover:bg-white/[0.03] transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-white/50 border border-white/5 shadow-inner">
              TN
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">Main Session</div>
              <div className="text-[10px] text-accent flex items-center gap-2 font-bold uppercase tracking-wider mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Live
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* SCROLLABLE Content Area - Guaranteed No Overlap */}
      <main className="main-content">
        <div className="main-container">
          <div className="animate-fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
