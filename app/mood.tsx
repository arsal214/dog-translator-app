import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/ui';
import { useActiveDog } from '@/features/dog-profiles/store';
import { dayKey, useJournal } from '@/features/journal/store';
import i18n from '@/localization';
import { color, mood as moods, radius, shadow, type, type Mood } from '@/theme/tokens';

const WEEK = 7 * 24 * 3600 * 1000;
const MOOD_EMOJI: Record<Mood, string> = { happy: '😊', excited: '🤩', calm: '😌', anxious: '😟', playful: '🎾', alert: '👀' };
const KIND_EMOJI: Record<string, string> = { bark: '🐶', scan: '🔍', user: '✍️' };
// dayKey is a local YYYY-MM-DD; new Date('YYYY-MM-DD') would read it as UTC and can show the previous day.
const localDay = (key: string) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };

export default function MoodDiary() {
  const { t } = useTranslation();
  const dog = useActiveDog();
  const all = useJournal((s) => s.entries);
  const add = useJournal((s) => s.add);
  const [pick, setPick] = useState<Mood | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const name = dog?.name ?? '';

  const entries = all.filter((e) => e.dogId === dog?.id);
  const week = entries.filter((e) => e.at > Date.now() - WEEK);
  const dist = (Object.keys(moods) as Mood[]).map((m) => ({ m, n: week.filter((e) => e.mood === m).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  // Group by day for the timeline.
  const days = [...new Set(entries.map((e) => dayKey(e.at)))].slice(0, 14);

  const save = () => {
    if (!pick || !dog) return;
    add({ dogId: dog.id, kind: 'user', mood: pick, text: note.trim() || t('mood.noNote') });
    setPick(null);
    setNote('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={t('mood.title')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 18 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Check-in: tap a face, add an optional note, save. */}
        <View style={[{ padding: 16, borderRadius: radius.xl, backgroundColor: color.surface, gap: 14 }, shadow.card]}>
          <Text style={[type.title3, { color: color.text, fontWeight: '800' }]}>{t('mood.addTitle', { name })}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
            {(Object.keys(moods) as Mood[]).map((m) => {
              const on = pick === m;
              return (
                <Pressable key={m} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setPick(on ? null : m)} style={({ pressed }) => ({ width: '31.5%', transform: [{ scale: pressed ? 0.95 : on ? 1.04 : 1 }] })}>
                  <View style={{ alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: radius.lg, backgroundColor: moods[m].bg, borderWidth: 2.5, borderColor: on ? moods[m].fg : 'transparent' }}>
                    <Text style={{ fontSize: 30 }}>{MOOD_EMOJI[m]}</Text>
                    <Text style={[type.caption, { color: color.text, fontWeight: on ? '800' : '600' }]}>{t(`moods.${m}`)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          {pick ? (
            <Animated.View entering={FadeInDown.springify()} style={{ gap: 12 }}>
              <TextInput value={note} onChangeText={setNote} maxLength={280} placeholder={t('mood.note')} placeholderTextColor={color.textTertiary} accessibilityLabel={t('mood.note')} style={[type.body, { minHeight: 48, borderRadius: radius.md, paddingHorizontal: 14, backgroundColor: color.subtle, color: color.text }]} />
              <Button label={t('common.save')} onPress={save} />
            </Animated.View>
          ) : saved ? (
            <Text style={[type.subheadStrong, { color: '#12A878', textAlign: 'center' }]}>✓ {t('mood.saved')}</Text>
          ) : null}
        </View>

        {/* Week summary: one stacked bar plus a legend. */}
        <View style={[{ padding: 16, borderRadius: radius.xl, backgroundColor: color.surface, gap: 12 }, shadow.card]}>
          <Text style={[type.title3, { color: color.text, fontWeight: '800' }]}>{t('mood.week')}</Text>
          {dist.length === 0 ? (
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
              <Image source={require('../assets/illustrations/ai-mood.png')} style={{ width: 110, height: 110 }} resizeMode="contain" accessibilityIgnoresInvertColors />
              <Text style={[type.subhead, { color: color.textSecondary, textAlign: 'center' }]}>{t('mood.weekEmpty')}</Text>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2 }}>
                {dist.map(({ m, n }) => <View key={m} style={{ flex: n, backgroundColor: moods[m].fg }} />)}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {dist.map(({ m, n }) => (
                  <View key={m} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: moods[m].bg }}>
                    <Text style={{ fontSize: 14 }}>{MOOD_EMOJI[m]}</Text>
                    <Text style={[type.caption, { color: color.text, fontWeight: '700' }]}>{t(`moods.${m}`)} · {n}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {days.length ? <Text style={[type.title3, { color: color.text, fontWeight: '800' }]}>{t('mood.timeline')}</Text> : null}
        {days.map((d) => (
          <View key={d} style={{ gap: 8 }}>
            <Text style={[type.overline, { color: color.textSecondary }]}>{localDay(d).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase()}</Text>
            {entries.filter((e) => dayKey(e.at) === d).map((e) => (
              <View key={e.id} style={[{ flexDirection: 'row', gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: color.surface }, shadow.card]}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: moods[e.mood].bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 22 }}>{MOOD_EMOJI[e.mood]}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[type.subheadStrong, { color: moods[e.mood].fg }]}>{t(`moods.${e.mood}`)}</Text>
                    <Text style={[type.caption, { color: color.textTertiary }]}>{KIND_EMOJI[e.kind] ?? '•'} {t(`history.kind.${e.kind}`)} · {new Date(e.at).toLocaleTimeString(i18n.language, { hour: 'numeric', minute: '2-digit' })}</Text>
                  </View>
                  <Text style={[type.subhead, { color: color.text }]}>{e.text}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}

        <Text style={[type.caption, { color: color.textTertiary, textAlign: 'center', paddingHorizontal: 12 }]}>{t('mood.disclaimer')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
