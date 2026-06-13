import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useEffect, useState, useRef } from 'react';
import type { EmailAccountBrief } from '@/hooks/useInbox';

interface InboxTopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  accounts: EmailAccountBrief[];
  selectedAccountId: string | null;
  onAccountChange: (id: string | null) => void;
}

export function InboxTopBar({ onSearchChange, searchQuery, accounts, selectedAccountId, onAccountChange }: InboxTopBarProps) {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [avatarInitial, setAvatarInitial] = useState('?');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
        setAvatarInitial(user.email.charAt(0).toUpperCase());
      }
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <header className="h-14 shrink-0 flex items-center gap-3 px-4 border-b border-background-200 bg-white">
      {/* Search */}
      <div className="flex-1 max-w-xs">
        <div className="relative">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm w-4 h-4 flex items-center justify-center"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search mail"
            className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-background-200 text-sm text-foreground-950 placeholder:text-foreground-400 bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"
            >
              <i className="ri-close-line text-sm w-4 h-4 flex items-center justify-center"></i>
            </button>
          )}
        </div>
      </div>

      {/* Account picker */}
      {accounts.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-background-200 bg-white text-foreground-700 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-mail-line text-foreground-400 text-sm shrink-0"></i>
            <span className="max-w-[180px] truncate text-xs font-medium">
              {selectedAccount ? selectedAccount.email_address : 'All accounts'}
            </span>
            <i className={`ri-arrow-down-s-line text-foreground-400 text-sm shrink-0 transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`}></i>
          </button>

          {dropdownOpen && (
            <div className="absolute top-full mt-1.5 left-0 bg-white rounded-xl border border-background-200 shadow-lg z-50 min-w-[220px] py-1 overflow-hidden">
              {accounts.length > 1 && (
                <>
                  <button
                    onClick={() => { onAccountChange(null); setDropdownOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors cursor-pointer ${
                      !selectedAccountId
                        ? 'bg-primary-50 text-primary-700 font-semibold'
                        : 'text-foreground-700 hover:bg-background-50'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-background-200 flex items-center justify-center shrink-0">
                      <i className="ri-inbox-2-line text-xs text-foreground-500"></i>
                    </div>
                    <span>All accounts</span>
                    {!selectedAccountId && <i className="ri-check-line ml-auto text-primary-600 text-sm"></i>}
                  </button>
                  <div className="my-1 border-t border-background-100"></div>
                </>
              )}
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => { onAccountChange(acc.id); setDropdownOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors cursor-pointer ${
                    selectedAccountId === acc.id
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : 'text-foreground-700 hover:bg-background-50'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-accent-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-accent-700">
                      {acc.email_address.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate">{acc.email_address}</p>
                    {acc.display_name && <p className="text-foreground-400 truncate">{acc.display_name}</p>}
                  </div>
                  {selectedAccountId === acc.id && <i className="ri-check-line ml-auto text-primary-600 text-sm shrink-0"></i>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1"></div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap">
          <i className="ri-rocket-line text-sm w-4 h-4 flex items-center justify-center"></i>
          Upgrade
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap">
          <i className="ri-gift-line text-sm w-4 h-4 flex items-center justify-center"></i>
          Refer a friend
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap">
          <i className="ri-sparkling-line text-sm w-4 h-4 flex items-center justify-center"></i>
          Ask AI
        </button>
      </div>

      <div className="w-px h-6 bg-background-200 mx-1"></div>

      {/* Settings + Avatar */}
      <button className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-500 hover:text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer">
        <i className="ri-eye-line text-sm w-4 h-4 flex items-center justify-center"></i>
      </button>
      <button className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-500 hover:text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer">
        <i className="ri-settings-4-line text-sm w-4 h-4 flex items-center justify-center"></i>
      </button>
      <button
        onClick={() => navigate('/dashboard')}
        className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer"
        title={userEmail || 'Account'}
      >
        {avatarInitial}
      </button>
    </header>
  );
}
