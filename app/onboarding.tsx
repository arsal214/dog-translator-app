import { useRouter } from 'expo-router';
import { Mic, Sparkles, Volume2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { Button, Screen, T } from '@/components/ui';
import { OnboardingProfile } from '@/features/dog-profiles/OnboardingProfile';
import { useDogs } from '@/features/dog-profiles/store';
import { color, radius, type } from '@/theme/tokens';

const SLIDES = [
  { Icon: Mic, title: 'onboarding.s1Title', body: 'onboarding.s1Body' },
  { Icon: Volume2, title: 'onboarding.s2Title', body: 'onboarding.s2Body' },
  { Icon: Sparkles, title: 'onboarding.s3Title', body: 'onboarding.s3Body' },
] as const;

export default function Onboarding() {
  const { t } = useTranslation();
  const router = useRouter();
  const addDog = useDogs((s) => s.addDog);
  const finish = useDogs((s) => s.finishOnboarding);
  const [step, setStep] = useState(0); // 0-2 intro, 3 profile steps

  if (step === 3) {
    return (
      <OnboardingProfile
        onBack={() => setStep(2)}
        onDone={async (d) => {
          addDog(d);
          finish();
          router.replace('/(tabs)/translate');
          // Loaded lazily so a build without the native module still opens onboarding.
          // iOS decides whether the rating prompt actually appears (at most 3 times a year).
          const StoreReview = await import('expo-store-review').catch(() => null);
          if (StoreReview && (await StoreReview.isAvailableAsync())) StoreReview.requestReview().catch(() => {});
        }}
      />
    );
  }

  const { Icon, title, body } = SLIDES[step];
  return (
    <Screen scroll={false} style={{ justifyContent: 'space-between', padding: 24 }}>
      <View style={{ alignItems: 'flex-end' }}>
        <Pressable accessibilityRole="button" onPress={() => setStep(3)} hitSlop={12}>
          <Text style={[type.subheadStrong, { color: color.textSecondary }]}>{t('common.skip')}</Text>
        </Pressable>
      </View>
      <View style={{ gap: 24 }}>
        <View style={{ height: 300, borderRadius: radius.xl, backgroundColor: color.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={88} color={color.brandStrong} />
        </View>
        <T.Title>{t(title)}</T.Title>
        <T.Body style={type.body}>{t(body)}</T.Body>
      </View>
      <View style={{ gap: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          {SLIDES.map((_, i) => (
            <View key={i} style={{ height: 8, width: i === step ? 24 : 8, borderRadius: 4, backgroundColor: i === step ? color.primary : color.disabled }} />
          ))}
        </View>
        <Button label={step === 2 ? t('onboarding.getStarted') : t('common.continue')} onPress={() => setStep(step + 1)} />
      </View>
    </Screen>
  );
}
