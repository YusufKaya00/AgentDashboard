/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  CircleAlert,
  GitBranch,
  LoaderCircle,
  RefreshCw,
  SquareTerminal,
  UserRound,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  RuntimeId,
  RuntimeSessionMessage,
  RuntimeSessionSummary,
} from '@/types';

interface CLISessionsProps {
  liveRevisions: Record<RuntimeId, number>;
}

const RUNTIMES: Array<{
  id: RuntimeId;
  label: string;
  active: string;
  badge: string;
}> = [
  {
    id: 'codex',
    label: 'Codex',
    active: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
    badge: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
  },
  {
    id: 'claude',
    label: 'Claude',
    active: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    badge: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  },
  {
    id: 'antigravity',
    label: 'Antigravity',
    active: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    badge: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  },
];

const runtimeMeta = (runtime: RuntimeId) => (
  RUNTIMES.find((item) => item.id === runtime) || RUNTIMES[0]
);

const formatTimestamp = (value: string | null) => {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const shortWorkspace = (workspace: string | null) => {
  if (!workspace) return 'Workspace unknown';
  const parts = workspace.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts.slice(-2).join('/');
};

export default function CLISessions({ liveRevisions }: CLISessionsProps) {
  const [sessions, setSessions] = useState<RuntimeSessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RuntimeSessionMessage[]>([]);
  const [runtimeFilter, setRuntimeFilter] = useState<RuntimeId | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revisionKey = `${liveRevisions.codex}:${liveRevisions.claude}:${liveRevisions.antigravity}`;
  const selectedSession = sessions.find((item) => item.id === selectedSessionId) || null;
  const filteredSessions = useMemo(() => (
    runtimeFilter === 'all'
      ? sessions
      : sessions.filter((item) => item.runtime === runtimeFilter)
  ), [runtimeFilter, sessions]);

  const loadSessions = useCallback(async () => {
    try {
      const data = await api.getRuntimeSessions();
      setSessions(data);
      setSelectedSessionId((current) => (
        current && data.some((item) => item.id === current)
          ? current
          : data[0]?.id || null
      ));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load runtime sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (session: RuntimeSessionSummary) => {
    setMessagesLoading(true);
    try {
      setMessages(await api.getRuntimeSessionMessages(session.runtime, session.thread_id));
      setError(null);
    } catch (loadError) {
      setMessages([]);
      setError(loadError instanceof Error ? loadError.message : 'Failed to read runtime transcript');
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions, revisionKey]);

  useEffect(() => {
    if (selectedSession) void loadMessages(selectedSession);
    else setMessages([]);
  }, [loadMessages, revisionKey, selectedSession]);

  const selectRuntime = (runtime: RuntimeId | 'all') => {
    setRuntimeFilter(runtime);
    if (runtime === 'all') return;
    const firstMatch = sessions.find((item) => item.runtime === runtime);
    if (firstMatch) setSelectedSessionId(firstMatch.id);
  };

  return (
    <section className="runtime-panel flex min-h-[620px] flex-col overflow-hidden lg:h-[calc(100vh-190px)] lg:flex-row">
      <aside className="flex min-h-0 w-full flex-col border-b border-white/[0.07] lg:w-[360px] lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="border-b border-white/[0.07] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Runtime sessions</h2>
              <p className="mt-1 text-[10px] text-zinc-600">{sessions.length} native transcripts detected</p>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={() => void loadSessions()}
              title="Refresh sessions"
              aria-label="Refresh sessions"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-1 rounded-md border border-white/[0.07] bg-zinc-950/40 p-1">
            <button
              type="button"
              onClick={() => selectRuntime('all')}
              className={`h-8 rounded text-[10px] font-medium transition-colors ${
                runtimeFilter === 'all'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-300'
              }`}
            >
              All
            </button>
            {RUNTIMES.map((runtime) => (
              <button
                key={runtime.id}
                type="button"
                onClick={() => selectRuntime(runtime.id)}
                className={`h-8 rounded border text-[10px] font-medium transition-colors ${
                  runtimeFilter === runtime.id
                    ? runtime.active
                    : 'border-transparent text-zinc-600 hover:text-zinc-300'
                }`}
              >
                {runtime.label}
              </button>
            ))}
          </div>
        </div>

        <div className="custom-scrollbar max-h-[360px] flex-1 overflow-y-auto lg:max-h-none">
          {loading ? (
            <div className="runtime-empty">
              <LoaderCircle className="h-5 w-5 animate-spin text-zinc-600" />
              <span className="text-xs text-zinc-600">Reading session indexes...</span>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="runtime-empty">
              <SquareTerminal className="h-5 w-5 text-zinc-700" />
              <span className="text-xs text-zinc-600">No transcripts for this runtime.</span>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const runtime = runtimeMeta(session.runtime);
              const selected = selectedSessionId === session.id;
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`w-full border-b border-white/[0.06] px-4 py-3.5 text-left transition-colors ${
                    selected ? 'bg-white/[0.05]' : 'hover:bg-white/[0.025]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`runtime-badge mt-0.5 shrink-0 ${runtime.badge}`}>
                      {runtime.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-xs font-medium ${selected ? 'text-zinc-100' : 'text-zinc-300'}`}>
                        {session.title || 'Untitled session'}
                      </div>
                      <div className="mt-1.5 flex min-w-0 items-center gap-2 text-[9px] text-zinc-600">
                        <span className="shrink-0 tabular-nums">{formatTimestamp(session.updated_at || session.created_at)}</span>
                        <span className="truncate">{session.model || 'Runtime default'}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[9px] text-zinc-700">
                        {session.is_subagent && <GitBranch className="h-3 w-3 shrink-0" />}
                        <span className="truncate">{shortWorkspace(session.workspace)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <div className="flex min-h-[520px] min-w-0 flex-1 flex-col lg:min-h-0">
        {!selectedSession ? (
          <div className="runtime-empty flex-1 flex-col">
            <SquareTerminal className="h-7 w-7 text-zinc-700" />
            <div>
              <div className="text-sm font-medium text-zinc-300">Select a runtime session</div>
              <div className="mt-1 text-xs text-zinc-600">Messages are read from native transcript files.</div>
            </div>
          </div>
        ) : (
          <>
            <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`runtime-badge ${runtimeMeta(selectedSession.runtime).badge}`}>
                    {runtimeMeta(selectedSession.runtime).label}
                  </span>
                  {selectedSession.is_subagent && (
                    <span className="runtime-badge border-white/10 bg-white/5 text-zinc-500">
                      <GitBranch className="h-3 w-3" />
                      subagent
                    </span>
                  )}
                  <span className="runtime-badge border-white/10 bg-white/5 text-zinc-500">
                    {selectedSession.status}
                  </span>
                </div>
                <h3 className="mt-1.5 truncate text-sm font-medium text-zinc-100">
                  {selectedSession.title}
                </h3>
              </div>
              <div className="text-right text-[10px] text-zinc-600">
                <div>{messages.length} messages</div>
                <div className="mt-1 max-w-64 truncate font-mono">{selectedSession.thread_id}</div>
              </div>
            </header>

            {error && (
              <div className="flex items-center gap-2 border-b border-rose-400/15 bg-rose-400/5 px-4 py-2 text-xs text-rose-300">
                <CircleAlert className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-6">
              {messagesLoading ? (
                <div className="runtime-empty">
                  <LoaderCircle className="h-5 w-5 animate-spin text-zinc-600" />
                  <span className="text-xs text-zinc-600">Reading transcript...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="runtime-empty">
                  <span className="text-xs text-zinc-600">No user or assistant messages were found.</span>
                </div>
              ) : (
                <div className="mx-auto max-w-4xl space-y-5">
                  {messages.map((message) => {
                    const MessageIcon = message.role === 'user' ? UserRound : Bot;
                    return (
                      <article
                        key={message.id}
                        className={`flex gap-3 ${message.role === 'user' ? 'sm:pl-16' : 'sm:pr-16'}`}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-zinc-950/50 text-zinc-500">
                          <MessageIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-[10px]">
                            <span className="font-medium text-zinc-400">
                              {message.role === 'user' ? 'User' : message.agent_name || 'Assistant'}
                            </span>
                            <time className="text-zinc-700">{formatTimestamp(message.timestamp)}</time>
                            {message.model && (
                              <span className="truncate font-mono text-zinc-700">{message.model}</span>
                            )}
                          </div>
                          <div className="mt-2 whitespace-pre-wrap break-words rounded-md border border-white/[0.07] bg-zinc-950/35 px-4 py-3 text-sm leading-6 text-zinc-300">
                            {message.content}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
