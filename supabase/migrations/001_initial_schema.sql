-- BartNotes Supabase Schema
-- Run this in Supabase SQL Editor or via: supabase db push

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Supabase doesn't allow triggers on auth.users directly from extensions,
-- so we use a different approach: call this from app or use Database Webhooks
-- For now, we create profile manually in signUp flow or use Edge Function
-- Alternative: handle in app - after signUp, upsert profile with username
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Notes
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title varchar(500) not null default '',
  content text not null default '',
  is_pinned boolean default false,
  is_archived boolean default false,
  is_deleted boolean default false,
  deleted_at timestamptz,
  word_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tags
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name varchar(100) not null,
  color varchar(7),
  created_at timestamptz default now()
);

-- Note-Tags junction (many-to-many)
create table if not exists public.note_tags (
  note_id uuid not null references public.notes(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (note_id, tag_id)
);

-- Note versions (history)
create table if not exists public.note_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  content text not null,
  version_number int not null,
  created_at timestamptz default now()
);

-- Attachments (storage_path = path in Supabase Storage bucket)
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  storage_path text not null unique,
  mime_type varchar(100) not null,
  size_bytes bigint not null,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_notes_user_id on public.notes(user_id);
create index if not exists idx_notes_updated_at on public.notes(updated_at desc);
create index if not exists idx_notes_filter on public.notes(user_id, is_deleted, is_archived, is_pinned);
create index if not exists idx_tags_user_id on public.tags(user_id);
create index if not exists idx_note_tags_note on public.note_tags(note_id);
create index if not exists idx_note_tags_tag on public.note_tags(tag_id);
create index if not exists idx_note_versions_note on public.note_versions(note_id);
create index if not exists idx_attachments_note on public.attachments(note_id);

-- RLS
alter table public.profiles enable row level security;
alter table public.notes enable row level security;
alter table public.tags enable row level security;
alter table public.note_tags enable row level security;
alter table public.note_versions enable row level security;
alter table public.attachments enable row level security;

-- Profiles policies (users can read/update own profile)
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Notes policies
create policy "Users can manage own notes" on public.notes
  for all using (auth.uid() = user_id);

-- Tags policies
create policy "Users can manage own tags" on public.tags
  for all using (auth.uid() = user_id);

-- Note_tags: access via note ownership
create policy "Users can manage note_tags for own notes" on public.note_tags
  for all using (
    exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
  );

-- Note_versions: access via note ownership
create policy "Users can manage note_versions for own notes" on public.note_versions
  for all using (
    exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
  );

-- Attachments
create policy "Users can manage own attachments" on public.attachments
  for all using (auth.uid() = user_id);

-- Updated_at trigger for notes
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger notes_updated_at before update on public.notes
  for each row execute procedure public.set_updated_at();

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- Storage bucket for attachments (private)
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Storage policies: users can manage own files in attachments bucket
create policy "Users can upload to own folder" on storage.objects
  for insert with check (
    bucket_id = 'attachments' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read own files" on storage.objects
  for select using (
    bucket_id = 'attachments' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own files" on storage.objects
  for delete using (
    bucket_id = 'attachments' and
    (storage.foldername(name))[1] = auth.uid()::text
  );
