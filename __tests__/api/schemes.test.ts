import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe("Scheme CRUD logic", () => {
  let sqlite: Database.Database;
  let db: ReturnType<typeof drizzle>;
  let projectId: string;
  let planId: string;

  beforeEach(() => {
    sqlite = new Database(":memory:");
    db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: "src/lib/db/migrations" });

    projectId = crypto.randomUUID();
    planId = crypto.randomUUID();
    db.insert(schema.projects)
      .values({ id: projectId, name: "P", targetRepoPath: "/tmp" })
      .run();
    db.insert(schema.plans)
      .values({ id: planId, projectId, name: "Plan", status: "draft" })
      .run();
  });

  afterEach(() => {
    sqlite.close();
  });

  it("should create a manual scheme", () => {
    const schemeId = crypto.randomUUID();
    db.insert(schema.schemes)
      .values({
        id: schemeId,
        planId,
        title: "API Refactor",
        content: "## Plan\nRefactor REST endpoints",
        sourceType: "manual",
      })
      .run();

    const s = db
      .select()
      .from(schema.schemes)
      .where(eq(schema.schemes.id, schemeId))
      .get();
    expect(s!.title).toBe("API Refactor");
    expect(s!.sourceType).toBe("manual");
  });

  it("should update scheme content", () => {
    const schemeId = crypto.randomUUID();
    db.insert(schema.schemes)
      .values({ id: schemeId, planId, title: "S", content: "old", sourceType: "manual" })
      .run();

    db.update(schema.schemes)
      .set({ content: "## Updated\nNew content", updatedAt: new Date().toISOString() })
      .where(eq(schema.schemes.id, schemeId))
      .run();

    const s = db
      .select()
      .from(schema.schemes)
      .where(eq(schema.schemes.id, schemeId))
      .get();
    expect(s!.content).toBe("## Updated\nNew content");
  });

  it("should delete a scheme", () => {
    const schemeId = crypto.randomUUID();
    db.insert(schema.schemes)
      .values({ id: schemeId, planId, title: "S", content: "", sourceType: "manual" })
      .run();

    db.delete(schema.schemes)
      .where(eq(schema.schemes.id, schemeId))
      .run();

    const s = db
      .select()
      .from(schema.schemes)
      .where(eq(schema.schemes.id, schemeId))
      .get();
    expect(s).toBeUndefined();
  });

  it("should cascade delete schemes when plan is deleted", () => {
    db.insert(schema.schemes)
      .values({
        id: crypto.randomUUID(),
        planId,
        title: "S1",
        content: "",
        sourceType: "manual",
      })
      .run();
    db.insert(schema.schemes)
      .values({
        id: crypto.randomUUID(),
        planId,
        title: "S2",
        content: "",
        sourceType: "manual",
      })
      .run();

    db.delete(schema.plans).where(eq(schema.plans.id, planId)).run();

    const schemes = db
      .select()
      .from(schema.schemes)
      .where(eq(schema.schemes.planId, planId))
      .all();
    expect(schemes).toHaveLength(0);
  });
});
