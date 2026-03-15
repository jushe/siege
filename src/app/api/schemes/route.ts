import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { schemes, plans } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const planId = req.nextUrl.searchParams.get("planId");
  if (!planId) {
    return NextResponse.json(
      { error: "planId is required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const result = db
    .select()
    .from(schemes)
    .where(eq(schemes.planId, planId))
    .orderBy(desc(schemes.createdAt))
    .all();

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { planId, title, content, sourceType } = body;

  if (!planId || !title) {
    return NextResponse.json(
      { error: "planId and title are required" },
      { status: 400 }
    );
  }

  const db = getDb();

  const plan = db.select().from(plans).where(eq(plans.id, planId)).get();
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  if (
    ["confirmed", "scheduled", "executing"].includes(plan.status)
  ) {
    return NextResponse.json(
      { error: "Cannot add schemes to a confirmed/scheduled/executing plan" },
      { status: 400 }
    );
  }

  const id = crypto.randomUUID();
  db.insert(schemes)
    .values({
      id,
      planId,
      title,
      content: content || "",
      sourceType: sourceType || "manual",
    })
    .run();

  if (plan.status === "draft") {
    db.update(plans)
      .set({ status: "reviewing", updatedAt: new Date().toISOString() })
      .where(eq(plans.id, planId))
      .run();
  }

  const scheme = db.select().from(schemes).where(eq(schemes.id, id)).get();
  return NextResponse.json(scheme, { status: 201 });
}
