import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { DogAvatar } from '@/components/ui';
import { color, radius, shadow, type } from '@/theme/tokens';
import { Floaters, Halo, HeroBackdrop } from './HeroDecor';
import { AGE_EMOJI, TRAIT_EMOJI, VOICE_EMOJI } from './OnboardingProfile';
import { useDogs } from './store';

function Pill({ emoji, label }: { emoji: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.14)' }}>
      <Text style={{ fontSize: 16 }}>{emoji}</Text>
      <Text style={[type.subheadStrong, { color: color.onBrand }]}>{label}</Text>
    </View>
  );
}

export function DogProfileCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { dogs, activeDogId, setActive, removeDog } = useDogs();
  const dog = dogs.find((d) => d.id === activeDogId) ?? dogs[0];
  if (!dog) return null;

  return (
    <View style={[{ borderRadius: radius.xl, overflow: 'hidden' }, shadow.raised]}>
      <HeroBackdrop />
      <Floaters />
      <View style={{ alignItems: 'center', gap: 12, padding: 20, paddingTop: 28 }}>
        <View style={{ width: 112, height: 112 }}>
          <Halo size={112} />
          <Animated.View entering={ZoomIn.springify()} style={[{ borderRadius: 56, borderWidth: 4, borderColor: color.primary }, shadow.glow]}>
            <DogAvatar name={dog.name} uri={dog.photoUri} size={104} />
          </Animated.View>
        </View>
        <Animated.View key={dog.id} entering={FadeInDown.springify()} style={{ alignItems: 'center', gap: 4 }}>
          <Text accessibilityRole="header" style={[type.title1, { color: color.onBrand }]}>{dog.name} 🐾</Text>
          {!!dog.breed && <Text style={[type.callout, { color: color.onBrandMuted }]}>{dog.breed}</Text>}
        </Animated.View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
          {dog.ageRange && <Pill emoji={AGE_EMOJI[dog.ageRange]} label={t(`profile.ageRanges.${dog.ageRange}`)} />}
          {dog.sex && <Pill emoji={dog.sex === 'male' ? '♂️' : '♀️'} label={t(`profile.sexOptions.${dog.sex}`)} />}
          {dog.voice && <Pill emoji={VOICE_EMOJI[dog.voice]} label={t(`profile.voiceOptions.${dog.voice}`)} />}
          {dog.traits.map((x) => <Pill key={x} emoji={TRAIT_EMOJI[x] ?? '🐾'} label={t(`profile.traitOptions.${x}`)} />)}
        </View>
      </View>

      {/* Switcher: tap to select, long-press to remove (kept from the old list). */}
      <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 20 }}>
          {dogs.map((d) => (
            <Pressable key={d.id} accessibilityRole="radio" accessibilityState={{ selected: d.id === dog.id }} onPress={() => setActive(d.id)} onLongPress={() => dogs.length > 1 && removeDog(d.id)} style={{ alignItems: 'center', gap: 4 }}>
              <DogAvatar name={d.name} uri={d.photoUri} size={48} selected={d.id === dog.id} />
              <Text style={[type.caption, { color: d.id === dog.id ? color.primary : color.onBrandMuted }]}>{d.name}</Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" accessibilityLabel={t('profile.addDog')} onPress={() => router.push('/dog/new')} style={{ alignItems: 'center', gap: 4 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.onBrandMuted, alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={20} color={color.onBrand} />
            </View>
            <Text style={[type.caption, { color: color.onBrandMuted }]}>{t('profile.addDog')}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}
