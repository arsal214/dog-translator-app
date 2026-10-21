import { Tabs } from 'expo-router';
import { Home, Mic, MoreHorizontal, Music, ScanFace } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View, type ColorValue } from 'react-native';
import { color, type } from '@/theme/tokens';

// The app opens straight on the record screen.
export const unstable_settings = { initialRouteName: 'translate' };

export default function TabsLayout() {
  const { t } = useTranslation();
  const icon = (Icon: typeof Home) => ({ color: c, size }: { color: ColorValue; size: number }) => <Icon color={c as string} size={size} />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.brandStrong,
        tabBarInactiveTintColor: color.textSecondary,
        tabBarLabelStyle: type.tab,
        tabBarStyle: { backgroundColor: color.surface, borderTopColor: color.borderSubtle },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: icon(Home) }} />
      <Tabs.Screen name="sounds" options={{ title: t('tabs.sounds'), tabBarIcon: icon(Music) }} />
      <Tabs.Screen
        name="translate"
        options={{
          title: t('tabs.translate'),
          // Raised centre action per the design (64 pt FAB).
          tabBarIcon: () => <View style={{ width: 64, height: 64, borderRadius: 32, marginTop: -28, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: color.surface }}><Mic color={color.onPrimary} size={28} /></View>,
          tabBarActiveTintColor: color.brandStrong,
        }}
      />
      <Tabs.Screen name="scanner" options={{ title: t('tabs.scanner'), tabBarIcon: icon(ScanFace) }} />
      <Tabs.Screen name="more" options={{ title: t('tabs.more'), tabBarIcon: icon(MoreHorizontal) }} />
    </Tabs>
  );
}
