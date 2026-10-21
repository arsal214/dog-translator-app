import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';

// 48 kHz so tones up to 22 kHz stay below Nyquist (24 kHz).
const RATE = 48000;

/** Builds a 16-bit mono PCM WAV. `shape(t, i, n)` returns a sample in [-1, 1]. */
function wav(seconds: number, shape: (t: number, i: number, n: number) => number): Uint8Array {
  const n = Math.floor(RATE * seconds);
  const out = new Uint8Array(44 + n * 2);
  const v = new DataView(out.buffer);
  const str = (o: number, s: string) => [...s].forEach((c, k) => v.setUint8(o + k, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, shape(i / RATE, i, n))) * 32767, true);
  return out;
}

function save(name: string, bytes: Uint8Array): string {
  const f = new File(Paths.cache, name);
  f.create({ overwrite: true });
  f.write(bytes);
  return f.uri;
}

/** One-second sine loop; with the player's loop flag it plays seamlessly (whole cycles aren't required at this fade). */
export function sineSource(freqHz: number): string {
  const fade = RATE * 0.005;
  return save(
    `sine-${Math.round(freqHz)}.wav`,
    wav(1, (t, i, n) => Math.sin(2 * Math.PI * freqHz * t) * Math.min(1, i / fade, (n - i) / fade) * 0.8),
  );
}

/** Short percussive click: filtered noise burst + decaying tone, per tone variant. */
export function clickSource(name: string, freqHz: number, decay: number): string {
  return save(
    `click-${name}.wav`,
    wav(0.12, (t) => Math.sin(2 * Math.PI * freqHz * t) * Math.exp(-t * decay) * 0.9),
  );
}

export function player(uri: string, opts: { loop?: boolean; volume?: number } = {}): AudioPlayer {
  const p = createAudioPlayer(uri);
  p.loop = !!opts.loop;
  p.volume = opts.volume ?? 1;
  return p;
}
