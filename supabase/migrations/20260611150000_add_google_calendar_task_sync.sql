alter table public.tasks
  add column if not exists google_calendar_id text,
  add column if not exists google_event_id text,
  add column if not exists google_event_etag text,
  add column if not exists google_event_updated_at timestamptz,
  add column if not exists google_event_synced_at timestamptz;

create unique index if not exists idx_tasks_google_event
  on public.tasks(user_id, google_calendar_id, google_event_id)
  where google_event_id is not null;

create index if not exists idx_tasks_google_sync
  on public.tasks(user_id, google_event_synced_at)
  where google_event_id is not null;

