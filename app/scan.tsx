import * as ImageManipulator from 'expo-image-manipulator';
import i18n from '@/localization';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image } from 'react-native';
import { Button, Card, Screen, T } from '@/components/ui';
import { useActiveDog } from '@/features/dog-profiles/store';
import { useJournal } from '@/features/journal/store';
import { errorKey, isLimit } from '@/lib/errors';
import { callFn } from '@/services/api';

type Scan = {
  isDog: boolean;
  breeds: { name: string; likelihood: 'low' | 'medium' | 'high' }[];
  traits: string[];
  visibleCues: string;
  care: string;
  followUps: string[];
};

export default function Scanner() {
  const { t } = useTranslation();
  const router = useRouter();
  const dog = useActiveDog();
  const add = useJournal((s) => s.add);
  const [uri, setUri] = useState<string | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [err, setErr] = useState('');
  const [limit, setLimit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [consented, setConsented] = useState(false);

  const pick = async (camera: boolean) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setErr(t('scanner.permission'));
    const r = await (camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync)({ mediaTypes: ['images'], quality: 1 });
    if (r.canceled) return;
    setUri(r.assets[0].uri);
    setScan(null);
    setErr('');
    setConsented(false);
  };

  const analyze = async () => {
    if (!uri) return;
    setBusy(true);
    setErr('');
    try {
      // Downsize + recompress locally; the image is sent once, processed in memory, and never stored.
      const img = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1024 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      const r = await callFn<Scan>('scan-dog', { imageBase64: img.base64, mediaType: 'image/jpeg', language: i18n.language });
      if (!r.isDog) setErr(t('scanner.notDog'));
      else {
        setScan(r);
        if (dog) add({ dogId: dog.id, kind: 'scan', mood: 'calm', text: `${r.breeds[0]?.name ?? ''}: ${r.visibleCues}` });
      }
    } catch (e) {
      setErr(t(errorKey(e)));
      setLimit(isLimit(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <T.Title>{t('scanner.title')}</T.Title>
      <T.Body>{t('scanner.disclaimer')}</T.Body>
      {uri ? <Image source={{ uri }} style={{ height: 260, borderRadius: 24 }} accessibilityLabel={t('scanner.photo')} /> : null}
      <Button variant="secondary" label={t('scanner.camera')} onPress={() => pick(true)} />
      <Button variant="secondary" label={t('scanner.library')} onPress={() => pick(false)} />
      {uri && !scan ? (
        <>
          <T.Body>{t('scanner.consent')}</T.Body>
          {!consented ? <Button variant="tertiary" label={t('scanner.agree')} onPress={() => setConsented(true)} /> : null}
          <Button label={t('scanner.analyze')} loading={busy} disabled={!consented} onPress={analyze} />
        </>
      ) : null}
      {err ? <Card><T.Body>{err}</T.Body></Card> : null}
      {limit ? <Button label={t('paywall.seePro')} onPress={() => router.push('/paywall?reason=ai')} /> : null}
      {scan ? (
        <>
          <Card style={{ gap: 8 }}>
            <T.Head>{t('scanner.breeds')}</T.Head>
            {scan.breeds.map((b) => <T.Body key={b.name}>{b.name} · {t(`scanner.likelihood.${b.likelihood}`)}</T.Body>)}
          </Card>
          <Card style={{ gap: 8 }}><T.Head>{t('scanner.traits')}</T.Head><T.Body>{scan.traits.join(', ')}</T.Body></Card>
          <Card style={{ gap: 8 }}><T.Head>{t('scanner.cues')}</T.Head><T.Body>{scan.visibleCues}</T.Body></Card>
          <Card style={{ gap: 8 }}><T.Head>{t('scanner.care')}</T.Head><T.Body>{scan.care}</T.Body></Card>
          <Card style={{ gap: 8 }}><T.Head>{t('scanner.followUps')}</T.Head>{scan.followUps.map((f) => <T.Body key={f}>• {f}</T.Body>)}</Card>
        </>
      ) : null}
    </Screen>
  );
}
