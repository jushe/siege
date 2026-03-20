import { NextRequest, NextResponse } from "next/server";
import { getConfiguredModel } from "@/lib/ai/config";
import { generateText } from "ai";
import type { Provider } from "@/lib/ai/provider";
import { parseJsonBody } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const [body, errRes] = await parseJsonBody(req);
  if (errRes) return errRes;
  const { provider } = body as { provider?: string };

  let model;
  try {
    model = getConfiguredModel(provider as Provider | undefined);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg });
  }

  try {
    const result = await generateText({
      model,
      prompt: "Respond with exactly: OK",
    });
    if (result.text) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: "Empty response" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg });
  }
}
