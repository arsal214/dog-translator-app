import Constants from 'expo-constants';
import { getCalendars, getLocales } from 'expo-localization';
import { Platform } from 'react-native';
import { ensureSession } from './api';
import { refreshCredits } from './credits';
import { log } from './logger';
import { syncPushToken } from './push';
import { startSync } from './sync';
import { backendConfigured, supabase } from './supabase';

/**
 * Makes sure this install has a Supabase user (anonymous until they link an account) and records the device on
 * their profile. Runs before RevenueCat is configured so purchases are tied to the Supabase user id.
 */
export async function bootstrapUser() {
  if (!backendConfigured) return;
  try {
    await ensureSession();
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return;
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      app_version: Constants.expoConfig?.version,
      os_version: String(Platform.Version).slice(0, 20),
      locale: getLocales()[0]?.languageTag?.slice(0, 20),
      timezone: getCalendars()[0]?.timeZone?.slice(0, 60),
      last_seen_at: new Date().toISOString(),
    });
    if (error) log.warn('profile_sync_failed', error.message);
    void refreshCredits();
    startSync().catch((e) => log.warn('sync_start_failed', e)); // dogs, journal, lessons, favourites, settings
    syncPushToken().catch((e) => log.warn('push_sync_failed', e));
    log.info('app_open');
  } catch (e) {
    log.warn('session_failed', e); // offline: the app still works; the session is retried on the first AI call
  }
}
