'use client';

import { useState, useEffect } from 'react';

interface Session {
  id: string;
  title: string;
  timestamp: string;
  message_count: number;
  file_size: number;
}

interface Message {
  id: string;
  type: string;
  role: string;
  content: string;
  timestamp: string;
  tools?: string[];
  model?: string;
}

const API_BASE = 'http://localhost:8000/api';

export default function CLISessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/cli/sessions`);
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    setSelectedSession(sessionId);
    setMessagesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/cli/sessions/${sessionId}`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">CLI <span className="text-[var(--foreground-muted)] font-light">Sessions</span></h1>
        <p className="text-[var(--foreground-muted)] font-mono text-[10px] uppercase tracking-[0.3em]">
          Live transcript of all Claude CLI conversations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Sessions ({sessions.length})</h2>
            <button onClick={loadSessions} className="text-[10px] font-bold text-[var(--primary)] hover:text-[var(--primary-glow)] transition-colors uppercase tracking-widest">↻ Refresh</button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-[var(--foreground-muted)] animate-pulse font-bold uppercase tracking-widest text-[10px]">Synchronizing...</div>
          ) : sessions.length === 0 ? (
            <div className="glass-card p-12 text-center border-dashed">
              <div className="text-4xl mb-4 opacity-20">📭</div>
              <p className="text-[var(--foreground-muted)] text-sm font-bold uppercase tracking-widest">No sessions found</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadMessages(s.id)}
                  className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 group ${
                    selectedSession === s.id
                      ? 'bg-[var(--primary)] bg-opacity-10 border-[var(--primary)] border-opacity-30 shadow-[0_0_20px_var(--primary-glow)]'
                      : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'
                  }`}
                >
                  <p className="text-sm text-white truncate font-bold tracking-tight mb-2 group-hover:text-[var(--primary)] transition-colors">{s.title || 'Unnamed Session'}</p>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--foreground-muted)] font-bold uppercase tracking-widest opacity-60">
                    <span>{formatTime(s.timestamp)}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>{s.message_count} msgs</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>{formatSize(s.file_size)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message View */}
        <div className="lg:col-span-2">
          {!selectedSession ? (
            <div className="glass-card p-20 text-center border-dashed border-white/10">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8">
                <div className="text-5xl opacity-20">💬</div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Neural Link Ready</h3>
              <p className="text-sm text-[var(--foreground-muted)]">Select a session from the matrix to decode conversation data.</p>
            </div>
          ) : messagesLoading ? (
            <div className="glass-card p-20 text-center">
              <div className="animate-pulse space-y-4">
                <div className="w-16 h-1 bg-[var(--primary)] rounded-full mx-auto" />
                <p className="text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-[0.3em]">Decoding Transmission...</p>
              </div>
            </div>
          ) : (
            <div className="glass-card overflow-hidden p-0 border-white/10">
              <div className="p-5 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                  <h3 className="text-[10px] font-black text-white uppercase tracking-widest">{messages.length} Data Blocks</h3>
                </div>
                <span className="text-[10px] text-[var(--foreground-muted)] font-mono bg-black/40 px-3 py-1 rounded-lg border border-white/5">{selectedSession?.substring(0, 12)}</span>
              </div>
              <div className="max-h-[65vh] overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.filter(m => m.type !== 'tool_result').map((msg) => (
                  <div
                    key={msg.id}
                    className={`relative p-5 rounded-2xl border transition-all ${
                      msg.role === 'user'
                        ? 'bg-[var(--primary)] bg-opacity-5 border-[var(--primary)] border-opacity-10 ml-12'
                        : 'bg-white/5 border-white/5 mr-12'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${
                        msg.role === 'user' ? 'bg-[var(--primary)] bg-opacity-10 text-[var(--primary)]' : 'bg-[var(--accent)] bg-opacity-10 text-[var(--accent)]'
                      }`}>
                        {msg.role === 'user' ? 'Operator' : 'AI Agent'}
                      </span>
                      {msg.model && (
                        <span className="text-[9px] text-[var(--foreground-muted)] font-mono opacity-50">{msg.model}</span>
                      )}
                      <span className="text-[9px] text-[var(--foreground-muted)] font-bold ml-auto opacity-40">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className="text-sm text-white/90 whitespace-pre-wrap break-words leading-relaxed font-medium">
                      {msg.content.length > 5000 ? msg.content.substring(0, 5000) + '...' : msg.content}
                    </div>
                    {msg.tools && msg.tools.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-white/5">
                        {msg.tools.map((tool, i) => (
                          <span key={i} className="text-[9px] px-3 py-1 bg-white/5 text-white/60 border border-white/10 rounded-lg font-bold uppercase tracking-widest">
                            ⚡ {tool}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
