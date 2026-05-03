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
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2 font-display">CLI Sessions</h1>
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
          Live transcript of all Claude CLI conversations for this project
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session List */}
        <div className="lg:col-span-1 space-y-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Sessions ({sessions.length})</h2>
            <button onClick={loadSessions} className="text-xs text-primary hover:text-primary/80 transition-colors">↻ Refresh</button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-zinc-500 animate-pulse">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
              <div className="text-4xl mb-3 opacity-30">📭</div>
              <p className="text-zinc-500 text-sm">No CLI sessions found</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadMessages(s.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                    selectedSession === s.id
                      ? 'bg-primary/10 border-primary/30 shadow-lg shadow-primary/5'
                      : 'bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-800/50 hover:border-zinc-700/50'
                  }`}
                >
                  <p className="text-sm text-zinc-200 truncate font-medium">{s.title}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500">
                    <span>{formatTime(s.timestamp)}</span>
                    <span>•</span>
                    <span>{s.message_count} msgs</span>
                    <span>•</span>
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
            <div className="text-center py-24 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
              <div className="text-6xl mb-4 opacity-20">💬</div>
              <p className="text-zinc-500">Select a session to view conversation</p>
            </div>
          ) : messagesLoading ? (
            <div className="text-center py-24 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
              <div className="animate-pulse text-zinc-500">Loading conversation...</div>
            </div>
          ) : (
            <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 overflow-hidden">
              <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-300">{messages.length} messages</h3>
                <span className="text-[10px] text-zinc-600 font-mono">{selectedSession?.substring(0, 8)}...</span>
              </div>
              <div className="max-h-[65vh] overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.filter(m => m.type !== 'tool_result').map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-xl border transition-all ${
                      msg.role === 'user'
                        ? 'bg-primary/5 border-primary/20 ml-8'
                        : 'bg-zinc-800/30 border-zinc-700/30 mr-8'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        msg.role === 'user' ? 'text-primary' : 'text-green-400'
                      }`}>
                        {msg.role === 'user' ? '👤 YOU' : '🤖 CLAUDE'}
                      </span>
                      {msg.model && (
                        <span className="text-[9px] text-zinc-600 font-mono">{msg.model}</span>
                      )}
                      <span className="text-[10px] text-zinc-600 ml-auto">{formatTime(msg.timestamp)}</span>
                    </div>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">
                      {msg.content.length > 2000 ? msg.content.substring(0, 2000) + '...' : msg.content}
                    </p>
                    {msg.tools && msg.tools.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {msg.tools.map((tool, i) => (
                          <span key={i} className="text-[9px] px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full">
                            🔧 {tool}
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
