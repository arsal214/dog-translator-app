import { ArrowRight, Mic, Square } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { color, radius, shadow, type } from '@/theme/tokens';

const BUTTON = 128;
const STAGE = 280;
const RING = 164; // progress ring diameter
const RING_STROKE = 6;

// Small paw prints and bones scattered over a 390×844 design space that is scaled to cover the screen.
// Jittered grid with a fixed seed, so the pattern looks random but never changes between renders.
// The title area and the mic are left empty so the pattern stays in the background.
type Mark = [x: number, y: number, rotation: number, scale: number];
function scatter(): { paws: Mark[]; bones: Mark[] } {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const paws: Mark[] = [];
  const bones: Mark[] = [];
  const COLS = 5, ROWS = 10, W = 390 / COLS, H = 844 / ROWS;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const x = (c + 0.5) * W + (rnd() - 0.5) * W * 0.5 + (r % 2 ? W / 2 : 0);
      const y = (r + 0.5) * H + (rnd() - 0.5) * H * 0.4;
      const rot = rnd() * 70 - 35;
      const size = 0.75 + rnd() * 0.3;
      const nearMic = (x - 195) ** 2 / 175 ** 2 + (y - 430) ** 2 / 190 ** 2 < 1;
      const behindTitle = y < 230 && x > 50 && x < 340;
      if (nearMic || behindTitle || x > 395) continue;
      ((r * 2 + c) % 4 === 0 ? bones : paws).push([x, y, rot, size]);
    }
  return { paws, bones };
}
const { paws: PAWS, bones: BONES } = scatter();

/** A paw print centred on 0,0: one big pad and four toes. */
function Paw({ x, y, r, s }: { x: number; y: number; r: number; s: number }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${r}) scale(${s * 0.75})`}>
      <Ellipse cx={0} cy={6} rx={11} ry={9} />
      <Ellipse cx={-12} cy={-6} rx={4.2} ry={5.5} rotation={-20} />
      <Ellipse cx={-4.5} cy={-13} rx={4.2} ry={5.8} />
      <Ellipse cx={4.5} cy={-13} rx={4.2} ry={5.8} />
      <Ellipse cx={12} cy={-6} rx={4.2} ry={5.5} rotation={20} />
    </G>
  );
}

/** A bone centred on 0,0: a shaft with two knobs at each end. */
function Bone({ x, y, r, s }: { x: number; y: number; r: number; s: number }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${r}) scale(${s * 0.75})`}>
      <Rect x={-14} y={-3.5} width={28} height={7} rx={3} />
      <Circle cx={-15} cy={-4.5} r={5} />
      <Circle cx={-15} cy={4.5} r={5} />
      <Circle cx={15} cy={-4.5} r={5} />
      <Circle cx={15} cy={4.5} r={5} />
    </G>
  );
}

/** Paw prints and bones scaled to cover their parent. */
function PawPattern() {
  return (
    <Svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <G fill="#FFFFFF" opacity={0.06}>
        {PAWS.map(([x, y, r, s], i) => <Paw key={`p${i}`} x={x} y={y} r={r} s={s} />)}
        {BONES.map(([x, y, r, s], i) => <Bone key={`b${i}`} x={x} y={y} r={r} s={s} />)}
      </G>
    </Svg>
  );
}

/** Navy backdrop, slowly floating paws and bones, and a soft amber (or red, while recording) glow behind the mic. */
export function RecordBackdrop({ recording }: { recording: boolean }) {
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    l.start();
    return () => l.stop();
  }, [drift]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2A3B78" />
            <Stop offset="0.55" stopColor="#1C2852" />
            <Stop offset="1" stopColor={color.brandDeep} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#bg)" />
      </Svg>
      {/* Oversized by 16 pt each side so the gentle float never shows an edge. */}
      <Animated.View style={{ position: 'absolute', top: -16, bottom: -16, left: -16, right: -16, transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] }) }] }}>
        <PawPattern />
      </Animated.View>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="45%">
            <Stop offset="0" stopColor={recording ? color.danger : color.primary} stopOpacity={0.3} />
            <Stop offset="1" stopColor={recording ? color.danger : color.primary} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#glow)" />
      </Svg>
    </View>
  );
}

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
      <Circle cx={RING / 2} cy={RING / 2} r={r} stroke="rgba(255,255,255,0.12)" strokeWidth={RING_STROKE} fill="none" />
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

/**
 * The big mic button with its animated surroundings.
 * `level` is the live input loudness (0–1) so the glow breathes with the bark.
 */
export function RecordStage({ state, level, progress, onPress, label }: { state: 'idle' | 'recording' | 'analyzing'; level: number; progress: number; onPress: () => void; label: string }) {
  const recording = state === 'recording';
  const busy = state === 'analyzing';
  const glow = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(glow, { toValue: recording ? level : 0, duration: 120, useNativeDriver: true }).start();
  }, [level, recording, glow]);

  const pressTo = (v: number) => Animated.spring(press, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 8 }).start();

  return (
    <View style={{ width: STAGE, height: STAGE, alignItems: 'center', justifyContent: 'center' }}>
      {!busy && <PulseRings tint={recording ? 'rgba(255,120,100,0.9)' : color.highlight} fast={recording} />}
      {/* loudness-reactive halo */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: BUTTON + 24,
          height: BUTTON + 24,
          borderRadius: (BUTTON + 24) / 2,
          backgroundColor: recording ? 'rgba(214,69,53,0.35)' : 'rgba(253,181,21,0.18)',
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
            { width: BUTTON, height: BUTTON, borderRadius: BUTTON / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: recording ? color.surface : busy ? 'rgba(255,255,255,0.14)' : color.primary, borderWidth: 4, borderColor: recording ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.25)' },
            recording || busy ? null : shadow.glow,
          ]}
        >
          {!recording && !busy ? (
            // Glossy amber fill: light top-left highlight fading to a deeper orange.
            <Svg width={BUTTON - 8} height={BUTTON - 8} style={{ position: 'absolute' }}>
              <Defs>
                <RadialGradient id="micFill" cx="35%" cy="28%" r="80%">
                  <Stop offset="0" stopColor="#FFE08A" />
                  <Stop offset="0.55" stopColor={color.primary} />
                  <Stop offset="1" stopColor="#E88A00" />
                </RadialGradient>
              </Defs>
              <Circle cx={(BUTTON - 8) / 2} cy={(BUTTON - 8) / 2} r={(BUTTON - 8) / 2} fill="url(#micFill)" />
            </Svg>
          ) : null}
          {recording ? <Square size={40} color={color.danger} fill={color.danger} strokeWidth={0} /> : <Mic size={52} color={busy ? color.onBrandMuted : color.onPrimary} strokeWidth={2.2} />}
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

const RING_TINT: Record<string, string> = { '🐶': color.primary, '🗣️': '#8FB3FF' };

/** Glossy round badge: soft white-to-cream fill, coloured rim and a gentle drop shadow. */
function ModeBadge({ emoji, size = 46 }: { emoji: string; size?: number }) {
  const id = emoji === '🐶' ? 'dogFill' : 'humanFill';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: RING_TINT[emoji], ...shadow.raised }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <RadialGradient id={id} cx="35%" cy="30%" r="75%">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor={emoji === '🐶' ? '#FFE7B0' : '#DCE7FF'} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 2.5} fill={`url(#${id})`} />
      </Svg>
      <Text style={{ fontSize: size * 0.52, lineHeight: size * 0.62 }}>{emoji}</Text>
    </View>
  );
}

/**
 * One control for the translation direction: 🐶 on the left, 🗣️ on the right and a round button
 * between them whose arrow flips (→ Bark to Human, ← Human to Dog) each time it is tapped.
 */
export function ModeSwap({ value, onChange, labels }: { value: TranslateMode; onChange: (m: TranslateMode) => void; labels: Record<TranslateMode, string> }) {
  const flip = useRef(new Animated.Value(value === 'bark' ? 0 : 1)).current;
  useEffect(() => {
    Animated.spring(flip, { toValue: value === 'bark' ? 0 : 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();
  }, [value, flip]);

  const dogScale = flip.interpolate({ inputRange: [0, 1], outputRange: [1.08, 0.92] });
  const humanScale = flip.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });
  const next: TranslateMode = value === 'bark' ? 'human' : 'bark';

  return (
    <View style={{ alignSelf: 'stretch', alignItems: 'center', paddingVertical: 12, borderRadius: radius.xl, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        {/* Tapping a face picks who is talking: the dog (Bark → Human) or you (Human → Dog). */}
        <Pressable accessibilityRole="button" accessibilityLabel={labels.bark} accessibilityState={{ selected: value === 'bark' }} hitSlop={8} onPress={() => value !== 'bark' && onChange('bark')}>
          <Animated.View style={{ transform: [{ scale: dogScale }] }}><ModeBadge emoji="🐶" size={58} /></Animated.View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={labels[next]}
          onPress={() => onChange(next)}
          style={({ pressed }) => [{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: color.primary, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)', transform: [{ scale: pressed ? 0.9 : 1 }] }, shadow.glow]}
        >
          <Animated.View style={{ transform: [{ rotate: flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
            <ArrowRight size={26} color={color.onPrimary} strokeWidth={3} />
          </Animated.View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={labels.human} accessibilityState={{ selected: value === 'human' }} hitSlop={8} onPress={() => value !== 'human' && onChange('human')}>
          <Animated.View style={{ transform: [{ scale: humanScale }] }}><ModeBadge emoji="🗣️" size={58} /></Animated.View>
        </Pressable>
      </View>
    </View>
  );
}
