import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Check, ShieldCheck, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInRight, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';
import { FeatureTabs, GlossyButton, PaywallHero, useFeatureCycle } from '@/features/paywall/PaywallHero';
import { isGuest } from '@/services/account';
import { PRIVACY_URL, TERMS_URL } from '@/lib/links';
import { log } from '@/services/logger';
import { loadOfferings, purchase, restore, usePurchases } from '@/services/purchases';
import { color, radius, shadow, type } from '@/theme/tokens';


const DAYS: Partial<Record<PurchasesPackage['packageType'], number>> = { WEEKLY: 7, MONTHLY: 30, TWO_MONTH: 61, THREE_MONTH: 91, SIX_MONTH: 182, ANNUAL: 365 };

// Formats like the store's own price string (e.g. "$4.99", "4,99 €"), reusing its currency symbol and placement.
const money = (value: number, like: string) => {
  const [, pre = '', post = ''] = /^([^\d]*)[\d.,\s\u00a0]*\d([^\d]*)$/.exec(like) ?? [];
  const n = (() => {
    try {
      return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    } catch {
      return value.toFixed(2);
    }
  })();
  return `${pre}${n}${post}`;
};

export default function Paywall() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
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
  const { packages, isPro, ready, offeringsError } = usePurchases();
  const [feature, setFeature] = useFeatureCycle();
  const [sel, setSel] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const hasPackages = packages.length > 0;
  useEffect(() => {
    log.info('paywall_view', { from: fromOnboarding ? 'onboarding' : 'app' });
  }, [fromOnboarding]);
  useEffect(() => {
    if (!hasPackages) void loadOfferings();
  }, [hasPackages]);

  // Preselect the yearly plan: it's the best value and what most paywalls lead with.
  const selected = packages.find((p) => p.identifier === sel) ?? packages.find((p) => p.packageType === 'ANNUAL') ?? packages[0];
  const weekly = packages.find((p) => p.packageType === 'WEEKLY')?.product.price;
  const days = selected && DAYS[selected.packageType];
  const renewal = !selected
    ? ''
    : selected.packageType === 'LIFETIME'
      ? t('paywall.oneTime', { price: selected.product.priceString })
      : t('paywall.renews', {
          price: selected.product.priceString,
          period: t(`paywall.period.${selected.packageType}`, { defaultValue: t(`paywall.plans.${selected.packageType}`) }),
          day: days ? money(selected.product.price / days, selected.product.priceString) : '',
        });

  const buy = async () => {
    if (!selected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBusy(true);
    const r = await purchase(selected);
    setBusy(false);
    if (r === 'success') afterPro();
    else if (r === 'error') setMsg(t('paywall.failed'));
  };

  // Guests must attach the purchase to an account before going on.
  const afterPro = async () => {
    if (await isGuest()) router.replace('/create-account');
    else leave();
  };

  const doRestore = async () => {
    setBusy(true);
    const ok = await restore();
    setBusy(false);
    if (ok) return afterPro();
    setMsg(t('paywall.nothingToRestore'));
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.brandDeep }}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: !fromOnboarding }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 8 }} showsVerticalScrollIndicator={false} bounces={false}>
        <PaywallHero height={insets.top + Math.max(220, Math.min(width * 0.8, height * 0.32))} active={feature} />

        <View style={{ flex: 1, paddingHorizontal: 20, gap: 14 }}>
          <FeatureTabs active={feature} onSelect={(i) => { Haptics.selectionAsync(); setFeature(i); }} />

          <Text accessibilityRole="header" style={[type.headline, { color: color.onBrand, textAlign: 'center' }]}>🎁 {t('paywall.title')}</Text>

          {isPro ? (
            <Text style={[type.headline, { color: color.highlight, textAlign: 'center' }]}>{t('paywall.youArePro')}</Text>
          ) : !hasPackages ? (
            <View style={{ padding: 16, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', gap: 8 }}>
              {!ready ? <ActivityIndicator color={color.primary} /> : null}
              <Text style={[type.footnote, { color: color.onBrandMuted, textAlign: 'center' }]}>{t('paywall.unavailable')}</Text>
              {ready && offeringsError ? <Text selectable style={[type.caption, { color: color.onBrandMuted, textAlign: 'center', opacity: 0.7 }]}>{offeringsError}</Text> : null}
              {ready ? (
                <Pressable accessibilityRole="button" onPress={() => void loadOfferings()} hitSlop={8}>
                  <Text style={[type.footnote, { color: color.highlight, fontWeight: '700' }]}>{t('common.retry')}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View accessibilityRole="radiogroup" style={{ gap: 11, paddingTop: 6 }}>
              {packages.map((p, i) => (
                <Animated.View key={p.identifier} entering={FadeInRight.delay(150 + i * 70).springify()}>
                  <Plan pkg={p} on={p.identifier === selected?.identifier} weekly={weekly} onPress={() => { Haptics.selectionAsync(); setSel(p.identifier); }} />
                </Animated.View>
              ))}
            </View>
          )}

          <View style={{ flex: 1 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <ShieldCheck size={16} color="#3CCB7F" strokeWidth={2.5} />
            <Text style={[type.caption, { color: color.onBrandMuted, letterSpacing: 0.4 }]}>{t('paywall.secured')}</Text>
          </View>

          {isPro ? null : (
            <GlossyButton label={t('paywall.subscribe')} onPress={buy} disabled={!selected || busy}>
              {busy ? <ActivityIndicator color={color.onPrimary} /> : <Text style={[type.title3, { color: color.onPrimary, fontWeight: '800' }]}>{t('paywall.subscribe')}</Text>}
            </GlossyButton>
          )}

          {msg ? <Text style={[type.footnote, { color: color.highlight, textAlign: 'center' }]}>{msg}</Text> : null}
          {renewal ? <Text style={[type.footnote, { color: color.onBrandMuted, textAlign: 'center' }]}>{renewal}</Text> : null}

          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
            <Link label={t('more.terms')} onPress={() => Linking.openURL(TERMS_URL)} />
            <Dot />
            <Link label={t('paywall.continueFree')} onPress={leave} strong />
            <Dot />
            <Link label={t('more.privacy')} onPress={() => Linking.openURL(PRIVACY_URL)} />
          </View>
        </View>
      </ScrollView>

      <Animated.View entering={FadeIn.delay(1200)} style={{ position: 'absolute', top: insets.top + 4, left: 16 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={12} onPress={leave} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} color={color.onBrandMuted} />
        </Pressable>
      </Animated.View>
      <Pressable accessibilityRole="button" hitSlop={12} onPress={doRestore} style={{ position: 'absolute', top: insets.top + 8, right: 16 }}>
        <Text style={[type.subheadStrong, { color: color.onBrand }]}>{t('paywall.restoreShort')}</Text>
      </Pressable>
    </View>
  );
}

function Plan({ pkg, on, weekly, onPress }: { pkg: PurchasesPackage; on: boolean; weekly?: number; onPress: () => void }) {
  const { t } = useTranslation();
  const { product, packageType } = pkg;
  const save = weekly && product.pricePerWeek && packageType !== 'WEEKLY' ? Math.round((1 - product.pricePerWeek / weekly) * 100) : 0;
  const best = packageType === 'ANNUAL';
  const lifetime = packageType === 'LIFETIME';
  // What the same time would cost on the weekly plan, shown struck through.
  const was = weekly && save > 0 && DAYS[packageType] ? money((weekly * DAYS[packageType]) / 7, product.priceString) : null;
  const badge = best ? t('paywall.bestValue') : save > 0 ? t('paywall.save', { pct: save }) : packageType === 'WEEKLY' ? t('paywall.popular') : null;
  const period = t(`paywall.period.${packageType}`, { defaultValue: '' });
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(on ? 1 : 0.4) }], opacity: withSpring(on ? 1 : 0) }));
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={onPress} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md, borderWidth: 2.5, backgroundColor: on ? color.brandSoft : 'rgba(255,255,255,0.94)', borderColor: on ? '#F07A2A' : 'transparent' }, on ? shadow.glow : shadow.card]}>
        <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: on ? '#F07A2A' : color.border, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#F07A2A', alignItems: 'center', justifyContent: 'center' }, ring]}>
            <Check size={15} color={color.onBrand} strokeWidth={3.5} />
          </Animated.View>
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text numberOfLines={1} style={[type.headline, { color: color.text, fontWeight: '800' }]}>
            {t(`paywall.plans.${packageType}`, { defaultValue: t('paywall.plans.OTHER') })}
          </Text>
          {lifetime ? <Text numberOfLines={1} style={[type.caption, { color: color.textSecondary }]}>{t('paywall.oneTimeShort')}</Text> : null}
          {was ? <Text numberOfLines={1} style={[type.caption, { color: color.textTertiary, textDecorationLine: 'line-through' }]}>{was}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text numberOfLines={1} style={{ fontSize: 23, lineHeight: 28, fontWeight: '800', color: color.text }}>{product.priceString}</Text>
          <Text style={[type.caption, { color: color.textSecondary }]}>{lifetime ? t('paywall.forever') : period ? t('paywall.perPeriod', { period }) : ''}</Text>
        </View>
      </View>
      {badge ? (
        <View style={{ position: 'absolute', top: -10, alignSelf: 'center', paddingHorizontal: 12, height: 21, borderRadius: 11, backgroundColor: best ? '#F07A2A' : color.primary, justifyContent: 'center' }}>
          <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '800', color: best ? color.onBrand : color.onPrimary, letterSpacing: 0.4 }}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function Link({ label, onPress, strong }: { label: string; onPress: () => void; strong?: boolean }) {
  return (
    <Pressable accessibilityRole="link" hitSlop={8} onPress={onPress}>
      <Text style={[type.caption, { color: strong ? color.highlight : color.onBrandMuted, fontWeight: strong ? '700' : '500' }]}>{label}</Text>
    </Pressable>
  );
}

const Dot = () => <Text style={[type.caption, { color: color.onBrandMuted, opacity: 0.6 }]}>·</Text>;
