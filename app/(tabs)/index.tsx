import { useRouter, type Href } from 'expo-router';
import { ArrowRight, AudioLines, ChevronRight, Flame, Gamepad2, GraduationCap, Lightbulb, MessageCircle, Mic, MousePointerClick, Music, Palette, Plus, ScanFace, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { DonutRing } from '@/components/DonutRing';
import { Card, DogAvatar, MoodBadge, Screen, T } from '@/components/ui';
import { Halo, HeroBackdrop } from '@/features/dog-profiles/HeroDecor';
import { useActiveDog, useDogs } from '@/features/dog-profiles/store';
import { dayKey, streak, useJournal } from '@/features/journal/store';
import i18n from '@/localization';
import { color, mood as moodTokens, radius, shadow, type, type Mood } from '@/theme/tokens';

const SHORTCUTS: { key: string; Icon: LucideIcon; href: Href; tint: { bg: string; fg: string } }[] = [
  { key: 'sounds', Icon: Music, href: '/sounds', tint: { bg: '#FFF1CC', fg: '#B07800' } },
  { key: 'whistle', Icon: AudioLines, href: '/whistle', tint: { bg: '#E3EDFF', fg: '#2F5BD3' } },
  { key: 'clicker', Icon: MousePointerClick, href: '/clicker', tint: { bg: '#DFF5E8', fg: '#1E8A4C' } },
  { key: 'scanner', Icon: ScanFace, href: '/scanner', tint: { bg: '#EFE5FF', fg: '#6B3FD4' } },
  { key: 'games', Icon: Gamepad2, href: '/games/bee', tint: { bg: '#FFE3EC', fg: '#C22E63' } },
  { key: 'training', Icon: GraduationCap, href: '/training', tint: { bg: '#DDF4F4', fg: '#127C7C' } },
  { key: 'assistant', Icon: MessageCircle, href: '/assistant', tint: { bg: '#E6E8FF', fg: '#3F48C9' } },
  { key: 'portraits', Icon: Palette, href: '/portraits', tint: { bg: '#FFE9DC', fg: '#C2531B' } },
];

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const dog = useActiveDog();
  const dogs = useDogs((s) => s.dogs);
  const setActive = useDogs((s) => s.setActive);
  const name = dog?.name ?? '';
  const all = useJournal((s) => s.entries);
  const quiz = useJournal((s) => s.quiz);

  const entries = all.filter((e) => e.dogId === dog?.id);
  const today = entries.filter((e) => dayKey(e.at) === dayKey());
  const counts = today.reduce<Record<string, number>>((a, e) => ({ ...a, [e.mood]: (a[e.mood] ?? 0) + 1 }), {});
  const ranked = (Object.keys(counts) as Mood[]).sort((a, b) => counts[b] - counts[a]);
  const top = ranked[0];
  const latest = today[0];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'home.greetingMorning' : hour < 18 ? 'home.greetingAfternoon' : 'home.greetingEvening';

  return (
    <Screen style={{ gap: 20, paddingBottom: 40 }}>
      {/* Hero: greeting, today's mood and the active dog */}
      <Animated.View entering={FadeInDown.springify()} style={[{ borderRadius: radius.xl, overflow: 'hidden', padding: 20, gap: 16 }, shadow.raised]}>
        <HeroBackdrop />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[type.overline, { color: color.onBrandMuted }]}>{new Date().toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}</Text>
            <Text style={[type.title1, { color: color.onBrand }]}>{t(greeting, { name })}</Text>
          </View>
          <View style={{ width: 84, height: 84 }}>
            <Halo size={84} />
            <DonutRing size={84} segments={ranked.map((m) => ({ value: counts[m], color: moodTokens[m].fg }))}>
              <DogAvatar name={name} uri={dog?.photoUri} size={64} />
            </DonutRing>
          </View>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/mood')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.14)' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[type.caption, { color: color.onBrandMuted }]}>{t('home.todaysMood').toUpperCase()}</Text>
            <Text style={[type.headline, { color: color.onBrand }]}>{top ? t(`moods.${top}`) : t('home.noMood')}</Text>
          </View>
          {top ? <MoodBadge mood={top} label={t(`moods.${top}`)} /> : null}
          <ChevronRight size={20} color={color.onBrandMuted} />
        </Pressable>
      </Animated.View>

      {/* Dog switcher only when there's something to switch between */}
      {dogs.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
          {dogs.map((d) => (
            <Pressable key={d.id} accessibilityRole="button" accessibilityState={{ selected: d.id === dog?.id }} onPress={() => setActive(d.id)} style={{ alignItems: 'center', gap: 4 }}>
              <DogAvatar name={d.name} uri={d.photoUri} size={52} selected={d.id === dog?.id} />
              <Text style={[type.caption, { color: d.id === dog?.id ? color.brandStrong : color.textSecondary }]}>{d.name}</Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" accessibilityLabel={t('home.addDog')} onPress={() => router.push('/dog/new')} style={{ alignItems: 'center', gap: 4 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.textTertiary, alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={20} color={color.textSecondary} />
            </View>
            <Text style={[type.caption, { color: color.textSecondary }]}>{t('home.addDog')}</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      <Animated.View entering={FadeInDown.delay(120).springify()} style={{ flexDirection: 'row', gap: 12 }}>
        <ModeCard dark from="🐶" to="🗣️" title={t('home.barkToHuman')} body={t('home.barkToHumanBody', { name })} onPress={() => router.push('/(tabs)/translate?mode=bark')} />
        <ModeCard from="🗣️" to="🐶" title={t('home.humanToDog')} body={t('home.humanToDogBody')} onPress={() => router.push('/(tabs)/translate?mode=human')} />
      </Animated.View>

      <View style={{ gap: 12 }}>
        <T.Head>{t('home.tools')}</T.Head>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 }}>
          {SHORTCUTS.map(({ key, Icon, href, tint }, i) => (
            <Animated.View key={key} entering={ZoomIn.delay(200 + i * 50).springify()} style={{ width: '25%' }}>
            <Pressable accessibilityRole="button" accessibilityLabel={t(`shortcuts.${key}`)} onPress={() => router.push(href)} style={({ pressed }) => ({ alignItems: 'center', gap: 6, transform: [{ scale: pressed ? 0.92 : 1 }] })}>
              <View style={[{ width: 62, height: 62, borderRadius: 20, backgroundColor: tint.bg, alignItems: 'center', justifyContent: 'center' }, shadow.card]}>
                <Icon size={28} color={tint.fg} />
              </View>
              <Text numberOfLines={1} style={[type.caption, { color: color.text }]}>{t(`shortcuts.${key}`)}</Text>
            </Pressable>
            </Animated.View>
          ))}
        </View>
      </View>

      <Animated.View entering={FadeInDown.delay(300).springify()}>
      <Pressable accessibilityRole="button" onPress={() => router.push('/quiz')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.lg, backgroundColor: color.brandSoft }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.highlight, alignItems: 'center', justifyContent: 'center' }}>
            <Lightbulb size={22} color={color.textHighlight} />
          </View>
          <View style={{ flex: 1 }}>
            <T.Head>{t('home.dailyQuiz')}</T.Head>
            <T.Body>{t('home.dailyQuizBody')}</T.Body>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 30, borderRadius: radius.full, backgroundColor: color.surface }}>
            <Flame size={14} color="#F59A4A" />
            <Text style={[type.caption, { color: color.text }]}>{t('quiz.streak', { count: streak(Object.keys(quiz).map((d) => new Date(d).getTime())) })}</Text>
          </View>
        </View>
      </Pressable>
      </Animated.View>

      {entries.length > 0 ? (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T.Head>{t('home.recent')}</T.Head>
            <Pressable accessibilityRole="button" onPress={() => router.push('/history')}><Text style={[type.subheadStrong, { color: color.textAccent }]}>{t('home.seeAll')}</Text></Pressable>
          </View>
          {entries.slice(0, 3).map((e) => (
            <Card key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 6, alignSelf: 'stretch', borderRadius: 3, backgroundColor: moodTokens[e.mood].fg }} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text numberOfLines={1} style={[type.headline, { color: color.text }]}>“{e.text}”</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MoodBadge mood={e.mood} label={t(`moods.${e.mood}`)} />
                  <Text style={[type.footnote, { color: color.textSecondary }]}>{new Date(e.at).toLocaleString(i18n.language, { dateStyle: 'short', timeStyle: 'short' })}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

/** Big entry card for a translation direction, with the same 🐶 → 🗣️ badges as the record screen. */
function ModeCard({ from, to, title, body, onPress, dark }: { from: string; to: string; title: string; body: string; onPress: () => void; dark?: boolean }) {
  const fg = dark ? color.onBrand : color.text;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <View style={[{ borderRadius: radius.lg, padding: 16, gap: 10, minHeight: 172, overflow: 'hidden', backgroundColor: dark ? color.brandStrong : color.brandSoft }, shadow.card]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 26 }}>{from}</Text>
          <ArrowRight size={16} color={dark ? color.primary : color.textAccent} strokeWidth={3} />
          <Text style={{ fontSize: 26 }}>{to}</Text>
        </View>
        <Text style={[type.title3, { color: fg }]}>{title}</Text>
        <Text numberOfLines={3} style={[type.footnote, { color: dark ? color.onBrandMuted : color.textSecondary }]}>{body}</Text>
        <View style={{ marginTop: 'auto', alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: radius.full, backgroundColor: dark ? color.primary : color.surface }}>
          <Mic size={14} color={dark ? color.onPrimary : color.brandStrong} />
          <Text style={[type.caption, { color: dark ? color.onPrimary : color.brandStrong, fontWeight: '700' }]}>{title}</Text>
        </View>
      </View>
    </Pressable>
  );
}
