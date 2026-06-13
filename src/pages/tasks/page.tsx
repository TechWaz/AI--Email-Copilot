import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/feature/Sidebar';
import { useTasks, type Task, type TaskPriority, type TaskStatus, type FilterStatus, type FilterPriority } from '@/hooks/useTasks';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDueDate(dateStr: string | null): { label: string; cls: string } | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, cls: 'text-rose-600 bg-rose-50 border-rose-200' };
  if (diffDays === 0) return { label: 'Today', cls: 'text-amber-600 bg-amber-50 border-amber-200' };
  if (diffDays === 1) return { label: 'Tomorrow', cls: 'text-foreground-600 bg-background-100 border-background-200' };
  if (diffDays <= 7) return { label: `${diffDays}d left`, cls: 'text-foreground-600 bg-background-100 border-background-200' };
  return {
    label: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    cls: 'text-foreground-500 bg-background-50 border-background-200',
  };
}

const PRIORITY_STYLES: Record<TaskPriority, { dot: string; badge: string; label: string }> = {
  high:   { dot: 'bg-rose-500',     badge: 'text-rose-600 bg-rose-50 border-rose-200',     label: 'High' },
  medium: { dot: 'bg-amber-500',    badge: 'text-amber-600 bg-amber-50 border-amber-200',  label: 'Medium' },
  low:    { dot: 'bg-foreground-300', badge: 'text-foreground-500 bg-background-100 border-background-200', label: 'Low' },
};

const STATUS_TABS: { id: FilterStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
];

const PRIORITY_OPTS: { id: FilterPriority; label: string }[] = [
  { id: 'all', label: 'All Priority' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
];

// ─── Task Modal ───────────────────────────────────────────────────────────────

interface ModalData {
  title: string;
  description: string;
  priority: TaskPriority;
  due_date: string;
  status: TaskStatus;
}

interface TaskModalProps {
  mode: 'create' | 'edit';
  initial?: Task;
  isSaving: boolean;
  error: string | null;
  onSave: (data: ModalData) => void;
  onClose: () => void;
}

function TaskModal({ mode, initial, isSaving, error, onSave, onClose }: TaskModalProps) {
  const [form, setForm] = useState<ModalData>({
    title: initial?.title || '',
    description: initial?.description || '',
    priority: initial?.priority || 'medium',
    due_date: initial?.due_date ? initial.due_date.slice(0, 10) : '',
    status: initial?.status || 'pending',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave(form);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}
    >
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-background-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground-950">
            {mode === 'create' ? 'New Task' : 'Edit Task'}
          </h3>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-500 hover:text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-40"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-600">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground-700 mb-1.5">Title <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="What needs to be done?"
              required
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Add more details..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground-700 mb-1.5">Priority</label>
              <div className="flex gap-1.5">
                {(['high', 'medium', 'low'] as TaskPriority[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, priority: p }))}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-medium capitalize transition-all cursor-pointer ${
                      form.priority === p
                        ? PRIORITY_STYLES[p].badge + ' border'
                        : 'border-background-200 text-foreground-500 hover:bg-background-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-700 mb-1.5">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm text-foreground-950 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
            </div>
          </div>

          {mode === 'edit' && (
            <div>
              <label className="block text-xs font-medium text-foreground-700 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}
                className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm text-foreground-950 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent bg-white"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 rounded-lg border border-background-200 text-sm font-medium text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !form.title.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-sm font-medium text-white hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {isSaving ? <><i className="ri-loader-4-line animate-spin text-sm"></i> Saving...</> : mode === 'create' ? 'Create Task' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Inline Reminder Form (renders in document flow — no z-index/overflow issues) ──

interface InlineReminderProps {
  taskTitle: string;
  existingReminder: { id: string; reminder_date: string } | null;
  onSet: (date: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

function InlineReminderForm({ taskTitle, existingReminder, onSet, onDelete, onClose }: InlineReminderProps) {
  const [dateVal, setDateVal] = useState(existingReminder ? existingReminder.reminder_date.slice(0, 10) : '');
  const [timeVal, setTimeVal] = useState(existingReminder ? existingReminder.reminder_date.slice(11, 16) : '09:00');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSet = async () => {
    if (!dateVal) return;
    setSaving(true);
    setErr(null);
    try {
      const dt = new Date(`${dateVal}T${timeVal || '09:00'}:00`);
      await onSet(dt.toISOString());
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to set reminder');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingReminder) return;
    setSaving(true);
    try {
      await onDelete(existingReminder.id);
      onClose();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-3 bg-primary-50/60 border-t border-primary-100">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-semibold text-foreground-700 flex items-center gap-1.5">
          <i className="ri-alarm-line text-primary-500"></i>
          {existingReminder ? 'Update Reminder' : 'Set Reminder'}
          <span className="font-normal text-foreground-400">— {taskTitle}</span>
        </p>
        <button onClick={onClose} className="text-foreground-400 hover:text-foreground-600 cursor-pointer">
          <i className="ri-close-line text-sm"></i>
        </button>
      </div>

      {existingReminder && (
        <div className="flex items-center gap-2 mb-2.5 px-3 py-2 rounded-lg bg-primary-100 border border-primary-200">
          <i className="ri-alarm-fill text-primary-500 text-sm shrink-0"></i>
          <span className="text-xs text-primary-700 flex-1">
            Currently set: {new Date(existingReminder.reminder_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </span>
          <button onClick={handleDelete} disabled={saving} className="text-xs text-rose-500 hover:text-rose-600 font-medium cursor-pointer disabled:opacity-40">
            Remove
          </button>
        </div>
      )}

      {err && <p className="text-xs text-rose-600 mb-2">{err}</p>}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-xs text-foreground-500 mb-1">Date</label>
          <input
            type="date"
            value={dateVal}
            min={new Date().toISOString().slice(0, 10)}
            onChange={e => setDateVal(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-background-200 bg-white text-xs text-foreground-950 focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div className="w-28">
          <label className="block text-xs text-foreground-500 mb-1">Time</label>
          <input
            type="time"
            value={timeVal}
            onChange={e => setTimeVal(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-background-200 bg-white text-xs text-foreground-950 focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <button
          onClick={handleSet}
          disabled={!dateVal || saving}
          className="px-4 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-medium hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
        >
          {saving ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-alarm-line"></i>}
          {saving ? 'Saving...' : existingReminder ? 'Update' : 'Set'}
        </button>
      </div>
    </div>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task;
  reminder: { id: string; reminder_date: string } | null;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetReminder: (date: string) => Promise<void>;
  onDeleteReminder: (id: string) => Promise<void>;
}

function TaskRow({ task, reminder, onToggle, onEdit, onDelete, onSetReminder, onDeleteReminder }: TaskRowProps) {
  const [showReminder, setShowReminder] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dueInfo = formatDueDate(task.due_date);
  const p = PRIORITY_STYLES[task.priority];
  const isDone = task.status === 'completed';

  const statusIcon = isDone
    ? 'ri-checkbox-circle-fill text-primary-500'
    : task.status === 'in_progress'
      ? 'ri-time-line text-amber-500'
      : 'ri-circle-line text-foreground-300 hover:text-foreground-500';

  return (
    <div className="border-b border-background-100">
      {/* Main row */}
      <div className={`group flex items-start gap-3 px-4 py-3.5 hover:bg-background-50 transition-colors ${isDone ? 'opacity-60' : ''}`}>
        {/* Complete toggle */}
        <button
          onClick={onToggle}
          className={`mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center cursor-pointer transition-colors ${statusIcon}`}
          title={isDone ? 'Mark as pending' : 'Mark as complete'}
        >
          <i className={`${statusIcon} text-base`}></i>
        </button>

        {/* Priority dot */}
        <div className={`mt-2 w-2 h-2 rounded-full shrink-0 ${p.dot}`}></div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span className={`text-sm font-medium ${isDone ? 'line-through text-foreground-400' : 'text-foreground-900'}`}>
              {task.title}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded-md border font-medium capitalize ${p.badge}`}>
              {task.priority}
            </span>
            {task.status === 'in_progress' && (
              <span className="text-xs px-1.5 py-0.5 rounded-md border font-medium text-amber-600 bg-amber-50 border-amber-200">
                In Progress
              </span>
            )}
            {dueInfo && (
              <span className={`text-xs px-1.5 py-0.5 rounded-md border font-medium ${dueInfo.cls}`}>
                <i className="ri-calendar-line mr-0.5"></i>{dueInfo.label}
              </span>
            )}
            {reminder && !showReminder && (
              <span className="text-xs px-1.5 py-0.5 rounded-md border font-medium text-primary-600 bg-primary-50 border-primary-200">
                <i className="ri-alarm-line mr-0.5"></i>
                {new Date(reminder.reminder_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          {task.description && (
            <p className="text-xs text-foreground-400 mt-0.5 truncate">{task.description}</p>
          )}
        </div>

        {/* Actions — always visible, no relative/absolute nesting */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowReminder(v => !v)}
            title="Set reminder"
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
              showReminder || reminder ? 'text-primary-500 bg-primary-50' : 'text-foreground-400 hover:text-foreground-600 hover:bg-background-100'
            }`}
          >
            <i className={`${reminder ? 'ri-alarm-fill' : 'ri-alarm-line'} text-sm`}></i>
          </button>

          <button
            onClick={onEdit}
            title="Edit task"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer"
          >
            <i className="ri-pencil-line text-sm"></i>
          </button>

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={onDelete} className="px-2 py-1 rounded-lg bg-rose-500 text-white text-xs font-medium hover:bg-rose-600 cursor-pointer">
                Delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 rounded-lg border border-background-200 text-xs text-foreground-600 hover:bg-background-100 cursor-pointer">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete task"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <i className="ri-delete-bin-line text-sm"></i>
            </button>
          )}
        </div>
      </div>

      {/* Inline reminder form — in normal flow, never clipped */}
      {showReminder && (
        <InlineReminderForm
          taskTitle={task.title}
          existingReminder={reminder}
          onSet={onSetReminder}
          onDelete={onDeleteReminder}
          onClose={() => setShowReminder(false)}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [activeNav, setActiveNav] = useState('tasks');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const {
    tasks,
    reminders,
    stats,
    isLoading,
    error,
    filterStatus,
    filterPriority,
    searchQuery,
    setFilterStatus,
    setFilterPriority,
    setSearchQuery,
    createTask,
    updateTask,
    deleteTask,
    toggleComplete,
    setReminder,
    deleteReminder,
    refresh,
  } = useTasks();

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const openCreate = () => {
    setEditingTask(null);
    setModalError(null);
    setModalMode('create');
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setModalError(null);
    setModalMode('edit');
  };

  const handleModalSave = async (data: { title: string; description: string; priority: TaskPriority; due_date: string; status: TaskStatus }) => {
    setModalSaving(true);
    setModalError(null);
    try {
      if (modalMode === 'create') {
        await createTask({ title: data.title, description: data.description, due_date: data.due_date || null, priority: data.priority });
        showToast('success', 'Task created');
      } else if (editingTask) {
        await updateTask(editingTask.id, {
          title: data.title,
          description: data.description || null,
          due_date: data.due_date || null,
          priority: data.priority,
          status: data.status,
        });
        showToast('success', 'Task updated');
      }
      setModalMode(null);
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setModalSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
      showToast('success', 'Task deleted');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const handleToggle = async (task: Task) => {
    try {
      await toggleComplete(task.id, task.status);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to update');
    }
  };

  // Find reminder for a task by title match
  const findReminder = (task: Task) =>
    reminders.find(r => r.title === task.title) ?? null;

  const handleSetReminder = async (task: Task, date: string) => {
    await setReminder(task.title, date);
    showToast('success', 'Reminder set');
  };

  return (
    <div className="flex h-screen bg-background-50 overflow-hidden">
      <Sidebar activeItem={activeNav} onNavigate={setActiveNav} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="px-6 py-4 bg-white border-b border-background-200 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground-950">Tasks</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-foreground-500">{stats.total} total</span>
              {stats.pending > 0 && <span className="text-xs text-foreground-500">{stats.pending} pending</span>}
              {stats.inProgress > 0 && <span className="text-xs text-amber-600">{stats.inProgress} in progress</span>}
              {stats.overdue > 0 && <span className="text-xs text-rose-600 font-medium">{stats.overdue} overdue</span>}
              {stats.completed > 0 && <span className="text-xs text-foreground-400">{stats.completed} completed</span>}
            </div>
          </div>
          <button
            onClick={refresh}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer"
            title="Refresh"
          >
            <i className={`ri-refresh-line text-base ${isLoading ? 'animate-spin' : ''}`}></i>
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-add-line text-base"></i>
            New Task
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 bg-white border-b border-background-100 flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-40 max-w-64">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-background-200 text-sm text-foreground-950 placeholder:text-foreground-400 bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer">
                <i className="ri-close-line text-sm"></i>
              </button>
            )}
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-1">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  filterStatus === tab.id
                    ? 'bg-foreground-950 text-white'
                    : 'text-foreground-600 hover:bg-background-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1 ml-auto">
            {PRIORITY_OPTS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setFilterPriority(opt.id)}
                className={`px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  filterPriority === opt.id
                    ? opt.id === 'high' ? 'bg-rose-500 text-white'
                      : opt.id === 'medium' ? 'bg-amber-500 text-white'
                      : opt.id === 'low' ? 'bg-foreground-400 text-white'
                      : 'bg-foreground-950 text-white'
                    : 'text-foreground-600 hover:bg-background-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-2 text-sm text-foreground-400">
                <i className="ri-loader-4-line animate-spin text-lg"></i>
                Loading tasks...
              </div>
            </div>
          )}

          {error && !isLoading && (
            <div className="mx-6 mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3">
              <i className="ri-error-warning-line text-rose-500 text-lg shrink-0"></i>
              <div className="flex-1">
                <p className="text-sm text-rose-700 font-medium">Failed to load tasks</p>
                <p className="text-xs text-rose-500 mt-0.5">{error}</p>
              </div>
              <button onClick={refresh} className="text-xs text-rose-600 hover:text-rose-700 font-medium cursor-pointer whitespace-nowrap">Retry</button>
            </div>
          )}

          {!isLoading && !error && (
            <div className="py-4 px-4 md:px-6">
              {tasks.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-background-100 flex items-center justify-center mx-auto mb-4">
                    <i className="ri-task-line text-3xl text-foreground-300"></i>
                  </div>
                  <h3 className="text-base font-semibold text-foreground-600 mb-1">
                    {searchQuery || filterStatus !== 'all' || filterPriority !== 'all' ? 'No matching tasks' : 'No tasks yet'}
                  </h3>
                  <p className="text-sm text-foreground-400 mb-5">
                    {searchQuery || filterStatus !== 'all' || filterPriority !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create your first task to get started'}
                  </p>
                  {filterStatus === 'all' && filterPriority === 'all' && !searchQuery && (
                    <button
                      onClick={openCreate}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer"
                    >
                      <i className="ri-add-line"></i>
                      New Task
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-background-200 overflow-hidden">
                  {/* Section header for pending/in-progress */}
                  {tasks.some(t => t.status !== 'completed') && (
                    <div className="px-4 py-2.5 border-b border-background-100 bg-background-50/50">
                      <p className="text-xs font-semibold text-foreground-500 uppercase tracking-wide">
                        Active — {tasks.filter(t => t.status !== 'completed').length}
                      </p>
                    </div>
                  )}

                  {tasks.filter(t => t.status !== 'completed').map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      reminder={findReminder(task)}
                      onToggle={() => handleToggle(task)}
                      onEdit={() => openEdit(task)}
                      onDelete={() => handleDelete(task.id)}
                      onSetReminder={date => handleSetReminder(task, date)}
                      onDeleteReminder={deleteReminder}
                    />
                  ))}

                  {/* Completed section */}
                  {tasks.some(t => t.status === 'completed') && (
                    <>
                      <div className="px-4 py-2.5 border-b border-t border-background-100 bg-background-50/50">
                        <p className="text-xs font-semibold text-foreground-400 uppercase tracking-wide">
                          Completed — {tasks.filter(t => t.status === 'completed').length}
                        </p>
                      </div>
                      {tasks.filter(t => t.status === 'completed').map(task => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          reminder={findReminder(task)}
                          onToggle={() => handleToggle(task)}
                          onEdit={() => openEdit(task)}
                          onDelete={() => handleDelete(task.id)}
                          onSetReminder={date => handleSetReminder(task, date)}
                          onDeleteReminder={deleteReminder}
                        />
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Upcoming reminders summary */}
              {reminders.length > 0 && (
                <div className="mt-4 bg-white rounded-xl border border-background-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-background-100 flex items-center gap-2">
                    <i className="ri-alarm-line text-primary-500 text-sm"></i>
                    <h3 className="text-sm font-semibold text-foreground-950">Upcoming Reminders</h3>
                    <span className="ml-auto text-xs text-foreground-400">{reminders.length}</span>
                  </div>
                  <div className="divide-y divide-background-100">
                    {reminders.slice(0, 5).map(r => (
                      <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-background-50 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                          <i className="ri-alarm-line text-primary-500 text-sm"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground-900 truncate">{r.title}</p>
                          <p className="text-xs text-foreground-400">
                            {new Date(r.reminder_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteReminder(r.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-300 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                          title="Remove reminder"
                        >
                          <i className="ri-close-line text-sm"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Task create/edit modal */}
      {modalMode && (
        <TaskModal
          mode={modalMode}
          initial={editingTask ?? undefined}
          isSaving={modalSaving}
          error={modalError}
          onSave={handleModalSave}
          onClose={() => !modalSaving && setModalMode(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          onClick={() => setToast(null)}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium cursor-pointer transition-all ${
            toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
          }`}
        >
          <i className={`${toast.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'} text-base`}></i>
          {toast.message}
        </div>
      )}
    </div>
  );
}
