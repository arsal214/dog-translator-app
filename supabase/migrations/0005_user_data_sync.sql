-- Everything a user creates in the app is mirrored here (the phone keeps its own copy and stays the source of
-- truth; see src/services/sync.ts). Ids are the app's own string ids, so rows are keyed by (user_id, id).
-- Dog photos, raw audio and scan photos are never uploaded.

-- The tables from 0001 were never written by the app and used uuid ids that don't match it; replace them.
drop table if exists public.translations, public.mood_entries, public.training_progress, public.quiz_progress, public.saved_sounds cascade;
drop table if exists public.dogs cascade;

create table public.dogs (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) <= 64),
  name text not null check (char_length(name) between 1 and 30),
  breed text check (char_length(breed) <= 60),
  sex text check (sex in ('male','female')),
  age_group text check (age_group in ('puppy','adult','senior')),
  age_range text check (age_range in ('under1','1to2','3to6','7to10','11plus')),
  voice text not null default 'medium' check (voice in ('small','medium','big')),
  traits text[] not null default '{}' check (cardinality(traits) <= 10),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Bark translations, scans and the user's own mood notes.
create table public.journal_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) <= 64),
  dog_id text not null,
  kind text not null check (kind in ('bark','scan','user')),
  mood text not null check (mood in ('happy','excited','calm','anxious','playful','alert')),
  intensity smallint check (intensity between 1 and 5),
  confidence text check (confidence in ('low','medium','high')),
  text text not null check (char_length(text) <= 1000),
  created_at timestamptz not null,
  primary key (user_id, id)
);
create index journal_entries_dog_idx on public.journal_entries(user_id, dog_id, created_at desc);

create table public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  dog_id text not null,
  lesson_id text not null,
  completed_at timestamptz not null,
  primary key (user_id, dog_id, lesson_id)
);

create table public.favorite_sounds (
  user_id uuid not null references auth.users(id) on delete cascade,
  sound_id text not null,
  primary key (user_id, sound_id)
);

create table public.quiz_scores (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  score smallint not null,
  primary key (user_id, day)
);

-- App settings that belong to the account.
alter table public.profiles
  add column if not exists onboarded boolean not null default false,
  add column if not exists training_reminder boolean not null default false,
  add column if not exists data_synced_at timestamptz;

alter table public.dogs enable row level security;
alter table public.journal_entries enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.favorite_sounds enable row level security;
alter table public.quiz_scores enable row level security;
create policy own_dogs on public.dogs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_journal on public.journal_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_lessons on public.lesson_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_favorites on public.favorite_sounds for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_quiz on public.quiz_scores for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Subscriptions: a readable plan name next to the store product id (set by rc-webhook).
alter table public.entitlements add column if not exists plan text check (plan in ('weekly','monthly','yearly','lifetime','other'));
alter table public.subscription_events add column if not exists plan text check (plan in ('weekly','monthly','yearly','lifetime','other'));
update public.subscription_events set plan = case
  when product_id ~* 'lifetime' then 'lifetime' when product_id ~* 'week' then 'weekly'
  when product_id ~* 'month' then 'monthly' when product_id ~* 'year|annual' then 'yearly' else 'other' end
where product_id is not null and plan is null;
update public.entitlements set plan = case
  when product_id ~* 'lifetime' then 'lifetime' when product_id ~* 'week' then 'weekly'
  when product_id ~* 'month' then 'monthly' when product_id ~* 'year|annual' then 'yearly' else 'other' end
where product_id is not null and plan is null;

-- One row per user for the team: account, device, subscription, credits and activity. Lives in a schema the
-- app's API doesn't expose, so only the dashboard / service role can read it (Table Editor → schema "admin").
create schema if not exists admin;
revoke all on schema admin from public, anon, authenticated;

create or replace view admin.users as
select
  u.id,
  u.email,
  u.is_anonymous as guest,
  u.created_at as signed_up_at,
  p.last_seen_at,
  p.platform,
  p.app_version,
  p.os_version,
  p.locale,
  p.timezone,
  coalesce(e.is_pro and (e.expires_at is null or e.expires_at > now()), false) as is_pro,
  e.plan,
  e.product_id,
  e.period_type,
  e.store,
  e.environment as store_environment, -- SANDBOX (TestFlight / test accounts) or PRODUCTION (real money)
  e.expires_at,
  e.will_renew,
  e.price,
  e.currency,
  e.original_purchased_at as first_purchase_at,
  c.balance as credits,
  (select count(*) from public.dogs d where d.user_id = u.id) as dogs,
  (select string_agg(d.name, ', ' order by d.created_at) from public.dogs d where d.user_id = u.id) as dog_names,
  (select count(*) from public.journal_entries j where j.user_id = u.id and j.kind = 'bark') as bark_translations,
  (select count(*) from public.journal_entries j where j.user_id = u.id and j.kind = 'scan') as scans,
  (select count(*) from public.lesson_progress l where l.user_id = u.id) as lessons_done,
  (select count(*) from public.favorite_sounds f where f.user_id = u.id) as favorite_sounds,
  p.data_synced_at
from auth.users u
left join public.profiles p on p.id = u.id
left join public.entitlements e on e.user_id = u.id
left join public.credits c on c.user_id = u.id;

-- Every subscription event with the user's email, newest first.
create or replace view admin.subscriptions as
select
  s.event_at,
  u.email,
  s.user_id,
  s.type,                                    -- INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, ...
  s.plan,                                    -- weekly / monthly / yearly / lifetime
  case s.store when 'APP_STORE' then 'ios' when 'MAC_APP_STORE' then 'ios' when 'PLAY_STORE' then 'android' else lower(s.store) end as platform,
  s.environment,                             -- SANDBOX or PRODUCTION
  s.period_type,                             -- NORMAL, TRIAL, INTRO
  s.price,
  s.currency,
  s.product_id,
  s.expires_at
from public.subscription_events s
left join auth.users u on u.id = s.user_id
order by s.event_at desc nulls last;
