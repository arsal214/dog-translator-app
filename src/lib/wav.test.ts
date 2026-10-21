import assert from 'node:assert/strict';
import { test } from 'node:test';
import { wavLevels } from './wav.ts';

function wav(samples: number[], rate = 1000, fmt = 1): ArrayBuffer {
  const b = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(b);
  const s = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  s(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); s(8, 'WAVE'); s(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, fmt, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, samples.length * 2, true);
  samples.forEach((x, i) => v.setInt16(44 + i * 2, x, true));
  return b;
}

test('loud window reads higher than silent window', () => {
  const quiet = Array(100).fill(0), loud = Array(100).fill(16000);
  const [a, b] = wavLevels(wav([...quiet, ...loud]), 100);
  assert.ok(b > a + 40);
});

test('rejects non-PCM and non-WAV input', () => {
  assert.throws(() => wavLevels(wav([0, 0], 1000, 3)), { code: 'unsupported_audio' });
  assert.throws(() => wavLevels(new ArrayBuffer(64)), { code: 'unsupported_audio' });
});

test('rejects files over 30 seconds', () => {
  assert.throws(() => wavLevels(wav(Array(31_000).fill(0), 1000)), { code: 'audio_too_long' });
});
