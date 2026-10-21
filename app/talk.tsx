import { Stack, useRouter } from 'expo-router';
import { Check, Info, Mic } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Chip, Screen, Segmented, T } from '@/components/ui';
import { PHRASES, PHRASE_SOUNDS, type Phrase } from '@/content/sounds';
import { useActiveDog } from '@/features/dog-profiles/store';
import { matchPhrase } from '@/lib/phrase';
import { playAsset, stopPlayback } from '@/lib/playback';
import { listenOnce } from '@/lib/speech';
import i18n from '@/localization';
import { color, radius, shadow, type } from '@/theme/tokens';

type Size = 'small' | 'medium' | 'big';
const SIZES: Size[] = ['small', 'medium', 'big'];
const GLYPH: Record<Size, string> = { small: 'S', medium: 'M', big: 'L' };

export default function Talk() {
  const { t } = useTranslation();
  const router = useRouter();
  const dog = useActiveDog();
  const [mode, setMode] = useState<'speak' | 'type'>('type');
  const [size, setSize] = useState<Size>(dog?.voice ?? 'medium');
  const [vol, setVol] = useState(0.5);
  const [phrase, setPhrase] = useState<Phrase>('come');
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [listening, setListening] = useState(false);

  // Match against the current language and English, so either works.
  const labels = Object.fromEntries(PHRASES.map((p) => [p, [t(`talk.phrases.${p}`), i18n.t(`talk.phrases.${p}`, { lng: 'en' })]])) as Record<Phrase, string[]>;
  const apply = (input: string) => {
    const m = matchPhrase(input, labels);
    if (m) { stopPlayback(); setPhrase(m); setNote(''); } else setNote(input.trim() ? t('talk.noMatch') : '');
  };
  const speak = async () => {
    setListening(true);
    setNote('');
    try {
      const heard = await listenOnce(i18n.language);
      setText(heard);
      apply(heard);
    } catch {
      setNote(t('talk.voiceUnavailable'));
    } finally {
      setListening(false);
    }
  };
  const source = PHRASE_SOUNDS[phrase]?.[size];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: t('talk.title'), headerTintColor: color.text, headerStyle: { backgroundColor: color.canvas }, headerShadowVisible: false }} />
      <Screen style={{ paddingBottom: 120 }}>
        <Segmented value={mode} onChange={setMode} options={[{ key: 'speak', label: t('talk.speakTab') }, { key: 'type', label: t('talk.typeTab') }]} />

        {mode === 'type' ? (
          <View style={{ padding: 16, minHeight: 104, borderRadius: radius.md, backgroundColor: color.surface, borderWidth: 2, borderColor: color.borderBrand }}>
            <TextInput
              value={text}
              onChangeText={(v) => { setText(v); apply(v); }}
              placeholder={t('talk.placeholder')}
              placeholderTextColor={color.textTertiary}
              maxLength={60}
              multiline
              accessibilityLabel={t('talk.type')}
              style={[type.title3, { color: color.text, padding: 0 }]}
            />
            <Text style={[type.footnote, { color: color.textTertiary, alignSelf: 'flex-end', marginTop: 8 }]}>{text.length} / 60</Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('talk.speak')} onPress={speak} disabled={listening} style={[{ width: 96, height: 96, borderRadius: 48, backgroundColor: listening ? color.disabled : color.primary, alignItems: 'center', justifyContent: 'center' }, shadow.glow]}>
              <Mic size={36} color={color.onPrimary} />
            </Pressable>
            <T.Body>{listening ? t('talk.listening') : text || t('talk.speak')}</T.Body>
          </View>
        )}
        {note ? <T.Body>{note}</T.Body> : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PHRASES.map((p) => <Chip key={p} label={t(`talk.phrases.${p}`)} selected={p === phrase} onPress={() => { stopPlayback(); setPhrase(p); }} />)}
        </View>

        <T.Head>{t('profile.voice').replace(/“|”|„|«|»/g, '')}</T.Head>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {SIZES.map((k) => {
            const on = k === size;
            return (
              <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setSize(k)} style={[{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: radius.md, backgroundColor: on ? color.brandSoft : color.surface, borderWidth: 2, borderColor: on ? color.borderBrand : 'transparent' }, shadow.card]}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: color.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[type.title3, { color: color.brandStrong }]}>{GLYPH[k]}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {on ? <Check size={14} color={color.primary} /> : null}
                  <Text style={[type.subheadStrong, { color: color.text }]}>{t(`profile.voiceOptions.${k}`)}</Text>
                </View>
                <Text style={[type.caption, { color: color.textSecondary }]}>{t(`profile.voiceHints.${k}`)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Card style={{ gap: 10 }}>
          <T.Head>{t('talk.volume', { pct: Math.round(vol * 100) })}</T.Head>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Button variant="secondary" label="−" onPress={() => setVol((v) => Math.max(0.1, +(v - 0.1).toFixed(1)))} /></View>
            <View style={{ flex: 1 }}><Button variant="secondary" label="+" onPress={() => setVol((v) => Math.min(0.8, +(v + 0.1).toFixed(1)))} /></View>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: color.highlightSoft }}>
          <Info size={18} color={color.textHighlight} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[type.subhead, { color: color.textHighlight }]}>{t('talk.disclaimer')}</Text>
            <Text style={[type.subheadStrong, { color: color.textHighlight }]}>{t('talk.welfare')}</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push('/(tabs)/training')}>
              <Text style={[type.subheadStrong, { color: color.textHighlight }]}>{t('talk.tryTraining')} ›</Text>
            </Pressable>
          </View>
        </View>
        {!source ? <Card><T.Body>{t('talk.noPack')}</T.Body></Card> : null}
      </Screen>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 28, backgroundColor: color.canvas }}>
        <Button label={t('talk.playAs', { voice: t(`profile.voiceOptions.${size}`).toLowerCase() })} disabled={!source} onPress={() => source && playAsset(source, vol)} />
      </View>
    </SafeAreaView>
  );
}
