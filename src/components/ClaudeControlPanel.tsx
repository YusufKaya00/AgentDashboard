'use client';

import { useState } from 'react';
import { FileText, Network } from 'lucide-react';
import RuntimeControlPanel from './RuntimeControlPanel';
import CLAUDEEditor from './CLAUDEEditor';

export default function ClaudeControlPanel() {
  const [view, setView] = useState<'runtime' | 'guidelines'>('runtime');

  return (
    <div className="space-y-5">
      <div className="runtime-panel flex w-fit gap-1 p-1">
        <button
          className={`runtime-tab rounded-md border-0 px-3 py-2 ${view === 'runtime' ? 'active' : ''}`}
          onClick={() => setView('runtime')}
        >
          <Network className="h-4 w-4" />
          Runtime
        </button>
        <button
          className={`runtime-tab rounded-md border-0 px-3 py-2 ${view === 'guidelines' ? 'active' : ''}`}
          onClick={() => setView('guidelines')}
        >
          <FileText className="h-4 w-4" />
          CLAUDE.md
        </button>
      </div>

      {view === 'runtime' ? <RuntimeControlPanel runtime="claude" /> : <CLAUDEEditor />}
    </div>
  );
}
