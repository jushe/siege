import { NextResponse } from "next/server";
import { scanAllSkills } from "@/lib/skills/registry";

export async function GET() {
  const skills = scanAllSkills();

  // Return without full content (too large for listing)
  const summary = skills.map((s) => ({
    name: s.name,
    source: s.source,
    description: s.description,
  }));

  return NextResponse.json(summary);
}
