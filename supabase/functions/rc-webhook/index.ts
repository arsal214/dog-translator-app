import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// RevenueCat webhook -> entitlements (current state) + subscription_events (full history).
// Set the webhook Authorization header to RC_WEBHOOK_SECRET.
// RevenueCat app_user_id must equal the Supabase user id (the app configures Purchases with user.id).
const ms = (v: unknown) => (typeof v === 'number' ? new Date(v).toISOString() : null);
const UUID = /^[0-9a-f-]{36}$/;

Deno.serve(async (req) => {
  if (req.headers.get('authorization') !== Deno.env.get('RC_WEBHOOK_SECRET')) return new Response('unauthorized', { status: 401 });
  const { event } = await req.json();
  if (!event?.id || !event?.type) return new Response('ignored');

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  // A TRANSFER (guest signed in to an existing account) belongs to the receiving user; other events may carry
  // the Supabase id in aliases rather than app_user_id.
  const ids: string[] = event.type === 'TRANSFER'
    ? (event.transferred_to ?? [])
    : [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])];
  const uid = ids.find((id) => typeof id === 'string' && UUID.test(id)) ?? null;
  const expires = ms(event.expiration_at_ms);

  const { error: logError } = await admin.from('subscription_events').upsert({
    id: event.id,
    user_id: uid,
    app_user_id: String(event.app_user_id ?? ''),
    type: event.type,
    product_id: event.product_id ?? null,
    store: event.store ?? null,
    environment: event.environment ?? null,
    period_type: event.period_type ?? null,
    price: event.price ?? null,
    currency: event.currency ?? null,
    event_at: ms(event.event_timestamp_ms),
    expires_at: expires,
    payload: event,
  });
  if (logError) console.error('subscription_events', logError);
  if (!uid || event.type === 'TEST') return new Response('ok');

  if (event.type === 'TRANSFER') {
    // Move the current state to the receiving account; the sender's row is cleared below the same way RevenueCat does.
    const from = (event.transferred_from ?? []).filter((id: string) => UUID.test(id));
    const { data: prev } = from.length ? await admin.from('entitlements').select('*').in('user_id', from).eq('is_pro', true).limit(1).maybeSingle() : { data: null };
    if (prev) {
      await admin.from('entitlements').upsert({ ...prev, user_id: uid, last_event: 'TRANSFER', updated_at: new Date().toISOString() });
      await admin.from('entitlements').update({ is_pro: false, last_event: 'TRANSFER', updated_at: new Date().toISOString() }).in('user_id', from);
    }
    return new Response('ok');
  }

  const active = ['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE', 'SUBSCRIPTION_EXTENDED', 'TEMPORARY_ENTITLEMENT_GRANT'].includes(event.type)
    || (['CANCELLATION', 'BILLING_ISSUE', 'SUBSCRIPTION_PAUSED'].includes(event.type) && !!expires && new Date(expires) > new Date());
  const row: Record<string, unknown> = {
    user_id: uid,
    is_pro: active,
    expires_at: expires,
    product_id: event.product_id ?? null,
    store: event.store ?? null,
    period_type: event.period_type ?? null,
    environment: event.environment ?? null,
    will_renew: !['CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE'].includes(event.type),
    last_event: event.type,
    price: event.price ?? null,
    currency: event.currency ?? null,
    purchased_at: ms(event.purchased_at_ms),
    updated_at: new Date().toISOString(),
  };
  if (event.type === 'INITIAL_PURCHASE') row.original_purchased_at = ms(event.purchased_at_ms);
  if (event.period_type === 'TRIAL') row.trial_used = true; // one trial per account, kept server-side
  const { error } = await admin.from('entitlements').upsert(row);
  if (error) {
    console.error('entitlements', error);
    return new Response('error', { status: 500 }); // RevenueCat retries on 5xx
  }
  return new Response('ok');
});
