import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'ri-dashboard-line', path: '/dashboard' },
  { id: 'inbox', label: 'Inbox', icon: 'ri-mail-line', path: '/inbox' },
  { id: 'priority', label: 'Priority', icon: 'ri-star-line', path: '/dashboard' },
  { id: 'tasks', label: 'Tasks', icon: 'ri-task-line', path: '/dashboard' },
  { id: 'accounts', label: 'Accounts', icon: 'ri-mail-settings-line', path: '/dashboard' },
  { id: 'reminders', label: 'Reminders', icon: 'ri-timer-line', path: '/dashboard' },
  { id: 'search', label: 'Search', icon: 'ri-search-line', path: '/dashboard' },
  { id: 'settings', label: 'Settings', icon: 'ri-settings-3-line', path: '/dashboard' },
];

interface SidebarProps {
  activeItem: string;
  onNavigate: (id: string) => void;
  onAddAccount?: () => void;
}

export function Sidebar({ activeItem, onNavigate, onAddAccount }: SidebarProps) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="w-full lg:w-60 bg-foreground-950 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-foreground-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center shrink-0">
            <i className="ri-mail-ai-line text-lg text-white"></i>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate font-heading">AI Email Copilot</h1>
            <p className="text-xs text-foreground-400 truncate">Workspace</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onNavigate(item.id);
              navigate(item.path);
              if (item.id === 'accounts' && onAddAccount) {
                onAddAccount();
              }
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer whitespace-nowrap ${
              activeItem === item.id
                ? 'bg-primary-500/15 text-primary-400 font-medium'
                : 'text-foreground-300 hover:text-white hover:bg-foreground-800'
            }`}
          >
            <i className={`${item.icon} text-base w-5 h-5 flex items-center justify-center`}></i>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-foreground-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-white">
              {(profile?.email || user?.email || 'A').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white truncate">{profile?.email || user?.email || 'Admin'}</p>
            <p className="text-xs text-foreground-400">{profile?.role === 'admin' ? 'Administrator' : 'User'}</p>
          </div>
          <button
            onClick={logout}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-white hover:bg-foreground-800 transition-colors cursor-pointer"
            title="Sign out"
          >
            <i className="ri-logout-box-r-line text-base"></i>
          </button>
        </div>
      </div>
    </aside>
  );
}