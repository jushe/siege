/**
 * AI task queue using SQLite for persistence + timestamp file lock.
 * Survives Next.js hot reload.
 */

import { getDb } from "@/lib/db";
import { aiTasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

const LOCK_FILE = path.join(process.cwd(), "data", ".ai-lock");
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

function isLocked(): boolean {
  try {
    if (!fs.existsSync(LOCK_FILE)) return false;
    const lockTime = Number(fs.readFileSync(LOCK_FILE, "utf-8").trim());
    if (isNaN(lockTime) || Date.now() - lockTime > LOCK_TIMEOUT_MS) {
      try { fs.unlinkSync(LOCK_FILE); } catch {}
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function acquireLock() { fs.writeFileSync(LOCK_FILE, String(Date.now())); }
function releaseLock() { try { fs.unlinkSync(LOCK_FILE); } catch {} }

export function createAiTask(
  id: string,
  type: string,
  fn: () => Promise<string>
) {
  const db = getDb();
  db.insert(aiTasks).values({ id, type, status: "pending" }).run();
  runTask(id, fn);
}

async function runTask(id: string, fn: () => Promise<string>) {
  // Wait for lock
  const start = Date.now();
  while (isLocked()) {
    if (Date.now() - start > LOCK_TIMEOUT_MS) {
      releaseLock();
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  acquireLock();
  const db = getDb();
  db.update(aiTasks).set({ status: "running" }).where(eq(aiTasks.id, id)).run();

  try {
    const result = await fn();
    db.update(aiTasks).set({ status: "done", result }).where(eq(aiTasks.id, id)).run();
  } catch (err) {
    db.update(aiTasks).set({ status: "error", result: String(err) }).where(eq(aiTasks.id, id)).run();
  } finally {
    releaseLock();
  }
}

export function getAiTaskStatus(id: string) {
  const db = getDb();
  return db.select().from(aiTasks).where(eq(aiTasks.id, id)).get();
}

export function getQueueStatus() {
  return { locked: isLocked() };
}
