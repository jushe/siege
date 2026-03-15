import { spawn, type ChildProcess } from "child_process";
import { EventEmitter } from "events";

export interface CliRunnerOptions {
  engine: "claude-code" | "codex";
  prompt: string;
  cwd: string;
  skillsContent?: string;
}

export interface ExecutionProgress {
  type: "output" | "error" | "done" | "started";
  data: string;
  timestamp: string;
}

// Active processes tracked by task ID
const activeProcesses = new Map<string, ChildProcess>();

export function getActiveProcess(taskId: string): ChildProcess | undefined {
  return activeProcesses.get(taskId);
}

export function stopExecution(taskId: string): boolean {
  const proc = activeProcesses.get(taskId);
  if (proc) {
    proc.kill("SIGTERM");
    activeProcesses.delete(taskId);
    return true;
  }
  return false;
}

export function executeTask(
  taskId: string,
  options: CliRunnerOptions
): EventEmitter {
  const emitter = new EventEmitter();

  const fullPrompt = options.skillsContent
    ? `${options.skillsContent}\n\n---\n\nTask:\n${options.prompt}`
    : options.prompt;

  let command: string;
  let args: string[];

  if (options.engine === "claude-code") {
    command = "claude";
    args = ["-p", fullPrompt, "--output-format", "text"];
  } else {
    command = "codex";
    args = ["--prompt", fullPrompt];
  }

  const proc = spawn(command, args, {
    cwd: options.cwd,
    env: { ...process.env },
    stdio: ["pipe", "pipe", "pipe"],
  });

  activeProcesses.set(taskId, proc);

  emitter.emit("progress", {
    type: "started",
    data: `Starting ${options.engine}...`,
    timestamp: new Date().toISOString(),
  } satisfies ExecutionProgress);

  proc.stdout?.on("data", (chunk: Buffer) => {
    emitter.emit("progress", {
      type: "output",
      data: chunk.toString(),
      timestamp: new Date().toISOString(),
    } satisfies ExecutionProgress);
  });

  proc.stderr?.on("data", (chunk: Buffer) => {
    emitter.emit("progress", {
      type: "error",
      data: chunk.toString(),
      timestamp: new Date().toISOString(),
    } satisfies ExecutionProgress);
  });

  proc.on("close", (code) => {
    activeProcesses.delete(taskId);
    emitter.emit("progress", {
      type: "done",
      data: `Process exited with code ${code}`,
      timestamp: new Date().toISOString(),
    } satisfies ExecutionProgress);
  });

  proc.on("error", (err) => {
    activeProcesses.delete(taskId);
    emitter.emit("progress", {
      type: "error",
      data: `Failed to start: ${err.message}`,
      timestamp: new Date().toISOString(),
    } satisfies ExecutionProgress);
    emitter.emit("progress", {
      type: "done",
      data: "Process failed to start",
      timestamp: new Date().toISOString(),
    } satisfies ExecutionProgress);
  });

  return emitter;
}
