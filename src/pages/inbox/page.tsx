import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FolderSidebar } from './components/FolderSidebar';
import { GmailTopBar } from './components/GmailTopBar';
import { EmailList } from './components/EmailList';
import { EmailDetail } from './components/EmailDetail';
import { ReplyModal } from './components/ReplyModal';
import { ComposeModal } from './components/ComposeModal';
import { useInbox, type InboxEmail } from '@/hooks/useInbox';

export default function Inbox() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [replyMode, setReplyMode] = useState<'reply' | 'replyAll' | 'forward' | null>(null);
  const [replyEmail, setReplyEmail] = useState<InboxEmail | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const {
    emails, sentEmails, accounts,
    selectedAccountId, setSelectedAccountId,
    selectedEmail, folder, filterTab, searchQuery,
    isLoading, error, isSending, sendError, sendSuccess,
    selectedIds,
    setFolder, setFilterTab, setSearchQuery,
    selectEmail, setSelectedEmail,
    toggleStar, moveToFolder, toggleSelect, selectAll,
    sendEmail, deleteEmail, deleteSentEmail, markAsRead,
    refresh,
  } = useInbox();

  const handleReply = (email: InboxEmail, mode: 'reply' | 'replyAll' | 'forward') => {
    setReplyEmail(email);
    setReplyMode(mode);
  };

  const handleSend = async (accountId: string, data: {
    to: string; cc?: string; bcc?: string; subject: string;
    bodyHtml: string; bodyText: string;
    inReplyTo?: string; references?: string; saveAsDraft?: boolean;
  }) => {
    await sendEmail(accountId, data);
  };

  useEffect(() => {
    if (sendSuccess) {
      const timer = setTimeout(() => {
        if (replyMode) { setReplyMode(null); setReplyEmail(null); }
        if (isComposeOpen && !sendSuccess.includes('Draft')) setIsComposeOpen(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [sendSuccess, replyMode, isComposeOpen]);

  useEffect(() => {
    const targetId = searchParams.get('emailId');
    if (!targetId || isLoading) return;
    const match = emails.find(e => e.id === targetId);
    if (match) { selectEmail(match); setSearchParams({}, { replace: true }); }
  }, [searchParams, emails, isLoading, selectEmail, setSearchParams]);

  const unreadCount   = emails.filter(e => !e.is_read).length;
  const sentCount     = sentEmails.filter(e => !e.is_draft).length;
  const draftCount    = sentEmails.filter(e => e.is_draft).length;
  const spamCount     = emails.filter(e => e.folder === 'Spam').length;
  const trashCount    = emails.filter(e => e.folder === 'Trash').length;
  const starredCount  = emails.filter(e => e.is_starred).length;
  const totalEmails   = emails.length + sentEmails.length;
  const storageBytes  = totalEmails * 1500;
  const storageUsed   = storageBytes < 1024 * 1024
    ? `${(storageBytes / 1024).toFixed(1)} KB`
    : `${(storageBytes / (1024 * 1024)).toFixed(2)} MB`;
  const storagePercent = (storageBytes / (1024 * 1024 * 1024)) * 100;

  return (
    <div className="h-screen flex flex-col bg-background-50 overflow-hidden">
      {/* Gmail-style top bar */}
      <GmailTopBar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(v => !v)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onAccountChange={setSelectedAccountId}
        onRefresh={refresh}
        isLoading={isLoading}
      />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible folder sidebar */}
        <FolderSidebar
          collapsed={sidebarCollapsed}
          activeFolder={folder}
          onFolderChange={(f) => { setFolder(f); setSelectedEmail(null); }}
          onCompose={() => setIsComposeOpen(true)}
          unreadCount={unreadCount}
          sentCount={sentCount}
          draftCount={draftCount}
          spamCount={spamCount}
          trashCount={trashCount}
          starredCount={starredCount}
          storageUsed={storageUsed}
          storageTotal="15 GB"
          storagePercent={storagePercent}
        />

        {/* Content card: list + detail */}
        <div className="flex flex-1 overflow-hidden m-2 ml-0 bg-white rounded-2xl border border-background-200 shadow-sm">
          {/* Email list panel */}
          <div className={`flex flex-col overflow-hidden border-r border-background-100 transition-all ${
            selectedEmail ? 'w-[420px] shrink-0' : 'flex-1'
          }`}>
            <EmailList
              emails={emails}
              sentEmails={sentEmails}
              selectedEmail={selectedEmail}
              filterTab={filterTab}
              searchQuery={searchQuery}
              isLoading={isLoading}
              error={error}
              selectedIds={selectedIds}
              folder={folder}
              isNarrow={!!selectedEmail}
              onSelectEmail={selectEmail}
              onFilterChange={setFilterTab}
              onSearchChange={setSearchQuery}
              onRefresh={refresh}
              onToggleSelect={toggleSelect}
              onSelectAll={selectAll}
              onToggleStar={toggleStar}
              onMoveToFolder={moveToFolder}
              onDeleteSent={deleteSentEmail}
            />
          </div>

          {/* Email detail panel */}
          {selectedEmail ? (
            <div className="flex-1 overflow-hidden">
              <EmailDetail
                email={selectedEmail}
                accounts={accounts}
                onReply={handleReply}
                onDelete={deleteEmail}
                onClose={() => setSelectedEmail(null)}
                onToggleStar={toggleStar}
                onMoveToFolder={moveToFolder}
                onMarkUnread={(id) => {
                  supabaseMarkUnread(id);
                  setSelectedEmail(null);
                }}
              />
            </div>
          ) : (
            <div className="flex-1 hidden lg:flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-20 h-20 rounded-full bg-background-100 flex items-center justify-center">
                <i className="ri-mail-open-line text-4xl text-foreground-300"></i>
              </div>
              <p className="text-sm font-medium text-foreground-500">Select an email to read</p>
              <p className="text-xs text-foreground-400">Nothing is selected</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ComposeModal
        isOpen={isComposeOpen}
        accounts={accounts}
        isSending={isSending}
        sendError={sendError}
        sendSuccess={sendSuccess}
        onSend={handleSend}
        onClose={() => setIsComposeOpen(false)}
      />

      {replyMode && replyEmail && (
        <ReplyModal
          mode={replyMode}
          originalEmail={replyEmail}
          accounts={accounts}
          isSending={isSending}
          sendError={sendError}
          sendSuccess={sendSuccess}
          onSend={handleSend}
          onClose={() => { setReplyMode(null); setReplyEmail(null); }}
        />
      )}
    </div>
  );
}

// mark email unread directly (used in detail action)
async function supabaseMarkUnread(emailId: string) {
  const { supabase } = await import('@/lib/supabase');
  await supabase.from('emails').update({ is_read: false }).eq('id', emailId);
}
