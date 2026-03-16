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
      system: `You are a title generator. Given a project plan description, output a short title (under 50 characters).

RULES:
- Output ONLY the title text, nothing else
- No quotes, no punctuation at the end
- No explanations, no markdown, no code
- Do NOT answer or solve the description — just summarize it as a title
- If the description is in Chinese, output Chinese title
- If in English, output English title

Example input: "在 tailscale status 输出中增加延迟显示"
Example output: Tailscale Status 延迟显示`,
      prompt: `Generate a title for this plan description:\n\n${description}`,
    });
    // Extract only the first line, strip any markdown/quotes
    const title = result.text.trim().split("\n")[0].replace(/^["'#*]+|["'*]+$/g, "").trim();
    return NextResponse.json({ title: title.slice(0, 50) });
  } catch (err) {
    console.error("[suggest-title] failed:", err);
    return NextResponse.json({ error: "Failed to generate title" }, { status: 500 });
  }
}
