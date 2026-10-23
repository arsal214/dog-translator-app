import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { HttpError } from './ai.ts';

export const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
};

// Every AI call costs one credit, for free users (one-time 5) and Pro users (plan allowance, see rc-webhook) alike.
type Feature = 'bark' | 'scan' | 'chat' | 'portrait';

/** Authenticates the caller, enforces Pro-only features, charges a credit server-side and runs the handler. */
export function guarded(_feature: Feature, handler: (req: Request, userId: string) => Promise<unknown>, opts: { proOnly?: boolean } = {}) {
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
      if (opts.proOnly && !pro) throw new HttpError(402, 'pro_required');
      const { data: left } = await admin.rpc('spend_credit', { p_user: uid });
      if (typeof left !== 'number' || left < 0) throw new HttpError(402, 'no_credits');

      let body: unknown;
      try {
        body = await handler(req, uid);
      } catch (e) {
        // A failed AI call shouldn't cost the user a credit.
        await admin.rpc('refund_credit', { p_user: uid });
        throw e;
      }
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
