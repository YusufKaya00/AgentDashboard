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
      configuration: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
      code_review: 'bg-green-500/10 text-green-500 border-green-500/30',
      documentation: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
      security: 'bg-red-500/10 text-red-500 border-red-500/30',
      automation: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
      development: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
      custom: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/30',
    };
    return colors[category] || colors.custom;
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-border">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-zinc-800 rounded w-1/3"></div>
          <div className="h-8 bg-zinc-800 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6 border border-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Skill Manager</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-primary text-black font-bold text-xs rounded hover:bg-white transition-all uppercase tracking-widest"
          >
            {showAddForm ? 'Cancel' : 'Add Skill'}
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 text-center">
              <div className="text-xl font-bold text-white">{stats.total}</div>
              <div className="text-[10px] text-zinc-500 uppercase">Total</div>
            </div>
            <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 text-center">
              <div className="text-xl font-bold text-green-500">{stats.enabled}</div>
              <div className="text-[10px] text-zinc-500 uppercase">Enabled</div>
            </div>
            <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 text-center">
              <div className="text-xl font-bold text-zinc-500">{stats.disabled}</div>
              <div className="text-[10px] text-zinc-500 uppercase">Disabled</div>
            </div>
            <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 text-center">
              <div className="text-xl font-bold text-primary">{stats.categories?.custom || 0}</div>
              <div className="text-[10px] text-zinc-500 uppercase">Custom</div>
            </div>
          </div>
        )}

        {showAddForm && (
          <form onSubmit={handleAddSkill} className="mb-6 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Name</label>
                <input
                  type="text"
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white text-sm focus:border-primary transition-all"
                  placeholder="skill-name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={newSkill.description}
                  onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white text-sm focus:border-primary transition-all resize-none"
                  placeholder="What does this skill do?"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Category</label>
                <select
                  value={newSkill.category}
                  onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white text-sm focus:border-primary transition-all"
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
              <button
                type="submit"
                className="w-full px-4 py-2 bg-primary text-black font-bold text-xs rounded hover:bg-white transition-all uppercase tracking-widest"
              >
                Add Skill
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className={`p-4 rounded-lg border transition-all ${
                skill.enabled
                  ? 'bg-zinc-900/50 border-zinc-800'
                  : 'bg-zinc-900/20 border-zinc-800/50 opacity-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold border ${getCategoryColor(skill.category)}`}>
                      {skill.category}
                    </span>
                    <span className="text-sm font-bold text-white">{skill.name}</span>
                  </div>
                  <p className="text-sm text-zinc-400">{skill.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                    <span>Used {skill.usage_count} times</span>
                    <span>Created {new Date(skill.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleSkill(skill.id)}
                    className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-all ${
                      skill.enabled
                        ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                        : 'bg-zinc-500/20 text-zinc-500 border border-zinc-500/30'
                    }`}
                  >
                    {skill.enabled ? 'ON' : 'OFF'}
                  </button>
                  <button
                    onClick={() => handleDeleteSkill(skill.id)}
                    className="px-3 py-1 rounded text-xs font-bold uppercase tracking-wider bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
