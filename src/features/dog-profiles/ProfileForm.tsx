import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, Text, View } from 'react-native';
import { Button, Chip, Segmented, T, TextField } from '@/components/ui';
import { color, radius, type } from '@/theme/tokens';
import type { AgeGroup, Dog, DogSize } from './store';

const TRAITS = ['playful', 'vocal', 'cuddly', 'curious', 'shy', 'energetic', 'calm', 'protective'] as const;

export function ProfileForm({ onSubmit, submitLabel }: { onSubmit: (d: Omit<Dog, 'id' | 'createdAt'>) => void; submitLabel: string }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState<AgeGroup>('adult');
  const [voice, setVoice] = useState<DogSize>('medium');
  const [traits, setTraits] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [photoUri, setPhotoUri] = useState<string>();

  const pickPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (r.canceled) return;
    // The picker returns a cache URI that can be purged, so keep a copy in app storage.
    const dest = new File(Paths.document, `dog-${Date.now()}.jpg`);
    new File(r.assets[0].uri).copy(dest);
    setPhotoUri(dest.uri);
  };

  const toggle = (x: string) => setTraits((p) => (p.includes(x) ? p.filter((y) => y !== x) : p.length < 4 ? [...p, x] : p));
  const submit = () => {
    if (!name.trim()) return setError(t('profile.nameRequired'));
    onSubmit({ name: name.trim(), breed: breed.trim() || undefined, age, voice, traits, photoUri });
  };

  return (
    <View style={{ gap: 20 }}>
      <T.Title>{t('profile.createTitle')}</T.Title>
      <Pressable accessibilityRole="button" accessibilityLabel={t('profile.addPhoto')} onPress={pickPhoto} style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <View style={{ width: 96, height: 96, borderRadius: radius.lg, backgroundColor: color.brandSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {photoUri ? <Image source={{ uri: photoUri }} style={{ width: 96, height: 96 }} /> : <Camera size={30} color={color.brandStrong} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[type.headline, { color: color.text }]}>{t('profile.addPhoto')}</Text>
          <T.Body>{t('profile.photoHint')}</T.Body>
        </View>
      </Pressable>
      <TextField label={t('profile.name')} placeholder={t('profile.namePlaceholder')} value={name} onChangeText={(v) => { setName(v); setError(''); }} error={error} maxLength={30} />
      <TextField label={t('profile.breed')} placeholder={t('profile.breedPlaceholder')} value={breed} onChangeText={setBreed} maxLength={40} />
      <View style={{ gap: 6 }}>
        <T.Head>{t('profile.age')}</T.Head>
        <Segmented value={age} onChange={setAge} options={(['puppy', 'adult', 'senior'] as const).map((k) => ({ key: k, label: t(`profile.ageOptions.${k}`) }))} />
      </View>
      <View style={{ gap: 6 }}>
        <T.Head>{t('profile.traits')}</T.Head>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TRAITS.map((x) => <Chip key={x} label={t(`profile.traitOptions.${x}`)} selected={traits.includes(x)} onPress={() => toggle(x)} />)}
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <T.Head>{t('profile.voice')}</T.Head>
        <Segmented value={voice} onChange={setVoice} options={(['small', 'medium', 'big'] as const).map((k) => ({ key: k, label: t(`profile.voiceOptions.${k}`) }))} />
      </View>
      <Button label={submitLabel} onPress={submit} />
    </View>
  );
}
