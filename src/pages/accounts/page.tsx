import { useState } from 'react';
import { Sidebar } from '@/components/feature/Sidebar';
import { useAccounts, type EmailAccount } from '@/hooks/useAccounts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getProvider(host: string): { name: string; color: string; letter: string } {
  const h = host.toLowerCase();
  if (h.includes('gmail') || h.includes('google')) return { name: 'Gmail', color: 'bg-rose-500', letter: 'G' };
  if (h.includes('outlook') || h.includes('microsoft') || h.includes('office365') || h.includes('hotmail')) return { name: 'Outlook', color: 'bg-blue-500', letter: 'O' };
  if (h.includes('yahoo')) return { name: 'Yahoo', color: 'bg-violet-500', letter: 'Y' };
  if (h.includes('hostinger')) return { name: 'Hostinger', color: 'bg-violet-600', letter: 'H' };
  if (h.includes('icloud') || h.includes('apple')) return { name: 'iCloud', color: 'bg-sky-500', letter: 'i' };
  if (h.includes('zoho')) return { name: 'Zoho', color: 'bg-orange-500', letter: 'Z' };
  return { name: 'Custom', color: 'bg-foreground-600', letter: host.charAt(0).toUpperCase() };
}

function formatLastSync(dateStr: string | null): string {
  if (!dateStr) return 'Never synced';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STATUS_STYLES: Record<string, { label: string; cls: string; icon: string }> = {
  synced:  { label: 'Synced',   cls: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: 'ri-checkbox-circle-line' },
  syncing: { label: 'Syncing',  cls: 'text-blue-600 bg-blue-50 border-blue-200',         icon: 'ri-loader-4-line animate-spin' },
  error:   { label: 'Error',    cls: 'text-rose-600 bg-rose-50 border-rose-200',          icon: 'ri-error-warning-line' },
  pending: { label: 'Pending',  cls: 'text-amber-600 bg-amber-50 border-amber-200',       icon: 'ri-time-line' },
};

// ─── Add Account Modal ────────────────────────────────────────────────────────

const PROVIDER_PRESETS = [
  { name: 'Gmail',   imap_host: 'imap.gmail.com',         imap_port: 993, smtp_host: 'smtp.gmail.com',         smtp_port: 587, hint: 'Requires an App Password from myaccount.google.com/apppasswords' },
  { name: 'Outlook', imap_host: 'outlook.office365.com',  imap_port: 993, smtp_host: 'smtp.office365.com',     smtp_port: 587, hint: 'Use your Microsoft account password or an App Password' },
  { name: 'Yahoo',   imap_host: 'imap.mail.yahoo.com',    imap_port: 993, smtp_host: 'smtp.mail.yahoo.com',    smtp_port: 587, hint: 'Requires an App Password from Yahoo Account Security settings' },
  { name: 'Custom',  imap_host: '',                        imap_port: 993, smtp_host: '',                       smtp_port: 587, hint: 'Enter your email provider\'s IMAP and SMTP server details' },
];

interface AddModalProps {
  isSaving: boolean;
  error: string | null;
  onSave: (data: {
    domain_name: string; email_address: string; display_name: string;
    imap_host: string; imap_port: number; smtp_host: string; smtp_port: number; encrypted_password: string;
  }) => void;
  onClose: () => void;
}

function AddAccountModal({ isSaving, error, onSave, onClose }: AddModalProps) {
  const [preset, setPreset] = useState(PROVIDER_PRESETS[0]);
  const [form, setForm] = useState({
    email_address: '', display_name: '', encrypted_password: '',
    imap_host: preset.imap_host, imap_port: preset.imap_port,
    smtp_host: preset.smtp_host, smtp_port: preset.smtp_port,
  });

  const applyPreset = (p: typeof PROVIDER_PRESETS[0]) => {
    setPreset(p);
    setForm(f => ({
      ...f,
      imap_host: p.imap_host,
      imap_port: p.imap_port,
      smtp_host: p.smtp_host,
      smtp_port: p.smtp_port,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const domain = form.email_address.split('@')[1] || '';
    onSave({ ...form, domain_name: domain });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget && !isSaving) onClose(); }}
    >
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl my-4">
        <div className="px-5 py-4 border-b border-background-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground-950">Connect Email Account</h3>
          <button onClick={onClose} disabled={isSaving} className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-500 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-40">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="px-5 pt-4">
          {/* Provider presets */}
          <p className="text-xs font-medium text-foreground-600 mb-2">Quick setup</p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {PROVIDER_PRESETS.map(p => (
              <button
                key={p.name}
                type="button"
                onClick={() => applyPreset(p)}
                className={`py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  preset.name === p.name
                    ? 'border-primary-400 bg-primary-50 text-primary-700'
                    : 'border-background-200 text-foreground-600 hover:bg-background-50'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
          {preset.hint && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 mb-4">
              <i className="ri-information-line text-amber-500 text-sm shrink-0 mt-0.5"></i>
              <p className="text-xs text-amber-700">{preset.hint}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3.5">
          {error && <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-600">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-foreground-700 mb-1.5">Email Address <span className="text-rose-500">*</span></label>
              <input type="email" required value={form.email_address} onChange={e => setForm(f => ({ ...f, email_address: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="you@example.com" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-foreground-700 mb-1.5">Display Name</label>
              <input type="text" value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="Your Name (optional)" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-foreground-700 mb-1.5">Password / App Password <span className="text-rose-500">*</span></label>
              <input type="password" required value={form.encrypted_password} onChange={e => setForm(f => ({ ...f, encrypted_password: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="Password or 16-char app password" />
            </div>
          </div>

          <div className="border-t border-background-100 pt-3">
            <p className="text-xs font-medium text-foreground-500 mb-2.5">Server settings</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1.5">IMAP Host <span className="text-rose-500">*</span></label>
                <input type="text" required value={form.imap_host} onChange={e => setForm(f => ({ ...f, imap_host: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  placeholder="imap.example.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1.5">IMAP Port</label>
                <input type="number" value={form.imap_port} onChange={e => setForm(f => ({ ...f, imap_port: parseInt(e.target.value) || 993 }))}
                  className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1.5">SMTP Host <span className="text-rose-500">*</span></label>
                <input type="text" required value={form.smtp_host} onChange={e => setForm(f => ({ ...f, smtp_host: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  placeholder="smtp.example.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1.5">SMTP Port</label>
                <input type="number" value={form.smtp_port} onChange={e => setForm(f => ({ ...f, smtp_port: parseInt(e.target.value) || 587 }))}
                  className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={isSaving}
              className="flex-1 py-2.5 rounded-lg border border-background-200 text-sm font-medium text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-40">
              Cancel
            </button>
            <button type="submit" disabled={isSaving}
              className="flex-1 py-2.5 rounded-lg bg-primary-500 text-sm font-medium text-white hover:bg-primary-600 transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2">
              {isSaving ? <><i className="ri-loader-4-line animate-spin text-sm"></i> Connecting...</> : 'Connect Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Account Card ─────────────────────────────────────────────────────────────

interface AccountCardProps {
  account: EmailAccount;
  emailCount: number;
  isSyncing: boolean;
  syncError: string | null;
  onSync: () => void;
  onDelete: () => void;
  onUpdatePassword: (newPw: string) => Promise<void>;
}

function AccountCard({ account, emailCount, isSyncing, syncError, onSync, onDelete, onUpdatePassword }: AccountCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const provider = getProvider(account.imap_host);
  const status = isSyncing ? 'syncing' : account.sync_status;
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.pending;

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    setPwSaving(true);
    setPwError(null);
    try {
      await onUpdatePassword(newPassword);
      setShowPasswordForm(false);
      setNewPassword('');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-sm ${
      syncError ? 'border-rose-200' : 'border-background-200'
    }`}>
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Provider avatar */}
        <div className={`w-10 h-10 rounded-xl ${provider.color} flex items-center justify-center shrink-0`}>
          <span className="text-sm font-bold text-white">{provider.letter}</span>
        </div>

        {/* Account info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground-950 truncate">{account.email_address}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${statusStyle.cls}`}>
              <i className={`${statusStyle.icon} text-xs`}></i>
              {statusStyle.label}
            </span>
            <span className="text-xs text-foreground-400 bg-background-100 px-2 py-0.5 rounded-full">{provider.name}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-foreground-400 flex-wrap">
            {account.display_name && <span className="text-foreground-600">{account.display_name}</span>}
            <span><i className="ri-mail-line mr-0.5"></i>{emailCount.toLocaleString()} emails</span>
            <span><i className="ri-time-line mr-0.5"></i>{formatLastSync(account.last_sync)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onSync}
            disabled={isSyncing}
            title="Sync now"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-600 text-xs font-medium hover:bg-primary-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <i className={`${isSyncing ? 'ri-loader-4-line animate-spin' : 'ri-refresh-line'} text-sm`}></i>
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            title="More options"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer"
          >
            <i className={`ri-arrow-${expanded ? 'up' : 'down'}-s-line text-base`}></i>
          </button>
        </div>
      </div>

      {/* Sync error */}
      {syncError && (
        <div className="mx-5 mb-3 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2">
          <i className="ri-error-warning-line text-rose-500 text-sm shrink-0 mt-0.5"></i>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-rose-700">Sync failed</p>
            <p className="text-xs text-rose-500 mt-0.5 break-words">{syncError.slice(0, 200)}</p>
          </div>
          <button onClick={() => setShowPasswordForm(true)} className="text-xs text-rose-600 font-medium hover:text-rose-700 cursor-pointer whitespace-nowrap shrink-0">
            Fix password
          </button>
        </div>
      )}

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-background-100 px-5 py-4 space-y-4">
          {/* Server info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-background-50 border border-background-100">
              <p className="text-xs font-medium text-foreground-500 mb-1">IMAP (Incoming)</p>
              <p className="text-sm font-medium text-foreground-900">{account.imap_host}</p>
              <p className="text-xs text-foreground-400">Port {account.imap_port} · TLS</p>
            </div>
            <div className="p-3 rounded-lg bg-background-50 border border-background-100">
              <p className="text-xs font-medium text-foreground-500 mb-1">SMTP (Outgoing)</p>
              <p className="text-sm font-medium text-foreground-900">{account.smtp_host}</p>
              <p className="text-xs text-foreground-400">Port {account.smtp_port} · STARTTLS</p>
            </div>
          </div>

          {/* Added date */}
          <p className="text-xs text-foreground-400">
            Connected {new Date(account.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          {/* Password update form */}
          {showPasswordForm ? (
            <form onSubmit={handlePasswordSave} className="space-y-2.5 p-3 rounded-lg bg-background-50 border border-background-200">
              <p className="text-xs font-medium text-foreground-700">Update Password</p>
              {pwError && <p className="text-xs text-rose-600">{pwError}</p>}
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New password or app password"
                required
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowPasswordForm(false); setPwError(null); setNewPassword(''); }}
                  className="flex-1 py-2 rounded-lg border border-background-200 text-xs font-medium text-foreground-600 hover:bg-background-100 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={pwSaving || !newPassword}
                  className="flex-1 py-2 rounded-lg bg-primary-500 text-xs font-medium text-white hover:bg-primary-600 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1">
                  {pwSaving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : 'Save & Sync'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowPasswordForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-background-200 text-xs font-medium text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer">
                <i className="ri-key-line text-sm"></i>
                Update Password
              </button>

              {confirmDelete ? (
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-foreground-500">Delete account and all its emails?</span>
                  <button onClick={onDelete}
                    className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-medium hover:bg-rose-600 cursor-pointer">
                    Yes, Delete
                  </button>
                  <button onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 rounded-lg border border-background-200 text-xs font-medium text-foreground-600 hover:bg-background-100 cursor-pointer">
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ml-auto">
                  <i className="ri-delete-bin-line text-sm"></i>
                  Remove Account
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const [activeNav, setActiveNav] = useState('accounts');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { accounts, emailCounts, isLoading, error, syncingIds, syncErrors, createAccount, syncAccount, updatePassword, deleteAccount, refresh } = useAccounts();

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreate = async (data: Parameters<typeof createAccount>[0]) => {
    setAddSaving(true);
    setAddError(null);
    try {
      await createAccount(data);
      setShowAddModal(false);
      showToast('success', `${data.email_address} connected successfully`);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to connect account');
    } finally {
      setAddSaving(false);
    }
  };

  const handleSync = async (account: EmailAccount) => {
    try {
      const result = await syncAccount(account.id);
      const msg = result.synced > 0
        ? `${account.email_address}: ${result.synced} new emails synced`
        : `${account.email_address}: ${result.message || 'Up to date'}`;
      showToast('success', msg);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message.slice(0, 120) : 'Sync failed');
    }
  };

  const handleSyncAll = async () => {
    const idle = accounts.filter(a => !syncingIds.has(a.id));
    for (const acct of idle) {
      handleSync(acct);
    }
  };

  const handleDelete = async (account: EmailAccount) => {
    try {
      await deleteAccount(account.id);
      showToast('success', `${account.email_address} removed`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to remove account');
    }
  };

  const handleUpdatePassword = async (account: EmailAccount, newPw: string) => {
    await updatePassword(account.id, newPw);
    showToast('success', 'Password updated — click Sync to pull emails');
  };

  const totalEmails = Object.values(emailCounts).reduce((a, b) => a + b, 0);
  const syncedCount = accounts.filter(a => a.sync_status === 'synced').length;
  const errorCount = accounts.filter(a => a.sync_status === 'error').length;

  return (
    <div className="flex h-screen bg-background-50 overflow-hidden">
      <Sidebar activeItem={activeNav} onNavigate={setActiveNav} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="px-6 py-4 bg-white border-b border-background-200 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground-950">Email Accounts</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-foreground-500">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</span>
              {syncedCount > 0 && <span className="text-xs text-emerald-600">{syncedCount} synced</span>}
              {errorCount > 0 && <span className="text-xs text-rose-600 font-medium">{errorCount} error{errorCount > 1 ? 's' : ''}</span>}
              {totalEmails > 0 && <span className="text-xs text-foreground-400">{totalEmails.toLocaleString()} emails total</span>}
            </div>
          </div>
          <button onClick={refresh} className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-background-100 transition-colors cursor-pointer" title="Refresh">
            <i className={`ri-refresh-line text-base ${isLoading ? 'animate-spin' : ''}`}></i>
          </button>
          {accounts.length > 1 && (
            <button
              onClick={handleSyncAll}
              disabled={syncingIds.size > 0}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-background-200 text-sm font-medium text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <i className={`${syncingIds.size > 0 ? 'ri-loader-4-line animate-spin' : 'ri-refresh-line'} text-sm`}></i>
              Sync All
            </button>
          )}
          <button
            onClick={() => { setAddError(null); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-add-line text-base"></i>
            Add Account
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">

            {isLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-2 text-sm text-foreground-400">
                  <i className="ri-loader-4-line animate-spin text-lg"></i>
                  Loading accounts...
                </div>
              </div>
            )}

            {error && !isLoading && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3">
                <i className="ri-error-warning-line text-rose-500 text-lg shrink-0"></i>
                <div className="flex-1">
                  <p className="text-sm text-rose-700 font-medium">Failed to load accounts</p>
                  <p className="text-xs text-rose-500 mt-0.5">{error}</p>
                </div>
                <button onClick={refresh} className="text-xs text-rose-600 font-medium cursor-pointer whitespace-nowrap">Retry</button>
              </div>
            )}

            {!isLoading && !error && accounts.length === 0 && (
              <div className="py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-background-100 flex items-center justify-center mx-auto mb-4">
                  <i className="ri-mail-add-line text-3xl text-foreground-300"></i>
                </div>
                <h3 className="text-base font-semibold text-foreground-600 mb-1">No accounts connected</h3>
                <p className="text-sm text-foreground-400 mb-5">Connect your first email account to get started</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 cursor-pointer"
                >
                  <i className="ri-add-line"></i>
                  Connect Account
                </button>
              </div>
            )}

            {!isLoading && !error && accounts.length > 0 && (
              <>
                {/* Setup guide tip */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-primary-50 border border-primary-200">
                  <i className="ri-shield-keyhole-line text-primary-500 text-lg shrink-0 mt-0.5"></i>
                  <div>
                    <p className="text-sm font-medium text-primary-800">Gmail users: use an App Password</p>
                    <p className="text-xs text-primary-600 mt-0.5">
                      Google requires a 16-character App Password (not your regular password) for IMAP access.
                      Generate one at <span className="font-medium">myaccount.google.com/apppasswords</span>, then click "Update Password" on your account.
                    </p>
                  </div>
                </div>

                {accounts.map(account => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    emailCount={emailCounts[account.id] ?? 0}
                    isSyncing={syncingIds.has(account.id)}
                    syncError={syncErrors[account.id] ?? null}
                    onSync={() => handleSync(account)}
                    onDelete={() => handleDelete(account)}
                    onUpdatePassword={(pw) => handleUpdatePassword(account, pw)}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </main>

      {showAddModal && (
        <AddAccountModal
          isSaving={addSaving}
          error={addError}
          onSave={handleCreate}
          onClose={() => !addSaving && setShowAddModal(false)}
        />
      )}

      {toast && (
        <div
          onClick={() => setToast(null)}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium cursor-pointer ${
            toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
          }`}
        >
          <i className={`${toast.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'} text-base`}></i>
          <span className="max-w-sm">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
