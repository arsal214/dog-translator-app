import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { Button, Card, Screen, T } from '@/components/ui';
import { LESSONS } from '@/content/training';
import { useActiveDog } from '@/features/dog-profiles/store';
import { useJournal } from '@/features/journal/store';
import { usePurchases } from '@/services/purchases';
import { color, type } from '@/theme/tokens';

export default function Lesson() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dog = useActiveDog();
  const isPro = usePurchases((s) => s.isPro);
  const complete = useJournal((s) => s.completeLesson);
  const lesson = LESSONS.find((l) => l.id === id);

  if (!lesson) return <Screen><T.Body>{t('training.notFound')}</T.Body></Screen>;
  if (lesson.pro && !isPro) return <Screen><T.Body>{t('training.proOnly')}</T.Body><Button label={t('paywall.seePro')} onPress={() => router.replace('/paywall?reason=training')} /></Screen>;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: lesson.title }} />
      <T.Body>{lesson.summary}</T.Body>
      {lesson.steps.map((s, i) => (
        <Card key={i} style={{ flexDirection: 'row', gap: 12 }}>
          <Text style={[type.headline, { color: color.textAccent }]}>{i + 1}</Text>
          <View style={{ flex: 1 }}><Text style={[type.callout, { color: color.text }]}>{s}</Text></View>
        </Card>
      ))}
      <Button variant="secondary" label={t('training.openClicker')} onPress={() => router.push('/clicker')} />
      <Button label={t('training.markDone')} onPress={() => { if (dog) complete(dog.id, lesson.id); router.back(); }} />
      <T.Body>{t('training.humane')}</T.Body>
    </Screen>
  );
}
