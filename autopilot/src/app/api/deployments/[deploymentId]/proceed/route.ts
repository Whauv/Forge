import { NextResponse } from "next/server";

import { sendPRCreatedEmail } from "@/lib/email";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase";
import type { DeploymentRow } from "@/types/db";

type ProceedRouteProps = {
  params: {
    deploymentId: string;
  };
};

export async function POST(request: Request, { params }: ProceedRouteProps) {
  try {
    const supabase = createRouteHandlerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: deployment, error: fetchError } = await supabase
      .from("deployments")
      .select("id,status,pr_link,project_id")
      .eq("id", params.deploymentId)
      .returns<Pick<DeploymentRow, "id" | "status" | "pr_link" | "project_id">[]>()
      .single();

    if (fetchError || !deployment) {
      return NextResponse.json(
        { error: fetchError?.message ?? "Deployment not found." },
        { status: 404 },
      );
    }

    if (deployment.status !== "passed") {
      return NextResponse.json(
        { error: "Only passed deployments can proceed." },
        { status: 400 },
      );
    }

    const { error: updateError } = await supabase
      .from("deployments")
      .update({ status: "deployed" })
      .eq("id", params.deploymentId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (deployment.pr_link && session.user.email) {
      await sendPRCreatedEmail(session.user.email, deployment.pr_link);
    }

    return NextResponse.json({ status: "deployed" });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected deployment proceed error.",
      },
      { status: 500 },
    );
  }
}
