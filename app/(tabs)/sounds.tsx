import { useFocusEffect, useRouter } from 'expo-router';
import { Crown, Heart, Pause, Play } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { AppHeader, TAB_BAR_SPACE, TAB_BG } from '@/components/AppHeader';
import { Card, T } from '@/components/ui';
import { SOUND_ART, SOUNDS, type Sound, type SoundCategory } from '@/content/sounds';
import { useJournal } from '@/features/journal/store';
import { playAsset, stopPlayback } from '@/lib/playback';
import { usePurchases } from '@/services/purchases';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, radius, shadow, type } from '@/theme/tokens';

// Two main groups (the big toggle) over the catalogue's categories (the small pills).
// Every dog voice is a bark; toys and attention-getters (doorbell, training whistles/clicker) are squeakers.
type Group = 'barks' | 'squeakers';
const GROUPS: Record<Group, SoundCategory[]> = {
  barks: ['barks', 'whines', 'growls', 'howls', 'playful', 'attention'],
  squeakers: ['squeaky', 'doorbell', 'training'],
};
const GROUP_EMOJI: Record<Group, string> = { barks: '🐶', squeakers: '🧸' };

/** Big two-option toggle; the navy pill slides under the selected side. */
function GroupToggle({ value, onChange, labels }: { value: Group; onChange: (g: Group) => void; labels: Record<Group, string> }) {
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(value === 'barks' ? 0 : 1)).current;
  useEffect(() => {
    Animated.spring(x, { toValue: value === 'barks' ? 0 : 1, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
  }, [value, x]);
  const half = (w - 8) / 2;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[{ flexDirection: 'row', height: 60, padding: 4, borderRadius: 30, backgroundColor: color.brandSoft, borderWidth: 1, borderColor: '#F3E2B8' }, shadow.card]}>
      {w > 0 ? (
        <Animated.View
          style={[
            { position: 'absolute', top: 4, left: 4, width: half, height: 52, borderRadius: 26, backgroundColor: color.brandStrong, borderWidth: 2, borderColor: '#3A4C8A' },
            shadow.raised,
            { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, half] }) }] },
          ]}
        />
      ) : null}
      {(['barks', 'squeakers'] as const).map((g) => {
        const on = value === g;
        return (
          <Pressable key={g} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(g)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Text style={{ fontSize: on ? 26 : 22, opacity: on ? 1 : 0.6 }}>{GROUP_EMOJI[g]}</Text>
            <Text style={[type.headline, { fontSize: 18, fontWeight: '800', color: on ? color.onBrand : color.text }]}>{labels[g]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Cards cycle through bold colours so neighbours never match; emoji stands in for sounds without artwork.
const CARD_BG = ['#F07A2A', '#4C8DDB', '#3CCB7F', '#A26BE8', '#F27A9B', '#E8A400'];
const EMOJI: Record<SoundCategory, string> = { barks: '🐶', whines: '🥺', growls: '🐺', howls: '🌕', playful: '🎾', attention: '🐕', squeaky: '🧸', doorbell: '🔔', training: '🦮' };

export default function Sounds() {
  const { t } = useTranslation();
  const router = useRouter();
  const isPro = usePurchases((s) => s.isPro);
  const favs = useJournal((s) => s.favorites);
  const toggleFav = useJournal((s) => s.toggleFavorite);
  const [group, setGroup] = useState<Group>('barks');
  const [playing, setPlaying] = useState<string>();

  // Tabs stay mounted, so stop the sound when the user switches away.
  useFocusEffect(useCallback(() => () => { stopPlayback(); setPlaying(undefined); }, []));

  // One titled section per category, favourites first when there are any.
  const sections = useMemo(() => {
    const inGroup = SOUNDS.filter((s) => GROUPS[group].includes(s.category));
    const fav = inGroup.filter((s) => favs.includes(s.id));
    const byCat = GROUPS[group].map((c) => ({ key: c as string, title: t(`sounds.cats.${c}`), items: inGroup.filter((s) => s.category === c) })).filter((x) => x.items.length);
    return fav.length ? [{ key: 'favorites', title: `❤️ ${t('sounds.favorites')}`, items: fav }, ...byCat] : byCat;
  }, [group, favs, t]);

  const press = (s: Sound) => {
    if (s.pro && !isPro) return router.push('/paywall?reason=sounds');
    if (playing === s.id) {
      stopPlayback();
      return setPlaying(undefined);
    }
    setPlaying(s.id);
    void playAsset(s.source, 0.6, () => setPlaying((p) => (p === s.id ? undefined : p)));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TAB_BG }} edges={['top']}>
      <AppHeader title={t('tabs.sounds')} />
      {SOUNDS.length === 0 ? (
        <Card style={{ gap: 8, margin: 16 }}>
          <T.Head>{t('sounds.emptyTitle')}</T.Head>
          <T.Body>{t('sounds.emptyBody')}</T.Body>
        </Card>
      ) : (
        <>
          <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}>
            <GroupToggle value={group} onChange={setGroup} labels={{ barks: t('sounds.groups.barks'), squeakers: t('sounds.groups.squeakers') }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: TAB_BAR_SPACE + 8, gap: 12 }} showsVerticalScrollIndicator={false}>
            {sections.map((sec) => (
              <View key={sec.key} style={{ gap: 12 }}>
                <Text style={[type.title3, { color: color.text, fontWeight: '800', marginTop: 8 }]}>{sec.title}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 }}>
                  {sec.items.map((s, i) => (
                    <SoundCard key={s.id} sound={s} bg={CARD_BG[i % CARD_BG.length]} locked={!!s.pro && !isPro} on={playing === s.id} fav={favs.includes(s.id)} onPress={() => press(s)} onFav={() => toggleFav(s.id)} />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

function SoundCard({ sound: s, bg, locked, on, fav, onPress, onFav }: { sound: Sound; bg: string; locked: boolean; on: boolean; fav: boolean; onPress: () => void; onFav: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={s.title} accessibilityState={{ selected: on }} onPress={onPress} onLongPress={onFav} style={({ pressed }) => ({ width: '48%', transform: [{ scale: pressed ? 0.96 : on ? 1.02 : 1 }] })}>
      <View style={[{ height: 176, borderRadius: radius.lg, padding: 8, gap: 8, backgroundColor: bg, borderWidth: 3, borderColor: on ? color.primary : color.surface }, on ? shadow.glow : shadow.card]}>
        <View style={{ flex: 1, borderRadius: radius.md, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
          {SOUND_ART[s.id] ? (
            <Image source={SOUND_ART[s.id]} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
          ) : (
            <Text style={{ fontSize: 56 }}>{EMOJI[s.category]}</Text>
          )}
          {/* play / pause in the middle of the picture */}
          <View style={{ position: 'absolute', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? color.primary : 'rgba(21,29,56,0.55)' }}>
            {on ? <Pause size={18} color={color.onPrimary} fill={color.onPrimary} /> : <Play size={18} color={color.onBrand} fill={color.onBrand} style={{ marginLeft: 2 }} />}
          </View>
          {locked ? (
            <View style={{ position: 'absolute', top: 6, left: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: color.brandStrong, alignItems: 'center', justifyContent: 'center' }}>
              <Crown size={14} color={color.highlight} fill={color.highlight} />
            </View>
          ) : null}
          <Pressable accessibilityRole="button" accessibilityLabel={t('sounds.favorites')} accessibilityState={{ selected: fav }} hitSlop={8} onPress={onFav} style={{ position: 'absolute', top: 6, right: 6, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
            <Heart size={15} color={color.danger} fill={fav ? color.danger : 'transparent'} />
          </Pressable>
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[type.subheadStrong, { color: color.onBrand, fontWeight: '800', textAlign: 'center' }]}>{s.title}</Text>
      </View>
    </Pressable>
  );
}
