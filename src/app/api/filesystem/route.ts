import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

interface DirEntry {
  name: string;
  path: string;
  isGitRepo: boolean;
}

export async function GET(req: NextRequest) {
  const dirPath = req.nextUrl.searchParams.get("path") || os.homedir();
  const resolved = path.resolve(dirPath);

  try {
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      return NextResponse.json(
        { error: "Not a directory" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Directory not found" },
      { status: 404 }
    );
  }

  try {
    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    const dirs: DirEntry[] = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => {
        const fullPath = path.join(resolved, e.name);
        const isGitRepo = fs.existsSync(path.join(fullPath, ".git"));
        return { name: e.name, path: fullPath, isGitRepo };
      })
      .sort((a, b) => {
        // Git repos first, then alphabetical
        if (a.isGitRepo !== b.isGitRepo) return a.isGitRepo ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({
      current: resolved,
      parent: path.dirname(resolved),
      dirs,
    });
  } catch {
    return NextResponse.json(
      { error: "Cannot read directory" },
      { status: 500 }
    );
  }
}
