import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe("Scheme Versions", () => {
  let sqlite: Database.Database;
  let db: ReturnType<typeof drizzle>;
  let projectId: string;
  let planId: string;
  let schemeId: string;

  beforeEach(() => {
    sqlite = new Database(":memory:");
    db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: "src/lib/db/migrations" });

    projectId = crypto.randomUUID();
    planId = crypto.randomUUID();
    schemeId = crypto.randomUUID();

    db.insert(schema.projects)
      .values({ id: projectId, name: "P", targetRepoPath: "/tmp" })
      .run();
    db.insert(schema.plans)
      .values({ id: planId, projectId, name: "Plan", status: "reviewing" })
      .run();
    db.insert(schema.schemes)
      .values({
        id: schemeId,
        planId,
        title: "API Design",
        content: "## v1\nOriginal content",
        sourceType: "manual",
      })
      .run();
  });

  afterEach(() => {
    sqlite.close();
  });

  it("should create a version snapshot", () => {
    const versionId = crypto.randomUUID();
    db.insert(schema.schemeVersions)
      .values({
        id: versionId,
        schemeId,
        version: 1,
        title: "API Design",
        content: "## v1\nOriginal content",
      })
      .run();

    const version = db
      .select()
      .from(schema.schemeVersions)
      .where(eq(schema.schemeVersions.id, versionId))
      .get();
    expect(version!.version).toBe(1);
    expect(version!.content).toContain("Original content");
  });

  it("should store multiple versions for a scheme", () => {
    db.insert(schema.schemeVersions)
      .values({
        id: crypto.randomUUID(),
        schemeId,
        version: 1,
        title: "API Design",
        content: "## v1\nOriginal",
      })
      .run();
    db.insert(schema.schemeVersions)
      .values({
        id: crypto.randomUUID(),
        schemeId,
        version: 2,
        title: "API Design v2",
        content: "## v2\nUpdated",
      })
      .run();

    const versions = db
      .select()
      .from(schema.schemeVersions)
      .where(eq(schema.schemeVersions.schemeId, schemeId))
      .all();
    expect(versions).toHaveLength(2);
  });

  it("should cascade delete versions when scheme is deleted", () => {
    db.insert(schema.schemeVersions)
      .values({
        id: crypto.randomUUID(),
        schemeId,
        version: 1,
        title: "T",
        content: "C",
      })
      .run();

    db.delete(schema.schemes).where(eq(schema.schemes.id, schemeId)).run();

    const versions = db
      .select()
      .from(schema.schemeVersions)
      .where(eq(schema.schemeVersions.schemeId, schemeId))
      .all();
    expect(versions).toHaveLength(0);
  });

  it("should order versions by version number", () => {
    for (let i = 1; i <= 3; i++) {
      db.insert(schema.schemeVersions)
        .values({
          id: crypto.randomUUID(),
          schemeId,
          version: i,
          title: `v${i}`,
          content: `Content ${i}`,
        })
        .run();
    }

    const versions = db
      .select()
      .from(schema.schemeVersions)
      .where(eq(schema.schemeVersions.schemeId, schemeId))
      .all()
      .sort((a, b) => a.version - b.version);

    expect(versions[0].version).toBe(1);
    expect(versions[2].version).toBe(3);
  });
});
