import { NextResponse } from "next/server";
import { execSync } from "child_process";

// GET: check GitHub auth status
export async function GET() {
  try {
    execSync("which gh", { encoding: "utf-8", timeout: 3000 });
  } catch {
    return NextResponse.json({ authenticated: false, ghInstalled: false, username: "" });
  }

  try {
    const output = execSync("gh auth status 2>&1", {
      encoding: "utf-8",
      timeout: 5000,
    });
    const userMatch = output.match(/Logged in to github\.com account (\S+)/);
    return NextResponse.json({
      authenticated: true,
      ghInstalled: true,
      username: userMatch?.[1] || "",
    });
  } catch {
    return NextResponse.json({ authenticated: false, ghInstalled: true, username: "" });
  }
}
