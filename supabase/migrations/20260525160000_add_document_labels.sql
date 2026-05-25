alter table public.documents
  add column if not exists labels text[] not null default '{}'::text[];
