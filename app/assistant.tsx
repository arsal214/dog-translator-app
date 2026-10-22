import { Stack, useRouter } from 'expo-router';
import i18n from '@/localization';
import { ArrowUp, RotateCcw } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Image, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/ui';
import { useActiveDog } from '@/features/dog-profiles/store';
import { errorKey, isLimit } from '@/lib/errors';
import { callFn } from '@/services/api';
import { usePurchases } from '@/services/purchases';
import { color, radius, shadow, type } from '@/theme/tokens';

type Msg = { id: number; role: 'user' | 'assistant'; content: string; error?: boolean };
const SUGGESTIONS = ['bark', 'food', 'walk', 'train'] as const;
const AVATAR = require('../assets/illustrations/ai-assistant.png');

export default function Assistant() {
  const { t } = useTranslation();
  const router = useRouter();
  const dog = useActiveDog();
  const isPro = usePurchases((s) => s.isPro);
  const [msgs, setMsgs] = useState<Msg[]>([]); // in memory only: chat history is not persisted
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(false);
  const id = useRef(0);
  const list = useRef<FlatList<Msg>>(null);
  const name = dog?.name ?? '';

  const ask = async (history: Msg[]) => {
    setBusy(true);
    try {
      const { reply } = await callFn<{ reply: string }>('assistant', {
        messages: history.filter((m) => !m.error).map(({ role, content }) => ({ role, content })),
        dog: dog ? { name: dog.name, breed: dog.breed, sex: dog.sex, age: dog.age, size: dog.voice, personality: dog.traits } : undefined,
        language: i18n.language,
      });
      setMsgs([...history, { id: ++id.current, role: 'assistant', content: reply }]);
    } catch (e) {
      setLimit(isLimit(e));
      setMsgs([...history, { id: ++id.current, role: 'assistant', content: t(errorKey(e)), error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const send = (raw = text) => {
    const c = raw.trim();
    if (!c || busy) return;
    setText('');
    const next = [...msgs, { id: ++id.current, role: 'user' as const, content: c }];
    setMsgs(next);
    void ask(next);
  };

  useEffect(() => {
    if (msgs.length) setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50);
  }, [msgs.length, busy]);

  const canSend = !busy && !!text.trim();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t('assistant.title')}
        right={msgs.length ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('assistant.clear')} hitSlop={8} onPress={() => { setMsgs([]); setLimit(false); }} style={[{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface }, shadow.card]}>
            <RotateCcw size={18} color={color.text} />
          </Pressable>
        ) : undefined}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={list}
          data={msgs}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            // Welcome: who you're talking to, what to ask, and tappable starter questions.
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 12 }}>
              <Animated.View entering={FadeInDown.springify()} style={[{ width: 150, height: 150, borderRadius: 75, backgroundColor: '#E3EDFF', alignItems: 'center', justifyContent: 'center' }, shadow.card]}>
                <Image source={AVATAR} style={{ width: 130, height: 130 }} resizeMode="contain" accessibilityIgnoresInvertColors />
              </Animated.View>
              <Text style={[type.title2, { color: color.text, textAlign: 'center' }]}>{t('assistant.welcomeTitle', { name: name || t('translate.dog') })}</Text>
              <Text style={[type.subhead, { color: color.textSecondary, textAlign: 'center', paddingHorizontal: 16 }]}>{t('assistant.welcomeBody')}</Text>
              <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 8 }}>
                {SUGGESTIONS.map((k, i) => (
                  <Animated.View key={k} entering={FadeInUp.delay(100 + i * 60).springify()}>
                    <Pressable accessibilityRole="button" onPress={() => send(t(`assistant.suggestions.${k}`, { name: name || t('translate.dog') }))} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: color.surface, transform: [{ scale: pressed ? 0.98 : 1 }] }, shadow.card]}>
                      <Text style={{ fontSize: 18 }}>{['🐕', '🍖', '🦮', '🎓'][i]}</Text>
                      <Text style={[type.subheadStrong, { color: color.text, flex: 1 }]}>{t(`assistant.suggestions.${k}`, { name: name || t('translate.dog') })}</Text>
                      <ArrowUp size={16} color={color.textTertiary} style={{ transform: [{ rotate: '45deg' }] }} />
                    </Pressable>
                  </Animated.View>
                ))}
              </View>
              <Text style={[type.caption, { color: color.textTertiary, textAlign: 'center', paddingHorizontal: 12, marginTop: 8 }]}>{t('assistant.disclaimer')}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const mine = item.role === 'user';
            return (
              <Animated.View entering={FadeInUp.springify()} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                {!mine ? <Avatar /> : null}
                <View style={[{ maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderBottomRightRadius: mine ? 6 : 20, borderBottomLeftRadius: mine ? 20 : 6, backgroundColor: mine ? color.primary : item.error ? color.dangerSoft : color.surface }, mine ? null : shadow.card]}>
                  <Text style={[type.callout, { color: mine ? color.onPrimary : item.error ? color.textDanger : color.text }]}>{item.content}</Text>
                  {item.error && !limit ? (
                    <Pressable accessibilityRole="button" onPress={() => ask(msgs.filter((m) => m.id !== item.id))}>
                      <Text style={[type.subheadStrong, { color: color.textAccent, marginTop: 6 }]}>↻ {t('common.retry')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </Animated.View>
            );
          }}
          ListFooterComponent={
            busy ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: msgs.length ? 12 : 0 }}>
                <Avatar />
                <View style={[{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 20, borderBottomLeftRadius: 6, backgroundColor: color.surface }, shadow.card]}><TypingDots /></View>
              </View>
            ) : limit ? <View style={{ marginTop: 12 }}><Button label={t('paywall.seePro')} onPress={() => router.push('/paywall?reason=ai')} /></View> : undefined
          }
        />

        <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, gap: 6 }}>
          <View style={[{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 6, paddingLeft: 16, borderRadius: 28, backgroundColor: color.surface }, shadow.raised]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('assistant.placeholder', { name })}
              placeholderTextColor={color.textTertiary}
              maxLength={500}
              multiline
              accessibilityLabel={t('assistant.placeholder', { name })}
              style={[type.body, { flex: 1, maxHeight: 110, minHeight: 44, paddingTop: 11, paddingBottom: 11, color: color.text }]}
            />
            <Pressable accessibilityRole="button" accessibilityLabel={t('assistant.send')} onPress={() => send()} disabled={!canSend} style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: canSend ? color.primary : color.subtle, transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
              <ArrowUp size={22} color={canSend ? color.onPrimary : color.textTertiary} strokeWidth={2.6} />
            </Pressable>
          </View>
          {!isPro ? <Text style={[type.caption, { color: color.textTertiary, textAlign: 'center' }]}>⚡ {t('assistant.costHint')}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Avatar() {
  return (
    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#E3EDFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Image source={AVATAR} style={{ width: 34, height: 34 }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

/** Three dots bouncing in turn while the reply is on its way. */
function TypingDots() {
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {[0, 1, 2].map((i) => <Dot key={i} delay={i * 150} />)}
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(withSequence(withTiming(-5, { duration: 300 }), withTiming(0, { duration: 300 })), -1));
  }, [delay, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color.textTertiary }, style]} />;
}
