'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface CLIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  timestamp: string;
  tools?: string[];
  type?: string;
}

interface CLISession {
  id: string;
  title: string;
  message_count: number;
  timestamp: string;
  file_size: number;
  pid?: number;
  cwd?: string;
}

export default function CLISessions() {
  const [sessions, setSessions] = useState<CLISession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<CLIMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await api.getCLISessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    setMessagesLoading(true);
    setSelectedSession(sessionId);
    try {
      const data = await api.getCLIMessages(sessionId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="card p-12 text-center animate-pulse">
        <div className="text-muted uppercase tracking-[0.4em] font-black">Syncing with CLI Proxy...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
      {/* Session List */}
      <div className="lg:col-span-1 space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">CLI <span className="text-muted font-light">History</span></h2>
            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Matrix Logs</p>
          </div>
          <button onClick={loadSessions} className="btn btn-secondary btn-sm p-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
          {sessions.length === 0 ? (
            <div className="card p-10 text-center border-dashed border-border">
              <p className="text-muted text-xs font-bold uppercase">No sessions detected</p>
            </div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => loadMessages(s.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-300 group ${
                  selectedSession === s.id
                    ? 'bg-primary/10 border-primary/40 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]'
                    : 'bg-surface border-border hover:border-primary/20 hover:bg-white/5'
                }`}
              >
                <p className="text-sm text-white truncate font-bold tracking-tight mb-1 group-hover:text-primary transition-colors">
                  {s.title || 'Session Link ' + s.id.substring(0, 4)}
                </p>
                <div className="flex items-center gap-3 text-[9px] text-muted font-bold uppercase tracking-widest opacity-70">
                  <span>{formatTime(s.timestamp)}</span>
                  <span className="w-1 h-1 rounded-full bg-white/10" />
                  <span>{s.message_count} blocks</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message View */}
      <div className="lg:col-span-2">
        {!selectedSession ? (
          <div className="card p-20 text-center border-dashed border-border h-full flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-6">
              <div className="text-4xl opacity-20">📡</div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Neural Interface Ready</h3>
            <p className="text-sm text-muted">Select a data stream from the matrix to begin decryption.</p>
          </div>
        ) : messagesLoading ? (
          <div className="card p-20 text-center flex flex-col items-center justify-center h-full">
            <div className="animate-pulse space-y-4">
              <div className="w-16 h-1 bg-primary rounded-full mx-auto" />
              <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Decoding Transmission...</p>
            </div>
          </div>
        ) : (
          <div className="card overflow-hidden p-0 border-border flex flex-col h-full bg-surface">
            <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest">{messages.length} Packets Received</h3>
              </div>
              <span className="text-[9px] text-muted font-mono bg-black/40 px-3 py-1 rounded-lg border border-border">UID: {selectedSession.substring(0, 8)}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar max-h-[70vh]">
              {messages.length === 0 ? (
                <p className="text-center text-muted text-xs py-20">NO DATA PACKETS IN THIS STREAM</p>
              ) : (
                messages.filter(m => m.type !== 'tool_result').map((msg) => (
                  <div
                    key={msg.id}
                    className={`relative p-5 rounded-2xl border transition-all ${
                      msg.role === 'user'
                        ? 'bg-primary/5 border-primary/20 ml-8'
                        : 'bg-background border-border mr-8'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${
                        msg.role === 'user' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'
                      }`}>
                        {msg.role === 'user' ? 'Operator' : 'AI Agent'}
                      </span>
                      {msg.model && (
                        <span className="text-[9px] text-muted font-mono opacity-50">{msg.model}</span>
                      )}
                      <span className="text-[9px] text-muted font-bold ml-auto opacity-40">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className="text-sm text-white/90 whitespace-pre-wrap break-words leading-relaxed font-medium">
                      {msg.content}
                    </div>
                    {msg.tools && msg.tools.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-border">
                        {msg.tools.map((tool, i) => (
                          <span key={i} className="text-[9px] px-2 py-1 bg-surface text-muted border border-border rounded-lg font-bold uppercase tracking-widest">
                            ⚡ {tool}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
