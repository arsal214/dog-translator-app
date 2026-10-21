import { Stack, useRouter } from 'expo-router';
import { Check, Flame, Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { Card, Screen, T } from '@/components/ui';
import { LESSONS } from '@/content/training';
import { useActiveDog } from '@/features/dog-profiles/store';
import { streak, useJournal } from '@/features/journal/store';
import { usePurchases } from '@/services/purchases';
import { color } from '@/theme/tokens';

export default function Training() {
  const { t } = useTranslation();
  const router = useRouter();
  const dog = useActiveDog();
  const done = useJournal((s) => s.lessons);
  const isPro = usePurchases((s) => s.isPro);
  const mine = Object.entries(done).filter(([k]) => k.startsWith(`${dog?.id}:`));
  const count = mine.length;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: t('tabs.training') }} />
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Flame size={24} color={color.textHighlight} />
        <View>
          <T.Head>{t('training.streak', { count: streak(mine.map(([, at]) => at)) })}</T.Head>
          <T.Body>{t('training.progress', { done: count, total: LESSONS.length })}</T.Body>
        </View>
      </Card>
      {LESSONS.map((l) => {
        const locked = l.pro && !isPro;
        const complete = !!done[`${dog?.id}:${l.id}`];
        return (
          <Pressable key={l.id} accessibilityRole="button" onPress={() => router.push(locked ? '/paywall?reason=training' : `/lesson/${l.id}`)}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <T.Head>{l.title}</T.Head>
                <T.Body>{l.summary}</T.Body>
              </View>
              {locked ? <Lock size={20} color={color.textSecondary} /> : complete ? <Check size={20} color={color.brandStrong} /> : <Text style={{ color: color.textAccent }}>›</Text>}
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}
