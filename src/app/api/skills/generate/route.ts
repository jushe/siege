import { NextRequest, NextResponse } from "next/server";
import { getConfiguredModel, hasApiKey } from "@/lib/ai/config";
import { generateText } from "ai";
import { AcpClient } from "@/lib/acp/client";
import { parseJsonBody } from "@/lib/utils";
import { getDb } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

const SYSTEM_PROMPT = `You are a skill file generator for an AI coding assistant.
Given a user's description, generate a SKILL.md file in markdown format with YAML frontmatter.

The file MUST start with:
---
name: <short-kebab-case-name>
description: <one-line description>
---

Then provide the skill content as markdown. The content should be instructions, rules, patterns, or knowledge that an AI coding assistant can use when working on tasks.

Output ONLY the file content. No explanation, no code fences wrapping the whole thing.`;

function getDefaultProvider(): string {
  const db = getDb();
  const s = db.select().from(appSettings).where(eq(appSettings.key, "default_provider")).get();
  return s?.value || "anthropic";
}

function saveSkillFile(text: string): { name: string; fileName: string; filePath: string } {
  const nameMatch = text.match(/^---\n[\s\S]*?name:\s*(.+)\n[\s\S]*?---/);
  const skillName = nameMatch?.[1]?.trim() || `skill-${Date.now()}`;
  const fileName = `${skillName.replace(/[^a-zA-Z0-9-_]/g, "-")}.md`;

  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const skillsDir = path.join(homeDir, ".claude", "skills");
  if (!fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });
  }

  const filePath = path.join(skillsDir, fileName);
  fs.writeFileSync(filePath, text, "utf-8");

  return { name: skillName, fileName, filePath };
}

export async function POST(req: NextRequest) {
  const [body, errRes] = await parseJsonBody(req);
  if (errRes) return errRes;

  const { prompt } = body as { prompt: string };
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const provider = getDefaultProvider();

  try {
    let text: string;

    if (provider === "acp") {
      // Use ACP
      const acpClient = new AcpClient(process.cwd());
      await acpClient.start();
      const session = await acpClient.createSession();
      let result = "";
      await acpClient.prompt(session.sessionId, `${SYSTEM_PROMPT}\n\n${prompt}`, (type, t) => {
        if (type === "text") result += t;
      });
      await acpClient.stop();
      text = result;
    } else {
      // Use SDK
      const model = getConfiguredModel();
      const { text: t } = await generateText({ model, system: SYSTEM_PROMPT, prompt });
      text = t;
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "AI returned empty response" }, { status: 500 });
    }

    const { name, fileName, filePath } = saveSkillFile(text);

    return NextResponse.json({ success: true, name, fileName, filePath, content: text });
  } catch (err) {
    console.error("[skills/generate] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
