import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { getModelId } from "@/lib/ai/provider";
import { getDb } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { description } = body;

  if (!description || description.trim().length < 5) {
    return NextResponse.json(
      { error: "description must be at least 5 characters" },
      { status: 400 }
    );
  }

  const db = getDb();
  const providerSetting = db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, "default_provider"))
    .get();
  const provider = (providerSetting?.value || "anthropic") as "anthropic" | "openai";

  const modelId = getModelId(provider);

  const result = await generateText({
    model: modelId,
    system:
      "Generate a concise plan title (under 50 characters) from the given description. Output ONLY the title, nothing else. No quotes, no punctuation at the end.",
    prompt: description,
  });

  return NextResponse.json({ title: result.text.trim() });
}
