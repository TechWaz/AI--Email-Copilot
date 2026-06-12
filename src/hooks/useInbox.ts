import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface InboxEmail {
  id: string;
  account_id: string;
  user_id: string;
  message_id: string;
  thread_id: string | null;
  sender_name: string | null;
  sender_email: string | null;
  recipient_email: string | null;
  cc: string | null;
  bcc: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  attachments: any | null;
  received_at: string;
  is_read: boolean;
  is_starred: boolean;
  folder: string;
  importance_score: number | null;
  ai_summary: string | null;
  ai_category: string | null;
  ai_reply_draft: string | null;
  action_required: boolean;
  reminder_date: string | null;
  created_at: string;
}

export interface SentEmail {
  id: string;
  account_id: string;
  to_recipients: string;
  cc: string | null;
  bcc: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  sent_at: string;
  is_draft: boolean;
  created_at: string;
}

export interface EmailAccountBrief {
  id: string;
  email_address: string;
  display_name: string | null;
  domain_name: string;
  smtp_host: string;
  smtp_port: number;
  encrypted_password: string;
}

export type FolderFilter = 'Inbox' | 'Sent' | 'Drafts' | 'Spam' | 'Trash' | 'Starred';
export type FilterTab = 'all' | 'unread' | 'read' | 'starred';

export function useInbox() {
  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [accounts, setAccounts] = useState<EmailAccountBrief[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<InboxEmail | null>(null);
  const [folder, setFolder] = useState<FolderFilter>('Inbox');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchAccounts = useCallback(async () => {
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const user = authData?.user;
    if (authErr || !user) return [];

    const { data, error: err } = await supabase
      .from('email_accounts')
      .select('id, email_address, display_name, domain_name, smtp_host, smtp_port, encrypted_password')
      .eq('user_id', user.id)
      .eq('sync_status', 'synced');

    if (err) {
      console.error('Failed to fetch accounts:', err.message);
      return [];
    }

    return (data as EmailAccountBrief[]) || [];
  }, []);

  const fetchEmails = useCallback(async () => {
    setError(null);

    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const user = authData?.user;
      if (authErr || !user) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      if (folder === 'Sent' || folder === 'Drafts') {
        const { data, error: err } = await supabase
          .from('sent_emails')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_draft', folder === 'Drafts')
          .order('sent_at', { ascending: false })
          .limit(100);

        if (err) throw new Error(err.message);
        setSentEmails((data as SentEmail[]) || []);
        setEmails([]);
        setIsLoading(false);
        return;
      }

      let query = supabase
        .from('emails')
        .select('*')
        .eq('user_id', user.id)
        .order('received_at', { ascending: false })
        .limit(100);

      if (folder === 'Starred') {
        query = query.eq('is_starred', true);
      } else if (folder !== 'Inbox') {
        query = query.eq('folder', folder);
      } else {
        query = query.in('folder', ['Inbox', 'General']);
      }

      if (filterTab === 'unread') {
        query = query.eq('is_read', false);
      } else if (filterTab === 'read') {
        query = query.eq('is_read', true);
      } else if (filterTab === 'starred') {
        query = query.eq('is_starred', true);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        query = query.or(
          `subject.ilike.%${q}%,body_text.ilike.%${q}%,sender_name.ilike.%${q}%,sender_email.ilike.%${q}%`
        );
      }

      const { data, error: err } = await query;

      if (err) throw new Error(err.message);

      setEmails((data as InboxEmail[]) || []);
      setSentEmails([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load emails';
      console.error('Inbox fetch error:', msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [folder, filterTab, searchQuery]);

  useEffect(() => {
    setIsLoading(true);
    setSelectedIds(new Set());
    setSelectedEmail(null);
    fetchEmails();
  }, [fetchEmails]);

  useEffect(() => {
    fetchAccounts().then(setAccounts);
  }, []);

  const markAsRead = useCallback(async (emailId: string) => {
    const { error: err } = await supabase
      .from('emails')
      .update({ is_read: true })
      .eq('id', emailId);

    if (!err) {
      setEmails((prev) => prev.map((e) => (e.id === emailId ? { ...e, is_read: true } : e)));
      if (selectedEmail?.id === emailId) {
        setSelectedEmail((prev) => (prev ? { ...prev, is_read: true } : null));
      }
    }
  }, [selectedEmail]);

  const toggleStar = useCallback(async (emailId: string, current: boolean) => {
    const { error: err } = await supabase
      .from('emails')
      .update({ is_starred: !current })
      .eq('id', emailId);

    if (!err) {
      setEmails((prev) => prev.map((e) => (e.id === emailId ? { ...e, is_starred: !current } : e)));
      if (selectedEmail?.id === emailId) {
        setSelectedEmail((prev) => (prev ? { ...prev, is_starred: !current } : null));
      }
    }
  }, [selectedEmail]);

  const moveToFolder = useCallback(async (emailIds: string[], targetFolder: string) => {
    const { error: err } = await supabase
      .from('emails')
      .update({ folder: targetFolder })
      .in('id', emailIds);

    if (!err) {
      setEmails((prev) => prev.filter((e) => !emailIds.includes(e.id)));
      if (selectedEmail && emailIds.includes(selectedEmail.id)) {
        setSelectedEmail(null);
      }
      setSelectedIds(new Set());
    }
  }, [selectedEmail]);

  const selectEmail = useCallback((email: InboxEmail) => {
    setSelectedEmail(email);
    if (!email.is_read) {
      markAsRead(email.id);
    }
  }, [markAsRead]);

  const toggleSelect = useCallback((emailId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === emails.length) {
        return new Set();
      }
      return new Set(emails.map((e) => e.id));
    });
  }, [emails]);

  const sendEmail = useCallback(async (accountId: string, data: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    inReplyTo?: string;
    references?: string;
    saveAsDraft?: boolean;
  }) => {
    setIsSending(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      if (data.saveAsDraft) {
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        const user = authData?.user;
        if (authErr || !user) throw new Error('Not authenticated');

        const { error: err } = await supabase.from('sent_emails').insert({
          user_id: user.id,
          account_id: accountId,
          to_recipients: data.to,
          cc: data.cc || null,
          bcc: data.bcc || null,
          subject: data.subject,
          body_text: data.bodyText,
          body_html: data.bodyHtml,
          is_draft: true,
        });

        if (err) throw new Error(err.message);
        setSendSuccess('Draft saved');
        setTimeout(() => setSendSuccess(null), 3000);
        return;
      }

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData?.session?.access_token) throw new Error('No active session');
      const session = sessionData.session;

      const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string,
        },
        body: JSON.stringify({ accountId, ...data }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || `Send failed (status ${response.status})`);
      }

      // Save to sent_emails
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const user = authData?.user;
      if (user) {
        await supabase.from('sent_emails').insert({
          user_id: user.id,
          account_id: accountId,
          to_recipients: data.to,
          cc: data.cc || null,
          bcc: data.bcc || null,
          subject: data.subject,
          body_text: data.bodyText,
          body_html: data.bodyHtml,
          is_draft: false,
        });
      }

      setSendSuccess(result?.message || 'Email sent successfully');
      setTimeout(() => setSendSuccess(null), 4000);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send email';
      setSendError(msg);
      setTimeout(() => setSendError(null), 6000);
      throw err;
    } finally {
      setIsSending(false);
    }
  }, []);

  const sendReply = useCallback(async (accountId: string, data: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    inReplyTo?: string;
    references?: string;
  }) => {
    await sendEmail(accountId, { ...data, saveAsDraft: false });
  }, [sendEmail]);

  const deleteEmail = useCallback(async (emailId: string) => {
    const { error: err } = await supabase
      .from('emails')
      .delete()
      .eq('id', emailId);

    if (!err) {
      setEmails((prev) => prev.filter((e) => e.id !== emailId));
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
    }
  }, [selectedEmail]);

  const deleteSentEmail = useCallback(async (emailId: string) => {
    const { error: err } = await supabase
      .from('sent_emails')
      .delete()
      .eq('id', emailId);

    if (!err) {
      setSentEmails((prev) => prev.filter((e) => e.id !== emailId));
    }
  }, []);

  return {
    emails,
    sentEmails,
    accounts,
    selectedEmail,
    folder,
    filterTab,
    searchQuery,
    isLoading,
    error,
    isSending,
    sendError,
    sendSuccess,
    selectedIds,
    setFolder,
    setFilterTab,
    setSearchQuery,
    selectEmail,
    setSelectedEmail,
    toggleStar,
    moveToFolder,
    toggleSelect,
    selectAll,
    sendEmail,
    sendReply,
    deleteEmail,
    deleteSentEmail,
    markAsRead,
    refresh: fetchEmails,
    refreshAccounts: () => fetchAccounts().then(setAccounts),
  };
}