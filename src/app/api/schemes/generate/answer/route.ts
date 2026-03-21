import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/ai/interactive-session";
import { parseJsonBody } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const [body, errRes] = await parseJsonBody(req);
  if (errRes) return errRes;

  const { generationId, questionId, answer } = body as {
    generationId: string;
    questionId: string;
    answer: string;
  };

  if (!generationId || !questionId || !answer) {
    return NextResponse.json(
      { error: "generationId, questionId, and answer are required" },
      { status: 400 }
    );
  }

  const session = getSession(generationId);
  if (!session) {
    return NextResponse.json(
      { error: "Session not found or expired" },
      { status: 404 }
    );
  }

  const submitted = session.submitAnswer(questionId, answer);
  if (!submitted) {
    // Already answered or not waiting — idempotent success
    return NextResponse.json({ ok: true, alreadyAnswered: true });
  }

  return NextResponse.json({ ok: true });
}
