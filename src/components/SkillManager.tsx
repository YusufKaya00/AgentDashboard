'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { AIControlPlaneOverview, AITarget, AITargetType, SkillSource, UnifiedSkill } from '@/types';

const sourceLabels: Record<SkillSource | 'all', string> = {
  all: 'All',
  claude: 'Claude',
  gemini: 'Antigravity / Gemini',
  'codex-system': 'Codex System',
  'codex-plugin': 'Codex Plugin',
  'codex-user': 'Codex User',
};

const sourceStyles: Record<SkillSource, string> = {
  claude: 'text-primary border-primary/30 bg-primary/10',
  gemini: 'text-warning border-warning/30 bg-warning/10',
  'codex-system': 'text-info border-info/30 bg-info/10',
  'codex-plugin': 'text-secondary border-secondary/30 bg-secondary/10',
  'codex-user': 'text-accent border-accent/30 bg-accent/10',
};

const targetLabels: Record<AITargetType, string> = {
  claude_agent: 'Claude Agents',
  codex_agent: 'Codex Roles',
  antigravity_agent: 'Antigravity Core',
  model: 'Models',
  provider: 'Providers',
  subagent: 'Subagents',
};

const targetOrder: AITargetType[] = ['claude_agent', 'antigravity_agent', 'subagent', 'codex_agent', 'model', 'provider'];

const getSkillTargets = (skill: UnifiedSkill, targets: AITarget[]) => {
  const assignedKeys = new Set(skill.assigned_targets.map((assignment) => assignment.target_key));
  return targets.filter((target) => assignedKeys.has(target.target_key));
};

export default function SkillManager() {
  const [overview, setOverview] = useState<AIControlPlaneOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<SkillSource | 'all'>('all');
  const [selectedSkillKey, setSelectedSkillKey] = useState<string | null>(null);
  const [draftTargetKeys, setDraftTargetKeys] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSkill, setNewSkill] = useState({
    name: '',
    description: '',
    category: 'custom',
    source: 'gemini',
    instructions: '',
  });
  const [activeTargetTab, setActiveTargetTab] = useState<'claude' | 'antigravity' | 'codex' | 'infrastructure'>('claude');

  const activeTypes = useMemo(() => {
    switch (activeTargetTab) {
      case 'claude':
        return ['claude_agent'] as AITargetType[];
      case 'antigravity':
        return ['antigravity_agent', 'subagent'] as AITargetType[];
      case 'codex':
        return ['codex_agent'] as AITargetType[];
      case 'infrastructure':
        return ['model', 'provider'] as AITargetType[];
    }
  }, [activeTargetTab]);

  const getActiveTabTargets = () => {
    return overview?.targets.filter((target) => activeTypes.includes(target.type)) || [];
  };

  const handleSelectAll = () => {
    const currentTabTargetKeys = getActiveTabTargets().map(t => t.target_key);
    setDraftTargetKeys(prev => {
      const next = [...prev];
      currentTabTargetKeys.forEach(key => {
        if (!next.includes(key)) next.push(key);
      });
      return next;
    });
  };

  const handleDeselectAll = () => {
    const currentTabTargetKeys = getActiveTabTargets().map(t => t.target_key);
    setDraftTargetKeys(prev => prev.filter(key => !currentTabTargetKeys.includes(key)));
  };

  const loadOverview = async () => {
    try {
      setError(null);
      const data = await api.getAIOverview();
      setOverview(data);

      const currentSkill = data.skills.find((skill) => skill.skill_key === selectedSkillKey) || data.skills[0] || null;
      setSelectedSkillKey(currentSkill?.skill_key || null);
      setDraftTargetKeys(currentSkill?.assigned_targets.map((assignment) => assignment.target_key) || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI skill overview could not be loaded');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOverview();
    }, 0);

    return () => window.clearTimeout(timer);
    // Load once on mount; user-driven refreshes call loadOverview directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleSkills = useMemo(() => {
    if (!overview) return [];
    if (selectedSource === 'all') return overview.skills;
    return overview.skills.filter((skill) => skill.source === selectedSource);
  }, [overview, selectedSource]);

  const selectedSkill = useMemo(() => {
    return overview?.skills.find((skill) => skill.skill_key === selectedSkillKey) || null;
  }, [overview, selectedSkillKey]);

  const targetGroups = useMemo(() => {
    const groups = new Map<AITargetType, AITarget[]>();
    for (const type of targetOrder) {
      groups.set(type, overview?.targets.filter((target) => target.type === type) || []);
    }
    return groups;
  }, [overview]);

  const handleSelectSkill = (skill: UnifiedSkill) => {
    setSelectedSkillKey(skill.skill_key);
    setDraftTargetKeys(skill.assigned_targets.map((assignment) => assignment.target_key));
  };

  const toggleDraftTarget = (targetKey: string) => {
    setDraftTargetKeys((current) => (
      current.includes(targetKey)
        ? current.filter((key) => key !== targetKey)
        : [...current, targetKey]
    ));
  };

  const saveAssignments = async () => {
    if (!selectedSkill) return;
    setSaving(true);
    try {
      await api.replaceSkillAssignments(selectedSkill.skill_key, draftTargetKeys);
      await loadOverview();
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = async (event: React.FormEvent) => {
    event.preventDefault();
    await api.createSkill(newSkill);
    setNewSkill({ name: '', description: '', category: 'custom', source: 'gemini', instructions: '' });
    setShowAddForm(false);
    await loadOverview();
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-surface rounded w-1/3" />
          <div className="h-32 bg-surface rounded" />
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="glass-card border-error/20">
        <h3 className="text-xl font-bold text-white">Skill Matrix Offline</h3>
        <p className="text-sm text-muted mt-2">{error || 'No skill data was returned.'}</p>
        <button onClick={loadOverview} className="btn btn-primary btn-sm mt-5">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">AI Skill <span className="text-muted font-light">Control Plane</span></h1>
          <p className="text-sm text-muted mt-2 max-w-3xl">
            Unified skills from Claude dashboard config and Codex runtime, assignable to Claude agents, Codex roles, models, and providers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowAddForm(!showAddForm)} className="btn btn-secondary">
            {showAddForm ? 'Close' : 'New Dashboard Skill'}
          </button>
          <button onClick={loadOverview} className="btn btn-primary">Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-5">
        {[
          { label: 'Unified Skills', value: overview.summary.skills },
          { label: 'Claude Skills', value: overview.summary.claude_skills },
          { label: 'Gemini Skills', value: overview.summary.gemini_skills },
          { label: 'Codex Skills', value: overview.summary.codex_skills },
          { label: 'Assignments', value: overview.summary.assignments },
        ].map((item) => (
          <div key={item.label} className="glass-card">
            <div className="text-3xl font-black text-white">{item.value}</div>
            <div className="text-[10px] text-muted font-black uppercase tracking-widest mt-2">{item.label}</div>
          </div>
        ))}
      </div>

      {showAddForm && (
        <form onSubmit={handleAddSkill} className="glass-card border-primary/20">
          <h3 className="text-xl font-bold text-white mb-5">Register Dashboard Skill</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              value={newSkill.name}
              onChange={(event) => setNewSkill({ ...newSkill, name: event.target.value })}
              className="input"
              placeholder="skill-name"
              required
            />
            <input
              type="text"
              value={newSkill.category}
              onChange={(event) => setNewSkill({ ...newSkill, category: event.target.value })}
              className="input"
              placeholder="category"
            />
            <select
              value={newSkill.source}
              onChange={(event) => setNewSkill({ ...newSkill, source: event.target.value })}
              className="select"
            >
              <option value="gemini">Gemini / Antigravity</option>
              <option value="codex-user">Codex User Skill</option>
              <option value="claude">Claude Dashboard Skill</option>
            </select>
            <button type="submit" className="btn btn-primary">Create Skill</button>
            <textarea
              value={newSkill.description}
              onChange={(event) => setNewSkill({ ...newSkill, description: event.target.value })}
              className="textarea md:col-span-4"
              placeholder="What this skill enables..."
              required
            />
            <textarea
              value={newSkill.instructions}
              onChange={(event) => setNewSkill({ ...newSkill, instructions: event.target.value })}
              className="textarea md:col-span-4"
              placeholder="Exact skill instructions injected into assigned agents..."
            />
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-8">
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Unified Skill Catalog</h2>
              <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Claude + Codex capabilities</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'claude', 'gemini', 'codex-system', 'codex-plugin', 'codex-user'] as const).map((source) => (
                <button
                  key={source}
                  onClick={() => setSelectedSource(source)}
                  className={`btn btn-sm ${selectedSource === source ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {sourceLabels[source]}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="max-h-[660px] overflow-y-auto custom-scrollbar divide-y divide-border/60">
              {visibleSkills.map((skill) => {
                const assignedTargets = getSkillTargets(skill, overview.targets);
                const isSelected = skill.skill_key === selectedSkillKey;
                return (
                  <button
                    key={skill.skill_key}
                    onClick={() => handleSelectSkill(skill)}
                    className={`w-full text-left p-5 transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-white/[0.03]'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-base font-black text-white truncate">{skill.name}</h3>
                        <p className="text-sm text-muted mt-2 leading-relaxed">{skill.description}</p>
                      </div>
                      <span className={`badge shrink-0 ${sourceStyles[skill.source]}`}>{sourceLabels[skill.source]}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      <span className="text-[10px] px-2 py-1 rounded-md bg-white/5 text-muted border border-white/5 uppercase tracking-wider">
                        {skill.category}
                      </span>
                      {assignedTargets.length === 0 ? (
                        <span className="text-[10px] text-white/30">No assigned targets</span>
                      ) : (
                        assignedTargets.slice(0, 4).map((target) => (
                          <span key={target.target_key} className="text-[10px] px-2 py-1 rounded-md bg-accent/10 text-accent border border-accent/20">
                            {target.name}
                          </span>
                        ))
                      )}
                      {assignedTargets.length > 4 && (
                        <span className="text-[10px] text-muted">+{assignedTargets.length - 4}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="glass-card">
            {selectedSkill ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] text-primary font-black uppercase tracking-[0.3em]">Assignment Editor</p>
                    <h2 className="text-2xl font-black text-white mt-2">{selectedSkill.name}</h2>
                    <p className="text-sm text-muted mt-2">{selectedSkill.description}</p>
                  </div>
                  <span className={`badge ${sourceStyles[selectedSkill.source]}`}>{sourceLabels[selectedSkill.source]}</span>
                </div>

                {/* Internal Tabs for Targets */}
                <div className="flex border-b border-white/5 mt-6 mb-4">
                  {(['claude', 'antigravity', 'codex', 'infrastructure'] as const).map((tab) => {
                    const labels = {
                      claude: 'Claude Fleet',
                      antigravity: 'Antigravity Core',
                      codex: 'Codex Engine',
                      infrastructure: 'Infrastructure',
                    };
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTargetTab(tab)}
                        className={`flex-1 pb-2 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 text-center ${
                          activeTargetTab === tab
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted hover:text-white'
                        }`}
                      >
                        {labels[tab]}
                      </button>
                    );
                  })}
                </div>

                {/* Bulk Select Actions */}
                <div className="flex gap-2 mb-4 justify-end">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="btn btn-secondary py-1 px-3 text-[9px] uppercase font-bold tracking-wider"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="btn btn-secondary py-1 px-3 text-[9px] uppercase font-bold tracking-wider"
                  >
                    Deselect All
                  </button>
                </div>

                <div className="space-y-5 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                  {activeTypes.map((type) => {
                    const targets = targetGroups.get(type) || [];
                    if (targets.length === 0) return null;
                    return (
                      <div key={type} className="space-y-3">
                        <h3 className="text-[10px] font-black text-muted uppercase tracking-widest">{targetLabels[type]}</h3>
                        <div className="space-y-2">
                          {targets.map((target) => (
                            <label key={target.target_key} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-white truncate">{target.name}</div>
                                <div className="text-[10px] text-muted font-mono truncate">{target.target_key}</div>
                              </div>
                              <input
                                type="checkbox"
                                checked={draftTargetKeys.includes(target.target_key)}
                                onChange={() => toggleDraftTarget(target.target_key)}
                                className="w-4 h-4 accent-[var(--primary)] cursor-pointer"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {getActiveTabTargets().length === 0 && (
                    <p className="text-xs text-white/30 text-center py-6">No targets registered in this category.</p>
                  )}
                </div>

                <button
                  onClick={saveAssignments}
                  disabled={saving}
                  className="btn btn-primary w-full mt-7"
                >
                  {saving ? 'Saving...' : 'Save Assignments'}
                </button>
              </>
            ) : (
              <div className="text-center py-10">
                <h3 className="text-lg font-bold text-white">Select a Skill</h3>
                <p className="text-sm text-muted mt-2">Choose a capability to assign it across AI targets.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
