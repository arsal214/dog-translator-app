import { ApiError } from '@/services/api';

/** i18n key for any thrown value; never exposes raw provider/server text. */
export const errorKey = (e: unknown) => `errors.${e instanceof ApiError ? e.code : 'unknown'}`;
export const isLimit = (e: unknown) => e instanceof ApiError && (e.code === 'free_limit_reached' || e.code === 'daily_limit_reached');
