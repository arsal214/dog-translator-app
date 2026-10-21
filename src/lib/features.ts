export type BarkFeatures = { durationMs: number; meanDb: number; peakDb: number; barkCount: number; variability: number };

/** Summarises dB metering samples (one per `intervalMs`) into the measurements sent to the analysis function. */
export function extractFeatures(samples: number[], intervalMs: number): BarkFeatures {
  const s = samples.filter((x) => Number.isFinite(x));
  if (s.length === 0) return { durationMs: 0, meanDb: -160, peakDb: -160, barkCount: 0, variability: 0 };
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  const peak = Math.max(...s);
  const variability = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length);
  // A "bark" = a rise above (mean + 6 dB) after the level had dropped back below it.
  const threshold = mean + 6;
  let barkCount = 0;
  let above = false;
  for (const x of s) {
    if (x > threshold && !above) barkCount++;
    above = x > threshold;
  }
  const r = (n: number) => Math.round(n * 10) / 10;
  return { durationMs: s.length * intervalMs, meanDb: r(mean), peakDb: r(peak), barkCount, variability: r(variability) };
}
