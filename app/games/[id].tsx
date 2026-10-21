import { Stack, useLocalSearchParams } from 'expo-router';
import { Bug, Mouse, Target, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Pressable, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Button, Screen, T } from '@/components/ui';
import { color, radius } from '@/theme/tokens';

const GAMES: Record<string, { Icon: LucideIcon; tint: string; ms: number; size: number }> = {
  bee: { Icon: Bug, tint: '#F5B301', ms: 1100, size: 64 },
  laser: { Icon: Target, tint: '#D64535', ms: 700, size: 36 },
  mouse: { Icon: Mouse, tint: '#74847D', ms: 1500, size: 72 },
};

export default function Game() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const g = GAMES[id] ?? GAMES.bee;
  const { width } = useWindowDimensions();
  const H = 420;
  const [running, setRunning] = useState(false);
  const [reduce, setReduce] = useState(false);
  const x = useSharedValue(40);
  const y = useSharedValue(40);

  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduce); }, []);

  // The target glides to a new random spot on a timer; stopping clears the timer (no background battery use).
  useEffect(() => {
    if (!running) return;
    const move = () => {
      const dur = reduce ? g.ms * 2 : g.ms;
      x.value = withTiming(Math.random() * (width - 32 - g.size), { duration: dur, easing: Easing.inOut(Easing.quad) });
      y.value = withTiming(Math.random() * (H - g.size), { duration: dur, easing: Easing.inOut(Easing.quad) });
    };
    move();
    const timer = setInterval(move, g.ms + 100);
    return () => clearInterval(timer);
  }, [running, g.ms, g.size, reduce, width, x, y]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }] }));
  const { Icon } = g;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: t(`games.${id in GAMES ? id : 'bee'}`) }} />
      <T.Body>{t('games.safety')}</T.Body>
      <View style={{ height: H, borderRadius: radius.lg, backgroundColor: color.brandFaint, borderWidth: 1, borderColor: color.border, overflow: 'hidden' }}>
        <Animated.View style={style}>
          <Pressable accessibilityLabel={t('games.target')} onPress={() => { x.value = withTiming(Math.random() * (width - 32 - g.size)); }}>
            <Icon size={g.size} color={g.tint} />
          </Pressable>
        </Animated.View>
      </View>
      <Button label={running ? t('games.pause') : t('games.start')} onPress={() => setRunning((r) => !r)} />
      <Button variant="tertiary" label={t('games.restart')} onPress={() => { setRunning(false); x.value = 40; y.value = 40; }} />
    </Screen>
  );
}
