-- Read-only regression checks against the deployed signup-duration function.
SELECT
  public.signup_trial_duration('kaylaalvarado051@gmail.com') = interval '6 months' AS kayla_six_months,
  public.signup_trial_duration('KAYLAALVARADO051@gmail.com') = interval '6 months' AS case_insensitive,
  public.signup_trial_duration('ordinary@example.com') = interval '14 days' AS standard_fourteen_days,
  timestamptz '2026-11-10 20:12:00+00' + public.signup_trial_duration('kaylaalvarado051@gmail.com') = timestamptz '2027-05-10 20:12:00+00' AS calendar_month_expiration;