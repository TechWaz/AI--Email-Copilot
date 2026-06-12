import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface DraftRequest {
  emailSubject?: string;
  emailBody?: string;
  senderName?: string;
  senderEmail?: string;
  recipientName?: string;
  recipientEmail?: string;
  tone?: 'professional' | 'friendly' | 'concise' | 'formal';
  action?: string;
  isReply?: boolean;
  isForward?: boolean;
  language?: string;
}

interface DraftResult {
  draft: string | null;
  error: string | null;
}

export function useAiDraft() {
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const generateDraft = useCallback(async (request: DraftRequest): Promise<DraftResult> => {
    setIsDrafting(true);
    setDraftError(null);

    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData?.session?.access_token) {
        throw new Error('No active session');
      }
      const session = sessionData.session;

      const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-draft-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string,
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || `AI draft failed (status ${response.status})`);
      }

      return { draft: result?.draft || null, error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate draft';
      setDraftError(msg);
      return { draft: null, error: msg };
    } finally {
      setIsDrafting(false);
    }
  }, []);

  return { generateDraft, isDrafting, draftError, setDraftError };
}