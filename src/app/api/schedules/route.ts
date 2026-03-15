import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { schedules, scheduleItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const planId = req.nextUrl.searchParams.get("planId");
  if (!planId) {
    return NextResponse.json(
      { error: "planId is required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const schedule = db
    .select()
    .from(schedules)
    .where(eq(schedules.planId, planId))
    .get();

  if (!schedule) {
    return NextResponse.json(null);
  }

  const items = db
    .select()
    .from(scheduleItems)
    .where(eq(scheduleItems.scheduleId, schedule.id))
    .all();

  return NextResponse.json({ ...schedule, items });
}
