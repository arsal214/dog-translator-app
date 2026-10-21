import { complete, HttpError, type Msg } from '../_shared/ai.ts';
import { guarded } from '../_shared/guard.ts';

const SYSTEM = `You are a friendly dog-care and training assistant. You are NOT a veterinarian and must never say you are.
Use only humane, reward-based methods; never suggest punishment, fear or harm. Keep answers concise and practical. Do not invent sources.
For possible emergencies (poisoning, trouble breathing, seizures, severe injury or bleeding, collapse, bloated abdomen, heatstroke) do not diagnose: tell the user to contact a veterinarian or emergency clinic immediately.`;

Deno.serve(guarded('chat', async (req) => {
  const { messages, dog, language } = (await req.json()) as { messages: Msg[]; dog?: Record<string, unknown>; language?: string };
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 30) throw new HttpError(400, 'bad_request');
  const clean = messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 2000) })) as Msg[];
  const ctx = dog ? `\nDog profile (user-provided, optional): ${JSON.stringify(dog)}` : '';
  const reply = await complete(`${SYSTEM}\nReply language: ${language ?? 'en'}.${ctx}`, clean, 700);
  return { reply };
}));
