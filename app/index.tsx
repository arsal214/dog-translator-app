import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { useDogs } from '@/features/dog-profiles/store';

export default function Index() {
  // Wait for AsyncStorage rehydration so returning users don't flash onboarding.
  const [ready, setReady] = useState(useDogs.persist.hasHydrated());
  useEffect(() => useDogs.persist.onFinishHydration(() => setReady(true)), []);
  const onboarded = useDogs((s) => s.onboarded && s.dogs.length > 0);
  if (!ready) return null;
  return <Redirect href={onboarded ? '/(tabs)/translate' : '/onboarding'} />;
}
