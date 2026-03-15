import fs from "fs";
import path from "path";

export interface SkillInfo {
  name: string;
  source: string;
  description: string;
  filePath: string;
  content: string;
}

function parseFrontmatter(content: string): {
  name?: string;
  description?: string;
  [key: string]: string | undefined;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontmatter: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      frontmatter[key] = value;
    }
  }
  return frontmatter;
}

function scanSkillDirectory(
  dirPath: string,
  source: string
): SkillInfo[] {
  const skills: SkillInfo[] = [];

  if (!fs.existsSync(dirPath)) return skills;

  const entries = fs.readdirSync(dirPath, { recursive: true });
  for (const entry of entries) {
    const entryStr = typeof entry === "string" ? entry : entry.toString();
    if (!entryStr.endsWith(".md")) continue;

    const filePath = path.join(dirPath, entryStr);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;

    const content = fs.readFileSync(filePath, "utf-8");
    const frontmatter = parseFrontmatter(content);

    const name =
      frontmatter.name || path.basename(filePath, ".md");
    const description = frontmatter.description || "";

    skills.push({
      name: `${source}:${name}`,
      source,
      description,
      filePath,
      content,
    });
  }

  return skills;
}

export function scanAllSkills(): SkillInfo[] {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const skillsBaseDir = path.join(homeDir, ".claude", "skills");

  const skills: SkillInfo[] = [];

  if (!fs.existsSync(skillsBaseDir)) return skills;

  // Scan top-level directories as sources
  const entries = fs.readdirSync(skillsBaseDir);
  for (const entry of entries) {
    const entryPath = path.join(skillsBaseDir, entry);
    const stat = fs.statSync(entryPath);

    if (stat.isDirectory()) {
      skills.push(...scanSkillDirectory(entryPath, entry));
    } else if (stat.isFile() && entry.endsWith(".md")) {
      const content = fs.readFileSync(entryPath, "utf-8");
      const frontmatter = parseFrontmatter(content);
      skills.push({
        name: frontmatter.name || path.basename(entry, ".md"),
        source: "custom",
        description: frontmatter.description || "",
        filePath: entryPath,
        content,
      });
    }
  }

  return skills;
}

export function getSkillContent(skills: SkillInfo[], names: string[]): string {
  return skills
    .filter((s) => names.includes(s.name))
    .map((s) => `## Skill: ${s.name}\n\n${s.content}`)
    .join("\n\n---\n\n");
}
