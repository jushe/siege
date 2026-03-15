import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe("Project CRUD logic", () => {
  let sqlite: Database.Database;
  let db: ReturnType<typeof drizzle>;

  beforeEach(() => {
    sqlite = new Database(":memory:");
    db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: "src/lib/db/migrations" });
  });

  afterEach(() => {
    sqlite.close();
  });

  it("should list all projects", () => {
    db.insert(schema.projects)
      .values({ id: "1", name: "First", targetRepoPath: "/a" })
      .run();
    db.insert(schema.projects)
      .values({ id: "2", name: "Second", targetRepoPath: "/b" })
      .run();

    const result = db.select().from(schema.projects).all();
    expect(result).toHaveLength(2);
  });

  it("should create a project with all fields", () => {
    const id = crypto.randomUUID();
    db.insert(schema.projects)
      .values({
        id,
        name: "My Project",
        description: "A description",
        targetRepoPath: "/home/user/repo",
      })
      .run();

    const project = db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, id))
      .get();
    expect(project!.name).toBe("My Project");
    expect(project!.description).toBe("A description");
    expect(project!.targetRepoPath).toBe("/home/user/repo");
  });

  it("should update a project", () => {
    const id = crypto.randomUUID();
    db.insert(schema.projects)
      .values({ id, name: "Old Name", targetRepoPath: "/tmp" })
      .run();

    db.update(schema.projects)
      .set({ name: "New Name", updatedAt: new Date().toISOString() })
      .where(eq(schema.projects.id, id))
      .run();

    const project = db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, id))
      .get();
    expect(project!.name).toBe("New Name");
  });

  it("should delete a project", () => {
    const id = crypto.randomUUID();
    db.insert(schema.projects)
      .values({ id, name: "Delete Me", targetRepoPath: "/tmp" })
      .run();

    db.delete(schema.projects)
      .where(eq(schema.projects.id, id))
      .run();

    const project = db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, id))
      .get();
    expect(project).toBeUndefined();
  });

  it("should cascade delete plans when project is deleted", () => {
    const projectId = crypto.randomUUID();
    const planId = crypto.randomUUID();

    db.insert(schema.projects)
      .values({ id: projectId, name: "P", targetRepoPath: "/tmp" })
      .run();
    db.insert(schema.plans)
      .values({ id: planId, projectId, name: "Plan", status: "draft" })
      .run();

    db.delete(schema.projects)
      .where(eq(schema.projects.id, projectId))
      .run();

    const plans = db
      .select()
      .from(schema.plans)
      .where(eq(schema.plans.projectId, projectId))
      .all();
    expect(plans).toHaveLength(0);
  });
});
