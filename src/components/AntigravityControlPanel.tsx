'use client';

import RuntimeControlPanel from './RuntimeControlPanel';

interface AntigravityControlPanelProps {
  liveConnected?: boolean;
  liveRevision?: number;
}

export default function AntigravityControlPanel({
  liveConnected,
  liveRevision,
}: AntigravityControlPanelProps) {
  return (
    <RuntimeControlPanel
      runtime="antigravity"
      liveConnected={liveConnected}
      liveRevision={liveRevision}
    />
  );
}
