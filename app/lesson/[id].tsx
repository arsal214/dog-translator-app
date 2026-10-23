import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ChevronRight, Clock, Footprints, Lightbulb, MousePointerClick, Target, TriangleAlert, X } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withSpring, withTiming, ZoomIn } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/ui';
import { lessons } from '@/content/training';
import { useActiveDog } from '@/features/dog-profiles/store';
import { useJournal } from '@/features/journal/store';
import { usePurchases } from '@/services/purchases';
import { color, radius, shadow, type } from '@/theme/tokens';

const LEVEL_BG = { beginner: '#DDF7E9', intermediate: '#EAF2FC', advanced: '#F1EDFB' } as const;
const LEVEL_FG = { beginner: '#12A878', intermediate: '#2F5BD3', advanced: '#6B3FD4' } as const;
// Brighter level accents for use on the navy hero.
const LEVEL_ON_DARK = { beginner: '#5BE3A9', intermediate: '#8DB4FF', advanced: '#B79BFF' } as const;
const DONE = '#3CCB7F';

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
  const insets = useSafeAreaInsets(); // hooks stay above the early returns below

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
    <>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 + insets.bottom, gap: 16 }} showsVerticalScrollIndicator={false}>
        {/* Hero: what we're teaching and why, on the brand navy with an amber glow. */}
        {/* Shadow on the outer view; iOS clips shadows on views with overflow hidden. */}
        <Animated.View entering={FadeInDown.springify()} style={[{ borderRadius: radius.xl, backgroundColor: color.brandStrong }, shadow.raised]}>
          <View style={{ borderRadius: radius.xl, overflow: 'hidden' }}>
            <HeroBackground />
            <View style={{ padding: 20, gap: 16 }}>
              <View style={{ alignItems: 'center', gap: 10, paddingTop: 6 }}>
                <FloatingEmoji emoji={lesson.emoji} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)' }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: LEVEL_ON_DARK[lesson.level] }} />
                  <Text style={[type.caption, { color: LEVEL_ON_DARK[lesson.level], fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 }]}>{t(`trainingTools.levels.${lesson.level}`)}</Text>
                </View>
                <Text style={[type.title1, { color: color.onBrand, fontWeight: '800', textAlign: 'center' }]}>{lesson.title}</Text>
                <Text style={[type.callout, { color: color.onBrandMuted, textAlign: 'center' }]}>{lesson.summary}</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Stat icon={<Clock size={16} color={color.highlight} strokeWidth={2.5} />} label={t('trainingTools.minutes', { count: lesson.minutes })} />
                <Stat icon={<Footprints size={16} color={color.highlight} strokeWidth={2.5} />} label={t('trainingTools.steps', { count: lesson.steps.length })} />
                {doneAt ? <Stat icon={<Check size={16} color={DONE} strokeWidth={3} />} label={t('trainingTools.completed')} /> : null}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: color.surface }}>
                <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Target size={20} color={color.onPrimary} strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[type.caption, { color: color.textAccent, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 }]}>{t('trainingTools.goal')}</Text>
                  <Text style={[type.subheadStrong, { color: color.text }]}>{lesson.goal}</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Steps: a timeline to tick off while practising; the next step is highlighted. */}
        <View style={{ gap: 12 }}>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[type.title3, { color: color.text, fontWeight: '800', flex: 1 }]}>{t('trainingTools.howTo')}</Text>
              <View style={{ paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center', backgroundColor: all ? DONE : color.surface }}>
                <Text style={[type.caption, { color: all ? color.onBrand : color.text, fontWeight: '800' }]}>{all ? '🎉 ' : ''}{ticked.length}/{lesson.steps.length}</Text>
              </View>
            </View>
            <Progress value={ticked.length / lesson.steps.length} tint={all ? DONE : color.primary} />
          </View>
          <View>
            {lesson.steps.map((step, i) => {
              const on = ticked.includes(i);
              const next = !on && i === lesson.steps.findIndex((_, n) => !ticked.includes(n));
              const last = i === lesson.steps.length - 1;
              return (
                <Animated.View key={i} entering={FadeInDown.delay(80 + i * 60).springify()} style={{ flexDirection: 'row', gap: 12 }}>
                  {/* Rail: number bubble with a connector down to the next step. */}
                  <View style={{ alignItems: 'center', width: 34 }}>
                    <Animated.View key={on ? 'on' : 'off'} entering={on ? ZoomIn.springify().damping(9) : undefined} style={[{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginTop: 12, backgroundColor: on ? DONE : next ? color.primary : color.surface, borderWidth: on || next ? 0 : 2, borderColor: color.border }, next ? shadow.glow : null]}>
                      {on ? <Check size={17} color={color.onBrand} strokeWidth={3} /> : <Text style={[type.subheadStrong, { color: next ? color.onPrimary : color.textSecondary, fontWeight: '800' }]}>{i + 1}</Text>}
                    </Animated.View>
                    {!last ? <View style={{ flex: 1, width: 3, borderRadius: 2, marginVertical: 4, backgroundColor: on ? DONE : color.border }} /> : null}
                  </View>
                  <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggle(i)} style={({ pressed }) => [{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginBottom: last ? 0 : 10, borderRadius: radius.lg, backgroundColor: on ? '#F0FBF5' : color.surface, borderWidth: 1.5, borderColor: on ? '#BDEBD2' : next ? color.primary : 'transparent', transform: [{ scale: pressed ? 0.98 : 1 }] }, shadow.card]}>
                    <Text style={[type.callout, { color: on ? color.textSecondary : color.text, flex: 1, textDecorationLine: on ? 'line-through' : 'none' }]}>{step}</Text>
                    {on ? null : <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: next ? color.primary : color.border }} />}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>

        <Section icon={<Lightbulb size={18} color={color.onBrand} strokeWidth={2.5} />} tint={color.primaryPressed} title={t('trainingTools.tips')} bg={color.highlightSoft} items={lesson.tips} bullet={<Check size={14} color={color.primaryPressed} strokeWidth={3} />} />
        <Section icon={<TriangleAlert size={18} color={color.onBrand} strokeWidth={2.5} />} tint={color.danger} title={t('trainingTools.mistakes')} bg={color.dangerSoft} items={lesson.mistakes} bullet={<X size={14} color={color.danger} strokeWidth={3} />} />

        <Pressable accessibilityRole="button" onPress={() => router.push('/clicker')} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: color.surface, transform: [{ scale: pressed ? 0.98 : 1 }] }, shadow.card]}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#DDF7E9', alignItems: 'center', justifyContent: 'center' }}>
            <MousePointerClick size={20} color="#12A878" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.headline, { color: color.text }]}>{t('training.openClicker')}</Text>
            <Text style={[type.caption, { color: color.textSecondary }]}>{t('trainingTools.clickerHint')}</Text>
          </View>
          <ChevronRight size={20} color={color.textTertiary} />
        </Pressable>

        <Text style={[type.caption, { color: color.textTertiary, textAlign: 'center', paddingHorizontal: 12 }]}>💛 {t('training.humane')}{name ? ` ${t('trainingTools.goodLuck', { name })}` : ''}</Text>
      </ScrollView>
      {/* Sticky action so "Mark complete" is always one tap away. */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: 'rgba(246,246,248,0.94)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border }}>
        <Button
          label={doneAt ? `✓ ${t('trainingTools.practisedAgain')}` : all ? `🎉 ${t('training.markDone')}` : t('training.markDone')}
          onPress={() => {
            if (dog) complete(dog.id, lesson.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            router.back();
          }}
        />
      </View>
    </>,
  );
}

function HeroBackground() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id="heroBg" x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor={color.brandDeep} />
          <Stop offset="1" stopColor={color.brandStrong} />
        </LinearGradient>
        <RadialGradient id="heroGlow" cx="50%" cy="22%" rx="55%" ry="32%">
          <Stop offset="0" stopColor={color.primary} stopOpacity="0.5" />
          <Stop offset="1" stopColor={color.primary} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#heroBg)" />
      <Rect width="100%" height="100%" fill="url(#heroGlow)" />
      {/* Sparkles. */}
      <Circle cx="12%" cy="10%" r="3" fill={color.highlight} fillOpacity={0.9} />
      <Circle cx="86%" cy="16%" r="4" fill={color.highlight} fillOpacity={0.7} />
      <Circle cx="78%" cy="6%" r="2" fill="#FFFFFF" fillOpacity={0.8} />
      <Circle cx="22%" cy="30%" r="2" fill="#FFFFFF" fillOpacity={0.6} />
      <Circle cx="94%" cy="40%" r="2.5" fill="#FFFFFF" fillOpacity={0.5} />
      <Circle cx="100%" cy="100%" r="90" fill="#FFFFFF" fillOpacity={0.04} />
    </Svg>
  );
}

/** The lesson emoji in a white tile, gently bobbing (still when Reduce Motion is on). */
function FloatingEmoji({ emoji }: { emoji: string }) {
  const calm = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (!calm) y.value = withRepeat(withSequence(withTiming(-6, { duration: 1400, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) })), -1);
  }, [calm, y]);
  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { rotate: '-6deg' }] }));
  return (
    <Animated.View entering={ZoomIn.delay(120).springify()}>
      <Animated.View style={[{ width: 96, height: 96, borderRadius: 32, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: color.highlight }, shadow.glow, bob]}>
        <Text style={{ fontSize: 54 }}>{emoji}</Text>
      </Animated.View>
    </Animated.View>
  );
}

function Stat({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
      {icon}
      <Text numberOfLines={1} style={[type.footnote, { color: color.onBrand, fontWeight: '700' }]}>{label}</Text>
    </View>
  );
}

function Progress({ value, tint }: { value: number; tint: string }) {
  const p = useSharedValue(value);
  useEffect(() => { p.value = withSpring(value, { damping: 18, stiffness: 140 }); }, [value, p]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, p.value)) * 100}%` }));
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: color.subtle, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', borderRadius: 4, backgroundColor: tint }, fill]} />
    </View>
  );
}

function Section({ icon, tint, title, bg, items, bullet }: { icon: ReactNode; tint: string; title: string; bg: string; items: string[]; bullet: ReactNode }) {
  if (!items.length) return null;
  return (
    <View style={{ padding: 16, borderRadius: radius.lg, backgroundColor: bg, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
        <Text style={[type.headline, { color: color.text, fontWeight: '800' }]}>{title}</Text>
      </View>
      {items.map((x) => (
        <View key={x} style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, marginTop: 1, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' }}>{bullet}</View>
          <Text style={[type.subhead, { color: color.text, flex: 1 }]}>{x}</Text>
        </View>
      ))}
    </View>
  );
}
