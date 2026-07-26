'use client';

import { Bot, CircleDot, FileCode2, GitBranch, RefreshCw, SquareTerminal } from 'lucide-react';
import type { Agent } from '@/types';

interface AgentListProps {
  agents: Agent[];
  onRefresh: () => void;
  showAll?: boolean;
}

const RUNTIMES = [
  { id: 'codex', label: 'Codex', path: '.codex', accent: 'text-sky-300' },
  { id: 'claude', label: 'Claude Code', path: '.claude', accent: 'text-amber-300' },
  { id: 'antigravity', label: 'Antigravity', path: '.gemini / .agents', accent: 'text-emerald-300' },
] as const;

const statusStyle = (status: Agent['status']) => {
  if (status === 'active') return 'text-emerald-300 border-emerald-400/25 bg-emerald-400/10';
  if (status === 'error') return 'text-rose-300 border-rose-400/25 bg-rose-400/10';
  return 'text-zinc-400 border-zinc-600 bg-zinc-800/70';
};

export default function AgentList({ agents, onRefresh, showAll = false }: AgentListProps) {
  const displayed = showAll ? agents : agents.slice(0, 12);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="runtime-section-title">Agent registry</h2>
          <p className="runtime-section-meta">{displayed.length} runtime records</p>
        </div>
        <button className="icon-button" onClick={onRefresh} title="Refresh agents" aria-label="Refresh agents">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {RUNTIMES.map((runtime) => {
          const runtimeAgents = displayed.filter((agent) => agent.runtime === runtime.id);
          return (
            <section key={runtime.id} className="runtime-panel overflow-hidden">
              <header className="flex h-14 items-center justify-between border-b border-white/8 px-4">
                <div>
                  <h3 className={`text-sm font-semibold ${runtime.accent}`}>{runtime.label}</h3>
                  <p className="mt-0.5 font-mono text-[10px] text-zinc-600">{runtime.path}</p>
                </div>
                <span className="runtime-badge border-white/10 bg-white/5 text-zinc-500">
                  {runtimeAgents.length}
                </span>
              </header>

              <div className="divide-y divide-white/8">
                {runtimeAgents.map((agent) => {
                  const isThread = agent.config?.type === 'runtime_thread';
                  const isSubagent = agent.capabilities.includes('subagent');
                  const Icon = isThread
                    ? isSubagent ? GitBranch : SquareTerminal
                    : FileCode2;
                  return (
                    <article key={agent.id} className="min-h-[116px] px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/8 bg-zinc-950/40 text-zinc-500">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-medium text-zinc-200">{agent.name}</h4>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{agent.description}</p>
                          </div>
                        </div>
                        <span className={`runtime-badge shrink-0 ${statusStyle(agent.status)}`}>
                          <CircleDot className="h-3 w-3" />
                          {agent.status}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-2 text-[10px] text-zinc-600">
                        <span className="truncate font-mono">{agent.model}</span>
                        <span className="shrink-0">{isThread ? (isSubagent ? 'subagent' : 'session') : String(agent.config?.scope || 'definition')}</span>
                      </div>
                    </article>
                  );
                })}
                {runtimeAgents.length === 0 && (
                  <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 p-5 text-center">
                    <Bot className="h-6 w-6 text-zinc-700" />
                    <p className="text-xs text-zinc-600">No matching records</p>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
