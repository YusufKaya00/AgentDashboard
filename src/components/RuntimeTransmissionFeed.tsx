'use client';

import { Bot, GitBranch, MessageSquareText, UserRound } from 'lucide-react';
import type { RuntimeId, RuntimeTransmission } from '@/types';

interface RuntimeTransmissionFeedProps {
  transmissions: RuntimeTransmission[];
  loading?: boolean;
}

const RUNTIME_STYLE: Record<RuntimeId, {
  label: string;
  badge: string;
  line: string;
}> = {
  codex: {
    label: 'Codex',
    badge: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
    line: 'bg-sky-400',
  },
  claude: {
    label: 'Claude',
    badge: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
    line: 'bg-amber-400',
  },
  antigravity: {
    label: 'Antigravity',
    badge: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    line: 'bg-emerald-400',
  },
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export default function RuntimeTransmissionFeed({
  transmissions,
  loading = false,
}: RuntimeTransmissionFeedProps) {
  if (loading && transmissions.length === 0) {
    return (
      <div className="runtime-panel flex min-h-48 items-center justify-center text-xs text-zinc-600">
        Reading native transcripts...
      </div>
    );
  }

  if (transmissions.length === 0) {
    return (
      <div className="runtime-panel flex min-h-48 flex-col items-center justify-center gap-3 text-center">
        <MessageSquareText className="h-6 w-6 text-zinc-700" />
        <div>
          <div className="text-sm font-medium text-zinc-300">No native messages found</div>
          <div className="mt-1 text-xs text-zinc-600">Codex, Claude, and Antigravity transcripts are monitored.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="runtime-panel divide-y divide-white/[0.06] overflow-hidden">
      {transmissions.map((transmission) => {
        const runtimeStyle = RUNTIME_STYLE[transmission.runtime];
        const RoleIcon = transmission.role === 'user' ? UserRound : Bot;
        return (
          <article key={transmission.id} className="group relative px-4 py-4">
            <div className={`absolute inset-y-0 left-0 w-0.5 opacity-70 ${runtimeStyle.line}`} />
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/8 bg-zinc-950/50 text-zinc-500">
                <RoleIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`runtime-badge ${runtimeStyle.badge}`}>
                    {runtimeStyle.label}
                  </span>
                  <span className="text-[10px] font-medium text-zinc-500">
                    {transmission.role}
                  </span>
                  {transmission.is_subagent && (
                    <span className="runtime-badge border-white/10 bg-white/5 text-zinc-500">
                      <GitBranch className="h-3 w-3" />
                      subagent
                    </span>
                  )}
                  <time className="ml-auto text-[10px] tabular-nums text-zinc-600">
                    {formatTimestamp(transmission.timestamp)}
                  </time>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-300">
                  {transmission.message}
                </p>
                <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-zinc-700">
                  <span className="truncate">{transmission.agent_name || transmission.thread_id}</span>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
