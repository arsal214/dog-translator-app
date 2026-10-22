import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Mascot } from '@/components/Mascot';
import { Button, Chip, Segmented, T, TextField } from '@/components/ui';
import { color, radius, type } from '@/theme/tokens';
import { AGE_RANGES, ageGroupFor, type AgeRange, type Dog, type DogSex, type DogSize } from './store';

export const TRAITS = ['playful', 'vocal', 'cuddly', 'curious', 'shy', 'energetic', 'calm', 'protective'] as const;

export async function pickDogPhoto(): Promise<string | undefined> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
  if (r.canceled) return;
  // The picker returns a cache URI that can be purged, so keep a copy in app storage.
  const dest = new File(Paths.document, `dog-${Date.now()}.jpg`);
  new File(r.assets[0].uri).copy(dest);
  return dest.uri;
}

export function ProfileForm({ onSubmit, submitLabel }: { onSubmit: (d: Omit<Dog, 'id' | 'createdAt'>) => void; submitLabel: string }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [sex, setSex] = useState<DogSex>();
  const [ageRange, setAgeRange] = useState<AgeRange>();
  const [voice, setVoice] = useState<DogSize>('medium');
  const [traits, setTraits] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [photoUri, setPhotoUri] = useState<string>();

  const pickPhoto = async () => {
    const uri = await pickDogPhoto();
    if (uri) setPhotoUri(uri);
  };

  const toggle = (x: string) => setTraits((p) => (p.includes(x) ? p.filter((y) => y !== x) : p.length < 4 ? [...p, x] : p));
  const submit = () => {
    if (!name.trim()) return setError(t('profile.nameRequired'));
    onSubmit({ name: name.trim(), breed: breed.trim() || undefined, sex, ageRange, age: ageRange && ageGroupFor(ageRange), voice, traits, photoUri });
  };

  return (
    <View style={{ gap: 20 }}>
      <T.Title>{name.trim() ? `${name.trim()} 🐾` : t('profile.createTitle')}</T.Title>
      <Pressable accessibilityRole="button" accessibilityLabel={t('profile.addPhoto')} onPress={pickPhoto} style={({ pressed }) => ({ flexDirection: 'row', gap: 16, alignItems: 'center', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
        <View style={{ width: 96, height: 96, borderRadius: radius.lg, backgroundColor: color.brandSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: photoUri ? color.brandStrong : color.brandSoft }}>
          {photoUri ? <Animated.Image key={photoUri} entering={ZoomIn.springify()} source={{ uri: photoUri }} style={{ width: 96, height: 96 }} /> : <Mascot size={96} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[type.headline, { color: color.text }]}>{t('profile.addPhoto')}</Text>
          <T.Body>{t('profile.photoHint')}</T.Body>
        </View>
      </Pressable>
      <TextField label={t('profile.name')} placeholder={t('profile.namePlaceholder')} value={name} onChangeText={(v) => { setName(v); setError(''); }} error={error} maxLength={30} />
      <TextField label={t('profile.breed')} placeholder={t('profile.breedPlaceholder')} value={breed} onChangeText={setBreed} maxLength={40} />
      <Animated.View entering={FadeInDown.delay(70).springify()} style={{ gap: 6 }}>
        <T.Head>{t('profile.sex')}</T.Head>
        {/* No default: nothing is highlighted until the user picks one. */}
        <Segmented value={sex as DogSex} onChange={setSex} options={(['male', 'female'] as const).map((k) => ({ key: k, label: t(`profile.sexOptions.${k}`) }))} />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(140).springify()} style={{ gap: 6 }}>
        <T.Head>{t('profile.age')}</T.Head>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {AGE_RANGES.map((r) => <Chip key={r} label={t(`profile.ageRanges.${r}`)} selected={ageRange === r} onPress={() => setAgeRange(r)} />)}
        </View>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(210).springify()} style={{ gap: 6 }}>
        <T.Head>{t('profile.traits')} · {traits.length}/4</T.Head>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TRAITS.map((x) => <Chip key={x} label={t(`profile.traitOptions.${x}`)} selected={traits.includes(x)} onPress={() => toggle(x)} />)}
        </View>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(280).springify()} style={{ gap: 6 }}>
        <T.Head>{t('profile.voice')}</T.Head>
        <Segmented value={voice} onChange={setVoice} options={(['small', 'medium', 'big'] as const).map((k) => ({ key: k, label: t(`profile.voiceOptions.${k}`) }))} />
      </Animated.View>
      <Button label={submitLabel} onPress={submit} />
    </View>
  );
}
