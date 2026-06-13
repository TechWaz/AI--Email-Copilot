import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface EmailAccount {
  id: string;
  email_address: string;
  display_name: string | null;
  domain_name: string;
  imap_host: string;
  imap_port: number;
  smtp_host: string;
  smtp_port: number;
  sync_status: 'pending' | 'syncing' | 'synced' | 'error';
  last_sync: string | null;
  created_at: string;
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [emailCounts, setEmailCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [syncErrors, setSyncErrors] = useState<Record<string, string>>({});

  const fetchAccounts = useCallback(async () => {
    setError(null);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) { setError('Not authenticated'); setIsLoading(false); return; }

      const { data, error: err } = await supabase
        .from('email_accounts')
        .select('id, email_address, display_name, domain_name, imap_host, imap_port, smtp_host, smtp_port, sync_status, last_sync, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (err) throw new Error(err.message);
      const accts = (data as EmailAccount[]) || [];
      setAccounts(accts);

      // Load email counts per account
      if (accts.length > 0) {
        const ids = accts.map(a => a.id);
        const { data: emailRows } = await supabase
          .from('emails')
          .select('account_id')
          .in('account_id', ids);

        const counts: Record<string, number> = {};
        for (const id of ids) counts[id] = 0;
        for (const row of emailRows ?? []) {
          counts[(row as { account_id: string }).account_id] = (counts[(row as { account_id: string }).account_id] || 0) + 1;
        }
        setEmailCounts(counts);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchAccounts();
  }, [fetchAccounts]);

  const createAccount = useCallback(async (account: {
    domain_name: string;
    email_address: string;
    display_name: string;
    imap_host: string;
    imap_port: number;
    smtp_host: string;
    smtp_port: number;
    encrypted_password: string;
  }) => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) throw new Error('Not authenticated');

    const { data: existing } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('email_address', account.email_address)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) throw new Error(`${account.email_address} is already connected`);

    const { data, error: err } = await supabase
      .from('email_accounts')
      .insert({ ...account, user_id: user.id, sync_status: 'pending' })
      .select('id, email_address, display_name, domain_name, imap_host, imap_port, smtp_host, smtp_port, sync_status, last_sync, created_at')
      .single();

    if (err) throw new Error(err.message);
    setAccounts(prev => [data as EmailAccount, ...prev]);
    setEmailCounts(prev => ({ ...prev, [(data as EmailAccount).id]: 0 }));
    return data as EmailAccount;
  }, []);

  const syncAccount = useCallback(async (accountId: string): Promise<{ synced: number; total: number; message: string }> => {
    setSyncingIds(prev => new Set(prev).add(accountId));
    setSyncErrors(prev => { const n = { ...prev }; delete n[accountId]; return n; });

    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData?.session?.access_token) throw new Error('No active session');

      const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
      const response = await fetch(`${supabaseUrl}/functions/v1/sync-emails`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string,
        },
        body: JSON.stringify({ accountId }),
      });

      let data: any;
      try { data = await response.json(); } catch { throw new Error(`Sync failed (status ${response.status})`); }

      if (!response.ok) throw new Error(data?.error || `Sync failed (status ${response.status})`);
      if (data?.error) throw new Error(data.error);

      // Refresh account to get updated sync_status and last_sync
      const { data: updated } = await supabase
        .from('email_accounts')
        .select('id, email_address, display_name, domain_name, imap_host, imap_port, smtp_host, smtp_port, sync_status, last_sync, created_at')
        .eq('id', accountId)
        .single();

      if (updated) {
        setAccounts(prev => prev.map(a => a.id === accountId ? (updated as EmailAccount) : a));
      }

      // Refresh email count for this account
      const { data: emailRows } = await supabase.from('emails').select('account_id').eq('account_id', accountId);
      setEmailCounts(prev => ({ ...prev, [accountId]: emailRows?.length ?? 0 }));

      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setSyncErrors(prev => ({ ...prev, [accountId]: msg }));

      // Refresh account status from DB (it may have been set to 'error')
      try {
        const { data: updated } = await supabase
          .from('email_accounts')
          .select('id, email_address, display_name, domain_name, imap_host, imap_port, smtp_host, smtp_port, sync_status, last_sync, created_at')
          .eq('id', accountId)
          .single();
        if (updated) setAccounts(prev => prev.map(a => a.id === accountId ? (updated as EmailAccount) : a));
      } catch { /* non-critical */ }

      throw err;
    } finally {
      setSyncingIds(prev => { const n = new Set(prev); n.delete(accountId); return n; });
    }
  }, []);

  const updatePassword = useCallback(async (accountId: string, newPassword: string) => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) throw new Error('Not authenticated');

    const { error: err } = await supabase
      .from('email_accounts')
      .update({ encrypted_password: newPassword, sync_status: 'pending' })
      .eq('id', accountId)
      .eq('user_id', user.id);

    if (err) throw new Error(err.message);
    setSyncErrors(prev => { const n = { ...prev }; delete n[accountId]; return n; });
    setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, sync_status: 'pending' } : a));
  }, []);

  const deleteAccount = useCallback(async (accountId: string) => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) throw new Error('Not authenticated');

    // Delete associated emails first
    await supabase.from('emails').delete().eq('account_id', accountId);

    const { error: err } = await supabase
      .from('email_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', user.id);

    if (err) throw new Error(err.message);

    setAccounts(prev => prev.filter(a => a.id !== accountId));
    setSyncingIds(prev => { const n = new Set(prev); n.delete(accountId); return n; });
    setSyncErrors(prev => { const n = { ...prev }; delete n[accountId]; return n; });
    setEmailCounts(prev => { const n = { ...prev }; delete n[accountId]; return n; });
  }, []);

  return {
    accounts,
    emailCounts,
    isLoading,
    error,
    syncingIds,
    syncErrors,
    createAccount,
    syncAccount,
    updatePassword,
    deleteAccount,
    refresh: fetchAccounts,
  };
}
