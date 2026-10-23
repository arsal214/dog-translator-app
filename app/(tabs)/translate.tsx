import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bookmark, ChevronDown, Crown, ChevronLeft, Pause, Play, RotateCcw, Share2, Smile, X, Info } from 'lucide-react-native';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Linking, Pressable, Share, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, TAB_BAR_SPACE, TAB_BG } from '@/components/AppHeader';
import { Button, Card, DogAvatar, MoodBadge, Screen, T } from '@/components/ui';
import { PHRASES, PHRASE_KEYWORDS, PHRASE_SOUNDS, type Phrase } from '@/content/sounds';
import { useActiveDog } from '@/features/dog-profiles/store';
import { LiveWave, RecordStage, levelFromDb, type TranslateMode } from '@/features/translate/RecordStage';
import { useJournal, type Confidence } from '@/features/journal/store';
import { extractFeatures, type BarkFeatures } from '@/lib/features';
import { errorKey, isLimit } from '@/lib/errors';
import { matchPhrase } from '@/lib/phrase';
import { playAsset, stopPlayback } from '@/lib/playback';
import { listenOnce } from '@/lib/speech';
import i18n from '@/localization';
import { callFn } from '@/services/api';
import { spendCredit } from '@/services/credits';
import { log } from '@/services/logger';
import { usePurchases } from '@/services/purchases';
import { color, mood as moodTokens, radius, shadow, type, type Mood } from '@/theme/tokens';

const moodColor = Object.fromEntries(Object.entries(moodTokens).map(([k, v]) => [k, v.fg])) as Record<Mood, string>;

const MAX_MS = 10_000;
const TICK = 100;

type Result = { emotion: Mood; emotions?: { emotion: Mood; percent: number }[]; intensity: number; confidence: Confidence; interpretation: string; context?: string };
type Phase = 'idle' | 'recording' | 'analyzing' | 'result' | 'error' | 'denied';

/** Bars from real dB samples (min–max normalised). */
function Wave({ samples, count = 40, h = 40, active = color.primary, dim = 'rgba(255,255,255,0.35)', upTo = 1 }: { samples: number[]; count?: number; h?: number; active?: string; dim?: string; upTo?: number }) {
  const src = samples.length ? samples : [-60];
  const lo = Math.min(...src), hi = Math.max(...src, lo + 1);
  const bars = Array.from({ length: count }, (_, i) => {
    const v = src[Math.min(src.length - 1, Math.floor((i / count) * src.length))];
    return 0.15 + 0.85 * ((v - lo) / (hi - lo));
  });
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: h }}>
      {bars.map((b, i) => <View key={i} style={{ width: 3, height: Math.max(4, b * h), borderRadius: 2, backgroundColor: i / count <= upTo ? active : dim }} />)}
    </View>
  );
}

function RoundAction({ Icon, label, onPress, disabled }: { Icon: typeof Play; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={{ alignItems: 'center', gap: 6, opacity: disabled ? 0.5 : 1 }}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: color.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={color.brandStrong} />
      </View>
      <Text style={[type.caption, { color: color.text }]}>{label}</Text>
    </Pressable>
  );
}

export default function Translate() {
  const { t } = useTranslation();
  const router = useRouter();
  const dog = useActiveDog();
  const name = dog?.name ?? '';
  const add = useJournal((s) => s.add);

  const rec = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const state = useAudioRecorderState(rec, TICK);
  const samples = useRef<number[]>([]);
  const lastUri = useRef<string | null>(null);
  const lastFeatures = useRef<BarkFeatures | undefined>(undefined);
  const card = useRef<ComponentRef<typeof View>>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [errKey, setErrKey] = useState('');
  const [errCode, setErrCode] = useState(''); // raw cause, shown in dev builds only
  const [limit, setLimit] = useState(false);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<TranslateMode>('human');
  // The home cards open this tab in a given direction (?mode=bark|human).
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  const isPro = usePurchases((s) => s.isPro);
  const proChecked = usePurchases((s) => s.checked);
  // Bark → Human is a Pro tool; free users stay on Human → Dog and are sent to the paywall.
  // Waits for RevenueCat so a Pro user opening ?mode=bark at launch isn't bounced to the paywall.
  useEffect(() => {
    if (modeParam === 'human') setMode('human');
    else if (modeParam === 'bark' && proChecked) {
      if (usePurchases.getState().isPro) setMode('bark');
      else router.push('/paywall?reason=translate');
    }
  }, [modeParam, proChecked]);
  // Losing Pro (expiry, sign-out) must not leave the Pro mode open.
  useEffect(() => { if (!isPro) setMode('human'); }, [isPro]);
  // Human → Dog: what we heard, the phrase it matched and any message for the user.
  const [heard, setHeard] = useState('');
  const [phrase, setPhrase] = useState<Phrase>();
  const [note, setNote] = useState('');
  const phraseSound = phrase && PHRASE_SOUNDS[phrase]?.[dog?.voice ?? 'medium'];
  // When speech recognition fails (e.g. the iOS Simulator), the user taps the phrase instead.
  const [pickPhrase, setPickPhrase] = useState(false);
  const clearHuman = () => { setHeard(''); setPhrase(undefined); setNote(''); setPickPhrase(false); };
  const sayPhrase = (p: Phrase) => {
    setPhrase(p);
    const src = PHRASE_SOUNDS[p]?.[dog?.voice ?? 'medium'];
    if (src) void playAsset(src, 0.5);
    else setNote(t('talk.noPack'));
  };

  /** Turns the user's recording into a phrase and plays it back as a bark. */
  async function translateHuman(uri: string | null) {
    setPhase('analyzing');
    try {
      const text = uri ? await listenOnce(i18n.language, uri) : '';
      // Charged only once speech was understood, so a failed recognition costs nothing. Free users who run out
      // are sent to Pro; Pro users see a notice until their plan renews.
      if (text.trim() && (await spendCredit()) === 'none') {
        if (!usePurchases.getState().isPro) return router.push('/paywall?reason=credits');
        setErrKey('errors.no_credits_pro');
        setLimit(false);
        return setPhase('error');
      }
      setHeard(text);
      // Match against the current language and English, so either works.
      const labels = Object.fromEntries(PHRASES.map((p) => [p, [t(`talk.phrases.${p}`), i18n.t(`talk.phrases.${p}`, { lng: 'en' })]])) as Record<Phrase, string[]>;
      const m = matchPhrase(text, labels, PHRASE_KEYWORDS);
      if (!m) setNote(t('talk.noMatch'));
      else {
        setPhrase(m);
        const src = PHRASE_SOUNDS[m]?.[dog?.voice ?? 'medium'];
        if (src) void playAsset(src, 0.5);
        else setNote(t('talk.noPack'));
      }
    } catch (e) {
      log.warn('speech_failed', e);
      setNote(t('translate.pickInstead'));
      setPickPhrase(true);
    } finally {
      try { if (uri) new File(uri).delete(); } catch {} // the voice recording is never kept
      setPhase((p) => (p === 'analyzing' ? 'idle' : p));
    }
  }

  const dropRecording = () => {
    try { if (lastUri.current) new File(lastUri.current).delete(); } catch {}
    lastUri.current = null;
  };
  useEffect(() => () => { stopPlayback(); dropRecording(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === 'recording' && !paused && typeof state.metering === 'number') samples.current.push(state.metering);
    if (phase === 'recording' && state.durationMillis >= MAX_MS) void finish();
  }, [state.metering, state.durationMillis]); // eslint-disable-line react-hooks/exhaustive-deps

  // Release the microphone if the user leaves mid-recording.
  useEffect(() => () => { if (rec.isRecording) void rec.stop().catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) return setPhase('denied');
    dropRecording();
    samples.current = [];
    setSaved(false);
    setFeedback(false);
    setPaused(false);
    clearHuman();
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await rec.prepareToRecordAsync();
    rec.record();
    setPhase('recording');
  };

  const togglePause = () => {
    if (paused) rec.record();
    else rec.pause();
    setPaused(!paused);
  };

  const cancel = async () => {
    await rec.stop().catch(() => {});
    try { if (rec.uri) new File(rec.uri).delete(); } catch {}
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    setPhase('idle');
  };

  // The stop button and the auto-stop can both fire; only the first one may finish (and spend a credit).
  const finishing = useRef(false);
  async function finish() {
    if (finishing.current) return;
    finishing.current = true;
    try {
      await rec.stop().catch(() => {});
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      if (mode === 'human') return await translateHuman(rec.uri);
      lastUri.current = rec.uri; // kept on-device only so the user can replay it; deleted on reset or leaving
      await analyze(extractFeatures(samples.current, TICK));
    } finally {
      finishing.current = false;
    }
  }

  async function analyze(features: BarkFeatures) {
    lastFeatures.current = features;
    setPhase('analyzing');
    try {
      const r = await callFn<Result>('analyze-bark', { features, dog: { name: dog?.name, size: dog?.voice }, language: i18n.language });
      if (!(r.emotion in moodTokens) || !(r.intensity >= 1 && r.intensity <= 5) || !(r.confidence in { low: 1, medium: 1, high: 1 })) throw new Error('bad_ai_output');
      r.emotions = r.emotions?.filter((e) => e.emotion in moodTokens && Number.isFinite(e.percent));
      setResult(r);
      setPhase('result');
    } catch (e) {
      console.warn('analyze-bark failed', e, features);
      setErrCode(e instanceof Error ? e.message : String(e));
      setErrKey(errorKey(e));
      setLimit(isLimit(e));
      setPhase('error');
    }
  }

  const replay = async () => {
    if (!lastUri.current) return;
    if (playing) { stopPlayback(); setPlaying(false); return; }
    setPlaying(true);
    await playAsset(lastUri.current, 0.8);
    setTimeout(() => setPlaying(false), Math.max(500, samples.current.length * TICK));
  };

  const shareImage = async () => {
    if (!card.current || !(await Sharing.isAvailableAsync())) return;
    await Sharing.shareAsync(await captureRef(card, { format: 'png', quality: 1 }));
  };

  const save = () => {
    if (!result || !dog || saved) return;
    add({ dogId: dog.id, kind: 'bark', mood: result.emotion, intensity: result.intensity, confidence: result.confidence, text: result.interpretation });
    setSaved(true);
  };
  const shareText = () => result && Share.share({ message: t('translate.shareText', { name, text: result.interpretation }) });

  // ---- light screens -------------------------------------------------------------------------------------------
  if (phase === 'denied')
    return (
      <Screen>
        <T.Title>{t('translate.micTitle')}</T.Title>
        <T.Body>{t('translate.micBody')}</T.Body>
        <Button label={t('translate.openSettings')} onPress={() => Linking.openSettings()} />
        <Button variant="tertiary" label={t('common.back')} onPress={() => setPhase('idle')} />
      </Screen>
    );

  if (phase === 'error')
    return (
      <Screen>
        <T.Title>{t('translate.errorTitle')}</T.Title>
        <T.Body>{t(errKey)}</T.Body>
        {__DEV__ ? <T.Body>{`dev: ${errCode} · ${JSON.stringify(lastFeatures.current)}`}</T.Body> : null}
        {limit ? <Button label={t('paywall.seePro')} onPress={() => router.push('/paywall?reason=ai')} /> : <Button label={t('common.retry')} onPress={() => setPhase('idle')} />}
      </Screen>
    );

  if (phase === 'result' && result) {
    const emotions = result.emotions?.length ? result.emotions : [{ emotion: result.emotion, percent: 100 }];
    const lvl = result.intensity <= 2 ? 'Low' : result.intensity === 3 ? 'Medium' : 'High';
    const secs = Math.max(1, Math.round((samples.current.length * TICK) / 1000));
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }} edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, height: 52 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => { dropRecording(); setPhase('idle'); }} style={{ position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={22} color={color.text} />
          </Pressable>
          <Text style={[type.headline, { color: color.text }]}>{t('translate.resultTitle', { name }).replace('…', '')}</Text>
        </View>
        <Screen style={{ paddingTop: 4, paddingBottom: 120 }}>
          <View ref={card} collapsable={false} style={{ backgroundColor: color.canvas, gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: color.brandSoft }}>
              <Pressable accessibilityRole="button" accessibilityLabel={t('translate.replay')} onPress={replay} disabled={!lastUri.current} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center', opacity: lastUri.current ? 1 : 0.5 }}>
                {playing ? <Pause size={20} color={color.onPrimary} /> : <Play size={20} color={color.onPrimary} />}
              </Pressable>
              <View style={{ flex: 1 }}><Wave samples={samples.current} count={36} h={28} active={color.primary} dim="rgba(34,48,90,0.18)" /></View>
              <Text style={[type.footnote, { color: color.textSecondary }]}>0:{String(secs).padStart(2, '0')}</Text>
            </View>

            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <DogAvatar name={name || '?'} uri={dog?.photoUri} size={36} />
                <View style={{ flex: 1 }}>
                  <T.Head>{t('translate.resultTitle', { name })}</T.Head>
                  <Text style={[type.footnote, { color: color.textSecondary }]}>{t('translate.justNow', { s: secs })}</Text>
                </View>
                <MoodBadge mood={result.emotion} label={t(`moods.${result.emotion}`)} />
              </View>
              <Text style={[type.title3, { color: color.text }]}>“{result.interpretation}”</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View style={{ gap: 6 }}>
                  <Text style={[type.footnote, { color: color.textSecondary }]}>{t('translate.intensityLabel')} · <Text style={{ color: color.text, fontWeight: '600' }}>{t(`translate.level${lvl}`)}</Text></Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {[1, 2, 3, 4, 5].map((i) => <View key={i} style={{ width: 28, height: 6, borderRadius: 3, backgroundColor: i <= result.intensity ? moodColor[result.emotion] : color.subtle }} />)}
                  </View>
                </View>
                <View style={{ paddingHorizontal: 10, height: 28, borderRadius: radius.full, backgroundColor: color.subtle, justifyContent: 'center' }}>
                  <Text style={[type.caption, { color: color.text }]}>{t(`translate.confidence.${result.confidence}`)}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, padding: 10, borderRadius: radius.sm, backgroundColor: color.subtle }}>
                <Info size={16} color={color.textSecondary} />
                <View style={{ flex: 1 }}><T.Body>{t('translate.disclaimer')}</T.Body></View>
              </View>
              <View style={{ height: 1, backgroundColor: color.borderSubtle }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <RoundAction Icon={playing ? Pause : RotateCcw} label={t('translate.replay')} onPress={replay} disabled={!lastUri.current} />
                <RoundAction Icon={Bookmark} label={saved ? t('translate.saved') : t('common.save')} onPress={save} disabled={saved} />
                <RoundAction Icon={Share2} label={t('translate.shareImage')} onPress={shareImage} />
              </View>
            </Card>

            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T.Head>{t('translate.possibleEmotions')}</T.Head>
                <T.Body>{t('translate.estimated')}</T.Body>
              </View>
              {emotions.map((e) => (
                <View key={e.emotion} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <MoodBadge mood={e.emotion} label={t(`moods.${e.emotion}`)} />
                    <Text style={[type.subheadStrong, { color: color.text }]}>{Math.round(e.percent)}%</Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: color.subtle }}>
                    <View style={{ height: 6, borderRadius: 3, width: `${Math.min(100, Math.max(0, e.percent))}%`, backgroundColor: moodColor[e.emotion] }} />
                  </View>
                </View>
              ))}
            </Card>
          </View>

          {result.context ? (
            <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: color.highlightSoft }}>
              <Smile size={18} color={color.textHighlight} />
              <View style={{ flex: 1 }}><Text style={[type.subhead, { color: color.textHighlight }]}>{result.context}</Text></View>
            </View>
          ) : null}

          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}><T.Head>{feedback ? t('translate.thanks') : t('translate.feedbackQ')}</T.Head></View>
            {!feedback ? (['yes', 'notReally'] as const).map((k) => (
              <Pressable key={k} accessibilityRole="button" onPress={() => setFeedback(true)} style={{ paddingHorizontal: 14, height: 34, borderRadius: radius.full, backgroundColor: color.subtle, justifyContent: 'center' }}>
                <Text style={[type.subheadStrong, { color: color.text }]}>{t(`translate.${k}`)}</Text>
              </Pressable>
            )) : null}
          </Card>
        </Screen>

        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 12, padding: 16, backgroundColor: color.surface }}>
          <View style={{ flex: 1 }}><Button variant="secondary" label={t('common.share')} onPress={shareText} /></View>
          <View style={{ flex: 1 }}><Button label={saved ? t('translate.saved') : t('common.save')} disabled={saved} onPress={save} /></View>
        </View>
      </SafeAreaView>
    );
  }

  // ---- record canvas (ready / recording / processing) -----------------------------------------------------------
  const recording = phase === 'recording';
  const busy = phase === 'analyzing';
  const human = mode === 'human';
  const sec = Math.floor(state.durationMillis / 1000);
  const level = recording && !paused && typeof state.metering === 'number' ? levelFromDb(state.metering) : 0;
  const circle = { width: 52, height: 52, borderRadius: 26, backgroundColor: color.surface, alignItems: 'center' as const, justifyContent: 'center' as const, ...shadow.card };
  const pick = (m: TranslateMode) => {
    if (recording || busy || m === mode) return;
    Haptics.selectionAsync().catch(() => {});
    if (m === 'bark' && !isPro) return router.push('/paywall?reason=translate');
    stopPlayback();
    clearHuman();
    setMode(m);
  };
  const dogName = name || t('translate.dog');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TAB_BG }} edges={['top']}>
      <AppHeader
        leading={
          <Pressable accessibilityRole="button" onPress={() => router.push('/settings')} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4, paddingRight: 12, height: 44, borderRadius: 22, backgroundColor: color.surface, opacity: pressed ? 0.8 : 1 }, shadow.card]}>
            <DogAvatar name={dogName} uri={dog?.photoUri} size={36} />
            <Text numberOfLines={1} style={[type.headline, { color: color.text, maxWidth: 140 }]}>{dogName}</Text>
            <ChevronDown size={16} color={color.textSecondary} />
          </Pressable>
        }
      />

      <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: TAB_BAR_SPACE, gap: 14 }}>
        <Text style={[type.title2, { color: color.text, textAlign: 'center', marginTop: 4 }]}>
          {human ? t('translate.talkTo', { name: dogName }) : t('translate.whatSaying', { name: dogName })}
        </Text>

        <DirectionToggle value={mode} locked={!isPro} disabled={recording || busy} onChange={pick} labels={{ bark: t('home.barkToHuman'), human: t('home.humanToDog') }} />

        {/* Cream stage in brand colours: the speaker on top, the button in the middle, tips or controls below. */}
        <View style={[{ flex: 1, borderRadius: 36, backgroundColor: color.brandFaint, borderWidth: 1, borderColor: '#F3E2B8', alignItems: 'center', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16, overflow: 'hidden' }, shadow.card]}>
          {recording ? (
            <View style={{ alignSelf: 'stretch', alignItems: 'center', gap: 4 }}>
              <Text style={[type.title2, { color: color.text, fontVariant: ['tabular-nums'] }]}>0:{String(sec).padStart(2, '0')} <Text style={[type.footnote, { color: color.textSecondary }]}>/ 0:10</Text></Text>
              <LiveWave levels={samples.current.map(levelFromDb)} h={44} />
            </View>
          ) : human && (heard || note || pickPhrase) ? (
            <View style={{ alignSelf: 'stretch', gap: 8, padding: 12, borderRadius: radius.lg, backgroundColor: color.surface }}>
              {heard ? <Text style={[type.headline, { color: color.text }]}>“{heard}”</Text> : null}
              {phrase && !pickPhrase ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={[type.subheadStrong, { color: color.textAccent, flex: 1 }]}>🐶 {t(`talk.phrases.${phrase}`)}</Text>
                  {phraseSound ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={t('talk.play')} onPress={() => void playAsset(phraseSound, 0.5)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center' }}>
                      <Play size={18} color={color.onPrimary} fill={color.onPrimary} />
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              {note ? <Text style={[type.footnote, { color: color.textSecondary }]}>{note}</Text> : null}
              {pickPhrase ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {PHRASES.map((p) => (
                    <Pressable key={p} accessibilityRole="button" onPress={() => sayPhrase(p)} style={{ paddingHorizontal: 12, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: phrase === p ? color.primary : color.brandSoft }}>
                      <Text style={[type.subheadStrong, { color: phrase === p ? color.onPrimary : color.text }]}>{t(`talk.phrases.${p}`)}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <Animated.View key={mode} entering={ZoomIn.springify()} style={[{ width: 112, height: 112, borderRadius: 56, borderWidth: 4, borderColor: color.primary, backgroundColor: color.surface, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }, shadow.glow]}>
              <Image source={human ? require('../../assets/illustrations/translate-human.png') : require('../../assets/illustrations/translate-dog.png')} style={{ width: 120, height: 120, marginBottom: -10 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            </Animated.View>
          )}

          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <RecordStage
              state={recording ? 'recording' : busy ? 'analyzing' : 'idle'}
              level={level}
              progress={state.durationMillis / MAX_MS}
              label={recording ? t('translate.stop') : t('home.record')}
              tone={human ? 'human' : 'dog'}
              onPress={() => {
                Haptics.impactAsync(recording ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                void (recording ? finish() : start());
              }}
            />
          </View>

          {recording ? (
            <View style={{ flexDirection: 'row', gap: 56 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={paused ? t('translate.resume') : t('translate.pause')} onPress={togglePause} style={circle}>
                {paused ? <Play size={20} color={color.text} /> : <Pause size={20} color={color.text} />}
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={cancel} style={circle}>
                <X size={20} color={color.text} />
              </Pressable>
            </View>
          ) : busy ? (
            <Text style={[type.callout, { color: color.textSecondary }]}>{t('translate.analyzing')}</Text>
          ) : (
            <View style={{ alignItems: 'center', gap: 10 }}>
              <Text style={[type.callout, { color: color.text, fontWeight: '600', textAlign: 'center' }]}>
                {human ? t('translate.tapToSpeak') : t('translate.tapToRecordDog', { name: dogName })}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['quiet', 'close'] as const).map((k) => (
                  <View key={k} style={{ paddingHorizontal: 10, height: 28, borderRadius: 14, justifyContent: 'center', backgroundColor: color.surface }}>
                    <Text style={[type.caption, { color: color.textSecondary }]}>{t(`translate.tips.${k}`)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

/** Two-option switch for the translation direction; an amber pill slides under the active side. */
function DirectionToggle({ value, onChange, labels, disabled, locked }: { value: TranslateMode; onChange: (m: TranslateMode) => void; labels: Record<TranslateMode, string>; disabled?: boolean; locked?: boolean }) {
  return (
    <View style={[{ flexDirection: 'row', padding: 4, borderRadius: 26, backgroundColor: color.surface, opacity: disabled ? 0.6 : 1 }, shadow.card]}>
      {(['human', 'bark'] as const).map((m) => {
        const on = value === m;
        return (
          <Pressable key={m} accessibilityRole="tab" accessibilityState={{ selected: on, disabled }} disabled={disabled} onPress={() => onChange(m)} style={{ flex: 1, height: 44, borderRadius: 22, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? color.primary : 'transparent' }}>
            <Text numberOfLines={1} style={[type.subheadStrong, { flexShrink: 1, color: on ? color.onPrimary : color.textSecondary, fontWeight: on ? '800' : '600' }]}>{m === 'bark' ? '🐶 ' : '🗣️ '}{labels[m]}</Text>
            {m === 'bark' && locked ? <Crown size={13} color={color.highlight} fill={color.highlight} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
