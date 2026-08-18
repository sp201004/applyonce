-- ============================================================================
-- ApplyOnce - Supabase Backend Setup
-- ----------------------------------------------------------------------------
-- Apne khud ke Supabase project mein ye poora script chalao:
--   Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
--
-- Ye banata hai:
--   1. profiles table (aapki saari profile details)
--   2. Row Level Security (RLS) - har user sirf apni row dekh/edit kar sakta hai
--   3. resumes storage bucket + uske access policies
--   4. Auto-updated_at timestamp trigger
-- ============================================================================


-- ============================================================================
-- 1. PROFILES TABLE
-- ----------------------------------------------------------------------------
-- Columns exactly match the extension/web app (snake_case).
-- id = auth user id (foreign key to Supabase auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  email                  text,

  -- Resume
  resume_text            text default '',
  resume_path            text default '',

  -- Name
  first_name             text default '',
  middle_name            text default '',
  last_name              text default '',
  preferred_first_name   text default '',
  preferred_middle_name  text default '',
  preferred_last_name    text default '',

  -- Contact
  phone_type             text default '',
  country_code           text default '',
  phone                  text default '',

  -- Address
  address                text default '',
  city                   text default '',
  nationality            text default '',
  state                  text default '',
  zip                    text default '',
  country                text default '',

  -- Links
  linkedin               text default '',
  github                 text default '',
  website                text default '',
  x                      text default '',
  medium                 text default '',
  leetcode               text default '',
  gfg                    text default '',

  -- Structured lists (stored as JSON)
  education              jsonb default '[]'::jsonb,
  work_experience        jsonb default '[]'::jsonb,
  skills                 jsonb default '[]'::jsonb,
  languages              jsonb default '[]'::jsonb,
  certificates           jsonb default '[]'::jsonb,

  -- Work authorization / preferences
  work_auth_india        text default '',
  require_sponsorship    text default '',
  disability             text default '',
  veteran                text default '',
  gender                 text default '',
  lgbtq                  text default '',
  hispanic_latino        text default '',
  race                   text default '',
  sexual_orientation     text default '',
  pronouns               text default '',
  expected_salary        text default '',
  available_start_date   text default '',
  date_of_birth          text default '',
  additional_info        text default '',
  achievements           text default '',

  -- Timestamps
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);


-- ============================================================================
-- 2. ROW LEVEL SECURITY (RLS) on profiles
-- ----------------------------------------------------------------------------
-- Sirf logged-in user apni hi row read/write kar sakta hai.
-- ============================================================================
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile"   on public.profiles;
drop policy if exists "Users can insert own profile"  on public.profiles;
drop policy if exists "Users can update own profile"  on public.profiles;
drop policy if exists "Users can delete own profile"  on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can delete own profile"
  on public.profiles for delete
  using (auth.uid() = id);


-- ============================================================================
-- 3. AUTO updated_at TRIGGER
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 4. RESUMES STORAGE BUCKET
-- ----------------------------------------------------------------------------
-- App resume ko `${userId}/${fileName}` path pe upload karta hai.
-- Bucket private rakha gaya hai; sirf owner apni files access kar sakta hai.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

drop policy if exists "Users can read own resumes"    on storage.objects;
drop policy if exists "Users can upload own resumes"  on storage.objects;
drop policy if exists "Users can update own resumes"  on storage.objects;
drop policy if exists "Users can delete own resumes"  on storage.objects;

-- Path ka pehla folder = user id (e.g. "<uuid>/resume.pdf")
create policy "Users can read own resumes"
  on storage.objects for select
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload own resumes"
  on storage.objects for insert
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update own resumes"
  on storage.objects for update
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own resumes"
  on storage.objects for delete
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);


-- ============================================================================
-- DONE.
-- Next: web/.env.example dekho aur apne Supabase URL + anon key set karo.
-- ============================================================================
