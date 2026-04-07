alter table projects
  add column if not exists status text default 'created';

alter table tasks
  add column if not exists task_id text,
  add column if not exists type text default 'implementation',
  add column if not exists files_to_modify text[] default '{}',
  add column if not exists depends_on text[] default '{}',
  add column if not exists details jsonb,
  add column if not exists test_result jsonb;

alter table code_artifacts
  add column if not exists project_id uuid references projects(id) on delete cascade,
  add column if not exists explanation text,
  add column if not exists status text default 'generated';

alter table deployments
  add column if not exists task_id uuid references tasks(id) on delete set null;
