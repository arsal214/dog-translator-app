export class SpeechUnavailable extends Error {}

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
    mod.start({ lang, interimResults: false, continuous: false, ...(fileUri ? { audioSource: { uri: fileUri } } : {}) });
  });
}
