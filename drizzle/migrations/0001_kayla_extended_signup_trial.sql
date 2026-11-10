CREATE OR REPLACE FUNCTION public.signup_trial_duration(signup_email text)
RETURNS interval
LANGUAGE sql IMMUTABLE
SET search_path TO public
AS $$
  SELECT CASE WHEN lower(trim(signup_email)) = 'kaylaalvarado051@gmail.com'
    THEN interval '6 months' ELSE interval '14 days' END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  _vip boolean := lower(trim(NEW.email)) = 'kaylaalvarado051@gmail.com';
  _start timestamptz := CASE WHEN _vip THEN now() ELSE NEW.created_at END;
BEGIN
  INSERT INTO public.profiles (id, display_name, trial_start_date, trial_end_date, subscription_status)
  VALUES (NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''), CASE WHEN _vip THEN 'Kayla' ELSE split_part(NEW.email,'@',1) END),
    _start, _start + public.signup_trial_duration(NEW.email), 'trialing');
  PERFORM public.seed_default_accounts(NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid, check_env text DEFAULT 'live')
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid AND environment = check_env
    AND ((status IN ('active', 'trialing') AND (current_period_end IS NULL OR current_period_end > now()))
      OR (status = 'canceled' AND current_period_end > now()))
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id = p.id
    WHERE p.id = user_uuid AND lower(trim(u.email)) = 'kaylaalvarado051@gmail.com'
      AND p.subscription_status = 'trialing'
      AND p.trial_start_date <= now() AND p.trial_end_date > now()
  );
$$;