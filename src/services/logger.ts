import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { backendConfigured, supabase } from './supabase';

type Level = 'info' | 'warn' | 'error';
type Row = { level: Level; event: string; message?: string; context?: Record<string, unknown>; platform: string; app_version?: string; created_at: string };

const APP_VERSION = Constants.expoConfig?.version;
const MAX_QUEUE = 200; // drop the oldest rather than grow without bound while offline
const FLUSH_AT = 20;
const FLUSH_MS = 15_000;

let queue: Row[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

const describe = (e: unknown): { message?: string; context?: Record<string, unknown> } =>
  e instanceof Error ? { message: e.message, context: { name: e.name, stack: e.stack?.slice(0, 1500) } } : { message: typeof e === 'string' ? e : JSON.stringify(e)?.slice(0, 2000) };

function push(level: Level, event: string, message?: string, context?: Record<string, unknown>) {
  if (__DEV__) (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(`[${event}]`, message ?? '', context ?? '');
  if (!backendConfigured) return;
  queue.push({ level, event: event.slice(0, 80), message: message?.slice(0, 2000), context, platform: Platform.OS, app_version: APP_VERSION, created_at: new Date().toISOString() });
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  if (level === 'error' || queue.length >= FLUSH_AT) void flush();
  else if (!timer) timer = setTimeout(() => void flush(), FLUSH_MS);
}

/** Sends queued logs. Rows stay queued until there is a session (anonymous counts) and the insert succeeds. */
export async function flush() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (flushing || queue.length === 0) return;
  flushing = true;
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const batch = queue.slice(0, 50);
    const { error } = await supabase.from('app_logs').insert(batch.map((r) => ({ ...r, user_id: data.session!.user.id })));
    if (!error) queue = queue.slice(batch.length);
  } catch {
    /* offline: retried on the next log or flush */
  } finally {
    flushing = false;
    if (queue.length && !timer) timer = setTimeout(() => void flush(), FLUSH_MS);
  }
}

export const log = {
  info: (event: string, context?: Record<string, unknown>) => push('info', event, undefined, context),
  warn: (event: string, e?: unknown, context?: Record<string, unknown>) => {
    const d = e === undefined ? {} as ReturnType<typeof describe> : describe(e);
    push('warn', event, d.message, { ...d.context, ...context });
  },
  error: (event: string, e: unknown, context?: Record<string, unknown>) => {
    const d = describe(e);
    push('error', event, d.message, { ...d.context, ...context });
  },
};

/** Reports JS crashes and unhandled promise rejections. Call once at startup. */
export function installGlobalErrorLogging() {
  const g = globalThis as unknown as {
    ErrorUtils?: { getGlobalHandler: () => (e: Error, fatal?: boolean) => void; setGlobalHandler: (h: (e: Error, fatal?: boolean) => void) => void };
    HermesInternal?: { enablePromiseRejectionTracker?: (o: { allRejections: boolean; onUnhandled: (id: number, e: unknown) => void }) => void };
  };
  const prev = g.ErrorUtils?.getGlobalHandler();
  g.ErrorUtils?.setGlobalHandler((e, fatal) => {
    log.error(fatal ? 'crash' : 'js_error', e, { fatal: !!fatal });
    void flush();
    prev?.(e, fatal);
  });
  // In development React Native's own tracker shows rejections in LogBox, so leave it in place.
  if (!__DEV__) g.HermesInternal?.enablePromiseRejectionTracker?.({ allRejections: true, onUnhandled: (_id, e) => log.error('unhandled_rejection', e) });
}
