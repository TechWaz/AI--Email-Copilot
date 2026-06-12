import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

// Custom lock with 10s timeout to prevent cross-tab lock contention deadlocks
function acquireLock(name: string, timeout: number): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve(false);
      }, timeout);
      navigator.locks.request(name, { ifAvailable: true }, (lock) => {
        clearTimeout(timer);
        if (lock) {
          return new Promise<void>((keep) => {
            // Keep lock for the session duration
            const release = () => {
              keep();
              window.removeEventListener('beforeunload', release);
            };
            window.addEventListener('beforeunload', release);
            resolve(true);
          });
        }
        resolve(false);
      }).catch(() => {
        clearTimeout(timer);
        resolve(false);
      });
    });
  }
  return Promise.resolve(true);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: acquireLock,
  },
  global: {
    headers: {
      'x-application-name': 'ai-email-copilot',
    },
  },
});