-- Enable row level security so the browser anon/authenticated key can only
-- reach rows owned by the signed-in user. The backend uses the service-role
-- key, which bypasses RLS, so its writes are unaffected.

alter table projects enable row level security;
alter table tasks enable row level security;
alter table code_artifacts enable row level security;
alter table deployments enable row level security;

-- Projects: owned directly via user_id.
create policy "projects_owner_all" on projects
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Tasks: owned via their parent project.
create policy "tasks_owner_all" on tasks
  for all
  using (
    exists (
      select 1 from projects
      where projects.id = tasks.project_id
        and projects.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from projects
      where projects.id = tasks.project_id
        and projects.user_id = auth.uid()
    )
  );

-- Code artifacts: owned via the task's parent project.
create policy "code_artifacts_owner_all" on code_artifacts
  for all
  using (
    exists (
      select 1 from tasks
      join projects on projects.id = tasks.project_id
      where tasks.id = code_artifacts.task_id
        and projects.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from tasks
      join projects on projects.id = tasks.project_id
      where tasks.id = code_artifacts.task_id
        and projects.user_id = auth.uid()
    )
  );

-- Deployments: owned via their parent project.
create policy "deployments_owner_all" on deployments
  for all
  using (
    exists (
      select 1 from projects
      where projects.id = deployments.project_id
        and projects.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from projects
      where projects.id = deployments.project_id
        and projects.user_id = auth.uid()
    )
  );
