import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { plans } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const result = db
    .select()
    .from(plans)
    .where(eq(plans.projectId, projectId))
    .orderBy(desc(plans.createdAt))
    .all();

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectId, name, description, folderId } = body;

  if (!projectId || !name) {
    return NextResponse.json(
      { error: "projectId and name are required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const id = crypto.randomUUID();
  db.insert(plans)
    .values({ id, projectId, name, description, status: "draft", folderId: folderId || null })
    .run();

  const plan = db.select().from(plans).where(eq(plans.id, id)).get();
  return NextResponse.json(plan, { status: 201 });
}
