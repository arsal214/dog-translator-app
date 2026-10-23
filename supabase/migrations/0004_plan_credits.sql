-- Plan credits: every AI use costs 1 credit for everyone (free and Pro). Free users keep their one-time 5;
-- each paid plan sets the balance to its allowance on purchase and on every renewal (no rollover):
-- weekly 20, monthly 90, yearly 200, lifetime 330 (once). The amounts live in the rc-webhook function.

-- One row per RevenueCat event that granted credits, so webhook retries never grant twice.
create table public.credit_grants (
  event_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text,
  amount int not null,
  created_at timestamptz not null default now()
);
alter table public.credit_grants enable row level security; -- service role only

-- Sets the balance to the plan allowance. Returns false when this event was already applied.
create function public.grant_plan_credits(p_user uuid, p_amount int, p_event text, p_product text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  insert into credit_grants(event_id, user_id, product_id, amount) values (p_event, p_user, p_product, p_amount)
    on conflict (event_id) do nothing;
  if not found then return false; end if;
  insert into credits(user_id, balance, granted) values (p_user, p_amount, p_amount)
    on conflict (user_id) do update set balance = excluded.balance, granted = excluded.granted, updated_at = now();
  return true;
end $$;
revoke all on function public.grant_plan_credits from public, anon, authenticated;
