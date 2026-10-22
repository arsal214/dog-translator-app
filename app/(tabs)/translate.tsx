import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bookmark, ChevronLeft, Pause, Play, RotateCcw, Share2, Smile, X, Info } from 'lucide-react-native';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, Share, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, DogAvatar, MoodBadge, Screen, T } from '@/components/ui';
import { PHRASES, PHRASE_SOUNDS, type Phrase } from '@/content/sounds';
import { useActiveDog } from '@/features/dog-profiles/store';
import { LiveWave, ModeSwap, RecordBackdrop, RecordStage, levelFromDb, type TranslateMode } from '@/features/translate/RecordStage';
import { useJournal, type Confidence } from '@/features/journal/store';
import { extractFeatures, type BarkFeatures } from '@/lib/features';
import { errorKey, isLimit } from '@/lib/errors';
import { matchPhrase } from '@/lib/phrase';
import { playAsset, stopPlayback } from '@/lib/playback';
import { listenOnce } from '@/lib/speech';
import i18n from '@/localization';
import { callFn } from '@/services/api';
import { color, mood as moodTokens, radius, type, type Mood } from '@/theme/tokens';

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
  const [mode, setMode] = useState<TranslateMode>('bark');
  // The home cards open this tab in a given direction (?mode=bark|human).
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  useEffect(() => { if (modeParam === 'bark' || modeParam === 'human') setMode(modeParam); }, [modeParam]);
  // Human → Dog: what we heard, the phrase it matched and any message for the user.
  const [heard, setHeard] = useState('');
  const [phrase, setPhrase] = useState<Phrase>();
  const [note, setNote] = useState('');
  const phraseSound = phrase && PHRASE_SOUNDS[phrase]?.[dog?.voice ?? 'medium'];
  const clearHuman = () => { setHeard(''); setPhrase(undefined); setNote(''); };

  /** Turns the user's recording into a phrase and plays it back as a bark. */
  async function translateHuman(uri: string | null) {
    setPhase('analyzing');
    try {
      const text = uri ? await listenOnce(i18n.language, uri) : '';
      setHeard(text);
      // Match against the current language and English, so either works.
      const labels = Object.fromEntries(PHRASES.map((p) => [p, [t(`talk.phrases.${p}`), i18n.t(`talk.phrases.${p}`, { lng: 'en' })]])) as Record<Phrase, string[]>;
      const m = matchPhrase(text, labels);
      if (!m) setNote(t('talk.noMatch'));
      else {
        setPhrase(m);
        const src = PHRASE_SOUNDS[m]?.[dog?.voice ?? 'medium'];
        if (src) void playAsset(src, 0.5);
        else setNote(t('talk.noPack'));
      }
    } catch (e) {
      setNote(t('talk.voiceUnavailable') + (__DEV__ ? ` [${(e as Error).message}]` : ''));
    } finally {
      try { if (uri) new File(uri).delete(); } catch {} // the voice recording is never kept
      setPhase('idle');
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

  async function finish() {
    await rec.stop().catch(() => {});
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    if (mode === 'human') return translateHuman(rec.uri);
    lastUri.current = rec.uri; // kept on-device only so the user can replay it; deleted on reset or leaving
    await analyze(extractFeatures(samples.current, TICK));
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

  // ---- dark record canvas (D1 ready / D2 recording / D3 processing) -------------------------------------------
  const recording = phase === 'recording';
  const busy = phase === 'analyzing';
  const human = mode === 'human';
  const sec = Math.floor(state.durationMillis / 1000);
  const level = recording && !paused && typeof state.metering === 'number' ? levelFromDb(state.metering) : 0;
  const circle = { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center' as const, justifyContent: 'center' as const };
  const glass = { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.brandDeep }} edges={['top']}>
      <RecordBackdrop recording={recording} />
      <View style={{ alignItems: 'center', paddingTop: 8, paddingHorizontal: 24, gap: 14 }}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 14, paddingLeft: 4, height: 40, borderRadius: radius.full }, glass]}>
          <DogAvatar name={name || '?'} uri={dog?.photoUri} size={32} selected />
          <Text style={[type.subheadStrong, { color: color.onBrand }]}>{t('translate.listeningFor', { name })}</Text>
        </View>
        {recording ? (
          <View style={{ alignItems: 'center', gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 28, borderRadius: radius.full, backgroundColor: 'rgba(214,69,53,0.25)' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: paused ? color.onBrandMuted : color.danger }} />
              <Text style={[type.caption, { color: color.onBrand }]}>{paused ? t('translate.pause') : t('translate.recordingBadge')}</Text>
            </View>
            <Text style={[type.numeric, { color: color.onBrand, fontVariant: ['tabular-nums'] }]}>0:{String(sec).padStart(2, '0')}</Text>
            <Text style={[type.caption, { color: color.onBrandMuted }]}>{t('translate.ofMax')}</Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Text style={[type.title1, { color: color.onBrand, textAlign: 'center' }]}>
              {busy ? t('translate.analyzing') : t('translate.tapMic')}
            </Text>
            <Text style={[type.subhead, { color: color.onBrandMuted, textAlign: 'center' }]}>{human ? t('translate.humanSub', { name }) : t('translate.sub')}</Text>
          </View>
        )}
      </View>

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

      <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingBottom: 64, gap: 16 }}>
        {recording ? (
          <>
            <LiveWave levels={samples.current.map(levelFromDb)} />
            <View style={{ flexDirection: 'row', gap: 72 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={paused ? t('translate.resume') : t('translate.pause')} onPress={togglePause} style={{ alignItems: 'center', gap: 6 }}>
                <View style={circle}>{paused ? <Play size={20} color={color.onBrand} /> : <Pause size={20} color={color.onBrand} />}</View>
                <Text style={[type.caption, { color: color.onBrandMuted }]}>{paused ? t('translate.resume') : t('translate.pause')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={cancel} style={{ alignItems: 'center', gap: 6 }}>
                <View style={circle}><X size={20} color={color.onBrand} /></View>
                <Text style={[type.caption, { color: color.onBrandMuted }]}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
            <Text style={[type.subhead, { color: color.onBrandMuted }]}>{human ? t('translate.tapStopHuman') : t('translate.tapStop', { name })}</Text>
          </>
        ) : busy ? null : (
          <>
            {human && (heard || note) ? (
              <View style={[{ alignSelf: 'stretch', gap: 10, padding: 14, borderRadius: radius.lg }, glass]}>
                {heard ? <Text style={[type.headline, { color: color.onBrand }]}>“{heard}”</Text> : null}
                {phrase ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={[type.subheadStrong, { color: color.highlight, flex: 1 }]}>🐶 {t(`talk.phrases.${phrase}`)}</Text>
                    {phraseSound ? (
                      <Pressable accessibilityRole="button" accessibilityLabel={t('talk.play')} onPress={() => void playAsset(phraseSound, 0.5)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center' }}>
                        <Play size={18} color={color.onPrimary} fill={color.onPrimary} />
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
                {note ? <Text style={[type.footnote, { color: color.onBrandMuted }]}>{note}</Text> : null}
              </View>
            ) : null}
            <ModeSwap
              value={mode}
              dog={{ name, uri: dog?.photoUri }}
              labels={{ bark: t('home.barkToHuman'), human: t('home.humanToDog') }}
              onChange={(m) => {
                Haptics.selectionAsync().catch(() => {});
                stopPlayback();
                clearHuman();
                setMode(m);
              }}
            />
          </>
        )}
      </View>

    </SafeAreaView>
  );
}
