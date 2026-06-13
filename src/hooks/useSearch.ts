import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { InboxEmail } from './useInbox';

export type DateFilter = 'all' | 'today' | 'week' | 'month';
export type ReadFilter = 'all' | 'unread' | 'read' | 'starred';
export type CategoryFilter = 'all' | 'Finance' | 'Scheduling' | 'Support' | 'Marketing' | 'Social' | 'Security' | 'Client' | 'General';

export interface SearchAccount {
  id: string;
  email_address: string;
  display_name: string | null;
}

export interface SearchFilters {
  accountId: string | null;
  category: CategoryFilter;
  dateRange: DateFilter;
  readStatus: ReadFilter;
}

const DEFAULT_FILTERS: SearchFilters = {
  accountId: null,
  category: 'all',
  dateRange: 'all',
  readStatus: 'all',
};

export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<InboxEmail[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [accounts, setAccounts] = useState<SearchAccount[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<InboxEmail | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) return;
      supabase
        .from('email_accounts')
        .select('id, email_address, display_name')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: true })
        .then(({ data: accts }) => {
          if (accts) setAccounts(accts as SearchAccount[]);
        });
    });
  }, []);

  const runSearch = useCallback(async (q: string, f: SearchFilters) => {
    setIsSearching(true);
    setError(null);
    setHasSearched(true);

    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const user = authData?.user;
      if (authErr || !user) { setError('Not authenticated'); return; }

      let dbq = supabase
        .from('emails')
        .select('*')
        .eq('user_id', user.id)
        .order('received_at', { ascending: false })
        .limit(300);

      if (f.accountId) dbq = dbq.eq('account_id', f.accountId);
      if (f.category !== 'all') dbq = dbq.eq('ai_category', f.category);
      if (f.readStatus === 'unread') dbq = dbq.eq('is_read', false);
      else if (f.readStatus === 'read') dbq = dbq.eq('is_read', true);
      else if (f.readStatus === 'starred') dbq = dbq.eq('is_starred', true);

      if (f.dateRange !== 'all') {
        const now = new Date();
        const from =
          f.dateRange === 'today' ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) :
          f.dateRange === 'week'  ? new Date(now.getTime() - 7 * 86400000) :
                                    new Date(now.getTime() - 30 * 86400000);
        dbq = dbq.gte('received_at', from.toISOString());
      }

      if (q.trim()) {
        const sq = q.trim();
        dbq = dbq.or(`subject.ilike.%${sq}%,body_text.ilike.%${sq}%,sender_name.ilike.%${sq}%,sender_email.ilike.%${sq}%`);
      }

      const { data, error: err } = await dbq;
      if (err) throw new Error(err.message);
      setResults((data as InboxEmail[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const markAsRead = useCallback(async (emailId: string) => {
    await supabase.from('emails').update({ is_read: true }).eq('id', emailId);
    setResults(prev => prev.map(e => e.id === emailId ? { ...e, is_read: true } : e));
    setSelectedEmail(prev => prev?.id === emailId ? { ...prev, is_read: true } : prev);
  }, []);

  const toggleStar = useCallback(async (emailId: string, current: boolean) => {
    await supabase.from('emails').update({ is_starred: !current }).eq('id', emailId);
    setResults(prev => prev.map(e => e.id === emailId ? { ...e, is_starred: !current } : e));
    setSelectedEmail(prev => prev?.id === emailId ? { ...prev, is_starred: !current } : prev);
  }, []);

  const selectEmail = useCallback((email: InboxEmail) => {
    setSelectedEmail(email);
    if (!email.is_read) markAsRead(email.id);
  }, [markAsRead]);

  return {
    query, setQuery,
    results,
    isSearching,
    hasSearched,
    error,
    filters, setFilters,
    accounts,
    selectedEmail, setSelectedEmail,
    selectEmail,
    toggleStar,
    runSearch,
  };
}
