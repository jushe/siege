/**
 * Interactive session manager using SQLite for persistence.
 * Survives hot-reload and process restarts.
 */

import { getDb } from "@/lib/db";
import { aiTasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface QAEntry {
  id: string;
  question: string;
  options: string[];
  answer: string;
}

export function createSession(generationId: string, planId: string): { generationId: string; planId: string; qaHistory: QAEntry[] } {
  const db = getDb();
  // Use aiTasks table to persist session state
  db.insert(aiTasks).values({
    id: generationId,
    type: `interactive:${planId}`,
    status: "running",
    result: JSON.stringify({ qaHistory: [], pendingQuestion: null, pendingAnswer: null }),
  }).run();
  return { generationId, planId, qaHistory: [] };
}

export function getSession(generationId: string): { generationId: string; qaHistory: QAEntry[] } | undefined {
  const db = getDb();
  const row = db.select().from(aiTasks).where(eq(aiTasks.id, generationId)).get();
  if (!row || row.status === "done") return undefined;
  const data = JSON.parse(row.result || "{}");
  return { generationId, qaHistory: data.qaHistory || [] };
}

export function removeSession(generationId: string): void {
  const db = getDb();
  db.update(aiTasks).set({ status: "done" }).where(eq(aiTasks.id, generationId)).run();
}

/** Server side: wait for an answer by polling SQLite */
export async function waitForAnswer(generationId: string, questionId: string, timeoutMs = 600000): Promise<string> {
  const db = getDb();
  const deadline = Date.now() + timeoutMs;

  // Set pending question
  const row = db.select().from(aiTasks).where(eq(aiTasks.id, generationId)).get();
  if (!row) throw new Error("Session not found");
  const data = JSON.parse(row.result || "{}");
  data.pendingQuestion = questionId;
  data.pendingAnswer = null;
  db.update(aiTasks).set({ result: JSON.stringify(data) }).where(eq(aiTasks.id, generationId)).run();

  // Poll for answer
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 500));
    const fresh = db.select().from(aiTasks).where(eq(aiTasks.id, generationId)).get();
    if (!fresh) throw new Error("Session removed");
    const freshData = JSON.parse(fresh.result || "{}");
    if (freshData.pendingAnswer !== null && freshData.pendingAnswer !== undefined) {
      return freshData.pendingAnswer as string;
    }
  }
  throw new Error("Timeout waiting for answer");
}

/** Client side (answer API): submit an answer */
export function submitAnswer(generationId: string, questionId: string, answer: string): boolean {
  const db = getDb();
  const row = db.select().from(aiTasks).where(eq(aiTasks.id, generationId)).get();
  if (!row || row.status === "done") return false;
  const data = JSON.parse(row.result || "{}");
  if (data.pendingQuestion !== questionId) return false;
  data.pendingAnswer = answer;
  // Also push to qaHistory
  if (!data.qaHistory) data.qaHistory = [];
  db.update(aiTasks).set({ result: JSON.stringify(data) }).where(eq(aiTasks.id, generationId)).run();
  return true;
}

/** Push Q&A to session history */
export function pushQAHistory(generationId: string, entry: QAEntry): void {
  const db = getDb();
  const row = db.select().from(aiTasks).where(eq(aiTasks.id, generationId)).get();
  if (!row) return;
  const data = JSON.parse(row.result || "{}");
  if (!data.qaHistory) data.qaHistory = [];
  data.qaHistory.push(entry);
  data.pendingQuestion = null;
  data.pendingAnswer = null;
  db.update(aiTasks).set({ result: JSON.stringify(data) }).where(eq(aiTasks.id, generationId)).run();
}
