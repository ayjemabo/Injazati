create type user_role as enum ('student', 'teacher', 'admin');
create type submission_status as enum ('draft', 'submitted', 'under_review', 'needs_revision', 'approved');
create type file_kind as enum ('zip', 'pdf', 'image', 'document');

create table public.profiles (
  id uuid primary key,
  email text unique not null,
  display_name text not null,
  username text unique,
  password_hash text,
  role user_role not null,
  created_at timestamptz not null default now()
);

create table public.class_sections (
  id uuid primary key default gen_random_uuid(),
  grade_label text not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  class_section_id uuid references public.class_sections(id) on delete restrict,
  student_code text not null unique
);

create table public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  class_section_id uuid not null references public.class_sections(id) on delete cascade,
  subject text not null default 'art' check (subject in ('art', 'chinese'))
);

create table public.submission_rounds (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null default 'art' check (subject in ('art', 'chinese')),
  due_date date not null,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  round_id uuid not null references public.submission_rounds(id) on delete cascade,
  status submission_status not null default 'draft',
  grade numeric(5,2),
  submitted_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  name text not null,
  kind file_kind not null,
  size_bytes bigint not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table public.review_comments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
