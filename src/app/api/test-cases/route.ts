import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { testSuites, testCases } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseJsonBody } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const [body, errRes] = await parseJsonBody(req);
  if (errRes) return errRes;

  const { planId, name, description, type, generatedCode, filePath, scheduleItemId } = body as {
    planId: string;
    name: string;
    description?: string;
    type?: string;
    generatedCode?: string;
    filePath?: string;
    scheduleItemId?: string;
  };

  if (!planId || !name) {
    return NextResponse.json({ error: "planId and name are required" }, { status: 400 });
  }

  const db = getDb();

  // Get or create suite
  let suite = db.select().from(testSuites).where(eq(testSuites.planId, planId)).get();
  if (!suite) {
    const suiteId = crypto.randomUUID();
    db.insert(testSuites).values({ id: suiteId, planId, status: "pending" }).run();
    suite = db.select().from(testSuites).where(eq(testSuites.id, suiteId)).get()!;
  }

  const caseId = crypto.randomUUID();
  db.insert(testCases).values({
    id: caseId,
    testSuiteId: suite.id,
    scheduleItemId: scheduleItemId || null,
    name,
    description: description || "",
    type: (type as "unit" | "integration" | "e2e") || "unit",
    generatedCode: generatedCode || "",
    filePath: filePath || null,
    status: "pending",
  }).run();

  return NextResponse.json({ id: caseId }, { status: 201 });
}
