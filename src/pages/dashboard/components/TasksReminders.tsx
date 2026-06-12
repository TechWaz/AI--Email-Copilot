import type { PendingTask, UpcomingReminder } from '@/hooks/useDashboard';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-rose-500 bg-rose-500/10',
  medium: 'text-amber-500 bg-amber-500/10',
  low: 'text-foreground-500 bg-background-100',
};

interface TasksPanelProps {
  tasks: PendingTask[];
}

export function TasksPanel({ tasks }: TasksPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-background-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-background-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground-950">Pending Tasks</h3>
        <button className="text-xs text-foreground-500 hover:text-primary-500 transition-colors cursor-pointer whitespace-nowrap">
          View All
        </button>
      </div>
      <div className="divide-y divide-background-100">
        {tasks.length === 0 && (
          <div className="px-5 py-6 text-center text-sm text-foreground-400">
            No pending tasks.
          </div>
        )}
        {tasks.map((task) => (
          <div key={task.id} className="px-5 py-3 hover:bg-background-50 transition-colors cursor-pointer flex items-center gap-3">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
              task.status === 'completed'
                ? 'border-primary-500 bg-primary-500'
                : 'border-background-300'
            }`}>
              {task.status === 'completed' && (
                <i className="ri-check-line text-white text-xs w-3 h-3 flex items-center justify-center"></i>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm truncate ${task.status === 'completed' ? 'text-foreground-600 line-through' : 'text-foreground-900'}`}>
                {task.title}
              </p>
              <p className="text-xs text-foreground-400 truncate">{task.description || 'No description'}</p>
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.low}`}>
              {task.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface RemindersPanelProps {
  reminders: UpcomingReminder[];
}

export function RemindersPanel({ reminders }: RemindersPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-background-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-background-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground-950">Upcoming Reminders</h3>
        <button className="text-xs text-foreground-500 hover:text-primary-500 transition-colors cursor-pointer whitespace-nowrap">
          View All
        </button>
      </div>
      <div className="divide-y divide-background-100">
        {reminders.length === 0 && (
          <div className="px-5 py-6 text-center text-sm text-foreground-400">
            No upcoming reminders.
          </div>
        )}
        {reminders.map((reminder) => {
          const date = new Date(reminder.reminder_date);
          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          return (
            <div key={reminder.id} className="px-5 py-3 hover:bg-background-50 transition-colors cursor-pointer flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center shrink-0">
                <i className="ri-timer-line text-accent-500 text-sm w-4 h-4 flex items-center justify-center"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground-900 truncate">{reminder.title}</p>
                <p className="text-xs text-foreground-400 truncate">{reminder.email_id ? 'Related to email' : 'General reminder'}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-medium text-foreground-700 whitespace-nowrap">{dateStr}</p>
                <p className="text-xs text-foreground-400 whitespace-nowrap">{timeStr}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}