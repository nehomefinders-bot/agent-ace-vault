alter table public.documents
  add column if not exists library_scope text not null default 'documents';

update public.documents
set library_scope = 'documents'
where library_scope is null or library_scope = '';

alter table public.documents
  add constraint documents_library_scope_check
  check (library_scope in ('documents', 'media'));
