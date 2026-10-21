import { Stack, useRouter } from 'expo-router';
import i18n from '@/localization';
import { Send } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, T } from '@/components/ui';
import { useActiveDog } from '@/features/dog-profiles/store';
import { errorKey, isLimit } from '@/lib/errors';
import { callFn } from '@/services/api';
import { color, radius, type } from '@/theme/tokens';

type Msg = { id: number; role: 'user' | 'assistant'; content: string; error?: boolean };

export default function Assistant() {
  const { t } = useTranslation();
  const router = useRouter();
  const dog = useActiveDog();
  const [msgs, setMsgs] = useState<Msg[]>([]); // in memory only: chat history is not persisted
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(false);
  const id = useRef(0);

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

  const send = () => {
    const c = text.trim();
    if (!c || busy) return;
    setText('');
    const next = [...msgs, { id: ++id.current, role: 'user' as const, content: c }];
    setMsgs(next);
    void ask(next);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: t('assistant.title'), headerRight: () => <Pressable accessibilityRole="button" onPress={() => setMsgs([])}><Text style={{ color: color.textAccent }}>{t('assistant.clear')}</Text></Pressable> }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          data={msgs}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListHeaderComponent={<T.Body>{t('assistant.disclaimer')}</T.Body>}
          renderItem={({ item }) => (
            <View style={{ alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: 12, borderRadius: radius.md, backgroundColor: item.role === 'user' ? color.primary : item.error ? color.dangerSoft : color.surface }}>
              <Text style={[type.callout, { color: item.role === 'user' ? color.onPrimary : item.error ? color.textDanger : color.text }]}>{item.content}</Text>
              {item.error && !limit ? <Pressable accessibilityRole="button" onPress={() => ask(msgs.filter((m) => m.id !== item.id))}><Text style={{ color: color.textAccent, marginTop: 6 }}>{t('common.retry')}</Text></Pressable> : null}
            </View>
          )}
          ListFooterComponent={busy ? <T.Body>{t('assistant.typing')}</T.Body> : limit ? <Button label={t('paywall.seePro')} onPress={() => router.push('/paywall?reason=ai')} /> : undefined}
        />
        <View style={{ flexDirection: 'row', gap: 8, padding: 12, alignItems: 'center' }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('assistant.placeholder', { name: dog?.name })}
            placeholderTextColor={color.textTertiary}
            maxLength={500}
            multiline
            accessibilityLabel={t('assistant.placeholder', { name: dog?.name })}
            style={[type.body, { flex: 1, maxHeight: 100, minHeight: 48, borderRadius: radius.md, paddingHorizontal: 14, backgroundColor: color.surface, color: color.text }]}
          />
          <Pressable accessibilityRole="button" accessibilityLabel={t('assistant.send')} onPress={send} disabled={busy || !text.trim()} style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: busy || !text.trim() ? color.disabled : color.primary }}>
            <Send size={20} color={color.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
