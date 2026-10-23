import { ApiError } from '@/services/api';
import { usePurchases } from '@/services/purchases';

/** i18n key for any thrown value; never exposes raw provider/server text. */
// Pro users who run out wait for their plan to renew, so they get their own message and no paywall button.
const proOut = (e: unknown) => e instanceof ApiError && e.code === 'no_credits' && usePurchases.getState().isPro;
export const errorKey = (e: unknown) => (proOut(e) ? 'errors.no_credits_pro' : `errors.${e instanceof ApiError ? e.code : 'unknown'}`);
export const isLimit = (e: unknown) => !proOut(e) && e instanceof ApiError && (e.code === 'free_limit_reached' || e.code === 'daily_limit_reached' || e.code === 'no_credits' || e.code === 'pro_required');
