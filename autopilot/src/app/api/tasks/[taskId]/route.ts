import { NextResponse } from "next/server";

import { requireRouteSession } from "@/lib/server-access";
import type { TaskStatus } from "@/types/db";

type PatchPayload = {
  status?: Extract<TaskStatus, "approved" | "rejected">;
};

type TaskPatchRouteProps = {
  params: {
    taskId: string;
  };
};

export async function PATCH(request: Request, { params }: TaskPatchRouteProps) {
  try {
    const body = (await request.json()) as PatchPayload;
    if (body.status !== "approved" && body.status !== "rejected") {
      return NextResponse.json({ error: "Invalid task status." }, { status: 400 });
    }

    const auth = await requireRouteSession();
    if ("response" in auth) {
      return auth.response;
    }

    const { supabase, userId } = auth;
    const { data: task, error: fetchError } = await supabase
      .from("tasks")
      .select("id,project:projects!inner(user_id)")
      .eq("id", params.taskId)
      .eq("project.user_id", userId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    const { error } = await supabase
      .from("tasks")
      .update({ status: body.status })
      .eq("id", params.taskId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: body.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected task update error." },
      { status: 500 },
    );
  }
}
