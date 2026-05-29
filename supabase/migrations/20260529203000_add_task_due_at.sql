alter table public.tasks
  add column if not exists due_at timestamptz;

update public.tasks
set due_at = (due_date::timestamp at time zone 'UTC')
where due_date is not null
  and due_at is null;

create index if not exists idx_tasks_due_at on public.tasks(user_id, due_at);
