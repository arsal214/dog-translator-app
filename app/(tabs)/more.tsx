import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { Button, Card, Chip, Screen, T } from '@/components/ui';
import { useDogs } from '@/features/dog-profiles/store';
import { useJournal } from '@/features/journal/store';
import i18n, { LANGUAGES, setLanguage, type Lang } from '@/localization';
import { setDailyReminder } from '@/services/reminders';
import { supabase } from '@/services/supabase';
import { enablePush } from '@/services/push';
import { usePurchases } from '@/services/purchases';
import { color, type } from '@/theme/tokens';

const LINKS: { key: string; href: Href }[] = [
  { key: 'mood', href: '/mood' },
  { key: 'quiz', href: '/quiz' },
  { key: 'sounds', href: '/sounds' },
  { key: 'talk', href: '/talk' },
  { key: 'assistant', href: '/assistant' },
  { key: 'scanner', href: '/scanner' },
  { key: 'portraits', href: '/portraits' },
  { key: 'bee', href: '/games/bee' },
  { key: 'laser', href: '/games/laser' },
  { key: 'mouse', href: '/games/mouse' },
];

export default function More() {
  const { t } = useTranslation();
  const router = useRouter();
  const { dogs, activeDogId, setActive, removeDog } = useDogs();
  const isPro = usePurchases((s) => s.isPro);
  const [push, setPush] = useState(false);
  const reminder = useJournal((st) => st.reminder);
  const setReminder = useJournal((st) => st.setReminder);
  const [denied, setDenied] = useState(false);
  const dogName = dogs.find((d) => d.id === activeDogId)?.name ?? '';
  const toggleReminder = async (v: boolean) => {
    const r = await setDailyReminder(v, dogName);
    setDenied(r === 'denied');
    setReminder(r === 'on');
  };

  const togglePush = async (v: boolean) => setPush(v ? await enablePush() : false);

  const wipe = () =>
    Alert.alert(t('more.deleteAccount'), t('more.deleteAccountBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          // Server account (if any) first, then every local store.
          const { data } = await supabase.auth.getSession();
          if (data.session) await supabase.functions.invoke('delete-account').catch(() => {});
          await supabase.auth.signOut().catch(() => {});
          useJournal.setState({ entries: [], favorites: [], lessons: {}, quiz: {} });
          useDogs.setState({ dogs: [], activeDogId: undefined, onboarded: false });
          router.replace('/onboarding');
        },
      },
    ]);

  return (
    <Screen>
      <T.Title>{t('tabs.more')}</T.Title>
      <Card style={{ gap: 12 }}>
        <T.Head>{t('more.dogs')}</T.Head>
        {dogs.map((d) => (
          <Pressable key={d.id} accessibilityRole="radio" accessibilityState={{ selected: d.id === activeDogId }} onPress={() => setActive(d.id)} onLongPress={() => dogs.length > 1 && removeDog(d.id)}>
            <Text style={[type.body, { color: d.id === activeDogId ? color.primary : color.text, fontWeight: d.id === activeDogId ? '700' : '400' }]}>
              {d.id === activeDogId ? '● ' : '○ '}{d.name}{d.breed ? ` · ${d.breed}` : ''}
            </Text>
          </Pressable>
        ))}
        <Button variant="secondary" label={t('profile.addDog')} onPress={() => router.push('/dog/new')} />
      </Card>

      {!isPro ? <Button label={t('paywall.seePro')} onPress={() => router.push('/paywall')} /> : <T.Head>{t('paywall.youArePro')}</T.Head>}

      {LINKS.map((l) => (
        <Pressable key={l.key} accessibilityRole="button" onPress={() => router.push(l.href)}>
          <Card><T.Head>{t(`more.links.${l.key}`)}</T.Head></Card>
        </Pressable>
      ))}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}><T.Head>{t('more.reminderLabel')}</T.Head></View>
        <Switch value={reminder} onValueChange={toggleReminder} trackColor={{ true: color.primary }} accessibilityLabel={t('more.reminderLabel')} />
      </View>
      {denied ? <T.Body>{t('more.notificationsDenied')}</T.Body> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T.Head>{t('more.notifications')} (push)</T.Head>
        <Switch value={push} onValueChange={togglePush} trackColor={{ true: color.primary }} accessibilityLabel={t('more.notifications')} />
      </View>
      <T.Head>{t('more.language')}</T.Head>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(Object.keys(LANGUAGES) as Lang[]).map((l) => <Chip key={l} label={LANGUAGES[l]} selected={i18n.language === l} onPress={() => setLanguage(l)} />)}
      </View>
      <T.Body>{t('more.privacyNote')}</T.Body>
      <Button variant="tertiary" label={t('more.deleteAccount')} onPress={wipe} />
    </Screen>
  );
}
