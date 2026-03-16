import { generateText } from "ai";
import { hasApiKey, getConfiguredModel } from "./config";
import { generateTextViaCli } from "./cli-fallback";
import type { Provider } from "./provider";
import fs from "fs";
import path from "path";

const LOCK_FILE = path.join(process.cwd(), "data", ".ai-lock");
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function isLocked(): boolean {
  try {
    if (!fs.existsSync(LOCK_FILE)) return false;
    const content = fs.readFileSync(LOCK_FILE, "utf-8").trim();
    const lockTime = Number(content);
    if (isNaN(lockTime)) return false;
    // Expired?
    if (Date.now() - lockTime > LOCK_TIMEOUT_MS) {
      fs.unlinkSync(LOCK_FILE);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function acquireLock() {
  fs.writeFileSync(LOCK_FILE, String(Date.now()));
}

function releaseLock() {
  try { fs.unlinkSync(LOCK_FILE); } catch {}
}

async function waitForLock(timeoutMs = 5 * 60 * 1000): Promise<void> {
  const start = Date.now();
  while (isLocked()) {
    if (Date.now() - start > timeoutMs) {
      // Force release stale lock
      releaseLock();
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

/**
 * Generate text using SDK if API key available, otherwise fall back to claude CLI.
 * CLI calls use timestamp-based file lock to prevent concurrent processes.
 */
export async function generateTextAuto(options: {
  provider?: Provider;
  model?: string;
  system: string;
  prompt: string;
  sessionId?: string;
}): Promise<{ text: string; sessionId?: string }> {
  const provider = options.provider || "anthropic";

  if (hasApiKey(provider)) {
    const model = getConfiguredModel(provider, options.model);
    const result = await generateText({
      model,
      system: options.system,
      prompt: options.prompt,
    });
    return { text: result.text.trim() };
  }

  const fullPrompt = options.system
    ? `${options.system}\n\n---\n\n${options.prompt}`
    : options.prompt;

  await waitForLock();
  acquireLock();
  try {
    const result = await generateTextViaCli(fullPrompt, options.sessionId);
    return result;
  } finally {
    releaseLock();
  }
}
