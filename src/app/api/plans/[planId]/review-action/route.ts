import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { plans, reviews, reviewItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseJsonBody } from "@/lib/utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;
  const [body, errRes] = await parseJsonBody(req);
  if (errRes) return errRes;

  const { action } = body as { action: "accept" | "rework" };
  if (!action || !["accept", "rework"].includes(action)) {
    return NextResponse.json({ error: "action must be 'accept' or 'rework'" }, { status: 400 });
  }

  const db = getDb();
  const plan = db.select().from(plans).where(eq(plans.id, planId)).get();
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  if (action === "accept") {
    // Only transition plan status — do NOT bulk-resolve findings
    // Findings should be resolved individually (dismiss/fix task completion)
    db.update(plans)
      .set({ status: "testing", updatedAt: new Date().toISOString() })
      .where(eq(plans.id, planId))
      .run();

    return NextResponse.json({ status: "testing" });
  }

  if (action === "rework") {
    // Go back to executing so user can re-run/modify tasks
    db.update(plans)
      .set({ status: "executing", updatedAt: new Date().toISOString() })
      .where(eq(plans.id, planId))
      .run();

    return NextResponse.json({ status: "executing" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
