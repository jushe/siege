import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  scheduleItems,
  schedules,
  plans,
  projects,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { executeTask, type ExecutionProgress } from "@/lib/cli/runner";
import { scanAllSkills, getSkillContent } from "@/lib/skills/registry";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { itemId } = body as { itemId: string };

  if (!itemId) {
    return NextResponse.json(
      { error: "itemId is required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const item = db
    .select()
    .from(scheduleItems)
    .where(eq(scheduleItems.id, itemId))
    .get();

  if (!item) {
    return NextResponse.json(
      { error: "Schedule item not found" },
      { status: 404 }
    );
  }

  // Get project info for cwd
  const schedule = db
    .select()
    .from(schedules)
    .where(eq(schedules.id, item.scheduleId))
    .get();
  if (!schedule) {
    return NextResponse.json(
      { error: "Schedule not found" },
      { status: 404 }
    );
  }

  const plan = db
    .select()
    .from(plans)
    .where(eq(plans.id, schedule.planId))
    .get();
  if (!plan) {
    return NextResponse.json(
      { error: "Plan not found" },
      { status: 404 }
    );
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

  // Get skills content
  const skillNames: string[] = JSON.parse(item.skills || "[]");
  let skillsContent = "";
  if (skillNames.length > 0) {
    const allSkills = scanAllSkills();
    skillsContent = getSkillContent(allSkills, skillNames);
  }

  // Update item status
  db.update(scheduleItems)
    .set({ status: "in_progress", progress: 0 })
    .where(eq(scheduleItems.id, itemId))
    .run();

  // Update plan status if needed
  if (plan.status === "scheduled") {
    db.update(plans)
      .set({ status: "executing", updatedAt: new Date().toISOString() })
      .where(eq(plans.id, plan.id))
      .run();
  }

  const engine = (item.engine || "claude-code") as "claude-code" | "codex";

  // Start execution with SSE
  const emitter = executeTask(itemId, {
    engine,
    prompt: `${item.title}\n\n${item.description || ""}`,
    cwd: project.targetRepoPath,
    skillsContent,
  });

  const encoder = new TextEncoder();
  let executionLog = "";

  const stream = new ReadableStream({
    start(controller) {
      const onProgress = (progress: ExecutionProgress) => {
        executionLog += progress.data + "\n";

        const sseData = `data: ${JSON.stringify(progress)}\n\n`;
        controller.enqueue(encoder.encode(sseData));

        if (progress.type === "done") {
          // Update DB with final log
          const finalStatus = progress.data.includes("code 0")
            ? "completed"
            : "failed";
          db.update(scheduleItems)
            .set({
              status: finalStatus,
              progress: finalStatus === "completed" ? 100 : item.progress,
              executionLog,
            })
            .where(eq(scheduleItems.id, itemId))
            .run();

          controller.close();
          emitter.removeListener("progress", onProgress);
        }
      };

      emitter.on("progress", onProgress);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
