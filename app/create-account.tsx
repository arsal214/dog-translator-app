import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Bell, CheckCircle2, Mail } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mascot } from '@/components/Mascot';
import { Button, TextField } from '@/components/ui';
import { Halo, HeroBackdrop } from '@/features/dog-profiles/HeroDecor';
import { confirmCode, createAccount, resendCode, signIn, type AccountError } from '@/services/account';
import { log } from '@/services/logger';
import { bootstrapUser } from '@/services/profile';
import { enablePush } from '@/services/push';
import { color, radius, shadow, type } from '@/theme/tokens';

type Step = 'form' | 'code' | 'notify';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Shown right after a guest buys Pro. There is deliberately no close/back: the purchase must end up on a real
 * account so it survives reinstalls and new devices.
 */
export default function CreateAccount() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('form');
  const [mode, setMode] = useState<'create' | 'signin'>('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AccountError | 'email_format' | 'password_short' | null>(null);
  const [resent, setResent] = useState(false);

  // Android hardware back would otherwise leave the screen.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    log.info('account_gate_view');
    return () => sub.remove();
  }, []);

  const finish = () => router.replace('/(tabs)/translate');

  const submit = async () => {
    const e = email.trim();
    if (!EMAIL.test(e)) return setError('email_format');
    if (password.length < 8) return setError('password_short');
    setError(null);
    setBusy(true);
    if (mode === 'signin') {
      const r = await signIn(e, password);
      setBusy(false);
      if (!r.ok) return setError(r.error);
      void bootstrapUser();
      return done();
    }
    const r = await createAccount(e, password);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    if (r.needsCode) setStep('code');
    else done();
  };

  const verify = async () => {
    if (code.trim().length < 6) return setError('bad_code');
    setError(null);
    setBusy(true);
    const r = await confirmCode(email.trim(), code.trim(), password);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    done();
  };

  const done = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep('notify');
  };

  const allowPush = async () => {
    setBusy(true);
    const on = await enablePush().catch(() => false);
    setBusy(false);
    log.info('push_prompt', { enabled: on, from: 'account' });
    finish();
  };

  const errorText = error ? t(`account.errors.${error}`) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: color.canvas }}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={{ paddingTop: insets.top + 24, paddingBottom: 32, alignItems: 'center', gap: 12, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, overflow: 'hidden' }}>
            <HeroBackdrop />
            <View style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}>
              <Halo size={96} />
              <Animated.View entering={ZoomIn.springify()} style={[{ width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: color.primary, backgroundColor: color.brandSoft, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, shadow.glow]}>
                {step === 'notify' ? <Bell size={44} color={color.onPrimary} /> : <Mascot size={88} />}
              </Animated.View>
            </View>
            {step !== 'notify' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 28, borderRadius: 14, backgroundColor: 'rgba(60,203,127,0.18)' }}>
                <CheckCircle2 size={16} color="#3CCB7F" />
                <Text style={[type.caption, { color: '#7BE3AE', fontWeight: '700' }]}>{t('account.proActive')}</Text>
              </View>
            ) : null}
            <Text accessibilityRole="header" style={[type.title2, { color: color.onBrand, textAlign: 'center', paddingHorizontal: 24 }]}>
              {t(step === 'notify' ? 'account.notifyTitle' : step === 'code' ? 'account.codeTitle' : mode === 'signin' ? 'account.signinTitle' : 'account.title')}
            </Text>
            <Text style={[type.subhead, { color: color.onBrandMuted, textAlign: 'center', paddingHorizontal: 32 }]}>
              {step === 'code' ? t('account.codeBody', { email: email.trim() }) : t(step === 'notify' ? 'account.notifyBody' : 'account.body')}
            </Text>
          </View>

          <Animated.View key={step} entering={FadeInDown.springify()} style={{ padding: 20, gap: 16 }}>
            {step === 'form' ? (
              <>
                <TextField label={t('account.email')} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" placeholder="you@example.com" error={error === 'email_format' || error === 'invalid_email' || error === 'email_taken' ? errorText : undefined} />
                <TextField label={t('account.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} textContentType={mode === 'signin' ? 'password' : 'newPassword'} placeholder={t('account.passwordHint')} error={error === 'password_short' || error === 'weak_password' ? errorText : undefined} />
                {error && !['email_format', 'invalid_email', 'email_taken', 'password_short', 'weak_password'].includes(error) ? <Text style={[type.footnote, { color: color.textDanger, textAlign: 'center' }]}>{errorText}</Text> : null}
                <Button label={t(mode === 'signin' ? 'account.signin' : 'account.create')} loading={busy} onPress={submit} />
                <Pressable accessibilityRole="button" hitSlop={8} onPress={() => { setError(null); setMode(mode === 'signin' ? 'create' : 'signin'); }}>
                  <Text style={[type.subhead, { color: color.textSecondary, textAlign: 'center' }]}>
                    {t(mode === 'signin' ? 'account.noAccount' : 'account.haveAccount')} <Text style={{ color: color.textAccent, fontWeight: '700' }}>{t(mode === 'signin' ? 'account.create' : 'account.signin')}</Text>
                  </Text>
                </Pressable>
                <Text style={[type.footnote, { color: color.textTertiary, textAlign: 'center' }]}>{t('account.why')}</Text>
              </>
            ) : step === 'code' ? (
              <>
                <View style={{ alignItems: 'center' }}><Mail size={28} color={color.textAccent} /></View>
                <TextField label={t('account.code')} value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} placeholder="123456" error={errorText} style={[type.title2, { height: 60, textAlign: 'center', letterSpacing: 8, borderRadius: radius.sm, backgroundColor: color.surface, color: color.text, borderWidth: 1, borderColor: error ? color.danger : color.border }]} />
                <Button label={t('account.verify')} loading={busy} disabled={code.length < 6} onPress={verify} />
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
                  <Pressable accessibilityRole="button" disabled={resent} onPress={async () => { setResent(true); await resendCode(email.trim()); }}>
                    <Text style={[type.subheadStrong, { color: resent ? color.textTertiary : color.textAccent }]}>{t(resent ? 'account.resent' : 'account.resend')}</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => { setError(null); setCode(''); setStep('form'); }}>
                    <Text style={[type.subheadStrong, { color: color.textSecondary }]}>{t('account.changeEmail')}</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                {(['reminders', 'tips', 'offers'] as const).map((k) => (
                  <View key={k} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: color.surface }, shadow.card]}>
                    <Text style={{ fontSize: 22 }}>{k === 'reminders' ? '🎓' : k === 'tips' ? '🐾' : '🎁'}</Text>
                    <Text style={[type.subheadStrong, { color: color.text, flex: 1 }]}>{t(`account.notify.${k}`)}</Text>
                  </View>
                ))}
                <Button label={t('account.notifyAllow')} loading={busy} onPress={allowPush} />
                <Button variant="tertiary" label={t('account.notifyLater')} onPress={() => { log.info('push_prompt', { enabled: false, from: 'account', skipped: true }); finish(); }} />
              </>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
