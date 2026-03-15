import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ENV_FILE = path.join(process.cwd(), ".env.local");

interface AiConfigStatus {
  anthropic: { configured: boolean; masked: string };
  openai: { configured: boolean; masked: string };
}

function maskKey(key: string | undefined): string {
  if (!key) return "";
  if (key.length <= 8) return "***";
  return key.slice(0, 4) + "***" + key.slice(-4);
}

// GET: check which AI providers have keys configured
export async function GET() {
  const status: AiConfigStatus = {
    anthropic: {
      configured: !!process.env.ANTHROPIC_API_KEY,
      masked: maskKey(process.env.ANTHROPIC_API_KEY),
    },
    openai: {
      configured: !!process.env.OPENAI_API_KEY,
      masked: maskKey(process.env.OPENAI_API_KEY),
    },
  };

  return NextResponse.json(status);
}

// POST: save API keys
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { anthropicKey, openaiKey } = body as {
    anthropicKey?: string;
    openaiKey?: string;
  };

  if (!anthropicKey && !openaiKey) {
    return NextResponse.json(
      { error: "At least one API key is required" },
      { status: 400 }
    );
  }

  // Read existing .env.local
  let envContent = "";
  try {
    envContent = fs.readFileSync(ENV_FILE, "utf-8");
  } catch {
    // File doesn't exist yet
  }

  // Parse existing env vars
  const envLines = envContent.split("\n").filter((l) => l.trim());
  const envMap = new Map<string, string>();
  for (const line of envLines) {
    const eqIdx = line.indexOf("=");
    if (eqIdx > 0) {
      envMap.set(line.slice(0, eqIdx), line.slice(eqIdx + 1));
    }
  }

  // Update keys
  if (anthropicKey) {
    envMap.set("ANTHROPIC_API_KEY", anthropicKey);
    process.env.ANTHROPIC_API_KEY = anthropicKey;
  }
  if (openaiKey) {
    envMap.set("OPENAI_API_KEY", openaiKey);
    process.env.OPENAI_API_KEY = openaiKey;
  }

  // Write back
  const newContent =
    Array.from(envMap.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") + "\n";

  fs.writeFileSync(ENV_FILE, newContent, "utf-8");

  return NextResponse.json({
    anthropic: { configured: !!process.env.ANTHROPIC_API_KEY },
    openai: { configured: !!process.env.OPENAI_API_KEY },
  });
}
