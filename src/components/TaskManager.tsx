'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  assigned_to: string;
  dependencies: string[];
  estimated_hours: number;
  created_at: string;
  updated_at: string;
}

interface TaskStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  blocked: number;
  by_priority: {
    P0: number;
    P1: number;
    P2: number;
    P3: number;
  };
}

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'blocked'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'P0' | 'P1' | 'P2' | 'P3'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTasks();
    loadStats();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.getTasksStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading task stats:', error);
    }
  };

  const handleCreate = () => {
    setSelectedTask(null);
    setShowModal(true);
  };

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.deleteTask(id);
      loadTasks();
      loadStats();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleSave = async (task: Partial<Task>) => {
    try {
      if (selectedTask) {
        await api.updateTask(selectedTask.id, task);
      } else {
        await api.createTask(task);
      }
      setShowModal(false);
      loadTasks();
      loadStats();
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleStatusChange = async (taskId: string, status: Task['status']) => {
    try {
      await api.updateTask(taskId, { status });
      loadTasks();
      loadStats();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P0':
        return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'P1':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      case 'P2':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      case 'P3':
        return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/30';
      default:
        return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-surface text-muted border-border';
      case 'in_progress': return 'bg-info/10 text-info border-info/20';
      case 'completed': return 'bg-accent/10 text-accent border-accent/20';
      case 'blocked': return 'bg-error/10 text-error border-error/20';
      default: return 'bg-surface text-muted border-border';
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesFilter = filter === 'all' || task.status === filter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesSearch = searchQuery === '' ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesPriority && matchesSearch;
  });

  if (loading) {
    return (
      <div className="card p-8 border border-border">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-surface rounded w-1/3"></div>
          <div className="h-4 bg-surface rounded w-1/2"></div>
          <div className="h-32 bg-surface rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Task Manager</h1>
          <p className="text-zinc-500 text-sm uppercase tracking-wider">Orchestrate and track all development tasks</p>
        </div>
        <button
          onClick={handleCreate}
          className="btn btn-primary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Task
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="card-sm p-4 bg-surface text-center">
            <div className="text-2xl font-black text-white">{stats.total}</div>
            <div className="text-[10px] text-muted uppercase tracking-widest mt-1">Total</div>
          </div>
          <div className="card-sm p-4 bg-surface text-center">
            <div className="text-2xl font-black text-muted">{stats.pending}</div>
            <div className="text-[10px] text-muted uppercase tracking-widest mt-1">Pending</div>
          </div>
          <div className="card-sm p-4 bg-surface text-center">
            <div className="text-2xl font-black text-info">{stats.in_progress}</div>
            <div className="text-[10px] text-muted uppercase tracking-widest mt-1">Active</div>
          </div>
          <div className="card-sm p-4 bg-surface text-center">
            <div className="text-2xl font-black text-accent">{stats.completed}</div>
            <div className="text-[10px] text-muted uppercase tracking-widest mt-1">Done</div>
          </div>
          <div className="card-sm p-4 bg-surface text-center">
            <div className="text-2xl font-black text-error">{stats.blocked}</div>
            <div className="text-[10px] text-muted uppercase tracking-widest mt-1">Blocked</div>
          </div>
          <div className="card-sm p-4 bg-surface text-center">
            <div className="text-2xl font-black text-primary">{stats.by_priority.P0}</div>
            <div className="text-[10px] text-muted uppercase tracking-widest mt-1">Critical</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card-sm p-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="select w-auto"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="select w-auto"
          >
            <option value="all">All Priority</option>
            <option value="P0">P0 Critical</option>
            <option value="P1">P1 High</option>
            <option value="P2">P2 Medium</option>
            <option value="P3">P3 Low</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-4 opacity-20">📋</div>
          <p className="text-zinc-500">No tasks found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="glass-card-sm p-4 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-start gap-4">
                {/* Priority Badge */}
                <span className={`badge ${getPriorityColor(task.priority)} shrink-0`}>
                  {task.priority}
                </span>

                {/* Task Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-semibold text-white truncate">{task.title}</h3>
                    <span className={`badge ${getStatusColor(task.status)} shrink-0`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-muted mb-3 line-clamp-2">{task.description}</p>
                  <div className="flex items-center gap-4 text-[10px] text-muted font-bold uppercase tracking-wider">
                    <span>👤 {task.assigned_to}</span>
                    <span>⏱️ {task.estimated_hours}h</span>
                    <span>📅 {new Date(task.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value as Task['status'])}
                    className="select w-auto text-xs"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                  </select>
                  <button
                    onClick={() => handleEdit(task)}
                    className="btn btn-ghost btn-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="btn btn-ghost btn-sm text-red-500 hover:text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <TaskModal
          task={selectedTask}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

interface TaskModalProps {
  task: Task | null;
  onSave: (task: Partial<Task>) => void;
  onClose: () => void;
}

function TaskModal({ task, onSave, onClose }: TaskModalProps) {
  const [formData, setFormData] = useState<Partial<Task>>(task || {
    title: '',
    description: '',
    priority: 'P2',
    status: 'pending',
    assigned_to: 'team_leader',
    dependencies: [],
    estimated_hours: 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {task ? 'Edit Task' : 'Create Task'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Title</label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input"
              placeholder="Task title"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="textarea"
              rows={4}
              placeholder="Task description"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Priority</label>
              <select
                value={formData.priority || 'P2'}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                className="select"
              >
                <option value="P0">P0 - Critical</option>
                <option value="P1">P1 - High</option>
                <option value="P2">P2 - Medium</option>
                <option value="P3">P3 - Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Status</label>
              <select
                value={formData.status || 'pending'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                className="select"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Assigned To</label>
              <select
                value={formData.assigned_to || 'team_leader'}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="select"
              >
                <option value="team_leader">Team Leader</option>
                <option value="system-architect">System Architect</option>
                <option value="research-agent">Research Agent</option>
                <option value="backend-dev">Backend Dev</option>
                <option value="frontend-dev">Frontend Dev</option>
                <option value="security-agent">Security Agent</option>
                <option value="devops">DevOps</option>
                <option value="analytics">Analytics</option>
                <option value="task-manager">Task Manager</option>
                <option value="mobile-dev">Mobile Dev</option>
                <option value="qa-testing">QA Testing</option>
                <option value="documentation">Documentation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Estimated Hours</label>
              <input
                type="number"
                value={formData.estimated_hours || 1}
                onChange={(e) => setFormData({ ...formData, estimated_hours: parseInt(e.target.value) || 1 })}
                className="input"
                min={0.5}
                step={0.5}
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn btn-primary flex-1">
              {task ? 'Update Task' : 'Create Task'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
