'use client';

import { useState } from 'react';
import { Agent } from '@/types';
import { api } from '@/lib/api';
import AgentModal from './AgentModal';
import AgentDetailPanel from './AgentDetailPanel';

interface AgentListProps {
  agents: Agent[];
  onRefresh: () => void;
  showAll?: boolean;
}

export default function AgentList({ agents, onRefresh, showAll = false }: AgentListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeDetailAgent, setActiveDetailAgent] = useState<Agent | null>(null);

  const handleCreate = () => {
    setShowCreateModal(true);
  };

  const handleSelectAgent = (agent: Agent) => {
    setActiveDetailAgent(agent);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent opening the detail panel
    if (confirm('Are you sure you want to delete this agent?')) {
      await api.deleteAgent(id);
      onRefresh();
    }
  };

  const handleToggle = async (e: React.MouseEvent, agent: Agent) => {
    e.stopPropagation(); // Prevent opening the detail panel
    if (agent.status === 'active') {
      await api.deactivateAgent(agent.id);
    } else {
      await api.activateAgent(agent.id);
    }
    onRefresh();
  };

  const handleSaveCreate = async (agent: Agent) => {
    await api.createAgent(agent);
    setShowCreateModal(false);
    onRefresh();
  };

  // Group agents by runtime
  const displayAgents = showAll ? agents : agents.slice(0, 6);
  
  const geminiAgents = displayAgents.filter(
    (a) => a.runtime === 'antigravity' || a.id === 'antigravity' || a.config?.type?.includes('antigravity')
  );
  
  const claudeAgents = displayAgents.filter(
    (a) => a.runtime === 'claude' || a.config?.type?.includes('claude')
  );
  
  const codexAgents = displayAgents.filter(
    (a) => a.runtime === 'codex' || a.config?.type?.includes('codex')
  );

  const getStatusColor = (status: string) => {
    if (status === 'active' || status === 'Online') return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]';
    if (status === 'error') return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
    return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]';
  };

  const getSkillLabel = (skillKey: string) => {
    // Extract name from "origin:name"
    const parts = skillKey.split(':');
    return parts.length > 1 ? parts[1] : skillKey;
  };

  const renderAgentCard = (agent: Agent) => {
    // Gather all displayable skills/capabilities
    const skillsToDisplay = agent.skills && agent.skills.length > 0 
      ? agent.skills.map(getSkillLabel) 
      : (agent.capabilities || []);

    const isCoreService = agent.id === 'antigravity';

    return (
      <div 
        key={agent.id}
        onClick={() => handleSelectAgent(agent)}
        className="group relative flex flex-col justify-between bg-zinc-900/40 hover:bg-zinc-900/80 border border-white/5 hover:border-primary/30 rounded-xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(139,92,246,0.06)]"
      >
        <div>
          {/* Card Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(agent.status)}`} />
                <h4 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                  {agent.name}
                </h4>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono mt-1 block truncate">
                🤖 {agent.model}
              </span>
            </div>
            
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-muted uppercase font-black tracking-wider">
              {agent.role || 'Agent'}
            </span>
          </div>

          {/* Description */}
          <p className="text-xs text-muted leading-relaxed mt-4 line-clamp-2 min-h-[32px]">
            {agent.description || 'No operational parameters defined.'}
          </p>

          {/* Skills Badge List */}
          <div className="mt-4 pt-3.5 border-t border-white/[0.04]">
            <span className="text-[8px] font-black text-muted uppercase tracking-widest block mb-2">
              Capabilities & Skills
            </span>
            <div className="flex flex-wrap gap-1">
              {skillsToDisplay.slice(0, 4).map((skill, idx) => (
                <span 
                  key={idx} 
                  className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-muted/80 border border-white/5 truncate max-w-[120px] font-medium"
                  title={skill}
                >
                  {skill}
                </span>
              ))}
              {skillsToDisplay.length > 4 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-bold">
                  +{skillsToDisplay.length - 4}
                </span>
              )}
              {skillsToDisplay.length === 0 && (
                <span className="text-[9px] text-zinc-600 italic">None assigned</span>
              )}
            </div>
          </div>
        </div>

        {/* Card Footer / Quick Actions */}
        <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-white/[0.03]">
          {!isCoreService ? (
            <>
              <button 
                onClick={(e) => handleToggle(e, agent)}
                className={`p-1.5 rounded-lg border border-transparent transition-all hover:bg-white/5 text-muted hover:text-white`}
                title={agent.status === 'active' ? 'Deactivate Node' : 'Activate Node'}
              >
                {agent.status === 'active' ? (
                  <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                )}
              </button>
              <button 
                onClick={(e) => handleDelete(e, agent.id)}
                className="p-1.5 rounded-lg border border-transparent hover:bg-error/10 text-muted hover:text-error transition-all"
                title="Decommission Node"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          ) : (
            <span className="text-[8px] text-primary font-bold uppercase tracking-widest bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
              Core Runtime
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Registry Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Agent Registry</h2>
          <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Autonomous Runtime Orchestrator</p>
        </div>
        {showAll && (
          <button onClick={handleCreate} className="btn btn-primary btn-sm px-4">
            New Agent
          </button>
        )}
      </div>

      {/* Grid of Runtimes / Groups */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* COLUMN 1: .gemini Runtime */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
              <h3 className="text-sm font-black text-white tracking-widest font-mono">.gemini</h3>
            </div>
            <span className="text-[9px] text-zinc-500 font-mono">({geminiAgents.length} nodes)</span>
          </div>
          
          <div className="flex flex-col gap-4 bg-zinc-950/20 border border-white/5 rounded-2xl p-4 min-h-[350px]">
            {geminiAgents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-600">
                <span className="text-xl mb-1">💤</span>
                <span className="text-xs">No active Antigravity nodes</span>
              </div>
            ) : (
              geminiAgents.map(renderAgentCard)
            )}
          </div>
        </div>

        {/* COLUMN 2: .claude Runtime */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
              <h3 className="text-sm font-black text-white tracking-widest font-mono">.claude</h3>
            </div>
            <span className="text-[9px] text-zinc-500 font-mono">({claudeAgents.length} nodes)</span>
          </div>

          <div className="flex flex-col gap-4 bg-zinc-950/20 border border-white/5 rounded-2xl p-4 min-h-[350px]">
            {claudeAgents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-600">
                <span className="text-xl mb-1">💤</span>
                <span className="text-xs">No active Claude Code nodes</span>
              </div>
            ) : (
              claudeAgents.map(renderAgentCard)
            )}
          </div>
        </div>

        {/* COLUMN 3: .codex Runtime */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <h3 className="text-sm font-black text-white tracking-widest font-mono">.codex</h3>
            </div>
            <span className="text-[9px] text-zinc-500 font-mono">({codexAgents.length} nodes)</span>
          </div>

          <div className="flex flex-col gap-4 bg-zinc-950/20 border border-white/5 rounded-2xl p-4 min-h-[350px]">
            {codexAgents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-600">
                <span className="text-xl mb-1">💤</span>
                <span className="text-xs">No active Codex Engine nodes</span>
              </div>
            ) : (
              codexAgents.map(renderAgentCard)
            )}
          </div>
        </div>

      </div>

      {/* Deploy Agent Modal */}
      {showCreateModal && (
        <AgentModal
          agent={null}
          onSave={handleSaveCreate}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit/Configure Slide-Over Details Panel */}
      {activeDetailAgent && (
        <AgentDetailPanel
          agent={activeDetailAgent}
          onClose={() => setActiveDetailAgent(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
