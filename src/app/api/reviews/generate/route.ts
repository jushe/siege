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
import { getConfiguredModel } from "@/lib/ai/config";
import { streamText } from "ai";
import type { Provider } from "@/lib/ai/provider";
import { parseJsonBody } from "@/lib/utils";

function buildReviewPrompt(
  type: "scheme" | "implementation",
  planName: string,
  items: Array<{ id: string; title: string; content: string }>
) {
  const contextLabel =
    type === "scheme" ? "technical schemes/proposals" : "implemented code changes";
  const itemsSummary = items
    .map((item) => `### ${item.title} (id: ${item.id})\n${item.content}`)
    .join("\n\n");

  return {
    system: `You are a code review engine. Output JSON only. No conversation.

CRITICAL: Do NOT ask questions, request access, or use tools. Review based solely on the content provided.

Review for: completeness, correctness, quality, risks, security.

Output a JSON object with:
- summary: overall review summary as markdown (string)
- items: array of findings, each with targetId (string), title (string), content (string), severity ("info"|"warning"|"critical")
- approved: boolean (false if any critical items)

Output ONLY the JSON object. No other text before or after.`,
    prompt: `Plan: ${planName}\n\n${itemsSummary}`,
  };
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
    return NextResponse.json({ error: "planId and type are required" }, { status: 400 });
  }

  const db = getDb();
  const plan = db.select().from(plans).where(eq(plans.id, planId)).get();
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  let itemsToReview: Array<{ id: string; title: string; content: string }>;

  if (type === "scheme") {
    itemsToReview = db
      .select()
      .from(schemes)
      .where(eq(schemes.planId, planId))
      .all()
      .map((s) => ({ id: s.id, title: s.title, content: s.content || "" }));
  } else {
    const schedule = db.select().from(schedules).where(eq(schedules.planId, planId)).get();
    if (!schedule) {
      return NextResponse.json({ error: "No schedule found" }, { status: 400 });
    }
    itemsToReview = db
      .select()
      .from(scheduleItems)
      .where(eq(scheduleItems.scheduleId, schedule.id))
      .all()
      .map((i) => ({
        id: i.id,
        title: i.title,
        content: `${i.description || ""}\n\n### Execution Log\n\`\`\`\n${i.executionLog || "No output"}\n\`\`\``,
      }));
  }

  if (itemsToReview.length === 0) {
    return NextResponse.json({ error: "Nothing to review" }, { status: 400 });
  }

  // Create review record immediately
  const reviewId = crypto.randomUUID();
  db.insert(reviews)
    .values({ id: reviewId, planId, type, status: "in_progress" })
    .run();

  const { system, prompt } = buildReviewPrompt(type, plan.name, itemsToReview);
  const aiModel = getConfiguredModel(provider || undefined, model);

  const result = streamText({ model: aiModel, system, prompt });

  const textStream = result.textStream;
  const encoder = new TextEncoder();
  let fullText = "";

  const responseStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of textStream) {
        fullText += chunk;
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();

      // Parse and save review
      try {
        const jsonStr = fullText.startsWith("{") ? fullText : fullText.match(/\{[\s\S]*\}/)?.[0];
        let parsed: any = null;
        try { if (jsonStr) parsed = JSON.parse(jsonStr); } catch {}

        const db = getDb();
        if (parsed) {
          const finalStatus = parsed.approved ? "approved" : "changes_requested";
          db.update(reviews)
            .set({ status: finalStatus, content: parsed.summary, updatedAt: new Date().toISOString() })
            .where(eq(reviews.id, reviewId))
            .run();

          for (const item of parsed.items || []) {
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

          if (type === "implementation" && parsed.approved) {
            db.update(plans)
              .set({ status: "testing", updatedAt: new Date().toISOString() })
              .where(eq(plans.id, planId))
              .run();
          }
        } else {
          db.update(reviews)
            .set({ status: "changes_requested", content: fullText.trim() || "Review completed.", updatedAt: new Date().toISOString() })
            .where(eq(reviews.id, reviewId))
            .run();
        }
      } catch (err) {
        console.error("[review-generate] save failed:", err);
      }
    },
  });

  return new Response(responseStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
