import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { plans, projects, schemes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateSchemeStream } from "@/lib/ai/scheme-generator";
import type { Provider } from "@/lib/ai/provider";
import { parseJsonBody } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const [body, errRes] = await parseJsonBody(req);
  if (errRes) return errRes;
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

  const project = db
    .select()
    .from(projects)
    .where(eq(projects.id, plan.projectId))
    .get();
  if (!project) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 }
    );
  }

  const result = generateSchemeStream({
    planName: plan.name,
    planDescription: plan.description || "",
    projectName: project.name,
    targetRepoPath: project.targetRepoPath,
    provider,
    model,
  });

  // Collect the full text for saving to DB
  const response = result.toTextStreamResponse();

  // Save the scheme after streaming completes (fire and forget)
  Promise.resolve(result.text).then((fullText) => {
    const id = crypto.randomUUID();
    db.insert(schemes)
      .values({
        id,
        planId,
        title: `Generated Scheme`,
        content: fullText,
        sourceType: "web_search",
      })
      .run();

    // Transition plan to reviewing if draft
    if (plan.status === "draft") {
      db.update(plans)
        .set({ status: "reviewing", updatedAt: new Date().toISOString() })
        .where(eq(plans.id, planId))
        .run();
    }
  }).catch((err) => {
    console.error(`[scheme-generate] Failed to save scheme for plan ${planId}:`, err);
    // Mark plan as draft if generation failed and it was transitioning
    if (plan.status === "draft") {
      db.update(plans)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(plans.id, planId))
        .run();
    }
  });

  return response;
}
