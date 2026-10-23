import { Stack, useRouter } from 'expo-router';
import { Check, Info, Mic, Minus, Play, Plus, Volume2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button, Segmented } from '@/components/ui';
import { PHRASES, PHRASE_KEYWORDS, PHRASE_SOUNDS, type Phrase } from '@/content/sounds';
import { useActiveDog } from '@/features/dog-profiles/store';
import { matchPhrase } from '@/lib/phrase';
import { playAsset, stopPlayback } from '@/lib/playback';
import { listenOnce } from '@/lib/speech';
import i18n from '@/localization';
import { spendCredit } from '@/services/credits';
import { log } from '@/services/logger';
import { usePurchases } from '@/services/purchases';
import { color, radius, shadow, type } from '@/theme/tokens';

type Size = 'small' | 'medium' | 'big';
const SIZES: Size[] = ['small', 'medium', 'big'];
const SIZE_EMOJI: Record<Size, string> = { small: '🐶', medium: '🐕', big: '🐕‍🦺' };

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
    const m = matchPhrase(input, labels, PHRASE_KEYWORDS);
    if (m) { stopPlayback(); setPhrase(m); setNote(''); } else setNote(input.trim() ? t('talk.noMatch') : '');
  };
  const speak = async () => {
    if (listening) return;
    setListening(true);
    setNote('');
    try {
      const heard = await listenOnce(i18n.language);
      // Voice input costs one credit, like the translator, charged only once speech was understood.
      if (heard.trim() && (await spendCredit()) === 'none') {
        if (usePurchases.getState().isPro) setNote(t('errors.no_credits_pro'));
        else router.push('/paywall?reason=credits');
        return;
      }
      setText(heard);
      apply(heard);
    } catch (e) {
      // Usually the iOS Simulator or dictation turned off: point the user at the phrase buttons instead.
      log.warn('speech_failed', e, { screen: 'talk' });
      setNote(t('translate.pickInstead'));
    } finally {
      setListening(false);
    }
  };
  const source = PHRASE_SOUNDS[phrase]?.[size];

  const pickPhrase = (p: Phrase) => { stopPlayback(); setPhrase(p); setNote(''); };
  const play = () => source && playAsset(source, vol);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={t('talk.title')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130, gap: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* What will be "said": the chosen phrase, the dog that says it, and a big play button. */}
        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.xl, backgroundColor: color.brandFaint, borderWidth: 1, borderColor: '#F3E2B8' }, shadow.card]}>
          <Image source={require('../assets/illustrations/translate-dog.png')} style={{ width: 84, height: 84 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[type.caption, { color: color.textSecondary, fontWeight: '700' }]}>{t('talk.dogWillHear').toUpperCase()}</Text>
            <Animated.Text key={phrase} entering={ZoomIn.springify()} style={[type.title2, { color: color.text, fontWeight: '800' }]}>“{t(`talk.phrases.${phrase}`)}”</Animated.Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('talk.play')} disabled={!source} onPress={play} style={({ pressed }) => [{ width: 56, height: 56, borderRadius: 28, backgroundColor: source ? color.primary : color.disabled, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.92 : 1 }] }, source ? shadow.glow : null]}>
            <Play size={24} color={color.onPrimary} fill={color.onPrimary} style={{ marginLeft: 3 }} />
          </Pressable>
        </View>

        <Segmented value={mode} onChange={setMode} options={[{ key: 'speak', label: `🎙️ ${t('talk.speakTab')}` }, { key: 'type', label: `⌨️ ${t('talk.typeTab')}` }]} />

        {mode === 'type' ? (
          <View style={[{ padding: 16, borderRadius: radius.lg, backgroundColor: color.surface }, shadow.card]}>
            <TextInput
              value={text}
              onChangeText={(v) => { setText(v); apply(v); }}
              placeholder={t('talk.placeholder')}
              placeholderTextColor={color.textTertiary}
              maxLength={60}
              accessibilityLabel={t('talk.type')}
              style={[type.title3, { color: color.text, padding: 0, minHeight: 32 }]}
            />
            <Text style={[type.caption, { color: color.textTertiary, alignSelf: 'flex-end', marginTop: 6 }]}>{text.length} / 60</Text>
          </View>
        ) : (
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.lg, backgroundColor: color.surface }, shadow.card]}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('talk.speak')} onPress={speak} disabled={listening} style={({ pressed }) => [{ width: 64, height: 64, borderRadius: 32, backgroundColor: listening ? color.disabled : color.primary, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.92 : 1 }] }, listening ? null : shadow.glow]}>
              <Mic size={28} color={color.onPrimary} />
            </Pressable>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[type.headline, { color: color.text }]}>{listening ? t('talk.listening') : text ? `“${text}”` : t('talk.tapMic')}</Text>
              <Text style={[type.footnote, { color: color.textSecondary }]}>{t('talk.speakHint')}</Text>
            </View>
          </View>
        )}
        {note ? (
          <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: color.highlightSoft }}>
            <Text style={{ fontSize: 16 }}>👇</Text>
            <Text style={[type.footnote, { color: color.textHighlight, flex: 1 }]}>{note}</Text>
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          <Text style={[type.title3, { color: color.text, fontWeight: '800' }]}>{t('talk.phrasesTitle')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PHRASES.map((p) => {
              const on = p === phrase;
              return (
                <Pressable key={p} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => pickPhrase(p)} style={[{ paddingHorizontal: 14, height: 40, borderRadius: 20, justifyContent: 'center', backgroundColor: on ? color.primary : color.surface }, shadow.card]}>
                  <Text style={[type.subheadStrong, { color: on ? color.onPrimary : color.text }]}>{t(`talk.phrases.${p}`)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={[type.title3, { color: color.text, fontWeight: '800' }]}>{t('talk.voiceTitle')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {SIZES.map((k) => {
              const on = k === size;
              return (
                <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setSize(k)} style={[{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: radius.lg, backgroundColor: on ? color.brandSoft : color.surface, borderWidth: 2, borderColor: on ? color.primary : 'transparent' }, shadow.card]}>
                  <Text style={{ fontSize: k === 'small' ? 24 : k === 'medium' ? 30 : 36 }}>{SIZE_EMOJI[k]}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {on ? <Check size={14} color={color.primaryPressed} strokeWidth={3} /> : null}
                    <Text style={[type.subheadStrong, { color: color.text }]}>{t(`profile.voiceOptions.${k}`)}</Text>
                  </View>
                  <Text style={[type.caption, { color: color.textSecondary }]}>{t(`profile.voiceHints.${k}`)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: color.surface }, shadow.card]}>
          <Volume2 size={22} color={color.text} />
          <Text style={[type.headline, { color: color.text, flex: 1 }]}>{t('talk.volume', { pct: Math.round(vol * 100) })}</Text>
          <Stepper Icon={Minus} label="−" onPress={() => setVol((v) => Math.max(0.1, +(v - 0.1).toFixed(1)))} />
          <Stepper Icon={Plus} label="+" onPress={() => setVol((v) => Math.min(0.8, +(v + 0.1).toFixed(1)))} />
        </View>

        <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: color.subtle }}>
          <Info size={18} color={color.textSecondary} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[type.footnote, { color: color.textSecondary }]}>{t('talk.disclaimer')} {t('talk.welfare')}</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push('/training')}>
              <Text style={[type.footnote, { color: color.textAccent, fontWeight: '700' }]}>{t('talk.tryTraining')} ›</Text>
            </Pressable>
          </View>
        </View>
        {!source ? <Text style={[type.footnote, { color: color.textSecondary, textAlign: 'center' }]}>{t('talk.noPack')}</Text> : null}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: color.canvas }}>
        <View style={{ paddingBottom: 8 }}>
          <Button label={`🔊 ${t('talk.playAs', { voice: t(`profile.voiceOptions.${size}`).toLowerCase() })}`} disabled={!source} onPress={play} />
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

function Stepper({ Icon, label, onPress }: { Icon: typeof Plus; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: color.brandSoft, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.9 : 1 }] })}>
      <Icon size={18} color={color.text} strokeWidth={2.6} />
    </Pressable>
  );
}
