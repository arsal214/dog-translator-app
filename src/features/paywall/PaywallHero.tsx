import { GraduationCap, Mic, Music, ScanFace, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { color, radius, shadow, type } from '@/theme/tokens';

export const HERO_FEATURES = [
  { key: 'translate', Icon: Mic },
  { key: 'sounds', Icon: Music },
  { key: 'scan', Icon: ScanFace },
  { key: 'training', Icon: GraduationCap },
] as const satisfies readonly { key: string; Icon: LucideIcon }[];

const CYCLE_MS = 2800;

/** Index of the feature on show; advances on a timer and restarts the timer when tapped. */
export function useFeatureCycle() {
  const calm = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (calm) return;
    const id = setTimeout(() => setI((n) => (n + 1) % HERO_FEATURES.length), CYCLE_MS);
    return () => clearTimeout(id);
  }, [i, calm]);
  return [i, setI] as const;
}

/**
 * Full-width hero: the real-use AI scan clip, faded into the page at the bottom and darkened at the top so the
 * close/restore controls stay legible. A caption pill below follows the active feature.
 */
export function PaywallHero({ height, active }: { height: number; active: number }) {
  const { t } = useTranslation();
  const key = HERO_FEATURES[active].key;
  return (
    // overflow hidden: the native video layer otherwise draws past the hero with contentFit cover.
    <View style={{ height, overflow: 'hidden' }}>
      <HeroMedia />
      <Fade from="top" />
      <Fade from="bottom" />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 14, alignItems: 'center' }}>
        <Animated.View key={key} entering={FadeInDown.duration(300)} exiting={FadeOut.duration(150)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 34, borderRadius: 17, backgroundColor: 'rgba(21,29,56,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' }}>
          <Text numberOfLines={1} style={[type.footnote, { color: color.onBrand, fontWeight: '700' }]}>{t(`paywall.hero.${key}.a`)}</Text>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color.primary }} />
          <Text numberOfLines={1} style={[type.footnote, { color: color.highlight, fontWeight: '600' }]}>{t(`paywall.hero.${key}.b`)}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

// Gradient scrim blending the video into the navy page.
function Fade({ from }: { from: 'top' | 'bottom' }) {
  const top = from === 'top';
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, [from]: 0, height: top ? '30%' : '50%' }}>
    <Svg width="100%" height="100%">
      <Defs>
        <LinearGradient id={`fade-${from}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color.brandDeep} stopOpacity={top ? 0.75 : 0} />
          <Stop offset="1" stopColor={color.brandDeep} stopOpacity={top ? 0 : 1} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#fade-${from})`} />
    </Svg>
    </View>
  );
}



// Loaded defensively: a dev build made before expo-video was added has no native module, so fall back to the still.
let ExpoVideo: typeof import('expo-video') | null = null;
try {
  ExpoVideo = require('expo-video');
} catch {
  ExpoVideo = null;
}

/** The looping real-use AI scan clip over its still first frame (shown until playback starts and under Reduce Motion). */
function HeroMedia() {
  const calm = useReducedMotion();
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      <Animated.Image accessible={false} source={require('../../../assets/paywall-scan.jpg')} resizeMode="cover" style={StyleSheet.absoluteFill} />
      {ExpoVideo && !calm ? <HeroVideo video={ExpoVideo} source={require('../../../assets/paywall-scan.mp4')} /> : null}
    </View>
  );
}


function HeroVideo({ video, source }: { video: typeof import('expo-video'); source: number }) {
  const player = video.useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers'; // don't pause the user's music
    p.play();
  });
  return <video.VideoView player={player} nativeControls={false} contentFit="cover" allowsPictureInPicture={false} style={StyleSheet.absoluteFill} />;
}

/** Row of round feature tabs under the hero, like a story selector. */
export function FeatureTabs({ active, onSelect }: { active: number; onSelect: (i: number) => void }) {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around' }} accessibilityRole="tablist">
      {HERO_FEATURES.map(({ key, Icon }, i) => {
        const on = i === active;
        return (
          <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onSelect(i)} style={{ alignItems: 'center', gap: 6, width: 76 }}>
            <Tab on={on}>
              <Icon size={24} color={on ? color.onPrimary : color.onBrand} strokeWidth={2.2} />
            </Tab>
            <Text numberOfLines={1} style={[type.caption, { color: on ? color.onBrand : color.onBrandMuted, fontWeight: on ? '700' : '500' }]}>{t(`paywall.hero.${key}.tab`)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Tab({ on, children }: { on: boolean; children: ReactNode }) {
  const style = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(on ? 1.08 : 1) }], opacity: withTiming(on ? 1 : 0.6) }));
  return (
    <Animated.View style={[{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: on ? color.onBrand : 'rgba(255,255,255,0.18)', backgroundColor: on ? color.primary : 'rgba(255,255,255,0.1)' }, on && shadow.glow, style]}>
      {children}
    </Animated.View>
  );
}

/** Amber pill with a glossy top highlight, a shine that sweeps across, and a gentle pulse. */
export function GlossyButton({ label, onPress, disabled, children }: { label: string; onPress: () => void; disabled?: boolean; children?: ReactNode }) {
  const calm = useReducedMotion();
  const [w, setW] = useState(0);
  const shine = useSharedValue(0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (calm || disabled) return;
    shine.value = withRepeat(withSequence(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), withDelay(1400, withTiming(0, { duration: 0 }))), -1);
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })), -1);
  }, [calm, disabled, shine, pulse]);
  const shineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -80 + shine.value * (w + 160) }, { skewX: '-20deg' }] }));
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.025 }] }));
  return (
    <Animated.View style={pulseStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={onPress}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        style={({ pressed }) => [{ height: 60, borderRadius: radius.full, borderWidth: 3, borderColor: disabled ? 'transparent' : color.brandSoft, overflow: 'hidden', opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }, !disabled && shadow.glow]}
      >
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="cta" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color.highlight} />
              <Stop offset="0.55" stopColor={color.primary} />
              <Stop offset="1" stopColor={color.primaryPressed} />
            </LinearGradient>
            <LinearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#cta)" />
          <Rect x="6%" y="8%" width="88%" height="40%" rx="14" fill="url(#gloss)" />
        </Svg>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -10, bottom: -10, width: 46, backgroundColor: 'rgba(255,255,255,0.45)' }, shineStyle]} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      </Pressable>
    </Animated.View>
  );
}
