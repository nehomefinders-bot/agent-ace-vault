ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS trial_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trialing';

UPDATE public.profiles p SET
  trial_start_date = COALESCE(p.trial_start_date, u.created_at),
  trial_end_date = COALESCE(p.trial_end_date, u.created_at + interval '14 days'),
  subscription_status = CASE
    WHEN p.plan IN ('active','gifted') THEN 'active'
    WHEN u.created_at + interval '14 days' > now() THEN 'trialing'
    ELSE 'expired' END
FROM auth.users u WHERE u.id = p.id;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, trial_start_date, trial_end_date, subscription_status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)),
          NEW.created_at, NEW.created_at + interval '14 days', 'trialing');
  PERFORM public.seed_default_accounts(NEW.id);
  RETURN NEW;
END $function$;