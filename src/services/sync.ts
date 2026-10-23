import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { useDogs, type Dog } from '@/features/dog-profiles/store';
import { useJournal, type Entry } from '@/features/journal/store';
import { log } from './logger';
import { backendConfigured, supabase } from './supabase';

// Mirrors everything the user creates (dogs, journal, lessons, favourite sounds, quiz scores, settings) to Supabase.
// Changes are pushed as diffs a moment after they happen, and the server is pulled at launch and whenever the app
// comes back to the foreground. Each install remembers which rows it has already seen ("known" keys), so a pull can
// tell a row added on another phone (bring it in) from one deleted here (delete it on the server), and a row
// deleted on another phone (drop it here) from one created here and not pushed yet (push it). The first pull for a
// user on an install merges everything in, so a reinstall or signing in on a new phone brings the data back.
// Photos and audio never leave the phone.

type Row = Record<string, unknown>;
type Table = {
  name: string;
  /** Columns that identify a row besides user_id. */
  keys: string[];
  /** The local state as rows (without user_id). */
  rows: () => Row[];
  /** Adds server rows that aren't on this phone. */
  merge: (server: Row[]) => void;
  /** Drops local rows that another phone deleted. */
  remove: (rows: Row[]) => void;
};

const iso = (ms: number) => new Date(ms).toISOString();
const clip = (s: string | undefined, n: number) => (s == null ? null : s.slice(0, n));

const TABLES: Table[] = [
  {
    name: 'dogs',
    keys: ['id'],
    rows: () => {
      const { dogs, activeDogId } = useDogs.getState();
      return dogs.map((d) => ({
        id: d.id,
        name: d.name.slice(0, 30),
        breed: clip(d.breed, 60),
        sex: d.sex ?? null,
        age_group: d.age ?? null,
        age_range: d.ageRange ?? null,
        voice: d.voice,
        traits: d.traits.slice(0, 10),
        is_active: d.id === activeDogId,
        created_at: iso(d.createdAt),
      }));
    },
    merge: (server) => {
      const s = useDogs.getState();
      const have = new Set(s.dogs.map((d) => d.id));
      const added: Dog[] = server.filter((r) => !have.has(r.id as string)).map((r) => ({
        id: r.id as string,
        name: r.name as string,
        breed: (r.breed as string | null) ?? undefined,
        sex: (r.sex as Dog['sex'] | null) ?? undefined,
        age: (r.age_group as Dog['age'] | null) ?? undefined,
        ageRange: (r.age_range as Dog['ageRange'] | null) ?? undefined,
        voice: r.voice as Dog['voice'],
        traits: (r.traits as string[]) ?? [],
        createdAt: Date.parse(r.created_at as string),
      }));
      if (!added.length) return;
      const active = s.activeDogId ?? (server.find((r) => r.is_active)?.id as string | undefined) ?? added[0].id;
      useDogs.setState({ dogs: [...s.dogs, ...added].sort((a, b) => a.createdAt - b.createdAt), activeDogId: active, onboarded: true });
    },
    remove: (rows) => rows.forEach((r) => useDogs.getState().removeDog(r.id as string)),
  },
  {
    name: 'journal_entries',
    keys: ['id'],
    rows: () =>
      useJournal.getState().entries.map((e) => ({
        id: e.id,
        dog_id: e.dogId,
        kind: e.kind,
        mood: e.mood,
        intensity: e.intensity ?? null,
        confidence: e.confidence ?? null,
        text: e.text.slice(0, 1000),
        created_at: iso(e.at),
      })),
    merge: (server) => {
      const s = useJournal.getState();
      const have = new Set(s.entries.map((e) => e.id));
      const added: Entry[] = server.filter((r) => !have.has(r.id as string)).map((r) => ({
        id: r.id as string,
        dogId: r.dog_id as string,
        kind: r.kind as Entry['kind'],
        mood: r.mood as Entry['mood'],
        intensity: (r.intensity as number | null) ?? undefined,
        confidence: (r.confidence as Entry['confidence'] | null) ?? undefined,
        text: r.text as string,
        at: Date.parse(r.created_at as string),
      }));
      if (added.length) useJournal.setState({ entries: [...s.entries, ...added].sort((a, b) => b.at - a.at) });
    },
    remove: (rows) => {
      const gone = new Set(rows.map((r) => r.id as string));
      useJournal.setState((s) => ({ entries: s.entries.filter((e) => !gone.has(e.id)) }));
    },
  },
  {
    name: 'lesson_progress',
    keys: ['dog_id', 'lesson_id'],
    rows: () =>
      Object.entries(useJournal.getState().lessons).map(([k, at]) => {
        const i = k.lastIndexOf(':');
        return { dog_id: k.slice(0, i), lesson_id: k.slice(i + 1), completed_at: iso(at) };
      }),
    merge: (server) => {
      const lessons = { ...useJournal.getState().lessons };
      for (const r of server) lessons[`${r.dog_id}:${r.lesson_id}`] ??= Date.parse(r.completed_at as string);
      useJournal.setState({ lessons });
    },
    remove: (rows) => {
      const lessons = { ...useJournal.getState().lessons };
      for (const r of rows) delete lessons[`${r.dog_id}:${r.lesson_id}`];
      useJournal.setState({ lessons });
    },
  },
  {
    name: 'favorite_sounds',
    keys: ['sound_id'],
    rows: () => useJournal.getState().favorites.map((id) => ({ sound_id: id })),
    merge: (server) => {
      const favorites = useJournal.getState().favorites;
      const add = server.map((r) => r.sound_id as string).filter((id) => !favorites.includes(id));
      if (add.length) useJournal.setState({ favorites: [...favorites, ...add] });
    },
    remove: (rows) => {
      const gone = new Set(rows.map((r) => r.sound_id as string));
      useJournal.setState((s) => ({ favorites: s.favorites.filter((id) => !gone.has(id)) }));
    },
  },
  {
    name: 'quiz_scores',
    keys: ['day'],
    rows: () => Object.entries(useJournal.getState().quiz).map(([day, score]) => ({ day, score })),
    merge: (server) => {
      const quiz = { ...useJournal.getState().quiz };
      for (const r of server) quiz[r.day as string] ??= r.score as number;
      useJournal.setState({ quiz });
    },
    remove: (rows) => {
      const quiz = { ...useJournal.getState().quiz };
      for (const r of rows) delete quiz[r.day as string];
      useJournal.setState({ quiz });
    },
  },
];

const keyOf = (t: Table, r: Row) => t.keys.map((k) => String(r[k])).join('\u0000');
const settings = () => ({ onboarded: useDogs.getState().onboarded, training_reminder: useJournal.getState().reminder });

let uid: string | null = null;
let pushed: Record<string, Map<string, string>> = {}; // table -> key -> JSON of the last row the server has
let pushedSettings = '';
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let again = false;
let started = false;
let resolveFirstPull: () => void = () => {};
const firstPull = new Promise<void>((resolve) => { resolveFirstPull = resolve; });

/** Resolves once the launch pull has finished (or failed, or there's no session), or after `ms` at the latest. */
export const whenRestored = (ms: number) => Promise.race([firstPull, new Promise<void>((r) => setTimeout(r, ms))]);

const knownKey = (id: string, table: string) => `sync-known:${id}:${table}`;
async function loadKnown(id: string, table: string): Promise<Set<string> | null> {
  const raw = await AsyncStorage.getItem(knownKey(id, table)).catch(() => null);
  return raw ? new Set(JSON.parse(raw) as string[]) : null;
}
const saveKnown = (id: string, table: string, keys: Iterable<string>) =>
  AsyncStorage.setItem(knownKey(id, table), JSON.stringify([...keys])).catch(() => {});

const hydrated = (store: { persist: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void } }) =>
  new Promise<void>((resolve) => {
    if (store.persist.hasHydrated()) return resolve();
    const off = store.persist.onFinishHydration(() => { off(); resolve(); });
  });

/** Starts syncing for the signed-in user; safe to call more than once (e.g. after signing in to another account). */
export async function startSync() {
  if (!backendConfigured) return;
  await Promise.all([hydrated(useDogs), hydrated(useJournal)]);
  if (!started) {
    started = true;
    useDogs.subscribe(schedule);
    useJournal.subscribe(schedule);
    supabase.auth.onAuthStateChange((_e, session) => {
      if ((session?.user.id ?? null) !== uid) void startSync();
    });
    // Coming back to the app: pick up changes from other phones, and retry a pull that failed offline.
    AppState.addEventListener('change', (state) => { if (state === 'active') void startSync(); });
  }
  try {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user.id ?? null;
    if (!id) return;
    if (id !== uid) {
      uid = id;
      pushed = {};
      pushedSettings = '';
    }
    if (running) return; // a push is in flight; the next foreground pulls again
    running = true;
    try {
      await pullAndMerge(id);
    } catch (e) {
      log.warn('sync_pull_failed', e);
    } finally {
      running = false;
    }
    schedule();
  } finally {
    resolveFirstPull();
  }
}

/** Brings in rows from other phones, drops rows other phones deleted, and records what the server holds now. */
async function pullAndMerge(id: string) {
  let firstTime = false;
  for (const t of TABLES) {
    const { data, error } = await supabase.from(t.name).select('*').eq('user_id', id);
    if (error) throw new Error(`${t.name}: ${error.message}`);
    const server = (data ?? []).map(({ user_id: _u, updated_at: _t, ...r }) => r as Row);
    const serverKeys = new Set(server.map((r) => keyOf(t, r)));
    const known = await loadKnown(id, t.name);
    if (!known) {
      firstTime = true;
      t.merge(server); // first sync for this user here: keep everything from both sides
    } else {
      t.merge(server.filter((r) => !known.has(keyOf(t, r)))); // added on another phone
      t.remove(t.rows().filter((r) => known.has(keyOf(t, r)) && !serverKeys.has(keyOf(t, r)))); // deleted on another phone
    }
    // What the server holds now; the next push sends only the differences, including rows deleted here.
    pushed[t.name] = new Map(server.map((r) => [keyOf(t, r), fingerprint(r)]));
    // Only rows confirmed on the server count as known; local rows not pushed yet must not look "deleted elsewhere".
    await saveKnown(id, t.name, serverKeys);
  }
  if (firstTime) {
    const { data: p } = await supabase.from('profiles').select('onboarded, training_reminder').eq('id', id).maybeSingle();
    if (p?.onboarded && useDogs.getState().dogs.length && !useDogs.getState().onboarded) useDogs.setState({ onboarded: true });
    if (p?.training_reminder && !useJournal.getState().reminder) useJournal.setState({ reminder: true });
  }
}

// A comparable fingerprint of a row: sorted keys, and timestamps as numbers (Postgres formats them its own way).
function fingerprint(r: Row): string {
  return JSON.stringify(Object.keys(r).sort().map((k) => {
    const v = r[k];
    return [k, typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) ? Date.parse(v) : v];
  }));
}

function schedule() {
  if (!uid) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void push(), 1500);
}

async function push() {
  timer = null;
  if (!uid) return;
  if (running) { again = true; return; }
  running = true;
  const id = uid;
  let changed = false;
  try {
    for (const t of TABLES) {
      const before = pushed[t.name];
      if (!before) continue; // never pulled (offline at start): don't risk deleting rows we haven't seen
      const now = new Map(t.rows().map((r) => [keyOf(t, r), r]));
      const upserts = [...now].filter(([k, r]) => before.get(k) !== fingerprint(r)).map(([, r]) => ({ ...r, user_id: id }));
      const deletes = [...before.keys()].filter((k) => !now.has(k));
      if (upserts.length || deletes.length) changed = true;
      for (let i = 0; i < upserts.length; i += 200) {
        const batch = upserts.slice(i, i + 200).map((r) => (t.name === 'dogs' ? { ...r, updated_at: new Date().toISOString() } : r));
        const { error } = await supabase.from(t.name).upsert(batch, { onConflict: ['user_id', ...t.keys].join(',') });
        if (error) throw new Error(`${t.name} upsert: ${error.message}`);
        for (const r of upserts.slice(i, i + 200)) {
          const { user_id: _u, ...rest } = r;
          before.set(keyOf(t, rest), fingerprint(rest));
        }
      }
      for (const k of deletes) {
        const parts = k.split('\u0000');
        let q = supabase.from(t.name).delete().eq('user_id', id);
        t.keys.forEach((col, i) => { q = q.eq(col, parts[i]); });
        const { error } = await q;
        if (error) throw new Error(`${t.name} delete: ${error.message}`);
        before.delete(k);
      }
      if (upserts.length || deletes.length) await saveKnown(id, t.name, now.keys()); // the server now matches this phone
    }
    const s = JSON.stringify(settings());
    if (s !== pushedSettings || changed) {
      const { error } = await supabase.from('profiles').update({ ...settings(), data_synced_at: new Date().toISOString() }).eq('id', id);
      if (error) throw new Error(`profiles: ${error.message}`);
      pushedSettings = s;
    }
  } catch (e) {
    log.warn('sync_push_failed', e);
    if (!timer) timer = setTimeout(() => void push(), 30_000); // offline or a transient error: try again later
  } finally {
    running = false;
    if (again) { again = false; schedule(); }
  }
}
