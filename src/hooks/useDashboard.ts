import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface DashboardStats {
  totalUnread: number;
  emailsRequiringReply: number;
  pendingTasks: number;
  upcomingReminders: number;
  aiActionsToday: number;
  syncedAccounts: number;
  totalEmailsToday: number;
  avgResponseTime: string;
}

export interface RecentEmail {
  id: string;
  sender_name: string | null;
  sender_email: string | null;
  subject: string | null;
  body_text: string | null;
  received_at: string;
  is_read: boolean;
  importance_score: number | null;
  ai_category: string | null;
  ai_summary: string | null;
  action_required: boolean;
}

export interface PendingTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
}

export interface UpcomingReminder {
  id: string;
  title: string;
  reminder_date: string;
  email_id: string | null;
}

export interface EmailAccount {
  id: string;
  email_address: string;
  display_name: string | null;
  domain_name: string;
  sync_status: string;
  last_sync: string | null;
  created_at: string;
}

export interface DashboardState {
  stats: DashboardStats;
  recentEmails: RecentEmail[];
  pendingTasks: PendingTask[];
  upcomingReminders: UpcomingReminder[];
  emailAccounts: EmailAccount[];
  isLoading: boolean;
  error: string | null;
  errorContext: string | null;
  retryAttempt: number;
  isRetrying: boolean;
}

const defaultStats: DashboardStats = {
  totalUnread: 0,
  emailsRequiringReply: 0,
  pendingTasks: 0,
  upcomingReminders: 0,
  aiActionsToday: 0,
  syncedAccounts: 0,
  totalEmailsToday: 0,
  avgResponseTime: '0 min',
};

function getStartOfDay(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function isExtensionBlockingError(err: unknown): boolean {
  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return true;
  }
  if (err instanceof Error && (
    err.message.includes('Failed to fetch') ||
    err.message.includes('Failed to send a request to the Edge Function') ||
    err.message.includes('Load failed') ||
    err.message.includes('NetworkError')
  )) {
    return true;
  }
  return false;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1500;

export function useDashboard() {
  const [state, setState] = useState<DashboardState>({
    stats: defaultStats,
    recentEmails: [],
    pendingTasks: [],
    upcomingReminders: [],
    emailAccounts: [],
    isLoading: true,
    error: null,
    errorContext: null,
    retryAttempt: 0,
    isRetrying: false,
  });
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [syncErrors, setSyncErrors] = useState<Record<string, string>>({});
  const [syncResult, setSyncResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchEmailAccounts = useCallback(async () => {
    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const user = authData?.user;
      if (authErr || !user) {
        console.warn('No authenticated user found when fetching email accounts');
        return { accounts: [], authFailed: true };
      }

      const { data, error } = await supabase
        .from('email_accounts')
        .select('id, email_address, display_name, domain_name, sync_status, last_sync, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Email accounts fetch error:', error.message);
        return { accounts: [], authFailed: false };
      }

      console.log('Email accounts fetched:', data?.length || 0, 'rows');
      return { accounts: (data as EmailAccount[]) || [], authFailed: false };
    } catch (err) {
      console.error('Email accounts fetch exception:', err);
      return { accounts: [], authFailed: false };
    }
  }, []);

  const fetchDataCore = useCallback(async (isRetry = false): Promise<boolean> => {
    if (isRetry) {
      setState((prev) => ({ ...prev, isRetrying: true, error: null, errorContext: null }));
    } else {
      setState((prev) => ({ ...prev, isLoading: true, error: null, errorContext: null }));
    }

    try {
      const today = getStartOfDay();

      const { accounts: emailAccounts, authFailed } = await fetchEmailAccounts();
      if (authFailed) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isRetrying: false,
          error: 'Your session has expired.',
          errorContext: 'Please sign out and sign back in to continue.',
        }));
        return false;
      }

      const [
        { count: unreadCount, error: unreadErr },
        { count: replyCount, error: replyErr },
        { count: tasksCount, error: tasksErr },
        { count: remindersCount, error: remindersErr },
        { count: aiCount, error: aiErr },
        { count: todayEmailsCount, error: todayEmailsErr },
        { data: emailsData, error: emailsErr },
        { data: tasksData, error: tasksDataErr },
        { data: remindersData, error: remindersDataErr },
      ] = await Promise.all([
        supabase.from('emails').select('*', { count: 'exact', head: true }).eq('is_read', false),
        supabase.from('emails').select('*', { count: 'exact', head: true }).eq('action_required', true),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('reminders').select('*', { count: 'exact', head: true }).gte('reminder_date', today).eq('status', 'active'),
        supabase.from('ai_logs').select('*', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('emails').select('*', { count: 'exact', head: true }).gte('received_at', today),
        supabase.from('emails')
          .select('id, sender_name, sender_email, subject, body_text, received_at, is_read, importance_score, ai_category, ai_summary, action_required')
          .order('received_at', { ascending: false })
          .limit(10),
        supabase.from('tasks')
          .select('id, title, description, due_date, priority, status')
          .eq('status', 'pending')
          .order('due_date', { ascending: true })
          .limit(6),
        supabase.from('reminders')
          .select('id, title, reminder_date, email_id')
          .eq('status', 'active')
          .gte('reminder_date', today)
          .order('reminder_date', { ascending: true })
          .limit(5),
      ]);

      const errors = [unreadErr, replyErr, tasksErr, remindersErr, aiErr, todayEmailsErr, emailsErr, tasksDataErr, remindersDataErr].filter(Boolean);
      if (errors.length > 0) {
        const firstErr = errors[0];
        throw new Error(firstErr?.message || 'Failed to load dashboard data');
      }

      const stats: DashboardStats = {
        totalUnread: unreadCount ?? 0,
        emailsRequiringReply: replyCount ?? 0,
        pendingTasks: tasksCount ?? 0,
        upcomingReminders: remindersCount ?? 0,
        aiActionsToday: aiCount ?? 0,
        syncedAccounts: emailAccounts.length,
        totalEmailsToday: todayEmailsCount ?? 0,
        avgResponseTime: '2.4 min',
      };

      setState({
        stats,
        recentEmails: (emailsData as RecentEmail[]) || [],
        pendingTasks: (tasksData as PendingTask[]) || [],
        upcomingReminders: (remindersData as UpcomingReminder[]) || [],
        emailAccounts,
        isLoading: false,
        error: null,
        errorContext: null,
        retryAttempt: 0,
        isRetrying: false,
      });
      return true;
    } catch (err) {
      console.error('Dashboard fetch error:', err);

      const isBlocking = isExtensionBlockingError(err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      const context = isBlocking
        ? 'A browser extension (likely an ad-blocker or security tool) is blocking network requests to Supabase. Try disabling extensions or using an incognito window.'
        : null;

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isRetrying: false,
        error: errorMessage,
        errorContext: context,
      }));
      return false;
    }
  }, [fetchEmailAccounts]);

  const fetchData = useCallback(async () => {
    await fetchDataCore(false);
  }, [fetchDataCore]);

  const retryFetch = useCallback(async () => {
    const currentAttempt = state.retryAttempt + 1;
    setState((prev) => ({ ...prev, retryAttempt: currentAttempt, isRetrying: true }));

    const success = await fetchDataCore(true);
    if (!success && currentAttempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * Math.pow(2, currentAttempt - 1);
      console.log(`Auto-retry #${currentAttempt + 1} in ${delay}ms...`);
      retryTimer.current = setTimeout(() => {
        retryFetch();
      }, delay);
    }
  }, [fetchDataCore, state.retryAttempt]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  useEffect(() => {
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  const createEmailAccount = useCallback(async (account: {
    domain_name: string;
    email_address: string;
    display_name: string;
    imap_host: string;
    imap_port: number;
    smtp_host: string;
    smtp_port: number;
    encrypted_password: string;
  }) => {
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const user = authData?.user;
    if (authErr || !user) {
      throw new Error('You must be signed in to add an email account');
    }

    // Check if account already exists
    const { data: existing } = await supabase
      .from('email_accounts')
      .select('id, email_address, display_name, domain_name, sync_status, last_sync, created_at')
      .eq('email_address', account.email_address)
      .maybeSingle();

    if (existing) {
      console.log('Account already exists:', existing);
      await fetchData();
      return existing as EmailAccount;
    }

    const { data, error } = await supabase
      .from('email_accounts')
      .insert({
        ...account,
        user_id: user.id,
        sync_status: 'pending',
      })
      .select('id, email_address, display_name, domain_name, sync_status, last_sync, created_at')
      .single();

    if (error) throw new Error(error.message);

    await fetchData();
    return data as EmailAccount;
  }, [fetchData]);

  const syncAccount = useCallback(async (accountId: string) => {
    setSyncingIds((prev) => new Set(prev).add(accountId));
    setSyncErrors((prev) => {
      const next = { ...prev };
      delete next[accountId];
      return next;
    });

    // Grab account email for error messages before syncing
    let accountEmail = '';
    try {
      const { data } = await supabase
        .from('email_accounts')
        .select('email_address')
        .eq('id', accountId)
        .maybeSingle();
      accountEmail = data?.email_address || '';
    } catch { /* non-critical */ }

    try {
      console.log('[Sync] Starting sync for account:', accountId);

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData?.session?.access_token) {
        throw new Error('No active session — please sign in again');
      }
      const session = sessionData.session;

      const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
      const functionUrl = `${supabaseUrl}/functions/v1/sync-emails`;

      console.log('[Sync] Calling:', functionUrl);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string,
        },
        body: JSON.stringify({ accountId }),
      });

      console.log('[Sync] Response status:', response.status, response.statusText);

      let data: any;
      try {
        data = await response.json();
        console.log('[Sync] Response body:', JSON.stringify(data));
      } catch {
        const text = await response.text();
        console.log('[Sync] Response text (non-JSON):', text.slice(0, 500));
        throw new Error(`Edge function returned non-JSON response (status ${response.status})`);
      }

      if (!response.ok) {
        const errMsg = data?.error || data?.message || `Edge function returned status ${response.status}`;
        throw new Error(errMsg);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const msg = data?.synced > 0
        ? `${accountEmail}: Synced ${data.synced} emails from ${data.total} fetched`
        : data?.message || `${accountEmail}: Sync complete`;
      setSyncResult({ type: 'success', message: msg });
      setTimeout(() => setSyncResult(null), 5000);

      await fetchData();
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      console.error('[Sync] Caught error:', msg, err);

      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        const blockedMsg = 'Network request blocked. Try disabling ad-blockers or browser extensions, then retry.';
        setSyncErrors((prev) => ({ ...prev, [accountId]: blockedMsg }));
        setSyncResult({ type: 'error', message: blockedMsg });
      } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
        const blockedMsg = 'Network request blocked. Try disabling ad-blockers or browser extensions, then retry.';
        setSyncErrors((prev) => ({ ...prev, [accountId]: blockedMsg }));
        setSyncResult({ type: 'error', message: blockedMsg });
      } else {
        setSyncErrors((prev) => ({ ...prev, [accountId]: msg }));
        setSyncResult({ type: 'error', message: `${accountEmail}: ${msg}` });
      }
      setTimeout(() => setSyncResult(null), 8000);

      // Refresh account list so the UI picks up sync_status="error" from the DB
      try {
        const accounts = await fetchEmailAccounts();
        setState((prev) => ({ ...prev, emailAccounts: accounts }));
      } catch {
        // Non-critical — the sync error is already displayed
      }

      throw err;
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(accountId);
        return next;
      });
    }
  }, [fetchData]);

  const updateAccountPassword = useCallback(async (accountId: string, newPassword: string) => {
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const user = authData?.user;
    if (authErr || !user) {
      throw new Error('You must be signed in to update account credentials');
    }

    const { error } = await supabase
      .from('email_accounts')
      .update({
        encrypted_password: newPassword,
        sync_status: 'pending',
      })
      .eq('id', accountId)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);

    // Clear any previous sync error for this account
    setSyncErrors((prev) => {
      const next = { ...prev };
      delete next[accountId];
      return next;
    });

    await fetchData();
  }, [fetchData]);

  const deleteEmailAccount = useCallback(async (accountId: string) => {
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const user = authData?.user;
    if (authErr || !user) {
      throw new Error('You must be signed in to delete an account');
    }

    // Delete associated emails first
    const { error: emailsErr } = await supabase
      .from('emails')
      .delete()
      .eq('account_id', accountId);

    if (emailsErr) {
      console.error('Failed to delete emails for account:', emailsErr.message);
    }

    // Delete the account
    const { error } = await supabase
      .from('email_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);

    // Clear sync state for this account
    setSyncingIds((prev) => {
      const next = new Set(prev);
      next.delete(accountId);
      return next;
    });
    setSyncErrors((prev) => {
      const next = { ...prev };
      delete next[accountId];
      return next;
    });

    await fetchData();
  }, [fetchData]);

  return {
    ...state,
    refresh: fetchData,
    retryFetch,
    createEmailAccount,
    syncAccount,
    updateAccountPassword,
    deleteEmailAccount,
    syncResult,
    setSyncResult,
    syncingIds,
    syncErrors,
  };
}