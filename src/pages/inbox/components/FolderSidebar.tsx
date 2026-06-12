import { useMemo } from 'react';
import type { FolderFilter } from '@/hooks/useInbox';

interface FolderSidebarProps {
  activeFolder: FolderFilter;
  onFolderChange: (folder: FolderFilter) => void;
  onCompose: () => void;
  emailCount: number;
  unreadCount: number;
  sentCount: number;
  draftCount: number;
  spamCount: number;
  trashCount: number;
  starredCount: number;
  storageUsed: string;
  storageTotal: string;
  storagePercent: number;
}

const FOLDERS: { id: FolderFilter; label: string; icon: string; iconSolid?: string }[] = [
  { id: 'Inbox', label: 'Inbox', icon: 'ri-inbox-line', iconSolid: 'ri-inbox-fill' },
  { id: 'Drafts', label: 'Drafts', icon: 'ri-draft-line', iconSolid: 'ri-draft-fill' },
  { id: 'Sent', label: 'Sent', icon: 'ri-send-plane-line', iconSolid: 'ri-send-plane-fill' },
  { id: 'Spam', label: 'Spam', icon: 'ri-spam-2-line', iconSolid: 'ri-spam-2-fill' },
  { id: 'Trash', label: 'Trash', icon: 'ri-delete-bin-line', iconSolid: 'ri-delete-bin-fill' },
  { id: 'Starred', label: 'Starred', icon: 'ri-star-line', iconSolid: 'ri-star-fill' },
];

export function FolderSidebar({
  activeFolder,
  onFolderChange,
  onCompose,
  unreadCount,
  sentCount,
  draftCount,
  spamCount,
  trashCount,
  starredCount,
  storageUsed,
  storageTotal,
  storagePercent,
}: FolderSidebarProps) {
  const countMap = useMemo(() => ({
    Inbox: unreadCount,
    Drafts: draftCount,
    Sent: sentCount,
    Spam: spamCount,
    Trash: trashCount,
    Starred: starredCount,
  }), [unreadCount, sentCount, draftCount, spamCount, trashCount, starredCount]);

  return (
    <aside className="w-[220px] shrink-0 flex flex-col h-full bg-background-50 border-r border-background-200">
      {/* Logo */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-2">
        <div className="w-7 h-7 flex items-center justify-center">
          <i className="ri-mail-send-fill text-xl text-primary-600"></i>
        </div>
        <span className="text-sm font-bold text-foreground-950 tracking-tight">Mail</span>
      </div>

      {/* New message button */}
      <div className="px-4 pb-4">
        <button
          onClick={onCompose}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-edit-line text-sm w-4 h-4 flex items-center justify-center"></i>
          New message
        </button>
      </div>

      {/* Folders */}
      <nav className="flex-1 px-2 overflow-y-auto">
        <div className="space-y-0.5">
          {FOLDERS.map((f) => {
            const isActive = activeFolder === f.id;
            const count = countMap[f.id as keyof typeof countMap] || 0;
            return (
              <button
                key={f.id}
                onClick={() => onFolderChange(f.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-foreground-700 hover:bg-background-100'
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className={`${isActive && f.iconSolid ? f.iconSolid : f.icon} text-base`}></i>
                </div>
                <span className="flex-1 text-left">{f.label}</span>
                {count > 0 && (
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
                    isActive ? 'bg-primary-200 text-primary-800' : 'bg-background-200 text-foreground-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-3 border-t border-background-200 mx-2"></div>

        {/* More items */}
        <div className="space-y-0.5">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer">
            <div className="w-5 h-5 flex items-center justify-center">
              <i className="ri-folder-line text-base"></i>
            </div>
            <span className="flex-1 text-left">Folders</span>
            <i className="ri-add-line text-sm text-foreground-400 w-4 h-4 flex items-center justify-center"></i>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer">
            <div className="w-5 h-5 flex items-center justify-center">
              <i className="ri-contacts-line text-base"></i>
            </div>
            <span className="flex-1 text-left">Contacts</span>
          </button>
        </div>
      </nav>

      {/* Storage */}
      <div className="px-4 py-3 border-t border-background-200">
        <div className="flex items-center justify-between text-xs text-foreground-500 mb-1.5">
          <span>{storageUsed} / {storageTotal}</span>
          <button className="text-primary-500 hover:text-primary-600 cursor-pointer whitespace-nowrap">Upgrade</button>
        </div>
        <div className="w-full h-1.5 rounded-full bg-background-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary-500 transition-all"
            style={{ width: `${Math.min(storagePercent, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="px-4 pb-4 space-y-2">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-foreground-500 hover:bg-background-100 transition-colors cursor-pointer">
          <i className="ri-feedback-line text-sm w-4 h-4 flex items-center justify-center"></i>
          Send feedback
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-foreground-950 text-white text-xs font-medium hover:bg-foreground-800 transition-colors cursor-pointer">
          <i className="ri-rocket-line text-sm w-4 h-4 flex items-center justify-center"></i>
          Setup guide
        </button>
      </div>
    </aside>
  );
}