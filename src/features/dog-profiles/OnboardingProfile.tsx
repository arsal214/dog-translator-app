import { Camera, ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, Text, View } from 'react-native';
import { Button, Chip, Screen, Segmented, T, TextField } from '@/components/ui';
import { color, radius, type } from '@/theme/tokens';
import { pickDogPhoto, TRAITS } from './ProfileForm';
import { AGE_RANGES, ageGroupFor, type AgeRange, type Dog, type DogSex, type DogSize } from './store';

const STEPS = 4; // 1 name/photo/sex, 2 age, 3 breed, 4 personality/voice
// Breed names are proper nouns, so they stay untranslated.
const POPULAR_BREEDS = ['Labrador Retriever', 'Golden Retriever', 'German Shepherd', 'French Bulldog', 'Poodle', 'Beagle', 'Chihuahua', 'Dachshund', 'Shih Tzu', 'Husky'];

function ProgressBar({ step }: { step: number }) {
  const { t } = useTranslation();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={t('onboarding.step', { n: step + 1, total: STEPS })}
      accessibilityValue={{ min: 0, max: STEPS, now: step + 1 }}
      style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: color.disabled, overflow: 'hidden' }}
    >
      <View style={{ width: `${((step + 1) / STEPS) * 100}%`, height: 8, borderRadius: 4, backgroundColor: color.primary }} />
    </View>
  );
}

function OptionRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{ height: 56, paddingHorizontal: 20, borderRadius: radius.lg, justifyContent: 'center', backgroundColor: selected ? color.brandSoft : color.surface, borderWidth: 2, borderColor: selected ? color.borderBrand : color.border }}
    >
      <Text style={[type.headline, { color: color.text }]}>{label}</Text>
    </Pressable>
  );
}

export function OnboardingProfile({ onBack, onDone }: { onBack: () => void; onDone: (d: Omit<Dog, 'id' | 'createdAt'>) => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [photoUri, setPhotoUri] = useState<string>();
  const [sex, setSex] = useState<DogSex>();
  const [ageRange, setAgeRange] = useState<AgeRange>();
  const [breed, setBreed] = useState('');
  const [traits, setTraits] = useState<string[]>([]);
  const [voice, setVoice] = useState<DogSize>('medium');

  const dogName = name.trim();
  const toggle = (x: string) => setTraits((p) => (p.includes(x) ? p.filter((y) => y !== x) : p.length < 4 ? [...p, x] : p));
  const pickPhoto = async () => {
    const uri = await pickDogPhoto();
    if (uri) setPhotoUri(uri);
  };

  const next = () => {
    if (step === 0 && !dogName) return setNameError(t('profile.nameRequired'));
    if (step < STEPS - 1) return setStep(step + 1);
    onDone({ name: dogName, photoUri, sex, ageRange, age: ageRange && ageGroupFor(ageRange), breed: breed.trim() || undefined, traits, voice });
  };

  return (
    <Screen style={{ padding: 24, gap: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={12} onPress={() => (step === 0 ? onBack() : setStep(step - 1))}>
          <ChevronLeft size={26} color={color.text} />
        </Pressable>
        <ProgressBar step={step} />
      </View>

      {step === 0 && (
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
          <TextField label={t('profile.name')} placeholder={t('profile.namePlaceholder')} value={name} onChangeText={(v) => { setName(v); setNameError(''); }} error={nameError} maxLength={30} />
          <View style={{ gap: 6 }}>
            <T.Head>{t('profile.sex')}</T.Head>
            <Segmented value={sex as DogSex} onChange={setSex} options={(['male', 'female'] as const).map((k) => ({ key: k, label: t(`profile.sexOptions.${k}`) }))} />
          </View>
        </View>
      )}

      {step === 1 && (
        <View style={{ gap: 12 }} accessibilityRole="radiogroup">
          <T.Title>{t('profile.ageTitle', { name: dogName })}</T.Title>
          <T.Body>{t('profile.ageHint')}</T.Body>
          {AGE_RANGES.map((r) => <OptionRow key={r} label={t(`profile.ageRanges.${r}`)} selected={ageRange === r} onPress={() => setAgeRange(r)} />)}
        </View>
      )}

      {step === 2 && (
        <View style={{ gap: 16 }}>
          <T.Title>{t('profile.breedTitle', { name: dogName })}</T.Title>
          <T.Body>{t('profile.breedHint')}</T.Body>
          <TextField label={t('profile.breed')} placeholder={t('profile.breedPlaceholder')} value={breed} onChangeText={setBreed} maxLength={40} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[...POPULAR_BREEDS, t('profile.breedMixed')].map((b) => <Chip key={b} label={b} selected={breed === b} onPress={() => setBreed(breed === b ? '' : b)} />)}
          </View>
        </View>
      )}

      {step === 3 && (
        <View style={{ gap: 20 }}>
          <T.Title>{t('profile.moreTitle', { name: dogName })}</T.Title>
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
        </View>
      )}

      <Button label={step === STEPS - 1 ? t('profile.create') : t('common.continue')} onPress={next} disabled={step === 1 && !ageRange} />
    </Screen>
  );
}
