'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  config: Record<string, any>;
  created_at: string;
  usage_count: number;
}

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
          <h2 className="text-3xl font-black text-white tracking-tight">Skill <span className="text-[var(--foreground-muted)] font-light">Manager</span></h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse"></span>
            <p className="text-[10px] text-[var(--foreground-muted)] font-bold uppercase tracking-[0.2em]">Operational Capabilities</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`btn ${showAddForm ? 'btn-secondary' : 'btn-primary'}`}
        >
          {showAddForm ? 'Cancel' : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Initialize Skill</span>
            </>
          )}
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
              <div className="text-[10px] text-[var(--foreground-muted)] font-bold uppercase tracking-widest">{stat.label}</div>
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.02] rounded-bl-full -mr-4 -mt-4 group-hover:bg-[var(--primary-glow)] transition-colors" />
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddSkill} className="glass-card border-[var(--primary)] border-opacity-20 animate-fade-in">
          <h3 className="text-xl font-bold text-white mb-6">Initialize New Capability</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest ml-1">Identity Name</label>
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
              <label className="text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest ml-1">Capability Category</label>
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
              <label className="text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest ml-1">Operational Description</label>
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
            className={`glass-card flex items-center justify-between group ${
              !skill.enabled ? 'opacity-40 grayscale pointer-events-none' : ''
            }`}
          >
            <div className="flex items-center gap-6 flex-1">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-[var(--primary)] group-hover:bg-[var(--primary-glow)] transition-all">
                <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="text-lg font-bold text-white tracking-tight">{skill.name}</h4>
                  <span className={`badge ${getCategoryColor(skill.category)}`}>
                    {skill.category.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-[var(--foreground-muted)] leading-relaxed max-w-2xl">{skill.description}</p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Usage:</span>
                    <span className="text-[10px] font-bold text-[var(--primary)] tabular-nums">{skill.usage_count} sessions</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-white/10" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Initialized:</span>
                    <span className="text-[10px] font-bold text-[var(--foreground-muted)]">{new Date(skill.created_at).toLocaleDateString()}</span>
                  </div>
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
            <h3 className="text-xl font-bold text-white mb-2">No Capability Nodes Found</h3>
            <p className="text-sm text-[var(--foreground-muted)]">Initialize your first operational skill to begin system expansion.</p>
          </div>
        )}
      </div>
    </div>
  );
}
