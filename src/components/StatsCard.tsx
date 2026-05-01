'use client';

interface StatsCardProps {
  title: string;
  value: number;
  subtitle: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const colorClasses = {
  blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
  green: 'from-green-500/20 to-green-600/20 border-green-500/30',
  purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
  orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30',
  red: 'from-red-500/20 to-red-600/20 border-red-500/30',
};

const iconMap = {
  blue: '📊',
  green: '✅',
  purple: '🧠',
  orange: '⚡',
  red: '⚠️',
};

export default function StatsCard({ title, value, subtitle, color }: StatsCardProps) {
  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-2xl border overflow-hidden hover:scale-[1.02] transition-all duration-300 shadow-lg`}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{title}</h3>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-white">{value}</span>
            </div>
            <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
          </div>
          <div className="w-14 h-14 rounded-xl bg-zinc-900/50 flex items-center justify-center">
            <span className="text-2xl">{iconMap[color]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
