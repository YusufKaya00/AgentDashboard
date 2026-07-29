'use client';

import { useState } from 'react';
import { Bot, Code2, Network } from 'lucide-react';
import RuntimeControlPanel from '@/components/RuntimeControlPanel';
import type { RuntimeId, RuntimeOverview } from '@/types';

type RegistryMode = 'agents' | 'skills';

interface RuntimeRegistryWorkspaceProps {
  mode: RegistryMode;
  overviews: RuntimeOverview[];
  liveConnected: boolean;
  liveRevisions: Record<RuntimeId, number>;
  onOverviewChange: (overview: RuntimeOverview) => void;
}

const RUNTIMES = [
  {
    id: 'codex',
    label: 'Codex',
    path: '.codex / .agents',
    icon: Code2,
    active: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  },
  {
    id: 'claude',
    label: 'Claude Code',
    path: '.claude',
    icon: Bot,
    active: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  },
  {
    id: 'antigravity',
    label: 'Antigravity',
    path: '.gemini / .agents',
    icon: Network,
    active: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  },
] as const;

export default function RuntimeRegistryWorkspace({
  mode,
  overviews,
  liveConnected,
  liveRevisions,
  onOverviewChange,
}: RuntimeRegistryWorkspaceProps) {
  const [runtime, setRuntime] = useState<RuntimeId>('codex');

  return (
    <div className="space-y-5">
      <nav
        className="grid grid-cols-1 gap-2 border-y border-white/8 py-2 sm:grid-cols-3"
        aria-label={`${mode === 'agents' ? 'Agent' : 'Skill'} runtime`}
      >
        {RUNTIMES.map((item) => {
          const overview = overviews.find((candidate) => candidate.runtime.id === item.id);
          const count = mode === 'agents'
            ? overview?.agents.length ?? 0
            : overview?.skills.length ?? 0;
          const editable = mode === 'agents'
            ? overview?.agents.filter((agent) => agent.editable).length ?? 0
            : overview?.skills.filter((skill) => skill.editable).length ?? 0;
          const Icon = item.icon;
          const selected = runtime === item.id;

          return (
            <button
              key={item.id}
              type="button"
              className={`flex min-h-16 items-center gap-3 rounded-md border px-3 text-left transition-colors ${
                selected
                  ? item.active
                  : 'border-transparent text-zinc-500 hover:border-white/10 hover:bg-white/[0.03] hover:text-zinc-200'
              }`}
              onClick={() => setRuntime(item.id)}
              aria-pressed={selected}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-current/20 bg-black/15">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{item.label}</span>
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      overview?.runtime.available ? 'bg-emerald-400' : 'bg-zinc-700'
                    }`}
                    title={overview?.runtime.available ? 'Detected' : 'Not initialized'}
                  />
                </span>
                <span className="mt-1 block truncate font-mono text-[10px] opacity-55">{item.path}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold">{count}</span>
                <span className="block text-[9px] opacity-55">{editable} editable</span>
              </span>
            </button>
          );
        })}
      </nav>

      <RuntimeControlPanel
        key={`${mode}:${runtime}`}
        runtime={runtime}
        initialView={mode}
        liveConnected={liveConnected}
        liveRevision={liveRevisions[runtime]}
        onOverviewChange={onOverviewChange}
      />
    </div>
  );
}
