'use client';

import { useEffect, useState } from 'react';
import { Check, FileText, LoaderCircle, RefreshCw, Save, TriangleAlert } from 'lucide-react';
import { api } from '@/lib/api';

export default function CLAUDEEditor() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const data = await api.getClaudeMd();
      setContent(typeof data.content === 'string' ? data.content : '');
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'CLAUDE.md could not be loaded');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      setError(null);
      await api.updateClaudeMd(content);
      setNotice('CLAUDE.md saved.');
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'CLAUDE.md could not be saved');
    } finally {
      setSaving(false);
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      setError(null);
      const data = await api.syncAllSkills();
      setNotice(`${data.synced || 0} legacy dashboard skills synchronized.`);
      await load();
    } catch (syncError: unknown) {
      setError(syncError instanceof Error ? syncError.message : 'Legacy skill sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key.toLowerCase() === 's' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void save();
    }
  };

  return (
    <section className="runtime-panel overflow-hidden">
      <header className="flex flex-col gap-4 border-b border-white/8 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-amber-400/20 bg-amber-400/8 text-amber-300">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="runtime-section-title">CLAUDE.md</h2>
            <p className="runtime-section-meta">{content.split('\n').length} lines, {content.length} characters</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => void sync()} disabled={syncing}>
            {syncing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync Legacy Skills
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => void save()} disabled={saving}>
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </header>

      {(notice || error) && (
        <div className={`mx-5 mt-4 flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
          error
            ? 'border-rose-400/20 bg-rose-400/8 text-rose-200'
            : 'border-emerald-400/20 bg-emerald-400/8 text-emerald-200'
        }`}>
          {error ? <TriangleAlert className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          {error || notice}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[620px] w-full resize-y bg-[#0b0d10] p-6 font-mono text-sm leading-6 text-zinc-300 outline-none selection:bg-sky-400/20"
          spellCheck={false}
          aria-label="CLAUDE.md content"
        />
      )}
    </section>
  );
}
