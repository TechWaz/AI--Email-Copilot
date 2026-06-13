import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export interface AppPreferences {
  emailDensity: 'compact' | 'comfortable';
  autoMarkRead: boolean;
  showAiSummary: boolean;
  emailsPerPage: number;
  showImportanceScore: boolean;
  defaultFolder: string;
}

const DEFAULTS: AppPreferences = {
  emailDensity: 'comfortable',
  autoMarkRead: true,
  showAiSummary: true,
  emailsPerPage: 50,
  showImportanceScore: true,
  defaultFolder: 'Inbox',
};

const LS_KEY = 'ai_email_copilot_prefs';

function readLocalPrefs(): AppPreferences {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

function writeLocalPrefs(p: AppPreferences) {
  localStorage.setItem(LS_KEY, JSON.stringify(p));
}

interface PreferencesContextType {
  prefs: AppPreferences;
  updatePref: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => Promise<void>;
  isLoading: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  // Start with localStorage for zero-flash load
  const [prefs, setPrefs] = useState<AppPreferences>(readLocalPrefs);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: pull from Supabase user_metadata and merge (remote wins for cross-device sync)
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const remote = data?.user?.user_metadata?.app_preferences as Partial<AppPreferences> | undefined;
      if (remote && typeof remote === 'object') {
        const merged = { ...DEFAULTS, ...readLocalPrefs(), ...remote };
        setPrefs(merged);
        writeLocalPrefs(merged);
      }
      setIsLoading(false);
    }).catch(() => {
      if (mounted) setIsLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const updatePref = useCallback(async <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: value };
      writeLocalPrefs(next);
      // Persist to Supabase user_metadata so prefs sync across devices/sessions
      supabase.auth.updateUser({ data: { app_preferences: next } }).catch(() => {
        // Non-fatal: local copy already saved
      });
      return next;
    });
  }, []);

  return (
    <PreferencesContext.Provider value={{ prefs, updatePref, isLoading }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
