import { refreshCredits } from './credits';
import { log } from './logger';
import { backendConfigured, supabase } from './supabase';

// Every code here has a message under errors.* in the localization files.
const CODES = [
  'not_configured', 'offline', 'unauthorized', 'free_limit_reached', 'daily_limit_reached',
  'audio_too_quiet_or_short', 'image_too_large', 'unsupported_image', 'ai_not_configured',
  'portrait_provider_not_configured', 'no_credits', 'pro_required', 'unknown',
] as const;
export type ApiErrorCode = (typeof CODES)[number];

export class ApiError extends Error {
  constructor(public code: ApiErrorCode) { super(code); }
}

/** Guests get an anonymous Supabase session on first AI use, so no account is required to try features. */
export async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw new ApiError('unauthorized');
}

export async function callFn<T>(name: string, body: unknown): Promise<T> {
  if (!backendConfigured) throw new ApiError('not_configured');
  try {
    await ensureSession();
  } catch (e) {
    throw e instanceof ApiError ? e : new ApiError('offline');
  }
  const { data, error } = await supabase.functions.invoke<T>(name, { body: body as Record<string, unknown> });
  void refreshCredits(); // the server may have spent (or refunded) a credit
  if (error) {
    const res = (error as { context?: Response }).context;
    if (res && typeof res.json === 'function') {
      const j = await res.json().catch(() => null);
      const raw = typeof j?.error === 'string' ? j.error : 'unknown';
      // Server-only codes (ai_provider_error, bad_ai_output, internal_error…) show the generic message; the log keeps the raw one.
      const code: ApiErrorCode = (CODES as readonly string[]).includes(raw) ? (raw as ApiErrorCode) : 'unknown';
      // Quota hits are expected product behaviour; everything else is worth a look.
      if (code === 'free_limit_reached' || code === 'daily_limit_reached' || code === 'no_credits' || code === 'pro_required') log.info('api_limit', { fn: name, code });
      else log.error('api_error', raw, { fn: name, status: res.status });
      throw new ApiError(code);
    }
    log.warn('api_offline', error, { fn: name });
    throw new ApiError('offline'); // FunctionsFetchError: network failure
  }
  return data as T;
}
