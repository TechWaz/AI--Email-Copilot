import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

interface InboxTopBarProps {
  onSearchChange: (query: string) => void;
  searchQuery: string;
}

export function InboxTopBar({ onSearchChange, searchQuery }: InboxTopBarProps) {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [avatarInitial, setAvatarInitial] = useState('?');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
        setAvatarInitial(user.email.charAt(0).toUpperCase());
      }
    });
  }, []);

  return (
    <header className="h-14 shrink-0 flex items-center gap-3 px-4 border-b border-background-200 bg-white">
      {/* Search */}
      <div className="flex-1 max-w-md">
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