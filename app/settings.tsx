import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react-native';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Button, Card, Chip, Screen, T } from '@/components/ui';
import { DogProfileCard } from '@/features/dog-profiles/DogProfileCard';
import { useDogs } from '@/features/dog-profiles/store';
import { useJournal } from '@/features/journal/store';
import i18n, { LANGUAGES, setLanguage, type Lang } from '@/localization';
import { setDailyReminder } from '@/services/reminders';
import { supabase } from '@/services/supabase';
import { enablePush } from '@/services/push';
import { usePurchases } from '@/services/purchases';
import { color, mood, radius, shadow, type } from '@/theme/tokens';

const LINK_EMOJI: Record<string, string> = { mood: '🎭', quiz: '💡', history: '🕘', talk: '🗣️', assistant: '💬', training: '🎓', portraits: '🎨', bee: '🐝', laser: '🔴', mouse: '🐭' };
const TINTS = [mood.happy.bg, mood.excited.bg, mood.calm.bg, mood.anxious.bg, mood.playful.bg] as const;

const LINKS: { key: string; href: Href }[] = [
  { key: 'mood', href: '/mood' },
  { key: 'quiz', href: '/quiz' },
  { key: 'history', href: '/history' },
  { key: 'talk', href: '/talk' },
  { key: 'assistant', href: '/assistant' },
  { key: 'training', href: '/training' },
  { key: 'portraits', href: '/portraits' },
  { key: 'bee', href: '/games/bee' },
  { key: 'laser', href: '/games/laser' },
  { key: 'mouse', href: '/games/mouse' },
];

export default function More() {
  const { t } = useTranslation();
  const router = useRouter();
  const { dogs, activeDogId } = useDogs();
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

  const row = { flexDirection: 'row', alignItems: 'center', gap: 12 } as const;
  return (
    <Screen style={{ gap: 20, paddingBottom: 40 }}>
      <T.Title>{t('tabs.more')}</T.Title>
      <DogProfileCard />

      {!isPro ? (
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/paywall')} style={({ pressed }) => [{ ...row, padding: 16, borderRadius: radius.lg, backgroundColor: color.primary, transform: [{ scale: pressed ? 0.98 : 1 }] }, shadow.glow]}>
            <Text style={{ fontSize: 32 }}>👑</Text>
            <Text style={[type.headline, { color: color.onPrimary, flex: 1 }]}>{t('paywall.seePro')}</Text>
            <ChevronRight size={22} color={color.onPrimary} />
          </Pressable>
        </Animated.View>
      ) : (
        <View style={{ ...row, padding: 14, borderRadius: radius.lg, backgroundColor: color.brandSoft }}>
          <Text style={{ fontSize: 26 }}>👑</Text>
          <T.Head>{t('paywall.youArePro')}</T.Head>
        </View>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {LINKS.map((l, i) => (
          <Animated.View key={l.key} entering={ZoomIn.delay(150 + i * 40).springify()} style={{ flexBasis: '47%', flexGrow: 1 }}>
            <Pressable accessibilityRole="button" onPress={() => router.push(l.href)} style={({ pressed }) => [{ ...row, gap: 10, padding: 12, borderRadius: radius.lg, backgroundColor: TINTS[i % TINTS.length], transform: [{ scale: pressed ? 0.96 : 1 }] }, shadow.card]}>
              <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>{LINK_EMOJI[l.key]}</Text>
              </View>
              <Text numberOfLines={2} style={[type.subheadStrong, { color: color.text, flex: 1 }]}>{t(`more.links.${l.key}`)}</Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>

      <Card style={{ gap: 16 }}>
        <View style={row}>
          <Text style={{ fontSize: 22 }}>🔔</Text>
          <View style={{ flex: 1 }}><T.Head>{t('more.reminderLabel')}</T.Head></View>
          <Switch value={reminder} onValueChange={toggleReminder} trackColor={{ true: color.primary }} accessibilityLabel={t('more.reminderLabel')} />
        </View>
        {denied ? <T.Body>{t('more.notificationsDenied')}</T.Body> : null}
        <View style={row}>
          <Text style={{ fontSize: 22 }}>📲</Text>
          <View style={{ flex: 1 }}><T.Head>{t('more.notifications')} (push)</T.Head></View>
          <Switch value={push} onValueChange={togglePush} trackColor={{ true: color.primary }} accessibilityLabel={t('more.notifications')} />
        </View>
      </Card>

      <Card style={{ gap: 12 }}>
        <View style={row}>
          <Text style={{ fontSize: 22 }}>🌐</Text>
          <T.Head>{t('more.language')}</T.Head>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(Object.keys(LANGUAGES) as Lang[]).map((l) => <Chip key={l} label={LANGUAGES[l]} selected={i18n.language === l} onPress={() => setLanguage(l)} />)}
        </View>
      </Card>

      <T.Body style={{ textAlign: 'center' }}>🔒 {t('more.privacyNote')}</T.Body>
      <Button variant="tertiary" label={t('more.deleteAccount')} onPress={wipe} />
    </Screen>
  );
}
