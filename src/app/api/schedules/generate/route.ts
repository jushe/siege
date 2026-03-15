import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { plans, schemes, schedules, scheduleItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateSchedule } from "@/lib/ai/schedule-generator";
import type { Provider } from "@/lib/ai/provider";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { planId, provider, model } = body as {
    planId: string;
    provider: Provider;
    model?: string;
  };

  if (!planId || !provider) {
    return NextResponse.json(
      { error: "planId and provider are required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const plan = db.select().from(plans).where(eq(plans.id, planId)).get();
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  if (plan.status !== "confirmed") {
    return NextResponse.json(
      { error: "Plan must be confirmed to generate schedule" },
      { status: 400 }
    );
  }

  const schemeList = db
    .select()
    .from(schemes)
    .where(eq(schemes.planId, planId))
    .all();

  const items = await generateSchedule({
    planName: plan.name,
    schemes: schemeList.map((s) => ({
      id: s.id,
      title: s.title,
      content: s.content || "",
    })),
    provider,
    model,
  });

  // Delete existing schedule if any
  const existing = db
    .select()
    .from(schedules)
    .where(eq(schedules.planId, planId))
    .get();
  if (existing) {
    db.delete(schedules).where(eq(schedules.id, existing.id)).run();
  }

  // Create schedule
  const today = new Date();
  let currentDate = new Date(today);
  const scheduleId = crypto.randomUUID();

  // Calculate end date
  const totalDays = items.reduce((sum, item) => sum + item.durationDays, 0);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + totalDays);

  db.insert(schedules)
    .values({
      id: scheduleId,
      planId,
      startDate: today.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    })
    .run();

  // Create schedule items with calculated dates
  for (const item of items) {
    const itemStart = new Date(currentDate);
    const itemEnd = new Date(currentDate);
    itemEnd.setDate(itemEnd.getDate() + item.durationDays);

    db.insert(scheduleItems)
      .values({
        id: crypto.randomUUID(),
        scheduleId,
        schemeId: item.schemeId,
        title: item.title,
        description: item.description,
        startDate: itemStart.toISOString().split("T")[0],
        endDate: itemEnd.toISOString().split("T")[0],
        order: item.order,
        status: "pending",
        progress: 0,
        engine: "claude-code",
        skills: "[]",
      })
      .run();

    currentDate = itemEnd;
  }

  // Update plan status
  db.update(plans)
    .set({ status: "scheduled", updatedAt: new Date().toISOString() })
    .where(eq(plans.id, planId))
    .run();

  // Return the created schedule with items
  const schedule = db
    .select()
    .from(schedules)
    .where(eq(schedules.id, scheduleId))
    .get();
  const createdItems = db
    .select()
    .from(scheduleItems)
    .where(eq(scheduleItems.scheduleId, scheduleId))
    .all();

  return NextResponse.json({ ...schedule, items: createdItems }, { status: 201 });
}
