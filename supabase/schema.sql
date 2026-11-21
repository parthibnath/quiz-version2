begin;

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
  option_explanations jsonb,
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


create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email)) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Only server routes access quiz data. Supabase Auth still runs in the browser.
drop policy if exists "users manage own profile" on public.profiles;
drop policy if exists "users manage own uploads" on public.uploads;
drop policy if exists "users manage own questions" on public.questions;
drop policy if exists "users manage own sessions" on public.sessions;
revoke all on public.profiles, public.uploads, public.questions, public.sessions from public, anon, authenticated;
grant select, insert, update, delete on public.profiles, public.uploads, public.questions, public.sessions to service_role;

alter table public.questions add column if not exists option_explanations jsonb;

insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data->>'full_name', email)
from auth.users
on conflict (id) do nothing;

create index if not exists quiz_uploads_user_idx on public.uploads (user_id, created_at desc);
create index if not exists quiz_questions_user_idx on public.questions (user_id);
create index if not exists quiz_sessions_user_idx on public.sessions (user_id, session_number, status, created_at);

create or replace function public.quiz_question_key(question text)
returns text language sql immutable strict set search_path = '' as $$
  select regexp_replace(lower(question), '[^[:alnum:]]+', '', 'g');
$$;

create index if not exists quiz_questions_key_idx
on public.questions (user_id, public.quiz_question_key(question_text));

create or replace function public.quiz_add_questions(p_user uuid, p_upload uuid, p_questions jsonb)
returns integer language plpgsql set search_path = '' as $$
declare
  added integer;
begin
  perform 1 from public.profiles where id = p_user for update;
  if not exists (select 1 from public.uploads where id = p_upload and user_id = p_user and status = 'done') then
    raise exception 'UPLOAD_NOT_FOUND';
  end if;

  insert into public.questions (user_id, upload_id, question_text, options, correct_index, explanation, option_explanations)
  select p_user, p_upload, incoming.question, incoming.options, incoming.correct_index, incoming.explanation, incoming.option_explanations
  from (
    select distinct on (public.quiz_question_key(question)) *
    from jsonb_to_recordset(p_questions) as q(question text, options jsonb, correct_index integer, explanation text, option_explanations jsonb)
  ) incoming
  where not exists (
    select 1 from public.questions q
    where q.user_id = p_user
      and public.quiz_question_key(q.question_text) = public.quiz_question_key(incoming.question)
  );
  get diagnostics added = row_count;
  return added;
end;
$$;

create or replace function public.quiz_start_session(p_user uuid, p_number integer)
returns public.sessions language plpgsql set search_path = '' as $$
declare
  attempt public.sessions;
  picked uuid[];
  required integer := case when p_number = 11 then 100 else 50 end;
  practice_completed integer[];
begin
  select sessions_completed into practice_completed from public.profiles where id = p_user for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  if p_number is null or p_number not between 1 and 11 then raise exception 'INVALID_SESSION'; end if;
  if (p_number between 2 and 10 and not (p_number - 1 = any(practice_completed)))
     or (p_number = 11 and not (practice_completed @> array[1,2,3,4,5,6,7,8,9,10])) then
    raise exception 'SESSION_LOCKED';
  end if;

  select * into attempt from public.sessions
  where user_id = p_user and session_number = p_number and status = 'in_progress'
  order by created_at desc, id desc limit 1;
  if found then return attempt; end if;

  select question_ids into picked from public.sessions
  where user_id = p_user and session_number = p_number and status = 'completed'
  order by completed_at, id limit 1;

  if picked is null then
    select array_agg(candidate.id) into picked
    from (
      select unique_questions.id
      from (
        select distinct on (public.quiz_question_key(q.question_text)) q.id,
          exists (
            select 1 from public.sessions s where s.user_id = p_user and s.session_number < 11
              and s.status = 'completed' and q.id = any(s.question_ids)
          ) as practiced
        from public.questions q
        where q.user_id = p_user
          and (p_number = 11 or not exists (
            select 1 from public.sessions s
            join public.questions used on used.id = any(s.question_ids)
            where s.user_id = p_user and s.session_number < 11
              and public.quiz_question_key(used.question_text) = public.quiz_question_key(q.question_text)
          ))
        order by public.quiz_question_key(q.question_text), practiced desc, q.created_at, q.id
      ) unique_questions
      order by unique_questions.practiced desc, random()
      limit required
    ) candidate;
  end if;

  if coalesce(cardinality(picked), 0) <> required then
    raise exception 'INSUFFICIENT_QUESTIONS';
  end if;

  insert into public.sessions (user_id, session_number, question_ids, total, status)
  values (p_user, p_number, picked, required, 'in_progress')
  returning * into attempt;
  return attempt;
end;
$$;

create or replace function public.quiz_save_answer(p_user uuid, p_session uuid, p_question uuid, p_choice integer)
returns boolean language plpgsql set search_path = '' as $$
begin
  if p_choice is null or p_choice not between 0 and 3 then raise exception 'INVALID_ANSWERS'; end if;
  update public.sessions set user_answers = jsonb_set(user_answers, array[p_question::text], to_jsonb(p_choice))
  where id = p_session and user_id = p_user and status = 'in_progress' and p_question = any(question_ids);
  return found;
end;
$$;

create or replace function public.quiz_submit_session(p_user uuid, p_session uuid, p_answers jsonb)
returns public.sessions language plpgsql set search_path = '' as $$
declare
  attempt public.sessions;
  result_score integer;
  review jsonb;
  finished timestamptz := now();
begin
  perform 1 from public.profiles where id = p_user for update;
  select * into attempt from public.sessions where id = p_session and user_id = p_user for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if attempt.status = 'completed' then return attempt; end if;

  if jsonb_typeof(p_answers) is distinct from 'object' then raise exception 'INVALID_ANSWERS'; end if;
  if (select count(*) from jsonb_object_keys(p_answers)) <> attempt.total
     or exists (
       select 1 from unnest(attempt.question_ids) id
       where coalesce((p_answers->(id::text))::text, '') not in ('0', '1', '2', '3')
     ) then raise exception 'INVALID_ANSWERS'; end if;

  select count(*) filter (where q.correct_index = a.choice),
    coalesce(jsonb_agg(jsonb_build_object(
      'questionId', q.id, 'questionText', q.question_text,
      'userChoiceIndex', a.choice, 'userChoiceText', q.options->>a.choice,
      'correctChoiceIndex', q.correct_index, 'correctChoiceText', q.options->>q.correct_index,
      'explanation', q.explanation, 'whyUserWasWrong', q.option_explanations->>a.choice
    ) order by picked.ordinality) filter (where q.correct_index <> a.choice), '[]'::jsonb)
  into result_score, review
  from unnest(attempt.question_ids) with ordinality as picked(id, ordinality)
  join public.questions q on q.id = picked.id and q.user_id = p_user
  cross join lateral (select (p_answers->>q.id::text)::integer as choice) a;
  if result_score + jsonb_array_length(review) <> attempt.total then raise exception 'MISSING_QUESTIONS'; end if;

  update public.sessions set status = 'completed', score = result_score, completed_at = finished,
    user_answers = p_answers, incorrect_list = review
  where id = p_session returning * into attempt;

  update public.profiles set cumulative_score = cumulative_score + result_score,
    sessions_completed = case when attempt.session_number < 11 and not (attempt.session_number = any(sessions_completed))
      then array_append(sessions_completed, attempt.session_number) else sessions_completed end,
    session_11_completed = session_11_completed or attempt.session_number = 11,
    session_history = session_history || jsonb_build_array(jsonb_build_object(
      'sessionNumber', attempt.session_number, 'score', result_score, 'total', attempt.total,
      'completedAt', finished, 'sessionId', attempt.id
    ))
  where id = p_user;

  return attempt;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.quiz_question_key(text),
  public.quiz_add_questions(uuid, uuid, jsonb), public.quiz_start_session(uuid, integer),
  public.quiz_save_answer(uuid, uuid, uuid, integer), public.quiz_submit_session(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.quiz_question_key(text),
  public.quiz_add_questions(uuid, uuid, jsonb), public.quiz_start_session(uuid, integer),
  public.quiz_save_answer(uuid, uuid, uuid, integer), public.quiz_submit_session(uuid, uuid, jsonb) to service_role;

notify pgrst, 'reload schema';
commit;
