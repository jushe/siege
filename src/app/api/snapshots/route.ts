import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { plans, projects, schedules, scheduleItems, fileSnapshots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

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

  // Try DB snapshots first (grouped by task)
  const schedule = db.select().from(schedules).where(eq(schedules.planId, planId)).get();
  if (schedule) {
    const items = db.select().from(scheduleItems)
      .where(eq(scheduleItems.scheduleId, schedule.id))
      .all()
      .sort((a, b) => a.order - b.order);

    const dbSnapshots: Array<{
      filePath: string;
      contentBefore: string;
      contentAfter: string;
      scheduleItemId: string;
      taskTitle: string;
      taskOrder: number;
    }> = [];

    for (const item of items) {
      const snaps = db.select().from(fileSnapshots)
        .where(eq(fileSnapshots.scheduleItemId, item.id))
        .all();
      for (const snap of snaps) {
        dbSnapshots.push({
          filePath: snap.filePath,
          contentBefore: snap.contentBefore || "",
          contentAfter: snap.contentAfter || "",
          scheduleItemId: item.id,
          taskTitle: item.title,
          taskOrder: item.order,
        });
      }
    }

    if (dbSnapshots.length > 0) {
      return NextResponse.json(dbSnapshots);
    }
  }

  // Fallback: live git diff (no task association)
  if (!fs.existsSync(project.targetRepoPath)) {
    return NextResponse.json([]);
  }

  const files = getGitDiffFiles(project.targetRepoPath);
  return NextResponse.json(files);
}

interface GitFileEntry {
  filePath: string;
  contentBefore: string;
  contentAfter: string;
}

function getGitDiffFiles(repoPath: string): GitFileEntry[] {
  const results: GitFileEntry[] = [];
  try {
    const output = execSync("git diff HEAD --name-status", {
      cwd: repoPath, encoding: "utf-8", timeout: 10000,
    }).trim();

    const untrackedOutput = execSync("git ls-files --others --exclude-standard", {
      cwd: repoPath, encoding: "utf-8", timeout: 10000,
    }).trim();

    const processedFiles = new Set<string>();

    if (output) {
      for (const line of output.split("\n")) {
        const match = line.match(/^([MADRC])\t(.+)$/);
        if (!match) continue;
        const [, status, filePath] = match;
        if (isBinaryPath(filePath)) continue;
        processedFiles.add(filePath);

        let contentBefore = "";
        let contentAfter = "";

        if (status === "D") {
          try { contentBefore = execSync(`git show HEAD:${esc(filePath)}`, { cwd: repoPath, encoding: "utf-8", timeout: 5000 }); } catch {}
        } else if (status === "A") {
          try { contentAfter = fs.readFileSync(path.join(repoPath, filePath), "utf-8"); } catch {}
        } else {
          try { contentBefore = execSync(`git show HEAD:${esc(filePath)}`, { cwd: repoPath, encoding: "utf-8", timeout: 5000 }); } catch {}
          try { contentAfter = fs.readFileSync(path.join(repoPath, filePath), "utf-8"); } catch {}
        }
        results.push({ filePath, contentBefore, contentAfter });
      }
    }

    if (untrackedOutput) {
      for (const filePath of untrackedOutput.split("\n")) {
        if (!filePath || processedFiles.has(filePath) || isBinaryPath(filePath)) continue;
        try {
          const contentAfter = fs.readFileSync(path.join(repoPath, filePath), "utf-8");
          results.push({ filePath, contentBefore: "", contentAfter });
        } catch {}
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

function esc(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}
