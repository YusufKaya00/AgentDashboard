'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function CLAUDEEditor() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => { loadContent(); }, []);

  const loadContent = async () => {
    try {
      const data = await api.getClaudeMd();
      setContent(data.content);
    } catch (e) { console.error('Failed to load CLAUDE.md:', e); }
    finally { setLoading(false); }
  };

  const saveContent = async () => {
    setSaving(true);
    try {
      await api.updateClaudeMd(content);
      setSaved(true);
      setLastSaved(new Date().toLocaleTimeString());
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { console.error('Failed to save:', e); }
    finally { setSaving(false); }
  };

  const syncSkills = async () => {
    setSyncing(true);
    try {
      const data = await api.syncAllSkills();
      alert(`✅ ${data.synced} skill synced to CLAUDE.md`);
      loadContent();
    } catch (e) { console.error('Sync failed:', e); }
    finally { setSyncing(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveContent();
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

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-[#d97757]/10 rounded-lg flex items-center justify-center border border-[#d97757]/20">
              <svg className="w-4 h-4 text-[#d97757]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h2 className="text-[10px] font-bold text-[#d97757] uppercase tracking-[0.3em]">Editor</h2>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">CLAUDE.md</h1>
        </div>
        <div className="flex items-center gap-3">
          {lastSaved && <span className="text-[10px] font-bold text-[#8e8e93] uppercase tracking-widest">Saved {lastSaved}</span>}
          <button
            onClick={syncSkills}
            disabled={syncing}
            className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-xl hover:bg-blue-600/30 transition-all text-sm font-medium disabled:opacity-50"
          >
            {syncing ? '⏳ Syncing...' : '🔄 Sync Skills'}
          </button>
          <button
            onClick={saveContent}
            disabled={saving}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
              saved 
                ? 'bg-green-600/20 border border-green-500/30 text-green-400'
                : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25'
            } disabled:opacity-50`}
          >
            {saving ? '⏳ Saving...' : saved ? '✓ Saved!' : '💾 Save (Ctrl+S)'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="glass-card rounded-2xl border border-border overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs text-zinc-500 font-mono ml-2">CLAUDE.md</span>
          </div>
          <div className="text-xs text-zinc-600 font-mono">
            {content.split('\n').length} lines · {content.length} chars
          </div>
        </div>

        {/* Text Area */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full h-[calc(100vh-20rem)] p-6 bg-zinc-950 text-zinc-200 font-mono text-sm leading-relaxed resize-none focus:outline-none selection:bg-orange-500/30"
          spellCheck={false}
          placeholder="# Your CLAUDE.md content here..."
        />
      </div>

      {/* Info */}
      <div className="flex items-center gap-2 text-xs text-zinc-600">
        <span>💡</span>
        <span>Changes saved here are instantly available to Claude CLI on next run. Use "Sync Skills" to inject dashboard-managed skills.</span>
      </div>
    </div>
  );
}
