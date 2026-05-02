'use client';

import { useState, useEffect, useRef } from 'react';
import { Agent, Message } from '@/types';
import { api } from '@/lib/api';

interface ChatInterfaceProps {
  agents: Agent[];
}

export default function ChatInterface({ agents }: ChatInterfaceProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeAgents = agents.filter(a => a.status === 'active');

  useEffect(() => {
    if (selectedAgent) {
      loadChatHistory();
    }
  }, [selectedAgent]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    if (!selectedAgent) return;
    try {
      const history = await api.getChatHistory(selectedAgent.id);
      setMessages(Array.isArray(history) ? history : []);
    } catch (error) {
      console.error('Error loading chat history:', error);
      setMessages([]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedAgent || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      agent_id: selectedAgent.id,
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
      metadata: {}
    };

    // Optimistic Update: Mesajı anında göster
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await api.chat(selectedAgent.id, currentInput);

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        agent_id: selectedAgent.id,
        role: 'assistant',
        content: response.message,
        timestamp: response.timestamp || new Date().toISOString(),
        metadata: {}
      }]);

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        agent_id: selectedAgent.id,
        role: 'system',
        content: `Error: ${String(error)}`,
        timestamp: new Date().toISOString(),
        metadata: { error: String(error) }
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="terminal-title">
        <h1 className="text-3xl font-bold text-white tracking-tighter">AGENT_TERMINAL</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-secondary border border-border p-4 rounded-lg">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold mb-4">Active_Nodes</h2>
            <div className="space-y-2">
              {activeAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={`w-full text-left p-3 rounded transition-all font-mono text-sm ${
                    selectedAgent?.id === agent.id
                      ? 'bg-primary/10 border-l-2 border-primary text-primary'
                      : 'hover:bg-zinc-900 text-zinc-400 border-l-2 border-transparent'
                  }`}
                >
                  <div className="font-bold">{agent.name}</div>
                  <div className="text-[10px] opacity-50 truncate">{agent.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-3">
          <div className="bg-secondary border border-border flex flex-col h-[700px] rounded-lg relative overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-border bg-black/50 backdrop-blur flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${selectedAgent ? 'bg-accent animate-pulse' : 'bg-zinc-700'}`}></div>
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400">
                  {selectedAgent ? `Connection: ${selectedAgent.name}` : 'Awaiting_Selection...'}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono">
              {!selectedAgent ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                  <div className="text-4xl mb-4 opacity-20">_</div>
                  <p className="text-xs uppercase tracking-[0.3em]">Select_Node_To_Initialize</p>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-4 rounded border ${
                          message.role === 'user'
                            ? 'bg-primary/5 border-primary/20 text-white'
                            : message.role === 'assistant'
                            ? 'bg-zinc-900/50 border-zinc-800 text-zinc-300'
                            : 'bg-red-900/10 border-red-900/50 text-red-500'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2 opacity-40 text-[9px] uppercase tracking-widest font-bold">
                          <span>{message.role === 'user' ? 'Local_User' : message.role === 'assistant' ? 'Remote_Agent' : 'System_Error'}</span>
                          <span>•</span>
                          <span>{formatTime(message.timestamp)}</span>
                        </div>
                        <div className="text-[13px] leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="p-4 bg-zinc-900/50 border border-zinc-800 text-primary animate-pulse text-[10px] font-bold tracking-[0.2em] uppercase">
                        Claude_Is_Thinking...
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-black border-t border-border">
              <div className="relative">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={selectedAgent ? "Enter command..." : "Initialize connection first..."}
                  disabled={!selectedAgent || isLoading}
                  className="w-full bg-zinc-900 border border-border rounded p-4 pr-24 text-white placeholder-zinc-700 resize-none focus:border-primary transition-all text-sm font-mono min-h-[100px]"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!selectedAgent || isLoading || !inputMessage.trim()}
                  className="absolute right-3 bottom-3 px-4 py-2 bg-primary text-black font-bold text-xs rounded hover:bg-white transition-all disabled:opacity-20 uppercase tracking-widest"
                >
                  {isLoading ? 'Wait' : 'Run'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
