import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { cors } from '../_shared/guard.ts';

// Deletes the caller's auth user; every table cascades on auth.users.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data } = await admin.auth.getUser(req.headers.get('authorization')?.replace('Bearer ', ''));
  if (!data?.user) return new Response('unauthorized', { status: 401, headers: cors });
  const { error } = await admin.auth.admin.deleteUser(data.user.id);
  return new Response(error ? 'error' : 'ok', { status: error ? 500 : 200, headers: cors });
});
