-- Resume point for student lessons
alter table if exists public.user_progress
  add column if not exists current_exercise_index integer not null default 0,
  add column if not exists lesson_state jsonb not null default '{}'::jsonb;

create unique index if not exists user_progress_user_lesson_uidx
  on public.user_progress (user_id, lesson_id);

create or replace function public.save_lesson_progress_state(
  p_caller_id uuid,
  p_lesson_id uuid,
  p_current_exercise_index integer,
  p_lesson_state jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_progress (
    user_id,
    lesson_id,
    completed,
    completed_at,
    score,
    current_exercise_index,
    lesson_state
  )
  values (
    p_caller_id,
    p_lesson_id,
    false,
    null,
    coalesce((select score from public.user_progress up where up.user_id = p_caller_id and up.lesson_id = p_lesson_id), 0),
    greatest(coalesce(p_current_exercise_index, 0), 0),
    coalesce(p_lesson_state, '{}'::jsonb)
  )
  on conflict (user_id, lesson_id)
  do update set
    current_exercise_index = greatest(coalesce(excluded.current_exercise_index, 0), 0),
    lesson_state = coalesce(excluded.lesson_state, '{}'::jsonb),
    updated_at = now();
end;
$$;

create or replace function public.get_lesson_progress_state(
  p_caller_id uuid,
  p_lesson_id uuid
)
returns table (
  user_id uuid,
  lesson_id uuid,
  current_exercise_index integer,
  lesson_state jsonb,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    up.user_id,
    up.lesson_id,
    up.current_exercise_index,
    up.lesson_state,
    up.updated_at
  from public.user_progress up
  where up.user_id = p_caller_id
    and up.lesson_id = p_lesson_id
  limit 1;
$$;
