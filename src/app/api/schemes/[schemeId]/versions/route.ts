import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { schemeVersions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ schemeId: string }> }
) {
  const { schemeId } = await params;
  const db = getDb();

  const versions = db
    .select()
    .from(schemeVersions)
    .where(eq(schemeVersions.schemeId, schemeId))
    .orderBy(desc(schemeVersions.version))
    .all();

  return NextResponse.json(versions);
}
