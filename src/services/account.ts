import type { AuthError } from '@supabase/supabase-js';
import { log } from './logger';
import { supabase } from './supabase';

// Every install starts as an anonymous Supabase user and RevenueCat runs under that user id. Creating an account
// adds an email + password to the same user, so the id (and the subscription tied to it) never changes.

export type AccountError = 'email_taken' | 'weak_password' | 'invalid_email' | 'wrong_credentials' | 'bad_code' | 'offline' | 'unknown';
export type CreateResult = { ok: true; needsCode: boolean } | { ok: false; error: AccountError };
export type Result = { ok: true } | { ok: false; error: AccountError };

const map = (e: AuthError | Error): AccountError => {
  const code = (e as AuthError).code ?? '';
  if (['email_exists', 'user_already_exists', 'identity_already_exists'].includes(code)) return 'email_taken';
  if (code === 'weak_password') return 'weak_password';
  if (code === 'email_address_invalid' || code === 'validation_failed') return 'invalid_email';
  if (code === 'invalid_credentials') return 'wrong_credentials';
  if (code === 'otp_expired' || code === 'otp_disabled') return 'bad_code';
  if (e.name === 'AuthRetryableFetchError' || /network|fetch/i.test(e.message)) return 'offline';
  return 'unknown';
};

const fail = (event: string, e: AuthError | Error): { ok: false; error: AccountError } => {
  const error = map(e);
  if (error === 'unknown' || error === 'offline') log.error(event, e, { code: (e as AuthError).code });
  else log.info(event, { error });
  return { ok: false, error };
};

/** True while the user has no email on their account (anonymous). */
export async function isGuest() {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  return !user || !!user.is_anonymous || !user.email;
}

/** Step 1: attach the email. If the project confirms email changes, a 6-digit code is emailed and `needsCode` is true. */
export async function createAccount(email: string, password: string): Promise<CreateResult> {
  const { data, error } = await supabase.auth.updateUser({ email });
  if (error) return fail('account_create_failed', error);
  if (data.user?.email?.toLowerCase() !== email.toLowerCase()) return { ok: true, needsCode: true };
  const r = await setPassword(password);
  return r.ok ? { ok: true, needsCode: false } : r;
}

/** Step 2: confirm the emailed code, then set the password. */
export async function confirmCode(email: string, code: string, password: string): Promise<Result> {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email_change' });
  if (error) return fail('account_code_failed', error);
  return setPassword(password);
}

async function setPassword(password: string): Promise<Result> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return fail('account_password_failed', error);
  log.info('account_created');
  return { ok: true };
}

export async function resendCode(email: string): Promise<Result> {
  const { error } = await supabase.auth.resend({ type: 'email_change', email });
  return error ? fail('account_resend_failed', error) : { ok: true };
}

/**
 * Signs in to an existing account. RevenueCat follows the new user id (see initPurchases) and transfers the
 * purchase made on this device to it.
 */
export async function signIn(email: string, password: string): Promise<Result> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return fail('account_signin_failed', error);
  log.info('account_signed_in');
  return { ok: true };
}
