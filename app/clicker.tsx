import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Switch, Text, View } from 'react-native';
import { Screen, Segmented, T } from '@/components/ui';
import { clickSource, player } from '@/lib/tone';
import { color, shadow, type } from '@/theme/tokens';

const TONES = { soft: [1200, 60], classic: [2400, 90], sharp: [3600, 140] } as const;
type Tone = keyof typeof TONES;

export default function Clicker() {
  const { t } = useTranslation();
  const [tone, setTone] = useState<Tone>('classic');
  const [sound, setSound] = useState(true);
  const [haptics, setHaptics] = useState(true);

  // One preloaded player per tone so taps respond immediately and work offline.
  const players = useMemo(
    () => Object.fromEntries((Object.keys(TONES) as Tone[]).map((k) => [k, player(clickSource(k, TONES[k][0], TONES[k][1]))])) as Record<Tone, ReturnType<typeof player>>,
    [],
  );
  useEffect(() => () => Object.values(players).forEach((p) => p.remove()), [players]);

  const click = () => {
    if (sound) {
      const p = players[tone];
      p.seekTo(0);
      p.play();
    }
    if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: t('clicker.title'), headerTintColor: color.text }} />
      <T.Body>{t('clicker.hint')}</T.Body>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('clicker.title')}
        onPressIn={click}
        style={({ pressed }) => [{ alignSelf: 'center', width: 220, height: 220, borderRadius: 110, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? color.primaryPressed : color.primary, marginVertical: 24 }, shadow.glow]}
      >
        <Text style={[type.title2, { color: color.onPrimary }]}>{t('clicker.title')}</Text>
      </Pressable>
      <T.Head>{t('clicker.tone')}</T.Head>
      <Segmented value={tone} onChange={setTone} options={(Object.keys(TONES) as Tone[]).map((k) => ({ key: k, label: t(`clicker.tones.${k}`) }))} />
      <Row label={t('clicker.sound')} value={sound} onChange={setSound} />
      <Row label={t('clicker.haptics')} value={haptics} onChange={setHaptics} />
    </Screen>
  );
}

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <T.Head>{label}</T.Head>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: color.primary }} accessibilityLabel={label} />
    </View>
  );
}
