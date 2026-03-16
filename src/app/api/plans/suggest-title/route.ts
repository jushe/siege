import { NextRequest, NextResponse } from "next/server";
import { getConfiguredModel } from "@/lib/ai/config";
import { parseJsonBody } from "@/lib/utils";
import { generateText } from "ai";

export async function POST(req: NextRequest) {
  const [body, errRes] = await parseJsonBody(req);
  if (errRes) return errRes;
  const { description } = body;

  if (!description || description.trim().length < 5) {
    return NextResponse.json(
      { error: "description must be at least 5 characters" },
      { status: 400 }
    );
  }

  try {
    const model = getConfiguredModel();
    const result = await generateText({
      model,
      system: "Generate a concise plan title (under 50 characters). Output ONLY the title, nothing else. No quotes.",
      prompt: description,
    });
    return NextResponse.json({ title: result.text.trim() });
  } catch (err) {
    console.error("[suggest-title] failed:", err);
    return NextResponse.json({ error: "Failed to generate title" }, { status: 500 });
  }
}
