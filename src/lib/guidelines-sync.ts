import fs from "fs";
import path from "path";

const SIEGE_MARKER_START = "<!-- siege:guidelines -->";
const SIEGE_MARKER_END = "<!-- /siege:guidelines -->";

/**
 * Build the guidelines section to inject into CLAUDE.md / AGENTS.md.
 */
function buildGuidelinesSection(projectName: string, guidelines: string): string {
  return `${SIEGE_MARKER_START}
## Project Guidelines (managed by Siege)

**Project:** ${projectName}

${guidelines}
${SIEGE_MARKER_END}`;
}

/**
 * Replace or append the Siege guidelines section in a file.
 * If the file already has a Siege section (between markers), replace it.
 * Otherwise append at the end.
 */
function upsertSection(filePath: string, section: string): void {
  let content = "";
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, "utf-8");
  }

  const startIdx = content.indexOf(SIEGE_MARKER_START);
  const endIdx = content.indexOf(SIEGE_MARKER_END);

  if (startIdx >= 0 && endIdx >= 0) {
    // Replace existing section
    content =
      content.slice(0, startIdx) +
      section +
      content.slice(endIdx + SIEGE_MARKER_END.length);
  } else {
    // Append
    if (content && !content.endsWith("\n")) content += "\n";
    content += "\n" + section + "\n";
  }

  fs.writeFileSync(filePath, content.trim() + "\n", "utf-8");
}

/**
 * Sync project guidelines to CLAUDE.md and AGENTS.md in the target repo.
 * Creates the files if they don't exist. Uses HTML comment markers so
 * Siege-managed section can be updated without touching user content.
 */
export function syncGuidelinesToFiles(
  repoPath: string,
  projectName: string,
  guidelines: string
): void {
  if (!fs.existsSync(repoPath)) return;
  if (!guidelines.trim()) return;

  const section = buildGuidelinesSection(projectName, guidelines);

  try {
    // CLAUDE.md
    upsertSection(path.join(repoPath, "CLAUDE.md"), section);
    console.log(`[guidelines-sync] Updated CLAUDE.md in ${repoPath}`);
  } catch (err) {
    console.error(`[guidelines-sync] Failed to write CLAUDE.md:`, err);
  }

  try {
    // AGENTS.md (Codex)
    upsertSection(path.join(repoPath, "AGENTS.md"), section);
    console.log(`[guidelines-sync] Updated AGENTS.md in ${repoPath}`);
  } catch (err) {
    console.error(`[guidelines-sync] Failed to write AGENTS.md:`, err);
  }
}
