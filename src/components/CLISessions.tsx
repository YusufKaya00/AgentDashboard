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
      const sortedSessions = Array.isArray(data) ? data : [];
      setSessions(sortedSessions);
      // Auto-select latest session if none selected
      if (sortedSessions.length > 0 && !selectedSession) {
        loadMessages(sortedSessions[0].id);
      }
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
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
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
        <div className="text-muted uppercase tracking-[0.4em] font-black">Syncing Session Data...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-200px)]">
      {/* Session List */}
      <div className="lg:col-span-1 flex flex-col space-y-4 h-full">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Session History</h2>
            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-0.5">CLI Transmission Logs</p>
          </div>
          <button onClick={loadSessions} className="p-2 hover:bg-white/5 rounded-lg text-muted hover:text-white transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
          {sessions.length === 0 ? (
            <div className="card p-10 text-center border-dashed border-border">
              <p className="text-muted text-xs font-bold uppercase">No active streams</p>
            </div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => loadMessages(s.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-300 group ${
                  selectedSession === s.id
                    ? 'bg-primary/10 border-primary/40 shadow-sm'
                    : 'bg-surface border-border hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <p className={`text-sm truncate font-bold tracking-tight mb-1 transition-colors ${selectedSession === s.id ? 'text-primary' : 'text-white'}`}>
                  {s.title || 'Untitled Session'}
                </p>
                <div className="flex items-center gap-3 text-[9px] text-muted font-bold uppercase tracking-widest opacity-70">
                  <span className="tabular-nums">{formatTime(s.timestamp)}</span>
                  <span className="w-1 h-1 rounded-full bg-white/10" />
                  <span>{s.message_count} blocks</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message View */}
      <div className="lg:col-span-2 h-full">
        {!selectedSession ? (
          <div className="card p-20 text-center border-dashed border-border h-full flex flex-col items-center justify-center bg-white/[0.01]">
            <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center mb-6 border border-border">
              <svg className="w-8 h-8 text-muted opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Select a stream</h3>
            <p className="text-xs text-muted">Choose a conversation from the history to view data packets.</p>
          </div>
        ) : messagesLoading ? (
          <div className="card p-20 text-center flex flex-col items-center justify-center h-full bg-white/[0.01]">
            <div className="animate-pulse space-y-4">
              <div className="w-12 h-1 bg-primary rounded-full mx-auto" />
              <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Decoding Feed...</p>
            </div>
          </div>
        ) : (
          <div className="card overflow-hidden p-0 border-border flex flex-col h-full bg-surface/50 backdrop-blur-sm">
            <div className="p-4 border-b border-border bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest">{messages.length} Data Packets</h3>
              </div>
              <span className="text-[9px] text-muted font-mono bg-black/40 px-3 py-1 rounded-lg border border-border">ID: {selectedSession.substring(0, 8)}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-muted text-xs font-bold uppercase tracking-widest">Stream contains no message data</p>
                </div>
              ) : (
                messages.filter(m => m.type !== 'tool_result').map((msg) => (
                  <div
                    key={msg.id}
                    className={`relative flex flex-col ${
                      msg.role === 'user' ? 'items-end ml-12' : 'items-start mr-12'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {msg.role === 'assistant' && (
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">AI Agent</span>
                      )}
                      <span className="text-[9px] text-muted font-bold opacity-40">{formatTime(msg.timestamp)}</span>
                      {msg.role === 'user' && (
                        <span className="text-[9px] font-black text-accent uppercase tracking-widest">Operator</span>
                      )}
                    </div>
                    
                    <div className={`p-4 rounded-2xl border text-sm leading-relaxed transition-all ${
                      msg.role === 'user'
                        ? 'bg-primary/5 border-primary/20 text-white'
                        : 'bg-background border-border text-white/90 shadow-sm'
                    }`}>
                      {msg.content}
                    </div>

                    {msg.tools && msg.tools.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {msg.tools.map((tool, i) => (
                          <span key={i} className="text-[8px] px-2 py-0.5 bg-surface text-muted border border-border rounded font-bold uppercase tracking-widest">
                            {tool}
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
