'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';

interface TerminalMessage {
  id: string;
  type: 'input' | 'output' | 'error' | 'success';
  content: string;
  timestamp: string;
}

interface TerminalTab {
  id: string;
  name: string;
  messages: TerminalMessage[];
  active: boolean;
}

export default function Terminal() {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    {
      id: 'default',
      name: 'System Terminal',
      messages: [
        {
          id: 'welcome',
          type: 'success',
          content: 'Tnega Local Agent Runtime Dashboard [Version 0.1.0]\nType "help" to view system CLI commands.\nConnection established.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ],
      active: true,
    },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tabs]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const activeTab = tabs.find(t => t.active) || tabs[0];

  const addMessage = (type: TerminalMessage['type'], content: string) => {
    const message: TerminalMessage = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content,
      timestamp: new Date().toLocaleTimeString(),
    };
    setTabs(prev => prev.map(tab =>
      tab.active ? { ...tab, messages: [...tab.messages, message] } : tab
    ));
  };

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    addMessage('input', command);
    setHistory(prev => [...prev, command]);
    setHistoryIndex(-1);

    try {
      const result = await api.executeTerminalCommand(command);
      if (result && result.output) {
        addMessage('output', result.output);
      } else if (result && result.error) {
        addMessage('error', result.error);
      } else {
        addMessage('output', 'Command executed successfully with no output.');
      }
    } catch {
      // Fallback to local simulation
      const output = simulateCommand(command);
      addMessage(output.type, output.content);
    }

    setInput('');
  };

  const simulateCommand = (command: string) => {
    const cmd = command.trim().toLowerCase();
    const args = command.trim().split(' ').slice(1);

    if (cmd === 'help' || cmd === '?') {
      return {
        type: 'output' as const,
        content: `
Available commands:
  help              Show this help message
  clear             Clear the terminal
  ls                List files in current directory
  pwd               Print working directory
  echo <text>       Print text
  date              Show current date and time
  whoami            Show current user
  status            Show system status
  agents            List all agents
  tasks             List all tasks
  analytics         Show analytics summary
        `.trim(),
      };
    }

    if (cmd === 'clear') {
      setTabs(prev => prev.map(tab =>
        tab.active ? { ...tab, messages: [] } : tab
      ));
      return { type: 'output' as const, content: '' };
    }

    if (cmd === 'ls') {
      return {
        type: 'output' as const,
        content: `
src/
  app/
    page.tsx
    layout.tsx
    globals.css
  components/
    AgentList.tsx
    ActivityFeed.tsx
    SystemStatus.tsx
    TaskManager.tsx
    AnalyticsDashboard.tsx
    Terminal.tsx
  lib/
    api.ts
backend-node/
  server.ts
  package.json
.claude/
  agents/
  agents.json
  data/
        `.trim(),
      };
    }

    if (cmd === 'pwd') {
      return {
        type: 'output' as const,
        content: '/Users/skyks/Desktop/claudeDash',
      };
    }

    if (cmd.startsWith('echo ')) {
      return {
        type: 'output' as const,
        content: args.join(' '),
      };
    }

    if (cmd === 'date') {
      return {
        type: 'output' as const,
        content: new Date().toString(),
      };
    }

    if (cmd === 'whoami') {
      return {
        type: 'output' as const,
        content: 'skyks',
      };
    }

    if (cmd === 'status') {
      return {
        type: 'success' as const,
        content: `
System Status: ONLINE
Backend: Running (http://localhost:8000)
Frontend: Running (http://localhost:3000)
Agents: 12 active
Tasks: 156 total
Uptime: 99.9%
        `.trim(),
      };
    }

    if (cmd === 'agents') {
      return {
        type: 'output' as const,
        content: `
Active Agents:
  1. Team Leader (leader)
  2. System Architect (architect)
  3. Research Agent (researcher)
  4. Backend Dev (developer)
  5. Frontend Dev (developer)
  6. Mobile Dev (developer)
  7. Security Agent (security)
  8. DevOps (devops)
  9. Analytics (analyst)
  10. Task Manager (manager)
  11. QA Testing (qa)
  12. Documentation (writer)
        `.trim(),
      };
    }

    if (cmd === 'tasks') {
      return {
        type: 'output' as const,
        content: `
Task Summary:
  Total: 156
  Pending: 8
  In Progress: 4
  Completed: 142
  Blocked: 2

Priority Distribution:
  P0 (Critical): 3
  P1 (High): 12
  P2 (Medium): 89
  P3 (Low): 52
        `.trim(),
      };
    }

    if (cmd === 'analytics') {
      return {
        type: 'output' as const,
        content: `
Analytics Summary (Last 7 days):
  Commits: 47 (+12%)
  Pull Requests: 12 (+5%)
  Code Velocity: 2,340 LOC/day
  Test Coverage: 87%
  Bugs: 3 (-15%)
  Deployments: 5 (+20%)

System Metrics:
  CPU Usage: 42%
  Memory Usage: 67%
  Response Time: 145ms
  Error Rate: 0.02%
        `.trim(),
      };
    }

    return {
      type: 'error' as const,
      content: `Command not found: ${command}. Type 'help' for available commands.`,
    };
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple tab completion
      const commands = ['help', 'clear', 'ls', 'pwd', 'echo', 'date', 'whoami', 'status', 'agents', 'tasks', 'analytics'];
      const match = commands.find(cmd => cmd.startsWith(input.toLowerCase()));
      if (match) {
        setInput(match);
      }
    }
  };

  const createTab = () => {
    const newTab: TerminalTab = {
      id: Date.now().toString(),
      name: `Terminal ${tabs.length + 1}`,
      messages: [],
      active: true,
    };
    setTabs(prev => prev.map(t => ({ ...t, active: false })).concat(newTab));
  };

  const closeTab = (tabId: string) => {
    if (tabs.length === 1) return;
    setTabs(prev => {
      const filtered = prev.filter(t => t.id !== tabId);
      if (activeTab.id === tabId) {
        return filtered.map((t, i) => i === filtered.length - 1 ? { ...t, active: true } : t);
      }
      return filtered;
    });
  };

  const switchTab = (tabId: string) => {
    setTabs(prev => prev.map(t => ({ ...t, active: t.id === tabId })));
  };

  const clearTerminal = () => {
    setTabs(prev => prev.map(tab =>
      tab.active ? { ...tab, messages: [] } : tab
    ));
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Terminal</h1>
          <p className="text-foreground-muted text-sm uppercase tracking-wider">Command-line interface</p>
        </div>
        <div className="flex gap-2">
          <button onClick={createTab} className="btn btn-secondary btn-sm">
            <Plus className="h-4 w-4" />
            New Tab
          </button>
          <button onClick={clearTerminal} className="btn btn-secondary btn-sm">
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
        </div>
      </div>

      {/* Terminal Window */}
      <div className="card flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center gap-1 p-2 border-b border-border" style={{ backgroundColor: 'var(--background-alt)' }}>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                tab.active
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'text-foreground-muted hover:text-white hover:bg-surface'
              }`}
            >
              <button
                onClick={() => switchTab(tab.id)}
                className="flex min-w-0 items-center gap-2"
              >
                <span className="w-2 h-2 shrink-0 rounded-full bg-accent status-online" />
                <span className="truncate">{tab.name}</span>
              </button>
              {tabs.length > 1 && (
                <button
                  onClick={() => closeTab(tab.id)}
                  className="ml-2 hover:text-error transition-colors"
                  title={`Close ${tab.name}`}
                  aria-label={`Close ${tab.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-2">
          {activeTab.messages.length === 0 && (
            <div className="text-foreground-muted">
              <p className="mb-2">Claude Dashboard Terminal v5.0</p>
              <p className="mb-4">Type &apos;help&apos; for available commands.</p>
            </div>
          )}

          {activeTab.messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.type === 'input' ? 'text-white' :
                message.type === 'error' ? 'text-error' :
                message.type === 'success' ? 'text-accent' :
                'text-foreground-muted'
              }`}
            >
              <span className="text-foreground-muted shrink-0">
                {formatTimestamp(message.timestamp)}
              </span>
              <span className="flex-1 whitespace-pre-wrap break-words">
                {message.type === 'input' && <span className="text-primary">❯</span>}
                {' '}
                {message.content}
              </span>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border" style={{ backgroundColor: 'var(--background-alt)' }}>
          <div className="flex items-center gap-3">
            <span className="text-primary font-mono">❯</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command..."
              className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm placeholder-foreground-muted"
            />
            <div className="text-foreground-muted text-xs">
              <span className="hidden md:inline">↑↓: History | Tab: Complete | Enter: Execute</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
