import { NextRequest, NextResponse } from "next/server";
import { scanAllSkills } from "@/lib/skills/registry";
import fs from "fs";

export async function GET() {
  const skills = scanAllSkills();

  const summary = skills.map((s) => ({
    name: s.name,
    source: s.source,
    description: s.description,
  }));

  return NextResponse.json(summary);
}

export async function DELETE(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const skills = scanAllSkills();
  const skill = skills.find((s) => s.name === name);
  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  try {
    fs.unlinkSync(skill.filePath);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
