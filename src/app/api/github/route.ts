import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";

interface GitHubRepo {
  name: string;
  fullName: string;
  description: string;
  cloneUrl: string;
  isPrivate: boolean;
  language: string;
  updatedAt: string;
}

// GET: list GitHub repos via gh CLI
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  const limit = req.nextUrl.searchParams.get("limit") || "20";

  try {
    // Check if gh is available and authenticated
    execSync("gh auth status", { stdio: "pipe" });
  } catch {
    return NextResponse.json(
      { error: "GitHub CLI not installed or not authenticated. Run 'gh auth login' first." },
      { status: 503 }
    );
  }

  try {
    let cmd: string;
    if (query) {
      cmd = `gh search repos "${query}" --owner @me --limit ${limit} --json name,fullName,description,url,isPrivate,primaryLanguage,updatedAt`;
    } else {
      cmd = `gh repo list --limit ${limit} --json name,description,url,isPrivate,primaryLanguage,updatedAt,nameWithOwner`;
    }

    const output = execSync(cmd, { encoding: "utf-8", timeout: 15000 });
    const repos = JSON.parse(output);

    const result: GitHubRepo[] = repos.map((r: any) => ({
      name: r.name,
      fullName: r.fullName || r.nameWithOwner,
      description: r.description || "",
      cloneUrl: r.url,
      isPrivate: r.isPrivate,
      language: r.primaryLanguage?.name || "",
      updatedAt: r.updatedAt,
    }));

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to list repos: ${err instanceof Error ? err.message : err}` },
      { status: 500 }
    );
  }
}

// POST: clone a GitHub repo
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { repoUrl, targetDir } = body;

  if (!repoUrl) {
    return NextResponse.json(
      { error: "repoUrl is required" },
      { status: 400 }
    );
  }

  // Default target: ~/projects/<repo-name>
  const repoName = repoUrl.split("/").pop()?.replace(".git", "") || "repo";
  const cloneTarget = targetDir || path.join(os.homedir(), "projects", repoName);

  if (fs.existsSync(cloneTarget)) {
    return NextResponse.json({ path: cloneTarget, alreadyExists: true });
  }

  try {
    fs.mkdirSync(path.dirname(cloneTarget), { recursive: true });
    execSync(`gh repo clone "${repoUrl}" "${cloneTarget}"`, {
      encoding: "utf-8",
      timeout: 120000,
    });

    return NextResponse.json({ path: cloneTarget, alreadyExists: false }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: `Clone failed: ${err instanceof Error ? err.message : err}` },
      { status: 500 }
    );
  }
}
