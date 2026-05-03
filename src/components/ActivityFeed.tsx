'use client';

import { ActivityLog } from '@/types';

interface ActivityFeedProps {
  activities: ActivityLog[];
  showAll?: boolean;
}

export default function ActivityFeed({ activities, showAll = false }: ActivityFeedProps) {
  const displayActivities = showAll ? activities : activities.slice(0, 10);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'request':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'response':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'error':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'hook':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return new Date().toLocaleTimeString();
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (e) {
      return new Date().toLocaleTimeString();
    }
  };

  const getAgentLabel = (id: string) => {
    if (id === 'team_leader' || id === 'cli') return 'Team Leader';
    return id;
  };

  const validActivities = displayActivities.filter(a => a && a.message && a.timestamp);

  if (validActivities.length === 0) {
    return (
      <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
        <div className="text-6xl mb-4">📝</div>
        <p className="text-zinc-400 text-lg">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 overflow-hidden">
      <div className="divide-y divide-zinc-800/50">
        {validActivities.map((activity, index) => (
          <div key={activity.id || `${activity.agent_id}-${activity.timestamp}-${index}`} className="p-5 hover:bg-zinc-800/30 transition-colors">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${getTypeColor(activity.type)}`}>
                  {activity.type}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200">{activity.message}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                  <span className="font-bold text-primary/70">{getAgentLabel(activity.agent_id)}</span>
                  <span>•</span>
                  <span>{formatTime(activity.timestamp)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
