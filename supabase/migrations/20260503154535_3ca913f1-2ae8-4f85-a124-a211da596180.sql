
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- updated_at trigger helper
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Account kinds
create type public.account_kind as enum ('Income','Expense','Asset','Liability','Equity');

-- Accounts
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  name text not null,
  kind public.account_kind not null,
  tax_line text,
  description text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, code)
);
create index on public.accounts (user_id);
alter table public.accounts enable row level security;
create policy "accounts select own" on public.accounts for select using (auth.uid() = user_id);
create policy "accounts insert own" on public.accounts for insert with check (auth.uid() = user_id);
create policy "accounts update own" on public.accounts for update using (auth.uid() = user_id);
create policy "accounts delete own" on public.accounts for delete using (auth.uid() = user_id);

-- Transactions (double-entry: debit + credit account)
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  memo text not null,
  amount numeric(14,2) not null check (amount > 0),
  debit_account_id  uuid not null references public.accounts(id) on delete restrict,
  credit_account_id uuid not null references public.accounts(id) on delete restrict,
  vendor text,
  reference text,
  tags text[],
  created_at timestamptz not null default now()
);
create index on public.transactions (user_id, date desc);
alter table public.transactions enable row level security;
create policy "txn select own" on public.transactions for select using (auth.uid() = user_id);
create policy "txn insert own" on public.transactions for insert with check (auth.uid() = user_id);
create policy "txn update own" on public.transactions for update using (auth.uid() = user_id);
create policy "txn delete own" on public.transactions for delete using (auth.uid() = user_id);

-- Mileage trips
create type public.mileage_mode as enum ('live','address','manual');

create table public.mileage_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  miles numeric(10,2) not null check (miles >= 0),
  purpose text,
  from_address text,
  to_address text,
  mode public.mileage_mode not null default 'manual',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.mileage_trips (user_id, date desc);
alter table public.mileage_trips enable row level security;
create policy "trips select own" on public.mileage_trips for select using (auth.uid() = user_id);
create policy "trips insert own" on public.mileage_trips for insert with check (auth.uid() = user_id);
create policy "trips update own" on public.mileage_trips for update using (auth.uid() = user_id);
create policy "trips delete own" on public.mileage_trips for delete using (auth.uid() = user_id);
