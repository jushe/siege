import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";

describe("Plan Folders", () => {
  let sqlite: Database.Database;
  let db: ReturnType<typeof drizzle>;
  let projectId: string;

  beforeEach(() => {
    sqlite = new Database(":memory:");
    db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: "src/lib/db/migrations" });

    projectId = crypto.randomUUID();
    db.insert(schema.projects)
      .values({ id: projectId, name: "P", targetRepoPath: "/tmp" })
      .run();
  });

  afterEach(() => {
    sqlite.close();
  });

  it("should create a root folder", () => {
    const folderId = crypto.randomUUID();
    db.insert(schema.planFolders)
      .values({ id: folderId, projectId, name: "Backend" })
      .run();

    const folder = db
      .select()
      .from(schema.planFolders)
      .where(eq(schema.planFolders.id, folderId))
      .get();
    expect(folder!.name).toBe("Backend");
    expect(folder!.parentId).toBeNull();
  });

  it("should create nested folders", () => {
    const parentId = crypto.randomUUID();
    const childId = crypto.randomUUID();

    db.insert(schema.planFolders)
      .values({ id: parentId, projectId, name: "Backend" })
      .run();
    db.insert(schema.planFolders)
      .values({ id: childId, projectId, name: "Auth", parentId })
      .run();

    const child = db
      .select()
      .from(schema.planFolders)
      .where(eq(schema.planFolders.id, childId))
      .get();
    expect(child!.parentId).toBe(parentId);
    expect(child!.name).toBe("Auth");
  });

  it("should assign plan to folder", () => {
    const folderId = crypto.randomUUID();
    const planId = crypto.randomUUID();

    db.insert(schema.planFolders)
      .values({ id: folderId, projectId, name: "Backend" })
      .run();
    db.insert(schema.plans)
      .values({
        id: planId,
        projectId,
        name: "Auth Plan",
        status: "draft",
        folderId,
      })
      .run();

    const plan = db
      .select()
      .from(schema.plans)
      .where(eq(schema.plans.id, planId))
      .get();
    expect(plan!.folderId).toBe(folderId);
  });

  it("should list plans without folder (root level)", () => {
    db.insert(schema.plans)
      .values({ id: crypto.randomUUID(), projectId, name: "Root Plan", status: "draft" })
      .run();

    const folderId = crypto.randomUUID();
    db.insert(schema.planFolders)
      .values({ id: folderId, projectId, name: "Folder" })
      .run();
    db.insert(schema.plans)
      .values({
        id: crypto.randomUUID(),
        projectId,
        name: "Nested Plan",
        status: "draft",
        folderId,
      })
      .run();

    const rootPlans = db
      .select()
      .from(schema.plans)
      .where(isNull(schema.plans.folderId))
      .all();
    expect(rootPlans).toHaveLength(1);
    expect(rootPlans[0].name).toBe("Root Plan");
  });

  it("should list child folders of a parent", () => {
    const parentId = crypto.randomUUID();
    db.insert(schema.planFolders)
      .values({ id: parentId, projectId, name: "Root" })
      .run();

    db.insert(schema.planFolders)
      .values({ id: crypto.randomUUID(), projectId, name: "Child 1", parentId })
      .run();
    db.insert(schema.planFolders)
      .values({ id: crypto.randomUUID(), projectId, name: "Child 2", parentId })
      .run();

    const children = db
      .select()
      .from(schema.planFolders)
      .where(eq(schema.planFolders.parentId, parentId))
      .all();
    expect(children).toHaveLength(2);
  });

  it("should cascade delete folders when project is deleted", () => {
    const folderId = crypto.randomUUID();
    db.insert(schema.planFolders)
      .values({ id: folderId, projectId, name: "Folder" })
      .run();

    db.delete(schema.projects).where(eq(schema.projects.id, projectId)).run();

    const folders = db
      .select()
      .from(schema.planFolders)
      .where(eq(schema.planFolders.projectId, projectId))
      .all();
    expect(folders).toHaveLength(0);
  });
});
