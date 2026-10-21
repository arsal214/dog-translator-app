import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { Button, Chip, Screen, T } from '@/components/ui';
import { player, sineSource } from '@/lib/tone';
import { color, type } from '@/theme/tokens';

const MIN = 1000;
const MAX = 22000;
const STEP = 500;
const MAX_SECONDS = 15; // no continuous high-frequency playback
const PRESETS = { sit: 4000, stay: 8000, come: 12000, recall: 16000 } as const;

export default function Whistle() {
  const { t } = useTranslation();
  const [freq, setFreq] = useState<number>(PRESETS.come);
  const [playing, setPlaying] = useState(false);
  const p = useRef<ReturnType<typeof player>>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    p.current?.pause();
    p.current?.remove();
    p.current = null;
    setPlaying(false);
  };
  useEffect(() => stop, []);

  const start = () => {
    stop();
    p.current = player(sineSource(freq), { loop: true, volume: 0.5 });
    p.current.play();
    setPlaying(true);
    timer.current = setTimeout(stop, MAX_SECONDS * 1000);
  };

  const adjust = (d: number) => {
    setFreq((f) => Math.min(MAX, Math.max(MIN, f + d)));
    if (playing) stop(); // frequency changes require a new tone; user restarts deliberately
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: t('whistle.title'), headerTintColor: color.text }} />
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Text style={[type.numeric, { color: color.text }]}>{(freq / 1000).toFixed(1)} kHz</Text>
        <T.Body>{t('whistle.frequency')}</T.Body>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}><Button variant="secondary" label="− 0.5" onPress={() => adjust(-STEP)} /></View>
        <View style={{ flex: 1 }}><Button variant="secondary" label="+ 0.5" onPress={() => adjust(STEP)} /></View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => (
          <Chip key={k} label={`${t(`whistle.presets.${k}`)} · ${PRESETS[k] / 1000}k`} selected={freq === PRESETS[k]} onPress={() => { stop(); setFreq(PRESETS[k]); }} />
        ))}
      </View>
      <Button label={playing ? t('whistle.stop') : t('whistle.play')} onPress={playing ? stop : start} />
      <T.Body>{t('whistle.autoStop', { seconds: MAX_SECONDS })}</T.Body>
      <T.Body>{t('whistle.limitations')}</T.Body>
    </Screen>
  );
}
