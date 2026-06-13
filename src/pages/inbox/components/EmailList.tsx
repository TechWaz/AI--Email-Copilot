import { useState, useEffect } from 'react';
import type { InboxEmail, SentEmail, FilterTab } from '@/hooks/useInbox';
import { usePreferences } from '@/contexts/PreferencesContext';

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return '??';
}

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All mail' },
  { id: 'unread', label: 'Unread' },
  { id: 'read', label: 'Read' },
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
  onSelectEmail: (email: InboxEmail) => void;
  onFilterChange: (filter: FilterTab) => void;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onToggleStar: (id: string, current: boolean) => void;
  onMoveToFolder: (ids: string[], folder: string) => void;
}

export function EmailList({
  emails,
  sentEmails,
  selectedEmail,
  filterTab,
  searchQuery,
  isLoading,
  error,
  selectedIds,
  folder,
  onSelectEmail,
  onFilterChange,
  onSearchChange,
  onRefresh,
  onToggleSelect,
  onSelectAll,
  onToggleStar,
  onMoveToFolder,
}: EmailListProps) {
  const { prefs } = usePreferences();
  const rowPy = prefs.emailDensity === 'compact' ? 'py-2' : 'py-3';
  const [showBulkActions, setShowBulkActions] = useState(false);
  const isSentOrDraft = folder === 'Sent' || folder === 'Drafts';
  const displayItems = isSentOrDraft ? sentEmails : emails;
  const allSelected = displayItems.length > 0 && selectedIds.size === displayItems.length;
  const someSelected = selectedIds.size > 0;

  useEffect(() => {
    setShowBulkActions(someSelected);
  }, [someSelected]);

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-white">
      {/* Search bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm w-4 h-4 flex items-center justify-center"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search mail"
            className="w-full pl-9 pr-10 py-2 rounded-lg border border-background-200 text-sm text-foreground-950 placeholder:text-foreground-400 bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          />
          {searchQuery ? (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"
            >
              <i className="ri-close-line text-sm w-4 h-4 flex items-center justify-center"></i>
            </button>
          ) : (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-300 text-xs w-4 h-4 flex items-center justify-center">
              <i className="ri-search-2-line"></i>
            </div>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 pb-2 flex items-center gap-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onFilterChange(tab.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              filterTab === tab.id
                ? 'bg-foreground-950 text-white'
                : 'text-foreground-600 hover:bg-background-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bulk actions bar */}
      {showBulkActions && !isSentOrDraft && (
        <div className="px-4 py-2 flex items-center gap-2 border-y border-background-100 bg-background-50">
          <span className="text-xs text-foreground-600 font-medium">{selectedIds.size} selected</span>
          <div className="flex-1"></div>
          <button
            onClick={() => onMoveToFolder(Array.from(selectedIds), 'Trash')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-foreground-600 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
          >
            <i className="ri-delete-bin-line text-sm w-3.5 h-3.5 flex items-center justify-center"></i>
            Delete
          </button>
          <button
            onClick={() => onMoveToFolder(Array.from(selectedIds), 'Spam')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-foreground-600 hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer"
          >
            <i className="ri-spam-2-line text-sm w-3.5 h-3.5 flex items-center justify-center"></i>
            Spam
          </button>
          <button
            onClick={() => {
              selectedIds.forEach((id) => {
                const email = emails.find((e) => e.id === id);
                if (email) onToggleStar(id, email.is_starred);
              });
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-foreground-600 hover:bg-yellow-50 hover:text-yellow-600 transition-colors cursor-pointer"
          >
            <i className="ri-star-line text-sm w-3.5 h-3.5 flex items-center justify-center"></i>
            Star
          </button>
        </div>
      )}

      {/* Header row */}
      <div className="px-4 py-2 flex items-center gap-2 border-b border-background-100">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onSelectAll}
          className="w-4 h-4 rounded border-background-300 text-primary-500 focus:ring-primary-400 cursor-pointer"
        />
        <span className="text-xs text-foreground-400 flex-1">
          {isLoading ? 'Loading...' : `${displayItems.length} message${displayItems.length !== 1 ? 's' : ''}`}
        </span>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-50"
        >
          <i className={`ri-refresh-line text-sm ${isLoading ? 'animate-spin' : ''}`}></i>
        </button>
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2 text-sm text-foreground-400">
              <i className="ri-loader-4-line animate-spin"></i>
              Loading emails...
            </div>
          </div>
        )}

        {error && (
          <div className="px-4 py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-2">
              <i className="ri-error-warning-line text-rose-500 text-lg w-5 h-5 flex items-center justify-center"></i>
            </div>
            <p className="text-sm text-rose-600">{error}</p>
            <button
              onClick={onRefresh}
              className="mt-2 text-xs text-primary-500 hover:text-primary-600 cursor-pointer"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !error && displayItems.length === 0 && (
          <div className="px-4 py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-3">
              <i className="ri-mail-line text-2xl text-foreground-300"></i>
            </div>
            <p className="text-sm text-foreground-500 font-medium">No messages found</p>
            <p className="text-xs text-foreground-400 mt-1">
              {folder === 'Inbox' ? 'Get started with business email' : `Your ${folder} folder is empty`}
            </p>
          </div>
        )}

        {!isLoading && !error && isSentOrDraft && (sentEmails as any[]).map((sent) => (
          <div
            key={sent.id}
            className={`flex items-center gap-3 px-4 ${rowPy} border-b border-background-100 cursor-pointer transition-colors hover:bg-background-50`}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(sent.id)}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect(sent.id);
              }}
              className="w-4 h-4 rounded border-background-300 text-primary-500 focus:ring-primary-400 cursor-pointer shrink-0"
            />
            <div className="w-8 h-8 rounded-full bg-secondary-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-secondary-700">
                {getInitials(null, sent.to_recipients)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground-950 truncate">
                  {sent.to_recipients}
                </span>
                <span className="text-xs text-foreground-400 whitespace-nowrap shrink-0">
                  {formatTime(sent.sent_at)}
                </span>
              </div>
              <p className="text-sm text-foreground-700 truncate">{sent.subject || '(No Subject)'}</p>
              <p className="text-xs text-foreground-400 truncate">{(sent.body_text || '').slice(0, 80)}</p>
            </div>
          </div>
        ))}

        {!isLoading && !error && !isSentOrDraft && emails.map((email) => {
          const isSelected = selectedEmail?.id === email.id;
          const isChecked = selectedIds.has(email.id);
          const initials = getInitials(email.sender_name, email.sender_email);

          return (
            <div
              key={email.id}
              onClick={() => onSelectEmail(email)}
              className={`flex items-center gap-3 px-4 ${rowPy} border-b border-background-100 cursor-pointer transition-colors ${
                isSelected ? 'bg-primary-50' : email.is_read ? 'bg-white hover:bg-background-50' : 'bg-background-50/70 hover:bg-background-100'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleSelect(email.id);
                }}
                className="w-4 h-4 rounded border-background-300 text-primary-500 focus:ring-primary-400 cursor-pointer shrink-0"
              />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar(email.id, email.is_starred);
                }}
                className="shrink-0 cursor-pointer"
              >
                <i className={`${email.is_starred ? 'ri-star-fill text-yellow-400' : 'ri-star-line text-foreground-300 hover:text-foreground-500'} text-sm w-4 h-4 flex items-center justify-center`}></i>
              </button>

              <div className="w-8 h-8 rounded-full bg-secondary-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-secondary-700">{initials}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm truncate ${email.is_read ? 'font-normal text-foreground-700' : 'font-semibold text-foreground-950'}`}>
                    {email.sender_name || email.sender_email || 'Unknown'}
                  </span>
                  <span className="text-xs text-foreground-400 whitespace-nowrap shrink-0">
                    {formatTime(email.received_at)}
                  </span>
                </div>

                <p className={`text-sm truncate ${email.is_read ? 'text-foreground-600 font-normal' : 'text-foreground-900 font-medium'}`}>
                  {email.subject || '(No Subject)'}
                </p>

                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-foreground-400 truncate flex-1">
                    {(email.body_text || '').slice(0, 80)}
                  </p>
                  {email.ai_category && email.ai_category !== 'General' && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary-100 text-secondary-700 font-medium whitespace-nowrap shrink-0">
                      {email.ai_category}
                    </span>
                  )}
                  {prefs.showImportanceScore && email.importance_score !== null && email.importance_score >= 8 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 font-medium whitespace-nowrap shrink-0">
                      P{email.importance_score}
                    </span>
                  )}
                  {email.action_required && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" title="Action required"></span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}