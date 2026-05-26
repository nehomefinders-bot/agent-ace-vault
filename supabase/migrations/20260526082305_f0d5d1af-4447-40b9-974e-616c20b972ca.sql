
-- 1. Fix subscription manipulation: remove client-side sandbox write policies
DROP POLICY IF EXISTS "Users can insert sandbox test subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update sandbox test subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can delete sandbox test subscriptions" ON public.subscriptions;

-- Provide SECURITY DEFINER RPCs so the in-app test bypass still works,
-- but the server controls the shape of the inserted row.
CREATE OR REPLACE FUNCTION public.seed_test_subscription(environment text DEFAULT 'sandbox')
RETURNS public.subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.subscriptions;
  _sub_id text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF environment <> 'sandbox' THEN
    RAISE EXCEPTION 'Only sandbox test subscriptions can be seeded from the client';
  END IF;

  DELETE FROM public.subscriptions
   WHERE user_id = _uid
     AND environment = 'sandbox'
     AND stripe_subscription_id LIKE 'test_%';

  _sub_id := 'test_sub_' || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.subscriptions (
    user_id, stripe_subscription_id, stripe_customer_id, product_id, price_id,
    status, current_period_start, current_period_end, cancel_at_period_end, environment
  ) VALUES (
    _uid, _sub_id, 'test_cus_' || substr(replace(_uid::text, '-', ''), 1, 8),
    'test_prod_team', 'team_yearly', 'active', now(), now() + interval '365 days', false, 'sandbox'
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_test_subscription(environment text DEFAULT 'sandbox')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF environment <> 'sandbox' THEN
    RAISE EXCEPTION 'Only sandbox test subscriptions can be cleared from the client';
  END IF;

  DELETE FROM public.subscriptions
   WHERE user_id = _uid
     AND environment = 'sandbox'
     AND stripe_subscription_id LIKE 'test_%';
END;
$$;

REVOKE ALL ON FUNCTION public.seed_test_subscription(text) FROM public;
REVOKE ALL ON FUNCTION public.clear_test_subscription(text) FROM public;
GRANT EXECUTE ON FUNCTION public.seed_test_subscription(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_test_subscription(text) TO authenticated;

-- 2. Fix public bucket listing: restrict listing-images SELECT policy to owners.
-- Public file reads continue to work via the public CDN URL (which bypasses RLS),
-- but anonymous clients can no longer enumerate all objects in the bucket.
DROP POLICY IF EXISTS "listing images public read" ON storage.objects;
CREATE POLICY "listing images owner select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'listing-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
