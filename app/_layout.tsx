import '@/localization';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useDogs } from '@/features/dog-profiles/store';
import { useJournal } from '@/features/journal/store';
import { syncWidgets } from '@/lib/widgets';
import { initPurchases } from '@/services/purchases';
import { wireLocalNotificationRouting } from '@/services/reminders';
import { wireNotificationRouting } from '@/services/push';

export default function RootLayout() {
  useEffect(() => {
    void initPurchases();
    wireNotificationRouting();
    syncWidgets();
    const unsubs = [useJournal.subscribe(syncWidgets), useDogs.subscribe(syncWidgets)];
    const offLocal = wireLocalNotificationRouting((r) => router.push(r as never));
    return () => { unsubs.forEach((u) => u()); offLocal(); };
  }, []);
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, headerBackButtonDisplayMode: 'minimal' }} />
    </SafeAreaProvider>
  );
}
