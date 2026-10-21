import { Tabs } from 'expo-router';
import { Clock, GraduationCap, Home, Mic, MoreHorizontal } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View, type ColorValue } from 'react-native';
import { color, type } from '@/theme/tokens';

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
      <Tabs.Screen name="history" options={{ title: t('tabs.history'), tabBarIcon: icon(Clock) }} />
      <Tabs.Screen
        name="translate"
        options={{
          title: t('tabs.translate'),
          // Raised centre action per the design (64 pt FAB).
          tabBarIcon: () => <View style={{ width: 64, height: 64, borderRadius: 32, marginTop: -28, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: color.surface }}><Mic color={color.onPrimary} size={28} /></View>,
          tabBarActiveTintColor: color.brandStrong,
          tabBarStyle: { display: 'none' }, // the record canvas is full-screen in the design
        }}
      />
      <Tabs.Screen name="training" options={{ title: t('tabs.training'), tabBarIcon: icon(GraduationCap) }} />
      <Tabs.Screen name="more" options={{ title: t('tabs.more'), tabBarIcon: icon(MoreHorizontal) }} />
    </Tabs>
  );
}
