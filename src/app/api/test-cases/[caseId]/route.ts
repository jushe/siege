import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { testCases } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseJsonBody } from "@/lib/utils";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;
  const [body, errRes] = await parseJsonBody(req);
  if (errRes) return errRes;

  const { name, description, type, generatedCode, filePath } = body as {
    name?: string;
    description?: string;
    type?: string;
    generatedCode?: string;
    filePath?: string;
  };

  const db = getDb();
  const existing = db.select().from(testCases).where(eq(testCases.id, caseId)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.update(testCases).set({
    ...(name !== undefined && { name }),
    ...(description !== undefined && { description }),
    ...(type !== undefined && { type: type as "unit" | "integration" | "e2e" }),
    ...(generatedCode !== undefined && { generatedCode }),
    ...(filePath !== undefined && { filePath }),
  }).where(eq(testCases.id, caseId)).run();

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;
  const db = getDb();
  db.delete(testCases).where(eq(testCases.id, caseId)).run();
  return NextResponse.json({ ok: true });
}
