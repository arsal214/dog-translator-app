import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { ImagePlus } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/ui';
import { errorKey, isLimit } from '@/lib/errors';
import { callFn } from '@/services/api';
import { color, radius, shadow, type } from '@/theme/tokens';

const STYLES = [
  { key: 'sticker', emoji: '🏷️', bg: '#DDF7E9', fg: '#12A878' },
  { key: 'cartoon', emoji: '🎨', bg: '#EAF2FC', fg: '#2F5BD3' },
  { key: 'royal', emoji: '👑', bg: '#FFF1CC', fg: '#B07800' },
] as const;
type Style = (typeof STYLES)[number]['key'];

export default function Portraits() {
  const { t } = useTranslation();
  const router = useRouter();
  const [style, setStyle] = useState<Style>('sticker');
  const [uri, setUri] = useState<string | null>(null);
  const [out, setOut] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [limit, setLimit] = useState(false);
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: false });
    if (!r.canceled) { setUri(r.assets[0].uri); setOut(null); setErr(''); setLimit(false); }
  };

  // Free users spend a credit on the server; running out shows the Pro button.
  const generate = async () => {
    setBusy(true);
    setErr('');
    setLimit(false);
    try {
      const r = await callFn<{ imageBase64: string }>('portrait', { style });
      setOut(`data:image/png;base64,${r.imageBase64}`);
    } catch (e) {
      setErr(t(errorKey(e)));
      setLimit(isLimit(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={t('portraits.title')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 18 }} showsVerticalScrollIndicator={false}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.xl, backgroundColor: '#EFE5FF' }, shadow.card]}>
          <Image source={require('../assets/illustrations/ai-portraits.png')} style={{ width: 88, height: 88 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[type.headline, { color: color.text, fontWeight: '800' }]}>{t('portraits.introTitle')}</Text>
            <Text style={[type.footnote, { color: color.textSecondary }]}>{t('portraits.body')}</Text>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={[type.title3, { color: color.text, fontWeight: '800' }]}>{t('portraits.chooseStyle')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {STYLES.map((s) => {
              const on = style === s.key;
              return (
                <Pressable key={s.key} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setStyle(s.key)} style={({ pressed }) => [{ flex: 1, height: 104, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: s.bg, borderWidth: 3, borderColor: on ? color.primary : 'transparent', transform: [{ scale: pressed ? 0.96 : on ? 1.03 : 1 }] }, on ? shadow.glow : shadow.card]}>
                  <Text style={{ fontSize: 34 }}>{s.emoji}</Text>
                  <Text style={[type.subheadStrong, { color: s.fg, fontWeight: '800' }]}>{t(`portraits.styles.${s.key}`)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel={t('portraits.pick')} onPress={pick} style={[{ aspectRatio: 1, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: color.surface, borderWidth: uri ? 0 : 2, borderStyle: 'dashed', borderColor: color.border, alignItems: 'center', justifyContent: 'center' }, shadow.card]}>
          {uri ? (
            <>
              <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={t('scanner.photo')} />
              <View style={{ position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: 'rgba(21,29,56,0.7)' }}>
                <ImagePlus size={16} color={color.onBrand} />
                <Text style={[type.caption, { color: color.onBrand, fontWeight: '700' }]}>{t('portraits.change')}</Text>
              </View>
            </>
          ) : (
            <View style={{ alignItems: 'center', gap: 10, padding: 24 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: color.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
                <ImagePlus size={32} color={color.textAccent} />
              </View>
              <Text style={[type.headline, { color: color.text }]}>{t('portraits.pick')}</Text>
              <Text style={[type.footnote, { color: color.textSecondary, textAlign: 'center' }]}>{t('portraits.pickHint')}</Text>
            </View>
          )}
          {busy ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(21,29,56,0.45)', alignItems: 'center', justifyContent: 'center', gap: 10 }]}>
              <ActivityIndicator color={color.primary} size="large" />
              <Text style={[type.subheadStrong, { color: color.onBrand }]}>{t('portraits.creating')}</Text>
            </View>
          ) : null}
        </Pressable>

        <View style={{ gap: 8 }}>
          <Button label={`✨ ${t('portraits.generate')}`} loading={busy} disabled={!uri} onPress={generate} />
          <Text style={[type.caption, { color: color.textSecondary, textAlign: 'center' }]}>⚡ {t('portraits.costHint')}</Text>
        </View>

        {err ? (
          <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: color.dangerSoft }}>
            <Text style={{ fontSize: 18 }}>⚠️</Text>
            <Text style={[type.subhead, { color: color.textDanger, flex: 1 }]}>{err}</Text>
          </View>
        ) : null}
        {limit ? <Button label={t('paywall.seePro')} onPress={() => router.push('/paywall?reason=portraits')} /> : null}

        {out ? (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 10 }}>
            <Text style={[type.title3, { color: color.text, fontWeight: '800' }]}>{t('portraits.result')}</Text>
            <Animated.View entering={ZoomIn.springify()} style={[{ aspectRatio: 1, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 4, borderColor: color.primary }, shadow.glow]}>
              <Image source={{ uri: out }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={t('portraits.result')} />
            </Animated.View>
          </Animated.View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
