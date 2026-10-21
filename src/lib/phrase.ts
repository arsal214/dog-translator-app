const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N} ]/gu, '').trim();

/** Returns the key whose label best matches what the user typed or said, or null. Labels may hold several languages. */
export function matchPhrase<K extends string>(input: string, labels: Record<K, string[]>): K | null {
  const q = norm(input);
  if (q.length < 2) return null;
  let best: K | null = null;
  let bestLen = 0;
  for (const key of Object.keys(labels) as K[]) {
    for (const raw of labels[key]) {
      const l = norm(raw);
      if (!l) continue;
      // The user's text contains the phrase ("please come here boy") or is a prefix of it ("come").
      const hit = q.includes(l) || (q.length >= 3 && l.startsWith(q));
      if (hit && l.length > bestLen) { best = key; bestLen = l.length; }
    }
  }
  return best;
}
