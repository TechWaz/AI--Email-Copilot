import { useState } from 'react';
import { Sidebar } from '@/components/feature/Sidebar';
import { TopBar } from '@/components/feature/TopBar';
import { SummaryWidgets } from './components/SummaryWidgets';
import { RecentEmails } from './components/RecentEmails';
import { TasksPanel, RemindersPanel } from './components/TasksReminders';
import { EmailAccountsList } from './components/EmailAccountsList';
import { AddAccountModal } from './components/AddAccountModal';
import { useDashboard } from '@/hooks/useDashboard';

export default function Dashboard() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fixPasswordId, setFixPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [fixPasswordError, setFixPasswordError] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState(false);

  const { stats, recentEmails, pendingTasks, upcomingReminders, emailAccounts, isLoading, error, errorContext, retryAttempt, isRetrying, refresh, retryFetch, createEmailAccount, syncAccount, updateAccountPassword, deleteEmailAccount, syncResult, setSyncResult, syncingIds, syncErrors } = useDashboard();

  const handleCreateAccount = async (account: {
    domain_name: string;
    email_address: string;
    display_name: string;
    imap_host: string;
    imap_port: number;
    smtp_host: string;
    smtp_port: number;
    encrypted_password: string;
  }) => {
    setIsSubmitting(true);
    try {
      await createEmailAccount(account);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncAll = async () => {
    const pending = emailAccounts.filter((a) => a.sync_status !== 'syncing');
    for (const account of pending) {
      try {
        await syncAccount(account.id);
      } catch {
        // Error is already handled by the hook
      }
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      await deleteEmailAccount(accountId);
      setSyncResult({ type: 'success', message: 'Account removed successfully.' });
      setTimeout(() => setSyncResult(null), 4000);
    } catch (err) {
      setSyncResult({ type: 'error', message: err instanceof Error ? err.message : 'Failed to remove account.' });
      setTimeout(() => setSyncResult(null), 6000);
    }
  };

  const handleFixPassword = (accountId: string) => {
    setFixPasswordId(accountId);
    setNewPassword('');
    setFixPasswordError(null);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixPasswordId || !newPassword) return;

    setIsFixing(true);
    setFixPasswordError(null);
    try {
      await updateAccountPassword(fixPasswordId, newPassword);
      setFixPasswordId(null);
      setNewPassword('');
      setSyncResult({ type: 'success', message: 'Password updated. Click Sync to pull emails.' });
      setTimeout(() => setSyncResult(null), 5000);
    } catch (err) {
      setFixPasswordError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="flex h-screen bg-background-50 overflow-hidden">
      <Sidebar activeItem={activeNav} onNavigate={setActiveNav} onAddAccount={() => setIsModalOpen(true)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar title="Dashboard Overview" onRefresh={refresh} />

        {/* Toast notification */}
        {syncResult && (
          <div
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 cursor-pointer transition-all ${
              syncResult.type === 'success'
                ? 'bg-emerald-500 text-white'
                : 'bg-rose-500 text-white'
            }`}
            onClick={() => setSyncResult(null)}
          >
            <i className={`${syncResult.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'} text-base w-5 h-5 flex items-center justify-center`}></i>
            <span className="max-w-md truncate">{syncResult.message}</span>
            <i className="ri-close-line text-sm w-4 h-4 flex items-center justify-center ml-1 opacity-70 hover:opacity-100"></i>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3 text-sm text-foreground-500">
                  <i className="ri-loader-4-line animate-spin text-lg"></i>
                  Loading dashboard...
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="ri-error-warning-line text-amber-600 text-lg w-5 h-5 flex items-center justify-center"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800">Dashboard failed to load</p>
                    <p className="text-xs text-amber-600 mt-1">{error}</p>
                    {errorContext && (
                      <div className="mt-2 p-3 rounded-lg bg-amber-100/70 border border-amber-200">
                        <p className="text-xs text-amber-700 leading-relaxed">
                          <i className="ri-information-line align-middle mr-1 w-4 h-4 inline-flex items-center justify-center"></i>
                          {errorContext}
                        </p>
                      </div>
                    )}
                    {retryAttempt > 0 && (
                      <p className="text-xs text-amber-500 mt-1">Auto-retried {retryAttempt} time{retryAttempt > 1 ? 's' : ''} — still failing</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={retryFetch}
                    disabled={isRetrying}
                    className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isRetrying ? (
                      <>
                        <i className="ri-loader-4-line animate-spin text-sm w-4 h-4 flex items-center justify-center"></i>
                        Retrying...
                      </>
                    ) : (
                      <>
                        <i className="ri-refresh-line text-sm w-4 h-4 flex items-center justify-center"></i>
                        Retry
                      </>
                    )}
                  </button>
                  {isRetrying && (
                    <span className="text-xs text-amber-500">Attempt {retryAttempt + 1} of 3</span>
                  )}
                </div>
              </div>
            )}

            {!isLoading && !error && (
              <>
                <div className="flex items-center justify-between">
                  <SummaryWidgets stats={stats} />
                </div>

                {/* Sync All bar */}
                {emailAccounts.length > 0 && (
                  <div className="flex items-center gap-3 bg-white rounded-xl border border-background-200 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-foreground-700">
                      <i className="ri-mail-line text-foreground-400 w-5 h-5 flex items-center justify-center"></i>
                      <span>{emailAccounts.length} account{emailAccounts.length > 1 ? 's' : ''} connected</span>
                    </div>
                    <div className="flex-1"></div>
                    <button
                      onClick={handleSyncAll}
                      disabled={syncingIds.size > 0}
                      className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {syncingIds.size > 0 ? (
                        <>
                          <i className="ri-loader-4-line animate-spin text-sm w-4 h-4 flex items-center justify-center"></i>
                          Syncing {syncingIds.size}...
                        </>
                      ) : (
                        <>
                          <i className="ri-refresh-line text-sm w-4 h-4 flex items-center justify-center"></i>
                          Sync All Accounts
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2 space-y-5">
                    <RecentEmails emails={recentEmails} emailAccounts={emailAccounts} />
                    <EmailAccountsList
                      accounts={emailAccounts}
                      onAddAccount={() => setIsModalOpen(true)}
                      onSync={syncAccount}
                      onFixPassword={handleFixPassword}
                      onDelete={handleDeleteAccount}
                      syncingIds={syncingIds}
                      syncErrors={syncErrors}
                    />
                  </div>
                  <div className="space-y-5">
                    <div className="bg-white rounded-xl border border-background-200 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-foreground-950">Quick Stats</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-foreground-500">Emails Today</span>
                          <span className="text-sm font-semibold text-foreground-950">{stats.totalEmailsToday}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-foreground-500">AI Actions</span>
                          <span className="text-sm font-semibold text-foreground-950">{stats.aiActionsToday} today</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-foreground-500">Accounts Synced</span>
                          <span className="text-sm font-semibold text-foreground-950">{stats.syncedAccounts}</span>
                        </div>
                      </div>
                    </div>
                    <TasksPanel tasks={pendingTasks} />
                    <RemindersPanel reminders={upcomingReminders} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <AddAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateAccount}
        isSubmitting={isSubmitting}
      />

      {/* Password Update Modal */}
      {fixPasswordId && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => { if (!isFixing) { setFixPasswordId(null); setFixPasswordError(null); } }}
        >
          <div className="bg-white rounded-xl w-full max-w-sm shadow-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-background-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground-950">Update Password</h3>
              <button
                onClick={() => { setFixPasswordId(null); setFixPasswordError(null); }}
                disabled={isFixing}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-500 hover:text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <form onSubmit={handlePasswordUpdate} className="px-5 py-4 space-y-4">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-200">
                <p className="text-xs text-amber-700 leading-relaxed">
                  <i className="ri-information-line align-middle mr-1 w-4 h-4 inline-flex items-center justify-center"></i>
                  {emailAccounts.find(a => a.id === fixPasswordId)?.email_address?.includes('gmail')
                    ? 'Gmail requires an App Password. Generate one at myaccount.google.com/apppasswords (16 characters, no spaces).'
                    : 'Enter the correct password for this email account.'}
                </p>
              </div>

              {fixPasswordError && (
                <div className="p-3 rounded-lg bg-rose-500/10 text-rose-600 text-xs">
                  {fixPasswordError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm text-foreground-950 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  placeholder="Enter new password or app password"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setFixPasswordId(null); setFixPasswordError(null); }}
                  disabled={isFixing}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-background-200 text-sm font-medium text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isFixing || !newPassword}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-sm font-medium text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                >
                  {isFixing ? 'Updating...' : 'Update & Sync'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}