// Provider abstraction: swap the implementation here without touching the functions or the app.
// Requires the secret ANTHROPIC_API_KEY (set with `supabase secrets set`). Never shipped in the client.
const MODEL = Deno.env.get('AI_MODEL') ?? 'claude-sonnet-5-5';

type Block = { type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };
export type Msg = { role: 'user' | 'assistant'; content: string | Block[] };

export async function complete(system: string, messages: Msg[], maxTokens = 600): Promise<string> {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new HttpError(503, 'ai_not_configured');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  });
  if (!r.ok) throw new HttpError(502, 'ai_provider_error'); // never forward provider bodies (may echo user content)
  const j = await r.json();
  return j.content?.map((b: { text?: string }) => b.text ?? '').join('') ?? '';
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function parseJson<T>(raw: string): T {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new HttpError(502, 'bad_ai_output');
  try { return JSON.parse(m[0]) as T; } catch { throw new HttpError(502, 'bad_ai_output'); }
}
