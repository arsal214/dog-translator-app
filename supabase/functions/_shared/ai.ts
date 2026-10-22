// Provider abstraction: swap the implementation here without touching the functions or the app.
// Requires the secret GEMINI_API_KEY (set with `supabase secrets set`). Never shipped in the client.
const MODEL = Deno.env.get('AI_MODEL') ?? 'gemini-2.5-flash';

type Block = { type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };
export type Msg = { role: 'user' | 'assistant'; content: string | Block[] };

const toParts = (c: Msg['content']) =>
  typeof c === 'string'
    ? [{ text: c }]
    : c.map((b) => (b.type === 'text' ? { text: b.text } : { inlineData: { mimeType: b.source.media_type, data: b.source.data } }));

export async function complete(system: string, messages: Msg[], maxTokens = 600): Promise<string> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new HttpError(503, 'ai_not_configured');
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: toParts(m.content) })),
      // Gemini 2.5 "thinking" tokens count against the cap and can leave no room for the reply, so thinking is off.
      generationConfig: { maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  if (!r.ok) throw new HttpError(502, 'ai_provider_error'); // never forward provider bodies (may echo user content)
  const j = await r.json();
  return j.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function parseJson<T>(raw: string): T {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new HttpError(502, 'bad_ai_output');
  try { return JSON.parse(m[0]) as T; } catch { throw new HttpError(502, 'bad_ai_output'); }
}
