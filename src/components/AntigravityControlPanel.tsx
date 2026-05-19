'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import type { Agent, UnifiedSkill, AIControlPlaneOverview, AntigravityOverview } from '@/types';

export default function AntigravityControlPanel() {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [skillsOverview, setSkillsOverview] = useState<AIControlPlaneOverview | null>(null);
  const [antigravityOverview, setAntigravityOverview] = useState<AntigravityOverview | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);
  const [skillsSaved, setSkillsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftSkills, setDraftSkills] = useState<string[]>([]); // Array of skill_keys assigned to Antigravity

  const otherAgents = useMemo(() => {
    if (!skillsOverview) return [];
    return skillsOverview.targets.filter(
      (t) => t.type === 'claude_agent' || t.type === 'codex_agent'
    );
  }, [skillsOverview]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch Antigravity Agent Metadata using the clean API client helper
      const agentData = await api.getAgent('antigravity');
      setAgent(agentData);

      // Fetch Antigravity Prompt
      const promptData = await api.getAgentPrompt('antigravity');
      setPrompt(promptData.prompt || '');

      // Fetch Skills Control Plane Overview
      const overview = await api.getAIOverview();
      setSkillsOverview(overview);

      // Fetch Antigravity Observability Overview
      try {
        const agOverview = await api.getAntigravityOverview();
        setAntigravityOverview(agOverview);
      } catch (err) {
        console.error('Failed to load Antigravity overview data:', err);
      }

      // Extract skills currently assigned to Antigravity
      const assigned = overview.skills
        .filter((skill: UnifiedSkill) =>
          skill.assigned_targets.some((t) => t.target_key === 'antigravity_agent:antigravity')
        )
        .map((skill: UnifiedSkill) => skill.skill_key);
      setDraftSkills(assigned);
    } catch (err: any) {
      setError(err.message || 'Failed to load Antigravity dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSkill = (skillKey: string) => {
    setDraftSkills((prev) =>
      prev.includes(skillKey) ? prev.filter((k) => k !== skillKey) : [...prev, skillKey]
    );
  };

  const saveSkills = async () => {
    if (!skillsOverview) return;
    setSavingSkills(true);
    try {
      // For each skill in the overview, update its assignments
      for (const skill of skillsOverview.skills) {
        const isAssignedInDraft = draftSkills.includes(skill.skill_key);
        const currentTargets = skill.assigned_targets.map((t) => t.target_key);
        const hasAntigravity = currentTargets.includes('antigravity_agent:antigravity');

        let nextTargets = [...currentTargets];
        if (isAssignedInDraft && !hasAntigravity) {
          nextTargets.push('antigravity_agent:antigravity');
        } else if (!isAssignedInDraft && hasAntigravity) {
          nextTargets = nextTargets.filter((t) => t !== 'antigravity_agent:antigravity');
        }

        // Only call API if there's a difference
        const changed = isAssignedInDraft !== hasAntigravity;
        if (changed) {
          await api.replaceSkillAssignments(skill.skill_key, nextTargets);
        }
      }

      setSkillsSaved(true);
      setTimeout(() => setSkillsSaved(false), 2000);
      await loadData();
    } catch (err: any) {
      alert('Failed to save skills: ' + err.message);
    } finally {
      setSavingSkills(false);
    }
  };

  const savePrompt = async () => {
    if (!agent) return;
    setSavingPrompt(true);
    try {
      await api.updateAgent('antigravity', {
        ...agent,
        system_prompt: prompt,
      });
      setPromptSaved(true);
      setTimeout(() => setPromptSaved(false), 2000);
    } catch (err: any) {
      alert('Failed to save prompt: ' + err.message);
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      savePrompt();
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-12 flex flex-col items-center justify-center animate-pulse">
        <div className="w-16 h-16 bg-white/5 rounded-2xl mb-6" />
        <div className="h-4 bg-white/5 rounded w-48 mb-2" />
        <div className="h-3 bg-white/5 rounded w-32" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="glass-card border-error/20">
        <h3 className="text-xl font-bold text-white">Antigravity Offline</h3>
        <p className="text-sm text-muted mt-2">{error || 'Could not fetch Antigravity metadata.'}</p>
        <button onClick={loadData} className="btn btn-primary btn-sm mt-5">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Overview Metadata Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="glass-card xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] text-primary font-black uppercase tracking-[0.3em]">AI Agent Core</p>
              <h2 className="text-3xl font-black text-white mt-2">{agent.name}</h2>
              <p className="text-sm text-muted mt-3 leading-relaxed">{agent.description}</p>
            </div>
            <span className="badge text-accent border-accent/20 bg-accent/5 capitalize">
              {agent.status}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            {agent.capabilities && agent.capabilities.map((cap) => (
              <span
                key={cap}
                className="text-[9px] px-2.5 py-1 rounded-md bg-white/5 text-muted border border-white/5 uppercase tracking-wider font-bold"
              >
                {cap}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <div className="card-sm">
              <span className="text-[10px] text-muted font-black uppercase tracking-widest">Model Binding</span>
              <p className="text-sm text-white font-mono mt-2">{agent.model}</p>
            </div>
            <div className="card-sm">
              <span className="text-[10px] text-muted font-black uppercase tracking-widest">Target Key</span>
              <p className="text-sm text-white font-mono mt-2">antigravity_agent:antigravity</p>
            </div>
            <div className="card-sm md:col-span-2">
              <span className="text-[10px] text-muted font-black uppercase tracking-widest">Antigravity Home</span>
              <p className="text-xs text-accent font-mono mt-2 break-all">{antigravityOverview?.antigravity_home || 'Loading...'}</p>
            </div>
            <div className="card-sm md:col-span-2">
              <span className="text-[10px] text-muted font-black uppercase tracking-widest">Workspace</span>
              <p className="text-xs text-white font-mono mt-2 break-all">{antigravityOverview?.workspace_dir || 'Loading...'}</p>
            </div>
          </div>

          {/* Peer Nodes */}
          <div className="mt-8 pt-6 border-t border-white/[0.04]">
            <h4 className="text-xs font-black text-muted uppercase tracking-[0.2em] mb-4">Peer Autonomous Nodes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherAgents.map((peer) => (
                <div key={peer.target_key} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-colors">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">{peer.name}</span>
                    <span className="text-[9px] text-muted font-mono block uppercase tracking-wider mt-0.5">
                      {peer.type === 'codex_agent' ? 'Codex Agent' : `Claude Node (${peer.metadata.model || 'N/A'})`}
                    </span>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border ${
                    peer.status === 'active' || peer.status === 'Online' || peer.type === 'codex_agent'
                      ? 'text-accent border-accent/20 bg-accent/5'
                      : 'text-muted border-border bg-surface'
                  }`}>
                    {peer.status || 'Active'}
                  </span>
                </div>
              ))}
              {otherAgents.length === 0 && (
                <p className="text-xs text-muted">No other active fleet nodes found.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Skills Assignment inside Antigravity Panel */}
          <div className="glass-card flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Capabilities & Skills</h3>
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-0.5">
                  Toggle skills for this agent
                </p>
              </div>
              <button
                onClick={saveSkills}
                disabled={savingSkills}
                className={`btn btn-sm ${
                  skillsSaved ? 'btn-success' : 'btn-primary'
                } px-4 py-1.5`}
              >
                {savingSkills ? 'Saving...' : skillsSaved ? '✓ Saved' : 'Save Skills'}
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar pr-1 max-h-[200px] divide-y divide-white/5">
              {skillsOverview?.skills.map((skill) => {
                const isChecked = draftSkills.includes(skill.skill_key);
                return (
                  <label
                    key={skill.skill_key}
                    className="flex items-center justify-between py-2.5 hover:bg-white/[0.02] px-2 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 pr-4">
                      <span className="text-xs font-bold text-white block truncate">{skill.name}</span>
                      <span className="text-[9px] text-muted block truncate font-mono">{skill.skill_key}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleSkill(skill.skill_key)}
                      className="w-4 h-4 accent-[var(--primary)]"
                    />
                  </label>
                );
              })}
              {(!skillsOverview || skillsOverview.skills.length === 0) && (
                <p className="text-xs text-muted text-center py-6">No system skills registered.</p>
              )}
            </div>
          </div>

          {/* Config Snapshot */}
          <div className="glass-card">
            <h3 className="text-lg font-bold text-white tracking-tight">Config Snapshot</h3>
            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-0.5">
              Global files under .gemini
            </p>
            <div className="space-y-3 mt-5">
              {antigravityOverview?.files.map((file) => (
                <div key={file.name} className="flex items-center justify-between gap-4 py-2 border-b border-white/5 last:border-0">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate font-mono">{file.name}</div>
                    {file.exists && file.updated_at && (
                      <div className="text-[9px] text-muted font-mono mt-0.5">
                        {new Date(file.updated_at).toLocaleString()} · {file.size} bytes
                      </div>
                    )}
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border font-mono ${file.exists ? 'text-accent border-accent/20 bg-accent/5' : 'text-muted border-border bg-surface'}`}>
                    {file.exists ? 'Found' : 'Missing'}
                  </span>
                </div>
              ))}
              {(!antigravityOverview || antigravityOverview.files.length === 0) && (
                <p className="text-xs text-muted text-center py-4">No global config files found.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Persona Prompt Editor */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Agent Persona Prompt</h3>
            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">
              Live Markdown Config: <code className="text-primary font-mono">.gemini/antigravity/agents/antigravity.md</code>
            </p>
          </div>
          <button
            onClick={savePrompt}
            disabled={savingPrompt}
            className={`btn ${
              promptSaved ? 'btn-success' : 'btn-primary'
            } px-5 py-2`}
          >
            {savingPrompt ? '⏳ Saving...' : promptSaved ? '✓ Saved!' : '💾 Save Prompt (Ctrl+S)'}
          </button>
        </div>

        <div className="glass-card rounded-2xl border border-border overflow-hidden p-0">
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs text-zinc-500 font-mono ml-2">antigravity.md</span>
            </div>
            <div className="text-xs text-zinc-600 font-mono">
              {prompt.split('\n').length} lines · {prompt.length} chars
            </div>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-[500px] p-6 bg-zinc-950 text-zinc-200 font-mono text-sm leading-relaxed resize-none focus:outline-none selection:bg-primary/30"
            spellCheck={false}
            placeholder="# Antigravity Agent System Persona Prompt..."
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <span>💡</span>
          <span>
            Edits to this prompt directly update the agent markdown file. The updated persona is applied instantly to future Antigravity commands and tasks.
          </span>
        </div>
      </section>
    </div>
  );
}
