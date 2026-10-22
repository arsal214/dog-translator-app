import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { color } from '@/theme/tokens';

function useCalm() {
  const [calm, setCalm] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setCalm); }, []);
  return calm;
}

export function HeroBackdrop() {
  // Percent sizes left a gap on the right, so the SVG is sized from the measured box.
  const [box, setBox] = useState({ w: 0, h: 0 });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {box.w > 0 && <Gradient w={box.w} h={box.h} />}
    </View>
  );
}

function Gradient({ w, h }: { w: number; h: number }) {
  return (
    <Svg width={w} height={h}>
      <Defs>
        <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color.brandDeep} />
          <Stop offset="1" stopColor={color.brandStrong} />
        </LinearGradient>
        <RadialGradient id="glow" cx="50%" cy="48%" rx="55%" ry="40%">
          <Stop offset="0" stopColor={color.primary} stopOpacity="0.55" />
          <Stop offset="1" stopColor={color.primary} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#bg)" />
      <Rect width="100%" height="100%" fill="url(#glow)" />
    </Svg>
  );
}

// Expanding rings behind the avatar.
export function Halo({ size }: { size: number }) {
  const calm = useCalm();
  return (
    <>
      {[0, 1].map((i) => <Ring key={i} size={size} delay={i * 1100} calm={calm} />)}
    </>
  );
}

function Ring({ size, delay, calm }: { size: number; delay: number; calm: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (!calm) p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1));
  }, [calm, delay, p]);
  const style = useAnimatedStyle(() => ({ opacity: calm ? 0 : 0.6 * (1 - p.value), transform: [{ scale: 1 + p.value * 0.7 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: color.primary }, style]} />;
}

const FLOATERS = [
  { e: '🦴', left: '9%', top: 56, d: 0 },
  { e: '🐾', right: '10%', top: 72, d: 300 },
  { e: '⭐', left: '16%', top: 106, d: 600 },
  { e: '🎾', right: '14%', top: 112, d: 900 },
] as const;

export function Floaters() {
  const calm = useCalm();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {FLOATERS.map(({ e, d, ...pos }) => <Floater key={e} emoji={e} delay={d} calm={calm} pos={pos} />)}
    </View>
  );
}

function Floater({ emoji, delay, calm, pos }: { emoji: string; delay: number; calm: boolean; pos: object }) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (!calm) p.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) })), -1));
  }, [calm, delay, p]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -10 * p.value }, { rotate: `${(p.value - 0.5) * 24}deg` }] }));
  return <Animated.Text style={[{ position: 'absolute', fontSize: 26, opacity: 0.9 }, pos, style]}>{emoji}</Animated.Text>;
}
