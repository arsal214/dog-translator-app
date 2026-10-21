import { complete, HttpError, parseJson } from '../_shared/ai.ts';
import { guarded } from '../_shared/guard.ts';

// EXPERIMENTAL. No validated dog-vocalisation model backs this: the app sends measured acoustic features
// (never raw audio) and an LLM produces a playful, uncertain interpretation. Labelled as such in the UI.
const SYSTEM = `You interpret simple acoustic measurements of a dog vocalisation for an entertainment app.
This is NOT scientific. Return ONLY JSON: {"emotion":"happy|excited|calm|anxious|playful|alert","emotions":[{"emotion":"<same set>","percent":0-100}] (top 3, percents sum to 100, rough estimates),"intensity":1-5,"context":"one short neutral sentence on common contexts for this kind of sound; end by reminding to check body language","confidence":"low|medium|high","interpretation":"one playful sentence starting with 'might be saying' phrasing, max 140 chars"}.
Be cautious: use confidence "low" or "medium" unless features are very clear. Never claim certainty or diagnose.`;

type Features = { durationMs: number; meanDb: number; peakDb: number; barkCount: number; variability: number };

Deno.serve(guarded('bark', async (req) => {
  const { features, dog, language } = (await req.json()) as { features: Features; dog?: { name?: string; size?: string }; language?: string };
  if (!features || !(features.durationMs > 300) || features.peakDb < -50) throw new HttpError(422, 'audio_too_quiet_or_short');
  const raw = await complete(SYSTEM, [{
    role: 'user',
    content: `Reply language: ${language ?? 'en'}. Dog: ${dog?.name ?? 'unknown'} (${dog?.size ?? 'unknown size'}). Features: ${JSON.stringify(features)}`,
  }], 300);
  return parseJson(raw);
}));
