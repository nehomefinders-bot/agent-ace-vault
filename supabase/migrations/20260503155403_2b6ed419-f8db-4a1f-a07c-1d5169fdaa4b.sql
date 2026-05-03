
-- Receipts table
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_path text not null,
  status text not null default 'pending', -- pending | scanned | posted | failed
  vendor text,
  receipt_date date,
  subtotal numeric(14,2),
  tax numeric(14,2),
  total numeric(14,2),
  suggested_category text,
  notes text,
  raw_ai jsonb,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.receipts (user_id, created_at desc);
alter table public.receipts enable row level security;
create policy "receipts select own" on public.receipts for select using (auth.uid() = user_id);
create policy "receipts insert own" on public.receipts for insert with check (auth.uid() = user_id);
create policy "receipts update own" on public.receipts for update using (auth.uid() = user_id);
create policy "receipts delete own" on public.receipts for delete using (auth.uid() = user_id);

create trigger receipts_updated_at before update on public.receipts
  for each row execute function public.tg_set_updated_at();

-- Storage bucket (private)
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Storage policies: file path must start with the user's uid folder
create policy "receipts read own files" on storage.objects for select
  using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "receipts upload own files" on storage.objects for insert
  with check (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "receipts delete own files" on storage.objects for delete
  using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);
