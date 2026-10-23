import { complete, HttpError, parseJson } from '../_shared/ai.ts';
import { guarded } from '../_shared/guard.ts';

const SYSTEM = `You analyse a photo of a dog for an entertainment app. Return ONLY JSON:
{"isDog":true|false,"breeds":[{"name":string,"likelihood":"low|medium|high"}],"traits":[string],"visibleCues":string,"care":string,"followUps":[string]}.
Breeds are guesses, never precise percentages. A photo cannot establish emotion: describe only visible body-language cues, with uncertainty. Not veterinary advice.`;

const MAX_B64 = 4_000_000; // ~3 MB image; the app downsizes before sending

Deno.serve(guarded('scan', async (req) => {
  const { imageBase64, mediaType, language } = await req.json();
  if (typeof imageBase64 !== 'string' || imageBase64.length > MAX_B64) throw new HttpError(413, 'image_too_large');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mediaType)) throw new HttpError(415, 'unsupported_image');
  const raw = await complete(SYSTEM, [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
      { type: 'text', text: `Reply language: ${language ?? 'en'}.` },
    ],
  }], 700); // the image is processed in-memory and never stored
  const r = parseJson<Record<string, unknown>>(raw);
  if (typeof r.isDog !== 'boolean') throw new HttpError(502, 'bad_ai_output'); // the guard refunds the credit
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  const breeds = Array.isArray(r.breeds)
    ? r.breeds.filter((b) => b && typeof b.name === 'string').map((b) => ({ name: b.name, likelihood: ['low', 'medium', 'high'].includes(b.likelihood) ? b.likelihood : 'low' }))
    : [];
  return { isDog: r.isDog, breeds, traits: strings(r.traits), visibleCues: String(r.visibleCues ?? ''), care: String(r.care ?? ''), followUps: strings(r.followUps) };
}));
