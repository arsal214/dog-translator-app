import { useFocusEffect, useRouter } from 'expo-router';
import { Crown, Heart, Pause, Play } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Image, Pressable, ScrollView, Text, View } from 'react-native';
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
type Filter = 'all' | 'favorites' | SoundCategory;
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

// Each category gets an emoji and a few background shades that cycle, so the grid stays colourful.
const LOOK: Record<SoundCategory, { emoji: string; bg: string[] }> = {
  barks: { emoji: '🐶', bg: ['#FFE2C2', '#FFD3A8', '#FCE7D2'] },
  whines: { emoji: '🥺', bg: ['#DCE7FF', '#E8E2FF', '#D6ECFF'] },
  growls: { emoji: '🐺', bg: ['#FFD9D6', '#F6DDE8'] },
  howls: { emoji: '🌕', bg: ['#2A3B78', '#3A2F6B'] },
  playful: { emoji: '🎾', bg: ['#DDF5E4', '#E9F7C9'] },
  attention: { emoji: '🐕', bg: ['#FFF1CC', '#FFE9A8'] },
  squeaky: { emoji: '🧸', bg: ['#FFE0EC', '#FFD6E0', '#FBE3F4'] },
  doorbell: { emoji: '🔔', bg: ['#D9F2FF', '#E0F0FA'] },
  training: { emoji: '🦮', bg: ['#D7F3F1', '#E2F5EE'] },
};

export default function Sounds() {
  const { t } = useTranslation();
  const router = useRouter();
  const isPro = usePurchases((s) => s.isPro);
  const favs = useJournal((s) => s.favorites);
  const toggleFav = useJournal((s) => s.toggleFavorite);
  const [group, setGroup] = useState<Group>('barks');
  const [cat, setCat] = useState<Filter>('all');
  const [playing, setPlaying] = useState<string>();

  // Tabs stay mounted, so stop the sound when the user switches away.
  useFocusEffect(useCallback(() => () => { stopPlayback(); setPlaying(undefined); }, []));

  const list = useMemo(
    () => SOUNDS.filter((s) => GROUPS[group].includes(s.category) && (cat === 'all' || (cat === 'favorites' ? favs.includes(s.id) : s.category === cat))),
    [group, cat, favs],
  );
  // Index within its category, so neighbouring circles of the same kind get different shades.
  const shade = useMemo(() => {
    const seen: Partial<Record<SoundCategory, number>> = {};
    return Object.fromEntries(SOUNDS.map((s) => [s.id, (seen[s.category] = (seen[s.category] ?? -1) + 1)]));
  }, []);

  const press = (s: Sound) => {
    if (s.pro && !isPro) return router.push('/paywall?reason=sounds');
    if (playing === s.id) {
      stopPlayback();
      return setPlaying(undefined);
    }
    setPlaying(s.id);
    void playAsset(s.source, 0.6, () => setPlaying((p) => (p === s.id ? undefined : p)));
  };

  const pills: { key: Filter; label: string }[] = [
    { key: 'all', label: t('sounds.all') },
    ...GROUPS[group].filter((c) => SOUNDS.some((s) => s.category === c)).map((c) => ({ key: c as Filter, label: t(`sounds.cats.${c}`) })),
    { key: 'favorites', label: `♥ ${t('sounds.favorites')}` },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <T.Title style={{ flex: 1 }}>{t('sounds.title')}</T.Title>
        {!isPro ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('paywall.seePro')} onPress={() => router.push('/paywall?reason=sounds')} style={[{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.brandSoft, alignItems: 'center', justifyContent: 'center' }, shadow.card]}>
            <Crown size={22} color={color.textAccent} />
          </Pressable>
        ) : null}
      </View>

      {SOUNDS.length === 0 ? (
        <Card style={{ gap: 8, margin: 16 }}>
          <T.Head>{t('sounds.emptyTitle')}</T.Head>
          <T.Body>{t('sounds.emptyBody')}</T.Body>
        </Card>
      ) : (
        <>
          <View style={{ paddingHorizontal: 20, paddingBottom: 6 }}>
            <GroupToggle value={group} onChange={(g) => { setGroup(g); setCat('all'); }} labels={{ barks: t('sounds.groups.barks'), squeakers: t('sounds.groups.squeakers') }} />
          </View>
          <View style={{ height: 56 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, alignItems: 'center', height: 52 }}>
              {pills.map((p) => {
                const on = cat === p.key;
                return (
                  <Pressable key={p.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setCat(p.key)} style={{ height: 36, paddingHorizontal: 16, borderRadius: radius.full, justifyContent: 'center', backgroundColor: on ? color.primary : color.surface, borderWidth: 1, borderColor: on ? color.primary : color.border }}>
                    <Text style={[type.subheadStrong, { color: on ? color.onPrimary : color.text }]}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingTop: 8, paddingBottom: 40, rowGap: 22 }}>
            {list.length === 0 ? <T.Body style={{ padding: 10 }}>{t('sounds.noFavorites')}</T.Body> : null}
            {list.map((s) => {
              const look = LOOK[s.category];
              const bg = look.bg[shade[s.id] % look.bg.length];
              const locked = s.pro && !isPro;
              const on = playing === s.id;
              const fav = favs.includes(s.id);
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  accessibilityLabel={s.title}
                  accessibilityHint={t('sounds.longPressHint')}
                  onPress={() => press(s)}
                  onLongPress={() => toggleFav(s.id)}
                  style={({ pressed }) => ({ width: '33.33%', alignItems: 'center', gap: 8, transform: [{ scale: pressed ? 0.95 : 1 }] })}
                >
                  <View style={[{ width: 104, height: 104, borderRadius: 52, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 4 : 3, borderColor: on ? color.primary : color.surface }, shadow.card]}>
                    {SOUND_ART[s.id] ? (
                      <Image source={SOUND_ART[s.id]} style={{ width: '100%', height: '100%', borderRadius: 52 }} resizeMode="cover" accessibilityIgnoresInvertColors />
                    ) : (
                      <Text style={{ fontSize: 52, lineHeight: 60 }}>{look.emoji}</Text>
                    )}
                    {/* play / pause / Pro badge, like a sticker on the circle */}
                    <View style={{ position: 'absolute', bottom: -6, height: 26, minWidth: 36, paddingHorizontal: 8, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: locked ? color.brandStrong : on ? color.danger : color.primary, borderWidth: 2, borderColor: color.surface }}>
                      {locked ? <Crown size={13} color={color.highlight} fill={color.highlight} /> : on ? <Pause size={12} color={color.onBrand} fill={color.onBrand} /> : <Play size={12} color={color.onPrimary} fill={color.onPrimary} />}
                    </View>
                    {fav ? (
                      <View style={{ position: 'absolute', top: 2, right: 2, width: 24, height: 24, borderRadius: 12, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' }}>
                        <Heart size={13} color={color.danger} fill={color.danger} />
                      </View>
                    ) : null}
                  </View>
                  <Text numberOfLines={2} style={[type.footnote, { color: color.text, textAlign: 'center', paddingHorizontal: 6, fontWeight: '600' }]}>{s.title}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}
