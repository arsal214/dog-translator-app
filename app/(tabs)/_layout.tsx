import { Tabs } from 'expo-router';
import { GraduationCap, Mic, Music, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View, type ColorValue } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { color, type } from '@/theme/tokens';

// The app opens straight on the translator.
export const unstable_settings = { anchor: 'translate' };

// Plain icon; the active one turns amber and gets a small dot above it.
function TabIcon({ Icon, focused, tint }: { Icon: typeof Mic; focused: boolean; tint: string }) {
  const dot = useAnimatedStyle(() => ({ opacity: withSpring(focused ? 1 : 0), transform: [{ scale: withSpring(focused ? 1 : 0) }] }));
  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={[{ position: 'absolute', top: -10, width: 18, height: 4, borderRadius: 2, backgroundColor: color.primary }, dot]} />
      <Icon color={tint} size={24} strokeWidth={focused ? 2.5 : 2} />
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const icon = (Icon: typeof Mic) => ({ focused, color: tint }: { focused: boolean; color: ColorValue }) => <TabIcon Icon={Icon} focused={focused} tint={tint as string} />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.primaryPressed,
        tabBarInactiveTintColor: color.textTertiary,
        tabBarLabelStyle: [type.tab, { fontSize: 11, fontWeight: '700' }],
        tabBarStyle: { backgroundColor: color.surface, borderTopColor: color.borderSubtle, paddingTop: 8 },
        // Plain Pressable: the default borderless Android ripple drew a grey circle over the icon.
        tabBarButton: ({ ref: _ref, pressOpacity: _po, hoverEffect: _he, android_ripple: _ar, ...p }) => <Pressable {...p} />,
      }}
    >
      <Tabs.Screen name="translate" options={{ title: t('tabs.translate'), tabBarIcon: icon(Mic) }} />
      <Tabs.Screen name="sounds" options={{ title: t('tabs.sounds'), tabBarIcon: icon(Music) }} />
      <Tabs.Screen name="ai" options={{ title: t('tabs.ai'), tabBarIcon: icon(Sparkles) }} />
      <Tabs.Screen name="training" options={{ title: t('tabs.training'), tabBarIcon: icon(GraduationCap) }} />
    </Tabs>
  );
}
