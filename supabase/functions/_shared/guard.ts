import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { HttpError } from './ai.ts';

export const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
};

const LIMITS: Record<string, { free: number; pro: number }> = {
  bark: { free: 3, pro: 50 },
  scan: { free: 2, pro: 30 },
  chat: { free: 10, pro: 200 },
  portrait: { free: 0, pro: 5 },
};

/** Authenticates the caller, enforces the per-day quota server-side, and runs the handler. */
export function guarded(feature: keyof typeof LIMITS, handler: (req: Request, userId: string) => Promise<unknown>) {
  return async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    try {
      const url = Deno.env.get('SUPABASE_URL')!;
      const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const token = req.headers.get('authorization')?.replace('Bearer ', '');
      const { data } = await admin.auth.getUser(token);
      if (!data?.user) throw new HttpError(401, 'unauthorized');
      const uid = data.user.id;

      const { data: ent } = await admin.from('entitlements').select('is_pro, expires_at').eq('user_id', uid).maybeSingle();
      const pro = !!ent?.is_pro && (!ent.expires_at || new Date(ent.expires_at) > new Date());
      const limit = pro ? LIMITS[feature].pro : LIMITS[feature].free;
      const { data: ok } = await admin.rpc('consume_usage', { p_user: uid, p_feature: feature, p_limit: limit });
      if (!ok) throw new HttpError(429, pro ? 'daily_limit_reached' : 'free_limit_reached');

      const body = await handler(req, uid);
      return new Response(JSON.stringify(body), { headers: { ...cors, 'content-type': 'application/json' } });
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      return new Response(JSON.stringify({ error: e instanceof HttpError ? e.message : 'internal_error' }), {
        status,
        headers: { ...cors, 'content-type': 'application/json' },
      });
    }
  };
}
