create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  cumulative_score integer not null default 0,
  sessions_completed integer[] not null default '{}',
  session_11_completed boolean not null default false,
  session_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_type text not null check (file_type in ('pdf', 'image', 'text', 'camera')),
  extracted_text text not null,
  status text not null check (status in ('done', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  upload_id uuid not null references public.uploads(id) on delete cascade,
  question_text text not null,
  options jsonb not null check (jsonb_array_length(options) = 4),
  correct_index integer not null check (correct_index between 0 and 3),
  explanation text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_number integer not null check (session_number between 1 and 11),
  question_ids uuid[] not null,
  user_answers jsonb not null default '{}'::jsonb,
  status text not null check (status in ('in_progress', 'completed')),
  score integer not null default 0,
  total integer not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  incorrect_list jsonb
);

alter table public.profiles enable row level security;
alter table public.uploads enable row level security;
alter table public.questions enable row level security;
alter table public.sessions enable row level security;

create policy "users manage own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "users manage own uploads" on public.uploads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own questions" on public.questions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own sessions" on public.sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();
