import { useState, useEffect } from 'react';
import { FolderSidebar } from './components/FolderSidebar';
import { InboxTopBar } from './components/InboxTopBar';
import { EmailList } from './components/EmailList';
import { EmailDetail } from './components/EmailDetail';
import { ReplyModal } from './components/ReplyModal';
import { ComposeModal } from './components/ComposeModal';
import { useInbox, type InboxEmail } from '@/hooks/useInbox';

export default function Inbox() {
  const [replyMode, setReplyMode] = useState<'reply' | 'replyAll' | 'forward' | null>(null);
  const [replyEmail, setReplyEmail] = useState<InboxEmail | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const {
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
    refresh,
  } = useInbox();

  const handleReply = (email: InboxEmail, mode: 'reply' | 'replyAll' | 'forward') => {
    setReplyEmail(email);
    setReplyMode(mode);
  };

  const handleSend = async (accountId: string, data: {
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
    await sendEmail(accountId, data);
  };

  useEffect(() => {
    if (sendSuccess) {
      const timer = setTimeout(() => {
        if (replyMode) {
          setReplyMode(null);
          setReplyEmail(null);
        }
        if (isComposeOpen && !sendSuccess.includes('Draft')) {
          setIsComposeOpen(false);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [sendSuccess, replyMode, isComposeOpen]);

  const unreadCount = emails.filter((e) => !e.is_read).length;
  const sentCount = sentEmails.filter((e) => !e.is_draft).length;
  const draftCount = sentEmails.filter((e) => e.is_draft).length;
  const spamCount = emails.filter((e) => e.folder === 'Spam').length;
  const trashCount = emails.filter((e) => e.folder === 'Trash').length;
  const starredCount = emails.filter((e) => e.is_starred).length;

  const totalEmails = emails.length + sentEmails.length;
  const totalBytes = totalEmails * 1500;
  const storageUsed = totalBytes < 1024
    ? `${totalBytes.toFixed(0)} B`
    : totalBytes < 1024 * 1024
      ? `${(totalBytes / 1024).toFixed(1)} KB`
      : `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
  const storageTotal = '1 GB';
  const storagePercent = (totalBytes / (1024 * 1024 * 1024)) * 100;

  return (
    <div className="flex h-screen bg-background-50 overflow-hidden">
      {/* Folder Sidebar */}
      <FolderSidebar
        activeFolder={folder}
        onFolderChange={setFolder}
        onCompose={() => setIsComposeOpen(true)}
        emailCount={emails.length}
        unreadCount={unreadCount}
        sentCount={sentCount}
        draftCount={draftCount}
        spamCount={spamCount}
        trashCount={trashCount}
        starredCount={starredCount}
        storageUsed={storageUsed}
        storageTotal={storageTotal}
        storagePercent={storagePercent}
      />

      {/* Main area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <InboxTopBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        {/* Inbox content */}
        <div className="flex-1 flex overflow-hidden">
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
            onSelectEmail={selectEmail}
            onFilterChange={setFilterTab}
            onSearchChange={setSearchQuery}
            onRefresh={refresh}
            onToggleSelect={toggleSelect}
            onSelectAll={selectAll}
            onToggleStar={toggleStar}
            onMoveToFolder={moveToFolder}
          />

          {/* Detail pane */}
          <div className={`flex-1 flex-col hidden lg:flex ${selectedEmail ? '' : 'items-center justify-center'}`}>
            {selectedEmail ? (
              <EmailDetail
                email={selectedEmail}
                accounts={accounts}
                onReply={handleReply}
                onDelete={deleteEmail}
                onClose={() => setSelectedEmail(null)}
                onToggleStar={toggleStar}
                onMoveToFolder={moveToFolder}
              />
            ) : (
              <div className="text-center px-6">
                <div className="w-16 h-16 rounded-2xl bg-background-100 flex items-center justify-center mx-auto mb-4">
                  <i className="ri-mail-open-line text-3xl text-foreground-300"></i>
                </div>
                <h3 className="text-base font-semibold text-foreground-600 mb-1">No email selected</h3>
                <p className="text-sm text-foreground-400">Select an email from the list to read it here</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        accounts={accounts}
        isSending={isSending}
        sendError={sendError}
        sendSuccess={sendSuccess}
        onSend={handleSend}
        onClose={() => setIsComposeOpen(false)}
      />

      {/* Reply Modal */}
      {replyMode && replyEmail && (
        <ReplyModal
          mode={replyMode}
          originalEmail={replyEmail}
          accounts={accounts}
          isSending={isSending}
          sendError={sendError}
          sendSuccess={sendSuccess}
          onSend={handleSend}
          onClose={() => {
            setReplyMode(null);
            setReplyEmail(null);
          }}
        />
      )}
    </div>
  );
}