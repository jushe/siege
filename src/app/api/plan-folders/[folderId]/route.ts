import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { planFolders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const { folderId } = await params;
  const body = await req.json();
  const { name, parentId } = body;
  const db = getDb();

  db.update(planFolders)
    .set({
      ...(name !== undefined && { name }),
      ...(parentId !== undefined && { parentId }),
    })
    .where(eq(planFolders.id, folderId))
    .run();

  const folder = db
    .select()
    .from(planFolders)
    .where(eq(planFolders.id, folderId))
    .get();
  return NextResponse.json(folder);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const { folderId } = await params;
  const db = getDb();
  db.delete(planFolders).where(eq(planFolders.id, folderId)).run();
  return NextResponse.json({ ok: true });
}
