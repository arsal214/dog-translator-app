import { Square } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { color, shadow } from '@/theme/tokens';

/** Solid microphone: filled capsule, cradle arc and stand (lucide's outline icon smears when filled). */
export function MicGlyph({ size, color: c }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="8.5" y="2" width="7" height="12" rx="3.5" fill={c} />
      <Path d="M5 11a7 7 0 0 0 14 0" stroke={c} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M12 18v3.5M8.5 21.5h7" stroke={c} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

/** Solid paw: four toes and a pad. */
export function PawGlyph({ size, color: c }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={c}>
      <Ellipse cx="4.8" cy="11.2" rx="2.1" ry="2.8" transform="rotate(-18 4.8 11.2)" />
      <Ellipse cx="9.2" cy="6" rx="2.2" ry="3" transform="rotate(-6 9.2 6)" />
      <Ellipse cx="14.8" cy="6" rx="2.2" ry="3" transform="rotate(6 14.8 6)" />
      <Ellipse cx="19.2" cy="11.2" rx="2.1" ry="2.8" transform="rotate(18 19.2 11.2)" />
      <Path d="M12 11.5c-3.6 0-6.4 3.2-6.4 5.9 0 2.2 1.6 3.3 3.3 3.3 1.1 0 2-.5 3.1-.5s2 .5 3.1.5c1.7 0 3.3-1.1 3.3-3.3 0-2.7-2.8-5.9-6.4-5.9z" />
    </Svg>
  );
}

const BUTTON = 128;
const STAGE = 280;
const RING = 164; // progress ring diameter
const RING_STROKE = 6;

/** Three rings that keep expanding and fading out from behind the button. */
function PulseRings({ tint, fast }: { tint: string; fast: boolean }) {
  const anims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const duration = fast ? 1400 : 2400;
    const loops = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay((i * duration) / 3),
          Animated.timing(a, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(a, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [fast, anims]);

  return (
    <>
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: BUTTON,
            height: BUTTON,
            borderRadius: BUTTON / 2,
            borderWidth: 2,
            borderColor: tint,
            opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
            transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) }],
          }}
        />
      ))}
    </>
  );
}

/** Thin ring around the button that fills as the 10 s limit approaches. */
function ProgressRing({ progress }: { progress: number }) {
  const r = (RING - RING_STROKE) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={RING} height={RING} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }} pointerEvents="none">
      <Circle cx={RING / 2} cy={RING / 2} r={r} stroke="rgba(27,34,54,0.08)" strokeWidth={RING_STROKE} fill="none" />
      <Circle cx={RING / 2} cy={RING / 2} r={r} stroke={color.primary} strokeWidth={RING_STROKE} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, progress))} />
    </Svg>
  );
}

/** Spinning arc shown while the bark is being analysed. */
function Spinner() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }));
    l.start();
    return () => l.stop();
  }, [spin]);
  const r = (RING - RING_STROKE) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
      <Svg width={RING} height={RING}>
        <Circle cx={RING / 2} cy={RING / 2} r={r} stroke={color.primary} strokeWidth={RING_STROKE} fill="none" strokeLinecap="round" strokeDasharray={`${c * 0.28} ${c}`} />
      </Svg>
    </Animated.View>
  );
}

const CREAM = '#FFF1DC';
// Glossy button palettes: warm orange for the human voice, coral for the dog.
const TONES = {
  human: { light: '#FFD9A0', mid: '#F9A64A', deep: '#EA7A1E', ring: '#FFB35C', halo: 'rgba(249,166,74,0.22)' },
  dog: { light: '#FFB1A8', mid: '#F4655F', deep: '#DD4444', ring: '#FF8A80', halo: 'rgba(244,101,95,0.22)' },
} as const;

/**
 * The big mic button with its animated surroundings.
 * `level` is the live input loudness (0–1) so the glow breathes with the bark.
 */
export function RecordStage({ state, level, progress, onPress, label, tone = 'human' }: { state: 'idle' | 'recording' | 'analyzing'; level: number; progress: number; onPress: () => void; label: string; tone?: 'human' | 'dog' }) {
  const recording = state === 'recording';
  const t = TONES[tone];
  const busy = state === 'analyzing';
  const glow = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(glow, { toValue: recording ? level : 0, duration: 120, useNativeDriver: true }).start();
  }, [level, recording, glow]);

  const pressTo = (v: number) => Animated.spring(press, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 8 }).start();

  return (
    <View style={{ width: STAGE, height: STAGE, alignItems: 'center', justifyContent: 'center' }}>
      {!busy && <PulseRings tint={recording ? 'rgba(255,120,100,0.9)' : t.ring} fast={recording} />}
      {/* loudness-reactive halo */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: BUTTON + 24,
          height: BUTTON + 24,
          borderRadius: (BUTTON + 24) / 2,
          backgroundColor: recording ? 'rgba(214,69,53,0.35)' : t.halo,
          transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
        }}
      />
      {recording && <ProgressRing progress={progress} />}
      {busy && <Spinner />}
      <Animated.View style={{ transform: [{ scale: press }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          disabled={busy}
          onPress={onPress}
          onPressIn={() => pressTo(0.92)}
          onPressOut={() => pressTo(1)}
          style={[
            { width: BUTTON, height: BUTTON, borderRadius: BUTTON / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: recording ? color.surface : busy ? color.subtle : t.mid, borderWidth: 5, borderColor: recording ? color.border : '#FFFFFF' },
            busy ? null : recording ? shadow.raised : { shadowColor: t.mid, shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
          ]}
        >
          {!recording && !busy ? (
            // Glossy amber fill: light top-left highlight fading to a deeper orange.
            <Svg width={BUTTON - 8} height={BUTTON - 8} style={{ position: 'absolute' }}>
              <Defs>
                <RadialGradient id="micFill" cx="35%" cy="28%" r="80%">
                  <Stop offset="0" stopColor={t.light} />
                  <Stop offset="0.55" stopColor={t.mid} />
                  <Stop offset="1" stopColor={t.deep} />
                </RadialGradient>
              </Defs>
              <Circle cx={(BUTTON - 8) / 2} cy={(BUTTON - 8) / 2} r={(BUTTON - 8) / 2} fill="url(#micFill)" />
            </Svg>
          ) : null}
          {recording ? <Square size={40} color={color.danger} fill={color.danger} strokeWidth={0} /> : (tone === 'dog' ? PawGlyph : MicGlyph)({ size: 64, color: busy ? color.onBrandMuted : CREAM })}
        </Pressable>
      </Animated.View>
    </View>
  );
}

/** Mirrored live waveform; the newest bars are brightest. */
export function LiveWave({ levels, count = 36, h = 64 }: { levels: number[]; count?: number; h?: number }) {
  const recent = levels.slice(-count);
  const bars = Array.from({ length: count }, (_, i) => recent[i - (count - recent.length)] ?? 0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: h }}>
      {bars.map((b, i) => (
        <View key={i} style={{ width: 4, height: Math.max(4, b * h), borderRadius: 2, backgroundColor: color.primary, opacity: 0.35 + 0.65 * (i / count) }} />
      ))}
    </View>
  );
}

/** expo-audio metering is in dBFS (about -160…0); map the useful -55…-5 range to 0…1. */
export const levelFromDb = (db: number) => Math.max(0, Math.min(1, (db + 55) / 50));

export type TranslateMode = 'bark' | 'human';
