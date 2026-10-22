import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import { Mascot } from '@/components/Mascot';
import { OnboardingProfile } from '@/features/dog-profiles/OnboardingProfile';
import { Halo, HeroBackdrop } from '@/features/dog-profiles/HeroDecor';
import { useDogs } from '@/features/dog-profiles/store';
import { color, shadow, type } from '@/theme/tokens';

const LOAD_MS = 2200;

export default function Onboarding() {
  const router = useRouter();
  const addDog = useDogs((s) => s.addDog);
  const finish = useDogs((s) => s.finishOnboarding);
  const [step, setStep] = useState(0); // 0 splash, 1 profile steps
  const w = useSharedValue(0);
  const fill = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  useEffect(() => {
    w.value = withTiming(100, { duration: LOAD_MS });
    const id = setTimeout(() => setStep(1), LOAD_MS + 200);
    return () => clearTimeout(id);
  }, [w]);

  if (step === 1) {
    return (
      <>
      <StatusBar style="light" />
      <OnboardingProfile
        onDone={(d) => {
          addDog(d);
          finish();
          router.replace('/paywall?from=onboarding');
        }}
      />
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.brandDeep }}>
      <StatusBar style="light" />
      <HeroBackdrop />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, padding: 24 }}>
        <View style={{ width: 190, height: 190 }}>
          <Halo size={190} />
          <Animated.View entering={ZoomIn.duration(600).springify()} style={[{ width: 190, height: 190, borderRadius: 95, borderWidth: 5, borderColor: color.primary, backgroundColor: color.brandSoft, overflow: 'hidden' }, shadow.glow]}>
            <Mascot size={180} />
          </Animated.View>
        </View>
        <Animated.View entering={FadeInDown.delay(350).springify()} style={{ alignItems: 'center', gap: 6 }}>
          <Text accessibilityRole="header" style={[type.largeTitle, { color: color.onBrand }]}>Dog Translator</Text>
          <Text style={{ fontSize: 22 }}>🐶 ⇄ 🗣️</Text>
        </Animated.View>
      </View>
      <Animated.View entering={FadeInDown.delay(500)} style={{ alignItems: 'center', paddingBottom: 64 }}>
        <View style={[{ width: '60%', height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }]}>
          <Animated.View style={[{ height: 10, borderRadius: 5, backgroundColor: color.primary }, fill]} />
        </View>
      </Animated.View>
    </View>
  );
}
