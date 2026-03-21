import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { plans, schedules, scheduleItems, fileSnapshots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/snapshots/tasks?planId=xxx
 *
 * Returns completed schedule items with their file change counts.
 * Used by the test view to let users pick which tasks to generate tests for.
 */
export async function GET(req: NextRequest) {
  const planId = req.nextUrl.searchParams.get("planId");
  if (!planId) return NextResponse.json([], { status: 400 });

  const db = getDb();
  const plan = db.select().from(plans).where(eq(plans.id, planId)).get();
  if (!plan) return NextResponse.json([]);

  const schedule = db.select().from(schedules).where(eq(schedules.planId, planId)).get();
  if (!schedule) return NextResponse.json([]);

  const items = db.select().from(scheduleItems)
    .where(eq(scheduleItems.scheduleId, schedule.id))
    .all()
    .filter(i => i.status === "completed")
    .sort((a, b) => a.order - b.order);

  const result = items.map((item) => {
    const snaps = db.select().from(fileSnapshots)
      .where(eq(fileSnapshots.scheduleItemId, item.id))
      .all();
    const uniqueFiles = new Set(snaps.map(s => s.filePath));
    return {
      id: item.id,
      title: item.title,
      order: item.order,
      status: item.status,
      fileCount: uniqueFiles.size,
    };
  });

  return NextResponse.json(result);
}
