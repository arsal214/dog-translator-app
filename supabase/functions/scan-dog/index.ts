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
  return parseJson(raw);
}));
