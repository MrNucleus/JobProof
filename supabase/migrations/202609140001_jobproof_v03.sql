-- JobProof v0.3: cloud profile and core evidence data.
-- Run this migration in the Supabase SQL editor before enabling cloud sync.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  grade text not null check (char_length(grade) between 1 and 20),
  major text not null check (char_length(major) between 1 and 60),
  cities text not null default '',
  weekly_hours integer not null check (weekly_hours between 1 and 80),
  role_families jsonb not null default '[]'::jsonb,
  onboarding_status text not null default 'in_progress' check (onboarding_status in ('in_progress', 'profile_ready', 'first_action_selected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profile_competencies (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  competency_key text not null check (competency_key in ('research', 'interview', 'competitor', 'data', 'content', 'delivery', 'communication', 'tools')),
  self_level smallint not null check (self_level between 0 and 3),
  evidence_level smallint not null check (evidence_level between 0 and 3),
  interest text not null check (interest in ('like', 'neutral', 'dislike')),
  evidence_note text not null default '' check (char_length(evidence_note) <= 300),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, competency_key)
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'manual',
  source_url text not null default '',
  company text not null default '',
  title text not null,
  city text not null default '',
  raw_text text not null check (char_length(raw_text) between 20 and 10000),
  requirements jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.job_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  model text not null default 'rule-based',
  prompt_version text not null default 'v0.2',
  competencies jsonb not null default '[]'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  duration_days smallint not null check (duration_days in (7, 14)),
  title text not null,
  goal text not null default '',
  target_competency text not null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete cascade,
  day_no smallint not null,
  title text not null,
  instructions text not null default '',
  deliverable text not null default '',
  rubric jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  competency_keys jsonb not null default '[]'::jsonb,
  title text not null,
  body jsonb not null default '{}'::jsonb,
  url text not null default '',
  file_path text,
  completeness jsonb not null default '{}'::jsonb,
  completeness_score smallint not null default 0 check (completeness_score between 0 and 100),
  status text not null default 'draft' check (status in ('draft', 'needs_more_facts', 'ready')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.expressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  format text not null check (format in ('resume', 'portfolio', 'interview')),
  content text not null default '',
  source_evidence_ids jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'confirmed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists profile_competencies_set_updated_at on public.profile_competencies;
create trigger profile_competencies_set_updated_at before update on public.profile_competencies for each row execute function public.set_updated_at();
drop trigger if exists plans_set_updated_at on public.plans;
create trigger plans_set_updated_at before update on public.plans for each row execute function public.set_updated_at();
drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
drop trigger if exists evidence_set_updated_at on public.evidence;
create trigger evidence_set_updated_at before update on public.evidence for each row execute function public.set_updated_at();
drop trigger if exists expressions_set_updated_at on public.expressions;
create trigger expressions_set_updated_at before update on public.expressions for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.profile_competencies enable row level security;
alter table public.jobs enable row level security;
alter table public.job_analyses enable row level security;
alter table public.plans enable row level security;
alter table public.tasks enable row level security;
alter table public.evidence enable row level security;
alter table public.expressions enable row level security;

drop policy if exists profiles_owner_select on public.profiles;
create policy profiles_owner_select on public.profiles for select using (auth.uid() = user_id);
drop policy if exists profiles_owner_insert on public.profiles;
create policy profiles_owner_insert on public.profiles for insert with check (auth.uid() = user_id);
drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists profiles_owner_delete on public.profiles;
create policy profiles_owner_delete on public.profiles for delete using (auth.uid() = user_id);

drop policy if exists profile_competencies_owner_all on public.profile_competencies;
create policy profile_competencies_owner_all on public.profile_competencies
  for all using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));

drop policy if exists jobs_owner_all on public.jobs;
create policy jobs_owner_all on public.jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists job_analyses_owner_all on public.job_analyses;
create policy job_analyses_owner_all on public.job_analyses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists plans_owner_all on public.plans;
create policy plans_owner_all on public.plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists tasks_owner_all on public.tasks;
create policy tasks_owner_all on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists evidence_owner_all on public.evidence;
create policy evidence_owner_all on public.evidence for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists expressions_owner_all on public.expressions;
create policy expressions_owner_all on public.expressions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists profiles_user_id_idx on public.profiles(user_id);
create index if not exists profile_competencies_profile_id_idx on public.profile_competencies(profile_id);
create index if not exists jobs_user_id_created_at_idx on public.jobs(user_id, created_at desc);
create index if not exists plans_user_id_updated_at_idx on public.plans(user_id, updated_at desc);
create index if not exists evidence_user_id_updated_at_idx on public.evidence(user_id, updated_at desc);
create index if not exists expressions_user_id_updated_at_idx on public.expressions(user_id, updated_at desc);
