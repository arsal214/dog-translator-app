import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Admin-only push sender (FCM HTTP v1). Call with header `authorization: <PUSH_ADMIN_SECRET>` and a JSON body:
//   { "title": "...", "body": "...", "route": "/training", "user_ids": ["<uuid>", ...] }   // omit user_ids to send to everyone
//   { ..., "audience": "pro" | "free" }                                                   // optional filter
// Secrets: PUSH_ADMIN_SECRET, FIREBASE_SERVICE_ACCOUNT (the whole service-account JSON from Firebase console).

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

const b64url = (data: ArrayBuffer | string) =>
  btoa(typeof data === 'string' ? data : String.fromCharCode(...new Uint8Array(data))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** OAuth access token for FCM from the service account (JWT bearer grant), cached for the function instance. */
let cached: { token: string; exp: number } | null = null;
async function accessToken(sa: ServiceAccount) {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }))}`;
  const pem = sa.private_key.replace(/-----[^-]+-----|\s/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${b64url(sig)}` }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`oauth ${res.status}: ${JSON.stringify(j)}`);
  cached = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return cached.token;
}

Deno.serve(async (req) => {
  if (req.headers.get('authorization') !== Deno.env.get('PUSH_ADMIN_SECRET')) return new Response('unauthorized', { status: 401 });
  const { title, body, route, user_ids, audience } = await req.json();
  if (!title || !body) return Response.json({ error: 'title and body are required' }, { status: 400 });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let query = admin.from('push_tokens').select('token, user_id');
  if (Array.isArray(user_ids) && user_ids.length) query = query.in('user_id', user_ids);
  const { data: rows, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let targets = rows ?? [];
  if (audience === 'pro' || audience === 'free') {
    const { data: pro } = await admin.from('entitlements').select('user_id').eq('is_pro', true).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
    const proIds = new Set((pro ?? []).map((r) => r.user_id));
    targets = targets.filter((r) => proIds.has(r.user_id) === (audience === 'pro'));
  }

  const sa: ServiceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT')!);
  const token = await accessToken(sa);
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  let sent = 0;
  const dead: string[] = [];

  // Small concurrent batches keep within FCM rate limits for a typical audience.
  for (let i = 0; i < targets.length; i += 20) {
    await Promise.all(targets.slice(i, i + 20).map(async ({ token: device }) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          message: {
            token: device,
            notification: { title, body },
            data: route ? { route: String(route) } : undefined,
            apns: { payload: { aps: { sound: 'default' } } },
            android: { priority: 'high', notification: { sound: 'default' } },
          },
        }),
      });
      if (res.ok) sent++;
      else {
        const j = await res.json().catch(() => ({}));
        const code = j?.error?.details?.find((d: { errorCode?: string }) => d.errorCode)?.errorCode;
        if (res.status === 404 || code === 'UNREGISTERED' || code === 'INVALID_ARGUMENT') dead.push(device);
      }
    }));
  }
  // Tokens for uninstalled apps are removed so the next send is faster.
  if (dead.length) await admin.from('push_tokens').delete().in('token', dead);
  await admin.from('app_logs').insert({ user_id: null, level: 'info', event: 'push_sent', context: { title, targets: targets.length, sent, removed: dead.length, audience: audience ?? 'all' } });
  return Response.json({ targets: targets.length, sent, removed: dead.length });
});
