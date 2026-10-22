-- Every signed-in user (anonymous included) gets a profile with device details,
-- subscriptions keep their full RevenueCat history, and the app ships its logs and errors here.

-- Profiles: created automatically for every new auth user, kept fresh by the app on launch.
alter table public.profiles
  add column if not exists platform text check (platform in ('ios','android')),
  add column if not exists app_version text check (char_length(app_version) <= 20),
  add column if not exists os_version text check (char_length(os_version) <= 20),
  add column if not exists locale text check (char_length(locale) <= 20),
  add column if not exists timezone text check (char_length(timezone) <= 60),
  add column if not exists last_seen_at timestamptz not null default now();

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Backfill profiles for users created before this trigger existed.
insert into public.profiles(id) select id from auth.users on conflict (id) do nothing;

-- Subscriptions: current state (one row per user), written only by the RevenueCat webhook.
alter table public.entitlements
  add column if not exists product_id text,
  add column if not exists store text,
  add column if not exists period_type text,           -- NORMAL, TRIAL, INTRO
  add column if not exists environment text,           -- SANDBOX or PRODUCTION
  add column if not exists will_renew boolean,
  add column if not exists last_event text,
  add column if not exists price numeric,
  add column if not exists currency text,
  add column if not exists purchased_at timestamptz,
  add column if not exists original_purchased_at timestamptz;

-- Subscriptions: every webhook event, for history, refunds and debugging.
create table public.subscription_events (
  id text primary key,                                  -- RevenueCat event id, so retries don't duplicate
  user_id uuid references auth.users(id) on delete cascade,
  app_user_id text not null,
  type text not null,
  product_id text,
  store text,
  environment text,
  period_type text,
  price numeric,
  currency text,
  event_at timestamptz,
  expires_at timestamptz,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index subscription_events_user_idx on public.subscription_events(user_id, created_at desc);
alter table public.subscription_events enable row level security;
create policy read_own_subscription_events on public.subscription_events for select using (user_id = auth.uid());

-- App logs and errors. Users may only insert their own rows and never read them back.
create table public.app_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  level text not null check (level in ('info','warn','error')),
  event text not null check (char_length(event) <= 80),
  message text check (char_length(message) <= 2000),
  context jsonb check (pg_column_size(context) <= 8192),
  platform text check (platform in ('ios','android','web')),
  app_version text check (char_length(app_version) <= 20),
  created_at timestamptz not null default now()
);
create index app_logs_created_idx on public.app_logs(created_at desc);
create index app_logs_level_idx on public.app_logs(level, created_at desc);
create index app_logs_user_idx on public.app_logs(user_id, created_at desc);
alter table public.app_logs enable row level security;
create policy insert_own_logs on public.app_logs for insert to authenticated with check (user_id = auth.uid());

-- Handy view for the dashboard: one row per user with their current plan.
create view public.users_overview with (security_invoker = true) as
select p.id, u.email, u.is_anonymous, u.created_at as signed_up_at, p.last_seen_at,
       p.platform, p.app_version, p.os_version, p.locale, p.timezone,
       coalesce(e.is_pro and (e.expires_at is null or e.expires_at > now()), false) as is_pro,
       e.product_id, e.period_type, e.expires_at, e.will_renew, e.environment
from public.profiles p
join auth.users u on u.id = p.id
left join public.entitlements e on e.user_id = p.id;
revoke all on public.users_overview from anon, authenticated;
