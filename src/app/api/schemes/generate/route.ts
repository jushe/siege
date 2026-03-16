import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { plans, projects, schemes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateSchemeStream } from "@/lib/ai/scheme-generator";
import type { Provider } from "@/lib/ai/provider";
import { parseJsonBody } from "@/lib/utils";

function saveScheme(planId: string, content: string, planStatus: string) {
  const db = getDb();
  db.insert(schemes)
    .values({
      id: crypto.randomUUID(),
      planId,
      title: "Generated Scheme",
      content,
      sourceType: "web_search",
    })
    .run();

  if (planStatus === "draft") {
    db.update(plans)
      .set({ status: "reviewing", updatedAt: new Date().toISOString() })
      .where(eq(plans.id, planId))
      .run();
  }
}

export async function POST(req: NextRequest) {
  const [body, errRes] = await parseJsonBody(req);
  if (errRes) return errRes;
  const { planId, provider, model } = body as {
    planId: string;
    provider: Provider;
    model?: string;
  };

  if (!planId) {
    return NextResponse.json({ error: "planId is required" }, { status: 400 });
  }

  const db = getDb();
  const plan = db.select().from(plans).where(eq(plans.id, planId)).get();
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const project = db
    .select()
    .from(projects)
    .where(eq(projects.id, plan.projectId))
    .get();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Always use SDK streaming
  const result = generateSchemeStream({
    planName: plan.name,
    planDescription: plan.description || "",
    projectName: project.name,
    targetRepoPath: project.targetRepoPath,
    provider: provider || undefined,
    model,
  });

  const response = result.toTextStreamResponse();

  Promise.resolve(result.text)
    .then((fullText) => {
      if (fullText.trim()) {
        saveScheme(planId, fullText.trim(), plan.status);
      }
    })
    .catch((err) => {
      console.error(`[scheme-generate] failed:`, err);
    });

  return response;
}
