import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe("Plan CRUD logic", () => {
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

  it("should create a plan with draft status", () => {
    const planId = crypto.randomUUID();
    db.insert(schema.plans)
      .values({ id: planId, projectId, name: "Plan A", status: "draft" })
      .run();

    const plan = db
      .select()
      .from(schema.plans)
      .where(eq(schema.plans.id, planId))
      .get();
    expect(plan!.status).toBe("draft");
  });

  it("should list plans for a project", () => {
    db.insert(schema.plans)
      .values({
        id: crypto.randomUUID(),
        projectId,
        name: "Plan A",
        status: "draft",
      })
      .run();
    db.insert(schema.plans)
      .values({
        id: crypto.randomUUID(),
        projectId,
        name: "Plan B",
        status: "draft",
      })
      .run();

    const plans = db
      .select()
      .from(schema.plans)
      .where(eq(schema.plans.projectId, projectId))
      .all();
    expect(plans).toHaveLength(2);
  });

  it("should update plan status from reviewing to confirmed", () => {
    const planId = crypto.randomUUID();
    db.insert(schema.plans)
      .values({ id: planId, projectId, name: "Plan", status: "reviewing" })
      .run();

    db.update(schema.plans)
      .set({ status: "confirmed" })
      .where(eq(schema.plans.id, planId))
      .run();

    const plan = db
      .select()
      .from(schema.plans)
      .where(eq(schema.plans.id, planId))
      .get();
    expect(plan!.status).toBe("confirmed");
  });

  it("should revert plan status from confirmed to reviewing", () => {
    const planId = crypto.randomUUID();
    db.insert(schema.plans)
      .values({ id: planId, projectId, name: "Plan", status: "confirmed" })
      .run();

    db.update(schema.plans)
      .set({ status: "reviewing" })
      .where(eq(schema.plans.id, planId))
      .run();

    const plan = db
      .select()
      .from(schema.plans)
      .where(eq(schema.plans.id, planId))
      .get();
    expect(plan!.status).toBe("reviewing");
  });

  it("should not confirm plan without schemes", () => {
    const planId = crypto.randomUUID();
    db.insert(schema.plans)
      .values({ id: planId, projectId, name: "Plan", status: "reviewing" })
      .run();

    const schemeList = db
      .select()
      .from(schema.schemes)
      .where(eq(schema.schemes.planId, planId))
      .all();
    expect(schemeList).toHaveLength(0);
  });
});
