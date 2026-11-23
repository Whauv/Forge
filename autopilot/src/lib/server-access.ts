import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { loadOwnedProject, type OwnedProject } from "@/lib/queries";
import { createRouteHandlerSupabaseClient, createServerSupabaseClient } from "@/lib/supabase";
import type { DeploymentRow } from "@/types/db";

type RouteAuthFailure = {
  response: NextResponse;
};

type RouteSessionResult = {
  supabase: ReturnType<typeof createRouteHandlerSupabaseClient>;
  userId: string;
};

type RouteProjectResult = RouteSessionResult & {
  project: OwnedProject;
};

export async function requireServerSessionOrRedirect() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return { supabase, session };
}

export async function requireOwnedProjectOrRedirect(projectId: string) {
  const { supabase, session } = await requireServerSessionOrRedirect();
  const { data: project, error } = await loadOwnedProject(
    supabase,
    projectId,
    session.user.id,
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!project) {
    redirect("/projects");
  }

  return { supabase, session, project };
}

export async function requireRouteSession():
  Promise<RouteSessionResult | RouteAuthFailure> {
  const supabase = createRouteHandlerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  return {
    supabase,
    userId: session.user.id,
  };
}

export async function requireOwnedProjectForRoute(
  projectId: string,
): Promise<RouteProjectResult | RouteAuthFailure> {
  const auth = await requireRouteSession();
  if ("response" in auth) {
    return auth;
  }

  const { supabase, userId } = auth;
  const { data: project, error } = await loadOwnedProject(supabase, projectId, userId);

  if (error) {
    return {
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  if (!project) {
    return {
      response: NextResponse.json({ error: "Project not found." }, { status: 404 }),
    };
  }

  return {
    supabase,
    userId,
    project,
  };
}

export type OwnedDeployment = Pick<
  DeploymentRow,
  "id" | "project_id" | "status" | "pr_link"
>;
