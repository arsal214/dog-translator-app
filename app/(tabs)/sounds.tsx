import { Stack, useRouter } from 'expo-router';
import { Heart, Lock, Play } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { Card, Chip, Screen, T, TextField } from '@/components/ui';
import { SOUNDS, type SoundCategory } from '@/content/sounds';
import { useJournal } from '@/features/journal/store';
import { playAsset } from '@/lib/playback';
import { usePurchases } from '@/services/purchases';
import { color } from '@/theme/tokens';

const CATS: SoundCategory[] = ['barks', 'whines', 'growls', 'howls', 'playful', 'attention', 'squeaky', 'doorbell', 'training'];

export default function Sounds() {
  const { t } = useTranslation();
  const router = useRouter();
  const isPro = usePurchases((s) => s.isPro);
  const favs = useJournal((s) => s.favorites);
  const toggleFav = useJournal((s) => s.toggleFavorite);
  const [cat, setCat] = useState<SoundCategory | 'favorites' | null>(null);
  const [q, setQ] = useState('');

  const list = useMemo(
    () => SOUNDS.filter((s) => (cat === 'favorites' ? favs.includes(s.id) : !cat || s.category === cat) && s.title.toLowerCase().includes(q.toLowerCase())),
    [cat, q, favs],
  );

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: t('sounds.title') }} />
      {SOUNDS.length === 0 ? (
        <Card style={{ gap: 8 }}>
          <T.Head>{t('sounds.emptyTitle')}</T.Head>
          <T.Body>{t('sounds.emptyBody')}</T.Body>
        </Card>
      ) : (
        <>
          <TextField label={t('sounds.search')} value={q} onChangeText={setQ} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip label={t('sounds.favorites')} selected={cat === 'favorites'} onPress={() => setCat(cat === 'favorites' ? null : 'favorites')} />
            {CATS.map((c) => <Chip key={c} label={t(`sounds.cats.${c}`)} selected={cat === c} onPress={() => setCat(cat === c ? null : c)} />)}
          </View>
          {list.map((s) => {
            const locked = s.pro && !isPro;
            return (
              <Card key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable accessibilityRole="button" accessibilityLabel={s.title} onPress={() => (locked ? router.push('/paywall?reason=sounds') : playAsset(s.source))}>
                  {locked ? <Lock size={22} color={color.textSecondary} /> : <Play size={22} color={color.brandStrong} />}
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: color.text, fontWeight: '600' }}>{s.title}</Text>
                  <T.Body>{s.attribution ?? s.license}</T.Body>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={t('sounds.favorites')} onPress={() => toggleFav(s.id)}>
                  <Heart size={20} color={color.danger} fill={favs.includes(s.id) ? color.danger : 'transparent'} />
                </Pressable>
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}
