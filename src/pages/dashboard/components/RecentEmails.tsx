import type { RecentEmail } from '@/hooks/useDashboard';

const CATEGORY_COLORS: Record<string, string> = {
  Client: 'bg-accent-500/10 text-accent-600',
  Important: 'bg-primary-500/10 text-primary-600',
  Internal: 'bg-secondary-500/10 text-secondary-600',
  Finance: 'bg-emerald-500/10 text-emerald-600',
  Marketing: 'bg-amber-500/10 text-amber-600',
  Personal: 'bg-rose-500/10 text-rose-600',
  Social: 'bg-sky-500/10 text-sky-600',
  Updates: 'bg-violet-500/10 text-violet-600',
  Promotions: 'bg-orange-500/10 text-orange-600',
  Forums: 'bg-cyan-500/10 text-cyan-600',
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface RecentEmailsProps {
  emails: RecentEmail[];
}

export function RecentEmails({ emails }: RecentEmailsProps) {
  return (
    <div className="bg-white rounded-xl border border-background-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-background-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground-950">Recent Emails</h3>
        <button className="text-xs text-foreground-500 hover:text-primary-500 transition-colors cursor-pointer whitespace-nowrap">
          View All
        </button>
      </div>
      <div className="divide-y divide-background-100">
        {emails.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-foreground-400">
            No emails yet. Add an email account to get started.
          </div>
        )}
        {emails.slice(0, 6).map((email) => (
          <div
            key={email.id}
            className="px-5 py-3 hover:bg-background-50 transition-colors cursor-pointer flex items-start gap-3"
          >
            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${email.is_read ? 'bg-background-300' : 'bg-primary-500'}`}></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-sm font-medium truncate ${email.is_read ? 'text-foreground-600' : 'text-foreground-950'}`}>
                  {email.sender_name || email.sender_email || 'Unknown'}
                </span>
                {(email.importance_score ?? 0) > 0.5 && (
                  <i className="ri-star-fill text-xs text-accent-500 shrink-0 w-3 h-3 flex items-center justify-center"></i>
                )}
              </div>
              <p className={`text-sm truncate mb-0.5 ${email.is_read ? 'text-foreground-500' : 'text-foreground-800 font-medium'}`}>
                {email.subject || '(No subject)'}
              </p>
              <p className="text-xs text-foreground-400 truncate">{email.body_text || 'No preview available'}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {email.ai_summary && (
                <span className="text-xs px-1.5 py-0.5 rounded-md bg-primary-500/10 text-primary-600 whitespace-nowrap">AI</span>
              )}
              <span className={`text-xs px-1.5 py-0.5 rounded-md whitespace-nowrap ${CATEGORY_COLORS[email.ai_category || ''] || 'bg-background-100 text-foreground-500'}`}>
                {email.ai_category || 'General'}
              </span>
              <span className="text-xs text-foreground-400 whitespace-nowrap w-14 text-right">
                {formatTime(email.received_at)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}