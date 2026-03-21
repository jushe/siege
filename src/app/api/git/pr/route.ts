import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { parseJsonBody } from "@/lib/utils";
import fs from "fs";

/** GET /api/git/pr?repoPath=xxx — check if current branch has a PR */
export async function GET(req: NextRequest) {
  const repoPath = req.nextUrl.searchParams.get("repoPath");
  if (!repoPath || !fs.existsSync(repoPath)) {
    return NextResponse.json({ hasPR: false });
  }

  try {
    const output = execSync(
      'gh pr view --json number,title,url,state,baseRefName,headRefName 2>/dev/null',
      { cwd: repoPath, encoding: "utf-8", timeout: 10000 }
    );
    const pr = JSON.parse(output);
    return NextResponse.json({ hasPR: true, pr });
  } catch {
    return NextResponse.json({ hasPR: false });
  }
}

/** POST /api/git/pr — create a pull request */
export async function POST(req: NextRequest) {
  const [body, errRes] = await parseJsonBody(req);
  if (errRes) return errRes;
  const { repoPath, title, body: prBody, baseBranch } = body as {
    repoPath: string;
    title: string;
    body?: string;
    baseBranch?: string;
  };

  if (!repoPath || !title) {
    return NextResponse.json({ error: "repoPath and title are required" }, { status: 400 });
  }

  if (!fs.existsSync(repoPath)) {
    return NextResponse.json({ error: "Repo not found" }, { status: 400 });
  }

  try {
    // Build gh pr create command
    let cmd = `gh pr create --title ${JSON.stringify(title)}`;
    if (prBody) cmd += ` --body ${JSON.stringify(prBody)}`;
    else cmd += ' --body ""';
    if (baseBranch) cmd += ` --base ${JSON.stringify(baseBranch)}`;

    const output = execSync(`${cmd} 2>&1`, {
      cwd: repoPath, encoding: "utf-8", timeout: 30000,
    });

    // gh pr create outputs the PR URL
    const url = output.trim().split("\n").pop() || "";
    const numberMatch = url.match(/\/pull\/(\d+)/);

    return NextResponse.json({
      success: true,
      url,
      number: numberMatch ? parseInt(numberMatch[1]) : null,
    });
  } catch (e) {
    const err = e as { stderr?: string; stdout?: string; message?: string };
    const msg = (err.stderr || err.stdout || err.message || "PR creation failed").trim();
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
