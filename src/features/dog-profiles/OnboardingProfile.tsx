import * as Haptics from 'expo-haptics';
import { Camera, Check, ChevronLeft, Dog as DogIcon, PawPrint } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight, useAnimatedStyle, useSharedValue, withSpring, ZoomIn } from 'react-native-reanimated';
import { Mascot } from '@/components/Mascot';
import { Button, Chip, T, TextField } from '@/components/ui';
import { color, mood, radius, shadow, type } from '@/theme/tokens';
import { Floaters, Halo, HeroBackdrop } from './HeroDecor';
import { pickDogPhoto, TRAITS } from './ProfileForm';
import { AGE_RANGES, ageGroupFor, type AgeRange, type Dog, type DogSex, type DogSize } from './store';

const NAME_IDEAS = ['Buddy', 'Luna', 'Max', 'Bella', 'Charlie', 'Coco', 'Rocky', 'Daisy']; // proper names, untranslated
const STEPS = 5; // 1 name/photo/sex, 2 age, 3 breed, 4 personality, 5 bark voice
// Breed names are proper nouns, so they stay untranslated.
const POPULAR_BREEDS = ['Labrador Retriever', 'Golden Retriever', 'German Shepherd', 'French Bulldog', 'Poodle', 'Beagle', 'Chihuahua', 'Dachshund', 'Shih Tzu', 'Husky'];

function ProgressBar({ step }: { step: number }) {
  const { t } = useTranslation();
  const w = useSharedValue(((step + 1) / STEPS) * 100);
  useEffect(() => { w.value = withSpring(((step + 1) / STEPS) * 100, { damping: 16 }); }, [step, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={t('onboarding.step', { n: step + 1, total: STEPS })}
      accessibilityValue={{ min: 0, max: STEPS, now: step + 1 }}
      style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' }}
    >
      <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: color.primary }, fill]} />
    </View>
  );
}

const BREED_EMOJI: Record<string, string> = { 'Labrador Retriever': '🦮', 'Golden Retriever': '🐕', 'German Shepherd': '🐕‍🦺', 'French Bulldog': '🐶', Poodle: '🐩', Beagle: '🐾', Chihuahua: '🐕', Dachshund: '🌭' };
const TINTS = [mood.happy.bg, mood.excited.bg, mood.calm.bg, mood.anxious.bg, mood.playful.bg] as const;
export const AGE_EMOJI: Record<AgeRange, string> = { under1: '🍼', '1to2': '🎾', '3to6': '🏃', '7to10': '🛋️', '11plus': '👑' };
export const TRAIT_EMOJI: Record<string, string> = { playful: '🎾', vocal: '📣', cuddly: '🧸', curious: '🔍', shy: '🙈', energetic: '⚡', calm: '😌', protective: '🛡️' };
const AGE_NUM: Record<AgeRange, string> = { under1: '<1', '1to2': '1–2', '3to6': '3–6', '7to10': '7–10', '11plus': '11+' };
export const VOICE_EMOJI: Record<DogSize, string> = { small: '🔔', medium: '🔊', big: '📢' };

function pick(onPress: () => void) {
  Haptics.selectionAsync();
  onPress();
}

function OptionRow({ emoji, label, tag, selected, onPress, multi, compact }: { emoji: string; label: string; tag?: string; selected: boolean; onPress: () => void; multi?: boolean; compact?: boolean }) {
  return (
    <Pressable
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ selected }}
      onPress={() => pick(onPress)}
      style={({ pressed }) => ({ height: compact ? 46 : 54, paddingHorizontal: 10, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: selected ? color.brandSoft : color.surface, borderWidth: 2, borderColor: selected ? color.borderBrand : color.border, transform: [{ scale: pressed ? 0.97 : selected ? 1.02 : 1 }] })}
    >
      <View style={{ width: compact ? 32 : 38, height: compact ? 32 : 38, borderRadius: 19, backgroundColor: selected ? color.primary : color.subtle, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: compact ? 18 : 20 }}>{emoji}</Text>
      </View>
      <Text style={[type.headline, { color: color.text, flex: 1 }]}>{label}</Text>
      {!!tag && <Text style={[type.subheadStrong, { color: selected ? color.textAccent : color.textTertiary }]}>{tag}</Text>}
      <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: selected ? color.primary : color.border, backgroundColor: selected ? color.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {selected && <Check size={16} color={color.onPrimary} strokeWidth={3} />}
      </View>
    </Pressable>
  );
}

// Big emoji tile: used for sex, voice and traits.
function Tile({ emoji, label, selected, onPress, role = 'button', compact, tint }: { emoji: string; label: string; selected: boolean; onPress: () => void; role?: 'button' | 'radio'; compact?: boolean; tint?: string }) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ selected }}
      onPress={() => pick(onPress)}
      style={({ pressed }) => [{ flex: 1, minHeight: compact ? 72 : 92, borderRadius: compact ? radius.md : radius.lg, alignItems: 'center', justifyContent: 'center', gap: compact ? 2 : 6, padding: compact ? 6 : 10, backgroundColor: selected ? color.brandSoft : tint ?? color.surface, borderWidth: 2, borderColor: selected ? color.borderBrand : tint ?? color.border, transform: [{ scale: pressed ? 0.95 : selected ? 1.06 : 1 }] }, selected && shadow.glow]}
    >
      <Text style={{ fontSize: compact ? 30 : 32 }}>{emoji}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[compact ? type.caption : type.subheadStrong, { color: color.text, textAlign: 'center' }]}>{label}</Text>
      {selected && (
        <View style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Check size={12} color={color.onPrimary} strokeWidth={3} />
        </View>
      )}
    </Pressable>
  );
}

function NameField({ label, placeholder, value, onChange, error, max = 30, ideas = NAME_IDEAS, Icon = PawPrint }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; error?: string; max?: number; ideas?: string[]; Icon?: typeof PawPrint }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <T.Head>{label}</T.Head>
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 68, paddingHorizontal: 16, borderRadius: radius.lg, backgroundColor: color.surface, borderWidth: 2, borderColor: error ? color.danger : focus || value ? color.primary : color.border }, focus && shadow.glow]}>
        <Icon size={26} color={value || focus ? color.primary : color.textTertiary} />
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder={placeholder}
          placeholderTextColor={color.textTertiary}
          maxLength={max}
          autoCapitalize="words"
          style={[type.title2, { flex: 1, color: color.text, padding: 0 }]}
        />
        <Text style={[type.caption, { color: color.textTertiary }]}>{value.length}/{max}</Text>
      </View>
      {!!error && <Text style={[type.footnote, { color: color.textDanger }]}>{error}</Text>}
      {ideas.length > 0 && <Animated.View entering={FadeInDown.delay(150)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {ideas.map((n) => <Chip key={n} label={n} selected={value === n} onPress={() => onChange(n)} />)}
      </Animated.View>}
    </View>
  );
}

export function OnboardingProfile({ onBack, onDone }: { onBack?: () => void; onDone: (d: Omit<Dog, 'id' | 'createdAt'>) => void }) {
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

  const bubble = [dogName ? `${dogName} 🐾` : t('profile.createTitle'), t('profile.ageTitle', { name: dogName }), (breed.trim() ? `${breed.trim()} ${BREED_EMOJI[breed.trim()] ?? '🐕'}` : t('profile.breedTitle', { name: dogName })), t('profile.moreTitle', { name: dogName }), t('profile.voice')][step];
  const enter = FadeInRight.springify().damping(18);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.brandDeep }} edges={['top']}>
      <ScrollView scrollEnabled={step !== 1} bounces={step !== 1} style={{ backgroundColor: color.canvas }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 36, alignItems: 'center', gap: 10, overflow: 'hidden' }}>
          <HeroBackdrop />
          <Floaters />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch', minHeight: 26 }}>
            {(step > 0 || onBack) && (
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={12} onPress={() => (step === 0 ? onBack?.() : setStep(step - 1))}>
                <ChevronLeft size={26} color={color.onBrand} />
              </Pressable>
            )}
            <ProgressBar step={step} />
          </View>

          <View style={{ width: 96, height: 96 }}>
          <Halo size={96} />
          <Pressable accessibilityRole="button" accessibilityLabel={t('profile.addPhoto')} onPress={pickPhoto} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}>
            <Animated.View entering={ZoomIn.springify()} style={[{ width: 96, height: 96, borderRadius: 48, backgroundColor: color.brandSoft, borderWidth: 3, borderColor: color.primary, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, shadow.glow]}>
              {photoUri ? <Animated.Image key={photoUri} entering={ZoomIn.springify()} source={{ uri: photoUri }} style={{ width: 90, height: 90 }} /> : <Mascot size={90} />}
            </Animated.View>
            <View style={{ position: 'absolute', right: -2, bottom: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: color.primary, borderWidth: 3, borderColor: color.brandDeep, alignItems: 'center', justifyContent: 'center' }}>
              <Camera size={15} color={color.onPrimary} />
            </View>
          </Pressable>
          </View>

          <Animated.View key={step} entering={FadeInDown.springify().damping(14)} style={{ backgroundColor: color.surface, borderRadius: radius.lg, paddingHorizontal: 20, paddingVertical: 8, maxWidth: '100%', ...shadow.raised }}>
            <Text accessibilityRole="header" style={[type.title2, { color: color.text, textAlign: 'center' }]}>{bubble}</Text>
          </Animated.View>
        </View>

        <View style={{ flex: 1, marginTop: -24, backgroundColor: color.canvas, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 24, paddingBottom: 32, gap: 24 }}>
          {step === 0 && (
            <Animated.View entering={enter} style={{ gap: 20 }}>
              <T.Body>{t('profile.photoHint')}</T.Body>
              <NameField label={t('profile.name')} placeholder={t('profile.namePlaceholder')} value={name} onChange={(v) => { setName(v); setNameError(''); }} error={nameError} />
              <View style={{ gap: 6 }}>
                <T.Head>{t('profile.sex')}</T.Head>
                <View style={{ flexDirection: 'row', gap: 12 }} accessibilityRole="radiogroup">
                  {(['male', 'female'] as const).map((k) => <Tile key={k} role="radio" emoji={k === 'male' ? '♂️' : '♀️'} label={t(`profile.sexOptions.${k}`)} selected={sex === k} onPress={() => setSex(k)} />)}
                </View>
              </View>
            </Animated.View>
          )}

          {step === 1 && (
            <Animated.View entering={enter} style={{ gap: 8 }} accessibilityRole="radiogroup">
              {AGE_RANGES.map((r, i) => (
                <Animated.View key={r} entering={FadeInRight.delay(i * 50).springify()}>
                  <OptionRow emoji={AGE_EMOJI[r]} label={t(`profile.ageRanges.${r}`)} tag={AGE_NUM[r]} selected={ageRange === r} onPress={() => setAgeRange(r)} />
                </Animated.View>
              ))}
            </Animated.View>
          )}

          {step === 2 && (
            <Animated.View entering={enter} style={{ gap: 14 }}>
              <NameField label={t('profile.breed')} placeholder={t('profile.breedPlaceholder')} value={breed} onChange={setBreed} max={40} ideas={[]} Icon={DogIcon} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[...POPULAR_BREEDS.slice(0, 8), t('profile.breedMixed')].map((b, i) => (
                  <Animated.View key={b} entering={ZoomIn.delay(i * 40).springify()} style={{ flexBasis: '31%', flexGrow: 1, flexDirection: 'row' }}>
                    <Tile compact tint={TINTS[i % TINTS.length]} emoji={BREED_EMOJI[b] ?? '🌈'} label={b} selected={breed === b} onPress={() => setBreed(breed === b ? '' : b)} />
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          )}

          {step === 3 && (
            <Animated.View entering={enter} style={{ gap: 16 }}>
              <View style={{ gap: 6 }}>
                <T.Head>{t('profile.traits')} · {traits.length}/4</T.Head>
                <View style={{ gap: 6 }}>
                  {TRAITS.map((x, i) => (
                    <Animated.View key={x} entering={FadeInRight.delay(i * 40).springify()}>
                      <OptionRow multi compact emoji={TRAIT_EMOJI[x]} label={t(`profile.traitOptions.${x}`)} selected={traits.includes(x)} onPress={() => toggle(x)} />
                    </Animated.View>
                  ))}
                </View>
              </View>
            </Animated.View>
          )}

          {step === 4 && (
            <Animated.View entering={enter} style={{ gap: 12 }} accessibilityRole="radiogroup">
              {(['small', 'medium', 'big'] as const).map((k, i) => (
                <Animated.View key={k} entering={FadeInRight.delay(i * 60).springify()}>
                  <OptionRow emoji={VOICE_EMOJI[k]} label={t(`profile.voiceOptions.${k}`)} selected={voice === k} onPress={() => setVoice(k)} />
                </Animated.View>
              ))}
            </Animated.View>
          )}

          <Button label={step === STEPS - 1 ? t('profile.create') : t('common.continue')} onPress={next} disabled={step === 1 && !ageRange} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
