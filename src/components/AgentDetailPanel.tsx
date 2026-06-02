/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Agent, AIControlPlaneOverview, AIModel } from '@/types';

interface AgentDetailPanelProps {
  agent: Agent;
  onClose: () => void;
  onRefresh: () => void;
}

export default function AgentDetailPanel({ agent, onClose, onRefresh }: AgentDetailPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [overview, setOverview] = useState<AIControlPlaneOverview | null>(null);
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  
  const [promptSaved, setPromptSaved] = useState(false);
  const [skillsSaved, setSkillsSaved] = useState(false);
  const [detailsSaved, setDetailsSaved] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState('');
  const [runExecute, setRunExecute] = useState(false);
  const [runningAgent, setRunningAgent] = useState(false);
  const [runResult, setRunResult] = useState<any | null>(null);

  // Form States
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description);
  const [model, setModel] = useState(agent.model);
  const [runtime, setRuntime] = useState(agent.runtime || 'antigravity');
  const [status, setStatus] = useState(agent.status);

  // Skills Draft State
  const [draftSkills, setDraftSkills] = useState<string[]>([]);

  // New Skill Form States
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('custom');
  const [newSkillSource, setNewSkillSource] = useState(agent.runtime === 'codex' ? 'codex-user' : agent.runtime === 'claude' ? 'claude' : 'gemini');
  const [newSkillInstructions, setNewSkillInstructions] = useState('');
  const [newSkillFilePath, setNewSkillFilePath] = useState('');
  const [creatingSkill, setCreatingSkill] = useState(false);
  const [skillCreatedSuccess, setSkillCreatedSuccess] = useState(false);

  // Compute exact target key
  const agentTargetKey = useMemo(() => {
    return agent.config?.target_key || 
      (runtime === 'claude' ? `claude_agent:${agent.id}` :
       runtime === 'codex' ? `codex_agent:${agent.id}` :
       agent.id === 'antigravity' ? `antigravity_agent:${agent.id}` : `subagent:${agent.id}`);
  }, [agent, runtime]);

  // Compute file path to prompt
  const promptFilePath = useMemo(() => {
    if (runtime === 'claude') {
      return `.claude/agents/${agent.id}.md`;
    } else if (runtime === 'codex') {
      return `.codex/agents/${agent.id}.md`;
    } else {
      return `.gemini/antigravity/agents/${agent.id}.md`;
    }
  }, [agent, runtime]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch prompt
      const promptData = await api.getAgentPrompt(agent.id);
      setPrompt(promptData.prompt || '');

      // Fetch overview (skills assignments)
      const overviewData = await api.getAIOverview();
      setOverview(overviewData);

      // Fetch model list
      const modelsData = await api.getModels();
      setModels(modelsData);

      // Extract skills assigned to this agent
      const assigned = overviewData.skills
        .filter((skill) =>
          skill.assigned_targets.some((t) => t.target_key === agentTargetKey)
        )
        .map((skill) => skill.skill_key);
      setDraftSkills(assigned);
    } catch (err: any) {
      setError(err.message || 'Failed to load agent configuration data');
    } finally {
      setLoading(false);
    }
  }, [agent.id, agentTargetKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleSkill = (skillKey: string) => {
    setDraftSkills((prev) =>
      prev.includes(skillKey) ? prev.filter((k) => k !== skillKey) : [...prev, skillKey]
    );
  };

  const saveDetails = async () => {
    setSavingDetails(true);
    try {
      await api.updateAgent(agent.id, {
        ...agent,
        name,
        description,
        model,
        runtime,
        status,
        system_prompt: prompt // preserve prompt
      });
      setDetailsSaved(true);
      setTimeout(() => setDetailsSaved(false), 2000);
      onRefresh();
    } catch (err: any) {
      alert('Failed to save details: ' + err.message);
    } finally {
      setSavingDetails(false);
    }
  };

  const savePrompt = async () => {
    setSavingPrompt(true);
    try {
      await api.updateAgent(agent.id, {
        ...agent,
        name,
        description,
        model,
        runtime,
        status,
        system_prompt: prompt
      });
      setPromptSaved(true);
      setTimeout(() => setPromptSaved(false), 2000);
      onRefresh();
    } catch (err: any) {
      alert('Failed to save prompt: ' + err.message);
    } finally {
      setSavingPrompt(false);
    }
  };

  const saveSkills = async () => {
    if (!overview) return;
    setSavingSkills(true);
    try {
      // For each skill in the overview, update its assignments
      for (const skill of overview.skills) {
        const isAssignedInDraft = draftSkills.includes(skill.skill_key);
        const currentTargets = skill.assigned_targets.map((t) => t.target_key);
        const hasAgent = currentTargets.includes(agentTargetKey);

        let nextTargets = [...currentTargets];
        if (isAssignedInDraft && !hasAgent) {
          nextTargets.push(agentTargetKey);
        } else if (!isAssignedInDraft && hasAgent) {
          nextTargets = nextTargets.filter((t) => t !== agentTargetKey);
        }

        const changed = isAssignedInDraft !== hasAgent;
        if (changed) {
          await api.replaceSkillAssignments(skill.skill_key, nextTargets);
        }
      }

      setSkillsSaved(true);
      setTimeout(() => setSkillsSaved(false), 2000);
      
      // Reload overview
      const updatedOverview = await api.getAIOverview();
      setOverview(updatedOverview);
      onRefresh();
    } catch (err: any) {
      alert('Failed to save skills: ' + err.message);
    } finally {
      setSavingSkills(false);
    }
  };

  const handleCreateAndAssignSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    setCreatingSkill(true);
    try {
      // Create the skill globally
      const skill = await api.createSkill({
        name: newSkillName,
        description: newSkillDesc,
        category: newSkillCategory,
        source: newSkillSource,
        instructions: newSkillInstructions,
        file_path: newSkillFilePath,
        enabled: true,
      });

      const newSkillKey = `${skill.source || newSkillSource}:${skill.id}`;

      // Assign to this agent immediately
      await api.replaceSkillAssignments(newSkillKey, [agentTargetKey]);

      setNewSkillName('');
      setNewSkillDesc('');
      setNewSkillCategory('custom');
      setNewSkillSource(runtime === 'codex' ? 'codex-user' : runtime === 'claude' ? 'claude' : 'gemini');
      setNewSkillInstructions('');
      setNewSkillFilePath('');
      
      setSkillCreatedSuccess(true);
      setTimeout(() => setSkillCreatedSuccess(false), 3000);

      // Reload overview
      const updatedOverview = await api.getAIOverview();
      setOverview(updatedOverview);
      onRefresh();
    } catch (err: any) {
      alert('Failed to create and assign skill: ' + err.message);
    } finally {
      setCreatingSkill(false);
    }
  };

  const invokeAgent = async () => {
    if (!runMessage.trim()) return;

    setRunningAgent(true);
    setRunResult(null);
    try {
      const result = await api.chat(
        agent.id,
        runMessage,
        {
          source: 'agent-detail-panel',
          runtime,
          model,
        },
        runExecute
      );
      setRunResult(result);
    } catch (err: any) {
      setRunResult({
        success: false,
        error: err.message || 'Agent invocation failed',
      });
    } finally {
      setRunningAgent(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      savePrompt();
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/60 z-[900] backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />
      
      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-[620px] bg-zinc-950/98 border-l border-white/10 z-[1000] overflow-y-auto custom-scrollbar shadow-2xl p-6 transition-all duration-300 animate-slide-in flex flex-col justify-between">
        <div className="space-y-8">
          {/* Panel Header */}
          <div className="flex items-start justify-between border-b border-white/5 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-black text-muted uppercase tracking-[0.25em]">
                  Agent Identity Control
                </span>
              </div>
              <h2 className="text-2xl font-black text-white mt-1">{name || agent.name}</h2>
              <p className="text-[10px] text-muted font-mono mt-0.5 break-all">ID: {agent.id} · Type: {agent.config?.type || 'Standard Agent'}</p>
            </div>
            
            <button 
              onClick={onClose} 
              className="p-2 rounded-lg border border-white/10 text-muted hover:text-white hover:bg-white/5 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-24 bg-white/5 rounded-xl" />
              <div className="h-40 bg-white/5 rounded-xl" />
              <div className="h-60 bg-white/5 rounded-xl" />
            </div>
          ) : error ? (
            <div className="glass-card border-error/20 p-6 text-center">
              <span className="text-xl">⚠️</span>
              <p className="text-sm text-white font-bold mt-2">Error Loading Agent Config</p>
              <p className="text-xs text-muted mt-1">{error}</p>
              <button onClick={loadData} className="btn btn-primary btn-sm mt-4">Retry</button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* SECTION 1: Identity & Description Form */}
              <div className="glass-card bg-surface/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Identity Details</h3>
                    <p className="text-[9px] text-muted font-medium uppercase tracking-widest mt-0.5">Parameters & model binding</p>
                  </div>
                  <button 
                    onClick={saveDetails} 
                    disabled={savingDetails} 
                    className={`btn btn-sm ${detailsSaved ? 'btn-success bg-green-600/20 border-green-500/30 text-green-400' : 'btn-primary'}`}
                  >
                    {savingDetails ? 'Saving...' : detailsSaved ? '✓ Saved' : 'Save Details'}
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-muted uppercase tracking-widest ml-1">Designation</label>
                      <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        className="input py-2 text-xs" 
                        placeholder="Agent Name"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-muted uppercase tracking-widest ml-1">Runtime</label>
                      <select
                        value={runtime}
                        onChange={(e) => setRuntime(e.target.value)}
                        className="select py-2 text-xs"
                      >
                        <option value="antigravity">Gemini / Antigravity</option>
                        <option value="codex">Codex</option>
                        <option value="claude">Claude</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-muted uppercase tracking-widest ml-1">Binding Model</label>
                      <select 
                        value={model} 
                        onChange={(e) => setModel(e.target.value)}
                        className="select py-2 text-xs"
                      >
                        {models.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                        {models.length === 0 && (
                          <>
                            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                            <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                            <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted uppercase tracking-widest ml-1">Operational State</label>
                    <div className="flex gap-2">
                      {['active', 'inactive'].map((state) => (
                        <button
                          key={state}
                          type="button"
                          onClick={() => setStatus(state as any)}
                          className={`flex-1 py-1.5 rounded-lg border text-xs font-black uppercase tracking-wider transition-all ${
                            status === state 
                              ? state === 'active' 
                                ? 'bg-accent/15 border-accent/40 text-accent' 
                                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                              : 'bg-transparent border-white/5 text-muted hover:bg-white/5'
                          }`}
                        >
                          {state}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted uppercase tracking-widest ml-1">Mission / Role Description</label>
                    <textarea 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)}
                      className="textarea text-xs py-2 min-h-[60px]" 
                      placeholder="Specify mission instructions..."
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Persona Prompt Markdown Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">System Persona Prompt</h3>
                    <p className="text-[9px] text-muted font-mono uppercase tracking-widest mt-0.5">
                      Target File: <span className="text-primary font-bold">{promptFilePath}</span>
                    </p>
                  </div>
                  <button 
                    onClick={savePrompt} 
                    disabled={savingPrompt} 
                    className={`btn btn-sm ${promptSaved ? 'btn-success bg-green-600/20 border-green-500/30 text-green-400' : 'btn-primary'}`}
                  >
                    {savingPrompt ? 'Saving...' : promptSaved ? '✓ Saved' : 'Save Prompt (Ctrl+S)'}
                  </button>
                </div>

                <div className="glass-card rounded-xl border border-white/10 overflow-hidden p-0 bg-zinc-950">
                  <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-b border-white/5 text-[9.5px] font-mono text-zinc-500">
                    <div>✏️ Markdown Prompt Editor</div>
                    <div>{prompt.split('\n').length} lines · {prompt.length} chars</div>
                  </div>
                  
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full h-72 p-4 bg-zinc-950/80 text-zinc-200 font-mono text-xs leading-relaxed resize-none focus:outline-none"
                    placeholder="# Persona Guidelines..."
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* SECTION 3: Skills Checklist matrix */}
              <div className="glass-card bg-surface/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Agent Invocation</h3>
                    <p className="text-[9px] text-muted font-medium uppercase tracking-widest mt-0.5">
                      Prompt preview or runtime CLI execution
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-[9px] font-black text-muted uppercase tracking-widest cursor-pointer">
                    <input
                      type="checkbox"
                      checked={runExecute}
                      onChange={(e) => setRunExecute(e.target.checked)}
                      className="w-4 h-4 accent-[var(--primary)]"
                    />
                    Execute CLI
                  </label>
                </div>

                <div className="space-y-3">
                  <textarea
                    value={runMessage}
                    onChange={(e) => setRunMessage(e.target.value)}
                    className="textarea text-xs py-2 min-h-[92px]"
                    placeholder="Give this agent a task..."
                  />

                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 text-[9px] text-muted font-mono uppercase tracking-widest truncate">
                      Runtime: <span className="text-primary font-bold">{runtime}</span> | Model: <span className="text-primary font-bold">{model || 'unbound'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={invokeAgent}
                      disabled={runningAgent || !runMessage.trim()}
                      className="btn btn-sm btn-primary px-4 py-2 font-black uppercase tracking-wider text-[10px] shrink-0"
                    >
                      {runningAgent ? 'Running...' : runExecute ? 'Run Agent' : 'Prepare Prompt'}
                    </button>
                  </div>

                  {runResult && (
                    <div className={`rounded-xl border p-3 text-xs animate-fade-in ${
                      runResult.success === false
                        ? 'border-error/30 bg-error/10 text-red-200'
                        : 'border-primary/20 bg-zinc-950/70 text-zinc-200'
                    }`}>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted">
                          {runResult.dry_run ? 'Dry Run Result' : runResult.success === false ? 'Execution Error' : 'Execution Result'}
                        </span>
                        {runResult.command_preview && (
                          <span className="text-[9px] font-mono text-zinc-500 truncate max-w-[320px]">
                            {runResult.command_preview}
                          </span>
                        )}
                      </div>
                      <pre className="max-h-52 overflow-auto custom-scrollbar whitespace-pre-wrap break-words text-[10px] leading-relaxed font-mono">
                        {runResult.output || runResult.error || runResult.prompt || JSON.stringify(runResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 4: Skills Checklist matrix */}
              <div className="glass-card bg-surface/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Capabilities & Skills Matrix</h3>
                    <p className="text-[9px] text-muted font-medium uppercase tracking-widest mt-0.5">Toggle agent tool permissions</p>
                  </div>
                  <button 
                    onClick={saveSkills} 
                    disabled={savingSkills} 
                    className={`btn btn-sm ${skillsSaved ? 'btn-success bg-green-600/20 border-green-500/30 text-green-400' : 'btn-primary'}`}
                  >
                    {savingSkills ? 'Saving...' : skillsSaved ? '✓ Saved' : 'Save Skills'}
                  </button>
                </div>

                <div className="divide-y divide-white/5 overflow-y-auto custom-scrollbar max-h-52 pr-1">
                  {/* Group skills by origin */}
                  {['gemini', 'claude', 'codex'].map((origin) => {
                    const originSkills = overview?.skills.filter(s => s.origin === origin) || [];
                    if (originSkills.length === 0) return null;
                    
                    return (
                      <div key={origin} className="py-2.5 first:pt-0 last:pb-0">
                        <div className="text-[9px] font-black uppercase tracking-wider text-primary-light mb-1.5 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-primary-light" />
                          {origin === 'gemini' ? '.gemini (Antigravity)' : origin === 'claude' ? '.claude (Claude Code)' : '.codex (Codex)'}
                        </div>
                        <div className="space-y-1 pl-1">
                          {originSkills.map((skill) => {
                            const isChecked = draftSkills.includes(skill.skill_key);
                            return (
                              <label 
                                key={skill.skill_key}
                                className="flex items-start justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.02] cursor-pointer transition-colors"
                              >
                                <div className="min-w-0 pr-4">
                                  <span className="text-xs font-bold text-white block">{skill.name}</span>
                                  <span className="text-[9px] text-muted font-mono block truncate">{skill.description}</span>
                                </div>
                                <input 
                                  type="checkbox" 
                                  checked={isChecked}
                                  onChange={() => handleToggleSkill(skill.skill_key)}
                                  className="w-4 h-4 mt-0.5 accent-[var(--primary)] cursor-pointer"
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {(!overview || overview.skills.length === 0) && (
                    <p className="text-xs text-muted text-center py-6">No capabilities registered.</p>
                  )}
                </div>
              </div>

              {/* SECTION 5: Create and Assign Skill */}
              <div className="glass-card border-primary/20 bg-primary/5">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span>⚡ Create & Equip New Skill</span>
                  </h3>
                  <p className="text-[9px] text-muted font-medium uppercase tracking-widest mt-0.5">Register a new tool and link it directly</p>
                </div>

                <form onSubmit={handleCreateAndAssignSkill} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-muted uppercase tracking-widest ml-1">Skill Name</label>
                      <input 
                        type="text" 
                        value={newSkillName}
                        onChange={(e) => setNewSkillName(e.target.value)}
                        className="input py-2 text-xs" 
                        placeholder="e.g. file-search"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-muted uppercase tracking-widest ml-1">Category</label>
                      <select
                        value={newSkillCategory}
                        onChange={(e) => setNewSkillCategory(e.target.value)}
                        className="select py-2 text-xs"
                      >
                        <option value="system">System Skill</option>
                        <option value="tools">Tool Use</option>
                        <option value="custom">Custom Extension</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-muted uppercase tracking-widest ml-1">Skill Source</label>
                    <select
                      value={newSkillSource}
                      onChange={(e) => setNewSkillSource(e.target.value)}
                      className="select py-2 text-xs"
                    >
                      <option value="gemini">Gemini / Antigravity</option>
                      <option value="codex-user">Codex User Skill</option>
                      <option value="claude">Claude Dashboard Skill</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-muted uppercase tracking-widest ml-1">Description</label>
                    <input 
                      type="text" 
                      value={newSkillDesc}
                      onChange={(e) => setNewSkillDesc(e.target.value)}
                      className="input py-2 text-xs" 
                      placeholder="What this skill does..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-muted uppercase tracking-widest ml-1">Instructions</label>
                    <textarea
                      value={newSkillInstructions}
                      onChange={(e) => setNewSkillInstructions(e.target.value)}
                      className="textarea text-xs py-2 min-h-[90px]"
                      placeholder="Write the exact behavior, constraints, and steps this skill should inject into the agent."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-muted uppercase tracking-widest ml-1">Script File Path</label>
                    <input 
                      type="text" 
                      value={newSkillFilePath}
                      onChange={(e) => setNewSkillFilePath(e.target.value)}
                      className="input py-2 text-xs font-mono" 
                      placeholder="e.g. tools/file_search.py"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button 
                      type="submit" 
                      disabled={creatingSkill || !newSkillName.trim()} 
                      className="btn btn-sm btn-primary px-5 py-2 font-black uppercase tracking-wider text-[10px]"
                    >
                      {creatingSkill ? 'Equipping...' : 'Equip Skill & Reload'}
                    </button>
                  </div>
                  
                  {skillCreatedSuccess && (
                    <div className="text-[10px] text-green-400 font-bold bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg text-center animate-fade-in">
                      ✓ Custom Skill successfully created and assigned to {name}!
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 pt-4 mt-8 flex items-center justify-between text-[10px] text-zinc-500">
          <div>💡 Press Escape to dismiss details drawer</div>
          <button onClick={onClose} className="hover:text-white uppercase tracking-wider font-bold">Dismiss</button>
        </div>
      </div>
    </>
  );
}
