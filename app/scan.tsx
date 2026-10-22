import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import i18n from '@/localization';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Check, Image as ImageIcon, RotateCcw, type LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button, T } from '@/components/ui';
import { useActiveDog } from '@/features/dog-profiles/store';
import { useJournal } from '@/features/journal/store';
import { errorKey, isLimit } from '@/lib/errors';
import { callFn } from '@/services/api';
import { log } from '@/services/logger';
import { color, radius, shadow, type } from '@/theme/tokens';

type Scan = {
  isDog: boolean;
  breeds: { name: string; likelihood: 'low' | 'medium' | 'high' }[];
  traits: string[];
  visibleCues: string;
  care: string;
  followUps: string[];
};

export default function Scanner() {
  const { t } = useTranslation();
  const router = useRouter();
  const dog = useActiveDog();
  const add = useJournal((s) => s.add);
  const [uri, setUri] = useState<string | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [err, setErr] = useState('');
  const [limit, setLimit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [consented, setConsented] = useState(false);

  const pick = async (camera: boolean) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setErr(t('scanner.permission'));
    const r = await (camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync)({ mediaTypes: ['images'], quality: 1 });
    if (r.canceled) return;
    setUri(r.assets[0].uri);
    setScan(null);
    setErr('');
    setConsented(false);
  };

  const analyze = async () => {
    if (!uri) return;
    setBusy(true);
    setErr('');
    try {
      // Downsize + recompress locally; the image is sent once, processed in memory, and never stored.
      let imageBase64: string | undefined;
      try {
        const context = ImageManipulator.manipulate(uri).resize({ width: 1024 });
        const rendered = await context.renderAsync();
        imageBase64 = (await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true })).base64;
        context.release();
        rendered.release();
      } catch (e) {
        log.error('scan_image_resize_failed', e, { scheme: uri.split(':')[0] });
        throw e;
      }
      const r = await callFn<Scan>('scan-dog', { imageBase64, mediaType: 'image/jpeg', language: i18n.language });
      if (!r.isDog) setErr(t('scanner.notDog'));
      else {
        setScan(r);
        if (dog) add({ dogId: dog.id, kind: 'scan', mood: 'calm', text: `${r.breeds[0]?.name ?? ''}: ${r.visibleCues}` });
      }
    } catch (e) {
      setErr(t(errorKey(e)));
      setLimit(isLimit(e));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setUri(null); setScan(null); setErr(''); setLimit(false); setConsented(false); };
  const top = scan?.breeds[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t('ai.scan.title')}
        right={uri ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('scanner.newScan')} hitSlop={8} onPress={reset} style={[{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface }, shadow.card]}>
            <RotateCcw size={18} color={color.text} />
          </Pressable>
        ) : undefined}
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 16 }} showsVerticalScrollIndicator={false}>
        {/* The scan frame: an inviting placeholder until there is a photo, then the photo with a sweeping scan line. */}
        <View style={[{ aspectRatio: 1, borderRadius: 32, overflow: 'hidden', backgroundColor: color.brandFaint, borderWidth: 1, borderColor: '#F3E2B8' }, shadow.card]}>
          {uri ? (
            <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={t('scanner.photo')} />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 }}>
              <Image source={require('../assets/illustrations/translate-dog.png')} style={{ width: 170, height: 170 }} resizeMode="contain" accessibilityIgnoresInvertColors />
              <Text style={[type.headline, { color: color.text, textAlign: 'center' }]}>{t('scanner.emptyTitle')}</Text>
              <Text style={[type.footnote, { color: color.textSecondary, textAlign: 'center' }]}>{t('scanner.emptyBody')}</Text>
            </View>
          )}
          <Corners />
          {busy ? <ScanLine /> : null}
          {busy ? (
            <View style={{ position: 'absolute', bottom: 16, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: 'rgba(21,29,56,0.75)' }}>
              <ActivityIndicator color={color.primary} size="small" />
              <Text style={[type.subheadStrong, { color: color.onBrand }]}>{t('scanner.scanning')}</Text>
            </View>
          ) : null}
        </View>

        {!scan ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <PickButton Icon={Camera} label={t('scanner.camera')} primary={!uri} onPress={() => pick(true)} />
            <PickButton Icon={ImageIcon} label={t('scanner.library')} onPress={() => pick(false)} />
          </View>
        ) : null}

        {uri && !scan ? (
          <>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consented }} onPress={() => setConsented(!consented)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: color.surface }}>
              <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: consented ? color.primary : color.border, backgroundColor: consented ? color.primary : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                {consented ? <Check size={15} color={color.onPrimary} strokeWidth={3.5} /> : null}
              </View>
              <Text style={[type.footnote, { color: color.textSecondary, flex: 1 }]}>{t('scanner.consent')}</Text>
            </Pressable>
            <Button label={t('scanner.analyze')} loading={busy} disabled={!consented} onPress={analyze} />
          </>
        ) : null}

        {err ? (
          <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: color.dangerSoft }}>
            <Text style={{ fontSize: 18 }}>⚠️</Text>
            <Text style={[type.subhead, { color: color.textDanger, flex: 1 }]}>{err}</Text>
          </View>
        ) : null}
        {limit ? <Button label={t('paywall.seePro')} onPress={() => router.push('/paywall?reason=ai')} /> : null}

        {scan && top ? (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 12 }}>
            <View style={[{ padding: 18, borderRadius: radius.xl, backgroundColor: color.brandStrong, gap: 6 }, shadow.raised]}>
              <Text style={[type.overline, { color: color.highlight }]}>{t('scanner.bestMatch').toUpperCase()}</Text>
              <Text style={[type.title1, { color: color.onBrand }]}>{top.name}</Text>
              <Likelihood value={top.likelihood} />
              {scan.breeds.length > 1 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {scan.breeds.slice(1).map((b) => (
                    <View key={b.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.12)' }}>
                      <Text style={[type.caption, { color: color.onBrand, fontWeight: '700' }]}>{b.name}</Text>
                      <Text style={[type.caption, { color: color.onBrandMuted }]}>{t(`scanner.likelihood.${b.likelihood}`)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {scan.traits.length ? (
              <ResultCard emoji="🐾" title={t('scanner.traits')}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {scan.traits.map((x) => <View key={x} style={{ paddingHorizontal: 10, height: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: color.brandSoft }}><Text style={[type.caption, { color: color.text, fontWeight: '700' }]}>{x}</Text></View>)}
                </View>
              </ResultCard>
            ) : null}
            <ResultCard emoji="👀" title={t('scanner.cues')}><T.Body>{scan.visibleCues}</T.Body></ResultCard>
            <ResultCard emoji="💛" title={t('scanner.care')}><T.Body>{scan.care}</T.Body></ResultCard>
            {scan.followUps.length ? (
              <ResultCard emoji="💡" title={t('scanner.followUps')}>
                {scan.followUps.map((f) => <T.Body key={f}>• {f}</T.Body>)}
              </ResultCard>
            ) : null}
            <Button variant="secondary" label={t('scanner.newScan')} onPress={reset} />
          </Animated.View>
        ) : null}

        <Text style={[type.caption, { color: color.textTertiary, textAlign: 'center', paddingHorizontal: 12 }]}>{t('scanner.disclaimer')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Amber viewfinder corners over the frame. */
function Corners() {
  const arm = { position: 'absolute' as const, width: 44, height: 44, borderColor: color.primary };
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { margin: 18 }]}>
      <View style={[arm, { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 18 }]} />
      <View style={[arm, { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 18 }]} />
      <View style={[arm, { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 18 }]} />
      <View style={[arm, { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 18 }]} />
    </View>
  );
}

/** Glowing line sweeping up and down while the photo is analysed. */
function ScanLine() {
  const [h, setH] = useState(0);
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [p]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: 24 + p.value * Math.max(0, h - 48) }] }));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      <Animated.View style={[{ position: 'absolute', left: 24, right: 24, height: 3, borderRadius: 2, backgroundColor: color.primary }, shadow.glow, style]} />
    </View>
  );
}

function PickButton({ Icon, label, onPress, primary }: { Icon: LucideIcon; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [{ flex: 1, height: 96, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: primary ? color.primary : color.surface, transform: [{ scale: pressed ? 0.97 : 1 }] }, primary ? shadow.glow : shadow.card]}>
      <Icon size={28} color={primary ? color.onPrimary : color.text} />
      <Text style={[type.subheadStrong, { color: primary ? color.onPrimary : color.text }]}>{label}</Text>
    </Pressable>
  );
}

function Likelihood({ value }: { value: 'low' | 'medium' | 'high' }) {
  const { t } = useTranslation();
  const filled = value === 'high' ? 3 : value === 'medium' ? 2 : 1;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[1, 2, 3].map((i) => <View key={i} style={{ width: 22, height: 6, borderRadius: 3, backgroundColor: i <= filled ? color.primary : 'rgba(255,255,255,0.2)' }} />)}
      </View>
      <Text style={[type.footnote, { color: color.onBrandMuted }]}>{t(`scanner.likelihood.${value}`)}</Text>
    </View>
  );
}

function ResultCard({ emoji, title, children }: { emoji: string; title: string; children: ReactNode }) {
  return (
    <View style={[{ padding: 16, borderRadius: radius.lg, backgroundColor: color.surface, gap: 10 }, shadow.card]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 18 }}>{emoji}</Text>
        <T.Head>{title}</T.Head>
      </View>
      {children}
    </View>
  );
}
