import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { Bookmark, ChevronLeft, FileText, Pause, Play, RotateCcw, Share2, Smile, Square, Upload, X, Info } from 'lucide-react-native';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Modal, Pressable, Share, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, DogAvatar, MoodBadge, Screen, T } from '@/components/ui';
import { useActiveDog } from '@/features/dog-profiles/store';
import { useJournal, type Confidence } from '@/features/journal/store';
import { extractFeatures, type BarkFeatures } from '@/lib/features';
import { errorKey, isLimit } from '@/lib/errors';
import { playAsset, stopPlayback } from '@/lib/playback';
import { AudioImportError, wavLevels } from '@/lib/wav';
import i18n from '@/localization';
import { callFn } from '@/services/api';
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
  const card = useRef<ComponentRef<typeof View>>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [paused, setPaused] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [errKey, setErrKey] = useState('');
  const [limit, setLimit] = useState(false);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [playing, setPlaying] = useState(false);

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
    lastUri.current = rec.uri; // kept on-device only so the user can replay it; deleted on reset or leaving
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    await analyze(extractFeatures(samples.current, TICK));
  }

  async function analyze(features: BarkFeatures) {
    setPhase('analyzing');
    try {
      const r = await callFn<Result>('analyze-bark', { features, dog: { name: dog?.name, size: dog?.voice }, language: i18n.language });
      if (!(r.emotion in moodTokens) || !(r.intensity >= 1 && r.intensity <= 5) || !(r.confidence in { low: 1, medium: 1, high: 1 })) throw new Error('bad_ai_output');
      r.emotions = r.emotions?.filter((e) => e.emotion in moodTokens && Number.isFinite(e.percent));
      setResult(r);
      setPhase('result');
    } catch (e) {
      setErrKey(errorKey(e));
      setLimit(isLimit(e));
      setPhase('error');
    }
  }

  const importWav = async () => {
    setSheet(false);
    const r = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (r.canceled) return;
    try {
      const file = new File(r.assets[0].uri);
      if (file.size > 12_000_000) throw new AudioImportError('audio_too_long');
      const levels = wavLevels(await file.arrayBuffer());
      samples.current = levels;
      dropRecording();
      setSaved(false);
      setFeedback(false);
      await analyze(extractFeatures(levels, 100));
      try { file.delete(); } catch {}
    } catch (e) {
      setErrKey(e instanceof AudioImportError ? `errors.${e.code}` : 'errors.unsupported_audio');
      setLimit(false);
      setPhase('error');
    }
  };

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

        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 12, padding: 16, paddingBottom: 28, backgroundColor: color.surface }}>
          <View style={{ flex: 1 }}><Button variant="secondary" label={t('common.share')} onPress={shareText} /></View>
          <View style={{ flex: 1 }}><Button label={saved ? t('translate.saved') : t('common.save')} disabled={saved} onPress={save} /></View>
        </View>
      </SafeAreaView>
    );
  }

  // ---- dark record canvas (D1 ready / D2 recording / D3 processing) -------------------------------------------
  const recording = phase === 'recording';
  const busy = phase === 'analyzing';
  const sec = Math.floor(state.durationMillis / 1000);
  const circle = { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center' as const, justifyContent: 'center' as const };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.brandDeep }} edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, paddingHorizontal: 16 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.navigate('/(tabs)')} style={[circle, { position: 'absolute', left: 16 }]}>
          <ChevronLeft size={22} color={color.onBrand} />
        </Pressable>
        <Text style={[type.headline, { color: color.onBrand }]}>{t('home.barkToHuman')}</Text>
      </View>

      <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 24, gap: 16, paddingTop: 8 }}>
        {recording ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: radius.full, backgroundColor: 'rgba(214,69,53,0.25)' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color.danger }} />
              <Text style={[type.subheadStrong, { color: color.onBrand }]}>{t('translate.recordingBadge')}</Text>
            </View>
            <Text style={[type.numeric, { color: color.onBrand }]}>0:{String(sec).padStart(2, '0')}</Text>
            <Text style={[type.caption, { color: color.onBrandMuted }]}>{t('translate.ofMax')}</Text>
            <View style={{ alignSelf: 'stretch', marginVertical: 8 }}><Wave samples={samples.current.slice(-60)} count={44} h={56} active="#AEB8D4" dim="rgba(174,184,212,0.35)" /></View>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 14, paddingLeft: 4, height: 40, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.12)' }}>
              <DogAvatar name={name || '?'} uri={dog?.photoUri} size={32} />
              <Text style={[type.subheadStrong, { color: color.onBrand }]}>{t('translate.listeningFor', { name })}</Text>
            </View>
            <Text style={[type.title1, { color: color.onBrand, textAlign: 'center', marginTop: 12 }]}>{t('translate.heading', { name })}</Text>
            <Text style={[type.subhead, { color: color.onBrandMuted, textAlign: 'center' }]}>{t('translate.sub')}</Text>
          </>
        )}

        <View style={{ width: 184, height: 184, borderRadius: 92, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
          <View style={{ width: 152, height: 152, borderRadius: 76, backgroundColor: recording ? 'rgba(214,69,53,0.30)' : 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={recording ? t('translate.stop') : t('home.record')}
              disabled={busy}
              onPress={recording ? finish : start}
              style={[{ width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: recording ? color.surface : busy ? color.disabled : color.primary }, recording ? null : shadow.glow]}
            >
              {recording ? <Square size={44} color={color.danger} fill={color.danger} /> : busy ? <Text style={[type.footnote, { color: color.brandStrong }]}>{t('translate.analyzing')}</Text> : <Text style={{ fontSize: 44 }}>🎙</Text>}
            </Pressable>
          </View>
        </View>

        {recording ? (
          <>
            <View style={{ flexDirection: 'row', gap: 80, marginTop: 8 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={paused ? t('translate.resume') : t('translate.pause')} onPress={togglePause} style={{ alignItems: 'center', gap: 6 }}>
                <View style={circle}>{paused ? <Play size={20} color={color.onBrand} /> : <Pause size={20} color={color.onBrand} />}</View>
                <Text style={[type.caption, { color: color.onBrandMuted }]}>{paused ? t('translate.resume') : t('translate.pause')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={cancel} style={{ alignItems: 'center', gap: 6 }}>
                <View style={circle}><X size={20} color={color.onBrand} /></View>
                <Text style={[type.caption, { color: color.onBrandMuted }]}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
            <Text style={[type.subhead, { color: color.onBrandMuted }]}>{t('translate.tapStop', { name })}</Text>
          </>
        ) : (
          <>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => setSheet(true)} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 20, height: 48, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 8 }}>
              <Upload size={18} color={color.onBrand} />
              <Text style={[type.subheadStrong, { color: color.onBrand }]}>{t('translate.upload')}</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 'auto' }}>
              <Info size={18} color={color.onBrandMuted} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[type.subhead, { color: color.onBrandMuted }]}>{t('translate.tip')}</Text>
                <Text style={[type.footnote, { color: color.onBrandMuted }]}>{t('translate.privacy')}</Text>
              </View>
            </View>
          </>
        )}
      </View>

      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <Pressable accessibilityLabel={t('common.cancel')} onPress={() => setSheet(false)} style={{ flex: 1, backgroundColor: 'rgba(21,29,56,0.6)', justifyContent: 'flex-end' }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: color.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 24, paddingBottom: 40, gap: 12 }}>
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: color.border }} />
            <Text style={[type.title2, { color: color.text }]}>{t('translate.uploadTitle')}</Text>
            <T.Body>{t('translate.uploadBody')}</T.Body>
            <Pressable accessibilityRole="button" onPress={importWav} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: color.canvas }}>
              <View style={{ width: 40, height: 40, borderRadius: radius.sm, backgroundColor: color.brandSoft, alignItems: 'center', justifyContent: 'center' }}><FileText size={20} color={color.brandStrong} /></View>
              <View style={{ flex: 1 }}>
                <T.Head>{t('translate.chooseFiles')}</T.Head>
                <T.Body>{t('translate.formats')}</T.Body>
              </View>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
