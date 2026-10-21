export class AudioImportError extends Error {
  code: 'unsupported_audio' | 'audio_too_long';
  constructor(code: 'unsupported_audio' | 'audio_too_long') {
    super(code);
    this.code = code;
  }
}

export const MAX_IMPORT_MS = 30_000;

/** Reads 16-bit PCM WAV and returns one dB level per `windowMs` (same shape the live recorder produces). */
export function wavLevels(buf: ArrayBuffer, windowMs = 100): number[] {
  const v = new DataView(buf);
  const tag = (o: number) => (o + 4 <= v.byteLength ? String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3)) : '');
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new AudioImportError('unsupported_audio');

  let ch = 0, rate = 0, bits = 0, fmt = 0, dataAt = -1, dataLen = 0;
  for (let o = 12; o + 8 <= v.byteLength; ) {
    const len = v.getUint32(o + 4, true);
    if (tag(o) === 'fmt ') { fmt = v.getUint16(o + 8, true); ch = v.getUint16(o + 10, true); rate = v.getUint32(o + 12, true); bits = v.getUint16(o + 22, true); }
    if (tag(o) === 'data') { dataAt = o + 8; dataLen = Math.min(len, v.byteLength - dataAt); break; }
    o += 8 + len + (len % 2);
  }
  if (fmt !== 1 || bits !== 16 || ch < 1 || !rate || dataAt < 0) throw new AudioImportError('unsupported_audio');

  const frames = Math.floor(dataLen / (2 * ch));
  if ((frames / rate) * 1000 > MAX_IMPORT_MS) throw new AudioImportError('audio_too_long');

  const win = Math.max(1, Math.floor((rate * windowMs) / 1000));
  const out: number[] = [];
  for (let start = 0; start < frames; start += win) {
    const end = Math.min(frames, start + win);
    let sum = 0;
    for (let i = start; i < end; i++) sum += (v.getInt16(dataAt + i * 2 * ch, true) / 32768) ** 2; // first channel
    const rms = Math.sqrt(sum / (end - start));
    out.push(Math.max(-160, 20 * Math.log10(rms || 1e-8)));
  }
  return out;
}
