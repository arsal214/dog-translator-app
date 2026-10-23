import { useRouter } from 'expo-router';
import { ChevronRight, Settings } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useCredits } from '@/services/credits';
import { usePurchases } from '@/services/purchases';
import { color, radius, shadow, type } from '@/theme/tokens';

// Every tab shares the same light canvas and header: title (or a custom leading element) on the left,
// an amber PRO pill and settings on the right.
export const TAB_BG = color.canvas;
// Room left under scroll content; the tab bar is docked, so only a small gap is needed.
export const TAB_BAR_SPACE = 12;

export function AppHeader({ title, leading, right }: { title?: string; leading?: ReactNode; right?: ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();
  const isPro = usePurchases((s) => s.isPro);
  const credits = useCredits((s) => s.balance);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 60, paddingHorizontal: 16 }}>
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        {leading ?? <Text accessibilityRole="header" numberOfLines={1} style={[type.title2, { color: color.text, fontWeight: '800' }]}>{title}</Text>}
      </View>
      {right}
      {/* Everyone sees their credit balance; for free users tapping it explains Pro. */}
      {credits === null ? null : (
        <Pressable accessibilityRole="button" accessibilityLabel={t('credits.left', { count: credits })} hitSlop={6} disabled={isPro} onPress={() => router.push('/paywall?reason=credits')} style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 34, borderRadius: 17, backgroundColor: credits > 0 ? color.surface : color.dangerSoft }, shadow.card]}>
          <Text style={{ fontSize: 13 }}>⚡</Text>
          <Text style={[type.subheadStrong, { color: credits > 0 ? color.text : color.textDanger, fontVariant: ['tabular-nums'] }]}>{credits}</Text>
        </Pressable>
      )}
      {isPro ? null : (
        <Pressable accessibilityRole="button" accessibilityLabel={t('paywall.seePro')} hitSlop={6} onPress={() => router.push('/paywall')} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: color.primary, transform: [{ scale: pressed ? 0.95 : 1 }] }, shadow.glow]}>
          <Text style={{ fontSize: 14 }}>👑</Text>
          <Text style={[type.caption, { color: color.onPrimary, fontWeight: '800', letterSpacing: 0.6 }]}>PRO</Text>
        </Pressable>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel={t('settings.title')} hitSlop={6} onPress={() => router.push('/settings')} style={[styles.icon, shadow.card]}>
        <Settings size={20} color={color.text} />
      </Pressable>
    </View>
  );
}

/** Amber "Go Pro" strip shown at the top of a tab for free users. */
export function ProBanner() {
  const { t } = useTranslation();
  const router = useRouter();
  const isPro = usePurchases((s) => s.isPro);
  if (isPro) return null;
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/paywall')} style={({ pressed }) => [{ marginHorizontal: 16, borderRadius: radius.lg, overflow: 'hidden', transform: [{ scale: pressed ? 0.98 : 1 }] }, shadow.glow]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="pro" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color.highlight} />
            <Stop offset="1" stopColor="#F07A2A" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#pro)" />
      </Svg>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ fontSize: 26 }}>👑</Text>
        <Text numberOfLines={2} style={[type.subheadStrong, { flex: 1, color: color.onPrimary, fontWeight: '800' }]}>{t('app.proBanner')}</Text>
        <ChevronRight size={20} color={color.onPrimary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface },
});
