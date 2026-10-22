import { create } from 'zustand';
import { log } from './logger';
import { backendConfigured, supabase } from './supabase';

// One-time free credits (5 per new user), kept and spent on the server. Pro users never spend them.

type CreditState = { balance: number | null };
export const useCredits = create<CreditState>(() => ({ balance: null }));

/** Reads the signed-in user's balance; leaves it unknown (null) without a session. */
export async function refreshCredits() {
  if (!backendConfigured) return;
  try {
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user.id;
    if (!uid) return;
    const { data, error } = await supabase.from('credits').select('balance').eq('user_id', uid).maybeSingle();
    if (error) return log.warn('credits_read_failed', error.message);
    useCredits.setState({ balance: data?.balance ?? 0 });
  } catch (e) {
    log.warn('credits_read_failed', e);
  }
}

/**
 * Spends a credit for a feature that runs on the phone (Human → Dog). 'none' means the user is out of credits;
 * 'skipped' means the server couldn't be reached, in which case the local feature is allowed rather than blocked.
 */
export async function spendCredit(): Promise<'ok' | 'none' | 'skipped'> {
  if (!backendConfigured) return 'skipped';
  try {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) return 'skipped';
    const { data, error } = await supabase.rpc('use_credit');
    if (error || typeof data !== 'number') {
      log.warn('credits_spend_failed', error?.message);
      return 'skipped';
    }
    if (data < 0) {
      useCredits.setState({ balance: 0 });
      return 'none';
    }
    useCredits.setState({ balance: data });
    return 'ok';
  } catch (e) {
    log.warn('credits_spend_failed', e);
    return 'skipped';
  }
}
