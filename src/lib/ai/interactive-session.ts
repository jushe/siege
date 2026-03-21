/**
 * In-memory session manager for interactive scheme generation.
 * Bridges the long-lived SSE stream with short-lived answer POST requests.
 */

export interface QAEntry {
  id: string;
  question: string;
  options: string[];
  answer: string;
}

export class InteractiveSession {
  generationId: string;
  planId: string;
  qaHistory: QAEntry[] = [];
  createdAt = Date.now();

  private waitingResolvers = new Map<string, (answer: string) => void>();

  constructor(generationId: string, planId: string) {
    this.generationId = generationId;
    this.planId = planId;
  }

  /** Called by the stream handler — blocks until submitAnswer is called */
  waitForAnswer(questionId: string, timeoutMs = 600000): Promise<string> {
    return new Promise((resolve, reject) => {
      this.waitingResolvers.set(questionId, resolve);
      const timer = setTimeout(() => {
        this.waitingResolvers.delete(questionId);
        reject(new Error(`Timeout waiting for answer to question ${questionId}`));
      }, timeoutMs);
      // Wrap resolve to clear timer
      const origResolve = resolve;
      this.waitingResolvers.set(questionId, (answer: string) => {
        clearTimeout(timer);
        origResolve(answer);
      });
    });
  }

  /** Called by the answer POST route */
  submitAnswer(questionId: string, answer: string): boolean {
    const resolver = this.waitingResolvers.get(questionId);
    if (!resolver) return false;
    this.waitingResolvers.delete(questionId);
    resolver(answer);
    return true;
  }
}

const activeSessions = new Map<string, InteractiveSession>();

// Auto-cleanup sessions older than 30 minutes
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, session] of activeSessions) {
    if (session.createdAt < cutoff) activeSessions.delete(id);
  }
}, 60000);

export function createSession(generationId: string, planId: string): InteractiveSession {
  const session = new InteractiveSession(generationId, planId);
  activeSessions.set(generationId, session);
  return session;
}

export function getSession(generationId: string): InteractiveSession | undefined {
  return activeSessions.get(generationId);
}

export function removeSession(generationId: string): void {
  activeSessions.delete(generationId);
}
