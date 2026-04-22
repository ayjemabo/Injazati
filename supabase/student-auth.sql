alter table public.profiles
  add column if not exists username text unique,
  add column if not exists password_hash text;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (username);

-- Example:
-- update public.profiles
-- set username = 'sara101',
--     password_hash = 'PUT_HASH_HERE'
-- where email = 'sara.101@balad-alameen.edu';
