'use client';

import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab: 'dashboard' | 'agents' | 'skills' | 'hooks' | 'models' | 'activity' | 'clisessions' | 'system' | 'tasks' | 'analytics' | 'terminal' | 'providers' | 'claude-editor';
  onTabChange: (tab: 'dashboard' | 'agents' | 'skills' | 'hooks' | 'models' | 'activity' | 'clisessions' | 'system' | 'tasks' | 'analytics' | 'terminal' | 'providers' | 'claude-editor') => void;
}

const Icon = ({ d }: { d: string }) => (
  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export default function DashboardLayout({ children, activeTab, onTabChange }: DashboardLayoutProps) {
  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
    { id: 'agents' as const, label: 'Agents', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'skills' as const, label: 'Skills', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: 'providers' as const, label: 'AI Providers', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9' },
    { id: 'claude-editor' as const, label: 'CLAUDE.md', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    { id: 'clisessions' as const, label: 'CLI Sessions', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'hooks' as const, label: 'Hooks', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
    { id: 'models' as const, label: 'Models', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
    { id: 'activity' as const, label: 'Activity', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'tasks' as const, label: 'Tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { id: 'analytics' as const, label: 'Analytics', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'terminal' as const, label: 'Terminal', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'system' as const, label: 'System', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ];

  return (
    <div className="dashboard-container">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[var(--primary)] opacity-5 blur-[160px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[var(--accent)] opacity-5 blur-[140px] rounded-full" />
      </div>

      {/* FIXED Sidebar via CSS Flex/Grid container */}
      <aside className="sidebar">
        {/* Modern Branding Area */}
        <div className="sidebar-header">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[var(--primary)] to-[#c4603e] rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--primary-glow)]">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white leading-none">Claude</h1>
              <p className="text-[10px] text-[var(--foreground-muted)] font-bold uppercase tracking-[0.2em] mt-1.5 opacity-60">Control Panel</p>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <nav className="sidebar-nav custom-scrollbar space-y-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`nav-button group ${isActive ? 'active' : ''}`}
              >
                <div className={`${isActive ? 'text-[var(--primary)]' : 'text-white/20 group-hover:text-white/50 transition-colors'}`}>
                  <Icon d={tab.icon} />
                </div>
                <span className={`text-sm font-bold tracking-wide transition-transform ${isActive ? 'translate-x-1' : ''}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-6 mt-auto border-t border-white/[0.03]">
          <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/[0.05] flex items-center gap-4 hover:bg-white/[0.05] transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-white/10 to-white/5 flex items-center justify-center text-xs font-bold text-white/30">
              CL
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">Main Session</div>
              <div className="text-[10px] text-[var(--accent)] flex items-center gap-2 font-bold uppercase tracking-wider mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
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
