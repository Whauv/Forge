create extension if not exists pgcrypto;

create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  github_repo_url text not null,
  doc_urls text[],
  problem_description text,
  created_at timestamptz default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  description text,
  status text default 'pending',
  clarifying_question text,
  created_at timestamptz default now()
);

create table code_artifacts (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  file_path text not null,
  unified_diff text not null,
  created_at timestamptz default now()
);

create table deployments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  status text default 'pending',
  pr_link text,
  branch_name text,
  commit_sha text,
  retry_count int default 0,
  test_output text,
  created_at timestamptz default now()
);
