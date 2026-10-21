import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// SecureStore values are limited (~2 KB), so sessions are stored in chunks.
const CHUNK = 1800;
const storage = {
  async getItem(k: string) {
    const n = Number(await SecureStore.getItemAsync(`${k}.n`));
    if (!n) return null;
    const parts = await Promise.all(Array.from({ length: n }, (_, i) => SecureStore.getItemAsync(`${k}.${i}`)));
    return parts.join('');
  },
  async setItem(k: string, v: string) {
    const parts = v.match(new RegExp(`.{1,${CHUNK}}`, 'gs')) ?? [''];
    await Promise.all(parts.map((p, i) => SecureStore.setItemAsync(`${k}.${i}`, p)));
    await SecureStore.setItemAsync(`${k}.n`, String(parts.length));
  },
  async removeItem(k: string) {
    const n = Number(await SecureStore.getItemAsync(`${k}.n`));
    await Promise.all([...Array.from({ length: n }, (_, i) => SecureStore.deleteItemAsync(`${k}.${i}`)), SecureStore.deleteItemAsync(`${k}.n`)]);
  },
};

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const backendConfigured = !!url && !!anon;

export const supabase = createClient(url || 'http://localhost', anon || 'missing', {
  auth: { storage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});
