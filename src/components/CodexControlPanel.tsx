'use client';

import RuntimeControlPanel from './RuntimeControlPanel';

interface CodexControlPanelProps {
  liveConnected?: boolean;
  liveRevision?: number;
}

export default function CodexControlPanel({
  liveConnected,
  liveRevision,
}: CodexControlPanelProps) {
  return (
    <RuntimeControlPanel
      runtime="codex"
      liveConnected={liveConnected}
      liveRevision={liveRevision}
    />
  );
}
