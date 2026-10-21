-- Dog Translator schema. No raw audio or photos are stored; only derived results.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'en',
  created_at timestamptz not null default now()
);

create table public.dogs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  breed text check (char_length(breed) <= 40),
  age_group text check (age_group in ('puppy','adult','senior')),
  voice text not null default 'medium' check (voice in ('small','medium','big')),
  traits text[] not null default '{}' check (cardinality(traits) <= 4),
  created_at timestamptz not null default now()
);
create index dogs_user_idx on public.dogs(user_id);

create table public.translations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  emotion text not null check (emotion in ('happy','excited','calm','anxious','playful','alert')),
  intensity smallint not null check (intensity between 1 and 5),
  confidence text not null check (confidence in ('low','medium','high')),
  interpretation text not null check (char_length(interpretation) <= 500),
  created_at timestamptz not null default now()
);
create index translations_dog_idx on public.translations(dog_id, created_at desc);

create table public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  mood text not null check (mood in ('happy','excited','calm','anxious','playful','alert')),
  source text not null check (source in ('ai','user')),
  note text check (char_length(note) <= 280),
  created_at timestamptz not null default now()
);
create index mood_dog_idx on public.mood_entries(dog_id, created_at desc);

create table public.saved_sounds (
  user_id uuid not null references auth.users(id) on delete cascade,
  sound_id text not null,
  primary key (user_id, sound_id)
);

create table public.training_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  primary key (dog_id, lesson_id)
);

create table public.quiz_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  score smallint not null,
  primary key (user_id, day)
);

create table public.push_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  token text primary key,
  platform text not null check (platform in ('ios','android')),
  updated_at timestamptz not null default now()
);

create table public.notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  training_reminders boolean not null default false,
  daily_fact boolean not null default false
);

-- Server-owned tables: users may read, only the service role writes.
create table public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_pro boolean not null default false,
  expires_at timestamptz,
  trial_used boolean not null default false, -- set by the RevenueCat webhook, survives reinstall/device change for this account
  updated_at timestamptz not null default now()
);

create table public.usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  period date not null,
  count int not null default 0,
  primary key (user_id, feature, period)
);

-- Atomic quota check + increment. Returns true if the call is allowed.
create function public.consume_usage(p_user uuid, p_feature text, p_limit int)
returns boolean language plpgsql security definer set search_path = public as $$
declare c int;
begin
  insert into usage_counters(user_id, feature, period, count) values (p_user, p_feature, current_date, 1)
  on conflict (user_id, feature, period) do update set count = usage_counters.count + 1
  returning count into c;
  return c <= p_limit;
end $$;
revoke all on function public.consume_usage from public, anon, authenticated;

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.dogs enable row level security;
alter table public.translations enable row level security;
alter table public.mood_entries enable row level security;
alter table public.saved_sounds enable row level security;
alter table public.training_progress enable row level security;
alter table public.quiz_progress enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.entitlements enable row level security;
alter table public.usage_counters enable row level security;

create policy own_profile on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy own_dogs on public.dogs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Child rows must reference a dog the user owns.
create policy own_translations on public.translations for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.dogs d where d.id = dog_id and d.user_id = auth.uid()));
create policy own_moods on public.mood_entries for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.dogs d where d.id = dog_id and d.user_id = auth.uid()));
create policy own_saved_sounds on public.saved_sounds for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_training on public.training_progress for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.dogs d where d.id = dog_id and d.user_id = auth.uid()));
create policy own_quiz on public.quiz_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_tokens on public.push_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_prefs on public.notification_prefs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy read_entitlement on public.entitlements for select using (user_id = auth.uid());
create policy read_usage on public.usage_counters for select using (user_id = auth.uid());

-- Free-plan dog limit enforced server-side too.
create function public.enforce_dog_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from dogs where user_id = new.user_id) >= 1
     and not coalesce((select is_pro and (expires_at is null or expires_at > now()) from entitlements where user_id = new.user_id), false) then
    raise exception 'free plan allows 1 dog profile' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger dogs_limit before insert on public.dogs for each row execute function public.enforce_dog_limit();
