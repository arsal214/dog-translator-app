import * as Notifications from 'expo-notifications';
import i18n from '@/localization';

const ID = 'daily-training';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export type ReminderResult = 'on' | 'off' | 'denied';

/** Local (no server) daily reminder at 18:00. Permission is requested here, from a user action. */
export async function setDailyReminder(enabled: boolean, dogName: string): Promise<ReminderResult> {
  await Notifications.cancelScheduledNotificationAsync(ID).catch(() => {});
  if (!enabled) return 'off';
  const perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return 'denied';
  await Notifications.scheduleNotificationAsync({
    identifier: ID,
    content: {
      title: i18n.t('reminder.title'),
      body: i18n.t('reminder.body', { name: dogName }),
      data: { route: '/training' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 18, minute: 0 },
  });
  return 'on';
}

/** Opens the screen named in a tapped local notification (same payload shape as the FCM deep links). */
export function wireLocalNotificationRouting(go: (route: string) => void) {
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const route = r.notification.request.content.data?.route;
    if (typeof route === 'string' && route.startsWith('/')) go(route);
  });
  return () => sub.remove();
}
