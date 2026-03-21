import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { parseJsonBody } from "@/lib/utils";
import fs from "fs";

export async function POST(req: NextRequest) {
  const [body, errRes] = await parseJsonBody(req);
  if (errRes) return errRes;
  const { repoPath } = body as { repoPath: string };

  if (!repoPath || !fs.existsSync(repoPath)) {
    return NextResponse.json({ error: "Invalid repo path" }, { status: 400 });
  }

  try {
    // Get current branch
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: repoPath, encoding: "utf-8", timeout: 5000,
    }).trim();

    // Push with upstream tracking
    const output = execSync(`git push -u origin ${branch} 2>&1`, {
      cwd: repoPath, encoding: "utf-8", timeout: 30000,
    });

    return NextResponse.json({ success: true, branch, output: output.trim() });
  } catch (e) {
    const err = e as { stderr?: string; stdout?: string; message?: string };
    const msg = (err.stderr || err.stdout || err.message || "Push failed").trim();
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
