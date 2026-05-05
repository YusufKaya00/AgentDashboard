'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Skill } from '@/types';

export default function SkillManager() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSkill, setNewSkill] = useState({
    name: '',
    description: '',
    category: 'custom',
  });

  useEffect(() => {
    loadSkills();
    loadStats();
  }, []);

  const loadSkills = async () => {
    try {
      const data = await api.getSkills();
      setSkills(data);
    } catch (error) {
      console.error('Error loading skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.getSkillsStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading skill stats:', error);
    }
  };

  const handleToggleSkill = async (skillId: string) => {
    try {
      await api.toggleSkill(skillId);
      loadSkills();
      loadStats();
    } catch (error) {
      console.error('Error toggling skill:', error);
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    if (!confirm('Are you sure you want to delete this skill?')) return;
    try {
      await api.deleteSkill(skillId);
      loadSkills();
      loadStats();
    } catch (error) {
      console.error('Error deleting skill:', error);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSkill(newSkill);
      setNewSkill({ name: '', description: '', category: 'custom' });
      setShowAddForm(false);
      loadSkills();
      loadStats();
    } catch (error) {
      console.error('Error adding skill:', error);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      configuration: 'bg-secondary/10 text-secondary border-secondary/30',
      code_review: 'bg-accent/10 text-accent border-accent/30',
      documentation: 'bg-primary/10 text-primary border-primary/30',
      security: 'bg-error/10 text-error border-error/30',
      automation: 'bg-warning/10 text-warning border-warning/30',
      development: 'bg-info/10 text-info border-info/30',
      custom: 'bg-surface text-foreground-muted border-border',
    };
    return colors[category] || colors.custom;
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-surface rounded w-1/3"></div>
          <div className="h-8 bg-surface rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Skill <span className="text-muted font-light">Laboratory</span></h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            <p className="text-[10px] text-muted font-bold uppercase tracking-[0.2em]">Capability Matrix</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>Inject Skill</span>
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Matrix', value: stats.total, color: 'var(--foreground)' },
            { label: 'Active State', value: stats.enabled, color: 'var(--accent)' },
            { label: 'Offline', value: stats.disabled, color: 'var(--foreground-muted)' },
            { label: 'Custom Nodes', value: stats.categories?.custom || 0, color: 'var(--primary)' }
          ].map((stat, i) => (
            <div key={i} className="glass-card relative overflow-hidden group">
              <div className="text-2xl font-black mb-1 group-hover:scale-110 transition-transform origin-left" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-[10px] text-muted font-bold uppercase tracking-widest">{stat.label}</div>
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.02] rounded-bl-full -mr-4 -mt-4 group-hover:bg-primary/20 transition-colors" />
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddSkill} className="glass-card border-primary border-opacity-20 animate-fade-in">
          <h3 className="text-xl font-bold text-white mb-6">Initialize New Capability</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Identity Name</label>
              <input
                type="text"
                value={newSkill.name}
                onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                className="input w-full"
                placeholder="e.g. pattern-recognition"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Capability Category</label>
              <select
                value={newSkill.category}
                onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
                className="select w-full"
              >
                <option value="custom">Custom</option>
                <option value="configuration">Configuration</option>
                <option value="code_review">Code Review</option>
                <option value="documentation">Documentation</option>
                <option value="security">Security</option>
                <option value="automation">Automation</option>
                <option value="development">Development</option>
              </select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Operational Description</label>
              <textarea
                value={newSkill.description}
                onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                className="input w-full min-h-[100px] resize-y"
                placeholder="Define the primary operational objective of this skill..."
                rows={4}
                required
              />
            </div>
          </div>
          <div className="flex gap-4">
            <button type="submit" className="btn btn-primary flex-1">Register Skill Node</button>
            <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-secondary px-8">Dismiss</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {skills.map((skill) => (
          <div
            key={skill.id}
            className={`glass-card flex items-start justify-between group ${
              !skill.enabled ? 'opacity-40 grayscale pointer-events-none' : ''
            }`}
          >
            <div className="flex flex-col flex-1 gap-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-primary group-hover:bg-primary/10 transition-all">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white tracking-tight">{skill.name}</h4>
                    <span className="text-xs text-secondary">{skill.category}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-[9px] font-black text-accent uppercase tracking-wider">
                    {skill.version || 'v1.0'}
                  </span>
                  <span className="text-[9px] text-muted font-mono">{skill.language || 'typescript'}</span>
                </div>
              </div>
              <p className="text-sm text-muted leading-relaxed max-w-2xl">{skill.description}</p>
              <div className="flex items-center gap-4 mt-3">
                <div className="p-3 rounded-xl bg-surface border border-border group-hover:bg-white/5 transition-colors">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-1">Entry Point</span>
                  <span className="text-[11px] text-white font-mono break-all">{skill.file_path || 'src/skills/default.ts'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skill.tags?.map((tag: string) => (
                    <span key={tag} className="px-2 py-0.5 rounded-md bg-secondary/10 border border-secondary/20 text-[9px] font-bold text-secondary uppercase tracking-tighter">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6 pl-8 border-l border-white/5">
              <button
                onClick={() => handleToggleSkill(skill.id)}
                className={`switch ${skill.enabled ? 'active' : ''}`}
                title={skill.enabled ? 'Deactivate' : 'Activate'}
              />
              <button
                onClick={() => handleDeleteSkill(skill.id)}
                className="btn btn-secondary p-1.5 hover:text-red-500 opacity-0 group-hover:opacity-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        {skills.length === 0 && !loading && (
          <div className="glass-card p-20 text-center border-dashed border-white/10">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Skills Injected</h3>
            <p className="text-sm text-muted">Register a new capability to expand your agents' operational range.</p>
          </div>
        )}
      </div>
    </div>
  );
}
