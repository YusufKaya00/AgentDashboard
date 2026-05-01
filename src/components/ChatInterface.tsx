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

    const userMessage = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await api.chat(selectedAgent.id, userMessage);

      // Add user message
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        agent_id: selectedAgent.id,
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
        metadata: {}
      }]);

      // Add AI response
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        agent_id: selectedAgent.id,
        role: 'assistant',
        content: response.message,
        timestamp: response.timestamp,
        metadata: {}
      }]);

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        agent_id: selectedAgent.id,
        role: 'system',
        content: 'Error: Failed to send message',
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
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Chat</h1>
        <p className="text-zinc-400">Have conversations with your AI agents</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Agent Selection */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 p-6">
            <h2 className="text-lg font-semibold mb-4 text-white">Select Agent</h2>
            {activeAgents.length === 0 ? (
              <p className="text-zinc-400 text-sm">No active agents</p>
            ) : (
              <div className="space-y-2">
                {activeAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      selectedAgent?.id === agent.id
                        ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/10 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/10'
                        : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <div className="font-semibold">{agent.name}</div>
                    <div className="text-xs text-zinc-500 mt-1">{agent.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-3">
          <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 flex flex-col h-[650px]">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {!selectedAgent ? (
                <div className="text-center text-zinc-400 py-16">
                  <div className="text-6xl mb-4">💬</div>
                  <p className="text-lg">Select an agent to start chatting</p>
                  <p className="text-sm mt-2">Choose an agent from the sidebar</p>
                </div>
              ) : !Array.isArray(messages) || messages.length === 0 ? (
                <div className="text-center text-zinc-400 py-16">
                  <div className="text-6xl mb-4">👋</div>
                  <p className="text-lg">Start a conversation</p>
                  <p className="text-sm mt-2">Send your first message to {selectedAgent.name}</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl p-4 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25'
                          : message.role === 'assistant'
                          ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      <div className="text-sm leading-relaxed">{message.content}</div>
                      <div className="text-xs mt-2 opacity-70">{formatTime(message.timestamp)}</div>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 rounded-2xl p-4 border border-zinc-700">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-zinc-800/50">
              <div className="flex gap-3">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={!selectedAgent || isLoading}
                  className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-5 py-4 text-white placeholder-zinc-500 resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  rows={2}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!selectedAgent || isLoading || !inputMessage.trim()}
                  className="px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white rounded-xl transition-all font-medium shadow-lg shadow-orange-500/25"
                >
                  {isLoading ? '...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
