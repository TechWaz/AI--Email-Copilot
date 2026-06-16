import { useState, useEffect } from 'react';
import type { InboxEmail, SentEmail, FilterTab } from '@/hooks/useInbox';
import { usePreferences } from '@/contexts/PreferencesContext';

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (diff < 7 * 86400000) return d.toLocaleDateString('en-US', { weekday: 'short' });
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return '??';
}

const AVATAR_COLORS = [
  'bg-rose-400', 'bg-orange-400', 'bg-amber-400', 'bg-emerald-500',
  'bg-teal-500', 'bg-blue-500', 'bg-violet-500', 'bg-pink-500',
];
function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'starred', label: 'Starred' },
];

interface EmailListProps {
  emails: InboxEmail[];
  sentEmails: SentEmail[];
  selectedEmail: InboxEmail | null;
  filterTab: FilterTab;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  selectedIds: Set<string>;
  folder: string;
  isNarrow: boolean;
  onSelectEmail: (email: InboxEmail) => void;
  onFilterChange: (filter: FilterTab) => void;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onToggleStar: (id: string, current: boolean) => void;
  onMoveToFolder: (ids: string[], folder: string) => void;
  onDeleteSent: (id: string) => void;
}

export function EmailList({
  emails, sentEmails, selectedEmail,
  filterTab, searchQuery, isLoading, error,
  selectedIds, folder, isNarrow,
  onSelectEmail, onFilterChange, onSearchChange,
  onRefresh, onToggleSelect, onSelectAll,
  onToggleStar, onMoveToFolder, onDeleteSent,
}: EmailListProps) {
  const { prefs } = usePreferences();
  const isSentOrDraft = folder === 'Sent' || folder === 'Drafts';
  const displayItems = isSentOrDraft ? sentEmails : emails;
  const allSelected = displayItems.length > 0 && selectedIds.size === displayItems.length;
  const someSelected = selectedIds.size > 0;
  const rowH = prefs.emailDensity === 'compact' ? 'h-10' : 'h-14';

  // Local inline search for narrow/expanded
  const [localSearch, setLocalSearch] = useState(searchQuery);
  useEffect(() => { setLocalSearch(searchQuery); }, [searchQuery]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-background-100 shrink-0">
        {/* Select all checkbox */}
        <div className="relative flex items-center shrink-0">
          <input
            type="checkbox"
            checked={allSelected}
            ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
            onChange={onSelectAll}
            className="w-4 h-4 rounded border-background-300 text-primary-500 focus:ring-primary-400 cursor-pointer accent-primary-500"
          />
          <button className="ml-0.5 text-foreground-400 hover:text-foreground-600 cursor-pointer">
            <i className="ri-arrow-down-s-line text-sm"></i>
          </button>
        </div>

        {someSelected ? (
          /* Bulk actions */
          <div className="flex items-center gap-0.5 ml-1">
            <ActionBtn icon="ri-archive-line" title="Archive" onClick={() => onMoveToFolder(Array.from(selectedIds), 'Archive')} />
            <ActionBtn icon="ri-delete-bin-line" title="Delete" onClick={() => onMoveToFolder(Array.from(selectedIds), 'Trash')} />
            <ActionBtn icon="ri-mail-unread-line" title="Mark as unread" onClick={() => {}} />
            <ActionBtn icon="ri-spam-2-line" title="Report spam" onClick={() => onMoveToFolder(Array.from(selectedIds), 'Spam')} />
            <span className="ml-2 text-xs text-foreground-500">{selectedIds.size} selected</span>
          </div>
        ) : (
          <>
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-black/8 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh"
            >
              <i className={`ri-refresh-line text-lg ${isLoading ? 'animate-spin' : ''}`}></i>
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-black/8 transition-colors cursor-pointer" title="More">
              <i className="ri-more-2-line text-lg"></i>
            </button>
            <span className="ml-auto text-xs text-foreground-400">
              {isLoading ? 'Loading...' : `1–${displayItems.length} of ${displayItems.length}`}
            </span>
            <div className="flex items-center gap-0.5 ml-2">
              <button className="w-7 h-7 flex items-center justify-center rounded-full text-foreground-400 hover:bg-black/8 cursor-pointer">
                <i className="ri-arrow-left-s-line text-lg"></i>
              </button>
              <button className="w-7 h-7 flex items-center justify-center rounded-full text-foreground-400 hover:bg-black/8 cursor-pointer">
                <i className="ri-arrow-right-s-line text-lg"></i>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Filter tabs (only for inbox view) */}
      {!isSentOrDraft && (
        <div className="flex items-center border-b border-background-100 shrink-0 px-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onFilterChange(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
                filterTab === tab.id
                  ? 'border-primary-500 text-primary-700'
                  : 'border-transparent text-foreground-500 hover:text-foreground-800 hover:bg-black/4'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Email rows */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <i className="ri-loader-4-line animate-spin text-3xl text-primary-400"></i>
              <span className="text-sm text-foreground-400">Loading mail...</span>
            </div>
          </div>
        )}

        {error && !isLoading && (
          <div className="m-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-center">
            <i className="ri-error-warning-line text-rose-500 text-2xl mb-2 block"></i>
            <p className="text-sm text-rose-700">{error}</p>
            <button onClick={onRefresh} className="mt-2 text-xs text-rose-600 font-medium underline cursor-pointer">Retry</button>
          </div>
        )}

        {!isLoading && !error && displayItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-3">
              <i className="ri-inbox-line text-3xl text-foreground-300"></i>
            </div>
            <p className="text-sm font-medium text-foreground-500">
              {searchQuery ? `No results for "${searchQuery}"` : `${folder} is empty`}
            </p>
          </div>
        )}

        {/* Sent / Drafts rows */}
        {!isLoading && !error && isSentOrDraft && sentEmails.map(sent => (
          <div
            key={sent.id}
            className={`group flex items-center gap-2 px-3 border-b border-background-50 cursor-pointer transition-colors hover:bg-background-50 hover:shadow-sm ${rowH}`}
          >
            <div className="flex items-center gap-2 shrink-0 w-8">
              <input
                type="checkbox"
                checked={selectedIds.has(sent.id)}
                onChange={e => { e.stopPropagation(); onToggleSelect(sent.id); }}
                className="w-4 h-4 rounded accent-primary-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
            <i className="ri-star-line text-base text-foreground-300 shrink-0 w-5"></i>
            <div className={`${isNarrow ? 'w-28' : 'w-40'} shrink-0`}>
              <span className="text-sm truncate block font-normal text-foreground-600">
                To: {sent.to_recipients}
              </span>
            </div>
            <div className="flex-1 flex items-baseline gap-2 min-w-0">
              <span className="text-sm font-normal text-foreground-700 truncate">{sent.subject || '(No Subject)'}</span>
              {!isNarrow && <span className="text-sm text-foreground-400 truncate">{(sent.body_text || '').slice(0, 80)}</span>}
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <div className="hidden group-hover:flex items-center gap-0.5">
                <MiniAction icon="ri-delete-bin-line" title="Delete" onClick={() => onDeleteSent(sent.id)} />
              </div>
              <span className="text-xs text-foreground-400 whitespace-nowrap group-hover:hidden">{formatTime(sent.sent_at)}</span>
            </div>
          </div>
        ))}

        {/* Inbox email rows */}
        {!isLoading && !error && !isSentOrDraft && emails.map(email => {
          const isSelected = selectedEmail?.id === email.id;
          const isChecked = selectedIds.has(email.id);
          const senderKey = email.sender_email || email.sender_name || 'U';
          const initials = getInitials(email.sender_name, email.sender_email);
          const avatarBg = avatarColor(senderKey);

          return (
            <div
              key={email.id}
              onClick={() => onSelectEmail(email)}
              className={`group relative flex items-center gap-2 px-3 border-b border-background-50 cursor-pointer transition-all ${rowH} ${
                isSelected
                  ? 'bg-primary-50 hover:bg-primary-100/80'
                  : email.is_read
                    ? 'bg-white hover:bg-background-50 hover:shadow-sm'
                    : 'bg-white hover:bg-background-50 hover:shadow-sm font-semibold'
              }`}
            >
              {/* Unread bar */}
              {!email.is_read && (
                <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-primary-500 rounded-r"></span>
              )}

              {/* Checkbox - hidden until hover/checked */}
              <div className="flex items-center justify-center w-8 shrink-0">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={e => { e.stopPropagation(); onToggleSelect(email.id); }}
                  onClick={e => e.stopPropagation()}
                  className={`w-4 h-4 rounded accent-primary-500 cursor-pointer transition-opacity ${
                    isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                />
                {/* Avatar - visible when not hovering */}
                <div className={`absolute w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center pointer-events-none transition-opacity ${
                  isChecked ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'
                }`}>
                  <span className="text-xs font-bold text-white">{initials}</span>
                </div>
              </div>

              {/* Star */}
              <button
                onClick={e => { e.stopPropagation(); onToggleStar(email.id, email.is_starred); }}
                className="shrink-0 w-5 h-5 flex items-center justify-center cursor-pointer"
                title={email.is_starred ? 'Unstar' : 'Star'}
              >
                <i className={`text-base transition-colors ${
                  email.is_starred ? 'ri-star-fill text-amber-400' : 'ri-star-line text-foreground-300 group-hover:text-foreground-500'
                }`}></i>
              </button>

              {/* Sender name */}
              <div className={`shrink-0 ${isNarrow ? 'w-24' : 'w-36'}`}>
                <span className={`text-sm truncate block ${
                  email.is_read ? 'font-normal text-foreground-700' : 'font-bold text-foreground-950'
                }`}>
                  {email.sender_name || email.sender_email?.split('@')[0] || 'Unknown'}
                </span>
              </div>

              {/* Subject + snippet */}
              <div className="flex-1 flex items-baseline gap-1.5 min-w-0 overflow-hidden">
                <span className={`text-sm truncate ${email.is_read ? 'font-normal text-foreground-700' : 'font-bold text-foreground-900'}`}>
                  {email.subject || '(No Subject)'}
                </span>
                {!isNarrow && (
                  <span className="text-sm text-foreground-400 truncate font-normal">
                    — {(email.body_text || '').replace(/\s+/g, ' ').trim().slice(0, 100)}
                  </span>
                )}
              </div>

              {/* Labels / importance */}
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {prefs.showImportanceScore && email.importance_score !== null && email.importance_score >= 8 && (
                  <span className="hidden group-hover:hidden text-xs px-1.5 py-0.5 rounded-sm bg-amber-50 text-amber-700 border border-amber-200 font-medium whitespace-nowrap">
                    !
                  </span>
                )}
                {email.action_required && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 group-hover:hidden" title="Action required"></span>
                )}
                {email.ai_category && email.ai_category !== 'General' && !isNarrow && (
                  <span className="hidden sm:inline text-xs px-1.5 py-0.5 rounded-sm bg-background-100 text-foreground-500 whitespace-nowrap">
                    {email.ai_category}
                  </span>
                )}
              </div>

              {/* Date + hover actions */}
              <div className="flex items-center gap-1 shrink-0 min-w-[60px] justify-end">
                {/* Hover action buttons */}
                <div className="hidden group-hover:flex items-center gap-0.5">
                  <MiniAction icon="ri-archive-line" title="Archive" onClick={() => onMoveToFolder([email.id], 'Archive')} />
                  <MiniAction icon="ri-delete-bin-line" title="Delete" onClick={() => onMoveToFolder([email.id], 'Trash')} />
                  <MiniAction icon="ri-mail-unread-line" title="Mark unread" onClick={() => {}} />
                </div>
                {/* Date */}
                <span className={`text-xs whitespace-nowrap group-hover:hidden ${email.is_read ? 'text-foreground-400' : 'text-foreground-700 font-medium'}`}>
                  {formatTime(email.received_at)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActionBtn({ icon, title, onClick }: { icon: string; title: string; onClick: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      title={title}
      className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-600 hover:bg-black/8 transition-colors cursor-pointer"
    >
      <i className={`${icon} text-base`}></i>
    </button>
  );
}

function MiniAction({ icon, title, onClick }: { icon: string; title: string; onClick: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded-full text-foreground-500 hover:bg-black/12 hover:text-foreground-900 transition-colors cursor-pointer"
    >
      <i className={`${icon} text-base`}></i>
    </button>
  );
}
