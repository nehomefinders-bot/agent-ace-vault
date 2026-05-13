ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS seller_name TEXT,
  ADD COLUMN IF NOT EXISTS seller_phone TEXT,
  ADD COLUMN IF NOT EXISTS seller_email TEXT,
  ADD COLUMN IF NOT EXISTS seller_new_address TEXT;