import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { useDogs } from '@/features/dog-profiles/store';
import { whenRestored } from '@/services/sync';

export default function Index() {
  // Wait for AsyncStorage rehydration so returning users don't flash onboarding. A phone with no dogs also waits
  // briefly for the server, so a reinstall (the session survives in the keychain) restores instead of re-onboarding.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    const go = async () => {
      if (!useDogs.getState().onboarded) await whenRestored(3000);
      if (live) setReady(true);
    };
    // Re-check inside the effect: hydration may have finished between render and effect.
    if (useDogs.persist.hasHydrated()) void go();
    const off = useDogs.persist.onFinishHydration(() => void go());
    return () => { live = false; off(); };
  }, []);
  const onboarded = useDogs((s) => s.onboarded && s.dogs.length > 0);
  if (!ready) return null;
  return <Redirect href={onboarded ? '/(tabs)/translate' : '/onboarding'} />;
}
