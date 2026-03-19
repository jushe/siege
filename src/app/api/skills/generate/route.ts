import { NextRequest, NextResponse } from "next/server";
import { getConfiguredModel } from "@/lib/ai/config";
import { generateText } from "ai";
import { parseJsonBody } from "@/lib/utils";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  const [body, errRes] = await parseJsonBody(req);
  if (errRes) return errRes;

  const { prompt } = body as { prompt: string };
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const model = getConfiguredModel();

  const { text } = await generateText({
    model,
    system: `You are a skill file generator for an AI coding assistant.
Given a user's description, generate a SKILL.md file in markdown format with YAML frontmatter.

The file MUST start with:
---
name: <short-kebab-case-name>
description: <one-line description>
---

Then provide the skill content as markdown. The content should be instructions, rules, patterns, or knowledge that an AI coding assistant can use when working on tasks.

Output ONLY the file content. No explanation, no code fences wrapping the whole thing.`,
    prompt,
  });

  // Extract name from frontmatter
  const nameMatch = text.match(/^---\n[\s\S]*?name:\s*(.+)\n[\s\S]*?---/);
  const skillName = nameMatch?.[1]?.trim() || `skill-${Date.now()}`;
  const fileName = `${skillName.replace(/[^a-zA-Z0-9-_]/g, "-")}.md`;

  // Save to ~/.claude/skills/
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const skillsDir = path.join(homeDir, ".claude", "skills");
  if (!fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });
  }

  const filePath = path.join(skillsDir, fileName);
  fs.writeFileSync(filePath, text, "utf-8");

  return NextResponse.json({
    success: true,
    name: skillName,
    fileName,
    filePath,
    content: text,
  });
}
