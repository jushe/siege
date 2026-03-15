import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  plans,
  schemes,
  scheduleItems,
  schedules,
  reviews,
  reviewItems,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hasApiKey } from "@/lib/ai/config";
import { generateViaCli } from "@/lib/ai/cli-fallback";
import { generateReview } from "@/lib/ai/review-generator";
import type { Provider } from "@/lib/ai/provider";
import { parseJsonBody } from "@/lib/utils";

function buildReviewPrompt(
  type: "scheme" | "implementation",
  planName: string,
  items: Array<{ id: string; title: string; content: string }>
): string {
  const contextLabel =
    type === "scheme"
      ? "technical schemes/proposals"
      : "implemented code changes";

  const itemsSummary = items
    .map((item) => `### ${item.title} (id: ${item.id})\n${item.content}`)
    .join("\n\n");

  return `You are a senior software engineer conducting a thorough review of ${contextLabel}.

Review for:
- Completeness: are all aspects covered?
- Correctness: are there technical errors or flaws?
- Quality: is the approach well-designed and maintainable?
- Risks: are there potential issues or edge cases?
- Security: are there security concerns?

Output a JSON object with:
- summary: overall review summary as markdown (string)
- items: array of findings, each with:
  - targetId: the id of the item this finding relates to (string)
  - title: short finding title (string)
  - content: detailed explanation as markdown (string)
  - severity: "info", "warning", or "critical" (string)
- approved: whether the review passes (boolean) — false if any critical items exist

Output ONLY the JSON object, no other text.

---

Plan: ${planName}

${itemsSummary}`;
}

function parseReviewJson(text: string) {
  const jsonStr = text.startsWith("{")
    ? text
    : text.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function saveReviewResult(
  reviewId: string,
  planId: string,
  type: string,
  result: { summary: string; items: any[]; approved: boolean }
) {
  const db = getDb();
  const finalStatus = result.approved ? "approved" : "changes_requested";

  db.update(reviews)
    .set({
      status: finalStatus,
      content: result.summary,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(reviews.id, reviewId))
    .run();

  for (const item of result.items || []) {
    db.insert(reviewItems)
      .values({
        id: crypto.randomUUID(),
        reviewId,
        targetType: type === "scheme" ? "scheme" : "schedule_item",
        targetId: item.targetId || "",
        title: item.title || "Finding",
        content: item.content || "",
        severity: item.severity || "info",
        resolved: false,
      })
      .run();
  }

  if (type === "implementation" && result.approved) {
    db.update(plans)
      .set({ status: "testing", updatedAt: new Date().toISOString() })
      .where(eq(plans.id, planId))
      .run();
  }
}

export async function POST(req: NextRequest) {
  const [body, errRes] = await parseJsonBody(req);
  if (errRes) return errRes;
  const { planId, type, provider, model } = body as {
    planId: string;
    type: "scheme" | "implementation";
    provider: Provider;
    model?: string;
  };

  if (!planId || !type) {
    return NextResponse.json(
      { error: "planId and type are required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const plan = db.select().from(plans).where(eq(plans.id, planId)).get();
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  let itemsToReview: Array<{ id: string; title: string; content: string }>;

  if (type === "scheme") {
    const schemeList = db
      .select()
      .from(schemes)
      .where(eq(schemes.planId, planId))
      .all();
    itemsToReview = schemeList.map((s) => ({
      id: s.id,
      title: s.title,
      content: s.content || "",
    }));
  } else {
    const schedule = db
      .select()
      .from(schedules)
      .where(eq(schedules.planId, planId))
      .get();
    if (!schedule) {
      return NextResponse.json({ error: "No schedule found" }, { status: 400 });
    }
    const items = db
      .select()
      .from(scheduleItems)
      .where(eq(scheduleItems.scheduleId, schedule.id))
      .all();
    itemsToReview = items.map((i) => ({
      id: i.id,
      title: i.title,
      content: `${i.description || ""}\n\n### Execution Log\n\`\`\`\n${i.executionLog || "No output"}\n\`\`\``,
    }));
  }

  if (itemsToReview.length === 0) {
    return NextResponse.json({ error: "Nothing to review" }, { status: 400 });
  }

  const reviewId = crypto.randomUUID();
  db.insert(reviews)
    .values({ id: reviewId, planId, type, status: "in_progress" })
    .run();

  const useCliMode = !hasApiKey(provider || "anthropic");

  if (useCliMode) {
    // Stream via CLI
    const prompt = buildReviewPrompt(type, plan.name, itemsToReview);
    const cliStream = generateViaCli(prompt);
    const [responseStream, collectStream] = cliStream.tee();

    // Collect and save in background
    (async () => {
      const reader = collectStream.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      const parsed = parseReviewJson(fullText.trim());
      if (parsed) {
        saveReviewResult(reviewId, planId, type, parsed);
      } else {
        // Couldn't parse JSON — save raw text as summary
        db.update(reviews)
          .set({
            status: "changes_requested",
            content: fullText.trim() || "Review completed but output was not valid JSON.",
            updatedAt: new Date().toISOString(),
          })
          .where(eq(reviews.id, reviewId))
          .run();
      }
    })().catch((err) => {
      console.error("[review-generate] CLI save failed:", err);
      db.update(reviews)
        .set({
          status: "changes_requested",
          content: `Review failed: ${err}`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(reviews.id, reviewId))
        .run();
    });

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  // SDK mode — non-streaming (has API key, fast enough)
  try {
    const result = await generateReview({
      type,
      planName: plan.name,
      items: itemsToReview,
      provider: provider || "anthropic",
      model,
    });

    saveReviewResult(reviewId, planId, type, result);

    const review = db.select().from(reviews).where(eq(reviews.id, reviewId)).get();
    const rItems = db.select().from(reviewItems).where(eq(reviewItems.reviewId, reviewId)).all();
    return NextResponse.json({ ...review, items: rItems }, { status: 201 });
  } catch (err) {
    db.update(reviews)
      .set({
        status: "changes_requested",
        content: `Review failed: ${err}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(reviews.id, reviewId))
      .run();
    return NextResponse.json({ error: `Review failed: ${err}` }, { status: 500 });
  }
}
