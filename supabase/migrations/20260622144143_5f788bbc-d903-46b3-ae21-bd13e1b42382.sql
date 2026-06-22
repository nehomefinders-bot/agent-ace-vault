
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS mls_number text,
  ADD COLUMN IF NOT EXISTS agent_name text,
  ADD COLUMN IF NOT EXISTS agent_brokerage text,
  ADD COLUMN IF NOT EXISTS agent_phone text,
  ADD COLUMN IF NOT EXISTS agent_email text;
