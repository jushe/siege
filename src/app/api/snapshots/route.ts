import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { plans, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

interface GitFileEntry {
  filePath: string;
  contentBefore: string;
  contentAfter: string;
}

function getGitDiffFiles(repoPath: string): GitFileEntry[] {
  const results: GitFileEntry[] = [];

  try {
    // Get list of changed files (staged + unstaged) vs HEAD
    // --name-status gives us the status (M=modified, A=added, D=deleted) and file path
    const output = execSync("git diff HEAD --name-status", {
      cwd: repoPath,
      encoding: "utf-8",
      timeout: 10000,
    }).trim();

    // Also get untracked files
    const untrackedOutput = execSync("git ls-files --others --exclude-standard", {
      cwd: repoPath,
      encoding: "utf-8",
      timeout: 10000,
    }).trim();

    const processedFiles = new Set<string>();

    // Process tracked changes
    if (output) {
      for (const line of output.split("\n")) {
        const match = line.match(/^([MADRC])\t(.+)$/);
        if (!match) continue;
        const [, status, filePath] = match;

        // Skip binary / non-text files
        if (isBinaryPath(filePath)) continue;
        processedFiles.add(filePath);

        let contentBefore = "";
        let contentAfter = "";

        if (status === "D") {
          // Deleted file
          try {
            contentBefore = execSync(`git show HEAD:${escapeShellArg(filePath)}`, {
              cwd: repoPath, encoding: "utf-8", timeout: 5000,
            });
          } catch { /* empty */ }
        } else if (status === "A") {
          // Added file (tracked)
          try {
            contentAfter = fs.readFileSync(path.join(repoPath, filePath), "utf-8");
          } catch { /* empty */ }
        } else {
          // Modified
          try {
            contentBefore = execSync(`git show HEAD:${escapeShellArg(filePath)}`, {
              cwd: repoPath, encoding: "utf-8", timeout: 5000,
            });
          } catch { /* empty */ }
          try {
            contentAfter = fs.readFileSync(path.join(repoPath, filePath), "utf-8");
          } catch { /* empty */ }
        }

        results.push({ filePath, contentBefore, contentAfter });
      }
    }

    // Process untracked files (new files not yet staged)
    if (untrackedOutput) {
      for (const filePath of untrackedOutput.split("\n")) {
        if (!filePath || processedFiles.has(filePath) || isBinaryPath(filePath)) continue;
        try {
          const contentAfter = fs.readFileSync(path.join(repoPath, filePath), "utf-8");
          results.push({ filePath, contentBefore: "", contentAfter });
        } catch { /* skip unreadable */ }
      }
    }
  } catch (e) {
    console.error("[snapshots] git diff failed:", e);
  }

  return results;
}

function isBinaryPath(filePath: string): boolean {
  const binaryExts = new Set([
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp",
    ".woff", ".woff2", ".ttf", ".eot", ".otf",
    ".zip", ".tar", ".gz", ".bz2",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx",
    ".exe", ".dll", ".so", ".dylib",
    ".db", ".sqlite",
  ]);
  return binaryExts.has(path.extname(filePath).toLowerCase());
}

function escapeShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

export async function GET(req: NextRequest) {
  const planId = req.nextUrl.searchParams.get("planId");

  if (!planId) {
    return NextResponse.json({ error: "planId is required" }, { status: 400 });
  }

  const db = getDb();
  const plan = db.select().from(plans).where(eq(plans.id, planId)).get();
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const project = db.select().from(projects).where(eq(projects.id, plan.projectId)).get();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!fs.existsSync(project.targetRepoPath)) {
    return NextResponse.json([]);
  }

  const files = getGitDiffFiles(project.targetRepoPath);
  return NextResponse.json(files);
}
