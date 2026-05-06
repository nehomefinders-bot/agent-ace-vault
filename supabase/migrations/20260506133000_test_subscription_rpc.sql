create or replace function public.seed_test_subscription(environment text)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_period_end timestamptz := now() + interval '1 year';
  v_row public.subscriptions;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.subscriptions
  where user_id = v_user_id
    and environment = seed_test_subscription.environment
    and stripe_subscription_id like 'test_%';

  insert into public.subscriptions (
    user_id,
    stripe_subscription_id,
    stripe_customer_id,
    product_id,
    price_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    environment
  ) values (
    v_user_id,
    'test_sub_' || replace(gen_random_uuid()::text, '-', ''),
    'test_cus_' || substr(replace(v_user_id::text, '-', ''), 1, 8),
    'test_prod_team',
    'team_yearly',
    'active',
    v_now,
    v_period_end,
    false,
    seed_test_subscription.environment
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.seed_test_subscription(text) to authenticated;

create or replace function public.clear_test_subscription(environment text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.subscriptions
  where user_id = v_user_id
    and environment = clear_test_subscription.environment
    and stripe_subscription_id like 'test_%';
end;
$$;

grant execute on function public.clear_test_subscription(text) to authenticated;
