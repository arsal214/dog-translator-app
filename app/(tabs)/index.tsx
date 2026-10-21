import { useRouter, type Href } from 'expo-router';
import { AudioLines, Bell, Flame, Gamepad2, GraduationCap, Lightbulb, MessageCircle, Mic, MousePointerClick, Music, Palette, Plus, ScanFace, Volume2, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { DonutRing } from '@/components/DonutRing';
import { Card, DogAvatar, MoodBadge, Screen, T } from '@/components/ui';
import { useActiveDog, useDogs } from '@/features/dog-profiles/store';
import { dayKey, streak, useJournal } from '@/features/journal/store';
import i18n from '@/localization';
import { color, mood as moodTokens, radius, shadow, type, type Mood } from '@/theme/tokens';

const SHORTCUTS: { key: string; Icon: LucideIcon; href: Href }[] = [
  { key: 'sounds', Icon: Music, href: '/sounds' },
  { key: 'whistle', Icon: AudioLines, href: '/whistle' },
  { key: 'clicker', Icon: MousePointerClick, href: '/clicker' },
  { key: 'scanner', Icon: ScanFace, href: '/scanner' },
  { key: 'games', Icon: Gamepad2, href: '/games/bee' },
  { key: 'training', Icon: GraduationCap, href: '/(tabs)/training' },
  { key: 'assistant', Icon: MessageCircle, href: '/assistant' },
  { key: 'portraits', Icon: Palette, href: '/portraits' },
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
    <Screen>
      <Text style={[type.overline, { color: color.textSecondary }]}>{new Date().toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}><T.Title>{t(greeting, { name })}</T.Title></View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('more.notifications')} onPress={() => router.push('/(tabs)/more')} style={[{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' }, shadow.card]}>
          <Bell size={20} color={color.text} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingVertical: 4 }}>
        {dogs.map((d) => (
          <Pressable key={d.id} accessibilityRole="button" accessibilityState={{ selected: d.id === dog?.id }} onPress={() => setActive(d.id)} style={{ alignItems: 'center', gap: 4 }}>
            <DogAvatar name={d.name} uri={d.photoUri} size={56} selected={d.id === dog?.id} />
            <Text style={[type.caption, { color: d.id === dog?.id ? color.brandStrong : color.textSecondary }]}>{d.name}</Text>
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" accessibilityLabel={t('home.addDog')} onPress={() => router.push('/dog/new')} style={{ alignItems: 'center', gap: 4 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.textTertiary, alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={22} color={color.textSecondary} />
          </View>
          <Text style={[type.caption, { color: color.textSecondary }]}>{t('home.addDog')}</Text>
        </Pressable>
      </ScrollView>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <T.Overline>{t('home.todaysMood')}</T.Overline>
          <Text style={[type.title2, { color: color.text }]}>{top ? t(`moods.${top}`) : t('home.noMood')}</Text>
          {ranked.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {ranked.slice(0, 2).map((m) => <MoodBadge key={m} mood={m} label={t(`moods.${m}`)} />)}
            </View>
          ) : <T.Body>{t('home.noMoodBody', { name })}</T.Body>}
          {latest ? <T.Body>{t('home.latest', { text: latest.text })}</T.Body> : null}
          <Pressable accessibilityRole="button" onPress={() => router.push('/mood')}>
            <Text style={[type.subheadStrong, { color: color.brandStrong }]}>{t('home.viewDetails')} ›</Text>
          </Pressable>
        </View>
        <DonutRing size={104} segments={ranked.map((m) => ({ value: counts[m], color: moodTokens[m].fg }))}>
          <DogAvatar name={name} uri={dog?.photoUri} size={76} />
        </DonutRing>
      </Card>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <BigCard dark Icon={Mic} title={t('home.barkToHuman')} body={t('home.barkToHumanBody', { name })} cta={t('home.record')} onPress={() => router.push('/(tabs)/translate')} />
        <BigCard Icon={Volume2} title={t('home.humanToDog')} body={t('home.humanToDogBody')} cta={t('home.speakOrType')} onPress={() => router.push('/talk')} />
      </View>

      <T.Head>{t('home.tools')}</T.Head>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {SHORTCUTS.map(({ key, Icon, href }) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={t(`shortcuts.${key}`)}
            onPress={() => router.push(href)}
            style={{ width: '22%', flexGrow: 1, alignItems: 'center', gap: 6 }}
          >
            <View style={[{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' }, shadow.card]}>
              <Icon size={24} color={color.brandStrong} />
            </View>
            <Text style={[type.caption, { color: color.text }]}>{t(`shortcuts.${key}`)}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.push('/quiz')}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.brandSoft }}>
          <View style={{ width: 44, height: 44, borderRadius: radius.sm, backgroundColor: color.highlight, alignItems: 'center', justifyContent: 'center' }}>
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
        </Card>
      </Pressable>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T.Head>{t('home.recent')}</T.Head>
        <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/history')}><Text style={[type.subheadStrong, { color: color.textAccent }]}>{t('home.seeAll')}</Text></Pressable>
      </View>
      {entries.length === 0 ? <T.Body>{t('home.noRecent')}</T.Body> : entries.slice(0, 3).map((e) => (
        <Card key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <DogAvatar name={name} uri={dog?.photoUri} size={40} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text numberOfLines={1} style={[type.headline, { color: color.text }]}>“{e.text}”</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MoodBadge mood={e.mood} label={t(`moods.${e.mood}`)} />
              <Text style={[type.footnote, { color: color.textSecondary }]}>{name} · {new Date(e.at).toLocaleString(i18n.language, { dateStyle: 'short', timeStyle: 'short' })}</Text>
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

function BigCard({ Icon, title, body, cta, onPress, dark }: { Icon: LucideIcon; title: string; body: string; cta: string; onPress: () => void; dark?: boolean }) {
  const fg = dark ? color.onBrand : color.text;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ flex: 1 }}>
      <View style={[{ borderRadius: radius.lg, padding: 16, gap: 8, minHeight: 176, backgroundColor: dark ? color.brandStrong : color.brandSoft }, shadow.card]}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: dark ? color.primary : color.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={dark ? color.onPrimary : color.brandStrong} />
        </View>
        <Text style={[type.title3, { color: fg }]}>{title}</Text>
        <Text style={[type.footnote, { color: dark ? color.onBrandMuted : color.textSecondary }]}>{body}</Text>
        <Text style={[type.subheadStrong, { color: fg, marginTop: 'auto' }]}>{cta} ›</Text>
      </View>
    </Pressable>
  );
}
