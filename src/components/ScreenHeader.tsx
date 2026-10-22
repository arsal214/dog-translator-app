import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { color, shadow, type } from '@/theme/tokens';

/** Header for pushed screens: round back button, centred title, optional action on the right. */
export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 16 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={8} onPress={() => router.back()} style={[{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface }, shadow.card]}>
        <ChevronLeft size={22} color={color.text} />
      </Pressable>
      <Text accessibilityRole="header" numberOfLines={1} style={[type.title3, { flex: 1, textAlign: 'center', color: color.text, fontWeight: '800', marginHorizontal: 8 }]}>{title}</Text>
      {right ?? <View style={{ width: 40 }} />}
    </View>
  );
}
