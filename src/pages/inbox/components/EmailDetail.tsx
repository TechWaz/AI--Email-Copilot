import { useState } from 'react';
import type { InboxEmail, EmailAccountBrief } from '@/hooks/useInbox';
import { usePreferences } from '@/contexts/PreferencesContext';

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return '??';
}

interface EmailDetailProps {
  email: InboxEmail;
  accounts: EmailAccountBrief[];
  onReply: (email: InboxEmail, mode: 'reply' | 'replyAll' | 'forward') => void;
  onDelete: (emailId: string) => void;
  onClose: () => void;
  onToggleStar: (id: string, current: boolean) => void;
  onMoveToFolder: (id: string, folder: string) => void;
  onMarkUnread: (id: string) => void;
}

export function EmailDetail({
  email, accounts, onReply, onDelete, onClose,
  onToggleStar, onMoveToFolder, onMarkUnread,
}: EmailDetailProps) {
  const { prefs } = usePreferences();
  const [showHtml, setShowHtml] = useState(true);
  const [headerExpanded, setHeaderExpanded] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [replyBoxOpen, setReplyBoxOpen] = useState(false);

  const initials = getInitials(email.sender_name, email.sender_email);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-4 py-2 border-b border-background-100 shrink-0">
        {/* Back arrow */}
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full text-foreground-600 hover:bg-black/8 transition-colors cursor-pointer"
          title="Back to inbox"
        >
          <i className="ri-arrow-left-line text-xl"></i>
        </button>

        <div className="w-px h-5 bg-background-200 mx-1"></div>

        <ToolBtn icon="ri-archive-line"       title="Archive"        onClick={() => onMoveToFolder(email.id, 'Archive')} />
        <ToolBtn icon="ri-spam-2-line"        title="Report spam"    onClick={() => onMoveToFolder(email.id, 'Spam')} />
        <ToolBtn icon="ri-delete-bin-line"    title="Delete"         onClick={() => onDelete(email.id)} />
        <ToolBtn icon="ri-mail-unread-line"   title="Mark as unread" onClick={() => onMarkUnread(email.id)} />

        <div className="w-px h-5 bg-background-200 mx-1"></div>

        {/* Move to folder */}
        <div className="relative">
          <ToolBtn icon="ri-folder-transfer-line" title="Move to" onClick={() => setShowMoveMenu(v => !v)} />
          {showMoveMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-background-200 rounded-xl shadow-xl z-20 py-1 min-w-[150px]">
              {['Inbox', 'Spam', 'Trash'].map(f => (
                <button
                  key={f}
                  onClick={() => { onMoveToFolder(email.id, f); setShowMoveMenu(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-background-50 cursor-pointer ${f === 'Trash' ? 'text-rose-600' : 'text-foreground-700'}`}
                >
                  {f === 'Trash' ? 'Move to trash' : `Move to ${f}`}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          <ToolBtn
            icon={email.is_starred ? 'ri-star-fill' : 'ri-star-line'}
            title={email.is_starred ? 'Unstar' : 'Star'}
            onClick={() => onToggleStar(email.id, email.is_starred)}
            active={email.is_starred}
          />
          {email.body_html && (
            <button
              onClick={() => setShowHtml(v => !v)}
              className="px-3 py-1 rounded-full text-xs font-medium text-foreground-500 hover:bg-black/8 cursor-pointer transition-colors"
              title="Toggle HTML/text view"
            >
              {showHtml ? 'Plain text' : 'HTML'}
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl px-6 py-6">
          {/* Subject */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <h1 className="text-2xl font-normal text-foreground-950 leading-tight flex-1">
              {email.subject || '(No Subject)'}
            </h1>
            {prefs.showImportanceScore && email.importance_score !== null && email.importance_score >= 8 && (
              <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200 font-medium mt-1">
                High priority
              </span>
            )}
          </div>

          {/* Sender card */}
          <div className="flex items-start gap-3 mb-5">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-white">{initials}</span>
            </div>

            {/* Meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground-950">
                  {email.sender_name || email.sender_email || 'Unknown'}
                </span>
                {email.ai_category && email.ai_category !== 'General' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-background-100 text-foreground-500">
                    {email.ai_category}
                  </span>
                )}
                {email.action_required && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                    Action required
                  </span>
                )}
              </div>

              <button
                onClick={() => setHeaderExpanded(v => !v)}
                className="flex items-center gap-1 mt-0.5 cursor-pointer group"
              >
                {headerExpanded ? (
                  <div className="text-xs text-foreground-500 space-y-0.5 text-left">
                    <div><span className="text-foreground-400 w-6 inline-block">from</span> {email.sender_name ? `${email.sender_name} <${email.sender_email}>` : email.sender_email}</div>
                    {email.recipient_email && <div><span className="text-foreground-400 w-6 inline-block">to</span> {email.recipient_email}</div>}
                    {email.cc && <div><span className="text-foreground-400 w-6 inline-block">cc</span> {email.cc}</div>}
                    <div><span className="text-foreground-400 w-6 inline-block">date</span> {formatFullDate(email.received_at)}</div>
                  </div>
                ) : (
                  <p className="text-xs text-foreground-500 group-hover:text-foreground-700 transition-colors">
                    to {email.recipient_email || 'me'}
                    <i className="ri-arrow-down-s-line ml-1 text-foreground-400"></i>
                  </p>
                )}
              </button>
            </div>

            {/* Date + star */}
            <div className="flex items-center gap-2 shrink-0 mt-0.5">
              <span className="text-xs text-foreground-400 whitespace-nowrap">{formatShortDate(email.received_at)}</span>
              <button
                onClick={() => onToggleStar(email.id, email.is_starred)}
                className={`w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/8 cursor-pointer transition-colors ${
                  email.is_starred ? 'text-amber-400' : 'text-foreground-400 hover:text-amber-400'
                }`}
                title={email.is_starred ? 'Unstar' : 'Star'}
              >
                <i className={email.is_starred ? 'ri-star-fill text-lg' : 'ri-star-line text-lg'}></i>
              </button>
              <button
                onClick={() => onReply(email, 'reply')}
                className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-400 hover:bg-black/8 hover:text-foreground-600 cursor-pointer transition-colors"
                title="Reply"
              >
                <i className="ri-reply-line text-lg"></i>
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-400 hover:bg-black/8 hover:text-foreground-600 cursor-pointer transition-colors" title="More">
                <i className="ri-more-2-line text-lg"></i>
              </button>
            </div>
          </div>

          {/* AI Summary */}
          {prefs.showAiSummary && email.ai_summary && (
            <div className="mb-5 p-4 rounded-xl bg-primary-50 border border-primary-100">
              <div className="flex items-center gap-2 mb-1.5">
                <i className="ri-sparkling-2-line text-primary-500 text-sm"></i>
                <span className="text-xs font-semibold text-primary-700 uppercase tracking-wider">AI Summary</span>
              </div>
              <p className="text-sm text-primary-800 leading-relaxed">{email.ai_summary}</p>
            </div>
          )}

          {/* Body */}
          <div className="text-foreground-800">
            {email.body_html && showHtml ? (
              <div
                className="prose prose-sm max-w-none email-body"
                dangerouslySetInnerHTML={{ __html: email.body_html }}
              />
            ) : (
              <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                {email.body_text || 'This email has no content.'}
              </pre>
            )}
          </div>

          {/* Attachments */}
          {email.attachments && Array.isArray(email.attachments) && (email.attachments as any[]).length > 0 && (
            <div className="mt-6 pt-5 border-t border-background-100">
              <p className="text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-3">
                {(email.attachments as any[]).length} Attachment{(email.attachments as any[]).length > 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {(email.attachments as any[]).map((att: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background-50 border border-background-200 text-xs text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer">
                    <i className="ri-attachment-2 text-foreground-400"></i>
                    {att.filename || att.name || `Attachment ${idx + 1}`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Reply Draft */}
          {email.ai_reply_draft && (
            <div className="mt-6 pt-5 border-t border-background-100">
              <div className="flex items-center gap-2 mb-2">
                <i className="ri-magic-line text-primary-500 text-sm"></i>
                <span className="text-xs font-semibold text-primary-600">Suggested Reply</span>
              </div>
              <div className="p-4 rounded-xl bg-background-50 border border-background-200 text-sm text-foreground-700 leading-relaxed">
                {email.ai_reply_draft}
              </div>
              <button
                onClick={() => onReply(email, 'reply')}
                className="mt-2 text-xs text-primary-500 hover:text-primary-700 cursor-pointer font-medium"
              >
                Use this draft →
              </button>
            </div>
          )}
        </div>

        {/* Inline reply area (Gmail-style) */}
        <div className="max-w-3xl px-6 pb-8">
          {replyBoxOpen ? (
            <div className="rounded-2xl border border-background-200 shadow-md overflow-hidden">
              <div className="px-4 py-3 border-b border-background-100 bg-background-50 flex items-center gap-2">
                <span className="text-sm text-foreground-600">Reply to <strong>{email.sender_name || email.sender_email}</strong></span>
                <button onClick={() => setReplyBoxOpen(false)} className="ml-auto text-foreground-400 hover:text-foreground-600 cursor-pointer">
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>
              <div
                contentEditable
                suppressContentEditableWarning
                className="px-4 py-3 min-h-[100px] text-sm text-foreground-900 focus:outline-none"
                data-placeholder="Click here to reply..."
              />
              <div className="px-4 py-3 border-t border-background-100 flex items-center gap-2">
                <button
                  onClick={() => { onReply(email, 'reply'); setReplyBoxOpen(false); }}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 cursor-pointer transition-colors"
                >
                  <i className="ri-send-plane-fill text-sm"></i>
                  Send
                </button>
                <button onClick={() => setReplyBoxOpen(false)} className="px-4 py-2 rounded-full text-sm text-foreground-600 hover:bg-black/8 cursor-pointer transition-colors">
                  Discard
                </button>
              </div>
            </div>
          ) : (
            /* Reply / Forward chips */
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setReplyBoxOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-background-300 text-sm text-foreground-700 hover:bg-background-50 hover:border-foreground-400 transition-all cursor-pointer"
              >
                <i className="ri-reply-line text-base text-foreground-500"></i>
                Reply
              </button>
              <button
                onClick={() => onReply(email, 'replyAll')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-background-300 text-sm text-foreground-700 hover:bg-background-50 hover:border-foreground-400 transition-all cursor-pointer"
              >
                <i className="ri-reply-all-line text-base text-foreground-500"></i>
                Reply all
              </button>
              <button
                onClick={() => onReply(email, 'forward')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-background-300 text-sm text-foreground-700 hover:bg-background-50 hover:border-foreground-400 transition-all cursor-pointer"
              >
                <i className="ri-share-forward-line text-base text-foreground-500"></i>
                Forward
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ icon, title, onClick, active }: { icon: string; title: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
        active ? 'text-amber-400 hover:bg-amber-50' : 'text-foreground-600 hover:bg-black/8'
      }`}
    >
      <i className={`${icon} text-xl`}></i>
    </button>
  );
}
