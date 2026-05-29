alter table public.listings
  add column if not exists deal_id uuid,
  add column if not exists client_name text,
  add column if not exists deal_side text,
  add column if not exists close_date date,
  add column if not exists gross_commission numeric not null default 0,
  add column if not exists agent_split_pct numeric not null default 0,
  add column if not exists brokerage_split_pct numeric not null default 0,
  add column if not exists referral_pct numeric not null default 0,
  add column if not exists referral_to text;

create unique index if not exists idx_listings_deal_id_unique
  on public.listings(deal_id)
  where deal_id is not null;
