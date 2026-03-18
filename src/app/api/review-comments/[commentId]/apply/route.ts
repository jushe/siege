import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  reviewComments,
  reviews,
  plans,
  projects,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await params;

  const db = getDb();

  const comment = db
    .select()
    .from(reviewComments)
    .where(eq(reviewComments.id, commentId))
    .get();

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  if (!comment.aiResponse) {
    return NextResponse.json(
      { error: "No AI response available to apply" },
      { status: 400 }
    );
  }

  // Load review -> plan -> project to get targetRepoPath
  const review = db.select().from(reviews).where(eq(reviews.id, comment.reviewId)).get();
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  const plan = db.select().from(plans).where(eq(plans.id, review.planId)).get();
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const project = db.select().from(projects).where(eq(projects.id, plan.projectId)).get();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const fullPath = path.join(project.targetRepoPath, comment.filePath);

  const aiText = comment.aiResponse.trim();
  const looksLikeCode =
    aiText.includes("\n") ||
    aiText.includes("{") ||
    aiText.includes("function") ||
    aiText.includes("import") ||
    aiText.includes("const ") ||
    aiText.includes("let ") ||
    aiText.startsWith("```");

  if (!looksLikeCode) {
    db.update(reviewComments)
      .set({ status: "applied" })
      .where(eq(reviewComments.id, commentId))
      .run();

    return NextResponse.json({
      success: true,
      applied: false,
      message: "The AI response does not appear to be a direct code replacement. Manual application is needed.",
      aiResponse: comment.aiResponse,
    });
  }

  try {
    let codeToWrite = aiText;
    const codeBlockMatch = aiText.match(/```[\w]*\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      codeToWrite = codeBlockMatch[1].trimEnd();
    }

    fs.writeFileSync(fullPath, codeToWrite, "utf-8");

    db.update(reviewComments)
      .set({ status: "applied" })
      .where(eq(reviewComments.id, commentId))
      .run();

    return NextResponse.json({
      success: true,
      applied: true,
      message: "AI suggestion applied to file.",
    });
  } catch (err) {
    console.error("[review-comments/apply] Failed to write file:", err);
    return NextResponse.json(
      { error: "Failed to write file", details: String(err) },
      { status: 500 }
    );
  }
}
