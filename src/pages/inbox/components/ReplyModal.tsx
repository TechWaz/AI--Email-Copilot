import { useState, useEffect } from 'react';
import type { InboxEmail, EmailAccountBrief } from '@/hooks/useInbox';
import { useAiDraft } from '@/hooks/useAiDraft';

interface ReplyModalProps {
  mode: 'reply' | 'replyAll' | 'forward';
  originalEmail: InboxEmail;
  accounts: EmailAccountBrief[];
  isSending: boolean;
  sendError: string | null;
  sendSuccess: string | null;
  onSend: (accountId: string, data: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    inReplyTo?: string;
    references?: string;
    saveAsDraft?: boolean;
  }) => Promise<any>;
  onClose: () => void;
}

export function ReplyModal({
  mode,
  originalEmail,
  accounts,
  isSending,
  sendError,
  sendSuccess,
  onSend,
  onClose,
}: ReplyModalProps) {
  const originalSender = originalEmail.sender_email || '';
  const account = accounts.find((a) => a.id === originalEmail.account_id);

  const [fromAccountId, setFromAccountId] = useState(originalEmail.account_id);
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const { generateDraft, isDrafting, draftError, setDraftError } = useAiDraft();

  useEffect(() => {
    if (mode === 'reply') {
      setTo(originalSender);
      setCc('');
      setBcc('');
      setSubject(`Re: ${originalEmail.subject || ''}`);
    } else if (mode === 'replyAll') {
      setTo(originalSender);
      const ccList = originalEmail.cc || '';
      setCc(ccList);
      setBcc('');
      setSubject(`Re: ${originalEmail.subject || ''}`);
    } else if (mode === 'forward') {
      setTo('');
      setCc('');
      setBcc('');
      setSubject(`Fwd: ${originalEmail.subject || ''}`);
    }
  }, [mode, originalEmail]);

  useEffect(() => {
    const quotedBody = (originalEmail.body_text || '')
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');

    const header = mode === 'forward'
      ? `\n\n---------- Forwarded message ----------\nFrom: ${originalEmail.sender_name || originalEmail.sender_email}\nDate: ${originalEmail.received_at}\nSubject: ${originalEmail.subject}\nTo: ${originalEmail.recipient_email || ''}\n\n${quotedBody}`
      : `\n\nOn ${new Date(originalEmail.received_at).toLocaleString()}, ${originalEmail.sender_name || originalEmail.sender_email} wrote:\n\n${quotedBody}`;

    setBody(header);
  }, [mode, originalEmail]);

  useEffect(() => {
    if (!mode) {
      setTo('');
      setCc('');
      setBcc('');
      setSubject('');
      setBody('');
      setLocalError(null);
      setAiPrompt('');
      setDraftError(null);
    }
  }, [mode, setDraftError]);

  const handleSubmit = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault();
    setLocalError(null);

    if (!to.trim()) {
      setLocalError('Please enter at least one recipient');
      return;
    }

    if (!fromAccountId) {
      setLocalError('Please select a sender account');
      return;
    }

    try {
      await onSend(fromAccountId, {
        to: to.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: subject.trim() || '(No Subject)',
        bodyHtml: body.replace(/\n/g, '<br/>'),
        bodyText: body,
        inReplyTo: mode !== 'forward' ? originalEmail.message_id : undefined,
        references: mode !== 'forward' ? (originalEmail.message_id || '') : undefined,
        saveAsDraft,
      });
      if (!saveAsDraft) {
        setTo('');
        setCc('');
        setBcc('');
        setSubject('');
        setBody('');
      }
    } catch {
      // Error is handled by the hook
    }
  };

  const handleAiDraft = async () => {
    if (!aiPrompt.trim()) return;
    const result = await generateDraft({
      emailSubject: originalEmail.subject || undefined,
      emailBody: originalEmail.body_text || undefined,
      senderName: originalEmail.sender_name || undefined,
      senderEmail: originalEmail.sender_email || undefined,
      recipientName: account?.display_name || undefined,
      recipientEmail: account?.email_address || undefined,
      action: aiPrompt,
      isReply: mode !== 'forward',
      isForward: mode === 'forward',
      tone: 'professional',
    });
    if (result.draft) {
      setBody(result.draft);
    }
    setAiPrompt('');
  };

  const title = mode === 'reply' ? 'Reply' : mode === 'replyAll' ? 'Reply All' : 'Forward';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-end justify-center sm:items-end sm:justify-end sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSending) onClose();
      }}
    >
      <div className="bg-white w-full sm:w-[600px] sm:rounded-xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[700px]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-background-200 flex items-center justify-between shrink-0 rounded-t-xl">
          <h3 className="text-sm font-semibold text-foreground-950">{title}</h3>
          <div className="flex items-center gap-1">
            <button className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors">
              <i className="ri-fullscreen-line text-sm"></i>
            </button>
            <button
              onClick={onClose}
              disabled={isSending}
              className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors disabled:opacity-50"
            >
              <i className="ri-close-line text-sm"></i>
            </button>
          </div>
        </div>

        {/* Success/Error messages */}
        {sendSuccess && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
            <i className="ri-check-line text-emerald-500 w-4 h-4 flex items-center justify-center"></i>
            {sendSuccess}
          </div>
        )}
        {sendError && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <i className="ri-error-warning-line text-rose-500 w-4 h-4 flex items-center justify-center"></i>
            {sendError}
          </div>
        )}
        {localError && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
            {localError}
          </div>
        )}
        {draftError && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-center gap-2">
            <i className="ri-error-warning-line text-amber-500 w-4 h-4 flex items-center justify-center"></i>
            {draftError}
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, false)} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {/* From */}
          <div className="flex items-center gap-2 border-b border-background-100 pb-2">
            <span className="text-xs text-foreground-400 w-12 shrink-0">From</span>
            {accounts.length > 1 ? (
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="flex-1 text-sm text-foreground-950 bg-transparent focus:outline-none cursor-pointer"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.email_address}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-foreground-900">{account?.email_address || 'No account'}</span>
            )}
          </div>

          {/* To */}
          <div className="flex items-center gap-2 border-b border-background-100 pb-2">
            <span className="text-xs text-foreground-400 w-12 shrink-0">To</span>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 text-sm text-foreground-950 bg-transparent focus:outline-none"
              placeholder="recipient@example.com"
            />
            <button
              type="button"
              onClick={() => setShowCcBcc(!showCcBcc)}
              className="text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer whitespace-nowrap"
            >
              Cc Bcc
            </button>
          </div>

          {/* CC + BCC */}
          {showCcBcc && (
            <>
              <div className="flex items-center gap-2 border-b border-background-100 pb-2">
                <span className="text-xs text-foreground-400 w-12 shrink-0">Cc</span>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="flex-1 text-sm text-foreground-950 bg-transparent focus:outline-none"
                  placeholder="Optional"
                />
              </div>
              <div className="flex items-center gap-2 border-b border-background-100 pb-2">
                <span className="text-xs text-foreground-400 w-12 shrink-0">Bcc</span>
                <input
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  className="flex-1 text-sm text-foreground-950 bg-transparent focus:outline-none"
                  placeholder="Optional"
                />
              </div>
            </>
          )}

          {/* Subject */}
          <div className="flex items-center gap-2 border-b border-background-100 pb-2">
            <span className="text-xs text-foreground-400 w-12 shrink-0">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 text-sm text-foreground-950 bg-transparent focus:outline-none"
              placeholder="Email subject"
            />
          </div>

          {/* Body */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full text-sm text-foreground-950 bg-transparent focus:outline-none resize-y"
            rows={10}
            placeholder="Write your message..."
          />

          {/* AI Draft assistant */}
          <div className="mt-3 pt-3 border-t border-background-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <i className="ri-sparkling-line text-primary-600 text-sm w-4 h-4 flex items-center justify-center"></i>
              </div>
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAiDraft();
                  }
                }}
                disabled={isDrafting}
                className="flex-1 text-sm text-foreground-700 bg-transparent focus:outline-none disabled:opacity-50"
                placeholder="Ask AI to draft a reply..."
              />
              <button
                type="button"
                onClick={handleAiDraft}
                disabled={isDrafting || !aiPrompt.trim()}
                className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDrafting ? (
                  <i className="ri-loader-4-line animate-spin text-sm"></i>
                ) : (
                  <i className="ri-arrow-right-line text-sm"></i>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-background-200 flex items-center gap-2 shrink-0 rounded-b-xl">
          <button
            type="submit"
            onClick={(e) => handleSubmit(e, false)}
            disabled={isSending || !to.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-sm font-medium text-white hover:bg-primary-600 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? (
              <>
                <i className="ri-loader-4-line animate-spin text-sm w-4 h-4 flex items-center justify-center"></i>
                Sending...
              </>
            ) : (
              <>
                <i className="ri-send-plane-line text-sm w-4 h-4 flex items-center justify-center"></i>
                Send
              </>
            )}
          </button>

          <button
            onClick={(e) => handleSubmit(e, true)}
            disabled={isSending}
            className="px-3 py-2 rounded-lg text-sm text-foreground-500 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            Save draft
          </button>

          <div className="flex-1"></div>

          <div className="flex items-center gap-1">
            <button className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors">
              <i className="ri-attachment-2 text-sm"></i>
            </button>
            <button className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors">
              <i className="ri-image-line text-sm"></i>
            </button>
            <button className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors">
              <i className="ri-link text-sm"></i>
            </button>
            <button className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors">
              <i className="ri-emotion-line text-sm"></i>
            </button>
          </div>

          <button
            onClick={() => {
              setTo('');
              setCc('');
              setBcc('');
              setSubject('');
              setBody('');
            }}
            disabled={isSending}
            className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-rose-500 hover:bg-rose-50 cursor-pointer transition-colors disabled:opacity-50"
          >
            <i className="ri-delete-bin-line text-sm"></i>
          </button>
        </div>
      </div>
    </div>
  );
}