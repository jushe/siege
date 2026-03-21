/**
 * SSE (Server-Sent Events) encoding/parsing utilities for interactive generation.
 */

export interface SSETextEvent {
  event: "text";
  data: string;
}

export interface SSEQuestionEvent {
  event: "question";
  data: {
    id: string;
    text: string;
    options: string[];
    default?: string;
  };
}

export interface SSEAnswerEvent {
  event: "answer_received";
  data: { id: string; answer: string };
}

export interface SSEInitEvent {
  event: "init";
  data: { generationId: string; questionCount: number };
}

export interface SSEFallbackEvent {
  event: "fallback";
  data: { reason: string };
}

export interface SSEDoneEvent {
  event: "done";
  data: Record<string, never>;
}

export type SSEEvent =
  | SSETextEvent
  | SSEQuestionEvent
  | SSEAnswerEvent
  | SSEInitEvent
  | SSEFallbackEvent
  | SSEDoneEvent;

const encoder = new TextEncoder();

export function sseEncode(event: string, data: string | object): Uint8Array {
  const dataStr = typeof data === "string" ? data : JSON.stringify(data);
  return encoder.encode(`event: ${event}\ndata: ${dataStr}\n\n`);
}

export function sseParseEvent(raw: string): { event: string; data: string } | null {
  const lines = raw.split("\n");
  let event = "";
  let data = "";
  for (const line of lines) {
    if (line.startsWith("event: ")) event = line.slice(7);
    else if (line.startsWith("data: ")) data = line.slice(6);
  }
  if (!event) return null;
  return { event, data };
}
