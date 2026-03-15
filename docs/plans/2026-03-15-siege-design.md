# Siege - AI-Powered Agent Development Tool

## Overview

Siege is a personal web-based tool that uses AI as a backend to manage software development workflows. It covers the full cycle: project management, plan creation, scheme generation (via web search and local code analysis), scheduling, execution (via Claude Code / Codex CLI), and automated testing.

## Core Workflow

```
Project → Plan → [AI Search + Analysis] → Scheme → Schedule → Execute → Test
```

## Data Model

### Project

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Primary key |
| name | string | Project name |
| description | string (markdown) | Project description |
| target_repo_path | string | Path to the target repository |
| created_at | datetime | Creation timestamp |
| updated_at | datetime | Last update timestamp |

### Plan

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Primary key |
| project_id | string (fk) | Parent project |
| name | string | Plan name |
| description | string (markdown) | Plan description |
| status | enum | draft → reviewing → confirmed → scheduled → executing → testing → completed |
| created_at | datetime | Creation timestamp |
| updated_at | datetime | Last update timestamp |

**Status transitions:**
- `draft` → `reviewing`: scheme generated
- `reviewing` ↔ `draft`: user modifies plan/scheme
- `reviewing` → `confirmed`: user confirms schemes
- `confirmed` → `scheduled`: schedule generated and confirmed
- `confirmed` ↔ `reviewing`: user revokes scheme confirmation
- `scheduled` → `executing`: user clicks execute
- `scheduled` ↔ `confirmed`: user revokes schedule confirmation
- `executing` → `testing`: all schedule items completed
- `testing` → `completed`: all tests passed

### Scheme

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Primary key |
| plan_id | string (fk) | Parent plan |
| title | string | Scheme title |
| content | string (markdown) | Scheme content |
| source_type | enum | web_search, local_analysis, manual |
| search_results | JSON | Raw search records |
| created_at | datetime | Creation timestamp |
| updated_at | datetime | Last update timestamp |

### Schedule

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Primary key |
| plan_id | string (fk) | Parent plan (1:1) |
| start_date | date | Schedule start |
| end_date | date | Schedule end |

### ScheduleItem

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Primary key |
| schedule_id | string (fk) | Parent schedule |
| scheme_id | string (fk, nullable) | Associated scheme |
| title | string | Task title |
| description | string (markdown) | Task description |
| start_date | date | Task start |
| end_date | date | Task end |
| order | integer | Execution order |
| status | enum | pending → in_progress → completed → failed |
| progress | integer (0-100) | Current progress |
| execution_log | string (markdown) | CLI output |
| engine | string | claude-code or codex |
| skills | JSON | Associated skill name list |

### TestSuite

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Primary key |
| plan_id | string (fk) | Parent plan (1:1) |
| status | enum | pending → generating → running → passed → failed |
| created_at | datetime | Creation timestamp |
| updated_at | datetime | Last update timestamp |

### TestCase

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Primary key |
| test_suite_id | string (fk) | Parent test suite |
| name | string | Test name |
| description | string (markdown) | Test description |
| type | enum | unit, integration, e2e |
| generated_code | string (markdown) | Generated test code |
| file_path | string (nullable) | Test file path |
| status | enum | pending → running → passed → failed → skipped |

### TestResult

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Primary key |
| test_case_id | string (fk) | Parent test case |
| run_at | datetime | Execution timestamp |
| status | enum | passed, failed, error, skipped |
| output | string (markdown) | Run output |
| error_message | string (markdown, nullable) | Error details |
| duration_ms | integer | Execution duration |

### Skill (cached from filesystem)

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Primary key |
| name | string | Skill name |
| source | string | superpowers, everything-claude-code, custom |
| description | string | Skill description |
| file_path | string | Path to skill file |
| content | string (markdown) | Skill content |

### CliEngine

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Primary key |
| name | string | claude-code or codex |
| command | string | CLI command path |
| default_args | JSON | Default arguments |
| enabled | boolean | Whether enabled |

## Architecture

```
┌─────────────────────────────────────────────┐
│  Next.js 15 App (App Router)                │
│                                             │
│  Frontend:                                  │
│  ├── React + Tailwind CSS                   │
│  ├── next-intl (i18n: zh + en)              │
│  ├── react-markdown + remark-gfm            │
│  │   + rehype-highlight (rendering)         │
│  ├── @uiw/react-md-editor (editing)         │
│  ├── frappe-gantt (schedule visualization)  │
│  └── SSE client (real-time progress)        │
│                                             │
│  Backend (API Routes):                      │
│  ├── AI Service (Vercel AI SDK)             │
│  │   ├── Anthropic Provider                 │
│  │   ├── OpenAI Provider                    │
│  │   └── Context7 MCP (web search)          │
│  ├── CLI Runner (child_process.spawn)       │
│  │   ├── Claude Code                        │
│  │   └── Codex                              │
│  └── Drizzle ORM + better-sqlite3           │
└─────────────────────────────────────────────┘
```

## Tech Stack

| Category | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 15 (App Router) | Full-stack, single process |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Rapid UI development |
| i18n | next-intl | App Router native support |
| Markdown Edit | @uiw/react-md-editor | Feature-rich editor |
| Markdown Render | react-markdown + remark-gfm + rehype-highlight | GFM tables, code highlighting |
| Gantt Chart | frappe-gantt | Lightweight, interactive |
| ORM | Drizzle ORM | Type-safe, SQLite support |
| Database | SQLite (better-sqlite3) | Zero-ops, local file DB |
| AI SDK | Vercel AI SDK | Unified Anthropic/OpenAI interface, streaming |
| Real-time | SSE (Server-Sent Events) | Simple unidirectional push |
| CLI Execution | child_process.spawn | Native Node.js subprocess |

## Page Structure

```
/                        → Project list (home)
/projects/:id            → Project detail (plan list)
/projects/:id/plans/:id  → Plan detail (core workspace)
/settings                → Settings (engine config, skills, AI config)
```

### Plan Detail Page (Core Workspace)

Tabs: Schemes | Schedule | Tests | Execution Log

**Scheme Tab:**
- Generate scheme (AI: Context7 web search + local code analysis)
- Manual add
- Edit/delete schemes (markdown editor)
- Confirm schemes (locks for scheduling)
- Revoke confirmation (unlocks for editing)

**Schedule Tab:**
- Generate schedule from confirmed schemes
- Gantt chart visualization
- Drag to adjust time ranges and order
- Configure engine + skills per schedule item
- Confirm schedule (unlocks execution)

**Test Tab:**
- Auto-generated test cases after execution
- Test results with pass/fail status
- Re-run individual tests
- Output and error logs (markdown rendered)

## AI Service

Three AI task types:

1. **SchemeGenerator**: Plan description + project info → Context7 web search → local code analysis → streaming markdown scheme
2. **ScheduleGenerator**: Confirmed schemes → decompose into executable tasks → estimate time and dependencies
3. **TestGenerator**: Schemes + code changes → generate test cases with test code

Configurable per task: provider, model, temperature, max_tokens.

## Confirmation Flow

Schemes and schedules require explicit user confirmation before proceeding:

```
Plan: draft → reviewing → confirmed → scheduled → executing → testing → completed
                ↕              ↕
           (edit schemes)  (edit schedule)
```

- Schemes must be confirmed before schedule generation
- Schedule must be confirmed before execution
- User can revoke confirmation to go back and edit

## CLI Execution

1. API Route starts subprocess via `child_process.spawn`
2. Returns task ID immediately
3. Frontend subscribes to SSE endpoint for real-time progress
4. Progress and logs persisted to SQLite
5. Schedule items executed sequentially by order
6. Skills content injected into CLI prompt

## Skills Integration

- Scan `~/.claude/skills/` directory for available skills
- Parse frontmatter (name, description) from markdown files
- Group by source (superpowers, everything-claude-code, custom)
- Users associate skills with schedule items
- Skill content injected into CLI prompt during execution

## i18n

- next-intl with `[locale]` route segment
- Supported locales: `zh` (Chinese), `en` (English)
- UI text in message files (`messages/zh.json`, `messages/en.json`)
- User-generated content (schemes, plans) is not translated
