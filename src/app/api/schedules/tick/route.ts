import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { schedules, scheduleItems, plans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/schedules/tick
 *
 * Called by the frontend every 30s when auto-execute is enabled.
 * Returns the next pending task to execute. The frontend then calls
 * /api/execute directly to get streaming progress display.
 */
export async function POST() {
  const db = getDb();

  const autoSchedules = db.select().from(schedules)
    .where(eq(schedules.autoExecute, true))
    .all();

  if (autoSchedules.length === 0) {
    return NextResponse.json({ executed: false });
  }

  for (const schedule of autoSchedules) {
    const allItems = db.select().from(scheduleItems)
      .where(eq(scheduleItems.scheduleId, schedule.id))
      .all()
      .sort((a, b) => a.order - b.order);

    // Skip if any task is already running
    const hasRunning = allItems.some(i => i.status === "in_progress");
    if (hasRunning) continue;

    // Find first pending task
    const nextPending = allItems.find(i => i.status === "pending");
    if (!nextPending) continue;

    // Update plan status if needed
    const plan = db.select().from(plans).where(eq(plans.id, schedule.planId)).get();
    if (plan?.status === "scheduled") {
      db.update(plans)
        .set({ status: "executing", updatedAt: new Date().toISOString() })
        .where(eq(plans.id, plan.id))
        .run();
    }

    return NextResponse.json({
      executed: true,
      nextTask: { itemId: nextPending.id, title: nextPending.title },
    });
  }

  return NextResponse.json({ executed: false });
}
