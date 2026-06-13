import { useState } from 'react';
import type { InboxEmail, EmailAccountBrief } from '@/hooks/useInbox';
import { usePreferences } from '@/contexts/PreferencesContext';

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.split(' ');
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
}

export function EmailDetail({ email, onReply, onDelete, onClose, onToggleStar, onMoveToFolder }: EmailDetailProps) {
  const { prefs } = usePreferences();
  const [showOriginal, setShowOriginal] = useState(false);

  const displayHtml = email.body_html || null;
  const displayText = email.body_text || '';

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-white">
      {/* Header actions */}
      <div className="px-5 py-3 border-b border-background-200 flex items-center gap-2 shrink-0">
        <button
          onClick={onClose}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-foreground-500 hover:text-foreground-700 hover:bg-background-100 cursor-pointer transition-colors"
        >
          <i className="ri-arrow-left-line text-lg"></i>
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onReply(email, 'reply')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors whitespace-nowrap"
          >
            <i className="ri-reply-line text-sm w-4 h-4 flex items-center justify-center"></i>
            Reply
          </button>
          <button
            onClick={() => onReply(email, 'replyAll')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors whitespace-nowrap"
          >
            <i className="ri-reply-all-line text-sm w-4 h-4 flex items-center justify-center"></i>
            Reply All
          </button>
          <button
            onClick={() => onReply(email, 'forward')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors whitespace-nowrap"
          >
            <i className="ri-share-forward-line text-sm w-4 h-4 flex items-center justify-center"></i>
            Forward
          </button>
        </div>
        <div className="flex-1"></div>
        <button
          onClick={() => onToggleStar(email.id, email.is_starred)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-100 cursor-pointer transition-colors ${
            email.is_starred ? 'text-yellow-400' : 'text-foreground-400 hover:text-yellow-400'
          }`}
          title={email.is_starred ? 'Unstar' : 'Star'}
        >
          <i className={`${email.is_starred ? 'ri-star-fill' : 'ri-star-line'} text-base`}></i>
        </button>
        <div className="relative group">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors">
            <i className="ri-folder-transfer-line text-base"></i>
          </button>
          <div className="absolute right-0 top-full mt-1 bg-white border border-background-200 rounded-lg shadow-lg py-1 w-32 hidden group-hover:block z-20">
            <button
              onClick={() => onMoveToFolder(email.id, 'Inbox')}
              className="w-full text-left px-3 py-1.5 text-xs text-foreground-600 hover:bg-background-50 cursor-pointer"
            >
              Move to Inbox
            </button>
            <button
              onClick={() => onMoveToFolder(email.id, 'Spam')}
              className="w-full text-left px-3 py-1.5 text-xs text-foreground-600 hover:bg-background-50 cursor-pointer"
            >
              Move to Spam
            </button>
            <button
              onClick={() => onMoveToFolder(email.id, 'Trash')}
              className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 cursor-pointer"
            >
              Move to Trash
            </button>
          </div>
        </div>
        <button
          onClick={() => onDelete(email.id)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-rose-500 hover:bg-rose-50 cursor-pointer transition-colors"
        >
          <i className="ri-delete-bin-line text-base"></i>
        </button>
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-4">
          {/* Subject */}
          <h2 className="text-xl font-semibold text-foreground-950 mb-4">
            {email.subject || '(No Subject)'}
          </h2>

          {/* Sender info */}
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-secondary-500 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-white">
                {getInitials(email.sender_name, email.sender_email)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground-950">
                  {email.sender_name || email.sender_email || 'Unknown'}
                </span>
                {prefs.showImportanceScore && email.importance_score !== null && email.importance_score >= 8 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-200 font-medium">
                    High Priority
                  </span>
                )}
                {email.action_required && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-200 font-medium">
                    Action Required
                  </span>
                )}
              </div>
              <p className="text-xs text-foreground-500 mt-0.5">{email.sender_email}</p>
              {email.recipient_email && (
                <p className="text-xs text-foreground-400 mt-0.5">
                  <span className="text-foreground-500">to</span> {email.recipient_email}
                  {email.cc && <span className="ml-1"><span className="text-foreground-500">cc</span> {email.cc}</span>}
                </p>
              )}
            </div>
            <span className="text-xs text-foreground-400 whitespace-nowrap">
              {formatFullDate(email.received_at)}
            </span>
          </div>

          {/* Tags */}
          {(email.ai_category || (prefs.showImportanceScore && email.importance_score)) && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {email.ai_category && email.ai_category !== 'General' && (
                <span className="text-xs px-2 py-1 rounded-full bg-secondary-100 text-secondary-700 font-medium">
                  {email.ai_category}
                </span>
              )}
              {prefs.showImportanceScore && email.importance_score && (
                <span className="text-xs px-2 py-1 rounded-full bg-background-100 text-foreground-500">
                  Importance: {email.importance_score}/10
                </span>
              )}
            </div>
          )}

          {/* AI Summary */}
          {prefs.showAiSummary && email.ai_summary && (
            <div className="mb-4 p-3 rounded-lg bg-accent-50 border border-accent-200">
              <div className="flex items-center gap-1.5 mb-1">
                <i className="ri-robot-2-line text-accent-600 text-sm w-4 h-4 flex items-center justify-center"></i>
                <span className="text-xs font-semibold text-accent-700">AI Summary</span>
              </div>
              <p className="text-sm text-accent-800 leading-relaxed">{email.ai_summary}</p>
            </div>
          )}

          {/* Email body */}
          <div className="border-t border-background-200 pt-4">
            {displayHtml ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setShowOriginal(!showOriginal)}
                    className={`text-xs px-2 py-1 rounded-md cursor-pointer transition-colors whitespace-nowrap ${
                      showOriginal
                        ? 'bg-primary-500 text-white'
                        : 'bg-background-100 text-foreground-600 hover:bg-background-200'
                    }`}
                  >
                    {showOriginal ? 'Rendered' : 'HTML'}
                  </button>
                </div>
                {showOriginal ? (
                  <pre className="text-xs text-foreground-500 whitespace-pre-wrap font-mono bg-background-50 p-3 rounded-lg max-h-96 overflow-y-auto">
                    {displayHtml.slice(0, 5000)}
                  </pre>
                ) : (
                  <div
                    className="prose prose-sm max-w-none text-foreground-800"
                    dangerouslySetInnerHTML={{ __html: displayHtml }}
                  />
                )}
              </>
            ) : (
              <div className="text-sm text-foreground-700 whitespace-pre-wrap leading-relaxed">
                {displayText || 'This email has no content.'}
              </div>
            )}
          </div>

          {/* Attachments placeholder */}
          {email.attachments && Array.isArray(email.attachments) && (email.attachments as any[]).length > 0 && (
            <div className="mt-4 pt-4 border-t border-background-200">
              <h4 className="text-xs font-semibold text-foreground-600 mb-2">
                Attachments ({(email.attachments as any[]).length})
              </h4>
              <div className="flex items-center gap-2 flex-wrap">
                {(email.attachments as any[]).map((att: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-50 border border-background-200 text-xs text-foreground-600"
                  >
                    <i className="ri-attachment-2 text-sm w-4 h-4 flex items-center justify-center"></i>
                    {att.filename || att.name || `Attachment ${idx + 1}`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Reply Draft */}
          {email.ai_reply_draft && (
            <div className="mt-4 pt-4 border-t border-background-200">
              <div className="flex items-center gap-1.5 mb-2">
                <i className="ri-magic-line text-primary-500 text-sm w-4 h-4 flex items-center justify-center"></i>
                <span className="text-xs font-semibold text-primary-600">AI Reply Draft</span>
              </div>
              <p className="text-sm text-foreground-700 bg-primary-50 p-3 rounded-lg leading-relaxed">
                {email.ai_reply_draft}
              </p>
              <button
                onClick={() => onReply(email, 'reply')}
                className="mt-2 text-xs text-primary-500 hover:text-primary-600 cursor-pointer whitespace-nowrap"
              >
                Use this draft →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}