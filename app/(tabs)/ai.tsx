import { useRouter, type Href } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AppHeader, ProBanner, TAB_BAR_SPACE, TAB_BG } from '@/components/AppHeader';
import { color, radius, shadow, type } from '@/theme/tokens';

// Every AI feature in one place, as big colourful cards.
const TOOLS: { key: string; art: number; href: Href; from: string; to: string }[] = [
  { key: 'assistant', art: require('../../assets/illustrations/ai-assistant.png'), href: '/assistant', from: '#4C8DDB', to: '#2F5BD3' },
  { key: 'portraits', art: require('../../assets/illustrations/ai-portraits.png'), href: '/portraits', from: '#A26BE8', to: '#6B3FD4' },
  { key: 'talk', art: require('../../assets/illustrations/ai-talk.png'), href: '/talk', from: '#3CCB7F', to: '#12A878' },
  { key: 'mood', art: require('../../assets/illustrations/ai-mood.png'), href: '/mood', from: '#F27A9B', to: '#D64570' },
];

function Gradient({ from, to, id }: { from: string; to: string; id: string }) {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

export default function AiStudio() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TAB_BG }} edges={['top']}>
      <AppHeader title={t('tabs.ai')} />
      <ScrollView contentContainerStyle={{ gap: 16, paddingTop: 4, paddingBottom: TAB_BAR_SPACE + 8 }} showsVerticalScrollIndicator={false}>
        <ProBanner />

        {/* Breed scanner gets the hero slot: it is the feature people try first. */}
        <Animated.View entering={FadeInDown.springify()} style={{ paddingHorizontal: 16 }}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/scan')} style={({ pressed }) => [{ height: 200, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)', transform: [{ scale: pressed ? 0.98 : 1 }] }, shadow.raised]}>
            <Image source={require('../../assets/paywall-scan.jpg')} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="scanFade" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0.35" stopColor={color.brandDeep} stopOpacity="0" />
                  <Stop offset="1" stopColor={color.brandDeep} stopOpacity="0.92" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#scanFade)" />
            </Svg>
            <View style={{ flex: 1, justifyContent: 'flex-end', padding: 16, gap: 8 }}>
              <Text style={[type.title2, { color: color.onBrand, fontWeight: '800' }]}>{t('ai.scan.title')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text numberOfLines={2} style={[type.footnote, { color: color.onBrandMuted, flex: 1 }]}>{t('ai.scan.body')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 14, paddingRight: 10, height: 36, borderRadius: 18, backgroundColor: color.primary }}>
                  <Text style={[type.subheadStrong, { color: color.onPrimary, fontWeight: '800' }]}>{t('ai.scan.cta')}</Text>
                  <ChevronRight size={18} color={color.onPrimary} />
                </View>
              </View>
            </View>
          </Pressable>
        </Animated.View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 }}>
          {TOOLS.map((tool, i) => (
            <Animated.View key={tool.key} entering={FadeInDown.delay(80 + i * 60).springify()} style={{ width: '48%', flexGrow: 1 }}>
              <Pressable accessibilityRole="button" onPress={() => router.push(tool.href)} style={({ pressed }) => [{ height: 200, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)', transform: [{ scale: pressed ? 0.97 : 1 }] }, shadow.card]}>
                <Gradient id={`tool-${tool.key}`} from={tool.from} to={tool.to} />
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 6 }}>
                  <Image source={tool.art} style={{ width: 124, height: 124 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                </View>
                <View style={{ paddingHorizontal: 12, paddingBottom: 14, gap: 2 }}>
                  <Text numberOfLines={1} style={[type.headline, { color: color.onBrand, fontWeight: '800', textAlign: 'center' }]}>{t(`ai.tools.${tool.key}.title`)}</Text>
                  <Text numberOfLines={2} style={[type.caption, { color: 'rgba(255,255,255,0.85)', textAlign: 'center' }]}>{t(`ai.tools.${tool.key}.body`)}</Text>
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
