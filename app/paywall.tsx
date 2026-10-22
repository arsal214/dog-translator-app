import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Check, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';
import { Mascot } from '@/components/Mascot';
import { Button, Card, Screen, T } from '@/components/ui';
import { Floaters, Halo, HeroBackdrop } from '@/features/dog-profiles/HeroDecor';
import { purchase, restore, usePurchases } from '@/services/purchases';
import { color, radius, shadow, type } from '@/theme/tokens';

const BENEFIT_EMOJI = { dogs: '🐶', sounds: '🔊', ai: '✨', training: '🎓', portraits: '🎨' } as const;

// Replace with your hosted pages before release.
const TERMS = 'https://example.com/terms';
const PRIVACY = 'https://example.com/privacy';

export default function Paywall() {
  const { t } = useTranslation();
  const router = useRouter();
  const fromOnboarding = useLocalSearchParams<{ from?: string }>().from === 'onboarding';
  // Straight after onboarding there is nothing to go back to, so continue into the app.
  const leave = async () => {
    if (!fromOnboarding) return router.back();
    router.replace('/(tabs)/translate');
    // Loaded lazily so a build without the native module still works.
    // iOS decides whether the rating prompt actually appears (at most 3 times a year).
    const StoreReview = await import('expo-store-review').catch(() => null);
    if (StoreReview && (await StoreReview.isAvailableAsync())) StoreReview.requestReview().catch(() => {});
  };
  const header = fromOnboarding
    ? { headerShown: true, title: 'Pro', headerBackVisible: false, gestureEnabled: false, headerRight: () => <Pressable accessibilityRole="button" accessibilityLabel={t('common.skip')} hitSlop={12} onPress={leave}><X size={24} color={color.text} /></Pressable> }
    : { headerShown: true, title: 'Pro' };
  const { packages, isPro, ready } = usePurchases();
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const buy = async () => {
    const pkg = packages[sel];
    if (!pkg) return;
    setBusy(true);
    const r = await purchase(pkg);
    setBusy(false);
    if (r === 'success') leave();
    else if (r === 'error') setMsg(t('paywall.failed'));
  };

  const doRestore = async () => {
    setBusy(true);
    const ok = await restore();
    setBusy(false);
    setMsg(ok ? t('paywall.restored') : t('paywall.nothingToRestore'));
  };

  if (isPro)
    return <Screen><Stack.Screen options={header} /><T.Title>{t('paywall.youArePro')}</T.Title>{fromOnboarding ? <Button label={t('common.continue')} onPress={leave} /> : null}</Screen>;

  return (
    <Screen style={{ gap: 20, paddingBottom: 40 }}>
      <Stack.Screen options={header} />
      <Animated.View entering={FadeInDown.springify()} style={[{ borderRadius: radius.xl, overflow: 'hidden', alignItems: 'center', gap: 12, padding: 24 }, shadow.raised]}>
        <HeroBackdrop />
        <Floaters />
        <View style={{ width: 120, height: 120 }}>
          <Halo size={120} />
          <Animated.View entering={ZoomIn.springify()} style={[{ width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: color.primary, backgroundColor: color.brandSoft, overflow: 'hidden' }, shadow.glow]}>
            <Mascot size={112} />
          </Animated.View>
        </View>
        <Text accessibilityRole="header" style={[type.title1, { color: color.onBrand, textAlign: 'center' }]}>{t('paywall.title')} 👑</Text>
        <Text style={[type.callout, { color: color.onBrandMuted, textAlign: 'center' }]}>{t('paywall.body')}</Text>
      </Animated.View>

      <View style={{ gap: 10 }}>
        {(['dogs', 'sounds', 'ai', 'training', 'portraits'] as const).map((k, i) => (
          <Animated.View key={k} entering={FadeInRight.delay(150 + i * 60).springify()} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: color.surface }, shadow.card]}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: color.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20 }}>{BENEFIT_EMOJI[k]}</Text>
            </View>
            <Text style={[type.headline, { color: color.text, flex: 1 }]}>{t(`paywall.benefits.${k}`)}</Text>
            <Check size={20} color={color.primary} strokeWidth={3} />
          </Animated.View>
        ))}
      </View>

      {!ready || packages.length === 0 ? (
        <Card><T.Body>{t('paywall.unavailable')}</T.Body></Card>
      ) : (
        <View style={{ gap: 12 }} accessibilityRole="radiogroup">
          {packages.map((p, i) => {
            const on = i === sel;
            return (
              <Pressable key={p.identifier} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => { Haptics.selectionAsync(); setSel(i); }} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : on ? 1.02 : 1 }] })}>
                <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.lg, backgroundColor: on ? color.brandSoft : color.surface, borderWidth: 2, borderColor: on ? color.primary : color.border }, on && shadow.glow]}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: on ? color.primary : color.border, backgroundColor: on ? color.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {on && <Check size={16} color={color.onPrimary} strokeWidth={3} />}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T.Head>{t(`paywall.plans.${p.packageType}`, { defaultValue: t('paywall.plans.OTHER') })}</T.Head>
                    {p.product.introPrice ? <Text style={[type.footnote, { color: color.textAccent }]}>{p.product.introPrice.priceString} · {p.product.introPrice.periodNumberOfUnits} {p.product.introPrice.periodUnit.toLowerCase()}</Text> : null}
                  </View>
                  <Text style={[type.title3, { color: color.text }]}>{p.product.priceString}</Text>
                  {p.packageType === 'ANNUAL' && (
                    <View style={{ position: 'absolute', top: -12, right: 16, paddingHorizontal: 10, height: 24, borderRadius: 12, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={[type.caption, { color: color.onPrimary, fontWeight: '700' }]}>⭐ {t('paywall.bestValue')}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
      <Button label={t('paywall.subscribe')} loading={busy} disabled={packages.length === 0} onPress={buy} />
      {msg ? <T.Body style={{ textAlign: 'center' }}>{msg}</T.Body> : null}
      {fromOnboarding ? <Button variant="secondary" label={t('common.skip')} onPress={leave} /> : null}
      <T.Body style={{ textAlign: 'center' }}>{t('paywall.disclosure')}</T.Body>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
        <Pressable accessibilityRole="link" onPress={doRestore}><Text style={{ color: color.textAccent }}>{t('paywall.restore')}</Text></Pressable>
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(TERMS)}><Text style={{ color: color.textAccent }}>{t('more.terms')}</Text></Pressable>
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY)}><Text style={{ color: color.textAccent }}>{t('more.privacy')}</Text></Pressable>
      </View>
    </Screen>
  );
}
