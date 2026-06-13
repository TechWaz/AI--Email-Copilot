import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/feature/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { usePreferences } from '@/contexts/PreferencesContext';

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-background-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-background-100 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center">
          <i className={`${icon} text-primary-500 text-sm`}></i>
        </div>
        <h2 className="text-sm font-semibold text-foreground-950">{title}</h2>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

// ─── Row components ───────────────────────────────────────────────────────────

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground-800">{label}</p>
        {description && <p className="text-xs text-foreground-400 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1 ${
        checked ? 'bg-primary-500' : 'bg-foreground-300'
      }`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
    </button>
  );
}

// ─── Nav tabs ─────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'security' | 'preferences' | 'about';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'profile', label: 'Profile', icon: 'ri-user-3-line' },
  { id: 'security', label: 'Security', icon: 'ri-shield-keyhole-line' },
  { id: 'preferences', label: 'Preferences', icon: 'ri-settings-4-line' },
  { id: 'about', label: 'About', icon: 'ri-information-line' },
];

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name ?? profile?.email?.split('@')[0] ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const initial = (profile?.email || user?.email || 'U').charAt(0).toUpperCase();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ data: { display_name: displayName.trim() } });
      if (error) throw error;
      setSaveMsg({ type: 'success', text: 'Display name updated' });
    } catch (err) {
      setSaveMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  };

  return (
    <div className="space-y-4">
      <Section title="Your Profile" icon="ri-user-3-line">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-accent-500 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-white">{initial}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground-950">{displayName || (profile?.email || user?.email || 'User')}</p>
            <p className="text-xs text-foreground-400 mt-0.5">{profile?.email || user?.email}</p>
            <p className="text-xs text-foreground-400 mt-0.5 capitalize">{profile?.role === 'admin' ? 'Administrator' : 'User'} account</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-3 pt-1">
          {saveMsg && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-xs ${
              saveMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-rose-50 border border-rose-200 text-rose-700'
            }`}>
              <i className={`${saveMsg.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'} text-sm`}></i>
              {saveMsg.text}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-foreground-700 mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-700 mb-1.5">Email Address</label>
            <input
              type="email"
              value={profile?.email || user?.email || ''}
              readOnly
              className="w-full px-3 py-2 rounded-lg border border-background-100 text-sm text-foreground-400 bg-background-50 cursor-not-allowed"
            />
            <p className="text-xs text-foreground-400 mt-1">Email cannot be changed here</p>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-40 cursor-pointer flex items-center gap-2"
            >
              {isSaving && <i className="ri-loader-4-line animate-spin text-sm"></i>}
              Save Changes
            </button>
          </div>
        </form>
      </Section>

      <Section title="Account Actions" icon="ri-logout-box-r-line">
        <SettingRow label="Manage Email Accounts" description="Add, remove, or sync your connected email accounts">
          <button
            onClick={() => navigate('/accounts')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-background-200 text-xs font-medium text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer"
          >
            <i className="ri-mail-settings-line text-sm"></i>
            Manage
          </button>
        </SettingRow>
        <div className="border-t border-background-100 pt-4">
          <SettingRow label="Sign Out" description="Sign out of your account on this device">
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <i className="ri-logout-box-r-line text-sm"></i>
              Sign Out
            </button>
          </SettingRow>
        </div>
      </Section>
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const { user } = useAuth();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.next !== form.confirm) {
      setMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (form.next.length < 8) {
      setMsg({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }
    setIsSaving(true);
    setMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: form.next });
      if (error) throw error;
      setMsg({ type: 'success', text: 'Password updated successfully' });
      setForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update password' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMsg(null), 5000);
    }
  };

  const handleSendReset = async () => {
    if (!user?.email) return;
    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to send reset email' });
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="space-y-4">
      <Section title="Change Password" icon="ri-lock-password-line">
        <form onSubmit={handleChangePassword} className="space-y-3">
          {msg && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-xs ${
              msg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-rose-50 border border-rose-200 text-rose-700'
            }`}>
              <i className={`${msg.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'} text-sm`}></i>
              {msg.text}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-foreground-700 mb-1.5">New Password</label>
            <input
              type="password"
              value={form.next}
              onChange={e => setForm(f => ({ ...f, next: e.target.value }))}
              placeholder="Min. 8 characters"
              className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-700 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="Repeat new password"
              className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving || !form.next || !form.confirm}
              className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-40 cursor-pointer flex items-center gap-2"
            >
              {isSaving && <i className="ri-loader-4-line animate-spin text-sm"></i>}
              Update Password
            </button>
          </div>
        </form>
      </Section>

      <Section title="Password Reset via Email" icon="ri-mail-lock-line">
        <p className="text-sm text-foreground-600">
          Forgot your password or prefer to reset it by email? We'll send a reset link to <strong>{user?.email}</strong>.
        </p>
        {resetSent ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
            <i className="ri-check-line text-sm"></i>
            Password reset email sent — check your inbox
          </div>
        ) : (
          <button
            onClick={handleSendReset}
            disabled={isSendingReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-background-200 text-sm font-medium text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-40"
          >
            {isSendingReset && <i className="ri-loader-4-line animate-spin text-sm"></i>}
            Send Reset Email
          </button>
        )}
      </Section>

      <Section title="Session & Privacy" icon="ri-shield-check-line">
        <SettingRow
          label="Current Session"
          description={`Signed in as ${user?.email}`}
        >
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <i className="ri-checkbox-circle-line text-sm"></i>
            Active
          </span>
        </SettingRow>
        <div className="border-t border-background-100 pt-4">
          <SettingRow label="Data Storage" description="Your emails are stored securely in Supabase with row-level security">
            <span className="text-xs text-foreground-400 flex items-center gap-1">
              <i className="ri-database-2-line text-sm text-foreground-400"></i>
              Encrypted
            </span>
          </SettingRow>
        </div>
      </Section>
    </div>
  );
}

// ─── Preferences Tab ──────────────────────────────────────────────────────────

function PreferencesTab() {
  const { prefs, updatePref: ctxUpdatePref } = usePreferences();
  const [saved, setSaved] = useState(false);

  const updatePref = async <K extends keyof typeof prefs>(key: K, value: (typeof prefs)[K]) => {
    await ctxUpdatePref(key, value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      {saved && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
          <i className="ri-check-line text-sm"></i>
          Preferences saved
        </div>
      )}

      <Section title="Display" icon="ri-layout-line">
        <SettingRow label="Email List Density" description="How compact the email list rows appear">
          <div className="flex items-center rounded-lg border border-background-200 overflow-hidden">
            {(['compact', 'comfortable'] as const).map(v => (
              <button
                key={v}
                onClick={() => updatePref('emailDensity', v)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer capitalize ${
                  prefs.emailDensity === v ? 'bg-primary-500 text-white' : 'bg-white text-foreground-600 hover:bg-background-50'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </SettingRow>

        <div className="border-t border-background-100 pt-4">
          <SettingRow label="Show AI Summary" description="Display AI-generated email summaries in the detail view">
            <Toggle checked={prefs.showAiSummary} onChange={v => updatePref('showAiSummary', v)} />
          </SettingRow>
        </div>

        <div className="border-t border-background-100 pt-4">
          <SettingRow label="Show Importance Score" description="Display the importance score badge on emails">
            <Toggle checked={prefs.showImportanceScore} onChange={v => updatePref('showImportanceScore', v)} />
          </SettingRow>
        </div>
      </Section>

      <Section title="Behavior" icon="ri-settings-3-line">
        <SettingRow label="Auto-mark as Read" description="Automatically mark emails as read when you open them">
          <Toggle checked={prefs.autoMarkRead} onChange={v => updatePref('autoMarkRead', v)} />
        </SettingRow>

        <div className="border-t border-background-100 pt-4">
          <SettingRow label="Emails per Page" description="How many emails to load at once (requires refresh)">
            <select
              value={prefs.emailsPerPage}
              onChange={e => updatePref('emailsPerPage', parseInt(e.target.value))}
              className="px-3 py-1.5 rounded-lg border border-background-200 text-xs font-medium text-foreground-700 focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer bg-white"
            >
              {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n} emails</option>)}
            </select>
          </SettingRow>
        </div>

        <div className="border-t border-background-100 pt-4">
          <SettingRow label="Default Folder" description="Which folder to open first in the Inbox">
            <select
              value={prefs.defaultFolder}
              onChange={e => updatePref('defaultFolder', e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-background-200 text-xs font-medium text-foreground-700 focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer bg-white"
            >
              {['Inbox', 'Starred', 'Sent'].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </SettingRow>
        </div>
      </Section>

      <Section title="Sync" icon="ri-refresh-line">
        <SettingRow label="Email Sync" description="Emails are synced on demand when you click Sync in the Accounts page or Dashboard">
          <span className="text-xs text-foreground-400">Manual</span>
        </SettingRow>
        <div className="border-t border-background-100 pt-4">
          <SettingRow label="Scan Window" description="Emails scanned per sync run">
            <span className="text-xs text-foreground-500 font-medium">Last 500 headers · 100 bodies</span>
          </SettingRow>
        </div>
      </Section>
    </div>
  );
}

// ─── About Tab ────────────────────────────────────────────────────────────────

function AboutTab() {
  return (
    <div className="space-y-4">
      <Section title="AI Email Copilot" icon="ri-mail-ai-line">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center shrink-0">
            <i className="ri-mail-ai-line text-2xl text-white"></i>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground-950">AI Email Copilot</h3>
            <p className="text-xs text-foreground-400 mt-0.5">Version 1.0.0</p>
          </div>
        </div>
        <p className="text-sm text-foreground-600 leading-relaxed">
          AI Email Copilot connects your email accounts via IMAP/SMTP, syncs your messages, and provides AI-powered categorization, importance scoring, and reply drafting to help you stay on top of your inbox.
        </p>
      </Section>

      <Section title="Capabilities" icon="ri-sparkling-2-line">
        {[
          { icon: 'ri-mail-download-line', label: 'IMAP Email Sync', desc: 'Connects to Gmail, Outlook, Yahoo, and any custom IMAP server' },
          { icon: 'ri-send-plane-line', label: 'Send Emails', desc: 'Send, reply, and forward emails via SMTP directly from the app' },
          { icon: 'ri-price-tag-3-line', label: 'Smart Categorization', desc: 'Automatically categorizes emails: Finance, Support, Marketing, and more' },
          { icon: 'ri-bar-chart-line', label: 'Importance Scoring', desc: 'Scores emails 1–10 so high-priority messages rise to the top' },
          { icon: 'ri-sparkling-line', label: 'AI Summaries', desc: 'Generates concise summaries so you can triage without opening every email' },
          { icon: 'ri-search-line', label: 'Global Search', desc: 'Search across all accounts, filter by category, date, and read status' },
        ].map(({ icon, label, desc }) => (
          <div key={label} className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
              <i className={`${icon} text-primary-500 text-sm`}></i>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground-800">{label}</p>
              <p className="text-xs text-foreground-400 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Technical Details" icon="ri-code-box-line">
        {[
          { label: 'Frontend', value: 'React + TypeScript + Tailwind CSS' },
          { label: 'Backend', value: 'Supabase (Postgres + Auth + Edge Functions)' },
          { label: 'Email Protocol', value: 'IMAP (incoming) · SMTP (outgoing)' },
          { label: 'Security', value: 'Row-level security · TLS/SSL connections' },
          { label: 'Icons', value: 'Remix Icon' },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-start justify-between gap-4">
            <span className="text-xs text-foreground-500">{label}</span>
            <span className="text-xs font-medium text-foreground-700 text-right">{value}</span>
          </div>
        ))}
      </Section>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('settings');
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  return (
    <div className="flex h-screen bg-background-50 overflow-hidden">
      <Sidebar
        activeItem={activeNav}
        onNavigate={(id) => {
          setActiveNav(id);
          if (id !== 'settings') navigate(`/${id}`);
        }}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="px-6 py-4 bg-white border-b border-background-200 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground-950">Settings</h1>
            <p className="text-xs text-foreground-400 mt-0.5">Manage your profile, security, and app preferences</p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left tab nav */}
          <div className="w-48 shrink-0 bg-white border-r border-background-200 py-4">
            <nav className="px-3 space-y-0.5">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-primary-500/10 text-primary-600 font-medium'
                      : 'text-foreground-600 hover:bg-background-100 hover:text-foreground-900'
                  }`}
                >
                  <i className={`${tab.icon} text-base w-4 flex items-center justify-center`}></i>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto p-4 md:p-6">
              {activeTab === 'profile' && <ProfileTab />}
              {activeTab === 'security' && <SecurityTab />}
              {activeTab === 'preferences' && <PreferencesTab />}
              {activeTab === 'about' && <AboutTab />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
