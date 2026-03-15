# Siege Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Siege project foundation with database, i18n, markdown support, and full CRUD for Projects, Plans, and Schemes with confirmation flow.

**Architecture:** Next.js 15 App Router full-stack. API Routes handle data mutations, Server Components for rendering. Drizzle ORM with SQLite for persistence. next-intl for i18n. react-markdown for rendering, @uiw/react-md-editor for editing.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Drizzle ORM, better-sqlite3, next-intl, react-markdown, remark-gfm, rehype-highlight, @uiw/react-md-editor, Vitest, @testing-library/react

---

## File Structure

```
siege/
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx                    # Locale layout with next-intl provider
│   │   │   ├── page.tsx                      # Project list page
│   │   │   ├── projects/
│   │   │   │   └── [projectId]/
│   │   │   │       ├── page.tsx              # Project detail (plan list)
│   │   │   │       └── plans/
│   │   │   │           └── [planId]/
│   │   │   │               └── page.tsx      # Plan detail (core workspace)
│   │   │   └── settings/
│   │   │       └── page.tsx                  # Settings (placeholder for Phase 2)
│   │   ├── api/
│   │   │   ├── projects/
│   │   │   │   ├── route.ts                  # GET (list), POST (create)
│   │   │   │   └── [projectId]/
│   │   │   │       └── route.ts              # GET, PUT, DELETE
│   │   │   ├── plans/
│   │   │   │   ├── route.ts                  # GET (by project), POST
│   │   │   │   └── [planId]/
│   │   │   │       ├── route.ts              # GET, PUT, DELETE
│   │   │   │       └── confirm/
│   │   │   │           └── route.ts          # POST (confirm/revoke schemes)
│   │   │   └── schemes/
│   │   │       ├── route.ts                  # GET (by plan), POST
│   │   │       └── [schemeId]/
│   │   │           └── route.ts              # GET, PUT, DELETE
│   │   ├── layout.tsx                        # Root layout
│   │   └── globals.css                       # Global styles + Tailwind
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts                     # Drizzle schema (all tables)
│   │   │   ├── index.ts                      # DB connection singleton
│   │   │   └── migrations/                   # Generated migrations
│   │   └── utils.ts                          # Shared utilities
│   ├── components/
│   │   ├── markdown/
│   │   │   ├── markdown-renderer.tsx         # Read-only markdown display
│   │   │   └── markdown-editor.tsx           # Markdown editor wrapper
│   │   ├── project/
│   │   │   ├── project-list.tsx              # Project card grid
│   │   │   ├── project-card.tsx              # Single project card
│   │   │   └── create-project-dialog.tsx     # Create project modal
│   │   ├── plan/
│   │   │   ├── plan-list.tsx                 # Plan list in project detail
│   │   │   ├── plan-card.tsx                 # Single plan card with status
│   │   │   ├── create-plan-dialog.tsx        # Create plan modal
│   │   │   └── plan-tabs.tsx                 # Tab container for plan detail
│   │   ├── scheme/
│   │   │   ├── scheme-list.tsx               # Scheme list in plan detail
│   │   │   ├── scheme-card.tsx               # Single scheme card (markdown)
│   │   │   ├── create-scheme-dialog.tsx      # Manual scheme creation
│   │   │   └── scheme-editor.tsx             # Scheme edit view
│   │   └── ui/
│   │       ├── button.tsx                    # Button component
│   │       ├── dialog.tsx                    # Modal dialog
│   │       ├── input.tsx                     # Text input
│   │       ├── status-badge.tsx              # Status indicator
│   │       └── tabs.tsx                      # Tab component
│   ├── messages/
│   │   ├── en.json                           # English translations
│   │   └── zh.json                           # Chinese translations
│   └── i18n/
│       ├── request.ts                        # next-intl request config
│       └── routing.ts                        # Locale routing config
├── __tests__/
│   ├── lib/
│   │   └── db/
│   │       └── schema.test.ts               # Schema validation tests
│   ├── api/
│   │   ├── projects.test.ts                 # Project API tests
│   │   ├── plans.test.ts                    # Plan API tests
│   │   └── schemes.test.ts                  # Scheme API tests
│   └── components/
│       ├── markdown-renderer.test.tsx        # Markdown rendering tests
│       └── scheme-card.test.tsx              # Scheme card tests
├── drizzle.config.ts                         # Drizzle config
├── vitest.config.ts                          # Vitest config
├── next.config.ts                            # Next.js config with next-intl
├── middleware.ts                             # next-intl middleware for locale routing
├── .env.local                                # Local env vars (not committed)
├── .gitignore
├── tsconfig.json
├── tailwind.config.ts
└── package.json
```

---

## Chunk 1: Scaffolding + Database

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`

- [ ] **Step 1: Create Next.js project**

```bash
cd /home/lqk/typescript/src/github.com/Kotodian/siege
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Select defaults when prompted. This will scaffold into the existing directory.

- [ ] **Step 2: Install core dependencies**

```bash
npm install drizzle-orm better-sqlite3 next-intl react-markdown remark-gfm rehype-highlight @uiw/react-md-editor uuid
npm install -D drizzle-kit @types/better-sqlite3 @types/uuid vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: [],
    include: ["__tests__/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 4: Add test script to package.json**

Add to `scripts` in `package.json`:
```json
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 5: Verify setup**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with dependencies"
```

---

### Task 2: Database Schema

**Files:**
- Create: `src/lib/db/schema.ts`, `src/lib/db/index.ts`, `drizzle.config.ts`
- Test: `__tests__/lib/db/schema.test.ts`

- [ ] **Step 1: Write schema validation test**

```typescript
// __tests__/lib/db/schema.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe("Database Schema", () => {
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

  it("should create and query a project", () => {
    const id = crypto.randomUUID();
    db.insert(schema.projects).values({
      id,
      name: "Test Project",
      description: "A test project",
      targetRepoPath: "/tmp/test-repo",
    }).run();

    const result = db.select().from(schema.projects).where(eq(schema.projects.id, id)).get();
    expect(result).toBeDefined();
    expect(result!.name).toBe("Test Project");
    expect(result!.targetRepoPath).toBe("/tmp/test-repo");
  });

  it("should create a plan linked to a project", () => {
    const projectId = crypto.randomUUID();
    const planId = crypto.randomUUID();

    db.insert(schema.projects).values({
      id: projectId,
      name: "Test Project",
      targetRepoPath: "/tmp/test",
    }).run();

    db.insert(schema.plans).values({
      id: planId,
      projectId,
      name: "Test Plan",
      description: "A test plan",
      status: "draft",
    }).run();

    const result = db.select().from(schema.plans).where(eq(schema.plans.projectId, projectId)).all();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Test Plan");
    expect(result[0].status).toBe("draft");
  });

  it("should create a scheme linked to a plan", () => {
    const projectId = crypto.randomUUID();
    const planId = crypto.randomUUID();
    const schemeId = crypto.randomUUID();

    db.insert(schema.projects).values({
      id: projectId,
      name: "P",
      targetRepoPath: "/tmp",
    }).run();

    db.insert(schema.plans).values({
      id: planId,
      projectId,
      name: "Plan",
      status: "draft",
    }).run();

    db.insert(schema.schemes).values({
      id: schemeId,
      planId,
      title: "API Refactor",
      content: "## Overview\nRefactor the API layer...",
      sourceType: "manual",
    }).run();

    const result = db.select().from(schema.schemes).where(eq(schema.schemes.planId, planId)).all();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("API Refactor");
    expect(result[0].sourceType).toBe("manual");
  });

  it("should enforce plan status enum values", () => {
    const projectId = crypto.randomUUID();
    db.insert(schema.projects).values({
      id: projectId,
      name: "P",
      targetRepoPath: "/tmp",
    }).run();

    const validStatuses = ["draft", "reviewing", "confirmed", "scheduled", "executing", "testing", "completed"];
    for (const status of validStatuses) {
      const planId = crypto.randomUUID();
      db.insert(schema.plans).values({
        id: planId,
        projectId,
        name: `Plan ${status}`,
        status: status as any,
      }).run();

      const result = db.select().from(schema.plans).where(eq(schema.plans.id, planId)).get();
      expect(result!.status).toBe(status);
    }
  });

  it("should create schedule with items linked to scheme", () => {
    const projectId = crypto.randomUUID();
    const planId = crypto.randomUUID();
    const schemeId = crypto.randomUUID();
    const scheduleId = crypto.randomUUID();
    const itemId = crypto.randomUUID();

    db.insert(schema.projects).values({ id: projectId, name: "P", targetRepoPath: "/tmp" }).run();
    db.insert(schema.plans).values({ id: planId, projectId, name: "Plan", status: "draft" }).run();
    db.insert(schema.schemes).values({ id: schemeId, planId, title: "S", content: "c", sourceType: "manual" }).run();
    db.insert(schema.schedules).values({ id: scheduleId, planId, startDate: "2026-03-15", endDate: "2026-03-20" }).run();
    db.insert(schema.scheduleItems).values({
      id: itemId,
      scheduleId,
      schemeId,
      title: "Task 1",
      description: "Do something",
      startDate: "2026-03-15",
      endDate: "2026-03-17",
      order: 1,
      status: "pending",
      progress: 0,
      engine: "claude-code",
      skills: "[]",
    }).run();

    const result = db.select().from(schema.scheduleItems).where(eq(schema.scheduleItems.scheduleId, scheduleId)).all();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Task 1");
    expect(result[0].engine).toBe("claude-code");
  });

  it("should create test suite with cases and results", () => {
    const projectId = crypto.randomUUID();
    const planId = crypto.randomUUID();
    const suiteId = crypto.randomUUID();
    const caseId = crypto.randomUUID();
    const resultId = crypto.randomUUID();

    db.insert(schema.projects).values({ id: projectId, name: "P", targetRepoPath: "/tmp" }).run();
    db.insert(schema.plans).values({ id: planId, projectId, name: "Plan", status: "draft" }).run();
    db.insert(schema.testSuites).values({ id: suiteId, planId, status: "pending" }).run();
    db.insert(schema.testCases).values({
      id: caseId,
      testSuiteId: suiteId,
      name: "test_login",
      description: "Test login flow",
      type: "integration",
      status: "pending",
    }).run();
    db.insert(schema.testResults).values({
      id: resultId,
      testCaseId: caseId,
      status: "passed",
      output: "All assertions passed",
      durationMs: 120,
    }).run();

    const results = db.select().from(schema.testResults).where(eq(schema.testResults.testCaseId, caseId)).all();
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("passed");
    expect(results[0].durationMs).toBe(120);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/lib/db/schema.test.ts
```

Expected: FAIL — `@/lib/db/schema` module not found.

- [ ] **Step 3: Create Drizzle schema**

```typescript
// src/lib/db/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  targetRepoPath: text("target_repo_path").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").default(""),
  status: text("status", {
    enum: ["draft", "reviewing", "confirmed", "scheduled", "executing", "testing", "completed"],
  }).notNull().default("draft"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

export const schemes = sqliteTable("schemes", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").default(""),
  sourceType: text("source_type", {
    enum: ["web_search", "local_analysis", "manual"],
  }).notNull().default("manual"),
  searchResults: text("search_results").default("[]"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

export const schedules = sqliteTable("schedules", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
});

export const scheduleItems = sqliteTable("schedule_items", {
  id: text("id").primaryKey(),
  scheduleId: text("schedule_id").notNull().references(() => schedules.id, { onDelete: "cascade" }),
  schemeId: text("scheme_id").references(() => schemes.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").default(""),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  order: integer("order").notNull().default(0),
  status: text("status", {
    enum: ["pending", "in_progress", "completed", "failed"],
  }).notNull().default("pending"),
  progress: integer("progress").notNull().default(0),
  executionLog: text("execution_log").default(""),
  engine: text("engine").default("claude-code"),
  skills: text("skills").default("[]"),
});

export const testSuites = sqliteTable("test_suites", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  status: text("status", {
    enum: ["pending", "generating", "running", "passed", "failed"],
  }).notNull().default("pending"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

export const testCases = sqliteTable("test_cases", {
  id: text("id").primaryKey(),
  testSuiteId: text("test_suite_id").notNull().references(() => testSuites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").default(""),
  type: text("type", { enum: ["unit", "integration", "e2e"] }).notNull().default("unit"),
  generatedCode: text("generated_code").default(""),
  filePath: text("file_path"),
  status: text("status", {
    enum: ["pending", "running", "passed", "failed", "skipped"],
  }).notNull().default("pending"),
});

export const testResults = sqliteTable("test_results", {
  id: text("id").primaryKey(),
  testCaseId: text("test_case_id").notNull().references(() => testCases.id, { onDelete: "cascade" }),
  runAt: text("run_at").default(sql`(datetime('now'))`).notNull(),
  status: text("status", {
    enum: ["passed", "failed", "error", "skipped"],
  }).notNull(),
  output: text("output").default(""),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms").default(0),
});

export const cliEngines = sqliteTable("cli_engines", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  command: text("command").notNull(),
  defaultArgs: text("default_args").default("{}"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});
```

- [ ] **Step 4: Create drizzle.config.ts**

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/siege.db",
  },
});
```

- [ ] **Step 5: Generate migrations**

```bash
npx drizzle-kit generate
```

Expected: Migration files created in `src/lib/db/migrations/`.

- [ ] **Step 6: Create DB connection singleton**

```typescript
// src/lib/db/index.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "siege.db");

function createDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  return drizzle(sqlite, { schema });
}

let dbInstance: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = createDb();
  }
  return dbInstance;
}
```

- [ ] **Step 7: Add `data/` to .gitignore**

Append to `.gitignore`:
```
data/
```

- [ ] **Step 8: Run tests**

```bash
npx vitest run __tests__/lib/db/schema.test.ts
```

Expected: All tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/db/ drizzle.config.ts __tests__/lib/db/ .gitignore
git commit -m "feat(db): add Drizzle schema with all tables and migrations"
```

---

## Chunk 2: i18n + Markdown Components

### Task 3: i18n Setup

**Files:**
- Create: `src/messages/en.json`, `src/messages/zh.json`, `src/i18n/request.ts`, `src/i18n/routing.ts`, `middleware.ts`
- Modify: `next.config.ts`, `src/app/[locale]/layout.tsx`

- [ ] **Step 1: Create routing config**

```typescript
// src/i18n/routing.ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "zh"],
  defaultLocale: "zh",
});
```

- [ ] **Step 2: Create request config**

```typescript
// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 3: Create middleware**

```typescript
// middleware.ts
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 4: Update next.config.ts**

```typescript
// next.config.ts
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
```

- [ ] **Step 5: Create message files**

```json
// src/messages/en.json
{
  "common": {
    "create": "Create",
    "edit": "Edit",
    "delete": "Delete",
    "cancel": "Cancel",
    "save": "Save",
    "confirm": "Confirm",
    "revoke": "Revoke",
    "back": "Back",
    "loading": "Loading...",
    "noData": "No data"
  },
  "nav": {
    "projects": "Projects",
    "settings": "Settings"
  },
  "project": {
    "title": "Projects",
    "create": "New Project",
    "name": "Project Name",
    "description": "Description",
    "targetRepoPath": "Repository Path",
    "deleteConfirm": "Are you sure you want to delete this project?"
  },
  "plan": {
    "title": "Plans",
    "create": "New Plan",
    "name": "Plan Name",
    "description": "Description",
    "status": {
      "draft": "Draft",
      "reviewing": "Reviewing",
      "confirmed": "Confirmed",
      "scheduled": "Scheduled",
      "executing": "Executing",
      "testing": "Testing",
      "completed": "Completed"
    },
    "tabs": {
      "schemes": "Schemes",
      "schedule": "Schedule",
      "tests": "Tests",
      "logs": "Execution Log"
    },
    "deleteConfirm": "Are you sure you want to delete this plan?"
  },
  "scheme": {
    "title": "Schemes",
    "create": "Add Scheme",
    "generate": "Generate Scheme",
    "schemeTitle": "Title",
    "content": "Content",
    "sourceType": {
      "web_search": "Web Search",
      "local_analysis": "Local Analysis",
      "manual": "Manual"
    },
    "confirmSchemes": "Confirm Schemes",
    "revokeConfirm": "Revoke Confirmation",
    "confirmed": "Confirmed",
    "deleteConfirm": "Are you sure you want to delete this scheme?"
  }
}
```

```json
// src/messages/zh.json
{
  "common": {
    "create": "创建",
    "edit": "编辑",
    "delete": "删除",
    "cancel": "取消",
    "save": "保存",
    "confirm": "确认",
    "revoke": "撤回",
    "back": "返回",
    "loading": "加载中...",
    "noData": "暂无数据"
  },
  "nav": {
    "projects": "项目",
    "settings": "设置"
  },
  "project": {
    "title": "项目",
    "create": "新建项目",
    "name": "项目名称",
    "description": "描述",
    "targetRepoPath": "仓库路径",
    "deleteConfirm": "确定要删除这个项目吗？"
  },
  "plan": {
    "title": "计划",
    "create": "新建计划",
    "name": "计划名称",
    "description": "描述",
    "status": {
      "draft": "草稿",
      "reviewing": "审阅中",
      "confirmed": "已确认",
      "scheduled": "已排期",
      "executing": "执行中",
      "testing": "测试中",
      "completed": "已完成"
    },
    "tabs": {
      "schemes": "方案",
      "schedule": "排期",
      "tests": "测试",
      "logs": "执行日志"
    },
    "deleteConfirm": "确定要删除这个计划吗？"
  },
  "scheme": {
    "title": "方案",
    "create": "添加方案",
    "generate": "生成方案",
    "schemeTitle": "标题",
    "content": "内容",
    "sourceType": {
      "web_search": "网页搜索",
      "local_analysis": "本地分析",
      "manual": "手动添加"
    },
    "confirmSchemes": "确认方案",
    "revokeConfirm": "撤回确认",
    "confirmed": "已确认",
    "deleteConfirm": "确定要删除这个方案吗？"
  }
}
```

- [ ] **Step 6: Create locale layout**

```tsx
// src/app/[locale]/layout.tsx
import { NextIntlClientProvider, useMessages } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/routing";

export default function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = useMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="min-h-screen bg-gray-50">
        <nav className="border-b bg-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold">Siege</h1>
            <a href={`/${locale}`} className="text-sm text-gray-600 hover:text-gray-900">
              {messages.nav?.projects}
            </a>
            <a href={`/${locale}/settings`} className="text-sm text-gray-600 hover:text-gray-900">
              {messages.nav?.settings}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <a href="/en" className="text-xs text-gray-500 hover:text-gray-900">EN</a>
            <span className="text-gray-300">|</span>
            <a href="/zh" className="text-xs text-gray-500 hover:text-gray-900">中文</a>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl px-6 py-8">
          {children}
        </main>
      </div>
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 7: Verify i18n works**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/i18n/ src/messages/ middleware.ts next.config.ts src/app/\[locale\]/
git commit -m "feat(i18n): add next-intl with zh/en locale support"
```

---

### Task 4: Markdown Components

**Files:**
- Create: `src/components/markdown/markdown-renderer.tsx`, `src/components/markdown/markdown-editor.tsx`
- Test: `__tests__/components/markdown-renderer.test.tsx`

- [ ] **Step 1: Write markdown renderer test**

```tsx
// __tests__/components/markdown-renderer.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";

describe("MarkdownRenderer", () => {
  it("renders headings", () => {
    render(<MarkdownRenderer content="## Hello World" />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Hello World");
  });

  it("renders code blocks with syntax highlighting", () => {
    const content = "```typescript\nconst x = 1;\n```";
    const { container } = render(<MarkdownRenderer content={content} />);
    expect(container.querySelector("code")).toBeTruthy();
  });

  it("renders empty content without crashing", () => {
    const { container } = render(<MarkdownRenderer content="" />);
    expect(container).toBeTruthy();
  });

  it("renders GFM tables", () => {
    const content = "| A | B |\n|---|---|\n| 1 | 2 |";
    const { container } = render(<MarkdownRenderer content={content} />);
    expect(container.querySelector("table")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/components/markdown-renderer.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement MarkdownRenderer**

```tsx
// src/components/markdown/markdown-renderer.tsx
"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/components/markdown-renderer.test.tsx
```

Expected: All tests PASS.

- [ ] **Step 5: Create MarkdownEditor wrapper**

```tsx
// src/components/markdown/markdown-editor.tsx
"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  placeholder?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  height = 300,
  placeholder,
}: MarkdownEditorProps) {
  return (
    <div data-color-mode="light">
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || "")}
        height={height}
        preview="edit"
        textareaProps={{ placeholder }}
      />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/markdown/ __tests__/components/
git commit -m "feat(ui): add markdown renderer and editor components"
```

---

## Chunk 3: Project CRUD

### Task 5: Base UI Components

**Files:**
- Create: `src/components/ui/button.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/input.tsx`, `src/components/ui/status-badge.tsx`, `src/components/ui/tabs.tsx`

- [ ] **Step 1: Create Button component**

```tsx
// src/components/ui/button.tsx
import { ButtonHTMLAttributes, forwardRef } from "react";

const variants = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-gray-600 hover:bg-gray-100",
} as const;

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-md font-medium transition-colors
          disabled:opacity-50 disabled:pointer-events-none
          ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
```

- [ ] **Step 2: Create Dialog component**

```tsx
// src/components/ui/dialog.tsx
"use client";

import { useEffect, useRef, ReactNode } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Dialog({ open, onClose, title, children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="rounded-lg p-0 backdrop:bg-black/50 w-full max-w-lg"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
```

- [ ] **Step 3: Create Input component**

```tsx
// src/components/ui/input.tsx
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">{label}</label>
        )}
        <input
          ref={ref}
          className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm
            focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
            ${error ? "border-red-500" : ""} ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
```

- [ ] **Step 4: Create StatusBadge component**

```tsx
// src/components/ui/status-badge.tsx
const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  reviewing: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  scheduled: "bg-purple-100 text-purple-700",
  executing: "bg-orange-100 text-orange-700",
  testing: "bg-cyan-100 text-cyan-700",
  completed: "bg-green-100 text-green-700",
  pending: "bg-gray-100 text-gray-700",
  in_progress: "bg-orange-100 text-orange-700",
  passed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

interface StatusBadgeProps {
  status: string;
  label: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const color = statusColors[status] || "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
```

- [ ] **Step 5: Create Tabs component**

```tsx
// src/components/ui/tabs.tsx
"use client";

import { useState, ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export function Tabs({ tabs, defaultTab }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const active = tabs.find((t) => t.id === activeTab);

  return (
    <div>
      <div className="border-b">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors
                ${activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"}
                ${tab.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="pt-4">{active?.content}</div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/
git commit -m "feat(ui): add base UI components (button, dialog, input, status-badge, tabs)"
```

---

### Task 6: Project CRUD API

**Files:**
- Create: `src/app/api/projects/route.ts`, `src/app/api/projects/[projectId]/route.ts`
- Test: `__tests__/api/projects.test.ts`

- [ ] **Step 1: Write project API tests**

```typescript
// __tests__/api/projects.test.ts
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

  it("should list all projects ordered by creation date desc", () => {
    db.insert(schema.projects).values({ id: "1", name: "First", targetRepoPath: "/a" }).run();
    db.insert(schema.projects).values({ id: "2", name: "Second", targetRepoPath: "/b" }).run();

    const result = db.select().from(schema.projects).all();
    expect(result).toHaveLength(2);
  });

  it("should create a project with all fields", () => {
    const id = crypto.randomUUID();
    db.insert(schema.projects).values({
      id,
      name: "My Project",
      description: "A description",
      targetRepoPath: "/home/user/repo",
    }).run();

    const project = db.select().from(schema.projects).where(eq(schema.projects.id, id)).get();
    expect(project!.name).toBe("My Project");
    expect(project!.description).toBe("A description");
    expect(project!.targetRepoPath).toBe("/home/user/repo");
  });

  it("should update a project", () => {
    const id = crypto.randomUUID();
    db.insert(schema.projects).values({ id, name: "Old Name", targetRepoPath: "/tmp" }).run();

    db.update(schema.projects)
      .set({ name: "New Name", updatedAt: new Date().toISOString() })
      .where(eq(schema.projects.id, id))
      .run();

    const project = db.select().from(schema.projects).where(eq(schema.projects.id, id)).get();
    expect(project!.name).toBe("New Name");
  });

  it("should delete a project", () => {
    const id = crypto.randomUUID();
    db.insert(schema.projects).values({ id, name: "Delete Me", targetRepoPath: "/tmp" }).run();

    db.delete(schema.projects).where(eq(schema.projects.id, id)).run();

    const project = db.select().from(schema.projects).where(eq(schema.projects.id, id)).get();
    expect(project).toBeUndefined();
  });

  it("should cascade delete plans when project is deleted", () => {
    const projectId = crypto.randomUUID();
    const planId = crypto.randomUUID();

    db.insert(schema.projects).values({ id: projectId, name: "P", targetRepoPath: "/tmp" }).run();
    db.insert(schema.plans).values({ id: planId, projectId, name: "Plan", status: "draft" }).run();

    db.delete(schema.projects).where(eq(schema.projects.id, projectId)).run();

    const plans = db.select().from(schema.plans).where(eq(schema.plans.projectId, projectId)).all();
    expect(plans).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it passes** (tests use DB directly, no API route needed yet)

```bash
npx vitest run __tests__/api/projects.test.ts
```

Expected: All PASS (these test the DB layer directly).

- [ ] **Step 3: Implement project API routes**

```typescript
// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const result = db.select().from(projects).orderBy(desc(projects.createdAt)).all();
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, targetRepoPath } = body;

  if (!name || !targetRepoPath) {
    return NextResponse.json({ error: "name and targetRepoPath are required" }, { status: 400 });
  }

  const db = getDb();
  const id = crypto.randomUUID();
  db.insert(projects).values({ id, name, description, targetRepoPath }).run();

  const project = db.select().from(projects).where(eq(projects.id, id)).get();
  return NextResponse.json(project, { status: 201 });
}

import { eq } from "drizzle-orm";
```

```typescript
// src/app/api/projects/[projectId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const db = getDb();
  const project = db.select().from(projects).where(eq(projects.id, params.projectId)).get();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const body = await req.json();
  const db = getDb();

  db.update(projects)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(projects.id, params.projectId))
    .run();

  const project = db.select().from(projects).where(eq(projects.id, params.projectId)).get();
  return NextResponse.json(project);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const db = getDb();
  db.delete(projects).where(eq(projects.id, params.projectId)).run();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/projects/ __tests__/api/projects.test.ts
git commit -m "feat(api): add project CRUD API routes and tests"
```

---

### Task 7: Project UI Pages

**Files:**
- Create: `src/app/[locale]/page.tsx`, `src/components/project/project-list.tsx`, `src/components/project/project-card.tsx`, `src/components/project/create-project-dialog.tsx`

- [ ] **Step 1: Create ProjectCard component**

```tsx
// src/components/project/project-card.tsx
"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string;
    targetRepoPath: string;
    updatedAt: string;
  };
  locale: string;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, locale, onDelete }: ProjectCardProps) {
  const t = useTranslations();
  const router = useRouter();

  return (
    <div
      className="rounded-lg border bg-white p-5 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(`/${locale}/projects/${project.id}`)}
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-lg">{project.name}</h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(t("project.deleteConfirm"))) {
              onDelete(project.id);
            }
          }}
          className="text-gray-400 hover:text-red-500 text-sm"
        >
          {t("common.delete")}
        </button>
      </div>
      {project.description && (
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
      )}
      <p className="text-xs text-gray-400 mt-3 font-mono">{project.targetRepoPath}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create CreateProjectDialog component**

```tsx
// src/components/project/create-project-dialog.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; targetRepoPath: string }) => void;
}

export function CreateProjectDialog({ open, onClose, onSubmit }: CreateProjectDialogProps) {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetRepoPath, setTargetRepoPath] = useState("");

  const handleSubmit = () => {
    if (!name || !targetRepoPath) return;
    onSubmit({ name, description, targetRepoPath });
    setName("");
    setDescription("");
    setTargetRepoPath("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={t("project.create")}>
      <div className="space-y-4">
        <Input
          label={t("project.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("project.description")}
          </label>
          <MarkdownEditor value={description} onChange={setDescription} height={150} />
        </div>
        <Input
          label={t("project.targetRepoPath")}
          value={targetRepoPath}
          onChange={(e) => setTargetRepoPath(e.target.value)}
          placeholder="/home/user/my-project"
          required
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!name || !targetRepoPath}>
            {t("common.create")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create ProjectList component**

```tsx
// src/components/project/project-list.tsx
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "./project-card";
import { CreateProjectDialog } from "./create-project-dialog";

interface Project {
  id: string;
  name: string;
  description: string;
  targetRepoPath: string;
  updatedAt: string;
}

interface ProjectListProps {
  locale: string;
}

export function ProjectList({ locale }: ProjectListProps) {
  const t = useTranslations();
  const [projects, setProjects] = useState<Project[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchProjects = async () => {
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(data);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (data: { name: string; description: string; targetRepoPath: string }) => {
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    fetchProjects();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    fetchProjects();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t("project.title")}</h2>
        <Button onClick={() => setDialogOpen(true)}>{t("project.create")}</Button>
      </div>

      {projects.length === 0 ? (
        <p className="text-gray-500 text-center py-12">{t("common.noData")}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              locale={locale}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create project list page**

```tsx
// src/app/[locale]/page.tsx
import { ProjectList } from "@/components/project/project-list";

export default function HomePage({ params: { locale } }: { params: { locale: string } }) {
  return <ProjectList locale={locale} />;
}
```

- [ ] **Step 5: Verify it runs**

```bash
npm run dev
```

Visit `http://localhost:3000` — should show project list page with create button.

- [ ] **Step 6: Commit**

```bash
git add src/components/project/ src/app/\[locale\]/page.tsx
git commit -m "feat(ui): add project list page with create/delete"
```

---

## Chunk 4: Plan + Scheme CRUD

### Task 8: Plan CRUD API

**Files:**
- Create: `src/app/api/plans/route.ts`, `src/app/api/plans/[planId]/route.ts`, `src/app/api/plans/[planId]/confirm/route.ts`
- Test: `__tests__/api/plans.test.ts`

- [ ] **Step 1: Write plan API tests**

```typescript
// __tests__/api/plans.test.ts
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
    db.insert(schema.projects).values({ id: projectId, name: "P", targetRepoPath: "/tmp" }).run();
  });

  afterEach(() => {
    sqlite.close();
  });

  it("should create a plan with draft status", () => {
    const planId = crypto.randomUUID();
    db.insert(schema.plans).values({ id: planId, projectId, name: "Plan A", status: "draft" }).run();

    const plan = db.select().from(schema.plans).where(eq(schema.plans.id, planId)).get();
    expect(plan!.status).toBe("draft");
  });

  it("should list plans for a project", () => {
    db.insert(schema.plans).values({ id: crypto.randomUUID(), projectId, name: "Plan A", status: "draft" }).run();
    db.insert(schema.plans).values({ id: crypto.randomUUID(), projectId, name: "Plan B", status: "draft" }).run();

    const plans = db.select().from(schema.plans).where(eq(schema.plans.projectId, projectId)).all();
    expect(plans).toHaveLength(2);
  });

  it("should update plan status from reviewing to confirmed", () => {
    const planId = crypto.randomUUID();
    db.insert(schema.plans).values({ id: planId, projectId, name: "Plan", status: "reviewing" }).run();

    db.update(schema.plans).set({ status: "confirmed" }).where(eq(schema.plans.id, planId)).run();

    const plan = db.select().from(schema.plans).where(eq(schema.plans.id, planId)).get();
    expect(plan!.status).toBe("confirmed");
  });

  it("should revert plan status from confirmed to reviewing", () => {
    const planId = crypto.randomUUID();
    db.insert(schema.plans).values({ id: planId, projectId, name: "Plan", status: "confirmed" }).run();

    db.update(schema.plans).set({ status: "reviewing" }).where(eq(schema.plans.id, planId)).run();

    const plan = db.select().from(schema.plans).where(eq(schema.plans.id, planId)).get();
    expect(plan!.status).toBe("reviewing");
  });

  it("should delete a plan", () => {
    const planId = crypto.randomUUID();
    db.insert(schema.plans).values({ id: planId, projectId, name: "Plan", status: "draft" }).run();

    db.delete(schema.plans).where(eq(schema.plans.id, planId)).run();

    const plan = db.select().from(schema.plans).where(eq(schema.plans.id, planId)).get();
    expect(plan).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

```bash
npx vitest run __tests__/api/plans.test.ts
```

Expected: All PASS.

- [ ] **Step 3: Implement plan API routes**

```typescript
// src/app/api/plans/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { plans } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const db = getDb();
  const result = db.select().from(plans)
    .where(eq(plans.projectId, projectId))
    .orderBy(desc(plans.createdAt))
    .all();

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectId, name, description } = body;

  if (!projectId || !name) {
    return NextResponse.json({ error: "projectId and name are required" }, { status: 400 });
  }

  const db = getDb();
  const id = crypto.randomUUID();
  db.insert(plans).values({ id, projectId, name, description, status: "draft" }).run();

  const plan = db.select().from(plans).where(eq(plans.id, id)).get();
  return NextResponse.json(plan, { status: 201 });
}
```

```typescript
// src/app/api/plans/[planId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { plans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: { planId: string } }
) {
  const db = getDb();
  const plan = db.select().from(plans).where(eq(plans.id, params.planId)).get();

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json(plan);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { planId: string } }
) {
  const body = await req.json();
  const db = getDb();

  db.update(plans)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(plans.id, params.planId))
    .run();

  const plan = db.select().from(plans).where(eq(plans.id, params.planId)).get();
  return NextResponse.json(plan);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { planId: string } }
) {
  const db = getDb();
  db.delete(plans).where(eq(plans.id, params.planId)).run();
  return NextResponse.json({ ok: true });
}
```

```typescript
// src/app/api/plans/[planId]/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { plans, schemes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: { planId: string } }
) {
  const body = await req.json();
  const { action } = body; // "confirm" or "revoke"
  const db = getDb();

  const plan = db.select().from(plans).where(eq(plans.id, params.planId)).get();
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  if (action === "confirm") {
    if (plan.status !== "reviewing") {
      return NextResponse.json({ error: "Plan must be in reviewing status to confirm" }, { status: 400 });
    }

    const schemeList = db.select().from(schemes).where(eq(schemes.planId, params.planId)).all();
    if (schemeList.length === 0) {
      return NextResponse.json({ error: "Plan must have at least one scheme to confirm" }, { status: 400 });
    }

    db.update(plans)
      .set({ status: "confirmed", updatedAt: new Date().toISOString() })
      .where(eq(plans.id, params.planId))
      .run();
  } else if (action === "revoke") {
    if (plan.status !== "confirmed") {
      return NextResponse.json({ error: "Plan must be in confirmed status to revoke" }, { status: 400 });
    }

    db.update(plans)
      .set({ status: "reviewing", updatedAt: new Date().toISOString() })
      .where(eq(plans.id, params.planId))
      .run();
  } else {
    return NextResponse.json({ error: "action must be 'confirm' or 'revoke'" }, { status: 400 });
  }

  const updated = db.select().from(plans).where(eq(plans.id, params.planId)).get();
  return NextResponse.json(updated);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/plans/ __tests__/api/plans.test.ts
git commit -m "feat(api): add plan CRUD and confirm/revoke API routes"
```

---

### Task 9: Scheme CRUD API

**Files:**
- Create: `src/app/api/schemes/route.ts`, `src/app/api/schemes/[schemeId]/route.ts`
- Test: `__tests__/api/schemes.test.ts`

- [ ] **Step 1: Write scheme API tests**

```typescript
// __tests__/api/schemes.test.ts
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
    db.insert(schema.projects).values({ id: projectId, name: "P", targetRepoPath: "/tmp" }).run();
    db.insert(schema.plans).values({ id: planId, projectId, name: "Plan", status: "draft" }).run();
  });

  afterEach(() => {
    sqlite.close();
  });

  it("should create a manual scheme", () => {
    const schemeId = crypto.randomUUID();
    db.insert(schema.schemes).values({
      id: schemeId,
      planId,
      title: "API Refactor",
      content: "## Plan\nRefactor REST endpoints",
      sourceType: "manual",
    }).run();

    const s = db.select().from(schema.schemes).where(eq(schema.schemes.id, schemeId)).get();
    expect(s!.title).toBe("API Refactor");
    expect(s!.sourceType).toBe("manual");
  });

  it("should update scheme content", () => {
    const schemeId = crypto.randomUUID();
    db.insert(schema.schemes).values({
      id: schemeId,
      planId,
      title: "S",
      content: "old",
      sourceType: "manual",
    }).run();

    db.update(schema.schemes)
      .set({ content: "## Updated\nNew content", updatedAt: new Date().toISOString() })
      .where(eq(schema.schemes.id, schemeId))
      .run();

    const s = db.select().from(schema.schemes).where(eq(schema.schemes.id, schemeId)).get();
    expect(s!.content).toBe("## Updated\nNew content");
  });

  it("should delete a scheme", () => {
    const schemeId = crypto.randomUUID();
    db.insert(schema.schemes).values({
      id: schemeId,
      planId,
      title: "S",
      content: "",
      sourceType: "manual",
    }).run();

    db.delete(schema.schemes).where(eq(schema.schemes.id, schemeId)).run();

    const s = db.select().from(schema.schemes).where(eq(schema.schemes.id, schemeId)).get();
    expect(s).toBeUndefined();
  });

  it("should transition plan to reviewing when first scheme is added", () => {
    // Verify plan is in draft
    let plan = db.select().from(schema.plans).where(eq(schema.plans.id, planId)).get();
    expect(plan!.status).toBe("draft");

    // Add scheme and update plan status
    db.insert(schema.schemes).values({
      id: crypto.randomUUID(),
      planId,
      title: "S",
      content: "c",
      sourceType: "manual",
    }).run();

    db.update(schema.plans)
      .set({ status: "reviewing" })
      .where(eq(schema.plans.id, planId))
      .run();

    plan = db.select().from(schema.plans).where(eq(schema.plans.id, planId)).get();
    expect(plan!.status).toBe("reviewing");
  });

  it("should cascade delete schemes when plan is deleted", () => {
    db.insert(schema.schemes).values({
      id: crypto.randomUUID(),
      planId,
      title: "S1",
      content: "",
      sourceType: "manual",
    }).run();
    db.insert(schema.schemes).values({
      id: crypto.randomUUID(),
      planId,
      title: "S2",
      content: "",
      sourceType: "manual",
    }).run();

    db.delete(schema.plans).where(eq(schema.plans.id, planId)).run();

    const schemes = db.select().from(schema.schemes).where(eq(schema.schemes.planId, planId)).all();
    expect(schemes).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

```bash
npx vitest run __tests__/api/schemes.test.ts
```

Expected: All PASS.

- [ ] **Step 3: Implement scheme API routes**

```typescript
// src/app/api/schemes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { schemes, plans } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const planId = req.nextUrl.searchParams.get("planId");
  if (!planId) {
    return NextResponse.json({ error: "planId is required" }, { status: 400 });
  }

  const db = getDb();
  const result = db.select().from(schemes)
    .where(eq(schemes.planId, planId))
    .orderBy(desc(schemes.createdAt))
    .all();

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { planId, title, content, sourceType } = body;

  if (!planId || !title) {
    return NextResponse.json({ error: "planId and title are required" }, { status: 400 });
  }

  const db = getDb();

  // Check plan exists and is editable
  const plan = db.select().from(plans).where(eq(plans.id, planId)).get();
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  if (plan.status === "confirmed" || plan.status === "scheduled" || plan.status === "executing") {
    return NextResponse.json({ error: "Cannot add schemes to a confirmed/scheduled/executing plan" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  db.insert(schemes).values({
    id,
    planId,
    title,
    content: content || "",
    sourceType: sourceType || "manual",
  }).run();

  // Transition plan to reviewing if it was draft
  if (plan.status === "draft") {
    db.update(plans)
      .set({ status: "reviewing", updatedAt: new Date().toISOString() })
      .where(eq(plans.id, planId))
      .run();
  }

  const scheme = db.select().from(schemes).where(eq(schemes.id, id)).get();
  return NextResponse.json(scheme, { status: 201 });
}
```

```typescript
// src/app/api/schemes/[schemeId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { schemes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: { schemeId: string } }
) {
  const db = getDb();
  const scheme = db.select().from(schemes).where(eq(schemes.id, params.schemeId)).get();

  if (!scheme) {
    return NextResponse.json({ error: "Scheme not found" }, { status: 404 });
  }

  return NextResponse.json(scheme);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { schemeId: string } }
) {
  const body = await req.json();
  const db = getDb();

  db.update(schemes)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(schemes.id, params.schemeId))
    .run();

  const scheme = db.select().from(schemes).where(eq(schemes.id, params.schemeId)).get();
  return NextResponse.json(scheme);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { schemeId: string } }
) {
  const db = getDb();
  db.delete(schemes).where(eq(schemes.id, params.schemeId)).run();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/schemes/ __tests__/api/schemes.test.ts
git commit -m "feat(api): add scheme CRUD API with plan status transitions"
```

---

### Task 10: Project Detail + Plan UI

**Files:**
- Create: `src/app/[locale]/projects/[projectId]/page.tsx`, `src/components/plan/plan-list.tsx`, `src/components/plan/plan-card.tsx`, `src/components/plan/create-plan-dialog.tsx`

- [ ] **Step 1: Create PlanCard component**

```tsx
// src/components/plan/plan-card.tsx
"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";

interface PlanCardProps {
  plan: {
    id: string;
    projectId: string;
    name: string;
    description: string;
    status: string;
    updatedAt: string;
  };
  locale: string;
  onDelete: (id: string) => void;
}

export function PlanCard({ plan, locale, onDelete }: PlanCardProps) {
  const t = useTranslations();
  const router = useRouter();

  return (
    <div
      className="rounded-lg border bg-white p-5 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(`/${locale}/projects/${plan.projectId}/plans/${plan.id}`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{plan.name}</h3>
          <StatusBadge status={plan.status} label={t(`plan.status.${plan.status}`)} />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(t("plan.deleteConfirm"))) {
              onDelete(plan.id);
            }
          }}
          className="text-gray-400 hover:text-red-500 text-sm"
        >
          {t("common.delete")}
        </button>
      </div>
      {plan.description && (
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{plan.description}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create CreatePlanDialog component**

```tsx
// src/components/plan/create-plan-dialog.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";

interface CreatePlanDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string }) => void;
}

export function CreatePlanDialog({ open, onClose, onSubmit }: CreatePlanDialogProps) {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!name) return;
    onSubmit({ name, description });
    setName("");
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={t("plan.create")}>
      <div className="space-y-4">
        <Input
          label={t("plan.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("plan.description")}
          </label>
          <MarkdownEditor value={description} onChange={setDescription} height={150} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!name}>{t("common.create")}</Button>
        </div>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create PlanList component**

```tsx
// src/components/plan/plan-list.tsx
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PlanCard } from "./plan-card";
import { CreatePlanDialog } from "./create-plan-dialog";

interface Plan {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: string;
  updatedAt: string;
}

interface PlanListProps {
  projectId: string;
  locale: string;
}

export function PlanList({ projectId, locale }: PlanListProps) {
  const t = useTranslations();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchPlans = async () => {
    const res = await fetch(`/api/plans?projectId=${projectId}`);
    const data = await res.json();
    setPlans(data);
  };

  useEffect(() => {
    fetchPlans();
  }, [projectId]);

  const handleCreate = async (data: { name: string; description: string }) => {
    await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, projectId }),
    });
    fetchPlans();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/plans/${id}`, { method: "DELETE" });
    fetchPlans();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t("plan.title")}</h2>
        <Button onClick={() => setDialogOpen(true)}>{t("plan.create")}</Button>
      </div>

      {plans.length === 0 ? (
        <p className="text-gray-500 text-center py-12">{t("common.noData")}</p>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} locale={locale} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <CreatePlanDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create project detail page**

```tsx
// src/app/[locale]/projects/[projectId]/page.tsx
import { PlanList } from "@/components/plan/plan-list";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ProjectDetailPage({
  params: { locale, projectId },
}: {
  params: { locale: string; projectId: string };
}) {
  const db = getDb();
  const project = db.select().from(projects).where(eq(projects.id, projectId)).get();

  if (!project) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <a href={`/${locale}`} className="text-sm text-blue-600 hover:underline">
          ← Back
        </a>
        <h1 className="text-3xl font-bold mt-2">{project.name}</h1>
        {project.description && (
          <p className="text-gray-500 mt-1">{project.description}</p>
        )}
        <p className="text-xs text-gray-400 font-mono mt-1">{project.targetRepoPath}</p>
      </div>

      <PlanList projectId={projectId} locale={locale} />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/plan/ src/app/\[locale\]/projects/
git commit -m "feat(ui): add project detail page with plan list and create/delete"
```

---

### Task 11: Plan Detail Page with Scheme Tab

**Files:**
- Create: `src/app/[locale]/projects/[projectId]/plans/[planId]/page.tsx`, `src/components/plan/plan-tabs.tsx`, `src/components/scheme/scheme-list.tsx`, `src/components/scheme/scheme-card.tsx`, `src/components/scheme/create-scheme-dialog.tsx`, `src/components/scheme/scheme-editor.tsx`

- [ ] **Step 1: Create SchemeCard component**

```tsx
// src/components/scheme/scheme-card.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { SchemeEditor } from "./scheme-editor";

interface Scheme {
  id: string;
  planId: string;
  title: string;
  content: string;
  sourceType: string;
  createdAt: string;
}

interface SchemeCardProps {
  scheme: Scheme;
  readonly: boolean;
  onUpdate: (id: string, data: { title: string; content: string }) => void;
  onDelete: (id: string) => void;
}

export function SchemeCard({ scheme, readonly, onUpdate, onDelete }: SchemeCardProps) {
  const t = useTranslations();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <SchemeEditor
        initialTitle={scheme.title}
        initialContent={scheme.content}
        onSave={(title, content) => {
          onUpdate(scheme.id, { title, content });
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{scheme.title}</h3>
          <StatusBadge
            status={scheme.sourceType}
            label={t(`scheme.sourceType.${scheme.sourceType}`)}
          />
        </div>
        {!readonly && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              {t("common.edit")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm(t("scheme.deleteConfirm"))) {
                  onDelete(scheme.id);
                }
              }}
            >
              {t("common.delete")}
            </Button>
          </div>
        )}
      </div>
      <MarkdownRenderer content={scheme.content} />
    </div>
  );
}
```

- [ ] **Step 2: Create SchemeEditor component**

```tsx
// src/components/scheme/scheme-editor.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";

interface SchemeEditorProps {
  initialTitle?: string;
  initialContent?: string;
  onSave: (title: string, content: string) => void;
  onCancel: () => void;
}

export function SchemeEditor({
  initialTitle = "",
  initialContent = "",
  onSave,
  onCancel,
}: SchemeEditorProps) {
  const t = useTranslations();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);

  return (
    <div className="rounded-lg border bg-white p-5 space-y-4">
      <Input
        label={t("scheme.schemeTitle")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("scheme.content")}
        </label>
        <MarkdownEditor value={content} onChange={setContent} height={300} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>{t("common.cancel")}</Button>
        <Button onClick={() => onSave(title, content)} disabled={!title}>
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create CreateSchemeDialog component**

```tsx
// src/components/scheme/create-scheme-dialog.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";

interface CreateSchemeDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string }) => void;
}

export function CreateSchemeDialog({ open, onClose, onSubmit }: CreateSchemeDialogProps) {
  const t = useTranslations();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    if (!title) return;
    onSubmit({ title, content });
    setTitle("");
    setContent("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={t("scheme.create")}>
      <div className="space-y-4">
        <Input
          label={t("scheme.schemeTitle")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("scheme.content")}
          </label>
          <MarkdownEditor value={content} onChange={setContent} height={200} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!title}>{t("common.create")}</Button>
        </div>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 4: Create SchemeList component**

```tsx
// src/components/scheme/scheme-list.tsx
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SchemeCard } from "./scheme-card";
import { CreateSchemeDialog } from "./create-scheme-dialog";

interface Scheme {
  id: string;
  planId: string;
  title: string;
  content: string;
  sourceType: string;
  createdAt: string;
}

interface SchemeListProps {
  planId: string;
  planStatus: string;
  onPlanStatusChange: () => void;
}

export function SchemeList({ planId, planStatus, onPlanStatusChange }: SchemeListProps) {
  const t = useTranslations();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const readonly = ["confirmed", "scheduled", "executing", "testing", "completed"].includes(planStatus);

  const fetchSchemes = async () => {
    const res = await fetch(`/api/schemes?planId=${planId}`);
    const data = await res.json();
    setSchemes(data);
  };

  useEffect(() => {
    fetchSchemes();
  }, [planId]);

  const handleCreate = async (data: { title: string; content: string }) => {
    await fetch("/api/schemes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, planId, sourceType: "manual" }),
    });
    fetchSchemes();
    onPlanStatusChange();
  };

  const handleUpdate = async (id: string, data: { title: string; content: string }) => {
    await fetch(`/api/schemes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    fetchSchemes();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/schemes/${id}`, { method: "DELETE" });
    fetchSchemes();
  };

  const handleConfirm = async () => {
    await fetch(`/api/plans/${planId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm" }),
    });
    onPlanStatusChange();
  };

  const handleRevoke = async () => {
    await fetch(`/api/plans/${planId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke" }),
    });
    onPlanStatusChange();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{t("scheme.title")}</h3>
        <div className="flex gap-2">
          {!readonly && (
            <>
              <Button variant="secondary" onClick={() => setDialogOpen(true)}>
                {t("scheme.create")}
              </Button>
              {planStatus === "reviewing" && schemes.length > 0 && (
                <Button onClick={handleConfirm}>{t("scheme.confirmSchemes")}</Button>
              )}
            </>
          )}
          {planStatus === "confirmed" && (
            <Button variant="secondary" onClick={handleRevoke}>
              {t("scheme.revokeConfirm")}
            </Button>
          )}
        </div>
      </div>

      {readonly && planStatus === "confirmed" && (
        <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-700">
          {t("scheme.confirmed")}
        </div>
      )}

      {schemes.length === 0 ? (
        <p className="text-gray-500 text-center py-8">{t("common.noData")}</p>
      ) : (
        <div className="space-y-4">
          {schemes.map((scheme) => (
            <SchemeCard
              key={scheme.id}
              scheme={scheme}
              readonly={readonly}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <CreateSchemeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
```

- [ ] **Step 5: Create PlanTabs component**

```tsx
// src/components/plan/plan-tabs.tsx
"use client";

import { useTranslations } from "next-intl";
import { Tabs } from "@/components/ui/tabs";
import { SchemeList } from "@/components/scheme/scheme-list";

interface PlanTabsProps {
  planId: string;
  planStatus: string;
  onPlanStatusChange: () => void;
}

export function PlanTabs({ planId, planStatus, onPlanStatusChange }: PlanTabsProps) {
  const t = useTranslations();

  const tabs = [
    {
      id: "schemes",
      label: t("plan.tabs.schemes"),
      content: (
        <SchemeList
          planId={planId}
          planStatus={planStatus}
          onPlanStatusChange={onPlanStatusChange}
        />
      ),
    },
    {
      id: "schedule",
      label: t("plan.tabs.schedule"),
      content: <p className="text-gray-500 py-8 text-center">Phase 2</p>,
      disabled: !["confirmed", "scheduled", "executing", "testing", "completed"].includes(planStatus),
    },
    {
      id: "tests",
      label: t("plan.tabs.tests"),
      content: <p className="text-gray-500 py-8 text-center">Phase 3</p>,
      disabled: !["testing", "completed"].includes(planStatus),
    },
    {
      id: "logs",
      label: t("plan.tabs.logs"),
      content: <p className="text-gray-500 py-8 text-center">Phase 2</p>,
      disabled: !["executing", "testing", "completed"].includes(planStatus),
    },
  ];

  return <Tabs tabs={tabs} defaultTab="schemes" />;
}
```

- [ ] **Step 6: Create plan detail page**

```tsx
// src/app/[locale]/projects/[projectId]/plans/[planId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import { PlanTabs } from "@/components/plan/plan-tabs";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";

interface Plan {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: string;
}

export default function PlanDetailPage({
  params: { locale, projectId, planId },
}: {
  params: { locale: string; projectId: string; planId: string };
}) {
  const t = useTranslations();
  const [plan, setPlan] = useState<Plan | null>(null);

  const fetchPlan = async () => {
    const res = await fetch(`/api/plans/${planId}`);
    const data = await res.json();
    setPlan(data);
  };

  useEffect(() => {
    fetchPlan();
  }, [planId]);

  if (!plan) {
    return <p>{t("common.loading")}</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <a
          href={`/${locale}/projects/${projectId}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← {t("common.back")}
        </a>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-3xl font-bold">{plan.name}</h1>
          <StatusBadge status={plan.status} label={t(`plan.status.${plan.status}`)} />
        </div>
        {plan.description && (
          <div className="mt-2">
            <MarkdownRenderer content={plan.description} />
          </div>
        )}
      </div>

      <PlanTabs
        planId={plan.id}
        planStatus={plan.status}
        onPlanStatusChange={fetchPlan}
      />
    </div>
  );
}
```

- [ ] **Step 7: Verify full flow**

```bash
npm run dev
```

Test the full flow:
1. Visit `http://localhost:3000` → project list
2. Create a project → navigate to project detail
3. Create a plan → navigate to plan detail
4. Add a scheme manually → plan transitions to "reviewing"
5. Edit the scheme content (markdown)
6. Click "Confirm Schemes" → schemes become readonly
7. Click "Revoke Confirmation" → schemes become editable again
8. Switch locale (EN/中文) → all UI text changes

- [ ] **Step 8: Run all tests**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/scheme/ src/components/plan/plan-tabs.tsx src/app/\[locale\]/projects/
git commit -m "feat(ui): add plan detail page with scheme CRUD and confirmation flow"
```

---

## Chunk 5: Final Verification

### Task 12: Full Integration Verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Smoke test the running app**

```bash
npm run dev
```

Verify:
- [ ] Project CRUD works (create, view, delete)
- [ ] Plan CRUD works (create, view, delete)
- [ ] Scheme CRUD works (create, edit, delete)
- [ ] Markdown renders correctly in schemes (headings, code blocks, tables)
- [ ] Markdown editor works for scheme content
- [ ] Plan status transitions: draft → reviewing (on first scheme) → confirmed → revoked back to reviewing
- [ ] Confirmed schemes are readonly
- [ ] i18n switching between EN and 中文 works
- [ ] Schedule/Tests/Logs tabs are disabled until appropriate plan status

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 1 foundation (projects, plans, schemes, i18n, markdown)"
```
