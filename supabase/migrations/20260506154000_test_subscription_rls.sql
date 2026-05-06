-- Allow signed-in users to manage only sandbox test subscription rows from the /test console.
-- These policies are intentionally narrow: they only apply to rows prefixed with `test_`.

drop policy if exists "Users can insert sandbox test subscriptions" on public.subscriptions;
create policy "Users can insert sandbox test subscriptions"
  on public.subscriptions
  for insert
  with check (
    auth.uid() = user_id
    and environment = 'sandbox'
    and stripe_subscription_id like 'test_%'
  );

drop policy if exists "Users can update sandbox test subscriptions" on public.subscriptions;
create policy "Users can update sandbox test subscriptions"
  on public.subscriptions
  for update
  using (
    auth.uid() = user_id
    and environment = 'sandbox'
    and stripe_subscription_id like 'test_%'
  )
  with check (
    auth.uid() = user_id
    and environment = 'sandbox'
    and stripe_subscription_id like 'test_%'
  );

drop policy if exists "Users can delete sandbox test subscriptions" on public.subscriptions;
create policy "Users can delete sandbox test subscriptions"
  on public.subscriptions
  for delete
  using (
    auth.uid() = user_id
    and environment = 'sandbox'
    and stripe_subscription_id like 'test_%'
  );
