import { useState, useEffect, useRef, useCallback } from 'react';
import type { EmailAccountBrief } from '@/hooks/useInbox';
import { useAiDraft } from '@/hooks/useAiDraft';

const FONT_FAMILIES = [
  { label: 'Sans Serif', value: 'Arial, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Fixed width', value: '"Courier New", monospace' },
  { label: 'Wide', value: '"Arial Black", sans-serif' },
  { label: 'Narrow', value: '"Arial Narrow", sans-serif' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS", cursive' },
  { label: 'Garamond', value: 'Garamond, serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
];

const FONT_SIZES = [
  { label: 'Small', value: '10px' },
  { label: 'Normal', value: '13px' },
  { label: 'Large', value: '18px' },
  { label: 'Huge', value: '24px' },
];

const EMOJIS = [
  '😀','😂','😍','🥰','😎','🤔','😅','🙏','👍','❤️',
  '🔥','✨','🎉','💯','🚀','👋','🤝','💪','🎊','⭐',
  '😊','🥳','😴','🤣','😭','😤','🫡','🫶','💡','📌',
];

const TEXT_COLORS = [
  '#000000','#434343','#666666','#999999','#b7b7b7','#cccccc','#d9d9d9','#ffffff',
  '#ff0000','#ff9900','#ffff00','#00ff00','#00ffff','#0000ff','#9900ff','#ff00ff',
  '#e6b8a2','#f4cccc','#fce5cd','#fff2cc','#d9ead3','#d0e4f7','#cfe2f3','#e8d5f5',
];

interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  justifyLeft: boolean;
  justifyCenter: boolean;
  justifyRight: boolean;
  justifyFull: boolean;
  orderedList: boolean;
  unorderedList: boolean;
}

interface ComposeModalProps {
  isOpen: boolean;
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
    saveAsDraft?: boolean;
  }) => Promise<unknown>;
  onClose: () => void;
}

function ToolBtn({
  active,
  title,
  icon,
  onMouseDown,
}: {
  active?: boolean;
  title: string;
  icon: string;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={onMouseDown}
      className={`w-7 h-7 flex items-center justify-center rounded text-sm transition-colors cursor-pointer ${
        active
          ? 'bg-primary-100 text-primary-600'
          : 'text-foreground-500 hover:bg-background-100 hover:text-foreground-700'
      }`}
    >
      <i className={icon}></i>
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-background-200 mx-0.5 self-center shrink-0" />;
}

export function ComposeModal({
  isOpen,
  accounts,
  isSending,
  sendError,
  sendSuccess,
  onSend,
  onClose,
}: ComposeModalProps) {
  const [fromAccountId, setFromAccountId] = useState('');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [showFormatBar, setShowFormatBar] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [fmtState, setFmtState] = useState<FormatState>({
    bold: false, italic: false, underline: false, strikeThrough: false,
    justifyLeft: true, justifyCenter: false, justifyRight: false, justifyFull: false,
    orderedList: false, unorderedList: false,
  });
  const [imgOverlay, setImgOverlay] = useState<{ top: number; left: number; img: HTMLImageElement } | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const imgOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { generateDraft, isDrafting, draftError, setDraftError } = useAiDraft();

  useEffect(() => {
    if (accounts.length > 0 && !fromAccountId) {
      setFromAccountId(accounts[0].id);
    }
  }, [accounts, fromAccountId]);

  useEffect(() => {
    if (!isOpen) {
      setTo(''); setCc(''); setBcc(''); setIsMaximized(false); setShowCcBcc(false); setSubject('');
      setLocalError(null); setAiPrompt(''); setDraftError(null); setAttachments([]);
      setShowLinkInput(false); setLinkUrl(''); setShowEmojiPicker(false);
      setShowColorPicker(false); setShowFormatBar(false); setImgOverlay(null);
      if (imgOverlayTimerRef.current) clearTimeout(imgOverlayTimerRef.current);
      if (editorRef.current) editorRef.current.innerHTML = '';
    }
  }, [isOpen, setDraftError]);

  useEffect(() => {
    const updateFmt = () => {
      try {
        setFmtState({
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          strikeThrough: document.queryCommandState('strikeThrough'),
          justifyLeft: document.queryCommandState('justifyLeft'),
          justifyCenter: document.queryCommandState('justifyCenter'),
          justifyRight: document.queryCommandState('justifyRight'),
          justifyFull: document.queryCommandState('justifyFull'),
          orderedList: document.queryCommandState('insertOrderedList'),
          unorderedList: document.queryCommandState('insertUnorderedList'),
        });
      } catch { /* ignore */ }
    };
    document.addEventListener('selectionchange', updateFmt);
    return () => document.removeEventListener('selectionchange', updateFmt);
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const onMouseOver = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName !== 'IMG') return;
      if (imgOverlayTimerRef.current) clearTimeout(imgOverlayTimerRef.current);
      const img = e.target as HTMLImageElement;
      const rect = img.getBoundingClientRect();
      setImgOverlay({ top: rect.top, left: rect.right - 20, img });
    };

    const onMouseOut = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName !== 'IMG') return;
      imgOverlayTimerRef.current = setTimeout(() => setImgOverlay(null), 200);
    };

    editor.addEventListener('mouseover', onMouseOver);
    editor.addEventListener('mouseout', onMouseOut);
    return () => {
      editor.removeEventListener('mouseover', onMouseOver);
      editor.removeEventListener('mouseout', onMouseOut);
      if (imgOverlayTimerRef.current) clearTimeout(imgOverlayTimerRef.current);
    };
  }, []);

  const saveRange = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  }, []);

  const restoreRange = useCallback(() => {
    if (savedRangeRef.current && editorRef.current) {
      editorRef.current.focus();
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRangeRef.current);
    }
  }, []);

  const exec = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
  }, []);

  const applyFontSize = useCallback((px: string) => {
    document.execCommand('fontSize', false, '7');
    editorRef.current?.querySelectorAll('font[size="7"]').forEach(el => {
      const span = document.createElement('span');
      span.style.fontSize = px;
      span.innerHTML = (el as HTMLElement).innerHTML;
      el.parentNode?.replaceChild(span, el);
    });
  }, []);

  const getBodyHtml = () => editorRef.current?.innerHTML || '';
  const getBodyText = () => editorRef.current?.innerText || '';

  const readFileAsBase64 = (file: File): Promise<{ name: string; type: string; data: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const result = e.target?.result as string;
        resolve({ name: file.name, type: file.type || 'application/octet-stream', data: result.split(',')[1] ?? '' });
      };
      reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (e: React.MouseEvent, saveAsDraft = false) => {
    e.preventDefault();
    setLocalError(null);
    if (!to.trim()) { setLocalError('Please enter at least one recipient'); return; }
    if (!fromAccountId) { setLocalError('Please select a sender account'); return; }
    try {
      const attachmentData = attachments.length > 0
        ? await Promise.all(attachments.map(readFileAsBase64))
        : undefined;
      await onSend(fromAccountId, {
        to: to.trim(), cc: cc.trim() || undefined, bcc: bcc.trim() || undefined,
        subject: subject.trim() || '(No Subject)',
        bodyHtml: getBodyHtml(), bodyText: getBodyText(),
        saveAsDraft,
        attachments: attachmentData,
      } as Parameters<typeof onSend>[1]);
      if (!saveAsDraft) {
        setTo(''); setCc(''); setBcc(''); setSubject('');
        if (editorRef.current) editorRef.current.innerHTML = '';
        setAttachments([]);
      }
    } catch (err) {
      if (err instanceof Error) setLocalError(err.message);
    }
  };

  const handleAiDraft = async () => {
    if (!aiPrompt.trim()) return;
    const fromAccount = accounts.find(a => a.id === fromAccountId);
    const result = await generateDraft({
      emailSubject: subject,
      senderName: fromAccount?.display_name || undefined,
      senderEmail: fromAccount?.email_address || undefined,
      recipientEmail: to || undefined,
      action: aiPrompt,
      tone: 'professional',
    });
    if (result.draft && editorRef.current) {
      editorRef.current.innerHTML = result.draft.replace(/\n/g, '<br>');
    }
    setAiPrompt('');
  };

  const handleInsertLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    restoreRange();
    exec('createLink', url.startsWith('http') ? url : 'https://' + url);
    setShowLinkInput(false);
    setLinkUrl('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
      e.target.value = '';
    }
  };

  const handleImageInsert = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      editorRef.current?.focus();
      document.execCommand('insertImage', false, ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDiscard = () => {
    setTo(''); setCc(''); setBcc(''); setSubject('');
    if (editorRef.current) editorRef.current.innerHTML = '';
    setAttachments([]);
  };

  if (!isOpen) return null;

  const btnBase = 'w-8 h-8 flex items-center justify-center rounded text-sm transition-colors cursor-pointer';
  const btnDefault = `${btnBase} text-foreground-400 hover:text-foreground-600 hover:bg-background-100`;
  const btnActive = `${btnBase} bg-primary-100 text-primary-600`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-end justify-center sm:items-end sm:justify-end sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isSending) onClose(); }}
    >
      <div className={
        isMaximized
          ? 'bg-white w-full h-full sm:rounded-xl shadow-2xl flex flex-col sm:max-w-[1000px] sm:max-h-[90vh]'
          : 'bg-white w-full sm:w-[600px] sm:rounded-xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[700px]'
      }>
        {/* Header */}
        <div className="px-4 py-3 border-b border-background-200 flex items-center justify-between shrink-0 rounded-t-xl">
          <h3 className="text-sm font-semibold text-foreground-950">New message</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setIsMaximized(v => !v)}
              className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors"
            >
              <i className={isMaximized ? 'ri-fullscreen-exit-line text-sm' : 'ri-fullscreen-line text-sm'}></i>
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors disabled:opacity-50"
            >
              <i className="ri-close-line text-sm"></i>
            </button>
          </div>
        </div>

        {/* Status messages */}
        {sendSuccess && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2 shrink-0">
            <i className="ri-check-line text-emerald-500"></i>
            {sendSuccess}
          </div>
        )}
        {(sendError || localError || draftError) && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 shrink-0">
            <i className="ri-error-warning-line text-rose-500"></i>
            {sendError || localError || draftError}
          </div>
        )}

        {/* Scrollable fields + editor */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          {/* From */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-background-100 shrink-0">
            <span className="text-xs text-foreground-400 w-12 shrink-0">From</span>
            {accounts.length > 0 ? (
              <select
                value={fromAccountId}
                onChange={e => setFromAccountId(e.target.value)}
                className="flex-1 text-sm text-foreground-950 bg-transparent focus:outline-none cursor-pointer"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.email_address}</option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-rose-500">No email account connected</span>
            )}
          </div>

          {/* To */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-background-100 shrink-0">
            <span className="text-xs text-foreground-400 w-12 shrink-0">To</span>
            <input
              type="text"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="flex-1 text-sm text-foreground-950 bg-transparent focus:outline-none"
              placeholder="recipient@example.com"
            />
            <button
              type="button"
              onClick={() => setShowCcBcc(v => !v)}
              className="text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer whitespace-nowrap"
            >
              Cc Bcc
            </button>
          </div>

          {showCcBcc && (
            <>
              <div className="flex items-center gap-2 px-4 py-2 border-b border-background-100 shrink-0">
                <span className="text-xs text-foreground-400 w-12 shrink-0">Cc</span>
                <input type="text" value={cc} onChange={e => setCc(e.target.value)} className="flex-1 text-sm text-foreground-950 bg-transparent focus:outline-none" placeholder="Optional" />
              </div>
              <div className="flex items-center gap-2 px-4 py-2 border-b border-background-100 shrink-0">
                <span className="text-xs text-foreground-400 w-12 shrink-0">Bcc</span>
                <input type="text" value={bcc} onChange={e => setBcc(e.target.value)} className="flex-1 text-sm text-foreground-950 bg-transparent focus:outline-none" placeholder="Optional" />
              </div>
            </>
          )}

          {/* Subject */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-background-100 shrink-0">
            <span className="text-xs text-foreground-400 w-12 shrink-0">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="flex-1 text-sm text-foreground-950 bg-transparent focus:outline-none"
              placeholder="Email subject"
            />
          </div>

          {/* Rich text editor */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Write your message..."
            className="compose-editor flex-1 px-4 py-3 text-sm text-foreground-950 focus:outline-none min-h-[180px]"
          />

          {/* Attachment chips */}
          {attachments.length > 0 && (
            <div className="px-4 pb-3 pt-1 flex flex-wrap gap-3 shrink-0">
              {attachments.map((f, i) => (
                <div key={i} className="group relative flex items-center gap-1.5 px-2.5 py-1.5 bg-background-100 rounded-lg text-xs text-foreground-600 border border-background-200 hover:border-background-300 transition-colors">
                  <i className="ri-attachment-2 text-foreground-400"></i>
                  <span className="max-w-[140px] truncate">{f.name}</span>
                  <span className="text-foreground-300">({(f.size / 1024).toFixed(0)}KB)</span>
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                    className="absolute -top-2 -right-2 w-4 h-4 bg-foreground-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity cursor-pointer"
                    title="Remove attachment"
                  >
                    <i className="ri-close-line" style={{ fontSize: '9px' }}></i>
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* AI Draft — fixed above format toolbar, never scrolls away */}
        <div className="px-4 py-2.5 border-t border-background-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <i className="ri-sparkling-line text-primary-600 text-xs"></i>
            </div>
            <input
              type="text"
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAiDraft(); } }}
              disabled={isDrafting}
              className="flex-1 text-sm text-foreground-700 bg-transparent focus:outline-none disabled:opacity-50"
              placeholder="Ask AI to draft a message..."
            />
            <button
              type="button"
              onClick={handleAiDraft}
              disabled={isDrafting || !aiPrompt.trim()}
              className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isDrafting
                ? <i className="ri-loader-4-line animate-spin text-xs"></i>
                : <i className="ri-arrow-right-line text-xs"></i>
              }
            </button>
          </div>
        </div>

        {/* Format toolbar */}
        {showFormatBar && (
          <div className="px-3 py-1.5 border-t border-background-100 flex flex-wrap items-center gap-0.5 shrink-0">
            {/* Undo / Redo */}
            <ToolBtn title="Undo" icon="ri-arrow-go-back-line" onMouseDown={e => { e.preventDefault(); exec('undo'); }} />
            <ToolBtn title="Redo" icon="ri-arrow-go-forward-line" onMouseDown={e => { e.preventDefault(); exec('redo'); }} />
            <Divider />

            {/* Font family */}
            <select
              onMouseDown={saveRange}
              onChange={e => { restoreRange(); exec('fontName', e.target.value); editorRef.current?.focus(); }}
              className="text-xs text-foreground-700 bg-transparent border border-background-200 rounded px-1 py-0.5 focus:outline-none cursor-pointer hover:bg-background-50 max-w-[110px]"
            >
              {FONT_FAMILIES.map(f => <option key={f.label} value={f.value}>{f.label}</option>)}
            </select>

            {/* Font size */}
            <select
              onMouseDown={saveRange}
              onChange={e => { restoreRange(); applyFontSize(e.target.value); editorRef.current?.focus(); }}
              className="text-xs text-foreground-700 bg-transparent border border-background-200 rounded px-1 py-0.5 focus:outline-none cursor-pointer hover:bg-background-50 ml-1"
            >
              {FONT_SIZES.map(s => <option key={s.label} value={s.value}>{s.label}</option>)}
            </select>
            <Divider />

            {/* Bold / Italic / Underline */}
            <ToolBtn title="Bold (Ctrl+B)" icon="ri-bold" active={fmtState.bold} onMouseDown={e => { e.preventDefault(); exec('bold'); }} />
            <ToolBtn title="Italic (Ctrl+I)" icon="ri-italic" active={fmtState.italic} onMouseDown={e => { e.preventDefault(); exec('italic'); }} />
            <ToolBtn title="Underline (Ctrl+U)" icon="ri-underline" active={fmtState.underline} onMouseDown={e => { e.preventDefault(); exec('underline'); }} />
            <Divider />

            {/* Text color */}
            <div className="relative">
              <button
                type="button"
                title="Text color"
                onMouseDown={e => { e.preventDefault(); saveRange(); setShowColorPicker(v => !v); setShowEmojiPicker(false); }}
                className="w-7 h-7 flex items-center justify-center rounded text-sm transition-colors cursor-pointer text-foreground-500 hover:bg-background-100 hover:text-foreground-700"
              >
                <i className="ri-font-color"></i>
              </button>
              {showColorPicker && (
                <div className="absolute bottom-full left-0 mb-1 bg-white rounded-lg shadow-xl border border-background-200 p-2 z-20">
                  <div className="grid grid-cols-8 gap-1">
                    {TEXT_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        title={c}
                        onMouseDown={e => { e.preventDefault(); restoreRange(); exec('foreColor', c); setShowColorPicker(false); }}
                        className="w-5 h-5 rounded border border-background-200 hover:scale-125 transition-transform"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Divider />

            {/* Alignment */}
            <ToolBtn title="Align left" icon="ri-align-left" active={fmtState.justifyLeft} onMouseDown={e => { e.preventDefault(); exec('justifyLeft'); }} />
            <ToolBtn title="Align center" icon="ri-align-center" active={fmtState.justifyCenter} onMouseDown={e => { e.preventDefault(); exec('justifyCenter'); }} />
            <ToolBtn title="Align right" icon="ri-align-right" active={fmtState.justifyRight} onMouseDown={e => { e.preventDefault(); exec('justifyRight'); }} />
            <ToolBtn title="Justify" icon="ri-align-justify" active={fmtState.justifyFull} onMouseDown={e => { e.preventDefault(); exec('justifyFull'); }} />
            <Divider />

            {/* Lists */}
            <ToolBtn title="Numbered list" icon="ri-list-ordered" active={fmtState.orderedList} onMouseDown={e => { e.preventDefault(); exec('insertOrderedList'); }} />
            <ToolBtn title="Bulleted list" icon="ri-list-unordered" active={fmtState.unorderedList} onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList'); }} />

            {/* Indent */}
            <ToolBtn title="Decrease indent" icon="ri-indent-decrease" onMouseDown={e => { e.preventDefault(); exec('outdent'); }} />
            <ToolBtn title="Increase indent" icon="ri-indent-increase" onMouseDown={e => { e.preventDefault(); exec('indent'); }} />
            <Divider />

            {/* Blockquote */}
            <ToolBtn title="Blockquote" icon="ri-double-quotes-l" onMouseDown={e => { e.preventDefault(); exec('formatBlock', 'blockquote'); }} />

            {/* Strikethrough */}
            <ToolBtn title="Strikethrough" icon="ri-strikethrough" active={fmtState.strikeThrough} onMouseDown={e => { e.preventDefault(); exec('strikeThrough'); }} />
            <Divider />

            {/* Clear formatting */}
            <ToolBtn title="Remove formatting" icon="ri-format-clear" onMouseDown={e => { e.preventDefault(); exec('removeFormat'); }} />
          </div>
        )}

        {/* Link input row */}
        {showLinkInput && (
          <div className="px-4 py-2 border-t border-background-100 flex items-center gap-2 shrink-0">
            <i className="ri-links-line text-sm text-foreground-400 shrink-0"></i>
            <input
              type="text"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 text-sm bg-background-50 border border-background-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-primary-400"
              onKeyDown={e => {
                if (e.key === 'Enter') handleInsertLink();
                if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl(''); }
              }}
              autoFocus
            />
            <button type="button" onClick={handleInsertLink} className="px-3 py-1 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors cursor-pointer">
              Apply
            </button>
            <button type="button" onClick={() => { setShowLinkInput(false); setLinkUrl(''); }} className="px-3 py-1 text-xs text-foreground-500 hover:bg-background-100 rounded-lg transition-colors cursor-pointer">
              Cancel
            </button>
          </div>
        )}

        {/* Emoji picker row */}
        {showEmojiPicker && (
          <div className="px-3 py-2 border-t border-background-100 shrink-0">
            <div className="flex flex-wrap gap-0.5">
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); restoreRange(); exec('insertText', emoji); setShowEmojiPicker(false); }}
                  className="w-9 h-9 text-lg flex items-center justify-center rounded hover:bg-background-100 transition-colors cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-background-200 flex items-center gap-1.5 shrink-0 rounded-b-xl">
          {/* Send + dropdown */}
          <div className="flex items-center mr-1">
            <button
              type="button"
              onClick={e => handleSubmit(e, false)}
              disabled={isSending || !to.trim()}
              className="flex items-center gap-1.5 pl-4 pr-3 py-2 rounded-l-lg bg-primary-500 text-sm font-medium text-white hover:bg-primary-600 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSending
                ? <><i className="ri-loader-4-line animate-spin text-sm"></i>Sending...</>
                : <>Send</>
              }
            </button>
            <button
              type="button"
              title="More send options"
              onMouseDown={e => e.preventDefault()}
              disabled={isSending}
              className="px-1.5 py-2 rounded-r-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors border-l border-primary-400 disabled:opacity-50 cursor-pointer"
            >
              <i className="ri-arrow-down-s-line text-sm"></i>
            </button>
          </div>

          {/* Save draft */}
          <button
            type="button"
            onClick={e => handleSubmit(e, true)}
            disabled={isSending}
            className="px-2 py-1.5 text-xs text-foreground-500 hover:bg-background-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            Save draft
          </button>

          <div className="flex-1" />

          {/* Format toggle (Aa) */}
          <button
            type="button"
            title="Formatting options"
            onMouseDown={e => e.preventDefault()}
            onClick={() => setShowFormatBar(v => !v)}
            className={`${showFormatBar ? btnActive : btnDefault} font-semibold text-xs`}
          >
            Aa
          </button>

          {/* Attachment */}
          <button
            type="button"
            title="Attach files"
            onClick={() => fileInputRef.current?.click()}
            className={btnDefault}
          >
            <i className="ri-attachment-2 text-sm"></i>
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />

          {/* Link */}
          <button
            type="button"
            title="Insert link"
            onMouseDown={e => { e.preventDefault(); saveRange(); setShowLinkInput(v => !v); setShowEmojiPicker(false); setShowColorPicker(false); }}
            className={showLinkInput ? btnActive : btnDefault}
          >
            <i className="ri-links-line text-sm"></i>
          </button>

          {/* Emoji */}
          <button
            type="button"
            title="Insert emoji"
            onMouseDown={e => { e.preventDefault(); saveRange(); setShowEmojiPicker(v => !v); setShowLinkInput(false); setShowColorPicker(false); }}
            className={showEmojiPicker ? btnActive : btnDefault}
          >
            <i className="ri-emotion-line text-sm"></i>
          </button>

          {/* Image */}
          <button
            type="button"
            title="Insert image"
            onClick={() => imageInputRef.current?.click()}
            className={btnDefault}
          >
            <i className="ri-image-add-line text-sm"></i>
          </button>
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageInsert} />

          {/* More options */}
          <button
            type="button"
            title="More options"
            onMouseDown={e => e.preventDefault()}
            className={btnDefault}
          >
            <i className="ri-more-2-fill text-sm"></i>
          </button>

          {/* Discard */}
          <button
            type="button"
            title="Discard draft"
            onMouseDown={e => e.preventDefault()}
            onClick={handleDiscard}
            disabled={isSending}
            className={`${btnBase} text-foreground-400 hover:text-rose-500 hover:bg-rose-50 disabled:opacity-50`}
          >
            <i className="ri-delete-bin-line text-sm"></i>
          </button>
        </div>
      </div>

      {/* Floating X over hovered inline images */}
      {imgOverlay && (
        <button
          type="button"
          title="Remove image"
          className="fixed z-[60] w-5 h-5 bg-foreground-700 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-rose-500 transition-colors shadow-md"
          style={{ top: imgOverlay.top, left: imgOverlay.left }}
          onMouseEnter={() => { if (imgOverlayTimerRef.current) clearTimeout(imgOverlayTimerRef.current); }}
          onMouseLeave={() => setImgOverlay(null)}
          onMouseDown={e => {
            e.preventDefault();
            imgOverlay.img.remove();
            setImgOverlay(null);
          }}
        >
          <i className="ri-close-line" style={{ fontSize: '10px' }}></i>
        </button>
      )}
    </div>
  );
}
