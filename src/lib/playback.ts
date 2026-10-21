import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

let current: AudioPlayer | null = null;

export function stopPlayback() {
  current?.pause();
  current?.remove();
  current = null;
}

/** Plays one asset at a time: starting a new sound stops the previous one (no overlap). `onEnd` fires when it finishes. */
export async function playAsset(source: number | string, volume = 0.6, onEnd?: () => void) {
  stopPlayback();
  await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
  const p = createAudioPlayer(source);
  p.volume = Math.min(1, Math.max(0, volume));
  current = p;
  if (onEnd) p.addListener('playbackStatusUpdate', (s) => { if (s.didJustFinish) onEnd(); });
  p.play();
}
