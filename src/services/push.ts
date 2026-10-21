import { Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from './supabase';

// @react-native-firebase is a native module: absent in Expo Go and without google-services files.
// Everything here no-ops safely in that case.
function messaging() {
  try {
    return require('@react-native-firebase/messaging').default();
  } catch {
    return null;
  }
}

/** Call from a user action (e.g. the Settings toggle), not at launch. Returns whether push is enabled. */
export async function enablePush(): Promise<boolean> {
  const m = messaging();
  if (!m) return false;
  const status = await m.requestPermission();
  if (status < 1) return false; // 0 = denied
  await registerToken(await m.getToken());
  m.onTokenRefresh(registerToken);
  return true;
}

async function registerToken(token: string) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return; // stored once the user has a session (anonymous counts)
  await supabase.from('push_tokens').upsert({
    user_id: data.session.user.id,
    token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    updated_at: new Date().toISOString(),
  });
}

/** Deep links: notification payload `{ route: "/training" }` opens that screen. */
export function wireNotificationRouting() {
  const m = messaging();
  if (!m) return;
  const go = (msg: { data?: { route?: string } } | null) => {
    const r = msg?.data?.route;
    if (r && r.startsWith('/')) router.push(r as never);
  };
  m.onNotificationOpenedApp(go);
  m.getInitialNotification().then(go);
}
