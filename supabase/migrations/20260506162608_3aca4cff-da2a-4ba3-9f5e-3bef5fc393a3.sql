create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','in_progress','done')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_user on public.tasks(user_id);
create index idx_tasks_status on public.tasks(user_id, status);

alter table public.tasks enable row level security;

create policy "tasks select own" on public.tasks for select using (auth.uid() = user_id);
create policy "tasks insert own" on public.tasks for insert with check (auth.uid() = user_id);
create policy "tasks update own" on public.tasks for update using (auth.uid() = user_id);
create policy "tasks delete own" on public.tasks for delete using (auth.uid() = user_id);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.tg_set_updated_at();