import '@/localization';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useDogs } from '@/features/dog-profiles/store';
import { useJournal } from '@/features/journal/store';
import { syncWidgets } from '@/lib/widgets';
import { installGlobalErrorLogging } from '@/services/logger';
import { bootstrapUser } from '@/services/profile';
import { isGuest } from '@/services/account';
import { initPurchases, usePurchases } from '@/services/purchases';
import { wireLocalNotificationRouting } from '@/services/reminders';
import { wireNotificationRouting } from '@/services/push';

installGlobalErrorLogging();

const TAB_PATHS = ['/translate', '/sounds', '/ai', '/training'];
const AWAY_MS = 10 * 60_000; // a quick switch to another app doesn't count as reopening

/**
 * Free users see the paywall each time they open the app: on launch, and when they come back after 10+ minutes away.
 * It waits until RevenueCat has answered (so Pro users never see a flash) and for the user to land on a tab
 * (so it never covers onboarding, which shows its own paywall).
 */
function useLaunchPaywall(pathname: string) {
  const checked = usePurchases((s) => s.checked);
  const isPro = usePurchases((s) => s.isPro);
  const shown = useRef(false);
  const [opens, setOpens] = useState(0);

  useEffect(() => {
    let leftAt = 0;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') leftAt = Date.now();
      else if (state === 'active' && leftAt && Date.now() - leftAt > AWAY_MS) {
        shown.current = false;
        setOpens((n) => n + 1);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (pathname === '/paywall') shown.current = true; // already on it (e.g. straight after onboarding)
    if (shown.current || !checked || isPro || !TAB_PATHS.includes(pathname)) return;
    shown.current = true;
    router.push('/paywall');
  }, [pathname, checked, isPro, opens]);
}

export default function RootLayout() {
  useEffect(() => {
    // The Supabase user must exist first so RevenueCat purchases carry its id to the webhook.
    void bootstrapUser().then(initPurchases);
    wireNotificationRouting();
    syncWidgets();
    const unsubs = [useJournal.subscribe(syncWidgets), useDogs.subscribe(syncWidgets)];
    const offLocal = wireLocalNotificationRouting((r) => router.push(r as never));
    return () => { unsubs.forEach((u) => u()); offLocal(); };
  }, []);
  // A guest who bought Pro (and closed the app before creating an account) is sent back to create one.
  const isPro = usePurchases((s) => s.isPro);
  const pathname = usePathname();
  const onAccountScreen = pathname === '/create-account';
  useEffect(() => {
    if (!isPro || onAccountScreen) return;
    void isGuest().then((guest) => guest && router.replace('/create-account'));
  }, [isPro, onAccountScreen]);
  useLaunchPaywall(pathname);
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, headerBackButtonDisplayMode: 'minimal' }} />
    </SafeAreaProvider>
  );
}
