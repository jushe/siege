import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { planFolders, plans } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  const parentId = req.nextUrl.searchParams.get("parentId");

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 }
    );
  }

  const db = getDb();

  // Get folders at this level
  const folders = parentId
    ? db
        .select()
        .from(planFolders)
        .where(
          and(
            eq(planFolders.projectId, projectId),
            eq(planFolders.parentId, parentId)
          )
        )
        .all()
    : db
        .select()
        .from(planFolders)
        .where(
          and(
            eq(planFolders.projectId, projectId),
            isNull(planFolders.parentId)
          )
        )
        .all();

  // Get plans at this level
  const plansAtLevel = parentId
    ? db
        .select()
        .from(plans)
        .where(
          and(
            eq(plans.projectId, projectId),
            eq(plans.folderId, parentId)
          )
        )
        .all()
    : db
        .select()
        .from(plans)
        .where(
          and(
            eq(plans.projectId, projectId),
            isNull(plans.folderId)
          )
        )
        .all();

  return NextResponse.json({ folders, plans: plansAtLevel });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectId, name, parentId } = body;

  if (!projectId || !name) {
    return NextResponse.json(
      { error: "projectId and name are required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const id = crypto.randomUUID();
  db.insert(planFolders)
    .values({ id, projectId, name, parentId: parentId || null })
    .run();

  const folder = db
    .select()
    .from(planFolders)
    .where(eq(planFolders.id, id))
    .get();
  return NextResponse.json(folder, { status: 201 });
}
