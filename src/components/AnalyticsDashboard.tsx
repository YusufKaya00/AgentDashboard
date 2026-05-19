'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface AnalyticsData {
  development: {
    commits: number;
    pull_requests: number;
    code_velocity: number;
    test_coverage: number;
    bug_count: number;
    deployment_frequency: number;
  };
  system: {
    cpu_usage: number;
    memory_usage: number;
    uptime: number;
    response_time: number;
    error_rate: number;
  };
  agents: {
    total_tasks: number;
    completed_tasks: number;
    average_duration: number;
    utilization: number;
    communication_count: number;
  };
  trends: {
    timestamp: string;
    commits: number;
    tasks: number;
    errors: number;
  }[];
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      const result = await api.getAnalytics(timeRange);
      setData(result);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (uptime: number) => {
    if (uptime >= 99.9) return '99.9%';
    return `${uptime.toFixed(1)}%`;
  };

  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    return `${hours.toFixed(1)}h`;
  };

  if (loading) {
    return (
      <div className="card p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-surface rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-24 bg-surface rounded"></div>
            <div className="h-24 bg-surface rounded"></div>
            <div className="h-24 bg-surface rounded"></div>
            <div className="h-24 bg-surface rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card p-12 text-center">
        <div className="text-4xl mb-4 opacity-20">📊</div>
        <p className="text-foreground-muted">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
          <p className="text-foreground-muted text-sm uppercase tracking-wider">Real-time metrics and insights</p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`btn btn-sm ${timeRange === range ? 'btn-primary' : 'btn-ghost'}`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Development Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="text-primary">💻</span> Development Metrics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            label="Commits"
            value={data.development.commits}
            icon="📝"
            trend="+12%"
            positive
          />
          <MetricCard
            label="Pull Requests"
            value={data.development.pull_requests}
            icon="🔀"
            trend="+5%"
            positive
          />
          <MetricCard
            label="Code Velocity"
            value={`${data.development.code_velocity}`}
            icon="⚡"
            trend="+8%"
            positive
            suffix=" LOC/day"
          />
          <MetricCard
            label="Test Coverage"
            value={`${data.development.test_coverage}`}
            icon="✅"
            trend="+2%"
            positive
            suffix="%"
          />
          <MetricCard
            label="Bugs"
            value={data.development.bug_count}
            icon="🐛"
            trend="-15%"
            positive
          />
          <MetricCard
            label="Deployments"
            value={data.development.deployment_frequency}
            icon="🚀"
            trend="+20%"
            positive
          />
        </div>
      </div>

      {/* System Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="text-accent">🖥️</span> System Metrics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <ProgressBarCard
            label="CPU Usage"
            value={data.system.cpu_usage}
            max={100}
            suffix="%"
            color={data.system.cpu_usage > 80 ? 'error' : data.system.cpu_usage > 60 ? 'warning' : 'accent'}
          />
          <ProgressBarCard
            label="Memory Usage"
            value={data.system.memory_usage}
            max={100}
            suffix="%"
            color={data.system.memory_usage > 80 ? 'error' : data.system.memory_usage > 60 ? 'warning' : 'accent'}
          />
          <MetricCard
            label="Uptime"
            value={formatUptime(data.system.uptime)}
            icon="⏱️"
            trend="Stable"
            positive
          />
          <MetricCard
            label="Response Time"
            value={`${data.system.response_time}`}
            icon="📊"
            trend="-5ms"
            positive
            suffix="ms"
          />
          <MetricCard
            label="Error Rate"
            value={`${(data.system.error_rate * 100).toFixed(2)}`}
            icon="⚠️"
            trend="-0.01%"
            positive
            suffix="%"
          />
        </div>
      </div>

      {/* Agent Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="text-warning">🤖</span> Agent Metrics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricCard
            label="Total Tasks"
            value={data.agents.total_tasks}
            icon="📋"
            trend="+15%"
            positive
          />
          <MetricCard
            label="Completed"
            value={data.agents.completed_tasks}
            icon="✨"
            trend="+18%"
            positive
          />
          <MetricCard
            label="Avg Duration"
            value={formatDuration(data.agents.average_duration)}
            icon="⏱️"
            trend="-10%"
            positive
          />
          <ProgressBarCard
            label="Utilization"
            value={data.agents.utilization}
            max={100}
            suffix="%"
            color={data.agents.utilization > 80 ? 'accent' : data.agents.utilization > 60 ? 'warning' : 'primary'}
          />
          <MetricCard
            label="Communications"
            value={data.agents.communication_count}
            icon="💬"
            trend="+25%"
            positive
          />
        </div>
      </div>

      {/* Trends Chart */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="text-primary">📈</span> Activity Trends
        </h2>
        <div className="card p-6">
          <div className="space-y-4">
            {data.trends.map((trend, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-24 text-xs text-foreground-muted">
                  {new Date(trend.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="flex-1 flex gap-2">
                  <div
                    className="h-8 bg-primary/20 rounded transition-all hover:bg-primary/30"
                    style={{ width: `${(trend.commits / 15) * 100}%` }}
                    title={`Commits: ${trend.commits}`}
                  />
                  <div
                    className="h-8 bg-accent/20 rounded transition-all hover:bg-accent/30"
                    style={{ width: `${(trend.tasks / 25) * 100}%` }}
                    title={`Tasks: ${trend.tasks}`}
                  />
                  {trend.errors > 0 && (
                    <div
                      className="h-8 bg-error/20 rounded transition-all hover:bg-error/30"
                      style={{ width: `${(trend.errors / 5) * 100}%` }}
                      title={`Errors: ${trend.errors}`}
                    />
                  )}
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="text-primary">{trend.commits} commits</span>
                  <span className="text-accent">{trend.tasks} tasks</span>
                  {trend.errors > 0 && <span className="text-error">{trend.errors} errors</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-6 mt-4 pt-4 border-t border-border text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary/20 rounded"></div>
              <span className="text-foreground-muted">Commits</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-accent/20 rounded"></div>
              <span className="text-foreground-muted">Tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-error/20 rounded"></div>
              <span className="text-foreground-muted">Errors</span>
            </div>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="btn btn-secondary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Report
        </button>
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: string;
  trend: string;
  positive: boolean;
  suffix?: string;
}

function MetricCard({ label, value, icon, trend, positive, suffix = '' }: MetricCardProps) {
  return (
    <div className="card-sm p-4 hover:border-primary/30 transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className={`text-[10px] ${positive ? 'text-accent' : 'text-error'}`}>
          {positive ? '↑' : '↓'} {trend}
        </span>
      </div>
      <div className="text-2xl font-bold text-white mb-1">
        {value}{suffix}
      </div>
      <div className="text-[10px] text-foreground-muted uppercase tracking-wider">{label}</div>
    </div>
  );
}

interface ProgressBarCardProps {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  color?: 'primary' | 'accent' | 'warning' | 'error';
}

function ProgressBarCard({ label, value, max, suffix = '', color = 'primary' }: ProgressBarCardProps) {
  const percentage = (value / max) * 100;
  const colorClasses = {
    primary: 'bg-primary',
    accent: 'bg-accent',
    warning: 'bg-warning',
    error: 'bg-error',
  };

  return (
    <div className="card-sm p-4 hover:border-primary/30 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] text-foreground-muted uppercase tracking-wider">{label}</div>
        <div className="text-lg font-bold text-white">
          {value}{suffix}
        </div>
      </div>
      <div className="w-full bg-surface rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
