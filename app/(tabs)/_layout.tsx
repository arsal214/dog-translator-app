import { Tabs } from 'expo-router';
import { Home, Mic, MoreHorizontal, Music, ScanFace } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View, type ColorValue } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { color, type } from '@/theme/tokens';

// The app opens straight on the record screen.
export const unstable_settings = { anchor: 'translate' };

// Amber pill that springs in behind the active tab's icon.
function TabIcon({ Icon, focused, c, size }: { Icon: typeof Home; focused: boolean; c: ColorValue; size: number }) {
  const pill = useAnimatedStyle(() => ({ opacity: withSpring(focused ? 1 : 0), transform: [{ scaleX: withSpring(focused ? 1 : 0.4) }] }));
  return (
    <View style={{ width: 56, height: 32, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: 56, height: 32, borderRadius: 16, backgroundColor: color.primary }, pill]} />
      <Icon color={focused ? color.onPrimary : (c as string)} size={size} />
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const icon = (Icon: typeof Home) => ({ color: c, size, focused }: { color: ColorValue; size: number; focused: boolean }) => <TabIcon Icon={Icon} focused={focused} c={c} size={size} />;
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
