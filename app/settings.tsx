import Constants from 'expo-constants';
import { Stack, useRouter } from 'expo-router';
import { Bell, BellRing, Check, ChevronDown, ChevronLeft, ChevronRight, FileText, Globe, History, Plus, RotateCcw, Shield, Trash2, type LucideIcon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProBanner, TAB_BG } from '@/components/AppHeader';
import { DogAvatar } from '@/components/ui';
import { useDogs } from '@/features/dog-profiles/store';
import { useJournal } from '@/features/journal/store';
import { PRIVACY_URL, TERMS_URL } from '@/lib/links';
import i18n, { LANGUAGES, setLanguage, type Lang } from '@/localization';
import { restore, usePurchases } from '@/services/purchases';
import { enablePush } from '@/services/push';
import { setDailyReminder } from '@/services/reminders';
import { supabase } from '@/services/supabase';
import { color, radius, shadow, type } from '@/theme/tokens';

const card = { backgroundColor: color.surface, ...shadow.card } as const;

export default function Settings() {
  const { t } = useTranslation();
  const router = useRouter();
  const { dogs, activeDogId, setActive, removeDog } = useDogs();
  const isPro = usePurchases((s) => s.isPro);
  const reminder = useJournal((st) => st.reminder);
  const setReminder = useJournal((st) => st.setReminder);
  const [push, setPush] = useState(false);
  const [denied, setDenied] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState('');
  const dogName = dogs.find((d) => d.id === activeDogId)?.name ?? '';

  const toggleReminder = async (v: boolean) => {
    const r = await setDailyReminder(v, dogName);
    setDenied(r === 'denied');
    setReminder(r === 'on');
  };
  const togglePush = async (v: boolean) => setPush(v ? await enablePush() : false);

  const doRestore = async () => {
    setRestoring(true);
    const ok = await restore();
    setRestoring(false);
    setRestoreMsg(ok ? t('paywall.restored') : t('paywall.nothingToRestore'));
  };

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
    <SafeAreaView style={{ flex: 1, backgroundColor: TAB_BG }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 52, paddingHorizontal: 16 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={8} onPress={() => router.back()} style={[{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface }, shadow.card]}>
          <ChevronLeft size={22} color={color.text} />
        </Pressable>
        <Text accessibilityRole="header" style={[type.title3, { flex: 1, textAlign: 'center', color: color.text, fontWeight: '800' }]}>{t('settings.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: 40, gap: 8 }} showsVerticalScrollIndicator={false}>
        {isPro ? (
          <View style={{ marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: color.primary }}>
            <Text style={{ fontSize: 24 }}>👑</Text>
            <Text style={[type.headline, { color: color.onPrimary, fontWeight: '800' }]}>{t('paywall.youArePro')}</Text>
          </View>
        ) : <ProBanner />}

        <Section title={t('settings.sections.dogs')}>
          {dogs.map((d, i) => {
            const on = d.id === activeDogId;
            return (
              <Row key={d.id} first={i === 0} onPress={() => setActive(d.id)} onLongPress={() => dogs.length > 1 && removeDog(d.id)}
                left={<DogAvatar name={d.name} uri={d.photoUri} size={36} selected={on} />}
                label={d.name} sub={d.breed}
                right={on ? <Check size={20} color={color.primary} strokeWidth={3} /> : null}
              />
            );
          })}
          <Row onPress={() => router.push('/dog/new')} left={<Tile Icon={Plus} bg={color.subtle} fg={color.text} />} label={t('profile.addDog')} right={<ChevronRight size={18} color={color.textTertiary} />} />
        </Section>

        <Section title={t('settings.sections.general')}>
          <Row first onPress={() => router.push('/history')} left={<Tile Icon={History} bg="#4C8DDB" />} label={t('more.links.history')} right={<ChevronRight size={18} color={color.textTertiary} />} />
          <Row left={<Tile Icon={Bell} bg="#F07A2A" />} label={t('more.reminderLabel')} sub={denied ? t('more.notificationsDenied') : undefined}
            right={<Switch value={reminder} onValueChange={toggleReminder} trackColor={{ true: color.primary }} accessibilityLabel={t('more.reminderLabel')} />} />
          <Row left={<Tile Icon={BellRing} bg="#A26BE8" />} label={t('settings.push')}
            right={<Switch value={push} onValueChange={togglePush} trackColor={{ true: color.primary }} accessibilityLabel={t('settings.push')} />} />
          <Row onPress={() => setLangOpen(!langOpen)} left={<Tile Icon={Globe} bg="#3CCB7F" />} label={t('more.language')}
            right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Text style={[type.subhead, { color: color.textSecondary }]}>{LANGUAGES[i18n.language as Lang]}</Text><ChevronDown size={18} color={color.textTertiary} style={{ transform: [{ rotate: langOpen ? '180deg' : '0deg' }] }} /></View>} />
          {langOpen ? (Object.keys(LANGUAGES) as Lang[]).map((l) => (
            <Row key={l} indent onPress={() => { setLanguage(l); setLangOpen(false); }} label={LANGUAGES[l]}
              right={i18n.language === l ? <Check size={18} color={color.primary} strokeWidth={3} /> : null} />
          )) : null}
        </Section>

        <Section title={t('settings.sections.support')}>
          <Row first onPress={restoring ? undefined : doRestore} left={<Tile Icon={RotateCcw} bg="#E8A400" />} label={t('paywall.restore')} sub={restoreMsg || undefined}
            right={restoring ? <ActivityIndicator color={color.primary} /> : <ChevronRight size={18} color={color.textTertiary} />} />
          <Row onPress={() => Linking.openURL(TERMS_URL)} left={<Tile Icon={FileText} bg="#6B7385" />} label={t('more.terms')} right={<ChevronRight size={18} color={color.textTertiary} />} />
          <Row onPress={() => Linking.openURL(PRIVACY_URL)} left={<Tile Icon={Shield} bg="#6B7385" />} label={t('more.privacy')} right={<ChevronRight size={18} color={color.textTertiary} />} />
        </Section>

        <Section>
          <Row first onPress={wipe} left={<Tile Icon={Trash2} bg={color.dangerSoft} fg={color.danger} />} label={t('more.deleteAccount')} danger />
        </Section>

        <Text style={[type.footnote, { color: color.textSecondary, textAlign: 'center', paddingHorizontal: 32, marginTop: 8 }]}>🔒 {t('more.privacyNote')}</Text>
        <Text style={[type.caption, { color: color.textTertiary, textAlign: 'center' }]}>{t('settings.version', { version: Constants.expoConfig?.version ?? '' })}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 16, gap: 8, marginTop: 12 }}>
      {title ? <Text style={[type.overline, { color: color.textSecondary, paddingHorizontal: 4 }]}>{title.toUpperCase()}</Text> : null}
      <View style={[{ borderRadius: radius.lg }, card]}><View style={{ borderRadius: radius.lg, overflow: 'hidden' }}>{children}</View></View>
    </View>
  );
}

function Tile({ Icon, bg, fg = color.onBrand }: { Icon: LucideIcon; bg: string; fg?: string }) {
  return (
    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={18} color={fg} />
    </View>
  );
}

function Row({ left, label, sub, right, onPress, onLongPress, first, indent, danger }: { left?: ReactNode; label: string; sub?: string; right?: ReactNode; onPress?: () => void; onLongPress?: () => void; first?: boolean; indent?: boolean; danger?: boolean }) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} disabled={!onPress && !onLongPress} onPress={onPress} onLongPress={onLongPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10, paddingLeft: indent ? 62 : 14, paddingRight: 14, backgroundColor: pressed ? color.subtle : 'transparent', borderTopWidth: first ? 0 : 1, borderTopColor: color.borderSubtle })}>
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={[type.body, { color: danger ? color.danger : color.text, fontWeight: '600' }]}>{label}</Text>
        {sub ? <Text numberOfLines={2} style={[type.footnote, { color: color.textSecondary }]}>{sub}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}
