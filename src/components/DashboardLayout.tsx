'use client';

import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab: 'dashboard' | 'agents' | 'hooks' | 'models' | 'activity' | 'chat' | 'tasks' | 'memory' | 'training' | 'skills' | 'chatlogs' | 'system';
  onTabChange: (tab: 'dashboard' | 'agents' | 'hooks' | 'models' | 'activity' | 'chat' | 'tasks' | 'memory' | 'training' | 'skills' | 'chatlogs' | 'system') => void;
}

export default function DashboardLayout({ children, activeTab, onTabChange }: DashboardLayoutProps) {
  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: '📊' },
    { id: 'agents' as const, label: 'Agents', icon: '🤖' },
    { id: 'chat' as const, label: 'Chat', icon: '💬' },
    { id: 'skills' as const, label: 'Skills', icon: '⚡' },
    { id: 'chatlogs' as const, label: 'Chat Logs', icon: '📝' },
    { id: 'system' as const, label: 'System', icon: '🔧' },
    { id: 'tasks' as const, label: 'Tasks', icon: '✅' },
    { id: 'memory' as const, label: 'Memory', icon: '🧠' },
    { id: 'training' as const, label: 'Training', icon: '📚' },
    { id: 'hooks' as const, label: 'Hooks', icon: '🔗' },
    { id: 'models' as const, label: 'Models', icon: '🎯' },
    { id: 'activity' as const, label: 'Activity', icon: '📈' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-secondary/50 border-r border-border/50 flex flex-col backdrop-blur-xl z-40">
        {/* Logo */}
        <div className="p-6 border-b border-zinc-800/50">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Claude Dashboard</h1>
              <p className="text-xs text-zinc-500 font-medium italic">AI Agent Ecosystem</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-10 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-4 px-8 py-4 transition-all duration-200 group nav-item ${
                activeTab === tab.id ? 'nav-item-active' : ''
              }`}
            >
              <span className={`text-lg transition-transform group-hover:scale-110 mono-emoji grayscale`}>
                {tab.icon}
              </span>
              <span className="text-[13px] uppercase tracking-widest font-semibold">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Status */}
        <div className="p-4 border-t border-zinc-800/50">
          <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
            <div className="relative">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
              <span className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></span>
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-zinc-300">Live Connection</span>
              <div className="text-xs text-zinc-500">All systems operational</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-72 p-8">
        {children}
      </main>
    </div>
  );
}
