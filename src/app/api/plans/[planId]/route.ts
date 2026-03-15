import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { plans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;
  const db = getDb();
  const plan = db.select().from(plans).where(eq(plans.id, planId)).get();

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json(plan);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;
  const body = await req.json();
  const db = getDb();

  db.update(plans)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(plans.id, planId))
    .run();

  const plan = db.select().from(plans).where(eq(plans.id, planId)).get();
  return NextResponse.json(plan);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;
  const db = getDb();
  db.delete(plans).where(eq(plans.id, planId)).run();
  return NextResponse.json({ ok: true });
}
