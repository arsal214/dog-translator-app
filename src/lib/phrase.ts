const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();

/**
 * Returns the key whose label best matches what the user typed or said, or null. Labels may hold several languages.
 * An exact phrase wins; otherwise `keywords` (whole words, any language) pick the key with the most hits,
 * so "go outside" or "let's go for a walk" still find "Come outside".
 */
export function matchPhrase<K extends string>(input: string, labels: Record<K, string[]>, keywords?: Partial<Record<K, string[]>>): K | null {
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
  if (best || !keywords) return best;

  const padded = ` ${q} `;
  let bestHits = 0;
  for (const key of Object.keys(keywords) as K[]) {
    const hits = (keywords[key] ?? []).filter((w) => padded.includes(` ${norm(w)} `)).length;
    if (hits > bestHits) { best = key; bestHits = hits; }
  }
  return best;
}
