import { Stack, useRouter } from 'expo-router';
import i18n from '@/localization';
import { Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Share, Text, View } from 'react-native';
import { Button, Card, MoodBadge, Screen, T } from '@/components/ui';
import { useActiveDog } from '@/features/dog-profiles/store';
import { useJournal } from '@/features/journal/store';
import { color } from '@/theme/tokens';

export default function History() {
  const { t } = useTranslation();
  const router = useRouter();
  const dog = useActiveDog();
  const entries = useJournal((s) => s.entries).filter((e) => e.dogId === dog?.id);
  const { remove, clearDog } = useJournal.getState();

  const confirmClear = () =>
    Alert.alert(t('history.clearTitle'), t('history.clearBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('history.clear'), style: 'destructive', onPress: () => dog && clearDog(dog.id) },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: t('tabs.history') }} />
      <Button variant="secondary" label={t('history.openDiary')} onPress={() => router.push('/mood')} />
      {entries.length === 0 ? <T.Body>{t('history.empty', { name: dog?.name })}</T.Body> : null}
      {entries.map((e) => (
        <Card key={e.id} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <MoodBadge mood={e.mood} label={t(`moods.${e.mood}`)} />
            <T.Body>{new Date(e.at).toLocaleString(i18n.language)}</T.Body>
          </View>
          <Text style={{ color: color.text }}>{e.text}</Text>
          <T.Body>{t(`history.kind.${e.kind}`)}</T.Body>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <Pressable accessibilityRole="button" onPress={() => Share.share({ message: t('translate.shareText', { name: dog?.name, text: e.text }) })}>
              <Text style={{ color: color.textAccent, fontWeight: '600' }}>{t('common.share')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.delete')} onPress={() => remove(e.id)}>
              <Trash2 size={18} color={color.danger} />
            </Pressable>
          </View>
        </Card>
      ))}
      {entries.length > 0 ? <Button variant="tertiary" label={t('history.clear')} onPress={confirmClear} /> : null}
    </Screen>
  );
}
