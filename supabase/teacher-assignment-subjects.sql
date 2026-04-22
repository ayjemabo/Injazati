alter table public.teacher_assignments
  add column if not exists subject text;

update public.teacher_assignments
set subject = 'art'
where subject is null;

alter table public.teacher_assignments
  alter column subject set default 'art';

alter table public.teacher_assignments
  alter column subject set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_assignments_subject_check'
  ) then
    alter table public.teacher_assignments
      add constraint teacher_assignments_subject_check
      check (subject in ('art', 'chinese', 'math'));
  end if;
end $$;

alter table public.teacher_assignments
  drop constraint if exists teacher_assignments_subject_check;

alter table public.teacher_assignments
  add constraint teacher_assignments_subject_check
  check (subject in ('art', 'chinese', 'math'));
