import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Clock, MousePointerClick } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/ui';
import { lessons } from '@/content/training';
import { useActiveDog } from '@/features/dog-profiles/store';
import { useJournal } from '@/features/journal/store';
import { usePurchases } from '@/services/purchases';
import { color, radius, shadow, type } from '@/theme/tokens';

const LEVEL_BG = { beginner: '#DDF7E9', intermediate: '#EAF2FC', advanced: '#F1EDFB' } as const;
const LEVEL_FG = { beginner: '#12A878', intermediate: '#2F5BD3', advanced: '#6B3FD4' } as const;

export default function Lesson() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dog = useActiveDog();
  const isPro = usePurchases((s) => s.isPro);
  const complete = useJournal((s) => s.completeLesson);
  const doneAt = useJournal((s) => (dog ? s.lessons[`${dog.id}:${id}`] : undefined));
  const lesson = lessons(i18n.language).find((l) => l.id === id);
  // Steps ticked in this session only; the lesson itself is saved with "Mark complete".
  const [ticked, setTicked] = useState<number[]>([]);

  const shell = (children: ReactNode) => (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={lesson?.title ?? t('tabs.training')} />
      {children}
    </SafeAreaView>
  );

  if (!lesson) return shell(<Text style={[type.body, { color: color.textSecondary, padding: 24, textAlign: 'center' }]}>{t('training.notFound')}</Text>);
  if (lesson.pro && !isPro)
    return shell(
      <View style={{ padding: 24, gap: 16, alignItems: 'center' }}>
        <Text style={{ fontSize: 56 }}>👑</Text>
        <Text style={[type.title3, { color: color.text, textAlign: 'center' }]}>{t('training.proOnly')}</Text>
        <View style={{ alignSelf: 'stretch' }}><Button label={t('paywall.seePro')} onPress={() => router.replace('/paywall?reason=training')} /></View>
      </View>,
    );

  const name = dog?.name ?? '';
  const all = ticked.length === lesson.steps.length;
  const toggle = (i: number) => {
    Haptics.selectionAsync().catch(() => {});
    setTicked((x) => (x.includes(i) ? x.filter((n) => n !== i) : [...x, i]));
  };

  return shell(
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 16 }} showsVerticalScrollIndicator={false}>
      {/* Hero: what we're teaching and why. */}
      <Animated.View entering={FadeInDown.springify()} style={[{ padding: 18, borderRadius: radius.xl, backgroundColor: LEVEL_BG[lesson.level], gap: 12 }, shadow.card]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Animated.View entering={ZoomIn.springify()} style={[{ width: 72, height: 72, borderRadius: 24, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' }, shadow.card]}>
            <Text style={{ fontSize: 38 }}>{lesson.emoji}</Text>
          </Animated.View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[type.title2, { color: color.text, fontWeight: '800' }]}>{lesson.title}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Pill fg={LEVEL_FG[lesson.level]}>{t(`trainingTools.levels.${lesson.level}`)}</Pill>
              <Pill fg={color.textSecondary}><Clock size={12} color={color.textSecondary} /> {t('trainingTools.minutes', { count: lesson.minutes })}</Pill>
              {doneAt ? <Pill fg="#12A878">✓ {t('trainingTools.completed')}</Pill> : null}
            </View>
          </View>
        </View>
        <Text style={[type.subhead, { color: color.text }]}>{lesson.summary}</Text>
        <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.7)' }}>
          <Text style={{ fontSize: 16 }}>🎯</Text>
          <Text style={[type.footnote, { color: color.text, flex: 1 }]}><Text style={{ fontWeight: '800' }}>{t('trainingTools.goal')}: </Text>{lesson.goal}</Text>
        </View>
      </Animated.View>

      {/* Steps: tap to tick off while practising. */}
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[type.title3, { color: color.text, fontWeight: '800', flex: 1 }]}>{t('trainingTools.howTo')}</Text>
          <Text style={[type.caption, { color: color.textSecondary, fontWeight: '700' }]}>{ticked.length}/{lesson.steps.length}</Text>
        </View>
        {lesson.steps.map((step, i) => {
          const on = ticked.includes(i);
          return (
            <Pressable key={i} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggle(i)} style={({ pressed }) => [{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: on ? '#F0FBF5' : color.surface, borderWidth: 1.5, borderColor: on ? '#BDEBD2' : 'transparent', transform: [{ scale: pressed ? 0.98 : 1 }] }, shadow.card]}>
              <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? '#3CCB7F' : color.brandSoft }}>
                {on ? <Check size={16} color={color.onBrand} strokeWidth={3} /> : <Text style={[type.subheadStrong, { color: color.textAccent }]}>{i + 1}</Text>}
              </View>
              <Text style={[type.callout, { color: on ? color.textSecondary : color.text, flex: 1, textDecorationLine: on ? 'line-through' : 'none' }]}>{step}</Text>
            </Pressable>
          );
        })}
      </View>

      <Section emoji="💡" title={t('trainingTools.tips')} bg={color.highlightSoft} items={lesson.tips} />
      <Section emoji="⚠️" title={t('trainingTools.mistakes')} bg={color.dangerSoft} items={lesson.mistakes} />

      <Pressable accessibilityRole="button" onPress={() => router.push('/clicker')} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: color.surface, transform: [{ scale: pressed ? 0.98 : 1 }] }, shadow.card]}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#DDF7E9', alignItems: 'center', justifyContent: 'center' }}>
          <MousePointerClick size={20} color="#12A878" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[type.headline, { color: color.text }]}>{t('training.openClicker')}</Text>
          <Text style={[type.caption, { color: color.textSecondary }]}>{t('trainingTools.clickerHint')}</Text>
        </View>
      </Pressable>

      <Button
        label={doneAt ? `✓ ${t('trainingTools.practisedAgain')}` : all ? `🎉 ${t('training.markDone')}` : t('training.markDone')}
        onPress={() => {
          if (dog) complete(dog.id, lesson.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          router.back();
        }}
      />
      <Text style={[type.caption, { color: color.textTertiary, textAlign: 'center', paddingHorizontal: 12 }]}>💛 {t('training.humane')}{name ? ` ${t('trainingTools.goodLuck', { name })}` : ''}</Text>
    </ScrollView>,
  );
}

function Pill({ children, fg }: { children: ReactNode; fg: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: color.surface }}>
      <Text style={[type.caption, { color: fg, fontWeight: '800' }]}>{children}</Text>
    </View>
  );
}

function Section({ emoji, title, bg, items }: { emoji: string; title: string; bg: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <View style={{ padding: 16, borderRadius: radius.lg, backgroundColor: bg, gap: 8 }}>
      <Text style={[type.headline, { color: color.text }]}>{emoji} {title}</Text>
      {items.map((x) => (
        <View key={x} style={{ flexDirection: 'row', gap: 8 }}>
          <Text style={[type.subhead, { color: color.text }]}>•</Text>
          <Text style={[type.subhead, { color: color.text, flex: 1 }]}>{x}</Text>
        </View>
      ))}
    </View>
  );
}
