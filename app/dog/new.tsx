import { Redirect, Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui';
import { ProfileForm } from '@/features/dog-profiles/ProfileForm';
import { FREE_DOG_LIMIT, useDogs } from '@/features/dog-profiles/store';
import { usePurchases } from '@/services/purchases';

export default function NewDog() {
  const { t } = useTranslation();
  const router = useRouter();
  const addDog = useDogs((s) => s.addDog);
  const setActive = useDogs((s) => s.setActive);
  const count = useDogs((s) => s.dogs.length);
  const isPro = usePurchases((s) => s.isPro);

  if (!isPro && count >= FREE_DOG_LIMIT) return <Redirect href="/paywall?reason=dogs" />;
  return (
    <Screen style={{ padding: 24 }}>
      <Stack.Screen options={{ headerShown: true, title: t('profile.addDog') }} />
      <ProfileForm
        submitLabel={t('profile.create')}
        onSubmit={(d) => {
          setActive(addDog(d).id);
          router.back();
        }}
      />
    </Screen>
  );
}
