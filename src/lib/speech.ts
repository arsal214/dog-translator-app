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
  if (!mod.isRecognitionAvailable()) throw new SpeechUnavailable();
  const perm = await mod.requestPermissionsAsync();
  if (!perm.granted) throw new SpeechUnavailable();

  return new Promise((resolve, reject) => {
    let text = '';
    const subs = [
      mod.addListener('result', (e) => { text = e.results[0]?.transcript ?? text; }),
      mod.addListener('error', () => { done(); reject(new SpeechUnavailable()); }),
      mod.addListener('end', () => { done(); resolve(text); }),
    ];
    const done = () => subs.forEach((s) => s.remove());
    // With a file URI the recogniser transcribes that recording instead of the live microphone.
    mod.start({ lang, interimResults: false, continuous: false, ...(fileUri ? { audioSource: { uri: fileUri } } : {}) });
  });
}
