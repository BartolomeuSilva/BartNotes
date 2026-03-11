-- Tabelas essenciais para BartNotes (executar no SQL Editor do Supabase)

-- 1. Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'user',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- 2. Notes
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

create index if not exists idx_notes_user_id on public.notes(user_id);
alter table public.notes enable row level security;
create policy "Users can manage own notes" on public.notes for all using (auth.uid() = user_id);

-- 3. Tags
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name varchar(100) not null,
  color varchar(7),
  created_at timestamptz default now()
);

alter table public.tags enable row level security;
create policy "Users can manage own tags" on public.tags for all using (auth.uid() = user_id);

-- 4. Note-Tags (junction)
create table if not exists public.note_tags (
  note_id uuid not null references public.notes(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (note_id, tag_id)
);

alter table public.note_tags enable row level security;
create policy "Users can manage note_tags" on public.note_tags for all using (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
);

-- 5. Note versions
create table if not exists public.note_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  content text not null,
  version_number int not null,
  created_at timestamptz default now()
);

alter table public.note_versions enable row level security;
create policy "Users can manage note_versions" on public.note_versions for all using (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
);

-- 6. Trigger updated_at
create or replace function public.set_updated_at()
returns trigger as $$ begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists notes_updated_at on public.notes;
create trigger notes_updated_at before update on public.notes
  for each row execute procedure public.set_updated_at();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
