'use client';

import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab: 'dashboard' | 'agents' | 'hooks' | 'models' | 'activity' | 'chat' | 'tasks' | 'memory' | 'training';
  onTabChange: (tab: 'dashboard' | 'agents' | 'hooks' | 'models' | 'activity' | 'chat' | 'tasks' | 'memory' | 'training') => void;
}

export default function DashboardLayout({ children, activeTab, onTabChange }: DashboardLayoutProps) {
  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: '📊' },
    { id: 'agents' as const, label: 'Agents', icon: '🤖' },
    { id: 'chat' as const, label: 'Chat', icon: '💬' },
    { id: 'tasks' as const, label: 'Tasks', icon: '✅' },
    { id: 'memory' as const, label: 'Memory', icon: '🧠' },
    { id: 'training' as const, label: 'Training', icon: '📚' },
    { id: 'hooks' as const, label: 'Hooks', icon: '⚡' },
    { id: 'models' as const, label: 'Models', icon: '🔧' },
    { id: 'activity' as const, label: 'Activity', icon: '📝' },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-zinc-950 border-r border-zinc-800/50 flex flex-col backdrop-blur-xl">
        {/* Logo */}
        <div className="p-6 border-b border-zinc-800/50">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-950"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Claude Dashboard</h1>
              <p className="text-xs text-zinc-500 font-medium">AI Agent Management System</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/10 text-orange-400 border border-orange-500/30 shadow-lg shadow-orange-500/10'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                }`}
              >
                <span className="text-xl group-hover:scale-110 transition-transform">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="ml-auto w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
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
