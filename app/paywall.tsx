import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, Text, View } from 'react-native';
import { Button, Card, Screen, T } from '@/components/ui';
import { purchase, restore, usePurchases } from '@/services/purchases';
import { color, type } from '@/theme/tokens';

// Replace with your hosted pages before release.
const TERMS = 'https://example.com/terms';
const PRIVACY = 'https://example.com/privacy';

export default function Paywall() {
  const { t } = useTranslation();
  const router = useRouter();
  const { packages, isPro, ready } = usePurchases();
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const buy = async () => {
    const pkg = packages[sel];
    if (!pkg) return;
    setBusy(true);
    const r = await purchase(pkg);
    setBusy(false);
    if (r === 'success') router.back();
    else if (r === 'error') setMsg(t('paywall.failed'));
  };

  const doRestore = async () => {
    setBusy(true);
    const ok = await restore();
    setBusy(false);
    setMsg(ok ? t('paywall.restored') : t('paywall.nothingToRestore'));
  };

  if (isPro)
    return <Screen><Stack.Screen options={{ headerShown: true, title: 'Pro' }} /><T.Title>{t('paywall.youArePro')}</T.Title></Screen>;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Pro' }} />
      <T.Title>{t('paywall.title')}</T.Title>
      <T.Body>{t('paywall.body')}</T.Body>
      {(['dogs', 'sounds', 'ai', 'training', 'portraits'] as const).map((k) => (
        <T.Head key={k}>✓ {t(`paywall.benefits.${k}`)}</T.Head>
      ))}
      {!ready || packages.length === 0 ? (
        <Card><T.Body>{t('paywall.unavailable')}</T.Body></Card>
      ) : (
        packages.map((p, i) => (
          <Pressable key={p.identifier} accessibilityRole="radio" accessibilityState={{ selected: i === sel }} onPress={() => setSel(i)}>
            <Card style={{ borderWidth: 2, borderColor: i === sel ? color.primary : 'transparent', gap: 4 }}>
              <T.Head>{p.product.title}</T.Head>
              <Text style={[type.subhead, { color: color.textSecondary }]}>{p.product.priceString} · {p.packageType.toLowerCase()}</Text>
              {p.product.introPrice ? <Text style={[type.footnote, { color: color.textAccent }]}>{p.product.introPrice.priceString} · {p.product.introPrice.periodNumberOfUnits} {p.product.introPrice.periodUnit.toLowerCase()}</Text> : null}
            </Card>
          </Pressable>
        ))
      )}
      <Button label={t('paywall.subscribe')} loading={busy} disabled={packages.length === 0} onPress={buy} />
      {msg ? <T.Body>{msg}</T.Body> : null}
      <T.Body>{t('paywall.disclosure')}</T.Body>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
        <Pressable accessibilityRole="link" onPress={doRestore}><Text style={{ color: color.textAccent }}>{t('paywall.restore')}</Text></Pressable>
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(TERMS)}><Text style={{ color: color.textAccent }}>{t('more.terms')}</Text></Pressable>
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY)}><Text style={{ color: color.textAccent }}>{t('more.privacy')}</Text></Pressable>
      </View>
    </Screen>
  );
}
