import { useState } from 'react';
import type { EmailAccount } from '@/hooks/useDashboard';

const STATUS_STYLES: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  synced: { label: 'Synced', dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
  syncing: { label: 'Syncing', dot: 'bg-primary-500', bg: 'bg-primary-500/10', text: 'text-primary-600' },
  pending: { label: 'Pending', dot: 'bg-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-600' },
  error: { label: 'Error', dot: 'bg-rose-500', bg: 'bg-rose-500/10', text: 'text-rose-600' },
};

function formatSyncTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
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

interface EmailAccountsListProps {
  accounts: EmailAccount[];
  onAddAccount: () => void;
  onSync: (accountId: string) => void;
  onFixPassword: (accountId: string) => void;
  onDelete: (accountId: string) => void;
  syncingIds: Set<string>;
  syncErrors: Record<string, string>;
}

export function EmailAccountsList({ accounts, onAddAccount, onSync, onFixPassword, onDelete, syncingIds, syncErrors }: EmailAccountsListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = (accountId: string) => {
    setDeleteConfirmId(accountId);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-background-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-background-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground-950">Email Accounts</h3>
        <button
          onClick={onAddAccount}
          className="text-xs px-2.5 py-1.5 rounded-md bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          + Add
        </button>
      </div>
      <div className="divide-y divide-background-100">
        {accounts.length === 0 && (
          <div className="px-5 py-6 text-center">
            <div className="w-10 h-10 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-2">
              <i className="ri-mail-add-line text-lg text-foreground-400"></i>
            </div>
            <p className="text-sm text-foreground-500">No email accounts connected</p>
            <button
              onClick={onAddAccount}
              className="mt-2 text-xs text-primary-500 hover:text-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              Connect your first account
            </button>
          </div>
        )}
        {accounts.map((account) => {
          const status = STATUS_STYLES[account.sync_status] || STATUS_STYLES.pending;
          const isSyncing = syncingIds.has(account.id);
          const syncError = syncErrors[account.id];
          const hasPasswordError = !!syncError;
          const isGmail = account.email_address?.includes('gmail') || account.domain_name?.includes('gmail');
          return (
            <div
              key={account.id}
              className="px-5 py-3.5 hover:bg-background-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary-500/10 flex items-center justify-center shrink-0">
                  <i className="ri-mail-line text-secondary-500 text-base"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground-900 truncate">
                      {account.display_name || account.email_address}
                    </p>
                    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${status.bg} ${status.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${isSyncing ? 'animate-pulse' : ''}`}></span>
                      {isSyncing ? 'Syncing...' : status.label}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-500 truncate">{account.email_address}</p>
                  <p className="text-xs text-foreground-400 mt-0.5">
                    Last sync: {formatSyncTime(account.last_sync)}
                  </p>
                  {syncError && (
                    <div className="mt-1.5 p-2 rounded-md bg-rose-500/5 border border-rose-200">
                      <p className="text-xs text-rose-600 leading-relaxed line-clamp-3">{syncError}</p>
                      {hasPasswordError && (
                        <button
                          onClick={() => onFixPassword(account.id)}
                          className="mt-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 underline cursor-pointer whitespace-nowrap"
                        >
                          Update password &amp; retry
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onSync(account.id)}
                    disabled={isSyncing}
                    className="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium text-primary-500 hover:bg-primary-500/10 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {isSyncing ? (
                      <>
                        <i className="ri-loader-4-line animate-spin text-sm w-4 h-4 flex items-center justify-center"></i>
                        Syncing
                      </>
                    ) : (
                      <>
                        <i className="ri-refresh-line text-sm w-4 h-4 flex items-center justify-center"></i>
                        Sync
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
                    disabled={isSyncing}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-xs text-foreground-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove account"
                  >
                    <i className="ri-delete-bin-line text-sm"></i>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div className="bg-white rounded-xl w-full max-w-sm shadow-lg overflow-hidden">
            <div className="px-5 py-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                  <i className="ri-error-warning-line text-rose-500 text-lg"></i>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground-950">Remove Account?</h3>
                  <p className="text-xs text-foreground-500 mt-0.5">
                    This will permanently delete the account and all its synced emails.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-4 py-2 rounded-lg border border-background-200 text-sm font-medium text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 rounded-lg bg-rose-500 text-sm font-medium text-white hover:bg-rose-600 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Yes, Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}