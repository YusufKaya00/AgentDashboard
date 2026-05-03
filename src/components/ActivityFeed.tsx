'use client';

import { ActivityLog } from '@/types';

interface ActivityFeedProps {
  activities: ActivityLog[];
  showAll?: boolean;
}

export default function ActivityFeed({ activities, showAll = false }: ActivityFeedProps) {
  const displayActivities = showAll ? activities : activities.slice(0, 10);

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'request': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'response': return 'bg-[var(--accent)] bg-opacity-10 text-[var(--accent)] border-[var(--accent)] border-opacity-20';
      case 'error': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'hook': return 'bg-[var(--primary)] bg-opacity-10 text-[var(--primary)] border-[var(--primary)] border-opacity-20';
      default: return 'bg-white/5 text-white/50 border-white/5';
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) { return '--:--:--'; }
  };

  const validActivities = displayActivities.filter(a => a && a.message);

  if (validActivities.length === 0) {
    return (
      <div className="glass-card p-12 text-center border-dashed">
        <p className="text-[var(--foreground-muted)] text-sm font-bold uppercase tracking-widest">No activity recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {validActivities.map((activity, index) => (
        <div 
          key={activity.id || index} 
          className="glass-card group relative overflow-hidden"
        >
          <div className="flex items-start gap-5">
            <div className="flex-shrink-0 mt-1">
              <div className={`badge ${getTypeStyles(activity.type)}`}>
                {activity.type}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/90 leading-relaxed font-medium">
                {activity.message}
              </p>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] opacity-40" />
                  </div>
                  <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest">
                    {activity.agent_id || 'system'}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-[var(--foreground-muted)] tabular-nums opacity-60">
                  {formatTime(activity.timestamp)}
                </span>
              </div>
            </div>
          </div>
          {/* Subtle line indicator */}
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ))}
    </div>
  );
}
