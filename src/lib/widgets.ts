import { Platform } from 'react-native';
import i18n from '@/localization';
import { useDogs } from '@/features/dog-profiles/store';
import { dayKey, useJournal } from '@/features/journal/store';
import { mood } from '@/theme/tokens';

/** Pushes today's most frequent mood to the home-screen widget. No-op off iOS or without the native module (Expo Go). */
export function syncWidgets() {
  if (Platform.OS !== 'ios') return;
  try {
    const MoodWidget = require('../../widgets/MoodWidget').default;
    const dogId = useDogs.getState().activeDogId;
    const today = useJournal.getState().entries.filter((e) => e.dogId === dogId && dayKey(e.at) === dayKey());
    const counts: Record<string, number> = {};
    today.forEach((e) => (counts[e.mood] = (counts[e.mood] ?? 0) + 1));
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as keyof typeof mood | undefined;
    MoodWidget.updateSnapshot({
      title: i18n.t('home.todaysMood'),
      mood: top ? i18n.t(`moods.${top}`) : i18n.t('home.noMood'),
      color: top ? mood[top].fg : '#18352C',
    });
  } catch {
    /* widget module unavailable */
  }
}
