/**
 * Simple serial queue to prevent multiple claude CLI processes from running simultaneously.
 * Only one AI task runs at a time; others wait in line.
 */

type Task = () => Promise<void>;

let running = false;
const queue: Task[] = [];

function processNext() {
  if (running || queue.length === 0) return;
  running = true;
  const task = queue.shift()!;
  task().finally(() => {
    running = false;
    processNext();
  });
}

export function enqueueAiTask(task: Task) {
  queue.push(task);
  processNext();
}

export function getQueueStatus() {
  return { running, pending: queue.length };
}
