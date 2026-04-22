alter table public.submission_rounds
  add column if not exists subject text;

update public.submission_rounds
set subject = 'art'
where subject is null;

alter table public.submission_rounds
  alter column subject set default 'art';

alter table public.submission_rounds
  alter column subject set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'submission_rounds_subject_check'
  ) then
    alter table public.submission_rounds
      add constraint submission_rounds_subject_check
      check (subject in ('art', 'chinese', 'math'));
  end if;
end $$;

alter table public.submission_rounds
  drop constraint if exists submission_rounds_subject_check;

alter table public.submission_rounds
  add constraint submission_rounds_subject_check
  check (subject in ('art', 'chinese', 'math'));

insert into public.submission_rounds (title, subject, due_date, is_open)
select 'مشروع الصيني الحالي', 'chinese', current_date + interval '10 day', true
where not exists (
  select 1
  from public.submission_rounds
  where subject = 'chinese'
);

insert into public.submission_rounds (title, subject, due_date, is_open)
select 'مشروع الرياضيات الحالي', 'math', current_date + interval '12 day', true
where not exists (
  select 1
  from public.submission_rounds
  where subject = 'math'
);
