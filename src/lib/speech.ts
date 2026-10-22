import { getLocales } from 'expo-localization';

export class SpeechUnavailable extends Error {}

// The recogniser needs a full locale ("en-US"), not the app's bare language code ("en").
const DEFAULT_REGION: Record<string, string> = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', pt: 'pt-BR' };

/** Picks the phone's own regional variant of `lang` (e.g. en-GB), else a sensible default, from what the device supports. */
async function speechLocale(mod: { getSupportedLocales: (o: object) => Promise<{ locales: string[] }> }, lang: string) {
  if (lang.includes('-')) return lang;
  const supported = await mod.getSupportedLocales({}).then((r) => r.locales).catch(() => [] as string[]);
  const ok = (tag?: string | null) => !!tag && (supported.length === 0 || supported.includes(tag));
  const device = getLocales().find((l) => l.languageCode === lang)?.languageTag;
  if (ok(device)) return device!;
  if (ok(DEFAULT_REGION[lang])) return DEFAULT_REGION[lang];
  return supported.find((l) => l.startsWith(`${lang}-`)) ?? DEFAULT_REGION[lang] ?? 'en-US';
}

/**
 * Listens once (or transcribes `fileUri`) and resolves with the transcript. Rejects with SpeechUnavailable when the native module is
 * missing (Expo Go), recognition isn't available, or permission was denied.
 */
export async function listenOnce(lang: string, fileUri?: string): Promise<string> {
  let mod: typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;
  try {
    mod = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
  } catch {
    throw new SpeechUnavailable();
  }
  if (!mod.isRecognitionAvailable()) throw new SpeechUnavailable('recognition not available on this device');
  const perm = await mod.requestPermissionsAsync();
  if (!perm.granted) throw new SpeechUnavailable('permission denied');

  const locale = await speechLocale(mod, lang);
  return new Promise((resolve, reject) => {
    let text = '';
    const subs = [
      mod.addListener('result', (e) => { text = e.results[0]?.transcript ?? text; }),
      // Silence ("no-speech") or an aborted listen is not "unavailable": resolve empty so the caller can say "didn't hear anything".
      mod.addListener('error', (e) => { done(); if (e.error === 'no-speech' || e.error === 'aborted') resolve(text); else reject(new SpeechUnavailable(`${e.error}: ${e.message}`)); }),
      mod.addListener('end', () => { done(); resolve(text); }),
    ];
    const done = () => subs.forEach((s) => s.remove());
    // With a file URI the recogniser transcribes that recording instead of the live microphone.
    mod.start({ lang: locale, interimResults: false, continuous: false, ...(fileUri ? { audioSource: { uri: fileUri } } : {}) });
  });
}
