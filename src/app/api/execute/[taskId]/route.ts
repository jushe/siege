import { NextRequest, NextResponse } from "next/server";
import { stopExecution } from "@/lib/cli/runner";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const stopped = stopExecution(taskId);

  if (!stopped) {
    return NextResponse.json(
      { error: "No active process found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
