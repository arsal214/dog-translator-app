import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// RevenueCat webhook -> entitlements table. Set the webhook Authorization header to RC_WEBHOOK_SECRET.
// RevenueCat app_user_id must equal the Supabase user id (the app calls Purchases.logIn(user.id)).
Deno.serve(async (req) => {
  if (req.headers.get('authorization') !== Deno.env.get('RC_WEBHOOK_SECRET')) return new Response('unauthorized', { status: 401 });
  const { event } = await req.json();
  const uid = event?.app_user_id as string | undefined;
  if (!uid || !/^[0-9a-f-]{36}$/.test(uid)) return new Response('ignored');

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const expires = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
  const active = ['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE'].includes(event.type)
    || (event.type === 'CANCELLATION' && !!expires && new Date(expires) > new Date());
  const row: Record<string, unknown> = { user_id: uid, is_pro: active, expires_at: expires, updated_at: new Date().toISOString() };
  if (event.period_type === 'TRIAL') row.trial_used = true; // one trial per account, kept server-side
  await admin.from('entitlements').upsert(row);
  return new Response('ok');
});
