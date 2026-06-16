import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { EmailAccountBrief } from '@/hooks/useInbox';

interface GmailTopBarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  accounts: EmailAccountBrief[];
  selectedAccountId: string | null;
  onAccountChange: (id: string | null) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function GmailTopBar({
  sidebarCollapsed, onToggleSidebar,
  searchQuery, onSearchChange,
  accounts, selectedAccountId, onAccountChange,
  onRefresh, isLoading,
}: GmailTopBarProps) {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  const [avatarInitial, setAvatarInitial] = useState('?');
  const [acctOpen, setAcctOpen] = useState(false);
  const acctRef = useRef<HTMLDivElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
        setAvatarInitial(user.email.charAt(0).toUpperCase());
      }
    });
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (acctRef.current && !acctRef.current.contains(e.target as Node)) setAcctOpen(false);
    };
    if (acctOpen) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [acctOpen]);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  return (
    <header className="h-16 shrink-0 flex items-center gap-2 px-2 bg-background-50 z-10">
      {/* Hamburger + logo */}
      <div className="flex items-center gap-1 shrink-0 min-w-0" style={{ width: sidebarCollapsed ? '72px' : '256px', transition: 'width 200ms' }}>
        <button
          onClick={onToggleSidebar}
          className="w-10 h-10 flex items-center justify-center rounded-full text-foreground-600 hover:bg-black/8 transition-colors cursor-pointer shrink-0"
          title={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
        >
          <i className="ri-menu-line text-xl"></i>
        </button>
        {!sidebarCollapsed && (
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 ml-1 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center shrink-0">
              <i className="ri-mail-ai-line text-sm text-white"></i>
            </div>
            <span className="text-lg font-medium text-foreground-700 group-hover:text-foreground-950 transition-colors whitespace-nowrap tracking-tight">
              Mail
            </span>
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="flex-1 max-w-2xl mx-auto">
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all ${
          searchFocused ? 'bg-white shadow-md' : 'bg-background-200 hover:bg-background-300/60'
        }`}>
          <i className="ri-search-line text-foreground-500 text-lg shrink-0"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search mail"
            className="flex-1 bg-transparent text-sm text-foreground-900 placeholder-foreground-500 focus:outline-none min-w-0"
          />
          {searchQuery ? (
            <button onClick={() => onSearchChange('')} className="shrink-0 text-foreground-400 hover:text-foreground-600 cursor-pointer">
              <i className="ri-close-line text-lg"></i>
            </button>
          ) : (
            <button className="shrink-0 text-foreground-400 hover:text-foreground-600 cursor-pointer" title="Search options">
              <i className="ri-equalizer-line text-lg"></i>
            </button>
          )}
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Account filter pill */}
        {accounts.length > 1 && (
          <div className="relative" ref={acctRef}>
            <button
              onClick={() => setAcctOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background-200 hover:bg-background-300/60 text-xs font-medium text-foreground-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-mail-line text-sm text-foreground-500"></i>
              <span className="max-w-[120px] truncate">
                {selectedAccount ? selectedAccount.email_address.split('@')[0] : 'All'}
              </span>
              <i className={`ri-arrow-down-s-line text-foreground-400 text-sm transition-transform ${acctOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {acctOpen && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl border border-background-200 shadow-xl z-50 min-w-[220px] py-2 overflow-hidden">
                <p className="px-4 py-1.5 text-xs font-semibold text-foreground-400 uppercase tracking-wider">Account</p>
                {accounts.length > 1 && (
                  <button
                    onClick={() => { onAccountChange(null); setAcctOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer ${!selectedAccountId ? 'bg-primary-50 text-primary-700 font-medium' : 'text-foreground-700 hover:bg-background-50'}`}
                  >
                    <div className="w-7 h-7 rounded-full bg-background-200 flex items-center justify-center shrink-0">
                      <i className="ri-inbox-2-line text-xs text-foreground-500"></i>
                    </div>
                    <span className="flex-1 text-left">All accounts</span>
                    {!selectedAccountId && <i className="ri-check-line text-primary-600"></i>}
                  </button>
                )}
                {accounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => { onAccountChange(acc.id); setAcctOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer ${selectedAccountId === acc.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-foreground-700 hover:bg-background-50'}`}
                  >
                    <div className="w-7 h-7 rounded-full bg-accent-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-accent-700">{acc.email_address.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="flex-1 text-left truncate">{acc.email_address}</span>
                    {selectedAccountId === acc.id && <i className="ri-check-line text-primary-600 shrink-0"></i>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="w-10 h-10 flex items-center justify-center rounded-full text-foreground-600 hover:bg-black/8 transition-colors cursor-pointer disabled:opacity-50"
          title="Refresh"
        >
          <i className={`ri-refresh-line text-xl ${isLoading ? 'animate-spin' : ''}`}></i>
        </button>

        <button
          onClick={() => navigate('/settings')}
          className="w-10 h-10 flex items-center justify-center rounded-full text-foreground-600 hover:bg-black/8 transition-colors cursor-pointer"
          title="Settings"
        >
          <i className="ri-settings-4-line text-xl"></i>
        </button>

        <button
          onClick={() => navigate('/dashboard')}
          className="w-10 h-10 flex items-center justify-center rounded-full text-foreground-600 hover:bg-black/8 transition-colors cursor-pointer"
          title="App menu"
        >
          <i className="ri-apps-2-line text-xl"></i>
        </button>

        <button
          onClick={() => navigate('/dashboard')}
          className="w-9 h-9 rounded-full bg-accent-500 flex items-center justify-center text-white text-sm font-bold hover:ring-2 hover:ring-accent-400 hover:ring-offset-1 transition-all cursor-pointer ml-1 shrink-0"
          title={userEmail}
        >
          {avatarInitial}
        </button>
      </div>
    </header>
  );
}
