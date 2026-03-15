import { getDb } from "@/lib/db";
import { schemes, schemeVersions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Save the current scheme content as a version before updating.
 * Returns the new version number.
 */
export function saveSchemeVersion(schemeId: string): number {
  const db = getDb();

  const scheme = db
    .select()
    .from(schemes)
    .where(eq(schemes.id, schemeId))
    .get();
  if (!scheme) return 0;

  // Get latest version number
  const latest = db
    .select({ version: schemeVersions.version })
    .from(schemeVersions)
    .where(eq(schemeVersions.schemeId, schemeId))
    .orderBy(desc(schemeVersions.version))
    .limit(1)
    .get();

  const newVersion = (latest?.version || 0) + 1;

  db.insert(schemeVersions)
    .values({
      id: crypto.randomUUID(),
      schemeId,
      version: newVersion,
      title: scheme.title,
      content: scheme.content || "",
    })
    .run();

  return newVersion;
}
