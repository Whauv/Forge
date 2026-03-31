import { NextResponse } from "next/server";

import { createRouteHandlerSupabaseClient } from "@/lib/supabase";

type PatchPayload = {
  status?: "approved" | "rejected";
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

    const supabase = createRouteHandlerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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
