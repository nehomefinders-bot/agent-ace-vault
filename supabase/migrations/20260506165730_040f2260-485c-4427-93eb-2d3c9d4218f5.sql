
-- LISTINGS
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  address text not null,
  list_price numeric not null default 0,
  status text not null default 'Active',
  beds integer,
  baths numeric,
  sqft integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.listings enable row level security;
create policy "listings select own" on public.listings for select using (auth.uid() = user_id);
create policy "listings insert own" on public.listings for insert with check (auth.uid() = user_id);
create policy "listings update own" on public.listings for update using (auth.uid() = user_id);
create policy "listings delete own" on public.listings for delete using (auth.uid() = user_id);
create trigger listings_set_updated before update on public.listings
  for each row execute function public.tg_set_updated_at();

-- EXPENSES
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  vendor text not null,
  category text not null default 'Other',
  amount numeric not null default 0,
  date date not null default current_date,
  notes text,
  receipt_path text,
  deal_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.expenses enable row level security;
create policy "expenses select own" on public.expenses for select using (auth.uid() = user_id);
create policy "expenses insert own" on public.expenses for insert with check (auth.uid() = user_id);
create policy "expenses update own" on public.expenses for update using (auth.uid() = user_id);
create policy "expenses delete own" on public.expenses for delete using (auth.uid() = user_id);
create trigger expenses_set_updated before update on public.expenses
  for each row execute function public.tg_set_updated_at();

-- DOCUMENTS
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  folder text not null default 'General',
  deal_id uuid,
  file_path text not null,
  size_bytes bigint,
  mime_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.documents enable row level security;
create policy "documents select own" on public.documents for select using (auth.uid() = user_id);
create policy "documents insert own" on public.documents for insert with check (auth.uid() = user_id);
create policy "documents update own" on public.documents for update using (auth.uid() = user_id);
create policy "documents delete own" on public.documents for delete using (auth.uid() = user_id);
create trigger documents_set_updated before update on public.documents
  for each row execute function public.tg_set_updated_at();

-- STORAGE BUCKETS
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "docs read own" on storage.objects for select
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "docs upload own" on storage.objects for insert
  with check (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "docs update own" on storage.objects for update
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "docs delete own" on storage.objects for delete
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

-- Receipts bucket already exists but ensure user-folder policies
create policy "receipts read own v2" on storage.objects for select
  using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "receipts upload own v2" on storage.objects for insert
  with check (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "receipts delete own v2" on storage.objects for delete
  using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);
