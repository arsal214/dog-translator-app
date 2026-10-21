import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, View } from 'react-native';
import { Button, Card, Chip, Screen, T } from '@/components/ui';
import { errorKey } from '@/lib/errors';
import { callFn } from '@/services/api';
import { usePurchases } from '@/services/purchases';

const STYLES = ['sticker', 'cartoon', 'royal'] as const;

export default function Portraits() {
  const { t } = useTranslation();
  const router = useRouter();
  const isPro = usePurchases((s) => s.isPro);
  const [style, setStyle] = useState<(typeof STYLES)[number]>('sticker');
  const [uri, setUri] = useState<string | null>(null);
  const [out, setOut] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: false });
    if (!r.canceled) { setUri(r.assets[0].uri); setOut(null); setErr(''); }
  };

  const generate = async () => {
    if (!isPro) return router.push('/paywall?reason=portraits');
    setBusy(true);
    setErr('');
    try {
      const r = await callFn<{ imageBase64: string }>('portrait', { style });
      setOut(`data:image/png;base64,${r.imageBase64}`);
    } catch (e) {
      setErr(t(errorKey(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: t('portraits.title') }} />
      <T.Body>{t('portraits.body')}</T.Body>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {STYLES.map((s) => <Chip key={s} label={t(`portraits.styles.${s}`)} selected={style === s} onPress={() => setStyle(s)} />)}
      </View>
      {uri ? <Image source={{ uri }} style={{ height: 240, borderRadius: 24 }} accessibilityLabel={t('scanner.photo')} /> : null}
      <Button variant="secondary" label={t('portraits.pick')} onPress={pick} />
      <Button label={t('portraits.generate')} loading={busy} disabled={!uri} onPress={generate} />
      {err ? <Card><T.Body>{err}</T.Body></Card> : null}
      {out ? <Image source={{ uri: out }} style={{ height: 320, borderRadius: 24 }} accessibilityLabel={t('portraits.result')} /> : null}
    </Screen>
  );
}
