alter table public.student_profiles
  alter column class_section_id drop not null;

alter table public.profiles
  add column if not exists username text unique,
  add column if not exists password_hash text;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (username);
