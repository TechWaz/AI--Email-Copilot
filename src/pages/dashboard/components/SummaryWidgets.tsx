import type { DashboardStats } from '@/hooks/useDashboard';

interface SummaryWidgetsProps {
  stats: DashboardStats;
}

const STAT_CARDS = (stats: DashboardStats) => [
  {
    key: 'totalUnread',
    label: 'Unread Emails',
    value: stats.totalUnread,
    icon: 'ri-mail-unread-line',
    color: 'text-primary-500',
    bg: 'bg-primary-500/10',
  },
  {
    key: 'emailsRequiringReply',
    label: 'Needs Reply',
    value: stats.emailsRequiringReply,
    icon: 'ri-reply-line',
    color: 'text-accent-500',
    bg: 'bg-accent-500/10',
  },
  {
    key: 'pendingTasks',
    label: 'Pending Tasks',
    value: stats.pendingTasks,
    icon: 'ri-task-line',
    color: 'text-secondary-500',
    bg: 'bg-secondary-500/10',
  },
  {
    key: 'upcomingReminders',
    label: 'Reminders',
    value: stats.upcomingReminders,
    icon: 'ri-timer-line',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    key: 'aiActionsToday',
    label: 'AI Actions Today',
    value: stats.aiActionsToday,
    icon: 'ri-robot-2-line',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    key: 'syncedAccounts',
    label: 'Synced Accounts',
    value: stats.syncedAccounts,
    icon: 'ri-mail-settings-line',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
  },
];

export function SummaryWidgets({ stats }: SummaryWidgetsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {STAT_CARDS(stats).map((stat) => (
        <div
          key={stat.key}
          className="bg-white rounded-xl p-4 border border-background-200 hover:border-background-300 transition-colors cursor-pointer"
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
              <i className={`${stat.icon} ${stat.color} text-lg`}></i>
            </div>
          </div>
<p className="text-3xl font-semibold text-foreground-950 mb-1">{stat.value}</p>
<p className="text-sm text-foreground-500">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}