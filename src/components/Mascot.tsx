import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

export function Mascot({ size }: { size: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    let on = true;
    // Respect reduce-motion: stay still instead of bobbing.
    AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      if (on && !r) y.value = withRepeat(withSequence(withTiming(-size / 14, { duration: 700 }), withTiming(0, { duration: 700 })), -1);
    });
    return () => { on = false; };
  }, [size, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.Image accessible={false} source={require('../../assets/Artwork.png')} style={[{ width: size, height: size }, style]} />;
}
