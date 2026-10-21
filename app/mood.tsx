import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { Button, Card, Chip, MoodBadge, Screen, T, TextField } from '@/components/ui';
import { useActiveDog } from '@/features/dog-profiles/store';
import { dayKey, useJournal } from '@/features/journal/store';
import { color, mood as moods, type, type Mood } from '@/theme/tokens';

const WEEK = 7 * 24 * 3600 * 1000;

export default function MoodDiary() {
  const { t } = useTranslation();
  const dog = useActiveDog();
  const all = useJournal((s) => s.entries);
  const add = useJournal((s) => s.add);
  const [pick, setPick] = useState<Mood | null>(null);
  const [note, setNote] = useState('');

  const entries = all.filter((e) => e.dogId === dog?.id);
  const week = entries.filter((e) => e.at > Date.now() - WEEK);
  const dist = (Object.keys(moods) as Mood[]).map((m) => ({ m, n: week.filter((e) => e.mood === m).length })).filter((x) => x.n > 0);

  // Group by day for the timeline.
  const days = [...new Set(entries.map((e) => dayKey(e.at)))].slice(0, 14);

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: t('mood.title') }} />
      <T.Body>{t('mood.disclaimer')}</T.Body>

      <Card style={{ gap: 12 }}>
        <T.Head>{t('mood.week')}</T.Head>
        {dist.length === 0 ? <T.Body>{t('mood.weekEmpty')}</T.Body> : null}
        {dist.map(({ m, n }) => (
          <View key={m} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <MoodBadge mood={m} label={t(`moods.${m}`)} />
              <Text style={[type.subheadStrong, { color: color.text }]}>{n}</Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: color.subtle }}>
              <View style={{ height: 6, borderRadius: 3, width: `${(n / week.length) * 100}%`, backgroundColor: moods[m].fg }} />
            </View>
          </View>
        ))}
      </Card>

      <Card style={{ gap: 12 }}>
        <T.Head>{t('mood.addTitle', { name: dog?.name })}</T.Head>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(Object.keys(moods) as Mood[]).map((m) => <Chip key={m} label={t(`moods.${m}`)} selected={pick === m} onPress={() => setPick(m)} />)}
        </View>
        <TextField label={t('mood.note')} value={note} onChangeText={setNote} maxLength={280} />
        <Button
          label={t('common.save')}
          disabled={!pick || !dog}
          onPress={() => {
            if (!pick || !dog) return;
            add({ dogId: dog.id, kind: 'user', mood: pick, text: note.trim() || t('mood.noNote') });
            setPick(null);
            setNote('');
          }}
        />
      </Card>

      {days.map((d) => (
        <View key={d} style={{ gap: 8 }}>
          <T.Overline>{d}</T.Overline>
          {entries.filter((e) => dayKey(e.at) === d).map((e) => (
            <Card key={e.id} style={{ gap: 6 }}>
              <MoodBadge mood={e.mood} label={t(`moods.${e.mood}`)} />
              <Text style={{ color: color.text }}>{e.text}</Text>
              <T.Body>{t(`history.kind.${e.kind}`)}</T.Body>
            </Card>
          ))}
        </View>
      ))}
    </Screen>
  );
}
