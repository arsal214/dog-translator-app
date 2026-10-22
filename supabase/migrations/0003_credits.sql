-- One-time free credits: every new user gets 5. Each voice translation or AI Studio use by a free user costs 1.
-- Pro users don't spend credits (their per-day fair-use limits in usage_counters still apply).

create table public.credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance int not null default 5 check (balance >= 0),
  granted int not null default 5,
  updated_at timestamptz not null default now()
);
alter table public.credits enable row level security;
-- Users may read their balance; only these functions change it.
create policy read_own_credits on public.credits for select using (user_id = auth.uid());

-- Every existing user gets their free credits once too.
insert into public.credits(user_id) select id from auth.users on conflict (user_id) do nothing;

-- New users: profile (from 0002) plus the one-time grant.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id) values (new.id) on conflict (id) do nothing;
  insert into credits(user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;

-- Atomically takes one credit. Returns the new balance, or -1 when there is none left.
create function public.spend_credit(p_user uuid) returns int language plpgsql security definer set search_path = public as $$
declare b int;
begin
  insert into credits(user_id) values (p_user) on conflict (user_id) do nothing;
  update credits set balance = balance - 1, updated_at = now() where user_id = p_user and balance > 0 returning balance into b;
  return coalesce(b, -1);
end $$;
revoke all on function public.spend_credit from public, anon, authenticated;

-- Gives a credit back when the AI call it paid for failed.
create function public.refund_credit(p_user uuid) returns void language sql security definer set search_path = public as $$
  update credits set balance = least(balance + 1, granted), updated_at = now() where user_id = p_user;
$$;
revoke all on function public.refund_credit from public, anon, authenticated;

-- For features that run on the phone (Human → Dog): the signed-in user spends one of their own credits.
create function public.use_credit() returns int language sql security definer set search_path = public as $$
  select public.spend_credit(auth.uid());
$$;
revoke all on function public.use_credit from public, anon;
grant execute on function public.use_credit to authenticated;
