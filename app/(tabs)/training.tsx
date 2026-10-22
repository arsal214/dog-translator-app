import { useRouter, type Href } from 'expo-router';
import { Check, ChevronRight, Flame, Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, TAB_BAR_SPACE, TAB_BG } from '@/components/AppHeader';
import { LEVELS, lessons, type Level } from '@/content/training';
import { useActiveDog } from '@/features/dog-profiles/store';
import { streak, useJournal } from '@/features/journal/store';
import { usePurchases } from '@/services/purchases';
import { color, radius, shadow, type } from '@/theme/tokens';

// Training tools and games live here with the lessons, instead of being scattered across Home and More.
const TOOLS: { key: string; art: number; href: Href; bg: string }[] = [
  { key: 'clicker', art: require('../../assets/illustrations/tool-clicker.png'), href: '/clicker', bg: '#3CCB7F' },
  { key: 'whistle', art: require('../../assets/illustrations/tool-whistle.png'), href: '/whistle', bg: '#4C8DDB' },
  { key: 'quiz', art: require('../../assets/illustrations/tool-quiz.png'), href: '/quiz', bg: '#A26BE8' },
  { key: 'games', art: require('../../assets/illustrations/tool-games.png'), href: '/games/bee', bg: '#F27A9B' },
];
const LEVEL_TONE: Record<Level, { bg: string; fg: string }> = {
  beginner: { bg: '#DDF7E9', fg: '#12A878' },
  intermediate: { bg: '#EAF2FC', fg: '#2F5BD3' },
  advanced: { bg: '#F1EDFB', fg: '#6B3FD4' },
};

export default function Training() {
  const { t, i18n } = useTranslation();
  const LESSONS = lessons(i18n.language);
  const router = useRouter();
  const dog = useActiveDog();
  const done = useJournal((s) => s.lessons);
  const isPro = usePurchases((s) => s.isPro);
  const mine = Object.entries(done).filter(([k]) => k.startsWith(`${dog?.id}:`));
  const count = mine.length;
  const pct = LESSONS.length ? count / LESSONS.length : 0;
  // First lesson not done yet, preferring ones the user can open now.
  const open = LESSONS.filter((l) => !done[`${dog?.id}:${l.id}`]);
  const next = open.find((l) => !l.pro || isPro) ?? open[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TAB_BG }} edges={['top']}>
      <AppHeader title={t('tabs.training')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 16, paddingTop: 4, paddingBottom: TAB_BAR_SPACE + 8 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()} style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.lg, backgroundColor: color.primary }, shadow.glow]}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: color.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={26} color="#F07A2A" fill="#F07A2A" />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[type.headline, { color: color.onPrimary, fontWeight: '800' }]}>{t('training.streak', { count: streak(mine.map(([, at]) => at)) })}</Text>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(34,48,90,0.18)' }}>
              <View style={{ height: 8, borderRadius: 4, width: `${Math.round(pct * 100)}%`, backgroundColor: color.brandStrong }} />
            </View>
            <Text style={[type.caption, { color: color.onPrimary }]}>{t('training.progress', { done: count, total: LESSONS.length })}</Text>
          </View>
        </Animated.View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {TOOLS.map((tool, i) => (
            <Animated.View key={tool.key} entering={FadeInDown.delay(60 + i * 50).springify()}>
              <Pressable accessibilityRole="button" onPress={() => router.push(tool.href)} style={({ pressed }) => ({ alignItems: 'center', gap: 6, width: 78, transform: [{ scale: pressed ? 0.94 : 1 }] })}>
                <View style={[{ width: 70, height: 70, borderRadius: 24, backgroundColor: tool.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)' }, shadow.card]}>
                  <Image source={tool.art} style={{ width: 54, height: 54 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                </View>
                <Text numberOfLines={1} style={[type.caption, { color: color.text, fontWeight: '700' }]}>{t(`trainingTools.${tool.key}`)}</Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {/* The next lesson to do, so the user always knows where to continue. */}
        {next ? (
          <Pressable accessibilityRole="button" onPress={() => router.push(next.pro && !isPro ? '/paywall?reason=training' : `/lesson/${next.id}`)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.xl, backgroundColor: color.brandStrong, transform: [{ scale: pressed ? 0.98 : 1 }] }, shadow.raised]}>
            <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 32 }}>{next.emoji}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[type.overline, { color: color.highlight }]}>{t('trainingTools.nextUp').toUpperCase()}</Text>
              <Text style={[type.title3, { color: color.onBrand, fontWeight: '800' }]}>{next.title}</Text>
              <Text style={[type.caption, { color: color.onBrandMuted }]}>⏱ {t('trainingTools.minutes', { count: next.minutes })} · {t(`trainingTools.levels.${next.level}`)}</Text>
            </View>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={22} color={color.onPrimary} />
            </View>
          </Pressable>
        ) : null}

        {LEVELS.map((level) => {
          const items = LESSONS.filter((l) => l.level === level);
          const doneHere = items.filter((l) => done[`${dog?.id}:${l.id}`]).length;
          const tone = LEVEL_TONE[level];
          return (
            <View key={level} style={{ gap: 10, marginTop: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[type.title3, { color: color.text, fontWeight: '800', flex: 1 }]}>{t(`trainingTools.levels.${level}`)}</Text>
                {level !== 'beginner' && !isPro ? <Text style={{ fontSize: 14 }}>👑</Text> : null}
                <View style={{ paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center', backgroundColor: tone.bg }}>
                  <Text style={[type.caption, { color: tone.fg, fontWeight: '800' }]}>{doneHere}/{items.length}</Text>
                </View>
              </View>
              {items.map((l, i) => {
                const locked = l.pro && !isPro;
                const complete = !!done[`${dog?.id}:${l.id}`];
                return (
                  <Animated.View key={l.id} entering={FadeInDown.delay(80 + i * 40).springify()}>
                    <Pressable accessibilityRole="button" onPress={() => router.push(locked ? '/paywall?reason=training' : `/lesson/${l.id}`)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: color.surface, opacity: locked ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, shadow.card]}>
                      <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: complete ? '#DDF7E9' : tone.bg, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 26 }}>{l.emoji}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[type.headline, { color: color.text }]}>{l.title}</Text>
                        <Text numberOfLines={1} style={[type.footnote, { color: color.textSecondary }]}>{l.summary}</Text>
                        <Text style={[type.caption, { color: color.textTertiary }]}>⏱ {t('trainingTools.minutes', { count: l.minutes })} · {t('trainingTools.steps', { count: l.steps.length })}</Text>
                      </View>
                      {locked ? (
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color.brandStrong, alignItems: 'center', justifyContent: 'center' }}><Lock size={15} color={color.highlight} /></View>
                      ) : complete ? (
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#3CCB7F', alignItems: 'center', justifyContent: 'center' }}><Check size={17} color={color.onBrand} strokeWidth={3} /></View>
                      ) : (
                        <ChevronRight size={22} color={color.textTertiary} />
                      )}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
