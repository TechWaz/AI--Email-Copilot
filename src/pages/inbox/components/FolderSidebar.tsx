import type { FolderFilter } from '@/hooks/useInbox';

interface FolderSidebarProps {
  collapsed: boolean;
  activeFolder: FolderFilter;
  onFolderChange: (folder: FolderFilter) => void;
  onCompose: () => void;
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

const MAIN_FOLDERS: { id: FolderFilter; label: string; icon: string; iconSolid: string }[] = [
  { id: 'Inbox',   label: 'Inbox',   icon: 'ri-inbox-line',       iconSolid: 'ri-inbox-fill' },
  { id: 'Starred', label: 'Starred', icon: 'ri-star-line',        iconSolid: 'ri-star-fill' },
  { id: 'Sent',    label: 'Sent',    icon: 'ri-send-plane-line',  iconSolid: 'ri-send-plane-fill' },
  { id: 'Drafts',  label: 'Drafts',  icon: 'ri-draft-line',       iconSolid: 'ri-draft-fill' },
  { id: 'Spam',    label: 'Spam',    icon: 'ri-spam-2-line',      iconSolid: 'ri-spam-2-fill' },
  { id: 'Trash',   label: 'Trash',   icon: 'ri-delete-bin-line',  iconSolid: 'ri-delete-bin-fill' },
];

export function FolderSidebar({
  collapsed, activeFolder, onFolderChange, onCompose,
  unreadCount, sentCount, draftCount, spamCount, trashCount, starredCount,
  storageUsed, storageTotal, storagePercent,
}: FolderSidebarProps) {
  const countMap: Record<string, number> = {
    Inbox: unreadCount, Starred: starredCount, Sent: sentCount,
    Drafts: draftCount, Spam: spamCount, Trash: trashCount,
  };

  return (
    <aside
      className="flex flex-col h-full shrink-0 overflow-hidden"
      style={{ width: collapsed ? '72px' : '256px', transition: 'width 200ms ease' }}
    >
      {/* Compose button */}
      <div className={`pt-3 pb-2 ${collapsed ? 'px-3' : 'px-4'}`}>
        <button
          onClick={onCompose}
          title="Compose"
          className={`flex items-center gap-3 rounded-2xl transition-all cursor-pointer group ${
            collapsed
              ? 'w-12 h-12 justify-center bg-background-200 hover:bg-background-300 hover:shadow-md'
              : 'px-5 py-4 bg-primary-100 hover:shadow-md hover:bg-primary-200'
          }`}
        >
          <i className="ri-pencil-line text-xl text-primary-800 group-hover:scale-110 transition-transform"></i>
          {!collapsed && <span className="text-sm font-medium text-primary-900">Compose</span>}
        </button>
      </div>

      {/* Folder navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1">
        {MAIN_FOLDERS.map(f => {
          const isActive = activeFolder === f.id;
          const count = countMap[f.id] ?? 0;
          return (
            <button
              key={f.id}
              onClick={() => onFolderChange(f.id)}
              title={collapsed ? f.label : undefined}
              className={`w-full flex items-center gap-3 py-1 my-0.5 transition-all cursor-pointer text-sm group ${
                collapsed
                  ? 'justify-center px-0 rounded-full mx-auto w-12 h-10'
                  : 'pl-6 pr-4 rounded-r-full'
              } ${
                isActive
                  ? 'bg-primary-100 font-semibold text-foreground-950'
                  : 'text-foreground-700 hover:bg-black/5'
              }`}
            >
              <i className={`text-xl shrink-0 ${isActive && f.iconSolid ? f.iconSolid : f.icon} ${isActive ? 'text-foreground-950' : 'text-foreground-600'}`}></i>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{f.label}</span>
                  {count > 0 && (
                    <span className={`text-xs font-semibold ml-auto ${isActive ? 'text-foreground-950' : 'text-foreground-700'}`}>
                      {count > 999 ? '999+' : count}
                    </span>
                  )}
                </>
              )}
              {collapsed && count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </button>
          );
        })}

        {!collapsed && (
          <>
            <div className="my-2 mx-4 border-t border-background-200"></div>
            <button className="w-full flex items-center gap-3 pl-6 pr-4 py-1 my-0.5 rounded-r-full text-sm text-foreground-600 hover:bg-black/5 hover:text-foreground-900 transition-colors cursor-pointer">
              <i className="ri-price-tag-3-line text-xl shrink-0"></i>
              <span className="flex-1 text-left">Labels</span>
              <i className="ri-add-line text-base text-foreground-400"></i>
            </button>
          </>
        )}
      </nav>

      {/* Storage (only shown expanded) */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-background-100">
          <div className="flex items-center justify-between text-xs text-foreground-400 mb-1.5">
            <span>{storageUsed} of {storageTotal} used</span>
          </div>
          <div className="w-full h-1 rounded-full bg-background-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${storagePercent > 80 ? 'bg-rose-500' : 'bg-foreground-400'}`}
              style={{ width: `${Math.min(storagePercent, 100).toFixed(2)}%` }}
            />
          </div>
        </div>
      )}
    </aside>
  );
}
