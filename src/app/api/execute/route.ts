import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  scheduleItems,
  schedules,
  plans,
  projects,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getConfiguredModel } from "@/lib/ai/config";
import { streamText } from "ai";
import { scanAllSkills, getSkillContent } from "@/lib/skills/registry";
import { parseJsonBody } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const [body, errRes] = await parseJsonBody(req);
  if (errRes) return errRes;
  const { itemId } = body as { itemId: string };

  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  const db = getDb();
  const item = db.select().from(scheduleItems).where(eq(scheduleItems.id, itemId)).get();
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const schedule = db.select().from(schedules).where(eq(schedules.id, item.scheduleId)).get();
  if (!schedule) return NextResponse.json({ error: "Schedule not found" }, { status: 404 });

  const plan = db.select().from(plans).where(eq(plans.id, schedule.planId)).get();
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const project = db.select().from(projects).where(eq(projects.id, plan.projectId)).get();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Get skills
  const skillNames: string[] = JSON.parse(item.skills || "[]");
  let skillsContent = "";
  if (skillNames.length > 0) {
    const allSkills = scanAllSkills();
    skillsContent = getSkillContent(allSkills, skillNames);
  }

  // Update status
  db.update(scheduleItems)
    .set({ status: "in_progress", progress: 0 })
    .where(eq(scheduleItems.id, itemId))
    .run();

  if (plan.status === "scheduled") {
    db.update(plans)
      .set({ status: "executing", updatedAt: new Date().toISOString() })
      .where(eq(plans.id, plan.id))
      .run();
  }

  // Build prompt
  const taskPrompt = `<IMPORTANT>
You are being called as an API to implement a development task.
Do NOT ask questions. Do NOT request permissions.
Describe what changes you would make, with exact file paths and code.
Output Markdown with code blocks.
</IMPORTANT>

Project: ${project.name}
Repository: ${project.targetRepoPath}

Task: ${item.title}
${item.description || ""}

${skillsContent ? `\nSkills context:\n${skillsContent}` : ""}

Implement this task. Show the exact code changes needed.`;

  const model = getConfiguredModel();
  const result = streamText({ model, prompt: taskPrompt });

  const textStream = result.textStream;
  const encoder = new TextEncoder();
  let fullText = "";

  const responseStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of textStream) {
        fullText += chunk;
        controller.enqueue(encoder.encode(chunk));
      }

      // Save execution log and update status
      const db = getDb();
      db.update(scheduleItems)
        .set({
          status: "completed",
          progress: 100,
          executionLog: fullText,
        })
        .where(eq(scheduleItems.id, itemId))
        .run();

      controller.close();
    },
  });

  return new Response(responseStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
